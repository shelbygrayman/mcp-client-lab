import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseFixture } from '../dist/fixture.js';
import { runMatrix, markdown } from '../dist/matrix.js';

const fixture = name => readFileSync(new URL(`../examples/${name}.json`, import.meta.url), 'utf8');
const valid = fixture('valid-output');

test('reported code-generation failure and interpreter mitigation across both SDKs', () => {
  const report = runMatrix(valid);
  assert.equal(report.rows.length, 8);
  for (const row of report.rows) {
    if (row.runtime === 'no-codegen' && row.validator === 'default') {
      assert.equal(row.status, 'fail');
      assert.deepEqual(row.steps.at(-1), { phase: 'discovery', status: 'fail', code: 'CODEGEN_BLOCKED' });
      assert.ok(!row.steps.some(s => s.phase === 'call'));
    } else {
      assert.equal(row.status, 'pass');
      assert.deepEqual(row.steps.map(s => s.phase), ['initialize', 'discovery', 'call']);
    }
  }
});

test('bad captured output is rejected by every profile that reaches the call', () => {
  const report = runMatrix(fixture('invalid-output'));
  for (const row of report.rows) {
    assert.equal(row.status, 'fail');
    if (row.runtime === 'no-codegen' && row.validator === 'default') continue;
    assert.deepEqual(row.steps.at(-1), { phase: 'call', call: 0, status: 'fail', code: 'OUTPUT_REJECTED' });
  }
});

test('control without outputSchema is accepted in all eight profiles', () => {
  assert.ok(runMatrix(fixture('no-output-schema')).rows.every(r => r.status === 'pass'));
});

test('every captured call is replayed in order, including calls after rejection', () => {
  const data = JSON.parse(fixture('invalid-output'));
  data.calls.push(JSON.parse(valid).calls[0]);
  const report = runMatrix(JSON.stringify(data));
  for (const row of report.rows.filter(r => !(r.runtime === 'no-codegen' && r.validator === 'default'))) {
    assert.equal(row.steps.at(-2).code, 'OUTPUT_REJECTED');
    assert.deepEqual(row.steps.at(-1), { phase: 'call', call: 1, status: 'pass', code: 'OK' });
  }
});

test('input limits reject invalid JSON, duplicate names, unknown calls and reserved keys', () => {
  for (const input of ['{', 'x'.repeat(1048577), '{"version":1,"__proto__":{}}', '['.repeat(34) + '0' + ']'.repeat(34)]) assert.throws(() => parseFixture(input));
  const data = JSON.parse(valid);
  data.tools.push(data.tools[0]);
  assert.throws(() => parseFixture(JSON.stringify(data)), /unique/);
  data.tools.pop(); data.calls[0].name = 'unknown';
  assert.throws(() => parseFixture(JSON.stringify(data)), /known/);
});

test('reports omit raw tool metadata, input, results and exceptions', () => {
  const data = JSON.parse(valid);
  const sentinel = 'PRIVATE_SENTINEL_DO_NOT_EXPORT';
  data.tools[0].description = sentinel;
  data.calls[0].arguments.text = sentinel;
  data.calls[0].result.structuredContent.text = sentinel;
  data.calls[0].result.content[0].text = sentinel;
  const report = runMatrix(JSON.stringify(data));
  assert.ok(!JSON.stringify(report).includes(sentinel));
  assert.ok(!markdown(report).includes(sentinel));
});

test('CLI provides working demo, CI exit codes and overwrite protection', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mcp-client-lab-'));
  const cli = new URL('../dist/cli.js', import.meta.url).pathname;
  const invoke = args => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  try {
    assert.equal(invoke(['--help']).status, 0);
    assert.equal(invoke(['demo', '--out', join(dir, 'report')]).status, 0);
    assert.ok(existsSync(join(dir, 'report', 'report.json')));
    assert.equal(invoke(['demo', '--out', join(dir, 'report')]).status, 2);
    assert.equal(invoke(['check', '--input', 'examples/valid-output.json']).status, 1);
    assert.equal(invoke(['check', '--input', 'examples/no-output-schema.json']).status, 0);
    assert.equal(invoke(['check', '--input', 'missing-PRIVATE_PATH.json']).status, 2);
    const bad = invoke(['check', '--input', 'missing-PRIVATE_PATH.json']);
    assert.ok(!bad.stderr.includes('PRIVATE_PATH'));
    assert.equal(invoke(['demo', '--out', 'a', '--out', 'b']).status, 2);
    assert.equal(invoke(['demo', '--input', 'examples/valid-output.json']).status, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
