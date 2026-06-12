import { useState } from 'react';
import { Navigation } from 'lucide-react';

const APPS = [
  { name: '高德地图', icon: '🗺️', url: (n: string, lat: number, lng: number) => `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(n)}&callnative=1` },
  { name: '百度地图', icon: '📍', url: (n: string, lat: number, lng: number) => `https://api.map.baidu.com/marker?location=${lat},${lng}&title=${encodeURIComponent(n)}&coord_type=gcj02` },
  { name: '腾讯地图', icon: '📌', url: (n: string, lat: number, lng: number) => `https://apis.map.qq.com/uri/v1/marker?marker=coord:${lat},${lng};title:${encodeURIComponent(n)}` },
  { name: 'Apple 地图', icon: '🍎', url: (n: string, lat: number, lng: number) => `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(n)}` },
  { name: 'Google 地图', icon: '🌐', url: (n: string, lat: number, lng: number) => `https://www.google.com/maps?q=${encodeURIComponent(n)}+%40${lat},${lng}` },
];

export function NavMenu({ name, lng, lat }: { name: string; lng: number; lat: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(!open)} className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-500/15 text-brand-400 hover:bg-brand-500/25 transition-all mt-2"><Navigation className="w-3 h-3" />导航</button>
      {open && (<><div className="fixed inset-0 z-40" onClick={() => setOpen(false)} /><div className="absolute bottom-full left-0 mb-1 z-50 bg-stone-900 border border-white/10 rounded-xl shadow-2xl py-1 min-w-[140px]">{APPS.map(app => <a key={app.name} href={app.url(name, lat, lng)} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="block px-3 py-2 text-xs text-stone-300 hover:bg-white/10 transition-colors whitespace-nowrap">{app.icon} {app.name}</a>)}</div></>)}
    </div>
  );
}
