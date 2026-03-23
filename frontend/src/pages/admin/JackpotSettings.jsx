import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../../components/ui/Dialog'
import { Button, FormField, Input, Badge } from '../../components/ui/FormElements'
import { Trophy, TrendingUp, RefreshCcw, Plus, Pencil, X, Check } from 'lucide-react'

async function getJackpotTiers() {
  const { data, error } = await supabase
    .from('jackpot_tiers')
    .select('*')
    .order('seed_amount', { ascending: true })
  if (error) throw error
  return data || []
}

async function updateJackpotTier(id, updates) {
  const { data, error } = await supabase
    .from('jackpot_tiers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

async function seedJackpot(id) {
  const { data: tier, error: fetchError } = await supabase
    .from('jackpot_tiers')
    .select('seed_amount')
    .eq('id', id)
    .single()
  if (fetchError) throw fetchError

  const { data, error } = await supabase
    .from('jackpot_tiers')
    .update({ current_amount: tier.seed_amount, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

const TIER_COLORS = {
  mini: { bg: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30', text: 'text-blue-400', icon: '💎' },
  minor: { bg: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/30', text: 'text-purple-400', icon: '🌟' },
  major: { bg: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: '🏆' },
  grand: { bg: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/30', text: 'text-rose-400', icon: '👑' },
}

function EditModal({ tier, open, onClose, onSuccess }) {
  const [name, setName] = useState(tier?.name || '')
  const [seedAmount, setSeedAmount] = useState(tier?.seed_amount || '')
  const [incrementPercent, setIncrementPercent] = useState(tier?.increment_percent || '')
  const [isActive, setIsActive] = useState(tier?.is_active ?? true)

  const mutation = useMutation({
    mutationFn: () => updateJackpotTier(tier.id, {
      name,
      seed_amount: parseFloat(seedAmount),
      increment_percent: parseFloat(incrementPercent),
      is_active: isActive,
    }),
    onSuccess: () => {
      toast.success('Jackpot tier updated')
      onSuccess()
      onClose()
    },
    onError: (e) => toast.error(e.message),
  })

  if (!tier) return null

  return (
    <Dialog open={open} onClose={onClose} className="max-w-md">
      <DialogHeader onClose={onClose}>
        <DialogTitle>Edit Jackpot Tier</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div className="space-y-4">
          <FormField label="Tier Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mini, Minor, Major, Grand"
            />
          </FormField>
          <FormField label="Seed Amount ($)">
            <Input
              type="number"
              value={seedAmount}
              onChange={(e) => setSeedAmount(e.target.value)}
              placeholder="Starting amount"
            />
          </FormField>
          <FormField label="Increment % Per Bet" hint="e.g. 0.5 = 0.5% of each bet goes to jackpot">
            <Input
              type="number"
              step="0.01"
              value={incrementPercent}
              onChange={(e) => setIncrementPercent(e.target.value)}
              placeholder="e.g. 0.5"
            />
          </FormField>
          <FormField label="Status">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                isActive ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-slate-800/50 border-slate-700/50'
              }`}
            >
              <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-slate-300'}`}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
              <div className={`relative w-11 h-6 rounded-full transition-colors ${isActive ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-5' : ''}`} />
              </div>
            </button>
          </FormField>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

export default function JackpotSettings() {
  const qc = useQueryClient()
  const [editTier, setEditTier] = useState(null)

  const { data: tiers = [], isLoading } = useQuery({
    queryKey: ['jackpot-tiers'],
    queryFn: getJackpotTiers,
  })

  const seedMutation = useMutation({
    mutationFn: seedJackpot,
    onSuccess: () => {
      toast.success('Jackpot reset to seed amount')
      qc.invalidateQueries({ queryKey: ['jackpot-tiers'] })
    },
    onError: (e) => toast.error(e.message),
  })

  const totalPool = tiers.reduce((sum, t) => sum + Number(t.current_amount || 0), 0)
  const totalSeeds = tiers.reduce((sum, t) => sum + Number(t.seed_amount || 0), 0)
  const growthPercent = totalSeeds > 0 ? (((totalPool - totalSeeds) / totalSeeds) * 100).toFixed(1) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Jackpot Settings</h2>
          <p className="text-slate-400 mt-1">Manage jackpot tiers, seed amounts, and growth rates</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Pool</p>
              <p className="text-xl font-bold text-white">${totalPool.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Growth</p>
              <p className="text-xl font-bold text-emerald-400">+{growthPercent}%</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Active Tiers</p>
              <p className="text-xl font-bold text-white">{tiers.filter(t => t.is_active).length} / {tiers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-4">
          {tiers.map((tier) => {
            const colors = TIER_COLORS[tier.id] || { bg: 'from-slate-500/20 to-slate-600/10', border: 'border-slate-500/30', text: 'text-slate-400', icon: '🎰' }
            const growth = Number(tier.current_amount || 0) - Number(tier.seed_amount || 0)
            const growthPct = Number(tier.seed_amount || 0) > 0
              ? ((growth / Number(tier.seed_amount || 0)) * 100).toFixed(1)
              : 0

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-gradient-to-r ${colors.bg} border ${colors.border} rounded-2xl p-6`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{colors.icon}</span>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                        {tier.is_active ? (
                          <Badge variant="emerald">Active</Badge>
                        ) : (
                          <Badge variant="red">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-bold text-white">
                          ${Number(tier.current_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-sm text-slate-400">
                          Seed: ${Number(tier.seed_amount || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`text-sm font-medium ${growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {growth >= 0 ? '+' : ''}{growth.toFixed(2)} ({growthPct}%)
                        </span>
                        <span className="text-sm text-slate-500">
                          +{Number(tier.increment_percent || 0)}% per bet
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => seedMutation.mutate(tier.id)}
                      disabled={seedMutation.isPending}
                      className="border-slate-600 text-slate-300 hover:text-white hover:border-slate-500"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                      Reset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditTier(tier)}
                      className="border-slate-600 text-slate-300 hover:text-white hover:border-slate-500"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="w-full h-2 bg-slate-800/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${colors.bg.replace('/20', '').replace('/10', '-500')} rounded-full`}
                      style={{
                        width: `${Math.min(100, Math.max(5, (Number(tier.current_amount) / (Number(tier.seed_amount) * 3)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {editTier && (
        <EditModal
          tier={editTier}
          open={!!editTier}
          onClose={() => setEditTier(null)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['jackpot-tiers'] })}
        />
      )}
    </div>
  )
}
