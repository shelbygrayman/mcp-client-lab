import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseFixture } from './fixture.js';

export interface Step { phase: string; call?: number; status: 'pass' | 'fail'; code: string }
export interface Row {
  sdk: string; runtime: 'node' | 'no-codegen'; validator: 'default' | 'cfworker';
  status: 'pass' | 'fail' | 'error'; steps: Step[];
}
export interface Report {
  version: 1; node: string; transport: 'in-memory'; toolCount: number; callCount: number;
  rows: Row[];
}
export function runMatrix(text: string): Report {
  const fixture = parseFixture(text);
  const worker = fileURLToPath(new URL('./worker.js', import.meta.url));
  const rows: Row[] = [];
  for (const [alias, sdk] of [['sdk-1-26', '1.26.0'], ['sdk-1-32', '1.32.2']] as const) {
    for (const runtime of ['node', 'no-codegen'] as const) {
      for (const validator of ['default', 'cfworker'] as const) {
        const args = [...(runtime === 'no-codegen' ? ['--disallow-code-generation-from-strings'] : []), worker, alias, validator];
        const child = spawnSync(process.execPath, args, {
          input: JSON.stringify(fixture), encoding: 'utf8', timeout: 10000, maxBuffer: 1048576,
          // No credentials, NODE_OPTIONS, preload hooks or parent app configuration.
          env: { PATH: process.env.PATH ?? '', SYSTEMROOT: process.env.SYSTEMROOT ?? '' }
        });
        let steps: Step[] = [];
        let status: Row['status'] = 'error';
        if (!child.error && child.status === 0) {
          try {
            const result = JSON.parse(child.stdout);
            if (!Array.isArray(result.steps) || result.steps.length < 2 || !result.steps.every((s: Step) => ['pass', 'fail'].includes(s.status))) throw new Error();
            steps = result.steps;
            status = steps.some(s => s.status === 'fail') ? 'fail' : 'pass';
          } catch { /* Invalid worker protocol is an infrastructure error. */ }
        }
        if (status === 'error') steps = [{ phase: 'worker', status: 'fail', code: (child.error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT' ? 'TIMEOUT' : 'WORKER_ERROR' }];
        rows.push({ sdk, runtime, validator, status, steps });
      }
    }
  }
  return { version: 1, node: process.version, transport: 'in-memory', toolCount: fixture.tools.length, callCount: fixture.calls.length, rows };
}
export function markdown(report: Report): string {
  const lines = ['# MCP Client Lab', '', `Node ${report.node}; in-memory transport; ${report.toolCount} tools; ${report.callCount} captured calls.`, '',
    '| SDK | Node profile | Validator | Result | Evidence |', '|---|---|---|---|---|'];
  for (const row of report.rows) {
    const failures = row.steps.filter(s => s.status === 'fail').map(s => `${s.phase}${s.call === undefined ? '' : `[${s.call}]`}: ${s.code}`);
    lines.push(`| ${row.sdk} | ${row.runtime} | ${row.validator} | ${row.status.toUpperCase()} | ${failures.join('; ') || 'Discovery and all supplied calls accepted'} |`);
  }
  lines.push('', 'A failed call may be correct rejection of invalid captured output. PASS means acceptance of this fixture, not proof of compatibility.', '',
    'The no-codegen profile is Node with runtime string code generation disabled. It is not a Cloudflare Workers, browser, Cursor or Claude Desktop test.', '',
    'Reports omit tool names, schemas, arguments, results, file paths and raw SDK errors. Input fixtures can contain secrets; share synthetic fixtures only.', '');
  return lines.join('\n');
}
