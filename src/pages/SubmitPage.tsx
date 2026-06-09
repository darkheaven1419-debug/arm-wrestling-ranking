import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { WEIGHT_CLASSES, CITIES } from '@/lib/constants';
import type { WeightClass, AthleteFormData } from '@/types';

const INITIAL_FORM: AthleteFormData = {
  name: '', codename: '', gender: '男', weight_class: '78kg',
  body_weight: '', city: '朝阳区', training_spot: '', achievements: '', bio: '', contact: '',
};

export function SubmitPage() {
  const [form, setForm] = useState<AthleteFormData>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  const updateField = <K extends keyof AthleteFormData>(key: K, value: AthleteFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('请填写姓名'); return; }

    setIsSubmitting(true);
    let avatarUrl = null;
    if (avatarFile) {
      try {
        const ext = avatarFile.name.split('.').pop();
        const path = `athletes/${Date.now()}.${ext}`;
        await supabase.storage.from('training-images').upload(path, avatarFile);
        const { data: { publicUrl } } = supabase.storage.from('training-images').getPublicUrl(path);
        avatarUrl = publicUrl;
      } catch (e) { console.error('Photo upload failed:', e); }
    }
    const { error } = await supabase.from('athletes').insert({
      name: form.name.trim(), codename: form.codename.trim() || null, gender: form.gender,
      hand: '右手',
      weight_class: form.weight_class,
      body_weight: form.body_weight ? parseFloat(form.body_weight) : null,
      avatar_url: avatarUrl, city: form.city, training_spot: form.training_spot.trim() || null,
      achievements: form.achievements.trim() || null,
      bio: form.bio.trim() || null,
      contact: form.contact.trim() || null,
      status: 'pending',
    });
    setIsSubmitting(false);

    if (error) { toast.error('提交失败，请稍后重试'); return; }
    setIsSuccess(true);
    toast.success('提交成功！待管理员审核后即可上榜');
  };

  if (isSuccess) {
    return (
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-lg mx-auto text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white mb-3">提交成功！</h1>
          <p className="text-stone-400 mb-8">你的信息已提交，管理员审核通过后将显示在排名中。</p>
          <div className="flex gap-3 justify-center">
            <Link to="/" className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-stone-300 hover:bg-white/10 transition-colors">返回首页</Link>
            <button onClick={() => { setIsSuccess(false); setForm(INITIAL_FORM); }}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-semibold hover:from-brand-400 transition-all duration-300">继续提交</button>
          </div>
        </div>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 transition-all";
  const selectClass = inputClass + " appearance-none";
  const labelClass = "block text-sm text-stone-400 mb-2";

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />返回首页
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">提交运动员信息</h1>
        <p className="text-stone-500 mb-8">填写以下信息，提交后由管理员审核。审核通过即可上榜。</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={labelClass}>🖼️ 照片（选填）</label>
            {avatarPreview ? (
              <div className="relative inline-block"><img src={avatarPreview} alt="预览" className="w-24 h-24 rounded-2xl object-cover border-2 border-brand-500/30" /><button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(''); }} className="absolute -top-1 -right-1 p-1 rounded-full bg-red-500 text-white"><span className="text-xs">✕</span></button></div>
            ) : (
              <label className="flex items-center justify-center gap-2 w-24 h-24 rounded-2xl bg-white/5 border-2 border-dashed border-white/10 cursor-pointer hover:border-brand-500/30 transition-all text-stone-500"><Upload className="w-5 h-5" /><input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); } }} className="hidden" /></label>
            )}
          </div>
          <div>
            <label className={labelClass}>姓名 *</label>
            <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)}
              className={inputClass} placeholder="真实姓名" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>性别</label>
              <select value={form.gender} onChange={(e) => updateField('gender', e.target.value)} className={selectClass}>
                <option value="男">男</option><option value="女">女</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>体重级别 *</label>
              <select value={form.weight_class} onChange={(e) => updateField('weight_class', e.target.value as WeightClass)} className={selectClass}>
                {WEIGHT_CLASSES.map((wc) => (<option key={wc.value} value={wc.value}>{wc.icon} {wc.label}</option>))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>体重 (kg)</label>
              <input type="number" step="0.1" value={form.body_weight} onChange={(e) => updateField('body_weight', e.target.value)}
                className={inputClass} placeholder="例: 75.5" />
            </div>
            <div>
              <label className={labelClass}>所在区</label>
              <select value={form.city} onChange={(e) => updateField('city', e.target.value)} className={selectClass}>
                {CITIES.map((city) => (<option key={city} value={city}>{city}</option>))}
              </select>
            </div>
            <div>
              <label className={labelClass}>代号</label>
              <input type="text" value={form.codename} onChange={(e) => updateField('codename', e.target.value)}
                className={inputClass} placeholder="如：铁腕王（选填）" />
            </div>
          </div>

          <div>
            <label className={labelClass}>常去的集训地点</label>
            <input type="text" value={form.training_spot} onChange={(e) => updateField('training_spot', e.target.value)}
              className={inputClass} placeholder="如：朝阳区铁腕训练馆（选填）" />
          </div>

          <div>
            <label className={labelClass}>联系方式 <span className="text-stone-600 ml-1">（仅管理员可见）</span></label>
            <input type="text" value={form.contact} onChange={(e) => updateField('contact', e.target.value)}
              className={inputClass} placeholder="微信 / 手机号" />
          </div>

          <div>
            <label className={labelClass}>比赛成绩</label>
            <textarea value={form.achievements} onChange={(e) => updateField('achievements', e.target.value)}
              rows={3} className={inputClass + " resize-none"} placeholder="例如 联大腕力公开赛65kg冠军" />
          </div>

          <div>
            <label className={labelClass}>个人简介</label>
            <textarea value={form.bio} onChange={(e) => updateField('bio', e.target.value)}
              rows={2} className={inputClass + " resize-none"} placeholder="简单介绍自己（选填）" />
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-400/80">提交后由管理员审核，审核通过才会显示在排行榜中。请确保信息真实有效。</p>
          </div>

          <button type="submit" disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-bold text-lg
              hover:from-brand-400 hover:to-brand-500 transition-all duration-300 shadow-lg shadow-brand-500/25
              disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {isSubmitting ? <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
            {isSubmitting ? '提交中...' : '提交信息'}
          </button>
        </form>
      </div>
    </div>
  );
}
