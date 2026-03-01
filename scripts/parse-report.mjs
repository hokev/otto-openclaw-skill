#!/usr/bin/env node

/**
 * parse-report.mjs — Extract biomarkers from a lab report PDF or CSV.
 *
 * Usage:
 *   node parse-report.mjs <file-path>        # PDF (placeholder) or CSV
 *
 * CSV files are parsed directly via @otto/extraction.
 * PDF extraction requires an LLM provider (not available in standalone mode).
 */

import { readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { runExtractionPipeline } from '@otto/extraction';

const filePath = process.argv[2];

if (!filePath) {
  console.error(
    JSON.stringify({
      error: 'Usage: node parse-report.mjs <file-path>',
      hint: 'Provide the path to a lab report PDF or CSV file.',
    }),
  );
  process.exit(1);
}

const fullPath = resolve(filePath);

try {
  const buffer = readFileSync(fullPath);

  if (buffer.length === 0) {
    console.error(JSON.stringify({ error: 'Empty file' }));
    process.exit(1);
  }

  if (buffer.length > 10 * 1024 * 1024) {
    console.error(JSON.stringify({ error: 'File too large (max 10MB)' }));
    process.exit(1);
  }

  const ext = extname(fullPath).toLowerCase();

  if (ext === '.csv') {
    // CSV extraction — no LLM needed
    const csvText = buffer.toString('utf-8');
    const result = await runExtractionPipeline({ csv: csvText });
    console.log(JSON.stringify(result, null, 2));
  } else if (ext === '.pdf') {
    // PDF extraction — requires LLM provider
    // For standalone use, output a structured template with instructions
    console.log(
      JSON.stringify(
        {
          status: 'pdf_read',
          fileSize: buffer.length,
          filePath: fullPath,
          message:
            'PDF extraction requires an LLM provider. Use CSV format for standalone parsing, or call via the API for PDF support.',
          template: {
            chronologicalAge: null,
            gender: null,
            albumin: null,
            creatinine: null,
            fastingGlucose: null,
            hba1c: null,
            hsCrp: null,
            lymphocytePercent: null,
            mcv: null,
            rdw: null,
            alp: null,
            wbc: null,
            totalCholesterol: null,
            ldlC: null,
            hdl: null,
            triglycerides: null,
            apoB: null,
            fastingInsulin: null,
            uricAcid: null,
            alt: null,
            ast: null,
            bun: null,
            egfr: null,
            hemoglobin: null,
            hematocrit: null,
            platelets: null,
            vitaminD: null,
            testosterone: null,
            tsh: null,
            cortisol: null,
          },
        },
        null,
        2,
      ),
    );
  } else {
    console.error(JSON.stringify({ error: `Unsupported file type: ${ext}. Use .pdf or .csv` }));
    process.exit(1);
  }
} catch (err) {
  console.error(
    JSON.stringify({
      error: `Failed to process file: ${err.message}`,
    }),
  );
  process.exit(1);
}
