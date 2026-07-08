import { NextResponse } from "next/server";
import { getPGSettings } from "@/lib/system-settings";

export async function GET() {
  try {
    const settings = await getPGSettings();
    const clientKey = settings["TOSS_CLIENT_KEY"] || process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || null;
    return NextResponse.json({ clientKey });
  } catch {
    return NextResponse.json({ clientKey: null });
  }
}
