import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Navigation, ChevronDown, ChevronUp, Dumbbell, Calendar, Layers } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabase';
import type { TrainingLocation, ArmEvent } from '@/types';
import { NavMenu } from '@/components/map/NavMenu';
import { SpotMarker } from '@/components/map/SpotMarker';

const BEIJING: [number, number] = [39.915, 116.404];
const GAODE = 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}';
const evtIcon = L.divIcon({ className: 'custom-marker', html: '<div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#ef4444,#dc2626);border:2px solid #fff;box-shadow:0 2px 10px rgba(239,68,68,0.35);display:flex;align-items:center;justify-content:center;font-size:13px;">📅</div>', iconSize: [28,28], iconAnchor: [14,14], popupAnchor: [0,-14] });

type Filter = '全部' | '集训' | '赛事';

function FlyTo({ lat, lng, id }: { lat: number | null; lng: number | null; id: string }) {
  const map = useMap(); const prev = useRef('');
  useEffect(() => { if (lat && lng) { const k = `${lat},${lng},${id}`; if (k !== prev.current) { prev.current = k; map.flyTo([lat, lng], 15, { duration: 1 }); } } }, [lat, lng, id, map]);
  return null;
}

export function MapPage() {
  const [filter, setFilter] = useState<Filter>('全部');
  const [activeId, setActiveId] = useState('');
  const [showTraining, setShowTraining] = useState(true);
  const [showEvents, setShowEvents] = useState(true);

  const { data: spots } = useQuery({ queryKey: ['map-spots'], queryFn: async () => { const { data } = await supabase.from('training_locations').select('*').eq('status','approved').order('created_at',{ascending:false}); return (data||[]) as TrainingLocation[]; } });
  const { data: events } = useQuery({ queryKey: ['map-events'], queryFn: async () => { const { data } = await supabase.from('events').select('*').order('event_date',{ascending:true}); return (data||[]) as ArmEvent[]; } });

  const spotsOnMap = (spots||[]).filter(s => s.latitude && s.longitude);
  const eventsOnMap = (events||[]).filter(e => e.latitude && e.longitude);
  const activeSpot = activeId?.startsWith('s') ? spotsOnMap.find(s => `s${s.id}` === activeId) : null;
  const activeEvent = activeId?.startsWith('e') ? eventsOnMap.find(e => `e${e.id}` === activeId) : null;
  const flyLat = activeSpot?.latitude ?? activeEvent?.latitude ?? null;
  const flyLng = activeSpot?.longitude ?? activeEvent?.longitude ?? null;
  const showSpots = filter === '全部' || filter === '集训';
  const showEvts = filter === '全部' || filter === '赛事';

  return (
    <div className="pt-20 pb-10">
      <div className="max-w-6xl mx-auto px-4 mb-4">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 mb-1"><ArrowLeft className="w-3.5 h-3.5"/>返回首页</Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><MapPin className="w-6 h-6 text-brand-400"/>北京<span className="text-brand-400">腕力地图</span></h1>
        <p className="text-xs text-stone-500 mt-0.5">{spotsOnMap.length} 集训点 · {eventsOnMap.length} 赛事 · 点击切换查看</p>
      </div>

      {/* Toggle */}
      <div className="max-w-6xl mx-auto px-4 mb-4 flex gap-2">
        {(['全部','集训','赛事'] as Filter[]).map(f => (
          <button key={f} onClick={() => { setFilter(f); setActiveId(''); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${filter===f?'bg-white/10 text-white':'text-stone-500 hover:text-stone-300 bg-white/5'}`}>
            {f==='全部'?<Layers className="w-4 h-4 inline mr-1.5"/>:f==='集训'?<Dumbbell className="w-4 h-4 inline mr-1.5"/>:<Calendar className="w-4 h-4 inline mr-1.5"/>}{f}
          </button>
        ))}
        <button onClick={()=>setActiveId('')} className="ml-auto px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-stone-400 hover:text-white text-sm transition-all"><Navigation className="w-3.5 h-3.5"/></button>
      </div>

      {/* Map */}
      <div className="max-w-6xl mx-auto px-4 mb-5">
        <div className="glass rounded-2xl overflow-hidden relative h-[480px]">
          <MapContainer center={BEIJING} zoom={12} className="h-full w-full z-0" zoomControl={false} attributionControl={false}>
            <TileLayer url={GAODE} subdomains={['1','2','3','4']}/>
            <FlyTo lat={flyLat} lng={flyLng} id={activeId}/>
            {showSpots && spotsOnMap.map((s,i) => <SpotMarker key={`s${s.id}`} loc={s} index={i} isActive={activeId===`s${s.id}`} onClick={()=>setActiveId(`s${s.id}`)}/>)}
            {showEvts && eventsOnMap.map(evt => (
              <Marker key={`e${evt.id}`} position={[evt.latitude!,evt.longitude!]} icon={evtIcon} eventHandlers={{click:()=>setActiveId(`e${evt.id}`)}}>
                <Popup maxWidth={240}><div className="min-w-[150px]"><h3 className="font-bold text-sm text-gray-900">{evt.title}</h3><p className="text-xs text-gray-500 mt-1">📅 {evt.event_date}</p>{evt.location&&<p className="text-xs text-gray-500">📍 {evt.location}</p>}</div></Popup>
              </Marker>
            ))}
          </MapContainer>
          <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-900/85 backdrop-blur-sm border border-white/10 text-xs text-stone-300">
            <span className="w-3 h-3 rounded-full bg-amber-400"/>集训 <span className="w-3 h-3 rounded-lg bg-red-500 ml-2"/>赛事
          </div>
        </div>
      </div>

      {/* Lists */}
      <div className="max-w-6xl mx-auto px-4 space-y-4">
        {[{ key: 'training', label: '集训点', count: spotsOnMap.length, icon: Dumbbell, color: 'text-amber-400', show: showTraining, setShow: setShowTraining, data: spots||[], type: 's' } as const,
          { key: 'events', label: '赛事', count: eventsOnMap.length, icon: Calendar, color: 'text-red-400', show: showEvents, setShow: setShowEvents, data: events||[], type: 'e' } as const].map(section => (
          <div key={section.key}>
            <button onClick={() => section.setShow(!section.show)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-stone-400 hover:text-white text-sm w-full transition-all">
              <section.icon className={`w-4 h-4 ${section.color}`}/>{section.label} ({section.count}){section.show ? <ChevronUp className="w-4 h-4 ml-auto"/> : <ChevronDown className="w-4 h-4 ml-auto"/>}
            </button>
            <AnimatePresence>
              {section.show && (
                <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="overflow-hidden mt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {section.data.map((item: any) => {
                      const hasPos = item.latitude && item.longitude;
                      const id = `${section.type}${item.id}`;
                      const isTraining = section.type === 's';
                      return (
                        <div key={id} onClick={() => { if (hasPos) { setFilter(isTraining?'集训':'赛事'); setActiveId(id); window.scrollTo({top:200,behavior:'smooth'}); } }}
                          className={`glass rounded-xl p-4 cursor-pointer hover:scale-[1.01] transition-all ${activeId===id?'ring-2 '+(isTraining?'ring-brand-500/50':'ring-red-500/50'):''}`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <section.icon className={`w-4 h-4 ${section.color} shrink-0`}/>
                            <h3 className="text-sm font-bold text-white truncate">{isTraining?item.name:item.title}</h3>
                            {!hasPos && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 shrink-0">无坐标</span>}
                            {isTraining && item.table_count != null && <span className="text-xs text-stone-500">🏓{item.table_count}桌</span>}
                            {!isTraining && <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${new Date(item.event_date)>=new Date()?'bg-emerald-500/20 text-emerald-400':'bg-stone-500/20 text-stone-400'}`}>{new Date(item.event_date)>=new Date()?'即将':'结束'}</span>}
                          </div>
                          <p className="text-xs text-stone-400 truncate">📍 {isTraining?(item.address||'未填地址'):(item.location||'未填地址')}</p>
                          {isTraining && item.schedule && <p className="text-xs text-stone-500">🕐 {item.schedule}</p>}
                          {isTraining && item.organization && <p className="text-xs text-stone-500">🏛️ {item.organization}</p>}
                          {!isTraining && <p className="text-xs text-stone-500">📅 {item.event_date}</p>}
                          {isTraining && hasPos && <NavMenu name={item.name} lng={item.longitude!} lat={item.latitude!}/>}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <style>{`.spot-popup .leaflet-popup-content-wrapper{border-radius:14px;padding:4px;box-shadow:0 8px 32px rgba(0,0,0,0.35)}.spot-popup .leaflet-popup-content{margin:10px 12px}.spot-popup .leaflet-popup-tip{box-shadow:none}.custom-marker{background:transparent!important;border:none!important}`}</style>
    </div>
  );
}
