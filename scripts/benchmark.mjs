import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { cpus, totalmem } from 'node:os';
import { runMatrix } from '../dist/matrix.js';

const results = [];
const started = performance.now();
// Fixed expectations are committed before measurement; repeats do not add schema coverage.
const cases = JSON.parse(readFileSync(new URL('../examples/benchmark-cases.json', import.meta.url), 'utf8'));
for (const { name, family, outputSchema, callOutcome } of cases) {
  const text = readFileSync(new URL(`../examples/${name}.json`, import.meta.url), 'utf8');
  for (let repeat = 0; repeat < 3; repeat++) {
    const report = runMatrix(text);
    for (const row of report.rows) {
      const blocked = outputSchema && row.runtime === 'no-codegen' && row.validator === 'default';
      const expected = blocked ? 'discovery:CODEGEN_BLOCKED' : callOutcome;
      const failure = row.steps.find(s => s.status === 'fail');
      const observed = row.status === 'error' ? 'infrastructure-error' : failure ? `${failure.phase}:${failure.code}` : 'pass';
      results.push({ fixture: name, family, fixtureSha256: createHash('sha256').update(text).digest('hex'), repeat: repeat + 1, sdk: row.sdk, runtime: row.runtime, validator: row.validator, expected, observed, agrees: expected === observed, steps: row.steps });
    }
  }
}
const report = {
  version: 2, fixtureCount: cases.length, schemaFamilies: [...new Set(cases.filter(c => c.outputSchema).map(c => c.family))], repeats: 3, cpu: cpus()[0]?.model, memoryBytes: totalmem(), lockfileSha256: createHash('sha256').update(readFileSync(new URL('../package-lock.json', import.meta.url))).digest('hex'), node: process.version, platform: process.platform, arch: process.arch,
  measuredAt: new Date().toISOString(), elapsedMs: Math.round(performance.now() - started),
  total: results.length, agreed: results.filter(r => r.agrees).length,
  scope: 'Thirteen synthetic fixtures across six output-schema families and one control; two pinned TypeScript SDK clients; two Node runtime profiles; two validators; three repeats. Not a desktop-client or production-server benchmark.',
  results
};
mkdirSync('reports', { recursive: true });
writeFileSync('reports/benchmark.json', JSON.stringify(report, null, 2) + '\n');
console.log(`${report.agreed}/${report.total} profile outcomes agree with explicit expectations; ${report.elapsedMs} ms total.`);
process.exitCode = report.agreed === report.total ? 0 : 1;
