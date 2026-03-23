import { useEffect, useState } from 'react'

export default function AnimatedCounter({ end, duration = 2000, decimals = 0 }) {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    let startTime = null
    const startValue = 0
    
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      
      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const current = startValue + (end - startValue) * easeOutQuart
      
      setCount(current)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [end, duration])
  
  return count.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}
