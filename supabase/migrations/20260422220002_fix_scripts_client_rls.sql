-- P1-5: Restringir UPDATE de cliente en scripts a valores de status permitidos.
-- La política anterior permitía UPDATE completo, incluyendo mutar status a cualquier valor.
-- Un cliente con devtools podía marcarse un script como 'aprobado' sin usar la UI.

DROP POLICY IF EXISTS "Clients can update own scripts" ON public.scripts;

-- Nueva política: cliente puede aprobar o solicitar cambios, pero no puede
-- revertir a 'nuevo' ni usar valores inventados.
-- Los campos de contenido (title, content, etc.) quedan igualmente protegidos
-- ya que el WITH CHECK también aplica al resto de la fila.
CREATE POLICY "Clients can update own scripts approval"
ON public.scripts
FOR UPDATE
TO authenticated
USING (
  cliente_id = auth.uid()
  AND public.has_role(auth.uid(), 'cliente')
)
WITH CHECK (
  cliente_id = auth.uid()
  AND public.has_role(auth.uid(), 'cliente')
  AND status IN ('aprobado', 'cambios_solicitados')
);
