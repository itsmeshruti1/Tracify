import { useState } from 'react';
import { Modal } from './Modal';
import { importCsv, mergeUnique } from '../lib/csv';
import type { Incident } from '../types/incident';

export function ImportDialog({ existing, cloud, onClose, onSave }: { existing: Incident[]; cloud: boolean;
  onClose: () => void; onSave: (records: Incident[]) => Promise<void> }) {
  const [preview, setPreview] = useState<ReturnType<typeof importCsv>>();
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [consent, setConsent] = useState(false);
  const merged = preview && !preview.errors.length ? (() => { try { return mergeUnique(existing, preview.records); } catch { return null; } })() : null;
  async function load(file?: File) {
    setPreview(undefined); setError(''); setConsent(false);
    if (!file) return;
    try {
      if (file.size > 4 * 1024 * 1024) throw new Error('CSV must be smaller than 4 MiB.');
      setPreview(importCsv(await file.text()));
    } catch (err) { setError((err as Error).message); }
  }
  async function save() {
    if (!merged?.additions.length) return;
    setBusy(true); setError('');
    try { await onSave(merged.additions); onClose(); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return <Modal title="Import incident CSV" onClose={() => { if (!busy) onClose(); }}>
    <div className="stack"><p className="muted">Use the template from Data & methodology. Provide a source and license for your data. Imported records remain unverified; source attribution does not establish accuracy.</p>
      <label>CSV file<input type="file" accept=".csv,text/csv" disabled={busy} onChange={e => void load(e.target.files?.[0])} /></label>
      {preview && <><div className="notice">{preview.records.length} valid rows · {preview.errors.length} errors · {merged?.skipped ?? 0} existing IDs skipped</div>
        {preview.errors.length > 0 && <div className="error" role="alert"><strong>Fix every error before importing. No records have been saved.</strong>
          <ul>{preview.errors.slice(0, 12).map(e => <li key={e}>{e}</li>)}</ul>{preview.errors.length > 12 && <p>Additional errors omitted.</p>}</div>}
        {!preview.errors.length && !merged && <p className="error">This import exceeds the 2,000-record workspace limit.</p>}
        {merged && <div className="table-scroll"><table><thead><tr><th>Location</th><th>Severity</th><th>Source</th></tr></thead><tbody>{merged.additions.slice(0, 5).map(p => <tr key={p.id}><td>{p.locationName}</td><td>{p.severity}</td><td>{p.source}</td></tr>)}</tbody></table></div>}
        {cloud && (merged?.additions.length ?? 0) > 400 && <p className="error">Split this CSV into batches of at most 400 records for cloud imports.</p>}
      </>}
      <label className="check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />I have permission to use this data and have checked its source and license.</label>
      {error && <p role="alert" className="error">{error}</p>}
      <button className="primary" disabled={busy || !consent || !merged?.additions.length || (cloud && merged.additions.length > 400)} onClick={() => void save()}>
        {busy ? 'Importing…' : `Import ${merged?.additions.length ?? 0} incidents`}</button>
    </div>
  </Modal>;
}
