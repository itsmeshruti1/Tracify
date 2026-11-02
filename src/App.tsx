import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownToLine, ArrowUpFromLine, ArrowUpRight, BookOpen, Check, ChevronRight,
  Database, FileText, Layers, MapPin, Moon, Plus, Search, ShieldCheck, SlidersHorizontal, Sun, Trash2, X } from 'lucide-react';
import { AuthProvider, useAuth } from './firebase/authContext';
import { subscribeIncidents, saveCloud, cloudAttachment, removeCloud } from './firebase/incidentStore';
import { cloudConfigured } from './firebase/config';
import { localStore } from './lib/localStore';
import { buildHotspots, dateBounds, filterIncidents, formatDate, istDate, stoppingDistance, temporalMatrix } from './lib/analytics';
import { COLUMNS, exportCsv, mergeUnique } from './lib/csv';
import { createSampleIncidents, SAMPLE_AS_OF } from './data/sampleData';
import { SEVERITIES, WEATHER, type Filters, type Hotspot, type Incident } from './types/incident';
import { RiskMap } from './components/RiskMap';
import { Modal } from './components/Modal';
import { AuthDialog } from './components/AuthDialog';
import { ReportDialog } from './components/ReportDialog';
import { ImportDialog } from './components/ImportDialog';

type Tab = 'explorer' | 'incidents' | 'insights' | 'methods';
const tabs = [{ id: 'explorer', name: 'Hotspot explorer', icon: MapPin }, { id: 'incidents', name: 'Incident register', icon: FileText },
  { id: 'insights', name: 'Temporal insights', icon: Activity }, { id: 'methods', name: 'Data & methodology', icon: BookOpen }] as const;
function download(name: string, data: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function defaultFilters(asOf: string): Filters {
  return { start: istDate(Date.parse(asOf) - 89 * 86400000), end: istDate(asOf), search: '', severity: '', sourceKind: '' };
}
function AppContent() {
  const auth = useAuth();
  const [tab, setTab] = useState<Tab>('explorer');
  const [mode, setMode] = useState<'local' | 'cloud'>('local');
  const [records, setRecords] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [toast, setToast] = useState('');
  const [reload, setReload] = useState(0);
  const [filters, setFilters] = useState<Filters>(() => defaultFilters(new Date().toISOString()));
  const [radius, setRadius] = useState(300); const [minPoints, setMinPoints] = useState(3);
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'report' | 'import' | 'auth' | null>(null);
  const [detail, setDetail] = useState<Incident | null>(null); const [deleting, setDeleting] = useState<Incident | null>(null);
  const [page, setPage] = useState(1);
  const [clock, setClock] = useState(Date.now());
  // Preserve the existing theme preference across the product rename.
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('accidentsense_theme') !== 'light'; } catch { return true; } });
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try { localStorage.setItem('accidentsense_theme', dark ? 'dark' : 'light'); } catch { /* Theme can still change without storage. */ }
  }, [dark]);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 6000); return () => clearTimeout(timer); }, [toast]);
  const cloudReady = mode === 'cloud' && !!auth.user && auth.verified;
  const gated = mode === 'cloud' && !cloudReady;
  useEffect(() => {
    let active = true; setLoading(true); setRecords([]); setError(''); setDetail(null); setSelected(null);
    if (mode === 'local') {
      void localStore.initialize().then(() => localStore.list()).then(data => { if (active) { setRecords(data); setLoading(false); } })
        .catch(err => { if (active) { setError(err.message); setLoading(false); } });
      return () => { active = false; };
    }
    if (!cloudReady || !auth.user) { setLoading(false); return; }
    return subscribeIncidents(auth.user.uid, data => { setRecords(data); setLoading(false); setError(''); }, message => {
      setError(message); setLoading(false);
    });
  }, [mode, auth.user?.uid, cloudReady, reload]);
  useEffect(() => {
    const refresh = () => { if (mode === 'local' && !busy && !dialog) setReload(n => n + 1); };
    window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh);
  }, [mode, busy, dialog]);
  const bounds = dateBounds(filters.start, filters.end);
  const validDates = Number.isFinite(bounds.days) && bounds.days > 0;
  const visible = useMemo(() => filterIncidents(records, filters).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)), [records, filters]);
  const asOf = Math.min(bounds.to, clock);
  const analysis = useMemo(() => validDates ? buildHotspots(visible, radius, minPoints, bounds.days, asOf) : { hotspots: [], noise: [] },
    [visible, radius, minPoints, bounds.days, asOf, validDates]);
  const chosen = analysis.hotspots.find(h => h.id === selected) ?? analysis.hotspots[0];
  const selectHotspot = useCallback((id: string) => setSelected(id), []);
  const fatalities = visible.reduce((sum, p) => sum + p.fatalities, 0);
  const injuries = visible.reduce((sum, p) => sum + p.injuries, 0);
  const synthetic = records.filter(p => p.sourceKind === 'synthetic').length;
  const pages = Math.max(1, Math.ceil(visible.length / 12));
  const safePage = Math.min(page, pages);
  useEffect(() => setPage(1), [filters]);
  const updateFilter = (patch: Partial<Filters>) => setFilters(prev => ({ ...prev, ...patch }));
  async function save(incoming: Incident[], attachment?: File) {
    if (busy || loading || error || gated) throw new Error('Workspace is not ready. Reload and try again.');
    setBusy(true);
    try {
      const current = mode === 'local' ? await localStore.list() : records;
      const merged = mergeUnique(current, incoming);
      if (mode === 'local') { await localStore.save(merged.additions, attachment); setRecords(await localStore.list()); }
      else if (auth.user && auth.verified) await saveCloud(auth.user.uid, merged.additions, attachment);
      else throw new Error('Verified sign-in is required.');
      if (merged.additions.length) {
        const dates = merged.additions.map(p => istDate(p.occurredAt)).sort();
        setFilters(prev => ({ ...prev, start: dates[0] < prev.start ? dates[0] : prev.start,
          end: dates[dates.length - 1] > prev.end ? dates[dates.length - 1] : prev.end, search: '', severity: '', sourceKind: '' }));
      }
      setToast(`Saved ${merged.additions.length} incident${merged.additions.length === 1 ? '' : 's'}${merged.skipped ? `; skipped ${merged.skipped} existing IDs` : ''}.`);
    } finally { setBusy(false); }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      if (mode === 'local') { await localStore.remove(deleting.id); setRecords(await localStore.list()); }
      else if (auth.user && auth.verified) await removeCloud(auth.user.uid, deleting);
      else throw new Error('Verified sign-in is required.');
      setDeleting(null); setToast('Incident and attached evidence deleted.');
    } catch (err) { setToast(`Delete failed: ${(err as Error).message}`); } finally { setBusy(false); }
  }
  function switchMode(next: 'local' | 'cloud') {
    if (next === mode) return;
    setRecords([]); setMode(next); setFilters(defaultFilters(new Date().toISOString()));
  }
  const ready = !loading && !busy && !error && !gated;
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <aside className="sidebar">
      <a href="#" className="brand" onClick={e => { e.preventDefault(); setTab('explorer'); }}><span className="brand-mark"><Layers size={24} /></span>
        <span>Tracify<small>BENGALURU · ROAD SAFETY LAB</small></span></a>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Main navigation">{tabs.map(item => <button key={item.id} className={tab === item.id ? 'nav-item active' : 'nav-item'}
        aria-current={tab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}><item.icon size={18} /><span>{item.name}</span>{tab === item.id && <ChevronRight size={14} />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="source-card"><ShieldCheck size={20} /><strong>Evidence before action.</strong>
        <p>Transparent data, explainable scores, and clearly labeled uncertainty.</p><button className="text-button" onClick={() => setTab('methods')}>Read the methodology <ArrowUpRight size={13} /></button></div>
        <span className="version">Tracify / v1.0</span></div>
    </aside>
    <div className="main-shell"><header className="topbar"><span className="breadcrumb">Workspace <ChevronRight size={13} /><strong>{tabs.find(t => t.id === tab)?.name}</strong></span>
      <div className="top-actions"><span className="workspace-pill"><i className="dot monitored" />{mode === 'local' ? 'Local browser' : 'Private cloud'}</span>
        <button className="icon-button" aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setDark(!dark)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
        <button className="account-button" disabled={busy} onClick={() => setDialog('auth')}>{auth.user ? 'Account' : 'Cloud sign in'}</button></div></header>
      <main id="main">
        <div className="page-heading"><div><p className="eyebrow"><span />SPATIAL INTELLIGENCE / BENGALURU</p>
          <h1>{tab === 'explorer' ? 'Understand where risk gathers.' : tab === 'incidents' ? 'Every record tells a story.' : tab === 'insights' ? 'Find the pattern behind the points.' : 'Analysis you can inspect.'}</h1>
          <p className="subtitle">{tab === 'explorer' ? 'Explore collision clusters, inspect the evidence, and see how each score is built.' : tab === 'incidents' ? 'A searchable register with persistent reports, source attribution, and private evidence.' : tab === 'insights' ? 'Historical time patterns and a transparent road-condition scenario calculator.' : 'Sources, assumptions, import tools, and the limits of what this application can tell you.'}</p></div>
          <button className="primary" disabled={!ready} onClick={() => setDialog('report')}><Plus size={17} />Report incident</button></div>
        <div className="workspace-row"><div className="segmented" aria-label="Workspace storage"><button disabled={busy} className={mode === 'local' ? 'active' : ''} onClick={() => switchMode('local')}>Local demo</button>
          <button disabled={busy} className={mode === 'cloud' ? 'active' : ''} onClick={() => switchMode('cloud')}>Private cloud</button></div>
          <span className="micro">{mode === 'local' ? 'Saved on this device · no account required' : 'Saved to your account · visible only to you'}</span></div>
        {mode === 'local' && <div className="data-notice"><Database size={18} /><div><strong>{synthetic ? 'Synthetic demonstration data' : 'Local analysis workspace'}</strong>
          <span>{synthetic ? `${synthetic} generated observations around real junction coordinates. These are not actual crash reports. Sample snapshot: 31 Oct 2026.` : 'Imported records and community reports are unverified. Browser data is not a backup.'}</span></div>
          <button className="text-button" onClick={() => setTab('methods')}>About the data <ArrowUpRight size={14} /></button></div>}
        {auth.error && <p className="error" role="alert">{auth.error}</p>}
        {gated ? <section className="panel gate"><ShieldCheck size={38} /><h2>Your private incident workspace</h2>
          <p>{!cloudConfigured ? 'Configure Firebase using the README to enable cloud persistence. You can explore every analysis feature in the local demo now.' : 'Sign in and verify your email to store reports in your private cloud workspace.'}</p>
          <button className="primary" onClick={() => setDialog('auth')}>{auth.user ? 'Verify account' : 'Open cloud sign in'}</button>
          <button onClick={() => switchMode('local')}>Use local demo</button></section> : <>
          {error && <div className="error" role="alert">{error}<button onClick={() => setReload(n => n + 1)}>Retry connection</button></div>}
          {loading ? <section className="panel loading" role="status">Opening workspace…</section> : <>
            <div className="filter-bar"><label className="search-field"><Search size={16} /><input aria-label="Search incidents" placeholder="Search a location, ID, or description…" value={filters.search} onChange={e => updateFilter({ search: e.target.value })} /></label>
              <label>From (IST)<input type="date" value={filters.start} onChange={e => updateFilter({ start: e.target.value })} /></label>
              <label>To (IST)<input type="date" value={filters.end} max={istDate()} onChange={e => updateFilter({ end: e.target.value })} /></label>
              <label>Severity<select value={filters.severity} onChange={e => updateFilter({ severity: e.target.value })}><option value="">All severities</option>{SEVERITIES.map(s => <option key={s}>{s}</option>)}</select></label>
              <label>Provenance<select value={filters.sourceKind} onChange={e => updateFilter({ sourceKind: e.target.value })}><option value="">All sources</option><option value="synthetic">Synthetic</option><option value="imported">Imported</option><option value="community">Community</option></select></label>
            </div>
            {!validDates && <p className="error" role="alert">Choose valid dates with the start on or before the end.</p>}
            <section className="metrics" aria-label="Summary of filtered incidents">
              {[{ label: 'OBSERVATIONS', value: visible.length, caption: `${records.length} records in workspace`, icon: FileText },
                { label: 'DETECTED HOTSPOTS', value: analysis.hotspots.length, caption: `${analysis.noise.length} unclustered observations`, icon: MapPin },
                { label: 'REPORTED FATALITIES', value: fatalities, caption: 'From the selected records', icon: Activity },
                { label: 'REPORTED INJURIES', value: injuries, caption: 'From the selected records', icon: ShieldCheck }].map(metric =>
                <div className="metric" key={metric.label}><div><span>{metric.label}</span><metric.icon size={17} /></div><strong>{metric.value}</strong><p>{metric.caption}</p></div>)}
            </section>
            {tab === 'explorer' && <>
              <div className="explorer-grid"><section className="panel map-panel"><div className="section-heading"><div><p className="eyebrow">01 / SPATIAL OVERVIEW</p><h2>Collision density explorer</h2></div><span className="tag"><Layers size={12} />Geographic DBSCAN</span></div>
                <RiskMap hotspots={analysis.hotspots} noise={analysis.noise} selected={chosen?.id ?? null} onSelect={selectHotspot} radius={radius} />
                <div className="cluster-controls"><SlidersHorizontal size={17} /><label>Neighborhood radius <strong>{radius} m</strong><input type="range" min="50" max="1500" step="50" value={radius} onChange={e => setRadius(Number(e.target.value))} /></label>
                  <label>Minimum incidents <strong>{minPoints}</strong><input type="range" min="2" max="15" value={minPoints} onChange={e => setMinPoints(Number(e.target.value))} /></label></div>
                <p className="micro map-footnote">Rings show the neighborhood radius around each cluster center, not a cluster boundary. Grey observations are DBSCAN noise.</p></section>
                <HotspotProfile hotspot={chosen} asOf={Number.isFinite(asOf) ? new Date(asOf).toISOString() : ''} onIncident={setDetail} />
              </div>
              <section className="panel directory"><div className="section-heading"><div><p className="eyebrow">02 / PRIORITIZATION</p><h2>Hotspot directory</h2></div><span className="micro">Ranked by illustrative risk index</span></div>
                {!analysis.hotspots.length ? <Empty text="No clusters match these filters. Expand the date range, increase the radius, or lower the minimum incidents." /> : <div className="table-scroll"><table><thead><tr><th>Rank</th><th>Location</th><th>Risk index</th><th>Incidents</th><th>Fatalities / injuries</th><th>Latest observation (IST)</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{analysis.hotspots.map((h, i) => <tr key={h.id} className={chosen?.id === h.id ? 'selected-row' : ''}>
                  <td className="mono">{String(i + 1).padStart(2, '0')}</td><td><strong>{h.name}</strong><small>{h.lat.toFixed(4)}, {h.lng.toFixed(4)}</small></td><td><span className={`status ${h.status.toLowerCase()}`}>{h.score.total} <small>/100</small></span></td><td className="mono">{h.incidents.length}</td><td>{h.fatalities} / {h.injuries}</td><td>{formatDate(h.latest)}</td>
                  <td><button className="text-button" onClick={() => { setSelected(h.id); document.querySelector('.map-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>Inspect <ArrowUpRight size={14} /></button></td></tr>)}</tbody></table></div>}
              </section>
            </>}
            {tab === 'incidents' && <section className="panel"><div className="section-heading"><div><p className="eyebrow">RECORDS / {visible.length} IN CURRENT VIEW</p><h2>Incident register</h2></div><div className="button-row"><button disabled={!ready} onClick={() => setDialog('import')}><ArrowUpFromLine size={15} />Import CSV</button><button disabled={!visible.length} onClick={() => download('tracify-incidents.csv', exportCsv(visible))}><ArrowDownToLine size={15} />Export view</button></div></div>
              <p className="micro register-note">All records are unverified. Export includes source attribution; attachments remain in this workspace.</p>
              {!visible.length ? <Empty text="No incidents match the current filters. Import a CSV, add a report, or expand your date range." /> : <div className="table-scroll"><table><thead><tr><th>Incident / time (IST)</th><th>Location</th><th>Severity</th><th>Provenance</th><th>Evidence</th><th>Actions</th></tr></thead><tbody>{visible.slice((safePage - 1) * 12, safePage * 12).map(p => <tr key={p.id}><td><strong className="mono">{p.id.slice(0, 22)}</strong><small>{formatDate(p.occurredAt)}</small></td><td>{p.locationName}</td><td><span className={`severity ${p.severity.toLowerCase()}`}>{p.severity}</span><small>{p.fatalities} fatal · {p.injuries} injured</small></td><td><span className="tag">{p.sourceKind}</span></td><td>{p.attachment ? 'Attached' : 'None'}</td><td><div className="button-row"><button className="text-button" onClick={() => setDetail(p)}>Details <ChevronRight size={13} /></button><button className="icon-button" disabled={!ready} aria-label={`Delete ${p.id}`} onClick={() => setDeleting(p)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>}
              <div className="pagination"><span>{visible.length ? (safePage - 1) * 12 + 1 : 0}–{Math.min(safePage * 12, visible.length)} of {visible.length}</span><div className="button-row"><button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Previous</button><span>{safePage} / {pages}</span><button disabled={safePage >= pages} onClick={() => setPage(safePage + 1)}>Next</button></div></div>
            </section>}
            {tab === 'insights' && <Insights records={visible} />}
            {tab === 'methods' && <Methods onImport={() => setDialog('import')} ready={ready} cloud={mode === 'cloud'} />}
          </>}
        </>}
        <footer className="page-footer"><span>Tracify · Open, explainable road-safety analysis</span><span>Historical observations · All times IST · Not a travel-safety guarantee</span></footer>
      </main>
    </div>
    {dialog === 'auth' && <AuthDialog onClose={() => setDialog(null)} />}
    {dialog === 'report' && <ReportDialog onClose={() => setDialog(null)} onSave={(record, file) => save([record], file)} />}
    {dialog === 'import' && <ImportDialog existing={records} cloud={mode === 'cloud'} onClose={() => setDialog(null)} onSave={save} />}
    {detail && <IncidentDetail record={detail} load={() => mode === 'local' ? localStore.attachment(detail.id) : cloudAttachment(detail)} onClose={() => setDetail(null)} />}
    {deleting && <Modal title="Delete incident?" onClose={() => { if (!busy) setDeleting(null); }}><div className="stack"><p>Delete <strong>{deleting.id}</strong> and its attachment from this {mode === 'local' ? 'browser' : 'private cloud'} workspace? This cannot be undone.</p><div className="button-row"><button disabled={busy} onClick={() => setDeleting(null)}>Keep incident</button><button className="danger-button" disabled={busy} onClick={() => void remove()}>{busy ? 'Deleting…' : 'Delete permanently'}</button></div></div></Modal>}
    {toast && <div className="toast" role="status"><Check size={17} /><span>{toast}</span><button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={16} /></button></div>}
  </div>;
}

function Empty({ text }: { text: string }) { return <div className="empty"><Layers size={30} /><p>{text}</p></div>; }
function HotspotProfile({ hotspot: h, asOf, onIncident }: { hotspot?: Hotspot; asOf: string; onIncident: (p: Incident) => void }) {
  if (!h) return <section className="panel profile"><p className="eyebrow">CLUSTER PROFILE</p><Empty text="Select a detected hotspot to explore its records and score." /></section>;
  return <section className="panel profile"><div className="section-heading"><p className="eyebrow">SELECTED CLUSTER</p><span className={`status ${h.status.toLowerCase()}`}>{h.status}</span></div>
    <h2>{h.name}</h2><p className="micro mono">{h.lat.toFixed(5)}° N / {h.lng.toFixed(5)}° E</p>
    <div className="score-display"><strong>{h.score.total.toFixed(1)}</strong><span>/100<small>Illustrative risk index</small></span></div>
    <p className="micro">An explainable prioritization score, not a crash probability or official safety rating.</p>
    <div className="score-parts">{[{ label: 'Frequency', n: h.score.frequency, max: 35 }, { label: 'Severity', n: h.score.severity, max: 45 }, { label: 'Recency', n: h.score.recency, max: 20 }].map(p => <div key={p.label}><span>{p.label}<strong>{p.n} / {p.max}</strong></span><div className="bar-track"><div style={{ width: `${p.n / p.max * 100}%` }} /></div></div>)}</div>
    <div className="profile-totals"><div><strong>{h.incidents.length}</strong><span>Incidents</span></div><div><strong>{h.fatalities}</strong><span>Fatalities</span></div><div><strong>{h.injuries}</strong><span>Injuries</span></div></div>
    <p className="micro">Scored as of {asOf ? formatDate(asOf) : '—'}. Components are rounded independently.</p>
    <div className="profile-records"><h3>Latest observations</h3>{[...h.incidents].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 3).map(p => <button key={p.id} onClick={() => onIncident(p)}><span><strong>{p.severity}</strong><small>{formatDate(p.occurredAt)} · {p.sourceKind}</small></span><ChevronRight size={15} /></button>)}</div>
  </section>;
}

function IncidentDetail({ record: p, load, onClose }: { record: Incident; load: () => Promise<Blob | null>; onClose: () => void }) {
  const [url, setUrl] = useState(''); const [error, setError] = useState('');
  useEffect(() => {
    let active = true; let objectUrl = '';
    if (p.attachment) void load().then(blob => {
      if (!blob) throw new Error('Saved evidence was not found.');
      if (active) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); }
    }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [p.id]);
  return <Modal title="Incident details" onClose={onClose}><div className="stack"><div><span className="tag">{p.sourceKind} · unverified</span><h3>{p.locationName}</h3><p className="micro mono">{p.id}</p><p>{formatDate(p.occurredAt)} IST</p></div>
    <dl className="detail-grid"><div><dt>Severity</dt><dd>{p.severity}</dd></div><div><dt>Casualties</dt><dd>{p.fatalities} fatal · {p.injuries} injured</dd></div><div><dt>Coordinates</dt><dd>{p.lat}, {p.lng}</dd></div><div><dt>Vehicle</dt><dd>{p.vehicle}</dd></div><div><dt>Weather / road</dt><dd>{p.weather} / {p.roadCondition}</dd></div><div><dt>Source</dt><dd>{p.source}</dd></div><div><dt>License</dt><dd>{p.license || 'Not specified; permission required for reuse'}</dd></div></dl>
    {p.sourceUrl && <a href={p.sourceUrl} target="_blank" rel="noreferrer">Open source record ↗</a>}
    <p className="description">{p.description || 'No description supplied.'}</p>
    {p.attachment && <div><p className="micro">User-supplied evidence · {p.attachment.name} · not independently verified</p>
      {error ? <p className="error" role="alert">{error}</p> : !url ? <p role="status">Loading evidence…</p> : p.attachment.type.startsWith('video/') ? <video src={url} controls className="evidence" /> : <img src={url} alt={`User-supplied evidence for incident ${p.id}`} className="evidence" />}</div>}
    {!p.attachment && <p className="micro">No attachment was supplied.</p>}</div></Modal>;
}

function Insights({ records }: { records: Incident[] }) {
  const matrix = temporalMatrix(records); const max = Math.max(1, ...matrix.flat());
  const [speed, setSpeed] = useState(50); const [reaction, setReaction] = useState(1.5);
  const friction = [{ name: 'Dry asphalt', value: 0.75 }, { name: 'Wet asphalt', value: 0.42 }, { name: 'Waterlogged', value: 0.28 }];
  return <div className="insights-grid"><section className="panel"><div className="section-heading"><div><p className="eyebrow">HISTORICAL DISTRIBUTION</p><h2>When incidents were recorded</h2></div><span className="tag">Asia / Kolkata</span></div>
    <p className="muted">Counts in two-hour buckets. These describe the selected records; they do not predict future accidents.</p>
    <div className="heatmap-scroll"><div className="heatmap"><div className="heatmap-labels"><span />{Array.from({ length: 12 }, (_, i) => <span key={i}>{String(i * 2).padStart(2, '0')}</span>)}</div>
      {matrix.map((day, d) => <div className="heatmap-row" key={d}><strong>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d]}</strong>{day.map((count, hour) => <div key={hour} className="heat-cell" style={{ background: `rgba(245, 176, 65, ${count ? 0.18 + count / max * 0.72 : 0.04})` }} title={`${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][d]}, ${hour * 2}:00–${hour * 2 + 2}:00 IST: ${count} incidents`}><span>{count || '·'}</span></div>)}</div>)}</div></div>
    <p className="micro">Darker cells contain fewer observations. A lack of reports does not establish safety.</p>
    <h3 className="subheading">Weather in selected records</h3><div className="distribution">{WEATHER.map(w => {
      const count = records.filter(p => p.weather === w).length;
      return <div key={w}><span>{w}</span><div className="bar-track"><div style={{ width: `${count / (records.length || 1) * 100}%` }} /></div><strong>{count}</strong></div>;
    })}</div><p className="micro">Counts are not exposure-adjusted. They cannot establish that weather caused an incident or increased its likelihood.</p>
  </section><section className="panel"><p className="eyebrow">SCENARIO / PHYSICS MODEL</p><h2>Stopping-distance comparison</h2><p className="muted">Explore a simplified level-road model. Friction values are illustrative assumptions.</p>
    <label className="slider-label">Travel speed <strong>{speed} km/h</strong><input type="range" min="0" max="120" step="5" value={speed} onChange={e => setSpeed(Number(e.target.value))} /></label>
    <label className="slider-label">Reaction time <strong>{reaction.toFixed(1)} seconds</strong><input type="range" min="0.5" max="3" step="0.1" value={reaction} onChange={e => setReaction(Number(e.target.value))} /></label>
    <div className="stopping-results">{friction.map(f => { const result = stoppingDistance(speed, f.value, reaction); return <div key={f.name}><div><strong>{f.name}</strong><small>μ = {f.value} · reaction {result.reaction.toFixed(1)} m + braking {result.braking.toFixed(1)} m</small></div><span>{result.total.toFixed(1)}<small>m</small></span></div>; })}</div>
    <div className="formula">d = v × t + v² / (2 × g × μ)</div><p className="micro">v is in m/s; g = 9.81 m/s². This excludes slopes, tires, ABS, standing-water depth and driver variation. It does not provide a safe driving speed.</p>
  </section></div>;
}

function Methods({ onImport, ready, cloud }: { onImport: () => void; ready: boolean; cloud: boolean }) {
  return <div className="methods-grid"><section className="panel prose"><p className="eyebrow">DATA / PROVENANCE</p><h2>Know what you are looking at.</h2>
    <p>The bundled dataset is deterministic, synthetic demonstration data around 18 approximate Bengaluru junctions. Dates, accidents and casualty counts were generated for this project. No record is an official police report.</p>
    <p>Community submissions and imported records remain unverified. Cloud reports are private to their owner's account. This app does not contact police, change signals, dispatch help, or certify safe routes.</p>
    <h3>Bring your own observations</h3><p>Import a CSV with geographic coordinates, timezone-aware timestamps, source attribution and reuse permissions. Data is validated before saving; any invalid row blocks the entire import. Existing IDs are skipped.</p>
    <div className="button-row"><button className="primary" disabled={!ready} onClick={onImport}><ArrowUpFromLine size={15} />Import CSV</button><button onClick={() => download('tracify-template.csv', exportCsv(createSampleIncidents().slice(0, 2)))}><ArrowDownToLine size={15} />Download template</button></div>
    <p className="micro">The template contains two explicitly synthetic examples. Maximum: 2,000 records per workspace; {cloud ? '400' : '2,000'} per import. Exports contain data and attribution, not media.</p>
    <details><summary>CSV column reference</summary><p className="mono csv-columns">{COLUMNS.join(', ')}</p><p>Use ISO timestamps such as 2026-10-20T08:00:00+05:30, decimal coordinates, nonnegative integer casualties, and the category spellings from the template. See README for the complete schema.</p></details>
    <h3>Data protection</h3><p>Local mode stores reports and evidence in IndexedDB on this browser. Export important records: browser data can be cleared. Cloud mode uses verified Firebase authentication and owner-only Firestore and Storage rules. Attachments are limited to 5 MiB and read through authenticated requests.</p>
  </section><section className="panel prose"><p className="eyebrow">METHOD / LIMITS</p><h2>Simple enough to explain.</h2><h3>1. Discover clusters</h3><p>DBSCAN finds dense groups with haversine distance in meters. The minimum count includes the observation itself. Density-connected points can form an elongated cluster; the radius is a neighborhood size, not a maximum cluster diameter. Unclustered points remain visible as noise.</p>
    <h3>2. Prioritize transparently</h3><div className="formula">Index = 35F + 45S + 20R</div><p>F = min((count × 90 / selected days) / 35, 1). S = min(((5 × fatalities + 2 × injuries) / count) / 2.5, 1). R = exp(−0.082 × hours since latest record).</p>
    <p>The reference time is the earlier of now and the end of your selected period. A current-day window updates every minute. The score ranges from 0 to 100; critical starts at 80 and warning at 60. These weights, normalizers and thresholds are design choices, not BTP or IRC calibration.</p>
    <h3>3. Interpret with care</h3><p>This is an exploratory prioritization tool. Unequal reporting, missing coordinates, duplicate source records and different traffic volumes affect results. Short windows can exaggerate annualized frequency. Counts do not adjust for traffic exposure. There is no trained forecast or validated crash probability.</p>
    <p>Sample data demonstrates software behavior, not predictive accuracy. Validate against an independently sourced, licensed dataset before using these rankings to support real interventions.</p>
    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Basemap: OpenStreetMap contributors ↗</a>
  </section></div>;
}
export default function App() { return <AuthProvider><AppContent /></AuthProvider>; }
