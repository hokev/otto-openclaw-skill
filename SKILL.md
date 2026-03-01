---
name: otto-lab
description: >
  Parse blood work lab reports (PDF or text), calculate biological age using
  the Levine PhenoAge and Klemera-Doubal algorithms, and generate evidence-based
  health recommendations. Use when the user mentions blood work, lab results,
  biomarkers, biological age, health optimization, bloodwork analysis, metabolic
  health, lipid panel, CBC, or comprehensive metabolic panel.
version: 0.1.0
user-invocable: true
allowed-tools:
  - bash
  - read
  - write
metadata:
  {
    'openclaw':
      {
        'requires': { 'bins': ['node'] },
        'emoji': "\ud83e\uddec",
        'homepage': 'https://ottolab.com',
        'os': ['darwin', 'linux'],
      },
  }
---

# Otto Lab

AI-powered blood work analysis. Parse lab reports, calculate biological age, and get evidence-based health recommendations.

## Setup

Before first use, install dependencies:

```bash
cd {baseDir}/scripts && npm install
```

## Capabilities

Otto has three core capabilities that can be used independently or chained together:

1. **Parse** - Extract biomarkers from a lab report PDF or text
2. **Bio Age** - Calculate biological age from biomarkers
3. **Recommend** - Generate evidence-based protocols for out-of-range markers

## 1. Parse Lab Report

When the user provides a lab report (PDF file path, pasted text, or typed values):

### If PDF file path is provided:

```bash
node {baseDir}/scripts/parse-report.mjs "<path-to-pdf>"
```

This outputs a JSON object with extracted biomarkers. Save the output for use in subsequent steps.

### If text is pasted or values are typed manually:

Structure the biomarkers as a JSON object following this format. All fields are optional — include only what's available:

```json
{
  "chronologicalAge": 35,
  "gender": "male",
  "albumin": 4.2,
  "creatinine": 0.9,
  "fastingGlucose": 92,
  "hba1c": 5.3,
  "hsCrp": 0.8,
  "lymphocytePercent": 32,
  "mcv": 88,
  "rdw": 13.1,
  "alp": 65,
  "wbc": 6.2,
  "totalCholesterol": 195,
  "ldlC": 110,
  "hdl": 58,
  "triglycerides": 135,
  "apoB": 95,
  "fastingInsulin": 5.2,
  "uricAcid": 5.1,
  "alt": 22,
  "ast": 25,
  "bun": 14,
  "egfr": 105,
  "hemoglobin": 15.2,
  "hematocrit": 44,
  "platelets": 245,
  "vitaminD": 42,
  "testosterone": 650,
  "tsh": 1.8,
  "cortisol": 12
}
```

Units are US conventional: mg/dL, g/dL, %, U/L, ng/mL, etc.

## 2. Calculate Biological Age

Once you have biomarkers (from parsing or manual entry), calculate biological age:

```bash
echo '<biomarkers-json>' | node {baseDir}/scripts/bio-age.mjs
```

Pass the biomarkers JSON via stdin. The script attempts two algorithms:

- **PhenoAge** (Levine 2018) — requires: albumin, creatinine, glucose (converts mg/dL to mmol/L), CRP, lymphocyte%, MCV, RDW, ALP, WBC + chronological age. This is the gold standard.
- **KDM** (Klemera-Doubal) — uses any 3+ of: albumin, creatinine, glucose, CRP, lymphocyte%, MCV, RDW, ALP, WBC, systolic BP, BUN, HbA1c, total cholesterol.
- **Metabolic Proxy** — fallback when CBC is unavailable. Uses glucose, HbA1c, CRP, triglycerides, HDL, LDL, insulin, uric acid.

The script automatically selects the best available algorithm based on which biomarkers are present.

### Presenting Results

Format the biological age results clearly:

- **Biological Age**: The calculated age (e.g., "32.4 years")
- **Delta**: Difference from chronological age. Negative = younger (good). Positive = older (concerning).
- **Algorithm Used**: PhenoAge, KDM, or Metabolic Proxy
- **Top Drivers** (PhenoAge only): Which biomarkers contribute most to aging/protection

Example presentation:

```
Biological Age: 32.4 years (chronological: 35)
You are biologically 2.6 years younger than your calendar age.

Top aging drivers:
  - RDW (+0.42 years) — elevated red cell distribution width
  - Glucose (+0.18 years) — slightly above optimal

Top protective factors:
  - Albumin (-0.31 years) — healthy liver protein
  - Lymphocytes (-0.22 years) — strong immune function
```

## 3. Generate Recommendations

Generate evidence-based health recommendations for out-of-range biomarkers:

```bash
echo '<biomarkers-json>' | node {baseDir}/scripts/recommend.mjs
```

The script evaluates each biomarker against clinical reference ranges and returns prioritized protocols.

### Presenting Recommendations

Group recommendations by priority (red/yellow/green) and category (supplement, diet, exercise, lifestyle, monitoring):

- **Red** (critical): Values significantly outside normal range. Recommend medical consultation.
- **Yellow** (suboptimal): Values outside optimal but within normal range. Lifestyle and supplement interventions.
- **Green** (optimal): No action needed. Affirm what's going well.

For each recommendation include:

- The biomarker and current value vs. target range
- Specific protocol (supplement name + dosage, dietary change, exercise type)
- Evidence level (A/B/C/D) and guideline source
- Expected timeline for improvement

## Full Analysis Flow

When the user asks for a complete blood work analysis, chain all three steps:

1. Parse the report (or accept manual values)
2. Calculate biological age
3. Generate recommendations
4. Present a unified health report with all findings

Always include a disclaimer that this is informational and not medical advice. Recommend discussing findings with a healthcare provider.

## Important Notes

- All computation runs locally on the user's machine. No data is sent to external servers.
- The PhenoAge algorithm is peer-reviewed (Levine, 2018, Aging journal). KDM is based on Klemera & Doubal, 2006.
- Reference ranges are sourced from AHA/ACC, ADA, AACE, and KDIGO clinical guidelines.
- See `references/biomarker-ranges.md` for the full reference range table.
- See `references/protocol-evidence.md` for evidence sources behind recommendations.
- See `references/example-output.md` for an example of a complete formatted report.
