import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dumbbell, Trophy, Users, ArrowRight } from 'lucide-react';
import { WEIGHT_CLASSES } from '@/lib/constants';
import type { Hand } from '@/types';

export function HomePage() {
  const [selectedHand, setSelectedHand] = useState<Hand>('右手');

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px]
          bg-gradient-to-b from-brand-500/10 via-violet-500/5 to-transparent
          blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full
              bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm mb-8">
              <Dumbbell className="w-4 h-4" />
              北京腕力运动社区
            </div>
          </motion.div>

          <motion.h1
            className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <span className="text-gradient">北京腕力</span>
            <br />
            <span className="text-white">排行榜</span>
          </motion.h1>

          <motion.p
            className="text-lg text-stone-400 max-w-xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            查看北京地区腕力运动员排名，提交个人信息参与排名。
            按体重级别和左右手分类，公平竞技。
          </motion.p>

          <motion.div
            className="flex justify-center gap-4 sm:gap-8 flex-wrap mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {[
              { icon: Users, value: '--', label: '注册运动员' },
              { icon: Trophy, value: '14', label: '体重级别' },
              { icon: Dumbbell, value: '北京', label: '当前地区' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="glass rounded-2xl px-6 sm:px-8 py-4 text-center min-w-[130px]
                  hover:scale-105 transition-transform duration-300"
              >
                <stat.icon className="w-5 h-5 text-brand-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-stone-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          <motion.div
            className="flex justify-center gap-3 flex-wrap"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Link
              to="/submit"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                bg-gradient-to-r from-brand-500 to-brand-600 text-black font-semibold
                hover:from-brand-400 hover:to-brand-500 transition-all duration-300
                shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40"
            >
              提交我的信息
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Hand Toggle + Weight Classes */}
      <section className="relative max-w-6xl mx-auto px-4 pb-24">
        <div className="flex justify-center mb-12">
          <div className="glass rounded-2xl p-1.5 flex gap-1">
            {(['左手', '右手'] as Hand[]).map((hand) => (
              <button
                key={hand}
                onClick={() => setSelectedHand(hand)}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300
                  ${selectedHand === hand
                    ? 'bg-white/10 text-white shadow-lg'
                    : 'text-stone-500 hover:text-stone-300'
                  }`}
              >
                {hand === '左手' ? '🤚' : '✋'} {hand}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {WEIGHT_CLASSES.map((wc, i) => (
            <motion.div
              key={wc.value}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * i }}
            >
              <Link
                to={`/ranking/${selectedHand}/${wc.value}`}
                className="group block glass rounded-2xl p-6 text-center
                  hover:bg-white/[0.07] hover:scale-[1.03] transition-all duration-300
                  hover:shadow-xl hover:shadow-brand-500/5"
              >
                <span className="text-4xl mb-3 block">{wc.icon}</span>
                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-brand-400 transition-colors">
                  {wc.label}
                </h3>
                <p className="text-xs text-stone-500">
                  {selectedHand} &middot; 点击查看排名
                </p>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            to="/submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
              bg-white/5 border border-white/10 text-stone-400 text-sm
              hover:bg-white/10 hover:text-white transition-all duration-300"
          >
            没有找到你的级别？提交运动员信息
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
