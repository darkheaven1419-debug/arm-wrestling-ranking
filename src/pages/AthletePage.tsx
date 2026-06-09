import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, User, MapPin, Scale, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { WEIGHT_CLASSES } from '@/lib/constants';
import type { Athlete } from '@/types';

export function AthletePage() {
  const { athleteId } = useParams<{ athleteId: string }>();
  const { data: athlete, isLoading } = useQuery({
    queryKey: ['athlete', athleteId],
    queryFn: async () => { const { data } = await supabase.from('athletes').select('*').eq('id', athleteId).single(); return data as Athlete | null; },
    enabled: !!athleteId,
  });

  if (isLoading) return <div className="pt-24 flex justify-center"><span className="w-8 h-8 border-2 border-stone-600 border-t-stone-300 rounded-full animate-spin" /></div>;
  if (!athlete) return <div className="pt-24 text-center"><p className="text-stone-500">运动员不存在</p></div>;

  const wc = WEIGHT_CLASSES.find(w => w.value === athlete.weight_class);

  return (
    <div className="pt-24 pb-20 px-4"><div className="max-w-2xl mx-auto">
      <Link to={`/ranking/${athlete.weight_class}`} className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 mb-8"><ArrowLeft className="w-4 h-4" />返回 {athlete.weight_class} 排名</Link>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-8">
        <div className="flex items-start gap-6 mb-8 flex-wrap">
          <div className="w-20 h-20 rounded-2xl shrink-0 overflow-hidden border-2 border-brand-500/30">
            {athlete.avatar_url ? <img src={athlete.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-brand-500/30 to-violet-500/20 flex items-center justify-center"><User className="w-10 h-10 text-brand-400" /></div>}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-3xl font-black text-white">{athlete.name}</h1>
              {athlete.codename && <span className="text-brand-400 text-xl font-bold">「{athlete.codename}」</span>}
            </div>
            <div className="flex items-center gap-4 text-sm text-stone-400 flex-wrap">
              <span className="flex items-center gap-1"><Trophy className="w-4 h-4 text-amber-400" />{wc?.icon} {athlete.weight_class}</span>
              <span className="flex items-center gap-1"><Scale className="w-4 h-4" />{athlete.body_weight ?? '--'} kg</span>
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{athlete.city}</span>
            </div>
          </div>
          <div className="text-center shrink-0"><div className="text-4xl font-black text-brand-400">{athlete.rank_score}</div><div className="text-xs text-stone-500">积分</div></div>
        </div>

        {athlete.training_spot && <div className="glass rounded-2xl p-4 mb-4"><p className="text-sm text-stone-400"><span className="text-stone-500">🏠 常去集训点：</span>{athlete.training_spot}</p></div>}
        {athlete.achievements && <div className="mb-4"><h3 className="text-sm font-semibold text-stone-400 mb-2 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-400" />比赛成绩</h3><p className="text-white text-sm leading-relaxed">{athlete.achievements}</p></div>}
        {athlete.bio && <div className="mb-4"><h3 className="text-sm font-semibold text-stone-400 mb-2">个人简介</h3><p className="text-white text-sm leading-relaxed">{athlete.bio}</p></div>}
        <div className="flex items-center justify-between gap-4 text-xs text-stone-600 mt-6 pt-6 border-t border-white/5"><div><span>性别：{athlete.gender}</span><span className="ml-4">加入：{new Date(athlete.created_at).toLocaleDateString('zh-CN')}</span></div><a href={`#/submit?edit=${athlete.id}`} className="text-brand-400 hover:text-brand-300 font-medium">✏️ 编辑</a></div>
      </motion.div>
    </div></div>
  );
}
