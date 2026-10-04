// NVIDIA build.nvidia.com kataloğundan erisilebilir modelleri listeler.
// Gemini'nin aksine NVIDIA modelleri "text"/"image" olarak isimlendirilmiyor,
// bu yuzden yaygin bilinen birkac model id'sini deneyerek dogrular.
import 'dotenv/config';

const apiKey = process.env.NVIDIA_API_KEY;
if (!apiKey) {
  console.error('NVIDIA_API_KEY is not set (check .env)');
  process.exit(1);
}

const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
  headers: { Authorization: `Bearer ${apiKey}` },
});

if (!res.ok) {
  console.error(`NVIDIA models.list failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}

const { data } = await res.json();
console.log(`Available NVIDIA NIM models (${data.length} total):\n`);
for (const m of data) console.log(`  ${m.id}`);

console.log('\nConfigured in .env:');
console.log(`  NVIDIA_TEXT_MODEL=${process.env.NVIDIA_TEXT_MODEL ?? '(not set, default: meta/llama-3.3-70b-instruct)'}`);
console.log(`  NVIDIA_IMAGE_MODEL=${process.env.NVIDIA_IMAGE_MODEL ?? '(not set, default: stabilityai/stable-diffusion-3_5-large)'}`);
