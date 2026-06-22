import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

const MIN_CREDITS = 10;
const MAX_CREDITS = 10_000;

/** POST /api/donate — Donate credits to a developer (creator) or to the platform */
export async function POST(req: NextRequest) {
  const sb = await createServerSupabaseClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {

  const body = await req.json();
  const { recipientType, recipientId, amount: rawAmount } = body as {
    recipientType: "developer" | "platform";
    recipientId?: string;
    amount: number;
  };

  const amount = Math.floor(Number(rawAmount));
  if (!Number.isFinite(amount) || amount < MIN_CREDITS || amount > MAX_CREDITS) {
    return NextResponse.json(
      { error: `Amount must be between ${MIN_CREDITS} and ${MAX_CREDITS} credits` },
      { status: 400 },
    );
  }

  if (recipientType !== "developer" && recipientType !== "platform") {
    return NextResponse.json({ error: "Invalid recipientType" }, { status: 400 });
  }

  if (recipientType === "developer" && !recipientId) {
    return NextResponse.json({ error: "recipientId required for developer donation" }, { status: 400 });
  }

  if (recipientType === "developer" && recipientId === user.id) {
    return NextResponse.json({ error: "You cannot donate to yourself" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: senderProfile } = await service
    .from("profiles")
    .select("balance, display_name")
    .eq("id", user.id)
    .single() as { data: { balance: number; display_name: string | null } | null };

  if (!senderProfile || senderProfile.balance < amount) {
    return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
  }

  const senderName = senderProfile.display_name ?? "Someone";

  if (recipientType === "developer") {
    const { data: recipient } = await service
      .from("profiles")
      .select("id, display_name")
      .eq("id", recipientId)
      .single() as { data: { id: string; display_name: string | null } | null };

    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    const recipientName = recipient.display_name ?? "Creator";

    const txnOut = await service.from("credit_transactions").insert([
      {
        profile_id: user.id,
        amount: -amount,
        type: "boost",
        reference_id: recipient.id,
        description: `Donation to ${recipientName}`,
      },
      {
        profile_id: recipient.id,
        amount,
        type: "bonus",
        reference_id: user.id,
        description: `Donation from ${senderName}`,
      },
    ]);
    if (txnOut.error) {
      console.error("[POST /api/donate] transaction insert failed:", txnOut.error);
      return NextResponse.json({ error: "Failed to record donation transaction" }, { status: 500 });
    }

    const { error: debitErr } = await service.from("profiles").update({ balance: senderProfile.balance - amount }).eq("id", user.id);
    if (debitErr) {
      console.error("[POST /api/donate] sender balance debit failed:", debitErr);
      return NextResponse.json({ error: "Failed to debit sender balance" }, { status: 500 });
    }

    const { data: recProfile } = await service.from("profiles").select("balance, total_earned").eq("id", recipient.id).single() as { data: { balance: number; total_earned: number } | null };
    if (recProfile) {
      const { error: creditErr } = await service.from("profiles").update({
        balance: recProfile.balance + amount,
        total_earned: recProfile.total_earned + amount,
      }).eq("id", recipient.id);
      if (creditErr) {
        console.error("[POST /api/donate] recipient credit failed:", creditErr);
        return NextResponse.json({ error: "Donation sent but recipient credit failed. Contact support." }, { status: 500 });
      }
    }
  } else {
    const txnOut = await service.from("credit_transactions").insert({
      profile_id: user.id,
      amount: -amount,
      type: "boost",
      reference_id: "platform",
      description: "Donation to Genesis Node",
    });
    if (txnOut.error) {
      console.error("[POST /api/donate] platform donation insert failed:", txnOut.error);
      return NextResponse.json({ error: "Failed to record donation" }, { status: 500 });
    }

    const { error: debitErr } = await service.from("profiles").update({ balance: senderProfile.balance - amount }).eq("id", user.id);
    if (debitErr) {
      console.error("[POST /api/donate] sender balance debit failed:", debitErr);
      return NextResponse.json({ error: "Failed to debit sender balance" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, amount });

  } catch (err) {
    console.error("[POST /api/donate] unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Donation failed" },
      { status: 500 }
    );
  }
}

