/**
 * tools.js
 * MCP tools for the Pay Day → Priority connector.
 *
 * The tools mirror the agreed business logic:
 *   - Suppliers are created in two steps: preview (read-only) → create (after
 *     bookkeeper approval). They are never created automatically.
 *   - Invoices are pushed once approved in Pay Day, created as DRAFTS only
 *     (no finalization, no final journal entries).
 *   - Duplicates are checked before creating an invoice.
 *
 * Field/entity names live in priorityConfig.js and must be verified against
 * the real Priority installation (use priority_describe_entity).
 */

'use strict';

const { z } = require('zod');
const { readRecords, request } = require('./priorityClient');
const {
  findSupplierByName,
  previewNewSupplier,
  createSupplier,
  checkInvoiceExists,
  createSupplierInvoiceDraft,
} = require('./payday');

/** Wrap a value as a single text content block (pretty JSON). */
function textResult(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return { content: [{ type: 'text', text }] };
}

/** Wrap an error as an MCP tool error result so Claude can adjust. */
function errorResult(err) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

/** Run a handler, converting thrown errors into tool error results. */
function safe(handler) {
  return async (args) => {
    try {
      return textResult(await handler(args));
    } catch (err) {
      return errorResult(err);
    }
  };
}

/**
 * Register all Pay Day → Priority tools on the given MCP server.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 */
function registerTools(server) {
  // ─── Discovery: confirm real field names ──────────────────────────
  server.registerTool(
    'priority_describe_entity',
    {
      title: 'Describe a Priority entity',
      description:
        'Return the metadata (fields, types, mandatory flags) for a Priority ' +
        'entity via GetMetadataFor. Use this to confirm the real field names ' +
        'before relying on the create flows.',
      inputSchema: {
        entity: z.string().describe('Top-level entity name, e.g. "SUPPLIERS" or "PINVOICES".'),
      },
    },
    safe(async ({ entity }) =>
      request('GET', `GetMetadataFor(entity='${entity.replace(/'/g, "''")}')`)
    )
  );

  // ─── Suppliers ────────────────────────────────────────────────────
  server.registerTool(
    'priority_find_supplier',
    {
      title: 'Find a supplier',
      description:
        'Search the Priority supplier master by name (case-insensitive). ' +
        'Use this first to check whether a vendor already exists before creating one.',
      inputSchema: {
        name: z.string().describe('Supplier name or fragment to search for.'),
      },
    },
    safe(async ({ name }) => findSupplierByName(name))
  );

  server.registerTool(
    'priority_preview_new_supplier',
    {
      title: 'Preview a new supplier (no write)',
      description:
        'PREVIEW ONLY — does NOT create anything. Computes the next supplier ' +
        'number (continuing from the last supplier in the system: same prefix, ' +
        'sequence + 1, e.g. 213-12 → 213-13) and returns the record that WOULD ' +
        'be created. The bookkeeper must approve this preview before you call ' +
        'priority_create_supplier.',
      inputSchema: {
        name: z.string().describe('Name for the new supplier (from the invoice vendor).'),
      },
    },
    safe(async ({ name }) => previewNewSupplier(name))
  );

  server.registerTool(
    'priority_create_supplier',
    {
      title: 'Create a supplier (after approval)',
      description:
        'Creates a supplier in Priority. Call this ONLY after a bookkeeper has ' +
        'approved the preview from priority_preview_new_supplier. Pass the exact ' +
        'record from that preview.',
      inputSchema: {
        supplierRecord: z
          .record(z.any())
          .describe('The approved supplier record, e.g. { "SUPNAME": "213-13", "SUPDES": "ACME Ltd" }.'),
      },
    },
    safe(async ({ supplierRecord }) => createSupplier(supplierRecord))
  );

  // ─── Invoices ─────────────────────────────────────────────────────
  server.registerTool(
    'priority_check_invoice_exists',
    {
      title: 'Check if a supplier invoice exists',
      description:
        'Duplicate check: returns whether a supplier invoice with the given ' +
        'supplier number and invoice number already exists in Priority.',
      inputSchema: {
        supplierNumber: z.string().describe('Priority supplier number (SUPNAME).'),
        invoiceNumber: z.string().describe("The supplier's invoice number (IVNUM)."),
      },
    },
    safe(async ({ supplierNumber, invoiceNumber }) =>
      checkInvoiceExists(supplierNumber, invoiceNumber)
    )
  );

  server.registerTool(
    'priority_create_supplier_invoice',
    {
      title: 'Create a supplier invoice (DRAFT)',
      description:
        'Creates a captured Pay Day invoice in Priority as a supplier (A/P) ' +
        'invoice. Capture is independent of payment approval. The supplier ' +
        'must already exist (use priority_find_supplier; if missing, preview + ' +
        'create the supplier first). Runs a duplicate check, then creates the ' +
        'document as a DRAFT (טיוטה) — it is NOT finalized and NO final journal ' +
        'entries are posted.',
      inputSchema: {
        supplierNumber: z.string().describe('Existing Priority supplier number (SUPNAME).'),
        invoiceNumber: z.string().describe("The supplier's invoice number (IVNUM)."),
        invoiceDate: z.string().optional().describe('Invoice date "YYYY-MM-DD".'),
        dueDate: z.string().optional().describe('Payment due date "YYYY-MM-DD".'),
        currency: z
          .enum(['ILS', 'USD', 'EUR', 'GBP'])
          .optional()
          .describe('Pay Day currency code.'),
        amountPreVat: z.number().optional().describe('Amount before VAT.'),
        vatAmount: z.number().optional().describe('VAT amount.'),
        totalAmount: z.number().optional().describe('Total including VAT.'),
        description: z.string().optional().describe('Line description.'),
      },
    },
    safe(async (args) => createSupplierInvoiceDraft(args))
  );

  // ─── Generic read (fallback / ad-hoc queries) ─────────────────────
  server.registerTool(
    'priority_read_records',
    {
      title: 'Read Priority records',
      description:
        'Read records from any Priority entity with OData options ' +
        '($filter, $select, $expand, $orderby, $top). Read-only.',
      inputSchema: {
        entity: z.string().describe('Entity/form name, e.g. "SUPPLIERS".'),
        filter: z.string().optional().describe('OData $filter expression.'),
        select: z.string().optional().describe('Comma-separated fields ($select).'),
        expand: z.string().optional().describe('Comma-separated subforms ($expand).'),
        orderby: z.string().optional().describe('Order expression, e.g. "CURDATE desc".'),
        top: z.number().int().positive().max(500).optional().describe('Max records (≤500).'),
      },
    },
    safe(async ({ entity, filter, select, expand, orderby, top }) =>
      readRecords(entity, { filter, select, expand, orderby, top: top ?? 50 })
    )
  );
}

module.exports = { registerTools };
