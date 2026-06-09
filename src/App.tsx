import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { HomePage } from '@/pages/HomePage';
import { RankingPage } from '@/pages/RankingPage';
import { SubmitPage } from '@/pages/SubmitPage';
import { AdminPage } from '@/pages/AdminPage';
import { LoginPage } from '@/pages/LoginPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { TrainingPage } from '@/pages/TrainingPage';
import { AthletePage } from '@/pages/AthletePage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/ranking/:hand/:weightClass" element={<RankingPage />} />
        <Route path="/athlete/:athleteId" element={<AthletePage />} />
        <Route path="/submit" element={<SubmitPage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
