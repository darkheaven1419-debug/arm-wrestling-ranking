import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    if (error) { toast.error('登录失败，请检查邮箱和密码'); return; }
    toast.success('登录成功');
    navigate('/admin');
  };

  return (
    <div className="pt-24 pb-20 px-4 flex items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Dumbbell className="w-8 h-8 text-brand-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">管理员登录</h1>
          <p className="text-stone-500 text-sm mt-2">登录以审核运动员信息</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-stone-400 mb-1.5">邮箱</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white
                focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 transition-all"
              placeholder="admin@example.com" required />
          </div>
          <div>
            <label className="block text-sm text-stone-400 mb-1.5">密码</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white
                focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 transition-all"
              placeholder="••••••••" required />
          </div>
          <button type="submit" disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-semibold
              hover:from-brand-400 hover:to-brand-500 transition-all duration-300 flex items-center justify-center gap-2
              disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <LogIn className="w-4 h-4" />}
            {isLoading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
