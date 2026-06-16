import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { ArrowLeft, Medal, User, MapPin, Scale, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { WEIGHT_CLASSES } from '@/lib/constants';
import type { Athlete } from '@/types';
import { computePowerLevel } from '@/lib/powerLevel';

export function RankingPage() {
  const { hand, weightClass } = useParams<{ hand: string; weightClass: string }>();
  const [search, setSearch] = useState('');

  const { data: athletes, isLoading } = useQuery({
    queryKey: ['athletes', hand, weightClass],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('athletes')
        .select('*')
        .eq('weight_class', weightClass)
        .eq('status', 'approved')
        .order(hand === '左手' ? 'rank_score_left' : 'rank_score', { ascending: true });

      if (error) throw error;
      return data as Athlete[];
    },
    enabled: !!hand && !!weightClass,
  });

  const wc = WEIGHT_CLASSES.find((w) => w.value === weightClass);

  const getRankEmoji = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return null;
  };

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300
              transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-4xl">{wc?.icon}</span>
            <div>
              <h1 className="text-3xl font-bold text-white">
                {hand} · {wc?.label || weightClass}
              </h1>
              <p className="text-stone-500 mt-1">
                {athletes?.length ?? '--'} 位运动员
              </p>
            </div>
          </div>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all"
              placeholder="搜索运动员姓名…" />
          </div>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-6 animate-pulse">
                <div className="h-5 bg-white/5 rounded w-1/3 mb-3" />
                <div className="h-4 bg-white/5 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && athletes?.length === 0 && (
          <div className="glass rounded-3xl p-16 text-center">
            <Medal className="w-16 h-16 text-stone-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-stone-400 mb-2">暂无运动员</h2>
            <p className="text-stone-600 mb-6">
              该级别还没有审核通过的运动员，快来提交你的信息吧！
            </p>
            <Link
              to={`/submit?hand=${hand}&class=${weightClass}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                bg-gradient-to-r from-brand-500 to-brand-600 text-black font-semibold
                hover:from-brand-400 hover:to-brand-500 transition-all duration-300"
            >
              提交我的信息
            </Link>
          </div>
        )}

        {!isLoading && athletes && athletes.length > 0 && (() => {
          const rankField = hand === '左手' ? 'rank_score_left' : 'rank_score';
          const filtered = search.trim() ? athletes.filter(a => a.name.includes(search.trim())) : athletes;
          const hasRankings = filtered.some(a => ((a as any)[rankField] ?? 0) > 0);
          return (
          <motion.div className="space-y-3" initial="hidden" animate="visible">
            {filtered.length === 0 && <p className="text-center text-stone-500 py-8">未找到匹配的运动员</p>}
            {filtered.map((athlete, index) => (
              <motion.div
                key={athlete.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => window.location.hash = `/athlete/${athlete.id}`}
                className={`glass rounded-2xl p-5 flex items-center gap-4 cursor-pointer
                  hover:bg-white/[0.06] transition-colors
                  ${index < 3 ? 'border-brand-500/20' : ''}`}
              >
                <div className="w-10 h-10 flex items-center justify-center text-xl font-bold shrink-0">
                  {getRankEmoji(index) || (
                    <span className="text-stone-600">{index + 1}</span>
                  )}
                </div>

                <div className="w-12 h-12 rounded-xl shrink-0 overflow-hidden border border-brand-500/20">
                  {athlete.avatar_url ? <img loading="lazy" src={athlete.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-brand-500/20 to-violet-500/10 flex items-center justify-center"><User className="w-5 h-5 text-brand-400" /></div>}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">
                    {athlete.codename && <span className="text-brand-400 mr-2">{athlete.codename}</span>}
                    {athlete.name}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-stone-500 mt-0.5 flex-wrap">
                    {athlete.codename && (
                      <span className="text-brand-400 font-semibold">{athlete.codename}</span>
                    )}
                    {athlete.training_spot && (
                      <span className="flex items-center gap-1">
                        🏠 {athlete.training_spot}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {athlete.city}
                    </span>
                    {athlete.body_weight && (
                      <span className="flex items-center gap-1">
                        <Scale className="w-3 h-3" /> {athlete.body_weight}kg
                      </span>
                    )}
                  </div>
                </div>

                {hasRankings && (
                <div className="text-right shrink-0">
                  <div className={`text-2xl font-black ${athlete.is_unknown_power ? 'text-amber-400 text-lg' : 'text-brand-400'}`}>
                    {athlete.is_unknown_power ? '未知' : computePowerLevel(index + 1)}
                  </div>
                  <div className="text-xs text-stone-500">战力值</div>
                </div>
                )}
              </motion.div>
            ))}
          </motion.div>
          );
        })()}
      </div>
    </div>
  );
}
