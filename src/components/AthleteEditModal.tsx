import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/image';
import type { Athlete } from '@/types';

type Props = { athlete: Athlete; isOpen: boolean; onClose: () => void; onSaved: () => void; };

export function AthleteEditModal({ athlete, isOpen, onClose, onSaved }: Props) {
  const [bio, setBio] = useState('');
  const [achievements, setAchievements] = useState('');
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBio(athlete.bio || '');
      setAchievements(athlete.achievements || '');
      setVideoUrls((athlete as any).video_urls || []);
      setAvatarFile(null); setAvatarPreview(null);
    }
  }, [isOpen, athlete]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file));
  };

  const addVideo = () => setVideoUrls([...videoUrls, '']);
  const updateVideo = (i: number, val: string) => { const n = [...videoUrls]; n[i] = val; setVideoUrls(n); };
  const removeVideo = (i: number) => setVideoUrls(videoUrls.filter((_, j) => j !== i));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Record<string, unknown> = { bio: bio.trim() || null, achievements: achievements.trim() || null, video_urls: videoUrls.filter(Boolean) };
      if (avatarFile) {
        const compressed = await compressImage(avatarFile);
        const path = `athletes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error: upErr } = await supabase.storage.from('training-images').upload(path, compressed);
        if (upErr) throw new Error('Avatar upload failed');
        const { data: { publicUrl } } = supabase.storage.from('training-images').getPublicUrl(path);
        updates.avatar_url = publicUrl;
      }
      const { error } = await supabase.from('athletes').update(updates).eq('id', athlete.id);
      if (error) throw error;
      toast.success('Profile updated');
      onSaved(); onClose();
    } catch (err: any) { toast.error(err.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={e => e.stopPropagation()} className="bg-stone-900/95 border border-white/10 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 flex items-center justify-center transition-colors z-10"><X className="w-4 h-4" /></button>
            <div className="p-6 safe-bottom">
              <h2 className="text-lg font-bold text-white mb-5">编辑个人资料</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-stone-400 mb-2">头像</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                      {avatarPreview ? <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                        : athlete.avatar_url ? <img src={athlete.avatar_url} alt={athlete.name} className="w-full h-full object-cover" />
                        : <Camera className="w-6 h-6 text-stone-600" />}
                    </div>
                    <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors text-sm text-stone-400"><Upload className="w-4 h-4" />上传新头像<input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" /></label>
                  </div>
                </div>
                <div><label className="block text-sm text-stone-400 mb-1.5">个人简介</label><textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all text-sm resize-none" placeholder="介绍一下自己…" /></div>
                <div><label className="block text-sm text-stone-400 mb-1.5">比赛成绩</label><textarea value={achievements} onChange={e => setAchievements(e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all text-sm resize-none" placeholder="曾获奖项、参赛经历…" /></div>
                <div>
                  <label className="block text-sm text-stone-400 mb-1.5">比赛视频链接</label>
                  <div className="space-y-2">
                    {videoUrls.map((url, i) => (
                      <div key={i} className="flex gap-2">
                        <input type="text" value={url} onChange={e => updateVideo(i, e.target.value)} className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-stone-600 focus:outline-none focus:border-brand-500/50 transition-all" placeholder="https://…" />
                        <button onClick={() => removeVideo(i)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={addVideo} className="mt-2 text-xs text-brand-400 hover:text-brand-300 transition-colors">+ 添加视频链接</button>
                </div>
                <button onClick={handleSave} disabled={saving} className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-black font-bold hover:from-brand-400 transition-all disabled:opacity-50">{saving ? '保存中…' : '保存修改'}</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
