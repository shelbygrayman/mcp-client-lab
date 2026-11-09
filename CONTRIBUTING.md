# Contribute a reproducible incompatibility

Start with `npm ci && npm test`. Run `npm run benchmark` to exercise the fixed synthetic corpus through both pinned SDKs, both runtimes and both validators. The benchmark report records every profile, including expected rejections.

A useful bug report includes:

- A minimal synthetic version-1 JSON capture. Replace private names, arguments and results before attaching it.
- The SDK, Node, OS and architecture versions, plus the command you ran.
- Expected discovery/call behavior, the actual report category, and an upstream issue or specification section when available.
- Whether you reproduced it independently, and what differs from the documented fixtures.

Do not attach credentials, private catalogs or production logs. Reports redact raw capture content, but input fixtures do not. Worker resource bounds are not an OS sandbox.

For a new benchmark case, add a standalone JSON fixture and its expectation to `examples/benchmark-cases.json` before measuring. Include a conforming capture and a deliberately nonconforming capture. Retain mismatches; do not redefine expected behavior merely to make a run green. Describe the schema family and the constraint being tested. A repeat checks stability and does not add a new schema case.

For SDK changes, retain the old pinned comparison until a documented reason warrants removing it. A failing outcome may be the correct rejection of invalid output. This project does not award client certification.
