"use client";

import { useState } from "react";
import { FlagIcon } from "lucide-react";
import SaveAgentButton from "@/components/SaveAgentButton";
import ReportAgentModal from "@/components/ReportAgentModal";

interface Props {
  agentId: string;
  agentSlug: string;
  agentName: string;
  initialSaved: boolean;
  isLoggedIn: boolean;
}

export default function AgentPageActions({
  agentId,
  agentSlug,
  agentName,
  initialSaved,
  isLoggedIn,
}: Props) {
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {isLoggedIn && (
        <SaveAgentButton
          agentId={agentId}
          isLoggedIn
          initialSaved={initialSaved}
          variant="page"
        />
      )}
      <button
        type="button"
        onClick={() => setReportOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400 hover:border-slate-600 hover:text-slate-200 transition"
        aria-label="Report this agent"
      >
        <FlagIcon className="h-3.5 w-3.5" />
        Report
      </button>
      {reportOpen && (
        <ReportAgentModal
          agentName={agentName}
          agentSlug={agentSlug}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  );
}
