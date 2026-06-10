import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Swords, ArrowLeftRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { computePowerFromScore } from '@/lib/powerLevel';
import type { Athlete } from '@/types';

function AthleteCard({ athlete, onRemove }: { athlete: Athlete; onRemove: () => void }) {
  const { powerLevel } = computePowerFromScore(athlete.rank_score ?? 0);
  return (
    <div className="glass rounded-2xl p-6 flex-1 min-w-0">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-brand-500/30 shrink-0">
          {athlete.avatar_url ? <img src={athlete.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-brand-500/30 to-violet-500/20 flex items-center justify-center"><User className="w-8 h-8 text-brand-400" /></div>}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white truncate">{athlete.name}</h2>
          {athlete.codename && <p className="text-brand-400 text-sm">「{athlete.codename}」</p>}
          {powerLevel > 0 && <p className="text-brand-400 text-sm font-bold mt-1">战力值 {powerLevel}</p>}
        </div>
        {onRemove && <button onClick={onRemove} className="text-stone-600 hover:text-stone-400 text-sm">✕</button>}
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-stone-500">级别</span><span className="text-white">{athlete.weight_class}</span></div>
        <div className="flex justify-between"><span className="text-stone-500">惯用手</span><span className="text-white">{athlete.hand}</span></div>
        <div className="flex justify-between"><span className="text-stone-500">地区</span><span className="text-white">{athlete.city}</span></div>
      </div>
      {athlete.achievements && <div className="mt-4 pt-4 border-t border-white/5"><p className="text-xs text-stone-400 mb-1">🏆 比赛成绩</p><p className="text-white text-sm">{athlete.achievements}</p></div>}
      {athlete.training_spot && <div className="mt-2"><p className="text-xs text-stone-500">🏠 常去：{athlete.training_spot}</p></div>}
    </div>
  );
}

export function ComparePage() {
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');
  const [selectedA, setSelectedA] = useState<Athlete | null>(null);
  const [selectedB, setSelectedB] = useState<Athlete | null>(null);

  const { data: allAthletes } = useQuery({
    queryKey: ['all-athletes-for-compare'],
    queryFn: async () => {
      const { data } = await supabase.from('athletes').select('id,name,codename,weight_class,hand,body_weight,city,rank_score,achievements,training_spot,avatar_url').eq('status', 'approved').order('rank_score', { ascending: false });
      return data as Athlete[];
    },
  });

  const filteredA = allAthletes?.filter(a => !searchA || a.name.includes(searchA) || (a.codename && a.codename.includes(searchA))) ?? [];
  const filteredB = allAthletes?.filter(a => !searchB || a.name.includes(searchB) || (a.codename && a.codename.includes(searchB))) ?? [];

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 transition-colors mb-6"><ArrowLeft className="w-4 h-4" />返回首页</Link>
        <div className="flex items-center gap-3 mb-8">
          <ArrowLeftRight className="w-7 h-7 text-brand-400" />
          <h1 className="text-3xl font-bold text-white">运动员对比</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div>
            <div className="glass rounded-2xl p-4 mb-4">
              <input type="text" value={searchA} onChange={e => setSearchA(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="搜索运动员 A..." />
              {searchA && filteredA.length > 0 && !selectedA && (
                <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                  {filteredA.slice(0, 8).map(a => (
                    <button key={a.id} onClick={() => { setSelectedA(a); setSearchA(''); }} className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-3">
                      <span className="text-white text-sm font-medium">{a.name}</span>
                      {a.codename && <span className="text-brand-400 text-xs">{a.codename}</span>}
                      <span className="text-stone-500 text-xs ml-auto">{a.weight_class}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedA ? <AthleteCard athlete={selectedA} onRemove={() => setSelectedA(null)} /> : <div className="glass rounded-2xl p-12 text-center text-stone-600">选择运动员 A</div>}
          </div>

          <div>
            <div className="glass rounded-2xl p-4 mb-4">
              <input type="text" value={searchB} onChange={e => setSearchB(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="搜索运动员 B..." />
              {searchB && filteredB.length > 0 && !selectedB && (
                <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                  {filteredB.slice(0, 8).map(a => (
                    <button key={a.id} onClick={() => { setSelectedB(a); setSearchB(''); }} className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-3">
                      <span className="text-white text-sm font-medium">{a.name}</span>
                      {a.codename && <span className="text-brand-400 text-xs">{a.codename}</span>}
                      <span className="text-stone-500 text-xs ml-auto">{a.weight_class}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedB ? <AthleteCard athlete={selectedB} onRemove={() => setSelectedB(null)} /> : <div className="glass rounded-2xl p-12 text-center text-stone-600">选择运动员 B</div>}
          </div>
        </div>

        {selectedA && selectedB && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 text-center">
            <Swords className="w-8 h-8 text-brand-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-2">运动员对比</h3>
            <div className="flex items-center justify-center gap-4 text-sm">
              <span className="text-white font-bold text-lg">{selectedA.name}</span>
              <span className="text-stone-600 text-lg">vs</span>
              <span className="text-white font-bold text-lg">{selectedB.name}</span>
            </div>
            <p className="text-xs text-stone-500 mt-2">
              {selectedA.weight_class === selectedB.weight_class ? `同级别：${selectedA.weight_class}` : `不同级别：${selectedA.weight_class} vs ${selectedB.weight_class}`}
              {selectedA.hand === selectedB.hand ? ` · 同为${selectedA.hand}` : ` · ${selectedA.hand} vs ${selectedB.hand}`}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
