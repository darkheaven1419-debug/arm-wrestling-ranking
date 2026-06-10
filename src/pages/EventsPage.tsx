import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, MapPin, Users, Clock, DollarSign, Gift, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ArmEvent } from '@/types';

export function EventsPage() {
  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });
      if (error) throw error;
      return data as ArmEvent[];
    },
  });

  const upcoming = events?.filter((e) => new Date(e.event_date) >= new Date()) ?? [];
  const past = events?.filter((e) => new Date(e.event_date) < new Date()) ?? [];

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />返回首页
        </Link>
        <div className="flex items-center gap-3 mb-8">
          <Calendar className="w-7 h-7 text-brand-400" />
          <h1 className="text-3xl font-bold text-white">赛事日历</h1>
        </div>

        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-6 animate-pulse">
                <div className="h-5 bg-white/5 rounded w-1/3 mb-3" />
                <div className="h-4 bg-white/5 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && upcoming.length === 0 && past.length === 0 && (
          <div className="glass rounded-3xl p-16 text-center">
            <Calendar className="w-16 h-16 text-stone-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-stone-400 mb-2">暂无赛事信息</h2>
            <p className="text-stone-600">赛事信息将由管理员发布</p>
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="mb-12">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              即将举行 ({upcoming.length})
            </h2>
            <div className="space-y-4">
              {upcoming.map((evt) => (
                <motion.div key={evt.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-2xl p-6 hover:bg-white/[0.04] transition-colors">
                  <div className="flex gap-5 flex-wrap">
                    <div className="shrink-0 w-16 h-16 rounded-xl bg-brand-500/10 border border-brand-500/20 flex flex-col items-center justify-center">
                      <span className="text-xs text-stone-400">
                        {new Date(evt.event_date).toLocaleDateString('zh-CN', { month: 'short' })}
                      </span>
                      <span className="text-2xl font-black text-white">
                        {new Date(evt.event_date).getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white mb-2">{evt.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-stone-400 flex-wrap">
                        {evt.location && (
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{evt.location}</span>
                        )}
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date(evt.event_date).toLocaleDateString('zh-CN', { weekday: 'long' })}</span>
                        {evt.weight_classes && evt.weight_classes.length > 0 && (
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{evt.weight_classes.join(' · ')}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm flex-wrap mt-2">
                        {evt.registration_fee && (
                          <span className="flex items-center gap-1 text-amber-400"><DollarSign className="w-3.5 h-3.5" />报名费：{evt.registration_fee}</span>
                        )}
                        {evt.prizes && (
                          <span className="flex items-center gap-1 text-emerald-400"><Gift className="w-3.5 h-3.5" />{evt.prizes.split('\n')[0]}</span>
                        )}
                        {evt.contact_person && (
                          <span className="flex items-center gap-1 text-stone-300"><Phone className="w-3.5 h-3.5" />报名：{evt.contact_person}</span>
                        )}
                      </div>
                      {evt.prizes && evt.prizes.includes('\n') && (
                        <p className="text-xs text-stone-500 mt-2 leading-relaxed whitespace-pre-line">{evt.prizes}</p>
                      )}
                      {evt.description && <p className="text-sm text-stone-500 mt-2 leading-relaxed">{evt.description}</p>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {past.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-stone-600 inline-block" />
              已结束 ({past.length})
            </h2>
            <div className="space-y-3 opacity-60">
              {past.map((evt) => (
                <div key={evt.id} className="glass rounded-xl p-4 flex items-center gap-4">
                  <div className="shrink-0 text-xs text-stone-500 w-20 text-center">
                    {new Date(evt.event_date).toLocaleDateString('zh-CN')}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">{evt.title}</h3>
                    {evt.location && <p className="text-xs text-stone-500 mt-0.5">{evt.location}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
