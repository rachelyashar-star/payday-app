# Priority ERP — MCP Connector

A custom [MCP](https://modelcontextprotocol.io) connector that lets Claude talk
to **Priority ERP** through its OData REST API. Priority has no off-the-shelf
Claude connector, so this wraps its API as an MCP server you can plug into
Claude Code / Claude Desktop.

## What Claude can do with it

| Tool | Purpose |
|------|---------|
| `priority_read_records` | Read records from any Priority entity (CUSTOMERS, ORDERS, AINVOICES, PART, …) with OData `$filter` / `$select` / `$expand` / `$orderby` / `$top`. Read-only. |
| `priority_search` | Free-text, case-insensitive `contains` search across one or more fields of an entity. |
| `priority_create_record` | Create a new record in an entity (writes to the ERP). |

## Prerequisites

- **Node.js 20+** (uses the global `fetch`).
- A Priority **API user** with OData REST access, and your environment's
  OData base URL.

## Setup

```bash
cd connectors/priority
npm install
cp .env.example .env   # then edit with your real credentials
```

Configure these (in `.env`, or directly in your MCP client config):

| Variable | Description |
|----------|-------------|
| `PRIORITY_BASE_URL` | OData base, e.g. `https://<server>/odata/Priority/<tabula.ini>/<company>/` |
| `PRIORITY_USERNAME` | Priority API user |
| `PRIORITY_PASSWORD` | Priority API password |

> The connector uses **HTTP Basic Auth** over HTTPS. Use a dedicated,
> least-privilege Priority user and keep `.env` out of git (it already is).

## Connect it to Claude

### Claude Code (CLI)

```bash
claude mcp add priority \
  -e PRIORITY_BASE_URL="https://www.eshbelsaas.com/ui/odata/Priority/tabmob.ini/demo/" \
  -e PRIORITY_USERNAME="your_api_user" \
  -e PRIORITY_PASSWORD="your_api_password" \
  -- node /absolute/path/to/connectors/priority/src/index.js
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "priority": {
      "command": "node",
      "args": ["/absolute/path/to/connectors/priority/src/index.js"],
      "env": {
        "PRIORITY_BASE_URL": "https://www.eshbelsaas.com/ui/odata/Priority/tabmob.ini/demo/",
        "PRIORITY_USERNAME": "your_api_user",
        "PRIORITY_PASSWORD": "your_api_password"
      }
    }
  }
}
```

Restart Claude Desktop, then ask things like:
- "Find the customer named ACME in Priority" → `priority_search`
- "Show the 10 most recent orders over ₪1000" → `priority_read_records`
- "Create a new customer ACME01 / ACME Ltd" → `priority_create_record`

## Example tool calls

Read:
```json
{ "entity": "ORDERS", "filter": "TOTPRICE gt 1000", "orderby": "CURDATE desc", "top": 10 }
```

Search:
```json
{ "entity": "CUSTOMERS", "term": "acme", "fields": ["CUSTNAME", "CUSTDES"], "top": 20 }
```

Create:
```json
{ "entity": "CUSTOMERS", "fields": { "CUSTNAME": "ACME01", "CUSTDES": "ACME Ltd" } }
```

## Notes & next steps

- **Entity & field names** are specific to your Priority configuration (and may
  differ between Hebrew/English setups). Use `priority_read_records` with a small
  `top` to discover the columns of an entity.
- **Making it a remote connector** (so it shows up under *Settings → Connectors*
  on claude.ai): replace `StdioServerTransport` in `src/index.js` with the
  Streamable HTTP transport and host it behind HTTPS + OAuth. The tools in
  `tools.js` stay unchanged.
- **Write safety**: `priority_create_record` modifies live ERP data. Keep the
  API user scoped to only the entities you intend to write.
