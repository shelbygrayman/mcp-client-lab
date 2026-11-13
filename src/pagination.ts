/** A bounded collector for SDK versions whose listTools returns one page.
 * The callback MUST request one page and enforce its own request timeout.
 * This collects metadata only: it does not populate an SDK's tool validator cache.
 */
export interface ToolDefinition { name: string; [key: string]: unknown }
export interface ToolPage { tools: ToolDefinition[]; nextCursor?: string }
export class PaginationError extends Error {
  constructor(public readonly code: 'CURSOR_CYCLE' | 'PAGE_LIMIT' | 'TOOL_LIMIT' | 'DUPLICATE_TOOL' | 'INVALID_PAGE') {
    super(code); this.name = 'PaginationError';
  }
}
export async function collectToolPages(
  fetchPage: (cursor: string | undefined) => Promise<ToolPage>,
  { maxPages = 64, maxTools = 10000 }: { maxPages?: number; maxTools?: number } = {}
): Promise<ToolDefinition[]> {
  if (!Number.isSafeInteger(maxPages) || maxPages < 1 || !Number.isSafeInteger(maxTools) || maxTools < 1) {
    throw new RangeError('Limits must be positive safe integers.');
  }
  const tools: ToolDefinition[] = [];
  const names = new Set<string>();
  const cursors = new Set<string>();
  let cursor: string | undefined;
  for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
    const page = await fetchPage(cursor);
    if (!page || !Array.isArray(page.tools) || (page.nextCursor !== undefined && typeof page.nextCursor !== 'string')) {
      throw new PaginationError('INVALID_PAGE');
    }
    for (const tool of page.tools) {
      if (!tool || typeof tool.name !== 'string' || !tool.name) throw new PaginationError('INVALID_PAGE');
      if (names.has(tool.name)) throw new PaginationError('DUPLICATE_TOOL');
      if (tools.length >= maxTools) throw new PaginationError('TOOL_LIMIT');
      names.add(tool.name); tools.push(tool);
    }
    // Empty string is an opaque cursor, not an end marker. Empty pages can continue.
    if (page.nextCursor === undefined) return tools;
    if (cursors.has(page.nextCursor)) throw new PaginationError('CURSOR_CYCLE');
    cursors.add(page.nextCursor);
    cursor = page.nextCursor;
  }
  // Never return a successful partial catalog on a cycle, limit or later error.
  throw new PaginationError('PAGE_LIMIT');
}
