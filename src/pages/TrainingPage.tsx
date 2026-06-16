import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Plus, X, User, FileText, Upload, Navigation, ChevronDown, ChevronUp, Dumbbell, Search, Target, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabase';
import { searchPlaces, type SearchResult } from '@/lib/geocode';
import { compressImage } from '@/lib/image';
import { LikeButton } from '@/components/LikeButton';
import { CommentSection } from '@/components/CommentSection';
import type { TrainingLocation, ArmEvent } from '@/types';

const BEIJING_CENTER: [number, number] = [39.915, 116.404];
const DEFAULT_ZOOM = 12;
const GAODE_TILE = 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}';

const MARKER_COLORS = [
  ['#f59e0b','#d97706'],['#ef4444','#dc2626'],['#8b5cf6','#7c3aed'],
  ['#06b6d4','#0891b2'],['#10b981','#059669'],['#f97316','#ea580c'],
  ['#ec4899','#db2777'],['#6366f1','#4f46e5'],
];

// ─── 集训点标记（渐变圆点 + 定位锚点）───
const createMarkerIcon = (idx: number, active: boolean) => {
  const [c1, c2] = MARKER_COLORS[idx % MARKER_COLORS.length];
  const size = active ? 42 : 34;
  const inner = active ? 28 : 22;
  const fontSize = active ? 14 : 11;
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4));">
        <div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:linear-gradient(145deg,${c1},${c2});
          display:flex;align-items:center;justify-content:center;
          border:3px solid #fff;
          box-shadow:0 2px 12px ${c1}44;
          transition:all 0.25s ease;
          ${active ? `animation:marker-bob 0.6s ease;` : ''}
        ">
          <div style="
            width:${inner}px;height:${inner}px;border-radius:50%;
            background:rgba(255,255,255,0.92);
            display:flex;align-items:center;justify-content:center;
          ">
            <span style="
              color:${c2};font-size:${fontSize}px;font-weight:800;
              font-family:system-ui,-apple-system,sans-serif;
              line-height:1;
            ">${idx + 1}</span>
          </div>
        </div>
        <div style="
          width:${active ? 8 : 6}px;height:${active ? 8 : 6}px;border-radius:50%;
          background:${c2};margin-top:1px;
          box-shadow:0 1px 3px rgba(0,0,0,0.3);
        "></div>
      </div>`,
    iconSize: [size + 8, size + 16],
    iconAnchor: [(size + 8) / 2, size + 16],
    popupAnchor: [0, -(size + 16)],
  });
};

// ─── 选址标记（红色脉冲圆点）───
const createPickerIcon = () => L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 2px 8px rgba(239,68,68,0.5));">
      <div style="
        width:28px;height:28px;border-radius:50%;
        background:#ef4444;border:3px solid #fff;
        box-shadow:0 0 0 8px rgba(239,68,68,0.25);
        animation:picker-pulse 1.6s ease-out infinite;
        display:flex;align-items:center;justify-content:center;
      ">
        <div style="width:8px;height:8px;border-radius:50%;background:#fff;"></div>
      </div>
      <div style="
        width:5px;height:5px;border-radius:50%;
        background:#dc2626;margin-top:1px;
      "></div>
    </div>`,
  iconSize: [36, 40],
  iconAnchor: [18, 40],
  popupAnchor: [0, -40],
});

// ─── 地图点击选址 ───
function MapClickHandler({ enabled, onPick }: { enabled: boolean; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { if (enabled) onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

// ─── 飞行控制 ───
function FlyToController({ loc }: { loc: TrainingLocation | null }) {
  const map = useMap();
  const prev = useRef<number | null>(null);
  useEffect(() => { if (loc?.latitude && loc?.longitude && loc.id !== prev.current) { prev.current = loc.id; map.flyTo([loc.latitude, loc.longitude], 15, { duration: 1.0 }); } }, [loc, map]);
  return null;
}

// ─── 搜索控制器 ───
function SearchController({ target }: { target: [number, number] | null }) {
  const map = useMap();
  const prev = useRef<string>('');
  useEffect(() => {
    if (target) {
      const key = `${target[0]},${target[1]}`;
      if (key !== prev.current) { prev.current = key; map.flyTo(target, 16, { duration: 0.8 }); }
    }
  }, [target, map]);
  return null;
}

// ─── 集训点标记 ───
function SpotMarker({ loc, index, isActive, onClick }: { loc: TrainingLocation; index: number; isActive: boolean; onClick: () => void }) {
  const ref = useRef<L.Marker>(null);
  useEffect(() => { if (ref.current) { ref.current.setIcon(createMarkerIcon(index, isActive)); if (isActive) ref.current.openPopup(); } }, [isActive, index]);
  if (!loc.latitude || !loc.longitude) return null;
  return (
    <Marker ref={ref} position={[loc.latitude, loc.longitude]} icon={createMarkerIcon(index, isActive)} eventHandlers={{ click: onClick }}>
      <Popup maxWidth={260} className="spot-popup">
        <div className="min-w-[180px] font-sans">
          {loc.image_url && <img loading="lazy" src={loc.image_url} alt={loc.name} className="w-full h-32 object-cover rounded-lg mb-2.5" />}
          <h3 className="font-bold text-[15px] text-gray-900 mb-1.5">{loc.name}</h3>
          {loc.address && <p className="text-xs text-gray-500 mb-1">📍 {loc.address}</p>}
          {loc.contact_person && <p className="text-xs text-gray-500 mb-1">👤 {loc.contact_person}{loc.contact_phone ? ` · ${loc.contact_phone}` : ''}</p>}
          {loc.schedule && <p className="text-xs text-gray-500">🕐 {loc.schedule}</p>}
          {loc.organization && <p className="text-xs text-gray-500">🏛️ {loc.organization}</p>}
          <div className="mt-2" onClick={e => e.stopPropagation()}>
            <NavMenu name={loc.name} lng={loc.longitude!} lat={loc.latitude!} />
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// ─── 导航菜单 ───
const NAV_APPS = [
  { name: '高德地图', icon: '🗺️', url: (n: string, lat: number, lng: number) => `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(n)}&callnative=1` },
  { name: '百度地图', icon: '📍', url: (n: string, lat: number, lng: number) => `https://api.map.baidu.com/marker?location=${lat},${lng}&title=${encodeURIComponent(n)}&coord_type=gcj02` },
  { name: '腾讯地图', icon: '📌', url: (n: string, lat: number, lng: number) => `https://apis.map.qq.com/uri/v1/marker?marker=coord:${lat},${lng};title:${encodeURIComponent(n)}` },
  { name: 'Apple 地图', icon: '🍎', url: (n: string, lat: number, lng: number) => `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(n)}` },
  { name: 'Google 地图', icon: '🌐', url: (n: string, lat: number, lng: number) => `https://www.google.com/maps?q=${encodeURIComponent(n)}+%40${lat},${lng}` },
];

function NavMenu({ name, lng, lat }: { name: string; lng: number; lat: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-500/15 text-brand-400 hover:bg-brand-500/25 transition-all"
      ><Navigation className="w-3 h-3" />导航</button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute bottom-full left-0 mb-1 z-50 bg-stone-900 border border-white/10 rounded-xl shadow-2xl py-1 min-w-[140px]">
            {NAV_APPS.map(app => (
              <a key={app.name} href={app.url(name, lat, lng)} target="_blank" rel="noopener noreferrer"
                onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                className="block px-3 py-2 text-xs text-stone-300 hover:bg-white/10 transition-colors whitespace-nowrap"
              >{app.icon} {app.name}</a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════
// 主组件
// ═══════════════════════════════════
export function TrainingPage() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState(''); const [address, setAddress] = useState('');
  const [lat, setLat] = useState(''); const [lng, setLng] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [contactPerson, setContactPerson] = useState(''); const [contactPhone, setContactPhone] = useState('');
  const [schedule, setSchedule] = useState(''); const [tableCount, setTableCount] = useState('');
  const [description, setDescription] = useState('');
  const [organization, setOrganization] = useState(''); const [customOrg, setCustomOrg] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeSpot, setActiveSpot] = useState<TrainingLocation | null>(null);
  const [showList, setShowList] = useState(true);
  const [listTab, setListTab] = useState<'training' | 'events'>('training');

  // 选址相关状态
  const [pickerPos, setPickerPos] = useState<[number, number] | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const queryClient = useQueryClient();

  const startEdit = (loc: TrainingLocation) => {
    setName(loc.name); setAddress(loc.address || ''); setContactPerson(loc.contact_person || '');
    setContactPhone(loc.contact_phone || ''); setSchedule(loc.schedule || ''); setTableCount(loc.table_count?.toString() || '');
    setDescription(loc.description || '');
    setExistingImages(loc.images?.length ? loc.images : (loc.image_url ? [loc.image_url] : []));
    setCoverIndex(loc.cover_index ?? 0); setEditingId(loc.id);
    const hasCoords = loc.latitude && loc.longitude;
    setLat(loc.latitude?.toString() || ''); setLng(loc.longitude?.toString() || '');
    const org = loc.organization || '';
    const presets = ['斗腕超力嗨', '世界华人腕力协会', '个人'];
    setOrganization(presets.includes(org) ? org : (org ? '自定义' : ''));
    setCustomOrg(presets.includes(org) ? '' : org);
    setPickerPos(hasCoords ? [loc.latitude!, loc.longitude!] : null);
    setShowForm(true); setSearchQ(''); setSearchResults([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const resetForm = () => { setName(''); setAddress(''); setContactPerson(''); setContactPhone(''); setSchedule(''); setTableCount(''); setDescription(''); setOrganization(''); setCustomOrg(''); setImageFiles([]); setImagePreviews([]); setExistingImages([]); setCoverIndex(0); setEditingId(null); setLat(''); setLng(''); setShowForm(false); setPickerPos(null); setSearchQ(''); setSearchResults([]); setSearchError(''); setIsUploading(false); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setImageFiles(prev => [...prev, ...files]);
    setImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };
  const removeNewImage = (i: number) => {
    setImageFiles(prev => prev.filter((_, j) => j !== i));
    setImagePreviews(prev => prev.filter((_, j) => j !== i));
  };
  const removeExistingImage = (i: number) => {
    setExistingImages(prev => prev.filter((_, j) => j !== i));
    if (coverIndex >= existingImages.length - 1) setCoverIndex(Math.max(0, existingImages.length - 2));
  };

  // 点击地图选址
  const handleMapPick = useCallback((newLat: number, newLng: number) => {
    setLat(newLat.toFixed(6)); setLng(newLng.toFixed(6));
    setPickerPos([newLat, newLng]);
    toast.success(`已选位置：${newLat.toFixed(4)}, ${newLng.toFixed(4)}`);
  }, []);

  // 搜索地点
  const handleSearch = useCallback((q: string) => {
    setSearchQ(q);
    setSearchError('');
    clearTimeout(searchTimer.current);
    if (q.length < 2) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const { results, error } = await searchPlaces(q);
      setSearchResults(results);
      setSearchError(error || (results.length === 0 && q.length >= 2 ? '未找到匹配地点' : ''));
      setSearching(false);
    }, 400);
  }, []);

  // 选中搜索结果
  const handleSearchPick = (r: SearchResult) => {
    setLat(r.lat.toFixed(6)); setLng(r.lng.toFixed(6));
    setPickerPos([r.lat, r.lng]);
    setSearchQ(r.name);
    setSearchResults([]);
    toast.success(`已定位：${r.name}`);
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

  const { data: events } = useQuery({
    queryKey: ['training-page-events'],
    queryFn: async () => { const { data } = await supabase.from('events').select('*').order('event_date', { ascending: true }); return (data || []) as ArmEvent[]; },
  });

  const saveLocation = useMutation({
    mutationFn: async () => {
      setIsUploading(true);
      try {
        // Upload all new images
        const uploadedUrls: string[] = [];
        for (const file of imageFiles) {
          const compressed = await compressImage(file);
          const ext = 'jpg';
          const path = `training/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: upErr } = await supabase.storage.from('training-images').upload(path, compressed);
          if (upErr) throw new Error(`图片 ${file.name} 上传失败: ${upErr.message}`);
          const { data: { publicUrl } } = supabase.storage.from('training-images').getPublicUrl(path);
          uploadedUrls.push(publicUrl);
        }
        // Merge existing + new
        const allImages = [...existingImages, ...uploadedUrls];
        const imageUrl = allImages.length > 0 ? allImages[coverIndex] || allImages[0] : null;
        const payload = {
          name: name.trim(), address: address.trim() || null,
          image_url: imageUrl,
          images: allImages.length > 0 ? allImages : null,
          cover_index: allImages.length > 0 ? coverIndex : 0,
          contact_person: contactPerson.trim() || null, contact_phone: contactPhone.trim() || null,
          schedule: schedule.trim() || null, table_count: tableCount ? parseInt(tableCount) : null,
          description: description.trim() || null,
          organization: organization === '自定义' ? (customOrg.trim() || '自定义') : (organization || null),
          latitude: lat ? parseFloat(lat) : null, longitude: lng ? parseFloat(lng) : null,
        };
        const { error } = editingId
          ? await supabase.from('training_locations').update(payload).eq('id', editingId)
          : await supabase.from('training_locations').insert({ ...payload, status: 'approved' });
        if (error) throw error;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['training-locations'] }); resetForm(); toast.success(editingId ? '已更新' : '已添加'); },
    onError: (e: Error) => { setIsUploading(false); toast.error(e.message || '操作失败'); },
  });

  const deleteLocation = useMutation({
    mutationFn: async (id: number) => { const { error } = await supabase.from('training_locations').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['training-locations'] }); toast.success('已删除'); },
    onError: () => toast.error('删除失败'),
  });

  const spotsWithCoords = (locations || []).filter(l => l.latitude && l.longitude);
  const spotsWithoutCoords = (locations || []).filter(l => !l.latitude || !l.longitude);
  const eventsOnMap = (events || []).filter(e => e.latitude && e.longitude);
  const pickerHasCoords = pickerPos !== null;
  const evtMarkerIcon = L.divIcon({ className: 'custom-marker', html: '<div style="width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,#ef4444,#dc2626);border:2px solid #fff;box-shadow:0 2px 10px rgba(239,68,68,0.35);display:flex;align-items:center;justify-content:center;font-size:12px;">📅</div>', iconSize: [26,26], iconAnchor: [13,13], popupAnchor: [0,-13] });
  const iCls = "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all";

  return (
    <div className="pt-20 pb-10">
      {/* ═══ 顶栏 ═══ */}
      <div className="max-w-6xl mx-auto px-4 mb-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 transition-colors mb-1"><ArrowLeft className="w-3.5 h-3.5" />返回首页</Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2"><MapPin className="w-6 h-6 text-brand-400" />北京<span className="text-brand-400">腕力地图</span></h1>
            <p className="text-xs text-stone-500 mt-0.5">{spotsWithCoords.length} 集训点 · {eventsOnMap.length} 赛事 · 点击标记查看详情</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveSpot(null)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-stone-400 hover:text-white hover:bg-white/10 transition-all text-sm"><Navigation className="w-3.5 h-3.5" />重置地图</button>
            {isAdmin && (
              <button onClick={() => { if (showForm) resetForm(); else { setShowForm(true); setPickerPos(null); } }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-semibold text-sm hover:from-brand-400 transition-all"><Plus className="w-4 h-4" />{showForm ? '取消' : '添加地点'}</button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ 表单 ═══ */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="max-w-6xl mx-auto px-4 mb-6 overflow-hidden">
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">{editingId ? '编辑集训地点' : '添加集训地点'}</h3>
              <div className="space-y-4">
                <div><label className="block text-sm text-stone-400 mb-1.5">🏠 地点名称 *</label><input type="text" value={name} onChange={e => setName(e.target.value)} className={iCls} placeholder="如：朝阳区铁腕训练馆" /></div>
                <div><label className="block text-sm text-stone-400 mb-1.5">📍 详细地址</label><input type="text" value={address} onChange={e => setAddress(e.target.value)} className={iCls} placeholder="如：朝阳区建国路88号SOHO现代城B1" /></div>

                {/* ── 搜索 + 地图选址 ── */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                  <p className="text-sm text-stone-300 font-semibold flex items-center gap-2"><Target className="w-4 h-4 text-brand-400" />在地图上定位</p>

                  {/* 搜索框 */}
                  <div className="relative">
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus-within:border-brand-500/50 transition-all">
                      <Search className="w-4 h-4 text-stone-500 shrink-0" />
                      <input type="text" value={searchQ}
                        onChange={e => handleSearch(e.target.value)}
                        className="flex-1 bg-transparent text-white text-sm placeholder-stone-600 focus:outline-none"
                        placeholder="搜索地点（如：乐刻健身、北京联合大学）…"
                      />
                      {searching && <span className="w-4 h-4 border-2 border-stone-600 border-t-stone-300 rounded-full animate-spin shrink-0" />}
                    </div>
                    {/* 搜索结果 */}
                    {searchResults.length > 0 && (
                      <div className="absolute top-full mt-1 left-0 right-0 z-[2000] bg-stone-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                        {searchResults.map((r, i) => (
                          <button key={i} onClick={() => handleSearchPick(r)}
                            className="w-full px-4 py-3 text-left text-sm text-stone-300 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0 flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                            <span className="truncate">{r.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {/* 无结果提示 */}
                    {searchError && !searching && (
                      <div className="mt-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                        {searchError}
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-brand-500/8 border border-brand-500/15">
                    <Target className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-white font-semibold mb-0.5">推荐：直接在地图上点击</p>
                      <p className="text-xs text-stone-400">高德地图上所有街道、小区、商铺都看得清清楚楚。放大地图找到位置，<b className="text-brand-400">点一下</b>即可标注。</p>
                    </div>
                  </div>

                  <p className="text-xs text-stone-500">
                    当前选中：
                    {pickerHasCoords ? (
                      <span className="text-emerald-400 ml-1 font-mono">{pickerPos![0].toFixed(5)}, {pickerPos![1].toFixed(5)}</span>
                    ) : <span className="text-stone-600 ml-1">未选择</span>}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm text-stone-400 mb-1.5">纬度</label><input type="text" value={lat} onChange={e => { setLat(e.target.value); const n = parseFloat(e.target.value); if (!isNaN(n) && lng) setPickerPos([n, parseFloat(lng)]); }} className={`${iCls} font-mono text-sm`} placeholder="39.9042" /></div>
                  <div><label className="block text-sm text-stone-400 mb-1.5">经度</label><input type="text" value={lng} onChange={e => { setLng(e.target.value); const n = parseFloat(e.target.value); if (!isNaN(n) && lat) setPickerPos([parseFloat(lat), n]); }} className={`${iCls} font-mono text-sm`} placeholder="116.4074" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm text-stone-400 mb-1.5">👤 负责人/教练</label><input type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)} className={iCls} placeholder="如：张教练" /></div>
                  <div><label className="block text-sm text-stone-400 mb-1.5">📞 联系电话</label><input type="text" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className={iCls} placeholder="方便联系咨询" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm text-stone-400 mb-1.5">🕐 训练时间</label><input type="text" value={schedule} onChange={e => setSchedule(e.target.value)} className={iCls} placeholder="如：每周二四六 19:00-22:00" /></div>
                  <div><label className="block text-sm text-stone-400 mb-1.5">🏓 桌子数量</label><input type="number" min="0" value={tableCount} onChange={e => setTableCount(e.target.value)} className={iCls} placeholder="如：3" /></div>
                </div>
                <div>
                  <label className="block text-sm text-stone-400 mb-1.5">🏛️ 所属组织</label>
                  <select value={organization} onChange={e => { setOrganization(e.target.value); if (e.target.value !== '自定义') setCustomOrg(''); }}
                    className="w-full px-4 py-3 rounded-xl bg-stone-900 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500/50 transition-all appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23999' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '2.5rem' }}
                  >
                    <option value="" className="bg-stone-900 text-stone-400">选择组织（选填）</option>
                    <option value="斗腕超力嗨" className="bg-stone-900 text-white">💪 斗腕超力嗨</option>
                    <option value="世界华人腕力协会" className="bg-stone-900 text-white">🌏 世界华人腕力协会</option>
                    <option value="个人" className="bg-stone-900 text-white">🧑 个人</option>
                    <option value="自定义" className="bg-stone-900 text-white">✏️ 自定义</option>
                  </select>
                  {organization === '自定义' && (
                    <input type="text" value={customOrg} onChange={e => setCustomOrg(e.target.value)} className={iCls + " mt-2"} placeholder="输入你的组织名称" />
                  )}
                </div>
                <div>
                  <label className="block text-sm text-stone-400 mb-1.5">🖼️ 场地照片（支持多张，可设封面）</label>
                  {([...existingImages, ...imagePreviews]).length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                      {existingImages.map((url, i) => (
                        <div key={`e-${i}`} className={`relative rounded-xl overflow-hidden group ${coverIndex === i ? 'ring-2 ring-brand-500' : ''}`}>
                          <img loading="lazy" src={url} alt="" className="w-full h-28 object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                            {coverIndex !== i && <button type="button" onClick={() => setCoverIndex(i)} className="px-2 py-1 rounded-lg bg-brand-500 text-black text-xs font-semibold">设为封面</button>}
                            {coverIndex === i && <span className="px-2 py-1 rounded-lg bg-brand-500/80 text-black text-xs font-semibold">★ 封面</span>}
                            <button type="button" onClick={() => removeExistingImage(i)} className="p-1 rounded-lg bg-red-500 text-white"><X className="w-3 h-3" /></button>
                          </div>
                        </div>
                      ))}
                      {imagePreviews.map((url, i) => (
                        <div key={`n-${i}`} className={`relative rounded-xl overflow-hidden group ${coverIndex === existingImages.length + i ? 'ring-2 ring-brand-500' : ''}`}>
                          <img loading="lazy" src={url} alt="" className="w-full h-28 object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                            {coverIndex !== existingImages.length + i && <button type="button" onClick={() => setCoverIndex(existingImages.length + i)} className="px-2 py-1 rounded-lg bg-brand-500 text-black text-xs font-semibold">设为封面</button>}
                            {coverIndex === existingImages.length + i && <span className="px-2 py-1 rounded-lg bg-brand-500/80 text-black text-xs font-semibold">★ 封面</span>}
                            <button type="button" onClick={() => removeNewImage(i)} className="p-1 rounded-lg bg-red-500 text-white"><X className="w-3 h-3" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="flex items-center justify-center gap-2 px-4 py-8 rounded-xl bg-white/5 border-2 border-dashed border-white/10 cursor-pointer hover:border-brand-500/30 hover:bg-white/[0.07] transition-all text-stone-500 hover:text-stone-300"><Upload className="w-5 h-5" />点击上传照片（可多选）<input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" /></label>
                </div>
                <div><label className="block text-sm text-stone-400 mb-1.5">📝 简介</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className={`${iCls} resize-none`} placeholder="场地环境、器材、训练氛围..." /></div>
                <button onClick={() => saveLocation.mutate()} disabled={!name.trim() || isUploading} className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-bold hover:from-brand-400 transition-all disabled:opacity-50">{isUploading ? '上传中...' : editingId ? '保存修改' : '添加集训地点'}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ 地图 ═══ */}
      <div className="max-w-6xl mx-auto px-4 mb-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl overflow-hidden relative border border-white/5">
          {isLoading ? (
            <div className="h-[520px] flex items-center justify-center"><span className="w-8 h-8 border-2 border-stone-600 border-t-stone-300 rounded-full animate-spin" /></div>
          ) : (
            <MapContainer center={BEIJING_CENTER} zoom={DEFAULT_ZOOM} className="h-[520px] w-full z-0" zoomControl={false} attributionControl={false}>
              <TileLayer url={GAODE_TILE} subdomains={['1','2','3','4']} />
              <FlyToController loc={activeSpot} />
              <SearchController target={pickerPos} />
              <MapClickHandler enabled={showForm} onPick={handleMapPick} />
              {spotsWithCoords.map((loc, i) => (
                <SpotMarker key={loc.id} loc={loc} index={i} isActive={activeSpot?.id === loc.id} onClick={() => setActiveSpot(loc)} />
              ))}
              {eventsOnMap.map(evt => (
                <Marker key={`e${evt.id}`} position={[evt.latitude!, evt.longitude!]} icon={evtMarkerIcon}>
                  <Popup maxWidth={220}><div className="min-w-[140px]"><h3 className="font-bold text-sm text-gray-900">{evt.title}</h3><p className="text-xs text-gray-500 mt-1">📅 {evt.event_date}</p>{evt.location && <p className="text-xs text-gray-500">📍 {evt.location}</p>}</div></Popup>
                </Marker>
              ))}
              {/* 选址标记 */}
              {pickerHasCoords && <Marker position={pickerPos!} icon={createPickerIcon()} zIndexOffset={1000} />}
            </MapContainer>
          )}

          {/* 提示条 */}
          {showForm && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] px-5 py-2.5 rounded-full bg-brand-500/90 backdrop-blur text-black text-sm font-semibold shadow-lg pointer-events-none flex items-center gap-2">
              <Target className="w-4 h-4" />点击地图选择位置
            </div>
          )}

          {/* 图例 */}
          <div className="absolute bottom-4 left-4 z-[1000] flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-900/85 backdrop-blur-sm border border-white/10 text-xs text-stone-300">
            <div className="flex -space-x-1">
              {spotsWithCoords.slice(0, 4).map((_, i) => (
                <div key={i} className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ background: `linear-gradient(145deg,${MARKER_COLORS[i][0]},${MARKER_COLORS[i][1]})` }} />
              ))}
            </div>
            <span>{spotsWithCoords.length} 个集训点</span>
            {spotsWithoutCoords.length > 0 && isAdmin && <span className="text-amber-400">· {spotsWithoutCoords.length} 个待标注</span>}
          </div>
        </motion.div>
      </div>

      {/* ═══ 列表：集训 / 赛事&活动 标签切换 ═══ */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex gap-2 mb-4">
          <button onClick={() => { setListTab('training'); setShowList(true); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${listTab === 'training' ? 'bg-white/10 text-white' : 'bg-white/5 text-stone-500 hover:text-stone-300'}`}>
            <Dumbbell className="w-4 h-4 inline mr-1.5" />全部集训点 ({locations?.length || 0})
          </button>
          <button onClick={() => { setListTab('events'); setShowList(true); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${listTab === 'events' ? 'bg-white/10 text-white' : 'bg-white/5 text-stone-500 hover:text-stone-300'}`}>
            <Calendar className="w-4 h-4 inline mr-1.5" />赛事 & 活动 ({(events || []).length})
          </button>
          <button onClick={() => setShowList(!showList)} className="ml-auto px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-stone-400 hover:text-white text-sm transition-all">
            {showList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
        <AnimatePresence>
          {showList && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              {listTab === 'training' && (locations && locations.length > 0 ? (
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
                            <div className="relative">
                              <img loading="lazy" src={loc.image_url} alt={loc.name} className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500" />
                              {(loc.images?.length || 0) > 1 && (
                                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/70 text-white text-[10px] font-semibold">{loc.images!.length} 张</span>
                              )}
                            </div>
                          ) : <div className="w-full h-40 bg-white/[0.03] flex items-center justify-center"><Dumbbell className="w-12 h-12 text-stone-800" /></div>}
                          {hasCoords && (
                            <div className="absolute top-3 left-3 w-3 h-3 rounded-full border-2 border-white/80 shadow-lg"
                              style={{ background: `linear-gradient(145deg,${MARKER_COLORS[spotIdx][0]},${MARKER_COLORS[spotIdx][1]})` }} />
                          )}
                          {!hasCoords && isAdmin && <div className="absolute top-3 left-3 px-2 py-0.5 rounded-lg bg-amber-500/90 text-black text-[10px] font-bold">未标注</div>}
                        </div>
                        <div className="p-4">
                          <h3 className="text-base font-bold text-white mb-1.5 flex items-center gap-2">{loc.name}{isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />}</h3>
                          {loc.address && <p className="text-xs text-stone-400 mb-1 flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 shrink-0" />{loc.address}</p>}
                          {loc.schedule && <p className="text-xs text-stone-500 mb-1">🕐 {loc.schedule}</p>}
                          {(loc.table_count != null) && <p className="text-xs text-stone-500 mb-1">🏓 {loc.table_count} 张桌子</p>}
                          {loc.organization && <p className="text-xs text-stone-500 mb-1">🏛️ {loc.organization}</p>}
                          {loc.contact_person && <p className="text-xs text-stone-500 mb-1 flex items-center gap-1"><User className="w-3 h-3" />{loc.contact_person}{loc.contact_phone && <span className="ml-1.5 text-stone-600">📞 {loc.contact_phone}</span>}</p>}
                          {loc.description && <p className="text-xs text-stone-500 mt-2 line-clamp-2 leading-relaxed"><FileText className="w-3 h-3 inline mr-1 opacity-60" />{loc.description}</p>}
                          <div className="mt-2 pt-2" onClick={e => e.stopPropagation()}>
                            <LikeButton targetType="training_location" targetId={loc.id} />
                          </div>
                          <div className="mt-1" onClick={e => e.stopPropagation()}>
                            <CommentSection targetType="training_location" targetId={loc.id} />
                          </div>
                          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
                            {hasCoords && <NavMenu name={loc.name} lng={loc.longitude!} lat={loc.latitude!} />}
                            {isAdmin && (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); startEdit(loc); }} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">✏️ 编辑</button>
                                <button onClick={(e) => { e.stopPropagation(); deleteLocation.mutate(loc.id); }} disabled={deleteLocation.isPending} className="text-xs text-red-400 hover:text-red-300 transition-colors"><X className="w-3 h-3 inline" /> 删除</button>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 glass rounded-3xl"><Dumbbell className="w-16 h-16 text-stone-800 mx-auto mb-4" /><h2 className="text-lg font-semibold text-stone-400 mb-1">暂无集训地点</h2><p className="text-stone-600 text-sm">管理员添加后将显示在这里</p></div>
              ))}
              {listTab === 'events' && ((events || []).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(events || []).map((evt, i) => (
                    <motion.div key={evt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="glass rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] group">
                      {evt.poster_url ? <div className="relative h-32 overflow-hidden"><img loading="lazy" src={evt.poster_url} alt={evt.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /><div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent" /></div> : null}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-base font-bold text-white truncate flex-1">{evt.title}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ml-2 ${new Date(evt.event_date) >= new Date() ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-500/20 text-stone-400'}`}>{new Date(evt.event_date) >= new Date() ? '即将' : '结束'}</span>
                        </div>
                        {evt.location && <p className="text-xs text-stone-400 mb-1">📍 {evt.location}</p>}
                        <p className="text-xs text-stone-500 mb-1">📅 {new Date(evt.event_date).toLocaleDateString('zh-CN')}</p>
                        {evt.weight_classes && <p className="text-xs text-stone-500 mb-2">{evt.weight_classes.join(' · ')}</p>}
                        {evt.registration_fee && <p className="text-xs text-amber-400 mb-1">💰 {evt.registration_fee}</p>}
                        {evt.contact_person && <p className="text-xs text-stone-500 mb-2">👤 {evt.contact_person}</p>}
                        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                          <div onClick={e => e.stopPropagation()}><LikeButton targetType="event" targetId={evt.id} /></div>
                        </div>
                        <div className="mt-1"><CommentSection targetType="event" targetId={evt.id} /></div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 glass rounded-3xl"><Calendar className="w-16 h-16 text-stone-800 mx-auto mb-4" /><h2 className="text-lg font-semibold text-stone-400 mb-1">暂无赛事活动</h2><p className="text-stone-600 text-sm">管理员添加后将显示在这里</p></div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes pulse-ring { 0% { transform: scale(0.5); opacity: 0.5; } 100% { transform: scale(2.5); opacity: 0; } }
        @keyframes marker-bob { 0% { transform: translateY(0); } 50% { transform: translateY(-6px); } 100% { transform: translateY(0); } }
        @keyframes picker-pulse { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.45); } 70% { box-shadow: 0 0 0 16px rgba(239,68,68,0); } 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); } }
        .spot-popup .leaflet-popup-content-wrapper { border-radius: 14px; padding: 4px; box-shadow: 0 8px 32px rgba(0,0,0,0.35); }
        .spot-popup .leaflet-popup-content { margin: 10px 12px; }
        .spot-popup .leaflet-popup-tip { box-shadow: none; }
        .custom-marker { background: transparent !important; border: none !important; }
      `}</style>
    </div>
  );
}
