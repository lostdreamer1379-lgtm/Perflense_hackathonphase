// Analyze one URL without Supabase: npm run analyze -- https://example.com
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildReport } from './buildReport.js';
import { measure } from './lighthouse.js';
import { assertSafeUrl } from './safeUrl.js';

const input = process.argv[2];
if (!input) {
  console.error('Usage: npm run analyze -- https://example.com');
  process.exit(1);
}

const url = await assertSafeUrl(input);
console.log(`Measuring ${url} using local Lighthouse...`);
const { lhr, runScores, engine } = await measure(url);
const report = await buildReport(lhr, { runScores, engine });

mkdirSync('debug', { recursive: true });
writeFileSync('debug/last-lhr.json', JSON.stringify(lhr));
writeFileSync('debug/last-report.json', JSON.stringify(report, null, 2));

console.log(`\nScore: ${report.scores.performance}/100 (${report.status.label})`);
for (const d of report.diagnosis.filter((x) => x.severity !== 'healthy')) {
  console.log(`  [${d.severity}] ${d.title}: ${d.value}`);
}
console.log('\nSaved debug/last-report.json and debug/last-lhr.json');
