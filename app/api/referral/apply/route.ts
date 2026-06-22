import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-utils";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  const { code } = await req.json();
  if (!code?.trim()) {
    return NextResponse.json({ error: "Code is required" }, { status: 422 });
  }

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
