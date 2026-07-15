import { useEffect, useRef } from 'react'

const STAR_COUNT = 50

function makeStars(n) {
  const a = []
  for (let i = 0; i < n; i++) a.push({ x: Math.random(), y: Math.random(), s: 0.3 + Math.random() * 0.9, sp: 0.0001 + Math.random() * 0.0005, ph: Math.random() * 6.28, al: 0.1 + Math.random() * 0.3 })
  return a
}
function makeTrailDots(n) {
  const a = []
  for (let i = 0; i < n; i++) a.push({ ox: (Math.random() - 0.5) * 4, oy: (Math.random() - 0.5) * 4, sz: 0.6 + Math.random() * 1, ph: Math.random() * 6.28 })
  return a
}

function bez(t, ox, oy, cx, cy, ex, ey) {
  const m = 1 - t
  return { x: m * m * ox + 2 * m * t * cx + t * t * ex, y: m * m * oy + 2 * m * t * cy + t * t * ey }
}

function drawPlane(ctx, x, y, angle, time, scale) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  const s = scale

  // Exhaust glow
  const gs = 8 + Math.sin(time * 8) * 2
  const g = ctx.createRadialGradient(-30 * s, 0, 0, -30 * s, 0, gs * 2.5)
  g.addColorStop(0, 'rgba(255,160,50,0.6)')
  g.addColorStop(0.3, 'rgba(255,80,20,0.25)')
  g.addColorStop(1, 'rgba(255,40,10,0)')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(-30 * s, 0, gs * 2.5, 0, Math.PI * 2); ctx.fill()

  // Flame
  ctx.fillStyle = 'rgba(255,200,80,0.8)'
  ctx.beginPath()
  ctx.moveTo(-28 * s, -3 * s)
  ctx.lineTo(-28 * s - (8 + Math.sin(time * 12) * 4) * s, 0)
  ctx.lineTo(-28 * s, 3 * s)
  ctx.closePath(); ctx.fill()

  // Fuselage
  const fGrd = ctx.createLinearGradient(0, -5 * s, 0, 5 * s)
  fGrd.addColorStop(0, '#e5e7eb')
  fGrd.addColorStop(0.5, '#d1d5db')
  fGrd.addColorStop(1, '#9ca3af')
  ctx.fillStyle = fGrd
  ctx.beginPath()
  ctx.moveTo(30 * s, 0)
  ctx.bezierCurveTo(28 * s, -5 * s, -10 * s, -6 * s, -30 * s, -4 * s)
  ctx.lineTo(-30 * s, 4 * s)
  ctx.bezierCurveTo(-10 * s, 6 * s, 28 * s, 5 * s, 30 * s, 0)
  ctx.closePath(); ctx.fill()

  // Cockpit canopy
  ctx.fillStyle = 'rgba(56,189,248,0.55)'
  ctx.beginPath()
  ctx.ellipse(18 * s, -2.5 * s, 7 * s, 3 * s, -0.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 0.6
  ctx.stroke()

  // Main wings
  ctx.fillStyle = '#6b7280'
  ctx.beginPath()
  ctx.moveTo(2 * s, -5 * s)
  ctx.lineTo(-8 * s, -22 * s)
  ctx.lineTo(10 * s, -22 * s)
  ctx.lineTo(12 * s, -5 * s)
  ctx.closePath(); ctx.fill()
  ctx.beginPath()
  ctx.moveTo(2 * s, 5 * s)
  ctx.lineTo(-8 * s, 22 * s)
  ctx.lineTo(10 * s, 22 * s)
  ctx.lineTo(12 * s, 5 * s)
  ctx.closePath(); ctx.fill()

  // Wing highlights
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.beginPath()
  ctx.moveTo(4 * s, -5 * s)
  ctx.lineTo(-4 * s, -18 * s)
  ctx.lineTo(8 * s, -18 * s)
  ctx.lineTo(10 * s, -5 * s)
  ctx.closePath(); ctx.fill()

  // Tail vertical stabilizer
  ctx.fillStyle = '#4b5563'
  ctx.beginPath()
  ctx.moveTo(-22 * s, -4 * s)
  ctx.lineTo(-28 * s, -16 * s)
  ctx.lineTo(-18 * s, -16 * s)
  ctx.lineTo(-16 * s, -4 * s)
  ctx.closePath(); ctx.fill()

  // Tail horizontal stabilizer
  ctx.fillStyle = '#6b7280'
  ctx.beginPath()
  ctx.moveTo(-20 * s, -4 * s)
  ctx.lineTo(-26 * s, -10 * s)
  ctx.lineTo(-14 * s, -10 * s)
  ctx.lineTo(-14 * s, -4 * s)
  ctx.closePath(); ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-20 * s, 4 * s)
  ctx.lineTo(-26 * s, 10 * s)
  ctx.lineTo(-14 * s, 10 * s)
  ctx.lineTo(-14 * s, 4 * s)
  ctx.closePath(); ctx.fill()

  // Nose
  ctx.fillStyle = '#dc2626'
  ctx.beginPath()
  ctx.moveTo(30 * s, 0)
  ctx.lineTo(26 * s, -3.5 * s)
  ctx.lineTo(26 * s, 3.5 * s)
  ctx.closePath(); ctx.fill()

  // Navigation lights
  ctx.fillStyle = '#22d3ee'
  ctx.beginPath(); ctx.arc(-8 * s, -22 * s, 1.5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#ef4444'
  ctx.beginPath(); ctx.arc(-8 * s, 22 * s, 1.5, 0, Math.PI * 2); ctx.fill()

  ctx.restore()
}

export default function AviatorCanvas({ phase, mult, crashedAt, cashoutExits }) {
  const canvasRef = useRef(null)
  const stateRef = useRef({ phase, mult, crashedAt })
  const animRef = useRef(null)
  const starsRef = useRef(makeStars(STAR_COUNT))
  const trailDots = useRef(makeTrailDots(15))
  const particlesRef = useRef([])
  const planePos = useRef({ x: 0, y: 0 })
  const crashShownRef = useRef(false)
  const smoothMult = useRef(1)
  const startTimeRef = useRef(0)
  const lastFrameTime = useRef(0)

  useEffect(() => { stateRef.current = { phase, mult, crashedAt } }, [phase, mult, crashedAt])

  useEffect(() => {
    if (phase === 'flying' || phase === 'running') {
      startTimeRef.current = performance.now()
      smoothMult.current = 1
    }
    if (phase === 'crashed' && !crashShownRef.current) {
      const px = planePos.current.x, py = planePos.current.y
      for (let i = 0; i < 35; i++) {
        const a = (Math.PI * 2 * i) / 35 + (Math.random() - 0.5) * 0.4
        const sp = 1.5 + Math.random() * 3
        particlesRef.current.push({
          x: px, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.6,
          life: 1, decay: 0.016 + Math.random() * 0.02, sz: 1.5 + Math.random() * 2.5,
          col: ['#ef4444', '#f97316', '#facc15', '#fff'][~~(Math.random() * 4)],
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
    let W = 0, H = 0, bg = null

    const buildBg = (w, h) => {
      const o = document.createElement('canvas')
      o.width = w; o.height = h
      const c = o.getContext('2d')
      const gr = c.createLinearGradient(0, 0, 0, h)
      gr.addColorStop(0, '#080d1a')
      gr.addColorStop(0.5, '#0b1120')
      gr.addColorStop(1, '#060c18')
      c.fillStyle = gr; c.fillRect(0, 0, w, h)
      c.strokeStyle = 'rgba(255,255,255,0.013)'; c.lineWidth = 0.5
      for (let i = 0; i < w; i += 40) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke() }
      for (let i = 0; i < h; i += 40) { c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke() }
      c.fillStyle = 'rgba(255,255,255,0.05)'; c.font = '10px monospace'
      for (let i = 1; i <= 10; i++) {
        const y = h - (i / 10) * h * 0.82 - h * 0.08
        c.fillText(`${i}x`, 4, y + 3)
        c.strokeStyle = 'rgba(0,232,135,0.03)'; c.beginPath(); c.moveTo(22, y); c.lineTo(w, y); c.stroke()
      }
      return o
    }

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      W = canvas.offsetWidth; H = canvas.offsetHeight
      canvas.width = W * dpr; canvas.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      bg = buildBg(W, H)
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = (now) => {
      const dt = lastFrameTime.current ? Math.min((now - lastFrameTime.current) / 1000, 0.05) : 0.016
      lastFrameTime.current = now

      const { phase: p, mult: m, crashedAt: cp } = stateRef.current
      const elapsed = (now - startTimeRef.current) / 1000

      // Smooth mult with delta time
      if (p === 'running' || p === 'flying') {
        // Interpolate towards target at rate proportional to dt
        const target = m
        const speed = 8
        smoothMult.current += (target - smoothMult.current) * Math.min(1, speed * dt)
      } else if (p === 'crashed') {
        smoothMult.current += ((cp || m) - smoothMult.current) * Math.min(1, 12 * dt)
      }
      const dm = Math.max(1, smoothMult.current)

      ctx.clearRect(0, 0, W, H)
      if (bg) ctx.drawImage(bg, 0, 0)

      // Stars
      starsRef.current.forEach(s => {
        s.y -= s.sp
        if (s.y < -0.01) { s.y = 1.01; s.x = Math.random() }
        ctx.globalAlpha = s.al * (0.5 + 0.5 * Math.sin(now * 0.001 + s.ph))
        ctx.fillStyle = '#fff'
        ctx.fillRect(s.x * W, s.y * H, s.s, s.s)
      })
      ctx.globalAlpha = 1

      const ox = 8, oy = H * 0.88

      if ((p === 'running' || p === 'flying') && dm > 1) {
        const progress = Math.min(1, Math.log(dm) / Math.log(60))
        const eased = Math.pow(progress, 0.45)
        const maxX = Math.max(W - 160, W * 0.55)
        const maxY = H * 0.78
        const ex = ox + eased * maxX
        const ey = oy - eased * maxY
        const cpx = (ox + ex) * 0.5
        const cpy = oy - (oy - ey) * 0.05

        // Trail
        ctx.lineCap = 'round'
        ctx.strokeStyle = 'rgba(0,232,135,0.06)'; ctx.lineWidth = 20
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.quadraticCurveTo(cpx, cpy, ex, ey); ctx.stroke()
        ctx.strokeStyle = 'rgba(0,232,135,0.18)'; ctx.lineWidth = 8
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.quadraticCurveTo(cpx, cpy, ex, ey); ctx.stroke()
        ctx.strokeStyle = '#00e887'; ctx.lineWidth = 2.5
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.quadraticCurveTo(cpx, cpy, ex, ey); ctx.stroke()

        // Trail dots
        trailDots.current.forEach(d => {
          const f = ((now * 0.001 + d.ph) % 1)
          const pt = bez(f, ox, oy, cpx, cpy, ex, ey)
          ctx.globalAlpha = (1 - f) * 0.4
          ctx.fillStyle = '#00e887'
          ctx.beginPath(); ctx.arc(pt.x + d.ox, pt.y + d.oy, d.sz, 0, Math.PI * 2); ctx.fill()
        })
        ctx.globalAlpha = 1

        planePos.current = { x: ex, y: ey }

        // Plane angle
        const prev = bez(0.95, ox, oy, cpx, cpy, ex, ey)
        const angle = Math.atan2(ey - prev.y, ex - prev.x)

        // Plane scale based on multiplier (starts smaller, grows)
        const planeScale = Math.min(1.3, 0.7 + eased * 0.6)
        drawPlane(ctx, ex, ey, angle, now * 0.001, planeScale)

        // Multiplier pill
        const mc = dm >= 10 ? '#ef4444' : dm >= 5 ? '#facc15' : '#00e887'
        const mbg = dm >= 10 ? 'rgba(239,68,68,0.12)' : dm >= 5 ? 'rgba(250,204,21,0.1)' : 'rgba(0,232,135,0.1)'
        ctx.font = `bold ${Math.round(20 * planeScale)}px "Exo 2", sans-serif`
        const tw = ctx.measureText(`${dm.toFixed(2)}x`).width
        const tx = ex + 35 * planeScale, ty = ey - 4
        ctx.fillStyle = mbg
        roundRect(ctx, tx - 8, ty - 16, tw + 16, 24, 6); ctx.fill()
        ctx.fillStyle = mc
        ctx.fillText(`${dm.toFixed(2)}x`, tx, ty)
      } else {
        planePos.current = { x: 0, y: 0 }
      }

      // Explosion
      if (particlesRef.current.length > 0) {
        ctx.save()
        particlesRef.current = particlesRef.current.filter(p => {
          p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.vx *= 0.985; p.life -= p.decay
          if (p.life <= 0) return false
          ctx.globalAlpha = p.life * 0.9
          ctx.fillStyle = p.col
          ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * p.life, 0, Math.PI * 2); ctx.fill()
          return true
        })
        ctx.globalAlpha = 1
        ctx.restore()
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animRef.current) }
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
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
