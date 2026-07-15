import { useEffect, useRef, useCallback } from 'react'

const PARTICLE_COUNT = 60
const STAR_COUNT = 80
const TRAIL_PARTICLES = 12

export default function AviatorCanvas({ phase, mult, crashedAt, cashoutExits }) {
  const canvasRef = useRef(null)
  const stateRef = useRef({ phase, mult, crashedAt })
  const animRef = useRef(null)
  const shakeRef = useRef({ x: 0, y: 0, time: 0 })
  const starsRef = useRef([])
  const particlesRef = useRef([])
  const trailRef = useRef([])
  const planePos = useRef({ x: 0, y: 0 })
  const crashShownRef = useRef(false)

  useEffect(() => { stateRef.current = { phase, mult, crashedAt } }, [phase, mult, crashedAt])

  useEffect(() => {
    if (phase === 'crashed' && !crashShownRef.current) {
      shakeRef.current.time = 15
      const px = planePos.current.x, py = planePos.current.y
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.5
        const speed = 1.5 + Math.random() * 4
        particlesRef.current.push({
          x: px, y: py,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          life: 1,
          decay: 0.012 + Math.random() * 0.018,
          size: 1.5 + Math.random() * 3,
          color: ['#ef4444', '#f97316', '#facc15', '#ffffff'][Math.floor(Math.random() * 4)],
        })
      }
      crashShownRef.current = true
    }
    if (phase === 'betting') {
      crashShownRef.current = false
      particlesRef.current = []
      trailRef.current = []
    }
  }, [phase])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let W, H

    if (starsRef.current.length === 0) {
      for (let i = 0; i < STAR_COUNT; i++) {
        starsRef.current.push({ x: Math.random(), y: Math.random(), size: 0.3 + Math.random() * 1.2, speed: 0.0002 + Math.random() * 0.0008, alpha: 0.15 + Math.random() * 0.4 })
      }
    }

    const buildBg = (w, h) => {
      const off = document.createElement('canvas')
      off.width = w; off.height = h
      const c = off.getContext('2d')
      const bg = c.createLinearGradient(0, 0, 0, h)
      bg.addColorStop(0, '#0a0f1e'); bg.addColorStop(0.5, '#0c1220'); bg.addColorStop(1, '#060e1a')
      c.fillStyle = bg; c.fillRect(0, 0, w, h)
      return off
    }

    let bg = buildBg(0, 0)
    let frame = 0

    const resize = () => {
      W = canvas.offsetWidth; H = canvas.offsetHeight
      canvas.width = W * devicePixelRatio; canvas.height = H * devicePixelRatio
      ctx.scale(devicePixelRatio, devicePixelRatio)
      bg = buildBg(W, H)
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      frame++
      const { phase: p, mult: m, crashedAt: cp } = stateRef.current

      ctx.clearRect(0, 0, W, H)
      ctx.drawImage(bg, 0, 0)

      // Stars
      starsRef.current.forEach(s => {
        s.y -= s.speed
        if (s.y < -0.01) { s.y = 1.01; s.x = Math.random() }
        ctx.globalAlpha = s.alpha * (0.5 + 0.5 * Math.sin(frame * 0.02 + s.x * 100))
        ctx.fillStyle = '#fff'
        ctx.fillRect(s.x * W, s.y * H, s.size, s.size)
      })
      ctx.globalAlpha = 1

      // Grid (subtle)
      ctx.strokeStyle = 'rgba(255,255,255,0.018)'
      ctx.lineWidth = 0.5
      for (let i = 0; i < W; i += 32) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke() }
      for (let i = 0; i < H; i += 32) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke() }

      // Y-axis labels
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.font = '10px monospace'
      for (let i = 1; i <= 10; i++) {
        const y = H - (i / 10) * H * 0.82 - H * 0.08
        ctx.fillText(`${i}x`, 4, y + 3)
        ctx.strokeStyle = 'rgba(0,232,135,0.04)'
        ctx.lineWidth = 0.5
        ctx.beginPath(); ctx.moveTo(22, y); ctx.lineTo(W, y); ctx.stroke()
      }

      // Screen shake
      if (shakeRef.current.time > 0) {
        shakeRef.current.time--
        const intensity = shakeRef.current.time * 0.8
        shakeRef.current.x = (Math.random() - 0.5) * intensity
        shakeRef.current.y = (Math.random() - 0.5) * intensity
        ctx.save()
        ctx.translate(shakeRef.current.x, shakeRef.current.y)
      }

      const originX = 8, originY = H * 0.88

      if (p === 'running' && m > 1) {
        const progress = Math.min(1, Math.log(m) / Math.log(60))
        const eased = Math.pow(progress, 0.55)
        const maxX = Math.max(W - 180, W * 0.6), maxY = H * 0.76
        const ex = originX + eased * maxX
        const ey = originY - eased * maxY
        const cpx = (originX + ex) * 0.5, cpy = originY - (originY - ey) * 0.06

        // Trail glow (wide)
        ctx.strokeStyle = 'rgba(0,232,135,0.12)'
        ctx.lineWidth = 16; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(originX, originY); ctx.quadraticCurveTo(cpx, cpy, ex, ey); ctx.stroke()

        // Trail glow (medium)
        ctx.strokeStyle = 'rgba(0,232,135,0.25)'
        ctx.lineWidth = 8
        ctx.beginPath(); ctx.moveTo(originX, originY); ctx.quadraticCurveTo(cpx, cpy, ex, ey); ctx.stroke()

        // Trail core
        ctx.strokeStyle = '#00e887'
        ctx.lineWidth = 3
        ctx.beginPath(); ctx.moveTo(originX, originY); ctx.quadraticCurveTo(cpx, cpy, ex, ey); ctx.stroke()

        // Trail particles
        const t = frame * 0.15
        for (let i = 0; i < TRAIL_PARTICLES; i++) {
          const frac = (i / TRAIL_PARTICLES + t * 0.02) % 1
          const tt = frac
          const px = (1 - tt) * (1 - tt) * originX + 2 * (1 - tt) * tt * cpx + tt * tt * ex
          const py = (1 - tt) * (1 - tt) * originY + 2 * (1 - tt) * tt * cpy + tt * tt * ey
          ctx.globalAlpha = (1 - frac) * 0.6
          ctx.fillStyle = '#00e887'
          ctx.beginPath()
          ctx.arc(px + (Math.random() - 0.5) * 6, py + (Math.random() - 0.5) * 6, 1 + Math.random(), 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1

        planePos.current = { x: ex, y: ey }

        // Plane body
        ctx.save()
        ctx.translate(ex, ey)
        // Compute tangent angle from bezier curve at t=0.95
        const t0 = 0.95
        const prevX = (1-t0)*(1-t0)*originX + 2*(1-t0)*t0*cpx + t0*t0*ex
        const prevY = (1-t0)*(1-t0)*originY + 2*(1-t0)*t0*cpy + t0*t0*ey
        const angle = Math.atan2(ey - prevY, ex - prevX)
        ctx.rotate(angle)

        // Fuselage
        ctx.fillStyle = '#e2e8f0'
        ctx.beginPath()
        ctx.ellipse(0, 0, 22, 5, 0, 0, Math.PI * 2)
        ctx.fill()

        // Wings
        ctx.fillStyle = '#94a3b8'
        ctx.beginPath()
        ctx.moveTo(-4, -2); ctx.lineTo(-12, -14); ctx.lineTo(6, -2)
        ctx.closePath(); ctx.fill()
        ctx.beginPath()
        ctx.moveTo(-4, 2); ctx.lineTo(-12, 14); ctx.lineTo(6, 2)
        ctx.closePath(); ctx.fill()

        // Nose cone
        ctx.fillStyle = '#f59e0b'
        ctx.beginPath()
        ctx.moveTo(22, 0); ctx.lineTo(16, -4); ctx.lineTo(16, 4)
        ctx.closePath(); ctx.fill()

        // Propeller
        const propAngle = frame * 0.6
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(24 + Math.cos(propAngle) * 6, Math.sin(propAngle) * 3)
        ctx.lineTo(24 - Math.cos(propAngle) * 6, -Math.sin(propAngle) * 3)
        ctx.stroke()

        // Engine glow
        ctx.fillStyle = 'rgba(255,140,0,0.4)'
        ctx.beginPath()
        ctx.arc(-22, 0, 4 + Math.sin(frame * 0.3) * 1.5, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()

        // Multiplier text (frosted pill)
        const mc = m >= 10 ? '#ef4444' : m >= 5 ? '#facc15' : '#00e887'
        const mBg = m >= 10 ? 'rgba(239,68,68,0.15)' : m >= 5 ? 'rgba(250,204,21,0.12)' : 'rgba(0,232,135,0.12)'
        ctx.font = 'bold 22px "Exo 2", sans-serif'
        const tw = ctx.measureText(`${m.toFixed(2)}x`).width
        const tx = ex + 30, ty = ey - 8
        ctx.fillStyle = mBg
        roundRect(ctx, tx - 8, ty - 18, tw + 16, 26, 6)
        ctx.fill()
        ctx.fillStyle = mc
        ctx.fillText(`${m.toFixed(2)}x`, tx, ty)

      } else {
        planePos.current = { x: 0, y: 0 }
      }

      // Explosion particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.04
        p.vx *= 0.98
        p.life -= p.decay
        if (p.life <= 0) return false
        ctx.globalAlpha = p.life
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
        ctx.fill()
        return true
      })
      ctx.globalAlpha = 1

      if (shakeRef.current.time > 0) ctx.restore()

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animRef.current) }
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4, overflow: 'hidden' }}>
        {cashoutExits?.map(e => (
          <div key={e.id} style={{
            position: 'absolute', left: `${e.left}%`, top: `${e.top}%`,
            display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
            borderRadius: 20, background: 'rgba(0,232,135,0.15)', border: '1px solid rgba(0,232,135,0.3)',
            animation: 'exitFade 2.2s forwards',
          }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,232,135,0.15)', border: '1px solid rgba(0,232,135,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#00e887' }}>
              {(e.name || '?')[0].toUpperCase()}
            </div>
            <span style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,0.5)', maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#00e887' }}>+₨{e.profit.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes exitFade { 0%{opacity:0;transform:translateY(10px) scale(.8)} 8%{opacity:1;transform:translateY(0) scale(1)} 75%{opacity:1;transform:translateY(-8px)} 100%{opacity:0;transform:translateY(-20px)} }`}</style>
    </div>
  )
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
