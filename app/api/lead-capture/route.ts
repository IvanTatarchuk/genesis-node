import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const source = typeof body?.source === "string" ? body.source.slice(0, 64) : "homepage";

  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 422 });
  }

  const service = createServiceClient();
  const { error } = await service.from("lead_captures").insert({ email, source });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ success: true, message: "Already registered" });
    }
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Thanks! We'll be in touch." });
}
