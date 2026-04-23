-- P1-4: Restringir UPDATE de clientes en scripts
-- Antes: cliente podía editar cualquier campo de sus scripts
-- Ahora: cliente solo puede cambiar status a 'aprobado' o 'cambios_solicitados'

DROP POLICY IF EXISTS "Clients can update own scripts" ON public.scripts;

CREATE POLICY "Clients can approve or request changes on own scripts"
  ON public.scripts FOR UPDATE TO authenticated
  USING (cliente_id = auth.uid())
  WITH CHECK (
    cliente_id = auth.uid()
    AND status IN ('aprobado', 'cambios_solicitados')
  );