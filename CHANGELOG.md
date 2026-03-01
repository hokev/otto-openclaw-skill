# Changelog

All notable changes to Otto Lab will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
