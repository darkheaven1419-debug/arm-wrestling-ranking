import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, LogOut, Check, X as XIcon, RefreshCw, Shield, UserPlus, Trash2, Crown, Send, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import type { Athlete } from '@/types';

interface AdminUser { id: number; user_id: string; role: string; created_at: string; }
interface AdminApp { id: number; user_id: string; status: string; created_at: string; }

export function AdminPage() {
  const [session, setSession] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'review' | 'admins' | 'applications'>('review');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [editingScore, setEditingScore] = useState<{ id: number; score: string } | null>(null);
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
      if (error) { console.error('Role check error:', error); return null; }
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

  const updateScore = useMutation({
    mutationFn: async ({ id, score }: { id: number; score: number }) => {
      const { error } = await supabase.from('athletes').update({ rank_score: score }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-athletes'] }); setEditingScore(null); toast.success('排名已更新'); },
    onError: () => toast.error('操作失败'),
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
        if (app) { await supabase.from('admin_users').insert({ user_id: app.user_id, role: 'admin' }); }
        await supabase.from('admin_applications').delete().eq('id', id);
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
    return (
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-sm mx-auto text-center">
          <Shield className="w-16 h-16 text-stone-700 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">管理后台</h1>
          {myApp?.status === 'pending' ? (
            <>
              <p className="text-amber-400 mb-2">⏳ 申请审核中</p>
              <p className="text-stone-500 mb-6">你的管理员申请已提交，请等待超级管理员审核。</p>
            </>
          ) : myApp?.status === 'rejected' ? (
            <>
              <p className="text-red-400 mb-2">申请已被拒绝</p>
              <p className="text-stone-500 mb-6">你可以重新提交申请。</p>
              <button onClick={() => applyAdmin.mutate()} disabled={applyAdmin.isPending}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-semibold hover:from-brand-400 transition-all duration-300 disabled:opacity-50">
                {applyAdmin.isPending ? '提交中...' : '重新申请'}
              </button>
            </>
          ) : (
            <>
              <p className="text-stone-500 mb-6">你没有管理员权限。点击下方申请成为管理员，由超级管理员审核。</p>
              <button onClick={() => applyAdmin.mutate()} disabled={applyAdmin.isPending}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-semibold hover:from-brand-400 transition-all duration-300 disabled:opacity-50 shadow-lg shadow-brand-500/25">
                <Send className="w-4 h-4" />
                {applyAdmin.isPending ? '提交中...' : '申请成为管理员'}
              </button>
            </>
          )}
          <button onClick={handleLogout} className="block mx-auto mt-6 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-stone-300 hover:bg-white/10 transition-colors">退出登录</button>
        </div>
      </div>
    );
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
              {isSuperAdmin && <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-400 text-xs font-semibold"><Crown className="w-3 h-3" />超级管理员</span>}
              {!isSuperAdmin && <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">🛡️ 管理员</span>}
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-stone-400 hover:text-white hover:bg-white/10 transition-all"><LogOut className="w-4 h-4" />退出</button>
        </div>

        <div className="flex gap-3 mb-8 flex-wrap">
          <button onClick={() => setActiveTab('review')} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'review' ? 'bg-white/10 text-white' : 'text-stone-500 hover:text-stone-300'}`}>审核运动员</button>
          {isSuperAdmin && (
            <>
              <button onClick={() => setActiveTab('applications')} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all relative ${activeTab === 'applications' ? 'bg-white/10 text-white' : 'text-stone-500 hover:text-stone-300'}`}>
                管理员申请 {pendingApps.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-black text-xs font-bold">{pendingApps.length}</span>}
              </button>
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
                        <div className="flex-1 min-w-0"><h3 className="text-lg font-bold text-white">{a.name}</h3>
                          <div className="text-sm text-stone-500 mt-1 space-x-3"><span>{a.gender}</span><span>{a.hand}</span><span>{a.weight_class}</span>{a.body_weight && <span>{a.body_weight}kg</span>}<span>{a.city}</span></div>
                          {a.team && <p className="text-sm text-stone-400 mt-1">🏠 {a.team}</p>}{a.achievements && <p className="text-sm text-stone-400 mt-1">🏆 {a.achievements}</p>}{a.contact && <p className="text-sm text-stone-500 mt-1">📞 {a.contact}</p>}
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
                      <div className="text-sm flex-1 min-w-0"><span className="text-white font-medium">{a.name}</span><span className="text-stone-500 ml-3">{a.hand} · {a.weight_class} · {a.city}</span></div>
                      <div className="flex items-center gap-3">
                        {editingScore?.id === a.id ? (
                          <div className="flex items-center gap-2">
                            <input type="number" value={editingScore.score} onChange={e => setEditingScore({ id: a.id, score: e.target.value })} className="w-16 px-2 py-1 rounded-lg bg-white/10 border border-white/10 text-white text-sm text-center focus:outline-none focus:border-brand-500/50" />
                            <button onClick={() => updateScore.mutate({ id: a.id, score: parseInt(editingScore.score) || 0 })} disabled={updateScore.isPending} className="p-1.5 rounded-lg bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-colors"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditingScore(null)} className="p-1.5 rounded-lg bg-white/5 text-stone-500 hover:text-white transition-colors"><XIcon className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <>
                            <span className="text-brand-400 font-bold text-sm">积分: {a.rank_score}</span>
                            <button onClick={() => setEditingScore({ id: a.id, score: String(a.rank_score) })} className="p-1.5 rounded-lg bg-white/5 text-stone-500 hover:text-white transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                        <button onClick={() => updateStatus.mutate({ id: a.id, status: 'pending' })} className="text-xs text-stone-600 hover:text-stone-400 transition-colors">撤销</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!athletesLoading && athletes?.length === 0 && <div className="text-center py-16"><p className="text-stone-600">暂无运动员数据</p></div>}
          </>
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

        {activeTab === 'admins' && isSuperAdmin && (
          <div>
            <div className="glass rounded-2xl p-5 mb-6">
              <h3 className="text-sm font-semibold text-white mb-3"><UserPlus className="w-4 h-4 text-brand-400 inline mr-2" />直接添加管理员</h3>
              <div className="flex gap-3">
                <input type="email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all text-sm" placeholder="输入对方注册邮箱" />
                <button onClick={() => { if (!newAdminEmail.trim()) { toast.error('请输入邮箱'); return; } addAdmin.mutate(newAdminEmail.trim()); }} disabled={addAdmin.isPending} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-semibold text-sm hover:from-brand-400 transition-all disabled:opacity-50 flex items-center gap-2">{addAdmin.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}添加</button>
              </div>
              <p className="text-xs text-stone-600 mt-3">对方先注册账号，然后你输入其邮箱添加。也可让对方在管理页自行申请。</p>
            </div>
            <div className="space-y-2">
              {adminUsers?.map(admin => (
                <div key={admin.id} className="glass rounded-xl px-5 py-3 flex items-center justify-between">
                  <span className="text-white text-sm">{admin.role === 'super_admin' ? '👑 超级管理员' : '🛡️ 管理员'}</span>
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
