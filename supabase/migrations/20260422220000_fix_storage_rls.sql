-- P0-1: Reemplazar políticas de Storage demasiado permisivas
-- El bucket 'documents' usaba path=bucket_id únicamente, sin filtro por cliente.
-- Estructura de path: {clienteId}/{timestamp}_{filename}
-- (storage.foldername(name))[1] devuelve el primer segmento = clienteId

-- 1. Eliminar políticas antiguas (no filtran por path ni rol)
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;

-- 2. Admin: acceso completo a todos los archivos del bucket
CREATE POLICY "Admin full access to documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'documents'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'documents'
  AND public.has_role(auth.uid(), 'admin')
);

-- 3. Editor: acceso completo a todos los archivos del bucket
CREATE POLICY "Editor full access to documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'documents'
  AND public.has_role(auth.uid(), 'editor')
)
WITH CHECK (
  bucket_id = 'documents'
  AND public.has_role(auth.uid(), 'editor')
);

-- 4. Diseñador: solo lectura de todos los archivos
CREATE POLICY "Diseñador can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND public.has_role(auth.uid(), 'diseñador')
);

-- 5. Cliente: solo puede leer archivos de su propia carpeta (primer segmento del path = su UUID)
CREATE POLICY "Cliente can read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.has_role(auth.uid(), 'cliente')
);
