// AI Agent Service - Powered by Claude
// This service connects to Claude API to provide intelligent, contextual assistance

import { supabase } from './supabase';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// System prompt that defines the AI Agent's capabilities and personality
const getSystemPrompt = (profile, clientName) => `You are an intelligent AI Assistant for E&T Manager, a training and competency management platform for manufacturing companies.

## YOUR IDENTITY
- Name: E&T Assistant
- Company context: You're helping ${clientName || 'this organization'}
- Current user: ${profile?.full_name || 'User'} (${profile?.role?.replace('_', ' ') || 'team member'})

## YOUR CAPABILITIES
You can execute the following actions by returning JSON tool calls:

### User Management (Admin only)
- add_user: Create new users
- update_user: Modify user profiles
- deactivate_user: Remove access

### Training Management
- assign_training: Assign training modules to users
- create_training_module: Create new training content
- update_training_progress: Mark training complete

### Coaching & Development
- create_coaching_session: Schedule coaching between coach and trainee
- update_coaching_status: Mark sessions complete/validated
- assign_competency: Assign competency targets to users

### Communication
- send_message: Send direct messages to users
- send_team_message: Broadcast to team
- create_notification: System notifications

### Queries
- get_user_trainings: Fetch user's training status
- get_user_competencies: Fetch competency progress
- get_team_status: Get team overview (managers)
- get_experts: Find subject matter experts
- search_users: Find users by name/role

## RESPONSE FORMAT
For actions, respond with JSON:
\`\`\`json
{
  "action": "action_name",
  "params": { ... },
  "message": "Friendly confirmation message"
}
\`\`\`

For queries or conversation, respond naturally in markdown.

## YOUR PERSONALITY
- Be warm, helpful, and proactive
- Use the user's first name
- Anticipate needs and suggest next steps
- Be concise but complete
- Use emojis sparingly for friendliness

## PERMISSIONS
Current user role: ${profile?.role}
- super_admin: Full access to everything
- client_admin: Full access within their organization
- site_admin: Manage their site
- category_admin: Manage their category
- team_lead: Manage their team, create coaching
- trainee: View own data, request coaching

Only allow actions the user has permission for.

## CONTEXT
Always consider:
- What the user is trying to accomplish
- Their role and permissions
- Previous messages in the conversation
- The most helpful response

Remember: You're not just answering questions - you're an intelligent agent that can EXECUTE actions in the system.`;

// Tool definitions for Claude
const tools = [
  {
    name: "send_message",
    description: "Send a direct message to another user",
    input_schema: {
      type: "object",
      properties: {
        recipient_name: { type: "string", description: "Name of the person to message" },
        message: { type: "string", description: "The message content" }
      },
      required: ["recipient_name", "message"]
    }
  },
  {
    name: "send_team_message",
    description: "Send a message to all team members (managers only)",
    input_schema: {
      type: "object",
      properties: {
        message: { type: "string", description: "The message to send to the team" }
      },
      required: ["message"]
    }
  },
  {
    name: "create_coaching_session",
    description: "Create a coaching/development session",
    input_schema: {
      type: "object",
      properties: {
        trainee_name: { type: "string", description: "Name of the person receiving coaching" },
        coach_name: { type: "string", description: "Name of the coach (optional, defaults to requester for managers)" },
        topic: { type: "string", description: "What the coaching is about" },
        scheduled_date: { type: "string", description: "When the session should happen (optional)" }
      },
      required: ["topic"]
    }
  },
  {
    name: "assign_training",
    description: "Assign a training module to a user (managers only)",
    input_schema: {
      type: "object",
      properties: {
        trainee_name: { type: "string", description: "Name of the person to assign training to" },
        training_title: { type: "string", description: "Name/title of the training module" },
        due_date: { type: "string", description: "When training should be completed (optional)" }
      },
      required: ["trainee_name", "training_title"]
    }
  },
  {
    name: "add_user",
    description: "Create a new user account (admins only)",
    input_schema: {
      type: "object",
      properties: {
        full_name: { type: "string", description: "Full name of the new user" },
        email: { type: "string", description: "Email address" },
        role: { type: "string", enum: ["trainee", "team_lead", "category_admin", "site_admin", "client_admin"], description: "User's role" },
        reports_to_name: { type: "string", description: "Name of their manager (optional)" }
      },
      required: ["full_name", "email", "role"]
    }
  },
  {
    name: "get_user_info",
    description: "Get information about users, their training, competencies, or team",
    input_schema: {
      type: "object",
      properties: {
        query_type: { type: "string", enum: ["my_trainings", "my_competencies", "my_coaching", "team_status", "find_experts", "search_user"], description: "Type of information to retrieve" },
        search_term: { type: "string", description: "Search term for finding users or experts (optional)" }
      },
      required: ["query_type"]
    }
  },
  {
    name: "create_training_module",
    description: "Create a new training module (admins only)",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title of the training module" },
        description: { type: "string", description: "What the training covers" },
        competencies: { type: "array", items: { type: "string" }, description: "Related competencies (optional)" }
      },
      required: ["title", "description"]
    }
  }
];

// Execute tool calls from Claude
export const executeToolCall = async (toolName, params, userId, profile) => {
  const clientId = profile?.client_id;
  
  switch (toolName) {
    case 'send_message': {
      const { recipient_name, message } = params;
      
      // Find recipient
      const { data: recipients } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('client_id', clientId)
        .ilike('full_name', `%${recipient_name}%`)
        .limit(1);
      
      if (!recipients?.length) {
        return { success: false, error: `Could not find user "${recipient_name}"` };
      }
      
      const recipient = recipients[0];
      
      // Find or create DM channel
      const { data: myChannels } = await supabase
        .from('chat_participants')
        .select('channel_id')
        .eq('user_id', userId);
      
      let dmChannelId = null;
      
      if (myChannels?.length) {
        const { data: shared } = await supabase
          .from('chat_participants')
          .select('channel_id, chat_channels!inner(type)')
          .eq('user_id', recipient.id)
          .in('channel_id', myChannels.map(c => c.channel_id))
          .eq('chat_channels.type', 'direct');
        
        if (shared?.length) {
          dmChannelId = shared[0].channel_id;
        }
      }
      
      if (!dmChannelId) {
        const { data: newChannel } = await supabase
          .from('chat_channels')
          .insert({ type: 'direct', created_by: userId, client_id: clientId })
          .select()
          .single();
        
        if (newChannel) {
          await supabase.from('chat_participants').insert([
            { channel_id: newChannel.id, user_id: userId, role: 'member' },
            { channel_id: newChannel.id, user_id: recipient.id, role: 'member' }
          ]);
          dmChannelId = newChannel.id;
        }
      }
      
      if (dmChannelId) {
        await supabase.from('chat_messages').insert({
          channel_id: dmChannelId,
          sender_id: userId,
          sender_type: 'user',
          content: message,
          content_type: 'text'
        });
        
        return { success: true, data: { recipient: recipient.full_name, message } };
      }
      
      return { success: false, error: 'Could not create message channel' };
    }
    
    case 'send_team_message': {
      const { message } = params;
      
      // Check permission
      if (!['team_lead', 'category_admin', 'site_admin', 'client_admin', 'super_admin'].includes(profile?.role)) {
        return { success: false, error: 'Only managers can send team messages' };
      }
      
      // Get team
      const { data: team } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('reports_to', userId)
        .eq('is_active', true);
      
      if (!team?.length) {
        return { success: false, error: 'No team members found' };
      }
      
      // Find or create team channel
      const { data: existingChannels } = await supabase
        .from('chat_channels')
        .select('id')
        .eq('type', 'group')
        .eq('created_by', userId)
        .limit(1);
      
      let teamChannelId = existingChannels?.[0]?.id;
      
      if (!teamChannelId) {
        const { data: newChannel } = await supabase
          .from('chat_channels')
          .insert({ type: 'group', name: `${profile.full_name}'s Team`, created_by: userId, client_id: clientId })
          .select()
          .single();
        
        if (newChannel) {
          await supabase.from('chat_participants').insert([
            { channel_id: newChannel.id, user_id: userId, role: 'owner' },
            ...team.map(t => ({ channel_id: newChannel.id, user_id: t.id, role: 'member' }))
          ]);
          teamChannelId = newChannel.id;
        }
      }
      
      if (teamChannelId) {
        await supabase.from('chat_messages').insert({
          channel_id: teamChannelId,
          sender_id: userId,
          sender_type: 'user',
          content: message,
          content_type: 'text'
        });
        
        return { success: true, data: { team_size: team.length, message } };
      }
      
      return { success: false, error: 'Could not send team message' };
    }
    
    case 'create_coaching_session': {
      const { trainee_name, coach_name, topic, scheduled_date } = params;
      
      let traineeId = userId; // Default to self for trainees
      let coachId = null;
      
      const isManager = ['team_lead', 'category_admin', 'site_admin', 'client_admin', 'super_admin'].includes(profile?.role);
      
      // If trainee name provided, find them
      if (trainee_name) {
        const { data: trainees } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('client_id', clientId)
          .ilike('full_name', `%${trainee_name}%`)
          .limit(1);
        
        if (trainees?.length) {
          traineeId = trainees[0].id;
        }
      }
      
      // Find coach
      if (coach_name) {
        const { data: coaches } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('client_id', clientId)
          .ilike('full_name', `%${coach_name}%`)
          .in('role', ['team_lead', 'category_admin', 'site_admin', 'client_admin', 'super_admin'])
          .limit(1);
        
        if (coaches?.length) {
          coachId = coaches[0].id;
        }
      } else if (isManager) {
        // Manager creating coaching - they're the coach
        coachId = userId;
        traineeId = trainee_name ? traineeId : null;
        
        if (!traineeId) {
          return { success: false, error: 'Please specify who should receive the coaching' };
        }
      }
      
      if (!coachId) {
        return { success: false, error: 'Could not find the specified coach' };
      }
      
      // Create the session
      const { data: session, error } = await supabase
        .from('development_activities')
        .insert({
          type: 'coaching',
          title: `Coaching: ${topic}`,
          description: scheduled_date ? `Scheduled: ${scheduled_date}` : 'Requested via AI Assistant',
          trainee_id: traineeId,
          coach_id: coachId,
          assigned_by: userId,
          status: 'pending',
          client_id: clientId,
          start_date: new Date().toISOString().split('T')[0]
        })
        .select(`
          id,
          title,
          trainee:trainee_id(full_name),
          coach:coach_id(full_name)
        `)
        .single();
      
      if (error) {
        return { success: false, error: 'Could not create coaching session' };
      }
      
      return { 
        success: true, 
        data: { 
          trainee: session.trainee?.full_name,
          coach: session.coach?.full_name,
          topic,
          scheduled: scheduled_date || 'To be scheduled'
        }
      };
    }
    
    case 'assign_training': {
      const { trainee_name, training_title, due_date } = params;
      
      // Check permission
      if (!['team_lead', 'category_admin', 'site_admin', 'client_admin', 'super_admin'].includes(profile?.role)) {
        return { success: false, error: 'Only managers can assign training' };
      }
      
      // Find trainee
      const { data: trainees } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('client_id', clientId)
        .ilike('full_name', `%${trainee_name}%`)
        .limit(1);
      
      if (!trainees?.length) {
        return { success: false, error: `Could not find user "${trainee_name}"` };
      }
      
      // Find training module
      const { data: modules } = await supabase
        .from('training_modules')
        .select('id, title')
        .eq('client_id', clientId)
        .ilike('title', `%${training_title}%`)
        .limit(1);
      
      if (!modules?.length) {
        return { success: false, error: `Could not find training "${training_title}"` };
      }
      
      // Check if already assigned
      const { data: existing } = await supabase
        .from('user_training')
        .select('id')
        .eq('user_id', trainees[0].id)
        .eq('module_id', modules[0].id);
      
      if (existing?.length) {
        return { success: false, error: `${trainees[0].full_name} already has this training assigned` };
      }
      
      // Assign
      const dueDate = due_date ? new Date(due_date) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      
      const { error } = await supabase.from('user_training').insert({
        user_id: trainees[0].id,
        module_id: modules[0].id,
        status: 'pending',
        due_date: dueDate.toISOString().split('T')[0],
        assigned_by: userId
      });
      
      if (error) {
        return { success: false, error: 'Could not assign training' };
      }
      
      return { 
        success: true, 
        data: { 
          trainee: trainees[0].full_name,
          training: modules[0].title,
          due: dueDate.toLocaleDateString()
        }
      };
    }
    
    case 'add_user': {
      const { full_name, email, role, reports_to_name } = params;
      
      // Check permission
      if (!['client_admin', 'super_admin'].includes(profile?.role)) {
        return { success: false, error: 'Only administrators can add users' };
      }
      
      // Find manager if specified
      let reportsTo = null;
      if (reports_to_name) {
        const { data: managers } = await supabase
          .from('profiles')
          .select('id')
          .eq('client_id', clientId)
          .ilike('full_name', `%${reports_to_name}%`)
          .limit(1);
        
        if (managers?.length) {
          reportsTo = managers[0].id;
        }
      }
      
      // Note: In a real system, this would trigger an invitation email
      // For now, we'll create a pending profile
      const { data: newUser, error } = await supabase
        .from('profiles')
        .insert({
          full_name,
          email,
          role,
          client_id: clientId,
          reports_to: reportsTo,
          is_active: false // Will be activated when they accept invite
        })
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'A user with this email already exists' };
        }
        return { success: false, error: 'Could not create user' };
      }
      
      return { 
        success: true, 
        data: { 
          name: full_name,
          email,
          role,
          status: 'Invitation pending'
        }
      };
    }
    
    case 'get_user_info': {
      const { query_type, search_term } = params;
      
      switch (query_type) {
        case 'my_trainings': {
          const { data } = await supabase
            .from('user_training')
            .select('status, due_date, module:module_id(title)')
            .eq('user_id', userId)
            .in('status', ['pending', 'in_progress'])
            .order('due_date');
          
          return { success: true, data: { trainings: data || [] } };
        }
        
        case 'my_competencies': {
          const { data } = await supabase
            .from('user_competencies')
            .select('current_level, target_level, status, competency:competency_id(name)')
            .eq('user_id', userId);
          
          return { success: true, data: { competencies: data || [] } };
        }
        
        case 'my_coaching': {
          const { data } = await supabase
            .from('development_activities')
            .select('title, status, coach:coach_id(full_name)')
            .eq('trainee_id', userId)
            .in('status', ['pending', 'in_progress']);
          
          return { success: true, data: { coaching: data || [] } };
        }
        
        case 'team_status': {
          if (!['team_lead', 'category_admin', 'site_admin', 'client_admin', 'super_admin'].includes(profile?.role)) {
            return { success: false, error: 'Only managers can view team status' };
          }
          
          const { data: team } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('reports_to', userId)
            .eq('is_active', true);
          
          const teamIds = team?.map(t => t.id) || [];
          
          const { count: pendingTrainings } = await supabase
            .from('user_training')
            .select('*', { count: 'exact', head: true })
            .in('user_id', teamIds)
            .in('status', ['pending', 'in_progress']);
          
          const { count: awaitingValidation } = await supabase
            .from('development_activities')
            .select('*', { count: 'exact', head: true })
            .eq('coach_id', userId)
            .eq('status', 'completed');
          
          return { 
            success: true, 
            data: { 
              team_members: team || [],
              pending_trainings: pendingTrainings || 0,
              awaiting_validation: awaitingValidation || 0
            }
          };
        }
        
        case 'find_experts': {
          const { data } = await supabase
            .from('expert_network')
            .select('expertise_level, user:user_id(full_name, email), competency:competency_id(name)')
            .eq('status', 'active')
            .eq('client_id', clientId)
            .order('expertise_level', { ascending: false })
            .limit(10);
          
          return { success: true, data: { experts: data || [] } };
        }
        
        case 'search_user': {
          const { data } = await supabase
            .from('profiles')
            .select('id, full_name, email, role')
            .eq('client_id', clientId)
            .ilike('full_name', `%${search_term || ''}%`)
            .eq('is_active', true)
            .limit(10);
          
          return { success: true, data: { users: data || [] } };
        }
        
        default:
          return { success: false, error: 'Unknown query type' };
      }
    }
    
    case 'create_training_module': {
      const { title, description, competencies } = params;
      
      // Check permission
      if (!['category_admin', 'site_admin', 'client_admin', 'super_admin'].includes(profile?.role)) {
        return { success: false, error: 'Only administrators can create training modules' };
      }
      
      const { data: module, error } = await supabase
        .from('training_modules')
        .insert({
          title,
          description,
          client_id: clientId,
          created_by: userId,
          status: 'draft'
        })
        .select()
        .single();
      
      if (error) {
        return { success: false, error: 'Could not create training module' };
      }
      
      return { 
        success: true, 
        data: { 
          title,
          description,
          status: 'Draft - ready for content'
        }
      };
    }
    
    default:
      return { success: false, error: `Unknown action: ${toolName}` };
  }
};

// Main function to process messages with Claude
export const processWithClaude = async (
  message,
  conversationHistory,
  userId,
  profile,
  clientName,
  apiKey
) => {
  if (!apiKey) {
    return {
      response: "AI Agent is not configured. Please add your Claude API key in settings.",
      toolResults: []
    };
  }
  
  // Build messages array for Claude
  const messages = [
    ...conversationHistory.slice(-10).map(msg => ({
      role: msg.sender_type === 'user' ? 'user' : 'assistant',
      content: msg.content
    })),
    { role: 'user', content: message }
  ];
  
  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: getSystemPrompt(profile, clientName),
        tools,
        messages
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Process response - could be text or tool use
    let finalResponse = '';
    const toolResults = [];
    
    for (const block of data.content) {
      if (block.type === 'text') {
        finalResponse += block.text;
      } else if (block.type === 'tool_use') {
        // Execute the tool
        const result = await executeToolCall(block.name, block.input, userId, profile);
        toolResults.push({ tool: block.name, ...result });
        
        // Generate confirmation message based on result
        if (result.success) {
          switch (block.name) {
            case 'send_message':
              finalResponse += `✅ Message sent to ${result.data.recipient}!\n\n💬 "${result.data.message}"`;
              break;
            case 'send_team_message':
              finalResponse += `✅ Message sent to ${result.data.team_size} team members!\n\n💬 "${result.data.message}"`;
              break;
            case 'create_coaching_session':
              finalResponse += `✅ Coaching session created!\n\n👤 Trainee: ${result.data.trainee}\n👨‍🏫 Coach: ${result.data.coach}\n📚 Topic: ${result.data.topic}\n📅 ${result.data.scheduled}`;
              break;
            case 'assign_training':
              finalResponse += `✅ Training assigned!\n\n👤 ${result.data.trainee}\n📚 ${result.data.training}\n📅 Due: ${result.data.due}`;
              break;
            case 'add_user':
              finalResponse += `✅ User created!\n\n👤 ${result.data.name}\n📧 ${result.data.email}\n🎭 ${result.data.role}\n📋 ${result.data.status}`;
              break;
            case 'get_user_info':
              // Format query results naturally
              finalResponse += formatQueryResults(block.input.query_type, result.data, profile);
              break;
            default:
              finalResponse += `✅ Action completed successfully!`;
          }
        } else {
          finalResponse += `❌ ${result.error}`;
        }
      }
    }
    
    return { response: finalResponse, toolResults };
    
  } catch (error) {
    console.error('Claude API error:', error);
    return {
      response: "I'm having trouble connecting right now. Please try again in a moment.",
      toolResults: []
    };
  }
};

// Format query results into natural language
const formatQueryResults = (queryType, data, profile) => {
  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  
  switch (queryType) {
    case 'my_trainings':
      if (!data.trainings?.length) {
        return `Great news, ${firstName}! You have no pending trainings. 🎉`;
      }
      let trainings = `📚 **Your Pending Trainings (${data.trainings.length})**\n\n`;
      data.trainings.forEach((t, i) => {
        const overdue = t.due_date && new Date(t.due_date) < new Date();
        trainings += `${i + 1}. ${t.module?.title}${overdue ? ' ⚠️ OVERDUE' : ''}\n`;
      });
      return trainings;
    
    case 'my_competencies':
      if (!data.competencies?.length) {
        return `No competencies assigned yet, ${firstName}. Talk to your team lead about your development plan.`;
      }
      const achieved = data.competencies.filter(c => c.status === 'achieved').length;
      let comps = `📊 **Your Competencies** (${achieved}/${data.competencies.length} achieved)\n\n`;
      const gaps = data.competencies.filter(c => c.current_level < c.target_level);
      if (gaps.length) {
        comps += `**Skills to develop:**\n`;
        gaps.slice(0, 5).forEach(g => {
          comps += `• ${g.competency?.name}: Level ${g.current_level} → ${g.target_level}\n`;
        });
      }
      return comps;
    
    case 'my_coaching':
      if (!data.coaching?.length) {
        return `No active coaching sessions, ${firstName}. Would you like to request one?`;
      }
      let coaching = `🎯 **Your Coaching Sessions**\n\n`;
      data.coaching.forEach((c, i) => {
        coaching += `${i + 1}. ${c.title} (Coach: ${c.coach?.full_name})\n`;
      });
      return coaching;
    
    case 'team_status':
      let team = `👥 **Team Overview** (${data.team_members?.length || 0} members)\n\n`;
      team += `📚 Pending Trainings: ${data.pending_trainings}\n`;
      team += `✅ Awaiting Validation: ${data.awaiting_validation}\n\n`;
      if (data.team_members?.length) {
        team += `**Members:**\n`;
        data.team_members.forEach(m => {
          team += `• ${m.full_name}\n`;
        });
      }
      return team;
    
    case 'find_experts':
      if (!data.experts?.length) {
        return `No experts registered in the network yet.`;
      }
      let experts = `👥 **Available Experts**\n\n`;
      data.experts.forEach(e => {
        experts += `• **${e.user?.full_name}** - ${e.competency?.name} (Level ${e.expertise_level})\n`;
      });
      return experts;
    
    case 'search_user':
      if (!data.users?.length) {
        return `No users found matching your search.`;
      }
      let users = `👥 **Users Found**\n\n`;
      data.users.forEach(u => {
        users += `• ${u.full_name} (${u.role?.replace('_', ' ')})\n`;
      });
      return users;
    
    default:
      return JSON.stringify(data, null, 2);
  }
};

export default { processWithClaude, executeToolCall };
