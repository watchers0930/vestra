/**
 * 전문가(공인중개사) 시드 — 가산열린부동산 한규리 대표
 *
 * 가산디지털단지(G밸리) 지식산업센터·오피스텔 중개 특성 기반(대장 승인, 미확인 값은 추후 확인).
 * 기존 데모 '정예린(부동산 중개사)'은 비활성화해 SPECIALIST/목록에서 한규리로 대체.
 * 멱등: email/userId 기준 upsert.
 *
 * 실행: set -a && . ./.env.local && set +a && npx tsx prisma/seed-expert-hangyuri.ts
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const prisma = new PrismaClient();

const EMAIL = "hangyuri@gasan-open.co.kr";
const SLUG = "realtor-hangyuri";

const AVATAR_DATA_URL = `data:image/jpeg;base64,${readFileSync("prisma/seed-assets/hangyuri.jpg").toString("base64")}`;

const PARTNER = {
  category: "공인중개사",
  name: "한규리 대표",
  firmName: "가산열린부동산",
  phone: null as string | null,
  officePhone: null as string | null,
  headline: "가산디지털단지 지식산업센터·오피스텔 전문 · 안전한 거래를 끝까지 책임집니다.",
  bio: "가산디지털단지(G밸리)의 지식산업센터·오피스텔·사무실·상가 거래를 전문으로 합니다. 시세 분석부터 계약·입주까지 안전한 거래를 꼼꼼히 챙깁니다.",
  careers: [
    "가산열린부동산 대표 공인중개사",
    "가산디지털단지(G밸리) 상업용·주거용 중개 전문",
    "지식산업센터·오피스텔 거래 전문",
  ],
  schools: [] as string[],
  etcInfo: "",
  kycStatus: "verified",
  membershipStatus: "active",
  homepageActive: false,
  active: true,
  photoUrl: AVATAR_DATA_URL as string | null,
  hourlyFee: null as number | null,
  avgRating: 4.7,
  ratingCount: 12,
};

const REVIEW_COUNT = 12;
const FIVES = { expertise: 9, response: 10, communication: 10, result: 9, value: 8 };

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

  await prisma.lawyerRating.deleteMany({ where: { lawyerId: partner.id } });
  const ratings = Array.from({ length: REVIEW_COUNT }, (_, i) => {
    const e = i < FIVES.expertise ? 5 : 4;
    const r = i < FIVES.response ? 5 : 4;
    const c = i < FIVES.communication ? 5 : 4;
    const rs = i < FIVES.result ? 5 : 4;
    const v = i < FIVES.value ? 5 : 4;
    return {
      lawyerId: partner.id,
      userId: `seed-hgr-user-${i}`,
      caseId: `seed-hgr-case-${i}`,
      scoreExpertise: e, scoreResponse: r, scoreCommunication: c, scoreResult: rs, scoreValue: v,
      avgScore: (e + r + c + rs + v) / 5,
    };
  });
  await prisma.lawyerRating.createMany({ data: ratings });

  // 기존 데모 '정예린(부동산 중개사)' 비활성화 → SPECIALIST/목록에서 한규리로 대체
  const deact = await prisma.lawyerPartner.updateMany({
    where: { name: "정예린" },
    data: { active: false },
  });

  console.log("✅ 한규리 upsert 완료");
  console.log("  partnerId:", partner.id, "avgRating:", partner.avgRating, "후기:", REVIEW_COUNT);
  console.log("  firm:", partner.firmName, "| category:", partner.category, "| name:", partner.name);
  console.log("  정예린 비활성화:", deact.count, "건");
  const visible = await prisma.lawyerPartner.findFirst({
    where: { id: partner.id, active: true, kycStatus: "verified" },
    select: { name: true, category: true },
  });
  console.log("  공개 노출 조건 충족:", visible ? "YES" : "NO", visible ?? "");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("❌ 실패:", e);
    prisma.$disconnect();
    process.exit(1);
  });
