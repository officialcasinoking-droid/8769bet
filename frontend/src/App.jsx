import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './components/ui/Toast'
import { PageTransition } from './components/ui/Animations'
import { AuthProvider } from './context/AuthContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ThemeProvider from './components/ThemeProvider'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/home/HomePage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import GamesPage from './pages/games/GamesPage'
import GameDetailPage from './pages/games/GameDetailPage'
import AviatorPage from './pages/games/AviatorPage'
import AviatorGame from './components/games/AviatorGame'
import DepositPage from './pages/deposit/DepositPage'
import WithdrawPage from './pages/withdraw/WithdrawPage'
import OffersPage from './pages/offers/OffersPage'
import ProfilePage from './pages/profile/ProfilePage'
import BetHistoryPage from './pages/profile/BetHistoryPage'
import ReferralPage from './pages/referral/ReferralPage'
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboard from './components/admin/AdminDashboard'
import AviatorControlPanel from './components/admin/AviatorControlPanel'

import GamesPageAdmin from './components/admin/GamesPage'
import UsersPage from './components/admin/UsersPage'
import LandingPageEditor from './pages/admin/LandingPageEditor'
import DepositWithdrawalSection from './pages/admin/DepositWithdrawalSection'
import JackpotSettings from './pages/admin/JackpotSettings'
import AnnouncementsPage from './pages/admin/AnnouncementsPage'
import AiAgentSettings from './pages/admin/AiAgentSettings'
import ReferralsPage from './pages/admin/ReferralsPage'
import Settings from './pages/admin/Settings'
import SupportSection from './pages/admin/SupportSection'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="games" element={<GamesPage />} />
        <Route path="games/aviator" element={
          <ProtectedRoute>
            <AviatorPage />
          </ProtectedRoute>
        } />
        <Route path="games/:slug" element={<GameDetailPage />} />
        <Route path="deposit" element={
          <ProtectedRoute>
            <DepositPage />
          </ProtectedRoute>
        } />
        <Route path="profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
        <Route path="profile/bet-history" element={
          <ProtectedRoute>
            <BetHistoryPage />
          </ProtectedRoute>
        } />
        <Route path="withdraw" element={
          <ProtectedRoute>
            <WithdrawPage />
          </ProtectedRoute>
        } />
        <Route path="offers" element={
          <ProtectedRoute>
            <OffersPage />
          </ProtectedRoute>
        } />
        <Route path="referral" element={
          <ProtectedRoute>
            <ReferralPage />
          </ProtectedRoute>
        } />
        <Route path="play/aviator" element={
          <ProtectedRoute>
            <AviatorGame />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="/admin" element={
        <ProtectedRoute requireAdmin>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="aviator" element={<AviatorControlPanel />} />
        <Route path="landing" element={<LandingPageEditor />} />
        <Route path="deposit-withdrawal" element={<DepositWithdrawalSection />} />
        <Route path="games" element={<GamesPageAdmin />} />
        <Route path="jackpot" element={<JackpotSettings />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="support" element={<SupportSection />} />
        <Route path="ai-agent" element={<AiAgentSettings />} />
        <Route path="settings" element={<Settings />} />
        <Route path="referrals" element={<ReferralsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <ThemeProvider>
            <PageTransition>
              <AppRoutes />
            </PageTransition>
          </ThemeProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
