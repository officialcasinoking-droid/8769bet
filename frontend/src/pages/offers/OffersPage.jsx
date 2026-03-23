import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SparklesIcon, ClockIcon, CheckCircleIcon, LockClosedIcon, TrophyIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'

const TABS = ['Event', 'Mission', 'VIP', 'Rebate', 'Unclaimed']
const SIDEBAR_OPTIONS = ['All', 'History']

const HOUR = 3600000
const DAY = 24 * HOUR
const WEEK = 7 * DAY

function getClaimKey(userId) {
  return `8769bet_claims_${userId || 'guest'}`
}

function loadClaims(userId) {
  try {
    const stored = localStorage.getItem(getClaimKey(userId))
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function saveClaim(userId, key, timestamp) {
  const claims = loadClaims(userId)
  claims[key] = timestamp
  localStorage.setItem(getClaimKey(userId), JSON.stringify(claims))
}

function isClaimed(userId, key, cooldownMs) {
  const claims = loadClaims(userId)
  if (!claims[key]) return { claimed: false, canClaim: true, remaining: 0 }
  
  const elapsed = Date.now() - claims[key]
  if (elapsed >= cooldownMs) return { claimed: false, canClaim: true, remaining: 0 }
  
  return { claimed: true, canClaim: false, remaining: cooldownMs - elapsed }
}

function formatCooldown(ms) {
  if (ms <= 0) return 'Ready'
  const hours = Math.floor(ms / HOUR)
  const mins = Math.floor((ms % HOUR) / 60000)
  const secs = Math.floor((ms % 60000) / 1000)
  if (hours > 0) return `${hours}h ${mins}m`
  if (mins > 0) return `${mins}m ${secs}s`
  return `${secs}s`
}

function getWeekResetTime() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  const nextMonday = new Date(now)
  nextMonday.setDate(now.getDate() + daysUntilMonday)
  nextMonday.setHours(0, 0, 0, 0)
  return nextMonday.getTime() - now.getTime()
}

export default function OffersPage() {
  const { user, isLoggedIn, addToBalance, formatBalance, currency, currencies, changeCurrency } = useAuth()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('Event')
  const [activeSidebar, setActiveSidebar] = useState('All')
  const [spinOpen, setSpinOpen] = useState(false)
  const [spinClaim, setSpinClaim] = useState({ claimed: false, canClaim: true, remaining: 0 })
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!user?.id) return
    setSpinClaim(isClaimed(user.id, 'daily_spin', DAY))
  }, [user?.id, now])

  return (
    <div className="pt-16 pb-24 min-h-screen" style={{ background: 'linear-gradient(180deg, #006400 0%, #001a00 100%)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="sticky top-16 z-40 bg-gradient-to-b from-green-900 to-green-800/95 backdrop-blur-lg border-b border-yellow-500/20">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex-1"></div>
              <h1 className="text-xl font-bold text-yellow-400">Rewards</h1>
              <div className="flex-1"></div>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex overflow-x-auto px-2 pb-2 gap-1 scrollbar-hide">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab
                    ? 'bg-yellow-400 text-green-900'
                    : 'bg-green-700/50 text-yellow-400 border border-yellow-500/30'
                }`}
              >
                {tab}
                {tab === 'Event' && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">1</span>}
                {tab === 'Unclaimed' && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">2</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-3 py-4">
          {/* Sidebar */}
          <div className="flex gap-2 mb-4">
            {SIDEBAR_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setActiveSidebar(opt)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeSidebar === opt
                    ? opt === 'All'
                      ? 'bg-yellow-400 text-green-900'
                      : 'bg-green-700/50 text-yellow-400 border border-yellow-500/30'
                    : 'bg-green-800/40 text-yellow-300/70 border border-green-700/30'
                }`}
              >
                {opt === 'All' && <SparklesIcon className="w-4 h-4" />}
                {opt === 'History' && <ClockIcon className="w-4 h-4" />}
                {opt}
              </button>
            ))}
          </div>

          {/* Sidebar Content */}
          <AnimatePresence mode="wait">
            {activeSidebar === 'All' && (
              <motion.div key="all" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {activeTab === 'Event' && <EventTab user={user} onSpinOpen={() => setSpinOpen(true)} spinClaim={spinClaim} now={now} setNow={setNow} />}
                {activeTab === 'Mission' && <MissionTab user={user} addToBalance={addToBalance} formatBalance={formatBalance} now={now} setNow={setNow} />}
                {activeTab === 'VIP' && <VIPTab user={user} addToBalance={addToBalance} formatBalance={formatBalance} now={now} setNow={setNow} />}
                {activeTab === 'Rebate' && <RebateTab user={user} addToBalance={addToBalance} formatBalance={formatBalance} now={now} setNow={setNow} />}
                {activeTab === 'Unclaimed' && <UnclaimedTab user={user} addToBalance={addToBalance} formatBalance={formatBalance} now={now} setNow={setNow} />}
              </motion.div>
            )}
            {activeSidebar === 'History' && (
              <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <HistoryTab />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {spinOpen && <SpinModal user={user} addToBalance={addToBalance} formatBalance={formatBalance} onClose={() => setSpinOpen(false)} onSpun={() => { setSpinClaim({ claimed: true, canClaim: false, remaining: DAY }); setNow(Date.now()) }} />}
    </div>
  )
}

function EventTab({ user, onSpinOpen, spinClaim, now }) {
  const dailyVolume = user?.stats?.weekly_bet_volume || 0
  const minVolumeRequired = 10000
  const volumeProgress = Math.min((dailyVolume / minVolumeRequired) * 100, 100)
  const volumeUnlocked = dailyVolume >= minVolumeRequired

  return (
    <div className="space-y-4">
      {/* Lucky Turntable */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl overflow-hidden border-2 border-yellow-500/40 shadow-lg shadow-yellow-500/20" style={{ background: 'linear-gradient(135deg, #1a0a00 0%, #2d1810 50%, #1a0a00 100%)' }}>
        <div className="bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-yellow-300">Lucky Turntable</h2>
              <p className="text-xs text-yellow-200/80">High stakes daily spin</p>
            </div>
            <div className="text-3xl">🎡</div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-24 h-24 rounded-full border-4 border-yellow-500 shadow-lg flex items-center justify-center relative" style={{ background: 'conic-gradient(red 0deg 45deg, yellow 45deg 90deg, green 90deg 135deg, blue 135deg 180deg, purple 180deg 225deg, red 225deg 270deg, yellow 270deg 315deg, green 315deg 360deg)' }}>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-900 to-red-900 flex items-center justify-center">
                {spinClaim.claimed || !volumeUnlocked ? <span className="text-2xl">🔒</span> : <span className="text-2xl">👑</span>}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-yellow-300 mb-2">Win Rs 1 - 10 per spin</p>
              <p className="text-xs text-yellow-200/60">1 free spin daily</p>
              {!volumeUnlocked && (
                <div className="mt-2 p-2 rounded-lg bg-red-900/40 border border-red-500/30">
                  <p className="text-xs text-red-300">Volume Required: Rs {minVolumeRequired.toLocaleString()}</p>
                  <div className="h-1.5 bg-red-900/50 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${volumeProgress}%` }} />
                  </div>
                  <p className="text-[10px] text-red-300/70 mt-1">Current: Rs {dailyVolume.toLocaleString()} / Rs {minVolumeRequired.toLocaleString()}</p>
                </div>
              )}
              {volumeUnlocked && !spinClaim.claimed && (
                <p className="text-xs text-emerald-400 mt-2">Unlocked! Spin available</p>
              )}
              {spinClaim.claimed && (
                <p className="text-xs text-gray-400 mt-2">Next spin: {formatCooldown(spinClaim.remaining)}</p>
              )}
            </div>
          </div>
          {!volumeUnlocked ? (
            <button disabled className="w-full py-3 rounded-xl bg-gray-600 text-gray-400 font-bold shadow-lg flex items-center justify-center gap-2">
              <LockClosedIcon className="w-5 h-5" /> Volume Required
            </button>
          ) : spinClaim.claimed ? (
            <button disabled className="w-full py-3 rounded-xl bg-gray-700 text-gray-400 font-bold flex items-center justify-center gap-2">
              <ClockIcon className="w-5 h-5" /> {formatCooldown(spinClaim.remaining)}
            </button>
          ) : (
            <button onClick={onSpinOpen} className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-green-900 font-bold shadow-lg shadow-yellow-500/40">
              🎰 Spin Now
            </button>
          )}
        </div>
      </motion.div>

      {/* VIP Banner */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl overflow-hidden border border-yellow-400/40 shadow-lg" style={{ background: 'linear-gradient(135deg, #1a1000 0%, #2d2010 100%)' }}>
        <div className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 py-2 px-4">
          <h2 className="text-lg font-bold text-green-900">👑 VIP Member Privileges</h2>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-xs text-yellow-300">Promotion</p>
              <p className="text-sm font-bold text-yellow-400">Rs 10</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-xs text-yellow-300">Weekly</p>
              <p className="text-sm font-bold text-yellow-400">Rs 5-10</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-xs text-yellow-300">Monthly</p>
              <p className="text-sm font-bold text-yellow-400">Rs 10</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-green-900/40 border border-green-500/30">
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-300">Your VIP Level</span>
              <span className="text-lg font-bold text-yellow-400">VIP 1</span>
            </div>
            <div className="h-2 bg-green-900/50 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full" style={{ width: '25%' }} />
            </div>
            <p className="text-xs text-green-300/70 mt-1">Rs 25,000 more to VIP 2</p>
          </div>
        </div>
      </motion.div>

      {/* Daily Aviator Bonus - Requires Rs 100,000 volume */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-2xl overflow-hidden border border-orange-500/30 shadow-lg" style={{ background: 'linear-gradient(135deg, #1a0a00 0%, #281500 100%)' }}>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">🚀</span>
            <div>
              <h2 className="text-lg font-bold text-yellow-400">Aviator Elite Bonus</h2>
              <p className="text-xs text-yellow-200/70">0.005% of daily Aviator losses (Max Rs 50)</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-orange-900/30 border border-orange-500/30 mb-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-orange-300">Daily Aviator Volume</span>
              <span className="text-sm font-bold text-yellow-400">Rs {(dailyVolume || 0).toLocaleString()} / Rs 100,000</span>
            </div>
            <div className="h-2 bg-orange-900/50 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full" style={{ width: `${Math.min((dailyVolume / 100000) * 100, 100)}%` }} />
            </div>
            <p className="text-xs text-orange-300/70 mt-1">Must bet Rs 100,000 on Aviator to unlock</p>
          </div>
          <div className="text-center py-2 text-xs text-gray-400">
            Reward calculated from actual losses only
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function MissionTab({ user, addToBalance, formatBalance, now }) {
  const toast = useToast()
  const userId = user?.id

  const dailyProgress = useMemo(() => {
    if (!userId) return { bets: 0, volume: 0, losses: 0 }
    return {
      bets: user?.stats?.daily_bets || 0,
      volume: user?.stats?.daily_volume || 0,
      losses: user?.stats?.daily_losses || 0
    }
  }, [userId, user?.stats])

  const weeklyProgress = useMemo(() => {
    if (!userId) return { bets: 0, volume: 0, referrals: 0 }
    return {
      bets: user?.stats?.weekly_bets || 0,
      volume: user?.stats?.weekly_volume || 0,
      referrals: user?.stats?.referral_count || 0
    }
  }, [userId, user?.stats])

  const weeklyClaim = isClaimed(userId, 'weekly_mission_bet', WEEK)
  const weeklyReferralClaim = isClaimed(userId, 'weekly_mission_referral', WEEK)
  const resetTime = getWeekResetTime()

  const dailyMissions = [
    { id: 'dm_bets', title: 'Place 200 Bets', desc: 'Daily', reward: 5, progress: dailyProgress.bets, target: 200, icon: '🎮', cooldown: DAY, key: 'daily_mission_bets' },
    { id: 'dm_volume', title: 'Bet Rs 100,000 Total', desc: 'Daily', reward: 10, progress: dailyProgress.volume, target: 100000, icon: '💰', cooldown: DAY, key: 'daily_mission_volume' },
    { id: 'dm_losses', title: 'Rs 5,000 Aviator Losses', desc: 'Daily', reward: 8, progress: dailyProgress.losses, target: 5000, icon: '📉', cooldown: DAY, key: 'daily_mission_losses' },
  ]

  const weeklyMissions = [
    { id: 'wm_bets', title: 'Place 1,500 Bets', desc: 'Weekly', reward: 50, progress: weeklyProgress.bets, target: 1500, icon: '📊', cooldown: WEEK, key: 'weekly_mission_bet' },
    { id: 'wm_volume', title: 'Bet Rs 500,000 Total', desc: 'Weekly', reward: 75, progress: weeklyProgress.volume, target: 500000, icon: '💎', cooldown: WEEK, key: 'weekly_mission_volume' },
  ]

  const claimMission = async (mission) => {
    if (!userId) {
      toast.error('Please login to claim rewards', 3000)
      return
    }
    
    const status = isClaimed(userId, mission.key, mission.cooldown)
    if (status.claimed) {
      toast.warning('Already claimed!', 2000)
      return
    }
    
    if (mission.progress < mission.target) {
      toast.error(`Need Rs ${(mission.target - mission.progress).toLocaleString()} more to complete`, 3000)
      return
    }

    const success = await addToBalance(mission.reward, `Mission: ${mission.title}`)
    if (success) {
      saveClaim(userId, mission.key, Date.now())
      toast.success(`Claimed ${formatBalance(mission.reward)}!`, 3000)
      setNow(Date.now())
    }
  }

  const claimWeeklyReferral = async () => {
    if (!userId) {
      toast.error('Please login to claim', 3000)
      return
    }

    if (weeklyProgress.referrals < 3) {
      toast.error(`Need ${3 - weeklyProgress.referrals} more referrals`, 3000)
      return
    }

    if (weeklyReferralClaim.claimed) {
      toast.warning('Already claimed this week!', 2000)
      return
    }

    const success = await addToBalance(30, 'Weekly Referral Mission: 3 Friends')
    if (success) {
      saveClaim(userId, 'weekly_mission_referral', Date.now())
      toast.success(`Claimed Rs 30 referral bonus!`, 3000)
      setNow(Date.now())
    }
  }

  const renderMission = (mission) => {
    const status = isClaimed(userId, mission.key, mission.cooldown)
    const pct = Math.min((mission.progress / mission.target) * 100, 100)
    const complete = mission.progress >= mission.target

    return (
      <div key={mission.id} className="rounded-xl overflow-hidden border border-green-700/30" style={{ background: 'linear-gradient(135deg, #0a1a0a 0%, #102010 100%)' }}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-2xl">{mission.icon}</div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-white">{mission.title}</h3>
                  <p className="text-xs text-gray-400">{mission.desc}</p>
                </div>
                <span className="text-sm font-bold text-yellow-400">+Rs {mission.reward}</span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Rs {mission.progress.toLocaleString()} / Rs {mission.target.toLocaleString()}</span>
                  <span>{Math.round(pct)}%</span>
                </div>
                <div className="h-2 bg-green-900/30 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${status.claimed ? 'bg-gray-500' : complete ? 'bg-emerald-500' : 'bg-yellow-500'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          </div>
          {complete && !status.claimed && (
            <button onClick={() => claimMission(mission)} className="w-full mt-3 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm">
              Claim Rs {mission.reward}
            </button>
          )}
          {status.claimed && (
            <div className="w-full mt-3 py-2.5 rounded-lg bg-gray-700/50 text-gray-400 font-semibold text-sm flex items-center justify-center gap-2">
              <CheckCircleIcon className="w-4 h-4" /> Claimed • {formatCooldown(mission.cooldown - (mission.cooldown - status.remaining))}
            </div>
          )}
          {!complete && !status.claimed && (
            <div className="w-full mt-3 py-2 rounded-lg bg-gray-700/30 text-gray-500 font-medium text-sm text-center">
              Complete to unlock
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-yellow-400">Daily Missions</h2>
        <span className="text-xs text-yellow-200/60">Reset in {formatCooldown(DAY - (now % DAY))}</span>
      </div>
      {dailyMissions.map(renderMission)}

      <h2 className="text-lg font-bold text-yellow-400 mt-6 flex items-center gap-2">
        Weekly Missions <span className="text-xs text-gray-400">Resets in {formatCooldown(resetTime)}</span>
      </h2>
      {weeklyMissions.map(renderMission)}

      <div className="rounded-xl overflow-hidden border border-purple-500/30" style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #101028 100%)' }}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">👥</div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-white">Refer 3 Active Friends</h3>
                  <p className="text-xs text-gray-400">Weekly • Each friend must deposit Rs 1,000+</p>
                </div>
                <span className="text-sm font-bold text-yellow-400">+Rs 30</span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{weeklyProgress.referrals} / 3 referrals</span>
                  <span>{Math.round((weeklyProgress.referrals / 3) * 100)}%</span>
                </div>
                <div className="h-2 bg-purple-900/30 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${weeklyReferralClaim.claimed ? 'bg-gray-500' : weeklyProgress.referrals >= 3 ? 'bg-purple-500' : 'bg-yellow-500'}`} style={{ width: `${Math.min((weeklyProgress.referrals / 3) * 100, 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
          {weeklyProgress.referrals >= 3 && !weeklyReferralClaim.claimed && (
            <button onClick={claimWeeklyReferral} className="w-full mt-3 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm">
              Claim Rs 30 Referral Bonus
            </button>
          )}
          {weeklyReferralClaim.claimed && (
            <div className="w-full mt-3 py-2.5 rounded-lg bg-gray-700/50 text-gray-400 font-semibold text-sm flex items-center justify-center gap-2">
              <CheckCircleIcon className="w-4 h-4" /> Claimed This Week
            </div>
          )}
          {weeklyProgress.referrals < 3 && !weeklyReferralClaim.claimed && (
            <div className="w-full mt-3 py-2 rounded-lg bg-gray-700/30 text-gray-500 font-medium text-sm text-center">
              Need {3 - weeklyProgress.referrals} more qualifying referrals
            </div>
          )}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-dark-300/50 border border-dark-100">
        <div className="flex items-center gap-2 text-yellow-400 text-sm font-semibold mb-2">
          <TrophyIcon className="w-5 h-5" /> Mission Requirements
        </div>
        <div className="text-xs text-gray-400 space-y-1">
          <p>• Daily missions reset every 24 hours at midnight</p>
          <p>• Weekly missions reset every Monday 00:00</p>
          <p>• Volume = total bets placed (wins + losses)</p>
          <p>• Only settled bets count toward progress</p>
          <p>• Referral requires Rs 1,000+ deposit from friend</p>
        </div>
      </div>
    </div>
  )
}

function VIPTab({ user, addToBalance, formatBalance, now, setNow }) {
  const toast = useToast()
  const userId = user?.id
  const currentLevel = user?.vip_level || 1
  const monthlyVolume = user?.stats?.monthly_volume || 0
  const monthlyLosses = user?.stats?.monthly_losses || 0

  const MONTH_MS = 30 * DAY

  const vipLevels = [
    { level: 1, requirement: 100000, weekly: 10, monthly: 0, promotion: 25, icon: '🥉' },
    { level: 2, requirement: 500000, weekly: 15, monthly: 0, promotion: 50, icon: '🥈' },
    { level: 3, requirement: 2000000, weekly: 25, monthly: 100, promotion: 100, icon: '🥇' },
    { level: 4, requirement: 10000000, weekly: 50, monthly: 250, promotion: 250, icon: '💎' },
    { level: 5, requirement: 50000000, weekly: 100, monthly: 500, promotion: 500, icon: '👑' },
  ]

  const currentVip = vipLevels[currentLevel - 1] || vipLevels[0]
  const nextVip = vipLevels[currentLevel] || null
  const promotionClaim = isClaimed(userId, `vip_promotion_${currentLevel}`, MONTH_MS)
  const weeklyClaim = isClaimed(userId, `vip_weekly_${currentLevel}`, WEEK)

  const progressToNext = nextVip ? Math.min((monthlyVolume / nextVip.requirement) * 100, 100) : 100
  const volumeRequired = nextVip ? nextVip.requirement : currentVip.requirement

  const claimPromotion = async () => {
    if (!userId) {
      toast.error('Please login to claim', 3000)
      return
    }

    if (monthlyVolume < volumeRequired) {
      toast.error(`Need Rs ${(volumeRequired - monthlyVolume).toLocaleString()} more volume`, 3000)
      return
    }

    if (promotionClaim.claimed) {
      toast.warning('Promotion bonus already claimed this month!', 2000)
      return
    }

    const success = await addToBalance(currentVip.promotion, `VIP ${currentLevel} Monthly Promotion`)
    if (success) {
      saveClaim(userId, `vip_promotion_${currentLevel}`, Date.now())
      toast.success(`Claimed ${formatBalance(currentVip.promotion)} VIP promotion!`, 3000)
      setNow(Date.now())
    }
  }

  const claimWeekly = async () => {
    if (!userId) {
      toast.error('Please login to claim', 3000)
      return
    }

    const weeklyTarget = currentVip.weekly * 10000
    if (monthlyVolume < weeklyTarget) {
      toast.error(`Need Rs ${(weeklyTarget - monthlyVolume).toLocaleString()} weekly volume`, 3000)
      return
    }

    if (weeklyClaim.claimed) {
      toast.warning('Weekly bonus already claimed! Resets in ' + formatCooldown(weeklyClaim.remaining), 2000)
      return
    }

    const success = await addToBalance(currentVip.weekly, `VIP ${currentLevel} Weekly Bonus`)
    if (success) {
      saveClaim(userId, `vip_weekly_${currentLevel}`, Date.now())
      toast.success(`Claimed ${formatBalance(currentVip.weekly)} weekly bonus!`, 3000)
      setNow(Date.now())
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl overflow-hidden border border-yellow-500/40" style={{ background: 'linear-gradient(135deg, #1a1000 0%, #2d2010 100%)' }}>
        <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 py-2 px-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-green-900 flex items-center gap-2">
              {currentVip.icon} VIP {currentLevel}
            </h2>
            <span className="text-xs text-green-800">Monthly</span>
          </div>
        </div>
        <div className="p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-yellow-300">Monthly Volume</span>
            <span className="text-sm font-bold text-yellow-400">Rs {monthlyVolume.toLocaleString()}</span>
          </div>
          <div className="h-3 bg-green-900/50 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full" style={{ width: `${progressToNext}%` }} />
          </div>
          {nextVip ? (
            <p className="text-xs text-yellow-200/60 mt-2">Rs {(nextVip.requirement - monthlyVolume).toLocaleString()} more to VIP {nextVip.level}</p>
          ) : (
            <p className="text-xs text-emerald-400 mt-2">Maximum VIP level reached!</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-dark-300/50 border border-dark-100 p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Promotion Bonus</p>
          <p className="text-xl font-bold text-yellow-400">Rs {currentVip.promotion}</p>
          <p className="text-[10px] text-gray-500 mt-1">Monthly • Rs {(currentVip.requirement / 1000).toLocaleString()}K+ volume</p>
        </div>
        <div className="rounded-xl bg-dark-300/50 border border-dark-100 p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Weekly Bonus</p>
          <p className="text-xl font-bold text-yellow-400">Rs {currentVip.weekly}</p>
          <p className="text-[10px] text-gray-500 mt-1">Weekly • Rs {(currentVip.weekly * 10000 / 1000).toLocaleString()}K+ volume</p>
        </div>
      </div>

      {monthlyVolume >= currentVip.requirement && !promotionClaim.claimed && (
        <button onClick={claimPromotion} className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 text-green-900 font-bold">
          Claim Promotion ({formatBalance(currentVip.promotion)})
        </button>
      )}
      {promotionClaim.claimed && (
        <div className="w-full py-3 rounded-xl bg-gray-700/50 text-gray-400 font-semibold text-center flex items-center justify-center gap-2">
          <CheckCircleIcon className="w-5 h-5" /> Promotion Claimed • {formatCooldown(MONTH_MS - (MONTH_MS - promotionClaim.remaining))} left
        </div>
      )}
      {monthlyVolume < currentVip.requirement && (
        <div className="w-full py-3 rounded-xl bg-gray-700/30 text-gray-500 font-medium text-sm text-center">
          <LockClosedIcon className="w-4 h-4 inline mr-1" /> Need Rs {(currentVip.requirement - monthlyVolume).toLocaleString()} more to unlock
        </div>
      )}

      {monthlyVolume >= (currentVip.weekly * 10000) && !weeklyClaim.claimed && (
        <button onClick={claimWeekly} className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold">
          Claim Weekly Bonus ({formatBalance(currentVip.weekly)})
        </button>
      )}
      {weeklyClaim.claimed && (
        <div className="w-full py-3 rounded-xl bg-gray-700/50 text-gray-400 font-semibold text-center flex items-center justify-center gap-2">
          <ClockIcon className="w-5 h-5" /> Weekly Claimed • Resets {formatCooldown(weeklyClaim.remaining)}
        </div>
      )}

      <h3 className="text-lg font-bold text-yellow-400 mt-4">VIP Levels</h3>
      {vipLevels.map((vip) => (
        <div key={vip.level} className={`rounded-xl border ${vip.level === currentLevel ? 'border-yellow-500 bg-yellow-500/10' : 'border-gray-700 bg-dark-300/50'}`}>
          <div className="p-3 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl ${vip.level === currentLevel ? 'bg-yellow-500 text-green-900' : 'bg-dark-400 text-gray-400'}`}>
              {vip.icon}
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className={`font-semibold ${vip.level === currentLevel ? 'text-yellow-400' : 'text-white'}`}>VIP {vip.level}</span>
                <span className="text-xs text-gray-400">Rs {(vip.requirement / 1000000).toFixed(1)}M req</span>
              </div>
              <div className="flex gap-3 mt-1 text-xs text-gray-400">
                <span>Weekly: Rs {vip.weekly}</span>
                {vip.monthly > 0 && <span>Monthly: Rs {vip.monthly}</span>}
                <span>Promo: Rs {vip.promotion}</span>
              </div>
            </div>
            {vip.level === currentLevel && <CheckCircleIcon className="w-5 h-5 text-yellow-400" />}
            {vip.level < currentLevel && <span className="text-xs text-emerald-400">✓</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function RebateTab({ user, addToBalance, formatBalance, now, setNow }) {
  const toast = useToast()
  const userId = user?.id
  const currentLevel = user?.vip_level || 1

  const weeklyLosses = user?.stats?.weekly_losses || 0
  const weeklyVolume = user?.stats?.weekly_volume || 0
  const monthlyLosses = user?.stats?.monthly_losses || 0

  const rebateRates = {
    1: { rate: 0.001, minLosses: 10000, max: 25, name: '0.1%' },
    2: { rate: 0.002, minLosses: 25000, max: 50, name: '0.2%' },
    3: { rate: 0.005, minLosses: 50000, max: 100, name: '0.5%' },
    4: { rate: 0.008, minLosses: 100000, max: 250, name: '0.8%' },
    5: { rate: 0.01, minLosses: 200000, max: 500, name: '1.0%' },
  }

  const vipRebate = rebateRates[currentLevel] || rebateRates[1]
  const weeklyRebateAmount = Math.min(Math.floor(weeklyLosses * vipRebate.rate), vipRebate.max)
  const monthlyRebateAmount = Math.min(Math.floor(monthlyLosses * vipRebate.rate * 1.2), vipRebate.max * 5)

  const weeklyClaim = isClaimed(userId, 'rebate_weekly', WEEK)
  const monthlyClaim = isClaimed(userId, 'rebate_monthly', 30 * DAY)

  const claimWeeklyRebate = async () => {
    if (!userId) {
      toast.error('Please login to claim', 3000)
      return
    }

    if (weeklyClaim.claimed) {
      toast.warning('Weekly rebate already claimed!', 2000)
      return
    }

    if (weeklyLosses < vipRebate.minLosses) {
      toast.error(`Need Rs ${(vipRebate.minLosses - weeklyLosses).toLocaleString()} more losses to qualify`, 3000)
      return
    }

    if (weeklyRebateAmount <= 0) {
      toast.error('No rebate earned this week', 2000)
      return
    }

    const success = await addToBalance(weeklyRebateAmount, 'Weekly Loss Rebate')
    if (success) {
      saveClaim(userId, 'rebate_weekly', Date.now())
      toast.success(`Claimed ${formatBalance(weeklyRebateAmount)} weekly rebate!`, 3000)
      setNow(Date.now())
    }
  }

  const claimMonthlyRebate = async () => {
    if (!userId) {
      toast.error('Please login to claim', 3000)
      return
    }

    if (monthlyClaim.claimed) {
      toast.warning('Monthly rebate already claimed this month!', 2000)
      return
    }

    if (monthlyLosses < vipRebate.minLosses * 3) {
      toast.error(`Need Rs ${((vipRebate.minLosses * 3) - monthlyLosses).toLocaleString()} more monthly losses`, 3000)
      return
    }

    if (monthlyRebateAmount <= 0) {
      toast.error('No rebate earned this month', 2000)
      return
    }

    const success = await addToBalance(monthlyRebateAmount, 'Monthly Loss Cashback')
    if (success) {
      saveClaim(userId, 'rebate_monthly', Date.now())
      toast.success(`Claimed ${formatBalance(monthlyRebateAmount)} monthly cashback!`, 3000)
      setNow(Date.now())
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl overflow-hidden border border-green-500/30" style={{ background: 'linear-gradient(135deg, #0a1a0a 0%, #102010 100%)' }}>
        <div className="p-4 text-center">
          <p className="text-sm text-green-300">Weekly Loss Rebate (VIP {currentLevel})</p>
          <p className="text-3xl font-bold text-yellow-400 mt-1">{formatBalance(weeklyRebateAmount)}</p>
          <p className="text-xs text-gray-400 mt-1">Max Rs {vipRebate.max} • {vipRebate.name} of weekly losses</p>
          
          <div className="mt-3 p-3 rounded-lg bg-green-900/30 border border-green-500/30">
            <div className="flex justify-between text-xs text-green-300 mb-1">
              <span>Weekly Losses</span>
              <span>Rs {weeklyLosses.toLocaleString()} / Rs {vipRebate.minLosses.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-green-900/50 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min((weeklyLosses / vipRebate.minLosses) * 100, 100)}%` }} />
            </div>
          </div>

          {weeklyLosses >= vipRebate.minLosses && !weeklyClaim.claimed ? (
            <button onClick={claimWeeklyRebate} className="mt-3 px-6 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold text-sm">
              Claim Weekly Rebate
            </button>
          ) : weeklyClaim.claimed ? (
            <div className="mt-3 px-6 py-2 rounded-lg bg-gray-700/50 text-gray-400 font-semibold text-sm inline-flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4" /> Claimed • {formatCooldown(weeklyClaim.remaining)}
            </div>
          ) : (
            <div className="mt-3 px-6 py-2 rounded-lg bg-gray-700/30 text-gray-500 font-medium text-sm">
              Need Rs {(vipRebate.minLosses - weeklyLosses).toLocaleString()} more losses
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border border-purple-500/30" style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #101028 100%)' }}>
        <div className="p-4 text-center">
          <p className="text-sm text-purple-300">Monthly Loss Cashback</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{formatBalance(monthlyRebateAmount)}</p>
          <p className="text-xs text-gray-400 mt-1">Max Rs {vipRebate.max * 5}</p>
          
          <div className="mt-3 p-3 rounded-lg bg-purple-900/30 border border-purple-500/30">
            <div className="flex justify-between text-xs text-purple-300 mb-1">
              <span>Monthly Losses</span>
              <span>Rs {monthlyLosses.toLocaleString()} / Rs {(vipRebate.minLosses * 3).toLocaleString()}</span>
            </div>
            <div className="h-2 bg-purple-900/50 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min((monthlyLosses / (vipRebate.minLosses * 3)) * 100, 100)}%` }} />
            </div>
          </div>

          {monthlyLosses >= vipRebate.minLosses * 3 && !monthlyClaim.claimed ? (
            <button onClick={claimMonthlyRebate} className="mt-3 px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm">
              Claim Monthly Cashback
            </button>
          ) : monthlyClaim.claimed ? (
            <div className="mt-3 px-6 py-2 rounded-lg bg-gray-700/50 text-gray-400 font-semibold text-sm inline-flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4" /> Claimed This Month
            </div>
          ) : (
            <div className="mt-3 px-6 py-2 rounded-lg bg-gray-700/30 text-gray-500 font-medium text-sm">
              Need Rs {((vipRebate.minLosses * 3) - monthlyLosses).toLocaleString()} more losses
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-dark-300/50 border border-dark-100 p-4">
        <p className="text-sm text-yellow-400 mb-3 font-semibold">Rebate Tiers</p>
        <div className="space-y-2">
          {Object.entries(rebateRates).map(([level, data]) => (
            <div key={level} className={`flex justify-between items-center text-sm ${parseInt(level) === currentLevel ? 'text-yellow-400' : 'text-gray-400'}`}>
              <span>VIP {level} {parseInt(level) === currentLevel && '← You'}</span>
              <span>{data.name} cashback</span>
              <span className="text-xs">Min Rs {data.minLosses.toLocaleString()} losses</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/30">
        <div className="flex items-start gap-2 text-red-300 text-xs">
          <LockClosedIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>Rebates are calculated from NET LOSSES only. Winning bets do not count. 
          Minimum weekly losses of Rs {vipRebate.minLosses.toLocaleString()} required to qualify for VIP {currentLevel} rebate rate.</p>
        </div>
      </div>
    </div>
  )
}

function UnclaimedTab({ user, addToBalance, formatBalance, now, setNow }) {
  const toast = useToast()
  const userId = user?.id

  const checkUnclaimed = () => {
    if (!userId) return []

    const items = []
    const spinStatus = isClaimed(userId, 'daily_spin', DAY)
    if (!spinStatus.claimed) {
      items.push({
        id: 'spin',
        title: 'Daily Lucky Spin',
        type: 'Spin',
        icon: '🎡',
        amount: null,
        available: true,
        key: 'daily_spin'
      })
    }

    const dailyMissions = [
      { key: 'daily_mission_bets', title: '200 Bets Daily Mission', icon: '🎮' },
      { key: 'daily_mission_volume', title: 'Rs 100K Volume Daily Mission', icon: '💰' },
      { key: 'daily_mission_losses', title: 'Rs 5K Losses Daily Mission', icon: '📉' },
    ]

    dailyMissions.forEach(m => {
      const status = isClaimed(userId, m.key, DAY)
      if (!status.claimed && user?.stats?.daily_volume >= 100000) {
        items.push({
          id: m.key,
          title: m.title,
          type: 'Mission',
          icon: m.icon,
          amount: m.key === 'daily_mission_volume' ? 10 : m.key === 'daily_mission_losses' ? 8 : 5,
          available: true,
          key: m.key,
          cooldown: DAY
        })
      }
    })

    const weeklyBet = isClaimed(userId, 'weekly_mission_bet', WEEK)
    if (!weeklyBet.claimed && user?.stats?.weekly_volume >= 500000) {
      items.push({
        id: 'wm_bets',
        title: '1,500 Bets Weekly Mission',
        type: 'Mission',
        icon: '📊',
        amount: 50,
        available: true,
        key: 'weekly_mission_bet',
        cooldown: WEEK
      })
    }

    const weeklyRebate = isClaimed(userId, 'rebate_weekly', WEEK)
    if (!weeklyRebate.claimed && user?.stats?.weekly_losses >= 10000) {
      const rebateRate = { 1: 0.001, 2: 0.002, 3: 0.005, 4: 0.008, 5: 0.01 }
      const rate = rebateRate[user?.vip_level || 1] || 0.001
      const amount = Math.min(Math.floor((user?.stats?.weekly_losses || 0) * rate), (rebateRate[user?.vip_level || 1] || 0.001) * 100)
      items.push({
        id: 'rebate_weekly',
        title: 'Weekly Loss Rebate',
        type: 'Rebate',
        icon: '💎',
        amount: amount,
        available: true,
        key: 'rebate_weekly',
        cooldown: WEEK
      })
    }

    const vipPromo = isClaimed(userId, `vip_promotion_${user?.vip_level || 1}`, 30 * DAY)
    if (!vipPromo.claimed && user?.stats?.monthly_volume >= 100000) {
      const promoAmounts = { 1: 25, 2: 50, 3: 100, 4: 250, 5: 500 }
      items.push({
        id: 'vip_promo',
        title: `VIP ${user?.vip_level || 1} Monthly Promotion`,
        type: 'VIP',
        icon: '👑',
        amount: promoAmounts[user?.vip_level || 1] || 25,
        available: true,
        key: `vip_promotion_${user?.vip_level || 1}`,
        cooldown: 30 * DAY
      })
    }

    return items
  }

  const unclaimedItems = checkUnclaimed()
  const totalAvailable = unclaimedItems.reduce((sum, u) => sum + (u.amount || 0), 0)

  const claimItem = async (item) => {
    if (!userId) {
      toast.error('Please login to claim', 3000)
      return
    }

    const status = isClaimed(userId, item.key, item.cooldown || DAY)
    if (status.claimed) {
      toast.warning('Already claimed!', 2000)
      return
    }

    if (item.amount === null) {
      toast.info('Complete the requirements to claim', 2000)
      return
    }

    const success = await addToBalance(item.amount, item.title)
    if (success) {
      saveClaim(userId, item.key, Date.now())
      toast.success(`Claimed ${formatBalance(item.amount)}!`, 3000)
      setNow(Date.now())
    }
  }

  const claimAll = async () => {
    if (!userId) {
      toast.error('Please login to claim', 3000)
      return
    }

    let total = 0
    for (const item of unclaimedItems) {
      if (item.amount !== null) {
        const status = isClaimed(userId, item.key, item.cooldown || DAY)
        if (!status.claimed) {
          const success = await addToBalance(item.amount, item.title)
          if (success) {
            saveClaim(userId, item.key, Date.now())
            total += item.amount
          }
        }
      }
    }

    if (total > 0) {
      toast.success(`Claimed all: ${formatBalance(total)}!`, 3000)
      setNow(Date.now())
    } else {
      toast.info('No rewards available to claim', 2000)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-yellow-400">Available Rewards</h2>
        {unclaimedItems.length > 0 && unclaimedItems.some(u => u.amount !== null) && (
          <button onClick={claimAll} className="px-4 py-1.5 rounded-lg bg-emerald-500 text-white text-sm font-medium">
            Claim All ({formatBalance(totalAvailable)})
          </button>
        )}
      </div>

      {unclaimedItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🎁</div>
          <p className="text-gray-400 mb-2">No rewards available</p>
          <p className="text-xs text-gray-500">Complete missions to earn rewards</p>
        </div>
      ) : (
        unclaimedItems.map((item) => (
          <div key={item.id} className="rounded-xl border border-yellow-500/30 p-4" style={{ background: 'linear-gradient(135deg, #1a1a00 0%, #2d2d10 100%)' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center text-2xl">
                {item.icon}
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">{item.title}</p>
                <p className="text-xs text-yellow-300/70">Ready to claim</p>
              </div>
              <div className="text-right">
                {item.amount !== null ? (
                  <>
                    <p className="text-lg font-bold text-yellow-400">{formatBalance(item.amount)}</p>
                    <button onClick={() => claimItem(item)} className="px-3 py-1 rounded-lg bg-emerald-500 text-white text-xs font-medium mt-1">
                      Claim
                    </button>
                  </>
                ) : (
                  <span className="px-3 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs font-medium">
                    Incomplete
                  </span>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      <div className="p-4 rounded-xl bg-dark-300/50 border border-dark-100">
        <p className="text-sm text-gray-400 mb-2">Requirements to unlock rewards:</p>
        <div className="space-y-1 text-xs text-gray-500">
          <p>• Daily spin: Rs 10,000+ volume today</p>
          <p>• Daily missions: Complete target volume/bets/losses</p>
          <p>• Weekly missions: Rs 500,000+ weekly volume</p>
          <p>• Rebates: Minimum weekly losses required</p>
        </div>
      </div>
    </div>
  )
}

function HistoryTab() {
  const history = [
    { id: 1, type: 'spin', title: 'Lucky Spin', amount: 7, date: 'Today 14:30' },
    { id: 2, type: 'referral', title: 'Referral Bonus', amount: 5, date: 'Yesterday 10:20' },
    { id: 3, type: 'mission', title: 'Mission: 20 Bets', amount: 3, date: 'Yesterday 18:45' },
    { id: 4, type: 'rebate', title: 'Weekly Cashback', amount: 3, date: '3 days ago' },
    { id: 5, type: 'daily', title: 'Daily Aviator', amount: 10, date: '5 days ago' },
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-yellow-400">Reward History</h2>
      {history.map((item) => (
        <div key={item.id} className="rounded-xl bg-dark-300/50 border border-dark-100 p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
              item.type === 'spin' ? 'bg-yellow-500/20' :
              item.type === 'referral' ? 'bg-emerald-500/20' :
              item.type === 'mission' ? 'bg-blue-500/20' :
              item.type === 'rebate' ? 'bg-purple-500/20' : 'bg-green-500/20'
            }`}>
              {item.type === 'spin' ? '🎡' : item.type === 'referral' ? '👥' : item.type === 'mission' ? '🎯' : item.type === 'rebate' ? '💰' : '🚀'}
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">{item.title}</p>
              <p className="text-xs text-gray-400">{item.date}</p>
            </div>
            <p className="text-sm font-bold text-emerald-400">+Rs {item.amount}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function SpinModal({ user, addToBalance, formatBalance, onClose, onSpun }) {
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [wonAmount, setWonAmount] = useState(0)
  const toast = useToast()
  const userId = user?.id

  const prizes = [
    { amount: 1, label: 'Rs 1', weight: 30, color: 'red' },
    { amount: 2, label: 'Rs 2', weight: 25, color: 'yellow' },
    { amount: 5, label: 'Rs 5', weight: 15, color: 'green' },
    { amount: 10, label: 'Rs 10', weight: 5, color: 'gold' },
    { amount: 1, label: 'Rs 1', weight: 25, color: 'purple' },
  ]

  const spin = async () => {
    setSpinning(true)
    setResult(null)
    
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const rand = Math.random() * 100
    let cumulative = 0
    let selected = prizes[0]
    for (const p of prizes) {
      cumulative += p.weight
      if (rand <= cumulative) {
        selected = p
        break
      }
    }
    
    setWonAmount(selected.amount)
    setResult(selected)
    setSpinning(false)
    
    if (userId) {
      saveClaim(userId, 'daily_spin', Date.now())
      onSpun()
    }
    
    toast.success(`You won ${selected.label}!`, 4000)
  }

  const collectReward = async () => {
    if (!userId) {
      toast.error('Please login to collect', 3000)
      return
    }

    const success = await addToBalance(wonAmount, 'Lucky Spin Reward')
    if (success) {
      toast.success(`${formatBalance(wonAmount)} added to your balance!`, 3000)
      onClose()
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.8, y: 50 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-2xl overflow-hidden border-2 border-yellow-500 shadow-xl" style={{ background: 'linear-gradient(180deg, #1a0500 0%, #2d1000 100%)' }} onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 py-3 px-4 text-center">
          <h2 className="text-xl font-bold text-green-900">🎰 Lucky Turntable</h2>
        </div>
        <div className="p-6">
          <div className="relative w-48 h-48 mx-auto mb-6">
            <div className={`absolute inset-0 rounded-full border-8 border-yellow-500 shadow-lg ${spinning ? 'animate-spin' : ''}`} style={{ background: 'conic-gradient(red 0deg 72deg, yellow 72deg 144deg, green 144deg 216deg, gold 216deg 288deg, purple 288deg 360deg)', animationDuration: spinning ? '2s' : '0s', transition: 'animation-duration 0.3s' }} />
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-yellow-900 to-red-900 flex items-center justify-center">
              <span className="text-5xl">{result ? '🎉' : spinning ? '❓' : '👑'}</span>
            </div>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-12 border-l-transparent border-r-transparent border-t-yellow-500" />
          </div>

          {result ? (
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-400 mb-2">Congratulations!</p>
              <p className="text-xl text-white mb-4">You won {result.label}</p>
              <button onClick={collectReward} className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-green-900 font-bold">
                Collect Reward
              </button>
            </div>
          ) : (
            <button onClick={spin} disabled={spinning} className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-500 text-green-900 font-bold text-lg disabled:opacity-50">
              {spinning ? '🎰 Spinning...' : '🎰 SPIN NOW'}
            </button>
          )}

          <div className="mt-4 p-3 rounded-lg bg-dark-300/50 border border-dark-100">
            <p className="text-xs text-gray-400 text-center">
              Win Rs 1 - 10 per spin<br/>
              <span className="text-yellow-300">1 free spin daily</span> • Requires Rs 10,000+ volume<br/>
              <span className="text-red-300">House edge: Low rewards, high requirements</span>
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
