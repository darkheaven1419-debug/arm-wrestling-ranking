import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { ChevronUp } from 'lucide-react';
import { Header } from './Header';
import { Footer } from './Footer';
import { BottomNav } from './BottomNav';

export function Layout() {
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-brand-500/90 text-black flex items-center justify-center shadow-lg hover:bg-brand-400 transition-all"
          aria-label="回到顶部"
        ><ChevronUp className="w-5 h-5" /></button>
      )}
    </div>
  );
}
