/**
 * AI 품질게이트 회귀 하버스 (측정 + 회귀차단)
 *
 * 골든 픽스처(__tests__/fixtures/ai-quality/*.json)를 판사에 통과시켜
 * 품질 채점이 여전히 "좋은 의견은 합격, 환각·누락 의견은 미달"로 판별하는지 검증한다.
 * 보안 CI 게이트(audit-api-auth)와 같은 철학이나, 판사는 실제 OpenAI를 호출하므로
 * prebuild에 넣지 않고 온디맨드(`npm run audit:ai-quality`)로 실행한다.
 *
 * 각 픽스처는 `expectPass`(합격 기대 여부)를 선언한다.
 * 실제 판정이 기대와 다르면 회귀로 간주하고 종료코드 1을 반환한다.
 *
 * 실행: OPENAI_API_KEY 필요.  `npm run audit:ai-quality`
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { judgeAnalysisQuality, type QualityGroundTruth } from "../lib/ai-quality-gate";

interface Fixture {
  name: string;
  expectPass: boolean;
  opinion: string;
  groundTruth: QualityGroundTruth;
}

const FIXTURE_DIR = join(process.cwd(), "__tests__", "fixtures", "ai-quality");

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY가 필요합니다. (.env.local 로드 후 실행)");
    process.exit(2);
  }

  const files = readdirSync(FIXTURE_DIR).filter((f) => f.endsWith(".json")).sort();
  if (files.length === 0) {
    console.error("❌ 픽스처가 없습니다:", FIXTURE_DIR);
    process.exit(2);
  }

  console.log(`\n🔍 AI 품질게이트 회귀 검증 — 픽스처 ${files.length}건\n`);
  console.log("결과  기대  종합  정확 근거 완결  픽스처");
  console.log("─".repeat(70));

  let regressions = 0;
  let skipped = 0;

  for (const file of files) {
    const fx = JSON.parse(readFileSync(join(FIXTURE_DIR, file), "utf-8")) as Fixture;
    const r = await judgeAnalysisQuality({ opinion: fx.opinion, groundTruth: fx.groundTruth });

    if (r.status === "skipped") {
      skipped++;
      console.log(`⏭️  skip  판사호출 실패 — ${fx.name}`);
      continue;
    }

    const ok = r.pass === fx.expectPass;
    if (!ok) regressions++;
    const mark = ok ? "✅" : "❌회귀";
    const expect = fx.expectPass ? "합격" : "미달";
    const actual = r.pass ? "합격" : "미달";
    console.log(
      `${mark}  ${expect}→${actual}  ${String(r.overall).padStart(3)}  ` +
        `${String(r.accuracy).padStart(3)} ${String(r.grounding).padStart(3)} ${String(r.completeness).padStart(3)}  ${fx.name}`,
    );
    if (!ok && r.issues.length > 0) {
      console.log(`         지적: ${r.issues.join(" / ")}`);
    }
  }

  console.log("─".repeat(70));
  console.log(`총 ${files.length}건 · 회귀 ${regressions}건 · 판사실패 ${skipped}건\n`);

  if (regressions > 0) {
    console.error(`❌ 품질게이트 회귀 ${regressions}건 — 임계값(70)·프롬프트·모델 변경을 점검하세요.`);
    process.exit(1);
  }
  if (skipped === files.length) {
    console.error("❌ 모든 판사 호출이 실패했습니다. API 키·네트워크를 확인하세요.");
    process.exit(1);
  }
  console.log("✅ 회귀 없음 — 품질게이트가 정상 판별합니다.");
}

main().catch((e) => {
  console.error("하버스 실행 오류:", e);
  process.exit(1);
});
