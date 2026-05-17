import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ClipboardIcon, CheckIcon, WalletIcon, GiftIcon, UsersIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, BellIcon, ShieldCheckIcon, ChevronRightIcon, StarIcon, CogIcon, DocumentTextIcon, TrophyIcon, PlusIcon, TrashIcon, LockClosedIcon, BanknotesIcon, PhoneIcon, ClockIcon, TicketIcon, UserIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../components/ui/Toast'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../../components/ui/Dialog'
import { supabase } from '../../lib/supabase'

const WITHDRAWAL_METHODS = [
  { id: 'jazzcash', name: 'JazzCash', icon: '📱', fields: ['account_number', 'account_name'] },
  { id: 'easypaisa', name: 'Easypaisa', icon: '📱', fields: ['account_number', 'account_name'] },
  { id: 'bank', name: 'Bank Account', icon: '🏦', fields: ['account_number', 'account_name', 'bank_name'] },
]

function PINInput({ value, onChange, length = 4, label, autoFocus = true }) {
  const inputRef = useRef(null)

  const handleChange = (index, val) => {
    if (!/^\d*$/.test(val)) return
    if (val.length > 1) {
      const digits = val.split('').filter(c => /^\d$/.test(c))
      const newValue = [...value]
      digits.forEach((d, i) => {
        if (index + i < length) newValue[index + i] = d
      })
      onChange(newValue.join(''))
      const nextIndex = Math.min(index + digits.length, length - 1)
      inputRef.current?.querySelectorAll('input')[nextIndex]?.focus()
      return
    }
    const newValue = [...value]
    newValue[index] = val
    onChange(newValue.join(''))
    if (val && index < length - 1) {
      inputRef.current?.querySelectorAll('input')[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRef.current?.querySelectorAll('input')[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    onChange(pasted)
  }

  return (
    <div className="space-y-3">
      {label && <label className="text-sm text-gray-400 text-center block">{label}</label>}
      <div ref={inputRef} className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={value[i] || ''}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-11 h-12 sm:w-12 sm:h-14 rounded-lg bg-dark-300 border-2 border-dark-100 text-center text-xl sm:text-2xl font-bold text-white focus:border-primary-500 focus:outline-none transition-colors"
            autoFocus={autoFocus && i === 0}
          />
        ))}
      </div>
    </div>
  )
}

function SetPINModal({ open, onClose, onSuccess }) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmAutoFocus, setConfirmAutoFocus] = useState(false)
  const { setWithdrawalPIN, refreshUser } = useAuth()
  const toast = useToast()

  useEffect(() => {
    if (open) {
      setPin('')
      setConfirmPin('')
      setConfirmAutoFocus(false)
    }
  }, [open])

  useEffect(() => {
    if (pin.length === 4 && confirmPin.length === 0) {
      setConfirmAutoFocus(true)
    }
  }, [pin, confirmPin])

  const pinsMatch = pin.length === 4 && confirmPin.length === 4 && pin === confirmPin
  const canSubmit = pinsMatch

  const handleSubmit = async () => {
    if (!canSubmit) {
      if (pin !== confirmPin) {
        toast.error('PINs do not match')
      }
      return
    }
    setLoading(true)
    const result = await setWithdrawalPIN(pin)
    setLoading(false)
    if (result.success) {
      toast.success('Withdrawal PIN set successfully!')
      refreshUser()
      onSuccess()
      onClose()
    } else {
      toast.error(result.error || 'Failed to set PIN')
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onClose={onClose} className="max-w-md">
      <DialogHeader onClose={onClose}>
        <DialogTitle className="text-center">Set Withdrawal PIN</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div className="space-y-6 py-2">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <LockClosedIcon className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-sm text-gray-400">Create a 4-digit PIN to secure your withdrawals.</p>
          </div>

          <div className="bg-dark-200 rounded-xl p-4">
            <PINInput
              value={pin}
              onChange={setPin}
              length={4}
              label="Enter PIN"
              autoFocus={true}
            />
          </div>

          <div className="bg-dark-200 rounded-xl p-4">
            <PINInput
              value={confirmPin}
              onChange={setConfirmPin}
              length={4}
              label="Confirm PIN"
              autoFocus={confirmAutoFocus}
            />
          </div>

          <div className="h-6">
            {confirmPin.length === 4 && pin.length === 4 && !pinsMatch && (
              <p className="text-sm text-red-400 text-center animate-pulse">PINs do not match</p>
            )}
            {pinsMatch && (
              <p className="text-sm text-emerald-400 text-center flex items-center justify-center gap-1">
                <CheckIcon className="w-4 h-4" /> PINs match
              </p>
            )}
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-dark-300 text-gray-400 font-medium">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting...' : 'Save PIN'}
          </button>
        </div>
      </DialogFooter>
    </Dialog>
  )
}

function AddAccountModal({ open, onClose, onSuccess, userHasPIN }) {
  const [step, setStep] = useState(1)
  const [method, setMethod] = useState(null)
  const [formData, setFormData] = useState({ 
    cnic: '', 
    real_name: '', 
    account_number: '' 
  })
  const [loading, setLoading] = useState(false)
  const { addWithdrawalAccount } = useAuth()
  const toast = useToast()

  useEffect(() => {
    if (open) {
      setStep(userHasPIN ? 2 : 1)
      setMethod(null)
      setFormData({ cnic: '', real_name: '', account_number: '' })
    }
  }, [open, userHasPIN])

  const handleSubmit = async () => {
    if (!formData.cnic || formData.cnic.length !== 13) {
      toast.error('CNIC must be 13 digits (without dashes)')
      return
    }
    if (!formData.real_name || formData.real_name.length < 3) {
      toast.error('Enter your full real name')
      return
    }
    if (!formData.account_number || formData.account_number.length < 10) {
      toast.error('Invalid account number')
      return
    }
    
    setLoading(true)
    const result = await addWithdrawalAccount({ 
      type: method.id, 
      cnic: formData.cnic,
      real_name: formData.real_name,
      account_number: formData.account_number,
      account_name: formData.real_name,
    })
    setLoading(false)
    
    if (result.success) {
      toast.success('Account added successfully!')
      onSuccess()
      onClose()
    } else {
      toast.error(result.error || 'Failed to add account')
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onClose={onClose} className="max-w-md">
      <DialogHeader onClose={onClose}>
        <DialogTitle className="text-center">Add Withdrawal Account</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div className="space-y-4">
          {step === 1 ? (
            <>
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-start gap-3">
                  <LockClosedIcon className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-400 mb-1">PIN Required First</p>
                    <p className="text-xs text-gray-400">You must set your withdrawal PIN before adding an account.</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-400 text-center">Please set your withdrawal PIN first to secure your account.</p>
            </>
          ) : !method ? (
            <>
              <p className="text-sm text-gray-400 mb-2 text-center">Select withdrawal method:</p>
              <div className="grid grid-cols-3 gap-3">
                {WITHDRAWAL_METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m)}
                    className="p-4 rounded-xl bg-dark-300 border border-dark-100 hover:border-primary-500 transition-colors text-center"
                  >
                    <div className="text-3xl mb-2">{m.icon}</div>
                    <div className="text-sm text-gray-300">{m.name}</div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button onClick={() => setMethod(null)} className="text-sm text-primary-400 hover:underline flex items-center gap-1">
                ← Change method
              </button>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">CNIC Number *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.cnic}
                    onChange={(e) => setFormData({ ...formData, cnic: e.target.value.replace(/\D/g, '').slice(0, 13) })}
                    placeholder="1234512345671"
                    className="w-full px-4 py-3 rounded-xl bg-dark-300 border border-dark-100 text-white text-center text-lg tracking-widest"
                  />
                  <p className="text-xs text-gray-500 mt-1 text-center">13 digits without dashes (-)</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Full Real Name *</label>
                  <input
                    type="text"
                    value={formData.real_name}
                    onChange={(e) => setFormData({ ...formData, real_name: e.target.value.toUpperCase() })}
                    placeholder="AHMAD ALI"
                    className="w-full px-4 py-3 rounded-xl bg-dark-300 border border-dark-100 text-white text-center uppercase tracking-wide"
                  />
                  <p className="text-xs text-gray-500 mt-1 text-center">As per your CNIC</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Account Number *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value.replace(/\D/g, '') })}
                    placeholder="03XXXXXXXXX"
                    className="w-full px-4 py-3 rounded-xl bg-dark-300 border border-dark-100 text-white text-center text-lg tracking-widest"
                  />
                  <p className="text-xs text-gray-500 mt-1 text-center">Your {method.name} account number</p>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
      <DialogFooter>
        {step === 1 ? (
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-dark-300 text-gray-400 font-medium"
          >
            Cancel
          </button>
        ) : method ? (
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-dark-300 text-gray-400 font-medium">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-semibold disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Account'}
            </button>
          </div>
        ) : null}
      </DialogFooter>
    </Dialog>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, isLoggedIn, loading: authLoading, formatBalance, setWithdrawalPIN, removeWithdrawalAccount, refreshUser } = useAuth()
  const toast = useToast()
  const [userIdCopied, setUserIdCopied] = useState(false)
  const [showSetPIN, setShowSetPIN] = useState(false)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [showPhoneBonus, setShowPhoneBonus] = useState(false)
  const [showTransactionHistory, setShowTransactionHistory] = useState(false)
  const [showOffers, setShowOffers] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      navigate('/login', { replace: true })
    }
  }, [isLoggedIn, authLoading, navigate])

  const handlePINSuccess = () => {
    refreshUser()
    toast.success('PIN updated in chat notifications')
  }

  const handleAccountSuccess = () => {
    refreshUser()
    toast.success('Account updated in chat notifications')
  }

  const copyUserId = async () => {
    try {
      await navigator.clipboard.writeText(user?.id || '')
      setUserIdCopied(true)
      toast.success('User ID copied!', 2000)
      setTimeout(() => setUserIdCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy user ID')
    }
  }

  if (authLoading || !isLoggedIn || !user) {
    return (
      <div className="pt-16 pb-24 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const copyReferralCode = () => {
    if (user?.referral_code) {
      navigator.clipboard.writeText(user.referral_code)
      toast.success('Referral code copied!', 2000)
    }
  }

  const handleRemoveAccount = async (accountId) => {
    if (!confirm('Remove this withdrawal account?')) return
    const result = await removeWithdrawalAccount(accountId)
    if (result.success) {
      toast.success('Account removed')
      refreshUser()
    } else {
      toast.error(result.error || 'Failed to remove account')
    }
  }

  const stats = [
    { label: 'Total Deposits', value: '₨12,500', icon: ArrowTrendingUpIcon, color: 'text-green-400' },
    { label: 'Total Withdrawals', value: '₨8,200', icon: ArrowTrendingDownIcon, color: 'text-blue-400' },
    { label: 'Bets Placed', value: '156', icon: StarIcon, color: 'text-yellow-400' },
    { label: 'Wins', value: '89', icon: TrophyIcon, color: 'text-purple-400' },
  ]

  return (
    <div className="pt-16 pb-24 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Profile Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-2xl font-bold text-dark-500">
            {user.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{user.username}</h1>
            <p className="text-sm text-gray-400 capitalize">{user.role || 'Member'}</p>
          </div>
          <button
            onClick={() => toast.info('Notifications coming soon!')}
            className="p-2 rounded-xl bg-dark-300/50 border border-dark-100"
          >
            <BellIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-primary-500/20 to-emerald-500/10 border border-primary-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Main Balance</p>
              <p className="text-3xl font-bold text-white mt-0.5">{formatBalance(user.balance || 0)}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/deposit')}
                className="px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium"
              >
                Deposit
              </button>
              <button
                onClick={() => navigate('/withdraw')}
                className="px-4 py-2 rounded-xl bg-dark-300/50 border border-dark-100 text-white text-sm font-medium"
              >
                Withdraw
              </button>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-dark-300/50 border border-dark-100 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-dark-100">
            <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-emerald-400" />
              Security & Withdrawal
            </h3>
          </div>
          
          {/* Withdrawal PIN */}
          <div className="p-4 border-b border-dark-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <LockClosedIcon className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Withdrawal PIN</p>
                  <p className="text-xs text-gray-400">
                    {user.withdrawal_pin_set ? 'PIN is set' : 'Required for withdrawals'}
                  </p>
                </div>
              </div>
              {user.withdrawal_pin_set ? (
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                  ✓ Active
                </span>
              ) : (
                <button
                  onClick={() => setShowSetPIN(true)}
                  className="px-3 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs font-medium"
                >
                  Set PIN
                </button>
              )}
            </div>
          </div>

          {/* Withdrawal Accounts */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <BanknotesIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Withdrawal Accounts</p>
                  <p className="text-xs text-gray-400">
                    {(user.withdrawal_accounts || []).length} account(s) added
                  </p>
                </div>
              </div>
              {user.withdrawal_pin_set ? (
                <button
                  onClick={() => setShowAddAccount(true)}
                  className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-1"
                >
                  <PlusIcon className="w-3 h-3" /> Add
                </button>
              ) : (
                <span className="px-3 py-1 rounded-lg bg-gray-500/20 text-gray-400 text-xs font-medium flex items-center gap-1">
                  <LockClosedIcon className="w-3 h-3" /> Set PIN First
                </span>
              )}
            </div>

            {/* Account List */}
            {(user.withdrawal_accounts || []).length > 0 ? (
              <div className="space-y-2">
                {user.withdrawal_accounts.map((account) => {
                  const method = WITHDRAWAL_METHODS.find(m => m.id === account.type)
                  return (
                    <div key={account.id} className="flex items-center justify-between p-3 rounded-xl bg-dark-400/50 border border-dark-100">
                      <div className="flex items-center gap-3">
                        <div className="text-xl">{method?.icon || '💳'}</div>
                        <div>
                          <p className="text-sm text-white">{method?.name || account.type}</p>
                          <p className="text-xs text-gray-400">
                            {account.account_number.slice(-4).padStart(account.account_number.length, '•')}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveAccount(account.id)}
                        className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                No withdrawal accounts added
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="bg-dark-300/50 border border-dark-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            )
          })}
        </div>

        {/* Referral Code */}
        {user.referral_code && (
          <div className="bg-dark-300/50 border border-dark-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <UsersIcon className="w-4 h-4 text-emerald-400" />
              <p className="text-sm font-medium text-gray-300">Referral Code</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xl font-bold text-white font-mono">{user.referral_code}</p>
              <button
                onClick={copyReferralCode}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Earn PKR 50 for each friend who joins</p>
          </div>
        )}

        {/* Menu Items */}
        <div className="bg-dark-300/50 border border-dark-100 rounded-xl overflow-hidden">
          <MenuItem icon={<DocumentTextIcon className="w-5 h-5" />} label="Bet History" onClick={() => navigate('/profile/bet-history')} />
          <MenuItem icon={<WalletIcon className="w-5 h-5" />} label="Transaction History" onClick={() => setShowTransactionHistory(true)} />
          <MenuItem icon={<GiftIcon className="w-5 h-5" />} label="Offers & Bonuses" onClick={() => setShowOffers(true)} />
          <MenuItem icon={<PhoneIcon className="w-5 h-5" />} label="Phone Bonus" onClick={() => setShowPhoneBonus(true)} badge="+₨3" />
          <MenuItem icon={<BellIcon className="w-5 h-5" />} label="Notifications" onClick={() => setShowSettings(true)} border={false} />
        </div>

        {/* Account Details */}
        <div className="bg-dark-300/30 border border-dark-100 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Account Details</h3>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Email</span>
              <span className="text-sm text-gray-300">{user.email || 'Not set'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Phone</span>
              <span className="text-sm text-gray-300">{user.phone || 'Not set'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">User ID</span>
              <button onClick={copyUserId} className="text-sm text-primary-400 flex items-center gap-1">
                {user.id?.slice(0, 8) || 'N/A'}
                {userIdCopied ? <CheckIcon className="w-3 h-3" /> : <ClipboardIcon className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => { localStorage.clear(); window.location.href = '/' }}
          className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-medium hover:bg-red-500/20 transition-colors"
        >
          Sign Out
        </button>
      </div>

      <SetPINModal open={showSetPIN} onClose={() => setShowSetPIN(false)} onSuccess={handlePINSuccess} />
      <AddAccountModal open={showAddAccount} onClose={() => setShowAddAccount(false)} onSuccess={handleAccountSuccess} userHasPIN={user.withdrawal_pin_set} />
      <PhoneBonusModal open={showPhoneBonus} onClose={() => setShowPhoneBonus(false)} onSuccess={handleAccountSuccess} />
      <TransactionHistoryModal open={showTransactionHistory} onClose={() => setShowTransactionHistory(false)} />
      <OffersModal open={showOffers} onClose={() => setShowOffers(false)} />
      <NotificationsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  )
}

function MenuItem({ icon, label, onClick, badge, border = true }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-dark-400/50 transition-colors ${border ? 'border-b border-dark-100' : ''}`}
    >
      <span className="text-gray-400">{icon}</span>
      <span className="flex-1 text-left text-gray-200 text-sm">{label}</span>
      {badge !== undefined && badge !== null && (
        <span className="px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 text-xs font-medium">
          {badge}
        </span>
      )}
      <ChevronRightIcon className="w-4 h-4 text-gray-600" />
    </button>
  )
}

// Phone Bonus Modal with OTP Verification
function PhoneBonusModal({ open, onClose, onSuccess }) {
  const { user, refreshUser } = useAuth()
  const toast = useToast()
  const [step, setStep] = useState('phone') // 'phone', 'otp', 'success'
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [sentOtp, setSentOtp] = useState('')
  const [countdown, setCountdown] = useState(0)
  const otpInputRefs = useRef([])

  useEffect(() => {
    if (open) {
      setStep('phone')
      setPhone('')
      setOtp(['', '', '', '', '', ''])
      setSentOtp('')
      setCountdown(0)
    }
  }, [open])

  useEffect(() => {
    let timer
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  const sendOTP = async () => {
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid phone number')
      return
    }

    setLoading(true)
    try {
      const otpCode = generateOTP()
      const expiry = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes expiry

      // Store OTP in database (in real app, this would send SMS)
      const { error } = await supabase
        .from('phone_verifications')
        .insert({
          user_id: user.id,
          phone: phone,
          otp_code: otpCode,
          expires_at: expiry,
          verified: false
        })

      if (error) {
        console.error('OTP storage error:', error)
      }

      setSentOtp(otpCode)
      toast.success(`OTP sent to ${phone}!`, { duration: 5000 })

      setStep('otp')
      setCountdown(60)
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100)
    } catch (err) {
      toast.error('Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const verifyOTP = async () => {
    const otpCode = otp.join('')
    if (otpCode.length !== 6) {
      toast.error('Please enter complete OTP')
      return
    }

    setLoading(true)
    try {
      // Verify OTP from database
      const { data: verification, error } = await supabase
        .from('phone_verifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('phone', phone)
        .eq('verified', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !verification) {
        toast.error('Invalid or expired OTP')
        setLoading(false)
        return
      }

      if (verification.otp_code !== otpCode) {
        toast.error('Incorrect OTP')
        setLoading(false)
        return
      }

      // Mark OTP as verified
      await supabase
        .from('phone_verifications')
        .update({ verified: true })
        .eq('id', verification.id)

      // Now add the bonus
      const bonusAmount = 3

      // Update user with phone number
      const { error: updateError } = await supabase
        .from('users')
        .update({
          phone: phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) {
        toast.error('Failed to save phone number')
        setLoading(false)
        return
      }

      // Add bonus to user balance
      const newBalance = (user.balance || 0) + bonusAmount
      const { error: balanceError } = await supabase
        .from('users')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (balanceError) {
        toast.error('Failed to add bonus')
        setLoading(false)
        return
      }

      // Log transaction
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'bonus',
        amount: bonusAmount,
        balance_after: newBalance,
        description: 'Phone Verification Bonus',
        status: 'completed',
        note: `Phone ${phone} verified`
      })

      setStep('success')
      toast.success(`🎉 Bonus of ₨${bonusAmount} added!`)
      refreshUser()
      onSuccess()

      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      toast.error('Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index, value) => {
    const newOtp = [...otp]
    newOtp[index] = value.replace(/\D/g, '').slice(-1)
    setOtp(newOtp)

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }

    if (newOtp.join('').length === 6) {
      verifyOTP()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onClose={onClose} className="max-w-sm">
      <DialogHeader onClose={onClose}>
        <DialogTitle className="text-center flex items-center justify-center gap-2">
          <PhoneIcon className="w-5 h-5 text-emerald-400" />
          {step === 'success' ? 'Verified!' : 'Phone Verification'}
        </DialogTitle>
      </DialogHeader>
      <DialogContent>
        {step === 'phone' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-3xl">📱</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Enter your phone number to receive an OTP
            </p>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4">
              <p className="text-2xl font-bold text-emerald-400">+₨3</p>
              <p className="text-xs text-gray-400">Instant Bonus</p>
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="03XX XXXXXXX"
              className="w-full px-4 py-3 rounded-xl bg-dark-300 border border-dark-100 text-white text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        )}

        {step === 'otp' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-3xl">🔐</span>
            </div>
            <p className="text-sm text-gray-400 mb-2">
              OTP sent to
            </p>
            <p className="text-white font-medium mb-3">{phone}</p>
            
            {/* Demo OTP Display */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4">
              <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-1">Your OTP Code (Demo)</p>
              <p className="text-2xl font-bold text-amber-400 tracking-widest">{sentOtp}</p>
              <p className="text-[10px] text-gray-500 mt-1">Enter this code below</p>
            </div>

            <div className="flex justify-center gap-2 mb-4">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (otpInputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-10 h-12 rounded-xl bg-dark-300 border border-dark-100 text-white text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              ))}
            </div>

            {countdown > 0 ? (
              <p className="text-xs text-gray-500">Resend OTP in {countdown}s</p>
            ) : (
              <button
                onClick={sendOTP}
                className="text-xs text-emerald-400 hover:text-emerald-300"
              >
                Resend OTP
              </button>
            )}
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center animate-bounce">
              <CheckIcon className="w-10 h-10 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-white mb-2">Bonus Added!</p>
            <p className="text-3xl font-bold text-emerald-400">+₨3</p>
            <p className="text-sm text-gray-400 mt-2">Phone verified successfully</p>
          </div>
        )}
      </DialogContent>
      <DialogFooter>
        {step === 'phone' && (
          <>
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-dark-300 text-gray-400 font-medium">
              Cancel
            </button>
            <button
              onClick={sendOTP}
              disabled={loading || phone.length < 10}
              className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-semibold disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </>
        )}

        {step === 'otp' && (
          <button
            onClick={verifyOTP}
            disabled={loading || otp.join('').length < 6}
            className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        )}
      </DialogFooter>
    </Dialog>
  )
}

// Transaction History Modal
function TransactionHistoryModal({ open, onClose }) {
  const { user } = useAuth()
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && user?.id) {
      fetchTransactions()
    }
  }, [open, user?.id])

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)
      setTxns(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'deposit': return 'text-emerald-400'
      case 'withdrawal': return 'text-red-400'
      case 'bonus': return 'text-yellow-400'
      case 'win': return 'text-purple-400'
      default: return 'text-gray-400'
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onClose={onClose} className="max-w-md">
      <DialogHeader onClose={onClose}>
        <DialogTitle className="flex items-center gap-2">
          <ClockIcon className="w-5 h-5 text-blue-400" />
          Transaction History
        </DialogTitle>
      </DialogHeader>
      <DialogContent className="max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : txns.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <WalletIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {txns.map((tx) => (
              <div key={tx.id} className="p-3 rounded-xl bg-dark-300/50 border border-dark-100">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-300 capitalize">{tx.type}</p>
                    <p className="text-xs text-gray-500">{tx.description || tx.note || '-'}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${getTypeColor(tx.type)}`}>
                      {Number(tx.amount) >= 0 ? '+' : '-'}₨{Math.abs(Number(tx.amount)).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Offers Modal
function OffersModal({ open, onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (!open) return null

  return (
    <Dialog open={open} onClose={onClose} className="max-w-md">
      <DialogHeader onClose={onClose}>
        <DialogTitle className="flex items-center gap-2">
          <GiftIcon className="w-5 h-5 text-pink-400" />
          Offers & Bonuses
        </DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div className="text-center py-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-pink-500/20 flex items-center justify-center">
            <GiftIcon className="w-10 h-10 text-pink-400" />
          </div>
          <p className="text-gray-400 mb-4">View all available offers and bonuses</p>
          <button
            onClick={() => { onClose(); navigate('/offers') }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold"
          >
            View All Offers
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Notifications Modal
function NotificationsModal({ open, onClose }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useTheme()
  
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'withdrawal':
        return <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-400" />
      case 'bonus':
        return <GiftIcon className="w-5 h-5 text-yellow-400" />
      case 'system':
        return <BellIcon className="w-5 h-5 text-blue-400" />
      case 'admin':
        return <ExclamationTriangleIcon className="w-5 h-5 text-purple-400" />
      default:
        return <BellIcon className="w-5 h-5 text-gray-400" />
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  if (!open) return null

  return (
    <Dialog open={open} onClose={onClose} className="max-w-md">
      <DialogHeader onClose={onClose}>
        <DialogTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellIcon className="w-5 h-5 text-emerald-400" />
            Notifications
          </div>
          {unreadCount > 0 && (
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </DialogTitle>
      </DialogHeader>
      <DialogContent className="max-h-[60vh] overflow-y-auto p-0">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <BellIcon className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-50" />
            <p className="text-gray-400">No notifications yet</p>
            <p className="text-xs text-gray-500 mt-1">You'll see updates about your account here</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-100">
            {notifications.slice(0, 20).map((notif) => (
              <button
                key={notif.id}
                onClick={() => markAsRead(notif.id)}
                className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-dark-400/30 transition-colors text-left ${
                  !notif.read ? 'bg-emerald-500/5' : ''
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200">{notif.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                  <p className="text-[10px] text-gray-600 mt-1">{formatTime(notif.timestamp)}</p>
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-2" />
                )}
              </button>
            ))}
          </div>
        )}
        {notifications.length > 0 && unreadCount > 0 && (
          <div className="p-3 border-t border-dark-100">
            <button
              onClick={markAllAsRead}
              className="w-full py-2 text-sm text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Mark all as read
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

