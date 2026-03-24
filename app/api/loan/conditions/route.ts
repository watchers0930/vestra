import { NextRequest, NextResponse } from "next/server";
import { getLoanConditions } from "@/lib/loan-simulator";

export async function GET(req: NextRequest) {
  const propertyType = req.nextUrl.searchParams.get("propertyType") || undefined;
  const conditions = getLoanConditions(propertyType);

  return NextResponse.json({
    conditions: conditions.map((c) => ({
      bankName: c.bankName,
      productName: c.productName,
      maxLTV: c.maxLTV,
      maxDTI: c.maxDTI,
      maxAmount: c.maxAmount,
      rateRange: c.rateRange,
      propertyTypes: c.propertyTypes,
      isFirstHomeOnly: c.isFirstHomeOnly,
    })),
    total: conditions.length,
  });
}
