import { ROADS, SEVERITIES, VEHICLES, WEATHER, type Incident, type SourceKind } from '../types/incident';
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
function text(value: unknown, label: string, max: number, required = true) {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim()))
    throw new Error(`${label} must ${required ? 'contain 1' : 'contain 0'}–${max} characters.`);
  return value.trim();
}
function number(value: unknown, label: string, min: number, max: number, integer = false) {
  if (value === '' || value === null || value === undefined || typeof value === 'boolean') throw new Error(`${label} is required.`);
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n)))
    throw new Error(`${label} must be ${integer ? 'an integer' : 'a number'} between ${min} and ${max}.`);
  return n;
}
function enumeration<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (!allowed.includes(value as T)) throw new Error(`${label}: use ${allowed.join(', ')}.`);
  return value as T;
}
export function validateIncident(input: Record<string, unknown>, sourceKind: SourceKind, now = Date.now()): Incident {
  enumeration(sourceKind, ['synthetic', 'imported', 'community'], 'Source kind');
  const id = text(input.id, 'ID', 80);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('ID may contain only letters, numbers, underscores and hyphens.');
  const occurredAt = text(input.occurredAt, 'Timestamp', 40);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(occurredAt) ||
    !Number.isFinite(Date.parse(occurredAt)) || Date.parse(occurredAt) < 0 || Date.parse(occurredAt) > now)
    throw new Error('Timestamp must be an ISO date with timezone, from 1970 through now.');
  const [year, month, day] = occurredAt.slice(0, 10).split('-').map(Number);
  if (new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) !== occurredAt.slice(0, 10))
    throw new Error('Timestamp contains an invalid calendar date.');
  const fatalities = number(input.fatalities, 'Fatalities', 0, 100, true);
  const injuries = number(input.injuries, 'Injuries', 0, 100, true);
  const severity = enumeration(input.severity, SEVERITIES, 'Severity');
  if ((fatalities > 0) !== (severity === 'FATAL')) throw new Error('FATAL severity requires fatalities; fatalities require FATAL severity.');
  const sourceUrl = text(input.sourceUrl ?? '', 'Source URL', 500, false);
  if (sourceUrl) {
    try { if (new URL(sourceUrl).protocol !== 'https:') throw new Error(); }
    catch { throw new Error('Source URL must be a valid HTTPS URL.'); }
  }
  return { id, occurredAt: new Date(occurredAt).toISOString(),
    locationName: text(input.locationName, 'Location', 160),
    lat: number(input.lat, 'Latitude', -90, 90), lng: number(input.lng, 'Longitude', -180, 180),
    severity, fatalities, injuries,
    vehicle: enumeration(input.vehicle, VEHICLES, 'Vehicle'), weather: enumeration(input.weather, WEATHER, 'Weather'),
    roadCondition: enumeration(input.roadCondition, ROADS, 'Road condition'),
    description: text(input.description ?? '', 'Description', 1500, false), sourceKind,
    source: text(input.source, 'Source', 200), sourceUrl,
    license: text(input.license ?? '', 'License', 120, false), verification: 'unverified',
  };
}
export function validateAttachment(file: Pick<Blob, 'size' | 'type'>) {
  if (!MEDIA_TYPES.includes(file.type)) throw new Error('Attach a JPEG, PNG, WebP, MP4 or WebM file.');
  if (file.size < 1 || file.size > MAX_ATTACHMENT_BYTES) throw new Error('Attachment must be between 1 byte and 5 MiB.');
}
