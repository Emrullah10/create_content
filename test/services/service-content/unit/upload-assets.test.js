import { jest } from '@jest/globals';
import { makeUploadAssets } from '../../../../core/service-content/src/application/use-cases/asset/upload-assets.use-case.js';

const RENDERED_ASSET = { id: 'asset-1', kind: 'diagram', placeholderKey: 'DIAGRAM_1', localPath: null };

describe('upload-assets: null localPath handling', () => {
  test('marks asset failed with a clear message when localPath is missing (imageHost rejects empty input)', async () => {
    // github-asset-host.js throws synchronously on an empty bufferOrPath — this asserts
    // upload-assets surfaces that as a 'failed' asset instead of an unhandled crash.
    const upload = jest.fn().mockImplementation(async (_path, bufferOrPath) => {
      if (!bufferOrPath) throw new Error('upload: bufferOrPath is empty (asset has no local_path or buffer)');
      return { remoteUrl: 'https://example.com/x.png' };
    });
    const assetRepo = {
      listByArticle: jest.fn().mockResolvedValue([RENDERED_ASSET]),
      update: jest.fn().mockImplementation(async (id, patch) => ({ id, ...patch })),
    };

    const uploadAssets = makeUploadAssets({ assetRepo, imageHost: { upload } });
    const [result] = await uploadAssets({ articleId: 'article-1', slug: 'my-slug' });

    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/bufferOrPath is empty/);
    expect(assetRepo.update).toHaveBeenCalledWith('asset-1', expect.objectContaining({ status: 'failed' }));
  });

  test('uploads normally when localPath is present', async () => {
    const upload = jest.fn().mockResolvedValue({ remoteUrl: 'https://example.com/x.png' });
    const assetRepo = {
      listByArticle: jest.fn().mockResolvedValue([{ ...RENDERED_ASSET, localPath: '/tmp/asset-1.png' }]),
      update: jest.fn().mockImplementation(async (id, patch) => ({ id, ...patch })),
    };

    const uploadAssets = makeUploadAssets({ assetRepo, imageHost: { upload } });
    const [result] = await uploadAssets({ articleId: 'article-1', slug: 'my-slug' });

    expect(upload).toHaveBeenCalledWith(expect.stringContaining('my-slug'), '/tmp/asset-1.png');
    expect(result.status).toBe('uploaded');
  });
});
