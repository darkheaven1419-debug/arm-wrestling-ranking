import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User, Save, LogOut, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import type { TrainingLocation } from '@/types';

interface Profile { id: number; user_id: string; nickname: string; gender: string; height: number | null; weight: number | null; training_spot: string | null; bio: string | null; }

export function ProfilePage() {
  const [session, setSession] = useState<boolean | null>(null);
  const [nickname, setNickname] = useState(''); const [gender, setGender] = useState('男');
  const [height, setHeight] = useState(''); const [weight, setWeight] = useState('');
  const [trainingSpot, setTrainingSpot] = useState(''); const [customSpot, setCustomSpot] = useState('');
  const [bio, setBio] = useState(''); const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => { supabase.auth.getSession().then(({ data: { session } }) => setSession(!!session)); }, []);

  const { data: locations } = useQuery({
    queryKey: ['training-locations-list'],
    queryFn: async () => { const { data } = await supabase.from('training_locations').select('*').order('name'); return (data || []) as TrainingLocation[]; }
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
      return data as Profile | null;
    },
    enabled: session === true, retry: false,
  });

  useEffect(() => {
    if (profile) { setNickname(profile.nickname || ''); setGender(profile.gender || '男'); setHeight(profile.height ? String(profile.height) : ''); setWeight(profile.weight ? String(profile.weight) : ''); setTrainingSpot(profile.training_spot || ''); setBio(profile.bio || ''); }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('未登录'); setIsSaving(false); return; }
    const spot = trainingSpot === 'custom' ? (customSpot.trim() || null) : (trainingSpot || null);
    const payload = { user_id: user.id, nickname: nickname.trim() || null, gender, height: height ? parseFloat(height) : null, weight: weight ? parseFloat(weight) : null, training_spot: spot, bio: bio.trim() || null };
    const { error } = profile
      ? await supabase.from('profiles').update(payload).eq('user_id', user.id)
      : await supabase.from('profiles').insert(payload);
    setIsSaving(false);
    if (error) { toast.error('保存失败'); return; }
    queryClient.invalidateQueries({ queryKey: ['my-profile'] }); toast.success('资料已保存');
  };

  const handleLogout = async () => { await supabase.auth.signOut(); setSession(false); toast.success('已退出'); };

  if (session === null || isLoading) return <div className="pt-24 pb-20 px-4 flex items-center justify-center min-h-[80vh]"><span className="w-6 h-6 border-2 border-stone-600 border-t-stone-300 rounded-full animate-spin" /></div>;

  if (!session) return (
    <div className="pt-24 pb-20 px-4"><div className="max-w-sm mx-auto text-center">
      <User className="w-16 h-16 text-stone-700 mx-auto mb-4" /><h1 className="text-2xl font-bold text-white mb-2">个人主页</h1><p className="text-stone-500 mb-6">请先登录</p>
      <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-semibold hover:from-brand-400 transition-all duration-300">前往登录</Link>
    </div></div>
  );

  return (
    <div className="pt-24 pb-20 px-4"><div className="max-w-lg mx-auto">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 transition-colors mb-6"><ArrowLeft className="w-4 h-4" />返回首页</Link>
      <h1 className="text-2xl font-bold text-white mb-8">个人主页</h1>
      <div className="space-y-5">
        <div><label className="block text-sm text-stone-400 mb-2">昵称</label><input type="text" value={nickname} onChange={e => setNickname(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="你的昵称" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm text-stone-400 mb-2">性别</label><select value={gender} onChange={e => setGender(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-500/50 transition-all appearance-none"><option value="男">男</option><option value="女">女</option></select></div>
          <div><label className="block text-sm text-stone-400 mb-2">身高 (cm)</label><input type="number" step="0.1" value={height} onChange={e => setHeight(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="例: 175" /></div>
        </div>
        <div><label className="block text-sm text-stone-400 mb-2">体重 (kg)</label><input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="例: 75.5" /></div>
        <div>
          <label className="block text-sm text-stone-400 mb-2 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />常去的集训地点</label>
          <select value={trainingSpot} onChange={e => setTrainingSpot(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-500/50 transition-all appearance-none mb-2">
            <option value="">未选择</option>
            {locations?.map(l => (<option key={l.id} value={l.name}>{l.name}</option>))}
            <option value="custom">✏️ 自定义...</option>
          </select>
          {trainingSpot === 'custom' && <input type="text" value={customSpot} onChange={e => setCustomSpot(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="输入你的常去集训地点" />}
        </div>
        <div><label className="block text-sm text-stone-400 mb-2">个人简介</label><textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all resize-none" placeholder="介绍一下自己..." /></div>
        <button onClick={handleSave} disabled={isSaving} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-bold text-lg hover:from-brand-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"><Save className="w-5 h-5" />{isSaving ? '保存中...' : '保存资料'}</button>
        <button onClick={handleLogout} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-stone-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 transition-all flex items-center justify-center gap-2"><LogOut className="w-4 h-4" />退出登录</button>
      </div>
    </div></div>
  );
}
