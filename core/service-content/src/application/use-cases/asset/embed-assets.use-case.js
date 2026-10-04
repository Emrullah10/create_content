// Placeholder'lari ({{DIAGRAM_N}}) markdown img+caption ile degistirir.
// Bir placeholder icin yuklu asset yoksa (render/upload basarisiz oldu), makale 'needs_assets'te kalir.
export const makeEmbedAssets = ({ articleRepo, assetRepo }) => async ({ articleId, degradeMode = false }) => {
  const article = await articleRepo.findById(articleId);
  const assets = await assetRepo.listByArticle(articleId, { kind: 'diagram' });

  let body = article.bodyMarkdown;
  let allEmbedded = true;

  for (const asset of assets) {
    if (!asset.placeholderKey) continue;
    // placeholderKey DB'de suslu parantezsiz saklanabiliyor (ornek: "DIAGRAM_1"), ama
    // govdedeki gercek token her zaman "{{DIAGRAM_1}}" — split/join ciplak anahtarla
    // yapilirsa acilis/kapanis suslu parantezleri govdede kirik markdown olarak kalir.
    const rawKey = asset.placeholderKey.startsWith('{{') ? asset.placeholderKey.slice(2, -2) : asset.placeholderKey;
    // Case duyarli eslesme bir vakada sessizce basarisiz oldu: DB'de "diagram_1" kayitliyken
    // govdedeki gercek token AI'nin urettigi "{{DIAGRAM_1}}" idi — asset uploaded oldugu icin
    // allEmbedded=true kaliyordu (makale review'a geciyordu) ama placeholder govdede kaliyordu,
    // hic resimle degismiyordu. Govdedeki gercek token'i case-insensitive regex ile bulup onu
    // kullaniyoruz (DB'deki case'e degil).
    const tokenPattern = new RegExp(`\\{\\{${rawKey}\\}\\}`, 'i');
    const tokenMatch = body.match(tokenPattern);
    const token = tokenMatch ? tokenMatch[0] : `{{${rawKey}}}`;

    if (asset.status === 'uploaded' && asset.remoteUrl) {
      const md = `![${asset.altText ?? ''}](${asset.remoteUrl})\n\n*${asset.caption ?? ''}*`;
      body = body.split(token).join(md);
    } else if (degradeMode) {
      // Onarim/retry tukendi: kalici olarak "needs_assets"te olu kalmasin diye
      // gomulemeyen placeholder govdeden temizlenir. Asset kaydi DB'de durmaya devam
      // eder (silinmez) — meetsMinimumStructure diyagram KAYIT sayisina baktigi icin
      // (uploaded olma sartina degil) bu skoru cezalandirmaz.
      body = body.split(token).join('');
      body = body.split(`\n\n${token}`).join('');
    } else {
      allEmbedded = false;
    }
  }

  const coverAssets = await assetRepo.listByArticle(articleId, { kind: 'cover', status: 'uploaded' });
  const coverAssetId = coverAssets[0]?.id ?? null;

  const status = (allEmbedded || degradeMode) ? 'review' : 'needs_assets';
  return articleRepo.update(articleId, { bodyMarkdown: body, coverAssetId, status });
};
