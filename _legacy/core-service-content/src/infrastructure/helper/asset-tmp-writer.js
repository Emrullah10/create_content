// Render edilen buffer'lari (diyagram PNG, kapak PNG) gecici bir dosyaya yazar.
// Neden diske yaziyoruz, bellekte tutmuyoruz: render/upload ayri use-case cagrilari
// arasinda asset kaydi DB'den yeniden okunuyor (source of truth DB) — bellek-ici bir
// alan bu round-trip'te kaybolur. local_path kolonu zaten kalici bir dosya yolu icin var.
// mkdtemp() SUREC-OMURLU idi — servis yeniden baslayinca local_path kayitli kaliyor ama
// dosya kayboluyor, upload "path must be string" hatasiyla patliyordu (bkz buglog).
// Deterministik, yeniden-baslatmaya dayanikli bir dizin kullanilir.
import { writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const ASSET_TMP_DIR = path.join(tmpdir(), 'create-content-assets');

let dirReadyPromise = null;

const ensureTmpDir = async () => {
  if (!dirReadyPromise) dirReadyPromise = mkdir(ASSET_TMP_DIR, { recursive: true }).then(() => ASSET_TMP_DIR);
  return dirReadyPromise;
};

export const writeAssetBufferToTmp = async (assetId, buffer) => {
  const dir = await ensureTmpDir();
  const filePath = path.join(dir, `${assetId}.png`);
  await writeFile(filePath, buffer);
  return filePath;
};
