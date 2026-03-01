#!/usr/bin/env node

/**
 * history.mjs — View and analyze saved blood work results.
 *
 * Usage:
 *   node history.mjs list                 — List all saved results
 *   node history.mjs show <filename>      — Show a specific result
 *   node history.mjs trend <marker>       — Track a biomarker across results
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { BIOMARKER_RANGES } from '@ottolab/shared';

const HISTORY_DIR = join(homedir(), 'otto-lab', 'history');

const [command, arg] = process.argv.slice(2);

if (!command || !['list', 'show', 'trend'].includes(command)) {
  console.error(JSON.stringify({
    error: 'Usage: node history.mjs <list|show|trend> [argument]',
    commands: {
      list: 'List all saved results',
      'show <filename>': 'Show a specific saved result',
      'trend <marker>': 'Track a biomarker across all results (e.g., ldlC, hba1c)',
    },
  }, null, 2));
  process.exit(1);
}

/** Load all history files, sorted by timestamp ascending. */
function loadHistory() {
  let files;
  try {
    files = readdirSync(HISTORY_DIR).filter((f) => f.endsWith('.json')).sort();
  } catch {
    return [];
  }

  return files.map((f) => {
    try {
      const data = JSON.parse(readFileSync(join(HISTORY_DIR, f), 'utf-8'));
      return { filename: f, ...data };
    } catch {
      return null;
    }
  }).filter(Boolean);
}

// --- LIST ---
if (command === 'list') {
  const entries = loadHistory();

  if (entries.length === 0) {
    console.log(JSON.stringify({ results: [], message: 'No saved results. Run an analysis and save it first.' }));
    process.exit(0);
  }

  const summary = entries.map((e) => {
    const bioAge = e.bioAge?.biologicalAge ?? e.bioAge?.bestEstimate ?? null;
    const red = e.recommendations?.red?.length ?? 0;
    const yellow = e.recommendations?.yellow?.length ?? 0;
    const green = e.recommendations?.green?.length ?? 0;

    return {
      filename: e.filename,
      date: e.timestamp ?? e.filename.replace('.json', ''),
      bioAge,
      markers: { red, yellow, green },
    };
  });

  console.log(JSON.stringify({ results: summary }, null, 2));
}

// --- SHOW ---
if (command === 'show') {
  if (!arg) {
    console.error(JSON.stringify({ error: 'Provide a filename. Run "history.mjs list" to see available results.' }));
    process.exit(1);
  }

  const filename = arg.endsWith('.json') ? arg : `${arg}.json`;
  const filePath = join(HISTORY_DIR, filename);

  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    console.log(JSON.stringify(data, null, 2));
  } catch {
    console.error(JSON.stringify({ error: `File not found: ${filename}` }));
    process.exit(1);
  }
}

// --- TREND ---
if (command === 'trend') {
  if (!arg) {
    console.error(JSON.stringify({ error: 'Provide a biomarker key (e.g., ldlC, hba1c, fastingGlucose).' }));
    process.exit(1);
  }

  const marker = arg;
  const entries = loadHistory();

  // Map camelCase key to snake_case range key
  const KEY_MAP = {
    totalCholesterol: 'total_cholesterol', ldlC: 'ldl_c', hdl: 'hdl',
    triglycerides: 'triglycerides', apoB: 'apoB', hba1c: 'hba1c',
    fastingGlucose: 'fasting_glucose', fastingInsulin: 'fasting_insulin',
    homaIr: 'homa_ir', uricAcid: 'uric_acid', creatinine: 'creatinine',
    bun: 'bun', egfr: 'egfr', alt: 'alt', ast: 'ast', alp: 'alp',
    albumin: 'albumin', hsCrp: 'hs_crp', cortisol: 'cortisol',
    testosterone: 'testosterone', tsh: 'tsh', wbc: 'wbc',
    hemoglobin: 'hemoglobin', vitaminD: 'vitamin_d', mcv: 'mcv',
    rdw: 'rdw', lymphocytePercent: 'lymphocyte_percent',
  };

  const rangeKey = KEY_MAP[marker] ?? marker;
  const range = BIOMARKER_RANGES[rangeKey];

  // Extract marker values from each entry
  const dataPoints = entries
    .map((e) => {
      const value = e.biomarkers?.[marker];
      if (typeof value !== 'number') return null;
      return {
        date: e.timestamp ?? e.filename.replace('.json', ''),
        value,
      };
    })
    .filter(Boolean);

  if (dataPoints.length === 0) {
    console.log(JSON.stringify({
      marker,
      dataPoints: [],
      message: `No data found for "${marker}" in saved results.`,
    }, null, 2));
    process.exit(0);
  }

  // Compute deltas
  const withDeltas = dataPoints.map((point, i) => {
    if (i === 0) return { ...point, delta: null };
    return { ...point, delta: +(point.value - dataPoints[i - 1].value).toFixed(2) };
  });

  // Determine direction based on first vs last
  let direction = 'stable';
  if (dataPoints.length >= 2) {
    const first = dataPoints[0].value;
    const last = dataPoints[dataPoints.length - 1].value;
    const change = last - first;
    const threshold = Math.abs(first) * 0.03; // 3% threshold for stability

    if (Math.abs(change) > threshold) {
      const lowerIsBetter = range?.lowerIsBetter ?? false;
      const moving = change > 0 ? 'increasing' : 'decreasing';

      if (lowerIsBetter) {
        direction = change < 0 ? 'improving' : 'worsening';
      } else {
        direction = change > 0 ? 'improving' : 'worsening';
      }

      // Bidirectional markers — flag if moving away from optimal
      if (range?.bidirectional && range.optimalLow != null && range.optimalHigh != null) {
        const optimalMid = (range.optimalLow + range.optimalHigh) / 2;
        const wasCloser = Math.abs(first - optimalMid) < Math.abs(last - optimalMid);
        direction = wasCloser ? 'worsening' : 'improving';
      }
    }
  }

  const result = {
    marker,
    unit: range?.unit ?? null,
    optimalRange: range ? `${range.optimalLow ?? range.low}-${range.optimalHigh ?? range.high}` : null,
    direction,
    dataPoints: withDeltas,
  };

  console.log(JSON.stringify(result, null, 2));
}
