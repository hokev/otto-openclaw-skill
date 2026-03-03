# Changelog

All notable changes to Otto Lab will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.4.0] - 2026-03-03

### Added
- Health Auto Export (iCloud Drive) as recommended automated wearable data source
- Step-by-step setup instructions for Health Auto Export iCloud Drive automation
- Health Auto Export v2 JSON schema documentation and metric name mapping table
- iCloud Drive folder scanning in the full analysis flow
- Normalization rules for all Health Auto Export metric types (steps, HR, HRV, sleep, body mass, BP, VO2max, active energy)

### Changed
- "Apple HealthKit" section restructured: healthsync (live), manual exports, and iCloud Drive are now three distinct subsections
- Full analysis flow now checks iCloud Drive folder in addition to reports directory

## [0.3.0] - 2026-03-02

### Added
- Apple HealthKit integration via `healthsync` CLI with guided pairing flow (discover → scan QR → fetch)
- Manual Apple Health export support (CSV/JSON files in reports directory)
- Multi-source data merging: lab values take precedence, HealthKit fills in gaps
- Supplementary lifestyle context (sleep, activity, HRV, VO2max, SpO2) in saved results
- healthsync availability check in `setup.mjs`

### Changed
- SKILL.md restructured: "Parse Lab Report" → "Data Sources" with sub-sections for each source
- Analysis flow updated to scan all available data sources before processing
- README.md updated with Apple HealthKit section

## [0.2.0] - 2026-03-01

### Added
- `setup.mjs` — initialize `~/otto-lab/reports/` and `~/otto-lab/history/` directories
- `save-result.mjs` — persist combined analysis results to history
- `history.mjs` — list saved results, show details, and track biomarker trends over time
- `check-update.mjs` — check for newer versions of `@ottolab/bio-age` and `@ottolab/shared`
- Post-analysis "What's Next" guidance in SKILL.md (priority actions, retest timeline, progress tracking)
- `npm run setup` script in package.json

### Changed
- SKILL.md updated with saving, history, trends, update check, and revised analysis flow
- README.md rewritten with Getting Started, What to Expect, Your Data, and Privacy sections

## [0.1.1] - 2025-12-15

### Fixed
- CRP unit conversion in bio-age.mjs (mg/L to ln(mg/dL))
- KDM algorithm error handling for insufficient markers

## [0.1.0] - 2025-11-01

### Added
- Initial release
- `parse-report.mjs` — extract biomarkers from PDF/CSV lab reports
- `bio-age.mjs` — calculate biological age (PhenoAge, KDM, Metabolic Proxy)
- `recommend.mjs` — generate evidence-based health recommendations
- Reference documents: biomarker ranges, protocol evidence, example output
