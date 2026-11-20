# Reading a single-profile report

This walkthrough replays two captured tool results against the same client profile.
Run from the repository root. The commands below were checked with Node v26.13.1.

```sh
npm ci
npm run build
```

## Accepted output

```sh
node dist/cli.js check --input examples/valid-output.json --sdk 1.32.2 --runtime no-codegen --validator cfworker --out report-valid
echo $?
```

Exit code: **0**. The Markdown report contains this row:

| SDK | Node profile | Validator | Result | Evidence |
|---|---|---|---|---|
| 1.32.2 | no-codegen | cfworker | PASS | Discovery and all supplied calls accepted |

## Rejected output

```sh
node dist/cli.js check --input examples/invalid-output.json --sdk 1.32.2 --runtime no-codegen --validator cfworker --out report-invalid
echo $?
```

Exit code: **1**. The Markdown report contains this row:

| SDK | Node profile | Validator | Result | Evidence |
|---|---|---|---|---|
| 1.32.2 | no-codegen | cfworker | FAIL | call[0]: OUTPUT_REJECTED |

The accepted capture returns output conforming to its declared schema. The second capture reaches the call stage and the client rejects the supplied output. Exit 1 correctly records that rejection. Exactly one SDK/runtime/validator combination ran each time; omitted profiles are untested. Each output directory contains report.md and report.json. Choose fresh output directories when repeating the walkthrough.
