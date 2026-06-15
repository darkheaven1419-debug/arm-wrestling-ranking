/**
 * 仅用于本地/测试环境 — 为现有数据生成假评论、点赞、浏览量
 * 运行: node scripts/seedTestData.js
 * 需要: 项目根目录 .env 中的 VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');

function loadEnv() {
  try {
    const content = readFileSync(envPath, 'utf8');
    const vars = {};
    for (const line of content.split('\n')) {
      const m = line.match(/^VITE_(\w+)=(.+)/);
      if (m) vars['VITE_' + m[1]] = m[2].trim();
    }
    return vars;
  } catch { return {}; }
}

const env = loadEnv();
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const TEXTS = ['赛事组织得很好！','期待下一次活动','场地环境不错','加油！','腕力运动越来越火了','训练氛围很好','教练很专业','学到了很多技巧','感谢分享','支持北京腕力','希望更多赛事','报名参加！','上一届很精彩','新手求带','力量还需提升'];
function pick(a) { return a[Math.floor(Math.random()*a.length)]; }
function rand(a,b) { return Math.floor(Math.random()*(b-a+1))+a; }
function rd(d) { const dt=new Date(); dt.setDate(dt.getDate()-Math.floor(Math.random()*d)); return dt.toISOString(); }

async function main() {
  console.log('Seeding test data...');
  const {data:events}=await supabase.from('events').select('id').limit(20);
  const {data:spots}=await supabase.from('training_locations').select('id').limit(20);
  const {data:athletes}=await supabase.from('athletes').select('id').eq('status','approved').limit(30);
  if(!athletes?.length){console.log('No athletes found');return;}

  // Views
  const views=[];
  for(const a of athletes){for(let d=0;d<30;d++){for(let c=rand(1,3);c--;)views.push({athlete_id:a.id,created_at:rd(30)});}}
  for(let i=0;i<views.length;i+=50)await supabase.from('athlete_views').insert(views.slice(i,i+50));
  console.log(views.length+' views');

  // Comments
  const targets=[...(events||[]).map(e=>({type:'event',id:e.id})),...(spots||[]).map(s=>({type:'training_location',id:s.id}))];
  let cc=0;
  for(const t of targets){for(let i=rand(2,5);i--;){await supabase.from('comments').insert({target_type:t.type,target_id:t.id,content:pick(TEXTS),created_at:rd(30)});cc++;}}
  console.log(cc+' comments');

  // Likes
  let lc=0;
  for(const t of targets){for(let i=rand(0,3);i--;){try{await supabase.from('likes').insert({target_type:t.type,target_id:t.id,user_id:null});lc++;}catch{}}}
  console.log(lc+' likes\nDone!');
}
main().catch(e=>{console.error(e);process.exit(1);});
