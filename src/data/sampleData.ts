import type { Incident } from '../types/incident';

// Approximate junction coordinates only. No real accidents or casualty statistics are represented.
export const JUNCTIONS = [
  { name: 'Silk Board Junction', lat: 12.9176, lng: 77.6233 },
  { name: 'KR Puram / Tin Factory', lat: 13.0035, lng: 77.6844 },
  { name: 'Hebbal Flyover', lat: 13.0358, lng: 77.5970 },
  { name: 'Goraguntepalya Junction', lat: 13.0284, lng: 77.5414 },
  { name: 'Marathahalli Bridge', lat: 12.9560, lng: 77.7011 },
  { name: 'Bellandur / Ecospace', lat: 12.9255, lng: 77.6789 },
  { name: 'Dairy Circle', lat: 12.9345, lng: 77.6015 },
  { name: 'Richmond Circle', lat: 12.9667, lng: 77.5990 },
  { name: 'Electronic City Tollgate', lat: 12.8399, lng: 77.6770 },
  { name: 'Yelahanka Circle', lat: 13.1007, lng: 77.5963 },
  { name: 'Whitefield Hope Farm', lat: 12.9830, lng: 77.7516 },
  { name: 'Jayanagar 4th Block', lat: 12.9298, lng: 77.5828 },
  { name: 'Rajajinagar 10th Cross', lat: 12.9882, lng: 77.5548 },
  { name: 'Indiranagar 100 Feet Road', lat: 12.9784, lng: 77.6408 },
  { name: 'Koramangala Sony World', lat: 12.9352, lng: 77.6245 },
  { name: 'JP Nagar Jayadeva', lat: 12.9180, lng: 77.5950 },
  { name: 'Majestic Circle', lat: 12.9767, lng: 77.5713 },
  { name: 'Nayandahalli Junction', lat: 12.9460, lng: 77.5260 },
] as const;
export const SAMPLE_AS_OF = '2026-10-31T18:29:59.000Z';
export function createSampleIncidents(): Incident[] {
  const base = Date.parse(SAMPLE_AS_OF);
  const records: Incident[] = JUNCTIONS.flatMap((junction, j) =>
    Array.from({ length: Math.max(2, 18 - j) }, (_, k) => {
      const fatalities = (j + k) % 17 === 0 ? 1 : 0;
      const injuries = (j * 3 + k) % 4;
      return {
        id: `SAMPLE-${String(j + 1).padStart(2, '0')}-${String(k + 1).padStart(2, '0')}`,
        occurredAt: new Date(base - (k * 97 + j * 23 + 1) * 3600000).toISOString(),
        locationName: junction.name,
        lat: junction.lat + Math.sin(k * 2.4 + j) * 0.001,
        lng: junction.lng + Math.cos(k * 1.7 + j) * 0.001,
        severity: fatalities ? 'FATAL' : injuries > 1 ? 'SEVERE' : injuries ? 'MODERATE' : 'MINOR',
        fatalities, injuries, vehicle: k % 3 === 0 ? 'Car' : 'Two-wheeler',
        weather: k % 3 === 0 ? 'Rain' : 'Clear', roadCondition: k % 3 === 0 ? 'Wet' : 'Dry',
        description: 'Synthetic incident generated to demonstrate spatial clustering and temporal analysis.',
        sourceKind: 'synthetic', source: 'Tracify synthetic demonstration v1',
        sourceUrl: '', license: 'CC0-1.0', verification: 'unverified',
      } satisfies Incident;
    }));
  // Isolated observations demonstrate that DBSCAN leaves noise outside clusters.
  records.push(...[0, 1, 2].map(i => ({ ...records[i], id: `SAMPLE-NOISE-${i}`,
    locationName: 'Isolated sample observation', lat: 12.88 + i * 0.03, lng: 77.45,
  })));
  return records;
}
