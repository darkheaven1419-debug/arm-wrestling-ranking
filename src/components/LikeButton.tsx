import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

type Props = { targetType: 'event' | 'training_location'; targetId: number };

export function LikeButton({ targetType, targetId }: Props) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getSession().then(({ data: { session } }) => { if (session) setUserId(session.user.id); }); }, []);

  const { data } = useQuery({
    queryKey: ['likes', targetType, targetId, userId],
    enabled: !!userId || userId === null,
    queryFn: async () => {
      const [{ count }, { data: my }] = await Promise.all([
        supabase.from('likes').select('*', { count: 'exact', head: true }).eq('target_type', targetType).eq('target_id', targetId),
        userId ? supabase.from('likes').select('id').eq('target_type', targetType).eq('target_id', targetId).eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      return { count: count ?? 0, liked: !!my?.id };
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('login_required');
      if (data?.liked) await supabase.from('likes').delete().eq('target_type', targetType).eq('target_id', targetId).eq('user_id', userId);
      else await supabase.from('likes').insert({ target_type: targetType, target_id: targetId, user_id: userId });
    },
    onMutate: async () => {
      if (!userId) return;
      await qc.cancelQueries({ queryKey: ['likes', targetType, targetId] });
      const prev = qc.getQueryData(['likes', targetType, targetId]);
      qc.setQueryData(['likes', targetType, targetId], (old: any) => ({ count: (old?.count ?? 0) + (old?.liked ? -1 : 1), liked: !old?.liked }));
      return { prev };
    },
    onError: (e: any, _v, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(['likes', targetType, targetId], ctx.prev);
      toast.error(e.message === 'login_required' ? '请先登录' : '操作失败');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['likes', targetType, targetId] }),
  });

  return (
    <button onClick={() => toggle.mutate()} disabled={toggle.isPending}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-all ${data?.liked ? 'bg-red-500/15 text-red-400 border border-red-500/20' : 'bg-white/5 text-stone-500 hover:text-red-400 border border-white/5'}`}
      aria-label={data?.liked ? '取消点赞' : '点赞'} aria-pressed={!!data?.liked}>
      <Heart className={`w-4 h-4 transition-all ${data?.liked ? 'fill-red-400 scale-110' : ''}`} />
      <span className="font-semibold text-xs">{data?.count ?? 0}</span>
    </button>
  );
}
