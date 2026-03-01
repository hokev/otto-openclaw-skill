#!/usr/bin/env node

/**
 * save-result.mjs — Save a combined analysis result to history.
 *
 * Usage: echo '<combined-json>' | node save-result.mjs
 * Writes to ~/otto-lab/history/YYYY-MM-DD-HHmmss.json
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { readFileSync } from 'node:fs';

const HISTORY_DIR = join(process.env.OTTO_LAB_DIR || join(homedir(), 'otto-lab'), 'history');
const PKG_PATH = new URL('./package.json', import.meta.url);

// Read stdin
const chunks = [];
for await (const chunk of process.stdin) {
  chunks.push(chunk);
}

const input = Buffer.concat(chunks).toString('utf-8').trim();

if (!input) {
  console.error(JSON.stringify({ error: 'No input. Pipe combined analysis JSON via stdin.' }));
  process.exit(1);
}

let data;
try {
  data = JSON.parse(input);
} catch {
  console.error(JSON.stringify({ error: 'Invalid JSON input' }));
  process.exit(1);
}

// Read skill version
let version = 'unknown';
try {
  const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf-8'));
  version = pkg.version;
} catch { /* ignore */ }

// Stamp metadata
const now = new Date();
data.version = version;
data.timestamp = now.toISOString();

// Build filename: YYYY-MM-DD-HHmmss.json
const pad = (n) => String(n).padStart(2, '0');
const formattedName = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.json`;

// Ensure directory exists
mkdirSync(HISTORY_DIR, { recursive: true });

const outPath = join(HISTORY_DIR, formattedName);
writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n');

console.log(JSON.stringify({ saved: outPath, timestamp: data.timestamp, version }));
