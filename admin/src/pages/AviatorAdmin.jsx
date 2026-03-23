import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { 
  PlayIcon, 
  StopIcon, 
  ChartBarIcon, 
  CogIcon,
  CurrencyRupeeIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'

export default function AviatorAdmin() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [settings, setSettings] = useState({
    is_enabled: true,
    min_bet: 5,
    max_bet: 50000,
    max_crash: 50,
    house_edge: 0.04,
    wait_time_seconds: 10,
    bet_lock_time: 3,
    auto_crash_min: 1.0,
    auto_crash_max: 10.0
  })
  
  const [gameStats, setGameStats] = useState({
    totalRounds: 0,
    totalBets: 0,
    totalWagered: 0,
    totalPayouts: 0,
    houseProfit: 0,
    avgCrash: 0
  })
  
  const [recentRounds, setRecentRounds] = useState([])
  const [recentBets, setRecentBets] = useState([])
  const [manualMode, setManualMode] = useState(false)
  const [manualCrashPoint, setManualCrashPoint] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadSettings()
    loadStats()
    loadRecentRounds()
  }, [])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('game_settings')
        .select('*')
        .eq('id', 'aviator')
        .single()
      
      if (error && error.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('game_settings')
          .insert({ id: 'aviator', ...settings })
        
        if (!insertError) loadSettings()
        return
      }
      
      if (data) {
        setSettings(prev => ({ ...prev, ...data }))
      }
    } catch (err) {
      console.error('Error loading settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('game_settings')
        .upsert({ id: 'aviator', ...settings, updated_at: new Date().toISOString() })
      
      if (error) throw error
      toast.success('Settings saved successfully')
    } catch (err) {
      toast.error('Failed to save settings')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const loadStats = async () => {
    try {
      const { data: rounds } = await supabase
        .from('game_rounds')
        .select('crash_point')
        .eq('status', 'crashed')
        .order('created_at', { ascending: false })
        .limit(1000)
      
      const { data: bets } = await supabase
        .from('game_bets')
        .select('amount, won_amount, status')
        .not('round_id', 'is', null)
      
      if (rounds && rounds.length > 0) {
        const avgCrash = rounds.reduce((sum, r) => sum + parseFloat(r.crash_point), 0) / rounds.length
        setGameStats(prev => ({ ...prev, avgCrash }))
      }
      
      if (bets) {
        const totalBets = bets.length
        const totalWagered = bets.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0)
        const totalPayouts = bets.reduce((sum, b) => sum + parseFloat(b.won_amount || 0), 0)
        const houseProfit = totalWagered - totalPayouts
        
        setGameStats({
          totalRounds: rounds?.length || 0,
          totalBets,
          totalWagered,
          totalPayouts,
          houseProfit,
          avgCrash: gameStats.avgCrash
        })
      }
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  const loadRecentRounds = async () => {
    try {
      const { data } = await supabase
        .from('game_rounds')
        .select(`
          *,
          bet_count:game_bets(count)
        `)
        .order('created_at', { ascending: false })
        .limit(20)
      
      setRecentRounds(data || [])
      
      if (data && data[0]) {
        const { data: bets } = await supabase
          .from('game_bets')
          .select('*')
          .eq('round_id', data[0].round_id)
          .order('created_at', { ascending: false })
          .limit(50)
        
        setRecentBets(bets || [])
      }
    } catch (err) {
      console.error('Error loading rounds:', err)
    }
  }

  const toggleGame = async () => {
    const newState = !settings.is_enabled
    setSettings(prev => ({ ...prev, is_enabled: newState }))
    
    try {
      await supabase
        .from('game_settings')
        .upsert({ id: 'aviator', is_enabled: newState, updated_at: new Date().toISOString() })
      
      toast.success(newState ? 'Aviator game enabled' : 'Aviator game disabled (Kill Switch Active)')
    } catch (err) {
      setSettings(prev => ({ ...prev, is_enabled: !newState }))
      toast.error('Failed to toggle game')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Aviator Game Control Panel</h1>
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            settings.is_enabled 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {settings.is_enabled ? 'LIVE' : 'DISABLED'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-200 dark:border-dark-100 overflow-hidden">
            <div className="border-b border-gray-200 dark:border-dark-100">
              <nav className="flex -mb-px">
                {['overview', 'settings', 'rounds', 'bets'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                      <ChartBarIcon className="w-6 h-6 mb-2 opacity-80" />
                      <p className="text-2xl font-bold">{gameStats.totalRounds}</p>
                      <p className="text-xs opacity-80">Total Rounds</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
                      <CurrencyRupeeIcon className="w-6 h-6 mb-2 opacity-80" />
                      <p className="text-2xl font-bold">₹{gameStats.totalWagered.toLocaleString()}</p>
                      <p className="text-xs opacity-80">Total Wagered</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
                      <ArrowTrendingUpIcon className="w-6 h-6 mb-2 opacity-80" />
                      <p className="text-2xl font-bold">₹{gameStats.totalPayouts.toLocaleString()}</p>
                      <p className="text-xs opacity-80">Total Payouts</p>
                    </div>
                    <div className={`rounded-xl p-4 ${gameStats.houseProfit >= 0 ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-red-500 to-red-600'} text-white`}>
                      <ShieldCheckIcon className="w-6 h-6 mb-2 opacity-80" />
                      <p className="text-2xl font-bold">₹{gameStats.houseProfit.toLocaleString()}</p>
                      <p className="text-xs opacity-80">House {gameStats.houseProfit >= 0 ? 'Profit' : 'Loss'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 dark:bg-dark-300 rounded-xl p-4">
                      <p className="text-gray-500 text-xs mb-1">Avg Crash Point</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{gameStats.avgCrash.toFixed(2)}x</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-300 rounded-xl p-4">
                      <p className="text-gray-500 text-xs mb-1">Total Bets</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{gameStats.totalBets}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-300 rounded-xl p-4">
                      <p className="text-gray-500 text-xs mb-1">Min Bet</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">₹{settings.min_bet}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-dark-300 rounded-xl p-4">
                      <p className="text-gray-500 text-xs mb-1">House Edge</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{(settings.house_edge * 100).toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-amber-800 dark:text-amber-200">Risk Management</h4>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                          Monitor the house profit closely. If running at a loss, consider adjusting the crash point distribution or house edge.
                          Current theoretical house edge: {(settings.house_edge * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-300 rounded-xl">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Kill Switch</h4>
                      <p className="text-sm text-gray-500">Enable/disable the entire Aviator game</p>
                    </div>
                    <button
                      onClick={toggleGame}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                        settings.is_enabled ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    >
                      <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        settings.is_enabled ? 'translate-x-7' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Minimum Bet (₹)
                      </label>
                      <input
                        type="number"
                        value={settings.min_bet}
                        onChange={(e) => setSettings(prev => ({ ...prev, min_bet: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-100 rounded-lg bg-white dark:bg-dark-300 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Maximum Bet (₹)
                      </label>
                      <input
                        type="number"
                        value={settings.max_bet}
                        onChange={(e) => setSettings(prev => ({ ...prev, max_bet: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-100 rounded-lg bg-white dark:bg-dark-300 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Max Crash Point (x)
                      </label>
                      <input
                        type="number"
                        value={settings.max_crash}
                        onChange={(e) => setSettings(prev => ({ ...prev, max_crash: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-100 rounded-lg bg-white dark:bg-dark-300 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        House Edge (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={(settings.house_edge * 100).toFixed(1)}
                        onChange={(e) => setSettings(prev => ({ ...prev, house_edge: parseFloat(e.target.value) / 100 || 0 }))}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-100 rounded-lg bg-white dark:bg-dark-300 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Wait Time (seconds)
                      </label>
                      <input
                        type="number"
                        value={settings.wait_time_seconds}
                        onChange={(e) => setSettings(prev => ({ ...prev, wait_time_seconds: parseInt(e.target.value) || 0 }))}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-100 rounded-lg bg-white dark:bg-dark-300 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Bet Lock Time (seconds before crash)
                      </label>
                      <input
                        type="number"
                        value={settings.bet_lock_time}
                        onChange={(e) => setSettings(prev => ({ ...prev, bet_lock_time: parseInt(e.target.value) || 0 }))}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-dark-100 rounded-lg bg-white dark:bg-dark-300 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-dark-100 pt-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">Crash Point Distribution</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Min Auto Crash Point (x)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={settings.auto_crash_min}
                          onChange={(e) => setSettings(prev => ({ ...prev, auto_crash_min: parseFloat(e.target.value) || 1 }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-dark-100 rounded-lg bg-white dark:bg-dark-300 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Minimum crash point that can occur</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Max Auto Crash Point (x)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={settings.auto_crash_max}
                          onChange={(e) => setSettings(prev => ({ ...prev, auto_crash_max: parseFloat(e.target.value) || 10 }))}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-dark-100 rounded-lg bg-white dark:bg-dark-300 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Maximum crash point before forced crash</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={saveSettings}
                      disabled={saving}
                      className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'rounds' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-white">Recent Rounds</h4>
                    <button
                      onClick={loadRecentRounds}
                      className="text-sm text-primary-500 hover:text-primary-600"
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 uppercase">
                          <th className="pb-3">Round ID</th>
                          <th className="pb-3">Crash Point</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3">Bets</th>
                          <th className="pb-3">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-dark-100">
                        {recentRounds.map((round) => (
                          <tr key={round.id} className="text-sm">
                            <td className="py-3 text-gray-900 dark:text-white font-mono text-xs">
                              {round.round_id?.slice(0, 12)}...
                            </td>
                            <td className="py-3">
                              <span className={`font-bold ${
                                parseFloat(round.crash_point) >= 10 
                                  ? 'text-red-500' 
                                  : parseFloat(round.crash_point) >= 2 
                                    ? 'text-emerald-500' 
                                    : 'text-gray-500'
                              }`}>
                                {parseFloat(round.crash_point).toFixed(2)}x
                              </span>
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                round.status === 'crashed' 
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : round.status === 'running'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                              }`}>
                                {round.status}
                              </span>
                            </td>
                            <td className="py-3 text-gray-500">
                              {round.bet_count?.[0]?.count || 0}
                            </td>
                            <td className="py-3 text-gray-500 text-xs">
                              {new Date(round.created_at).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))}
                        {recentRounds.length === 0 && (
                          <tr>
                            <td colSpan="5" className="py-8 text-center text-gray-500">
                              No rounds found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'bets' && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">Recent Bets</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 uppercase">
                          <th className="pb-3">User</th>
                          <th className="pb-3">Amount</th>
                          <th className="pb-3">Auto Cashout</th>
                          <th className="pb-3">Cashout</th>
                          <th className="pb-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-dark-100">
                        {recentBets.map((bet) => (
                          <tr key={bet.id} className="text-sm">
                            <td className="py-3 text-gray-900 dark:text-white">
                              {bet.username || 'Bot'}
                            </td>
                            <td className="py-3 text-gray-900 dark:text-white font-medium">
                              ₹{parseFloat(bet.amount).toFixed(0)}
                            </td>
                            <td className="py-3 text-gray-500">
                              {bet.auto_cashout_at ? `${parseFloat(bet.auto_cashout_at).toFixed(2)}x` : '-'}
                            </td>
                            <td className="py-3">
                              {bet.cashout_at ? (
                                <span className="text-emerald-500 font-medium">
                                  {parseFloat(bet.cashout_at).toFixed(2)}x
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                bet.status === 'cashed_out' 
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : bet.status === 'lost' || bet.status === 'crashed'
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                              }`}>
                                {bet.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {recentBets.length === 0 && (
                          <tr>
                            <td colSpan="5" className="py-8 text-center text-gray-500">
                              No bets found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-200 dark:border-dark-100 p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={toggleGame}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  settings.is_enabled
                    ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                }`}
              >
                {settings.is_enabled ? (
                  <>
                    <StopIcon className="w-5 h-5" />
                    Emergency Stop (Kill Switch)
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-5 h-5" />
                    Enable Game
                  </>
                )}
              </button>
              
              <div className={`p-4 rounded-lg border-2 border-dashed ${
                settings.is_enabled 
                  ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
                  : 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {settings.is_enabled ? (
                    <PlayIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <StopIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                  )}
                  <span className={`font-bold ${
                    settings.is_enabled ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                  }`}>
                    Game Status: {settings.is_enabled ? 'LIVE' : 'DISABLED'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {settings.is_enabled 
                    ? 'Game is accepting bets and running normally.'
                    : 'Game is stopped. No new bets will be accepted.'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-200 dark:border-dark-100 p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">House Edge Info</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Current House Edge</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(settings.house_edge * 100).toFixed(2)}%
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Theoretical RTP</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {((1 - settings.house_edge) * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Min Bet</span>
                  <span className="font-medium text-gray-900 dark:text-white">₹{settings.min_bet}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Max Bet</span>
                  <span className="font-medium text-gray-900 dark:text-white">₹{settings.max_bet.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Wait Time</span>
                  <span className="font-medium text-gray-900 dark:text-white">{settings.wait_time_seconds}s</span>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100 dark:border-dark-100">
                <p className="text-xs text-gray-500">
                  House edge is the mathematical advantage the house has on each bet. 
                  A 4% house edge means for every ₹100 wagered, the house expects to make ₹4 on average.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-200 dark:border-dark-100 p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Crash Distribution</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">1.00x - 1.50x</span>
                <span className="font-medium">40%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">1.50x - 2.50x</span>
                <span className="font-medium">25%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">2.50x - 4.50x</span>
                <span className="font-medium">15%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">4.50x - 10.00x</span>
                <span className="font-medium">12%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">10.00x - 25.00x</span>
                <span className="font-medium">6%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">25.00x+</span>
                <span className="font-medium">2%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
