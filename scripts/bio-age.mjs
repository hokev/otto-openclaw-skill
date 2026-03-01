#!/usr/bin/env node

/**
 * bio-age.mjs — Calculate biological age from biomarkers.
 *
 * Usage: echo '{"chronologicalAge":35,"albumin":4.2,...}' | node bio-age.mjs
 * Output: JSON with PhenoAge, KDM, and/or metabolic proxy results.
 *
 * Reads biomarker JSON from stdin.
 */

import {
  calculatePhenoAge,
  calculateMetabolicProxy,
  convertToPhenoAgeUnits,
  calculateKDM,
} from '@ottohq/bio-age';

// Read JSON from stdin
const chunks = [];
for await (const chunk of process.stdin) {
  chunks.push(chunk);
}

const input = Buffer.concat(chunks).toString('utf-8').trim();

if (!input) {
  console.error(
    JSON.stringify({
      error: 'No input provided. Pipe biomarker JSON via stdin.',
      usage: 'echo \'{"chronologicalAge":35,"albumin":4.2}\' | node bio-age.mjs',
    }),
  );
  process.exit(1);
}

let biomarkers;
try {
  biomarkers = JSON.parse(input);
} catch {
  console.error(JSON.stringify({ error: 'Invalid JSON input' }));
  process.exit(1);
}

if (!biomarkers.chronologicalAge || typeof biomarkers.chronologicalAge !== 'number') {
  console.error(JSON.stringify({ error: 'chronologicalAge (number) is required' }));
  process.exit(1);
}

const results = {
  chronologicalAge: biomarkers.chronologicalAge,
  algorithms: [],
};

// Attempt PhenoAge (gold standard — requires full CBC subset)
const hasPhenoAgeInputs =
  biomarkers.albumin != null &&
  biomarkers.creatinine != null &&
  (biomarkers.fastingGlucose != null || biomarkers.glucose != null) &&
  biomarkers.hsCrp != null &&
  biomarkers.lymphocytePercent != null &&
  biomarkers.mcv != null &&
  biomarkers.rdw != null &&
  biomarkers.alp != null &&
  biomarkers.wbc != null;

if (hasPhenoAgeInputs) {
  try {
    const glucoseMgDl = biomarkers.fastingGlucose ?? biomarkers.glucose;
    const converted = convertToPhenoAgeUnits({
      glucose_mgDL: glucoseMgDl,
      crp_mgL: biomarkers.hsCrp,
      lymphocytePercent: biomarkers.lymphocytePercent,
      mcv: biomarkers.mcv,
      rdw: biomarkers.rdw,
      alp: biomarkers.alp,
      wbc: biomarkers.wbc,
    });

    const phenoResult = calculatePhenoAge({
      chronologicalAge: biomarkers.chronologicalAge,
      albumin: biomarkers.albumin,
      creatinine: biomarkers.creatinine,
      glucose: converted.glucose,
      lnCRP: converted.lnCRP,
      lymphocytePercent: converted.lymphocytePercent,
      mcv: converted.mcv,
      rdw: converted.rdw,
      alp: converted.alp,
      wbc: converted.wbc,
    });

    results.algorithms.push({
      name: 'PhenoAge',
      citation: 'Levine et al., 2018, Aging',
      biologicalAge: phenoResult.phenoAge,
      delta: phenoResult.delta,
      mortalityScore: phenoResult.mortalityScore,
      drivers: phenoResult.drivers,
    });
  } catch (err) {
    results.algorithms.push({
      name: 'PhenoAge',
      error: err.message,
    });
  }
}

// Attempt KDM (requires 3+ markers)
try {
  const kdmInput = Object.fromEntries(
    Object.entries({
      chronologicalAge: biomarkers.chronologicalAge,
      albumin: biomarkers.albumin,
      creatinine: biomarkers.creatinine,
      glucose: biomarkers.fastingGlucose ?? biomarkers.glucose,
      lymphocytePercent: biomarkers.lymphocytePercent,
      mcv: biomarkers.mcv,
      rdw: biomarkers.rdw,
      alp: biomarkers.alp,
      wbc: biomarkers.wbc,
      systolicBP: biomarkers.systolicBP,
      bun: biomarkers.bun,
      hba1c: biomarkers.hba1c,
      totalCholesterol: biomarkers.totalCholesterol,
    }).filter(([, v]) => v != null),
  );

  // Convert CRP to ln(CRP in mg/dL) for KDM
  if (biomarkers.hsCrp != null) {
    kdmInput.lnCRP = Math.log(Math.max(biomarkers.hsCrp * 0.1, 0.001));
  }

  const kdmResult = calculateKDM(kdmInput);
  results.algorithms.push({
    name: 'KDM',
    citation: 'Klemera & Doubal, 2006',
    biologicalAge: kdmResult.kdmAge,
    delta: kdmResult.delta,
    markersUsed: kdmResult.markersUsed,
  });
} catch (err) {
  if (!err.message.includes('at least 3')) {
    results.algorithms.push({
      name: 'KDM',
      error: err.message,
    });
  }
}

// Metabolic proxy fallback
if (!hasPhenoAgeInputs) {
  try {
    const proxyResult = calculateMetabolicProxy({
      chronologicalAge: biomarkers.chronologicalAge,
      glucose: biomarkers.fastingGlucose ?? biomarkers.glucose,
      hba1c: biomarkers.hba1c,
      hsCrp: biomarkers.hsCrp,
      triglycerides: biomarkers.triglycerides,
      hdl: biomarkers.hdl,
      ldlC: biomarkers.ldlC,
      fastingInsulin: biomarkers.fastingInsulin,
      uricAcid: biomarkers.uricAcid,
    });

    results.algorithms.push({
      name: 'MetabolicProxy',
      citation: 'Weighted z-score model (NHANES reference)',
      biologicalAge: proxyResult.phenoAge,
      delta: proxyResult.delta,
      isProxy: true,
    });
  } catch (err) {
    results.algorithms.push({
      name: 'MetabolicProxy',
      error: err.message,
    });
  }
}

// Select best result
const successful = results.algorithms.filter((a) => !a.error);
if (successful.length > 0) {
  // Priority: PhenoAge > KDM > MetabolicProxy
  const priority = ['PhenoAge', 'KDM', 'MetabolicProxy'];
  const best = priority.map((name) => successful.find((a) => a.name === name)).find(Boolean);
  results.bestEstimate = best?.name ?? successful[0].name;
} else {
  results.bestEstimate = null;
  results.error = 'Insufficient biomarkers for any biological age algorithm.';
}

console.log(JSON.stringify(results, null, 2));
