// JS karsiligi db-schemas/*.sql ile senkron tutulur (scripts/build-schema.js).
// Tek gercek kaynak: bu dosya. SQL, DBA/ops okunabilirligi icin elle paralel tutulur.

export const enums = {
  topic_status: ['suggested', 'approved', 'queued', 'drafting', 'used', 'rejected'],
  article_status: ['drafting', 'needs_assets', 'review', 'approved', 'publishing', 'published', 'failed'],
  asset_kind: ['diagram', 'cover'],
  asset_source_kind: ['mermaid', 'ai_image'],
  asset_status: ['pending', 'rendered', 'uploaded', 'failed'],
  publish_platform: ['devto', 'medium'],
  publication_status: ['pending', 'pending_import', 'publishing', 'published', 'failed'],
  job_status: ['running', 'success', 'failed'],
};

export const tables = {
  themes: {
    columns: ['id', 'name', 'description', 'tags', 'target_audience', 'expertise_notes', 'weight', 'is_active', 'created_at', 'updated_at'],
  },
  topics: {
    columns: ['id', 'theme_id', 'title', 'angle', 'outline', 'keywords', 'status', 'dedup_hash', 'scheduled_for', 'created_by', 'created_at', 'updated_at'],
  },
  articles: {
    columns: ['id', 'topic_id', 'title', 'subtitle', 'slug', 'body_markdown', 'summary', 'tags', 'cover_asset_id', 'quality_score', 'quality_report', 'status', 'canonical_url', 'created_at', 'updated_at'],
  },
  article_revisions: {
    columns: ['id', 'article_id', 'stage', 'model', 'content', 'prompt_tokens', 'completion_tokens', 'created_at'],
  },
  assets: {
    columns: ['id', 'article_id', 'kind', 'source_kind', 'source_code', 'placeholder_key', 'local_path', 'remote_url', 'alt_text', 'caption', 'status', 'error', 'created_at', 'updated_at'],
  },
  publications: {
    columns: ['id', 'article_id', 'platform', 'external_id', 'external_url', 'status', 'attempt_count', 'error', 'published_at', 'created_at', 'updated_at'],
  },
  job_runs: {
    columns: ['id', 'job_name', 'status', 'stats', 'error', 'started_at', 'finished_at'],
  },
};
