/**
 * STT (Speech-to-Text) 전사 API
 * ─────────────────────────────
 * 오디오 파일을 업로드하면 OpenAI Whisper로 전사하고,
 * 선택적으로 계약 내용 분석까지 수행한다.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOpenAIClient, checkOpenAICostGuard } from "@/lib/openai";
import { rateLimit, rateLimitHeaders, checkDailyUsage } from "@/lib/rate-limit";
import { validateOrigin } from "@/lib/csrf";
import { createAuditLog } from "@/lib/audit-log";

// 허용 오디오 MIME 타입
const ALLOWED_TYPES = new Set([
  "audio/mpeg",      // mp3
  "audio/mp4",       // mp4/m4a
  "audio/wav",       // wav
  "audio/webm",      // webm
  "audio/ogg",       // ogg
  "audio/x-m4a",     // m4a (일부 브라우저)
  "audio/mp3",       // mp3 대체
]);

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (Whisper 제한)

// Whisper 전사 결과 타입
interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  segments: TranscriptionSegment[];
}

export async function POST(req: NextRequest) {
  try {
    const csrfError = validateOrigin(req);
    if (csrfError) return csrfError;

    // Rate Limit
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const rl = await rateLimit(`stt:${ip}`, 5); // 분당 5회
    if (!rl.success) {
      return NextResponse.json(
        { error: "요청 한도 초과. 잠시 후 다시 시도해주세요." },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    // Auth
    const session = await auth();
    const userId = session?.user?.id;
    const dailyLimit = (session?.user as { dailyLimit?: number })?.dailyLimit || 5;

    // Daily Usage
    const daily = await checkDailyUsage(userId || `guest:${ip}`, dailyLimit);
    if (!daily.success) {
      return NextResponse.json(
        { error: "일일 사용 한도를 초과했습니다." },
        { status: 429, headers: rateLimitHeaders(daily) }
      );
    }

    // Cost Guard
    const costGuard = await checkOpenAICostGuard(ip);
    if (!costGuard.allowed) {
      return NextResponse.json(
        { error: "일일 API 호출 한도를 초과했습니다." },
        { status: 429 }
      );
    }

    // FormData 파싱
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const analyzeContract = formData.get("analyzeContract") === "true";

    if (!audioFile) {
      return NextResponse.json(
        { error: "오디오 파일이 필요합니다." },
        { status: 400 }
      );
    }

    // 파일 유효성 검증
    if (!ALLOWED_TYPES.has(audioFile.type)) {
      return NextResponse.json(
        {
          error: `지원하지 않는 파일 형식입니다. (허용: mp3, mp4, wav, webm, ogg, m4a)`,
        },
        { status: 400 }
      );
    }

    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 25MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    // Whisper API 호출
    const openai = getOpenAIClient();
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "ko",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    const result: TranscriptionResult = {
      text: transcription.text,
      language: (transcription as unknown as { language: string }).language || "ko",
      duration: (transcription as unknown as { duration: number }).duration || 0,
      segments: ((transcription as unknown as { segments: TranscriptionSegment[] }).segments || []).map(
        (seg: TranscriptionSegment, idx: number) => ({
          id: idx,
          start: seg.start,
          end: seg.end,
          text: seg.text,
        })
      ),
    };

    // 선택: 계약 내용 분석
    let contractAnalysis = null;
    if (analyzeContract && result.text.length > 50) {
      const analysisResponse = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `당신은 부동산 계약 전문 분석가입니다.
녹음 전사 내용에서 다음을 분석하세요:
1. 핵심 계약 조건 (보증금, 월세, 기간 등)
2. 설명 누락 항목 (중요사항 미설명)
3. 위험 발언 또는 불리한 조건
4. 전체 요약

JSON으로 응답: { "keyTerms": [...], "missingExplanations": [...], "riskStatements": [...], "summary": "..." }`,
          },
          {
            role: "user",
            content: `다음 계약 관련 녹음 전사 내용을 분석해주세요:\n\n${result.text.slice(0, 5000)}`,
          },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      try {
        contractAnalysis = JSON.parse(
          analysisResponse.choices[0].message.content || "{}"
        );
      } catch {
        contractAnalysis = {
          error: "분석 결과 파싱 실패",
          rawContent: analysisResponse.choices[0].message.content,
        };
      }
    }

    // 감사 로그
    if (userId) {
      await createAuditLog({
        userId,
        action: "STT_TRANSCRIBE",
        detail: {
          fileSize: audioFile.size,
          fileType: audioFile.type,
          duration: result.duration,
          textLength: result.text.length,
          analyzed: analyzeContract,
        },
        req,
      });
    }

    return NextResponse.json({
      transcription: result,
      contractAnalysis,
      metadata: {
        fileName: audioFile.name,
        fileSize: audioFile.size,
        fileType: audioFile.type,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    if (message.includes("API key")) {
      return NextResponse.json(
        { error: "OpenAI API 키가 설정되지 않았습니다." },
        { status: 401 }
      );
    }
    return NextResponse.json({ error: `오류: ${message}` }, { status: 500 });
  }
}
