# Reproduction evidence

## Expanded corpus, 9 November 2026

**312/312 profile outcomes matched fixed expectations.** Thirteen original synthetic fixtures × two pinned SDKs × two runtimes × two validators × three repeats. The corpus covers six output-schema families: echo, nested required objects, integer array items, local `$defs`/`$ref`, nullable `anyOf`, and enum/range/additional-property constraints. Each family has a conforming and nonconforming captured result; a no-output-schema fixture is the control.

The combined value-constraints negative case violates several constraints; it establishes rejection of that capture, not independent coverage of each keyword. Other families isolate the stated mismatch. Three repeats measure consistency, not additional schema coverage.

All 72 default-validator/no-codegen runs with output schemas failed at discovery as expected. Every other profile accepted conforming captures and rejected nonconforming captures. The no-schema control was accepted everywhere. These are expected outcomes, not 312 successful tool calls.

Measured with Node v24.22.1, Linux x64, AMD EPYC 9V74 80-Core Processor. Wall time: 67266 ms, including process startup; no speed superiority is claimed. Seven regression tests passed. [Raw report](reports/benchmark.json) includes every outcome, fixture SHA-256, lockfile SHA-256, runtime and measurement timestamp. [Fixed manifest](examples/benchmark-cases.json) records expectations.

Run `npm ci`, `npm test`, then `npm run benchmark`. CI runs the same corpus on Node 22 and 24 and retains the raw report, including failures. Local measurements do not establish CI success. This remains synthetic replay over in-memory transport, not production-client certification.

## Initial echo reproduction, 8 November 2026

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
