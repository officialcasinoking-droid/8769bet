import { useLocation, useNavigate } from 'react-router-dom'
import { useCallback, useEffect } from 'react'

const HOME_KEY = 'default'

export function useNavigateBack(fallback = '/admin') {
  const location = useLocation()
  const navigate = useNavigate()

  const goBack = useCallback(() => {
    if (location.key !== HOME_KEY && window.history.length > 2) {
      navigate(-1)
    } else {
      navigate(fallback)
    }
  }, [location.key, navigate, fallback])

  useEffect(() => {
    const handlePop = () => {
      if (location.key === HOME_KEY) {
        navigate(fallback, { replace: true })
      }
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [location.key, navigate, fallback])

  return { goBack, isDirectAccess: location.key === HOME_KEY }
}
