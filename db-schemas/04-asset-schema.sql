-- Diyagram ve kapak gorselleri: her biri bagimsiz izlenir/retry edilir

CREATE TABLE assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id      UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  kind            asset_kind NOT NULL,
  source_kind     asset_source_kind NOT NULL,
  source_code     TEXT NOT NULL,
  placeholder_key VARCHAR(50),
  local_path      TEXT,
  remote_url      TEXT,
  alt_text        VARCHAR(300),
  caption         VARCHAR(300),
  status          asset_status NOT NULL DEFAULT 'pending',
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_article ON assets (article_id);
CREATE INDEX idx_assets_status ON assets (status);

ALTER TABLE articles
  ADD CONSTRAINT fk_articles_cover_asset
  FOREIGN KEY (cover_asset_id) REFERENCES assets(id) ON DELETE SET NULL;
