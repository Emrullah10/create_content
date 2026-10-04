// Token yokken kullanilan yedek yol: dev.to'ya zaten yayinlanmis makalenin URL'ini
// Medium'un "Import a story" akisina hazir eder. Gercek import kullanici tarafindan
// panelden tek tikla tetiklenir (Medium bu adimi otomasyona kapali tutuyor).
export const makeMediumImportPublisher = () => ({
  isAvailable: async () => true,

  publish: async (article) => {
    const importUrl = `https://medium.com/p/import?url=${encodeURIComponent(article.canonicalUrl ?? '')}`;
    return { externalId: null, externalUrl: importUrl, status: 'pending_import' };
  },
});
