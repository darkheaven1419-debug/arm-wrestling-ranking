import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, LogOut, Check, X as XIcon, RefreshCw, Shield, UserPlus, Trash2, Crown, Send, Bell, Calendar, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { computePowerLevel } from '@/lib/powerLevel';
import type { Athlete } from '@/types';

interface AdminUser { id: number; user_id: string; role: string; created_at: string; }
interface AdminApp { id: number; user_id: string; status: string; created_at: string; }

export function AdminPage() {
  const [session, setSession] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'review' | 'ranking' | 'admins' | 'applications' | 'announcements' | 'events' | 'articles'>('review');
  const [annTitle, setAnnTitle] = useState(''); const [annContent, setAnnContent] = useState('');
  const [evtTitle, setEvtTitle] = useState(''); const [evtDate, setEvtDate] = useState('');
  const [evtLocation, setEvtLocation] = useState(''); const [evtDesc, setEvtDesc] = useState('');
  const [evtClasses, setEvtClasses] = useState(''); const [evtContact, setEvtContact] = useState('');
  const [artTitle, setArtTitle] = useState(''); const [artContent, setArtContent] = useState('');
  const [artCategory, setArtCategory] = useState('technique');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [evtImages, setEvtImages] = useState<File[]>([]);
  const [evtImagePreviews, setEvtImagePreviews] = useState<string[]>([]);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [editingScores, setEditingScores] = useState<Record<number, number>>({});
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(!!session));
  }, []);

  const { data: myRole, isLoading: roleLoading } = useQuery({
    queryKey: ['my-admin-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase.from('admin_users').select('role').eq('user_id', user.id).maybeSingle();
      if (error) { toast.error('Role check error'); return null; }
      return data?.role ?? null;
    },
    enabled: session === true,
    retry: false,
  });

  const { data: myApp } = useQuery({
    queryKey: ['my-admin-app'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('admin_applications').select('status').eq('user_id', user.id).maybeSingle();
      return data ?? null;
    },
    enabled: session === true && myRole === null,
    retry: false,
  });

  const isSuperAdmin = myRole === 'super_admin';
  const isAdmin = myRole === 'super_admin' || myRole === 'admin';

  const { data: athletes, isLoading: athletesLoading } = useQuery({
    queryKey: ['admin-athletes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('athletes').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Athlete[];
    },
    enabled: isAdmin,
  });

  const { data: adminUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('admin_users').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return data as AdminUser[];
    },
    enabled: isSuperAdmin,
  });

  const { data: applications } = useQuery({
    queryKey: ['admin-applications'],
    queryFn: async () => {
      const { data, error } = await supabase.from('admin_applications').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return data as AdminApp[];
    },
    enabled: isSuperAdmin,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const { error } = await supabase.from('athletes').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-athletes'] }); toast.success('已更新'); },
    onError: () => toast.error('操作失败'),
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, featured }: { id: number; featured: boolean }) => {
      const { error } = await supabase.from('athletes').update({ is_featured: featured }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-athletes'] }); queryClient.invalidateQueries({ queryKey: ['featured-athletes'] }); toast.success('已更新'); },
    onError: () => toast.error('操作失败'),
  });

  const updateRankScore = useMutation({
    mutationFn: async ({ id, rank_score }: { id: number; rank_score: number }) => {
      const { error } = await supabase.from('athletes').update({ rank_score }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-athletes'] }); toast.success('排名已更新'); },
    onError: () => toast.error('更新失败'),
  });

  const applyAdmin = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('未登录');
      const { error } = await supabase.from('admin_applications').insert({ user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-admin-app'] }); toast.success('申请已提交，等待审核'); },
    onError: (err: Error) => toast.error(err.message || '申请失败，可能已提交过'),
  });

  const handleApplication = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      if (status === 'approved') {
        const app = applications?.find((a) => a.id === id);
        if (app) {
          // Insert admin first, then delete application on success
          const { error: insertErr } = await supabase.from('admin_users').insert({ user_id: app.user_id, role: 'admin' });
          if (insertErr) throw new Error('Failed to add admin: ' + insertErr.message);
          const { error: deleteErr } = await supabase.from('admin_applications').delete().eq('id', id);
          if (deleteErr) throw new Error('Admin added but failed to clean up application');
        }
      } else {
        await supabase.from('admin_applications').update({ status: 'rejected' }).eq('id', id);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-applications'] }); queryClient.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('已处理'); },
    onError: () => toast.error('操作失败'),
  });

  const addAdmin = useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.rpc('add_admin_by_email', { target_email: email });
      if (error) throw new Error(error.message);
      if (data?.startsWith('error:')) throw new Error(data.replace('error: ', ''));
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); setNewAdminEmail(''); toast.success('管理员已添加'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const [pwEmail, setPwEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const handleResetPassword = async () => {
    if (!pwEmail.trim()) { toast.error('请输入邮箱'); return; }
    const newPwd = resetPassword.trim() || 'wrist123456';
    const { data, error } = await supabase.rpc('admin_reset_password', {
      target_email: pwEmail.trim().toLowerCase(),
      new_password: newPwd
    });
    if (error || data?.startsWith('error:')) { toast.error(data?.replace('error: ', '') || '重置失败'); return; }
    toast.success(`密码已重置为 ${newPwd}`); setPwEmail(''); setResetPassword('');
  };

  const addAnnouncement = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('announcements').insert({ title: annTitle.trim(), content: annContent.trim() || null }); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['announcements'] }); setAnnTitle(''); setAnnContent(''); toast.success('公告已发布'); },
    onError: () => toast.error('发布失败'),
  });

  const addEvent = useMutation({
    mutationFn: async () => {
      if (!evtTitle.trim() || !evtDate) { toast.error('请填写标题和日期'); throw new Error('validation'); }
      const classes = evtClasses.trim() ? evtClasses.split(',').map(s => s.trim()).filter(Boolean) : null;
      // Upload images
      const uploadedUrls: string[] = [];
      for (const file of evtImages) {
        const ext = file.name.split('.').pop();
        const path = `events/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        await supabase.storage.from('training-images').upload(path, file);
        const { data: { publicUrl } } = supabase.storage.from('training-images').getPublicUrl(path);
        uploadedUrls.push(publicUrl);
      }
      const { error } = await supabase.from('events').insert({
        title: evtTitle.trim(), event_date: evtDate, location: evtLocation.trim() || null,
        description: evtDesc.trim() || null, weight_classes: classes,
        poster_url: uploadedUrls[0] || null, poster_urls: uploadedUrls.length > 0 ? uploadedUrls : null,
        contact_info: evtContact.trim() || null
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['events'] }); queryClient.invalidateQueries({ queryKey: ['home-events'] }); setEvtTitle(''); setEvtDate(''); setEvtLocation(''); setEvtDesc(''); setEvtClasses(''); setEvtContact(''); setEvtImages([]); setEvtImagePreviews([]); toast.success('赛事已添加'); },
    onError: (e: Error) => { if (e.message !== 'validation') toast.error('添加失败'); },
  });

  const runOcr = async () => {
    if (evtImages.length === 0) { toast.error('请先上传赛事海报图片'); return; }
    setIsOcrProcessing(true);
    toast('正在识别图片中的信息...', { icon: '🔍', duration: 3000 });
    try {
      const Tesseract = (await import('tesseract.js')).default;
      let allText = '';
      for (const file of evtImages) {
        const { data: { text } } = await Tesseract.recognize(file, 'chi_sim+eng');
        allText += text + '\n';
      }
      // Parse recognized text
      const lines = allText.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 0 && !evtTitle) setEvtTitle(lines[0].slice(0, 100));
      // Try to find date
      const dateMatch = allText.match(/(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/);
      if (dateMatch && !evtDate) setEvtDate(dateMatch[1].replace(/[./]/g, '-'));
      // Try to find location
      const locMatch = allText.match(/(?:地点|地址|位置)[：:]\s*(.+)/);
      if (locMatch && !evtLocation) setEvtLocation(locMatch[1].trim().slice(0, 100));
      // Try to find contact
      const contactMatch = allText.match(/(?:联系|电话|微信|手机)[：:]\s*(.+)/);
      if (contactMatch && !evtContact) setEvtContact(contactMatch[1].trim().slice(0, 100));
      if (!evtDesc) setEvtDesc(allText.slice(0, 300));
      toast.success('已自动填充，请核对修改');
    } catch {
      toast.error('识别失败，请手动填写');
    }
    setIsOcrProcessing(false);
  };

  const addArticle = useMutation({
    mutationFn: async () => { const { error } = await supabase.from('articles').insert({ title: artTitle.trim(), content: artContent.trim(), category: artCategory }); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['articles'] }); setArtTitle(''); setArtContent(''); setArtCategory('technique'); toast.success('文章已发布'); },
    onError: () => toast.error('发布失败'),
  });

  const removeAdmin = useMutation({
    mutationFn: async (id: number) => { const { error } = await supabase.from('admin_users').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('已移除'); },
    onError: () => toast.error('操作失败'),
  });

  const handleLogout = async () => { await supabase.auth.signOut(); setSession(false); toast.success('已退出'); };

  if (session === null || roleLoading) {
    return (
      <div className="pt-24 pb-20 px-4 flex items-center justify-center min-h-[80vh]">
        <RefreshCw className="w-6 h-6 text-stone-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-sm mx-auto text-center">
          <Shield className="w-16 h-16 text-stone-700 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">管理后台</h1>
          <p className="text-stone-500 mb-6">请先登录</p>
          <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-semibold hover:from-brand-400 transition-all duration-300">前往登录</Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <NotAdminView myApp={myApp} applyAdmin={applyAdmin} handleLogout={handleLogout} />;
  }

  const pending = athletes?.filter((a) => a.status === 'pending') ?? [];
  const approved = athletes?.filter((a) => a.status === 'approved') ?? [];
  const rejected = athletes?.filter((a) => a.status === 'rejected') ?? [];
  const pendingApps = applications?.filter((a) => a.status === 'pending') ?? [];

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 transition-colors mb-2"><ArrowLeft className="w-4 h-4" />返回首页</Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">管理后台</h1>
              {isSuperAdmin && <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-400 text-xs font-semibold"><Crown className="w-3 h-3" />负责人</span>}
              {!isSuperAdmin && <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">🛡️ 管理员</span>}
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-stone-400 hover:text-white hover:bg-white/10 transition-all"><LogOut className="w-4 h-4" />退出</button>
        </div>

        <div className="flex gap-3 mb-8 flex-wrap">
          <button onClick={() => setActiveTab('review')} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'review' ? 'bg-white/10 text-white' : 'text-stone-500 hover:text-stone-300'}`}>审核运动员</button>
          <button onClick={() => setActiveTab('ranking')} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'ranking' ? 'bg-white/10 text-white' : 'text-stone-500 hover:text-stone-300'}`}>🏆 排名设置</button>
          {isSuperAdmin && (
            <>
              <button onClick={() => setActiveTab('applications')} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all relative ${activeTab === 'applications' ? 'bg-white/10 text-white' : 'text-stone-500 hover:text-stone-300'}`}>
                管理员申请 {pendingApps.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-black text-xs font-bold">{pendingApps.length}</span>}
              </button>
              <button onClick={() => setActiveTab('announcements')} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'announcements' ? 'bg-white/10 text-white' : 'text-stone-500 hover:text-stone-300'}`}>发布公告</button>
              <button onClick={() => setActiveTab('events')} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'events' ? 'bg-white/10 text-white' : 'text-stone-500 hover:text-stone-300'}`}>赛事管理</button>
              <button onClick={() => setActiveTab('articles')} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'articles' ? 'bg-white/10 text-white' : 'text-stone-500 hover:text-stone-300'}`}>文章管理</button>
              <button onClick={() => setActiveTab('admins')} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'admins' ? 'bg-white/10 text-white' : 'text-stone-500 hover:text-stone-300'}`}>管理管理员</button>
            </>
          )}
        </div>

        {activeTab === 'review' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[{ label: '待审核', value: pending.length, color: 'text-amber-400' },{ label: '已通过', value: approved.length, color: 'text-emerald-400' },{ label: '总人数', value: athletes?.length ?? 0, color: 'text-white' },{ label: '已拒绝', value: rejected.length, color: 'text-red-400' }].map(s => (
              <div key={s.label} className="glass rounded-2xl p-4 text-center"><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div><div className="text-xs text-stone-500 mt-1">{s.label}</div></div>
            ))}
          </div>
        )}

        {activeTab === 'review' && (
          <>
            {athletesLoading && <div className="text-center py-12"><RefreshCw className="w-6 h-6 text-stone-600 mx-auto animate-spin" /></div>}
            {!athletesLoading && pending.length > 0 && (
              <div className="mb-10">
                <h2 className="text-lg font-semibold text-white mb-4"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block mr-2" />待审核 ({pending.length})</h2>
                <div className="space-y-3">
                  {pending.map(a => (
                    <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            {a.avatar_url && <img src={a.avatar_url} className="w-12 h-12 rounded-xl object-cover border border-brand-500/20" />}
                            <h3 className="text-lg font-bold text-white">{a.name}</h3>
                          </div>
                          <div className="text-sm text-stone-500 mt-1 space-x-3"><span>{a.gender}</span><span>{a.hand}</span><span>{a.weight_class}</span>{a.body_weight && <span>{a.body_weight}kg</span>}<span>{a.city}</span></div>
                          {a.training_spot && <p className="text-sm text-stone-400 mt-1">🏠 {a.training_spot}</p>}{a.codename && <p className="text-sm text-brand-400 mt-1">⚡ {a.codename}</p>}{a.achievements && <p className="text-sm text-stone-400 mt-1">🏆 {a.achievements}</p>}{a.contact && <p className="text-sm text-stone-500 mt-1">📞 {a.contact}</p>}
                        </div>
                        <div className="flex gap-3 shrink-0">
                          <button onClick={() => updateStatus.mutate({ id: a.id, status: 'approved' })} disabled={updateStatus.isPending} className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"><Check className="w-5 h-5" /></button>
                          <button onClick={() => updateStatus.mutate({ id: a.id, status: 'rejected' })} disabled={updateStatus.isPending} className="p-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"><XIcon className="w-5 h-5" /></button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            {!athletesLoading && approved.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block mr-2" />已通过 ({approved.length})</h2>
                <div className="space-y-2">
                  {approved.map(a => (
                    <div key={a.id} className="glass rounded-xl px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-sm flex-1 min-w-0">
                        <span className="text-white font-medium">{a.name}</span>
                        <span className="text-stone-500 ml-3">{a.hand} · {a.weight_class} · {a.city}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleFeatured.mutate({ id: a.id, featured: !a.is_featured })} disabled={toggleFeatured.isPending} className={`text-xs px-2 py-1 rounded-lg transition-colors ${a.is_featured ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-stone-500 hover:text-stone-300'}`}>
                          {a.is_featured ? '⭐ 已精选' : '☆ 设为精选'}
                        </button>
                        <a href={`#/submit?edit=${a.id}`} className="text-xs text-blue-400 hover:text-blue-300 transition-colors mr-3">✏️ 编辑</a><button onClick={() => updateStatus.mutate({ id: a.id, status: 'pending' })} className="text-xs text-stone-600 hover:text-stone-400 transition-colors">撤销</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!athletesLoading && athletes?.length === 0 && <div className="text-center py-16"><p className="text-stone-600">暂无运动员数据</p></div>}
          </>
        )}

        {activeTab === 'ranking' && (
          <RankingTab athletes={approved} updateRankScore={updateRankScore} editingScores={editingScores} setEditingScores={setEditingScores} />
        )}

        {activeTab === 'applications' && isSuperAdmin && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4"><Shield className="w-5 h-5 text-brand-400 inline mr-2" />管理员申请</h2>
            {applications && applications.length > 0 ? (
              <div className="space-y-3">
                {applications.map(app => (
                  <div key={app.id} className="glass rounded-xl px-5 py-3 flex items-center justify-between">
                    <div><span className="text-white text-sm font-mono">{app.user_id.slice(0, 12)}...</span>
                      <span className={`ml-3 text-xs px-2 py-0.5 rounded-full ${app.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : app.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{app.status === 'pending' ? '待审核' : app.status === 'approved' ? '已通过' : '已拒绝'}</span>
                    </div>
                    {app.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleApplication.mutate({ id: app.id, status: 'approved' })} disabled={handleApplication.isPending} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"><Check className="w-4 h-4" /></button>
                        <button onClick={() => handleApplication.mutate({ id: app.id, status: 'rejected' })} disabled={handleApplication.isPending} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"><XIcon className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (<p className="text-center text-stone-600 py-8">暂无管理员申请</p>)}
          </div>
        )}

        {activeTab === 'announcements' && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4"><Bell className="w-5 h-5 text-brand-400 inline mr-2" />发布公告</h2>
            <div className="glass rounded-2xl p-5">
              <div className="space-y-4">
                <div><label className="block text-sm text-stone-400 mb-1.5">标题</label><input type="text" value={annTitle} onChange={e => setAnnTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="公告标题" /></div>
                <div><label className="block text-sm text-stone-400 mb-1.5">内容</label><textarea value={annContent} onChange={e => setAnnContent(e.target.value)} rows={4} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all resize-none" placeholder="公告内容..." /></div>
                <button onClick={() => { if (!annTitle.trim()) { toast.error('请填写标题'); return; } addAnnouncement.mutate(); }} disabled={addAnnouncement.isPending} className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-bold hover:from-brand-400 transition-all disabled:opacity-50">{addAnnouncement.isPending ? '发布中...' : '发布公告'}</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4"><Calendar className="w-5 h-5 text-brand-400 inline mr-2" />赛事管理</h2>
            <div className="glass rounded-2xl p-5 mb-6">
              <h3 className="text-sm font-semibold text-white mb-4">添加赛事</h3>
              <div className="space-y-3">
                {/* Image upload with OCR */}
                <div>
                  <label className="block text-xs text-stone-400 mb-1">🖼️ 上传海报（支持多张，AI自动识别填充）</label>
                  {evtImagePreviews.length > 0 && (
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {evtImagePreviews.map((url, i) => (
                        <div key={i} className="relative"><img src={url} className="w-20 h-20 object-cover rounded-lg" alt="" />
                          <button onClick={() => { setEvtImagePreviews(p => p.filter((_, j) => j !== i)); setEvtImages(p => p.filter((_, j) => j !== i)); }} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border-2 border-dashed border-white/10 cursor-pointer hover:border-brand-500/30 transition-all text-stone-500 text-sm">
                      📁 选择图片
                      <input type="file" accept="image/*" multiple onChange={e => {
                        const files = Array.from(e.target.files || []);
                        setEvtImages(prev => [...prev, ...files]);
                        setEvtImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
                      }} className="hidden" />
                    </label>
                    <button type="button" onClick={runOcr} disabled={isOcrProcessing || evtImages.length === 0}
                      className="px-4 py-3 rounded-xl bg-violet-500/20 text-violet-400 font-semibold text-sm hover:bg-violet-500/30 transition-all disabled:opacity-50 whitespace-nowrap">
                      {isOcrProcessing ? '识别中...' : '🤖 AI识别填充'}
                    </button>
                  </div>
                  <p className="text-xs text-stone-600 mt-1">上传赛事海报后点击AI识别，自动提取标题、日期、地点等信息</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs text-stone-400 mb-1">标题 *</label><input type="text" value={evtTitle} onChange={e => setEvtTitle(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all text-sm" placeholder="如：北京腕力公开赛2025" /></div>
                  <div><label className="block text-xs text-stone-400 mb-1">日期 *</label><input type="date" value={evtDate} onChange={e => setEvtDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-500/50 transition-all text-sm" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs text-stone-400 mb-1">地点</label><input type="text" value={evtLocation} onChange={e => setEvtLocation(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all text-sm" placeholder="如：朝阳区SOHO现代城" /></div>
                  <div><label className="block text-xs text-stone-400 mb-1">级别（逗号分隔）</label><input type="text" value={evtClasses} onChange={e => setEvtClasses(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all text-sm" placeholder="如：63kg, 78kg, 95kg" /></div>
                </div>
                <div><label className="block text-xs text-stone-400 mb-1">描述</label><textarea value={evtDesc} onChange={e => setEvtDesc(e.target.value)} rows={2} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all text-sm resize-none" placeholder="赛事详情..." /></div>
                <div><label className="block text-xs text-stone-400 mb-1">联系方式</label><input type="text" value={evtContact} onChange={e => setEvtContact(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all text-sm" placeholder="如：微信 xxx" /></div>
                <button onClick={() => addEvent.mutate()} disabled={addEvent.isPending} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-bold text-sm hover:from-brand-400 transition-all disabled:opacity-50">{addEvent.isPending ? '添加中...' : '添加赛事'}</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'articles' && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4"><BookOpen className="w-5 h-5 text-brand-400 inline mr-2" />发布文章</h2>
            <div className="glass rounded-2xl p-5">
              <div className="space-y-4">
                <div><label className="block text-sm text-stone-400 mb-1.5">标题</label><input type="text" value={artTitle} onChange={e => setArtTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="文章标题" /></div>
                <div><label className="block text-sm text-stone-400 mb-1.5">分类</label><select value={artCategory} onChange={e => setArtCategory(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-brand-500/50 transition-all">
                  <option value="technique">💪 技术</option><option value="training">🏋️ 训练</option><option value="nutrition">🍎 营养</option><option value="gear">🧤 装备</option><option value="other">📌 其他</option>
                </select></div>
                <div><label className="block text-sm text-stone-400 mb-1.5">内容（支持 Markdown）</label><textarea value={artContent} onChange={e => setArtContent(e.target.value)} rows={10} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all resize-none font-mono text-sm" placeholder="## 技术要点&#10;&#10;第一段内容...&#10;&#10;### 关键技巧&#10;1. 技巧一&#10;2. 技巧二" /></div>
                <button onClick={() => { if (!artTitle.trim() || !artContent.trim()) { toast.error('请填写标题和内容'); return; } addArticle.mutate(); }} disabled={addArticle.isPending} className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-bold hover:from-brand-400 transition-all disabled:opacity-50">{addArticle.isPending ? '发布中...' : '发布文章'}</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admins' && isSuperAdmin && (
          <div>
            <div className="glass rounded-2xl p-5 mb-6">
              <h3 className="text-sm font-semibold text-white mb-3"><UserPlus className="w-4 h-4 text-brand-400 inline mr-2" />直接添加管理员</h3>
              <div className="flex gap-3">
                <input type="email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all text-sm" placeholder="输入对方注册邮箱" />
                <button onClick={() => { if (!newAdminEmail.trim()) { toast.error('请输入邮箱'); return; } addAdmin.mutate(newAdminEmail.trim()); }} disabled={addAdmin.isPending} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-semibold text-sm hover:from-brand-400 transition-all disabled:opacity-50 flex items-center gap-2">{addAdmin.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}添加</button>
              </div>
              <p className="text-xs text-stone-600 mt-3">对方先注册账号，然后你输入其邮箱添加。也可让对方在管理页自行申请。</p>
            <div className="mt-6 pt-6 border-t border-white/5">
              <h3 className="text-sm font-semibold text-white mb-3">🔑 重置用户密码</h3>
              <div className="flex gap-3"><input type="email" value={pwEmail} onChange={e => setPwEmail(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all text-sm" placeholder="输入用户邮箱" /></div>
              <div className="flex gap-3 mt-2"><input type="text" value={resetPassword} onChange={e => setResetPassword(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all text-sm" placeholder="新密码（默认 wrist123456）" /><button onClick={handleResetPassword} className="px-4 py-2.5 rounded-xl bg-amber-500/20 text-amber-400 font-semibold text-sm hover:bg-amber-500/30 transition-all whitespace-nowrap">重置</button></div>
              <p className="text-xs text-stone-600 mt-2">默认密码为 wrist123456，也可自定义后通知用户修改。</p>
            </div>
            </div>
            <div className="space-y-2">
              {adminUsers?.map(admin => (
                <div key={admin.id} className="glass rounded-xl px-5 py-3 flex items-center justify-between">
                  <span className="text-white text-sm">{admin.role === 'super_admin' ? '👑 负责人' : '🛡️ 管理员'}</span>
                  {admin.role !== 'super_admin' && <button onClick={() => removeAdmin.mutate(admin.id)} disabled={removeAdmin.isPending} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"><Trash2 className="w-3 h-3" />移除</button>}
                </div>
              ))}
              {(!adminUsers || adminUsers.length === 0) && <p className="text-center text-stone-600 py-8">暂无</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RankingTab({ athletes, updateRankScore, editingScores, setEditingScores }: {
  athletes: Athlete[];
  updateRankScore: { mutate: (v: { id: number; rank_score: number }) => void; isPending: boolean };
  editingScores: Record<number, number>;
  setEditingScores: React.Dispatch<React.SetStateAction<Record<number, number>>>;
}) {
  // Group athletes by hand + weight_class
  const groups = new Map<string, Athlete[]>();
  for (const a of athletes) {
    const key = `${a.hand} · ${a.weight_class}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }
  // Sort each group by rank_score
  for (const [, list] of groups) {
    list.sort((a, b) => (a.rank_score ?? 999) - (b.rank_score ?? 999));
  }
  // Sort groups by name
  const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-2">🏆 排名设置</h2>
      <p className="text-xs text-stone-500 mb-6">按级别分组，输入排名数字（1=第1名, 2=第2名...），战力值自动计算。留空或0表示不参与排名。</p>
      <div className="space-y-6">
        {sortedGroups.map(([groupName, list]) => (
          <div key={groupName}>
            <h3 className="text-sm font-bold text-stone-300 mb-3 px-2">{groupName} ({list.length}人)</h3>
            <div className="space-y-2">
              {list.map(a => {
                const editingVal = editingScores[a.id] !== undefined ? editingScores[a.id] : null;
                const currentRank = a.rank_score ?? 0;
                const power = currentRank > 0 ? computePowerLevel(currentRank) : null;
                return (
                  <div key={a.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="text-white text-sm font-medium min-w-0 truncate flex-1">
                      {a.name}
                      {a.codename && <span className="text-brand-400 ml-1.5 text-xs">「{a.codename}」</span>}
                    </span>
                    <span className="text-stone-500 text-xs shrink-0">排名</span>
                    {editingVal !== null ? (
                      <span className="inline-flex items-center gap-1">
                        <input type="number" min="0" value={editingVal} onChange={e => setEditingScores(prev => ({ ...prev, [a.id]: Math.max(0, Number(e.target.value)) }))}
                          className="w-14 px-2 py-1 rounded bg-white/10 border border-brand-500/30 text-white text-sm text-center"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') { updateRankScore.mutate({ id: a.id, rank_score: editingVal }); setEditingScores(prev => { const n = { ...prev }; delete n[a.id]; return n; }); }
                            if (e.key === 'Escape') setEditingScores(prev => { const n = { ...prev }; delete n[a.id]; return n; });
                          }} />
                        <button onClick={() => { updateRankScore.mutate({ id: a.id, rank_score: editingVal }); setEditingScores(prev => { const n = { ...prev }; delete n[a.id]; return n; }); }} className="text-emerald-400 hover:text-emerald-300 text-sm">✓</button>
                        <button onClick={() => setEditingScores(prev => { const n = { ...prev }; delete n[a.id]; return n; })} className="text-stone-500 hover:text-stone-300 text-sm">✕</button>
                      </span>
                    ) : (
                      <button onClick={() => setEditingScores(prev => ({ ...prev, [a.id]: currentRank }))}
                        className={`text-sm font-bold min-w-[2rem] ${currentRank > 0 ? 'text-brand-400' : 'text-stone-600'}`}>
                        {currentRank > 0 ? `#${currentRank}` : '未设'}
                      </button>
                    )}
                    <span className="text-xs shrink-0 w-16 text-right">
                      {power !== null ? <span className="text-brand-400 font-bold">战力 {power}</span> : <span className="text-stone-600">-</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {sortedGroups.length === 0 && <p className="text-center text-stone-600 py-8">暂无已通过的运动员</p>}
      </div>
    </div>
  );
}

function NotAdminView({ myApp, applyAdmin, handleLogout }: {
  myApp: { status: string } | null | undefined;
  applyAdmin: { mutate: () => void; isPending: boolean };
  handleLogout: () => void;
}) {
  const [adminCode, setAdminCode] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const tryCode = async () => {
    if (!adminCode.trim()) { toast.error('请输入管理员密码'); return; }
    setIsChecking(true);
    const { data, error } = await supabase.rpc('approve_admin_by_code', { code: adminCode.trim() });
    setIsChecking(false);
    if (error) { toast.error('验证失败'); return; }
    if (data?.startsWith('error:')) { toast.error(data.replace('error: ', '')); return; }
    toast.success('已成为管理员！'); window.location.reload();
  };
  return (
    <div className="pt-24 pb-20 px-4"><div className="max-w-md mx-auto">
      <div className="text-center mb-8"><div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/20 to-violet-500/10 flex items-center justify-center mx-auto mb-4 border border-brand-500/20"><Shield className="w-8 h-8 text-brand-400" /></div><h1 className="text-2xl font-bold text-white">管理员申请</h1><p className="text-stone-500 text-sm mt-2">申请成为管理员，审核通过后可审核运动员信息</p></div>
      {myApp?.status === 'pending' ? (
        <div className="glass rounded-2xl p-8 text-center"><div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4"><span className="text-2xl">⏳</span></div><h2 className="text-lg font-bold text-white mb-2">申请审核中</h2><p className="text-stone-400 text-sm">你的管理员申请已提交，请等待负责人审核。</p></div>
      ) : myApp?.status === 'rejected' ? (
        <div className="glass rounded-2xl p-8 text-center"><div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4"><XIcon className="w-6 h-6 text-red-400" /></div><h2 className="text-lg font-bold text-white mb-2">申请未通过</h2><p className="text-stone-400 text-sm mb-6">请重新提交或联系负责人。</p><div className="flex gap-3 justify-center"><button onClick={() => (applyAdmin as any).mutate()} disabled={applyAdmin.isPending} className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-stone-300 hover:bg-white/10 transition-all disabled:opacity-50">{applyAdmin.isPending?'提交中...':'重新申请'}</button></div></div>
      ) : (
        <>
          <div className="glass rounded-2xl p-6 mb-4"><h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">🔑 管理员激活码</h3><input type="password" value={adminCode} onChange={e=>setAdminCode(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-center text-lg tracking-widest placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all mb-3" placeholder="••••••••" /><button onClick={tryCode} disabled={isChecking} className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-bold hover:from-brand-400 transition-all disabled:opacity-50">{isChecking?'验证中...':'激活管理员'}</button></div>
          <div className="text-center text-xs text-stone-600 mb-4">— 或者 —</div>
          <div className="glass rounded-2xl p-6 text-center"><h3 className="text-sm font-semibold text-white mb-3">📝 提交申请等待审核</h3><p className="text-xs text-stone-500 mb-4">不知道激活码？提交申请由负责人审核。</p><button onClick={() => (applyAdmin as any).mutate()} disabled={applyAdmin.isPending} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-stone-300 hover:bg-white/10 transition-all disabled:opacity-50"><Send className="w-4 h-4" />{applyAdmin.isPending?'提交中...':'提交申请'}</button></div>
        </>
      )}
      <button onClick={handleLogout} className="block mx-auto mt-6 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-stone-400 hover:text-white hover:bg-red-500/10 transition-all text-sm">退出登录</button>
    </div></div>
  );
}
