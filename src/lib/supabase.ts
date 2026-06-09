import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase 未配置。请复制 .env.example 为 .env 并填入你的 Supabase 项目信息。\n' +
      '前往 https://supabase.com 创建免费项目。'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
