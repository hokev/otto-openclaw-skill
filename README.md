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

## What to Expect

Otto Lab runs a 3-step analysis when you share blood work:

1. **Parse** — Extracts biomarkers from a PDF, CSV, or pasted values
2. **Bio Age** — Calculates your biological age using peer-reviewed algorithms (PhenoAge, KDM)
3. **Recommend** — Generates evidence-based protocols for out-of-range markers, grouped by priority

After the analysis, Otto saves the result and presents next steps: priority actions, retest timeline, and a reminder to share findings with your doctor.

### Example conversation

> **You:** Analyze my blood work — here are my latest results: LDL 145, HDL 52, triglycerides 180, HbA1c 5.8, fasting glucose 102, CRP 2.1, vitamin D 22. I'm 38.
>
> **OpenClaw:** Runs the analysis pipeline, calculates bio age, flags LDL and vitamin D as suboptimal, and presents a prioritized action plan with supplement dosages and timelines.

## Your Data

All analysis results are saved locally:

```
~/otto-lab/
├── reports/     # Place lab report PDFs/CSVs here
└── history/     # Saved analysis results (one JSON per analysis)
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
