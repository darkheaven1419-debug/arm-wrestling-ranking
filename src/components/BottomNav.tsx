import { Link, useLocation } from 'react-router-dom';
import { Home, Trophy, MapPin, Dumbbell, User } from 'lucide-react';

const LINKS = [
  { to: '/', label: '首页', icon: Home },
  { to: '/ranking/右手/63kg', label: '排名', icon: Trophy },
  { to: '/map', label: '地图', icon: MapPin },
  { to: '/training-plans', label: '训练', icon: Dumbbell },
  { to: '/profile', label: '我的', icon: User },
];

export function BottomNav() {
  const { pathname } = useLocation();
  if (typeof window !== 'undefined' && window.innerWidth >= 768) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-950/95 backdrop-blur-xl border-t border-white/10" role="navigation" aria-label="底部导航">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto safe-bottom">
        {LINKS.map(link => {
          const active = link.to === '/' ? pathname === '/' : pathname.startsWith(link.to);
          return (
            <Link key={link.to} to={link.to} className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${active ? 'text-brand-400' : 'text-stone-500 hover:text-stone-300'}`} aria-label={link.label} aria-current={active ? 'page' : undefined}>
              <link.icon className="w-5 h-5" /><span className="text-[10px] font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
