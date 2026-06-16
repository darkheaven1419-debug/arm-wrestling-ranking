import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Trash2, MessageCircle, TrendingUp, Eye, RefreshCw, Calendar, MapPin, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export function ContentTab() {
  const qc = useQueryClient();

  const { data: comments, isLoading: cLoading } = useQuery({
    queryKey: ['admin-comments'],
    queryFn: async () => {
      const { data } = await supabase.from('comments').select('*').order('created_at', { ascending: false }).limit(50);
      if (!data?.length) return [];
      const eventIds = data.filter((c: any) => c.target_type === 'event').map((c: any) => c.target_id);
      const trainingIds = data.filter((c: any) => c.target_type === 'training_location').map((c: any) => c.target_id);
      const [{ data: events }, { data: trainings }] = await Promise.all([
        eventIds.length ? supabase.from('events').select('id, title').in('id', eventIds) : Promise.resolve({ data: [] }),
        trainingIds.length ? supabase.from('training_locations').select('id, name').in('id', trainingIds) : Promise.resolve({ data: [] }),
      ]);
      const em = new Map((events || []).map((e: any) => [e.id, e.title]));
      const tm = new Map((trainings || []).map((t: any) => [t.id, t.name]));
      return data.map((c: any) => ({ ...c, target_name: c.target_type === 'event' ? (em.get(c.target_id) || `赛事#${c.target_id}`) : (tm.get(c.target_id) || `集训#${c.target_id}`) }));
    },
  });

  const { data: topViews, isLoading: vLoading } = useQuery({
    queryKey: ['admin-top-views'],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: views } = await supabase.from('athlete_views').select('athlete_id, athletes!inner(id, name, codename, weight_class, avatar_url)').gte('created_at', since).limit(500);
      if (!views?.length) return [];
      const map: Record<string, any> = {};
      for (const v of views) { const a = (v as any).athletes; if (!a) continue; const k = String(a.id); if (!map[k]) map[k] = { ...a, views: 0 }; map[k].views++; }
      return Object.values(map).sort((a: any, b: any) => b.views - a.views).slice(0, 10);
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-content-stats'],
    queryFn: async () => {
      const ms = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const [{ count: cc }, { count: lc }, { count: vc }, { count: ec }, { count: tc }, { count: emc }, { count: tmc }] = await Promise.all([
        supabase.from('comments').select('*', { count: 'exact', head: true }),
        supabase.from('likes').select('*', { count: 'exact', head: true }),
        supabase.from('athlete_views').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('training_locations').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }).gte('created_at', ms),
        supabase.from('training_locations').select('*', { count: 'exact', head: true }).gte('created_at', ms),
      ]);
      return { comments: cc ?? 0, likes: lc ?? 0, views: vc ?? 0, events: ec ?? 0, trainings: tc ?? 0, eventsMonth: emc ?? 0, trainingsMonth: tmc ?? 0 };
    },
  });

  const delComment = useMutation({
    mutationFn: async (id: number) => { await supabase.from('comments').delete().eq('id', id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-comments'] }); toast.success('已删除'); },
  });

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[{ l: '总评论', v: stats?.comments ?? '-', i: MessageCircle, c: 'text-blue-400' },
          { l: '总点赞', v: stats?.likes ?? '-', i: TrendingUp, c: 'text-red-400' },
          { l: '赛事', v: `${stats?.events ?? '-'}`, s: stats?.eventsMonth ? `+${stats.eventsMonth}本月` : '', i: Calendar, c: 'text-amber-400' },
          { l: '集训点', v: `${stats?.trainings ?? '-'}`, s: stats?.trainingsMonth ? `+${stats.trainingsMonth}本月` : '', i: MapPin, c: 'text-emerald-400' }].map(s => (
          <div key={s.l} className="glass rounded-2xl p-4 text-center"><s.i className={`w-5 h-5 ${s.c} mx-auto mb-1`} /><div className="text-xl font-black text-white">{s.v}</div><div className="text-[10px] text-stone-500">{s.l}{s.s && <span className="ml-1 text-emerald-400">{s.s}</span>}</div></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><MessageCircle className="w-4 h-4 text-blue-400" />评论管理 ({comments?.length || 0})</h3>
          {cLoading ? <RefreshCw className="w-5 h-5 text-stone-600 mx-auto animate-spin my-8" /> : !comments?.length ? <p className="text-xs text-stone-600 py-8 text-center">暂无评论</p> : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {comments.map((c: any) => (
                <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${c.target_type === 'event' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{c.target_type === 'event' ? '赛事' : '集训'}</span>
                    <span className="text-xs text-stone-400 truncate flex-1">{c.target_name || `#${c.target_id}`}</span>
                    <span className="text-[10px] text-stone-600 shrink-0">{new Date(c.created_at).toLocaleDateString('zh-CN')}</span>
                    <button onClick={() => { if (confirm('确定删除？')) delComment.mutate(c.id); }} className="p-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 shrink-0"><Trash2 className="w-3 h-3" /></button>
                  </div>
                  <p className="text-sm text-white pl-1">{c.content}</p>
                  <p className="text-[10px] text-stone-600 mt-0.5 pl-1">{c.user_id ? '👤 登录用户' : '👻 匿名用户'}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Eye className="w-4 h-4 text-emerald-400" />选手浏览排行 · 近7天</h3>
          {vLoading ? <RefreshCw className="w-5 h-5 text-stone-600 mx-auto animate-spin my-8" /> : !topViews?.length ? <p className="text-xs text-stone-600 py-8 text-center">暂无浏览数据</p> : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {topViews.map((a: any, i: number) => (
                <Link key={a.id} to={`/athlete/${a.id}`} className="flex items-center gap-3 bg-white/5 rounded-xl p-2 hover:bg-white/10 transition-colors">
                  <span className={`w-6 text-center text-xs font-bold ${i < 3 ? 'text-amber-400' : 'text-stone-500'}`}>#{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-white/5 overflow-hidden shrink-0 flex items-center justify-center">
                    {a.avatar_url ? <img src={a.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-stone-600" />}
                  </div>
                  <div className="flex-1 min-w-0"><p className="text-sm text-white font-semibold truncate">{a.name}{a.codename && <span className="text-brand-400 text-xs ml-1">{a.codename}</span>}</p><p className="text-[10px] text-stone-500">{a.weight_class}</p></div>
                  <span className="text-xs text-emerald-400 font-bold shrink-0">{a.views}次</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
