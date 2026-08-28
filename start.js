const { spawn } = require('child_process');
const path = require('path');

const proc = spawn('npm', ['start'], {
  cwd: path.join(__dirname, 'api'),
  stdio: 'inherit',
  shell: true
});

console.log('🚀 GDashboard (API + frontend em um processo).');
console.log('   Ex.: http://localhost:4000  ou  http://localhost:4000/gdashboard');
console.log('   Env opcionais: PORT, BASE_PATH (ex: /gdashboard), AUTH_USER, AUTH_PASS');

proc.on('exit', (code) => {
  console.log(`GDashboard encerrou com código ${code}`);
});

process.on('SIGINT', () => {
  console.log('\nEncerrando...');
  proc.kill();
  process.exit(0);
});