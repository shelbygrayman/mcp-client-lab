import { readFileSync } from 'node:fs';
import { parseFixture } from './fixture.js';

// Only the runner can select these fixed package aliases; fixtures cannot import code.
const alias = process.argv[2];
const validator = process.argv[3];
if (!['sdk-1-26', 'sdk-1-32'].includes(alias ?? '') || !['default', 'cfworker'].includes(validator ?? '')) process.exit(2);

type Step = { phase: 'initialize' | 'discovery' | 'call'; call?: number; status: 'pass' | 'fail'; code: string };
const steps: Step[] = [];
let phase: Step['phase'] = 'initialize';
let callIndex: number | undefined;
// AJV logs generated validator source before throwing. Never forward it into reports.
console.error = () => {};
function classify(error: unknown): string {
  const text = error instanceof Error ? error.message : '';
  if (/Code generation from strings disallowed|code generation is not allowed/i.test(text)) return 'CODEGEN_BLOCKED';
  if (/does not match|output validation|structured content|structuredContent/i.test(text)) return 'OUTPUT_REJECTED';
  if (/schema|keyword|reference|ref /i.test(text)) return 'SCHEMA_REJECTED';
  return 'SDK_REJECTED';
}
let client: any;
let server: any;
try {
  const fixture = parseFixture(readFileSync(0, 'utf8'));
  const [{ Client }, { Server }, { InMemoryTransport }, types] = await Promise.all([
    import(`${alias}/client/index.js`), import(`${alias}/server/index.js`),
    import(`${alias}/inMemory.js`), import(`${alias}/types.js`)
  ]);
  const options: Record<string, unknown> = {};
  if (validator === 'cfworker') {
    const { CfWorkerJsonSchemaValidator } = await import(`${alias}/validation/cfworker-provider.js`);
    options.jsonSchemaValidator = new CfWorkerJsonSchemaValidator();
  }
  client = new Client({ name: 'mcp-client-lab', version: '0.1.0' }, options);
  server = new Server({ name: 'captured-fixture', version: '1' }, { capabilities: { tools: {} } });
  server.setRequestHandler(types.ListToolsRequestSchema, async () => ({ tools: fixture.tools }));
  let cursor = 0;
  server.setRequestHandler(types.CallToolRequestSchema, async (request: any) => {
    const call = fixture.calls[cursor++];
    if (!call || call.name !== request.params.name || JSON.stringify(call.arguments) !== JSON.stringify(request.params.arguments)) {
      throw new Error('Replay request differs from capture.');
    }
    return call.result;
  });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(st), client.connect(ct)]);
  steps.push({ phase, status: 'pass', code: 'OK' });
  phase = 'discovery';
  await client.listTools();
  steps.push({ phase, status: 'pass', code: 'OK' });
  phase = 'call';
  for (const [index, call] of fixture.calls.entries()) {
    callIndex = index;
    try {
      await client.callTool({ name: call.name, arguments: call.arguments });
      steps.push({ phase, call: index, status: 'pass', code: 'OK' });
    } catch (error) {
      steps.push({ phase, call: index, status: 'fail', code: classify(error) });
    }
  }
} catch (error) {
  steps.push({ phase, ...(callIndex === undefined ? {} : { call: callIndex }), status: 'fail', code: classify(error) });
} finally {
  await Promise.allSettled([client?.close(), server?.close()]);
}
process.stdout.write(JSON.stringify({ steps }));
