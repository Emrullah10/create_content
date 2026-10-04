import { DomainError } from '../errors/domain-error.js';

// Tekillik anahtari: kucuk harf, alfanumerik disi her sey tek bosluk. Yalniz birebir tekrari yakalar;
// anlamsal benzerlik pg_trgm + LLM ile ayrica kontrol edilir (topic.repository.findSimilar).
export const dedupKeyOf = (title) => String(title).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const SIMILARITY_THRESHOLD = 0.55;

export const validateTopicInput = ({ title } = {}) => {
  if (!String(title ?? '').trim()) throw new DomainError('TOPIC_TITLE_REQUIRED', 'title is required');
  if (String(title).length > 300) throw new DomainError('TOPIC_TITLE_TOO_LONG', 'title must be at most 300 characters');
};

// suggested -> approved|rejected ; approved -> drafting|rejected ; drafting -> used|approved (hata) ; rejected -> suggested
const FORWARD = Object.freeze({
  suggested: ['approved', 'rejected'],
  approved: ['drafting', 'rejected'],
  drafting: ['used', 'approved'],
  rejected: ['suggested'],
});
export const canTransitionTopic = (from, to) => (FORWARD[from] || []).includes(to);
export const TOPIC_STATUSES = Object.freeze(['suggested', 'approved', 'drafting', 'used', 'rejected']);
