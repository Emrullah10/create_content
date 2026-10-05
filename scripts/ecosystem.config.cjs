/** Yerel PM2 manifesti: npm run dev:backend. Tek servis (gateway yok). `.cjs` ZORUNLU: kok "type":"module" oldugu icin .js uzantili PM2 config'i "module is not defined" verir. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const name = 'create-content-service-content';
const cwd = path.join(root, 'services', name);

module.exports = {
  apps: fs.existsSync(path.join(cwd, 'main.js'))
    ? [{ name, script: 'main.js', cwd, instances: 1, exec_mode: 'fork', autorestart: true, watch: false, max_memory_restart: '1G', kill_timeout: 30000, env: { NODE_ENV: 'development' } }]
    : [],
};
