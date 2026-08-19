/**
 * @typedef {Object} PublisherPort
 * @property {(article: object) => Promise<{externalId: string, externalUrl: string, status: string}>} publish
 * @property {() => Promise<boolean>} isAvailable
 */
export const PUBLISHER_PORT_METHODS = ['publish', 'isAvailable'];
