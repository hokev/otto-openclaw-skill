#!/usr/bin/env node

/**
 * recommend.mjs — Generate evidence-based health recommendations.
 *
 * Usage: echo '{"albumin":4.2,"ldlC":145,...}' | node recommend.mjs
 * Output: JSON with categorized recommendations for out-of-range biomarkers.
 *
 * Reads biomarker JSON from stdin. Uses BIOMARKER_RANGES from @otto/shared
 * to evaluate each marker against clinical reference ranges.
 */

import { BIOMARKER_RANGES } from '@otto/shared';

// Map from biomarker JSON keys to BIOMARKER_RANGES keys
const KEY_MAP = {
  totalCholesterol: 'total_cholesterol',
  ldlC: 'ldl_c',
  hdl: 'hdl',
  triglycerides: 'triglycerides',
  apoB: 'apoB',
  hba1c: 'hba1c',
  fastingGlucose: 'fasting_glucose',
  fastingInsulin: 'fasting_insulin',
  homaIr: 'homa_ir',
  uricAcid: 'uric_acid',
  creatinine: 'creatinine',
  bun: 'bun',
  egfr: 'egfr',
  alt: 'alt',
  ast: 'ast',
  alp: 'alp',
  ggt: 'ggt',
  bilirubinTotal: 'bilirubin_total',
  albumin: 'albumin',
  hsCrp: 'hs_crp',
  esr: 'esr',
  cortisol: 'cortisol',
  testosterone: 'testosterone',
  estradiol: 'estradiol',
  tsh: 'tsh',
  wbc: 'wbc',
  rbc: 'rbc',
  hemoglobin: 'hemoglobin',
  hematocrit: 'hematocrit',
  platelets: 'platelets',
  mcv: 'mcv',
  rdw: 'rdw',
  lymphocytePercent: 'lymphocyte_percent',
  vitaminD: 'vitamin_d',
  bmi: 'bmi',
  bodyFatPercent: 'body_fat_percent',
  systolicBP: 'systolic_bp',
  diastolicBP: 'diastolic_bp',
  heartRate: 'heart_rate',
};

// Evidence-based protocols for common out-of-range scenarios
const PROTOCOLS = {
  ldl_c: {
    high: {
      protocols: [
        {
          category: 'diet',
          name: 'Mediterranean diet pattern',
          dosage: 'Daily',
          evidence: 'A',
          source: 'AHA/ACC 2018',
        },
        {
          category: 'supplement',
          name: 'Psyllium husk fiber',
          dosage: '10g/day',
          evidence: 'A',
          source: 'AHA/ACC 2018',
        },
        {
          category: 'exercise',
          name: 'Moderate aerobic exercise',
          dosage: '150 min/week',
          evidence: 'A',
          source: 'AHA/ACC 2018',
        },
      ],
      timeline: '3-6 months',
    },
  },
  fasting_glucose: {
    high: {
      protocols: [
        {
          category: 'diet',
          name: 'Reduce refined carbohydrates',
          dosage: '<25g added sugar/day',
          evidence: 'A',
          source: 'ADA 2024',
        },
        {
          category: 'exercise',
          name: 'Post-meal walking',
          dosage: '15 min after meals',
          evidence: 'B',
          source: 'ADA 2024',
        },
        {
          category: 'supplement',
          name: 'Berberine',
          dosage: '500mg 2x/day',
          evidence: 'B',
          source: 'J Clin Endocrinol Metab',
        },
      ],
      timeline: '2-3 months',
    },
  },
  hba1c: {
    high: {
      protocols: [
        {
          category: 'diet',
          name: 'Low glycemic index diet',
          dosage: 'Daily',
          evidence: 'A',
          source: 'ADA 2024',
        },
        {
          category: 'exercise',
          name: 'Resistance training + aerobic',
          dosage: '3x/week each',
          evidence: 'A',
          source: 'ADA 2024',
        },
        {
          category: 'monitoring',
          name: 'CGM or glucose spot-checks',
          dosage: '2 weeks',
          evidence: 'B',
          source: 'ADA 2024',
        },
      ],
      timeline: '3 months (next HbA1c)',
    },
  },
  vitamin_d: {
    low: {
      protocols: [
        {
          category: 'supplement',
          name: 'Vitamin D3',
          dosage: '4,000-5,000 IU/day',
          evidence: 'A',
          source: 'Endocrine Society 2024',
        },
        {
          category: 'supplement',
          name: 'Vitamin K2 (MK-7)',
          dosage: '200 mcg/day',
          evidence: 'B',
          source: 'Osteoporosis Int',
        },
        {
          category: 'lifestyle',
          name: 'Midday sun exposure',
          dosage: '15-20 min/day',
          evidence: 'B',
          source: 'Endocrine Society',
        },
      ],
      timeline: '8-12 weeks, then retest',
    },
  },
  hs_crp: {
    high: {
      protocols: [
        {
          category: 'diet',
          name: 'Anti-inflammatory diet (omega-3 rich)',
          dosage: 'Daily',
          evidence: 'A',
          source: 'AHA 2019',
        },
        {
          category: 'supplement',
          name: 'EPA/DHA fish oil',
          dosage: '2g EPA+DHA/day',
          evidence: 'A',
          source: 'AHA 2019',
        },
        {
          category: 'exercise',
          name: 'Regular moderate exercise',
          dosage: '150 min/week',
          evidence: 'A',
          source: 'AHA 2019',
        },
        {
          category: 'lifestyle',
          name: 'Sleep optimization',
          dosage: '7-9 hours/night',
          evidence: 'B',
          source: 'Sleep Med Rev',
        },
      ],
      timeline: '6-8 weeks',
    },
  },
  triglycerides: {
    high: {
      protocols: [
        {
          category: 'diet',
          name: 'Reduce alcohol and sugar',
          dosage: 'Minimize',
          evidence: 'A',
          source: 'AHA/ACC 2018',
        },
        {
          category: 'supplement',
          name: 'EPA/DHA fish oil',
          dosage: '2-4g/day',
          evidence: 'A',
          source: 'AHA/ACC 2018',
        },
        {
          category: 'exercise',
          name: 'Aerobic exercise',
          dosage: '150+ min/week',
          evidence: 'A',
          source: 'AHA/ACC 2018',
        },
      ],
      timeline: '4-8 weeks',
    },
  },
  hdl: {
    low: {
      protocols: [
        {
          category: 'exercise',
          name: 'Vigorous aerobic exercise',
          dosage: '75+ min/week',
          evidence: 'A',
          source: 'AHA/ACC 2018',
        },
        {
          category: 'diet',
          name: 'Increase healthy fats (olive oil, nuts)',
          dosage: 'Daily',
          evidence: 'B',
          source: 'AHA/ACC 2018',
        },
        {
          category: 'lifestyle',
          name: 'Quit smoking (if applicable)',
          dosage: 'Permanent',
          evidence: 'A',
          source: 'AHA 2019',
        },
      ],
      timeline: '3-6 months',
    },
  },
  testosterone: {
    low: {
      protocols: [
        {
          category: 'exercise',
          name: 'Heavy compound resistance training',
          dosage: '3-4x/week',
          evidence: 'A',
          source: 'J Clin Endocrinol Metab',
        },
        {
          category: 'lifestyle',
          name: 'Sleep 7-9 hours, reduce stress',
          dosage: 'Daily',
          evidence: 'A',
          source: 'JAMA 2011',
        },
        {
          category: 'supplement',
          name: 'Vitamin D3 + Zinc + Magnesium',
          dosage: '5000 IU D3 + 30mg Zn + 400mg Mg/day',
          evidence: 'B',
          source: 'Biol Trace Elem Res',
        },
      ],
      timeline: '8-12 weeks',
    },
  },
  fasting_insulin: {
    high: {
      protocols: [
        {
          category: 'diet',
          name: 'Time-restricted eating',
          dosage: '16:8 or 14:10 window',
          evidence: 'B',
          source: 'N Engl J Med 2019',
        },
        {
          category: 'exercise',
          name: 'High-intensity interval training',
          dosage: '2-3x/week',
          evidence: 'A',
          source: 'Diabetes Care',
        },
        {
          category: 'supplement',
          name: 'Berberine or Inositol',
          dosage: '500mg berberine 2x/day or 4g myo-inositol/day',
          evidence: 'B',
          source: 'Metabolism',
        },
      ],
      timeline: '6-12 weeks',
    },
  },
  uric_acid: {
    high: {
      protocols: [
        {
          category: 'diet',
          name: 'Reduce fructose and purines',
          dosage: 'Limit red meat, shellfish, beer',
          evidence: 'A',
          source: 'ACR 2020',
        },
        {
          category: 'lifestyle',
          name: 'Increase hydration',
          dosage: '2.5-3L water/day',
          evidence: 'B',
          source: 'Ann Rheum Dis',
        },
        {
          category: 'supplement',
          name: 'Tart cherry extract',
          dosage: '500mg 2x/day',
          evidence: 'B',
          source: 'Arthritis Res Ther',
        },
      ],
      timeline: '4-8 weeks',
    },
  },
};

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
      usage: 'echo \'{"ldlC":145,"vitaminD":18}\' | node recommend.mjs',
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

const report = {
  red: [],
  yellow: [],
  green: [],
  summary: { total: 0, optimal: 0, suboptimal: 0, critical: 0 },
};

for (const [jsonKey, value] of Object.entries(biomarkers)) {
  if (typeof value !== 'number') continue;

  const rangeKey = KEY_MAP[jsonKey];
  if (!rangeKey) continue;

  const range = BIOMARKER_RANGES[rangeKey];
  if (!range) continue;

  report.summary.total++;

  const entry = {
    marker: jsonKey,
    value,
    unit: range.unit,
    normalRange: `${range.low}-${range.high}`,
    optimalRange:
      range.optimalLow || range.optimalHigh
        ? `${range.optimalLow ?? range.low}-${range.optimalHigh ?? range.high}`
        : null,
  };

  // Check critical
  const isCriticalHigh = range.criticalHigh != null && value > range.criticalHigh;
  const isCriticalLow = range.criticalLow != null && value < range.criticalLow;

  if (isCriticalHigh || isCriticalLow) {
    report.summary.critical++;
    const direction = isCriticalHigh ? 'high' : 'low';
    const protocols = PROTOCOLS[rangeKey]?.[direction];
    report.red.push({
      ...entry,
      flag: `critically_${direction}`,
      recommendation: protocols
        ? { ...protocols, note: 'Consult a healthcare provider for values in this range.' }
        : { note: 'Consult a healthcare provider. This value is outside the normal range.' },
    });
    continue;
  }

  // Check suboptimal
  const isHigh = value > range.high;
  const isLow = value < range.low;
  const isSuboptimalHigh = range.optimalHigh != null && value > range.optimalHigh;
  const isSuboptimalLow = range.optimalLow != null && value < range.optimalLow;

  if (isHigh || isLow) {
    report.summary.suboptimal++;
    const direction = isHigh ? 'high' : 'low';
    const protocols = PROTOCOLS[rangeKey]?.[direction];
    report.yellow.push({
      ...entry,
      flag: direction,
      recommendation: protocols ?? { note: 'Monitor and discuss with your healthcare provider.' },
    });
    continue;
  }

  if (isSuboptimalHigh || isSuboptimalLow) {
    report.summary.suboptimal++;
    const direction = isSuboptimalHigh ? 'high' : 'low';
    const protocols = PROTOCOLS[rangeKey]?.[direction];
    report.yellow.push({
      ...entry,
      flag: `suboptimal_${direction}`,
      recommendation: protocols ?? { note: 'Within normal range but could be optimized.' },
    });
    continue;
  }

  // Optimal
  report.summary.optimal++;
  report.green.push({
    ...entry,
    flag: 'optimal',
  });
}

console.log(JSON.stringify(report, null, 2));
