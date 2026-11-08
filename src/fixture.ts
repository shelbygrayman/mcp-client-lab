export type RecordValue = Record<string, unknown>;
export interface Fixture {
  version: 1;
  tools: RecordValue[];
  calls: { name: string; arguments: RecordValue; result: RecordValue }[];
}
export const isObject = (v: unknown): v is RecordValue => v !== null && typeof v === 'object' && !Array.isArray(v);
export const MAX_BYTES = 1024 * 1024;
export function parseFixture(text: string): Fixture {
  if (Buffer.byteLength(text) > MAX_BYTES) throw new Error('Fixture exceeds 1 MiB.');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('Fixture is not valid JSON.'); }
  let nodes = 0;
  function bound(v: unknown, depth = 0): void {
    if (++nodes > 20000 || depth > 32) throw new Error('Fixture exceeds structural limits.');
    if (v && typeof v === 'object') for (const [key, child] of Object.entries(v)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Reserved fixture key.');
      bound(child, depth + 1);
    }
  }
  bound(value);
  if (!isObject(value) || value.version !== 1 || !Array.isArray(value.tools) || value.tools.length < 1 || value.tools.length > 50) {
    throw new Error('Expected version 1 and 1–50 tools.');
  }
  const names = new Set<string>();
  for (const tool of value.tools) {
    if (!isObject(tool) || typeof tool.name !== 'string' || !/^[A-Za-z0-9_.-]{1,128}$/.test(tool.name) || names.has(tool.name) || !isObject(tool.inputSchema)) {
      throw new Error('Tools need unique names and object inputSchema fields.');
    }
    names.add(tool.name);
    if (tool.outputSchema !== undefined && !isObject(tool.outputSchema)) throw new Error('outputSchema must be an object.');
  }
  const calls = value.calls ?? [];
  if (!Array.isArray(calls) || calls.length > 50) throw new Error('Expected at most 50 captured calls.');
  for (const call of calls) {
    if (!isObject(call) || typeof call.name !== 'string' || !names.has(call.name) || !isObject(call.arguments) || !isObject(call.result)) {
      throw new Error('Calls need a known tool name, arguments object and captured result object.');
    }
  }
  return { version: 1, tools: value.tools, calls } as Fixture;
}
