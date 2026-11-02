import type { Incident } from '../types/incident';
import { MAX_RECORDS } from './analytics';
import { validateIncident } from './validation';

export const COLUMNS = ['id', 'occurredAt', 'locationName', 'lat', 'lng', 'severity', 'fatalities', 'injuries',
  'vehicle', 'weather', 'roadCondition', 'description', 'source', 'sourceUrl', 'license'] as const;

/** RFC 4180-style quoted fields, escaped quotes, CRLF and embedded newlines. */
export function parseCsv(input: string): string[][] {
  if (input.length > 4 * 1024 * 1024) throw new Error('CSV must be smaller than 4 MiB.');
  const data = input.replace(/^\uFEFF/, '');
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false; let closed = false;
  const pushCell = () => { row.push(cell); cell = ''; closed = false; };
  const pushRow = () => { pushCell(); if (row.some(c => c.trim())) rows.push(row); row = []; };
  for (let i = 0; i < data.length; i++) {
    const c = data[i];
    if (quoted) {
      if (c === '"' && data[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else cell += c;
    } else if (c === ',') pushCell();
    else if (c === '\r' || c === '\n') { pushRow(); if (c === '\r' && data[i + 1] === '\n') i++; }
    else if (c === '"' && cell === '' && !closed) quoted = true;
    else if (closed || c === '"') throw new Error('Malformed CSV quoting.');
    else cell += c;
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  if (cell || row.length || closed) pushRow();
  return rows;
}
export function importCsv(input: string, now = Date.now()) {
  const [header, ...rows] = parseCsv(input);
  if (!header || !rows.length) throw new Error('CSV must contain a header and at least one incident.');
  if (new Set(header).size !== header.length || COLUMNS.some(c => !header.includes(c)) || header.some(c => !COLUMNS.includes(c as typeof COLUMNS[number])))
    throw new Error(`CSV header must contain exactly: ${COLUMNS.join(',')}`);
  if (rows.length > MAX_RECORDS) throw new Error(`Import at most ${MAX_RECORDS} incidents.`);
  const records: Incident[] = []; const errors: string[] = []; const ids = new Set<string>();
  rows.forEach((row, i) => {
    try {
      if (row.length !== header.length) throw new Error('Column count does not match header.');
      const incident = validateIncident(Object.fromEntries(header.map((key, col) => [key, row[col]])), 'imported', now);
      if (ids.has(incident.id)) throw new Error(`Duplicate ID ${incident.id}.`);
      ids.add(incident.id); records.push(incident);
    } catch (error) { errors.push(`Row ${i + 2}: ${(error as Error).message}`); }
  });
  return { records, errors };
}
export function exportCsv(records: Incident[]) {
  const cell = (value: string | number) => {
    // Protect spreadsheet users from formula execution in imported free text.
    let s = String(value);
    if (typeof value === 'string' && /^[\s]*[=+\-@]/.test(s)) s = `'${s}`;
    return `"${s.replaceAll('"', '""')}"`;
  };
  return [COLUMNS.join(','), ...records.map(p => COLUMNS.map(key => cell(p[key])).join(','))].join('\r\n');
}
export function mergeUnique(existing: Incident[], incoming: Incident[]) {
  const ids = new Set(existing.map(p => p.id));
  const additions = incoming.filter(p => { if (ids.has(p.id)) return false; ids.add(p.id); return true; });
  if (existing.length + additions.length > MAX_RECORDS) throw new Error(`Workspace limit: ${MAX_RECORDS} incidents. Export or use another workspace first.`);
  return { records: [...existing, ...additions], additions, skipped: incoming.length - additions.length };
}
