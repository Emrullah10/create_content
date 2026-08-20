-- Icerik nisleri: kullanici tema girer, AI bunu topic'lere acar (bkz 02-topic-schema.sql)

CREATE TABLE themes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  target_audience VARCHAR(200),
  expertise_notes TEXT,
  weight          INTEGER NOT NULL DEFAULT 1,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_themes_active ON themes (is_active) WHERE is_active = TRUE;
