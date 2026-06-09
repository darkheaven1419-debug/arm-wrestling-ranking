import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dumbbell, Menu, X, PlusCircle, UserCog, UserCircle } from 'lucide-react';
import { SITE_NAME } from '@/lib/constants';

const NAV_LINKS = [
  { to: '/', label: '首页' },
  { to: '/submit', label: '提交信息', icon: PlusCircle },
  { to: '/profile', label: '个人', icon: UserCircle },
  { to: '/admin', label: '管理', icon: UserCog },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-brand-500/20 flex items-center justify-center
            group-hover:bg-brand-500/30 transition-colors">
            <Dumbbell className="w-5 h-5 text-brand-400" />
          </div>
          <span className="text-lg font-bold text-white tracking-wide">
            {SITE_NAME}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive(link.to)
                  ? 'bg-white/10 text-white'
                  : 'text-stone-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <span className="flex items-center gap-1.5">
                {link.icon && <link.icon className="w-3.5 h-3.5" />}
                {link.label}
              </span>
            </Link>
          ))}
        </nav>

        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {isMenuOpen && (
        <nav className="md:hidden glass-strong border-t border-white/5 p-4"
          style={{ animation: 'fadeInUp 0.2s ease' }}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setIsMenuOpen(false)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors
                ${isActive(link.to)
                  ? 'bg-white/10 text-white'
                  : 'text-stone-400 hover:text-white hover:bg-white/5'
                }`}
            >
              {link.icon && <link.icon className="w-4 h-4" />}
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
