import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { MessageSquare, Users, Bot, Send, Plus, Search, MoreVertical, Smile, Paperclip, X, Hash, Loader2 } from 'lucide-react';

export default function ChatPage() {
  const { user, profile } = useAuth();
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { if (profile) { loadChannels(); loadUsers(); } }, [profile]);
  useEffect(() => { if (activeChannel) { loadMessages(activeChannel.id); markAsRead(activeChannel.id); } }, [activeChannel]);
  
  useEffect(() => {
    if (!activeChannel) return;
    const subscription = supabase.channel(`chat:${activeChannel.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${activeChannel.id}` },
        async (payload) => {
          const newMsg = payload.new;
          if (newMsg.sender_id) {
            const { data: senderData } = await supabase.from('profiles').select('id, full_name, email').eq('id', newMsg.sender_id).single();
            newMsg.sender = senderData;
          }
          setMessages(prev => [...prev, newMsg]);
          scrollToBottom();
          if (newMsg.sender_id !== user.id) markAsRead(activeChannel.id);
        }
      ).subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, [activeChannel]);

  useEffect(() => { scrollToBottom(); }, [messages]);
  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };

  const loadChannels = async () => {
    try {
      setLoading(true);
      const { data: participations, error: partError } = await supabase.from('chat_participants').select(`channel_id, last_read_at, chat_channels (id, type, name, created_by, client_id, created_at, updated_at)`).eq('user_id', user.id);
      if (partError) throw partError;
      const channelList = participations.map(p => ({ ...p.chat_channels, last_read_at: p.last_read_at })).filter(c => c.id);
      if (profile.role === 'super_admin') await ensureSuperAdminInAllAIChannels();
      const clientAiChannel = channelList.find(c => c.type === 'ai_assistant' && c.client_id === profile.client_id);
      if (!clientAiChannel && profile.role !== 'super_admin') { await createClientAIAssistantChannel(profile.client_id); await loadChannels(); return; }
      setChannels(channelList);
      await calculateUnreadCounts(channelList);
      if (!activeChannel) { const defaultChannel = channelList.find(c => c.type === 'ai_assistant') || channelList[0]; if (defaultChannel) setActiveChannel(defaultChannel); }
    } catch (error) { console.error('Error loading channels:', error); }
    finally { setLoading(false); }
  };

  const ensureSuperAdminInAllAIChannels = async () => {
    try {
      const { data: aiChannels } = await supabase.from('chat_channels').select('id, client_id, name').eq('type', 'ai_assistant');
      const { data: existingParts } = await supabase.from('chat_participants').select('channel_id').eq('user_id', user.id);
      const existingChannelIds = existingParts?.map(p => p.channel_id) || [];
      const missingChannels = aiChannels?.filter(c => !existingChannelIds.includes(c.id)) || [];
      if (missingChannels.length > 0) { await supabase.from('chat_participants').insert(missingChannels.map(c => ({ channel_id: c.id, user_id: user.id, role: 'admin' }))); }
    } catch (error) { console.error('Error ensuring super_admin in AI channels:', error); }
  };

  const createClientAIAssistantChannel = async (clientId) => {
    try {
      const { data: existing } = await supabase.from('chat_channels').select('id').eq('type', 'ai_assistant').eq('client_id', clientId).single();
      if (existing) return;
      const { data: client } = await supabase.from('clients').select('name').eq('id', clientId).single();
      const { data: channel, error: channelError } = await supabase.from('chat_channels').insert({ type: 'ai_assistant', name: `AI Assistant - ${client?.name || 'Client'}`, created_by: user.id, client_id: clientId }).select().single();
      if (channelError) throw channelError;
      const { data: clientUsers } = await supabase.from('profiles').select('id').eq('client_id', clientId).eq('is_active', true);
      const { data: superAdmins } = await supabase.from('profiles').select('id').eq('role', 'super_admin').eq('is_active', true);
      const allUserIds = new Set([...(clientUsers?.map(u => u.id) || []), ...(superAdmins?.map(u => u.id) || [])]);
      await supabase.from('chat_participants').insert(Array.from(allUserIds).map(userId => ({ channel_id: channel.id, user_id: userId, role: userId === user.id ? 'owner' : 'member' })));
      await supabase.from('chat_messages').insert({ channel_id: channel.id, sender_id: user.id, sender_type: 'ai', content: `👋 Welcome! I'm your AI Assistant.\n\nI can help with:\n• Training & coaching queries\n• Sending messages to colleagues\n• Creating coaching sessions\n• Assigning training\n• Finding experts\n\nJust ask naturally!`, content_type: 'text' });
    } catch (error) { console.error('Error creating AI channel:', error); }
  };

  const calculateUnreadCounts = async (channelList) => {
    const counts = {};
    for (const channel of channelList) {
      let query = supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('channel_id', channel.id).neq('sender_id', user.id);
      if (channel.last_read_at) query = query.gt('created_at', channel.last_read_at);
      const { count } = await query;
      counts[channel.id] = count || 0;
    }
    setUnreadCounts(counts);
  };

  const markAsRead = async (channelId) => {
    try { await supabase.from('chat_participants').update({ last_read_at: new Date().toISOString() }).eq('channel_id', channelId).eq('user_id', user.id); setUnreadCounts(prev => ({ ...prev, [channelId]: 0 })); }
    catch (error) { console.error('Error marking as read:', error); }
  };

  const loadMessages = async (channelId) => {
    try {
      const { data, error } = await supabase.from('chat_messages').select(`*, sender:sender_id (id, full_name, email)`).eq('channel_id', channelId).eq('is_deleted', false).order('created_at', { ascending: true }).limit(100);
      if (error) throw error;
      setMessages(data || []);
    } catch (error) { console.error('Error loading messages:', error); }
  };

  const loadUsers = async () => {
    try {
      let query = supabase.from('profiles').select('id, full_name, email, role').eq('is_active', true).neq('id', user.id);
      if (profile.role !== 'super_admin') query = query.eq('client_id', profile.client_id);
      const { data, error } = await query.order('full_name');
      if (error) throw error;
      setUsers(data || []);
    } catch (error) { console.error('Error loading users:', error); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel || sendingMessage) return;
    const messageContent = newMessage.trim();
    setNewMessage('');
    setSendingMessage(true);
    try {
      await supabase.from('chat_messages').insert({ channel_id: activeChannel.id, sender_id: user.id, sender_type: 'user', content: messageContent, content_type: 'text' });
      await supabase.from('chat_channels').update({ updated_at: new Date().toISOString() }).eq('id', activeChannel.id);
      if (activeChannel.type === 'ai_assistant') await triggerAIResponse(messageContent);
    } catch (error) { console.error('Error sending message:', error); setNewMessage(messageContent); }
    finally { setSendingMessage(false); inputRef.current?.focus(); }
  };

  // ===== AI AGENT WITH ACTION EXECUTION =====
  const triggerAIResponse = async (userMessage) => {
    setAiThinking(true);
    try {
      const lowerMsg = userMessage.toLowerCase();
      const firstName = profile.full_name?.split(' ')[0] || 'there';
      let response = '';
      
      // ========== ACTION EXECUTION ==========
      
      // SEND MESSAGE
      if ((lowerMsg.includes('send') || lowerMsg.includes('tell') || lowerMsg.includes('notify') || lowerMsg.includes('message')) && (lowerMsg.includes(' to ') || lowerMsg.includes('team') || lowerMsg.includes('everyone'))) {
        response = await handleSendMessage(userMessage);
      }
      // CREATE COACHING
      else if ((lowerMsg.includes('create') || lowerMsg.includes('assign') || lowerMsg.includes('schedule')) && lowerMsg.includes('coaching')) {
        response = await handleCreateCoaching(userMessage);
      }
      // ASSIGN TRAINING
      else if ((lowerMsg.includes('assign') || lowerMsg.includes('enroll') || lowerMsg.includes('give')) && lowerMsg.includes('training')) {
        response = await handleAssignTraining(userMessage);
      }
      
      // ========== QUERIES ==========
      
      // REQUEST COACHING (for self)
      else if ((lowerMsg.includes('request') || lowerMsg.includes('want') || lowerMsg.includes('need') || lowerMsg.includes('like to')) && lowerMsg.includes('coaching')) {
        response = await handleRequestCoaching();
      }
      // PENDING TRAININGS
      else if (lowerMsg.includes('training') || lowerMsg.includes('course')) {
        response = await handlePendingTrainings();
      }
      // COACHING STATUS
      else if (lowerMsg.includes('coaching') || lowerMsg.includes('development')) {
        response = await handlePendingCoaching();
      }
      // COMPETENCY
      else if (lowerMsg.includes('competenc') || lowerMsg.includes('skill') || lowerMsg.includes('progress')) {
        response = await handleCompetencyStatus();
      }
      // EXPERTS
      else if (lowerMsg.includes('expert') || lowerMsg.includes('who knows')) {
        response = await handleFindExperts();
      }
      // TEAM
      else if (lowerMsg.includes('team') && ['team_lead','category_admin','site_admin','client_admin','super_admin'].includes(profile.role)) {
        response = await handleTeamStatus();
      }
      // KPI
      else if (lowerMsg.includes('kpi') || lowerMsg.includes('summary') || lowerMsg.includes('overview')) {
        response = await handleKPISummary();
      }
      // TASKS
      else if (lowerMsg.includes('task') || lowerMsg.includes('attention') || lowerMsg.includes('to do')) {
        response = await handleTasksNeedingAttention();
      }
      // GREETINGS
      else if (lowerMsg.match(/^(hi|hello|hey|bonjour)/)) {
        response = `Hello ${firstName}! 👋 How can I help you today?\n\n**I can:**\n• Send messages to colleagues\n• Create coaching sessions\n• Assign training\n• Show your progress & KPIs\n\nJust ask!`;
      }
      // HELP
      else if (lowerMsg.includes('help')) {
        response = getHelpMessage();
      }
      // DEFAULT
      else {
        response = `I'm here to help, ${firstName}! 😊\n\n**Try saying:**\n• "Send a message to [name]: [text]"\n• "Create coaching for [name] on [topic]"\n• "Assign training [course] to [name]"\n• "Show my pending trainings"\n• "Who are the experts?"\n\nType **help** for more!`;
      }

      await supabase.from('chat_messages').insert({ channel_id: activeChannel.id, sender_id: user.id, sender_type: 'ai', content: response, content_type: 'text' });
    } catch (error) {
      console.error('AI Error:', error);
      await supabase.from('chat_messages').insert({ channel_id: activeChannel.id, sender_id: user.id, sender_type: 'ai', content: "❌ Sorry, I encountered an error. Please try again.", content_type: 'text' });
    } finally { setAiThinking(false); }
  };

  // === ACTION: SEND MESSAGE ===
  const handleSendMessage = async (userMessage) => {
    const firstName = profile.full_name?.split(' ')[0];
    const lowerMsg = userMessage.toLowerCase();
    const isTeam = lowerMsg.includes('team') || lowerMsg.includes('everyone');
    const canManage = ['team_lead','category_admin','site_admin','client_admin','super_admin'].includes(profile.role);

    // SEND TO TEAM
    if (isTeam) {
      if (!canManage) return `Only team leads and admins can message the entire team, ${firstName}.`;
      const { data: team } = await supabase.from('profiles').select('id, full_name').eq('reports_to', user.id).eq('is_active', true);
      if (!team?.length) return `You don't have team members assigned, ${firstName}.`;
      
      const msgMatch = userMessage.match(/(?:send|tell|notify|message)\s+(?:my\s+)?(?:team|everyone)[:\s]+(.+)/i);
      if (!msgMatch?.[1]) return `Please include your message:\n"Send team: [your message]"\n\n**Your team (${team.length}):**\n${team.map(t => `• ${t.full_name}`).join('\n')}`;
      
      const msgContent = msgMatch[1].trim();
      let teamChannel = channels.find(c => c.type === 'group' && c.name?.includes('Team'));
      
      if (!teamChannel) {
        const { data: ch } = await supabase.from('chat_channels').insert({ type: 'group', name: `${profile.full_name}'s Team`, created_by: user.id, client_id: profile.client_id }).select().single();
        if (ch) {
          await supabase.from('chat_participants').insert([{ channel_id: ch.id, user_id: user.id, role: 'owner' }, ...team.map(t => ({ channel_id: ch.id, user_id: t.id, role: 'member' }))]);
          teamChannel = ch;
        }
      }
      
      if (teamChannel) {
        await supabase.from('chat_messages').insert({ channel_id: teamChannel.id, sender_id: user.id, sender_type: 'user', content: msgContent, content_type: 'text' });
        await loadChannels();
        return `✅ **Message sent to team!**\n\n📨 To: ${team.length} members\n💬 "${msgContent}"`;
      }
      return `❌ Could not send. Please try again.`;
    }

    // SEND TO INDIVIDUAL
    const indMatch = userMessage.match(/(?:send|tell|message)\s+(?:a\s+message\s+)?(?:to\s+)?(\w+)[:\s]+(.+)/i) || userMessage.match(/(?:tell)\s+(\w+)\s+(?:that\s+)?(.+)/i);
    if (indMatch) {
      const targetName = indMatch[1];
      const msgContent = indMatch[2].trim();
      
      const { data: recipients } = await supabase.from('profiles').select('id, full_name').eq('client_id', profile.client_id).eq('is_active', true).ilike('full_name', `%${targetName}%`);
      if (!recipients?.length) return `I couldn't find "${targetName}". Check the spelling or use their full name.`;
      if (recipients.length > 1) return `Found multiple matches:\n${recipients.map(r => `• ${r.full_name}`).join('\n')}\n\nPlease be more specific.`;
      
      const recipient = recipients[0];
      
      // Find or create DM
      const { data: myChans } = await supabase.from('chat_participants').select('channel_id').eq('user_id', user.id);
      let dmId = null;
      if (myChans?.length) {
        const { data: shared } = await supabase.from('chat_participants').select('channel_id, chat_channels!inner(type)').eq('user_id', recipient.id).in('channel_id', myChans.map(c => c.channel_id)).eq('chat_channels.type', 'direct');
        if (shared?.length) dmId = shared[0].channel_id;
      }
      
      if (!dmId) {
        const { data: ch } = await supabase.from('chat_channels').insert({ type: 'direct', created_by: user.id, client_id: profile.client_id }).select().single();
        if (ch) {
          await supabase.from('chat_participants').insert([{ channel_id: ch.id, user_id: user.id, role: 'member' }, { channel_id: ch.id, user_id: recipient.id, role: 'member' }]);
          dmId = ch.id;
        }
      }
      
      if (dmId) {
        await supabase.from('chat_messages').insert({ channel_id: dmId, sender_id: user.id, sender_type: 'user', content: msgContent, content_type: 'text' });
        await loadChannels();
        return `✅ **Message sent!**\n\n📨 To: ${recipient.full_name}\n💬 "${msgContent}"`;
      }
      return `❌ Could not send. Please try again.`;
    }

    return `To send a message:\n• "Send to [name]: [message]"\n• "Tell [name] that [message]"\n• "Message team: [message]"`;
  };

  // === ACTION: CREATE COACHING ===
  const handleCreateCoaching = async (userMessage) => {
    const firstName = profile.full_name?.split(' ')[0];
    const canCreate = ['team_lead','category_admin','site_admin','client_admin','super_admin'].includes(profile.role);
    if (!canCreate) return `Only team leads/admins can create coaching, ${firstName}. Ask your supervisor!`;

    const { data: team } = await supabase.from('profiles').select('id, full_name').eq('reports_to', user.id).eq('is_active', true);
    const { data: comps } = await supabase.from('competencies').select('id, name').eq('client_id', profile.client_id).eq('is_active', true).limit(10);

    const match = userMessage.match(/(?:create|assign|schedule)\s+coaching\s+(?:for\s+)?(\w+)?\s*(?:on|about)?\s*(.+)?/i);
    const traineeName = match?.[1];
    const topic = match?.[2]?.replace(/^(on|about)\s+/i, '').trim();

    if (traineeName && topic) {
      const trainee = team?.find(t => t.full_name.toLowerCase().includes(traineeName.toLowerCase()));
      if (!trainee) return `"${traineeName}" not in your team.\n\n**Your team:**\n${team?.map(t => `• ${t.full_name}`).join('\n') || 'None'}`;
      
      const comp = comps?.find(c => c.name.toLowerCase().includes(topic.toLowerCase()));
      const { error } = await supabase.from('development_activities').insert({
        type: 'coaching', title: `Coaching: ${topic}`, trainee_id: trainee.id, coach_id: user.id, assigned_by: user.id, competency_id: comp?.id, status: 'pending', client_id: profile.client_id, start_date: new Date().toISOString().split('T')[0]
      });
      
      if (!error) return `✅ **Coaching Created!**\n\n👤 Trainee: ${trainee.full_name}\n📚 Topic: ${topic}\n👨‍🏫 Coach: You\n\n${trainee.full_name.split(' ')[0]} will see this in their plan.`;
      return `❌ Error creating coaching. Try again.`;
    }

    return `To create coaching:\n"Create coaching for [name] on [topic]"\n\n**Your team:**\n${team?.map(t => `• ${t.full_name}`).join('\n') || 'None'}\n\n**Competencies:**\n${comps?.slice(0,5).map(c => `• ${c.name}`).join('\n') || 'None'}`;
  };

  // === ACTION: ASSIGN TRAINING ===
  const handleAssignTraining = async (userMessage) => {
    const firstName = profile.full_name?.split(' ')[0];
    const canAssign = ['team_lead','category_admin','site_admin','client_admin','super_admin'].includes(profile.role);
    if (!canAssign) return `Only team leads/admins can assign training, ${firstName}.`;

    const { data: team } = await supabase.from('profiles').select('id, full_name').eq('reports_to', user.id).eq('is_active', true);
    const { data: modules } = await supabase.from('training_modules').select('id, title').eq('client_id', profile.client_id).eq('status', 'published').limit(10);

    const match = userMessage.match(/(?:assign|enroll|give)\s+(.+?)\s+(?:to|for)\s+(\w+)/i);
    const trainingName = match?.[1]?.replace(/training\s*/i, '').trim();
    const traineeName = match?.[2];

    if (trainingName && traineeName) {
      const trainee = team?.find(t => t.full_name.toLowerCase().includes(traineeName.toLowerCase()));
      const module = modules?.find(m => m.title.toLowerCase().includes(trainingName.toLowerCase()));
      
      if (!trainee) return `"${traineeName}" not in your team.\n\n**Your team:**\n${team?.map(t => `• ${t.full_name}`).join('\n') || 'None'}`;
      if (!module) return `"${trainingName}" not found.\n\n**Available:**\n${modules?.map(m => `• ${m.title}`).join('\n') || 'None'}`;
      
      const { data: exists } = await supabase.from('user_training').select('id').eq('user_id', trainee.id).eq('module_id', module.id).single();
      if (exists) return `${trainee.full_name} already has "${module.title}" assigned.`;
      
      const due = new Date(); due.setDate(due.getDate() + 14);
      const { error } = await supabase.from('user_training').insert({ user_id: trainee.id, module_id: module.id, status: 'pending', due_date: due.toISOString().split('T')[0], assigned_by: user.id });
      
      if (!error) return `✅ **Training Assigned!**\n\n👤 ${trainee.full_name}\n📚 ${module.title}\n📅 Due: ${due.toLocaleDateString()}`;
      return `❌ Error assigning. Try again.`;
    }

    return `To assign training:\n"Assign [course] to [name]"\n\n**Your team:**\n${team?.map(t => `• ${t.full_name}`).join('\n') || 'None'}\n\n**Courses:**\n${modules?.slice(0,5).map(m => `• ${m.title}`).join('\n') || 'None'}`;
  };

  // === QUERIES ===
  const handleRequestCoaching = async () => {
    const firstName = profile.full_name?.split(' ')[0];
    const { data: coaches } = await supabase.from('profiles').select('full_name, role').eq('client_id', profile.client_id).eq('is_active', true).in('role', ['team_lead','category_admin','site_admin','client_admin']);
    const { data: gaps } = await supabase.from('user_competencies').select('competency:competency_id(name), current_level, target_level').eq('user_id', user.id);
    const skillGaps = gaps?.filter(g => g.current_level < g.target_level) || [];
    
    let r = `I'd love to help you get coaching, ${firstName}! 🎯\n\n`;
    if (skillGaps.length) { r += `**Skills to develop:**\n${skillGaps.slice(0,4).map(g => `• ${g.competency?.name}`).join('\n')}\n\n`; }
    if (coaches?.length) { r += `**Available coaches:**\n${coaches.slice(0,4).map(c => `• ${c.full_name}`).join('\n')}\n\n`; }
    r += `**Next steps:**\n1. Go to **My Plan**\n2. Select a competency\n3. Request coaching\n\nOr message your coach directly!`;
    return r;
  };

  const handlePendingTrainings = async () => {
    const firstName = profile.full_name?.split(' ')[0];
    const { data } = await supabase.from('user_training').select(`status, due_date, module:module_id(title)`).eq('user_id', user.id).in('status', ['pending', 'in_progress']).order('due_date');
    if (!data?.length) return `No pending trainings, ${firstName}! ✅ You're all caught up.`;
    let r = `📚 **Your Trainings (${data.length})**\n\n`;
    data.forEach((t, i) => {
      const due = t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No date';
      const overdue = t.due_date && new Date(t.due_date) < new Date();
      r += `${i+1}. ${t.status === 'in_progress' ? '🔄' : '⏳'} ${t.module?.title}\n   Due: ${due}${overdue ? ' ⚠️' : ''}\n`;
    });
    return r + `\n💡 Go to **My Training** to continue.`;
  };

  const handlePendingCoaching = async () => {
    const firstName = profile.full_name?.split(' ')[0];
    const { data } = await supabase.from('development_activities').select(`title, status, due_date, coach:coach_id(full_name)`).eq('trainee_id', user.id).in('status', ['pending', 'in_progress']).order('due_date');
    if (!data?.length) return `No active coaching, ${firstName}.\n\nWant to request one? Say "I want coaching"!`;
    let r = `🎯 **Your Coaching (${data.length})**\n\n`;
    data.forEach((a, i) => r += `${i+1}. ${a.title}\n   Coach: ${a.coach?.full_name || 'TBD'}\n`);
    return r;
  };

  const handleCompetencyStatus = async () => {
    const firstName = profile.full_name?.split(' ')[0];
    const { data } = await supabase.from('user_competencies').select(`current_level, target_level, status, competency:competency_id(name)`).eq('user_id', user.id);
    if (!data?.length) return `No competencies assigned yet, ${firstName}. Talk to your team lead!`;
    const achieved = data.filter(c => c.status === 'achieved').length;
    const gaps = data.filter(c => c.current_level < c.target_level);
    let r = `📊 **Your Progress, ${firstName}**\n\n✅ ${achieved}/${data.length} achieved\n`;
    if (gaps.length) { r += `\n**To develop:**\n`; gaps.slice(0,5).forEach(g => r += `• ${g.competency?.name}: ${g.current_level}→${g.target_level}\n`); }
    return r;
  };

  const handleFindExperts = async () => {
    const { data } = await supabase.from('expert_network').select(`expertise_level, user:user_id(full_name), competency:competency_id(name)`).eq('status', 'active').eq('client_id', profile.client_id).limit(8);
    if (!data?.length) return `No experts registered yet. Ask your admin to set up the expert network!`;
    let r = `👥 **Experts**\n\n`;
    data.forEach(e => r += `• **${e.user?.full_name}** - ${e.competency?.name} (L${e.expertise_level})\n`);
    return r + `\n💡 Message them for guidance!`;
  };

  const handleTeamStatus = async () => {
    const firstName = profile.full_name?.split(' ')[0];
    const { data: team } = await supabase.from('profiles').select('id, full_name').eq('reports_to', user.id).eq('is_active', true);
    if (!team?.length) return `No direct reports assigned, ${firstName}.`;
    const teamIds = team.map(t => t.id);
    const { count: pending } = await supabase.from('user_training').select('*', { count: 'exact', head: true }).in('user_id', teamIds).in('status', ['pending', 'in_progress']);
    const { count: validation } = await supabase.from('development_activities').select('*', { count: 'exact', head: true }).eq('coach_id', user.id).eq('status', 'completed');
    return `👥 **Team (${team.length})**\n\n📚 Pending trainings: ${pending || 0}\n✅ Awaiting validation: ${validation || 0}\n\n**Members:**\n${team.map(t => `• ${t.full_name}`).join('\n')}`;
  };

  const handleKPISummary = async () => {
    const firstName = profile.full_name?.split(' ')[0];
    const { data: tr } = await supabase.from('user_training').select('status').eq('user_id', user.id);
    const { data: cp } = await supabase.from('user_competencies').select('status').eq('user_id', user.id);
    const tDone = tr?.filter(t => t.status === 'passed').length || 0;
    const cDone = cp?.filter(c => c.status === 'achieved').length || 0;
    const tPct = tr?.length ? Math.round((tDone/tr.length)*100) : 0;
    const cPct = cp?.length ? Math.round((cDone/cp.length)*100) : 0;
    return `📈 **KPIs, ${firstName}**\n\nTraining: ${tPct}% (${tDone}/${tr?.length || 0})\nCompetencies: ${cPct}% (${cDone}/${cp?.length || 0})`;
  };

  const handleTasksNeedingAttention = async () => {
    const firstName = profile.full_name?.split(' ')[0];
    const { data: overdue } = await supabase.from('user_training').select('module:module_id(title)').eq('user_id', user.id).in('status', ['pending','in_progress']).lt('due_date', new Date().toISOString());
    let r = '';
    if (overdue?.length) { r += `⚠️ **${overdue.length} Overdue**\n${overdue.slice(0,3).map(t => `• ${t.module?.title}`).join('\n')}\n\n`; }
    if (['team_lead','category_admin','site_admin','client_admin','super_admin'].includes(profile.role)) {
      const { count } = await supabase.from('development_activities').select('*', { count: 'exact', head: true }).eq('coach_id', user.id).eq('status', 'completed');
      if (count) r += `✅ **${count} Awaiting Validation**\n\n`;
    }
    return r || `All clear, ${firstName}! ✅ No urgent tasks.`;
  };

  const getHelpMessage = () => `🤖 **I Can Help With:**\n\n**📨 Messaging**\n• "Send to [name]: [message]"\n• "Tell team: [message]"\n\n**🎯 Coaching**\n• "Create coaching for [name] on [topic]"\n• "Show my coaching"\n\n**📚 Training**\n• "Assign [course] to [name]"\n• "My pending trainings"\n\n**📊 Info**\n• "My progress" / "KPI summary"\n• "Who are the experts?"\n• "How is my team?"`;

  // === DIRECT CHANNEL ===
  const createDirectChannel = async (targetUser) => {
    try {
      const { data: existing } = await supabase.from('chat_participants').select('channel_id').eq('user_id', user.id);
      const myIds = existing?.map(c => c.channel_id) || [];
      if (myIds.length) {
        const { data: shared } = await supabase.from('chat_participants').select('channel_id, chat_channels!inner(type)').eq('user_id', targetUser.id).in('channel_id', myIds).eq('chat_channels.type', 'direct');
        if (shared?.length) { const ch = channels.find(c => c.id === shared[0].channel_id); if (ch) { setActiveChannel(ch); setShowNewChannelModal(false); return; } }
      }
      const { data: ch } = await supabase.from('chat_channels').insert({ type: 'direct', created_by: user.id, client_id: profile.client_id }).select().single();
      if (ch) { await supabase.from('chat_participants').insert([{ channel_id: ch.id, user_id: user.id, role: 'member' }, { channel_id: ch.id, user_id: targetUser.id, role: 'member' }]); await loadChannels(); setActiveChannel(ch); }
      setShowNewChannelModal(false);
    } catch (e) { console.error('Error:', e); }
  };

  const getChannelDisplayName = (ch) => ch.type === 'ai_assistant' ? (profile.role === 'super_admin' ? ch.name : 'AI Assistant') : ch.type === 'group' ? ch.name || 'Group' : 'Direct Message';
  const getChannelIcon = (type) => type === 'ai_assistant' ? <Bot className="w-5 h-5 text-purple-500" /> : type === 'group' ? <Users className="w-5 h-5 text-blue-500" /> : <MessageSquare className="w-5 h-5 text-green-500" />;
  const formatTime = (ts) => { const d = new Date(ts), now = new Date(), diff = Math.floor((now-d)/(1000*60*60*24)); return diff === 0 ? d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : diff === 1 ? 'Yesterday' : d.toLocaleDateString([],{month:'short',day:'numeric'}); };

  const grouped = { ai: channels.filter(c => c.type === 'ai_assistant'), dm: channels.filter(c => c.type === 'direct'), grp: channels.filter(c => c.type === 'group') };
  const filtered = users.filter(u => u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      <div className="w-80 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex justify-between mb-3"><h2 className="text-lg font-semibold">Messages</h2><button onClick={() => setShowNewChannelModal(true)} className="p-2 hover:bg-gray-100 rounded-lg"><Plus className="w-5 h-5 text-gray-600" /></button></div>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm" /></div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {grouped.ai.length > 0 && <div className="py-2"><div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">AI Assistant</div>{grouped.ai.map(ch => <ChItem key={ch.id} ch={ch} active={activeChannel?.id===ch.id} unread={unreadCounts[ch.id]||0} onClick={()=>setActiveChannel(ch)} getIcon={getChannelIcon} getName={getChannelDisplayName} />)}</div>}
          {grouped.dm.length > 0 && <div className="py-2"><div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">Direct Messages</div>{grouped.dm.map(ch => <ChItem key={ch.id} ch={ch} active={activeChannel?.id===ch.id} unread={unreadCounts[ch.id]||0} onClick={()=>setActiveChannel(ch)} getIcon={getChannelIcon} getName={getChannelDisplayName} />)}</div>}
          {grouped.grp.length > 0 && <div className="py-2"><div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">Groups</div>{grouped.grp.map(ch => <ChItem key={ch.id} ch={ch} active={activeChannel?.id===ch.id} unread={unreadCounts[ch.id]||0} onClick={()=>setActiveChannel(ch)} getIcon={getChannelIcon} getName={getChannelDisplayName} />)}</div>}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        {activeChannel ? (<>
          <div className="h-16 px-6 flex items-center justify-between bg-white border-b">
            <div className="flex items-center gap-3">{getChannelIcon(activeChannel.type)}<div><h3 className="font-semibold">{getChannelDisplayName(activeChannel)}</h3>{activeChannel.type==='ai_assistant'&&<p className="text-xs text-gray-500">Always here to help</p>}</div></div>
            <button className="p-2 hover:bg-gray-100 rounded-lg"><MoreVertical className="w-5 h-5 text-gray-500" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, i) => {
              const own = msg.sender_id===user.id && msg.sender_type==='user';
              const ai = msg.sender_type==='ai';
              const showAv = i===0 || messages[i-1].sender_id!==msg.sender_id || messages[i-1].sender_type!==msg.sender_type;
              return (
                <div key={msg.id} className={`flex ${own?'justify-end':'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[70%] ${own?'flex-row-reverse':''}`}>
                    {showAv && <div className={`w-8 h-8 rounded-full flex items-center justify-center ${ai?'bg-purple-100':own?'bg-blue-100':'bg-gray-100'}`}>{ai?<Bot className="w-4 h-4 text-purple-600"/>:<span className="text-sm font-medium">{(msg.sender?.full_name||profile?.full_name||'U')[0]}</span>}</div>}
                    {!showAv && <div className="w-8"/>}
                    <div>
                      {showAv && <div className={`flex items-center gap-2 mb-1 ${own?'justify-end':''}`}><span className="text-sm font-medium text-gray-700">{ai?'AI Assistant':msg.sender?.full_name||profile?.full_name}</span><span className="text-xs text-gray-400">{formatTime(msg.created_at)}</span></div>}
                      <div className={`rounded-2xl px-4 py-2 ${own?'bg-blue-600 text-white':ai?'bg-purple-50 border border-purple-100':'bg-white border'}`}><p className="text-sm whitespace-pre-wrap">{msg.content}</p></div>
                    </div>
                  </div>
                </div>
              );
            })}
            {aiThinking && <div className="flex"><div className="flex gap-3"><div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center"><Bot className="w-4 h-4 text-purple-600"/></div><div className="rounded-2xl px-4 py-3 bg-purple-50 border border-purple-100"><div className="flex items-center gap-2 text-purple-600"><Loader2 className="w-4 h-4 animate-spin"/><span className="text-sm">Thinking...</span></div></div></div></div>}
            <div ref={messagesEndRef}/>
          </div>
          <div className="p-4 bg-white border-t">
            <form onSubmit={sendMessage} className="flex items-center gap-3">
              <button type="button" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><Paperclip className="w-5 h-5"/></button>
              <input ref={inputRef} value={newMessage} onChange={e=>setNewMessage(e.target.value)} placeholder={activeChannel.type==='ai_assistant'?"Ask me anything...":"Type a message..."} className="flex-1 px-4 py-2 bg-gray-100 rounded-full" disabled={sendingMessage||aiThinking}/>
              <button type="button" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><Smile className="w-5 h-5"/></button>
              <button type="submit" disabled={!newMessage.trim()||sendingMessage||aiThinking} className={`p-3 rounded-full ${newMessage.trim()&&!sendingMessage&&!aiThinking?'bg-blue-600 text-white':'bg-gray-200 text-gray-400'}`}><Send className="w-5 h-5"/></button>
            </form>
          </div>
        </>) : <div className="flex-1 flex items-center justify-center"><div className="text-center"><MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4"/><h3 className="text-lg font-medium text-gray-600">Select a conversation</h3></div></div>}
      </div>
      {showNewChannelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between p-4 border-b"><h3 className="text-lg font-semibold">New Conversation</h3><button onClick={()=>setShowNewChannelModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500"/></button></div>
            <div className="p-4">
              <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search users..." className="w-full pl-10 pr-4 py-2 border rounded-lg" autoFocus/></div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filtered.map(u => <button key={u.id} onClick={()=>createDirectChannel(u)} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg text-left"><div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"><span className="text-sm font-medium">{(u.full_name||u.email)[0].toUpperCase()}</span></div><div className="flex-1 min-w-0"><p className="font-medium truncate">{u.full_name||'Unnamed'}</p><p className="text-sm text-gray-500 truncate">{u.email}</p></div><span className="text-xs text-gray-400">{u.role?.replace('_',' ')}</span></button>)}
                {!filtered.length && <p className="text-center text-gray-500 py-8">No users found</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChItem({ ch, active, unread, onClick, getIcon, getName }) {
  return <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 ${active?'bg-blue-50 border-r-2 border-blue-600':'hover:bg-gray-50'}`}>{getIcon(ch.type)}<div className="flex-1 text-left"><p className={`font-medium truncate ${active?'text-blue-600':'text-gray-800'}`}>{getName(ch)}</p></div>{unread>0&&<span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{unread>99?'99+':unread}</span>}</button>;
}
