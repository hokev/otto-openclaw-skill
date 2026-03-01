#!/usr/bin/env node

/**
 * check-update.mjs — Check for updates to Otto Lab dependencies.
 *
 * Usage: node check-update.mjs
 * Queries the npm registry for latest versions of @ottolab packages.
 */

import { readFileSync } from 'node:fs';

const PKG_PATH = new URL('./package.json', import.meta.url);

let pkg;
try {
  pkg = JSON.parse(readFileSync(PKG_PATH, 'utf-8'));
} catch {
  console.error(JSON.stringify({ error: 'Could not read package.json' }));
  process.exit(1);
}

const PACKAGES = ['@ottolab/bio-age', '@ottolab/shared'];

async function getLatestVersion(name) {
  try {
    const res = await fetch(`https://registry.npmjs.org/${name}/latest`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.version ?? null;
  } catch {
    return null;
  }
}

function getInstalledVersion(name) {
  const spec = pkg.dependencies?.[name];
  if (!spec) return null;
  // Strip semver range prefix (^, ~, >=, etc.)
  return spec.replace(/^[\^~>=<]+/, '');
}

const results = {
  skill: { name: pkg.name, version: pkg.version },
  packages: [],
  outdated: false,
  offline: false,
};

for (const name of PACKAGES) {
  const installed = getInstalledVersion(name);
  const latest = await getLatestVersion(name);

  if (latest === null) {
    results.offline = true;
    results.packages.push({ name, installed, latest: 'unknown (offline?)' });
  } else {
    const isOutdated = installed !== latest;
    if (isOutdated) results.outdated = true;
    results.packages.push({ name, installed, latest, outdated: isOutdated });
  }
}

if (results.outdated) {
  results.updateCommand = `cd ${PKG_PATH.pathname.replace('/package.json', '')} && npm update`;
}

console.log(JSON.stringify(results, null, 2));
