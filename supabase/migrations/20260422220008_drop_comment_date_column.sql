-- P2-11: video_comments y script_comments tenían date y created_at con el mismo valor.
-- Ambos tienen DEFAULT now() y nunca se establecían de forma diferente.
-- Consolidamos en created_at (estándar del proyecto) y eliminamos date.

-- Preservar created_at en caso de que haya divergencia (aunque no debería haberla)
UPDATE public.video_comments
  SET created_at = date
  WHERE date IS NOT NULL AND date < created_at;

UPDATE public.script_comments
  SET created_at = date
  WHERE date IS NOT NULL AND date < created_at;

ALTER TABLE public.video_comments DROP COLUMN IF EXISTS date;
ALTER TABLE public.script_comments DROP COLUMN IF EXISTS date;
