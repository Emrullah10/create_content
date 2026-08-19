// Tum servisleri (create-content-service + create-content-web) paralel dev modunda baslatir.
// create-content-ai (Python) ayri calistirilmali: cd create-content-ai && uvicorn main:app --reload --port 8100
import { spawn } from 'node:child_process';

const run = (name, cmd, args) => {
  const proc = spawn(cmd, args, { stdio: 'inherit', shell: true });
  proc.on('exit', (code) => console.log(`[${name}] exited with code ${code}`));
  return proc;
};

run('service', 'npm', ['run', 'dev', '--workspace=create-content-service']);
run('web', 'npm', ['run', 'dev', '--workspace=create-content-web']);

console.log('AI service is NOT started automatically — run separately:');
console.log('  cd create-content-ai && uvicorn main:app --reload --port 8100');
