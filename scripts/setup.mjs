#!/usr/bin/env node

/**
 * setup.mjs — Initialize Otto Lab directories and check dependencies.
 *
 * Usage: node setup.mjs
 * Idempotent — safe to re-run.
 */

import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';

const BASE = process.env.OTTO_LAB_DIR || join(homedir(), 'otto-lab');
const DIRS = [
  join(BASE, 'reports'),
  join(BASE, 'history'),
];

const result = { created: [], existed: [], base: BASE, dependencies: {} };

for (const dir of DIRS) {
  if (existsSync(dir)) {
    result.existed.push(dir);
  } else {
    mkdirSync(dir, { recursive: true });
    result.created.push(dir);
  }
}

// Check for pdftotext (required for PDF lab report parsing)
try {
  execSync('which pdftotext', { stdio: 'pipe' });
  result.dependencies.pdftotext = 'installed';
} catch {
  result.dependencies.pdftotext = 'missing';
}

console.log(JSON.stringify(result, null, 2));

if (result.created.length > 0) {
  console.error(`\nCreated ${result.created.length} director${result.created.length === 1 ? 'y' : 'ies'}.`);
} else {
  console.error('\nAll directories already exist.');
}

if (result.dependencies.pdftotext === 'missing') {
  console.error('\nWarning: pdftotext not found. PDF lab report parsing will not work.');
  console.error('Install it with: apt-get update && apt-get install -y poppler-utils');
}
