-- Enum (sozluk) tablolari. Durum/tip kolonlari CHECK degil, bu tablolara FK ile sinirlanir.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE SEQUENCE IF NOT EXISTS global_code_seq;
CREATE SCHEMA IF NOT EXISTS enums;
CREATE SCHEMA IF NOT EXISTS content;

-- Not: her enum tablosu ayni sablonu izler (<ad>_id, <ad>_value PK, <ad>_label, <ad>_sort_order).
CREATE TABLE enums.topic_status (
    topic_status_id BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE NOT NULL,
    topic_status_value VARCHAR(100) PRIMARY KEY,
    topic_status_label VARCHAR(255) NOT NULL,
    topic_status_sort_order INT NOT NULL DEFAULT 0
);
INSERT INTO enums.topic_status (topic_status_value, topic_status_label, topic_status_sort_order) VALUES
    ('suggested', 'Suggested', 1), ('approved', 'Approved', 2), ('drafting', 'Drafting', 3),
    ('used', 'Used', 4), ('rejected', 'Rejected', 5);

CREATE TABLE enums.topic_source (
    topic_source_id BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE NOT NULL,
    topic_source_value VARCHAR(100) PRIMARY KEY,
    topic_source_label VARCHAR(255) NOT NULL,
    topic_source_sort_order INT NOT NULL DEFAULT 0
);
INSERT INTO enums.topic_source (topic_source_value, topic_source_label, topic_source_sort_order) VALUES
    ('ai', 'AI suggested', 1), ('manual', 'Added manually', 2);

CREATE TABLE enums.article_status (
    article_status_id BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE NOT NULL,
    article_status_value VARCHAR(100) PRIMARY KEY,
    article_status_label VARCHAR(255) NOT NULL,
    article_status_sort_order INT NOT NULL DEFAULT 0
);
INSERT INTO enums.article_status (article_status_value, article_status_label, article_status_sort_order) VALUES
    ('drafting', 'Drafting', 1), ('needs_assets', 'Needs assets', 2), ('review', 'In review', 3),
    ('approved', 'Approved', 4), ('publishing', 'Publishing', 5), ('published', 'Published', 6),
    ('failed', 'Failed', 7);

CREATE TABLE enums.pipeline_stage (
    pipeline_stage_id BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE NOT NULL,
    pipeline_stage_value VARCHAR(100) PRIMARY KEY,
    pipeline_stage_label VARCHAR(255) NOT NULL,
    pipeline_stage_sort_order INT NOT NULL DEFAULT 0
);
INSERT INTO enums.pipeline_stage (pipeline_stage_value, pipeline_stage_label, pipeline_stage_sort_order) VALUES
    ('research', 'Research', 1), ('outline', 'Outline', 2), ('draft', 'Draft', 3), ('check', 'Checks', 4),
    ('editor', 'Editor', 5), ('revise', 'Revise', 6), ('score', 'Score', 7), ('assets', 'Assets', 8),
    ('final', 'Final', 9);

CREATE TABLE enums.asset_kind (
    asset_kind_id BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE NOT NULL,
    asset_kind_value VARCHAR(100) PRIMARY KEY,
    asset_kind_label VARCHAR(255) NOT NULL,
    asset_kind_sort_order INT NOT NULL DEFAULT 0
);
INSERT INTO enums.asset_kind (asset_kind_value, asset_kind_label, asset_kind_sort_order) VALUES
    ('diagram', 'Diagram', 1), ('cover', 'Cover image', 2);

CREATE TABLE enums.asset_status (
    asset_status_id BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE NOT NULL,
    asset_status_value VARCHAR(100) PRIMARY KEY,
    asset_status_label VARCHAR(255) NOT NULL,
    asset_status_sort_order INT NOT NULL DEFAULT 0
);
INSERT INTO enums.asset_status (asset_status_value, asset_status_label, asset_status_sort_order) VALUES
    ('pending', 'Pending', 1), ('rendered', 'Rendered', 2), ('uploaded', 'Uploaded', 3), ('failed', 'Failed', 4);

CREATE TABLE enums.publication_platform (
    publication_platform_id BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE NOT NULL,
    publication_platform_value VARCHAR(100) PRIMARY KEY,
    publication_platform_label VARCHAR(255) NOT NULL,
    publication_platform_sort_order INT NOT NULL DEFAULT 0
);
INSERT INTO enums.publication_platform (publication_platform_value, publication_platform_label, publication_platform_sort_order) VALUES
    ('devto', 'dev.to', 1), ('medium', 'Medium', 2);

CREATE TABLE enums.publication_status (
    publication_status_id BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE NOT NULL,
    publication_status_value VARCHAR(100) PRIMARY KEY,
    publication_status_label VARCHAR(255) NOT NULL,
    publication_status_sort_order INT NOT NULL DEFAULT 0
);
INSERT INTO enums.publication_status (publication_status_value, publication_status_label, publication_status_sort_order) VALUES
    ('pending', 'Pending', 1), ('draft', 'Draft on platform', 2), ('published', 'Published', 3),
    ('failed', 'Failed', 4), ('pending_import', 'Waiting for manual import', 5);

CREATE TABLE enums.job_status (
    job_status_id BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE NOT NULL,
    job_status_value VARCHAR(100) PRIMARY KEY,
    job_status_label VARCHAR(255) NOT NULL,
    job_status_sort_order INT NOT NULL DEFAULT 0
);
INSERT INTO enums.job_status (job_status_value, job_status_label, job_status_sort_order) VALUES
    ('running', 'Running', 1), ('succeeded', 'Succeeded', 2), ('failed', 'Failed', 3), ('skipped', 'Skipped', 4);

CREATE TABLE enums.llm_role (
    llm_role_id BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE NOT NULL,
    llm_role_value VARCHAR(100) PRIMARY KEY,
    llm_role_label VARCHAR(255) NOT NULL,
    llm_role_sort_order INT NOT NULL DEFAULT 0
);
INSERT INTO enums.llm_role (llm_role_value, llm_role_label, llm_role_sort_order) VALUES
    ('writer', 'Writer', 1), ('judge', 'Judge', 2), ('utility', 'Utility', 3);

CREATE TABLE enums.call_status (
    call_status_id BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE NOT NULL,
    call_status_value VARCHAR(100) PRIMARY KEY,
    call_status_label VARCHAR(255) NOT NULL,
    call_status_sort_order INT NOT NULL DEFAULT 0
);
INSERT INTO enums.call_status (call_status_value, call_status_label, call_status_sort_order) VALUES
    ('ok', 'OK', 1), ('error', 'Error', 2);

CREATE TABLE enums.research_source_kind (
    research_source_kind_id BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE NOT NULL,
    research_source_kind_value VARCHAR(100) PRIMARY KEY,
    research_source_kind_label VARCHAR(255) NOT NULL,
    research_source_kind_sort_order INT NOT NULL DEFAULT 0
);
INSERT INTO enums.research_source_kind (research_source_kind_value, research_source_kind_label, research_source_kind_sort_order) VALUES
    ('wikipedia', 'Wikipedia', 1), ('github', 'GitHub', 2), ('stackexchange', 'Stack Exchange', 3), ('web', 'Web page', 4);
