import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GiftIcon, CurrencyRupeeIcon, UsersIcon, DocumentDuplicateIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'

export default function ReferralsPage() {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    referralBonus: 50,
    referralBonusType: 'fixed',
    depositRequirement: 100,
    maxReferrals: 100,
    minWithdrawable: 100,
    welcomeBonus: 500,
    firstDepositBonusEnabled: true,
    firstDepositBonus: 10,
    maxFirstDepositBonus: 1000,
    reloadBonusEnabled: false,
    reloadBonus: 5,
    weeklyCashbackEnabled: true,
    weeklyCashback: 5,
    cashbackMinBet: 1000
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('key', 'referral_settings')
        .single()
      
      if (data?.value) {
        setSettings(prev => ({ ...prev, ...data.value }))
      }
    } catch (err) {
      console.error('Error loading settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await supabase
        .from('platform_settings')
        .upsert({
          key: 'referral_settings',
          value: settings,
          updated_at: new Date().toISOString()
        })
      
      toast.success('Referral & Bonus settings saved successfully!')
    } catch (err) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const referralStats = [
    { name: 'Total Referrals', value: '1,284', change: '+12%', icon: UsersIcon, color: 'blue' },
    { name: 'Active Users', value: '847', change: '+8%', icon: UsersIcon, color: 'green' },
    { name: 'Referral Earnings', value: '₹4,52,180', change: '+15%', icon: CurrencyRupeeIcon, color: 'yellow' },
    { name: 'Bonus Distributed', value: '₹2,18,500', change: '+10%', icon: GiftIcon, color: 'purple' },
  ]

  const recentReferrals = [
    { id: 1, user: 'User***847', referred: 'User***123', bonus: '₹50', date: '2024-03-21', status: 'completed' },
    { id: 2, user: 'User***456', referred: 'User***789', bonus: '₹50', date: '2024-03-20', status: 'completed' },
    { id: 3, user: 'User***321', referred: 'User***654', bonus: '₹100', date: '2024-03-19', status: 'completed' },
    { id: 4, user: 'User***999', referred: 'User***111', bonus: '₹0', date: '2024-03-18', status: 'pending' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Referrals & Bonuses</h1>
          <p className="text-admin-muted">Manage referral programs and user bonuses</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 font-medium"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {referralStats.map((stat, i) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-admin-card rounded-xl border border-admin-border p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-admin-muted">{stat.name}</span>
              <div className={`w-10 h-10 rounded-lg bg-${stat.color}-500/20 flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <div className="flex items-center gap-1 mt-1">
              <ArrowTrendingUpIcon className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm">{stat.change}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-admin-card rounded-xl border border-admin-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <UsersIcon className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Referral Settings</h2>
                <p className="text-sm text-admin-muted">Configure how referrers earn rewards</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-admin-text mb-2">Referral Bonus</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={settings.referralBonus}
                    onChange={(e) => setSettings({ ...settings, referralBonus: parseFloat(e.target.value) || 0 })}
                    className="input-field flex-1"
                  />
                  <select
                    value={settings.referralBonusType}
                    onChange={(e) => setSettings({ ...settings, referralBonusType: e.target.value })}
                    className="input-field w-32"
                  >
                    <option value="fixed">Fixed (₹)</option>
                    <option value="percentage">Percent (%)</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-admin-text mb-2">Min Deposit to Qualify</label>
                <input
                  type="number"
                  value={settings.depositRequirement}
                  onChange={(e) => setSettings({ ...settings, depositRequirement: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-admin-text mb-2">Max Referrals per User</label>
                <input
                  type="number"
                  value={settings.maxReferrals}
                  onChange={(e) => setSettings({ ...settings, maxReferrals: parseInt(e.target.value) || 0 })}
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-admin-text mb-2">Min Withdrawable Amount</label>
                <input
                  type="number"
                  value={settings.minWithdrawable}
                  onChange={(e) => setSettings({ ...settings, minWithdrawable: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          <div className="bg-admin-card rounded-xl border border-admin-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <GiftIcon className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Bonus Settings</h2>
                <p className="text-sm text-admin-muted">Configure user bonus programs</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-admin-sidebar rounded-lg">
                <div>
                  <p className="text-sm font-medium text-admin-text">Welcome Bonus</p>
                  <p className="text-xs text-admin-muted">Bonus for new user registration</p>
                </div>
                <input
                  type="number"
                  value={settings.welcomeBonus}
                  onChange={(e) => setSettings({ ...settings, welcomeBonus: parseFloat(e.target.value) || 0 })}
                  className="input-field w-32 text-right"
                />
              </div>
              
              <div className="p-4 bg-admin-sidebar rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-admin-text">First Deposit Bonus</p>
                    <p className="text-xs text-admin-muted">Bonus on first deposit</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.firstDepositBonusEnabled}
                      onChange={(e) => setSettings({ ...settings, firstDepositBonusEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-admin-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>
                {settings.firstDepositBonusEnabled && (
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <input
                        type="number"
                        value={settings.firstDepositBonus}
                        onChange={(e) => setSettings({ ...settings, firstDepositBonus: parseFloat(e.target.value) || 0 })}
                        className="input-field w-full"
                        placeholder="Percentage"
                      />
                      <p className="text-xs text-admin-muted mt-1">% of deposit</p>
                    </div>
                    <span className="text-admin-muted">max</span>
                    <div className="w-32">
                      <input
                        type="number"
                        value={settings.maxFirstDepositBonus}
                        onChange={(e) => setSettings({ ...settings, maxFirstDepositBonus: parseFloat(e.target.value) || 0 })}
                        className="input-field w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-admin-sidebar rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-admin-text">Reload Bonus</p>
                    <p className="text-xs text-admin-muted">Bonus on subsequent deposits</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.reloadBonusEnabled}
                      onChange={(e) => setSettings({ ...settings, reloadBonusEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-admin-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>
                {settings.reloadBonusEnabled && (
                  <div>
                    <input
                      type="number"
                      value={settings.reloadBonus}
                      onChange={(e) => setSettings({ ...settings, reloadBonus: parseFloat(e.target.value) || 0 })}
                      className="input-field w-32"
                      placeholder="Percentage"
                    />
                    <p className="text-xs text-admin-muted mt-1">% of each deposit</p>
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-admin-sidebar rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-admin-text">Weekly Cashback</p>
                    <p className="text-xs text-admin-muted">Losses returned as cashback</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.weeklyCashbackEnabled}
                      onChange={(e) => setSettings({ ...settings, weeklyCashbackEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-admin-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>
                {settings.weeklyCashbackEnabled && (
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={settings.weeklyCashback}
                      onChange={(e) => setSettings({ ...settings, weeklyCashback: parseFloat(e.target.value) || 0 })}
                      className="input-field w-32"
                      placeholder="Percentage"
                    />
                    <span className="text-admin-muted">% of losses (min bet</span>
                    <input
                      type="number"
                      value={settings.cashbackMinBet}
                      onChange={(e) => setSettings({ ...settings, cashbackMinBet: parseFloat(e.target.value) || 0 })}
                      className="input-field w-32"
                    />
                    <span className="text-admin-muted">)</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-admin-card rounded-xl border border-admin-border p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Your Referral Link</h3>
            <div className="p-4 bg-admin-sidebar rounded-lg">
              <p className="text-xs text-admin-muted mb-2">Admin Referral Link</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value="https://399bet.com/ref/admin"
                  className="flex-1 bg-admin-border text-white text-sm px-3 py-2 rounded-lg"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('https://399bet.com/ref/admin')
                    toast.success('Referral link copied!')
                  }}
                  className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  <DocumentDuplicateIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-admin-card rounded-xl border border-admin-border p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Referrals</h3>
            <div className="space-y-3">
              {recentReferrals.map((ref) => (
                <div key={ref.id} className="flex items-center justify-between p-3 bg-admin-sidebar rounded-lg">
                  <div>
                    <p className="text-sm text-white">{ref.user}</p>
                    <p className="text-xs text-admin-muted">→ {ref.referred}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${ref.bonus === '₹0' ? 'text-admin-muted' : 'text-green-400'}`}>
                      {ref.bonus}
                    </p>
                    <p className="text-xs text-admin-muted">{ref.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
