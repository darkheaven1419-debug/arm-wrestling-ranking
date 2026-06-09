import { SITE_NAME } from '@/lib/constants';
import { Dumbbell } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 pt-10 pb-8 px-4 mt-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8 text-center sm:text-left">
          <div>
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-3">
              <Dumbbell className="w-5 h-5 text-brand-400" />
              <span className="text-white font-bold">{SITE_NAME}</span>
            </div>
            <p className="text-stone-500 text-sm">北京腕力运动爱好者社区</p>
          </div>
          <div>
            <h4 className="text-white text-sm font-semibold mb-3">快速链接</h4>
            <div className="space-y-2 text-sm text-stone-500">
              <p><a href="#/submit" className="hover:text-brand-400 transition-colors">提交信息</a></p>
              <p><a href="#/training" className="hover:text-brand-400 transition-colors">集训地点</a></p>
              <p><a href="#/profile" className="hover:text-brand-400 transition-colors">个人主页</a></p>
            </div>
          </div>
          <div>
            <h4 className="text-white text-sm font-semibold mb-3">关于</h4>
            <p className="text-stone-500 text-sm">非营利性社区网站<br />数据由用户提交并经管理员审核</p>
          </div>
        </div>
        <div className="border-t border-white/5 pt-6 text-center">
          <p className="text-stone-600 text-xs">&copy; {new Date().getFullYear()} {SITE_NAME} · 开发人：张梓桐</p>
        </div>
      </div>
    </footer>
  );
}
