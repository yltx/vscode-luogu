import fs from 'fs';
import { spawnSync } from 'child_process';
import { resolve } from 'path';
import { isPrereleaseVersion } from './release-policy.mjs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const args = [
  resolve('node_modules', '@vscode', 'vsce', 'vsce'),
  'package',
  '--allow-star-activation',
  '-o',
  'vscode-luogu.vsix'
];

if (isPrereleaseVersion(pkg.version)) args.push('--pre-release');

const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
