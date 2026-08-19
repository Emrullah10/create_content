// GitHub Contents API ile ayri bir public "content-assets" repo'suna base64 commit atar,
// raw.githubusercontent.com URL'ini doner. Kalici ve ucretsiz gorsel host cozumu.
import axios from 'axios';

export const makeGithubAssetHost = ({ token, repo, branch = 'main' }) => {
  const http = axios.create({
    baseURL: `https://api.github.com/repos/${repo}`,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });

  return {
    upload: async (path, bufferOrPath) => {
      const buffer = Buffer.isBuffer(bufferOrPath) ? bufferOrPath : (await import('node:fs/promises')).readFile(bufferOrPath);
      const content = Buffer.from(await buffer).toString('base64');

      await http.put(`/contents/${path}`, {
        message: `content: add ${path}`,
        content,
        branch,
      });

      return { remoteUrl: `https://raw.githubusercontent.com/${repo}/${branch}/${path}` };
    },
  };
};
