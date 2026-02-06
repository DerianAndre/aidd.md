import type { ToolResult } from './types.js';

/** Create a plain text tool result. */
export function createTextResult(text: string): ToolResult {
  return {
    content: [{ type: 'text', text }],
  };
}

/** Create a JSON-formatted tool result. */
export function createJsonResult(data: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

/** Create an error tool result. */
export function createErrorResult(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: `Error: ${message}` }],
    isError: true,
  };
}
