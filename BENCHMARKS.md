# Reproduction evidence

Measured on 2026-11-08T13:07:31.998Z using Node v24.22.1, linux x64.

**72/72 observed profile outcomes matched predeclared expectations.** Seven automated tests passed locally. Wall time for the full 72-profile run: 21769 ms; this includes process startup and is not a performance comparison.

## Design

Three original synthetic fixtures × two pinned SDK versions × two Node runtime profiles × two validators × three repeats = 72 independent client runs.

1. Valid output schema and conforming structured result: six accepted profiles; two default-validator/no-codegen discovery failures per repeat.
2. Same schema with a number where a string is required: six output rejections; two discovery failures per repeat.
3. Control with no output schema: all eight profiles accept the capture per repeat.

A correct rejection is an expected outcome, not a successful tool call. Raw per-phase evidence is retained in [reports/benchmark.json](reports/benchmark.json). Both SDK versions exhibit the same pattern on these fixtures; no version is declared universally better.

## Reproduce

```sh
npm ci
npm test
npm run benchmark
```

The benchmark writes a fresh measured report. `npm test` covers the known failure, mitigation, invalid output, control, ordered calls after rejection, bounded input, report privacy and CLI behaviour. The included GitHub Actions workflow will exercise Node 22 and 24; local results alone do not establish CI success.

## What this does not establish

No live Brave service, production workload, Python client, desktop client, Cloudflare runtime, model API, HTTP transport or end-user adoption was tested. Node's no-codegen flag reproduces a restriction, not an entire edge environment. One echo schema is not a representative corpus of arbitrary JSON Schema constructs. Acceptance of captured output says nothing about server business logic or input validation.
