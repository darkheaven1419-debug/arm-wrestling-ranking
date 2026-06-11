import { useState } from 'react';
import toast from 'react-hot-toast';
import { UserPlus, Trash2 } from 'lucide-react';
import type { Athlete } from '@/types';

interface AdminUser { id: number; user_id: string; role: string; display_name: string | null; created_at: string; }

function AdminRow({ admin, removeAdmin, updateAdminName }: {
  admin: AdminUser;
  removeAdmin: { mutate: (id: number) => void; isPending: boolean };
  updateAdminName: { mutate: (v: { id: number; name: string }) => void; isPending: boolean };
}) {
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(admin.display_name || '');
  return (
    <div className="glass rounded-xl px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
      <span className="text-white text-sm">
        {admin.role === 'super_admin' ? '👑 负责人' : '🛡️ 管理员'}
        {editing ? (
          <span className="inline-flex items-center gap-1 ml-2">
            <input type="text" value={nameVal} onChange={e => setNameVal(e.target.value)}
              className="w-24 px-2 py-0.5 rounded bg-white/10 border border-brand-500/30 text-white text-xs"
              autoFocus onKeyDown={e => { if (e.key === 'Enter') { updateAdminName.mutate({ id: admin.id, name: nameVal }); setEditing(false); } if (e.key === 'Escape') setEditing(false); }} />
            <button onClick={() => { updateAdminName.mutate({ id: admin.id, name: nameVal }); setEditing(false); }} className="text-emerald-400 text-xs">✓</button>
            <button onClick={() => setEditing(false)} className="text-stone-500 text-xs">✕</button>
          </span>
        ) : (
          <button onClick={() => { setNameVal(admin.display_name || ''); setEditing(true); }}
            className={`ml-2 ${admin.display_name ? 'text-stone-300' : 'text-stone-600 hover:text-stone-400'}`}>
            {admin.display_name || '点击设置名字'}
          </button>
        )}
      </span>
      {admin.role !== 'super_admin' && (
        <button onClick={() => removeAdmin.mutate(admin.id)} disabled={removeAdmin.isPending}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50">
          <Trash2 className="w-3 h-3" />移除
        </button>
      )}
    </div>
  );
}

export function AdminsTab(props: {
  addAdminByEmail: { mutate: (v: { email: string; name?: string }) => void; isPending: boolean };
  newAdminEmail: string; setNewAdminEmail: (v: string) => void;
  pwEmail: string; setPwEmail: (v: string) => void;
  resetPassword: string; setResetPassword: (v: string) => void;
  handleResetPassword: () => void;
  adminUsers: AdminUser[] | undefined;
  removeAdmin: { mutate: (id: number) => void; isPending: boolean };
  updateAdminName: { mutate: (v: { id: number; name: string }) => void; isPending: boolean };
  approved: Athlete[];
  promoteAthleteToAdmin: { mutate: (v: { athleteId: number; name?: string }) => void; isPending: boolean };
}) {
  const { addAdminByEmail, newAdminEmail, setNewAdminEmail,
    pwEmail, setPwEmail, resetPassword, setResetPassword, handleResetPassword,
    adminUsers, removeAdmin, updateAdminName, approved, promoteAthleteToAdmin } = props;

  // Show athletes who have a linked account (user_id or user_email)
  const athletesWithAccount = approved.filter(a => a.user_id && !adminUsers?.some(au => au.user_id === a.user_id));

  return (
    <div>
      <div className="glass rounded-2xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-3"><UserPlus className="w-4 h-4 text-brand-400 inline mr-2" />添加管理员</h3>
        <p className="text-xs text-stone-500 mb-3">从已提交信息的运动员中选择，一键设为管理员</p>
        {athletesWithAccount.length > 0 ? (
          <div className="flex gap-3 flex-wrap">
            <select
              className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl bg-stone-900 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500/50 appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23999' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '2rem' }}
              onChange={e => {
                const a = approved.find(ath => ath.id === parseInt(e.target.value));
                if (!a) return;
                if (a.user_email) {
                  addAdminByEmail.mutate({ email: a.user_email, name: a.name });
                } else {
                  promoteAthleteToAdmin.mutate({ athleteId: a.id, name: a.name });
                }
                e.target.value = '';
              }}
              defaultValue=""
            >
              <option value="" disabled className="bg-stone-900 text-stone-400">选择运动员...</option>
              {athletesWithAccount.map(a => (
                <option key={a.id} value={a.id} className="bg-stone-900 text-white">
                  {a.name}{a.codename ? ` (${a.codename})` : ''}{a.user_email ? ` · ${a.user_email}` : ' · 已关联账号'}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-amber-400 text-xs">暂无已关联账号的运动员。请让运动员登录后提交信息，或使用下方手动输入。</p>
        )}
        <p className="text-xs text-stone-600 mt-3">手动输入邮箱：</p>
        <div className="flex gap-3 mt-2">
          <input type="email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all text-sm" placeholder="输入邮箱地址" />
          <button onClick={() => { if (!newAdminEmail.trim()) { toast.error('请输入邮箱'); return; } addAdminByEmail.mutate({ email: newAdminEmail.trim() }); }}
            disabled={addAdminByEmail.isPending}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-stone-300 text-sm hover:bg-white/10 transition-all disabled:opacity-50 whitespace-nowrap">添加</button>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-3">🔑 重置用户密码</h3>
        <div className="flex gap-3"><input type="email" value={pwEmail} onChange={e => setPwEmail(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all text-sm" placeholder="输入用户邮箱" /></div>
        <div className="flex gap-3 mt-2"><input type="text" value={resetPassword} onChange={e => setResetPassword(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all text-sm" placeholder="新密码（默认 wrist123456）" /><button onClick={handleResetPassword} className="px-4 py-2.5 rounded-xl bg-amber-500/20 text-amber-400 font-semibold text-sm hover:bg-amber-500/30 transition-all whitespace-nowrap">重置</button></div>
      </div>

      <div className="space-y-2">
        {adminUsers?.map(admin => (
          <AdminRow key={admin.id} admin={admin} removeAdmin={removeAdmin} updateAdminName={updateAdminName} />
        ))}
        {(!adminUsers || adminUsers.length === 0) && <p className="text-center text-stone-600 py-8">暂无管理员</p>}
      </div>
    </div>
  );
}


export type { AdminUser };

