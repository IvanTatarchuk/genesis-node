import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await req.json();
  if (!code?.trim()) {
    return NextResponse.json({ error: "Code is required" }, { status: 422 });
  }

  const service = createServiceClient();

  const { data, error } = await service.rpc("apply_referral", {
    p_new_user_id:   user.id,
    p_referral_code: code.trim().toUpperCase(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Invalid or already used referral code." },
      { status: 422 }
    );
  }

  return NextResponse.json({ success: true, creditsAdded: 200 });
}
