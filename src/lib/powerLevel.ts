/**
 * 战力值系统：按每个级别（惯用手 × 体重级别）内排名计算战力值
 * 第1名=120, 第2名=100, 第3名=90, 第4名=80, 之后每降1名-5, 最低不低于10
 */
export function computePowerLevel(rank: number): number {
  if (rank === 1) return 120;
  if (rank === 2) return 100;
  if (rank === 3) return 90;
  if (rank === 4) return 80;
  return Math.max(10, 80 - (rank - 4) * 5);
}

/** 战力值对应的段位徽章 */
export interface PowerBadge {
  tier: 'king' | 'diamond' | 'gold' | 'silver' | 'bronze';
  icon: string;
  label: string;
  color: string;
  bgClass: string;
  borderClass: string;
}

export function getPowerBadge(powerLevel: number): PowerBadge {
  if (powerLevel >= 120) return { tier: 'king', icon: '👑', label: '王者', color: 'text-yellow-300', bgClass: 'bg-yellow-500/15', borderClass: 'border-yellow-500/40' };
  if (powerLevel >= 100) return { tier: 'diamond', icon: '💎', label: '钻石', color: 'text-cyan-300', bgClass: 'bg-cyan-500/15', borderClass: 'border-cyan-500/40' };
  if (powerLevel >= 80) return { tier: 'gold', icon: '🥇', label: '黄金', color: 'text-amber-400', bgClass: 'bg-amber-500/15', borderClass: 'border-amber-500/40' };
  if (powerLevel >= 50) return { tier: 'silver', icon: '🥈', label: '白银', color: 'text-stone-300', bgClass: 'bg-stone-500/15', borderClass: 'border-stone-500/30' };
  return { tier: 'bronze', icon: '🥉', label: '青铜', color: 'text-orange-400', bgClass: 'bg-orange-500/10', borderClass: 'border-orange-500/30' };
}

