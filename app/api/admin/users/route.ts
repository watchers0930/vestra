import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAdminAuth } from "@/lib/with-admin-auth";

export const GET = withAdminAuth(async (request) => {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        verifyStatus: true,
        dailyLimit: true,
        businessNumber: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    prisma.user.count(),
  ]);

  return NextResponse.json({ users, total, page, limit, totalPages: Math.ceil(total / limit) });
});
