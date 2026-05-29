# Priority ERP — MCP Connector (Pay Day)

A custom [MCP](https://modelcontextprotocol.io) connector that lets Claude
capture Pay Day invoices into **Priority ERP** as **supplier (A/P) invoices**,
over Priority's OData REST API.

> **Deep docs:** the full agreed logic is in [`LOGIC.md`](./LOGIC.md); the design
> of the still-open items (learning store, deep link, re-sync) is in
> [`DESIGN.md`](./DESIGN.md). This README is the overview.

## Business logic (as agreed)

Invoice **capture is independent of payment approval.** The trigger is the
"quick capture" (קליטה מהירה) action, which creates a **draft** in Priority.

1. **Pay Day dedup first** — check the invoice isn't already in Pay Day (key:
   supplier + invoice number). If duplicate → mark it, reuse the existing
   record's data, and skip Priority calls.
2. **Supplier check (Priority)** — find the supplier. If it exists, check the
   invoice isn't already captured in Priority; if it is, learn from how it was
   recorded for future invoices from that supplier.
3. **Learning** — for a known supplier, use prior invoices to pick the expense
   account and field values for a correct record. Low confidence → leave to the
   bookkeeper (the draft is reviewed anyway).
4. **New supplier (manual + preview)** — never auto-created. Return a **preview**
   with the next supplier number (continue from the last supplier: keep the
   prefix, sequence + 1, e.g. `213-12` → `213-13`); create only after approval.
   - **Expense account**: pick from a searchable dropdown of existing accounts,
     or open a new one with a **bookkeeper-typed number** that is checked for
     availability (taken → "מספר החשבון תפוס").
5. **Draft only** — every document/transaction is created as a **DRAFT** (טיוטה).
   Nothing is finalized and **no final journal entries** are posted.
6. **Transaction number + deep link** — the draft transaction number (starts
   with `T`) returns to Pay Day as a link that opens the record in Priority Web.
   When finalized in Priority the number changes to a tax-year-prefixed one
   (e.g. `26...` / `25...`). The **balance date** drives the tax year: current or
   previous month → the invoice date; older → entered manually by the bookkeeper.

> Rollout flags in `src/priorityConfig.js` (`autoCreateSuppliers`,
> `finalizeDocuments`, `finalizeTransactions`) stay **off** until the logic is
> proven, then flip on for automatic creation / final posting.

## Multi-tenant: each client = a separate Priority company

Each Pay Day client maps to a **separate Priority company**. The client's
Priority ID (set in the client-management screen) is the company name — the last
segment of the OData URL:

```
https://{server}/odata/Priority/{tabula.ini}/{COMPANY}   ← COMPANY varies per client
```

Server, `tabula.ini` and credentials are shared; the **company** is per client.
Because each company is its own database, the "All Invoices" (כל החשבוניות)
screen and the per-client transaction numbering scope themselves automatically.
*(Code TODO: build the base URL per company — see `DESIGN.md` §4.)*

## Tools

| Tool | Writes? | Purpose |
|------|:------:|---------|
| `priority_describe_entity` | no | Get an entity's real field names + mandatory flags (`GetMetadataFor`). |
| `priority_find_supplier` | no | Search the supplier master by name. |
| `priority_preview_new_supplier` | no | Compute the next supplier number; return the record that *would* be created. Needs approval. |
| `priority_create_supplier` | **yes** | Create the supplier — only after the preview is approved. |
| `priority_search_expense_accounts` | no | Search expense accounts (the dropdown). |
| `priority_check_account_available` | no | Is an expense-account number free? |
| `priority_create_expense_account` | **yes** | Open a new expense account (manual number; fails if taken). |
| `priority_check_invoice_exists` | no | Duplicate check for a supplier invoice. |
| `priority_create_supplier_invoice` | **yes** | Create a captured invoice as a **DRAFT** A/P invoice (with dedup). |
| `priority_read_records` | no | Generic OData read for ad-hoc queries. |

## ⚠️ Field names must be confirmed

The Priority entity/field names in `src/priorityConfig.js` (`PINVOICES`,
`SUPPLIERS`, `ACCOUNTS`, `SUPNAME`, `IVNUM`, …) are **best-guess defaults** and
depend on your installation/language. In Priority Web supplier invoices live in
the **"כל החשבוניות"** screen, whose underlying entity may differ from
`PINVOICES`. Before relying on the create flows, run `priority_describe_entity`
against `SUPPLIERS`, the invoice entity and `ACCOUNTS`, and adjust
`priorityConfig.js` — that one file isolates all installation-specific names.

## Setup

```bash
cd connectors/priority
npm install
npm test                  # runs the supplier-numbering unit tests
cp .env.example .env       # then edit with your real credentials
```

| Variable | Description |
|----------|-------------|
| `PRIORITY_BASE_URL` | OData base for one company, e.g. `https://<server>/odata/Priority/<tabula.ini>/<company>/`. (Multi-company: see `DESIGN.md` §4.) |
| `PRIORITY_USERNAME` | Priority **API user name** (Personnel File → API User Name), or a PAT |
| `PRIORITY_PASSWORD` | The API password, or the literal `PAT` when the username is a token |

Auth is HTTP Basic Auth over HTTPS. Use a dedicated, least-privilege API user.

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
  payday.js             # orchestration: supplier/expense-account/draft invoice
  tools.js              # MCP tool definitions
test/
  supplierNumbering.test.js
LOGIC.md                # full agreed capture logic
DESIGN.md               # design of the open items
```

## Open items (see DESIGN.md)

1. ⏳ **Deep-link URL** — need one real Priority Web URL of an open supplier
   invoice to reverse-engineer the link template.
2. ✅ Re-sync = scheduled + manual refresh.
3. ✅ Balance-date rule (current/prev month = invoice date; older = manual).
4. ✅ Per-client = per Priority company. ⏳ refactor `priorityClient` for
   per-company base URL.
- Not yet defined: credit-card-paid invoices (LOGIC §6), where the learning
  store lives (Pay Day Firestore vs derived live).

## Notes

- Priority counts each create/update as a **transaction** (10k/month packages),
  and throttles at 100 calls/min — the connector avoids redundant writes.
- Dates are sent as DateTimeOffset; decimals use a `.` separator.
- To enable a *remote* connector (claude.ai), swap `StdioServerTransport` in
  `index.js` for Streamable HTTP + OAuth — the tools stay the same.
