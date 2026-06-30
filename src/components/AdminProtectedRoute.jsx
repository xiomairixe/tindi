import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAdminStore } from '../stores/adminStore'

export default function AdminProtectedRoute({ children }) {
  const { isAdmin, isCheckingAdmin, checkIsAdmin } = useAdminStore()

  useEffect(() => {
    checkIsAdmin()
  }, [])

  if (isCheckingAdmin) return null

  if (!isAdmin) return <Navigate to="/admin/login" replace />

  return children
}