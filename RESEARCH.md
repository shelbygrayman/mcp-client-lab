# Research and product decision

Checked 8 November 2026.

## User and job

MCP server authors and client integrators need to distinguish a catalog that is valid data from one that a particular SDK/runtime can actually consume. A developer can replay a reduced capture and attach the matrix to an integration issue without provisioning the original service.

## Evidence used

- [brave-search-mcp-server #235](https://github.com/brave/brave-search-mcp-server/issues/235): historical `listTools` failure with code generation disallowed. The issue contains several distinct later dialect reports; this release addresses only the original runtime/code-generation class. Issue author explanations are hypotheses, not treated as proven causes.
- [typescript-sdk #2795](https://github.com/modelcontextprotocol/typescript-sdk/issues/2795): schema dialect emission versus client acceptance. Investigated, but excluded from v0.1: a hand-written strict profile would not prove real desktop-client behaviour.
- [go-sdk #1188](https://github.com/modelcontextprotocol/go-sdk/issues/1188): protocol-era differences in tool schemas. Investigated, but excluded from v0.1 to avoid conflating protocol schema shape with runtime validator behaviour.
- Installed, exact npm SDK artifacts 1.26.0 and 1.32.2: `client/index.js` compiles output validators during discovery; `validation/cfworker-provider.js` uses an interpreter implementation.

## Existing coverage

MCP Inspector has interactive inspection, CLI workflows and static portability findings. mcpdiff and Cisco mcptoolkit-contract already cover schema/API comparisons. This project does not claim a new general scanner or absence of competitors.

The narrower experiment is actual SDK acceptance and rejection of one captured catalog/result under two Node runtime profiles and two SDK-provided validators. Its value proposition is repeatable reproduction and a tested mitigation, not novelty by name.

## Validation before expanding

v0.1 demonstrates technical usefulness, not user adoption. No stars, downloads, testimonials, customer interviews or performance superiority are claimed. Before adding more adapters, use the lab on another publicly reproducible failure and assess whether an existing tool provides an equally simple reproduction. Future Python or desktop-client coverage must execute those real clients and state versions explicitly.

## Adoption release, 11 November 2026

v0.2 adds intersecting SDK/runtime/validator filters, explicit untested-profile wording and a tagged GitHub installation path. Default checks and the benchmark retain the complete eight-profile matrix. No adoption or extra client coverage is implied by these changes.

Three public reports were rechecked before choosing the next fixtures:

| Public report | What the current lab establishes | Remaining work |
|---|---|---|
| Brave #235 | Original synthetic output-schema cases reproduce code-generation restriction and interpreter mitigation on the two pinned SDKs. | Keep the distinction from Brave's HTTP transport and production application. |
| TypeScript SDK #2795 | No strict desktop-client or schema-dialect emission claim. | A future case must execute a pinned real consumer; changing a `$schema` label is not sufficient. |
| Go SDK #1188 | No Go server or protocol-era negotiation claim. | A future case must run the Go server and capture both negotiated protocol versions. |

The latter two are research candidates, not three newly reproduced bugs. Existing synthetic coverage remains thirteen fixtures across six output-schema families. Contribution tasks should expand this evidence without inflating compatibility claims.
