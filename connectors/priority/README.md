# Priority ERP — MCP Connector (Pay Day)

A custom [MCP](https://modelcontextprotocol.io) connector that lets Claude push
approved Pay Day invoices into **Priority ERP** as **supplier (A/P) invoices**,
over Priority's OData REST API.

## Business logic (as agreed)

The connector implements this flow, on purpose, with safety rails for the
initial rollout:

1. **Capture trigger (separate from payment approval)** — invoice capture is
   independent of Pay Day's payment approvals. An invoice is pushed to Priority
   when it is captured via the "quick capture" (קליטה מהירה) action, which
   creates a **draft** transaction.
2. **Supplier matching** — find the supplier by name in Priority.
3. **New supplier = manual, with preview** — if the supplier doesn't exist, the
   connector does **NOT** create it automatically. It returns a **preview** of
   the new supplier (with the next supplier number) for the bookkeeper to
   approve; only then is it created.
   - **Next supplier number** = continue from the last supplier in the system:
     keep its prefix and add 1 to the sequence, e.g. `213-12` → `213-13`.
4. **Duplicate check** — before creating, verify the invoice (supplier +
   invoice number) doesn't already exist.
5. **Draft only** — every document/transaction is created as a **DRAFT**
   (טיוטה). Nothing is finalized and **no final journal entries** are posted.

> Once the logic is proven and debugged, the rollout flags in
> `src/priorityConfig.js` (`autoCreateSuppliers`, `finalizeDocuments`,
> `finalizeTransactions`) can be turned on to move to automatic creation and
> final posting.

## Tools

| Tool | Writes? | Purpose |
|------|:------:|---------|
| `priority_describe_entity` | no | Get an entity's real field names + mandatory flags (`GetMetadataFor`). |
| `priority_find_supplier` | no | Search the supplier master by name. |
| `priority_preview_new_supplier` | no | Compute the next supplier number and return the record that *would* be created. Needs approval. |
| `priority_create_supplier` | **yes** | Create the supplier — only after the preview is approved. |
| `priority_check_invoice_exists` | no | Duplicate check for a supplier invoice. |
| `priority_create_supplier_invoice` | **yes** | Create an approved invoice as a **DRAFT** A/P invoice (with dedup). |
| `priority_read_records` | no | Generic OData read for ad-hoc queries. |

## ⚠️ Field names must be confirmed

The Priority entity/field names in `src/priorityConfig.js` (e.g. `PINVOICES`,
`SUPNAME`, `IVNUM`, line subform fields) are **best-guess defaults**. They
depend on your Priority version, language and customizations. Before relying on
the create flows, run `priority_describe_entity` against `SUPPLIERS` and
`PINVOICES` and adjust `priorityConfig.js` to match — that one file isolates all
installation-specific names.

## Setup

```bash
cd connectors/priority
npm install
npm test                 # runs the supplier-numbering unit tests
cp .env.example .env      # then edit with your real credentials
```

| Variable | Description |
|----------|-------------|
| `PRIORITY_BASE_URL` | OData base, e.g. `https://<server>/odata/Priority/<tabula.ini>/<company>/` |
| `PRIORITY_USERNAME` | Priority **API user name** (Personnel File → API User Name), or a PAT |
| `PRIORITY_PASSWORD` | The API password, or the literal `PAT` when the username is a token |

Auth is HTTP Basic Auth over HTTPS (Priority's default). Use a dedicated,
least-privilege API user.

## Connect it to Claude

### Claude Code (CLI)
```bash
claude mcp add priority \
  -e PRIORITY_BASE_URL="https://<server>/odata/Priority/<tabula.ini>/<company>/" \
  -e PRIORITY_USERNAME="..." -e PRIORITY_PASSWORD="..." \
  -- node /absolute/path/to/connectors/priority/src/index.js
```

### Claude Desktop — `claude_desktop_config.json`
```json
{
  "mcpServers": {
    "priority": {
      "command": "node",
      "args": ["/absolute/path/to/connectors/priority/src/index.js"],
      "env": {
        "PRIORITY_BASE_URL": "https://<server>/odata/Priority/<tabula.ini>/<company>/",
        "PRIORITY_USERNAME": "...",
        "PRIORITY_PASSWORD": "..."
      }
    }
  }
}
```

## Files

```
src/
  index.js              # MCP server entry (stdio)
  priorityClient.js     # low-level OData client (Basic Auth, GET/POST)
  priorityConfig.js     # ⚙️ all entity/field names + rollout flags (edit here)
  supplierNumbering.js  # pure logic: next supplier number (213-12 → 213-13)
  payday.js             # orchestration: find/preview/create supplier, draft invoice
  tools.js              # MCP tool definitions
test/
  supplierNumbering.test.js
```

## Notes

- Priority counts each create/update as a **transaction** (10k/month packages),
  and throttles at 100 calls/min — the connector avoids redundant writes.
- Dates are sent as DateTimeOffset; decimals use a `.` separator.
- To enable a *remote* connector (claude.ai), swap `StdioServerTransport` in
  `index.js` for Streamable HTTP + OAuth — the tools stay the same.
