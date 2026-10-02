/**
 * 전문가(법무사) 시드 — 등기온 고종희 사무장
 *
 * 등기온(dgon.co.kr, 법무법인 시화) 공개자료 기반(대장 승인, 미확인 값은 추후 확인).
 * 기존 데모 법무사 '이서준'은 비활성화해 SPECIALIST/목록에서 고종희로 대체.
 * 멱등: email/userId 기준 upsert.
 *
 * 실행: set -a && . ./.env.local && set +a && npx tsx prisma/seed-expert-gojonghee.ts
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const prisma = new PrismaClient();

const EMAIL = "gojonghee@dgon.co.kr";
const SLUG = "judicial-gojonghee";

// 프로필 아바타(흑백 플랫 일러스트). repo 자산을 dataURL로 임베드.
const AVATAR_DATA_URL = `data:image/jpeg;base64,${readFileSync("prisma/seed-assets/gojonghee.jpg").toString("base64")}`;

const PARTNER = {
  category: "judicial",
  name: "고종희 법무법인 사무장",
  firmName: "등기온",
  phone: null as string | null,
  officePhone: "1833-5482",
  headline: "법인·부동산 등기 전문 · 방문 없이 서류 없이, 복잡한 등기도 빠르고 정확하게.",
  bio: "15년 이상 경력의 등기 전문팀과 함께 법인등기·부동산등기(소유권이전·근저당·상속·증여)를 온라인 비대면으로 신속·정확하게 처리합니다. '내 방 안의 등기소'를 지향합니다.",
  careers: [
    "등기온(법무법인 시화) 등기 전문 사무장",
    "법인등기·부동산등기 전문",
    "온라인 비대면 등기 처리 누적 5,000건+",
  ],
  schools: [] as string[],
  // 추가정보(주소·연락처·채널)는 노출 시 외부 이탈 우려로 비움 → 모달에서 섹션 미표시
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
const FIVES = { expertise: 9, response: 8, communication: 10, result: 9, value: 7 };

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

  // 항목별 평점 후기 12건(멱등: 기존 삭제 후 재생성)
  await prisma.lawyerRating.deleteMany({ where: { lawyerId: partner.id } });
  const ratings = Array.from({ length: REVIEW_COUNT }, (_, i) => {
    const e = i < FIVES.expertise ? 5 : 4;
    const r = i < FIVES.response ? 5 : 4;
    const c = i < FIVES.communication ? 5 : 4;
    const rs = i < FIVES.result ? 5 : 4;
    const v = i < FIVES.value ? 5 : 4;
    return {
      lawyerId: partner.id,
      userId: `seed-gojh-user-${i}`,
      caseId: `seed-gojh-case-${i}`,
      scoreExpertise: e, scoreResponse: r, scoreCommunication: c, scoreResult: rs, scoreValue: v,
      avgScore: (e + r + c + rs + v) / 5,
    };
  });
  await prisma.lawyerRating.createMany({ data: ratings });

  // 기존 데모 법무사 '이서준' 비활성화 → SPECIALIST/목록에서 고종희로 대체
  const deact = await prisma.lawyerPartner.updateMany({
    where: { name: "이서준", category: "judicial" },
    data: { active: false },
  });

  console.log("✅ 고종희 upsert 완료");
  console.log("  partnerId:", partner.id, "avgRating:", partner.avgRating, "후기:", REVIEW_COUNT);
  console.log("  firm:", partner.firmName, "| category:", partner.category);
  console.log("  이서준 비활성화:", deact.count, "건");
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
