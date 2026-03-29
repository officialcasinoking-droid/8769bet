import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { Button, FormField, Input, Badge } from '../components/ui/FormElements'
import { Bell, Plus, Pencil, Trash2, Save, Rocket } from 'lucide-react'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../components/ui/Dialog'

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

async function getLandingRow() {
  const { data, error } = await supabase
    .from('landing_content')
    .select('draft_json, live_json, updated_at')
    .eq('id', 'main')
    .single()
  if (error) return null
  return data
}

async function saveDraftContent(draftJson) {
  const { error } = await supabase
    .from('landing_content')
    .update({ draft_json: draftJson, updated_at: new Date().toISOString() })
    .eq('id', 'main')
  if (error) throw error
}

async function publishLive(draftJson) {
  const { error } = await supabase
    .from('landing_content')
    .update({ live_json: draftJson, draft_json: draftJson, updated_at: new Date().toISOString() })
    .eq('id', 'main')
  if (error) throw error
}

export default function AnnouncementsPage() {
  const qc = useQueryClient()
  const [editAnn, setEditAnn] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newText, setNewText] = useState('')
  const [newExpiry, setNewExpiry] = useState('')

  const { data: landingRow, isLoading } = useQuery({
    queryKey: ['admin-landing-announcements'],
    queryFn: getLandingRow,
  })

  const draftData = landingRow?.draft_json || {}
  const liveData = landingRow?.live_json || {}
  const announcements = draftData?.announcements || []
  const hasDraft = JSON.stringify(draftData) !== JSON.stringify(liveData)

  const saveMutation = useMutation({
    mutationFn: async (newAnnouncements) => {
      const updatedDraft = { ...draftData, announcements: newAnnouncements }
      await saveDraftContent(updatedDraft)
    },
    onSuccess: () => {
      toast.success('Announcements saved as draft')
      qc.invalidateQueries({ queryKey: ['admin-landing-announcements'] })
    },
    onError: (e) => toast.error(e.message),
  })

  const publishMutation = useMutation({
    mutationFn: async () => {
      await publishLive(draftData)
    },
    onSuccess: () => {
      toast.success('Announcements published!')
      qc.invalidateQueries({ queryKey: ['admin-landing-announcements'] })
      qc.invalidateQueries({ queryKey: ['landing-content'] })
    },
    onError: (e) => toast.error(e.message),
  })

  const deleteAnn = (id) => {
    const updated = announcements.filter(a => a.id !== id)
    saveMutation.mutate(updated)
  }

  const addAnn = () => {
    if (!newText.trim()) return toast.error('Enter announcement text')
    const ann = {
      id: generateId(),
      text: newText.trim(),
      expiry: newExpiry || '2026-12-31',
    }
    saveMutation.mutate([...announcements, ann])
    setNewText('')
    setNewExpiry('')
    setShowAdd(false)
  }

  const saveEdit = () => {
    if (!editAnn.text.trim()) return toast.error('Enter announcement text')
    const updated = announcements.map(a => a.id === editAnn.id ? editAnn : a)
    saveMutation.mutate(updated)
    setEditAnn(null)
  }

  const today = new Date()
  const active = announcements.filter(a => new Date(a.expiry) >= today)
  const expired = announcements.filter(a => new Date(a.expiry) < today)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Announcements</h2>
          <p className="text-slate-400 mt-1">Manage homepage announcements and ticker messages</p>
        </div>
        <div className="flex items-center gap-2">
          {hasDraft && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
            >
              <Rocket className="w-4 h-4" />
              Publish
            </Button>
          )}
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" />
            Add Announcement
          </Button>
        </div>
      </div>

      {hasDraft && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          <p className="text-sm text-amber-400">You have unpublished changes.</p>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-amber-400 hover:text-amber-300"
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending}
          >
            <Save className="w-3.5 h-3.5" />
            Publish Now
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : (
        <>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Active ({active.length})
            </h3>
            {active.length === 0 && (
              <p className="text-sm text-slate-500 py-4">No active announcements</p>
            )}
            {active.map((ann) => (
              <motion.div
                key={ann.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{ann.text}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Expires: {new Date(ann.expiry).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditAnn(ann)}
                    className="text-slate-400 hover:text-white"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteAnn(ann.id)}
                    className="text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>

          {expired.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Expired ({expired.length})
              </h3>
              {expired.map((ann) => (
                <div
                  key={ann.id}
                  className="flex items-center gap-4 p-4 bg-slate-800/20 border border-slate-800 rounded-xl opacity-60"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-400 font-medium line-through">{ann.text}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Expired: {new Date(ann.expiry).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteAnn(ann.id)}
                    className="text-slate-600 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} className="max-w-lg">
        <DialogHeader onClose={() => setShowAdd(false)}>
          <DialogTitle>Add Announcement</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <FormField label="Message">
              <Input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="e.g. New users get 100% bonus on first deposit!"
              />
            </FormField>
            <FormField label="Expiry Date" hint="Leave empty for no expiry">
              <Input
                type="date"
                value={newExpiry}
                onChange={(e) => setNewExpiry(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </FormField>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button onClick={addAnn} disabled={saveMutation.isPending}>Add</Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={!!editAnn} onClose={() => setEditAnn(null)} className="max-w-lg">
        <DialogHeader onClose={() => setEditAnn(null)}>
          <DialogTitle>Edit Announcement</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <FormField label="Message">
              <Input
                value={editAnn?.text || ''}
                onChange={(e) => setEditAnn({ ...editAnn, text: e.target.value })}
              />
            </FormField>
            <FormField label="Expiry Date">
              <Input
                type="date"
                value={editAnn?.expiry || ''}
                onChange={(e) => setEditAnn({ ...editAnn, expiry: e.target.value })}
              />
            </FormField>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditAnn(null)}>Cancel</Button>
          <Button onClick={saveEdit} disabled={saveMutation.isPending}>Save</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
