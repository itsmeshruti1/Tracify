import { useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { JUNCTIONS } from '../data/sampleData';
import { ROADS, SEVERITIES, VEHICLES, WEATHER, type Incident } from '../types/incident';
import { validateAttachment, validateIncident } from '../lib/validation';

export function ReportDialog({ onClose, onSave }: { onClose: () => void; onSave: (p: Incident, file?: File) => Promise<void> }) {
  const [junction, setJunction] = useState('0'); const [lat, setLat] = useState(String(JUNCTIONS[0].lat));
  const [lng, setLng] = useState(String(JUNCTIONS[0].lng)); const [name, setName] = useState<string>(JUNCTIONS[0].name);
  const [file, setFile] = useState<File>(); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [time] = useState(() => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 16));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    try {
      const fields = Object.fromEntries(new FormData(event.currentTarget));
      const incident = validateIncident({ ...fields, lat, lng, locationName: name, id: crypto.randomUUID(),
        occurredAt: new Date(`${fields.occurredAt}:00+05:30`).toISOString(),
        source: 'Community submission', sourceUrl: '', license: '',
      }, 'community');
      if (file) {
        validateAttachment(file);
        incident.attachment = { name: file.name.slice(0, 160), size: file.size, type: file.type, path: incident.id };
      }
      setBusy(true); await onSave(incident, file); onClose();
    } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
  }
  return <Modal title="Report an incident" onClose={() => { if (!busy) onClose(); }}>
    <p className="muted">Reports remain unverified. This form does not contact emergency services. Avoid names, faces, registration plates and other personal information.</p>
    <form onSubmit={submit} className="stack">
      <label>Location preset<select value={junction} onChange={e => {
        setJunction(e.target.value);
        const point = JUNCTIONS[Number(e.target.value)];
        if (e.target.value === 'custom') { setName(''); setLat(''); setLng(''); }
        else if (point) { setName(point.name); setLat(String(point.lat)); setLng(String(point.lng)); }
      }}><option value="custom">Custom coordinates</option>{JUNCTIONS.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}</select></label>
      <label>Location name<input value={name} onChange={e => setName(e.target.value)} maxLength={160} required /></label>
      <div className="form-grid"><label>Latitude<input type="number" step="any" min="-90" max="90" value={lat} onChange={e => setLat(e.target.value)} required /></label>
        <label>Longitude<input type="number" step="any" min="-180" max="180" value={lng} onChange={e => setLng(e.target.value)} required /></label></div>
      <p className="micro">Presets are approximate junction centers. Adjust coordinates to the actual incident location.</p>
      <label>Occurred at (IST)<input type="datetime-local" name="occurredAt" defaultValue={time} max={time} required /></label>
      <div className="form-grid"><label>Severity<select name="severity" defaultValue="MINOR">{SEVERITIES.map(s => <option key={s}>{s}</option>)}</select></label>
        <label>Vehicle<select name="vehicle">{VEHICLES.map(s => <option key={s}>{s}</option>)}</select></label>
        <label>Fatalities<input type="number" name="fatalities" min="0" max="100" defaultValue="0" required /></label>
        <label>Injuries<input type="number" name="injuries" min="0" max="100" defaultValue="0" required /></label>
        <label>Weather<select name="weather" defaultValue="Unknown">{WEATHER.map(s => <option key={s}>{s}</option>)}</select></label>
        <label>Road condition<select name="roadCondition" defaultValue="Unknown">{ROADS.map(s => <option key={s}>{s}</option>)}</select></label></div>
      <label>Description<textarea name="description" maxLength={1500} rows={3} placeholder="What happened? Do not include personal information." /></label>
      <label>Optional evidence (up to 5 MiB)<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={e => {
        setError(''); const selected = e.target.files?.[0];
        try { if (selected) validateAttachment(selected); setFile(selected); }
        catch (err) { setError((err as Error).message); setFile(undefined); e.target.value = ''; }
      }} /></label>
      <label className="check"><input type="checkbox" required />I have permission to submit this information and any attached media.</label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" disabled={busy}>{busy ? 'Saving report…' : 'Save report'}</button>
    </form>
  </Modal>;
}
