-- Cron calistirma gunlugu (daily-content, topic-refill, publish-retry)

CREATE TABLE job_runs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name    VARCHAR(100) NOT NULL,
  status      job_status NOT NULL DEFAULT 'running',
  stats       JSONB NOT NULL DEFAULT '{}',
  error       TEXT,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX idx_job_runs_name ON job_runs (job_name, started_at DESC);
