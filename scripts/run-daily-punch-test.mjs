import { spawnSync } from 'child_process';

const candidates =
  process.platform === 'win32' ? ['powershell.exe', 'pwsh.exe'] : ['pwsh'];
let lastError;

for (const executable of candidates) {
  const result = spawnSync(
    executable,
    ['-NoProfile', '-File', 'scripts/daily-punch.test.ps1'],
    { stdio: 'inherit' }
  );
  if (!result.error) {
    process.exitCode = result.status ?? 1;
    process.exit();
  }
  if (result.error.code !== 'ENOENT' && result.error.code !== 'EINVAL') {
    throw result.error;
  }
  lastError = result.error;
}

throw new Error('PowerShell is required to test daily-punch.ps1', {
  cause: lastError
});
