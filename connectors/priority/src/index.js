#!/usr/bin/env node
/**
 * index.js
 * Entry point for the Priority ERP MCP connector.
 *
 * Starts an MCP server over stdio so it can be plugged into Claude Code,
 * Claude Desktop, or any MCP-compatible client. See README.md for setup.
 *
 * To expose this as a *remote* connector (claude.ai) instead, swap the
 * StdioServerTransport below for the Streamable HTTP transport — the tool
 * definitions in tools.js stay exactly the same.
 */

'use strict';

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { registerTools } = require('./tools');

async function main() {
  const server = new McpServer({
    name: 'payday-priority-connector',
    version: '1.0.0',
  });

  registerTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr only — stdout is reserved for the MCP protocol stream.
  console.error('[priority-connector] MCP server running on stdio');
}

main().catch((err) => {
  console.error('[priority-connector] Fatal error:', err);
  process.exit(1);
});
