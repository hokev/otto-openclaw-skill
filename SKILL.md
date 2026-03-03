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

1. **Parse** - Extract biomarkers from lab reports, HealthKit, or manual entry
2. **Bio Age** - Calculate biological age from biomarkers
3. **Recommend** - Generate evidence-based protocols for out-of-range markers

## 1. Data Sources

All data sources follow one pattern: get raw data into the reports directory, read it, normalize into canonical biomarker JSON, then run the analysis pipeline (bio-age, recommend, save).

### Canonical Biomarker Format

All sources normalize into this JSON format. All fields are optional — include only what's available:

```json
{
  "chronologicalAge": 35,
  "gender": "male",
  "weight": 75.2, "height": 178, "bmi": 23.7, "bodyFatPercent": 18.5,
  "heartRate": 62, "systolicBP": 118, "diastolicBP": 76,
  "albumin": 4.2, "creatinine": 0.9, "fastingGlucose": 92,
  "hba1c": 5.3, "hsCrp": 0.8,
  "lymphocytePercent": 32, "mcv": 88, "rdw": 13.1,
  "alp": 65, "wbc": 6.2,
  "totalCholesterol": 195, "ldlC": 110, "hdl": 58,
  "triglycerides": 135, "apoB": 95,
  "fastingInsulin": 5.2, "uricAcid": 5.1,
  "alt": 22, "ast": 25, "bun": 14, "egfr": 105,
  "hemoglobin": 15.2, "hematocrit": 44, "platelets": 245,
  "vitaminD": 42, "testosterone": 650, "tsh": 1.8, "cortisol": 12
}
```

Units are US conventional: mg/dL, g/dL, %, U/L, ng/mL, etc. Weight in kg, height in cm.

### Lab Reports (PDF/CSV)

When the user provides a lab report (PDF file path, pasted text, or typed values):

**If a PDF or CSV file path is provided:**

Run `parse-report.mjs` to extract text from the file:

```bash
node {baseDir}/scripts/parse-report.mjs "<path-to-file>"
```

For PDFs, this outputs `{ "status": "pdf_extracted", "text": "..." }` with the raw text content. You must then read the extracted text and identify all biomarker values, structuring them as the canonical JSON above. You are the LLM — do the extraction yourself from the text. Do NOT ask the user to type out values manually.

For CSVs, the script outputs structured biomarker JSON directly.

**If text is pasted or values are typed manually:**

Structure the biomarkers as a JSON object following the canonical format above.

### Apple HealthKit (Optional)

Otto can integrate HealthKit data via the `healthsync` CLI, or read Apple Health exports placed in the reports directory. **Never fabricate URLs, installation commands, or app names beyond what is documented here.**

#### Live sync via healthsync

healthsync has two components — both are required:

1. **macOS CLI** — `brew tap mneves75/tap && brew install healthsync`, or download binaries from https://github.com/mneves75/ai-health-sync-ios/releases
2. **HealthSync Helper App (iOS)** — not on the App Store. Must be built from source (Xcode 26+, iOS 26+): https://github.com/mneves75/ai-health-sync-ios

Check if CLI is installed: `which healthsync`. If not installed, offer to explain the setup or fall back to manual exports.

**Pairing (one-time)** — both devices must be on the same Wi-Fi network:

1. On iPhone: open HealthSync Helper App → "Start Server" → "Show QR Code"
2. On Mac: `healthsync scan` (reads QR via Universal Clipboard, or `healthsync scan --file ~/Desktop/qr.png`)
3. Verify: `healthsync status`

**Fetching data** — once paired:

```bash
healthsync fetch \
  --start <30-days-ago>T00:00:00Z --end <today>T23:59:59Z \
  --types weight,height,bodyMassIndex,bodyFatPercentage,heartRate,restingHeartRate,heartRateVariability,bloodPressureSystolic,bloodPressureDiastolic,bloodOxygen,vo2Max,steps,activeEnergyBurned,sleepAnalysis \
  --format json > "${OTTO_LAB_DIR:-~/otto-lab}/reports/healthkit-$(date +%Y-%m-%d).json"
```

Replace date placeholders with actual ISO 8601 dates. Available types: steps, heartRate, restingHeartRate, heartRateVariability, bloodPressureSystolic, bloodPressureDiastolic, bloodOxygen, vo2Max, weight, height, bodyMassIndex, bodyFatPercentage, sleepAnalysis, sleepREM, sleepCore, sleepDeep, activeEnergyBurned, exerciseTime, workouts.

#### Manual Apple Health exports

If healthsync is not available, users can export from the Apple Health app or iOS Shortcuts and place CSV/JSON files in the reports directory.

#### Health Auto Export — iCloud Drive (recommended automated path)

[Health Auto Export](https://apps.apple.com/us/app/health-auto-export-json-csv/id1115567069) (App Store, by HealthyApps.dev) automatically syncs Apple Health data to iCloud Drive daily. This is the preferred no-friction integration — no Mac app required, works off-network, runs daily in the background.

**Prerequisites:** Premium tier required for automations.

**One-time setup:**
1. Download **Health Auto Export** from the App Store
2. Open app → **Automated Exports** → **New Automation**
3. Type: `iCloud Drive` | Name: `otto-health`
4. Metrics: Steps, Heart Rate, Heart Rate Variability, Sleep Analysis, Body Mass, Body Fat %, Blood Pressure, VO2 Max, Resting Heart Rate, Active Energy Burned
5. Format: `JSON` | Period: `Day` | Frequency: `Daily`
6. On Mac: Finder → iCloud Drive → Auto Export → `otto-health` → right-click → **Keep Downloaded**

> Automations only run while iPhone is unlocked. Files may be a few hours delayed — this is normal.

**Reading files:**

```bash
ls ~/Library/Mobile\ Documents/com~apple~CloudDocs/Auto\ Export/otto-health/
```

Files are named by date (`2025-03-01.json`). Each file uses the Health Auto Export v2 JSON schema:

```json
{
  "data": {
    "metrics": [
      {
        "name": "step_count",
        "units": "count",
        "data": [{ "date": "2025-03-01 00:00:00 +0000", "qty": 9842 }]
      },
      {
        "name": "heart_rate",
        "units": "count/min",
        "data": [{ "date": "2025-03-01 08:12:00 +0000", "Avg": 64, "Min": 52, "Max": 88 }]
      }
    ]
  }
}
```

Normalize Health Auto Export files using the same rules as HealthKit data below. Additional metric name mappings:
- `step_count` → `supplementary.activity.avgDailySteps` (sum of `qty` across entries)
- `heart_rate` → `heartRate` (median of `Avg` values)
- `resting_heart_rate` → `supplementary.restingHeartRate.avg` (`qty`)
- `heart_rate_variability_sdnn` → `supplementary.hrv.avg` (`qty`, in ms)
- `body_mass` → `weight` (most recent `qty`, in kg)
- `body_fat_percentage` → `bodyFatPercent` (most recent `qty`; multiply by 100 if ≤ 1)
- `blood_pressure_systolic` → `systolicBP` (most recent `qty`)
- `blood_pressure_diastolic` → `diastolicBP` (most recent `qty`)
- `vo2_max` → `supplementary.vo2max.value` (`qty`)
- `sleep_analysis` (asleep entries) → `supplementary.sleep.avgHoursPerNight` (sum durations ÷ 60)
- `active_energy_burned` → `supplementary.activity.avgActiveCalories` (sum of `qty`)

When scanning for available data, check the iCloud Drive folder in addition to the reports directory:

```bash
ls ~/Library/Mobile\ Documents/com~apple~CloudDocs/Auto\ Export/otto-health/ 2>/dev/null
```

If files are found, read the most recent one (or last 7 days for supplementary averages).

#### Normalizing HealthKit data

Read the saved file and normalize into canonical biomarker format:

- **Body metrics:** weight (kg), height (cm), bodyMassIndex → `bmi`, bodyFatPercentage → `bodyFatPercent` (if ≤ 1, multiply by 100)
- **Vitals:** heartRate → `heartRate` (median of recent readings), bloodPressureSystolic → `systolicBP`, bloodPressureDiastolic → `diastolicBP` (pair by closest timestamp)
- **Supplementary context** (separate from biomarkers — see Presenting Supplementary Data): aggregate sleep, steps, active energy, HRV, resting HR, VO2max, SpO2 as 7-day averages

All values should use the same canonical keys and US conventional units as lab biomarkers.

### Combining Multiple Sources

When multiple data sources are available, merge into one canonical biomarker object:

- Lab values take precedence for any overlapping keys (lab measurements are more precise)
- HealthKit fills in body composition and vitals that labs don't typically measure
- Supplementary context from any source goes in a separate `"supplementary"` object alongside biomarkers

The user should see ONE unified health profile. Never show source-specific labels or raw data labels — always use friendly names (e.g., "Heart Rate" not "heartRate" or "HKQuantityTypeIdentifierHeartRate").

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

When the user asks for a health analysis, chain all steps:

1. Scan the reports directory for available data (lab PDFs/CSVs, HealthKit JSON/CSV)
2. If `healthsync` is available and paired, offer to fetch fresh HealthKit data
3. For each source: extract/read raw data, normalize to canonical biomarker format
4. Merge all sources into one biomarker object (lab values take precedence on overlap)
5. Calculate biological age
6. Generate recommendations
7. Save the combined result with `save-result.mjs` (include `supplementary` if available)
8. Present the unified health report with Lifestyle Context section (if supplementary data exists), then offer **What's Next**

### Presenting Supplementary Data

When HealthKit or other sources provide supplementary context (sleep, activity, HRV, etc.), present it as a **Lifestyle Context** section in the report. This data enriches recommendations — for example, elevated CRP combined with poor sleep quality suggests prioritizing sleep optimization.

Supplementary data should be included in the saved result as a `"supplementary"` object:

```json
{
  "supplementary": {
    "sleep": { "avgHoursPerNight": 7.2, "days": 7 },
    "activity": { "avgDailySteps": 8500 },
    "hrv": { "avg": 45, "unit": "ms" },
    "restingHeartRate": { "avg": 58, "unit": "bpm" },
    "vo2max": { "value": 42.5, "unit": "mL/kg/min" },
    "spo2": { "avg": 97.8, "unit": "%" }
  }
}
```

Never present raw HealthKit type identifiers or source-specific labels to the user.

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
