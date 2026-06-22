import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-utils";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { user, service } = auth;

  const body = await req.json() as {
    recipient_id: string;
    amount: number;
    message?: string;
  };

  const { recipient_id, amount, message } = body;

  if (!recipient_id || typeof amount !== "number" || amount < 1) {
    return NextResponse.json({ error: "recipient_id and a positive amount are required" }, { status: 422 });
  }
  if (recipient_id === user.id) {
    return NextResponse.json({ error: "Cannot donate to yourself" }, { status: 422 });
  }

  // Check sender's balance
  const { data: sender } = await service
    .from("profiles")
    .select("balance, display_name")
    .eq("id", user.id)
    .single() as { data: { balance: number; display_name: string | null } | null };

  if (!sender || sender.balance < amount) {
    return NextResponse.json({ error: "Insufficient credits", balance: sender?.balance ?? 0 }, { status: 402 });
  }

  // Check recipient exists
  const { data: recipient } = await service
    .from("profiles")
    .select("id, balance, display_name")
    .eq("id", recipient_id)
    .single() as { data: { id: string; balance: number; display_name: string | null } | null };

  if (!recipient) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  // Transfer credits
  const refId = crypto.randomUUID();

  const [senderUpdate, recipientUpdate, senderTxn, recipientTxn] = await Promise.all([
    service.from("profiles").update({ balance: sender.balance - amount }).eq("id", user.id),
    service.from("profiles").update({ balance: recipient.balance + amount }).eq("id", recipient_id),
    service.from("credit_transactions").insert({
      profile_id:   user.id,
      amount:       -amount,
      type:         "donation_sent",
      reference_id: refId,
      description:  `Donated ${amount} credits to ${recipient.display_name ?? "user"}`,
    }),
    service.from("credit_transactions").insert({
      profile_id:   recipient_id,
      amount,
      type:         "donation_received",
      reference_id: refId,
      description:  `Received ${amount} credits from ${sender.display_name ?? "user"}${message ? ` — "${message}"` : ""}`,
    }),
  ]);

  if (senderUpdate.error || recipientUpdate.error || senderTxn.error || recipientTxn.error) {
    return NextResponse.json({ error: "Transfer failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true, amount, recipient_id });
}
