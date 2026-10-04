/**
 * @typedef {Object} RendererPort
 * @property {(mermaidSource: string) => Promise<Buffer>} renderMermaidToPng
 * @property {(mermaidSource: string) => Promise<{valid: boolean, error: string|null}>} validateMermaid
 */
export const RENDERER_PORT_METHODS = ['renderMermaidToPng', 'validateMermaid'];
