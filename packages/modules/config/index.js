import './load-env.js';

const required = (key, fallback) => process.env[key] ?? fallback;

export const appConfig = {
  nodeEnv:  required('NODE_ENV', 'development'),
  logLevel: required('LOG_LEVEL', 'info'),
  port:     parseInt(required('PORT', '3100')),
};

export const aiConfig = {
  apiUrl:      required('AI_API_URL', 'http://localhost:8100/api/v1/ai'),
  textModel:   required('NVIDIA_TEXT_MODEL', ''),
  imageModel:  required('NVIDIA_IMAGE_MODEL', ''),
};

export const publisherConfig = {
  devtoApiKey:       required('DEVTO_API_KEY', ''),
  devtoPublishMode:  required('DEVTO_PUBLISH_MODE', 'draft'),
  mediumToken:       required('MEDIUM_INTEGRATION_TOKEN', ''),
};

export const assetHostConfig = {
  githubToken:  required('GITHUB_TOKEN', ''),
  githubRepo:   required('GITHUB_ASSETS_REPO', ''),
  githubBranch: required('GITHUB_ASSETS_BRANCH', 'main'),
};

export const contentConfig = {
  language:        required('CONTENT_LANGUAGE', 'en'),
  qualityThreshold: parseInt(required('QUALITY_THRESHOLD', '75')),
  dailyCron:       required('DAILY_CRON', '0 6 * * *'),
  topicQueueMin:   parseInt(required('TOPIC_QUEUE_MIN', '10')),
};
