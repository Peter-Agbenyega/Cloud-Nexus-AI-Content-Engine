CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  industry text,
  target_audience text,
  brand_voice text[],
  approved_claims text[],
  banned_phrases text[],
  preferred_cta text,
  color_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS target_audience text,
  ADD COLUMN IF NOT EXISTS brand_voice text[],
  ADD COLUMN IF NOT EXISTS approved_claims text[],
  ADD COLUMN IF NOT EXISTS banned_phrases text[],
  ADD COLUMN IF NOT EXISTS preferred_cta text,
  ADD COLUMN IF NOT EXISTS color_notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE brands
SET name = COALESCE(name, brand_name)
WHERE name IS NULL AND brand_name IS NOT NULL;

ALTER TABLE brands ALTER COLUMN name SET NOT NULL;

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brands_user_access" ON brands;
CREATE POLICY "brands_user_access" ON brands
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS brands_user_id_idx ON brands(user_id);
