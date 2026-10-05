// Sunucu PM2 manifesti. Normalde elle cagrilmaz; `npm run update` kullanilir.
//   ENV_FILE=.env.generated.json pm2 startOrReload ecosystem.config.cjs --update-env
// ENV_FILE ZORUNLU ve fail-fast: onsuz baslamak, operatorun kabugunu sessizce miras almak demektir
// (staging'in uretim veritabanina baglanmasi tam olarak boyle olur).
const fs = require('fs');
const path = require('path');

const envFile = process.env.ENV_FILE;
if (!envFile) {
  console.error('[ecosystem] ENV_FILE tanimsiz. Kullanim: npm run update');
  process.exit(1);
}
const envPath = path.isAbsolute(envFile) ? envFile : path.join(__dirname, envFile);
if (!fs.existsSync(envPath)) {
  console.error(`[ecosystem] ENV_FILE bulunamadi: ${envPath}`);
  process.exit(1);
}
const env = JSON.parse(fs.readFileSync(envPath, 'utf8'));
const name = 'create-content-service-content';

module.exports = {
  apps: [
    {
      name,
      cwd: path.join(__dirname, 'services', name),
      script: './main.js',
      instances: 1, // tek surec: cron ve advisory kilit tek yerde
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G', // puppeteer (mermaid render) bellek tutar
      kill_timeout: 30000,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env,
    },
  ],
};
