// Medium API v1 (eski Integration Token gerektirir; Medium 2023'ten beri yeni token vermiyor).
// isAvailable() /v1/me ile probe eder; token yoksa/gecersizse false doner ve container medium-import'a duser.
import axios from 'axios';

export const makeMediumApiPublisher = ({ token }) => {
  const http = axios.create({
    baseURL: 'https://api.medium.com/v1',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  let cachedAuthorId = null;

  const resolveAuthorId = async () => {
    if (cachedAuthorId) return cachedAuthorId;
    const { data } = await http.get('/me');
    cachedAuthorId = data.data.id;
    return cachedAuthorId;
  };

  return {
    isAvailable: async () => {
      if (!token) return false;
      try {
        await resolveAuthorId();
        return true;
      } catch {
        return false;
      }
    },

    publish: async (article) => {
      const authorId = await resolveAuthorId();
      const { data } = await http.post(`/users/${authorId}/posts`, {
        title: article.title,
        contentFormat: 'markdown',
        content: article.bodyMarkdown,
        canonicalUrl: article.canonicalUrl,
        tags: (article.tags ?? []).slice(0, 5),
        publishStatus: 'draft',
      });
      return { externalId: data.data.id, externalUrl: data.data.url, status: 'draft' };
    },
  };
};
