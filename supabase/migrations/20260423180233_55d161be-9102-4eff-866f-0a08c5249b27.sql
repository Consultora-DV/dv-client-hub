-- P2-8: Drop tablas legacy scripts y script_comments
-- Los guiones ahora se manejan dentro de documents/videos según el flujo nuevo.
-- El backup local del usuario contiene los datos en caso de necesitar restaurar.

DROP TABLE IF EXISTS public.script_comments CASCADE;
DROP TABLE IF EXISTS public.scripts CASCADE;