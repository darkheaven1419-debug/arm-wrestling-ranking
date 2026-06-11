import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dumbbell, Trophy, Users, ArrowRight, TrendingUp, MapPin, Swords, Bell, Calendar, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { WEIGHT_CLASSES } from '@/lib/constants';
import { computePowerLevel } from '@/lib/powerLevel';
import { GridSkeleton } from '@/components/Skeleton';
import type { Announcement, Athlete, ArmEvent, BattleRecord, Hand } from '@/types';
import { useState } from 'react';

const GRADIENTS = [
  'from-amber-500/20 via-orange-500/10 to-transparent',
  'from-blue-500/20 via-cyan-500/10 to-transparent',
  'from-violet-500/20 via-purple-500/10 to-transparent',
  'from-emerald-500/20 via-teal-500/10 to-transparent',
  'from-rose-500/20 via-pink-500/10 to-transparent',
  'from-sky-500/20 via-indigo-500/10 to-transparent',
  'from-yellow-500/20 via-amber-500/10 to-transparent',
];

export function HomePage() {
  const [selectedHand, setSelectedHand] = useState<Hand>('右手');
  const { data: athleteCount } = useQuery({
    queryKey: ['athlete-count'],
    queryFn: async () => { const { count } = await supabase.from('athletes').select('*', { count: 'exact', head: true }).eq('status', 'approved'); return count ?? 0; }
  });
  const { data: featuredAthletes } = useQuery({
    queryKey: ['featured-athletes'],
    queryFn: async () => { const { data } = await supabase.from('athletes').select('*').eq('status', 'approved').eq('is_featured', true).limit(6); return data as Athlete[]; }
  });
  const { data: upcomingEvents } = useQuery({
    queryKey: ['home-events'],
    queryFn: async () => { const { data } = await supabase.from('events').select('*').gte('event_date', new Date().toISOString().split('T')[0]).order('event_date', { ascending: true }).limit(3); return (data || []) as ArmEvent[]; },
    retry: false
  });
  const { data: announcements } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => { const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(2); if (error) return []; return (data || []) as Announcement[]; },
    retry: false
  });
  const { data: recentBattles } = useQuery({
    queryKey: ['recent-battles'],
    queryFn: async () => {
      const { data } = await supabase.from('battle_records').select('*').order('created_at', { ascending: false }).limit(5);
      return (data || []) as BattleRecord[];
    },
    retry: false
  });
  const isFeaturedLoading = !featuredAthletes;

  return (
    <div className="relative">
      {/* Animated background orbs */}
      <div className="absolute top-20 left-0 sm:left-10 w-48 sm:w-72 h-48 sm:h-72 bg-brand-500/10 rounded-full blur-[60px] sm:blur-[80px] animate-pulse pointer-events-none" />
      <div className="absolute top-60 right-0 sm:right-10 w-64 sm:w-96 h-64 sm:h-96 bg-violet-500/8 rounded-full blur-[60px] sm:blur-[100px] animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />

      {/* Hero */}
      <section className="relative pt-28 sm:pt-36 pb-16 px-4 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm mb-8 backdrop-blur-sm">
              <Swords className="w-4 h-4" /> 北京腕力 夺冠摘金
            </div>
          </motion.div>

          <motion.h1 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-none mb-6 tracking-tight" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}>
            <span className="text-gradient">北京腕力</span><br />
            <span className="text-white">排行榜</span>
          </motion.h1>

          <motion.p className="text-base sm:text-lg text-stone-400 max-w-lg mx-auto mb-10 leading-relaxed" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.16 }}>
            北京地区腕力运动员排名平台 · 按体重级别与左右手分类 · 公平竞技
          </motion.p>

          <motion.div className="flex justify-center gap-3 sm:gap-6 flex-wrap mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.24 }}>
            {[{ icon: Users, value: athleteCount ?? '--', label: '注册运动员', color: 'text-sky-400' },{ icon: Trophy, value: '7', label: '体重级别', color: 'text-amber-400' },{ icon: MapPin, value: '北京', label: '当前地区', color: 'text-emerald-400' }].map(s => (
              <div key={s.label} className="glass rounded-2xl px-5 sm:px-7 py-4 text-center min-w-[110px] hover:scale-105 transition-all duration-300 hover:border-brand-500/30">
                <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-2`} />
                <div className="text-2xl font-black text-white">{s.value}</div>
                <div className="text-xs text-stone-500 mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>

          <motion.div className="flex justify-center gap-3 flex-wrap" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.32 }}>
            <Link to={`/submit?hand=${selectedHand}`} className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-bold hover:from-brand-400 hover:to-brand-500 transition-all duration-300 shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-105">
              提交我的信息 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/training" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-stone-300 font-semibold hover:bg-white/10 hover:border-white/20 transition-all duration-300">
              <MapPin className="w-4 h-4" /> 集训地点
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Weight Classes */}
      <section className="relative max-w-6xl mx-auto px-4 pb-16">
        <motion.div className="text-center mb-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <h2 className="text-2xl font-bold text-white mb-3 flex items-center justify-center gap-2"><TrendingUp className="w-6 h-6 text-brand-400" />选择级别查看排名</h2>
          <div className="flex justify-center mb-6">
            <div className="glass rounded-2xl p-1.5 flex gap-1">
              {(['左手', '右手'] as Hand[]).map(hand => (
                <button key={hand} onClick={() => setSelectedHand(hand)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${selectedHand === hand ? 'bg-white/10 text-white' : 'text-stone-500 hover:text-stone-300'}`}>
                  {hand === '左手' ? '🤚' : '✋'} {hand}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {WEIGHT_CLASSES.map((wc, i) => (
            <motion.div key={wc.value} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.06 * i }}>
              <Link to={`/ranking/${selectedHand}/${wc.value}`}
                className={`group relative block glass rounded-2xl p-6 text-center overflow-hidden hover:scale-[1.04] transition-all duration-300 hover:shadow-2xl border border-transparent hover:border-brand-500/20`}>
                <div className={`absolute inset-0 bg-gradient-to-b ${GRADIENTS[i]} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <span className="text-5xl mb-3 block group-hover:scale-110 transition-transform duration-300">{wc.icon}</span>
                  <h3 className="text-xl font-extrabold text-white mb-1 group-hover:text-brand-300 transition-colors">{wc.label}</h3>
                  <p className="text-xs text-stone-500">{selectedHand} · 查看排名</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recent Battles */}
      {recentBattles && recentBattles.length > 0 && (
        <section className="relative max-w-4xl mx-auto px-4 pb-16">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 justify-center"><Activity className="w-5 h-5 text-rose-400" />最新战绩</h2>
          <div className="space-y-2">
            {recentBattles.map(b => {
              const winnerName = (b as any).winner_name || `#${b.winner_id}`;
              const loserName = (b as any).loser_name || `#${b.loser_id}`;
              return (
              <Link key={b.id} to={`/athlete/${b.winner_id}`} className="glass rounded-xl px-5 py-3 flex items-center gap-4 hover:bg-white/[0.06] transition-colors block">
                <span className="text-lg shrink-0">⚔️</span>
                <div className="flex-1 min-w-0">
                  <span className="text-white font-medium">{winnerName}</span>
                  <span className="text-stone-600 mx-2">胜</span>
                  <span className="text-stone-400">{loserName}</span>
                </div>
                <div className="text-xs text-stone-500 shrink-0">
                  {b.hand} · {b.event_name || '友谊赛'} · {new Date(b.created_at).toLocaleDateString('zh-CN')}
                </div>
              </Link>
              );
            })}
          </div>
          <div className="text-center mt-4">
            <Link to="/compare" className="text-xs text-stone-500 hover:text-brand-400 transition-colors">⚔️ 记录更多战绩 →</Link>
          </div>
        </section>
      )}

      {/* Featured Athletes */}
      {isFeaturedLoading ? (
        <section className="relative max-w-6xl mx-auto px-4 pb-16">
          <h2 className="text-xl font-bold text-white mb-6 text-center">优秀运动员</h2>
          <GridSkeleton count={6} />
        </section>
      ) : featuredAthletes && featuredAthletes.length > 0 && (
        <section className="relative max-w-6xl mx-auto px-4 pb-16">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 justify-center"><Trophy className="w-5 h-5 text-amber-400" />优秀运动员</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {featuredAthletes.map(a => (
              <motion.a key={a.id} href={`#/athlete/${a.id}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4 text-center hover:scale-105 transition-all cursor-pointer block border-amber-500/20">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-violet-500/10 flex items-center justify-center mx-auto mb-3 border border-brand-500/20"><Trophy className="w-5 h-5 text-brand-400" /></div>
                <p className="text-white text-sm font-bold truncate">{a.name}</p>
                {a.codename && <p className="text-brand-400 text-xs truncate">{a.codename}</p>}
                <p className="text-stone-500 text-xs mt-1">{a.weight_class}</p>
                {((a.rank_score ?? 0) > 0 || a.is_unknown_power) && (
                  <p className={`text-xs font-bold mt-1 ${a.is_unknown_power ? 'text-amber-400' : 'text-brand-400'}`}>
                    {a.is_unknown_power ? '战力 未知' : `#${a.rank_score} · 战力 ${computePowerLevel(a.rank_score!)}`}
                  </p>
                )}
              </motion.a>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Events */}
      {upcomingEvents && upcomingEvents.length > 0 && (
        <section className="relative max-w-4xl mx-auto px-4 pb-16">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 justify-center"><Calendar className="w-5 h-5 text-emerald-400" />近期赛事</h2>
          <div className="space-y-3">
            {upcomingEvents.map(evt => (
              <Link key={evt.id} to="/events" className="glass rounded-2xl p-5 flex items-center gap-4 hover:bg-white/[0.06] transition-colors block">
                <div className="shrink-0 w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-stone-400">{new Date(evt.event_date).toLocaleDateString('zh-CN', { month: 'short' })}</span>
                  <span className="text-xl font-black text-white">{new Date(evt.event_date).getDate()}</span>
                </div>
                <div>
                  <h3 className="text-white font-bold">{evt.title}</h3>
                  {evt.location && <p className="text-xs text-stone-500 mt-0.5">📍 {evt.location}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Announcements */}
      {announcements && announcements.length > 0 && (
        <section className="relative max-w-4xl mx-auto px-4 pb-16">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 justify-center"><Bell className="w-5 h-5 text-brand-400" />最新公告</h2>
          <div className="space-y-3">
            {announcements.map(a => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5">
                <h3 className="text-white font-bold mb-1">{a.title}</h3>
                {a.content && <p className="text-sm text-stone-400">{a.content}</p>}
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <motion.div className="text-center pb-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
        <Link to={`/submit?hand=${selectedHand}`} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-stone-400 text-sm hover:bg-white/10 hover:text-white transition-all duration-300">
          <Dumbbell className="w-4 h-4" /> 提交你的运动员信息 <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </motion.div>
    </div>
  );
}
