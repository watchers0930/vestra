/**
 * 전문가(세무사) 시드 — 청우세무회계 남궁진 세무사
 *
 * 온라인 공개자료 기반(대장 승인, 미확인 값은 추후 확인 예정).
 * 멱등: email/userId 기준 upsert 라 재실행 안전.
 *
 * 실행: set -a && . ./.env.local && set +a && npx tsx prisma/seed-expert-namgungjin.ts
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const prisma = new PrismaClient();

const EMAIL = "namgungjin@chungwootax.com";
const SLUG = "tax-namgungjin";

// 프로필 아바타(흑백 플랫 일러스트). repo 자산을 dataURL로 임베드 → 배포 불필요, CSP data: 허용.
const AVATAR_DATA_URL = `data:image/jpeg;base64,${readFileSync("prisma/seed-assets/namgungjin.jpg").toString("base64")}`;

const PARTNER = {
  category: "tax",
  name: "남궁진",
  firmName: "청우세무회계",
  phone: "010-8511-2138",
  officePhone: "02-485-0100",
  headline: "창업·기장·절세 전문 · 개인과 법인 세무를 진짜 내편처럼 챙깁니다.",
  bio: "고객 편에서 함께 고민하고 친절한 상담으로 만족을 드리는 기장 전문 세무사입니다. 창업 컨설팅부터 세무 기장·절세 상담까지 개인·법인의 세무 전반을 상담합니다. 공인회계사회장상을 수상한 성적우수자입니다.",
  careers: [
    "청우세무회계 대표 세무사",
    "공인회계사 · 세무사",
  ],
  schools: [] as string[],
  etcInfo:
    "경기 하남시 덕풍동로 111 풍산캐슬빌딩 306호\n홈페이지 chungwootax.com\n네이버블로그 blog.naver.com/tax2138\n유튜브 '세금요정 지니'\n카카오톡 상담",
  kycStatus: "verified",
  membershipStatus: "active",
  homepageActive: false,
  active: true,
  photoUrl: AVATAR_DATA_URL as string | null,
  hourlyFee: null as number | null,
  avgRating: 4.7,
  ratingCount: 12,
};

// 항목별 후기 평점(적당히 좋게) — 12건. i<fives[key]면 5점, 아니면 4점.
// 평균: 전문성4.83·응답4.58·소통4.92·결과4.67·비용4.50 → 전체 4.7.
const REVIEW_COUNT = 12;
const FIVES = { expertise: 10, response: 7, communication: 11, result: 8, value: 6 };

async function main() {
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { role: "LAWYER", name: PARTNER.name },
    create: { email: EMAIL, name: PARTNER.name, role: "LAWYER" },
  });

  const partner = await prisma.lawyerPartner.upsert({
    where: { userId: user.id },
    update: PARTNER,
    create: { userId: user.id, homepageSlug: SLUG, ...PARTNER },
  });

  // 항목별 평점 후기 생성(멱등: 기존 삭제 후 재생성)
  await prisma.lawyerRating.deleteMany({ where: { lawyerId: partner.id } });
  const ratings = Array.from({ length: REVIEW_COUNT }, (_, i) => {
    const e = i < FIVES.expertise ? 5 : 4;
    const r = i < FIVES.response ? 5 : 4;
    const c = i < FIVES.communication ? 5 : 4;
    const rs = i < FIVES.result ? 5 : 4;
    const v = i < FIVES.value ? 5 : 4;
    return {
      lawyerId: partner.id,
      userId: `seed-review-user-${i}`,
      caseId: `seed-nggj-case-${i}`,
      scoreExpertise: e, scoreResponse: r, scoreCommunication: c, scoreResult: rs, scoreValue: v,
      avgScore: (e + r + c + rs + v) / 5,
    };
  });
  await prisma.lawyerRating.createMany({ data: ratings });

  console.log("✅ upsert 완료");
  console.log("  userId:", user.id, "role:", user.role);
  console.log("  후기:", REVIEW_COUNT, "건, avgRating:", partner.avgRating);
  console.log("  partnerId:", partner.id, "category:", partner.category, "kycStatus:", partner.kycStatus, "active:", partner.active);
  console.log("  name:", partner.name, "/ firm:", partner.firmName);

  // 공개 목록 노출 조건(active + verified) 재검증
  const visible = await prisma.lawyerPartner.findFirst({
    where: { id: partner.id, active: true, kycStatus: "verified" },
    select: { id: true, name: true, category: true, headline: true },
  });
  console.log("  공개 목록 노출 조건 충족:", visible ? "YES" : "NO", visible ?? "");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("❌ 실패:", e);
    prisma.$disconnect();
    process.exit(1);
  });
