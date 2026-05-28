/**
 * tools.js
 * MCP tool definitions for the Priority connector.
 *
 * Each tool is registered on the MCP server with a zod input schema and a
 * handler that returns MCP `content` blocks. Results are returned as pretty
 * JSON text so Claude can read and reason over them.
 */

'use strict';

const { z } = require('zod');
const { readRecords, createRecord, searchRecords } = require('./priorityClient');

/**
 * Wrap a value as a single text content block.
 * @param {unknown} value
 * @returns {{ content: Array<{ type: 'text', text: string }> }}
 */
function textResult(value) {
  const text =
    typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return { content: [{ type: 'text', text }] };
}

/**
 * Wrap an error as an MCP tool error result (isError: true) instead of
 * throwing, so Claude sees the message and can adjust its next call.
 * @param {unknown} err
 */
function errorResult(err) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

/**
 * Register all Priority tools on the given MCP server.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 */
function registerTools(server) {
  // ─── Read data ──────────────────────────────────────────────────────
  server.registerTool(
    'priority_read_records',
    {
      title: 'Read Priority records',
      description:
        'Read records from a Priority ERP entity (form/screen), e.g. CUSTOMERS, ' +
        'ORDERS, AINVOICES, PART. Supports OData filtering, field selection, ' +
        'related-entity expansion, ordering and a row limit. Read-only.',
      inputSchema: {
        entity: z
          .string()
          .describe('Priority entity/form name, e.g. "CUSTOMERS" or "ORDERS".'),
        filter: z
          .string()
          .optional()
          .describe(
            "Raw OData $filter expression, e.g. \"CUSTNAME eq 'ACME'\" or " +
              "\"TOTPRICE gt 1000\"."
          ),
        select: z
          .string()
          .optional()
          .describe('Comma-separated fields to return ($select), e.g. "CUSTNAME,CUSTDES".'),
        expand: z
          .string()
          .optional()
          .describe('Comma-separated related sub-entities to include ($expand).'),
        orderby: z
          .string()
          .optional()
          .describe('OrderBy expression, e.g. "CURDATE desc".'),
        top: z
          .number()
          .int()
          .positive()
          .max(500)
          .optional()
          .describe('Maximum number of records to return (default server side; max 500).'),
      },
    },
    async ({ entity, filter, select, expand, orderby, top }) => {
      try {
        const result = await readRecords(entity, {
          filter,
          select,
          expand,
          orderby,
          top: top ?? 50,
        });
        return textResult(result);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  // ─── General search ─────────────────────────────────────────────────
  server.registerTool(
    'priority_search',
    {
      title: 'Search Priority records',
      description:
        'Free-text search within a Priority entity. Performs a case-insensitive ' +
        '"contains" match across the given field(s) and returns matching records. ' +
        'Use this when you have a name/number fragment but not an exact value.',
      inputSchema: {
        entity: z
          .string()
          .describe('Priority entity/form name to search, e.g. "CUSTOMERS".'),
        term: z.string().describe('Text fragment to search for.'),
        fields: z
          .array(z.string())
          .min(1)
          .describe(
            'Fields to search within, e.g. ["CUSTNAME","CUSTDES"]. Combined with OR.'
          ),
        top: z
          .number()
          .int()
          .positive()
          .max(500)
          .optional()
          .describe('Maximum number of records to return (max 500).'),
      },
    },
    async ({ entity, term, fields, top }) => {
      try {
        const result = await searchRecords(entity, term, fields, { top: top ?? 50 });
        return textResult(result);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  // ─── Create records ─────────────────────────────────────────────────
  server.registerTool(
    'priority_create_record',
    {
      title: 'Create a Priority record',
      description:
        'Create a new record in a Priority entity (form), e.g. a new customer in ' +
        'CUSTOMERS or a new order in ORDERS. Provide the fields as a key/value ' +
        'object matching the Priority column names. This writes to the ERP — ' +
        'confirm the values with the user before calling.',
      inputSchema: {
        entity: z
          .string()
          .describe('Priority entity/form name to insert into, e.g. "CUSTOMERS".'),
        fields: z
          .record(z.any())
          .describe(
            'Field/value map using Priority column names, e.g. ' +
              '{ "CUSTNAME": "ACME01", "CUSTDES": "ACME Ltd" }.'
          ),
      },
    },
    async ({ entity, fields }) => {
      try {
        const created = await createRecord(entity, fields);
        return textResult({ created });
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

module.exports = { registerTools };
