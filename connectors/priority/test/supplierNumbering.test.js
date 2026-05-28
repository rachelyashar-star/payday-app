/**
 * Tests for the supplier-numbering logic (node:test, no deps).
 * Run with: node --test
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  parseSupplierNumber,
  computeNextSupplierNumber,
  compareSupplierNumbers,
  pickLastSupplier,
} = require('../src/supplierNumbering');

test('parseSupplierNumber splits prefix and sequence', () => {
  const p = parseSupplierNumber('213-12');
  assert.equal(p.prefix, '213');
  assert.equal(p.seq, 12);
  assert.equal(p.seqWidth, 2);
  assert.equal(p.hasDash, true);
});

test('computeNextSupplierNumber increments the sequence, keeps the prefix', () => {
  assert.equal(computeNextSupplierNumber('213-12'), '213-13');
  assert.equal(computeNextSupplierNumber('250-1'), '250-2');
  assert.equal(computeNextSupplierNumber('299-99'), '299-100');
});

test('computeNextSupplierNumber preserves zero-padding width', () => {
  assert.equal(computeNextSupplierNumber('213-09'), '213-10');
  assert.equal(computeNextSupplierNumber('200-001'), '200-002');
});

test('computeNextSupplierNumber throws on a non-numeric sequence', () => {
  assert.throws(() => computeNextSupplierNumber('213-AB'));
});

test('compareSupplierNumbers sorts numerically, not lexically', () => {
  // "213-9" must be considered LESS than "213-12" (string sort would reverse this)
  assert.ok(compareSupplierNumbers('213-9', '213-12') < 0);
  // higher prefix wins
  assert.ok(compareSupplierNumbers('250-1', '213-99') > 0);
});

test('pickLastSupplier prefers the most recently created when dates are present', () => {
  const suppliers = [
    { SUPNAME: '213-12', CURDATE: '2026-01-01T00:00:00Z' },
    { SUPNAME: '213-05', CURDATE: '2026-05-20T00:00:00Z' }, // newest
    { SUPNAME: '213-11', CURDATE: '2026-03-10T00:00:00Z' },
  ];
  const last = pickLastSupplier(suppliers, { keyField: 'SUPNAME', dateField: 'CURDATE' });
  assert.equal(last.SUPNAME, '213-05');
  // and the next number continues from that one
  assert.equal(computeNextSupplierNumber(last.SUPNAME), '213-06');
});

test('pickLastSupplier falls back to highest number when dates are missing', () => {
  const suppliers = [
    { SUPNAME: '213-9' },
    { SUPNAME: '213-12' }, // highest, despite "9" looking bigger lexically
    { SUPNAME: '213-3' },
  ];
  const last = pickLastSupplier(suppliers, { keyField: 'SUPNAME', dateField: 'CURDATE' });
  assert.equal(last.SUPNAME, '213-12');
});
