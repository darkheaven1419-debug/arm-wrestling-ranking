import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, User, MapPin, Scale, Trophy, Swords, Camera, Edit3, TrendingUp, Medal } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { WEIGHT_CLASSES } from '@/lib/constants';
import { computePowerLevel, getPowerBadge } from '@/lib/powerLevel';
import { useAthleteView } from '@/lib/useAthleteView';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { AthleteEditModal } from '@/components/AthleteEditModal';
import { TrainingCheckIn } from '@/components/TrainingCheckIn';
import type { Athlete, BattleRecord } from '@/types';

export function AthletePage() {
  const { athleteId } = useParams<{ athleteId: string }>();
  const id = parseInt(athleteId || '0');
  const queryClient = useQueryClient();
  useAthleteView(id || undefined);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [showAllBattles, setShowAllBattles] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setCurrentUserId(session.user.id);
    });
  }, []);

  const { data: athlete, isLoading } = useQuery({
    queryKey: ['athlete', athleteId],
    queryFn: async () => { const { data } = await supabase.from('athletes').select('*').eq('id', athleteId).single(); return data as Athlete | null; },
    enabled: !!athleteId,
  });

  const { data: groupRank } = useQuery({
    queryKey: ['athlete-group-rank', athlete?.hand, athlete?.weight_class],
    queryFn: async () => {
      if (!athlete) return null;
      const { data } = await supabase.from('athletes').select('id, name, rank_score').eq('hand', athlete.hand).eq('weight_class', athlete.weight_class).eq('status', 'approved').order('rank_score', { ascending: true });
      if (!data) return null;
      const position = data.findIndex(a => a.id === athlete.id) + 1;
      return { position, total: data.length };
    },
    enabled: !!athlete,
  });

  const { data: allBattles } = useQuery({
    queryKey: ['athlete-all-battles', athleteId],
    queryFn: async () => {
      const { data } = await supabase.from('battle_records').select('*').or(`winner_id.eq.${id},loser_id.eq.${id}`).order('created_at', { ascending: false }).limit(50);
      return (data || []) as BattleRecord[];
    },
    enabled: !!athleteId,
  });

  if (isLoading) return (
    <div className="pt-24 pb-20 px-4"><div className="max-w-2xl mx-auto">
      <div className="glass rounded-3xl p-8 animate-pulse">
        <div className="flex items-start gap-6 mb-8"><div className="w-20 h-20 rounded-2xl bg-white/5" /><div className="flex-1 space-y-3"><div className="h-8 bg-white/5 rounded w-1/3" /><div className="h-4 bg-white/5 rounded w-2/3" /></div></div>
        <div className="space-y-3"><div className="h-4 bg-white/5 rounded w-full" /><div className="h-4 bg-white/5 rounded w-4/5" /></div>
      </div>
    </div></div>
  );

  if (!athlete) return (
    <div className="pt-24 pb-20 px-4 text-center">
      <div className="glass rounded-3xl p-16 max-w-md mx-auto"><User className="w-16 h-16 text-stone-700 mx-auto mb-4" /><p className="text-stone-500 text-lg">运动员不存在</p><Link to="/" className="inline-block mt-4 text-brand-400 hover:text-brand-300">返回首页</Link></div>
    </div>
  );

  const wc = WEIGHT_CLASSES.find(w => w.value === athlete.weight_class);
  const rank = groupRank?.position ?? null;
  const rankScore = athlete.hand === '左手' ? athlete.rank_score_left : athlete.rank_score;
  const powerLevel = athlete.is_unknown_power ? null : (rank ? computePowerLevel(rank) : ((rankScore ?? 0) > 0 ? computePowerLevel(rankScore!) : 0));
  const badge = powerLevel ? getPowerBadge(powerLevel) : null;
  const isOwner = currentUserId && athlete.user_id === currentUserId;
  useDocumentTitle(athlete ? `${athlete.name}${athlete.codename ? '「'+athlete.codename+'」' : ''}·${athlete.weight_class}` : null);

  const battles = allBattles || [];
  const wins = battles.filter(b => b.winner_id === athlete.id).length;
  const losses = battles.filter(b => b.loser_id === athlete.id).length;
  const total = battles.length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const displayedBattles = showAllBattles ? battles : battles.slice(0, 5);

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to={`/ranking/${athlete.hand || '右手'}/${athlete.weight_class}`} className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 mb-8 transition-colors"><ArrowLeft className="w-4 h-4" />返回 {athlete.hand || '右手'} · {athlete.weight_class} 排名</Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-start gap-5 mb-8 flex-wrap">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shrink-0 overflow-hidden border-2 border-brand-500/30 bg-white/5">
              {athlete.avatar_url ? <img loading="lazy" src={athlete.avatar_url} alt={athlete.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-brand-500/30 to-violet-500/20 flex items-center justify-center"><User className="w-10 h-10 text-brand-400" /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white truncate">{athlete.name}</h1>
                {athlete.codename && <span className="text-brand-400 text-lg sm:text-xl font-bold shrink-0">「{athlete.codename}」</span>}
              </div>
              <div className="flex items-center gap-3 text-sm text-stone-400 flex-wrap">
                <span className="flex items-center gap-1"><Trophy className="w-4 h-4 text-amber-400" />{wc?.icon} {athlete.weight_class}</span>
                <span className="flex items-center gap-1"><Scale className="w-4 h-4" />{athlete.body_weight ?? '--'} kg</span>
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{athlete.city}</span>
                {athlete.hand && <span className="text-xs px-2 py-0.5 rounded-full bg-white/5">{athlete.hand === '左手' ? '🤚' : '✋'} {athlete.hand}选手</span>}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="glass rounded-2xl p-3 text-center">
              <div className="text-2xl font-black text-brand-400">{powerLevel !== null ? powerLevel : '?'}</div>
              <div className="text-[10px] text-stone-500">战力值{badge && <span className="ml-1 text-amber-400">{badge.tier}</span>}</div>
            </div>
            <div className="glass rounded-2xl p-3 text-center">
              <div className="text-2xl font-black text-white">#{rank ?? '--'}</div>
              <div className="text-[10px] text-stone-500">组内排名 / {groupRank?.total ?? '--'}</div>
            </div>
            <div className="glass rounded-2xl p-3 text-center">
              <div className="text-2xl font-black text-emerald-400">{wins}</div>
              <div className="text-[10px] text-stone-500">胜场</div>
            </div>
            <div className="glass rounded-2xl p-3 text-center">
              <div className="text-2xl font-black text-red-400">{losses}</div>
              <div className="text-[10px] text-stone-500">负场</div>
            </div>
          </div>

          {/* Win Rate Bar */}
          {total > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5">
                <span>胜负率</span>
                <span><span className="text-emerald-400 font-bold">{wins}胜</span> / <span className="text-red-400">{losses}负</span> · 共{total}场</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${winRate}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-brand-500" />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            {isOwner ? (
              <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-stone-300 text-sm hover:bg-white/10 transition-all"><Edit3 className="w-4 h-4" />编辑资料</button>
            ) : (
              <Link to={`/submit?edit=${athlete.id}`} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-stone-300 text-sm hover:bg-white/10 transition-all"><Edit3 className="w-4 h-4" />编辑</Link>
            )}
            <button onClick={() => toast.success('战绩卡功能即将上线')} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500/20 to-amber-500/10 border border-brand-500/20 text-brand-400 text-sm hover:from-brand-500/30 transition-all"><Camera className="w-4 h-4" />生成战绩卡</button>
          </div>

          {/* Bio & Achievements */}
          {athlete.achievements && (<div className="mb-4"><h3 className="text-sm font-semibold text-stone-400 mb-2 flex items-center gap-2"><Medal className="w-4 h-4 text-amber-400" />比赛成绩</h3><p className="text-white text-sm leading-relaxed whitespace-pre-line">{athlete.achievements}</p></div>)}
          {athlete.bio && (<div className="mb-4"><h3 className="text-sm font-semibold text-stone-400 mb-2">个人简介</h3><p className="text-white text-sm leading-relaxed whitespace-pre-line">{athlete.bio}</p></div>)}
          {athlete.training_spot && (<div className="glass rounded-2xl p-4 mb-4"><p className="text-sm text-stone-400">🏠 常去集训点：<span className="text-white">{athlete.training_spot}</span></p></div>)}
          <TrainingCheckIn athleteUserId={athlete.user_id} />

          {/* Videos */}
          {Array.isArray((athlete as any).video_urls) && (athlete as any).video_urls.length > 0 && (
            <div className="mb-4"><h3 className="text-sm font-semibold text-stone-400 mb-2">🎬 比赛/训练视频</h3>
              <div className="space-y-2">{((athlete as any).video_urls as string[]).map((url: string, i: number) => (<a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block text-sm text-brand-400 hover:text-brand-300 truncate">📹 {url}</a>))}</div>
            </div>
          )}

          {/* Battle History */}
          {battles.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-stone-400 mb-3 flex items-center gap-2"><Swords className="w-4 h-4 text-brand-400" />切磋战绩 ({total}场)</h3>
              <div className="space-y-1.5">
                {displayedBattles.map(b => (
                  <div key={b.id} className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${b.winner_id === athlete.id ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    <span>{b.winner_id === athlete.id ? '✅' : '❌'}</span>
                    <span>{b.hand} · {b.event_name || '友谊赛'} · {new Date(b.created_at).toLocaleDateString('zh-CN')}</span>
                  </div>
                ))}
              </div>
              {battles.length > 5 && !showAllBattles && (
                <button onClick={() => setShowAllBattles(true)} className="mt-2 text-xs text-brand-400 hover:text-brand-300 transition-colors">查看全部 {battles.length} 场战绩 →</button>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-4 text-xs text-stone-600 mt-6 pt-6 border-t border-white/5">
            <div>性别：{athlete.gender}<span className="ml-4">加入：{new Date(athlete.created_at).toLocaleDateString('zh-CN')}</span></div>
            {athlete.is_featured && <span className="text-amber-400 flex items-center gap-1"><TrendingUp className="w-3 h-3" />精选运动员</span>}
          </div>
        </motion.div>
      </div>
      <AthleteEditModal athlete={athlete} isOpen={editOpen} onClose={() => setEditOpen(false)} onSaved={() => { queryClient.invalidateQueries({ queryKey: ['athlete', athleteId] }); }} />
    </div>
  );
}
