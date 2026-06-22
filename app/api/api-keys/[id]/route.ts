import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-utils";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  await service.from("api_keys").delete().eq("id", id).eq("profile_id", user.id);

  return NextResponse.json({ success: true });
}
