"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/lib/database.types";

interface Props {
  currentRole: UserRole;
}

export default function RoleSwitcher({ currentRole }: Props) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router   = useRouter();

  async function toggle() {
    setLoading(true);
    const newRole: UserRole = currentRole === "client" ? "dev" : "client";
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // @ts-expect-error Supabase client infers profiles update arg as never with current generics
    await supabase.from("profiles").update({ role: newRole }).eq("id", user.id);
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="text-xs text-indigo-400 hover:text-indigo-300 transition disabled:opacity-50"
    >
      {loading ? "switching…" : `Switch to ${currentRole === "client" ? "Developer" : "Client"} mode →`}
    </button>
  );
}
