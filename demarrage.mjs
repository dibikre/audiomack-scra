import { execSync, spawn } from 'node:child_process';

function verifierPhp() {
  try {
    execSync('command -v php', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!verifierPhp()) {
  console.log('[AM Scraper] Installation de PHP CLI...');
  execSync('apt-get update -qq && apt-get install -y --no-install-recommends php-cli php-curl php-mbstring', {
    stdio: 'inherit',
  });
}

const processus = spawn('php', ['-S', '0.0.0.0:3000', 'routeur.php'], {
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    processus.kill(signal);
  });
}

processus.on('exit', (code) => {
  process.exit(code ?? 0);
});
