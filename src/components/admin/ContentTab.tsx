import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Trash2, MessageCircle, TrendingUp, Eye, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import type { Comment } from '@/types';

export function ContentTab() {
  const qc = useQueryClient();

  const { data: comments, isLoading: cLoading } = useQuery({
    queryKey: ['admin-comments'], queryFn: async () => { const { data } = await supabase.from('comments').select('*').order('created_at', { ascending: false }).limit(50); return (data || []) as Comment[]; },
  });

  const { data: topViews, isLoading: vLoading } = useQuery({
    queryKey: ['admin-top-views'],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: views } = await supabase.from('athlete_views').select('athlete_id, athletes!inner(id, name, codename, weight_class)').gte('created_at', since).limit(500);
      if (!views?.length) return [];
      const map: Record<string, any> = {};
      for (const v of views) { const a = (v as any).athletes; if (!a) continue; const k = String(a.id); if (!map[k]) map[k] = { ...a, views: 0 }; map[k].views++; }
      return Object.values(map).sort((a: any, b: any) => b.views - a.views).slice(0, 20);
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-content-stats'],
    queryFn: async () => {
      const [{ count: cc }, { count: lc }, { count: vc }] = await Promise.all([
        supabase.from('comments').select('*', { count: 'exact', head: true }),
        supabase.from('likes').select('*', { count: 'exact', head: true }),
        supabase.from('athlete_views').select('*', { count: 'exact', head: true }),
      ]);
      return { comments: cc ?? 0, likes: lc ?? 0, views: vc ?? 0 };
    },
  });

  const delComment = useMutation({
    mutationFn: async (id: number) => { await supabase.from('comments').delete().eq('id', id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-comments'] }); toast.success('已删除'); },
  });

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[{ label: '总评论', val: stats?.comments ?? '-', icon: MessageCircle, c: 'text-blue-400' }, { label: '总点赞', val: stats?.likes ?? '-', icon: TrendingUp, c: 'text-red-400' }, { label: '总浏览', val: stats?.views ?? '-', icon: Eye, c: 'text-emerald-400' }].map(s => (
          <div key={s.label} className="glass rounded-2xl p-4 text-center"><s.icon className={`w-5 h-5 ${s.c} mx-auto mb-1`} /><div className="text-xl font-black text-white">{s.val}</div><div className="text-[10px] text-stone-500">{s.label}</div></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><MessageCircle className="w-4 h-4 text-blue-400" />最近评论</h3>
          {cLoading ? <RefreshCw className="w-5 h-5 text-stone-600 mx-auto animate-spin my-8" /> : !comments?.length ? <p className="text-xs text-stone-600 py-8 text-center">暂无评论</p> : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {comments.map(c => (
                <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/5 rounded-xl p-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5"><span className="text-xs text-stone-400">{c.user_id ? '👤 登录用户' : '👻 匿名'}</span><span className="text-[10px] text-stone-600">{new Date(c.created_at).toLocaleDateString('zh-CN')}</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5">{c.target_type === 'event' ? '赛事' : '集训'}</span></div>
                    <p className="text-sm text-white">{c.content}</p>
                  </div>
                  <button onClick={() => { if (confirm('确定删除该评论？')) delComment.mutate(c.id); }} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Eye className="w-4 h-4 text-emerald-400" />选手浏览排行 (近7天)</h3>
          {vLoading ? <RefreshCw className="w-5 h-5 text-stone-600 mx-auto animate-spin my-8" /> : !topViews?.length ? <p className="text-xs text-stone-600 py-8 text-center">暂无浏览数据</p> : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {topViews.map((a: any, i: number) => (
                <div key={a.id} className="flex items-center gap-3 bg-white/5 rounded-xl p-2">
                  <span className="w-6 text-center text-xs font-bold text-stone-500">#{i + 1}</span>
                  <div className="flex-1 min-w-0"><p className="text-sm text-white font-semibold truncate">{a.name}{a.codename && <span className="text-brand-400 text-xs ml-1">{a.codename}</span>}</p><p className="text-[10px] text-stone-500">{a.weight_class}</p></div>
                  <span className="text-xs text-emerald-400 font-bold">{a.views}次</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
