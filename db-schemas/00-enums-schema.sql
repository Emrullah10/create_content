-- Enum tipleri: topic/article/asset/publication/job durum makineleri

CREATE TYPE topic_status AS ENUM ('suggested', 'approved', 'queued', 'drafting', 'used', 'rejected');
CREATE TYPE article_status AS ENUM ('drafting', 'needs_assets', 'review', 'approved', 'publishing', 'published', 'failed');
CREATE TYPE asset_kind AS ENUM ('diagram', 'cover');
CREATE TYPE asset_source_kind AS ENUM ('mermaid', 'ai_image');
CREATE TYPE asset_status AS ENUM ('pending', 'rendered', 'uploaded', 'failed');
CREATE TYPE publish_platform AS ENUM ('devto', 'medium');
CREATE TYPE publication_status AS ENUM ('pending', 'pending_import', 'publishing', 'published', 'failed');
CREATE TYPE job_status AS ENUM ('running', 'success', 'failed');
