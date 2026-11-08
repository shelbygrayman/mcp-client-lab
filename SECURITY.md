# Security and historical dependencies

This lab intentionally installs SDK 1.26.0 alongside 1.32.2 to reproduce a historical compatibility report. `npm audit` reports advisories against the older SDK and a transitive HTTP-server dependency. The old version is a test subject, not a recommendation for production.

The runner imports the in-memory transport, low-level server and client only. It starts no HTTP listener, OAuth flow or remote connection and does not execute captured tool implementations. Fixtures are bounded data and child processes receive no inherited app credentials or Node preload options. These restrictions reduce exposure; they are not a security audit or an OS sandbox.

Do not deploy this repository as an internet-facing MCP server or reuse the historical SDK alias in a production application. Do not pass hostile fixtures as a way of safely executing untrusted code. Use reduced synthetic fixtures when sharing reproductions. Raw private captures are not automatically sanitized; only the generated report omits their values.

Report problems privately through the maintainer's GitHub contact options; never include credentials in a public issue.
