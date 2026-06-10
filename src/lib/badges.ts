export interface BadgeInfo {
  tier: 'bronze' | 'silver' | 'gold' | 'diamond' | 'king';
  icon: string;
  label: string;
  color: string;
  bgClass: string;
  borderClass: string;
  minScore: number;
}

const BADGE_TIERS: { tier: BadgeInfo['tier']; minScore: number; icon: string; label: string; color: string; bgClass: string; borderClass: string }[] = [
  { tier: 'king', minScore: 1000, icon: '👑', label: '王者', color: 'text-yellow-300', bgClass: 'bg-yellow-500/15', borderClass: 'border-yellow-500/40' },
  { tier: 'diamond', minScore: 600, icon: '💎', label: '钻石', color: 'text-cyan-300', bgClass: 'bg-cyan-500/15', borderClass: 'border-cyan-500/40' },
  { tier: 'gold', minScore: 300, icon: '🥇', label: '黄金', color: 'text-amber-400', bgClass: 'bg-amber-500/15', borderClass: 'border-amber-500/40' },
  { tier: 'silver', minScore: 100, icon: '🥈', label: '白银', color: 'text-stone-300', bgClass: 'bg-stone-500/15', borderClass: 'border-stone-500/30' },
  { tier: 'bronze', minScore: 0, icon: '🥉', label: '青铜', color: 'text-orange-400', bgClass: 'bg-orange-500/10', borderClass: 'border-orange-500/30' },
];

export function getBadgeInfo(score: number): BadgeInfo {
  const tier = BADGE_TIERS.find((t) => score >= t.minScore) ?? BADGE_TIERS[BADGE_TIERS.length - 1];
  return { tier: tier.tier, icon: tier.icon, label: tier.label, color: tier.color, bgClass: tier.bgClass, borderClass: tier.borderClass, minScore: tier.minScore };
}

export function getNextBadge(score: number): BadgeInfo | null {
  const tiers = [...BADGE_TIERS].reverse(); // lowest first
  for (const tier of tiers) {
    if (score < tier.minScore) return { tier: tier.tier, icon: tier.icon, label: tier.label, color: tier.color, bgClass: tier.bgClass, borderClass: tier.borderClass, minScore: tier.minScore };
  }
  return null;
}
