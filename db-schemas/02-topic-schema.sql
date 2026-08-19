-- Konu kuyrugu: AI tarafindan uretilen veya kullanici tarafindan girilen basliklar

CREATE TABLE topics (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id       UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  title          VARCHAR(300) NOT NULL,
  angle          TEXT,
  outline        JSONB,
  keywords       TEXT[] NOT NULL DEFAULT '{}',
  status         topic_status NOT NULL DEFAULT 'suggested',
  dedup_hash     VARCHAR(64) NOT NULL,
  scheduled_for  DATE,
  created_by     VARCHAR(10) NOT NULL DEFAULT 'ai' CHECK (created_by IN ('ai', 'user')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_topics_dedup_hash ON topics (dedup_hash);
CREATE INDEX idx_topics_status ON topics (status);
CREATE INDEX idx_topics_theme ON topics (theme_id);
