-- Icerik domaini: tema -> konu -> makale -> (bolum, revizyon, kaynak, asset, yayin). Tenant/organization kolonu YOK (tek kullanici).
-- Kural: kolonlar <tablo>_ onekli; is kolonu adlarinda "created"/"updated" gecmez (query-builder siniflandirmasi).

-- -----------------------------------------------------
-- Table: content.theme
-- Purpose: kullanicinin tanimladigi icerik nisi; konular bu temadan uretilir
-- -----------------------------------------------------
CREATE TABLE content.theme (
    theme_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    theme_code BIGINT UNIQUE NOT NULL DEFAULT nextval('global_code_seq'),
    theme_name VARCHAR(200) NOT NULL,
    theme_description TEXT,
    theme_tags JSONB NOT NULL DEFAULT '[]',
    theme_target_audience VARCHAR(300),
    theme_expertise_notes TEXT,
    theme_weight INT NOT NULL DEFAULT 1,
    theme_is_active BOOLEAN NOT NULL DEFAULT TRUE,
    theme_metadata JSONB DEFAULT '{}',
    theme_created_by BIGINT,
    theme_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    theme_updated_by BIGINT,
    theme_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_theme_name UNIQUE (theme_name),
    CONSTRAINT chk_theme_weight CHECK (theme_weight BETWEEN 1 AND 10)
);

-- -----------------------------------------------------
-- Table: content.topic
-- Purpose: yazilacak konu; suggested -> approved (panelden, yazar notuyla) -> drafting -> used
-- -----------------------------------------------------
CREATE TABLE content.topic (
    topic_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    topic_code BIGINT UNIQUE NOT NULL DEFAULT nextval('global_code_seq'),
    topic_theme_id BIGINT NOT NULL,
    topic_title VARCHAR(300) NOT NULL,
    topic_angle TEXT,
    topic_keywords JSONB NOT NULL DEFAULT '[]',
    topic_author_note TEXT,
    topic_status VARCHAR(100) NOT NULL DEFAULT 'suggested',
    topic_source VARCHAR(100) NOT NULL DEFAULT 'ai',
    topic_dedup_key VARCHAR(400) NOT NULL,
    topic_metadata JSONB DEFAULT '{}',
    topic_created_by BIGINT,
    topic_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    topic_updated_by BIGINT,
    topic_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_topic_dedup_key UNIQUE (topic_dedup_key),
    CONSTRAINT fk_topic_theme FOREIGN KEY (topic_theme_id) REFERENCES content.theme(theme_id),
    CONSTRAINT fk_topic_status FOREIGN KEY (topic_status) REFERENCES enums.topic_status(topic_status_value),
    CONSTRAINT fk_topic_source FOREIGN KEY (topic_source) REFERENCES enums.topic_source(topic_source_value)
);
CREATE INDEX idx_topic_title_trgm ON content.topic USING gin (lower(topic_title) gin_trgm_ops);
CREATE INDEX idx_topic_theme_status ON content.topic (topic_theme_id, topic_status);

-- -----------------------------------------------------
-- Table: content.article
-- Purpose: uretilen makale ve pipeline durumu (kaldigi asamadan devam eder)
-- -----------------------------------------------------
CREATE TABLE content.article (
    article_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    article_code BIGINT UNIQUE NOT NULL DEFAULT nextval('global_code_seq'),
    article_topic_id BIGINT NOT NULL,
    article_title VARCHAR(300) NOT NULL,
    article_subtitle VARCHAR(400),
    article_slug VARCHAR(400) NOT NULL,
    article_summary TEXT,
    article_body_markdown TEXT,
    article_tags JSONB NOT NULL DEFAULT '[]',
    article_cover_asset_id BIGINT,
    article_research_brief JSONB,
    article_outline JSONB,
    article_quality_score INT,
    article_quality_report JSONB,
    article_status VARCHAR(100) NOT NULL DEFAULT 'drafting',
    article_pipeline_stage VARCHAR(100),
    article_error TEXT,
    article_canonical_url VARCHAR(1000),
    article_metadata JSONB DEFAULT '{}',
    article_created_by BIGINT,
    article_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    article_updated_by BIGINT,
    article_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_article_slug UNIQUE (article_slug),
    CONSTRAINT fk_article_topic FOREIGN KEY (article_topic_id) REFERENCES content.topic(topic_id),
    CONSTRAINT fk_article_status FOREIGN KEY (article_status) REFERENCES enums.article_status(article_status_value),
    CONSTRAINT fk_article_pipeline_stage FOREIGN KEY (article_pipeline_stage) REFERENCES enums.pipeline_stage(pipeline_stage_value)
);
CREATE INDEX idx_article_status ON content.article (article_status);
CREATE INDEX idx_article_topic ON content.article (article_topic_id);

-- -----------------------------------------------------
-- Table: content.article_section
-- Purpose: bolum bolum yazim; yarim kalan pipeline bolum bazinda devam eder
-- -----------------------------------------------------
CREATE TABLE content.article_section (
    article_section_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    article_section_article_id BIGINT NOT NULL,
    article_section_position INT NOT NULL,
    article_section_heading VARCHAR(300) NOT NULL,
    article_section_plan JSONB DEFAULT '{}',
    article_section_body_markdown TEXT,
    article_section_word_count INT NOT NULL DEFAULT 0,
    article_section_metadata JSONB DEFAULT '{}',
    article_section_created_by BIGINT,
    article_section_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    article_section_updated_by BIGINT,
    article_section_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_article_section_position UNIQUE (article_section_article_id, article_section_position),
    CONSTRAINT fk_article_section_article FOREIGN KEY (article_section_article_id) REFERENCES content.article(article_id) ON DELETE CASCADE
);

-- -----------------------------------------------------
-- Table: content.article_revision
-- Purpose: her pipeline asamasinin ciktisi (denetim izi)
-- -----------------------------------------------------
CREATE TABLE content.article_revision (
    article_revision_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    article_revision_article_id BIGINT NOT NULL,
    article_revision_stage VARCHAR(100) NOT NULL,
    article_revision_model VARCHAR(200),
    article_revision_content JSONB NOT NULL DEFAULT '{}',
    article_revision_input_tokens INT,
    article_revision_output_tokens INT,
    article_revision_metadata JSONB DEFAULT '{}',
    article_revision_created_by BIGINT,
    article_revision_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    article_revision_updated_by BIGINT,
    article_revision_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_article_revision_article FOREIGN KEY (article_revision_article_id) REFERENCES content.article(article_id) ON DELETE CASCADE,
    CONSTRAINT fk_article_revision_stage FOREIGN KEY (article_revision_stage) REFERENCES enums.pipeline_stage(pipeline_stage_value)
);
CREATE INDEX idx_article_revision_article ON content.article_revision (article_revision_article_id);

-- -----------------------------------------------------
-- Table: content.research_source
-- Purpose: arastirmada dogrulanmis kaynaklar ve cikarilan olgular (referans listesi buradan gelir)
-- -----------------------------------------------------
CREATE TABLE content.research_source (
    research_source_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    research_source_article_id BIGINT NOT NULL,
    research_source_kind VARCHAR(100) NOT NULL,
    research_source_url VARCHAR(1500) NOT NULL,
    research_source_title VARCHAR(500),
    research_source_facts JSONB NOT NULL DEFAULT '[]',
    research_source_http_status INT,
    research_source_is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    research_source_metadata JSONB DEFAULT '{}',
    research_source_created_by BIGINT,
    research_source_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    research_source_updated_by BIGINT,
    research_source_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_research_source_url UNIQUE (research_source_article_id, research_source_url),
    CONSTRAINT fk_research_source_article FOREIGN KEY (research_source_article_id) REFERENCES content.article(article_id) ON DELETE CASCADE,
    CONSTRAINT fk_research_source_kind FOREIGN KEY (research_source_kind) REFERENCES enums.research_source_kind(research_source_kind_value)
);

-- -----------------------------------------------------
-- Table: content.asset
-- Purpose: diyagram ve kapak gorselleri; render/yukleme hatasi tum makaleyi bozmasin diye ayri satir
-- -----------------------------------------------------
CREATE TABLE content.asset (
    asset_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    asset_article_id BIGINT NOT NULL,
    asset_kind VARCHAR(100) NOT NULL,
    asset_placeholder_key VARCHAR(100),
    asset_source_code TEXT,
    asset_alt_text VARCHAR(500),
    asset_caption VARCHAR(500),
    asset_local_path VARCHAR(1000),
    asset_remote_url VARCHAR(1500),
    asset_status VARCHAR(100) NOT NULL DEFAULT 'pending',
    asset_error TEXT,
    asset_metadata JSONB DEFAULT '{}',
    asset_created_by BIGINT,
    asset_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    asset_updated_by BIGINT,
    asset_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_asset_article FOREIGN KEY (asset_article_id) REFERENCES content.article(article_id) ON DELETE CASCADE,
    CONSTRAINT fk_asset_kind FOREIGN KEY (asset_kind) REFERENCES enums.asset_kind(asset_kind_value),
    CONSTRAINT fk_asset_status FOREIGN KEY (asset_status) REFERENCES enums.asset_status(asset_status_value)
);
CREATE UNIQUE INDEX uq_asset_placeholder ON content.asset (asset_article_id, asset_placeholder_key) WHERE asset_placeholder_key IS NOT NULL;
CREATE INDEX idx_asset_article ON content.asset (asset_article_id);

ALTER TABLE content.article
    ADD CONSTRAINT fk_article_cover_asset FOREIGN KEY (article_cover_asset_id) REFERENCES content.asset(asset_id) ON DELETE SET NULL;

-- -----------------------------------------------------
-- Table: content.publication
-- Purpose: platform basina yayin kaydi; UNIQUE(makale, platform) cift yayini engeller
-- -----------------------------------------------------
CREATE TABLE content.publication (
    publication_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    publication_article_id BIGINT NOT NULL,
    publication_platform VARCHAR(100) NOT NULL,
    publication_external_id VARCHAR(200),
    publication_external_url VARCHAR(1500),
    publication_status VARCHAR(100) NOT NULL DEFAULT 'pending',
    publication_attempt_count INT NOT NULL DEFAULT 0,
    publication_error TEXT,
    publication_live_at TIMESTAMP WITH TIME ZONE,
    publication_metadata JSONB DEFAULT '{}',
    publication_created_by BIGINT,
    publication_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    publication_updated_by BIGINT,
    publication_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_publication_article_platform UNIQUE (publication_article_id, publication_platform),
    CONSTRAINT fk_publication_article FOREIGN KEY (publication_article_id) REFERENCES content.article(article_id) ON DELETE CASCADE,
    CONSTRAINT fk_publication_platform FOREIGN KEY (publication_platform) REFERENCES enums.publication_platform(publication_platform_value),
    CONSTRAINT fk_publication_status FOREIGN KEY (publication_status) REFERENCES enums.publication_status(publication_status_value)
);

-- -----------------------------------------------------
-- Table: content.job_run
-- Purpose: cron ve elle tetiklenen islerin kaydi (panel "son calismalar")
-- -----------------------------------------------------
CREATE TABLE content.job_run (
    job_run_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    job_run_job_name VARCHAR(100) NOT NULL,
    job_run_status VARCHAR(100) NOT NULL DEFAULT 'running',
    job_run_stats JSONB NOT NULL DEFAULT '{}',
    job_run_error TEXT,
    job_run_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    job_run_finished_at TIMESTAMP WITH TIME ZONE,
    job_run_metadata JSONB DEFAULT '{}',
    job_run_created_by BIGINT,
    job_run_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    job_run_updated_by BIGINT,
    job_run_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_job_run_status FOREIGN KEY (job_run_status) REFERENCES enums.job_status(job_status_value)
);
CREATE INDEX idx_job_run_name_started ON content.job_run (job_run_job_name, job_run_started_at DESC);

-- -----------------------------------------------------
-- Table: content.llm_call
-- Purpose: her LLM cagrisinin rol/model/token/sure kaydi (maliyet ve hata izleme)
-- -----------------------------------------------------
CREATE TABLE content.llm_call (
    llm_call_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    llm_call_article_id BIGINT,
    llm_call_role VARCHAR(100) NOT NULL,
    llm_call_stage VARCHAR(100),
    llm_call_model VARCHAR(200),
    llm_call_input_tokens INT,
    llm_call_output_tokens INT,
    llm_call_duration_ms INT,
    llm_call_status VARCHAR(100) NOT NULL DEFAULT 'ok',
    llm_call_error TEXT,
    llm_call_metadata JSONB DEFAULT '{}',
    llm_call_created_by BIGINT,
    llm_call_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    llm_call_updated_by BIGINT,
    llm_call_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_llm_call_article FOREIGN KEY (llm_call_article_id) REFERENCES content.article(article_id) ON DELETE CASCADE,
    CONSTRAINT fk_llm_call_role FOREIGN KEY (llm_call_role) REFERENCES enums.llm_role(llm_role_value),
    CONSTRAINT fk_llm_call_status FOREIGN KEY (llm_call_status) REFERENCES enums.call_status(call_status_value)
);
CREATE INDEX idx_llm_call_article ON content.llm_call (llm_call_article_id);
