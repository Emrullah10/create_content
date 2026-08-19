import { computeDedupHash } from '../entities/topic.js';

// Bir basligin daha once uretilip uretilmedigini dedup_hash uzerinden kontrol eder.
// UNIQUE(dedup_hash) DB kisitiyla birlikte calisir — bu politika erken/insan-okunur kontrol saglar.
export const isDuplicateTitle = (title, existingHashes) => existingHashes.includes(computeDedupHash(title));
