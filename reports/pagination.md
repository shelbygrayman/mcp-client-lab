# Pagination benchmark

8 synthetic tools/list scenarios; 2 pinned v1 SDKs; 3 application discovery strategies; 3 repeats. Not tests of Gemini CLI, Cursor, desktop apps or SDK main/v2. Counts are correctness outcomes, not speed or adoption.

| Scenario | SDK | Single request | Truthy cursor | Bounded collector |
|---|---|---|---|---|
| single-page | 1.26.0 | COMPLETE | COMPLETE | COMPLETE |
| single-page | 1.32.2 | COMPLETE | COMPLETE | COMPLETE |
| two-pages | 1.26.0 | PARTIAL | COMPLETE | COMPLETE |
| two-pages | 1.32.2 | PARTIAL | COMPLETE | COMPLETE |
| empty-cursor | 1.26.0 | PARTIAL | PARTIAL | COMPLETE |
| empty-cursor | 1.32.2 | PARTIAL | PARTIAL | COMPLETE |
| empty-middle-page | 1.26.0 | PARTIAL | COMPLETE | COMPLETE |
| empty-middle-page | 1.32.2 | PARTIAL | COMPLETE | COMPLETE |
| cursor-cycle | 1.26.0 | PARTIAL | REQUEST_BUDGET | CURSOR_CYCLE |
| cursor-cycle | 1.32.2 | PARTIAL | REQUEST_BUDGET | CURSOR_CYCLE |
| page-limit | 1.26.0 | PARTIAL | REQUEST_BUDGET | PAGE_LIMIT |
| page-limit | 1.32.2 | PARTIAL | REQUEST_BUDGET | PAGE_LIMIT |
| duplicate-tool | 1.26.0 | PARTIAL | DUPLICATE_CATALOG | DUPLICATE_TOOL |
| duplicate-tool | 1.32.2 | PARTIAL | DUPLICATE_CATALOG | DUPLICATE_TOOL |
| later-page-error | 1.26.0 | PARTIAL | SDK_REJECTED | SDK_REJECTED |
| later-page-error | 1.32.2 | PARTIAL | SDK_REJECTED | SDK_REJECTED |

144/144 outcomes match predeclared expectations. Three repeats do not add scenario coverage.
