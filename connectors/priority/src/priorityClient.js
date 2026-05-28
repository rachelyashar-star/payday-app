/**
 * priorityClient.js
 * Thin client for the Priority ERP OData REST API.
 *
 * Priority exposes every screen/form as an OData entity set, reachable at:
 *   {PRIORITY_BASE_URL}/{ENTITY}?{$odata-query}
 *
 * Authentication is HTTP Basic Auth with a dedicated Priority API user.
 * Configure via environment variables (see .env.example):
 *   - PRIORITY_BASE_URL   e.g. https://www.eshbelsaas.com/ui/odata/Priority/tabmob.ini/demo/
 *   - PRIORITY_USERNAME
 *   - PRIORITY_PASSWORD
 *
 * Node 20+ is required (uses the global `fetch`).
 */

'use strict';

/**
 * Read configuration from the environment, validating required values.
 * @returns {{ baseUrl: string, authHeader: string }}
 */
function getConfig() {
  const baseUrl = process.env.PRIORITY_BASE_URL;
  const username = process.env.PRIORITY_USERNAME;
  const password = process.env.PRIORITY_PASSWORD;

  const missing = [];
  if (!baseUrl) missing.push('PRIORITY_BASE_URL');
  if (!username) missing.push('PRIORITY_USERNAME');
  if (!password) missing.push('PRIORITY_PASSWORD');
  if (missing.length) {
    throw new Error(
      `Missing Priority credentials: ${missing.join(', ')}. ` +
        'Set them as environment variables (see connectors/priority/.env.example).'
    );
  }

  // Ensure exactly one trailing slash so we can safely append the entity name.
  const normalizedBase = baseUrl.replace(/\/+$/, '') + '/';
  const authHeader =
    'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

  return { baseUrl: normalizedBase, authHeader };
}

/**
 * Build the OData query string from a set of options.
 * Only options with a value are included.
 * @param {object} [opts]
 * @param {string} [opts.filter]   raw OData $filter expression
 * @param {string} [opts.select]   comma-separated field list for $select
 * @param {string} [opts.expand]   comma-separated relations for $expand
 * @param {string} [opts.orderby]  $orderby expression
 * @param {number} [opts.top]      max number of records ($top)
 * @returns {string} query string including a leading "?" or an empty string
 */
function buildQuery(opts = {}) {
  const params = new URLSearchParams();
  if (opts.filter) params.set('$filter', opts.filter);
  if (opts.select) params.set('$select', opts.select);
  if (opts.expand) params.set('$expand', opts.expand);
  if (opts.orderby) params.set('$orderby', opts.orderby);
  if (opts.top != null) params.set('$top', String(opts.top));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Perform an authenticated request against the Priority OData API.
 * @param {string} method  HTTP method
 * @param {string} path    entity name plus optional query string
 * @param {object} [body]  JSON body for write requests
 * @returns {Promise<any>} parsed JSON response (or {} for empty bodies)
 */
async function request(method, path, body) {
  const { baseUrl, authHeader } = getConfig();
  const url = baseUrl + path.replace(/^\/+/, '');

  const headers = {
    Authorization: authHeader,
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    // Priority returns a descriptive JSON error body; surface it verbatim.
    throw new Error(
      `Priority API ${method} ${path} failed (${res.status} ${res.statusText}): ${text}`
    );
  }

  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/**
 * Escape a value for use inside an OData string literal.
 * Single quotes are doubled per the OData spec.
 * @param {string} value
 * @returns {string}
 */
function escapeODataString(value) {
  return String(value).replace(/'/g, "''");
}

/**
 * Read records from a Priority entity (read-only).
 * @param {string} entity   entity/form name, e.g. "CUSTOMERS", "ORDERS"
 * @param {object} [opts]   OData options (see buildQuery)
 * @returns {Promise<{ count: number, records: any[] }>}
 */
async function readRecords(entity, opts = {}) {
  const data = await request('GET', `${entity}${buildQuery(opts)}`);
  const records = Array.isArray(data.value) ? data.value : [];
  return { count: records.length, records };
}

/**
 * Create a new record in a Priority entity.
 * @param {string} entity  entity/form name
 * @param {object} fields  field/value map matching the Priority column names
 * @returns {Promise<any>} the created record as returned by Priority
 */
async function createRecord(entity, fields) {
  return request('POST', entity, fields);
}

/**
 * Free-text search over one or more fields of an entity.
 * Builds a case-insensitive `contains(...)` filter, combining multiple
 * fields with OR. Any extra OData options (top, select, orderby) are merged in.
 * @param {string} entity        entity/form name
 * @param {string} term          search term
 * @param {string[]} fields      fields to search within
 * @param {object} [opts]        extra OData options
 * @returns {Promise<{ count: number, records: any[] }>}
 */
async function searchRecords(entity, term, fields, opts = {}) {
  if (!fields || !fields.length) {
    throw new Error('searchRecords requires at least one field to search.');
  }
  const safeTerm = escapeODataString(term).toLowerCase();
  const filter = fields
    .map((f) => `contains(tolower(${f}),'${safeTerm}')`)
    .join(' or ');

  // Respect a caller-supplied filter by ANDing it with the search clause.
  const combinedFilter = opts.filter
    ? `(${opts.filter}) and (${filter})`
    : filter;

  return readRecords(entity, { ...opts, filter: combinedFilter });
}

module.exports = {
  getConfig,
  buildQuery,
  request,
  readRecords,
  createRecord,
  searchRecords,
};
