import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { TrendingUp, Sparkles, Crown, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function TrendingSection() {
  const { data: trending, isLoading: tLoading } = useQuery({
    queryKey: ['trending-athletes'],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: views } = await supabase.from('athlete_views').select('athlete_id, athletes!inner(id, name, codename, weight_class, avatar_url)').gte('created_at', since).order('created_at', { ascending: false }).limit(300);
      if (!views?.length) return [];
      const map: Record<string, any> = {};
      for (const v of views) {
        const a = (v as any).athletes; if (!a) continue;
        const k = String(a.id);
        if (!map[k]) map[k] = { ...a, views: 0 };
        map[k].views++;
      }
      return Object.values(map).sort((a: any, b: any) => b.views - a.views).slice(0, 5);
    },
    retry: false,
  });

  const { data: newcomers, isLoading: nLoading } = useQuery({
    queryKey: ['newcomer-athletes'],
    queryFn: async () => {
      const first = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data } = await supabase.from('athletes').select('id, name, codename, weight_class, avatar_url, rank_score').eq('status', 'approved').gte('created_at', first).order('rank_score', { ascending: true }).limit(3);
      return data || [];
    },
    retry: false,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl mx-auto px-4 pb-16">
      {/* Trending */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-red-400" />热度飙升榜 <span className="text-[10px] text-stone-500 font-normal">近7天</span></h3>
        {tLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => (<div key={i} className="flex items-center gap-3 animate-pulse"><div className="w-6 h-6 rounded bg-white/5" /><div className="w-8 h-8 rounded-full bg-white/5 shrink-0" /><div className="flex-1 space-y-1.5"><div className="h-3 bg-white/5 rounded w-1/3" /><div className="h-2 bg-white/5 rounded w-1/2" /></div></div>))}</div>
        ) : !trending?.length ? (
          <p className="text-xs text-stone-600 py-6 text-center">暂无热度数据</p>
        ) : (
          <div className="space-y-2">
            {trending.map((a: any, i: number) => (
              <Link key={a.id} to={`/athlete/${a.id}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group">
                <span className={`w-6 text-center font-bold text-xs ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-stone-400' : i === 2 ? 'text-amber-700' : 'text-stone-600'}`}>
                  {i === 0 ? <Crown className="w-4 h-4 mx-auto" /> : `#${i + 1}`}
                </span>
                <div className="w-8 h-8 rounded-full bg-white/5 overflow-hidden shrink-0">
                  {a.avatar_url ? <img src={a.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><User className="w-4 h-4 text-stone-600" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-semibold truncate group-hover:text-brand-300 transition-colors">{a.name}{a.codename && <span className="text-brand-400 text-xs ml-1">{a.codename}</span>}</p>
                  <p className="text-[10px] text-stone-500">{a.weight_class}</p>
                </div>
                <span className="text-xs text-stone-500 shrink-0">{a.views}次浏览</span>
              </Link>
            ))}
          </div>
        )}
      </motion.div>

      {/* Newcomers */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-400" />本月新人王</h3>
        {nLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (<div key={i} className="flex items-center gap-3 animate-pulse"><div className="w-8 h-8 rounded-full bg-white/5 shrink-0" /><div className="flex-1 space-y-1.5"><div className="h-3 bg-white/5 rounded w-1/3" /><div className="h-2 bg-white/5 rounded w-1/2" /></div></div>))}</div>
        ) : !newcomers?.length ? (
          <p className="text-xs text-stone-600 py-6 text-center">本月暂无新注册选手</p>
        ) : (
          <div className="space-y-2">
            {newcomers.map((a: any, i: number) => (
              <Link key={a.id} to={`/athlete/${a.id}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group">
                <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                <div className="w-8 h-8 rounded-full bg-white/5 overflow-hidden shrink-0">
                  {a.avatar_url ? <img src={a.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><User className="w-4 h-4 text-stone-600" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-semibold truncate group-hover:text-brand-300 transition-colors">{a.name}{a.codename && <span className="text-brand-400 text-xs ml-1">{a.codename}</span>}</p>
                  <p className="text-[10px] text-stone-500">{a.weight_class} · 排名 #{a.rank_score || '--'}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
