import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Plus, X, Image, User, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import type { TrainingLocation } from '@/types';

export function TrainingPage() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState(''); const [address, setAddress] = useState('');
  const [imageUrl, setImageUrl] = useState(''); const [contactPerson, setContactPerson] = useState('');
  const [description, setDescription] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => { supabase.auth.getSession().then(async ({ data: { session } }) => { if (session) { const { data } = await supabase.from('admin_users').select('role').eq('user_id', session.user.id).maybeSingle(); setIsAdmin(!!data); } }); }, []);

  const { data: locations, isLoading } = useQuery({
    queryKey: ['training-locations'],
    queryFn: async () => { const { data, error } = await supabase.from('training_locations').select('*').order('created_at', { ascending: false }); if (error) throw error; return data as TrainingLocation[]; }
  });

  const createLocation = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('training_locations').insert({ name: name.trim(), address: address.trim() || null, image_url: imageUrl.trim() || null, contact_person: contactPerson.trim() || null, description: description.trim() || null }); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['training-locations'] }); setShowForm(false); setName(''); setAddress(''); setImageUrl(''); setContactPerson(''); setDescription(''); toast.success('已添加'); },
    onError: () => toast.error('添加失败'),
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
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-sm text-stone-400 mb-1.5">地点名称 *</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="如：朝阳区铁腕训练馆" /></div>
              <div><label className="block text-sm text-stone-400 mb-1.5">负责人</label><input type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="如：张教练" /></div>
            </div>
            <div><label className="block text-sm text-stone-400 mb-1.5">地址</label><input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="详细地址" /></div>
            <div><label className="block text-sm text-stone-400 mb-1.5">图片链接</label><input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="https://..." /></div>
            <div><label className="block text-sm text-stone-400 mb-1.5">简介</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all resize-none" placeholder="简单介绍..." /></div>
            <button onClick={() => createLocation.mutate()} disabled={!name.trim()} className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-bold hover:from-brand-400 transition-all disabled:opacity-50">添加</button>
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
                {loc.contact_person && <p className="text-sm text-stone-400 mb-1 flex items-center gap-1"><User className="w-3.5 h-3.5" />{loc.contact_person}</p>}
                {loc.description && <p className="text-sm text-stone-500 mt-2 flex items-start gap-1"><FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />{loc.description}</p>}
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
