import express from 'express'
import { supabase } from '../lib/supabase.js'

const router = express.Router()

const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

// System prompt for the AI withdrawal assistant
const SYSTEM_PROMPT = `You are an AI withdrawal management assistant for a betting platform. You can help admins manage withdrawals by:

1. **Querying withdrawals**: "show pending withdrawals", "list withdrawals for user X", "show withdrawals over 500"
2. **Approving withdrawals**: "approve withdrawal ID abc-123", "approve all withdrawals under 500"
3. **Rejecting withdrawals**: "reject withdrawal ID abc-123 with reason 'suspicious activity'"
4. **Getting statistics**: "how many pending withdrawals", "total withdrawal amount today"
5. **User info**: "show withdrawal history for user X", "check user X's balance"

Rules:
- Always respond in a professional, concise manner
- When approving/rejecting, you must return the exact action in JSON format at the end of your response
- For queries, return the data in a readable format
- Never approve withdrawals over 10,000 without manual confirmation
- Flag any suspicious patterns (multiple withdrawals in short time, unusual amounts)

When performing actions, end your response with:
\`\`\`json
{
  "action": "approve" | "reject" | "query",
  "ids": ["withdrawal-id-1", "withdrawal-id-2"],
  "reason": "optional reason for rejection"
}
\`\`\`

For queries, end with:
\`\`\`json
{
  "action": "query",
  "query_type": "pending" | "user" | "amount" | "stats"
}
\`\`\``

// AI withdrawal assistant endpoint
router.post('/assistant', async (req, res) => {
  const { message, adminId, adminUsername } = req.body

  if (!message) {
    return res.status(400).json({ error: 'Message is required' })
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({ 
      error: 'Groq API key not configured',
      response: 'AI assistant is not available. Please configure GROQ_API_KEY environment variable.'
    })
  }

  try {
    // Get current withdrawal stats for context
    const { data: pendingWithdrawals } = await supabase
      .from('withdrawals')
      .select('id, user_id, amount, method, created_at, users(username)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10)

    const { data: stats } = await supabase
      .from('withdrawals')
      .select('status, amount')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const pendingCount = stats?.filter(s => s.status === 'pending').length || 0
    const totalPending = stats?.filter(s => s.status === 'pending').reduce((sum, s) => sum + Number(s.amount), 0) || 0

    const context = `
Current withdrawal stats (last 24h):
- Pending: ${pendingCount} withdrawals, Total: ₨${totalPending.toLocaleString()}

Recent pending withdrawals:
${pendingWithdrawals?.map(w => `- ID: ${w.id}, User: ${w.users?.username}, Amount: ₨${w.amount}, Method: ${w.method}`).join('\n') || 'None'}
`

    // Call Groq API
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `${context}\n\nUser command: ${message}` }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    })

    const groqData = await response.json()
    
    if (!response.ok) {
      console.error('[AI/withdrawal] Groq API error:', groqData)
      return res.status(500).json({ error: 'AI service error' })
    }

    const aiResponse = groqData.choices?.[0]?.message?.content || 'No response from AI'

    // Parse action from AI response
    let action = null
    const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/)
    if (jsonMatch) {
      try {
        action = JSON.parse(jsonMatch[1])
      } catch (e) {
        console.error('[AI/withdrawal] Failed to parse action:', e)
      }
    }

    // Execute action if applicable
    let executionResult = null
    if (action && action.ids && action.ids.length > 0) {
      const now = new Date().toISOString()
      
      for (const id of action.ids) {
        if (action.action === 'approve') {
          await supabase
            .from('withdrawals')
            .update({ status: 'approved', processed_at: now, updated_at: now })
            .eq('id', id)

          await supabase
            .from('audit_logs')
            .insert({
              actor_type: 'admin',
              actor_id: adminId || 'ai-agent',
              actor_username: adminUsername || 'ai-assistant',
              action: 'approve_withdrawal',
              target_type: 'withdrawal',
              target_id: id,
              details: { approved_by: 'ai-assistant', admin: adminUsername },
              severity: 'info',
              success: true,
              timestamp: now
            })
            .catch(() => {})
        } else if (action.action === 'reject') {
          const { data: withdrawal } = await supabase
            .from('withdrawals')
            .select('*, users(username)')
            .eq('id', id)
            .single()

          if (withdrawal) {
            await supabase
              .from('withdrawals')
              .update({ status: 'rejected', processed_at: now, updated_at: now, rejection_reason: action.reason || 'Rejected by AI assistant' })
              .eq('id', id)

            // Refund balance
            const { data: user } = await supabase
              .from('users')
              .select('balance')
              .eq('id', withdrawal.user_id)
              .single()

            if (user) {
              await supabase
                .from('users')
                .update({ balance: Number(user.balance) + withdrawal.amount, updated_at: now })
                .eq('id', withdrawal.user_id)
            }

            await supabase
              .from('audit_logs')
              .insert({
                actor_type: 'admin',
                actor_id: adminId || 'ai-agent',
                actor_username: adminUsername || 'ai-assistant',
                action: 'reject_withdrawal',
                target_type: 'withdrawal',
                target_id: id,
                target_username: withdrawal.users?.username,
                details: { rejected_by: 'ai-assistant', reason: action.reason, admin: adminUsername },
                severity: 'warning',
                success: true,
                timestamp: now
              })
              .catch(() => {})
          }
        }
      }

      executionResult = { executed: true, action: action.action, ids: action.ids }
    }

    // Log the AI interaction
    await supabase
      .from('audit_logs')
      .insert({
        actor_type: 'admin',
        actor_id: adminId || 'ai-agent',
        actor_username: adminUsername || 'ai-assistant',
        action: 'ai_withdrawal_query',
        details: { message, ai_response: aiResponse.substring(0, 500), action_executed: executionResult },
        severity: 'info',
        success: true,
        timestamp: now
      })
      .catch(() => {})

    res.json({
      success: true,
      response: aiResponse,
      action: action,
      execution: executionResult
    })
  } catch (err) {
    console.error('[AI/withdrawal] Exception:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get withdrawal statistics for AI context
router.get('/stats', async (req, res) => {
  try {
    const { data: pending } = await supabase
      .from('withdrawals')
      .select('id, user_id, amount, method, created_at, status, users(username)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    const { data: todayStats } = await supabase
      .from('withdrawals')
      .select('status, amount')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const stats = {
      pending: pending || [],
      pending_count: pending?.length || 0,
      pending_total: pending?.reduce((sum, w) => sum + Number(w.amount), 0) || 0,
      today_approved: todayStats?.filter(s => s.status === 'approved').length || 0,
      today_rejected: todayStats?.filter(s => s.status === 'rejected').length || 0,
      today_total_amount: todayStats?.reduce((sum, s) => sum + Number(s.amount), 0) || 0
    }

    res.json(stats)
  } catch (err) {
    console.error('[AI/withdrawal/stats] Error:', err.message)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

export default router
