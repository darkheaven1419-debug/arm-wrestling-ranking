import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Navigation, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Dumbbell, Calendar, Layers, X, Pencil } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import toast from 'react-hot-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabase';
import type { TrainingLocation, ArmEvent } from '@/types';
import { NavMenu } from '@/components/map/NavMenu';
import { SpotMarker } from '@/components/map/SpotMarker';

const BEIJING: [number, number] = [39.915, 116.404];
const GAODE = 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}';
const evtIcon = L.divIcon({ className: 'custom-marker', html: '<div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#ef4444,#dc2626);border:2px solid #fff;box-shadow:0 2px 10px rgba(239,68,68,0.35);display:flex;align-items:center;justify-content:center;font-size:13px;">📅</div>', iconSize: [28,28], iconAnchor: [14,14], popupAnchor: [0,-14] });

type Filter = '全部' | '集训' | '赛事&活动';

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      try { const { data } = await supabase.from('admin_users').select('role').eq('user_id', session.user.id).maybeSingle(); setIsAdmin(!!data); } catch { setIsAdmin(false); }
    });
  }, []);

  const { data: spots } = useQuery({ queryKey: ['map-spots'], queryFn: async () => { const { data } = await supabase.from('training_locations').select('*').eq('status','approved').order('created_at',{ascending:false}); return (data||[]) as TrainingLocation[]; } });
  const { data: events } = useQuery({ queryKey: ['map-events'], queryFn: async () => { const { data } = await supabase.from('events').select('*').order('event_date',{ascending:true}); return (data||[]) as ArmEvent[]; } });

  const deleteEvent = useMutation({ mutationFn: async (id: number) => { const { error } = await supabase.from('events').delete().eq('id', id); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['map-events'] }); toast.success('已删除'); } });
  const deleteSpot = useMutation({ mutationFn: async (id: number) => { const { error } = await supabase.from('training_locations').delete().eq('id', id); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['map-spots'] }); toast.success('已删除'); } });

  // ─── 解析集训日程（中文星期 → JS 星期数字 0=周日…6=周六）───
  const parseScheduleDays = (schedule: string | null | undefined): number[] => {
    if (!schedule) return [];
    const s = schedule.replace(/\s+/g, '');
    if (/每天|每日/.test(s)) return [0, 1, 2, 3, 4, 5, 6];
    if (/周一至周五|周一至五|工作日/.test(s)) return [1, 2, 3, 4, 5];
    if (/周末|周六日|周六周日/.test(s)) return [6, 0];
    const days: number[] = [];
    const map: Record<string, number> = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 };
    // Match 周一/星期二/周三… patterns
    for (const [ch, d] of Object.entries(map)) {
      if (new RegExp(`周${ch}`).test(s) || new RegExp(`星期${ch}`).test(s)) days.push(d);
    }
    return [...new Set(days)].sort();
  };

  // ─── 构建日期 → 赛事 映射 ───
  const eventDateMap = new Map<string, ArmEvent[]>();
  for (const evt of (events || [])) {
    if (!evt.event_date) continue;
    const arr = eventDateMap.get(evt.event_date) || [];
    arr.push(evt);
    eventDateMap.set(evt.event_date, arr);
  }

  // ─── 构建日期 → 集训点 映射（按日程推算当月每一天）───
  const trainingDateMap = new Map<string, TrainingLocation[]>();
  const year = calYear; const month = calMonth;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (const loc of (spots || [])) {
    const dow = parseScheduleDays(loc.schedule);
    if (dow.length === 0) continue;
    for (let d = 1; d <= daysInMonth; d++) {
      const jsDow = new Date(year, month, d).getDay(); // 0=Sun
      if (dow.includes(jsDow)) {
        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const arr = trainingDateMap.get(key) || [];
        arr.push(loc);
        trainingDateMap.set(key, arr);
      }
    }
  }

  // ─── 当月日期网格 ───
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const today = new Date().toISOString().split('T')[0];
  const calendarDays: { key: string; day: number; isToday: boolean; isOtherMonth: boolean; hasEvent: boolean; hasTraining: boolean; items: (ArmEvent | TrainingLocation)[] }[] = [];
  // 填充上月末尾
  const prevMonthDays = new Date(year, month, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // 周一开头
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = month === 0 ? 12 : month;
    const y = month === 0 ? year - 1 : year;
    const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ key, day: d, isToday: key === today, isOtherMonth: true, hasEvent: eventDateMap.has(key), hasTraining: trainingDateMap.has(key), items: [...(eventDateMap.get(key) || []), ...(trainingDateMap.get(key) || [])] });
  }
  // 当月
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ key, day: d, isToday: key === today, isOtherMonth: false, hasEvent: eventDateMap.has(key), hasTraining: trainingDateMap.has(key), items: [...(eventDateMap.get(key) || []), ...(trainingDateMap.get(key) || [])] });
  }
  // 填充下月开头（凑满整行）
  const remaining = 7 - (calendarDays.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 1 : month + 2;
      const y = month === 11 ? year + 1 : year;
      const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      calendarDays.push({ key, day: d, isToday: key === today, isOtherMonth: true, hasEvent: eventDateMap.has(key), hasTraining: trainingDateMap.has(key), items: [...(eventDateMap.get(key) || []), ...(trainingDateMap.get(key) || [])] });
    }
  }

  // ─── 选中日期的项目列表 ───
  const selectedItems = selectedDate ? [...(eventDateMap.get(selectedDate) || []), ...(trainingDateMap.get(selectedDate) || [])] : [];

  const spotsOnMap = (spots||[]).filter(s => s.latitude && s.longitude);
  const eventsOnMap = (events||[]).filter(e => e.latitude && e.longitude);
  const totalSpots = (spots||[]).length;
  const totalEvents = (events||[]).length;
  const activeSpot = activeId?.startsWith('s') ? spotsOnMap.find(s => `s${s.id}` === activeId) : null;
  const activeEvent = activeId?.startsWith('e') ? eventsOnMap.find(e => `e${e.id}` === activeId) : null;
  const flyLat = activeSpot?.latitude ?? activeEvent?.latitude ?? null;
  const flyLng = activeSpot?.longitude ?? activeEvent?.longitude ?? null;
  const showSpots = filter === '全部' || filter === '集训';
  const showEvts = filter === '全部' || filter === '赛事&活动';

  return (
    <div className="pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 mb-4">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 mb-1"><ArrowLeft className="w-3.5 h-3.5"/>返回首页</Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><MapPin className="w-6 h-6 text-brand-400"/>北京<span className="text-brand-400">腕力地图</span></h1>
        <p className="text-xs text-stone-500 mt-0.5">{totalSpots} 集训点 · {totalEvents} 赛事&活动 · 点击切换查看</p>
      </div>

      {/* ─── 双栏布局：日历侧栏 + 地图/列表 ─── */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* ═══ 日历侧栏 ═══ */}
          <div className="lg:w-[340px] shrink-0">
            <div className="glass rounded-2xl p-4">
              {/* 日历标题 + 月份切换 */}
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); setSelectedDate(null); }}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-stone-400 hover:text-white transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                <h3 className="text-white font-bold text-sm">{calYear}年{calMonth + 1}月</h3>
                <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); setSelectedDate(null); }}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-stone-400 hover:text-white transition-colors"><ChevronRight className="w-4 h-4" /></button>
              </div>
              {/* 星期头 */}
              <div className="grid grid-cols-7 mb-1">
                {['一','二','三','四','五','六','日'].map(w => (
                  <div key={w} className="text-center text-[10px] text-stone-500 font-semibold py-1">{w}</div>
                ))}
              </div>
              {/* 日期网格 */}
              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map(cd => (
                  <button key={cd.key} onClick={() => { if (!cd.isOtherMonth) setSelectedDate(selectedDate === cd.key ? null : cd.key); }}
                    className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all
                      ${cd.isOtherMonth ? 'text-stone-700 cursor-default' : cd.isToday ? 'bg-brand-500/20 text-brand-400 font-bold ring-1 ring-brand-500/40' : 'text-stone-400 hover:bg-white/5 hover:text-white'}
                      ${selectedDate === cd.key && !cd.isOtherMonth ? 'ring-2 ring-brand-500 bg-brand-500/10' : ''}`}>
                    <span className="leading-none">{cd.day}</span>
                    {/* 标记点 */}
                    {!cd.isOtherMonth && (cd.hasEvent || cd.hasTraining) && (
                      <div className="flex gap-0.5 mt-0.5">
                        {cd.hasTraining && <span className="w-1 h-1 rounded-full bg-amber-400" />}
                        {cd.hasEvent && <span className="w-1 h-1 rounded-full bg-red-400" />}
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {/* 图例 */}
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5 text-[10px] text-stone-500">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />集训日</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />赛事日</span>
              </div>
            </div>

            {/* ── 选中日期的详情 ── */}
            <AnimatePresence>
              {selectedDate && selectedItems.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-3">
                  <div className="glass rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-white">{selectedDate} · {selectedItems.length} 项活动</h4>
                      <button onClick={() => setSelectedDate(null)} className="text-stone-500 hover:text-stone-300"><X className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {selectedItems.map((item: any, i: number) => {
                        const isTraining = 'schedule' in item || 'table_count' in item;
                        const hasPos = item.latitude && item.longitude;
                        return (
                          <div key={i} onClick={() => { if (hasPos) { setFilter(isTraining ? '集训' : '赛事&活动'); setActiveId(`${isTraining ? 's' : 'e'}${item.id}`); window.scrollTo({ top: 200, behavior: 'smooth' }); } }}
                            className="rounded-xl bg-white/5 p-3 cursor-pointer hover:bg-white/10 transition-colors border border-white/5">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${isTraining ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{isTraining ? '集训' : '赛事'}</span>
                              <span className="text-white text-sm font-semibold truncate">{isTraining ? item.name : item.title}</span>
                            </div>
                            <p className="text-xs text-stone-400 mt-1">📍 {isTraining ? (item.address || '未填地址') : (item.location || '未填地址')}</p>
                            {isTraining && item.schedule && <p className="text-xs text-stone-500 mt-0.5">🕐 {item.schedule}</p>}
                            {!isTraining && <p className="text-xs text-stone-500 mt-0.5">📅 {item.event_date}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ═══ 主内容区：筛选 + 地图 + 列表 ═══ */}
          <div className="flex-1 min-w-0">
            <div className="flex gap-2 mb-4">
              {(['全部','集训','赛事&活动'] as Filter[]).map(f => (
                <button key={f} onClick={() => { setFilter(f); setActiveId(''); }} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${filter===f?'bg-white/10 text-white':'text-stone-500 hover:text-stone-300 bg-white/5'}`}>
                  {f==='全部'?<Layers className="w-4 h-4 inline mr-1.5"/>:f==='集训'?<Dumbbell className="w-4 h-4 inline mr-1.5"/>:<Calendar className="w-4 h-4 inline mr-1.5"/>}{f}
                </button>
              ))}
              <button onClick={()=>setActiveId('')} className="ml-auto px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-stone-400 hover:text-white text-sm transition-all"><Navigation className="w-3.5 h-3.5"/></button>
            </div>

            <div className="mb-5">
              <div className="glass rounded-2xl overflow-hidden relative h-[480px]">
                <MapContainer center={BEIJING} zoom={12} className="h-full w-full z-0" zoomControl={false} attributionControl={false}>
                  <TileLayer url={GAODE} subdomains={['1','2','3','4']}/>
                  <FlyTo lat={flyLat} lng={flyLng} id={activeId}/>
                  {showSpots && spotsOnMap.map((s,i) => <SpotMarker key={`s${s.id}`} loc={s} index={i} isActive={activeId===`s${s.id}`} onClick={()=>setActiveId(`s${s.id}`)}/>)}
                  {showEvts && eventsOnMap.map(evt => <Marker key={`e${evt.id}`} position={[evt.latitude!,evt.longitude!]} icon={evtIcon} eventHandlers={{click:()=>setActiveId(`e${evt.id}`)}}><Popup maxWidth={240}><div className="min-w-[150px]"><h3 className="font-bold text-sm text-gray-900">{evt.title}</h3><p className="text-xs text-gray-500 mt-1">📅 {evt.event_date}</p>{evt.location&&<p className="text-xs text-gray-500">📍 {evt.location}</p>}</div></Popup></Marker>)}
                </MapContainer>
                <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-900/85 backdrop-blur-sm border border-white/10 text-xs text-stone-300"><span className="w-3 h-3 rounded-full bg-amber-400"/>集训 <span className="w-3 h-3 rounded-lg bg-red-500 ml-2"/>赛事&活动</div>
              </div>
            </div>

            <div className="space-y-4">
              {[{ key: 'training', label: '集训点', count: totalSpots, icon: Dumbbell, color: 'text-amber-400', show: showTraining, setShow: setShowTraining, data: spots||[], type: 's' },
                { key: 'events', label: '赛事&活动', count: totalEvents, icon: Calendar, color: 'text-red-400', show: showEvents, setShow: setShowEvents, data: events||[], type: 'e' }].map(section => (
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
                              <div key={id} onClick={() => { if (hasPos) { setFilter(isTraining?'集训':'赛事&活动'); setActiveId(id); window.scrollTo({top:200,behavior:'smooth'}); } }}
                                className={`glass rounded-xl p-4 cursor-pointer hover:scale-[1.01] transition-all ${activeId===id?'ring-2 '+(isTraining?'ring-brand-500/50':'ring-red-500/50'):''}`}>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <section.icon className={`w-4 h-4 ${section.color} shrink-0`}/>
                                  <h3 className="text-sm font-bold text-white truncate flex-1">{isTraining?item.name:item.title}</h3>
                                  {!hasPos && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 shrink-0">无坐标</span>}
                                  {isTraining && item.table_count != null && <span className="text-xs text-stone-500">🏓{item.table_count}桌</span>}
                                  {!isTraining && <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${new Date(item.event_date)>=new Date()?'bg-emerald-500/20 text-emerald-400':'bg-stone-500/20 text-stone-400'}`}>{new Date(item.event_date)>=new Date()?'即将':'结束'}</span>}
                                </div>
                                <p className="text-xs text-stone-400 truncate">📍 {isTraining?(item.address||'未填地址'):(item.location||'未填地址')}</p>
                                {isTraining && item.schedule && <p className="text-xs text-stone-500">🕐 {item.schedule}</p>}
                                {isTraining && item.organization && <p className="text-xs text-stone-500">🏛️ {item.organization}</p>}
                                {!isTraining && <p className="text-xs text-stone-500">📅 {item.event_date}</p>}
                                {isTraining && hasPos && <NavMenu name={item.name} lng={item.longitude!} lat={item.latitude!}/>}
                                {isAdmin && (
                                  <div className="flex gap-2 mt-2 pt-2 border-t border-white/5" onClick={e => e.stopPropagation()}>
                                    <Link to={isTraining?'/training':'/admin?tab=events'} className="text-xs text-blue-400 hover:text-blue-300"><Pencil className="w-3 h-3 inline"/> 编辑</Link>
                                    <button onClick={() => { if (confirm(`确定删除？`)) isTraining ? deleteSpot.mutate(item.id) : deleteEvent.mutate(item.id); }} className="text-xs text-red-400 hover:text-red-300"><X className="w-3 h-3 inline"/> 删除</button>
                                  </div>
                                )}
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
          </div>
        </div>
      </div>

      <style>{`.spot-popup .leaflet-popup-content-wrapper{border-radius:14px;padding:4px;box-shadow:0 8px 32px rgba(0,0,0,0.35)}.spot-popup .leaflet-popup-content{margin:10px 12px}.spot-popup .leaflet-popup-tip{box-shadow:none}.custom-marker{background:transparent!important;border:none!important}`}</style>
    </div>
  );
}
