import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabaseAnon } from '../../lib/supabase'
import { ChevronLeftIcon, TrophyIcon } from '@heroicons/react/24/outline'

export default function BetHistoryPage() {
  const navigate = useNavigate()
  const { user, isLoggedIn } = useAuth()
  const [bets, setBets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return }
    fetchBets()
  }, [isLoggedIn])

  const fetchBets = async () => {
    setLoading(true)
    const allBets = []

    // 1. Fetch from aviator_bets (new table)
    try {
      const res = await Promise.race([
        supabaseAnon.from('aviator_bets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ])
      if (res?.data) {
        res.data.forEach(b => {
          allBets.push({
            source: 'Aviator', amount: Number(b.amount), multiplier: b.cashout_multiplier,
            payout: b.status === 'won' ? Number(b.win_amount) : 0,
            profit: b.status === 'won' ? (Number(b.win_amount) - Number(b.amount)) : -Number(b.amount),
            status: b.status, created_at: b.created_at,
          })
        })
      }
    } catch (e) { console.warn('[BetHistory] aviator_bets:', e?.message) }

    // 2. Fetch from game_bets
    try {
      const res = await Promise.race([
        supabaseAnon.from('game_bets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ])
      if (res?.data) {
        res.data.forEach(b => {
          allBets.push({
            source: 'Aviator', amount: b.amount, multiplier: b.cashout_at,
            payout: b.status === 'won' ? (b.cashout_amount || 0) : 0,
            profit: b.status === 'won' ? ((b.cashout_amount || 0) - b.amount) : -b.amount,
            status: b.status, created_at: b.created_at,
          })
        })
      }
    } catch (e) { console.warn('[BetHistory] game_bets:', e?.message) }

    // 3. Fetch from transactions
    try {
      const res = await Promise.race([
        supabaseAnon.from('transactions').select('*').eq('user_id', user.id).eq('type', 'bet').order('created_at', { ascending: false }).limit(500),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ])
      if (res?.data) {
        res.data.forEach(b => {
          const amt = Math.abs(Number(b.amount))
          allBets.push({
            source: 'Casino', amount: amt, multiplier: null,
            payout: Number(b.amount) < 0 ? amt : 0,
            profit: Number(b.amount) < 0 ? -amt : amt,
            status: Number(b.amount) < 0 ? 'lost' : 'won',
            created_at: b.created_at,
          })
        })
      }
    } catch (e) { console.warn('[BetHistory] transactions:', e?.message) }

    // 4. LocalStorage bets
    try {
      const stored = JSON.parse(localStorage.getItem('aviator_my_bets') || '[]')
      stored.filter(b => !b.pending).forEach(b => {
        allBets.push({
          source: 'Aviator', amount: b.amount, multiplier: b.mult,
          payout: b.won ? b.profit : 0,
          profit: b.won ? b.profit : -b.amount,
          status: b.won ? 'won' : 'lost',
          created_at: new Date().toISOString(),
        })
      })
    } catch {}

    allBets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    setBets(allBets)
    setLoading(false)
  }

  const filtered = filter === 'all' ? bets : bets.filter(b => b.status === filter)
  const totalWagered = bets.reduce((s, b) => s + (b.amount || 0), 0)
  const totalWon = bets.filter(b => b.status === 'won').reduce((s, b) => s + (b.payout || 0), 0)
  const totalLost = bets.filter(b => b.status === 'lost').reduce((s, b) => s + (b.amount || 0), 0)
  const netProfit = totalWon - totalLost

  return (
    <div className="pt-16 pb-24 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate('/profile')} className="p-2 rounded-xl bg-dark-300/50 border border-dark-100">
            <ChevronLeftIcon className="w-5 h-5 text-gray-400" />
          </button>
          <h1 className="text-lg font-bold text-white">Bet History</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-dark-300/50 border border-dark-100 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Wagered</p>
            <p className="text-sm font-bold text-white">₨{totalWagered.toLocaleString()}</p>
          </div>
          <div className="bg-dark-300/50 border border-dark-100 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Won</p>
            <p className="text-sm font-bold text-emerald-400">{bets.filter(b => b.status === 'won').length}</p>
          </div>
          <div className="bg-dark-300/50 border border-dark-100 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Lost</p>
            <p className="text-sm font-bold text-red-400">{bets.filter(b => b.status === 'lost').length}</p>
          </div>
          <div className="bg-dark-300/50 border border-dark-100 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">Net</p>
            <p className={`text-sm font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {netProfit >= 0 ? '+' : ''}₨{netProfit.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          {['all', 'won', 'lost'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                filter === f
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-300/50 border border-dark-100 text-gray-400'
              }`}>
              {f}
            </button>
          ))}
        </div>

        {/* Bet List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <TrophyIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No bets yet</p>
            <p className="text-sm mt-1">Place your first bet to see it here</p>
            <button onClick={() => navigate('/play/aviator')}
              className="mt-4 px-6 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium">
              Play Aviator
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((b, i) => (
              <div key={`bet-${i}`} className="bg-dark-300/50 border border-dark-100 rounded-xl p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                        b.status === 'won' ? 'bg-emerald-400' : b.status === 'lost' ? 'bg-red-400' : 'bg-yellow-400'
                      }`} />
                      <span className="text-sm font-medium text-gray-300">{b.source}</span>
                      {b.multiplier && (
                        <span className="text-xs font-bold text-yellow-400">@{Number(b.multiplier).toFixed(2)}x</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' '}
                      {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="mb-1">
                      {b.status === 'won' ? (
                        <span className="text-base font-bold text-emerald-400">+₨{Number(b.payout).toLocaleString()}</span>
                      ) : b.status === 'lost' ? (
                        <span className="text-base font-bold text-red-400">-₨{Number(b.amount).toLocaleString()}</span>
                      ) : (
                        <span className="text-base font-bold text-yellow-400">₨{Number(b.amount).toLocaleString()}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">Bet: ₨{Number(b.amount).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
