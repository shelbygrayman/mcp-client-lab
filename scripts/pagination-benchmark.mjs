import { collectToolPages, PaginationError } from '../dist/pagination.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const tool = name => ({ name, inputSchema: { type: 'object', properties: {} } });
// Expectations are fixed independently of the collector; finite invalid servers test fail-closed behavior.
const cases = [
  { name: 'single-page', pages: [{ tools: [tool('a')] }], expected: ['COMPLETE', 'COMPLETE', 'COMPLETE'] },
  { name: 'two-pages', pages: [{ tools: [tool('a')], nextCursor: 'opaque /?= token' }, { tools: [tool('b')] }], expected: ['PARTIAL', 'COMPLETE', 'COMPLETE'] },
  { name: 'empty-cursor', pages: [{ tools: [tool('a')], nextCursor: '' }, { tools: [tool('b')] }], expected: ['PARTIAL', 'PARTIAL', 'COMPLETE'] },
  { name: 'empty-middle-page', pages: [{ tools: [tool('a')], nextCursor: 'p2' }, { tools: [], nextCursor: 'p3' }, { tools: [tool('b')] }], expected: ['PARTIAL', 'COMPLETE', 'COMPLETE'] },
  { name: 'cursor-cycle', pages: [{ tools: [tool('a')], nextCursor: 'loop' }, { tools: [], nextCursor: 'loop' }], expected: ['PARTIAL', 'REQUEST_BUDGET', 'CURSOR_CYCLE'] },
  { name: 'page-limit', pages: Array.from({ length: 5 }, (_, i) => ({ tools: [tool(`t${i}`)], nextCursor: `p${i + 1}` })), expected: ['PARTIAL', 'REQUEST_BUDGET', 'PAGE_LIMIT'] },
  { name: 'duplicate-tool', pages: [{ tools: [tool('a')], nextCursor: 'p2' }, { tools: [tool('a')] }], expected: ['PARTIAL', 'DUPLICATE_CATALOG', 'DUPLICATE_TOOL'] },
  { name: 'later-page-error', pages: [{ tools: [tool('a')], nextCursor: 'p2' }, { error: true }], expected: ['PARTIAL', 'SDK_REJECTED', 'SDK_REJECTED'] }
];
const strategies = ['single-request', 'truthy-cursor', 'bounded-cursor'];
const aliases = [['1.26.0', 'sdk-1-26'], ['1.32.2', 'sdk-1-32']];
const hash = value => createHash('sha256').update(value).digest('hex');
const rows = [];
for (const [sdk, alias] of aliases) {
  const [{ Client }, { Server }, { InMemoryTransport }, { ListToolsRequestSchema }] = await Promise.all([
    import(`${alias}/client/index.js`), import(`${alias}/server/index.js`), import(`${alias}/inMemory.js`), import(`${alias}/types.js`)
  ]);
  for (const scenario of cases) for (const [strategyIndex, strategy] of strategies.entries()) for (let repeat = 1; repeat <= 3; repeat++) {
    const client = new Client({ name: 'pagination-lab', version: '1' });
    const server = new Server({ name: 'synthetic-paged-catalog', version: '1' }, { capabilities: { tools: {} } });
    let requests = 0;
    server.setRequestHandler(ListToolsRequestSchema, async request => {
      requests++;
      // This budget protects deliberately broken strategies, and is not a protocol rule.
      if (requests > 4) throw new Error('Synthetic request budget');
      const cursor = request.params?.cursor;
      const index = cursor === undefined ? 0 : scenario.pages.findIndex(p => p.nextCursor === cursor) + 1;
      if (cursor !== undefined && index === 0) throw new Error('Unexpected cursor');
      const page = scenario.pages[index];
      if (!page || page.error) throw new Error('Synthetic later-page error');
      return page;
    });
    const [ct, st] = InMemoryTransport.createLinkedPair();
    let observed, collected = 0;
    try {
      await Promise.all([server.connect(st), client.connect(ct)]);
      const fetchPage = cursor => client.listTools(cursor === undefined ? undefined : { cursor }, { timeout: 1000 });
      let tools;
      if (strategy === 'bounded-cursor') tools = await collectToolPages(fetchPage, { maxPages: 4 });
      else {
        tools = [];
        let cursor;
        do {
          const page = await fetchPage(cursor);
          tools.push(...page.tools);
          cursor = page.nextCursor;
        } while (strategy === 'truthy-cursor' && cursor);
      }
      collected = tools.length;
      const expectedNames = scenario.pages.flatMap(p => p.tools ?? []).map(t => t.name);
      observed = new Set(tools.map(t => t.name)).size < tools.length ? 'DUPLICATE_CATALOG'
        : JSON.stringify(tools.map(t => t.name)) === JSON.stringify(expectedNames) && !scenario.pages.some(p => p.error) && scenario.pages.at(-1).nextCursor === undefined ? 'COMPLETE' : 'PARTIAL';
    } catch (error) {
      observed = error instanceof PaginationError ? error.code : requests > 4 ? 'REQUEST_BUDGET' : 'SDK_REJECTED';
    } finally { await Promise.allSettled([client.close(), server.close()]); }
    const expected = scenario.expected[strategyIndex];
    rows.push({ scenario: scenario.name, sdk, strategy, repeat, requests, collected, expected, observed, agrees: observed === expected });
  }
}
const report = {
  version: 1, measuredAt: new Date().toISOString(), node: process.version, platform: process.platform, arch: process.arch,
  lockfileSha256: hash(readFileSync(new URL('../package-lock.json', import.meta.url))),
  collectorSha256: hash(readFileSync(new URL('../src/pagination.ts', import.meta.url))),
  corpusSha256: hash(JSON.stringify(cases)), scriptSha256: hash(readFileSync(new URL(import.meta.url))),
  scope: '8 synthetic tools/list scenarios; 2 pinned v1 SDKs; 3 application discovery strategies; 3 repeats. Not tests of Gemini CLI, Cursor, desktop apps or SDK main/v2. Counts are correctness outcomes, not speed or adoption.',
  total: rows.length, agreed: rows.filter(r => r.agrees).length, rows
};
mkdirSync('reports', { recursive: true });
writeFileSync('reports/pagination.json', JSON.stringify(report, null, 2) + '\n');
const lines = ['# Pagination benchmark', '', report.scope, '', '| Scenario | SDK | Single request | Truthy cursor | Bounded collector |', '|---|---|---|---|---|'];
for (const scenario of cases) for (const [sdk] of aliases) {
  lines.push(`| ${scenario.name} | ${sdk} | ${strategies.map(strategy => rows.find(r => r.scenario === scenario.name && r.sdk === sdk && r.strategy === strategy && r.repeat === 1).observed).join(' | ')} |`);
}
lines.push('', `${report.agreed}/${report.total} outcomes match predeclared expectations. Three repeats do not add scenario coverage.`, '');
writeFileSync('reports/pagination.md', lines.join('\n'));
console.log(`${report.agreed}/${report.total} pagination outcomes match expectations. See reports/pagination.md.`);
process.exitCode = report.agreed === report.total ? 0 : 1;
