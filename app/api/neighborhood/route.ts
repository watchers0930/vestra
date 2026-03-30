/**
 * 주변환경 종합분석 API
 * POST /api/neighborhood
 * - 카카오 주소 → 좌표 변환
 * - 카카오 키워드 검색 × 8개 카테고리 (반경 1km)
 * - 카테고리별 점수 계산 + 종합점수
 * - GPT AI 코멘트 생성
 */

import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";

// ── 카카오 API ──────────────────────────────────

async function kakaoGeocode(key: string, address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}&size=1`,
      { headers: { Authorization: `KakaoAK ${key}` } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const doc = json.documents?.[0];
    if (!doc) return null;
    return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
  } catch {
    return null;
  }
}

interface KakaoPlace {
  place_name: string;
  category_group_name: string;
  distance: string;
  x: string;
  y: string;
  road_address_name: string;
}

async function kakaoKeywordSearch(
  key: string,
  query: string,
  center: { lat: number; lng: number },
  categoryCode: string,
  radius: number = 1000
): Promise<KakaoPlace[]> {
  try {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&category_group_code=${categoryCode}&x=${center.lng}&y=${center.lat}&radius=${radius}&sort=distance&size=15`;
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.documents || []) as KakaoPlace[];
  } catch {
    return [];
  }
}

// 카테고리 검색만 (키워드 없이)
async function kakaoCategorySearch(
  key: string,
  center: { lat: number; lng: number },
  categoryCode: string,
  radius: number = 1000
): Promise<KakaoPlace[]> {
  try {
    const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=${categoryCode}&x=${center.lng}&y=${center.lat}&radius=${radius}&sort=distance&size=15`;
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.documents || []) as KakaoPlace[];
  } catch {
    return [];
  }
}

// ── 점수 계산 ──────────────────────────────────

interface FacilityItem {
  name: string;
  distance: number;
  lat: number;
  lng: number;
  address: string;
}

interface CategoryResult {
  score: number;
  grade: string;
  count: number;
  nearest: number;
  items: FacilityItem[];
}

function getGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C+";
  if (score >= 40) return "C";
  return "D";
}

function calcCategoryScore(items: FacilityItem[]): { score: number; nearest: number } {
  if (items.length === 0) return { score: 0, nearest: 0 };

  const nearest = items[0].distance;

  // 개수 점수 (0~50)
  let countScore = 0;
  if (items.length >= 6) countScore = 50;
  else if (items.length >= 4) countScore = 35;
  else if (items.length >= 2) countScore = 25;
  else if (items.length >= 1) countScore = 15;

  // 최근접 거리 점수 (0~50)
  let distScore = 10;
  if (nearest <= 200) distScore = 50;
  else if (nearest <= 400) distScore = 40;
  else if (nearest <= 600) distScore = 30;
  else if (nearest <= 800) distScore = 20;

  return { score: countScore + distScore, nearest };
}

function placesToItems(places: KakaoPlace[]): FacilityItem[] {
  return places.map(p => ({
    name: p.place_name,
    distance: parseInt(p.distance) || 0,
    lat: parseFloat(p.y),
    lng: parseFloat(p.x),
    address: p.road_address_name || "",
  }));
}

// ── 메인 핸들러 ──────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const address = body.address as string;
    if (!address || address.trim().length < 3) {
      return NextResponse.json({ error: "주소를 입력해주세요." }, { status: 400 });
    }

    const kakaoKey = process.env.KAKAO_REST_KEY;
    if (!kakaoKey) {
      return NextResponse.json({ error: "카카오 API 키가 설정되지 않았습니다." }, { status: 500 });
    }

    // 1. 주소 → 좌표
    const coord = await kakaoGeocode(kakaoKey, address);
    if (!coord) {
      return NextResponse.json({ error: "주소를 찾을 수 없습니다. 정확한 주소를 입력해주세요." }, { status: 400 });
    }

    // 2. 시설별 주변 검색 (병렬)
    const [subway, bus, school, academy, kindergarten, mart, pharmacy, hospital, convenience, park, bank] = await Promise.all([
      kakaoCategorySearch(kakaoKey, coord, "SW8"),
      kakaoKeywordSearch(kakaoKey, "버스정류장", coord, ""),
      kakaoCategorySearch(kakaoKey, coord, "SC4"),
      kakaoCategorySearch(kakaoKey, coord, "AC5"),
      kakaoKeywordSearch(kakaoKey, "유치원 어린이집", coord, ""),
      kakaoCategorySearch(kakaoKey, coord, "MT1"),
      kakaoCategorySearch(kakaoKey, coord, "PM9"),
      kakaoCategorySearch(kakaoKey, coord, "HP8"),
      kakaoCategorySearch(kakaoKey, coord, "CS2"),
      kakaoKeywordSearch(kakaoKey, "공원", coord, ""),
      kakaoCategorySearch(kakaoKey, coord, "BK9"),
    ]);

    // 시설별 개별 데이터
    const facilities: Record<string, { label: string; category: string; color: string; items: FacilityItem[] }> = {
      subway: { label: "지하철역", category: "transport", color: "#3b82f6", items: placesToItems(subway) },
      bus: { label: "버스정류장", category: "transport", color: "#60a5fa", items: placesToItems(bus) },
      school: { label: "학교", category: "education", color: "#8b5cf6", items: placesToItems(school) },
      academy: { label: "학원", category: "education", color: "#a78bfa", items: placesToItems(academy) },
      kindergarten: { label: "유치원/어린이집", category: "education", color: "#c4b5fd", items: placesToItems(kindergarten) },
      hospital: { label: "병원", category: "medical", color: "#ef4444", items: placesToItems(hospital) },
      pharmacy: { label: "약국", category: "medical", color: "#f87171", items: placesToItems(pharmacy) },
      mart: { label: "대형마트", category: "convenience", color: "#10b981", items: placesToItems(mart) },
      convenience: { label: "편의점", category: "living", color: "#f59e0b", items: placesToItems(convenience) },
      park: { label: "공원", category: "living", color: "#22c55e", items: placesToItems(park) },
      bank: { label: "은행", category: "living", color: "#6366f1", items: placesToItems(bank) },
    };

    // 3. 카테고리별 그룹화 + 점수 계산
    const transportItems = [...facilities.subway.items, ...facilities.bus.items].sort((a, b) => a.distance - b.distance);
    const educationItems = [...facilities.school.items, ...facilities.academy.items, ...facilities.kindergarten.items].sort((a, b) => a.distance - b.distance);
    const medicalItems = [...facilities.hospital.items, ...facilities.pharmacy.items].sort((a, b) => a.distance - b.distance);
    const convenienceItems = [...facilities.mart.items, ...facilities.convenience.items].sort((a, b) => a.distance - b.distance);
    const livingItems = [...facilities.park.items, ...facilities.bank.items].sort((a, b) => a.distance - b.distance);

    const transport = { ...calcCategoryScore(transportItems), count: transportItems.length, grade: "", items: transportItems };
    const education = { ...calcCategoryScore(educationItems), count: educationItems.length, grade: "", items: educationItems };
    const medical = { ...calcCategoryScore(medicalItems), count: medicalItems.length, grade: "", items: medicalItems };
    const conv = { ...calcCategoryScore(convenienceItems), count: convenienceItems.length, grade: "", items: convenienceItems };
    const living = { ...calcCategoryScore(livingItems), count: livingItems.length, grade: "", items: livingItems };

    transport.grade = getGrade(transport.score);
    education.grade = getGrade(education.score);
    medical.grade = getGrade(medical.score);
    conv.grade = getGrade(conv.score);
    living.grade = getGrade(living.score);

    // 4. 종합점수 (가중 평균)
    const totalScore = Math.round(
      transport.score * 0.25 +
      education.score * 0.20 +
      medical.score * 0.20 +
      conv.score * 0.15 +
      living.score * 0.20
    );
    const totalGrade = getGrade(totalScore);

    // 5. AI 코멘트 생성
    let aiComment = "";
    try {
      const openai = getOpenAIClient();
      const prompt = `당신은 부동산 주변환경 분석 전문가입니다. 아래 데이터를 바탕으로 간결하고 유용한 3~4문장의 종합 코멘트를 작성하세요. 전세 입주자 관점에서 장점과 단점을 균형있게 설명하세요.

주소: ${address}
종합점수: ${totalScore}/100 (${totalGrade})

[교통] ${transport.score}점 — 지하철역 ${subway.length}개, 버스정류장 ${bus.length}개, 최근접 ${transport.nearest}m
[교육] ${education.score}점 — 학교 ${school.length}개, 학원 ${academy.length}개, 유치원 ${kindergarten.length}개, 최근접 ${education.nearest}m
[의료] ${medical.score}점 — 병원 ${hospital.length}개, 약국 ${pharmacy.length}개, 최근접 ${medical.nearest}m
[편의] ${conv.score}점 — 마트 ${mart.length}개, 편의점 ${convenience.length}개, 최근접 ${conv.nearest}m
[생활] ${living.score}점 — 공원 ${park.length}개, 은행 ${bank.length}개, 최근접 ${living.nearest}m`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 300,
      });
      aiComment = completion.choices[0]?.message?.content?.trim() ?? "";
    } catch {
      aiComment = `${address} 주변 종합 환경 점수는 ${totalScore}점(${totalGrade})입니다.`;
    }

    return NextResponse.json({
      address,
      lat: coord.lat,
      lng: coord.lng,
      categories: {
        transport: { score: transport.score, grade: transport.grade, count: transport.count, nearest: transport.nearest, items: transport.items.slice(0, 10) },
        education: { score: education.score, grade: education.grade, count: education.count, nearest: education.nearest, items: education.items.slice(0, 10) },
        medical: { score: medical.score, grade: medical.grade, count: medical.count, nearest: medical.nearest, items: medical.items.slice(0, 10) },
        convenience: { score: conv.score, grade: conv.grade, count: conv.count, nearest: conv.nearest, items: conv.items.slice(0, 10) },
        living: { score: living.score, grade: living.grade, count: living.count, nearest: living.nearest, items: living.items.slice(0, 10) },
      },
      facilities: Object.fromEntries(
        Object.entries(facilities).map(([k, v]) => [k, { label: v.label, category: v.category, color: v.color, count: v.items.length, items: v.items.slice(0, 8) }])
      ),
      totalScore,
      totalGrade,
      aiComment,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "분석 중 오류가 발생했습니다.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
