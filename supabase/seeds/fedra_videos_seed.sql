-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Seed: videos históricos de Dra. Fedra Aldama (R1–R6)        ║
-- ║  Fuente: Notion "Dra Fedra WorkFlow Edición"                 ║
-- ║                                                              ║
-- ║  Auto-resuelve el UUID por email — solo copy/paste y Run.    ║
-- ╚══════════════════════════════════════════════════════════════╝

DO $$
DECLARE
  fedra_id uuid;
BEGIN
  -- Resolver UUID por email (cámbialo si el email es otro)
  SELECT user_id INTO fedra_id
    FROM profiles
   WHERE email = 'consultoriodrafedraaldama@gmail.com'
   LIMIT 1;

  IF fedra_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró a Fedra. Verifica que el email sea correcto.';
  END IF;

  -- Evita duplicar si ya se corrió antes
  IF EXISTS (SELECT 1 FROM videos WHERE cliente_id = fedra_id AND rec_number IS NOT NULL) THEN
    RAISE NOTICE 'Fedra ya tiene videos con REC. Saltando inserción.';
    RETURN;
  END IF;

INSERT INTO videos (
  cliente_id, rec_number, rec_order, title, status, priority,
  drive_link, thumbnail, referencia_guion, link_publicado,
  costo, moneda, pagado, editor_name, published_at, platform
) VALUES
-- ─── REC 1 (1ra Tanda) ──────────────────────────────────────
(fedra_id, 1, 1, 'B-Roll Referencia (Historia Ana)',     'approved', 'normal', NULL, NULL, NULL, NULL, 15, 'USD', true,  NULL, '2026-01-11'::timestamptz, ARRAY['instagram']),
(fedra_id, 1, 2, 'Pizarrón (3 puntos)',                  'approved', 'normal', NULL, NULL, NULL, NULL, 20, 'USD', true,  NULL, '2026-01-24'::timestamptz, ARRAY['instagram']),
(fedra_id, 1, 3, 'Storytelling (Pastel/Duelo)',          'pending',  'normal', NULL, NULL, NULL, NULL, 20, 'USD', false, NULL, NULL, ARRAY['instagram']),
(fedra_id, 1, 4, 'Frontal + Edición (>30 años)',         'pending',  'alta',   NULL, NULL, NULL, NULL, 20, 'USD', false, NULL, NULL, ARRAY['instagram']),
(fedra_id, 1, 5, 'Hey Doctora (Preguntas)',              'approved', 'alta',   NULL, NULL, NULL, NULL, 10, 'MXN', true,  NULL, '2026-01-22'::timestamptz, ARRAY['instagram']),
(fedra_id, 1, 6, 'Podcast (No magia)',                   'pending',  'normal', NULL, NULL, NULL, NULL, 20, 'USD', true,  NULL, NULL, ARRAY['instagram']),
(fedra_id, 1, 7, 'Comparativas (Calorías)',              'pending',  'normal', NULL, NULL, NULL, NULL, 20, 'USD', false, NULL, NULL, ARRAY['instagram']),
(fedra_id, 1, 8, 'Sketch (Miedos paciente)',             'pending',  'normal', NULL, NULL, NULL, NULL, 20, 'USD', false, NULL, NULL, ARRAY['instagram']),

-- ─── REC 2 (2da Tanda) ──────────────────────────────────────
(fedra_id, 2, 1, 'Casual hablado (Semaglutida)',         'approved', 'normal', NULL, NULL, NULL, NULL, 20, 'USD', true, NULL, '2026-01-09'::timestamptz, ARRAY['instagram']),
(fedra_id, 2, 2, 'Podcast (Tirzepatida/Lipedema)',       'approved', 'normal', NULL, NULL, NULL, NULL, 20, 'USD', true, NULL, '2026-01-04'::timestamptz, ARRAY['instagram']),
(fedra_id, 2, 3, 'Lo que pasa Si (6 meses)',             'approved', 'normal', NULL, NULL, NULL, NULL, 20, 'USD', true, NULL, '2026-01-06'::timestamptz, ARRAY['instagram']),
(fedra_id, 2, 4, 'Puede si no (Preguntas rápidas)',      'approved', 'normal', NULL, NULL, NULL, NULL, 20, 'USD', true, NULL, '2026-02-07'::timestamptz, ARRAY['instagram']),
(fedra_id, 2, 5, 'Lo que yo haría (12kg 3 meses)',       'pending',  'alta',   NULL, NULL, NULL, NULL, 20, 'USD', true, NULL, NULL, ARRAY['instagram']),
(fedra_id, 2, 6, 'Experta Frontal (Tirzepatida)',        'pending',  'normal', NULL, NULL, NULL, NULL, 20, 'USD', false, NULL, NULL, ARRAY['instagram']),
(fedra_id, 2, 7, 'Testimonios (Laura 31kg)',             'pending',  'normal', NULL, NULL, NULL, NULL, 20, 'USD', false, NULL, NULL, ARRAY['instagram']),
(fedra_id, 2, 8, '3 Medicamentos Aprobados',             'approved', 'normal', NULL, NULL, NULL, NULL, 20, 'USD', true, NULL, '2026-01-18'::timestamptz, ARRAY['instagram']),
(fedra_id, 2, 9, 'Si usara 45 días (Efectos)',           'approved', 'alta',   NULL, NULL, NULL, NULL, 20, 'USD', true, NULL, '2026-01-15'::timestamptz, ARRAY['instagram']),

-- ─── REC 3 (3ra Tanda) ──────────────────────────────────────
(fedra_id, 3, 1, 'Hook Negativo (No te pongas)',         'approved', 'alta',   NULL, NULL, NULL, NULL, 20, 'USD', true, NULL, NULL, ARRAY['instagram']),
(fedra_id, 3, 2, 'Si haces esto te pasa esto',           'approved', 'normal', NULL, NULL, NULL, NULL, 20, 'USD', true, NULL, '2026-02-02'::timestamptz, ARRAY['instagram']),
(fedra_id, 3, 3, 'Noticias Tendencia 2026',              'approved', 'alta',   NULL, NULL, NULL, NULL, 20, 'USD', true, NULL, '2025-12-27'::timestamptz, ARRAY['instagram']),
(fedra_id, 3, 4, 'Post-Entreno (Comida)',                'approved', 'alta',   NULL, NULL, NULL, NULL, 20, 'USD', true, NULL, '2026-02-05'::timestamptz, ARRAY['instagram']),
(fedra_id, 3, 5, 'Perder peso vs grasa',                 'approved', 'alta',   NULL, NULL, NULL, NULL, 20, 'USD', true, NULL, '2026-01-29'::timestamptz, ARRAY['instagram']),
(fedra_id, 3, 6, 'Suplementos (Básicos)',                'pending',  'normal', NULL, NULL, NULL, NULL, 20, 'USD', false, NULL, NULL, ARRAY['instagram']),
(fedra_id, 3, 7, 'Después de hoy (Rutas médicas)',       'approved', 'alta',   NULL, NULL, NULL, NULL, 20, 'USD', true, NULL, '2025-12-31'::timestamptz, ARRAY['instagram']),
(fedra_id, 3, 8, 'Preguntas (Alcohol)',                  'pending',  'alta',   NULL, NULL, NULL, NULL, 20, 'USD', false, NULL, NULL, ARRAY['instagram']),
(fedra_id, 3, 9, 'Cosas que no sabías (Tirzepa)',        'pending',  'normal', NULL, NULL, NULL, NULL, 20, 'USD', false, NULL, NULL, ARRAY['instagram']),

-- ─── REC 4 (4ta Tanda) — Editor: Mojca ──────────────────────
(fedra_id, 4, 0,  'REACCION',                'published', 'normal',
  'https://drive.google.com/file/d/1GIpQWGynaRVzhgA9kJkkwpfd9D8MfR8L/view?usp=drive_link',
  'https://drive.google.com/file/d/1TNer1x1ERdAGdrszdaO5WbuQ5UW1pjHR/view?usp=drive_link',
  'https://docs.google.com/document/d/1AqIXl2WSvPhzx8QKqi5zwslMY_sGdmbDosA-4BPnFpk/edit',
  NULL, 26, 'USD', true, 'Mojca', '2026-02-12'::timestamptz, ARRAY['instagram']),
(fedra_id, 4, 1,  'PIZARRON',                'published', 'normal',
  'https://drive.google.com/file/d/1GIpQWGynaRVzhgA9kJkkwpfd9D8MfR8L/view?usp=drive_link',
  'https://drive.google.com/file/d/1WNxHkdj47_uaJs-6kj1DUflY-Eoe4EhM/view?usp=drive_link',
  'https://docs.google.com/document/d/1AqIXl2WSvPhzx8QKqi5zwslMY_sGdmbDosA-4BPnFpk/edit',
  NULL, 26, 'USD', true, 'Mojca', '2026-02-15'::timestamptz, ARRAY['instagram']),
(fedra_id, 4, 2,  'COMPARATIVA ALIMENTOS',   'published', 'normal',
  'https://drive.google.com/file/d/1OREt7z8vTEl1wWWrN-x7RoNT8LUwBSdm/view?usp=drive_link',
  'https://drive.google.com/file/d/1rXFKr96oBXi_Y8HO3A-PjbCJLFMkGMSx/view?usp=drive_link',
  'https://docs.google.com/document/d/1AqIXl2WSvPhzx8QKqi5zwslMY_sGdmbDosA-4BPnFpk/edit',
  NULL, 26, 'USD', true, 'Mojca', '2026-02-22'::timestamptz, ARRAY['instagram']),
(fedra_id, 4, 3,  'TE IMAGINAS SI',          'published', 'normal',
  'https://drive.google.com/drive/folders/1zJ9fh54P8eYBEf3INzLBxwCu210ufCqr', NULL,
  'https://docs.google.com/document/d/1AqIXl2WSvPhzx8QKqi5zwslMY_sGdmbDosA-4BPnFpk/edit',
  NULL, 26, 'USD', true, 'Mojca', '2026-02-27'::timestamptz, ARRAY['instagram']),
(fedra_id, 4, 4,  'LICUADO',                 'published', 'normal',
  'https://drive.google.com/file/d/1Ty68dc4LVFttEcOIZlhBrlCoLl_cpq7a/view?usp=drive_link',
  'https://drive.google.com/file/d/1YmGVFCGJNaTH-kzwnmnyGvL6DqRJxRxO/view?usp=sharing',
  'https://docs.google.com/document/d/1AqIXl2WSvPhzx8QKqi5zwslMY_sGdmbDosA-4BPnFpk/edit',
  NULL, 26, 'USD', true, 'Mojca', '2026-02-20'::timestamptz, ARRAY['instagram']),
(fedra_id, 4, 5,  '3 HUEVOS AL DIA',         'published', 'normal',
  'https://drive.google.com/drive/folders/1BBatuUYuNDJQrHm1MEqGEGo-OCrkSwHS', NULL, NULL,
  'https://www.instagram.com/reel/DSIcnXgjUoP/',
  26, 'USD', true, 'Mojca', '2026-03-20'::timestamptz, ARRAY['instagram']),
(fedra_id, 4, 6,  'TE IMAGINAS 100GR DE CARNE','published', 'normal',
  'https://drive.google.com/drive/folders/1s-tp-hPyuUVkoo6JkoKhgBCAJQK9z3LY', NULL, NULL,
  'https://www.instagram.com/reel/DScwu3EEeEj/',
  26, 'USD', false, 'Mojca', '2026-03-28'::timestamptz, ARRAY['instagram']),
(fedra_id, 4, 7,  'CUANDO FUNCIONA',         'published', 'normal',
  'https://drive.google.com/drive/folders/1DT1OTiZIwh80PjazSal__aMpgwr9-yRi', NULL, NULL,
  'https://www.instagram.com/p/DPWYQIZkcch/',
  26, 'USD', false, 'Mojca', '2026-03-26'::timestamptz, ARRAY['instagram']),
(fedra_id, 4, 8,  'SABIAS QUE',              'published', 'normal',
  'https://drive.google.com/drive/folders/1v4sYWQHRtqef2HZSedMIMEjTUedBgVTh', NULL,
  'https://docs.google.com/document/d/1AqIXl2WSvPhzx8QKqi5zwslMY_sGdmbDosA-4BPnFpk/edit',
  NULL, 26, 'USD', true, 'Mojca', '2026-03-07'::timestamptz, ARRAY['instagram']),
(fedra_id, 4, 9,  'COCA ZERO',               'published', 'normal',
  'https://drive.google.com/drive/folders/1uQs8V0AQTwaxPFs-4oY_B9ohuUQYDdb6', NULL, NULL,
  'https://www.instagram.com/reel/DNdnPdpubd8/',
  26, 'USD', true, 'Mojca', '2026-03-18'::timestamptz, ARRAY['instagram']),
(fedra_id, 4, 10, 'PIRAMIDE ALIMENTARIA',    'published', 'alta',
  'https://drive.google.com/file/d/1zEZbzj3UYE69nhw5oCPO4WJ_Dqxd1sfZ/view',
  'https://drive.google.com/file/d/14MD1JUXmHvz2yiG5pnpVVlEtdDwYU1PY/view', NULL,
  'https://www.instagram.com/reel/DTQjyvSjLc2/',
  26, 'USD', true, 'Mojca', '2026-02-18'::timestamptz, ARRAY['instagram']),
(fedra_id, 4, 11, 'RETATRUTIDA',             'published', 'alta',
  'https://drive.google.com/file/d/1lH-M8No2ZM-RmisGk0NK8u7OrsJQ8MpB/view',
  'https://drive.google.com/file/d/1zHLw7WXVuXIZxqtiXXVg-SAl4zhHhsIR/view',
  'https://docs.google.com/document/d/1AqIXl2WSvPhzx8QKqi5zwslMY_sGdmbDosA-4BPnFpk/edit',
  NULL, 26, 'USD', true, 'Mojca', '2026-02-10'::timestamptz, ARRAY['instagram']),
(fedra_id, 4, 13, 'PASTILLAS ANIMADAS',      'published', 'alta',
  'https://drive.google.com/drive/folders/15BBsq39yMd-Gli81vh9XUoMcaH7o7M_E', NULL, NULL,
  'https://www.instagram.com/reel/DTyfW3FiYot/',
  26, 'USD', true, 'Mojca', '2026-03-14'::timestamptz, ARRAY['instagram']),

-- ─── REC 5 (5ta Tanda) — Editor: Mojca ──────────────────────
(fedra_id, 5, 1, 'CHISME',                  'published', 'normal',
  'https://drive.google.com/drive/folders/1HG4PddLeaFP_UHOukXDCKzA-_ES6Q-Lo', NULL,
  'https://docs.google.com/document/d/1DBol0D4nYmeyYo-bEJWKHVbrMjrVrNv7zFzY720rJi4/edit',
  NULL, 26, 'USD', true, 'Mojca', '2026-02-25'::timestamptz, ARRAY['instagram']),
(fedra_id, 5, 2, 'EJERCICIO DE FUERZA',     'published', 'normal',
  'https://drive.google.com/drive/folders/1vDMILrkR5n1wVI7eJShUN8xAlt_9eAB-', NULL,
  'https://docs.google.com/document/d/1DBol0D4nYmeyYo-bEJWKHVbrMjrVrNv7zFzY720rJi4/edit',
  NULL, 26, 'USD', true, 'Mojca', '2026-03-04'::timestamptz, ARRAY['instagram']),
(fedra_id, 5, 3, 'FIT VS CASI FIT',         'pending',  'normal', NULL, NULL,
  'https://docs.google.com/document/d/1DBol0D4nYmeyYo-bEJWKHVbrMjrVrNv7zFzY720rJi4/edit',
  NULL, 26, 'USD', false, 'Mojca', NULL, ARRAY['instagram']),
(fedra_id, 5, 4, 'Pan BLANCO vs Masa madre','published', 'alta',
  'https://drive.google.com/drive/folders/1ps_JUsaoJesCrWqaxMbaJCbtFaiXVGz_', NULL,
  'https://docs.google.com/document/d/1DBol0D4nYmeyYo-bEJWKHVbrMjrVrNv7zFzY720rJi4/edit',
  NULL, 26, 'USD', true, 'Mojca', '2026-03-02'::timestamptz, ARRAY['instagram']),
(fedra_id, 5, 5, 'Podcast #1',              'published', 'normal',
  'https://drive.google.com/drive/folders/1wHsCkXnnRZkROC55-nR28vR68eSrv3ld', NULL,
  'https://docs.google.com/document/d/1DBol0D4nYmeyYo-bEJWKHVbrMjrVrNv7zFzY720rJi4/edit',
  NULL, 26, 'USD', true, 'Mojca', NULL, ARRAY['instagram']),
(fedra_id, 5, 6, 'Podcast #2',              'published', 'alta',
  'https://drive.google.com/drive/folders/1q6MVIaiviot3brOTCC05xOIGmij2G36W', NULL,
  'https://docs.google.com/document/d/1DBol0D4nYmeyYo-bEJWKHVbrMjrVrNv7zFzY720rJi4/edit',
  NULL, 26, 'USD', true, 'Mojca', NULL, ARRAY['instagram']),
(fedra_id, 5, 7, 'Podcast #3',              'published', 'alta',
  'https://drive.google.com/drive/folders/1vB77ICRit5lBNKJIVmAvHf6ANfkAMYqI', NULL,
  'https://docs.google.com/document/d/1DBol0D4nYmeyYo-bEJWKHVbrMjrVrNv7zFzY720rJi4/edit',
  NULL, 26, 'USD', true, 'Mojca', '2026-03-22'::timestamptz, ARRAY['instagram']),

-- ─── REC 6 (6ta Tanda) — Editor: Mojca ──────────────────────
(fedra_id, 6, 1,  '3 cosas que jamás le haría a mi cuerpo','published','normal',
  NULL, 'https://drive.google.com/drive/folders/1hX_Zma9DUDb2BBRjctiFpLrccxylwGIL', NULL,
  'https://www.instagram.com/reel/DOXJOn9jHwB/', 26, 'USD', true, 'Mojca', NULL, ARRAY['instagram']),
(fedra_id, 6, 2,  'El verdadero nombre del azúcar','published','normal',
  NULL, 'https://drive.google.com/drive/folders/11OSmmi3v_tE1igPpG_J__xfUUIhLZzM1', NULL,
  'https://www.instagram.com/reel/DQkEE5viHQl/', 26, 'USD', true, 'Mojca', NULL, ARRAY['instagram']),
(fedra_id, 6, 3,  'Lo que nadie te cuenta de ser médico','published','normal',
  NULL, 'https://drive.google.com/drive/folders/17e0B3ZZ_Fa-WFPYNEayZhRAlRdrwii_6', NULL,
  'https://www.instagram.com/reel/DDI7ASKsVoc/', 26, 'USD', true, 'Mojca', NULL, ARRAY['instagram']),
(fedra_id, 6, 4,  'El problema del sistema médico actual','published','normal',
  NULL, 'https://drive.google.com/drive/folders/1h_z9JpeONJiSlm8YyXIa6DCqp8r6Nmc3', NULL,
  'https://www.instagram.com/reel/DKcjUqVRmxP/', 26, 'USD', true, 'Mojca', NULL, ARRAY['instagram']),
(fedra_id, 6, 5,  'Beneficios del Kéfir para bajar de peso','published','normal',
  NULL, 'https://drive.google.com/drive/folders/1_O0TLxOwL6OdDcjIWTfZU14KrTFMWK7X', NULL,
  'https://www.instagram.com/reel/DQvEemFgbQs/', 26, 'USD', true, 'Mojca', NULL, ARRAY['instagram']),
(fedra_id, 6, 6,  '¿Estás comiendo sano o comiendo escondido?','published','normal',
  NULL, 'https://drive.google.com/drive/folders/15yHxoa_sEM1H9KQptHO7mmFIZNPVMTGb', NULL,
  'https://www.instagram.com/reel/DEJDHWuNlK8/', 26, 'USD', true, 'Mojca', NULL, ARRAY['instagram']),
(fedra_id, 6, 7,  'Contraindicaciones de Mounjaro y GLP-1','published','normal',
  NULL, 'https://drive.google.com/drive/folders/1RbVOZ1j8lkfaF2VL3r5A8qbZu3pzzrde', NULL,
  'https://vt.tiktok.com/ZSmcQ9JxP/', 26, 'USD', true, 'Mojca', NULL, ARRAY['instagram','tiktok']),
(fedra_id, 6, 8,  '¿Cómo funcionan los GLP-1 en el cerebro?','published','normal',
  NULL, 'https://drive.google.com/drive/folders/1nT0oppWp5_19n_AWXR9_tIiqsEl3mese', NULL,
  'https://vt.tiktok.com/ZSmcCh9jD/', 26, 'USD', true, 'Mojca', NULL, ARRAY['instagram','tiktok']),
(fedra_id, 6, 9,  '¿Qué no haría jamás un médico metabólico? (Vape/Cigarro)','published','normal',
  NULL, 'https://drive.google.com/drive/folders/1s6A4qBiEyQPojR-2ogUIhYntX7TJrQhw', NULL,
  'https://www.instagram.com/reel/C-dvhs1SbPn/', 26, 'USD', true, 'Mojca', NULL, ARRAY['instagram']),
(fedra_id, 6, 10, 'Tus decisiones médicas: el refresco vs la amputación','published','normal',
  NULL, 'https://drive.google.com/drive/folders/1-urGY08EK4cxaZ1re3YH3ne1g_14Xdsq', NULL,
  'https://www.instagram.com/reel/DKInyOuSS_u/', 26, 'USD', true, 'Mojca', NULL, ARRAY['instagram']),
(fedra_id, 6, 11, 'El peligro de los remedios caseros vs medicinas reales','published','normal',
  NULL, 'https://drive.google.com/drive/folders/1lgbMSH5lLhrC8vTNtbk5kkP6twCz5zr3', NULL,
  'https://www.instagram.com/reel/DM702d2Meqs/', 26, 'USD', true, 'Mojca', NULL, ARRAY['instagram']),
(fedra_id, 6, 12, 'Omega 3 y Abdomen Plano',  'pending',  'normal', NULL, NULL,
  'https://www.instagram.com/reel/DHEzYzaBrny/', NULL, 26, 'USD', false, 'Mojca', NULL, ARRAY['instagram']),
(fedra_id, 6, 13, 'Parches GLP-1 Originales',  'approved', 'normal',
  'https://drive.google.com/drive/folders/12YtXw4F4CarJJJ8LQfzajL8ZDq3QMNrm',
  'https://drive.google.com/drive/folders/185JMvr2n48Wbu6gtCTTFSdJlZrYwvEck', NULL,
  'https://vt.tiktok.com/ZSmcCr85A/', 26, 'USD', false, 'Mojca', NULL, ARRAY['instagram','tiktok']),
(fedra_id, 6, 14, 'Perdí 50k seguidores',     'published', 'normal',
  NULL, NULL, NULL, NULL, 26, 'USD', true, 'Mojca', NULL, ARRAY['instagram']);

END $$;

-- Verifica:
-- SELECT rec_number, rec_order, title, status, pagado, costo, moneda
--   FROM videos WHERE cliente_id = '<FEDRA_UUID>'
--   ORDER BY rec_number, rec_order;
