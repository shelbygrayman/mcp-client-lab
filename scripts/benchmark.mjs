import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { runMatrix } from '../dist/matrix.js';

const results = [];
const started = performance.now();
for (const name of ['valid-output', 'invalid-output', 'no-output-schema']) {
  const text = readFileSync(new URL(`../examples/${name}.json`, import.meta.url), 'utf8');
  for (let repeat = 0; repeat < 3; repeat++) {
    const report = runMatrix(text);
    for (const row of report.rows) {
      const blocked = name !== 'no-output-schema' && row.runtime === 'no-codegen' && row.validator === 'default';
      const expected = blocked ? 'discovery:CODEGEN_BLOCKED' : name === 'invalid-output' ? 'call:OUTPUT_REJECTED' : 'pass';
      const failure = row.steps.find(s => s.status === 'fail');
      const observed = row.status === 'error' ? 'infrastructure-error' : failure ? `${failure.phase}:${failure.code}` : 'pass';
      results.push({ fixture: name, repeat: repeat + 1, sdk: row.sdk, runtime: row.runtime, validator: row.validator, expected, observed, agrees: expected === observed, steps: row.steps });
    }
  }
}
const report = {
  version: 1, node: process.version, platform: process.platform, arch: process.arch,
  measuredAt: new Date().toISOString(), elapsedMs: Math.round(performance.now() - started),
  total: results.length, agreed: results.filter(r => r.agrees).length,
  scope: 'Three synthetic fixtures; two pinned TypeScript SDK clients; two Node runtime profiles; two validators; three repeats. Not a desktop-client or production-server benchmark.',
  results
};
mkdirSync('reports', { recursive: true });
writeFileSync('reports/benchmark.json', JSON.stringify(report, null, 2) + '\n');
console.log(`${report.agreed}/${report.total} profile outcomes agree with explicit expectations; ${report.elapsedMs} ms total.`);
process.exitCode = report.agreed === report.total ? 0 : 1;
