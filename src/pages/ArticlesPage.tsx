import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Clock, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Article } from '@/types';

const CATEGORY_MAP: Record<string, { icon: string; label: string }> = {
  technique: { icon: '💪', label: '技术' },
  training: { icon: '🏋️', label: '训练' },
  nutrition: { icon: '🍎', label: '营养' },
  gear: { icon: '🧤', label: '装备' },
  other: { icon: '📌', label: '其他' },
};

export function ArticlesPage() {
  const { data: articles, isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Article[];
    },
  });

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />返回首页
        </Link>
        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="w-7 h-7 text-brand-400" />
          <h1 className="text-3xl font-bold text-white">腕力百科</h1>
        </div>

        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-6 animate-pulse">
                <div className="h-5 bg-white/5 rounded w-1/3 mb-3" />
                <div className="h-4 bg-white/5 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && (!articles || articles.length === 0) && (
          <div className="glass rounded-3xl p-16 text-center">
            <BookOpen className="w-16 h-16 text-stone-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-stone-400 mb-2">暂无文章</h2>
            <p className="text-stone-600">技术文章由管理员发布</p>
          </div>
        )}

        {articles && articles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {articles.map((art) => {
              const cat = CATEGORY_MAP[art.category] || CATEGORY_MAP.other;
              return (
                <motion.div key={art.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Link to={`/article/${art.id}`} className="glass rounded-2xl p-6 hover:bg-white/[0.06] transition-colors block h-full">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400">
                        {cat.icon} {cat.label}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{art.title}</h3>
                    <p className="text-sm text-stone-500 mb-4">{art.content.replace(/#{1,6}\s/g, '').slice(0, 120)}</p>
                    <div className="flex items-center gap-3 text-xs text-stone-600">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(art.created_at).toLocaleDateString('zh-CN')}</span>
                      <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{cat.label}</span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
