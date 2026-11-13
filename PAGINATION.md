# Missing tools: pagination compatibility lab

A server can advertise 31 tools and a client can quietly retain only the first page. This lab makes that failure visible without a model, API key or external server.

## Reproduce

```sh
npm ci
npm run benchmark:pagination
```

Read [the observed matrix](reports/pagination.md) or [raw outcomes](reports/pagination.json). Eight synthetic cases run through real SDK **1.26.0** and **1.32.2** clients and local servers over `InMemoryTransport`, comparing three application strategies, three times. Expectations live beside the corpus in [the benchmark script](scripts/pagination-benchmark.mjs) and are checked independently of the collector. A matching known failure is a successful reproduction, not evidence that the strategy is correct.

| Strategy | What it tests |
|---|---|
| Single request | Common assumption that one v1 `listTools()` discovers everything |
| Truthy cursor | A loop that incorrectly treats `nextCursor: ""` as completion |
| Bounded collector | Explicit undefined check, cursor cycle detection, page/tool limits and duplicate-name rejection |

The corpus covers single and multiple pages, an empty cursor, an empty middle page, repeated cursors, endless unique cursors, duplicate names and a later-page error. Empty pages and empty strings do not imply completion. Cycles, duplicate rejection and limits are defensive application policies; this is not an official conformance suite.

## Use the collector

After building, import `collectToolPages` from `dist/pagination.js`. The callback must fetch exactly one page and enforce a request timeout:

```js
import { collectToolPages } from './dist/pagination.js';

const tools = await collectToolPages(
  cursor => client.listTools(
    cursor === undefined ? undefined : { cursor },
    { timeout: 5000 }
  ),
  { maxPages: 64, maxTools: 10000 }
);
// Replace your application's catalog only after this promise succeeds.
```

This snippet targets the two pinned **v1** SDK versions, where source inspection and the benchmark show `listTools()` returning a single page. It collects tool metadata. Each v1 SDK call updates its own output-schema cache; this helper does not fix or aggregate that SDK cache. Do not treat it as a full tool-calling adapter. On error, the helper returns no successful partial catalog, but prior SDK side effects are not rolled back.

The helper does not interrupt a callback that never resolves. Use the SDK request timeout, plus an application deadline if needed. Page/tool limits bound collection, not arbitrary server execution or payload bytes. The benchmark uses only tiny original synthetic data and a four-request budget to terminate intentionally broken strategies.

## Research and competing tools, checked 13 November 2026

- [Gemini CLI #29825](https://github.com/google-gemini/gemini-cli/issues/29825), opened 19 October 2026, reports first-page-only tool discovery and supplies an in-memory reproduction. This lab independently tests the failure class on its pinned SDKs; it does not run Gemini CLI or establish its current release status.
- [Python SDK #2556](https://github.com/modelcontextprotocol/python-sdk/issues/2556) discusses missing tools and helpers to drain pagination. It is demand evidence, not a measured Python result here.
- [Official conformance issues](https://github.com/modelcontextprotocol/conformance/issues) include empty-string cursor scenario #577. [The specification](https://modelcontextprotocol.io/specification/2025-11-25/server/utilities/pagination) describes opaque cursors. This lab does not claim complete protocol conformance.
- [Current TypeScript SDK main documentation](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/clients/calling.md) documents automatic aggregation and `listMaxPages`. This differs from the two pinned v1 releases. Main documentation must not be used to infer v1 behavior. No main/v2 result is measured here.

| Existing project | Why use it | This lab's narrower contribution |
|---|---|---|
| [Official MCP conformance](https://github.com/modelcontextprotocol/conformance) | Broad protocol checks against clients and servers | Small, offline, inspectable comparison of three discovery strategies on two frozen SDK releases |
| [MCP Inspector](https://github.com/modelcontextprotocol/inspector) | Interactive MCP debugging | Repeatable adversarial pagination corpus and machine-readable expected/observed outcomes |
| [mcp-contracts](https://github.com/mcp-contracts/mcp-contracts) and [mcp-diff](https://github.com/0-co/mcp-diff) | Schema snapshots and contract drift | Measures whether a discovery strategy actually collects the full paginated catalog |

This is the reason to deepen MCP Client Lab rather than launch another schema-diff repository. The reusable asset is the regression corpus and honest version-specific evidence. External adoption, popularity and superior coverage are not established. No speed ranking is claimed.
