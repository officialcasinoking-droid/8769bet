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
      if (engineRef.current) { try { engineRef.current.stop() } catch {} }
    }
  }, [])

  const playEngine = useCallback((mult) => {
    if (muted) return
    try {
      const ctx = getCtx()
      if (!engineRef.current) {
        const osc = ctx.createOscillator()
        const g = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(60, ctx.currentTime)
        g.gain.setValueAtTime(0, ctx.currentTime)
        osc.connect(g); g.connect(ctx.destination)
        osc.start()
        engineRef.current = osc
        engineGainRef.current = g
      }
      const baseFreq = 60 + Math.min(mult, 20) * 8
      const vol = Math.min(0.04, 0.015 + mult * 0.002)
      engineRef.current.frequency.setTargetAtTime(baseFreq, getCtx().currentTime, 0.1)
      engineGainRef.current.gain.setTargetAtTime(vol, getCtx().currentTime, 0.1)
    } catch {}
  }, [muted])

  const stopEngine = useCallback(() => {
    if (engineGainRef.current) {
      try { engineGainRef.current.gain.setTargetAtTime(0, getCtx().currentTime, 0.3) } catch {}
    }
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
