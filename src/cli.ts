#!/usr/bin/env node
import { mkdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_BYTES } from './fixture.js';
import { runMatrix, markdown, type Selection } from './matrix.js';

const help = `MCP Client Lab — replay captured tools through pinned SDK clients

  mcp-client-lab demo [--out NEW_DIRECTORY]
  mcp-client-lab check --input FIXTURE.json [--out NEW_DIRECTORY]
    [--sdk 1.26.0|1.32.2] [--runtime node|no-codegen]
    [--validator default|cfworker]

check defaults to all eight profiles. Each filter selects one value;
filters intersect. Omitted profiles are untested. demo always runs all eight.

check exits 0 when every selected profile accepts the fixture, 1 for an SDK rejection,
2 for invalid input or a worker/output error. demo verifies the known failure
and mitigation pattern, exiting 0 only when that pattern is observed.

No live servers are connected and no tool implementation is executed.
Fixtures are data, not a sandbox for executing third-party server code.
Reports omit raw schemas, arguments, results and SDK exception messages.
`;
function main(): void {
  const [command, ...args] = process.argv.slice(2);
  if (!command || ['--help', '-h'].includes(command)) { process.stdout.write(help); return; }
  if (!['demo', 'check'].includes(command)) throw new Error('Unknown command. Use --help.');
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i], value = args[i + 1];
    if (!key || !['--input', '--out', '--sdk', '--runtime', '--validator'].includes(key) || !value || value.startsWith('--') || flags.has(key)) throw new Error('Invalid or duplicate option. Use --help.');
    flags.set(key, value);
  }
  if (command === 'demo' && flags.has('--input')) throw new Error('demo uses the included fixture. Use check for your own input.');
  const profileFlags = ['--sdk', '--runtime', '--validator'];
  if (command === 'demo' && profileFlags.some(key => flags.has(key))) throw new Error('demo always runs all eight profiles.');
  const selection: Selection = {};
  if (flags.has('--sdk')) selection.sdk = flags.get('--sdk') as Selection['sdk'];
  if (flags.has('--runtime')) selection.runtime = flags.get('--runtime') as Selection['runtime'];
  if (flags.has('--validator')) selection.validator = flags.get('--validator') as Selection['validator'];
  const input = command === 'demo' ? fileURLToPath(new URL('../examples/valid-output.json', import.meta.url)) : flags.get('--input');
  if (!input) throw new Error('check requires --input.');
  if (!statSync(input).isFile() || statSync(input).size > MAX_BYTES) throw new Error('Expected a regular fixture file of at most 1 MiB.');
  const out = flags.get('--out');
  if (out && existsSync(resolve(out))) throw new Error('Output directory already exists. Choose a new directory.');
  const report = runMatrix(readFileSync(input, 'utf8'), selection);
  const md = markdown(report);
  if (out) {
    const dir = resolve(out);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    writeFileSync(join(dir, 'report.md'), md, { flag: 'wx', mode: 0o600 });
  }
  process.stdout.write(md);
  if (report.rows.some(r => r.status === 'error')) { process.exitCode = 2; return; }
  if (command === 'demo') {
    const expected = report.rows.every(r => r.runtime === 'no-codegen' && r.validator === 'default'
      ? r.status === 'fail' && r.steps.some(s => s.phase === 'discovery' && s.code === 'CODEGEN_BLOCKED')
      : r.status === 'pass');
    process.stdout.write(`\nKnown failure and mitigation: ${expected ? 'REPRODUCED' : 'UNEXPECTED RESULT'}\n`);
    process.exitCode = expected ? 0 : 1;
  } else process.exitCode = report.rows.some(r => r.status === 'fail') ? 1 : 0;
}
try { main(); } catch {
  // Filesystem and parser errors can embed user paths or input; keep diagnostics generic.
  process.stderr.write('Input or output error. Check --help, fixture format, file limits and use a new output directory.\n');
  process.exitCode = 2;
}
