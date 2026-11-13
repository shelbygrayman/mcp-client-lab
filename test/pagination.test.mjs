import test from 'node:test';
import assert from 'node:assert/strict';
import { collectToolPages } from '../dist/pagination.js';

const tool = name => ({ name, inputSchema: { type: 'object' } });
test('opaque empty cursor and empty intermediate page preserve every tool', async () => {
  const seen = [];
  const result = await collectToolPages(async cursor => {
    seen.push(cursor);
    if (cursor === undefined) return { tools: [tool('a')], nextCursor: '' };
    if (cursor === '') return { tools: [], nextCursor: 'a /?= opaque' };
    assert.equal(cursor, 'a /?= opaque');
    return { tools: [tool('b')] };
  });
  assert.deepEqual(seen, [undefined, '', 'a /?= opaque']);
  assert.deepEqual(result.map(t => t.name), ['a', 'b']);
});
test('cycles fail promptly without exposing a partial catalog', async () => {
  let requests = 0;
  await assert.rejects(collectToolPages(async () => ({ tools: [], nextCursor: (++requests, '') })), { code: 'CURSOR_CYCLE' });
  assert.equal(requests, 2);
});
test('unique infinite cursors and excessive tools have independent hard limits', async () => {
  let requests = 0;
  await assert.rejects(collectToolPages(async () => ({ tools: [], nextCursor: String(++requests) }), { maxPages: 3 }), { code: 'PAGE_LIMIT' });
  assert.equal(requests, 3);
  await assert.rejects(collectToolPages(async () => ({ tools: [tool('a'), tool('b')] }), { maxTools: 1 }), { code: 'TOOL_LIMIT' });
  assert.equal((await collectToolPages(async () => ({ tools: [tool('a')] }), { maxPages: 1, maxTools: 1 })).length, 1);
});
test('later errors and duplicate names cannot become successful partial results', async () => {
  await assert.rejects(collectToolPages(async cursor => {
    if (cursor === undefined) return { tools: [tool('a')], nextCursor: 'p2' };
    throw new Error('request failed');
  }), /request failed/);
  await assert.rejects(collectToolPages(async cursor => ({ tools: [tool('a')], ...(cursor === undefined ? { nextCursor: 'p2' } : {}) })), { code: 'DUPLICATE_TOOL' });
});
test('invalid callback pages and unsafe limits fail explicitly', async () => {
  for (const page of [null, {}, { tools: [] , nextCursor: null }, { tools: [null] }, { tools: [{ name: '' }] }]) {
    await assert.rejects(collectToolPages(async () => page), { code: 'INVALID_PAGE' });
  }
  for (const maxPages of [0, -1, Infinity, 1.5]) await assert.rejects(collectToolPages(async () => ({ tools: [] }), { maxPages }), RangeError);
});
