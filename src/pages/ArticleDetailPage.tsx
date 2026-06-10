import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Article } from '@/types';

const CATEGORY_MAP: Record<string, { icon: string; label: string }> = {
  technique: { icon: '💪', label: '技术' },
  training: { icon: '🏋️', label: '训练' },
  nutrition: { icon: '🍎', label: '营养' },
  gear: { icon: '🧤', label: '装备' },
  other: { icon: '📌', label: '其他' },
};

export function ArticleDetailPage() {
  const { articleId } = useParams<{ articleId: string }>();
  const { data: article, isLoading } = useQuery({
    queryKey: ['article', articleId],
    queryFn: async () => {
      const { data } = await supabase.from('articles').select('*').eq('id', articleId).single();
      return data as Article | null;
    },
    enabled: !!articleId,
  });

  if (isLoading) return <div className="pt-24 flex justify-center"><span className="w-8 h-8 border-2 border-stone-600 border-t-stone-300 rounded-full animate-spin" /></div>;
  if (!article) return <div className="pt-24 text-center"><p className="text-stone-500">文章不存在</p></div>;

  const cat = CATEGORY_MAP[article.category] || CATEGORY_MAP.other;

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/articles" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />返回文章列表
        </Link>

        <div className="glass rounded-3xl p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400">
              {cat.icon} {cat.label}
            </span>
          </div>
          <h1 className="text-3xl font-black text-white mb-4">{article.title}</h1>
          <div className="flex items-center gap-4 text-sm text-stone-500 mb-8 pb-8 border-b border-white/5">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date(article.created_at).toLocaleDateString('zh-CN')}</span>
            <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" />{cat.label}</span>
          </div>
          <div>
            {article.content.split('\n').map((line, i) => {
              if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold text-white mt-8 mb-4">{line.slice(2)}</h1>;
              if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-white mt-6 mb-3">{line.slice(3)}</h2>;
              if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold text-white mt-4 mb-2">{line.slice(4)}</h3>;
              if (line.trim() === '') return <div key={i} className="h-3" />;
              return <p key={i} className="text-stone-300 leading-relaxed mb-3">{line}</p>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
