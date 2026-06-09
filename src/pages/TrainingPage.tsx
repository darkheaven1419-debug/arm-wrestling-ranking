import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Plus, X, Image, User, FileText, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import type { TrainingLocation } from '@/types';

export function TrainingPage() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState(''); const [address, setAddress] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null); const [imagePreview, setImagePreview] = useState('');
  const [contactPerson, setContactPerson] = useState(''); const [contactPhone, setContactPhone] = useState('');
  const [schedule, setSchedule] = useState(''); const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setImageFile(f); setImagePreview(URL.createObjectURL(f));
  };

  useEffect(() => { supabase.auth.getSession().then(async ({ data: { session } }) => { if (session) { const { data } = await supabase.from('admin_users').select('role').eq('user_id', session.user.id).maybeSingle(); setIsAdmin(!!data); } }); }, []);

  const { data: locations, isLoading } = useQuery({
    queryKey: ['training-locations', isAdmin],
    queryFn: async () => {
      let q = supabase.from('training_locations').select('*').order('created_at', { ascending: false });
      if (!isAdmin) q = q.eq('status', 'approved');
      const { data, error } = await q;
      if (error) throw error; return (data || []) as (TrainingLocation & { status?: string })[];
    }
  });

  const approveLocation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => { const { error } = await supabase.from('training_locations').update({ status }).eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['training-locations'] }); toast.success('已更新'); },
    onError: () => toast.error('操作失败'),
  });

  const createLocation = useMutation({
    mutationFn: async () => {
      let imageUrl = null;
      if (imageFile) {
        setIsUploading(true);
        const ext = imageFile.name.split('.').pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('training-images').upload(path, imageFile);
        if (upErr) throw new Error('图片上传失败');
        const { data: { publicUrl } } = supabase.storage.from('training-images').getPublicUrl(path);
        imageUrl = publicUrl;
        setIsUploading(false);
      }
      const { error } = await supabase.from('training_locations').insert({
        name: name.trim(), address: address.trim() || null, image_url: imageUrl,
        contact_person: contactPerson.trim() || null, contact_phone: contactPhone.trim() || null,
        schedule: schedule.trim() || null, description: description.trim() || null
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['training-locations'] }); setShowForm(false); setName(''); setAddress(''); setImageFile(null); setImagePreview(''); setContactPerson(''); setContactPhone(''); setSchedule(''); setDescription(''); toast.success('已添加'); },
    onError: (e: Error) => toast.error(e.message || '添加失败'),
  });

  const deleteLocation = useMutation({
    mutationFn: async (id: number) => { const { error } = await supabase.from('training_locations').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['training-locations'] }); toast.success('已删除'); },
    onError: () => toast.error('删除失败'),
  });

  return (
    <div className="pt-24 pb-20 px-4"><div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div><Link to="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 transition-colors mb-2"><ArrowLeft className="w-4 h-4" />返回首页</Link><h1 className="text-2xl font-bold text-white flex items-center gap-2"><MapPin className="w-6 h-6 text-brand-400" />集训地点</h1></div>
        {isAdmin && <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-semibold hover:from-brand-400 transition-all"><Plus className="w-4 h-4" />{showForm ? '取消' : '添加地点'}</button>}
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass rounded-2xl p-6 mb-8 overflow-hidden">
          <h3 className="text-lg font-bold text-white mb-4">添加集训地点</h3>
          <p className="text-xs text-stone-500 mb-4">💡 提示：填写尽可能详细的信息，方便其他腕力爱好者找到这里。带 * 为必填。</p>
          <div className="space-y-4">
            <div><label className="block text-sm text-stone-400 mb-1.5">🏠 地点名称 *</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="如：朝阳区铁腕训练馆" /></div>
            <div><label className="block text-sm text-stone-400 mb-1.5">📍 详细地址</label><input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="如：朝阳区建国路88号SOHO现代城B1" /><p className="text-xs text-stone-600 mt-1">完整地址方便大家导航到达</p></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm text-stone-400 mb-1.5">👤 负责人/教练</label><input type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="如：张教练" /></div>
              <div><label className="block text-sm text-stone-400 mb-1.5">📞 联系电话</label><input type="text" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="方便联系咨询" /></div>
            </div>
            <div><label className="block text-sm text-stone-400 mb-1.5">🕐 训练时间</label><input type="text" value={schedule} onChange={e => setSchedule(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="如：每周二四六 19:00-22:00" /><p className="text-xs text-stone-600 mt-1">大家最关心什么时候可以去训练</p></div>
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">🖼️ 场地照片</label>
              {imagePreview ? (
                <div className="relative mb-2"><img src={imagePreview} alt="预览" className="w-full h-40 object-cover rounded-xl" /><button onClick={() => { setImageFile(null); setImagePreview(''); }} className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80"><X className="w-4 h-4" /></button></div>
              ) : null}
              <label className="flex items-center justify-center gap-2 px-4 py-8 rounded-xl bg-white/5 border-2 border-dashed border-white/10 cursor-pointer hover:border-brand-500/30 hover:bg-white/[0.07] transition-all text-stone-500 hover:text-stone-300">
                <Upload className="w-5 h-5" />点击上传照片（选填）
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
              <p className="text-xs text-stone-600 mt-1">拍摄场地环境、器材设备等，让人更直观了解</p>
            </div>
            <div><label className="block text-sm text-stone-400 mb-1.5">📝 简介/备注</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all resize-none" placeholder="介绍一下场地环境、器材情况、训练氛围等" /><p className="text-xs text-stone-600 mt-1">可以写场地大小、有什么器械、适合什么水平等</p></div>
            <button onClick={() => createLocation.mutate()} disabled={!name.trim() || isUploading} className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-bold hover:from-brand-400 transition-all disabled:opacity-50">{isUploading ? '上传中...' : '添加集训地点'}</button>
          </div>
        </motion.div>
      )}

      {isLoading && <div className="text-center py-12"><span className="w-6 h-6 border-2 border-stone-600 border-t-stone-300 rounded-full animate-spin inline-block" /></div>}

      {!isLoading && locations && locations.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {locations.map(loc => (
            <motion.div key={loc.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform">
              {loc.image_url ? <img src={loc.image_url} alt={loc.name} className="w-full h-40 object-cover" /> : <div className="w-full h-40 bg-white/5 flex items-center justify-center"><Image className="w-10 h-10 text-stone-700" /></div>}
              <div className="p-5">
                <h3 className="text-lg font-bold text-white mb-2">{loc.name}</h3>
                {loc.address && <p className="text-sm text-stone-400 mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{loc.address}</p>}
                {loc.contact_person && <p className="text-sm text-stone-400 mb-1 flex items-center gap-1"><User className="w-3.5 h-3.5" />{loc.contact_person}{loc.contact_phone && <span className="text-stone-600 ml-2">📞 {loc.contact_phone}</span>}</p>}
                {loc.schedule && <p className="text-sm text-stone-400 mb-1 flex items-center gap-1">🕐 {loc.schedule}</p>}
                {loc.description && <p className="text-sm text-stone-500 mt-2 flex items-start gap-1"><FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />{loc.description}</p>}
                {(loc as any).status === 'pending' && isAdmin && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">待审核</span>}
                {isAdmin && (loc as any).status === 'pending' && <div className="flex gap-2 mt-2"><button onClick={() => approveLocation.mutate({ id: loc.id, status: 'approved' })} disabled={approveLocation.isPending} className="text-xs text-emerald-400 hover:text-emerald-300">✓ 通过</button><button onClick={() => approveLocation.mutate({ id: loc.id, status: 'rejected' })} disabled={approveLocation.isPending} className="text-xs text-red-400 hover:text-red-300">✕ 拒绝</button></div>}
                {isAdmin && <button onClick={() => deleteLocation.mutate(loc.id)} disabled={deleteLocation.isPending} className="mt-3 text-xs text-red-400 hover:text-red-300 transition-colors"><X className="w-3 h-3 inline" /> 删除</button>}
              </div>
            </motion.div>
          ))}
        </div>
      ) : null}

      {!isLoading && (!locations || locations.length === 0) && <div className="text-center py-16 glass rounded-3xl"><MapPin className="w-16 h-16 text-stone-700 mx-auto mb-4" /><h2 className="text-xl font-semibold text-stone-400 mb-2">暂无集训地点</h2><p className="text-stone-600">管理员添加后将显示在这里</p></div>}
    </div></div>
  );
}
