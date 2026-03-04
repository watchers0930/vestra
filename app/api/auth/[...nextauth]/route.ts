import { NextRequest } from "next/server";
import { createDynamicAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { handlers } = await createDynamicAuth();
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  const { handlers } = await createDynamicAuth();
  return handlers.POST(req);
}
