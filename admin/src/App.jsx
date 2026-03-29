import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import AdminLayout from './components/admin/AdminLayout'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './components/admin/AdminDashboard'
import LandingPageEditor from './components/admin/LandingPageEditor'
import GamesPage from './components/admin/GamesPage'
import UsersPage from './components/admin/UsersPage'
import AiAgentSettings from './pages/AiAgentSettings'
import JackpotSettings from './pages/JackpotSettings'
import AnnouncementsPage from './pages/AnnouncementsPage'
import ReferralsPage from './pages/ReferralsPage'
import Settings from './pages/Settings'
import SupportSection from './pages/SupportSection'
import DepositWithdrawalSection from './components/admin/DepositWithdrawalSection'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})

function ProtectedRoute({ children }) {
  const stored = localStorage.getItem('admin_user')
  if (!stored) {
    return <Navigate to="/login" replace />
  }
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="landing" element={<LandingPageEditor />} />
        <Route path="deposit-withdrawal" element={<DepositWithdrawalSection />} />
        <Route path="games" element={<GamesPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="support" element={<SupportSection />} />
        <Route path="ai-agent" element={<AiAgentSettings />} />
        <Route path="jackpot" element={<JackpotSettings />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="referrals" element={<ReferralsPage />} />
        <Route path="settings" element={<Settings />} />
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
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
