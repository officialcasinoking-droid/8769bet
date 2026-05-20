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

  try {
    // Get current withdrawal stats for context
    const { data: pendingWithdrawals, error: pendingError } = await supabase
      .from('withdrawals')
      .select('id, user_id, amount, method, created_at, users(username)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10)

    if (pendingError) {
      console.error('[AI/withdrawal] Pending fetch error:', pendingError.message)
    }

    const { data: stats, error: statsError } = await supabase
      .from('withdrawals')
      .select('status, amount')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (statsError) {
      console.error('[AI/withdrawal] Stats fetch error:', statsError.message)
    }

    const pendingCount = stats?.filter(s => s.status === 'pending').length || 0
    const totalPending = stats?.filter(s => s.status === 'pending').reduce((sum, s) => sum + Number(s.amount), 0) || 0

    const context = `
Current withdrawal stats (last 24h):
- Pending: ${pendingCount} withdrawals, Total: ₨${totalPending.toLocaleString()}

Recent pending withdrawals:
${pendingWithdrawals?.map(w => `- ID: ${w.id}, User: ${w.users?.username || 'Unknown'}, Amount: ₨${w.amount}, Method: ${w.method}`).join('\n') || 'None'}
`

    // Check if Groq API key is configured
    if (!GROQ_API_KEY) {
      console.warn('[AI/withdrawal] Groq API key not configured, using rule-based fallback')
      // Use simple rule-based response as fallback
      const lowerMsg = message.toLowerCase()
      let response = ''
      let action = null

      if (lowerMsg.includes('pending')) {
        response = `Here are the current pending withdrawals:\n\n`
        if (pendingWithdrawals && pendingWithdrawals.length > 0) {
          pendingWithdrawals.forEach(w => {
            response += `• **ID:** \`${w.id}\` | **User:** ${w.users?.username || 'Unknown'} | **Amount:** ₨${w.amount} | **Method:** ${w.method}\n`
          })
          response += `\nTotal pending: **${pendingCount}** withdrawals worth **₨${totalPending.toLocaleString()}**`
        } else {
          response += `No pending withdrawals at this time.`
        }
        action = { action: 'query', query_type: 'pending' }
      } else if (lowerMsg.includes('stat') || lowerMsg.includes('today')) {
        response = `**Today's Withdrawal Statistics (24h):**\n\n`
        response += `• Pending: ${pendingCount}\n`
        response += `• Total Pending Amount: ₨${totalPending.toLocaleString()}\n`
        response += `• Approved: ${stats?.filter(s => s.status === 'approved').length || 0}\n`
        response += `• Rejected: ${stats?.filter(s => s.status === 'rejected').length || 0}\n`
        response += `• Total Amount: ₨${stats?.reduce((sum, s) => sum + Number(s.amount), 0).toLocaleString() || 0}`
        action = { action: 'query', query_type: 'stats' }
      } else if (lowerMsg.includes('approve') && lowerMsg.includes('under')) {
        const amountMatch = lowerMsg.match(/under\s*(\d+)/)
        const threshold = amountMatch ? parseInt(amountMatch[1]) : 500
        
        const smallPending = pendingWithdrawals?.filter(w => Number(w.amount) < threshold) || []
        
        if (smallPending.length === 0) {
          response = `No pending withdrawals under ₨${threshold.toLocaleString()}.`
        } else {
          response = `Found ${smallPending.length} pending withdrawal(s) under ₨${threshold.toLocaleString()}:\n\n`
          smallPending.forEach(w => {
            response += `• \`${w.id}\` - ${w.users?.username || 'Unknown'} - ₨${w.amount}\n`
          })
          response += `\nTo approve these, use: "approve withdrawals ${smallPending.map(w => w.id).join(', ')}"`
        }
        action = { action: 'query', query_type: 'amount' }
      } else if (lowerMsg.includes('approve')) {
        // Try to extract IDs from message
        const idPattern = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi
        const foundIds = message.match(idPattern) || []
        
        if (foundIds.length > 0) {
          response = `Ready to approve ${foundIds.length} withdrawal(s). Confirm with: "yes, approve"`
          action = { action: 'approve', ids: foundIds }
        } else {
          response = `Please specify the withdrawal ID(s) to approve. Example: "approve withdrawal abc123..."`
        }
      } else if (lowerMsg.includes('reject')) {
        const idPattern = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi
        const foundIds = message.match(idPattern) || []
        const reasonMatch = message.match(/reason[:\s]+['"](.+?)['"]/i)
        const reason = reasonMatch ? reasonMatch[1] : 'Rejected by admin'
        
        if (foundIds.length > 0) {
          response = `Ready to reject ${foundIds.length} withdrawal(s). Reason: "${reason}". Confirm with: "yes, reject"`
          action = { action: 'reject', ids: foundIds, reason }
        } else {
          response = `Please specify the withdrawal ID(s) to reject. Example: "reject withdrawal abc123... with reason 'fraud'"`
        }
      } else {
        response = `I can help you with:\n\n`
        response += `• **"Show pending withdrawals"** - List all pending withdrawals\n`
        response += `• **"Today's stats"** - View today's withdrawal statistics\n`
        response += `• **"Approve all under 500"** - Find small withdrawals to approve\n`
        response += `• **"Approve withdrawal [ID]"** - Approve a specific withdrawal\n`
        response += `• **"Reject withdrawal [ID] with reason '...'"** - Reject with reason`
        action = { action: 'query', query_type: 'help' }
      }

      return res.json({
        success: true,
        response,
        action,
        execution: null
      })
    }

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
      return res.json({ 
        success: false,
        response: `AI service error: ${groqData.error?.message || 'Failed to get AI response'}`
      })
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
          const { error: approveError } = await supabase
            .from('withdrawals')
            .update({ status: 'approved', processed_at: now })
            .eq('id', id)

          if (approveError) {
            console.error('[AI/withdrawal] Approve error:', approveError.message)
          } else {
            const { error: auditError } = await supabase
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

            if (auditError) {
              console.error('[AI/withdrawal] Audit log error:', auditError.message)
            }
          }
        } else if (action.action === 'reject') {
          const { data: withdrawal, error: fetchError } = await supabase
            .from('withdrawals')
            .select('*, users(username)')
            .eq('id', id)
            .single()

          if (fetchError || !withdrawal) {
            console.error('[AI/withdrawal] Withdrawal fetch error:', fetchError?.message)
            continue
          }

          const { error: rejectError } = await supabase
            .from('withdrawals')
            .update({ status: 'rejected', processed_at: now, rejection_reason: action.reason || 'Rejected by AI assistant' })
            .eq('id', id)

          if (rejectError) {
            console.error('[AI/withdrawal] Reject error:', rejectError.message)
          } else {
            // Refund balance
            const { data: user, error: userError } = await supabase
              .from('users')
              .select('balance')
              .eq('id', withdrawal.user_id)
              .single()

            if (!userError && user) {
              const { error: balanceError } = await supabase
                .from('users')
                .update({ balance: Number(user.balance) + withdrawal.amount })
                .eq('id', withdrawal.user_id)
              
              if (balanceError) {
                console.error('[AI/withdrawal] Balance refund error:', balanceError.message)
              }
            }

            const { error: auditError } = await supabase
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

            if (auditError) {
              console.error('[AI/withdrawal] Audit log error:', auditError.message)
            }
          }
        }
      }

      executionResult = { executed: true, action: action.action, ids: action.ids }
    }

    // Log the AI interaction
    const logTimestamp = new Date().toISOString()
    const { error: logError } = await supabase
      .from('audit_logs')
      .insert({
        actor_type: 'admin',
        actor_id: adminId || 'ai-agent',
        actor_username: adminUsername || 'ai-assistant',
        action: 'ai_withdrawal_query',
        details: { message, ai_response: aiResponse.substring(0, 500), action_executed: executionResult },
        severity: 'info',
        success: true,
        timestamp: logTimestamp
      })

    if (logError) {
      console.error('[AI/withdrawal] Log error:', logError.message)
    }

    res.json({
      success: true,
      response: aiResponse,
      action: action,
      execution: executionResult
    })
  } catch (err) {
    console.error('[AI/withdrawal] Exception:', err.message, err.stack)
    res.status(500).json({ error: `Internal server error: ${err.message}` })
  }
})

// Get withdrawal statistics for AI context
router.get('/stats', async (req, res) => {
  try {
    const { data: pending, error: pendingError } = await supabase
      .from('withdrawals')
      .select('id, user_id, amount, method, created_at, status, users(username)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (pendingError) {
      console.error('[AI/withdrawal/stats] Pending error:', pendingError.message)
    }

    const { data: todayStats, error: statsError } = await supabase
      .from('withdrawals')
      .select('status, amount')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (statsError) {
      console.error('[AI/withdrawal/stats] Stats error:', statsError.message)
    }

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
