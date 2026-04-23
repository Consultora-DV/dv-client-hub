-- 1. Make documents bucket private
UPDATE storage.buckets SET public = false WHERE id = 'documents';

-- 2. Drop the public-readable policy
DROP POLICY IF EXISTS "Public read documents" ON storage.objects;

-- 3. Replace broad authenticated SELECT with ownership/role-scoped policy
DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;

CREATE POLICY "Staff or owning client can read documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR has_role(auth.uid(), 'diseñador'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.documents d
      WHERE (d.file_url LIKE '%' || storage.objects.name || '%'
             OR d.drive_link LIKE '%' || storage.objects.name || '%')
        AND d.cliente_id = auth.uid()
        AND has_role(auth.uid(), 'cliente'::app_role)
    )
  )
);

-- 4. Enable HIBP leaked password protection
-- (Configured via supabase auth API, handled by the auth tool below as well,
-- but we set the project-level config here for completeness.)
-- NOTE: This setting lives in auth config, not SQL, so handled via configure_auth.