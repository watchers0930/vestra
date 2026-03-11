/**
 * 관리자 계정 시드 스크립트
 *
 * 실행: ADMIN_SEED_PASSWORD=YourStr0ng!Pass npx tsx prisma/seed-admin.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const seedPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!seedPassword || seedPassword.length < 8) {
    console.error(
      "ERROR: ADMIN_SEED_PASSWORD 환경변수를 8자 이상으로 설정하세요.\n" +
      "예: ADMIN_SEED_PASSWORD=MyStr0ng!Pass npx tsx prisma/seed-admin.ts"
    );
    process.exit(1);
  }
  const hashedPassword = await bcrypt.hash(seedPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@vestra.kr" },
    update: {
      password: hashedPassword,
      role: "ADMIN",
      dailyLimit: 9999,
    },
    create: {
      email: "admin@vestra.kr",
      name: "관리자",
      password: hashedPassword,
      role: "ADMIN",
      dailyLimit: 9999,
      verifyStatus: "verified",
    },
  });

  console.log("관리자 계정 생성 완료:", admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
