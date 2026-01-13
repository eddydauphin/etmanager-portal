// Supabase Edge Function: ai-agent
// Runs server-side with Claude API - keeps API key secure

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const getSystemPrompt = (profile: any, clientName: string) => `You are an AI Assistant for E&T Manager, a training and competency management platform.

## CONTEXT
- Organization: ${clientName || 'Company'}
- User: ${profile?.full_name || 'User'} (${profile?.role?.replace('_', ' ') || 'user'})

## CAPABILITIES
Use tools to: send messages, create coaching, assign training, query data, add users.

## PERSONALITY
- Warm, helpful, proactive
- Use user's first name
- Be concise
- Suggest next steps

## PERMISSIONS
Role: ${profile?.role}
- super_admin/client_admin: Full access
- team_lead: Manage team, create coaching
- trainee: View own data, request coaching`

const tools = [
  {
    name: "send_message",
    description: "Send a direct message to a user",
    input_schema: {
      type: "object",
      properties: {
        recipient_name: { type: "string", description: "Name of recipient" },
        message: { type: "string", description: "Message content" }
      },
      required: ["recipient_name", "message"]
    }
  },
  {
    name: "send_team_message",
    description: "Send message to all team members (managers only)",
    input_schema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Message to broadcast" }
      },
      required: ["message"]
    }
  },
  {
    name: "create_coaching",
    description: "Create coaching session",
    input_schema: {
      type: "object",
      properties: {
        trainee_name: { type: "string", description: "Trainee name (optional if self)" },
        coach_name: { type: "string", description: "Coach name" },
        topic: { type: "string", description: "Coaching topic" },
        scheduled_time: { type: "string", description: "When (optional)" }
      },
      required: ["topic"]
    }
  },
  {
    name: "assign_training",
    description: "Assign training module (managers only)",
    input_schema: {
      type: "object",
      properties: {
        trainee_name: { type: "string", description: "Trainee name" },
        training_title: { type: "string", description: "Training title" },
        due_date: { type: "string", description: "Due date (optional)" }
      },
      required: ["trainee_name", "training_title"]
    }
  },
  {
    name: "get_trainings",
    description: "Get user's pending trainings",
    input_schema: { type: "object", properties: {}, required: [] }
  },
  {
    name: "get_competencies",
    description: "Get user's competency progress",
    input_schema: { type: "object", properties: {}, required: [] }
  },
  {
    name: "get_coaching",
    description: "Get user's coaching sessions",
    input_schema: { type: "object", properties: {}, required: [] }
  },
  {
    name: "get_team_status",
    description: "Get team overview (managers only)",
    input_schema: { type: "object", properties: {}, required: [] }
  },
  {
    name: "find_experts",
    description: "Find subject matter experts",
    input_schema: {
      type: "object",
      properties: { topic: { type: "string", description: "Topic (optional)" } },
      required: []
    }
  },
  {
    name: "add_user",
    description: "Create new user (admins only)",
    input_schema: {
      type: "object",
      properties: {
        full_name: { type: "string" },
        email: { type: "string" },
        role: { type: "string", enum: ["trainee", "team_lead", "category_admin", "site_admin", "client_admin"] },
        reports_to_name: { type: "string", description: "Manager name (optional)" }
      },
      required: ["full_name", "email", "role"]
    }
  }
]

async function executeTool(supabase: any, name: string, params: any, userId: string, profile: any) {
  const clientId = profile?.client_id

  switch (name) {
    case 'send_message': {
      const { data: recipients } = await supabase.from('profiles').select('id, full_name').eq('client_id', clientId).ilike('full_name', `%${params.recipient_name}%`).eq('is_active', true).limit(1)
      if (!recipients?.length) return { success: false, error: `User "${params.recipient_name}" not found` }
      
      const recipient = recipients[0]
      const { data: myChans } = await supabase.from('chat_participants').select('channel_id').eq('user_id', userId)
      let dmId = null
      
      if (myChans?.length) {
        const { data: shared } = await supabase.from('chat_participants').select('channel_id, chat_channels!inner(type)').eq('user_id', recipient.id).in('channel_id', myChans.map((c: any) => c.channel_id)).eq('chat_channels.type', 'direct')
        if (shared?.length) dmId = shared[0].channel_id
      }
      
      if (!dmId) {
        const { data: ch } = await supabase.from('chat_channels').insert({ type: 'direct', created_by: userId, client_id: clientId }).select().single()
        if (ch) {
          await supabase.from('chat_participants').insert([{ channel_id: ch.id, user_id: userId, role: 'member' }, { channel_id: ch.id, user_id: recipient.id, role: 'member' }])
          dmId = ch.id
        }
      }
      
      if (dmId) {
        await supabase.from('chat_messages').insert({ channel_id: dmId, sender_id: userId, sender_type: 'user', content: params.message, content_type: 'text' })
        return { success: true, result: `Message sent to ${recipient.full_name}` }
      }
      return { success: false, error: 'Could not send message' }
    }

    case 'send_team_message': {
      if (!['team_lead', 'category_admin', 'site_admin', 'client_admin', 'super_admin'].includes(profile?.role)) {
        return { success: false, error: 'Only managers can message team' }
      }
      const { data: team } = await supabase.from('profiles').select('id, full_name').eq('reports_to', userId).eq('is_active', true)
      if (!team?.length) return { success: false, error: 'No team members' }
      
      const { data: grp } = await supabase.from('chat_channels').select('id').eq('type', 'group').eq('created_by', userId).limit(1)
      let grpId = grp?.[0]?.id
      
      if (!grpId) {
        const { data: ch } = await supabase.from('chat_channels').insert({ type: 'group', name: `${profile.full_name}'s Team`, created_by: userId, client_id: clientId }).select().single()
        if (ch) {
          await supabase.from('chat_participants').insert([{ channel_id: ch.id, user_id: userId, role: 'owner' }, ...team.map((t: any) => ({ channel_id: ch.id, user_id: t.id, role: 'member' }))])
          grpId = ch.id
        }
      }
      
      if (grpId) {
        await supabase.from('chat_messages').insert({ channel_id: grpId, sender_id: userId, sender_type: 'user', content: params.message, content_type: 'text' })
        return { success: true, result: `Sent to ${team.length} team members` }
      }
      return { success: false, error: 'Could not send' }
    }

    case 'create_coaching': {
      let traineeId = userId, coachId = null
      const isManager = ['team_lead', 'category_admin', 'site_admin', 'client_admin', 'super_admin'].includes(profile?.role)
      
      if (params.trainee_name) {
        const { data } = await supabase.from('profiles').select('id, full_name').eq('client_id', clientId).ilike('full_name', `%${params.trainee_name}%`).eq('is_active', true).limit(1)
        if (data?.length) traineeId = data[0].id
      }
      
      if (params.coach_name) {
        const { data } = await supabase.from('profiles').select('id, full_name').eq('client_id', clientId).ilike('full_name', `%${params.coach_name}%`).in('role', ['team_lead', 'category_admin', 'site_admin', 'client_admin', 'super_admin']).eq('is_active', true).limit(1)
        if (data?.length) coachId = data[0].id
      } else if (isManager && params.trainee_name) {
        coachId = userId
      }
      
      if (!coachId) {
        const { data: coaches } = await supabase.from('profiles').select('full_name').eq('client_id', clientId).in('role', ['team_lead', 'category_admin', 'site_admin', 'client_admin']).eq('is_active', true)
        return { success: false, error: `Please specify a coach. Available: ${coaches?.map((c: any) => c.full_name).join(', ')}` }
      }
      
      const { data: coach } = await supabase.from('profiles').select('full_name').eq('id', coachId).single()
      const { data: trainee } = await supabase.from('profiles').select('full_name').eq('id', traineeId).single()
      
      const { error } = await supabase.from('development_activities').insert({
        type: 'coaching', title: `Coaching: ${params.topic}`,
        description: params.scheduled_time ? `Scheduled: ${params.scheduled_time}` : 'Via AI Assistant',
        trainee_id: traineeId, coach_id: coachId, assigned_by: userId,
        status: 'pending', client_id: clientId, start_date: new Date().toISOString().split('T')[0]
      })
      
      if (error) return { success: false, error: 'Could not create session' }
      return { success: true, result: `Coaching created!\n• Trainee: ${trainee?.full_name}\n• Coach: ${coach?.full_name}\n• Topic: ${params.topic}${params.scheduled_time ? '\n• When: ' + params.scheduled_time : ''}` }
    }

    case 'assign_training': {
      if (!['team_lead', 'category_admin', 'site_admin', 'client_admin', 'super_admin'].includes(profile?.role)) {
        return { success: false, error: 'Only managers can assign training' }
      }
      
      const { data: trainees } = await supabase.from('profiles').select('id, full_name').eq('client_id', clientId).ilike('full_name', `%${params.trainee_name}%`).eq('is_active', true).limit(1)
      if (!trainees?.length) return { success: false, error: `User "${params.trainee_name}" not found` }
      
      const { data: modules } = await supabase.from('training_modules').select('id, title').eq('client_id', clientId).ilike('title', `%${params.training_title}%`).limit(1)
      if (!modules?.length) {
        const { data: available } = await supabase.from('training_modules').select('title').eq('client_id', clientId).eq('status', 'published').limit(10)
        return { success: false, error: `Training not found. Available: ${available?.map((m: any) => m.title).join(', ')}` }
      }
      
      const { data: exists } = await supabase.from('user_training').select('id').eq('user_id', trainees[0].id).eq('module_id', modules[0].id)
      if (exists?.length) return { success: false, error: `${trainees[0].full_name} already has this training` }
      
      const due = params.due_date ? new Date(params.due_date) : new Date(Date.now() + 14 * 86400000)
      await supabase.from('user_training').insert({ user_id: trainees[0].id, module_id: modules[0].id, status: 'pending', due_date: due.toISOString().split('T')[0], assigned_by: userId })
      
      return { success: true, result: `Training assigned!\n• ${trainees[0].full_name}\n• ${modules[0].title}\n• Due: ${due.toLocaleDateString()}` }
    }

    case 'get_trainings': {
      const { data } = await supabase.from('user_training').select('status, due_date, module:module_id(title)').eq('user_id', userId).in('status', ['pending', 'in_progress']).order('due_date')
      if (!data?.length) return { success: true, result: 'No pending trainings ✅' }
      let r = `Trainings (${data.length}):\n`
      data.forEach((t: any, i: number) => r += `${i + 1}. ${t.module?.title}${t.due_date && new Date(t.due_date) < new Date() ? ' ⚠️' : ''}\n`)
      return { success: true, result: r }
    }

    case 'get_competencies': {
      const { data } = await supabase.from('user_competencies').select('current_level, target_level, status, competency:competency_id(name)').eq('user_id', userId)
      if (!data?.length) return { success: true, result: 'No competencies assigned yet.' }
      const achieved = data.filter((c: any) => c.status === 'achieved').length
      let r = `Progress: ${achieved}/${data.length} achieved\n`
      const gaps = data.filter((c: any) => c.current_level < c.target_level)
      if (gaps.length) { r += '\nTo develop:\n'; gaps.slice(0, 5).forEach((g: any) => r += `• ${g.competency?.name}\n`) }
      return { success: true, result: r }
    }

    case 'get_coaching': {
      const { data } = await supabase.from('development_activities').select('title, coach:coach_id(full_name)').eq('trainee_id', userId).in('status', ['pending', 'in_progress'])
      if (!data?.length) return { success: true, result: 'No active coaching.' }
      let r = `Coaching (${data.length}):\n`
      data.forEach((c: any, i: number) => r += `${i + 1}. ${c.title} (${c.coach?.full_name})\n`)
      return { success: true, result: r }
    }

    case 'get_team_status': {
      if (!['team_lead', 'category_admin', 'site_admin', 'client_admin', 'super_admin'].includes(profile?.role)) {
        return { success: false, error: 'Managers only' }
      }
      const { data: team } = await supabase.from('profiles').select('id, full_name').eq('reports_to', userId).eq('is_active', true)
      if (!team?.length) return { success: true, result: 'No direct reports.' }
      const ids = team.map((t: any) => t.id)
      const { count: pending } = await supabase.from('user_training').select('*', { count: 'exact', head: true }).in('user_id', ids).in('status', ['pending', 'in_progress'])
      const { count: validation } = await supabase.from('development_activities').select('*', { count: 'exact', head: true }).eq('coach_id', userId).eq('status', 'completed')
      return { success: true, result: `Team (${team.length})\n📚 Pending: ${pending || 0}\n✅ Awaiting validation: ${validation || 0}\n\nMembers:\n${team.map((t: any) => '• ' + t.full_name).join('\n')}` }
    }

    case 'find_experts': {
      const { data } = await supabase.from('expert_network').select('expertise_level, user:user_id(full_name), competency:competency_id(name)').eq('status', 'active').eq('client_id', clientId).order('expertise_level', { ascending: false }).limit(10)
      if (!data?.length) return { success: true, result: 'No experts registered.' }
      let r = 'Experts:\n'
      data.forEach((e: any) => r += `• ${e.user?.full_name} - ${e.competency?.name} (L${e.expertise_level})\n`)
      return { success: true, result: r }
    }

    case 'add_user': {
      if (!['client_admin', 'super_admin'].includes(profile?.role)) return { success: false, error: 'Admins only' }
      const { data: exists } = await supabase.from('profiles').select('id').eq('email', params.email)
      if (exists?.length) return { success: false, error: 'Email already exists' }
      
      let reportsTo = null
      if (params.reports_to_name) {
        const { data } = await supabase.from('profiles').select('id').eq('client_id', clientId).ilike('full_name', `%${params.reports_to_name}%`).limit(1)
        if (data?.length) reportsTo = data[0].id
      }
      
      await supabase.from('profiles').insert({ full_name: params.full_name, email: params.email, role: params.role, client_id: clientId, reports_to: reportsTo, is_active: false })
      return { success: true, result: `User created!\n• ${params.full_name}\n• ${params.email}\n• ${params.role}` }
    }

    default:
      return { success: false, error: `Unknown tool: ${name}` }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { message, conversationHistory, userId, profile, clientName, channelId } = await req.json()

    if (!CLAUDE_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const messages = [
      ...conversationHistory.slice(-10).map((m: any) => ({ role: m.sender_type === 'user' ? 'user' : 'assistant', content: m.content })),
      { role: 'user', content: message }
    ]

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': CLAUDE_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1024, system: getSystemPrompt(profile, clientName), tools, messages })
    })

    if (!res.ok) throw new Error(`Claude API: ${res.status}`)
    const data = await res.json()

    let finalResponse = ''
    const toolResults: any[] = []

    for (const block of data.content) {
      if (block.type === 'text') finalResponse += block.text
      else if (block.type === 'tool_use') {
        const result = await executeTool(supabase, block.name, block.input, userId, profile)
        toolResults.push({ tool: block.name, ...result })
        finalResponse += result.success ? `✅ ${result.result}` : `❌ ${result.error}`
      }
    }

    if (channelId) {
      await supabase.from('chat_messages').insert({ channel_id: channelId, sender_id: userId, sender_type: 'ai', content: finalResponse, content_type: 'text' })
    }

    return new Response(JSON.stringify({ response: finalResponse, toolResults }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: any) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
