import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, Trash2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

type Props = { targetType: 'event' | 'training_location'; targetId: number };

export function CommentSection({ targetType, targetId }: Props) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [anonymous, setAnonymous] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setUserId(session.user.id);
      const { data } = await supabase.from('admin_users').select('role').eq('user_id', session.user.id).maybeSingle();
      setIsAdmin(!!data);
    });
  }, []);

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', targetType, targetId],
    queryFn: async () => {
      const { data } = await supabase.from('comments').select('*').is('deleted_at', null).eq('target_type', targetType).eq('target_id', targetId).order('created_at', { ascending: false }).limit(50);
      return (data || []) as any[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('login');
      if (!content.trim()) return;
      await supabase.from('comments').insert({ target_type: targetType, target_id: targetId, user_id: userId, content: content.trim(), is_anonymous: anonymous });
    },
    onSuccess: () => { setContent(''); setAnonymous(false); qc.invalidateQueries({ queryKey: ['comments', targetType, targetId] }); },
    onError: (e: Error) => { if (e.message === 'login') toast.error('请先登录后评论'); },
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('comments').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ['comments', targetType, targetId] });
      const prev = qc.getQueryData(['comments', targetType, targetId]);
      qc.setQueryData(['comments', targetType, targetId], (old: any) => (old || []).filter((c: any) => c.id !== id));
      return { prev };
    },
    onSuccess: () => { toast.success('已删除'); },
    onError: (_e: any, _id: number, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(['comments', targetType, targetId], ctx.prev);
      toast.error('删除失败，请重试');
    },
  });

  const displayed = showAll ? (comments || []) : (comments || []).slice(0, 5);
  const total = (comments || []).length;

  return (
    <div className="mt-4 pt-4 border-t border-white/5">
      <h4 className="text-sm font-semibold text-stone-400 mb-3 flex items-center gap-2"><MessageCircle className="w-4 h-4" />评论{total > 0 && ` (${total})`}</h4>
      {userId ? (
        <div className="space-y-2 mb-4">
          <div className="flex gap-2">
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={2}
              className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all resize-none"
              placeholder="写下你的评论…"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add.mutate(); } }} />
            <button onClick={() => add.mutate()} disabled={add.isPending || !content.trim()}
              className="shrink-0 w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 transition-all flex items-center justify-center disabled:opacity-30"><Send className="w-4 h-4" /></button>
          </div>
          <label className="flex items-center gap-2 text-xs text-stone-500 cursor-pointer select-none">
            <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} className="rounded accent-brand-500" />👻 匿名评论
          </label>
        </div>
      ) : (
        <p className="text-xs text-stone-600 mb-4">请先登录后评论</p>
      )}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (<div key={i} className="flex gap-3 animate-pulse"><div className="w-8 h-8 rounded-full bg-white/5 shrink-0" /><div className="flex-1 space-y-2"><div className="h-3 bg-white/5 rounded w-1/4" /><div className="h-4 bg-white/5 rounded w-3/4" /></div></div>))}</div>
      ) : total === 0 ? (
        <p className="text-xs text-stone-600 text-center py-4">暂无评论，来发表第一条吧</p>
      ) : (
        <div className="space-y-3">
          {displayed.map((c: any) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-white/5 shrink-0 flex items-center justify-center"><User className="w-3.5 h-3.5 text-stone-500" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs text-stone-400 font-semibold">{c.is_anonymous ? '👻 匿名用户' : (c.user_nickname || '用户')}</span>
                  <span className="text-[10px] text-stone-600">{new Date(c.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
                <p className="text-sm text-white leading-relaxed break-words">{c.content}</p>
                {(userId === c.user_id || isAdmin) && (
                  <button onClick={() => { if (confirm('确定删除？')) del.mutate(c.id); }} className="mt-1 text-[10px] text-stone-600 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3 inline" />删除</button>
                )}
              </div>
            </div>
          ))}
          {total > 5 && !showAll && (<button onClick={() => setShowAll(true)} className="text-xs text-brand-400 hover:text-brand-300 w-full text-center py-1">查看全部 {total} 条 →</button>)}
        </div>
      )}
    </div>
  );
}
