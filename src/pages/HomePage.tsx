import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dumbbell, Trophy, Users, ArrowRight, TrendingUp, MapPin, Swords } from 'lucide-react';
import { WEIGHT_CLASSES } from '@/lib/constants';
import type { Hand } from '@/types';

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

  return (
    <div className="relative">
      {/* Animated background orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-brand-500/10 rounded-full blur-[80px] animate-pulse pointer-events-none" />
      <div className="absolute top-60 right-10 w-96 h-96 bg-violet-500/8 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />

      {/* Hero */}
      <section className="relative pt-28 sm:pt-36 pb-16 px-4 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm mb-8 backdrop-blur-sm">
              <Swords className="w-4 h-4" /> 北京腕力 夺冠摘金
            </div>
          </motion.div>

          <motion.h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-none mb-6 tracking-tight" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}>
            <span className="text-gradient">北京腕力</span><br />
            <span className="text-white">排行榜</span>
          </motion.h1>

          <motion.p className="text-base sm:text-lg text-stone-400 max-w-lg mx-auto mb-10 leading-relaxed" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.16 }}>
            北京地区腕力运动员排名平台 · 按体重级别与左右手分类 · 公平竞技
          </motion.p>

          <motion.div className="flex justify-center gap-3 sm:gap-6 flex-wrap mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.24 }}>
            {[{ icon: Users, value: '--', label: '注册运动员', color: 'text-sky-400' },{ icon: Trophy, value: '14', label: '体重级别', color: 'text-amber-400' },{ icon: MapPin, value: '北京', label: '当前地区', color: 'text-emerald-400' }].map(s => (
              <div key={s.label} className="glass rounded-2xl px-5 sm:px-7 py-4 text-center min-w-[110px] hover:scale-105 transition-all duration-300 hover:border-brand-500/30">
                <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-2`} />
                <div className="text-2xl font-black text-white">{s.value}</div>
                <div className="text-xs text-stone-500 mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>

          <motion.div className="flex justify-center gap-3 flex-wrap" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.32 }}>
            <Link to="/submit" className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-bold hover:from-brand-400 hover:to-brand-500 transition-all duration-300 shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-105">
              提交我的信息 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/training" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-stone-300 font-semibold hover:bg-white/10 hover:border-white/20 transition-all duration-300">
              <MapPin className="w-4 h-4" /> 集训地点
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Weight Classes */}
      <section className="relative max-w-6xl mx-auto px-4 pb-24">
        <motion.div className="text-center mb-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <h2 className="text-2xl font-bold text-white mb-3 flex items-center justify-center gap-2"><TrendingUp className="w-6 h-6 text-brand-400" />选择级别查看排名</h2>
          <div className="flex justify-center">
            <div className="glass rounded-2xl p-1.5 flex gap-1">
              {(['左手', '右手'] as Hand[]).map(hand => (
                <button key={hand} onClick={() => setSelectedHand(hand)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${selectedHand === hand ? 'bg-white/10 text-white shadow-lg scale-105' : 'text-stone-500 hover:text-stone-300'}`}>
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

        <motion.div className="text-center mt-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          <Link to="/submit" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-stone-400 text-sm hover:bg-white/10 hover:text-white transition-all duration-300">
            <Dumbbell className="w-4 h-4" /> 提交你的运动员信息 <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
