import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Plus, X, Image, User, FileText, Upload, Navigation, ChevronDown, ChevronUp, List, Crosshair } from 'lucide-react';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabase';
import type { TrainingLocation } from '@/types';

// ─── Beijing center ───
const BEIJING_CENTER: [number, number] = [39.9042, 116.4074];
const DEFAULT_ZOOM = 12;

// ─── Custom dumbbell marker icon ───
const createMarkerIcon = (isActive: boolean) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width:${isActive ? 44 : 36}px;height:${isActive ? 44 : 36}px;
      background:${isActive ? 'linear-gradient(135deg,#f97316,#ef4444)' : 'linear-gradient(135deg,#f59e0b,#d97706)'};
      border-radius:50%;display:flex;align-items:center;justify-content:center;
      box-shadow:0 0 ${isActive ? 20 : 12}px ${isActive ? 'rgba(249,115,22,0.6)' : 'rgba(245,158,11,0.4)'};
      border:2px solid #fff;transition:all 0.3s ease;cursor:pointer;
      font-size:${isActive ? 20 : 16}px;
    ">💪</div>`,
    iconSize: [isActive ? 44 : 36, isActive ? 44 : 36],
    iconAnchor: [isActive ? 22 : 18, isActive ? 22 : 18],
    popupAnchor: [0, isActive ? -22 : -18],
  });

// ─── Geocode: address → coordinates ───
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = encodeURIComponent(`北京${address}`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Fly-to controller ───
function FlyToController({ loc }: { loc: TrainingLocation | null }) {
  const map = useMap();
  const prevRef = useRef<number | null>(null);
  useEffect(() => {
    if (loc?.latitude && loc?.longitude && loc.id !== prevRef.current) {
      prevRef.current = loc.id;
      map.flyTo([loc.latitude, loc.longitude], 15, { duration: 1.2 });
    }
  }, [loc, map]);
  return null;
}

// ─── Marker component ───
function SpotMarker({ loc, isActive, onClick }: { loc: TrainingLocation; isActive: boolean; onClick: () => void }) {
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setIcon(createMarkerIcon(isActive));
      if (isActive) markerRef.current.openPopup();
    }
  }, [isActive]);

  if (!loc.latitude || !loc.longitude) return null;

  return (
    <Marker
      ref={markerRef}
      position={[loc.latitude, loc.longitude]}
      icon={createMarkerIcon(isActive)}
      eventHandlers={{ click: onClick }}
    >
      <Popup maxWidth={280} className="spot-popup">
        <div className="min-w-[200px]">
          {loc.image_url && (
            <img src={loc.image_url} alt={loc.name} className="w-full h-28 object-cover rounded-lg mb-2" />
          )}
          <h3 className="font-bold text-base text-stone-900 mb-1">{loc.name}</h3>
          {loc.address && <p className="text-xs text-stone-500 mb-1">📍 {loc.address}</p>}
          {loc.contact_person && <p className="text-xs text-stone-500 mb-1">👤 {loc.contact_person}{loc.contact_phone ? ` · ${loc.contact_phone}` : ''}</p>}
          {loc.schedule && <p className="text-xs text-stone-500">🕐 {loc.schedule}</p>}
        </div>
      </Popup>
    </Marker>
  );
}

// ─── Main component ───
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
    setShowForm(true);
  };
  const resetForm = () => { setName(''); setAddress(''); setContactPerson(''); setContactPhone(''); setSchedule(''); setDescription(''); setImageFile(null); setImagePreview(''); setEditingId(null); setLat(''); setLng(''); setShowForm(false); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setImageFile(f); setImagePreview(URL.createObjectURL(f));
  };

  const handleGeocode = async () => {
    if (!address.trim()) { toast.error('请先填写地址'); return; }
    setGeocoding(true);
    const result = await geocodeAddress(address.trim());
    setGeocoding(false);
    if (result) {
      setLat(result.lat.toFixed(6)); setLng(result.lng.toFixed(6));
      toast.success('已定位！请确认坐标是否准确');
    } else {
      toast.error('未能定位该地址，请手动输入坐标');
    }
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

  return (
    <div className="pt-20 pb-10 px-0">
      {/* ─── Header bar ─── */}
      <div className="max-w-5xl mx-auto px-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 transition-colors mb-1">
              <ArrowLeft className="w-4 h-4" />返回首页
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MapPin className="w-6 h-6 text-brand-400" />北京集训地图
            </h1>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <button
                onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-semibold text-sm hover:from-brand-400 transition-all"
              >
                <Plus className="w-4 h-4" />{showForm ? '取消' : '添加地点'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Form ─── */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="max-w-5xl mx-auto px-4 mb-6 overflow-hidden">
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">{editingId ? '编辑集训地点' : '添加集训地点'}</h3>
              <div className="space-y-4">
                <div><label className="block text-sm text-stone-400 mb-1.5">🏠 地点名称 *</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="如：朝阳区铁腕训练馆" /></div>
                <div>
                  <label className="block text-sm text-stone-400 mb-1.5">📍 详细地址</label>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="如：朝阳区建国路88号SOHO现代城B1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm text-stone-400 mb-1.5">🌐 纬度 (Latitude)</label><input type="text" value={lat} onChange={e => setLat(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all font-mono text-sm" placeholder="39.9042" /></div>
                  <div><label className="block text-sm text-stone-400 mb-1.5">🌐 经度 (Longitude)</label><input type="text" value={lng} onChange={e => setLng(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all font-mono text-sm" placeholder="116.4074" /></div>
                </div>
                <button type="button" onClick={handleGeocode} disabled={geocoding || !address.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-stone-300 text-sm hover:bg-white/10 transition-all disabled:opacity-40"
                >
                  <Crosshair className={`w-4 h-4 ${geocoding ? 'animate-spin' : ''}`} />
                  {geocoding ? '定位中...' : '📍 根据地址自动定位'}
                </button>
                <p className="text-xs text-stone-600">💡 点击"自动定位"根据地址获取坐标，或手动输入经纬度。北京中心约 39.90, 116.40</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-sm text-stone-400 mb-1.5">👤 负责人/教练</label><input type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="如：张教练" /></div>
                  <div><label className="block text-sm text-stone-400 mb-1.5">📞 联系电话</label><input type="text" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="方便联系咨询" /></div>
                </div>
                <div><label className="block text-sm text-stone-400 mb-1.5">🕐 训练时间</label><input type="text" value={schedule} onChange={e => setSchedule(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="如：每周二四六 19:00-22:00" /></div>
                <div>
                  <label className="block text-sm text-stone-400 mb-1.5">🖼️ 场地照片</label>
                  {imagePreview ? (
                    <div className="relative mb-2"><img src={imagePreview} alt="预览" className="w-full h-40 object-cover rounded-xl" /><button onClick={() => { setImageFile(null); setImagePreview(''); }} className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80"><X className="w-4 h-4" /></button></div>
                  ) : null}
                  <label className="flex items-center justify-center gap-2 px-4 py-8 rounded-xl bg-white/5 border-2 border-dashed border-white/10 cursor-pointer hover:border-brand-500/30 hover:bg-white/[0.07] transition-all text-stone-500 hover:text-stone-300">
                    <Upload className="w-5 h-5" />点击上传照片（选填）
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
                <div><label className="block text-sm text-stone-400 mb-1.5">📝 简介/备注</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all resize-none" placeholder="介绍一下场地环境、器材情况、训练氛围等" /></div>
                <button onClick={() => saveLocation.mutate()} disabled={!name.trim() || isUploading} className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-bold hover:from-brand-400 transition-all disabled:opacity-50">{isUploading ? '上传中...' : editingId ? '保存修改' : '添加集训地点'}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Map ─── */}
      <div className="max-w-5xl mx-auto px-4 mb-4">
        <div className="glass rounded-2xl overflow-hidden relative">
          {isLoading ? (
            <div className="h-[450px] flex items-center justify-center">
              <span className="w-8 h-8 border-2 border-stone-600 border-t-stone-300 rounded-full animate-spin" />
            </div>
          ) : (
            <MapContainer
              center={BEIJING_CENTER}
              zoom={DEFAULT_ZOOM}
              className="h-[450px] w-full z-0"
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              <FlyToController loc={activeSpot} />
              {spotsWithCoords.map(loc => (
                <SpotMarker
                  key={loc.id}
                  loc={loc}
                  isActive={activeSpot?.id === loc.id}
                  onClick={() => setActiveSpot(loc)}
                />
              ))}
            </MapContainer>
          )}

          {/* Map overlay controls */}
          <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
            <button
              onClick={() => setActiveSpot(null)}
              className="w-9 h-9 rounded-xl bg-stone-900/80 backdrop-blur border border-white/10 flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-800 transition-all"
              title="重置视角"
            >
              <Navigation className="w-4 h-4" />
            </button>
          </div>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-900/80 backdrop-blur border border-white/10 text-xs text-stone-400">
            <span className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-500 to-orange-600" />
            {spotsWithCoords.length} 个集训点
            {spotsWithoutCoords.length > 0 && (
              <span className="text-amber-400 ml-1">（{spotsWithoutCoords.length} 个待标注坐标）</span>
            )}
          </div>
        </div>
      </div>

      {/* ─── List toggle ─── */}
      <div className="max-w-5xl mx-auto px-4">
        <button
          onClick={() => setShowList(!showList)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-stone-400 hover:text-white hover:bg-white/10 transition-all text-sm mb-4"
        >
          <List className="w-4 h-4" />
          集训点列表 ({locations?.length || 0})
          {showList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {showList && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              {locations && locations.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {locations.map(loc => (
                    <motion.div
                      key={loc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`glass rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] ${activeSpot?.id === loc.id ? 'ring-2 ring-brand-500/50' : ''}`}
                      onClick={() => {
                        if (loc.latitude && loc.longitude) {
                          setActiveSpot(loc);
                          window.scrollTo({ top: 200, behavior: 'smooth' });
                        }
                      }}
                    >
                      {loc.image_url ? (
                        <img src={loc.image_url} alt={loc.name} className="w-full h-36 object-cover" />
                      ) : (
                        <div className="w-full h-36 bg-white/5 flex items-center justify-center">
                          <Image className="w-10 h-10 text-stone-700" />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-bold text-white">{loc.name}</h3>
                          {loc.latitude && loc.longitude && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">📍 已标注</span>
                          )}
                          {(!loc.latitude || !loc.longitude) && isAdmin && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">⚠ 缺坐标</span>
                          )}
                        </div>
                        {loc.address && <p className="text-xs text-stone-400 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{loc.address}</p>}
                        {loc.contact_person && <p className="text-xs text-stone-400 mb-1 flex items-center gap-1"><User className="w-3 h-3" />{loc.contact_person}{loc.contact_phone && <span className="text-stone-600 ml-2">📞 {loc.contact_phone}</span>}</p>}
                        {loc.schedule && <p className="text-xs text-stone-400 mb-1">🕐 {loc.schedule}</p>}
                        {loc.description && <p className="text-xs text-stone-500 mt-2 line-clamp-2"><FileText className="w-3 h-3 inline mr-1" />{loc.description}</p>}
                        {loc.status === 'pending' && isAdmin && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 mt-2 inline-block">待审核</span>}
                        {isAdmin && loc.status === 'pending' && <div className="flex gap-2 mt-2"><button onClick={(e) => { e.stopPropagation(); approveLocation.mutate({ id: loc.id, status: 'approved' }); }} disabled={approveLocation.isPending} className="text-xs text-emerald-400 hover:text-emerald-300">✓ 通过</button><button onClick={(e) => { e.stopPropagation(); approveLocation.mutate({ id: loc.id, status: 'rejected' }); }} disabled={approveLocation.isPending} className="text-xs text-red-400 hover:text-red-300">✕ 拒绝</button></div>}
                        {isAdmin && <div className="flex gap-3 mt-3"><button onClick={(e) => { e.stopPropagation(); startEdit(loc); }} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">✏️ 编辑</button><button onClick={(e) => { e.stopPropagation(); deleteLocation.mutate(loc.id); }} disabled={deleteLocation.isPending} className="text-xs text-red-400 hover:text-red-300 transition-colors"><X className="w-3 h-3 inline" /> 删除</button></div>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 glass rounded-3xl">
                  <MapPin className="w-12 h-12 text-stone-700 mx-auto mb-3" />
                  <h2 className="text-lg font-semibold text-stone-400 mb-1">暂无集训地点</h2>
                  <p className="text-stone-600 text-sm">管理员添加后将显示在这里</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
