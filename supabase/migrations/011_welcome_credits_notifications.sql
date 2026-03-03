-- ═══════════════════════════════════════════════════════════════════════
-- 011: Welcome Credits + Notifications System
-- ═══════════════════════════════════════════════════════════════════════

-- ── Notifications table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,   -- task_complete | task_failed | credits_earned | new_referral | leaderboard | system
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,            -- optional deep link
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread ON public.notifications (user_id, is_read, created_at DESC);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications read"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (TRUE);

-- ── Function: create_notification ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type    TEXT,
  p_title   TEXT,
  p_body    TEXT DEFAULT NULL,
  p_link    TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (p_user_id, p_type, p_title, p_body, p_link)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ── Welcome credits on new profile ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.give_welcome_credits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Give 50 credits on signup (skip Darwin system user)
  IF NEW.balance = 0 THEN
    UPDATE public.profiles
    SET balance = 50
    WHERE id = NEW.id;
  END IF;

  -- Welcome notification
  PERFORM public.create_notification(
    NEW.id,
    'system',
    '🎉 Ласкаво просимо до Genesis Node!',
    'Ти отримав 50 безкоштовних кредитів. Задеплой першого агента прямо зараз!',
    '/marketplace'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_welcome ON public.profiles;
CREATE TRIGGER on_profile_created_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.give_welcome_credits();

-- ── Task notifications ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_task_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_agent_name TEXT;
BEGIN
  -- Only fire on status change
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  SELECT name INTO v_agent_name FROM public.agents WHERE id = NEW.agent_id;

  IF NEW.status = 'completed' THEN
    PERFORM public.create_notification(
      NEW.client_id,
      'task_complete',
      '✅ Задачу виконано!',
      v_agent_name || ' завершив роботу.',
      '/tasks/' || NEW.id
    );
  ELSIF NEW.status = 'failed' THEN
    PERFORM public.create_notification(
      NEW.client_id,
      'task_failed',
      '❌ Задача не виконана',
      v_agent_name || ' зіткнувся з помилкою. Спробуй ще раз.',
      '/tasks/' || NEW.id
    );
  ELSIF NEW.status = 'running' THEN
    PERFORM public.create_notification(
      NEW.client_id,
      'system',
      '🚀 Агент почав роботу',
      v_agent_name || ' виконує твою задачу...',
      '/tasks/' || NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_status_notify ON public.tasks;
CREATE TRIGGER on_task_status_notify
  AFTER UPDATE OF status ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_status();

-- ── Developer earnings notification ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_dev_earnings()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_dev_id   UUID;
  v_earned   INTEGER;
BEGIN
  -- When a task completes, notify the agent's developer
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    SELECT creator_id INTO v_dev_id FROM public.agents WHERE id = NEW.agent_id;
    IF v_dev_id IS NOT NULL THEN
      SELECT pending_payout_credits INTO v_earned FROM public.agents WHERE id = NEW.agent_id;
      PERFORM public.create_notification(
        v_dev_id,
        'credits_earned',
        '💰 Ти заробив кредити!',
        'Клієнт оплатив задачу твого агента.',
        '/dashboard/analytics'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_complete_notify_dev ON public.tasks;
CREATE TRIGGER on_task_complete_notify_dev
  AFTER UPDATE OF status ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_dev_earnings();

-- ── Mark all notifications read (utility) ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE
  WHERE user_id = p_user_id AND is_read = FALSE;
END;
$$;

-- Enable Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
