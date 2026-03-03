-- ═══════════════════════════════════════════════════════════════════════
-- TRINITY SCHEMA — Holy Trinity Orchestrator tables
-- Owner: Ivan Tatarchuk
-- ═══════════════════════════════════════════════════════════════════════

-- Agent long-term memory
CREATE TABLE IF NOT EXISTS public.trinity_memory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent       TEXT NOT NULL CHECK (agent IN ('VASYLIY', 'HRYHORIY', 'IOANN')),
  type        TEXT NOT NULL CHECK (type IN ('observation', 'decision', 'report', 'error', 'knowledge')),
  content     TEXT NOT NULL,
  importance  INTEGER NOT NULL DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  tags        TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trinity_memory_agent_importance ON public.trinity_memory (agent, importance DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS trinity_memory_recent ON public.trinity_memory (created_at DESC);

-- Auto-prune: keep only last 333 entries per agent
CREATE OR REPLACE FUNCTION public.prune_trinity_memory()
RETURNS TRIGGER LANGUAGE plpgsql AS $fn$
BEGIN
  DELETE FROM public.trinity_memory
  WHERE id IN (
    SELECT id FROM public.trinity_memory
    WHERE agent = NEW.agent
    ORDER BY importance DESC, created_at DESC
    OFFSET 333
  );
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trinity_memory_prune ON public.trinity_memory;
CREATE TRIGGER trinity_memory_prune
  AFTER INSERT ON public.trinity_memory
  FOR EACH ROW EXECUTE FUNCTION public.prune_trinity_memory();

-- Agent state (current status of each agent)
CREATE TABLE IF NOT EXISTS public.trinity_state (
  agent           TEXT PRIMARY KEY CHECK (agent IN ('VASYLIY', 'HRYHORIY', 'IOANN')),
  last_run        TIMESTAMPTZ,
  last_report     TEXT,
  cycle_count     INTEGER NOT NULL DEFAULT 0,
  health_score    INTEGER NOT NULL DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
  current_focus   TEXT,
  metrics         JSONB NOT NULL DEFAULT '{}',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.trinity_state (agent) VALUES ('VASYLIY'), ('HRYHORIY'), ('IOANN')
ON CONFLICT (agent) DO NOTHING;

-- Inter-agent message bus
CREATE TABLE IF NOT EXISTS public.trinity_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent  TEXT NOT NULL,
  to_agent    TEXT NOT NULL,  -- agent name or 'ALL'
  content     TEXT NOT NULL,
  priority    TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trinity_messages_unread ON public.trinity_messages (to_agent, is_read, created_at);

-- Auto-clean old messages (keep 33 per agent)
CREATE OR REPLACE FUNCTION public.clean_trinity_messages()
RETURNS TRIGGER LANGUAGE plpgsql AS $fn$
BEGIN
  DELETE FROM public.trinity_messages
  WHERE is_read = TRUE AND created_at < NOW() - INTERVAL '3 days';
  RETURN NEW;
END;
$fn$;

-- Cycle execution log
CREATE TABLE IF NOT EXISTS public.trinity_cycles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_number     INTEGER NOT NULL,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  duration_seconds INTEGER,
  is_night_cycle   BOOLEAN NOT NULL DEFAULT FALSE,
  status           TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  summary          TEXT
);

CREATE INDEX IF NOT EXISTS trinity_cycles_recent ON public.trinity_cycles (cycle_number DESC);

-- Agent reports
CREATE TABLE IF NOT EXISTS public.trinity_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent       TEXT NOT NULL,
  cycle       INTEGER NOT NULL DEFAULT 0,
  report_type TEXT NOT NULL CHECK (report_type IN ('technical', 'strategic', 'ux')),
  content     TEXT NOT NULL,
  metrics     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trinity_reports_agent ON public.trinity_reports (agent, created_at DESC);

-- Enable Realtime for monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.trinity_cycles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trinity_state;
