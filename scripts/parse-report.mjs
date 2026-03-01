#!/usr/bin/env node

/**
 * parse-report.mjs — Extract text/biomarkers from a lab report PDF or CSV.
 *
 * Usage:
 *   node parse-report.mjs <file-path>
 *
 * PDF: Extracts text using pdf-parse (pure JS, no system dependencies).
 *      Outputs the raw text for Claude to parse biomarker values from.
 * CSV: Parsed directly via @ottolab/extraction.
 */

import { readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';

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
    const { runExtractionPipeline } = await import('@ottolab/extraction');
    const csvText = buffer.toString('utf-8');
    const result = await runExtractionPipeline({ csv: csvText });
    console.log(JSON.stringify(result, null, 2));
  } else if (ext === '.pdf') {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    await parser.load();
    const result = await parser.getText();
    console.log(
      JSON.stringify(
        {
          status: 'pdf_extracted',
          filePath: fullPath,
          pages: result.total,
          text: result.text,
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
