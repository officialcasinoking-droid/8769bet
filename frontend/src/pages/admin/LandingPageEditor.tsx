import React, { useRef, useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { getAdminLanding, saveDraft, publishContent } from '../../api/admin'

const BUCKET = 'landing-images'

const DEFAULT = {
  title: 'Welcome to 399bet',
  subtitle: 'Best AI-powered bets with AI Agent',
  heroImage: '',
  logoUrl: '',
  colors: {
    primary: '#10b981',
    accent: '#6366f1',
    background: '#0f172a',
    text: '#f1f5f9',
    success: '#22c55e',
    warning: '#f59e0b',
    jackpot: '#f59e0b',
  },
  showAnnouncements: true,
  showJackpot: true,
  showCategories: true,
  showGameCards: true,
  gameCards: [],
  footerText: '© 2026 399bet. All rights reserved.',
  announcements: [
    { id: '1', text: 'New users get 100% bonus on first deposit!', expiry: '2026-12-31' },
    { id: '2', text: 'AI Agent accuracy is now 94%!', expiry: '2026-12-31' },
  ],
  categories: [
    { id: '1', name: 'Slots', icon: '🤑' },
    { id: '2', name: 'Crash', icon: '🚀' },
    { id: '3', name: 'Live', icon: '♠️' },
    { id: '4', name: 'AI Pick', icon: '🤖' },
  ],
  headerBg: '#0f172a',
  headerLogoUrl: '',
  headerSearchPlaceholder: 'Search games...',
  headerShowLogin: true,
  headerShowSignup: true,
}

function Preview({ c, device }) {
  const isPhone = device === 'mobile'
  const w = isPhone ? 'w-[375px]' : device === 'tablet' ? 'w-[768px]' : 'w-full'
  const colors = c.colors || {}
  const p = colors.primary || '#10b981'
  const a = colors.accent || '#6366f1'
  const bg = colors.background || '#0f172a'
  const tx = colors.text || '#f1f5f9'

  return (
    <div className={`relative border border-slate-600 ${isPhone ? 'rounded-[3rem] p-2' : 'rounded-2xl p-4'} ${w} transition-all`}
      style={{ background: '#1e293b' }}>
      {isPhone && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-800 rounded-b-2xl z-10" />}
      <div className={`${isPhone ? 'rounded-[2rem]' : 'rounded-xl'} overflow-hidden`} style={{ background: bg, color: tx }}>

        <div className="px-4 py-1.5 flex justify-between text-xs opacity-60" style={{ background: bg }}>
          <span>9:41</span>
          <div className="flex gap-1"><span>5G</span><span>Wi-Fi</span><span>🔋</span></div>
        </div>

        <div className="px-4 py-2 flex items-center gap-3" style={{ background: c.headerBg || bg }}>
          {c.headerLogoUrl ? (
            <img src={c.headerLogoUrl} alt="logo" className="h-7 object-contain"
              onError={e => { e.target.style.display = 'none' }} />
          ) : (
            <div className="h-7 w-16 rounded" style={{ background: p }} />
          )}
          <div className="flex-1 rounded-full px-3 py-1.5 text-xs opacity-30" style={{ background: '#1e293b' }}>
            {c.headerSearchPlaceholder || 'Search games...'}
          </div>
          {c.headerShowLogin && (
            <button className="px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ background: p }}>Login</button>
          )}
          {c.headerShowSignup && (
            <button className="px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ background: a }}>Sign Up</button>
          )}
        </div>

        <div className="p-4 space-y-4" style={{ maxHeight: isPhone ? '520px' : '560px', overflowY: 'auto' }}>

          {c.heroImage ? (
            <img src={c.heroImage} alt="hero" className="w-full h-28 object-cover rounded-xl"
              onError={e => { e.target.style.display = 'none' }} />
          ) : (
            <div className="w-full h-28 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${p}33, ${a}33)` }}>
              <span className="text-xs opacity-40">Hero Image</span>
            </div>
          )}

          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold" style={{ color: p }}>{c.title}</h1>
            <p className="text-xs opacity-60">{c.subtitle}</p>
          </div>

          {c.showJackpot && (
            <div className="rounded-xl p-3 text-center text-white" style={{ background: `linear-gradient(135deg, ${colors.jackpot || '#f59e0b'}, #ea580c)` }}>
              <p className="text-[10px]">🏆 Progressive Jackpot</p>
              <p className="text-lg font-bold">$124,592.50</p>
            </div>
          )}

          {c.showCategories && (
            <div className="grid grid-cols-4 gap-2">
              {(c.categories || []).slice(0, 4).map((cat, i) => (
                <div key={cat.id ?? i} className="text-center">
                  <div className="w-10 h-10 mx-auto rounded-full flex items-center justify-center text-lg" style={{ background: `${p}22` }}>
                    {cat.icon || '📁'}
                  </div>
                  <p className="text-[10px] mt-1 opacity-60">{cat.name}</p>
                </div>
              ))}
            </div>
          )}

          {c.showAnnouncements && (c.announcements || []).map(ann => (
            <div key={ann.id} className="rounded-lg p-2" style={{ background: `${colors.success || '#22c55e'}22`, border: `1px solid ${colors.success || '#22c55e'}44` }}>
              <p className="text-[10px]" style={{ color: colors.success || '#22c55e' }}>📢 {ann.text}</p>
            </div>
          ))}

          {c.showGameCards && (
            <div className="grid grid-cols-2 gap-2">
              {(c.gameCards || []).slice(0, 4).map((g, i) => (
                <div key={g.id ?? g.slug ?? i} className="rounded-xl p-2" style={{ background: '#ffffff08' }}>
                  <div className="h-12 rounded-lg mb-1" style={{ background: '#ffffff18' }} />
                  <p className="text-[10px] font-medium">{g.title}</p>
                </div>
              ))}
              {(!c.gameCards || c.gameCards.length === 0) && ['Aviator 🚀','Fortune Gems 3','Money Coming','Crazy777'].map((name, i) => (
                <div key={i} className="rounded-xl p-2" style={{ background: '#ffffff08' }}>
                  <div className="h-12 rounded-lg mb-1" style={{ background: '#ffffff18' }} />
                  <p className="text-[10px] font-medium">{name}</p>
                </div>
              ))}
            </div>
          )}

          <div className="text-center text-[10px] opacity-40 pb-6">{c.footerText}</div>
        </div>

        <div className="flex justify-around py-2 border-t" style={{ borderColor: '#ffffff18', background: bg }}>
          {['🏠','🎮','💰','👤'].map((icon, i) => (
            <div key={i} className="text-center">
              <div className="w-5 h-5 mx-auto rounded" style={{ background: '#ffffff18' }} />
              <p className="text-[8px] opacity-40">{['Home','Games','Wallet','Profile'][i]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ColorField({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-300 w-20">{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        className="w-10 h-8 rounded border border-slate-600 cursor-pointer" />
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-emerald-500" />
    </div>
  )
}

function UploadZone({ label, value, onChange, accept = 'image/*' }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setUploading(true)
    setProgress(10)

    const ext = file.name.split('.').pop()
    const path = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false })

    setProgress(80)

    if (error) {
      setUploading(false)
      toast.error(`${label} upload failed: ${error.message} ❌`)
      return
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
    setProgress(100)
    setUploading(false)

    if (urlData.publicUrl) {
      onChange(urlData.publicUrl)
      toast.success(`${label} uploaded ✅`)
    }
  }, [label, onChange])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase mb-2">{label}</p>
      <div
        className={`relative rounded-xl border-2 border-dashed transition-all ${dragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600 hover:border-slate-500'}`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}>
        <input ref={inputRef} type="file" accept={accept} className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        {uploading ? (
          <div className="py-4 flex flex-col items-center gap-2">
            <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-slate-400">Uploading... {progress}%</span>
          </div>
        ) : (
          <div className="py-4 flex flex-col items-center gap-1 text-slate-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs">Drop image or click to upload</span>
          </div>
        )}
      </div>
      {value && (
        <div className="mt-2 relative group">
          <img src={value} alt={label} className="w-full h-20 object-cover rounded-lg"
            onError={e => { e.target.style.display = 'none' }} />
          <button onClick={() => onChange('')}
            className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

export default function LandingPageEditor() {
  const queryClient = useQueryClient()
  const [device, setDevice] = useState('mobile')
  const [tab, setTab] = useState('hero')
  const [content, setContent] = useState(DEFAULT)
  const contentRef = useRef(DEFAULT)

  const { isLoading } = useQuery({
    queryKey: ['adminLanding'],
    queryFn: getAdminLanding,
    staleTime: 0,
  })

  const set = useCallback((key, value) => {
    const next = typeof key === 'object' ? { ...content, ...key } : { ...content, [key]: value }
    setContent(next)
    contentRef.current = next
  }, [content])

  const setColor = useCallback((colorKey, value) => {
    const next = { ...content, colors: { ...(content.colors || {}), [colorKey]: value } }
    setContent(next)
    contentRef.current = next
  }, [content])

  const draftMut = useMutation({
    mutationFn: (data) => saveDraft(data),
    onSuccess: () => {
      toast.success('Draft saved ✅')
      queryClient.invalidateQueries({ queryKey: ['adminLanding'] })
    },
    onError: (e) => toast.error(`Draft save failed: ${e.message} ❌`),
  })

  const pubMut = useMutation({
    mutationFn: (data) => publishContent(data),
    onSuccess: () => {
      toast.success('🎉 Published to Live!')
      queryClient.invalidateQueries({ queryKey: ['adminLanding'] })
      queryClient.invalidateQueries({ queryKey: ['landing-theme'] })
      queryClient.invalidateQueries({ queryKey: ['landing-content'] })
    },
    onError: (e) => toast.error(`Publish failed: ${e.message} ❌`),
  })

  const addAnn = () => set('announcements', [...(content.announcements || []), { id: Date.now().toString(), text: 'New announcement!', expiry: '2026-12-31' }])
  const delAnn = (id) => set('announcements', content.announcements.filter(a => a.id !== id))
  const editAnn = (id, text) => set('announcements', content.announcements.map(a => a.id === id ? { ...a, text } : a))
  const addCat = () => set('categories', [...(content.categories || []), { id: Date.now().toString(), name: 'New', icon: '📁' }])
  const delCat = (id) => set('categories', content.categories.filter(c => c.id !== id))
  const editCat = (id, field, val) => set('categories', content.categories.map(c => c.id === id ? { ...c, [field]: val } : c))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full" />
        <span className="ml-4 text-slate-400">Loading editor...</span>
      </div>
    )
  }

  const colors = content.colors || {}

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-950">
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
        <h1 className="text-lg font-bold text-slate-100">Landing Page Editor</h1>
        <div className="flex items-center gap-1 bg-slate-900 rounded-xl p-1">
          {[['mobile','📱'],['tablet','📲'],['desktop','🖥️']].map(([id,icon]) => (
            <button key={id} onClick={() => setDevice(id)}
              className={`p-2 rounded-lg text-xs font-medium transition-all ${device === id ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}>
              {icon}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setContent(DEFAULT); contentRef.current = DEFAULT }}
            className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 text-sm">
            Reset
          </button>
          <button onClick={() => draftMut.mutate(contentRef.current)}
            disabled={draftMut.isPending}
            className="px-4 py-1.5 rounded-xl border border-indigo-500 text-indigo-400 hover:bg-indigo-500/10 text-sm disabled:opacity-50">
            {draftMut.isPending ? '💾 Saving...' : '💾 Save Draft'}
          </button>
          <button onClick={() => pubMut.mutate(contentRef.current)}
            disabled={pubMut.isPending}
            className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2">
            {pubMut.isPending ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publishing...</> : '🚀 Publish to Live'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-full lg:w-[480px] flex-shrink-0 border-r border-slate-800 bg-slate-950/40 overflow-y-auto p-4 space-y-3">

          <div className="flex gap-1 bg-slate-900/60 p-1 rounded-xl">
            {[
              ['hero','✨','Hero'],
              ['colors','🎨','Colors'],
              ['content','📦','Content'],
              ['header','🔝','Header'],
              ['footer','📋','Footer'],
            ].map(([id,icon,label]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all ${tab === id ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'}`}>
                <span>{icon}</span><span className="hidden xl:inline">{label}</span>
              </button>
            ))}
          </div>

          {tab === 'hero' && (
            <div className="space-y-3">
              <Section label="Hero Text">
                <Field label="Title">
                  <input type="text" value={content.title} onChange={e => set('title', e.target.value)}
                    className="input" placeholder="Hero title" />
                </Field>
                <Field label="Subtitle">
                  <textarea value={content.subtitle} onChange={e => set('subtitle', e.target.value)} rows={2}
                    className="input resize-none" placeholder="Hero subtitle" />
                </Field>
              </Section>

              <Section label="Hero Image">
                <UploadZone label="Hero Image" value={content.heroImage || ''}
                  onChange={v => set('heroImage', v)} />
              </Section>
            </div>
          )}

          {tab === 'colors' && (
            <Section label="Brand Colors">
              {[
                { key: 'primary', label: 'Primary' },
                { key: 'accent', label: 'Accent' },
                { key: 'background', label: 'Background' },
                { key: 'text', label: 'Text' },
                { key: 'success', label: 'Success' },
                { key: 'warning', label: 'Warning' },
                { key: 'jackpot', label: 'Jackpot' },
              ].map(({ key, label }) => (
                <ColorField key={key} label={label} value={colors[key] || '#888888'}
                  onChange={v => setColor(key, v)} />
              ))}
            </Section>
          )}

          {tab === 'content' && (
            <div className="space-y-3">
              <Section label="Section Visibility">
                {[
                  { key: 'showJackpot', label: 'Jackpot 🏆', desc: 'Progressive jackpot counter' },
                  { key: 'showCategories', label: 'Categories 📁', desc: 'Game category icons' },
                  { key: 'showAnnouncements', label: 'Announcements 📢', desc: 'Announcements banner' },
                  { key: 'showGameCards', label: 'Game Cards 🎮', desc: 'Featured game cards' },
                ].map(({ key, label, desc }) => (
                  <Toggle key={key} label={label} desc={desc} checked={content[key]}
                    onChange={() => set(key, !content[key])} />
                ))}
              </Section>

              <Section label="Announcements">
                <div className="flex justify-end mb-2">
                  <button onClick={addAnn} className="text-xs text-emerald-400 hover:text-emerald-300">+ Add</button>
                </div>
                {(content.announcements || []).map(ann => (
                  <div key={ann.id} className="flex items-center gap-2 mb-2">
                    <input type="text" value={ann.text} onChange={e => editAnn(ann.id, e.target.value)}
                      className="flex-1 input text-xs" />
                    <button onClick={() => delAnn(ann.id)} className="text-red-400 hover:text-red-300 text-xs px-2">✕</button>
                  </div>
                ))}
              </Section>

              <Section label="Categories">
                <div className="flex justify-end mb-2">
                  <button onClick={addCat} className="text-xs text-emerald-400 hover:text-emerald-300">+ Add</button>
                </div>
                {(content.categories || []).map(cat => (
                  <div key={cat.id} className="flex items-center gap-2 mb-2">
                    <input type="text" value={cat.name} onChange={e => editCat(cat.id, 'name', e.target.value)}
                      className="flex-1 input text-xs" placeholder="Name" />
                    <input type="text" value={cat.icon} onChange={e => editCat(cat.id, 'icon', e.target.value)}
                      className="w-12 input text-xs text-center" placeholder="🎯" />
                    <button onClick={() => delCat(cat.id)} className="text-red-400 hover:text-red-300 text-xs px-2">✕</button>
                  </div>
                ))}
              </Section>
            </div>
          )}

          {tab === 'header' && (
            <div className="space-y-3">
              <Section label="Header Background">
                <ColorField label="Bg Color" value={content.headerBg || '#0f172a'}
                  onChange={v => set('headerBg', v)} />
              </Section>

              <Section label="Header Logo">
                <UploadZone label="Header Logo" value={content.headerLogoUrl || ''}
                  onChange={v => set('headerLogoUrl', v)} />
              </Section>

              <Section label="Header Search">
                <Field label="Search Placeholder">
                  <input type="text" value={content.headerSearchPlaceholder || ''}
                    onChange={e => set('headerSearchPlaceholder', e.target.value)}
                    className="input text-sm" placeholder="Search games..." />
                </Field>
              </Section>

              <Section label="Header Buttons">
                <Toggle label="Show Login" desc="Display login button" checked={content.headerShowLogin}
                  onChange={() => set('headerShowLogin', !content.headerShowLogin)} />
                <Toggle label="Show Sign Up" desc="Display signup button" checked={content.headerShowSignup}
                  onChange={() => set('headerShowSignup', !content.headerShowSignup)} />
              </Section>
            </div>
          )}

          {tab === 'footer' && (
            <Section label="Footer / Copyright">
              <textarea value={content.footerText || ''} onChange={e => set('footerText', e.target.value)}
                className="input resize-none text-sm" rows={3} placeholder="Footer text..." />
            </Section>
          )}
        </div>

        <div className="hidden lg:flex flex-1 items-center justify-center p-6 overflow-auto bg-gradient-to-br from-slate-900 via-slate-950 to-black">
          <Preview c={content} device={device} />
        </div>
      </div>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-slate-400 uppercase">{label}</p>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-400 uppercase mb-2 block">{label}</label>
      {children}
    </div>
  )
}

function Toggle({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {desc && <p className="text-xs text-slate-500">{desc}</p>}
      </div>
      <button onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-600'}`}>
        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )
}
