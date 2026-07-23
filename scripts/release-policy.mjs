import fs from 'fs';
import { pathToFileURL } from 'url';

export function getReleaseChannel(version, prerelease) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`版本号必须是 x.y.z 格式，当前为 ${version}`);

  const minor = Number(match[2]);
  if (prerelease && minor % 2 === 0)
    throw new Error(`预发布版本必须使用奇数 minor，当前为 ${version}`);
  if (!prerelease && minor % 2 !== 0)
    throw new Error(`正式版本必须使用偶数 minor，当前为 ${version}`);

  return prerelease ? 'pre-release' : 'stable';
}

export function isPrereleaseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`版本号必须是 x.y.z 格式，当前为 ${version}`);
  return Number(match[2]) % 2 !== 0;
}

export function validateRelease({ version, lockVersion, tag, prerelease }) {
  if (version !== lockVersion)
    throw new Error(
      `package.json (${version}) 与 package-lock.json (${lockVersion}) 版本不一致`
    );
  if (tag !== `v${version}`)
    throw new Error(`Release tag ${tag} 必须与 package 版本 v${version} 一致`);

  const channel = getReleaseChannel(version, prerelease);
  return {
    channel,
    vsceFlag: prerelease ? '--pre-release' : ''
  };
}

function parseBoolean(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`prerelease 必须是 true 或 false，当前为 ${value}`);
}

function getArgument(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || index === process.argv.length - 1)
    throw new Error(`缺少参数 ${name}`);
  return process.argv[index + 1];
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
    const tag = getArgument('--tag');
    const prerelease = parseBoolean(getArgument('--prerelease'));
    const outputPath = getArgument('--github-output');
    const result = validateRelease({
      version: pkg.version,
      lockVersion: lock.version,
      tag,
      prerelease
    });

    fs.appendFileSync(
      outputPath,
      `channel=${result.channel}\nvsce-flag=${result.vsceFlag}\n`
    );
    console.log(`Validated ${tag} for the ${result.channel} channel.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
