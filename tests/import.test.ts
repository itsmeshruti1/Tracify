import test from 'node:test';
import assert from 'node:assert/strict';
import { COLUMNS, exportCsv, importCsv, mergeUnique, parseCsv } from '../src/lib/csv';
import { validateAttachment, validateIncident } from '../src/lib/validation';
import { createSampleIncidents } from '../src/data/sampleData';
const p = createSampleIncidents()[1];

test('CSV round trips commas, escaped quotes, newlines, Unicode, BOM and reordered columns', () => {
  const record = { ...p, description: 'Rain, "low visibility"\nಬೆಂಗಳೂರು' };
  const parsed = importCsv('\uFEFF' + exportCsv([record]));
  assert.deepEqual(parsed.errors, []); assert.equal(parsed.records[0].description, record.description);
  assert.equal(parsed.records[0].sourceKind, 'imported'); assert.equal(parsed.records[0].verification, 'unverified');
  const [head, row] = parseCsv(exportCsv([record]));
  const reversed = [head.reverse(), row.reverse()].map(r => r.map(v => `"${v.replaceAll('"', '""')}"`).join(',')).join('\n');
  assert.equal(importCsv(reversed).records[0].id, p.id);
});
test('malformed CSV, missing or duplicate headers, and excessive size are rejected', () => {
  assert.throws(() => parseCsv('"never closed')); assert.throws(() => parseCsv('"a"x,b'));
  assert.throws(() => importCsv('id,id\nx,y'));
  assert.throws(() => parseCsv('a'.repeat(4 * 1024 * 1024 + 1)));
  assert.throws(() => importCsv(COLUMNS.join(',')));
});
test('imports report every invalid row without silently accepting errors', () => {
  const csv = exportCsv([{ ...p, lat: 99 }, { ...p, id: 'bad-fatal', fatalities: 1, severity: 'MINOR' }]);
  const parsed = importCsv(csv); assert.equal(parsed.errors.length, 2); assert.equal(parsed.records.length, 0);
});
test('duplicate IDs within an import fail validation; existing IDs are skipped on merge', () => {
  assert.equal(importCsv(exportCsv([p, p])).errors.length, 1);
  const merged = mergeUnique([p], [p, { ...p, id: 'new' }]);
  assert.equal(merged.skipped, 1); assert.equal(merged.additions.length, 1); assert.equal(merged.records.length, 2);
  assert.throws(() => mergeUnique(Array.from({ length: 2000 }, (_, i) => ({ ...p, id: String(i) })), [{ ...p, id: 'extra' }]));
});
test('trust-boundary validation rejects invalid times, coordinates, URLs, enums and counts', () => {
  for (const patch of [{ occurredAt: '2026-02-30T12:00:00Z' }, { occurredAt: '2099-01-01T00:00:00Z' },
    { occurredAt: '2026-01-01 12:00:00' }, { lat: '' }, { lng: Infinity }, { injuries: -1 }, { injuries: 1.2 },
    { sourceUrl: 'javascript:alert(1)' }, { vehicle: 'spaceship' }, { id: '../escape' }]) {
    assert.throws(() => validateIncident({ ...p, ...patch }, 'imported'), JSON.stringify(patch));
  }
});
test('CSV export prevents formula execution without changing numeric coordinates', () => {
  const rows = parseCsv(exportCsv([{ ...p, locationName: '=HYPERLINK("evil")', lat: -12.9 }]));
  assert.ok(rows[1][2].startsWith("'=")); assert.equal(rows[1][3], '-12.9');
});
test('attachment validation rejects unsupported, empty and oversized content', () => {
  assert.doesNotThrow(() => validateAttachment({ type: 'image/png', size: 10 }));
  assert.throws(() => validateAttachment({ type: 'image/svg+xml', size: 10 }));
  assert.throws(() => validateAttachment({ type: 'image/png', size: 5242881 }));
  assert.throws(() => validateAttachment({ type: 'image/png', size: 0 }));
});
