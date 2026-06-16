import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Swords, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { WEIGHT_CLASSES } from '@/lib/constants';

export function MatchTab() {
  const qc = useQueryClient();
  const [wId, setWId] = useState(''); const [lId, setLId] = useState('');
  const [wScore, setWScore] = useState(3); const [lScore, setLScore] = useState(0);
  const [eventName, setEventName] = useState(''); const [wClass, setWClass] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: athletes } = useQuery({ queryKey: ['admin-athletes-match'], queryFn: async () => { const { data } = await supabase.from('athletes').select('id, name, weight_class').eq('status', 'approved').order('name'); return data || []; } });
  const { data: matches, isLoading } = useQuery({ queryKey: ['match-records'], queryFn: async () => { const { data } = await supabase.from('match_records').select('*').order('created_at', { ascending: false }).limit(30); return data || []; } });

  const addMatch = useMutation({
    mutationFn: async () => {
      if (!wId || !lId) { toast.error('请选择胜者和败者'); throw new Error('v'); }
      if (wId === lId) { toast.error('不能相同'); throw new Error('v'); }
      await supabase.from('match_records').insert({ winner_id: parseInt(wId), loser_id: parseInt(lId), winner_score: wScore, loser_score: lScore, event_name: eventName.trim() || null, match_date: date, weight_class: wClass || null });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['match-records'] }); qc.invalidateQueries({ queryKey: ['admin-athletes'] }); setWId(''); setLId(''); setWScore(3); setLScore(0); setEventName(''); toast.success('已录入，ELO已更新'); },
  });

  const del = useMutation({ mutationFn: async (id: number) => { await supabase.from('match_records').delete().eq('id', id); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['match-records'] }); toast.success('已删除'); } });
  const getName = (id: number) => (athletes || []).find((a: any) => a.id === id)?.name || `#${id}`;

  return (
    <div>
      <div className="glass rounded-2xl p-5 mb-6">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Swords className="w-4 h-4 text-brand-400" />录入比赛</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div><label className="block text-xs text-stone-400 mb-1">胜者</label><select value={wId} onChange={e => setWId(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"><option value="">选择胜者</option>{(athletes || []).map((a: any) => <option key={a.id} value={a.id}>{a.name} ({a.weight_class})</option>)}</select></div>
          <div><label className="block text-xs text-stone-400 mb-1">败者</label><select value={lId} onChange={e => setLId(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"><option value="">选择败者</option>{(athletes || []).map((a: any) => <option key={a.id} value={a.id}>{a.name} ({a.weight_class})</option>)}</select></div>
          <div><label className="block text-xs text-stone-400 mb-1">比分 (胜:败)</label><div className="flex gap-2"><input type="number" value={wScore} onChange={e => setWScore(parseInt(e.target.value) || 0)} min={0} className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm text-center w-16" /><span className="text-stone-500 self-center">:</span><input type="number" value={lScore} onChange={e => setLScore(parseInt(e.target.value) || 0)} min={0} className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm text-center w-16" /></div></div>
          <div><label className="block text-xs text-stone-400 mb-1">日期</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" /></div>
          <div><label className="block text-xs text-stone-400 mb-1">赛事名称</label><input value={eventName} onChange={e => setEventName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm" placeholder="如: 北京腕力公开赛" /></div>
          <div><label className="block text-xs text-stone-400 mb-1">体重级别</label><select value={wClass} onChange={e => setWClass(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"><option value="">不限</option>{WEIGHT_CLASSES.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}</select></div>
        </div>
        <button onClick={() => addMatch.mutate()} disabled={addMatch.isPending} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-bold text-sm hover:from-brand-400 transition-all disabled:opacity-50">{addMatch.isPending ? '录入中...' : '⚔️ 录入比赛'}</button>
      </div>
      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4">最近比赛 ({matches?.length||0})</h3>
        {isLoading ? <RefreshCw className="w-5 h-5 text-stone-600 mx-auto animate-spin my-8" /> : !matches?.length ? <p className="text-xs text-stone-600 py-8 text-center">暂无记录</p> : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {matches.map((m: any) => (
              <div key={m.id} className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0"><span className="text-emerald-400 font-bold text-sm">{getName(m.winner_id)}</span><span className="text-stone-500 mx-2 text-xs">{m.winner_score}:{m.loser_score}</span><span className="text-red-400 text-sm">{getName(m.loser_id)}</span><div className="text-[10px] text-stone-500 mt-0.5">{m.event_name || '友谊赛'}{m.weight_class ? ` · ${m.weight_class}` : ''} · {m.match_date}</div></div>
                <button onClick={() => { if (confirm('删除？')) del.mutate(m.id); }} className="p-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 shrink-0"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
