-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Profiles: social links + phone + bio (optional fields)      ║
-- ╚══════════════════════════════════════════════════════════════╝

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS phone        text,
  ADD COLUMN IF NOT EXISTS bio          text;
