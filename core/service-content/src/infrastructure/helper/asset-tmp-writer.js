// Render edilen buffer'lari (diyagram PNG, kapak PNG) gecici bir dosyaya yazar.
// Neden diske yaziyoruz, bellekte tutmuyoruz: render/upload ayri use-case cagrilari
// arasinda asset kaydi DB'den yeniden okunuyor (source of truth DB) — bellek-ici bir
// alan bu round-trip'te kaybolur. local_path kolonu zaten kalici bir dosya yolu icin var.
import { writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

let tmpDirPromise = null;

const ensureTmpDir = async () => {
  if (!tmpDirPromise) tmpDirPromise = mkdtemp(path.join(tmpdir(), 'create-content-assets-'));
  return tmpDirPromise;
};

export const writeAssetBufferToTmp = async (assetId, buffer) => {
  const dir = await ensureTmpDir();
  const filePath = path.join(dir, `${assetId}.png`);
  await writeFile(filePath, buffer);
  return filePath;
};
