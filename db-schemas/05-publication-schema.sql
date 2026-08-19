-- Platform basina yayin durumu; UNIQUE kisiti cift yayini DB seviyesinde engeller

CREATE TABLE publications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id     UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  platform       publish_platform NOT NULL,
  external_id    VARCHAR(200),
  external_url   TEXT,
  status         publication_status NOT NULL DEFAULT 'pending',
  attempt_count  INTEGER NOT NULL DEFAULT 0,
  error          TEXT,
  published_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (article_id, platform)
);

CREATE INDEX idx_publications_status ON publications (status);
