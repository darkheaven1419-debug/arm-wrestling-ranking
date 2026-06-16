import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Flame } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export function TrainingCheckIn({ athleteUserId }: { athleteUserId?: string | null }) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  useEffect(() => { supabase.auth.getSession().then(({ data: { session } }) => { if (session) setUserId(session.user.id); }); }, []);

  const isOwner = userId && athleteUserId === userId;
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const { data: logs } = useQuery({
    queryKey: ['training-logs', athleteUserId], queryFn: async () => { if (!athleteUserId) return []; const { data } = await supabase.from('training_logs').select('*').eq('user_id', athleteUserId).order('check_in_date', { ascending: false }).limit(30); return data || []; }, enabled: !!athleteUserId,
  });

  const checkedToday = (logs || []).some((l: any) => l.check_in_date === today);
  const monthCount = (logs || []).filter((l: any) => l.check_in_date >= monthStart).length;
  const streak = (() => { let s = 0; const d = new Date(); for (let i = 0; i < 365; i++) { const dt = new Date(d.getTime() - i * 86400000).toISOString().split('T')[0]; if ((logs || []).some((l: any) => l.check_in_date === dt)) s++; else break; } return s; })();

  const checkIn = useMutation({
    mutationFn: async () => { if (!userId) throw new Error('login'); await supabase.from('training_logs').insert({ user_id: userId, check_in_date: today, note: note.trim() || null }); },
    onSuccess: () => { setNote(''); qc.invalidateQueries({ queryKey: ['training-logs', athleteUserId] }); toast.success('打卡成功！💪'); },
    onError: (e: any) => { toast.error(e.message === 'login' ? '请先登录' : e.message.includes('duplicate') ? '今天已打卡！' : '打卡失败'); },
  });

  if (!athleteUserId) return null;

  return (
    <div className="glass rounded-2xl p-5 mb-4">
      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Flame className="w-4 h-4 text-orange-400" />训练打卡</h3>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center"><div className="text-xl font-black text-orange-400">{streak}</div><div className="text-[10px] text-stone-500">连续打卡</div></div>
        <div className="text-center"><div className="text-xl font-black text-white">{monthCount}</div><div className="text-[10px] text-stone-500">本月</div></div>
        <div className="text-center"><div className="text-xl font-black text-white">{(logs || []).length}</div><div className="text-[10px] text-stone-500">总计</div></div>
      </div>
      {isOwner && (checkedToday ? <p className="text-center text-emerald-400 text-sm py-3 flex items-center justify-center gap-1.5"><CheckCircle className="w-4 h-4" />今日已打卡</p> : (
        <div className="space-y-2">
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="训练备注…(可选)" className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-stone-600 focus:outline-none focus:border-brand-500/50" />
          <button onClick={() => checkIn.mutate()} disabled={checkIn.isPending} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-black font-bold text-sm hover:from-orange-400 transition-all disabled:opacity-50">{checkIn.isPending ? '打卡中…' : '🔥 今日打卡'}</button>
        </div>
      ))}
      {(logs || []).length > 0 && (<div className="mt-3 pt-3 border-t border-white/5"><p className="text-[10px] text-stone-500 mb-2">最近打卡</p><div className="space-y-1">{(logs || []).slice(0, 5).map((l: any, i: number) => (<div key={i} className="text-xs text-stone-400 flex justify-between"><span>{l.check_in_date}{l.note && <span className="text-stone-600 ml-2">{l.note}</span>}</span></div>))}</div></div>)}
    </div>
  );
}
