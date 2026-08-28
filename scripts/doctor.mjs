import { spawnSync } from 'node:child_process';

const requirements = {
  node: [22, 13, 0],
  pnpm: [10, 33, 2],
};

function versionTuple(value) {
  return value
    .trim()
    .replace(/^v/, '')
    .split('.')
    .slice(0, 3)
    .map((part) => Number.parseInt(part, 10));
}

function atLeast(actual, minimum) {
  for (let index = 0; index < minimum.length; index += 1) {
    const actualPart = actual[index] ?? 0;
    const minimumPart = minimum[index] ?? 0;

    if (actualPart > minimumPart) return true;
    if (actualPart < minimumPart) return false;
  }

  return true;
}

function commandVersion(command, args = ['--version']) {
  const result = spawnSync(command, args, { encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error(`${command} is unavailable. Install it before continuing.`);
  }

  return result.stdout.trim();
}

const nodeVersion = process.version;
const pnpmVersion = commandVersion('pnpm');
const gitVersion = commandVersion('git', ['--version']).replace(
  'git version ',
  '',
);
const easVersion = commandVersion('eas').split(' ')[0];

if (!atLeast(versionTuple(nodeVersion), requirements.node)) {
  throw new Error(`Node ${nodeVersion} is too old; use Node 22.13.0 or newer.`);
}

if (!atLeast(versionTuple(pnpmVersion), requirements.pnpm)) {
  throw new Error(`pnpm ${pnpmVersion} is too old; use pnpm 10.33.2 or newer.`);
}

console.info(
  JSON.stringify({
    node: nodeVersion.replace(/^v/, ''),
    pnpm: pnpmVersion,
    git: gitVersion,
    eas: easVersion,
  }),
);
