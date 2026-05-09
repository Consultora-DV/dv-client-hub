-- ══════════════════════════════════════════════════════════════
-- SEED: The Skin Club — cliente de prueba para integración Meta
-- Ejecutar en Supabase SQL Editor como admin
-- ══════════════════════════════════════════════════════════════

-- PASO 1: Crea el usuario en Supabase Auth
-- (Esto se hace desde el dashboard de Supabase: Authentication → Users → Invite User)
-- Email sugerido: theskinclub@dantemvp.com
-- Después de crearlo, copia el UUID generado y úsalo abajo.

-- PASO 2: Una vez que tengas el user_id del usuario nuevo, ejecuta:

-- Reemplaza 'REEMPLAZA-CON-UUID-DEL-USUARIO' con el UUID real del Authentication panel

DO $$
DECLARE
  v_user_id uuid := 'REEMPLAZA-CON-UUID-DEL-USUARIO'::uuid;
  v_profile_id uuid;
BEGIN

  -- Insertar en profiles (aprobado de inmediato)
  INSERT INTO profiles (user_id, email, display_name, business, approval_status)
  VALUES (
    v_user_id,
    'theskinclub@dantemvp.com',
    'The Skin Club',
    'The Skin Club',
    'approved'
  )
  ON CONFLICT (user_id) DO UPDATE
    SET approval_status = 'approved',
        display_name = EXCLUDED.display_name,
        business = EXCLUDED.business;

  -- Insertar/actualizar client_profile
  INSERT INTO client_profiles (
    user_id,
    full_name,
    business_name,
    industry,
    city,
    country,
    social_networks,
    strategy
  )
  VALUES (
    v_user_id,
    'The Skin Club',
    'The Skin Club',
    'Skincare / E-commerce',
    'Ciudad de México',
    'México',
    '{
      "instagram": {
        "username": "theskinclubmx",
        "ig_user_id": "17841447268646281",
        "page_id": "700532247451757",
        "ad_account_id": "act_995765777907038"
      },
      "website": "https://theskinclub.mx"
    }'::jsonb,
    '{
      "mainGoal": "Aumentar ventas de sueros faciales vía Meta Ads",
      "targetAudience": "Mujeres 25-45, CDMX y zonas metropolitanas, interés en skincare y biotecnología",
      "tone": ["educativo", "aspiracional", "científico-accesible"],
      "contentPillars": ["ingredientes activos", "rutinas de skincare", "UGC auténtico", "resultados reales"]
    }'::jsonb
  )
  ON CONFLICT (user_id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        business_name = EXCLUDED.business_name,
        industry = EXCLUDED.industry,
        social_networks = EXCLUDED.social_networks,
        strategy = EXCLUDED.strategy;

  -- Asignar rol 'cliente'
  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id, 'cliente')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'The Skin Club creado correctamente con user_id: %', v_user_id;

END $$;
