import { jest } from '@jest/globals';
import { makeEmbedAssets } from '../../../../core/service-content/src/application/use-cases/asset/embed-assets.use-case.js';

const makeAssetRepo = (assets) => ({
  listByArticle: jest.fn().mockImplementation(async (_id, { kind, status } = {}) =>
    assets.filter((a) => (!kind || a.kind === kind) && (!status || a.status === status)),
  ),
});

describe('embed-assets: degradeMode', () => {
  test('without degradeMode, unembeddable diagram keeps article in needs_assets', async () => {
    const assetRepo = makeAssetRepo([
      { id: 'd1', kind: 'diagram', placeholderKey: 'DIAGRAM_1', status: 'uploaded', remoteUrl: 'https://x/1.png' },
      { id: 'd2', kind: 'diagram', placeholderKey: 'DIAGRAM_2', status: 'failed' },
    ]);
    const articleRepo = {
      findById: jest.fn().mockResolvedValue({ id: 'a1', bodyMarkdown: '{{DIAGRAM_1}}\n\n{{DIAGRAM_2}}' }),
      update: jest.fn().mockImplementation(async (id, patch) => ({ id, ...patch })),
    };

    const embedAssets = makeEmbedAssets({ articleRepo, assetRepo });
    const result = await embedAssets({ articleId: 'a1' });

    expect(result.status).toBe('needs_assets');
    expect(result.bodyMarkdown).toContain('{{DIAGRAM_2}}');
  });

  test('with degradeMode, unembeddable placeholder is stripped and article moves to review', async () => {
    const assetRepo = makeAssetRepo([
      { id: 'd1', kind: 'diagram', placeholderKey: 'DIAGRAM_1', status: 'uploaded', remoteUrl: 'https://x/1.png' },
      { id: 'd2', kind: 'diagram', placeholderKey: 'DIAGRAM_2', status: 'failed' },
    ]);
    const articleRepo = {
      findById: jest.fn().mockResolvedValue({ id: 'a1', bodyMarkdown: 'intro\n\n{{DIAGRAM_1}}\n\n{{DIAGRAM_2}}\n\noutro' }),
      update: jest.fn().mockImplementation(async (id, patch) => ({ id, ...patch })),
    };

    const embedAssets = makeEmbedAssets({ articleRepo, assetRepo });
    const result = await embedAssets({ articleId: 'a1', degradeMode: true });

    expect(result.status).toBe('review');
    expect(result.bodyMarkdown).not.toContain('DIAGRAM_2');
    expect(result.bodyMarkdown).toContain('https://x/1.png');
  });

  test('normalizes placeholderKey without curly braces stored in DB', async () => {
    const assetRepo = makeAssetRepo([
      { id: 'd1', kind: 'diagram', placeholderKey: 'DIAGRAM_1', status: 'uploaded', remoteUrl: 'https://x/1.png', altText: 'alt', caption: 'cap' },
    ]);
    const articleRepo = {
      findById: jest.fn().mockResolvedValue({ id: 'a1', bodyMarkdown: 'before {{DIAGRAM_1}} after' }),
      update: jest.fn().mockImplementation(async (id, patch) => ({ id, ...patch })),
    };

    const embedAssets = makeEmbedAssets({ articleRepo, assetRepo });
    const result = await embedAssets({ articleId: 'a1' });

    expect(result.status).toBe('review');
    expect(result.bodyMarkdown).toContain('![alt](https://x/1.png)');
    expect(result.bodyMarkdown).not.toContain('{{DIAGRAM_1}}');
  });
});
