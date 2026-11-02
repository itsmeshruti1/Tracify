import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Maximize2 } from 'lucide-react';
import type { Hotspot, Incident } from '../types/incident';

interface Props { hotspots: Hotspot[]; noise: Incident[]; selected: string | null; radius: number;
  onSelect: (id: string) => void; }
export function RiskMap({ hotspots, noise, selected, radius, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<L.LayerGroup | null>(null);
  const locationLayer = useRef<L.CircleMarker | null>(null);
  const [message, setMessage] = useState('');
  const [locating, setLocating] = useState(false);
  const fit = () => {
    const points = [...hotspots, ...noise].map(p => L.latLng(p.lat, p.lng));
    if (points.length) map.current?.fitBounds(L.latLngBounds(points), { padding: [35, 35], maxZoom: 14, animate: false });
    else map.current?.setView([12.9716, 77.5946], 11);
  };
  useEffect(() => {
    const instance = L.map(container.current!, { scrollWheelZoom: false, maxZoom: 19,
      zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false }).setView([12.9716, 77.5946], 11);
    map.current = instance;
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(instance);
    tiles.on('tileerror', () => setMessage('Basemap unavailable. Incident overlays and the directory still work.'));
    layers.current = L.layerGroup().addTo(instance);
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current!);
    return () => { observer.disconnect(); instance.stop(); instance.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    if (!map.current || !layers.current) return;
    layers.current.clearLayers();
    for (const hotspot of hotspots) {
      const color = hotspot.status === 'CRITICAL' ? '#f87171' : hotspot.status === 'WARNING' ? '#fbbf24' : '#5eead4';
      L.circle([hotspot.lat, hotspot.lng], { radius, color, fillColor: color, fillOpacity: 0.09, weight: 1 }).addTo(layers.current);
      const label = document.createElement('span');
      label.textContent = `${hotspot.name}: ${hotspot.incidents.length} incidents · ${hotspot.score.total}/100`;
      L.circleMarker([hotspot.lat, hotspot.lng], { radius: hotspot.id === selected ? 13 : 9,
        color: hotspot.id === selected ? '#fff' : color, weight: 2, fillColor: color, fillOpacity: 1,
      }).bindTooltip(label).on('click', () => onSelect(hotspot.id)).addTo(layers.current);
    }
    noise.forEach(p => {
      const label = document.createElement('span'); label.textContent = `${p.locationName} · unclustered`;
      L.circleMarker([p.lat, p.lng], { radius: 4, color: '#94a3b8', weight: 1, fillOpacity: 0.7 })
        .bindTooltip(label).addTo(layers.current!);
    });
  }, [hotspots, noise, selected, radius, onSelect]);
  useEffect(fit, [hotspots, noise]);
  useEffect(() => {
    const point = hotspots.find(h => h.id === selected);
    if (point) map.current?.panTo([point.lat, point.lng], { animate: false });
  }, [selected]);
  function locate() {
    if (!navigator.geolocation) { setMessage('This browser does not support location.'); return; }
    setLocating(true); setMessage('');
    navigator.geolocation.getCurrentPosition(position => {
      if (!map.current) return;
      const coords: L.LatLngExpression = [position.coords.latitude, position.coords.longitude];
      locationLayer.current?.remove();
      locationLayer.current = L.circleMarker(coords, { radius: 7, color: '#fff', weight: 3, fillColor: '#3b82f6', fillOpacity: 1 })
        .bindTooltip('Your device location (not saved)').addTo(map.current);
      map.current.setView(coords, 14); setLocating(false);
      setMessage(`Device location accuracy: approximately ${Math.round(position.coords.accuracy)} m. Location is not saved.`);
    }, error => { setMessage(`Location unavailable: ${error.message}`); setLocating(false); }, { timeout: 10000, maximumAge: 60000 });
  }
  return <div className="map-shell">
    <div ref={container} className="risk-map" role="region" aria-label="Incident hotspot map. The ranked directory provides a keyboard-accessible alternative." />
    <div className="map-tools"><button onClick={fit} title="Fit all observations" aria-label="Fit all observations"><Maximize2 size={17} /></button>
      <button onClick={locate} disabled={locating} title="Use my location" aria-label="Use my location"><Crosshair size={17} /></button></div>
    <div className="map-key"><span><i className="dot critical" />Critical</span><span><i className="dot warning" />Warning</span><span><i className="dot monitored" />Monitored</span><span><i className="dot noise" />Noise</span></div>
    {message && <p className="map-message" role="status">{message}<button className="text-button" onClick={() => setMessage('')}>Dismiss</button></p>}
  </div>;
}
