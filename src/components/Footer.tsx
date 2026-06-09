import { SITE_NAME } from '@/lib/constants';

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 py-8 px-4">
      <div className="max-w-7xl mx-auto text-center">
        <p className="text-stone-500 text-sm">
          &copy; {new Date().getFullYear()} {SITE_NAME} &mdash; 北京腕力运动爱好者平台
        </p>
        <p className="text-stone-600 text-xs mt-2">
          非营利性社区网站，数据由用户提交并经管理员审核后发布
        </p>
      </div>
    </footer>
  );
}
