import { useRef, useEffect } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { TrainingLocation } from '@/types';

const COLORS = [['#f59e0b','#d97706'],['#ef4444','#dc2626'],['#8b5cf6','#7c3aed'],['#06b6d4','#0891b2'],['#10b981','#059669'],['#f97316','#ea580c'],['#ec4899','#db2777'],['#6366f1','#4f46e5']];

const createIcon = (idx: number, active: boolean) => {
  const [c1, c2] = COLORS[idx % COLORS.length]; const s = active ? 42 : 34; const inner = active ? 28 : 22; const fs = active ? 14 : 11;
  return L.divIcon({ className: 'custom-marker', html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4));"><div style="width:${s}px;height:${s}px;border-radius:50%;background:linear-gradient(145deg,${c1},${c2});display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 12px ${c1}44;transition:all 0.25s ease;${active?'animation:marker-bob 0.6s ease;':''}"><div style="width:${inner}px;height:${inner}px;border-radius:50%;background:rgba(255,255,255,0.92);display:flex;align-items:center;justify-content:center;"><span style="color:${c2};font-size:${fs}px;font-weight:800;font-family:system-ui,sans-serif;line-height:1;">${idx+1}</span></div></div><div style="width:${active?8:6}px;height:${active?8:6}px;border-radius:50%;background:${c2};margin-top:1px;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div></div>`, iconSize: [s+8, s+16], iconAnchor: [(s+8)/2, s+16], popupAnchor: [0, -(s+16)] });
};

export function SpotMarker({ loc, index, isActive, onClick }: { loc: TrainingLocation; index: number; isActive: boolean; onClick: () => void }) {
  const ref = useRef<L.Marker>(null);
  useEffect(() => { if (ref.current) { ref.current.setIcon(createIcon(index, isActive)); if (isActive) ref.current.openPopup(); } }, [isActive, index]);
  if (!loc.latitude || !loc.longitude) return null;
  return <Marker ref={ref} position={[loc.latitude, loc.longitude]} icon={createIcon(index, isActive)} eventHandlers={{ click: onClick }}><Popup maxWidth={260} className="spot-popup"><div className="min-w-[180px] font-sans">{loc.image_url && <img loading="lazy" src={loc.image_url} alt={loc.name} className="w-full h-32 object-cover rounded-lg mb-2.5" />}<h3 className="font-bold text-[15px] text-gray-900 mb-1.5">{loc.name}</h3>{loc.address && <p className="text-xs text-gray-500 mb-1">📍 {loc.address}</p>}{loc.schedule && <p className="text-xs text-gray-500 mb-1">🕐 {loc.schedule}</p>}{(loc.table_count != null) && <p className="text-xs text-gray-500 mb-1">🏓 {loc.table_count} 张桌子</p>}{loc.organization && <p className="text-xs text-gray-500 mb-1">🏛️ {loc.organization}</p>}</div></Popup></Marker>;
}
