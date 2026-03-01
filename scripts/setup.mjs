#!/usr/bin/env node

/**
 * setup.mjs — Initialize Otto Lab directories.
 *
 * Usage: node setup.mjs
 * Idempotent — safe to re-run.
 */

import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const BASE = process.env.OTTO_LAB_DIR || join(homedir(), 'otto-lab');
const DIRS = [
  join(BASE, 'reports'),
  join(BASE, 'history'),
];

const result = { created: [], existed: [], base: BASE };

for (const dir of DIRS) {
  if (existsSync(dir)) {
    result.existed.push(dir);
  } else {
    mkdirSync(dir, { recursive: true });
    result.created.push(dir);
  }
}

console.log(JSON.stringify(result, null, 2));

if (result.created.length > 0) {
  console.error(`\nCreated ${result.created.length} director${result.created.length === 1 ? 'y' : 'ies'}. You're all set.`);
} else {
  console.error('\nAll directories already exist. Nothing to do.');
}
