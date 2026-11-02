import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHotspots, calculateScore, dateBounds, dbscan, distanceMeters, filterIncidents, istDate, statusForScore, stoppingDistance, temporalMatrix } from '../src/lib/analytics';
import { createSampleIncidents, SAMPLE_AS_OF } from '../src/data/sampleData';

const base = createSampleIncidents()[0];
const point = (id: string, lng: number) => ({ ...base, id, lat: 0, lng });
test('haversine uses meters and handles the antimeridian', () => {
  assert.ok(Math.abs(distanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }) - 111195) < 2);
  assert.ok(distanceMeters({ lat: 0, lng: 179.999 }, { lat: 0, lng: -179.999 }) < 225);
});
test('DBSCAN promotes previously visited noise to a border point', () => {
  const result = dbscan([point('a', 0), point('b', .0008), point('c', .0016), point('z', 1)], 100, 3);
  assert.deepEqual(result.groups.map(g => g.map(p => p.id)), [['a', 'b', 'c']]);
  assert.deepEqual(result.noise.map(p => p.id), ['z']);
});
test('DBSCAN follows density connectivity, responds to radius and minimum count, and is deterministic', () => {
  const points = [point('a', 0), point('b', .0008), point('c', .0016), point('d', .1), point('e', .1008)];
  assert.equal(dbscan(points, 100, 2).groups.length, 2);
  assert.equal(dbscan(points, 20, 2).groups.length, 0);
  assert.equal(dbscan(points, 100, 4).groups.length, 0);
  assert.deepEqual(dbscan(points, 100, 2), dbscan([...points].reverse(), 100, 2));
  assert.throws(() => dbscan(points, -1, 2)); assert.throws(() => dbscan(points, 10, 1.1));
});
test('risk formula matches an independently calculated fixture and cools over time', () => {
  const p = { ...base, fatalities: 1, injuries: 0, occurredAt: '2026-10-01T00:00:00.000Z' };
  const now = Date.parse(p.occurredAt);
  // Frequency: 35 × (1/35) = 1; severity saturates at 45; recency = 20.
  assert.deepEqual(calculateScore([p], 90, now), { frequency: 1, severity: 45, recency: 20, total: 66 });
  assert.ok(calculateScore([p], 90, now + 86400000).total < 66);
  assert.equal(calculateScore([], 90, now).total, 0);
  assert.equal(calculateScore(Array(40).fill(p), 90, now).total, 100);
  assert.equal(statusForScore(80), 'CRITICAL'); assert.equal(statusForScore(60), 'WARNING');
  assert.equal(statusForScore(59.9), 'MONITORED');
});
test('one-day filters are inclusive in IST and exclude next midnight', () => {
  const filters = { start: '2026-10-01', end: '2026-10-01', search: '', severity: '', sourceKind: '' };
  const records = ['2026-09-30T18:30:00.000Z', '2026-10-01T18:29:59.999Z', '2026-10-01T18:30:00.000Z']
    .map((occurredAt, i) => ({ ...base, id: String(i), occurredAt }));
  assert.equal(dateBounds(filters.start, filters.end).days, 1);
  assert.deepEqual(filterIncidents(records, filters).map(p => p.id), ['0', '1']);
  assert.equal(istDate('2026-09-30T18:30:00Z'), '2026-10-01');
});
test('heatmap uses IST rather than machine timezone and preserves all counts', () => {
  const p = { ...base, occurredAt: '2026-10-25T19:00:00.000Z' }; // Monday 00:30 IST
  const matrix = temporalMatrix([p]); assert.equal(matrix[0][0], 1);
  assert.equal(matrix.flat().reduce((sum, n) => sum + n, 0), 1);
});
test('sample observations partition exactly into clusters and noise with consistent aggregates', () => {
  const records = createSampleIncidents();
  const { hotspots, noise } = buildHotspots(records, 300, 3, 90, Date.parse(SAMPLE_AS_OF));
  assert.equal(hotspots.length, 16);
  assert.equal(hotspots.reduce((sum, h) => sum + h.incidents.length, 0) + noise.length, records.length);
  const ids = hotspots.flatMap(h => h.incidents.map(p => p.id)).concat(noise.map(p => p.id));
  assert.equal(new Set(ids).size, records.length);
  hotspots.forEach(h => assert.equal(h.fatalities, h.incidents.reduce((sum, p) => sum + p.fatalities, 0)));
});
test('stopping distance uses reaction plus braking with unit conversion', () => {
  const d = stoppingDistance(36, 0.5, 1.5);
  assert.equal(d.reaction, 15); assert.ok(Math.abs(d.braking - 100 / 9.81) < 1e-9);
  assert.ok(stoppingDistance(36, 0.28).total > stoppingDistance(36, 0.75).total);
  assert.equal(stoppingDistance(0, 0.75).total, 0); assert.throws(() => stoppingDistance(30, 0));
});
