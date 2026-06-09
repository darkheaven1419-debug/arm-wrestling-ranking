import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, LogIn, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { toast.error('请填写邮箱和密码'); return; }
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setIsLoading(false);
    if (error) { toast.error('登录失败，请检查邮箱和密码'); return; }
    toast.success('登录成功');
    navigate('/profile');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { toast.error('请填写邮箱和密码'); return; }
    if (password.length < 6) { toast.error('密码至少 6 位'); return; }
    if (password !== confirmPassword) { toast.error('两次密码不一致'); return; }
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    setIsLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('注册成功！请完善个人资料');
    navigate('/profile');
  };

  const c = "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 transition-all";

  return (
    <div className="pt-24 pb-20 px-4 flex items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Dumbbell className="w-8 h-8 text-brand-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">{mode === 'login' ? '登录' : '注册'}</h1>
          <p className="text-stone-500 text-sm mt-2">{mode === 'login' ? '登录你的账号' : '创建新账号'}</p>
        </div>
        <div className="flex gap-2 mb-6">
          <button onClick={() => setMode('login')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === 'login' ? 'bg-white/10 text-white' : 'text-stone-500 hover:text-stone-300'}`}><LogIn className="w-4 h-4 inline mr-1.5" />登录</button>
          <button onClick={() => setMode('register')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === 'register' ? 'bg-white/10 text-white' : 'text-stone-500 hover:text-stone-300'}`}><UserPlus className="w-4 h-4 inline mr-1.5" />注册</button>
        </div>
        <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4">
          <div><label className="block text-sm text-stone-400 mb-1.5">账号</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className={c} placeholder="输入邮箱地址" required /></div>
          <div><label className="block text-sm text-stone-400 mb-1.5">密码</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className={c} placeholder="••••••••" required /></div>
          {mode === 'register' && <div><label className="block text-sm text-stone-400 mb-1.5">确认密码</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={c} placeholder="再次输入密码" required /></div>}
          <button type="submit" disabled={isLoading} className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-semibold hover:from-brand-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            {isLoading ? <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}{isLoading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>
          {mode === 'register' && <p className="text-xs text-stone-600 text-center">注册即表示同意使用条款。密码至少 6 位。</p>}
        </form>
      </div>
    </div>
  );
}
