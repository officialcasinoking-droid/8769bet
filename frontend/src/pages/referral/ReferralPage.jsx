import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UsersIcon, ShareIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { getBonusesByUser } from '../../api/referrals'

export default function ReferralPage() {
  const { user, formatBalance } = useAuth()
  const toast = useToast()

  const referralCode = user?.referral_code || `REF-${user?.id?.slice(0, 8).toUpperCase() || 'GUEST'}`
  const referralLink = `https://8769bet.com/register?ref=${referralCode}`

  const [referralStats, setReferralStats] = useState({
    referral_count: 0,
    referral_earnings: 0
  })

  const [userBonuses, setUserBonuses] = useState([])

  const [referralsData, setReferralsData] = useState([
    { id: 1, name: 'Ahmed K.', status: 'active', earnings: 10, joined: 'Today' },
    { id: 2, name: 'Faisal M.', status: 'active', earnings: 5, joined: 'Yesterday' },
    { id: 3, name: 'Hassan A.', status: 'pending', earnings: 0, joined: '3 days ago' },
  ])

  useEffect(() => {
    if (user?.id) {
      const fetchBonuses = async () => {
        try {
          const bonuses = await getBonusesByUser(user.id)
          setUserBonuses(bonuses)
        } catch (error) {
          console.error('Failed to fetch bonuses:', error)
        }
      }
      fetchBonuses()
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      const totalEarned = userBonuses
        .filter(b => b.type === 'referral_signup' || b.type === 'referral_bonus')
        .reduce((sum, bonus) => sum + Number(bonus.amount), 0)

      setReferralStats({
        referral_count: userBonuses.filter(b => b.type === 'referral_signup' || b.type === 'referral_bonus').length,
        referral_earnings: totalEarned
      })
    }
  }, [userBonuses])

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    toast.success('Referral link copied!', 2000)
  }

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(`Join 8769bet! Use my code: ${referralCode}\n${referralLink}`)
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  const shareTelegram = () => {
    const msg = encodeURIComponent(`Join 8769bet! Use my code: ${referralCode}\n${referralLink}`)
    window.open(`https://t.me/share/url?url=${referralLink}&text=${msg}`, '_blank')
  }

  const activeReferrals = referralsData.filter(r => r.status === 'active').length

  return (
    <div className="pt-16 pb-24 min-h-screen" style={{ background: 'linear-gradient(180deg, #006400 0%, #001a00 100%)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="sticky top-16 z-40 bg-gradient-to-b from-green-900 to-green-800/95 backdrop-blur-lg border-b border-yellow-500/20">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
                <UsersIcon className="w-6 h-6" />
                Referral
              </h1>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl overflow-hidden border-2 border-yellow-500/40 shadow-lg" style={{ background: 'linear-gradient(135deg, #1a0a00 0%, #2d1810 50%, #1a0a00 100%)' }}>
            <div className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 py-3 px-4">
              <h2 className="text-lg font-bold text-green-900 text-center">Your Referral Code</h2>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between bg-dark-300/50 rounded-xl p-4 mb-4">
                <div>
                  <p className="text-xs text-yellow-300 mb-1">Share this code</p>
                  <p className="text-2xl font-bold text-white font-mono tracking-wider">{referralCode}</p>
                </div>
                <button onClick={copyLink} className="px-4 py-2 rounded-lg bg-yellow-500 text-green-900 font-semibold text-sm">
                  Copy
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={shareWhatsApp} className="flex-1 py-3 rounded-xl bg-green-500 text-white font-semibold text-sm flex items-center justify-center gap-2">
                  <ShareIcon className="w-5 h-5" />
                  WhatsApp
                </button>
                <button onClick={shareTelegram} className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2">
                  <ShareIcon className="w-5 h-5" />
                  Telegram
                </button>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-3 gap-3">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl bg-dark-300/50 border border-dark-100 p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Total Referrals</p>
              <p className="text-2xl font-bold text-white">{referralStats?.referral_count || 0}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl bg-dark-300/50 border border-dark-100 p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Active</p>
              <p className="text-2xl font-bold text-emerald-400">{activeReferrals}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl bg-dark-300/50 border border-dark-100 p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Earnings</p>
              <p className="text-2xl font-bold text-yellow-400">{formatBalance(referralStats?.referral_earnings || 0)}</p>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="rounded-xl bg-dark-300/50 border border-dark-100 overflow-hidden">
            <div className="p-4 border-b border-dark-100">
              <h3 className="text-lg font-bold text-white">Your Referrals</h3>
            </div>
            {referralsData.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-5xl mb-4">👥</div>
                <p className="text-gray-400">No referrals yet</p>
                <p className="text-xs text-gray-500 mt-1">Share your code to start earning</p>
              </div>
            ) : (
              <div className="divide-y divide-dark-100">
                {referralsData.map((ref) => (
                  <div key={ref.id} className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
                      {ref.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{ref.name}</p>
                      <p className="text-xs text-gray-400">Joined {ref.joined}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        ref.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {ref.status}
                      </span>
                      <p className="text-sm font-bold text-yellow-400 mt-1">Rs {ref.earnings}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
