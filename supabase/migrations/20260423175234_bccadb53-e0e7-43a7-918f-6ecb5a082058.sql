-- P2-7: Endurecer policies del bucket "documents"
-- Lectura pública se mantiene (bucket sigue público para mostrar thumbnails y docs)
-- pero solo admin/editor pueden escribir/modificar/borrar.

-- Limpiar policies anteriores si existen (por nombre conocido)
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Public read documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin and editor can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin and editor can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin and editor can delete documents" ON storage.objects;

-- Lectura pública (bucket público requiere policy SELECT explícita en algunas configs)
CREATE POLICY "Public read documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

-- Solo admin/editor pueden subir
CREATE POLICY "Admin and editor can upload documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  );

-- Solo admin/editor pueden actualizar
CREATE POLICY "Admin and editor can update documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  );

-- Solo admin/editor pueden borrar
CREATE POLICY "Admin and editor can delete documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  );