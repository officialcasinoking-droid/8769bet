import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import AdminLayout from './layout/AdminLayout'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import LandingPageEditor from './pages/LandingPageEditor'
import GamesPage from './pages/GamesPage'
import JackpotPage from './pages/JackpotPage'
import AnnouncementsPage from './pages/AnnouncementsPage'
import UsersPage from './pages/UsersPage'
import SettingsPage from './pages/SettingsPage'
import AviatorAdmin from './pages/AviatorAdmin'
import ReferralsPage from './pages/ReferralsPage'
import SupportPage from './pages/SupportPage'

function App() {
  return (
    <BrowserRouter basename="/admin">
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="landing" element={<LandingPageEditor />} />
              <Route path="games" element={<GamesPage />} />
              <Route path="aviator" element={<AviatorAdmin />} />
              <Route path="jackpot" element={<JackpotPage />} />
              <Route path="referrals" element={<ReferralsPage />} />
              <Route path="support" element={<SupportPage />} />
              <Route path="announcements" element={<AnnouncementsPage />} />
              <Route path="categories" element={<GamesPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="transactions" element={<Dashboard />} />
              <Route path="ai-agent" element={<Dashboard />} />
              <Route path="theme" element={<SettingsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
