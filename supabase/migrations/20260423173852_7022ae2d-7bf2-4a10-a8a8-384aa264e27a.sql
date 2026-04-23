-- P1-1: Storage RLS para bucket "documents"
-- Antes: políticas abiertas permitían acceso anónimo
-- Ahora: solo admin/editor/diseñador via Storage; clientes acceden solo via tabla documents

-- Borrar políticas antiguas si existen
DROP POLICY IF EXISTS "Anyone can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Public access to documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;

-- Admin: full access al bucket documents
CREATE POLICY "Admin full access documents bucket"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));

-- Editor: full access al bucket documents
CREATE POLICY "Editor full access documents bucket"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'editor'))
  WITH CHECK (bucket_id = 'documents' AND public.has_role(auth.uid(), 'editor'));

-- Diseñador: full access al bucket documents
CREATE POLICY "Disenador full access documents bucket"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'diseñador'))
  WITH CHECK (bucket_id = 'documents' AND public.has_role(auth.uid(), 'diseñador'));