/**
 * @typedef {Object} RendererPort
 * @property {(mermaidSource: string) => Promise<Buffer>} renderMermaidToPng
 */
export const RENDERER_PORT_METHODS = ['renderMermaidToPng'];
