---
name: otto-lab
description: >
  Parse blood work lab reports (PDF or text), calculate biological age using
  the Levine PhenoAge and Klemera-Doubal algorithms, and generate evidence-based
  health recommendations. Use when the user mentions blood work, lab results,
  biomarkers, biological age, health optimization, bloodwork analysis, metabolic
  health, lipid panel, CBC, or comprehensive metabolic panel.
version: 0.2.0
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

Before first use, install dependencies and initialize directories:

```bash
cd {baseDir}/scripts && npm install && npm run setup
```

The setup script creates `~/otto-lab/reports/` (for lab report files) and `~/otto-lab/history/` (for saved analysis results). It is idempotent — safe to re-run.

### Container / remote environments

If running inside a container or remote machine where `~` is not the user's real home directory, set `OTTO_LAB_DIR` to a persistent, host-accessible path before running any script:

```bash
export OTTO_LAB_DIR=/path/to/persistent/otto-lab
```

All scripts (`setup.mjs`, `save-result.mjs`, `history.mjs`) respect this variable. When not set, they default to `~/otto-lab/`.

**Important — file access in containers:** When running in a containerized environment, you cannot access the user's host filesystem (e.g., `/Users/.../Documents/`). Do NOT suggest dragging and dropping files or providing host file paths — these will not work. Instead:

1. Tell the user to place their lab report PDF or CSV into the reports directory on the host machine. The reports directory path is the `reports/` subfolder inside `OTTO_LAB_DIR` (or `~/otto-lab/reports/` if not set).
2. List available reports to confirm the file is visible: `ls "$OTTO_LAB_DIR/reports/"` (or `ls ~/otto-lab/reports/`).
3. Parse by filename: `node {baseDir}/scripts/parse-report.mjs "$OTTO_LAB_DIR/reports/<filename>"`

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

Pass the biomarkers JSON via stdin. The script attempts three algorithms:

- **PhenoAge** (Levine 2018) — requires: albumin, creatinine, glucose, CRP, lymphocyte%, MCV, RDW, ALP, WBC + chronological age. Gold standard.
- **KDM** (Klemera-Doubal) — uses any 3+ of: albumin, creatinine, glucose, CRP, lymphocyte%, MCV, RDW, ALP, WBC, systolic BP, BUN, HbA1c, total cholesterol.
- **Metabolic Proxy** — fallback when CBC is unavailable.

The script automatically selects the best available algorithm.

### Presenting Results

- **Biological Age**: The calculated age (e.g., "32.4 years")
- **Delta**: Difference from chronological age. Negative = younger (good). Positive = older (concerning).
- **Algorithm Used**: PhenoAge, KDM, or Metabolic Proxy
- **Top Drivers** (PhenoAge only): Which biomarkers contribute most to aging/protection

## 3. Generate Recommendations

```bash
echo '<biomarkers-json>' | node {baseDir}/scripts/recommend.mjs
```

The script evaluates each biomarker against clinical reference ranges and returns prioritized protocols.

### Presenting Recommendations

Group by priority: **Red** (critical — recommend medical consultation), **Yellow** (suboptimal — lifestyle/supplement interventions), **Green** (optimal — affirm what's going well).

For each recommendation include the biomarker value vs. target range, specific protocol with dosage, evidence level (A/B/C/D), and expected timeline.

## 4. Saving Results

After completing an analysis, save the combined result for future tracking. Build a JSON object with the following structure and pipe it to `save-result.mjs`:

```bash
echo '<combined-json>' | node {baseDir}/scripts/save-result.mjs
```

The combined JSON should include:

```json
{
  "source": { "type": "pdf", "filePath": "/path/to/report.pdf" },
  "biomarkers": { "ldlC": 110, "hdl": 58, "..." : "..." },
  "bioAge": { "algorithm": "PhenoAge", "biologicalAge": 32.4, "delta": -2.6 },
  "recommendations": { "red": [], "yellow": [], "green": [] }
}
```

The script writes to `~/otto-lab/history/YYYY-MM-DD-HHmmss.json` with version and timestamp stamps. Always save after a full analysis so the user can track progress over time.

## 5. History & Trends

View saved results and track biomarker trends:

```bash
# List all saved results (dates, bio age, red/yellow/green counts)
node {baseDir}/scripts/history.mjs list

# Show a specific saved result
node {baseDir}/scripts/history.mjs show <filename>

# Track a biomarker across all results (e.g., ldlC, hba1c, fastingGlucose)
node {baseDir}/scripts/history.mjs trend <marker>
```

The `trend` command reports the direction of change (improving, worsening, or stable) based on clinical reference ranges from `@ottolab/shared`.

## Full Analysis Flow

When the user asks for a complete blood work analysis, chain all steps:

1. Parse the report (or accept manual values)
2. Calculate biological age
3. Generate recommendations
4. Save the combined result with `save-result.mjs`
5. Present the unified health report, then offer **What's Next**

### What's Next (post-analysis)

After presenting the report, always offer these next steps:

- **Priority actions**: Highlight the top 2-3 protocols from the red/yellow categories
- **Retest timeline**: Suggest when to retest based on intervention timelines (typically 3-6 months)
- **Track progress**: Mention they can review past results with `history.mjs list` and track specific markers with `history.mjs trend <marker>`
- **Share with doctor**: Remind them to discuss findings with their healthcare provider

Always include a disclaimer that this is informational and not medical advice.

## Check for Updates

```bash
node {baseDir}/scripts/check-update.mjs
```

Reports installed vs. latest versions of `@ottolab/bio-age` and `@ottolab/shared`. If outdated, it provides the update command. Run this periodically or when the user asks about updates.

## Important Notes

- All computation runs locally. No data is sent to external servers.
- PhenoAge: Levine et al., 2018, Aging. KDM: Klemera & Doubal, 2006.
- Reference ranges: AHA/ACC, ADA, AACE, KDIGO guidelines.
- See `references/` for biomarker ranges, protocol evidence, and example output.
