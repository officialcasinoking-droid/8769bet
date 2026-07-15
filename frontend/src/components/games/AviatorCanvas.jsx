import { useEffect, useRef } from 'react'
import { PLANE_BODY, PROPELLER_BLADE_1, PROPELLER_BLADE_2 } from './_plane_data'

const STAR_COUNT = 40

function makeStars(n) {
  const a = []
  for (let i = 0; i < n; i++) a.push({
    x: Math.random(), y: Math.random(),
    s: 0.3 + Math.random() * 0.9,
    sp: 0.0001 + Math.random() * 0.0005,
    ph: Math.random() * 6.28,
    al: 0.08 + Math.random() * 0.2,
  })
  return a
}

function bez(t, ox, oy, cx, cy, ex, ey) {
  const m = 1 - t
  return { x: m * m * ox + 2 * m * t * cx + t * t * ex, y: m * m * oy + 2 * m * t * cy + t * t * ey }
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

export default function AviatorCanvas({ phase, mult, crashedAt, cashoutExits }) {
  const canvasRef = useRef(null)
  const stateRef = useRef({ phase, mult, crashedAt })
  const animRef = useRef(null)
  const starsRef = useRef(makeStars(STAR_COUNT))
  const particlesRef = useRef([])
  const planePos = useRef({ x: 0, y: 0 })
  const crashShownRef = useRef(false)
  const startTimeRef = useRef(0)
  const lastFrameTime = useRef(0)
  const imagesRef = useRef({ body: null, blade1: null, blade2: null })
  const imagesLoadedRef = useRef(false)

  useEffect(() => { stateRef.current = { phase, mult, crashedAt } }, [phase, mult, crashedAt])

  useEffect(() => {
    if (phase === 'flying' || phase === 'running') {
      startTimeRef.current = performance.now()
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

    if (!imagesLoadedRef.current) {
      Promise.all([
        loadImage(PLANE_BODY),
        loadImage(PROPELLER_BLADE_1),
        loadImage(PROPELLER_BLADE_2),
      ]).then(([body, blade1, blade2]) => {
        imagesRef.current = { body, blade1, blade2 }
        imagesLoadedRef.current = true
      })
    }

    const draw = (now) => {
      const dt = lastFrameTime.current ? Math.min((now - lastFrameTime.current) / 1000, 0.05) : 0.016
      lastFrameTime.current = now

      const { phase: p, mult: m, crashedAt: cp } = stateRef.current
      const dm = Math.max(1, m)

      ctx.clearRect(0, 0, W, H)
      if (bg) ctx.drawImage(bg, 0, 0)

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

        // Ground shadow — dark ellipse below plane path
        const shadowAlpha = Math.max(0, 0.25 - eased * 0.15)
        const shadowY = oy + 4
        const shadowScale = 0.4 + eased * 0.6
        ctx.save()
        ctx.globalAlpha = shadowAlpha
        const sg = ctx.createRadialGradient(ex, shadowY, 0, ex, shadowY, 60 * shadowScale)
        sg.addColorStop(0, 'rgba(0,0,0,0.4)')
        sg.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = sg
        ctx.beginPath()
        ctx.ellipse(ex, shadowY, 60 * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // Trail — gradient line
        ctx.lineCap = 'round'
        ctx.strokeStyle = 'rgba(0,232,135,0.06)'; ctx.lineWidth = 20
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.quadraticCurveTo(cpx, cpy, ex, ey); ctx.stroke()
        ctx.strokeStyle = 'rgba(0,232,135,0.18)'; ctx.lineWidth = 8
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.quadraticCurveTo(cpx, cpy, ex, ey); ctx.stroke()
        ctx.strokeStyle = '#00e887'; ctx.lineWidth = 2.5
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.quadraticCurveTo(cpx, cpy, ex, ey); ctx.stroke()

        // Glow trail at plane position
        ctx.save()
        const glowG = ctx.createRadialGradient(ex, ey, 0, ex, ey, 30)
        glowG.addColorStop(0, 'rgba(0,232,135,0.15)')
        glowG.addColorStop(1, 'rgba(0,232,135,0)')
        ctx.fillStyle = glowG
        ctx.beginPath()
        ctx.arc(ex, ey, 30, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        planePos.current = { x: ex, y: ey }

        const prev = bez(0.95, ox, oy, cpx, cpy, ex, ey)
        const angle = Math.atan2(ey - prev.y, ex - prev.x)
        const planeScale = Math.min(1.3, 0.7 + eased * 0.6)

        const { body, blade1, blade2 } = imagesRef.current
        if (body) {
          ctx.save()
          ctx.translate(ex, ey)
          ctx.rotate(angle)

          const pw = body.width * planeScale * 0.15
          const ph = body.height * planeScale * 0.15

          ctx.drawImage(body, -pw / 2, -ph / 2, pw, ph)

          if (blade1 && blade2) {
            const propAngle = (now * 0.05) % (Math.PI * 2)
            const bladeW = blade1.width * planeScale * 0.15
            const bladeH = blade1.height * planeScale * 0.15
            const noseX = pw * 0.42
            const noseY = 0

            ctx.save()
            ctx.translate(noseX, noseY)
            ctx.rotate(propAngle)
            ctx.drawImage(blade1, -bladeW / 2, -bladeH / 2, bladeW, bladeH)
            ctx.restore()

            ctx.save()
            ctx.translate(noseX, noseY)
            ctx.rotate(propAngle + Math.PI / 2)
            ctx.drawImage(blade2, -bladeW / 2, -bladeH / 2, bladeW, bladeH)
            ctx.restore()
          }

          ctx.restore()

          const mc = dm >= 10 ? '#ef4444' : dm >= 5 ? '#facc15' : '#00e887'
          const mbg = dm >= 10 ? 'rgba(239,68,68,0.12)' : dm >= 5 ? 'rgba(250,204,21,0.1)' : 'rgba(0,232,135,0.1)'
          ctx.font = `bold ${Math.round(20 * planeScale)}px "Exo 2", sans-serif`
          const tw = ctx.measureText(`${dm.toFixed(2)}x`).width
          const tx = ex + 40 * planeScale, ty = ey - 4
          ctx.fillStyle = mbg
          roundRect(ctx, tx - 8, ty - 16, tw + 16, 24, 6); ctx.fill()
          ctx.fillStyle = mc
          ctx.fillText(`${dm.toFixed(2)}x`, tx, ty)
        } else {
          drawFallbackPlane(ctx, ex, ey, angle, now * 0.001, planeScale)

          const mc = dm >= 10 ? '#ef4444' : dm >= 5 ? '#facc15' : '#00e887'
          const mbg = dm >= 10 ? 'rgba(239,68,68,0.12)' : dm >= 5 ? 'rgba(250,204,21,0.1)' : 'rgba(0,232,135,0.1)'
          ctx.font = `bold ${Math.round(20 * planeScale)}px "Exo 2", sans-serif`
          const tw = ctx.measureText(`${dm.toFixed(2)}x`).width
          const tx = ex + 35 * planeScale, ty = ey - 4
          ctx.fillStyle = mbg
          roundRect(ctx, tx - 8, ty - 16, tw + 16, 24, 6); ctx.fill()
          ctx.fillStyle = mc
          ctx.fillText(`${dm.toFixed(2)}x`, tx, ty)
        }
      } else {
        planePos.current = { x: 0, y: 0 }
      }

      if (particlesRef.current.length > 0) {
        ctx.save()
        particlesRef.current = particlesRef.current.filter(pt => {
          pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.04; pt.vx *= 0.985; pt.life -= pt.decay
          if (pt.life <= 0) return false
          ctx.globalAlpha = pt.life * 0.9
          ctx.fillStyle = pt.col
          ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.sz * pt.life, 0, Math.PI * 2); ctx.fill()
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

function drawFallbackPlane(ctx, x, y, angle, time, scale) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  const s = scale

  const gs = 8 + Math.sin(time * 8) * 2
  const g = ctx.createRadialGradient(-30 * s, 0, 0, -30 * s, 0, gs * 2.5)
  g.addColorStop(0, 'rgba(255,160,50,0.6)')
  g.addColorStop(0.3, 'rgba(255,80,20,0.25)')
  g.addColorStop(1, 'rgba(255,40,10,0)')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(-30 * s, 0, gs * 2.5, 0, Math.PI * 2); ctx.fill()

  ctx.fillStyle = 'rgba(255,200,80,0.8)'
  ctx.beginPath()
  ctx.moveTo(-28 * s, -3 * s)
  ctx.lineTo(-28 * s - (8 + Math.sin(time * 12) * 4) * s, 0)
  ctx.lineTo(-28 * s, 3 * s)
  ctx.closePath(); ctx.fill()

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

  ctx.fillStyle = 'rgba(56,189,248,0.55)'
  ctx.beginPath()
  ctx.ellipse(18 * s, -2.5 * s, 7 * s, 3 * s, -0.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 0.6
  ctx.stroke()

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

  ctx.fillStyle = '#4b5563'
  ctx.beginPath()
  ctx.moveTo(-22 * s, -4 * s)
  ctx.lineTo(-28 * s, -16 * s)
  ctx.lineTo(-18 * s, -16 * s)
  ctx.lineTo(-16 * s, -4 * s)
  ctx.closePath(); ctx.fill()

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

  ctx.fillStyle = '#dc2626'
  ctx.beginPath()
  ctx.moveTo(30 * s, 0)
  ctx.lineTo(26 * s, -3.5 * s)
  ctx.lineTo(26 * s, 3.5 * s)
  ctx.closePath(); ctx.fill()

  ctx.fillStyle = '#22d3ee'
  ctx.beginPath(); ctx.arc(-8 * s, -22 * s, 1.5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#ef4444'
  ctx.beginPath(); ctx.arc(-8 * s, 22 * s, 1.5, 0, Math.PI * 2); ctx.fill()

  ctx.restore()
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
