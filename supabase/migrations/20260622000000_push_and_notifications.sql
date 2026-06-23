-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Web Push subscriptions  +  (re)install notification triggers  ║
-- ║  Run this ONCE in the Supabase SQL editor. Fully idempotent.   ║
-- ║                                                                ║
-- ║  Why re-install the triggers: notifications never fired in      ║
-- ║  practice because the trigger migration was likely never        ║
-- ║  applied. This file recreates them so the in-app bell works,    ║
-- ║  and adds push_subscriptions so the phone push can work too.    ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ══════════════════════════════════════════════════════════════════
-- PART 1 — push_subscriptions (one row per device/browser)
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint     text NOT NULL UNIQUE,
  p256dh       text NOT NULL,
  auth         text NOT NULL,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Each user manages only their own device subscriptions.
DROP POLICY IF EXISTS "push_select_own" ON public.push_subscriptions;
CREATE POLICY "push_select_own" ON public.push_subscriptions
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "push_insert_own" ON public.push_subscriptions;
CREATE POLICY "push_insert_own" ON public.push_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_update_own" ON public.push_subscriptions;
CREATE POLICY "push_update_own" ON public.push_subscriptions
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_delete_own" ON public.push_subscriptions;
CREATE POLICY "push_delete_own" ON public.push_subscriptions
  FOR DELETE USING (user_id = auth.uid());

-- NOTE: the `send-push` edge function uses the SERVICE ROLE key, which bypasses
-- RLS, so it can read every user's subscriptions to deliver pushes.

-- ══════════════════════════════════════════════════════════════════
-- PART 2 — notification columns (idempotent)
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS email_sent    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata      jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS actor_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unsent
  ON public.notifications (user_id, email_sent) WHERE email_sent = false;

-- ══════════════════════════════════════════════════════════════════
-- PART 3 — helper: all admin user_ids
-- ══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_user_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT user_id FROM user_roles WHERE role = 'admin';
$$;

-- ══════════════════════════════════════════════════════════════════
-- PART 4 — trigger: video INSERT (editor uploaded a delivery)
-- ══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.notify_video_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  editor_label text;
  admin_id     uuid;
  rec_label    text;
BEGIN
  IF NEW.editor_id IS NULL THEN RETURN NEW; END IF;

  editor_label := COALESCE(NEW.editor_name, 'Un editor');
  rec_label := COALESCE('R' || NEW.rec_number || '-' || lpad(NEW.rec_order::text, 2, '0'), 'sin REC');

  -- Notify every admin (except the editor themselves, if an admin uploads).
  FOR admin_id IN SELECT u FROM admin_user_ids() AS u WHERE u <> NEW.editor_id LOOP
    INSERT INTO notifications (user_id, type, message, link, actor_id, metadata)
    VALUES (
      admin_id, 'video_ready',
      editor_label || ' subió: "' || NEW.title || '" (' || rec_label || ')',
      '/admin/entregas', NEW.editor_id,
      jsonb_build_object('video_id', NEW.id, 'title', NEW.title, 'cliente_id', NEW.cliente_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_video_created ON videos;
CREATE TRIGGER trg_notify_video_created
  AFTER INSERT ON videos
  FOR EACH ROW EXECUTE FUNCTION notify_video_created();

-- ══════════════════════════════════════════════════════════════════
-- PART 5 — trigger: video UPDATE (status change / marked paid)
-- ══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.notify_video_updated()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  status_label text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.editor_id IS NOT NULL THEN
    status_label := CASE NEW.status
      WHEN 'approved'  THEN 'aprobado ✅'
      WHEN 'changes'   THEN 'requiere cambios ✏️'
      WHEN 'published' THEN 'publicado 🌐'
      WHEN 'in_review' THEN 'en revisión 👀'
      WHEN 'pending'   THEN 'por hacer 📝'
      ELSE NEW.status
    END;

    INSERT INTO notifications (user_id, type, message, link, actor_id, metadata)
    VALUES (
      NEW.editor_id,
      CASE NEW.status
        WHEN 'approved' THEN 'video_aprobado'
        WHEN 'changes'  THEN 'video_cambios'
        ELSE 'video_ready'
      END,
      'Tu entrega "' || NEW.title || '" cambió a: ' || status_label,
      '/editor/dashboard', auth.uid(),
      jsonb_build_object('video_id', NEW.id, 'new_status', NEW.status)
    );
  END IF;

  IF (COALESCE(OLD.pagado, false) = false) AND (NEW.pagado = true) AND NEW.editor_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, message, link, actor_id, metadata)
    VALUES (
      NEW.editor_id, 'video_aprobado',
      '💰 Te marcaron como pagado: "' || NEW.title || '"',
      '/editor/dashboard', auth.uid(),
      jsonb_build_object('video_id', NEW.id, 'pagado', true)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_video_updated ON videos;
CREATE TRIGGER trg_notify_video_updated
  AFTER UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION notify_video_updated();

-- ══════════════════════════════════════════════════════════════════
-- PART 6 — trigger: editor_clients INSERT (client assigned to editor)
-- ══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.notify_editor_assigned()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cliente_label text;
BEGIN
  SELECT COALESCE(display_name, email, 'Cliente')
    INTO cliente_label
    FROM profiles WHERE user_id = NEW.cliente_id LIMIT 1;

  INSERT INTO notifications (user_id, type, message, link, actor_id, metadata)
  VALUES (
    NEW.editor_id, 'video_ready',
    '👥 Te asignaron nuevo cliente: ' || COALESCE(cliente_label, 'Cliente'),
    '/editor/dashboard', NEW.assigned_by,
    jsonb_build_object('cliente_id', NEW.cliente_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_editor_assigned ON editor_clients;
CREATE TRIGGER trg_notify_editor_assigned
  AFTER INSERT ON editor_clients
  FOR EACH ROW EXECUTE FUNCTION notify_editor_assigned();

-- ══════════════════════════════════════════════════════════════════
-- PART 7 — admin RLS for the manual email-digest inbox
-- ══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "admin_update_email_sent" ON notifications;
CREATE POLICY "admin_update_email_sent" ON notifications
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_read_all_notifications" ON notifications;
CREATE POLICY "admin_read_all_notifications" ON notifications
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ── Quick self-check (optional): should list 3 triggers ──────────
-- SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_notify%';
