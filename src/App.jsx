import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import AppLayout from './layouts/AppLayout'
import AdminLayout from './layouts/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminProtectedRoute from './components/AdminProtectedRoute'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import NotFoundPage from './pages/NotFoundPage'
import DashboardPage from './features/dashboard/index'
import InventoryPage from './features/inventory/index'
import SalesPage from './features/sales/index'
import ExpensesPage from './features/expenses/index'
import UtangPage from './features/utang/index'
import AdminDashboard from './features/admin'
import PlansPage from './features/admin/plans'
import PaymentRequestsPage from './features/admin/PaymentRequestsPage'
import AdminLoginPage from './features/admin/AdminLoginPage'
import AdminAnalytics from './features/admin/AdminAnalytics'
import ProfilePage from './pages/ProfilePage'


function AuthLoader() {
  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#fafafa',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, border: '3px solid #fed7aa',
          borderTopColor: '#f97316', borderRadius: '50%',
          animation: 'spin 0.7s linear infinite', margin: '0 auto 12px',
        }} />
        <p style={{ color: '#737373', fontSize: 14, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
          Loading TINDI...
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export default function App() {
  const { initializeAuth, isLoading } = useAuthStore()

  useEffect(() => {
    initializeAuth()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public routes ── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* ── Super Admin routes ── */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
          <Route path="/admin"         element={<AdminDashboard />} />
          <Route path="/admin/plans"   element={<PlansPage />} />
          <Route path="/admin/payments" element={<PaymentRequestsPage />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
        </Route>

        {/* ── Regular app routes ── */}
        <Route element={isLoading ? <AuthLoader /> : (
          <ProtectedRoute><AppLayout /></ProtectedRoute>
        )}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/utang" element={<UtangPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}