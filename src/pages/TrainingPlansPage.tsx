import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Dumbbell, Clock, BarChart3, ChevronDown, Filter } from 'lucide-react';
import { TRAINING_PLANS } from '@/lib/trainingPlansData';
import { WEIGHT_CLASSES } from '@/lib/constants';

const DC: Record<string, string> = { beginner: 'bg-emerald-500/20 text-emerald-400', intermediate: 'bg-amber-500/20 text-amber-400', advanced: 'bg-red-500/20 text-red-400' };
const DL: Record<string, string> = { beginner: '入门', intermediate: '进阶', advanced: '高级' };

export function TrainingPlansPage() {
  const [wFilter, setWFilter] = useState('all');
  const [dFilter, setDFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = TRAINING_PLANS.filter(p => (wFilter === 'all' || p.weightClass === wFilter) && (dFilter === 'all' || p.difficulty === dFilter));

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 mb-6 transition-colors"><ArrowLeft className="w-4 h-4" />返回首页</Link>
        <div className="flex items-center gap-3 mb-8"><Dumbbell className="w-7 h-7 text-brand-400" /><h1 className="text-3xl font-bold text-white">训练计划库</h1></div>

        <div className="flex flex-wrap gap-3 mb-8">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-stone-500" />
            <button onClick={() => setWFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${wFilter === 'all' ? 'bg-white/10 text-white' : 'bg-white/5 text-stone-500 hover:text-stone-300'}`}>全部级别</button>
            {WEIGHT_CLASSES.map(w => (<button key={w.value} onClick={() => setWFilter(w.value)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${wFilter === w.value ? 'bg-brand-500/20 text-brand-400' : 'bg-white/5 text-stone-500'}`}>{w.icon} {w.value}</button>))}
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            {(['all', 'beginner', 'intermediate', 'advanced'] as const).map(d => (<button key={d} onClick={() => setDFilter(d)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${dFilter === d ? 'bg-white/10 text-white' : 'bg-white/5 text-stone-500'}`}>{d === 'all' ? '全部难度' : DL[d]}</button>))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="glass rounded-3xl p-16 text-center"><Dumbbell className="w-16 h-16 text-stone-700 mx-auto mb-4" /><p className="text-stone-500">没有匹配的训练计划</p><button onClick={() => { setWFilter('all'); setDFilter('all'); }} className="mt-3 text-sm text-brand-400">重置筛选</button></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((plan, i) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`glass rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.01] transition-all ${expanded === plan.id ? 'ring-2 ring-brand-500/40' : ''}`}
                onClick={() => setExpanded(expanded === plan.id ? null : plan.id)}>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-stone-400">{WEIGHT_CLASSES.find(w => w.value === plan.weightClass)?.icon} {plan.weightClass}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${DC[plan.difficulty]}`}>{DL[plan.difficulty]}</span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{plan.title}</h3>
                  <p className="text-xs text-stone-400 mb-3 line-clamp-2">{plan.description}</p>
                  <div className="flex items-center gap-4 text-xs text-stone-500">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{plan.duration}</span>
                    <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />{plan.exercises.length}个动作</span>
                    <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${expanded === plan.id ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                <AnimatePresence>
                  {expanded === plan.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-white/5">
                      <div className="p-5">
                        <h4 className="text-sm font-semibold text-stone-300 mb-3">训练动作列表</h4>
                        <div className="space-y-2">
                          {plan.exercises.map((ex, j) => (
                            <div key={j} className="bg-white/5 rounded-xl p-3">
                              <div className="flex items-center justify-between mb-1"><span className="text-sm font-semibold text-white">{ex.name}</span><span className="text-xs text-brand-400">{ex.sets} × {ex.reps}</span></div>
                              {ex.notes && <p className="text-xs text-stone-500">{ex.notes}</p>}
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-4">{plan.tags.map(tag => (<span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">{tag}</span>))}</div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
