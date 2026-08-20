-- Makaleler ve AI gecis gecmisi (her asama: outline/draft/critique/revised/final)

CREATE TABLE articles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id        UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  title           VARCHAR(300) NOT NULL,
  subtitle        VARCHAR(400),
  slug            VARCHAR(320) NOT NULL,
  body_markdown   TEXT NOT NULL DEFAULT '',
  summary         TEXT,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  cover_asset_id  UUID,
  quality_score   INTEGER,
  quality_report  JSONB,
  status          article_status NOT NULL DEFAULT 'drafting',
  canonical_url   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_articles_slug ON articles (slug);
CREATE INDEX idx_articles_status ON articles (status);
CREATE INDEX idx_articles_topic ON articles (topic_id);

CREATE TABLE article_revisions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id   UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  stage        VARCHAR(20) NOT NULL CHECK (stage IN ('outline', 'draft', 'critique', 'revised', 'expand', 'final')),
  model        VARCHAR(100),
  content      JSONB NOT NULL,
  prompt_tokens     INTEGER,
  completion_tokens INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_article_revisions_article ON article_revisions (article_id);
