import { useEffect, useRef } from 'react'

const STAR_COUNT = 60

function precomputeStars(count) {
  const stars = []
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random(), y: Math.random(),
      size: 0.4 + Math.random() * 1.0,
      speed: 0.00015 + Math.random() * 0.0006,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.12 + Math.random() * 0.35,
    })
  }
  return stars
}

function precomputeTrail(count) {
  const pts = []
  for (let i = 0; i < count; i++) {
    pts.push({
      offX: (Math.random() - 0.5) * 5,
      offY: (Math.random() - 0.5) * 5,
      size: 0.8 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
    })
  }
  return pts
}

function bezierPoint(t, ox, oy, cpx, cpy, ex, ey) {
  const mt = 1 - t
  return {
    x: mt * mt * ox + 2 * mt * t * cpx + t * t * ex,
    y: mt * mt * oy + 2 * mt * t * cpy + t * t * ey,
  }
}

function drawPlane(ctx, x, y, angle, frame) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  const s = 1.1

  // Engine exhaust glow
  const glowSize = 6 + Math.sin(frame * 0.4) * 2
  const grd = ctx.createRadialGradient(-26 * s, 0, 0, -26 * s, 0, glowSize * 2)
  grd.addColorStop(0, 'rgba(255,160,50,0.5)')
  grd.addColorStop(0.4, 'rgba(255,100,20,0.2)')
  grd.addColorStop(1, 'rgba(255,60,10,0)')
  ctx.fillStyle = grd
  ctx.beginPath()
  ctx.arc(-26 * s, 0, glowSize * 2, 0, Math.PI * 2)
  ctx.fill()

  // Exhaust flame
  ctx.fillStyle = 'rgba(255,180,60,0.7)'
  ctx.beginPath()
  ctx.moveTo(-24 * s, -2.5 * s)
  ctx.lineTo(-24 * s - (6 + Math.sin(frame * 0.5) * 3) * s, 0)
  ctx.lineTo(-24 * s, 2.5 * s)
  ctx.closePath()
  ctx.fill()

  // Fuselage (sleek body)
  ctx.fillStyle = '#d1d5db'
  ctx.beginPath()
  ctx.ellipse(0, 0, 24 * s, 4.5 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  // Fuselage top highlight
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.beginPath()
  ctx.ellipse(0, -1.5 * s, 20 * s, 2 * s, 0, 0, Math.PI * 2)
  ctx.fill()

  // Wings (swept back, modern)
  ctx.fillStyle = '#9ca3af'
  ctx.beginPath()
  ctx.moveTo(-2 * s, -3 * s)
  ctx.lineTo(-14 * s, -16 * s)
  ctx.lineTo(4 * s, -3 * s)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-2 * s, 3 * s)
  ctx.lineTo(-14 * s, 16 * s)
  ctx.lineTo(4 * s, 3 * s)
  ctx.closePath()
  ctx.fill()

  // Tail fin (vertical stabilizer)
  ctx.fillStyle = '#6b7280'
  ctx.beginPath()
  ctx.moveTo(-20 * s, -4 * s)
  ctx.lineTo(-26 * s, -12 * s)
  ctx.lineTo(-16 * s, -4 * s)
  ctx.closePath()
  ctx.fill()

  // Horizontal stabilizer
  ctx.fillStyle = '#9ca3af'
  ctx.beginPath()
  ctx.moveTo(-18 * s, -3 * s)
  ctx.lineTo(-24 * s, -8 * s)
  ctx.lineTo(-14 * s, -3 * s)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-18 * s, 3 * s)
  ctx.lineTo(-24 * s, 8 * s)
  ctx.lineTo(-14 * s, 3 * s)
  ctx.closePath()
  ctx.fill()

  // Cockpit window
  ctx.fillStyle = 'rgba(100,200,255,0.6)'
  ctx.beginPath()
  ctx.ellipse(12 * s, -1.5 * s, 5 * s, 2.5 * s, -0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = 0.5
  ctx.stroke()

  // Nose cone
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.moveTo(24 * s, 0)
  ctx.lineTo(20 * s, -3 * s)
  ctx.lineTo(20 * s, 3 * s)
  ctx.closePath()
  ctx.fill()

  // Wing tip lights
  ctx.fillStyle = '#22d3ee'
  ctx.beginPath()
  ctx.arc(-14 * s, -16 * s, 1.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.arc(-14 * s, 16 * s, 1.2, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

export default function AviatorCanvas({ phase, mult, crashedAt, cashoutExits }) {
  const canvasRef = useRef(null)
  const stateRef = useRef({ phase, mult, crashedAt })
  const animRef = useRef(null)
  const shakeRef = useRef({ x: 0, y: 0, time: 0 })
  const starsRef = useRef(precomputeStars(STAR_COUNT))
  const trailDots = useRef(precomputeTrail(15))
  const particlesRef = useRef([])
  const planePos = useRef({ x: 0, y: 0 })
  const crashShownRef = useRef(false)
  const smoothMult = useRef(1)

  useEffect(() => { stateRef.current = { phase, mult, crashedAt } }, [phase, mult, crashedAt])

  useEffect(() => {
    if (phase === 'crashed' && !crashShownRef.current) {
      shakeRef.current.time = 12
      const px = planePos.current.x, py = planePos.current.y
      for (let i = 0; i < 40; i++) {
        const angle = (Math.PI * 2 * i) / 40 + (Math.random() - 0.5) * 0.4
        const speed = 1.5 + Math.random() * 3.5
        particlesRef.current.push({
          x: px, y: py,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.8,
          life: 1,
          decay: 0.015 + Math.random() * 0.02,
          size: 1.5 + Math.random() * 2.5,
          color: ['#ef4444', '#f97316', '#facc15', '#ffffff'][Math.floor(Math.random() * 4)],
        })
      }
      crashShownRef.current = true
    }
    if (phase === 'betting') {
      crashShownRef.current = false
      particlesRef.current = []
      smoothMult.current = 1
    }
  }, [phase])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let W = 0, H = 0
    let bgCanvas = null

    const buildBg = (w, h) => {
      const off = document.createElement('canvas')
      off.width = w; off.height = h
      const c = off.getContext('2d')

      // Gradient background
      const bg = c.createLinearGradient(0, 0, 0, h)
      bg.addColorStop(0, '#080d1a')
      bg.addColorStop(0.5, '#0b1120')
      bg.addColorStop(1, '#060c18')
      c.fillStyle = bg; c.fillRect(0, 0, w, h)

      // Grid
      c.strokeStyle = 'rgba(255,255,255,0.015)'
      c.lineWidth = 0.5
      for (let i = 0; i < w; i += 36) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke() }
      for (let i = 0; i < h; i += 36) { c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke() }

      // Y-axis labels + lines
      c.fillStyle = 'rgba(255,255,255,0.06)'
      c.font = '10px monospace'
      for (let i = 1; i <= 10; i++) {
        const y = h - (i / 10) * h * 0.82 - h * 0.08
        c.fillText(`${i}x`, 4, y + 3)
        c.strokeStyle = 'rgba(0,232,135,0.035)'
        c.beginPath(); c.moveTo(22, y); c.lineTo(w, y); c.stroke()
      }

      return off
    }

    let frame = 0

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      W = canvas.offsetWidth; H = canvas.offsetHeight
      canvas.width = W * dpr; canvas.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      bgCanvas = buildBg(W, H)
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      frame++
      const { phase: p, mult: m, crashedAt: cp } = stateRef.current

      // Smooth multiplier interpolation
      if (p === 'running' && m > 1) {
        smoothMult.current += (m - smoothMult.current) * 0.3
      } else if (p === 'crashed') {
        smoothMult.current = cp || m
      }
      const displayMult = smoothMult.current

      ctx.clearRect(0, 0, W, H)
      if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0)

      // Stars (pre-computed, no Math.random)
      const t01 = frame * 0.005
      starsRef.current.forEach(s => {
        s.y -= s.speed
        if (s.y < -0.01) { s.y = 1.01; s.x = Math.random() }
        ctx.globalAlpha = s.alpha * (0.5 + 0.5 * Math.sin(frame * 0.015 + s.phase))
        ctx.fillStyle = '#fff'
        ctx.fillRect(s.x * W, s.y * H, s.size, s.size)
      })
      ctx.globalAlpha = 1

      const originX = 8, originY = H * 0.88

      if (p === 'running' && displayMult > 1) {
        const progress = Math.min(1, Math.log(displayMult) / Math.log(60))
        const eased = Math.pow(progress, 0.5)
        const maxX = Math.max(W - 200, W * 0.6)
        const maxY = H * 0.78
        const ex = originX + eased * maxX
        const ey = originY - eased * maxY
        const cpx = (originX + ex) * 0.5
        const cpy = originY - (originY - ey) * 0.05

        // Trail glow (wide, soft)
        ctx.strokeStyle = 'rgba(0,232,135,0.08)'
        ctx.lineWidth = 18
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(originX, originY)
        ctx.quadraticCurveTo(cpx, cpy, ex, ey)
        ctx.stroke()

        // Trail glow (medium)
        ctx.strokeStyle = 'rgba(0,232,135,0.2)'
        ctx.lineWidth = 8
        ctx.beginPath()
        ctx.moveTo(originX, originY)
        ctx.quadraticCurveTo(cpx, cpy, ex, ey)
        ctx.stroke()

        // Trail core
        ctx.strokeStyle = '#00e887'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(originX, originY)
        ctx.quadraticCurveTo(cpx, cpy, ex, ey)
        ctx.stroke()

        // Trail dots (pre-computed offsets, no Math.random)
        trailDots.current.forEach(d => {
          const frac = ((frame * 0.012 + d.phase) % 1)
          const pt = bezierPoint(frac, originX, originY, cpx, cpy, ex, ey)
          ctx.globalAlpha = (1 - frac) * 0.5
          ctx.fillStyle = '#00e887'
          ctx.beginPath()
          ctx.arc(pt.x + d.offX, pt.y + d.offY, d.size, 0, Math.PI * 2)
          ctx.fill()
        })
        ctx.globalAlpha = 1

        planePos.current = { x: ex, y: ey }

        // Plane angle from bezier tangent
        const prev = bezierPoint(0.96, originX, originY, cpx, cpy, ex, ey)
        const angle = Math.atan2(ey - prev.y, ex - prev.x)

        drawPlane(ctx, ex, ey, angle, frame)

        // Multiplier text
        const mc = displayMult >= 10 ? '#ef4444' : displayMult >= 5 ? '#facc15' : '#00e887'
        const mBg = displayMult >= 10 ? 'rgba(239,68,68,0.12)' : displayMult >= 5 ? 'rgba(250,204,21,0.1)' : 'rgba(0,232,135,0.1)'
        ctx.font = 'bold 22px "Exo 2", sans-serif'
        const tw = ctx.measureText(`${displayMult.toFixed(2)}x`).width
        const tx = ex + 28, ty = ey - 6
        ctx.fillStyle = mBg
        roundRect(ctx, tx - 8, ty - 18, tw + 16, 26, 6)
        ctx.fill()
        ctx.fillStyle = mc
        ctx.fillText(`${displayMult.toFixed(2)}x`, tx, ty)

      } else {
        planePos.current = { x: 0, y: 0 }
      }

      // Screen shake
      if (shakeRef.current.time > 0) {
        shakeRef.current.time--
        const intensity = shakeRef.current.time * 0.6
        const sx = (Math.random() - 0.5) * intensity
        const sy = (Math.random() - 0.5) * intensity
        ctx.save()
        ctx.translate(sx, sy)
      }

      // Explosion particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.035
        p.vx *= 0.985
        p.life -= p.decay
        if (p.life <= 0) return false
        ctx.globalAlpha = p.life * 0.9
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
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animRef.current)
    }
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
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
