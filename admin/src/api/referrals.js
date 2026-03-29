import { supabase } from '../lib/supabase'

// ── User Context ─────────────────────────────────────────────
export async function getUserContext(userId, localUser = null) {
  if (localUser) {
    return {
      username: localUser.username || 'Guest',
      email: localUser.email || '',
      balance: Number(localUser.balance || 0),
      accountAge: 0,
      recentTx: 0,
      recentTxList: 'No recent transactions',
      recentBonuses: 0,
      totalBonuses: 0,
      bonusList: 'No bonuses received',
      referralEarnings: 0,
      referralStatus: 'none',
    }
  }

  try {
    const [userRes, txRes, bonusRes, refRes] = await Promise.all([
      supabase.from('users').select('username, email, balance, created_at').eq('id', userId).single(),
      supabase.from('transactions').select('type, amount, status, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
      supabase.from('bonuses').select('amount, type, created_at').eq('user_id', userId).eq('status', 'paid').order('created_at', { ascending: false }).limit(3),
      supabase.from('referrals').select('bonus_paid, status').eq('referred_id', userId).single(),
    ])

    const user = userRes.data
    const txs = txRes.data || []
    const bonuses = bonusRes.data || []
    const ref = refRes.data

    const recentTxList = txs.map(t =>
      `${t.type} $${Number(t.amount).toFixed(2)} (${t.status}) - ${new Date(t.created_at).toLocaleDateString()}`
    ).join('; ') || 'No recent transactions'

    const bonusList = bonuses.map(b =>
      `$${Number(b.amount).toFixed(2)} ${b.type} bonus - ${new Date(b.created_at).toLocaleDateString()}`
    ).join('; ') || 'No bonuses received'

    return {
      username: user?.username || 'Unknown',
      email: user?.email || '',
      balance: Number(user?.balance || 0),
      accountAge: user?.created_at ? Math.floor((Date.now() - new Date(user.created_at)) / (1000 * 60 * 60 * 24)) : 0,
      recentTx: txs.length,
      recentTxList,
      recentBonuses: bonuses.length,
      totalBonuses: bonuses.reduce((s, b) => s + Number(b.amount), 0),
      bonusList,
      referralEarnings: Number(ref?.bonus_paid || 0),
      referralStatus: ref?.status || 'none',
    }
  } catch {
    return {
      username: 'Unknown',
      email: '',
      balance: 0,
      accountAge: 0,
      recentTx: 0,
      recentTxList: 'No recent transactions',
      recentBonuses: 0,
      totalBonuses: 0,
      bonusList: 'No bonuses received',
      referralEarnings: 0,
      referralStatus: 'none',
    }
  }
}

export async function getUsers() {
  const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false })
  if (error) return []
  return data || []
}

// ── Platform Settings ─────────────────────────────────────────
export async function getPlatformSettings() {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('id', 'main')
      .single()
    if (error) return null
    return data
  } catch {
    return null
  }
}

// ── Process Referral Signup Bonus ─────────────────────────────────────────
export async function processReferralSignup(newUserId, referrerUsername) {
  if (!referrerUsername) return null
  
  try {
    const settings = await getPlatformSettings()
    const referralBonus = settings?.referral_signup_bonus || 50
    
    const { data: referrer } = await supabase
      .from('users')
      .select('id, username, balance, referral_earnings')
      .eq('username', referrerUsername)
      .single()
    
    if (!referrer) return null
    
    const bonusAmount = Number(referralBonus)
    
    await supabase.from('bonuses').insert({
      user_id: referrer.id,
      amount: bonusAmount,
      type: 'referral_signup',
      status: 'paid',
      reason: `Referral bonus for ${referrerUsername}'s signup`,
      is_withdrawable: false,
      processed_at: new Date().toISOString(),
    })
    
    const { data: updatedUser } = await supabase
      .from('users')
      .select('balance')
      .eq('id', referrer.id)
      .single()
    
    const newBalance = Number(updatedUser?.balance || 0) + bonusAmount
    
    await supabase
      .from('users')
      .update({ 
        balance: newBalance,
        referral_earnings: (Number(referrer.referral_earnings) || 0) + bonusAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', referrer.id)
    
    await supabase.from('transactions').insert({
      user_id: referrer.id,
      type: 'referral_bonus',
      amount: bonusAmount,
      status: 'completed',
      description: `Referral signup bonus from ${referrerUsername}`,
    })
    
    return { referrer_id: referrer.id, amount: bonusAmount }
  } catch {
    return null
  }
}

// ── Referrals ────────────────────────────────────────────────
export async function getReferrals() {
  const [refsRes, usersRes] = await Promise.all([
    supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('users')
      .select('id, username, email'),
  ])
  if (refsRes.error) return []
  const refs = refsRes.data || []
  const users = usersRes.data || []
  const userMap = Object.fromEntries(users.map(u => [u.id, u]))
  return refs.map(r => ({
    ...r,
    referrer: userMap[r.referrer_id] || null,
    referred: userMap[r.referred_id] || null,
  }))
}

export async function getReferralTree(referrerId) {
  const [refsRes, usersRes] = await Promise.all([
    supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', referrerId)
      .order('level', { ascending: true }),
    supabase
      .from('users')
      .select('id, username, email, created_at, balance'),
  ])
  if (refsRes.error) return []
  const refs = refsRes.data || []
  const users = usersRes.data || []
  const userMap = Object.fromEntries(users.map(u => [u.id, u]))
  return refs.map(r => ({
    ...r,
    referred: userMap[r.referred_id] || null,
  }))
}

export async function payReferralBonus(referralId, amount, reason) {
  const { data: ref, error: refError } = await supabase
    .from('referrals')
    .select('referred_id, bonus_paid')
    .eq('id', referralId)
    .single()
  if (refError || !ref) throw new Error('Referral not found')

  const { data: bonus, error: bonusError } = await supabase
    .from('bonuses')
    .insert({
      user_id: ref.referred_id,
      amount,
      type: 'referral',
      status: 'paid',
      reason: reason || 'Referral bonus',
      processed_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (bonusError) throw bonusError

  const { error: updateRefError } = await supabase
    .from('referrals')
    .update({ bonus_paid: (ref.bonus_paid || 0) + Number(amount) })
    .eq('id', referralId)
  if (updateRefError) throw updateRefError

  return bonus
}

export async function revokeReferral(referralId) {
  const { data, error } = await supabase
    .from('referrals')
    .update({ status: 'revoked' })
    .eq('id', referralId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Bonuses ──────────────────────────────────────────────────
export async function getBonuses() {
  const { data, error } = await supabase
    .from('bonuses')
    .select('*, user:users(username, email)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return []
  return data || []
}

export async function getBonusesByUser(userId) {
  const { data, error } = await supabase
    .from('bonuses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) return []
  return data || []
}

export async function giveManualBonus(userId, amount, reason) {
  const { data: bonus, error: bonusError } = await supabase
    .from('bonuses')
    .insert({
      user_id: userId,
      amount: Number(amount),
      type: 'manual',
      status: 'paid',
      reason: reason || 'Manual bonus',
      processed_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (bonusError) throw bonusError

  const { data: user } = await supabase
    .from('users')
    .select('balance')
    .eq('id', userId)
    .single()

  if (user) {
    await supabase
      .from('users')
      .update({ balance: (user.balance || 0) + Number(amount), updated_at: new Date().toISOString() })
      .eq('id', userId)
  }

  return bonus
}

// ── Support Tickets ──────────────────────────────────────────
export async function getSupportTickets() {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return []
  return data || []
}

export async function createSupportTicket(subject, message, priority = 'medium') {
  const { data, error } = await supabase
    .from('support_tickets')
    .insert({ subject, message, priority, status: 'open' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function replyToTicket(ticketId, reply) {
  const { data, error } = await supabase
    .from('support_tickets')
    .update({
      admin_reply: reply,
      status: 'resolved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTicketStatus(ticketId, status) {
  const { data, error } = await supabase
    .from('support_tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ticketId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePlatformSettings(updates) {
  const { data, error } = await supabase
    .from('platform_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', 'main')
    .select()
    .single()
  if (error) throw error
  return data
}

export async function callGroqAI(prompt, gameType = 'crash') {
  const { data: settings } = await supabase
    .from('platform_settings')
    .select('groq_api_key')
    .eq('id', 'main')
    .single()

  if (!settings?.groq_api_key) {
    throw new Error('Groq API key not configured. Please add it in Settings.')
  }

  const systemPrompt = gameType === 'crash'
    ? `You are an AI betting assistant for a crash game (like Aviator/JetX). The game multiplier starts at 1.0x and increases rapidly, then crashes randomly between 1.0x and potentially 10000x+.

Your task: Analyze patterns and suggest optimal cashout points.

Provide a prediction with:
1. suggested_cashout: A multiplier value (e.g. 2.5)
2. confidence: A percentage (0-100) representing how confident you are
3. risk_level: "low", "medium", or "high"
4. reasoning: Brief explanation of why (2-3 sentences)

Return ONLY valid JSON in this exact format:
{"suggested_cashout": 2.5, "confidence": 87, "risk_level": "medium", "reasoning": "Based on recent crash patterns, the average crash point is trending around 2.3x. Historical data shows 78% of crashes occur above 2.0x."}`
    : `You are an AI betting assistant for slot games. Provide advice on bet sizing and game selection.

Return ONLY valid JSON:
{"recommended_bet_percent": 1, "confidence": 75, "game_tip": "Sweet Bonanza", "reasoning": "Brief tip text."}`

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.groq_api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 300,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Groq API error: ${errText}`)
  }

  const groqData = await response.json()
  const content = groqData.choices?.[0]?.message?.content?.trim() || '{}'

  let parsed
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
  } catch {
    parsed = { raw: content }
  }

  return { success: true, prediction: parsed }
}

// ── Support Chat ─────────────────────────────────────────────
export async function getMessages(ticketId) {
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
  if (error) return []
  return data || []
}

export async function sendMessage({ ticketId, senderId, senderName, senderRole = 'user', message, language = 'english', isAi = false }) {
  const { data, error } = await supabase
    .from('support_messages')
    .insert({
      ticket_id: ticketId,
      sender_id: null,
      sender_name: senderName,
      sender_role: senderRole,
      message,
      language,
      is_ai: isAi,
      is_read: false,
    })
    .select()
    .single()
  if (error) throw error

  await supabase
    .from('support_tickets')
    .update({ status: 'pending', updated_at: new Date().toISOString() })
    .eq('id', ticketId)

  return data
}

export async function createChatTicket(userId, userName, subject, message, language) {
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .insert({
      user_id: null,
      user_name: userName,
      user_identifier: userId ? userId.slice(0, 8) : 'guest',
      subject,
      message,
      priority: 'medium',
      status: 'open',
    })
    .select()
    .single()
  if (ticketError) throw ticketError

  await supabase.from('support_messages').insert({
    ticket_id: ticket.id,
    sender_id: null,
    sender_name: userName,
    sender_role: 'user',
    message,
    language,
    is_read: false,
  })

  return ticket
}

export async function markMessagesRead(ticketId) {
  await supabase
    .from('support_messages')
    .update({ is_read: true })
    .eq('ticket_id', ticketId)
    .eq('is_read', false)
}

export async function deleteMessage(messageId) {
  const { error } = await supabase
    .from('support_messages')
    .delete()
    .eq('id', messageId)
  if (error) throw error
}

export async function editMessage(messageId, newMessage) {
  const { data, error } = await supabase
    .from('support_messages')
    .update({ 
      message: newMessage,
      is_edited: true,
      edited_at: new Date().toISOString()
    })
    .eq('id', messageId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function setReceiveAdminReplies(userId, value) {
  const { error } = await supabase
    .from('users')
    .update({ receive_admin_replies: value })
    .eq('id', userId)
  if (error) throw error
}

export async function closeTicket(ticketId) {
  const { error } = await supabase
    .from('support_tickets')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .eq('id', ticketId)
  if (error) throw error
}

export async function reopenTicket(ticketId) {
  const { error } = await supabase
    .from('support_tickets')
    .update({ status: 'open', updated_at: new Date().toISOString() })
    .eq('id', ticketId)
  if (error) throw error
}

export async function updateTicketPriority(ticketId, priority) {
  const { error } = await supabase
    .from('support_tickets')
    .update({ priority, updated_at: new Date().toISOString() })
    .eq('id', ticketId)
  if (error) throw error
}

export async function assignTicket(ticketId, assigneeId, assigneeName) {
  const { error } = await supabase
    .from('support_tickets')
    .update({ 
      assigned_to: assigneeId, 
      assigned_name: assigneeName,
      updated_at: new Date().toISOString() 
    })
    .eq('id', ticketId)
  if (error) throw error
}

export async function deleteTicket(ticketId) {
  await supabase
    .from('support_messages')
    .delete()
    .eq('ticket_id', ticketId)
  
  const { error } = await supabase
    .from('support_tickets')
    .delete()
    .eq('id', ticketId)
  if (error) throw error
}

export async function getAiSupportReply(messages, language = 'english', userContext = null) {
  const { data: settings } = await supabase
    .from('platform_settings')
    .select('groq_api_key')
    .eq('id', 'main')
    .single()

  if (!settings?.groq_api_key) {
    throw new Error('AI support is not configured. Please ask admin to add Groq API key.')
  }

  const langLabel = language === 'urdu' ? 'Urdu' : language === 'hindi' ? 'Hindi' : 'English'

  const conversationHistory = messages.map(m =>
    `${m.sender_role === 'user' ? 'User' : m.sender_role === 'ai' ? 'Assistant' : 'Admin'}: ${m.message}`
  ).join('\n')

  const ctxBlock = userContext ? `
USER ACCOUNT CONTEXT:
- Username: ${userContext.username}
- Current Balance: $${userContext.balance?.toFixed(2) || '0.00'}
- Account Age: ${userContext.accountAge} days
- Recent Transactions: ${userContext.recentTxList}
- Bonus History: ${userContext.bonusList}
- Referral Earnings: $${userContext.referralEarnings?.toFixed(2) || '0.00'}
- Referral Status: ${userContext.referralStatus}

Use this context to give accurate, personalized answers. If user asks about their balance, quote the exact balance above.` : ''

  const systemPrompt = `You are a helpful, professional AI customer support agent for 399bet, an online gaming platform (Aviator, slots, crash games).

${ctxBlock}

IMPORTANT: You MUST respond in ${langLabel} language only.

Guidelines:
- Be polite, professional, and helpful
- Answer questions about deposits, withdrawals, bonuses, games, and account issues using the context above
- If user asks about balance, bonus, or recent activity — quote from their account context
- If you don't know something, say "Let me connect you with a human agent"
- Keep responses concise (2-3 sentences max)
- Never mention that you are an AI
- Use a friendly, professional tone
- For deposit: explain payment methods (JazzCash, EasyPaisa, UPI, USDT)
- For withdrawal: explain the process takes up to 24 hours
- For bonuses: refer to their bonus history if available
- For referrals: explain the commission structure

Respond ONLY with your reply text in ${langLabel}.`

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.groq_api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Conversation:\n${conversationHistory}\n\nPlease respond as the support agent in ${langLabel}:` },
      ],
      temperature: 0.7,
      max_tokens: 300,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`AI error: ${errText}`)
  }

  const groqData = await response.json()
  const content = groqData.choices?.[0]?.message?.content?.trim() || ''
  return content
}
