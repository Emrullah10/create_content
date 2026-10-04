import { REQUIRED_MIN_DIAGRAMS, REQUIRED_MIN_CODE_BLOCKS, countCodeBlocks, wordCount } from '../entities/article.js';

// AI'in kendi skoruna guvenmek yetmiyor — draft.md 1200-1800 kelime hedefliyor ama
// bunu deterministik olarak da dogrulamak gerekiyor (bkz 2026-08-19 kisalik bugu).
export const MIN_WORD_COUNT = 1000;

export const meetsMinimumStructure = ({ diagramCount, bodyMarkdown }) =>
  diagramCount >= REQUIRED_MIN_DIAGRAMS &&
  countCodeBlocks(bodyMarkdown) >= REQUIRED_MIN_CODE_BLOCKS &&
  wordCount(bodyMarkdown) >= MIN_WORD_COUNT;

export const passesQualityThreshold = (score, threshold) => typeof score === 'number' && score >= threshold;
