
-- Fix: function_search_path_mutable on touch_editor_prefs_updated_at
CREATE OR REPLACE FUNCTION public.touch_editor_prefs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Fix: SECURITY DEFINER functions executable by anon/authenticated.
-- Trigger-only functions: revoke from PUBLIC, anon, authenticated (triggers don't need EXECUTE grants).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.notify_video_created() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_video_created() FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.notify_video_updated() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_video_updated() FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.notify_editor_assigned() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_editor_assigned() FROM anon, authenticated;

-- admin_user_ids is only called from trigger functions
REVOKE EXECUTE ON FUNCTION public.admin_user_ids() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_user_ids() FROM anon, authenticated;

-- has_role is invoked inside RLS policies for authenticated users; keep authenticated, revoke from anon and PUBLIC
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;

-- next_rec_* are called via RPC by authenticated editors; keep authenticated, revoke anon + PUBLIC
REVOKE EXECUTE ON FUNCTION public.next_rec_number() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.next_rec_number() FROM anon;
REVOKE EXECUTE ON FUNCTION public.next_rec_order(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.next_rec_order(integer) FROM anon;

-- Fix: notifications_any_user_insert — drop self-insert policy.
-- Notifications are inserted via SECURITY DEFINER triggers and edge functions (service role), which bypass RLS.
DROP POLICY IF EXISTS "Users can create own notifications" ON public.notifications;

-- Fix: thumbnails_bucket_unrestricted_write and public_bucket_allows_listing
DROP POLICY IF EXISTS "Public read thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update thumbnails" ON storage.objects;

-- Public file access via getPublicUrl still works (bucket is public); we only restrict LIST and WRITE via RLS.
CREATE POLICY "Staff list thumbnails"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'thumbnails'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'editor'::app_role)
    OR public.has_role(auth.uid(), 'diseñador'::app_role)
    OR public.has_role(auth.uid(), 'cliente'::app_role)
  )
);

CREATE POLICY "Staff upload thumbnails"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'thumbnails'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'editor'::app_role)
  )
);

CREATE POLICY "Staff update thumbnails"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'thumbnails'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'editor'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'thumbnails'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'editor'::app_role)
  )
);
