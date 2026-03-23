// Protected routes are now handled within their respective components
// This file is kept for backwards compatibility but AdminRoute is not used
export function ProtectedRoute({ children }) {
  return children
}

export function AdminRoute({ children }) {
  return children
}
