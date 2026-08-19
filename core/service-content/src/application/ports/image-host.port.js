/**
 * @typedef {Object} ImageHostPort
 * @property {(path: string, buffer: Buffer) => Promise<{remoteUrl: string}>} upload
 */
export const IMAGE_HOST_PORT_METHODS = ['upload'];
