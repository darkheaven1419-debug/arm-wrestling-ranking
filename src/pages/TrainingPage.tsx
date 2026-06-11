import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Plus, X, User, FileText, Upload, Navigation, ChevronDown, ChevronUp, List, Crosshair, Dumbbell, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabase';
import type { TrainingLocation } from '@/types';

// ─── 北京中心 ───
const BEIJING_CENTER: [number, number] = [39.915, 116.404];
const DEFAULT_ZOOM = 12;

// ─── 高德地图瓦片（全中文标注）───
const GAODE_TILE = 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}';

// ─── 每个标记点专属配色 ───
const MARKER_COLORS = [
  ['#f59e0b', '#d97706'],
  ['#ef4444', '#dc2626'],
  ['#8b5cf6', '#7c3aed'],
  ['#06b6d4', '#0891b2'],
  ['#10b981', '#059669'],
  ['#f97316', '#ea580c'],
  ['#ec4899', '#db2777'],
  ['#6366f1', '#4f46e5'],
];

// ─── 方形旋转渐变标记 ───
const createMarkerIcon = (idx: number, active: boolean) => {
  const [c1, c2] = MARKER_COLORS[idx % MARKER_COLORS.length];
  const s = active ? 46 : 38;
  const g = active ? 24 : 10;
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position:relative;width:${s}px;height:${s + 10}px;">
        <div style="
          position:absolute;top:${s / 2 - g / 2}px;left:${s / 2 - g / 2}px;
          width:${g}px;height:${g}px;border-radius:50%;
          background:${c1};opacity:${active ? 0.35 : 0.15};
          animation:pulse-ring 2s ease-out infinite;
        "></div>
        <div style="
          position:absolute;top:0;left:0;width:${s}px;height:${s}px;
          border-radius:${active ? 14 : 12}px;
          background:linear-gradient(135deg,${c1},${c2});
          box-shadow:0 4px ${active ? 20 : 10}px ${c1}${active ? '66' : '33'};
          display:flex;align-items:center;justify-content:center;
          transform:rotate(45deg);
          border:2px solid rgba(255,255,255,${active ? 0.9 : 0.7});
          transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);
        ">
          <span style="
            color:#fff;font-size:${active ? 16 : 13}px;font-weight:800;
            transform:rotate(-45deg);
            text-shadow:0 1px 2px rgba(0,0,0,0.3);
            font-family:system-ui,sans-serif;
          ">${idx + 1}</span>
        </div>
        <div style="
          position:absolute;bottom:0;left:50%;transform:translateX(-50%);
          width:3px;height:10px;background:${c2};border-radius:0 0 2px 2px;
          opacity:${active ? 1 : 0.7};
        "></div>
      </div>`,
    iconSize: [s, s + 10],
    iconAnchor: [s / 2, s + 10],
    popupAnchor: [0, -s - 10],
  });
};

// ─── 地址 → 坐标（Nominatim）───
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`北京${address}`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`);
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    return null;
  } catch { return null; }
}

// ─── 地图飞行 ───
function FlyToController({ loc }: { loc: TrainingLocation | null }) {
  const map = useMap();
  const prevRef = useRef<number | null>(null);
  useEffect(() => {
    if (loc?.latitude && loc?.longitude && loc.id !== prevRef.current) {
      prevRef.current = loc.id;
      map.flyTo([loc.latitude, loc.longitude], 15, { duration: 1.0 });
    }
  }, [loc, map]);
  return null;
}

// ─── 地图标记 ───
function SpotMarker({ loc, index, isActive, onClick }: {
  loc: TrainingLocation; index: number; isActive: boolean; onClick: () => void;
}) {
  const ref = useRef<L.Marker>(null);
  useEffect(() => {
    if (ref.current) { ref.current.setIcon(createMarkerIcon(index, isActive)); if (isActive) ref.current.openPopup(); }
  }, [isActive, index]);
  if (!loc.latitude || !loc.longitude) return null;
  return (
    <Marker ref={ref} position={[loc.latitude, loc.longitude]} icon={createMarkerIcon(index, isActive)} eventHandlers={{ click: onClick }}>
      <Popup maxWidth={260} className="spot-popup">
        <div className="min-w-[180px] font-sans">
          {loc.image_url && <img src={loc.image_url} alt={loc.name} className="w-full h-32 object-cover rounded-lg mb-2.5" />}
          <h3 className="font-bold text-[15px] text-gray-900 mb-1.5">{loc.name}</h3>
          {loc.address && <p className="text-xs text-gray-500 mb-1 flex items-start gap-1"><span className="shrink-0 mt-0.5">📍</span>{loc.address}</p>}
          {loc.contact_person && (
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <User className="w-3 h-3 shrink-0" />{loc.contact_person}
              {loc.contact_phone && <span className="ml-2 flex items-center gap-0.5"><Phone className="w-3 h-3" />{loc.contact_phone}</span>}
            </p>
          )}
          {loc.schedule && <p className="text-xs text-gray-500">🕐 {loc.schedule}</p>}
        </div>
      </Popup>
    </Marker>
  );
}

// ══════════════════════════════════
// 主组件
// ══════════════════════════════════
export function TrainingPage() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState(''); const [address, setAddress] = useState('');
  const [lat, setLat] = useState(''); const [lng, setLng] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null); const [imagePreview, setImagePreview] = useState('');
  const [contactPerson, setContactPerson] = useState(''); const [contactPhone, setContactPhone] = useState('');
  const [schedule, setSchedule] = useState(''); const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeSpot, setActiveSpot] = useState<TrainingLocation | null>(null);
  const [showList, setShowList] = useState(true);
  const [geocoding, setGeocoding] = useState(false);
  const queryClient = useQueryClient();

  const startEdit = (loc: TrainingLocation) => {
    setName(loc.name); setAddress(loc.address || ''); setContactPerson(loc.contact_person || '');
    setContactPhone(loc.contact_phone || ''); setSchedule(loc.schedule || ''); setDescription(loc.description || '');
    setImagePreview(loc.image_url || ''); setEditingId(loc.id);
    setLat(loc.latitude?.toString() || ''); setLng(loc.longitude?.toString() || '');
    setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const resetForm = () => { setName(''); setAddress(''); setContactPerson(''); setContactPhone(''); setSchedule(''); setDescription(''); setImageFile(null); setImagePreview(''); setEditingId(null); setLat(''); setLng(''); setShowForm(false); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; setImageFile(f); setImagePreview(URL.createObjectURL(f)); };
  const handleGeocode = async () => {
    if (!address.trim()) { toast.error('请先填写地址'); return; }
    setGeocoding(true);
    const result = await geocodeAddress(address.trim());
    setGeocoding(false);
    if (result) { setLat(result.lat.toFixed(6)); setLng(result.lng.toFixed(6)); toast.success('已定位！'); }
    else { toast.error('未找到该地址，请手动输入坐标'); }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      try { const { data } = await supabase.from('admin_users').select('role').eq('user_id', session.user.id).maybeSingle(); setIsAdmin(!!data); } catch { setIsAdmin(false); }
    });
  }, []);

  const { data: locations, isLoading } = useQuery({
    queryKey: ['training-locations', isAdmin],
    queryFn: async () => {
      let q = supabase.from('training_locations').select('*').order('created_at', { ascending: false });
      if (!isAdmin) q = q.eq('status', 'approved');
      const { data, error } = await q;
      if (error) throw error; return (data || []) as TrainingLocation[];
    },
  });

  const approveLocation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => { const { error } = await supabase.from('training_locations').update({ status }).eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['training-locations'] }); toast.success('已更新'); },
    onError: () => toast.error('操作失败'),
  });

  const saveLocation = useMutation({
    mutationFn: async () => {
      let imageUrl = (editingId && !imageFile) ? imagePreview : null;
      if (imageFile) {
        setIsUploading(true);
        const ext = imageFile.name.split('.').pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('training-images').upload(path, imageFile);
        if (upErr) throw new Error('图片上传失败');
        const { data: { publicUrl } } = supabase.storage.from('training-images').getPublicUrl(path);
        imageUrl = publicUrl; setIsUploading(false);
      }
      const payload = {
        name: name.trim(), address: address.trim() || null, image_url: imageUrl,
        contact_person: contactPerson.trim() || null, contact_phone: contactPhone.trim() || null,
        schedule: schedule.trim() || null, description: description.trim() || null,
        latitude: lat ? parseFloat(lat) : null, longitude: lng ? parseFloat(lng) : null,
      };
      const { error } = editingId
        ? await supabase.from('training_locations').update(payload).eq('id', editingId)
        : await supabase.from('training_locations').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['training-locations'] }); resetForm(); toast.success(editingId ? '已更新' : '已添加'); },
    onError: (e: Error) => toast.error(e.message || '操作失败'),
  });

  const deleteLocation = useMutation({
    mutationFn: async (id: number) => { const { error } = await supabase.from('training_locations').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['training-locations'] }); toast.success('已删除'); },
    onError: () => toast.error('删除失败'),
  });

  const spotsWithCoords = (locations || []).filter(l => l.latitude && l.longitude);
  const spotsWithoutCoords = (locations || []).filter(l => !l.latitude || !l.longitude);

  const inputCls = "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all";

  return (
    <div className="pt-20 pb-10">
      {/* ═══ 顶栏 ═══ */}
      <div className="max-w-6xl mx-auto px-4 mb-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 transition-colors mb-1">
              <ArrowLeft className="w-3.5 h-3.5" />返回首页
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MapPin className="w-6 h-6 text-brand-400" />
              北京<span className="text-brand-400">集训地图</span>
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">{spotsWithCoords.length} 个点位 · 点击卡片或标记查看详情</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveSpot(null)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-stone-400 hover:text-white hover:bg-white/10 transition-all text-sm"
            ><Navigation className="w-3.5 h-3.5" />重置地图</button>
            {isAdmin && (
              <button onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-semibold text-sm hover:from-brand-400 transition-all"
              ><Plus className="w-4 h-4" />{showForm ? '取消' : '添加地点'}</button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ 表单 ═══ */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="max-w-6xl mx-auto px-4 mb-6 overflow-hidden">
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">{editingId ? '编辑集训地点' : '添加集训地点'}</h3>
              <div className="space-y-4">
                <div><label className="block text-sm text-stone-400 mb-1.5">🏠 地点名称 *</label><input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="如：朝阳区铁腕训练馆" /></div>
                <div><label className="block text-sm text-stone-400 mb-1.5">📍 详细地址</label><input type="text" value={address} onChange={e => setAddress(e.target.value)} className={inputCls} placeholder="如：朝阳区建国路88号SOHO现代城B1" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm text-stone-400 mb-1.5">纬度</label><input type="text" value={lat} onChange={e => setLat(e.target.value)} className={`${inputCls} font-mono text-sm`} placeholder="39.9042" /></div>
                  <div><label className="block text-sm text-stone-400 mb-1.5">经度</label><input type="text" value={lng} onChange={e => setLng(e.target.value)} className={`${inputCls} font-mono text-sm`} placeholder="116.4074" /></div>
                </div>
                <button type="button" onClick={handleGeocode} disabled={geocoding || !address.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-stone-300 text-sm hover:bg-white/10 transition-all disabled:opacity-40"
                ><Crosshair className={`w-4 h-4 ${geocoding ? 'animate-spin' : ''}`} />{geocoding ? '定位中...' : '📍 根据地址自动获取坐标'}</button>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm text-stone-400 mb-1.5">👤 负责人/教练</label><input type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)} className={inputCls} placeholder="如：张教练" /></div>
                  <div><label className="block text-sm text-stone-400 mb-1.5">📞 联系电话</label><input type="text" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className={inputCls} placeholder="方便联系咨询" /></div>
                </div>
                <div><label className="block text-sm text-stone-400 mb-1.5">🕐 训练时间</label><input type="text" value={schedule} onChange={e => setSchedule(e.target.value)} className={inputCls} placeholder="如：每周二四六 19:00-22:00" /></div>
                <div>
                  <label className="block text-sm text-stone-400 mb-1.5">🖼️ 场地照片</label>
                  {imagePreview ? (
                    <div className="relative mb-2"><img src={imagePreview} alt="预览" className="w-full h-40 object-cover rounded-xl" /><button onClick={() => { setImageFile(null); setImagePreview(''); }} className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80"><X className="w-4 h-4" /></button></div>
                  ) : null}
                  <label className="flex items-center justify-center gap-2 px-4 py-8 rounded-xl bg-white/5 border-2 border-dashed border-white/10 cursor-pointer hover:border-brand-500/30 hover:bg-white/[0.07] transition-all text-stone-500 hover:text-stone-300">
                    <Upload className="w-5 h-5" />点击上传照片
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
                <div><label className="block text-sm text-stone-400 mb-1.5">📝 简介</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={`${inputCls} resize-none`} placeholder="场地环境、器材、训练氛围..." /></div>
                <button onClick={() => saveLocation.mutate()} disabled={!name.trim() || isUploading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-bold hover:from-brand-400 transition-all disabled:opacity-50">
                  {isUploading ? '上传中...' : editingId ? '保存修改' : '添加集训地点'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ 地图 ═══ */}
      <div className="max-w-6xl mx-auto px-4 mb-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl overflow-hidden relative border border-white/5">
          {isLoading ? (
            <div className="h-[500px] flex items-center justify-center">
              <span className="w-8 h-8 border-2 border-stone-600 border-t-stone-300 rounded-full animate-spin" />
            </div>
          ) : (
            <MapContainer center={BEIJING_CENTER} zoom={DEFAULT_ZOOM} className="h-[500px] w-full z-0" zoomControl={false} attributionControl={false}>
              <TileLayer url={GAODE_TILE} subdomains={['1', '2', '3', '4']} />
              <FlyToController loc={activeSpot} />
              {spotsWithCoords.map((loc, i) => (
                <SpotMarker key={loc.id} loc={loc} index={i} isActive={activeSpot?.id === loc.id} onClick={() => setActiveSpot(loc)} />
              ))}
            </MapContainer>
          )}
          {/* 图例 */}
          <div className="absolute bottom-4 left-4 z-[1000] flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-900/85 backdrop-blur-sm border border-white/10 text-xs text-stone-300">
            <div className="flex -space-x-1">
              {spotsWithCoords.slice(0, 4).map((_, i) => (
                <div key={i} className="w-4 h-4 rounded rotate-45 border border-white/20"
                  style={{ background: `linear-gradient(135deg,${MARKER_COLORS[i][0]},${MARKER_COLORS[i][1]})` }} />
              ))}
            </div>
            <span>{spotsWithCoords.length} 个集训点</span>
            {spotsWithoutCoords.length > 0 && isAdmin && <span className="text-amber-400">· {spotsWithoutCoords.length} 个待标注</span>}
          </div>
        </motion.div>
      </div>

      {/* ═══ 集训点列表 ═══ */}
      <div className="max-w-6xl mx-auto px-4">
        <button onClick={() => setShowList(!showList)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-stone-400 hover:text-white hover:bg-white/10 transition-all text-sm mb-4">
          <List className="w-4 h-4" />
          全部集训点 ({locations?.length || 0})
          {showList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {showList && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              {locations && locations.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {locations.map((loc, i) => {
                    const spotIdx = spotsWithCoords.findIndex(s => s.id === loc.id);
                    const hasCoords = loc.latitude && loc.longitude;
                    const isActive = activeSpot?.id === loc.id;
                    return (
                      <motion.div key={loc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className={`glass rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] group ${isActive ? 'ring-2 ring-brand-500/60 shadow-lg shadow-brand-500/10' : 'hover:border-white/10'}`}
                        onClick={() => { if (hasCoords) { setActiveSpot(loc); window.scrollTo({ top: 250, behavior: 'smooth' }); } }}>
                        <div className="relative">
                          {loc.image_url ? (
                            <img src={loc.image_url} alt={loc.name} className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-40 bg-white/[0.03] flex items-center justify-center"><Dumbbell className="w-12 h-12 text-stone-800" /></div>
                          )}
                          {hasCoords && (
                            <div className="absolute top-3 left-3 w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-lg"
                              style={{ background: `linear-gradient(135deg,${MARKER_COLORS[spotIdx][0]},${MARKER_COLORS[spotIdx][1]})` }}>
                              {spotIdx + 1}
                            </div>
                          )}
                          {!hasCoords && isAdmin && (
                            <div className="absolute top-3 left-3 px-2 py-0.5 rounded-lg bg-amber-500/90 text-black text-[10px] font-bold">未标注</div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="text-base font-bold text-white mb-1.5 flex items-center gap-2">
                            {loc.name}
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />}
                          </h3>
                          {loc.address && <p className="text-xs text-stone-400 mb-1 flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 shrink-0" />{loc.address}</p>}
                          {loc.schedule && <p className="text-xs text-stone-500 mb-1">🕐 {loc.schedule}</p>}
                          {loc.contact_person && <p className="text-xs text-stone-500 mb-1 flex items-center gap-1"><User className="w-3 h-3" />{loc.contact_person}{loc.contact_phone && <span className="ml-1.5 text-stone-600">📞 {loc.contact_phone}</span>}</p>}
                          {loc.description && <p className="text-xs text-stone-500 mt-2 line-clamp-2 leading-relaxed"><FileText className="w-3 h-3 inline mr-1 opacity-60" />{loc.description}</p>}
                          {loc.status === 'pending' && isAdmin && (
                            <div className="flex gap-2 mt-3">
                              <button onClick={(e) => { e.stopPropagation(); approveLocation.mutate({ id: loc.id, status: 'approved' }); }} disabled={approveLocation.isPending} className="text-xs px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-all">✓ 通过</button>
                              <button onClick={(e) => { e.stopPropagation(); approveLocation.mutate({ id: loc.id, status: 'rejected' }); }} disabled={approveLocation.isPending} className="text-xs px-3 py-1 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-all">✕ 拒绝</button>
                            </div>
                          )}
                          {isAdmin && (
                            <div className="flex gap-3 mt-3 pt-3 border-t border-white/5">
                              <button onClick={(e) => { e.stopPropagation(); startEdit(loc); }} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">✏️ 编辑</button>
                              <button onClick={(e) => { e.stopPropagation(); deleteLocation.mutate(loc.id); }} disabled={deleteLocation.isPending} className="text-xs text-red-400 hover:text-red-300 transition-colors"><X className="w-3 h-3 inline" /> 删除</button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 glass rounded-3xl">
                  <Dumbbell className="w-16 h-16 text-stone-800 mx-auto mb-4" />
                  <h2 className="text-lg font-semibold text-stone-400 mb-1">暂无集训地点</h2>
                  <p className="text-stone-600 text-sm">管理员添加后将显示在这里</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 脉冲动画 */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.5); opacity: 0.5; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .spot-popup .leaflet-popup-content-wrapper {
          border-radius: 14px; padding: 4px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.35);
        }
        .spot-popup .leaflet-popup-content { margin: 10px 12px; }
        .spot-popup .leaflet-popup-tip { box-shadow: none; }
        .custom-marker { background: transparent !important; border: none !important; }
      `}</style>
    </div>
  );
}
