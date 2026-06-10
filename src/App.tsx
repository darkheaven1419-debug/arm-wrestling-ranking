import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';

const HomePage = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const RankingPage = lazy(() => import('@/pages/RankingPage').then(m => ({ default: m.RankingPage })));
const AthletePage = lazy(() => import('@/pages/AthletePage').then(m => ({ default: m.AthletePage })));
const SubmitPage = lazy(() => import('@/pages/SubmitPage').then(m => ({ default: m.SubmitPage })));
const TrainingPage = lazy(() => import('@/pages/TrainingPage').then(m => ({ default: m.TrainingPage })));
const EventsPage = lazy(() => import('@/pages/EventsPage').then(m => ({ default: m.EventsPage })));
const ComparePage = lazy(() => import('@/pages/ComparePage').then(m => ({ default: m.ComparePage })));
const ArticlesPage = lazy(() => import('@/pages/ArticlesPage').then(m => ({ default: m.ArticlesPage })));
const ArticleDetailPage = lazy(() => import('@/pages/ArticleDetailPage').then(m => ({ default: m.ArticleDetailPage })));
const AdminPage = lazy(() => import('@/pages/AdminPage').then(m => ({ default: m.AdminPage })));
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));

function PageLoader() {
  return (
    <div className="pt-24 flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-stone-600 border-t-brand-400 rounded-full animate-spin" />
        <span className="text-stone-500 text-sm">加载中...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Suspense fallback={<PageLoader />}><HomePage /></Suspense>} />
        <Route path="/ranking/:hand/:weightClass" element={<Suspense fallback={<PageLoader />}><RankingPage /></Suspense>} />
        <Route path="/athlete/:athleteId" element={<Suspense fallback={<PageLoader />}><AthletePage /></Suspense>} />
        <Route path="/submit" element={<Suspense fallback={<PageLoader />}><SubmitPage /></Suspense>} />
        <Route path="/training" element={<Suspense fallback={<PageLoader />}><TrainingPage /></Suspense>} />
        <Route path="/events" element={<Suspense fallback={<PageLoader />}><EventsPage /></Suspense>} />
        <Route path="/compare" element={<Suspense fallback={<PageLoader />}><ComparePage /></Suspense>} />
        <Route path="/articles" element={<Suspense fallback={<PageLoader />}><ArticlesPage /></Suspense>} />
        <Route path="/article/:articleId" element={<Suspense fallback={<PageLoader />}><ArticleDetailPage /></Suspense>} />
        <Route path="/admin" element={<Suspense fallback={<PageLoader />}><AdminPage /></Suspense>} />
        <Route path="/login" element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />
        <Route path="/profile" element={<Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
