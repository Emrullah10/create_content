class DomainError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export class DuplicateTopicError extends DomainError {
  constructor(dedupHash) {
    super('DUPLICATE_TOPIC', `Topic with dedup hash "${dedupHash}" already exists`);
  }
}

export class QualityBelowThresholdError extends DomainError {
  constructor(score, threshold) {
    super('QUALITY_BELOW_THRESHOLD', `Article quality score ${score} is below threshold ${threshold}`);
  }
}

export class PublishFailedError extends DomainError {
  constructor(platform, reason) {
    super('PUBLISH_FAILED', `Publish to ${platform} failed: ${reason}`);
  }
}

export class MediumTokenMissingError extends DomainError {
  constructor() {
    super('MEDIUM_TOKEN_MISSING', 'MEDIUM_INTEGRATION_TOKEN is not set — falling back to import flow');
  }
}

export class DiagramRenderFailedError extends DomainError {
  constructor(assetId, reason) {
    super('DIAGRAM_RENDER_FAILED', `Diagram render failed for asset ${assetId}: ${reason}`);
  }
}

export class AssetUploadFailedError extends DomainError {
  constructor(assetId, reason) {
    super('ASSET_UPLOAD_FAILED', `Asset upload failed for asset ${assetId}: ${reason}`);
  }
}

export class NotFoundError extends DomainError {
  constructor(entity, id) {
    super('NOT_FOUND', `${entity} with id "${id}" not found`);
  }
}
