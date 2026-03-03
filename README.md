# Otto Lab — OpenClaw Skill

AI-powered blood work analysis for [OpenClaw](https://openclaw.ai). Parse lab reports, calculate biological age, and get evidence-based health recommendations — all locally on your machine.

## Getting Started

### 1. Install the skill

```bash
clawhub install otto-lab
```

### 2. Install dependencies

```bash
cd ~/.openclaw/skills/otto-lab/scripts && npm install
```

### 3. Initialize directories

```bash
npm run setup
```

This creates `~/otto-lab/reports/` and `~/otto-lab/history/` for storing lab files and analysis history.

### Container / remote environments

If running inside a container or on a remote machine, set `OTTO_LAB_DIR` to a persistent, host-accessible path so your data survives container restarts:

```bash
export OTTO_LAB_DIR=/path/to/persistent/otto-lab
npm run setup
```

All scripts respect this variable. When not set, they default to `~/otto-lab/`.

## Apple HealthKit (Optional)

Otto can pull body composition, vitals, and lifestyle data from Apple Health to complement your lab results. Three options are available — pick whichever fits your setup.

### Option A — Health Auto Export via iCloud Drive (recommended)

[Health Auto Export](https://apps.apple.com/us/app/health-auto-export-json-csv/id1115567069) (App Store, by HealthyApps.dev) syncs Apple Health data to iCloud Drive automatically each day. No Mac app required, works off-network, and runs in the background.

> **Requires:** Health Auto Export Premium tier for automations.

**One-time setup:**

1. Download **Health Auto Export** from the App Store
2. Open the app → **Automated Exports** → **New Automation**
3. Set type: `iCloud Drive`, name: `otto-health`
4. Select metrics: Steps, Heart Rate, Heart Rate Variability, Sleep Analysis, Body Mass, Body Fat %, Blood Pressure, VO2 Max, Resting Heart Rate, Active Energy Burned
5. Set format: `JSON`, period: `Day`, frequency: `Daily`
6. On your Mac: Finder → iCloud Drive → Auto Export → `otto-health` → right-click → **Keep Downloaded**

> Automations only run while your iPhone is unlocked, so files may be a few hours delayed — this is normal.

Once files are synced, just ask OpenClaw to include your HealthKit data. It will scan the iCloud Drive folder automatically.

---

### Option B — healthsync live sync

`healthsync` streams data directly from your iPhone to your Mac over Wi-Fi. More real-time than iCloud Drive, but requires a companion iOS app built from source.

**Requirements:**

- **macOS CLI** — install via Homebrew:
  ```bash
  brew tap mneves75/tap && brew install healthsync
  ```
  Or download binaries from [GitHub Releases](https://github.com/mneves75/ai-health-sync-ios/releases).

- **HealthSync Helper App (iOS)** — not on the App Store; must be built from source with Xcode 26+ targeting iOS 26+:
  [github.com/mneves75/ai-health-sync-ios](https://github.com/mneves75/ai-health-sync-ios)

**Pair your devices (one-time, both on the same Wi-Fi):**

1. On iPhone: open HealthSync Helper App → **Start Server** → **Show QR Code**
2. On Mac: run `healthsync scan`
   (or `healthsync scan --file ~/Desktop/qr.png` if using a saved QR image)
3. Verify: `healthsync status`

**Fetch data:**

```bash
healthsync fetch \
  --start 2025-02-01T00:00:00Z \
  --end   2025-03-01T23:59:59Z \
  --types weight,height,bodyMassIndex,bodyFatPercentage,heartRate,restingHeartRate,\
heartRateVariability,bloodPressureSystolic,bloodPressureDiastolic,vo2Max,\
steps,activeEnergyBurned,sleepAnalysis \
  --format json \
  > ~/otto-lab/reports/healthkit-2025-03-01.json
```

Once saved to the reports directory, ask OpenClaw to include HealthKit data in your next analysis.

---

### Option C — Manual export from the Health app

No extra tools needed.

1. On iPhone: open **Health** → tap your profile photo (top right) → **Export All Health Data** → **Export**
2. AirDrop or transfer the `.zip` to your Mac and unzip it
3. Place any CSV or JSON files into `~/otto-lab/reports/`
4. Ask OpenClaw to analyze your health data — it will read the exported files automatically

> For more targeted exports (specific metrics, date ranges), use the iOS **Shortcuts** app to export individual Health categories as CSV.

## What to Expect

Otto Lab runs a 3-step analysis when you share blood work:

1. **Parse** — Reads your lab report PDF or CSV and extracts biomarker values
2. **Bio Age** — Calculates your biological age using peer-reviewed algorithms (PhenoAge, KDM)
3. **Recommend** — Generates evidence-based protocols for out-of-range markers, grouped by priority

After the analysis, Otto saves the result and presents next steps: priority actions, retest timeline, and a reminder to share findings with your doctor.

### How to provide your lab report

Place your lab report PDF or CSV in the reports directory:

```
~/otto-lab/reports/        # default location
$OTTO_LAB_DIR/reports/     # if OTTO_LAB_DIR is set
```

Then ask OpenClaw to analyze it. It will find the file, read the PDF, extract biomarkers, and run the full analysis pipeline.

## Your Data

All analysis results are saved locally:

```
~/otto-lab/                # or $OTTO_LAB_DIR
├── reports/               # Lab report PDFs/CSVs and HealthKit data
└── history/               # Saved analysis results (one JSON per analysis)
```

View past results and track biomarker trends:

```bash
cd ~/.openclaw/skills/otto-lab/scripts
node history.mjs list              # See all saved analyses
node history.mjs trend ldlC        # Track LDL-C over time
```

## Staying Updated

Check if newer algorithm packages are available:

```bash
cd ~/.openclaw/skills/otto-lab/scripts
node check-update.mjs
```

If updates are available, it provides the command to run.

## Privacy

All computation runs locally on your machine. No data is sent to external servers. Your lab results never leave your computer.

## Algorithms

- **PhenoAge** (Levine et al., 2018) — 9 clinical biomarkers + age, validated against NHANES III mortality data
- **KDM** (Klemera & Doubal, 2006) — Multi-biomarker regression, requires 3+ markers
- **Metabolic Proxy** — Fallback when full CBC panel is unavailable

## License

MIT
