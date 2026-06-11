import { useState } from 'react';
import { computePowerLevel } from '@/lib/powerLevel';
import { WEIGHT_CLASSES } from '@/lib/constants';
import type { Athlete } from '@/types';

export function RankingTab({ athletes, updateRankScore, toggleUnknownPower }: {
  athletes: Athlete[];
  updateRankScore: { mutate: (v: { id: number; rank_score?: number; rank_score_left?: number }) => void; isPending: boolean };
  toggleUnknownPower: { mutate: (v: { id: number; value: boolean }) => void; isPending: boolean };
}) {
  const [hand, setHand] = useState<string | null>(null);
  const [weightClass, setWeightClass] = useState<string | null>(null);

  const rankField = hand === '左手' ? 'rank_score_left' : 'rank_score';
  const classes = WEIGHT_CLASSES.map(w => w.value);
  const groupAthletes = hand && weightClass
    ? athletes
        .filter(a => a.weight_class === weightClass)
        .sort((a, b) => {
          // 实力未知的排到最后
          if (a.is_unknown_power && !b.is_unknown_power) return 1;
          if (!a.is_unknown_power && b.is_unknown_power) return -1;
          // 都有排名或都未知时按分数排
          return ((a as any)[rankField] ?? 999) - ((b as any)[rankField] ?? 999);
        })
    : [];

  const saveRank = (id: number, rank: number) => {
    if (hand === '左手') {
      updateRankScore.mutate({ id, rank_score_left: rank > 0 ? rank : null } as any);
    } else {
      updateRankScore.mutate({ id, rank_score: rank > 0 ? rank : null } as any);
    }
  };

  // Step 1: Choose hand
  if (!hand) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">🏆 排名设置</h2>
        <p className="text-xs text-stone-500 mb-6">选择惯用手</p>
        <div className="grid grid-cols-2 gap-4">
          {['左手', '右手'].map(h => (
            <button key={h} onClick={() => setHand(h)}
              className="glass rounded-2xl p-8 text-center hover:bg-white/[0.06] transition-all hover:border-brand-500/30">
              <span className="text-4xl block mb-3">{h === '左手' ? '🤚' : '✋'}</span>
              <span className="text-white text-lg font-bold">{h}</span>
              <p className="text-stone-500 text-xs mt-1">{athletes.length} 人</p>
            </button>
          ))}
        </div>
        <button onClick={() => { setHand(null); setWeightClass(null); }} className="mt-4 text-sm text-stone-600 hover:text-stone-400">← 返回</button>
      </div>
    );
  }

  // Step 2: Choose weight class
  if (!weightClass) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">🏆 排名设置 · {hand}</h2>
        <p className="text-xs text-stone-500 mb-4">选择体重级别</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {classes.map(wc => {
            const count = athletes.filter(a => a.weight_class === wc).length;
            const icon = WEIGHT_CLASSES.find(w => w.value === wc)?.icon || '💪';
            return (
              <button key={wc} onClick={() => setWeightClass(wc)}
                className="glass rounded-2xl p-5 text-center hover:bg-white/[0.06] transition-all hover:border-brand-500/30">
                <span className="text-3xl block mb-2">{icon}</span>
                <span className="text-white font-bold">{wc}</span>
                <p className="text-stone-500 text-xs mt-0.5">{count} 人</p>
              </button>
            );
          })}
        </div>
        <button onClick={() => setHand(null)} className="mt-4 text-sm text-stone-600 hover:text-stone-400 inline-block">← 重选惯用手</button>
      </div>
    );
  }

  // Step 3: Edit rankings
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">🏆 {hand} · {weightClass}</h2>
      <p className="text-xs text-stone-500 mb-4">点击数字编辑排名，战力值自动计算。不参与排名的选手留空或填0。</p>

      {groupAthletes.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-stone-600">该级别暂无运动员</div>
      ) : (
        <div className="space-y-2">
          {groupAthletes.map((a, i) => {
            const rawRank = (a as any)[rankField];
            const rank = rawRank && rawRank > 0 ? rawRank : null;
            const power = !a.is_unknown_power && rank ? computePowerLevel(rank) : null;
            return (
              <div key={a.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-stone-500 text-sm w-6 text-right shrink-0">{i + 1}</span>
                <span className="text-white text-sm font-medium min-w-0 truncate flex-1">
                  {a.name}
                  {a.codename && <span className="text-brand-400 ml-1.5 text-xs">「{a.codename}」</span>}
                </span>
                <button
                  onClick={() => toggleUnknownPower.mutate({ id: a.id, value: !a.is_unknown_power })}
                  className={`text-xs px-2 py-1 rounded-lg shrink-0 transition-all ${a.is_unknown_power ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-stone-600 hover:text-stone-400'}`}
                >实力未知</button>
                <input
                  type="number"
                  min="0"
                  max="99"
                  defaultValue={rank ?? ''}
                  placeholder="--"
                  disabled={!!a.is_unknown_power}
                  className="w-16 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm text-center focus:outline-none focus:border-brand-500/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  onBlur={e => {
                    const v = parseInt(e.target.value) || 0;
                    saveRank(a.id, v);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const v = parseInt((e.target as HTMLInputElement).value) || 0;
                      saveRank(a.id, v);
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                />
                <span className="text-xs w-20 text-right shrink-0">
                  {power !== null ? <span className="text-brand-400 font-bold">战力 {power}</span> : a.is_unknown_power ? <span className="text-amber-400">未知</span> : <span className="text-stone-600">-</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <button onClick={() => setWeightClass(null)} className="text-sm text-stone-500 hover:text-stone-300">← 重选级别</button>
        <button onClick={() => { setHand(null); setWeightClass(null); }} className="text-sm text-stone-500 hover:text-stone-300">← 重选惯用手</button>
      </div>
    </div>
  );
}
