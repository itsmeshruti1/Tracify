import type { Filters, Hotspot, Incident, ScoreBreakdown } from '../types/incident';

export const MAX_RECORDS = 2000;
const DAY = 86400000;
export function distanceMeters(a: Pick<Incident, 'lat' | 'lng'>, b: Pick<Incident, 'lat' | 'lng'>) {
  const rad = Math.PI / 180;
  const s = Math.sin((b.lat - a.lat) * rad / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2;
  return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, s))));
}

/** Geographic DBSCAN; minPoints includes the point itself. Noise can become a border point. */
export function dbscan(records: Incident[], radius: number, minPoints: number) {
  if (!Number.isFinite(radius) || radius <= 0 || !Number.isInteger(minPoints) || minPoints < 2)
    throw new Error('Use a positive radius and at least two incidents.');
  if (records.length > MAX_RECORDS) throw new Error(`At most ${MAX_RECORDS} records can be clustered in this browser.`);
  const points = [...records].sort((a, b) => a.id.localeCompare(b.id));
  // shortcut: O(n²) neighbor queries, move to a spatial index/server above 2,000 records.
  const neighbors = (index: number) => points.flatMap((p, i) => distanceMeters(points[index], p) <= radius ? [i] : []);
  const labels = new Array<number | undefined>(points.length);
  let cluster = 0;
  for (let i = 0; i < points.length; i++) {
    if (labels[i] !== undefined) continue;
    const near = neighbors(i);
    if (near.length < minPoints) { labels[i] = -1; continue; }
    const label = cluster++;
    labels[i] = label;
    const queue = new Set(near);
    for (const n of queue) {
      if (labels[n] === -1) labels[n] = label;
      if (labels[n] !== undefined) continue;
      labels[n] = label;
      const more = neighbors(n);
      if (more.length >= minPoints) more.forEach(k => queue.add(k));
    }
  }
  const groups: Incident[][] = Array.from({ length: cluster }, () => []);
  const noise: Incident[] = [];
  points.forEach((p, i) => labels[i] === -1 ? noise.push(p) : groups[labels[i]!].push(p));
  return { groups, noise };
}

export function calculateScore(records: Incident[], windowDays: number, asOf: number): ScoreBreakdown {
  if (!records.length) return { frequency: 0, severity: 0, recency: 0, total: 0 };
  if (!Number.isFinite(windowDays) || windowDays <= 0 || !Number.isFinite(asOf)) throw new Error('Invalid scoring window.');
  const fatalities = records.reduce((sum, p) => sum + p.fatalities, 0);
  const injuries = records.reduce((sum, p) => sum + p.injuries, 0);
  const latest = Math.max(...records.map(p => Date.parse(p.occurredAt)));
  const frequency = 35 * Math.min((records.length * 90 / windowDays) / 35, 1);
  const severity = 45 * Math.min(((fatalities * 5 + injuries * 2) / records.length) / 2.5, 1);
  const recency = 20 * Math.exp(-0.082 * Math.max(0, (asOf - latest) / 3600000));
  const round = (n: number) => Math.round(n * 10) / 10;
  return { frequency: round(frequency), severity: round(severity), recency: round(recency),
    total: round(Math.min(100, frequency + severity + recency)) };
}

export const statusForScore = (score: number): Hotspot['status'] =>
  score >= 80 ? 'CRITICAL' : score >= 60 ? 'WARNING' : 'MONITORED';

export function buildHotspots(records: Incident[], radius: number, minPoints: number, days: number, asOf: number) {
  const { groups, noise } = dbscan(records, radius, minPoints);
  const hotspots: Hotspot[] = groups.map(group => {
    const score = calculateScore(group, days, asOf);
    const names = new Map<string, number>();
    group.forEach(p => names.set(p.locationName, (names.get(p.locationName) || 0) + 1));
    const name = [...names].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
    const lngSin = group.reduce((sum, p) => sum + Math.sin(p.lng * Math.PI / 180), 0);
    const lngCos = group.reduce((sum, p) => sum + Math.cos(p.lng * Math.PI / 180), 0);
    return { id: `cluster-${group[0].id}`, name, incidents: group,
      lat: group.reduce((sum, p) => sum + p.lat, 0) / group.length,
      lng: Math.atan2(lngSin, lngCos) * 180 / Math.PI,
      fatalities: group.reduce((sum, p) => sum + p.fatalities, 0),
      injuries: group.reduce((sum, p) => sum + p.injuries, 0),
      latest: group.reduce((latest, p) => p.occurredAt > latest ? p.occurredAt : latest, ''),
      score, status: statusForScore(score.total) };
  }).sort((a, b) => b.score.total - a.score.total || a.id.localeCompare(b.id));
  return { hotspots, noise };
}

export function dateBounds(start: string, end: string) {
  // All date controls and charts use Asia/Kolkata, regardless of the viewer's timezone.
  const from = Date.parse(`${start}T00:00:00+05:30`);
  const to = Date.parse(`${end}T23:59:59.999+05:30`);
  return { from, to, days: (to - from + 1) / DAY };
}
export function filterIncidents(records: Incident[], filters: Filters) {
  const { from, to } = dateBounds(filters.start, filters.end);
  const q = filters.search.trim().toLowerCase();
  return records.filter(p => {
    const time = Date.parse(p.occurredAt);
    return time >= from && time <= to &&
      (!filters.severity || p.severity === filters.severity) &&
      (!filters.sourceKind || p.sourceKind === filters.sourceKind) &&
      (!q || `${p.id} ${p.locationName} ${p.description}`.toLowerCase().includes(q));
  });
}
export function temporalMatrix(records: Incident[]) {
  const cells = Array.from({ length: 7 }, () => Array<number>(12).fill(0));
  for (const p of records) {
    const shifted = new Date(Date.parse(p.occurredAt) + 330 * 60000);
    cells[(shifted.getUTCDay() + 6) % 7][Math.floor(shifted.getUTCHours() / 2)]++;
  }
  return cells;
}
export function stoppingDistance(speedKmh: number, friction: number, reactionSeconds = 1.5) {
  if (![speedKmh, friction, reactionSeconds].every(Number.isFinite) || speedKmh < 0 || friction <= 0 || reactionSeconds < 0)
    throw new Error('Invalid stopping-distance inputs.');
  const v = speedKmh / 3.6;
  const reaction = v * reactionSeconds;
  const braking = v * v / (2 * 9.81 * friction);
  return { reaction, braking, total: reaction + braking };
}
export function istDate(value: number | string = Date.now()) {
  return new Date((typeof value === 'string' ? Date.parse(value) : value) + 330 * 60000).toISOString().slice(0, 10);
}
export const formatDate = (value: string) => new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value));
