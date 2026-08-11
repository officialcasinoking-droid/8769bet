import { useRef, useCallback, useEffect } from 'react'

let audioCtx = null
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

function playTone(freq, duration, type = 'sine', gain = 0.15) {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    g.gain.setValueAtTime(gain, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(g); g.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + duration)
  } catch {}
}

function playNoise(duration, gain = 0.1) {
  try {
    const ctx = getCtx()
    const bufferSize = ctx.sampleRate * duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2)
    const source = ctx.createBufferSource()
    const g = ctx.createGain()
    source.buffer = buffer
    g.gain.setValueAtTime(gain, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    source.connect(g); g.connect(ctx.destination)
    source.start()
  } catch {}
}

export default function useGameSounds(muted) {
  const engineRef = useRef(null)
  const engineGainRef = useRef(null)
  const lastPhaseRef = useRef(null)

  useEffect(() => {
    return () => {
      try {
        if (engineRef.current) {
          const e = engineRef.current
          if (e.osc1) e.osc1.stop()
          if (e.osc2) e.osc2.stop()
          if (e.osc3) e.osc3.stop()
          if (e.osc4) e.osc4.stop()
        }
      } catch {}
    }
  }, [])

  const playEngine = useCallback((mult) => {
    if (muted) return
    try {
      const ctx = getCtx()
      if (!engineRef.current) {
        // Layer 1: Low drone (sawtooth, 40-80Hz)
        const osc1 = ctx.createOscillator()
        const g1 = ctx.createGain()
        osc1.type = 'sawtooth'
        osc1.frequency.value = 45
        g1.gain.value = 0
        osc1.connect(g1); g1.connect(ctx.destination)
        osc1.start()

        // Layer 2: Mid harmonic (sine, 90-150Hz, detuned)
        const osc2 = ctx.createOscillator()
        const g2 = ctx.createGain()
        osc2.type = 'sine'
        osc2.frequency.value = 95
        osc2.detune.value = 12
        g2.gain.value = 0
        osc2.connect(g2); g2.connect(ctx.destination)
        osc2.start()

        // Layer 3: Propeller whine (triangle, 300-600Hz)
        const osc3 = ctx.createOscillator()
        const g3 = ctx.createGain()
        osc3.type = 'triangle'
        osc3.frequency.value = 350
        g3.gain.value = 0
        osc3.connect(g3); g3.connect(ctx.destination)
        osc3.start()

        // Layer 4: Sub bass (sine, 25-40Hz)
        const osc4 = ctx.createOscillator()
        const g4 = ctx.createGain()
        osc4.type = 'sine'
        osc4.frequency.value = 30
        g4.gain.value = 0
        osc4.connect(g4); g4.connect(ctx.destination)
        osc4.start()

        engineRef.current = { osc1, g1, osc2, g2, osc3, g3, osc4, g4 }
        engineGainRef.current = { g1, g2, g3, g4 }
      }

      const t = ctx.currentTime
      const { osc1, g1, osc2, g2, osc3, g3, osc4, g4 } = engineRef.current

      const ratio = Math.min(mult, 20)
      const vol = Math.min(0.035, 0.012 + mult * 0.002)

      osc1.frequency.setTargetAtTime(45 + ratio * 3, t, 0.1)
      g1.gain.setTargetAtTime(vol * 0.6, t, 0.1)

      osc2.frequency.setTargetAtTime(95 + ratio * 5, t, 0.1)
      g2.gain.setTargetAtTime(vol * 0.35, t, 0.1)

      osc3.frequency.setTargetAtTime(350 + ratio * 20, t, 0.1)
      g3.gain.setTargetAtTime(vol * 0.15, t, 0.1)

      osc4.frequency.setTargetAtTime(30 + ratio * 1.5, t, 0.1)
      g4.gain.setTargetAtTime(vol * 0.5, t, 0.1)
    } catch {}
  }, [muted])

  const stopEngine = useCallback(() => {
    try {
      const ctx = getCtx()
      const t = ctx.currentTime
      if (engineGainRef.current) {
        const { g1, g2, g3, g4 } = engineGainRef.current
        if (g1) g1.gain.setTargetAtTime(0, t, 0.3)
        if (g2) g2.gain.setTargetAtTime(0, t, 0.3)
        if (g3) g3.gain.setTargetAtTime(0, t, 0.3)
        if (g4) g4.gain.setTargetAtTime(0, t, 0.3)
      }
    } catch {}
  }, [])

  const playCashout = useCallback(() => {
    if (muted) return
    playTone(880, 0.15, 'sine', 0.12)
    setTimeout(() => playTone(1100, 0.12, 'sine', 0.1), 80)
  }, [muted])

  const playCrash = useCallback(() => {
    if (muted) return
    playNoise(0.4, 0.12)
    playTone(80, 0.5, 'sawtooth', 0.08)
  }, [muted])

  const playBet = useCallback(() => {
    if (muted) return
    playTone(600, 0.08, 'square', 0.06)
    setTimeout(() => playTone(800, 0.06, 'square', 0.05), 50)
  }, [muted])

  const playTick = useCallback(() => {
    if (muted) return
    playTone(1200, 0.03, 'sine', 0.04)
  }, [muted])

  const playWin = useCallback(() => {
    if (muted) return
    ;[523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.15, 'sine', 0.08), i * 80)
    })
  }, [muted])

  return { playEngine, stopEngine, playCashout, playCrash, playBet, playTick, playWin }
}
