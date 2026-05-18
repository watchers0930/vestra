import { NextRequest } from "next/server";
import { createDynamicAuth, handlers as staticHandlers } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { handlers } = await createDynamicAuth();
    return await handlers.GET(req);
  } catch (error) {
    console.error("[auth] dynamic GET fallback:", error);
    return staticHandlers.GET(req);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { handlers } = await createDynamicAuth();
    return await handlers.POST(req);
  } catch (error) {
    console.error("[auth] dynamic POST fallback:", error);
    return staticHandlers.POST(req);
  }
}
