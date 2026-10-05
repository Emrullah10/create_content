// GitHub Contents API ile ayri bir PUBLIC "content-assets" deposuna dosya commit'ler; raw.githubusercontent.com URL'i doner.
// Ayni yola ikinci yukleme 422 verirdi: mevcut dosyanin `sha`'si okunup PUT'a eklenir (guncelleme).
const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/');

export const makeGithubAssetHost = ({ token, repo, branch = 'main', fetchImpl = fetch }) => {
  if (!token || !repo) throw new Error('GitHub asset host requires token and repo');
  const api = `https://api.github.com/repos/${repo}/contents`;
  const headers = { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'create-content' };

  const existingSha = async (path) => {
    const res = await fetchImpl(`${api}/${encodePath(path)}?ref=${encodeURIComponent(branch)}`, { headers, signal: AbortSignal.timeout(30_000) });
    if (res.status === 404) return undefined;
    if (!res.ok) throw new Error(`GitHub contents lookup failed: ${res.status}`);
    return (await res.json()).sha;
  };

  return {
    upload: async ({ path, content, message }) => {
      if (!path) throw new Error('upload: path is required');
      if (!Buffer.isBuffer(content) || content.length === 0) throw new Error('upload: content must be a non-empty Buffer');
      const sha = await existingSha(path);
      const res = await fetchImpl(`${api}/${encodePath(path)}`, {
        method: 'PUT',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ message: message || `content: add ${path}`, content: content.toString('base64'), branch, ...(sha ? { sha } : {}) }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`GitHub upload failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
      return { url: `https://raw.githubusercontent.com/${repo}/${branch}/${path}` };
    },
  };
};

// Test/E2E: bellekte tutar, deterministik URL doner.
export const makeFakeAssetHost = () => {
  const files = new Map();
  return {
    upload: async ({ path, content }) => {
      files.set(path, content);
      return { url: `https://assets.example.test/${path}` };
    },
    files,
  };
};
