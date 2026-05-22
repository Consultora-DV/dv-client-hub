-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Notifications System                                         ║
-- ║  Auto-triggers + email digest support                         ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── 1. Add email_sent + metadata columns ─────────────────────────
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS email_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unsent
  ON notifications (user_id, email_sent) WHERE email_sent = false;

-- ── 2. Helper: get all admin user_ids ────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_user_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE AS $$
  SELECT user_id FROM user_roles WHERE role = 'admin';
$$;

-- ── 3. Trigger: video INSERT (editor uploaded) ───────────────────
CREATE OR REPLACE FUNCTION public.notify_video_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  editor_label text;
  admin_id     uuid;
BEGIN
  -- Only trigger for editor-uploaded videos (those with editor_id set)
  IF NEW.editor_id IS NULL THEN RETURN NEW; END IF;

  editor_label := COALESCE(NEW.editor_name, 'Editor');

  -- Notify all admins
  FOR admin_id IN SELECT * FROM admin_user_ids() WHERE user_id <> NEW.editor_id LOOP
    INSERT INTO notifications (user_id, type, message, link, actor_id, metadata)
    VALUES (
      admin_id, 'video_ready',
      editor_label || ' subió: "' || NEW.title || '" (' || COALESCE('R' || NEW.rec_number || '-' || lpad(NEW.rec_order::text, 2, '0'), 'sin REC') || ')',
      '/admin/entregas',
      NEW.editor_id,
      jsonb_build_object('video_id', NEW.id, 'title', NEW.title, 'cliente_id', NEW.cliente_id)
    );
  END LOOP;

  -- Notify the cliente (do not duplicate if cliente=admin somehow)
  IF NEW.cliente_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM admin_user_ids() WHERE admin_user_ids = NEW.cliente_id) THEN
    INSERT INTO notifications (user_id, type, message, link, actor_id, metadata)
    VALUES (
      NEW.cliente_id, 'video_ready',
      'Nuevo video para revisar: "' || NEW.title || '"',
      '/videos',
      NEW.editor_id,
      jsonb_build_object('video_id', NEW.id, 'title', NEW.title)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_video_created ON videos;
CREATE TRIGGER trg_notify_video_created
  AFTER INSERT ON videos
  FOR EACH ROW EXECUTE FUNCTION notify_video_created();

-- ── 4. Trigger: video UPDATE (status / pagado / etc) ─────────────
CREATE OR REPLACE FUNCTION public.notify_video_updated()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  status_label text;
BEGIN
  -- Notify editor when STATUS changes
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
      '/editor/dashboard',
      auth.uid(),
      jsonb_build_object('video_id', NEW.id, 'new_status', NEW.status)
    );
  END IF;

  -- Notify editor when PAGADO toggles to true
  IF (COALESCE(OLD.pagado, false) = false) AND (NEW.pagado = true) AND NEW.editor_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, message, link, actor_id, metadata)
    VALUES (
      NEW.editor_id, 'video_aprobado',
      '💰 Te marcaron como pagado: "' || NEW.title || '"',
      '/editor/dashboard',
      auth.uid(),
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

-- ── 5. Trigger: editor_clients INSERT (asignación) ───────────────
CREATE OR REPLACE FUNCTION public.notify_editor_assigned()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cliente_label text;
BEGIN
  SELECT COALESCE(display_name, email, 'Cliente')
    INTO cliente_label
    FROM profiles
   WHERE user_id = NEW.cliente_id
   LIMIT 1;

  INSERT INTO notifications (user_id, type, message, link, actor_id, metadata)
  VALUES (
    NEW.editor_id, 'video_ready',
    '👥 Te asignaron nuevo cliente: ' || cliente_label,
    '/editor/dashboard',
    NEW.assigned_by,
    jsonb_build_object('cliente_id', NEW.cliente_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_editor_assigned ON editor_clients;
CREATE TRIGGER trg_notify_editor_assigned
  AFTER INSERT ON editor_clients
  FOR EACH ROW EXECUTE FUNCTION notify_editor_assigned();

-- ── 6. Allow admin to mark notifications as email_sent ───────────
DROP POLICY IF EXISTS "admin_update_email_sent" ON notifications;
CREATE POLICY "admin_update_email_sent" ON notifications
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_read_all_notifications" ON notifications;
CREATE POLICY "admin_read_all_notifications" ON notifications
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ── 7. Allow trigger inserts (SECURITY DEFINER bypasses RLS) ─────
-- Triggers already SECURITY DEFINER so they bypass RLS.
