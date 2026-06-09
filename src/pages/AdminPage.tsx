import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, LogOut, Check, X as XIcon, RefreshCw, Shield, UserPlus, Trash2, Crown } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import type { Athlete } from '@/types';

interface AdminUser {
  id: number;
  user_id: string;
  role: 'super_admin' | 'admin';
  created_at: string;
}

export function AdminPage() {
  const [session, setSession] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'review' | 'admins'>('review');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(!!session));
  }, []);

  // 检查当前用户的管理员角色
  const { data: myRole } = useQuery({
    queryKey: ['my-admin-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('admin_users').select('role').eq('user_id', user.id).single();
      return data?.role as 'super_admin' | 'admin' | null;
    },
    enabled: session === true,
  });

  const isSuperAdmin = myRole === 'super_admin';
  const isAdmin = myRole === 'super_admin' || myRole === 'admin';

  const { data: athletes, isLoading } = useQuery({
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

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const { error } = await supabase.from('athletes').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-athletes'] });
      toast.success('状态已更新');
    },
    onError: () => toast.error('操作失败'),
  });

  const addAdmin = useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.rpc('add_admin_by_email', { target_email: email });
      if (error) throw new Error(error.message);
      if (data?.startsWith('error:')) throw new Error(data.replace('error: ', ''));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setNewAdminEmail('');
      toast.success('管理员已添加');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeAdmin = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('admin_users').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('管理员已移除');
    },
    onError: () => toast.error('操作失败'),
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(false);
    toast.success('已退出');
  };

  if (session === null) {
    return (
      <div className="pt-24 pb-20 px-4 flex items-center justify-center min-h-[80vh]">
        <span className="w-6 h-6 border-2 border-stone-600 border-t-stone-300 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-sm mx-auto text-center">
          <Shield className="w-16 h-16 text-stone-700 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">需要登录</h1>
          <p className="text-stone-500 mb-6">请使用管理员账号登录</p>
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
          <h1 className="text-2xl font-bold text-white mb-2">无权限</h1>
          <p className="text-stone-500 mb-6">你的账号没有管理员权限，请联系超级管理员。</p>
          <button onClick={handleLogout} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-stone-300 hover:bg-white/10 transition-colors">退出登录</button>
        </div>
      </div>
    );
  }

  const pending = athletes?.filter((a) => a.status === 'pending') ?? [];
  const approved = athletes?.filter((a) => a.status === 'approved') ?? [];
  const rejected = athletes?.filter((a) => a.status === 'rejected') ?? [];

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 transition-colors mb-2">
              <ArrowLeft className="w-4 h-4" />返回首页
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">管理后台</h1>
              {isSuperAdmin && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-400 text-xs font-semibold">
                  <Crown className="w-3 h-3" /> 超级管理员
                </span>
              )}
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-stone-400 hover:text-white hover:bg-white/10 transition-all">
            <LogOut className="w-4 h-4" />退出登录
          </button>
        </div>

        {/* Admin tabs */}
        {isSuperAdmin && (
          <div className="flex gap-3 mb-8">
            <button
              onClick={() => setActiveTab('review')}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                ${activeTab === 'review'
                  ? 'bg-white/10 text-white shadow-lg'
                  : 'text-stone-500 hover:text-stone-300'
                }`}
            >
              审核运动员
            </button>
            <button
              onClick={() => setActiveTab('admins')}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                ${activeTab === 'admins'
                  ? 'bg-white/10 text-white shadow-lg'
                  : 'text-stone-500 hover:text-stone-300'
                }`}
            >
              管理管理员
            </button>
          </div>
        )}

        {/* Stats — only in review tab */}
        {activeTab === 'review' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: '待审核', value: pending.length, color: 'text-amber-400' },
              { label: '已通过', value: approved.length, color: 'text-emerald-400' },
              { label: '总人数', value: athletes?.length ?? 0, color: 'text-white' },
              { label: '已拒绝', value: rejected.length, color: 'text-red-400' },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-2xl p-4 text-center">
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-stone-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Review tab */}
        {activeTab === 'review' && (
          <>
            {isLoading && (
              <div className="text-center py-12"><RefreshCw className="w-6 h-6 text-stone-600 mx-auto animate-spin" /></div>
            )}

            {!isLoading && pending.length > 0 && (
              <div className="mb-10">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />待审核 ({pending.length})
                </h2>
                <div className="space-y-3">
                  {pending.map((athlete) => (
                    <motion.div key={athlete.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="glass rounded-2xl p-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-white">{athlete.name}</h3>
                          <div className="text-sm text-stone-500 mt-1 space-x-3">
                            <span>{athlete.gender}</span><span>{athlete.hand}</span><span>{athlete.weight_class}</span>
                            {athlete.body_weight && <span>{athlete.body_weight}kg</span>}<span>{athlete.city}</span>
                          </div>
                          {athlete.team && <p className="text-sm text-stone-400 mt-1">🏠 {athlete.team}</p>}
                          {athlete.achievements && <p className="text-sm text-stone-400 mt-1">🏆 {athlete.achievements}</p>}
                          {athlete.contact && <p className="text-sm text-stone-500 mt-1">📞 {athlete.contact}</p>}
                        </div>
                        <div className="flex gap-3 shrink-0">
                          <button
                            onClick={() => updateStatus.mutate({ id: athlete.id, status: 'approved' })}
                            disabled={updateStatus.isPending}
                            className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50" title="通过">
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => updateStatus.mutate({ id: athlete.id, status: 'rejected' })}
                            disabled={updateStatus.isPending}
                            className="p-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50" title="拒绝">
                            <XIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {!isLoading && approved.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />已通过 ({approved.length})
                </h2>
                <div className="space-y-2">
                  {approved.map((athlete) => (
                    <div key={athlete.id} className="glass rounded-xl px-5 py-3 flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-white font-medium">{athlete.name}</span>
                        <span className="text-stone-500 ml-3">{athlete.hand} · {athlete.weight_class} · {athlete.city}</span>
                      </div>
                      <button onClick={() => updateStatus.mutate({ id: athlete.id, status: 'pending' })}
                        className="text-xs text-stone-600 hover:text-stone-400 transition-colors">撤销</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isLoading && athletes?.length === 0 && (
              <div className="text-center py-16"><p className="text-stone-600">暂无运动员数据</p></div>
            )}
          </>
        )}

        {/* Admin management tab (super admin only) */}
        {activeTab === 'admins' && isSuperAdmin && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-brand-400" />管理员列表
            </h2>

            {/* Add admin */}
            <div className="glass rounded-2xl p-5 mb-6">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-brand-400" />添加管理员
              </h3>
              <div className="flex gap-3">
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white
                    placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all text-sm"
                  placeholder="输入对方的注册邮箱"
                />
                <button
                  onClick={() => {
                    if (!newAdminEmail.trim()) { toast.error('请输入邮箱'); return; }
                    addAdmin.mutate(newAdminEmail.trim());
                  }}
                  disabled={addAdmin.isPending}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-semibold text-sm
                    hover:from-brand-400 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {addAdmin.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  添加
                </button>
              </div>
              <p className="text-xs text-stone-600 mt-3">
                对方需要先在网站注册账号（通过登录页面），然后你在这里输入其注册邮箱即可添加为管理员。
              </p>
            </div>

            {/* Admin list */}
            <div className="space-y-2">
              {adminUsers?.map((admin) => (
                <div key={admin.id} className="glass rounded-xl px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-white text-sm font-medium">
                      {admin.role === 'super_admin' ? '👑 超级管理员' : '🛡️ 管理员'}
                    </span>
                    <span className="text-xs text-stone-600 font-mono">{admin.user_id.slice(0, 8)}...</span>
                  </div>
                  {admin.role !== 'super_admin' && (
                    <button
                      onClick={() => removeAdmin.mutate(admin.id)}
                      disabled={removeAdmin.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-red-400
                        hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />移除
                    </button>
                  )}
                </div>
              ))}
              {(!adminUsers || adminUsers.length === 0) && (
                <p className="text-center text-stone-600 py-8">暂无管理员数据</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
