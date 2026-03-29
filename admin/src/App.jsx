import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import AdminLayout from './components/AdminLayout'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import AviatorControlPanel from './pages/AviatorControlPanel'

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
        <Route index element={<Dashboard />} />
        <Route path="aviator" element={<AviatorControlPanel />} />
        <Route path="landing" element={<div className="text-white">Landing Page Editor</div>} />
        <Route path="deposit-withdrawal" element={<div className="text-white">Deposit & Withdrawal</div>} />
        <Route path="games" element={<div className="text-white">Games</div>} />
        <Route path="jackpot" element={<div className="text-white">Jackpot</div>} />
        <Route path="announcements" element={<div className="text-white">Announcements</div>} />
        <Route path="referrals" element={<div className="text-white">Referrals</div>} />
        <Route path="users" element={<div className="text-white">Users</div>} />
        <Route path="support" element={<div className="text-white">Support</div>} />
        <Route path="ai-agent" element={<div className="text-white">AI Agent</div>} />
        <Route path="settings" element={<div className="text-white">Settings</div>} />
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
