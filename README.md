# MCP Client Lab

**Your MCP tool catalog loads locally. Will a different SDK or a runtime that forbids code generation accept the same catalog?**

Replay tool definitions and captured results through two pinned, real MCP TypeScript SDK clients. See whether failure happens at discovery or during output validation, and compare the default validator with the SDK's interpreter-based alternative.

No account, model API key or running MCP server required. No tool implementations are executed. This is a focused diagnostic, not a general MCP compliance badge.

## New: catch silently missing tools

Paginated `tools/list` responses can leave a client with an incomplete catalog. Run `npm run benchmark:pagination` to compare three discovery strategies across eight edge cases and both pinned SDKs. Includes empty cursors, cycles and later-page errors, a reusable bounded collector, and [raw results](reports/pagination.json). See [the pagination lab and research](PAGINATION.md). This tests application strategies on pinned v1 SDKs, not desktop clients or SDK main.

## Try the reproduced failure

Requires Node 22 or newer, npm and Git. Run the tagged GitHub release without cloning:

```sh
npm exec --yes --package=git+https://github.com/shelbygrayman/mcp-client-lab.git#v0.2.0 -- mcp-client-lab demo
```

This installs from GitHub and builds the CLI during installation. It is not an npm registry publication. For local development:

```sh
git clone https://github.com/shelbygrayman/mcp-client-lab.git
cd mcp-client-lab
npm ci
npm run demo
```

The demo starts eight isolated Node processes. It succeeds only if both SDK versions reproduce the known discovery failure under the no-codegen profile and the alternative validator accepts the valid captured result.

| Captured fixture | Ordinary Node, default validator | No-codegen Node, default validator | No-codegen Node, cfworker validator |
|---|---|---|---|
| Valid structured output | Accepted | Discovery fails | Accepted |
| Invalid structured output | Call rejected | Discovery fails | Call rejected |
| No output schema (control) | Accepted | Accepted | Accepted |

These are observed outcomes on SDK **1.26.0** and **1.32.2**. Raw outcomes, including all eight combinations, are in [reports/benchmark.json](reports/benchmark.json). Reproduce with `npm run benchmark`.

## Check your own catalog and captured results

Create a JSON fixture. Copy tool objects from a `tools/list` response and optionally supply captured `tools/call` results. Start with [examples/valid-output.json](examples/valid-output.json).

```json
{
  "version": 1,
  "tools": [{
    "name": "echo",
    "inputSchema": { "type": "object", "properties": { "text": { "type": "string" } } },
    "outputSchema": {
      "type": "object",
      "properties": { "text": { "type": "string" } },
      "required": ["text"]
    }
  }],
  "calls": [{
    "name": "echo",
    "arguments": { "text": "hello" },
    "result": {
      "content": [{ "type": "text", "text": "hello" }],
      "structuredContent": { "text": "hello" }
    }
  }]
}
```

```sh
npm run build
node dist/cli.js check --input fixture.json --out new-report-directory
```

You receive a Markdown matrix and machine-readable JSON. The report contains stage and error categories, not raw schemas, tool names, arguments, results, paths or exception messages. The output directory must be new. Omit `calls` for discovery-only checks.

`check` exits **0** if all selected profiles accept the fixture, **1** if any selected profile rejects it, **2** for invalid input, worker failure or output error. A rejection can be the correct outcome for deliberately invalid captured output. `demo` instead asserts the documented expected pattern.

## Why this exists

[Brave Search issue #235](https://github.com/brave/brave-search-mcp-server/issues/235) reports `listTools()` failing in a code-generation-restricted runtime. The SDK's default AJV validator compiles schemas using generated code. Both pinned versions already ship a [`CfWorkerJsonSchemaValidator`](https://github.com/modelcontextprotocol/typescript-sdk/tree/main/src/validation) alternative.

This project reproduces the **runtime code-generation failure class** with a minimal original echo fixture. It does not reproduce Brave's full application, transport, nested schema or every claim in that thread. The issue is closed; this lab tests the pinned versions rather than assuming the historical bug remains unchanged everywhere.

An author should not have to delete `outputSchema` or disable validation merely to get discovery working. The invalid-output control checks that the alternate validator still rejects a captured result violating the declared schema.

## Use the finding in your own client

Both pinned SDK versions support:

```ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/cfworker-provider.js';

const client = new Client(
  { name: 'your-client', version: '1.0.0' },
  { jsonSchemaValidator: new CfWorkerJsonSchemaValidator() }
);
```

Use an SDK version you have tested. Validator implementations and JSON Schema dialect support differ; the passing echo fixture does not establish equivalence for arbitrary schemas.

## Add it to CI

This repository includes [.github/workflows/ci.yml](.github/workflows/ci.yml) for Node 22 and 24, tests, and raw report artifacts. In a checked-out copy of the lab, use:

```sh
npm ci
npm run build
node dist/cli.js check --input path/to/your-fixture.json
```

### Select the environments you support

By default `check` still runs all eight profiles. In v0.2, filters intersect:

```sh
node dist/cli.js check --input path/to/your-fixture.json --runtime no-codegen --validator cfworker --out compatibility-report
```

This runs both pinned SDKs using only the interpreter validator with code generation disabled. Add `--sdk 1.32.2` for one SDK. Use `--runtime node` for ordinary Node, or `--validator default` to test the default validator. Unknown, missing and duplicate values exit 2. `demo` rejects filters so its reproduction cannot silently skip a known failure.

Only executed rows appear in the report. **Omitted profiles are untested.** Invalid captured output still causes exit 1 in selected profiles. Choosing a subset states a deployment requirement; it does not repair compatibility with excluded environments.

### Copy a CI integration

[Consumer workflow](examples/consumer-ci.yml) checks a committed synthetic capture with `--runtime no-codegen --validator cfworker`, retaining reports even on failure. It uses pinned actions and the v0.2.0 lab tag; for stricter source pinning replace the tag with its reviewed full commit SHA. Copy it into your repository and add `compatibility/catalog.json`. Adjust the filters to the environments your application supports.

Remove both filters to require all eight profiles. A capture with an output schema is expected to fail default-validator/no-codegen discovery on the pinned SDKs. `npm run demo` instead checks that the known failure and mitigation are reproduced. Neither command runs your production server.

## Scope and limits

- Real SDK clients initialize, discover tools and validate captured results against a local low-level SDK server over `InMemoryTransport`.
- `no-codegen` is Node's `--disallow-code-generation-from-strings`. It is **not** a test of Cloudflare Workers, browsers, Cursor, Claude Desktop, Python SDKs or a model's tool-selection behaviour.
- This is replay of data, not execution of your actual server. It does not validate server business logic, tool input semantics, authorization, transport compatibility or remote authentication. The separate pagination benchmark tests synthetic discovery strategies only.
- Output errors are categorized from SDK messages. Unexpected categories are retained as generic rejection codes, not guessed diagnoses.
- Child processes receive no inherited credentials or preload options. They are resource-bounded but **not OS sandboxes**. Do not use malicious input to evaluate dependency security.
- Limits: 1 MiB input, depth 32, 20,000 JSON nodes, 50 tools, 50 calls, ten seconds and 1 MiB output per worker. Duplicate JSON object keys are not detected.
- Captures may contain personal data or secrets. Use synthetic reproductions for public issues. Nothing in this tool automatically publishes or uploads reports.

## Related tools

[MCP Inspector](https://github.com/modelcontextprotocol/inspector) is the broader interactive debugger and already includes schema portability checks. [mcpdiff](https://github.com/samlader/mcpdiff) handles server-surface changes and CI comparisons. Use those for their workflows. This lab focuses on **replaying one capture through pinned SDK/runtime/validator combinations** with explicit negative controls and stage-level evidence.

## Contributing

Bring a minimal synthetic capture, exact SDK/runtime versions, observed stage and an upstream issue or specification link. A useful contribution demonstrates a repeatable incompatibility, not just another warning heuristic. See [RESEARCH.md](RESEARCH.md) for the initial decision and [BENCHMARKS.md](BENCHMARKS.md) for evidence.

MIT. Independent project; no upstream endorsement or official client certification.

See [CONTRIBUTING.md](CONTRIBUTING.md) for synthetic reproductions and the fixed-corpus benchmark contribution protocol.
