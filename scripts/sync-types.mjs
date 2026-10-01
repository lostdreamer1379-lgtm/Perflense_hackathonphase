// Copies shared/report.ts into worker and web so both sides use the same Report shape.
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('worker/src', { recursive: true });
mkdirSync('web/src/types', { recursive: true });
copyFileSync('shared/report.ts', 'worker/src/report.ts');
copyFileSync('shared/report.ts', 'web/src/types/report.ts');
console.log('Synced shared/report.ts -> worker/src/report.ts, web/src/types/report.ts');
