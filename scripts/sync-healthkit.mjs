#!/usr/bin/env node

/**
 * sync-healthkit.mjs — Fetch raw HealthKit data and save to reports directory.
 *
 * Usage: node sync-healthkit.mjs [--force]
 *
 * Requires `healthsync` binary (https://github.com/nicklama/healthkit-sync).
 * If not installed, exits gracefully with {"status": "unavailable"}.
 *
 * Saves raw JSON to $REPORTS_DIR/healthkit-YYYY-MM-DD.json.
 * Does NOT transform or normalize data — Claude handles that via SKILL.md.
 */

import { execSync } from 'node:child_process';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const BASE = process.env.OTTO_LAB_DIR || join(homedir(), 'otto-lab');
const REPORTS_DIR = join(BASE, 'reports');
const force = process.argv.includes('--force');

// Check if healthsync is available
try {
  execSync('which healthsync', { stdio: 'pipe' });
} catch {
  console.log(JSON.stringify({ status: 'unavailable' }));
  process.exit(0);
}

// Build filename with today's date
const today = new Date().toISOString().slice(0, 10);
const filePath = join(REPORTS_DIR, `healthkit-${today}.json`);

// Use cached file if it exists and --force not passed
if (!force && existsSync(filePath)) {
  console.log(JSON.stringify({ status: 'cached', filePath }));
  process.exit(0);
}

// Fetch raw HealthKit data (last 30 days, all useful types)
const types = [
  'bodyMass', 'height', 'bodyMassIndex', 'bodyFatPercentage',
  'heartRate', 'restingHeartRate', 'heartRateVariabilitySDNN',
  'bloodPressureSystolic', 'bloodPressureDiastolic',
  'oxygenSaturation', 'vo2Max',
  'stepCount', 'activeEnergyBurned',
  'sleepAnalysis',
].join(',');

try {
  const raw = execSync(
    `healthsync fetch --days 30 --types ${types} --format json`,
    { encoding: 'utf-8', timeout: 30_000, maxBuffer: 10 * 1024 * 1024 },
  );

  writeFileSync(filePath, raw, 'utf-8');

  // Count samples for status output
  let sampleCount = 0;
  try {
    const parsed = JSON.parse(raw);
    sampleCount = Array.isArray(parsed) ? parsed.length
      : typeof parsed === 'object' ? Object.values(parsed).flat().length
      : 0;
  } catch { /* count stays 0 */ }

  console.log(JSON.stringify({ status: 'synced', filePath, sampleCount }));
} catch (err) {
  console.error(JSON.stringify({ error: 'healthsync fetch failed', message: err.message }));
  process.exit(1);
}
