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
  const [aiContext, setAiContext] = useState(null); // Track ongoing AI conversation state
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [pendingAction, setPendingAction] = useState(null); // Track multi-turn conversation state
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { if (profile) { loadChannels(); loadUsers(); } }, [profile]);
  useEffect(() => { if (activeChannel) { loadMessages(activeChannel.id); markAsRead(activeChannel.id); } }, [activeChannel]);
  
  useEffect(() => {
    if (!activeChannel) return;
    const sub = supabase.channel(`chat:${activeChannel.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${activeChannel.id}` },
      async (payload) => {
        const newMsg = payload.new;
        if (newMsg.sender_id) { const { data } = await supabase.from('profiles').select('id, full_name, email').eq('id', newMsg.sender_id).single(); newMsg.sender = data; }
        setMessages(prev => [...prev, newMsg]); scrollToBottom();
        if (newMsg.sender_id !== user.id) markAsRead(activeChannel.id);
      }).subscribe();
    return () => supabase.removeChannel(sub);
  }, [activeChannel]);

  useEffect(() => { scrollToBottom(); }, [messages]);
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const loadChannels = async () => {
    try {
      setLoading(true);
      const { data: parts } = await supabase.from('chat_participants').select(`channel_id, last_read_at, chat_channels (id, type, name, created_by, client_id)`).eq('user_id', user.id);
      const list = parts?.map(p => ({ ...p.chat_channels, last_read_at: p.last_read_at })).filter(c => c?.id) || [];
      if (profile.role === 'super_admin') await ensureSuperAdminInAllAIChannels();
      if (!list.find(c => c.type === 'ai_assistant' && c.client_id === profile.client_id) && profile.role !== 'super_admin') { await createAIChannel(profile.client_id); return loadChannels(); }
      setChannels(list);
      await calcUnread(list);
      if (!activeChannel) setActiveChannel(list.find(c => c.type === 'ai_assistant') || list[0]);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const ensureSuperAdminInAllAIChannels = async () => {
    const { data: ai } = await supabase.from('chat_channels').select('id').eq('type', 'ai_assistant');
    const { data: my } = await supabase.from('chat_participants').select('channel_id').eq('user_id', user.id);
    const myIds = my?.map(p => p.channel_id) || [];
    const missing = ai?.filter(c => !myIds.includes(c.id)) || [];
    if (missing.length) await supabase.from('chat_participants').insert(missing.map(c => ({ channel_id: c.id, user_id: user.id, role: 'admin' })));
  };

  const createAIChannel = async (clientId) => {
    const { data: exists } = await supabase.from('chat_channels').select('id').eq('type', 'ai_assistant').eq('client_id', clientId).maybeSingle();
    if (exists) return;
    const { data: client } = await supabase.from('clients').select('name').eq('id', clientId).single();
    const { data: ch } = await supabase.from('chat_channels').insert({ type: 'ai_assistant', name: `AI Assistant - ${client?.name}`, created_by: user.id, client_id: clientId }).select().single();
    if (!ch) return;
    const { data: users } = await supabase.from('profiles').select('id').eq('client_id', clientId).eq('is_active', true);
    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'super_admin');
    const all = [...new Set([...(users?.map(u => u.id)||[]), ...(admins?.map(u => u.id)||[])])];
    await supabase.from('chat_participants').insert(all.map(uid => ({ channel_id: ch.id, user_id: uid, role: uid === user.id ? 'owner' : 'member' })));
    await supabase.from('chat_messages').insert({ channel_id: ch.id, sender_id: user.id, sender_type: 'ai', content: `👋 Hi! I'm your AI Assistant.\n\nI can:\n• Set up coaching sessions\n• Send messages to colleagues\n• Show your training & progress\n• Answer development questions\n\nJust tell me what you need!`, content_type: 'text' });
  };

  const calcUnread = async (list) => {
    const counts = {};
    for (const ch of list) {
      let q = supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('channel_id', ch.id).neq('sender_id', user.id);
      if (ch.last_read_at) q = q.gt('created_at', ch.last_read_at);
      const { count } = await q;
      counts[ch.id] = count || 0;
    }
    setUnreadCounts(counts);
  };

  const markAsRead = async (chId) => {
    await supabase.from('chat_participants').update({ last_read_at: new Date().toISOString() }).eq('channel_id', chId).eq('user_id', user.id);
    setUnreadCounts(p => ({ ...p, [chId]: 0 }));
  };

  const loadMessages = async (chId) => {
    const { data } = await supabase.from('chat_messages').select('*, sender:sender_id(id, full_name, email)').eq('channel_id', chId).eq('is_deleted', false).order('created_at').limit(100);
    setMessages(data || []);
  };

  const loadUsers = async () => {
    let q = supabase.from('profiles').select('id, full_name, email, role').eq('is_active', true).neq('id', user.id);
    if (profile.role !== 'super_admin') q = q.eq('client_id', profile.client_id);
    const { data } = await q.order('full_name');
    setUsers(data || []);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel || sendingMessage) return;
    const content = newMessage.trim();
    setNewMessage(''); setSendingMessage(true);
    try {
      await supabase.from('chat_messages').insert({ channel_id: activeChannel.id, sender_id: user.id, sender_type: 'user', content, content_type: 'text' });
      if (activeChannel.type === 'ai_assistant') await processAI(content);
    } catch (e) { console.error(e); setNewMessage(content); }
    finally { setSendingMessage(false); inputRef.current?.focus(); }
  };

  // ============ PROACTIVE AI AGENT ============
  const processAI = async (msg) => {
    setAiThinking(true);
    try {
      const firstName = profile.full_name?.split(' ')[0] || '';
      const lower = msg.toLowerCase();
      
      // Get all users for name matching
      const { data: allUsers } = await supabase.from('profiles').select('id, full_name, role').eq('client_id', profile.client_id).eq('is_active', true);
      
      // Extract mentioned names
      const mentionedUsers = [];
      for (const u of allUsers || []) {
        const nameParts = u.full_name?.toLowerCase().split(' ') || [];
        for (const part of nameParts) {
          if (part.length > 2 && lower.includes(part)) {
            if (!mentionedUsers.find(m => m.id === u.id)) mentionedUsers.push(u);
          }
        }
      }
      
      // Extract date
      let targetDate = new Date();
      let dateStr = '';
      const dateMatch = msg.match(/(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s*(?:at\s*)?(\d{1,2})?(?::(\d{2}))?\s*(am|pm)?/i);
      if (dateMatch) {
        const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
        targetDate = new Date(new Date().getFullYear(), months[dateMatch[2].toLowerCase().slice(0,3)], parseInt(dateMatch[1]));
        if (dateMatch[3]) {
          let hour = parseInt(dateMatch[3]);
          if (dateMatch[5]?.toLowerCase() === 'pm' && hour < 12) hour += 12;
          targetDate.setHours(hour, parseInt(dateMatch[4]) || 0);
        }
        dateStr = targetDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        if (dateMatch[3]) dateStr += ` at ${dateMatch[3]}${dateMatch[4] ? ':' + dateMatch[4] : ''}${dateMatch[5] || ''}`;
      } else if (lower.includes('tomorrow')) { targetDate.setDate(targetDate.getDate() + 1); dateStr = 'Tomorrow'; }
      else if (lower.includes('today')) { dateStr = 'Today'; }
      
      // Extract topic
      let topic = '';
      const topicMatch = msg.match(/(?:topic[:\s]+|about[:\s]+|on[:\s]+)\s*([^,]+?)(?:,|when|$)/i);
      if (topicMatch) topic = topicMatch[1].trim();
      
      let response = '';
      
      // ===== CHECK PENDING ACTION FIRST (Multi-turn conversation) =====
      if (pendingAction?.type === 'coaching_request') {
        // Get all coaches
        const { data: allCoaches } = await supabase.from('profiles').select('id, full_name, role').eq('client_id', profile.client_id).in('role', ['team_lead','category_admin','site_admin','client_admin']).eq('is_active', true);
        
        // Cancel check
        if (lower.includes('cancel') || lower.includes('nevermind') || lower === 'no') {
          setPendingAction(null);
          response = `No problem, ${firstName}! Let me know if you need anything else. 😊`;
          await supabase.from('chat_messages').insert({ channel_id: activeChannel.id, sender_id: user.id, sender_type: 'ai', content: response, content_type: 'text' });
          setAiThinking(false);
          return;
        }
        
        // Parse the message for coach, topic, when - be flexible!
        let foundCoach = pendingAction.coach;
        let foundTopic = pendingAction.topic || topic;
        let foundWhen = pendingAction.when || dateStr;
        
        // Check if message contains a coach name
        for (const c of allCoaches || []) {
          const nameParts = c.full_name.toLowerCase().split(' ');
          for (const part of nameParts) {
            if (part.length > 2 && lower.includes(part)) {
              foundCoach = c;
              break;
            }
          }
          if (foundCoach) break;
        }
        
        // Check for topic in message - multiple patterns
        const topicPatterns = [
          /topic[:\s]+([^,]+?)(?:,|when|$)/i,
          /about[:\s]+([^,]+?)(?:,|when|$)/i,
          /on[:\s]+([^,]+?)(?:,|when|$)/i,
        ];
        for (const pattern of topicPatterns) {
          const match = msg.match(pattern);
          if (match) { foundTopic = match[1].trim(); break; }
        }
        
        // If still no topic but we have coach and message isn't just a name, use message as topic
        if (!foundTopic && foundCoach && !lower.match(/^(yes|ok|sure|\w+\s*,?\s*$)/i) && msg.length > 10) {
          foundTopic = msg.replace(/,.*when.*/i, '').replace(foundCoach?.full_name || '', '').trim();
        }
        
        // Check for when
        if (dateStr && dateStr !== '') foundWhen = dateStr;
        const whenMatch = msg.match(/when[:\s]+(.+?)(?:$)/i);
        if (whenMatch) foundWhen = whenMatch[1].trim();
        
        // Update pending action
        setPendingAction({ ...pendingAction, coach: foundCoach, topic: foundTopic, when: foundWhen });
        
        // If we have coach AND topic, create the session!
        if (foundCoach && foundTopic) {
          response = await createCoachingSession(foundCoach, foundTopic, targetDate, foundWhen || 'This week');
          setPendingAction(null);
          await supabase.from('chat_messages').insert({ channel_id: activeChannel.id, sender_id: user.id, sender_type: 'ai', content: response, content_type: 'text' });
          setAiThinking(false);
          return;
        }
        
        // Still need info - ask for what's missing
        response = `Got it! `;
        if (foundCoach) response += `✓ Coach: ${foundCoach.full_name}\n`;
        if (foundTopic) response += `✓ Topic: ${foundTopic}\n`;
        if (foundWhen) response += `✓ When: ${foundWhen}\n`;
        response += `\n`;
        
        if (!foundCoach) {
          response += `**Who should be your coach?**\n${allCoaches?.map(c => `• ${c.full_name}`).join('\n')}\n\n`;
        }
        if (!foundTopic) {
          response += `**What topic do you want coaching on?**\n(e.g., "Shift handover", "CIP procedures", "Equipment operation")\n\n`;
        }
        
        response += `💡 Or say "cancel" to stop.`;
        await supabase.from('chat_messages').insert({ channel_id: activeChannel.id, sender_id: user.id, sender_type: 'ai', content: response, content_type: 'text' });
        setAiThinking(false);
        return;
      }
      
      // ===== COACHING REQUEST (Start new flow) =====
      if (lower.match(/(need|want|like to|help|request|set up|schedule|organize|book).*(coaching|session|coach)/i)) {
        const coach = mentionedUsers.find(u => ['team_lead','category_admin','site_admin','client_admin','super_admin'].includes(u.role));
        const { data: comps } = await supabase.from('competencies').select('id, name').eq('client_id', profile.client_id).eq('is_active', true);
        const competency = topic ? comps?.find(c => c.name.toLowerCase().includes(topic.toLowerCase())) : null;
        
        if (coach && topic) {
          // Have everything - create immediately!
          response = await createCoachingSession(coach, topic, targetDate, dateStr || 'This week');
        } else if (coach) {
          // Have coach, need topic
          setPendingAction({ type: 'coaching_request', coach });
          response = `Great! ${coach.full_name} will be your coach. 🎯\n\nWhat topic would you like coaching on?`;
        } else {
          // Need coach (and maybe topic)
          const { data: coaches } = await supabase.from('profiles').select('full_name, role').eq('client_id', profile.client_id).in('role', ['team_lead','category_admin','site_admin','client_admin']).eq('is_active', true);
          setPendingAction({ type: 'coaching_request', topic });
          response = `I'll set that up for you, ${firstName}! 🎯\n\n`;
          if (topic) response += `📚 **Topic:** ${topic}\n\n`;
          response += `**Who should be your coach?**\n\n${coaches?.map(c => `• **${c.full_name}**`).join('\n') || 'No coaches found'}\n\n`;
          response += `Just tell me the name, or provide everything:\n"Aurelien, topic: shift handover, when: 13 Jan at 9am"`;
        }
      }
      
      // ===== SEND MESSAGE =====
      else if (lower.match(/(send|tell|message|notify).*(to|team|everyone)/i)) {
        const isTeam = lower.includes('team') || lower.includes('everyone');
        const msgMatch = msg.match(/[:\-]\s*(.+)$/i) || msg.match(/that\s+(.+)$/i);
        const msgContent = msgMatch?.[1]?.trim() || '';
        
        if (isTeam) {
          const { data: team } = await supabase.from('profiles').select('id, full_name').eq('reports_to', user.id).eq('is_active', true);
          if (!team?.length) { response = `You don't have team members assigned.`; }
          else if (!msgContent) { response = `What message should I send to your ${team.length} team members?`; }
          else {
            let grpCh = channels.find(c => c.type === 'group');
            if (!grpCh) {
              const { data: ch } = await supabase.from('chat_channels').insert({ type: 'group', name: `${profile.full_name}'s Team`, created_by: user.id, client_id: profile.client_id }).select().single();
              if (ch) { await supabase.from('chat_participants').insert([{ channel_id: ch.id, user_id: user.id, role: 'owner' }, ...team.map(t => ({ channel_id: ch.id, user_id: t.id, role: 'member' }))]); grpCh = ch; }
            }
            if (grpCh) {
              await supabase.from('chat_messages').insert({ channel_id: grpCh.id, sender_id: user.id, sender_type: 'user', content: msgContent, content_type: 'text' });
              loadChannels();
              response = `✅ **Sent to team!**\n\n📨 ${team.length} members\n💬 "${msgContent}"`;
            }
          }
        } else if (mentionedUsers.length > 0) {
          const target = mentionedUsers[0];
          if (!msgContent) { response = `What should I tell ${target.full_name}?`; }
          else {
            const dmId = await getOrCreateDM(target.id);
            if (dmId) {
              await supabase.from('chat_messages').insert({ channel_id: dmId, sender_id: user.id, sender_type: 'user', content: msgContent, content_type: 'text' });
              loadChannels();
              response = `✅ **Sent!**\n\n📨 ${target.full_name}\n💬 "${msgContent}"`;
            }
          }
        } else {
          response = `Who should I send the message to?`;
        }
      }
      
      // ===== QUERIES =====
      else if (lower.match(/(my|pending|show).*(training|course)/i)) {
        const { data } = await supabase.from('user_training').select('status, due_date, module:module_id(title)').eq('user_id', user.id).in('status', ['pending', 'in_progress']).order('due_date');
        if (!data?.length) response = `No pending trainings, ${firstName}! ✅ You're all caught up.`;
        else {
          response = `📚 **Your Trainings (${data.length})**\n\n`;
          data.forEach((t, i) => {
            const overdue = t.due_date && new Date(t.due_date) < new Date();
            response += `${i + 1}. ${t.module?.title}${overdue ? ' ⚠️ OVERDUE' : ''}\n`;
          });
        }
      }
      else if (lower.match(/(my|current|show).*(coaching|development)/i)) {
        const { data } = await supabase.from('development_activities').select('title, coach:coach_id(full_name)').eq('trainee_id', user.id).in('status', ['pending', 'in_progress']);
        if (!data?.length) response = `No active coaching. Want to request one?`;
        else {
          response = `🎯 **Your Coaching**\n\n`;
          data.forEach((a, i) => response += `${i + 1}. ${a.title} (Coach: ${a.coach?.full_name})\n`);
        }
      }
      else if (lower.match(/(competenc|skill|progress|gap)/i)) {
        const { data } = await supabase.from('user_competencies').select('current_level, target_level, status, competency:competency_id(name)').eq('user_id', user.id);
        if (!data?.length) response = `No competencies assigned yet.`;
        else {
          const achieved = data.filter(c => c.status === 'achieved').length;
          response = `📊 **Progress:** ${achieved}/${data.length} achieved\n\n`;
          const gaps = data.filter(c => c.current_level < c.target_level);
          if (gaps.length) { response += `**To develop:**\n`; gaps.slice(0, 5).forEach(g => response += `• ${g.competency?.name}\n`); }
        }
      }
      else if (lower.match(/(expert|who knows|who can)/i)) {
        const { data } = await supabase.from('expert_network').select('user:user_id(full_name), competency:competency_id(name), expertise_level').eq('status', 'active').eq('client_id', profile.client_id).limit(8);
        if (!data?.length) response = `No experts registered yet.`;
        else { response = `👥 **Experts**\n\n`; data.forEach(e => response += `• ${e.user?.full_name} - ${e.competency?.name}\n`); }
      }
      else if (lower.match(/(team|report)/i) && ['team_lead','category_admin','site_admin','client_admin','super_admin'].includes(profile.role)) {
        const { data: team } = await supabase.from('profiles').select('full_name').eq('reports_to', user.id).eq('is_active', true);
        if (!team?.length) response = `No direct reports.`;
        else { response = `👥 **Team (${team.length})**\n\n${team.map(t => `• ${t.full_name}`).join('\n')}`; }
      }
      else if (lower.match(/(kpi|summary|overview|dashboard)/i)) {
        const { data: tr } = await supabase.from('user_training').select('status').eq('user_id', user.id);
        const { data: cp } = await supabase.from('user_competencies').select('status').eq('user_id', user.id);
        const tPct = tr?.length ? Math.round((tr.filter(t => t.status === 'passed').length / tr.length) * 100) : 0;
        const cPct = cp?.length ? Math.round((cp.filter(c => c.status === 'achieved').length / cp.length) * 100) : 0;
        response = `📈 **KPIs**\n\nTraining: ${tPct}%\nCompetencies: ${cPct}%`;
      }
      else if (lower.match(/^(hi|hello|hey|bonjour)/i)) {
        response = `Hello ${firstName}! 👋 How can I help you today?`;
      }
      else if (lower.includes('help')) {
        response = `🤖 **I can help with:**\n\n• "Request coaching with [name] on [topic]"\n• "Send [name] a message: [text]"\n• "Show my pending trainings"\n• "What's my progress?"\n• "Who are the experts?"`;
      }
      else {
        response = `I'm here to help, ${firstName}! 😊\n\nTry:\n• "Request coaching with Aurelien on shift handover"\n• "Send Jean: Meeting at 2pm"\n• "Show my trainings"`;
      }

      await supabase.from('chat_messages').insert({ channel_id: activeChannel.id, sender_id: user.id, sender_type: 'ai', content: response, content_type: 'text' });
    } catch (e) {
      console.error('AI error:', e);
      await supabase.from('chat_messages').insert({ channel_id: activeChannel.id, sender_id: user.id, sender_type: 'ai', content: '❌ Error. Please try again.', content_type: 'text' });
    } finally { setAiThinking(false); }
  };

  // Helper: Create coaching session
  const createCoachingSession = async (coach, topic, targetDate, dateStr) => {
    const { data: comps } = await supabase.from('competencies').select('id, name').eq('client_id', profile.client_id).eq('is_active', true);
    const competency = comps?.find(c => c.name.toLowerCase().includes(topic.toLowerCase()));
    
    const { error } = await supabase.from('development_activities').insert({
      type: 'coaching', 
      title: `Coaching: ${topic}`,
      description: `Requested via AI Assistant`,
      trainee_id: user.id, 
      coach_id: coach.id, 
      assigned_by: user.id,
      competency_id: competency?.id, 
      status: 'pending', 
      client_id: profile.client_id,
      start_date: targetDate.toISOString().split('T')[0], 
      due_date: targetDate.toISOString().split('T')[0]
    });
    
    if (error) {
      console.error('Coaching create error:', error);
      return `❌ Error creating session. Please try again.`;
    }
    
    await notify(coach.id, `🎯 **Coaching Request**\n\nFrom: ${profile.full_name}\nTopic: ${topic}\nWhen: ${dateStr}\n\nCheck Development Activities!`);
    
    return `✅ **Done! Coaching session booked.**\n\n👨‍🏫 **Coach:** ${coach.full_name}\n📚 **Topic:** ${topic}\n📅 **When:** ${dateStr}\n\n${coach.full_name.split(' ')[0]} has been notified!\n\nAnything else you need?`;
  };

  const getOrCreateDM = async (targetId) => {
    const { data: my } = await supabase.from('chat_participants').select('channel_id').eq('user_id', user.id);
    if (my?.length) {
      const { data: shared } = await supabase.from('chat_participants').select('channel_id, chat_channels!inner(type)').eq('user_id', targetId).in('channel_id', my.map(c => c.channel_id)).eq('chat_channels.type', 'direct');
      if (shared?.length) return shared[0].channel_id;
    }
    const { data: ch } = await supabase.from('chat_channels').insert({ type: 'direct', created_by: user.id, client_id: profile.client_id }).select().single();
    if (ch) { await supabase.from('chat_participants').insert([{ channel_id: ch.id, user_id: user.id, role: 'member' }, { channel_id: ch.id, user_id: targetId, role: 'member' }]); return ch.id; }
    return null;
  };

  const notify = async (targetId, msg) => {
    const dmId = await getOrCreateDM(targetId);
    if (dmId) await supabase.from('chat_messages').insert({ channel_id: dmId, sender_id: user.id, sender_type: 'system', content: msg, content_type: 'text' });
  };

  const createDM = async (target) => {
    const dmId = await getOrCreateDM(target.id);
    if (dmId) { await loadChannels(); setActiveChannel(channels.find(c => c.id === dmId) || { id: dmId, type: 'direct' }); }
    setShowNewChannelModal(false);
  };

  const getName = (ch) => ch.type === 'ai_assistant' ? (profile.role === 'super_admin' ? ch.name : 'AI Assistant') : ch.type === 'group' ? ch.name || 'Group' : 'Direct Message';
  const getIcon = (t) => t === 'ai_assistant' ? <Bot className="w-5 h-5 text-purple-500" /> : t === 'group' ? <Users className="w-5 h-5 text-blue-500" /> : <MessageSquare className="w-5 h-5 text-green-500" />;
  const fmtTime = (ts) => { const d = new Date(ts); const diff = Math.floor((new Date() - d) / 86400000); return diff === 0 ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : diff === 1 ? 'Yesterday' : d.toLocaleDateString([], { month: 'short', day: 'numeric' }); };

  const grouped = { ai: channels.filter(c => c.type === 'ai_assistant'), dm: channels.filter(c => c.type === 'direct'), grp: channels.filter(c => c.type === 'group') };
  const filtered = users.filter(u => u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      <div className="w-80 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex justify-between mb-3"><h2 className="text-lg font-semibold">Messages</h2><button onClick={() => setShowNewChannelModal(true)} className="p-2 hover:bg-gray-100 rounded-lg"><Plus className="w-5 h-5" /></button></div>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input placeholder="Search..." className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm" /></div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {grouped.ai.length > 0 && <div className="py-2"><div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">AI Assistant</div>{grouped.ai.map(ch => <ChBtn key={ch.id} ch={ch} active={activeChannel?.id === ch.id} unread={unreadCounts[ch.id]} onClick={() => setActiveChannel(ch)} getIcon={getIcon} getName={getName} />)}</div>}
          {grouped.dm.length > 0 && <div className="py-2"><div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">Direct Messages</div>{grouped.dm.map(ch => <ChBtn key={ch.id} ch={ch} active={activeChannel?.id === ch.id} unread={unreadCounts[ch.id]} onClick={() => setActiveChannel(ch)} getIcon={getIcon} getName={getName} />)}</div>}
          {grouped.grp.length > 0 && <div className="py-2"><div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">Groups</div>{grouped.grp.map(ch => <ChBtn key={ch.id} ch={ch} active={activeChannel?.id === ch.id} unread={unreadCounts[ch.id]} onClick={() => setActiveChannel(ch)} getIcon={getIcon} getName={getName} />)}</div>}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        {activeChannel ? (<>
          <div className="h-16 px-6 flex items-center justify-between bg-white border-b">
            <div className="flex items-center gap-3">{getIcon(activeChannel.type)}<div><h3 className="font-semibold">{getName(activeChannel)}</h3>{activeChannel.type === 'ai_assistant' && <p className="text-xs text-gray-500">Always here to help</p>}</div></div>
            <button className="p-2 hover:bg-gray-100 rounded-lg"><MoreVertical className="w-5 h-5 text-gray-500" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((m, i) => {
              const own = m.sender_id === user.id && m.sender_type === 'user';
              const ai = m.sender_type === 'ai' || m.sender_type === 'system';
              const showAv = i === 0 || messages[i - 1].sender_id !== m.sender_id || messages[i - 1].sender_type !== m.sender_type;
              return (
                <div key={m.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[70%] ${own ? 'flex-row-reverse' : ''}`}>
                    {showAv && <div className={`w-8 h-8 rounded-full flex items-center justify-center ${ai ? 'bg-purple-100' : own ? 'bg-blue-100' : 'bg-gray-100'}`}>{ai ? <Bot className="w-4 h-4 text-purple-600" /> : <span className="text-sm font-medium">{(m.sender?.full_name || profile?.full_name || 'U')[0]}</span>}</div>}
                    {!showAv && <div className="w-8" />}
                    <div>
                      {showAv && <div className={`flex items-center gap-2 mb-1 ${own ? 'justify-end' : ''}`}><span className="text-sm font-medium text-gray-700">{ai ? 'AI Assistant' : m.sender?.full_name || profile?.full_name}</span><span className="text-xs text-gray-400">{fmtTime(m.created_at)}</span></div>}
                      <div className={`rounded-2xl px-4 py-2 ${own ? 'bg-blue-600 text-white' : ai ? 'bg-purple-50 border border-purple-100' : 'bg-white border'}`}><p className="text-sm whitespace-pre-wrap">{m.content}</p></div>
                    </div>
                  </div>
                </div>
              );
            })}
            {aiThinking && <div className="flex"><div className="flex gap-3"><div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center"><Bot className="w-4 h-4 text-purple-600" /></div><div className="rounded-2xl px-4 py-3 bg-purple-50 border border-purple-100"><div className="flex items-center gap-2 text-purple-600"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Working on it...</span></div></div></div></div>}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 bg-white border-t">
            <form onSubmit={sendMessage} className="flex items-center gap-3">
              <button type="button" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><Paperclip className="w-5 h-5" /></button>
              <input ref={inputRef} value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder={activeChannel.type === 'ai_assistant' ? "Tell me what you need..." : "Type a message..."} className="flex-1 px-4 py-2 bg-gray-100 rounded-full" disabled={sendingMessage || aiThinking} />
              <button type="button" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><Smile className="w-5 h-5" /></button>
              <button type="submit" disabled={!newMessage.trim() || sendingMessage || aiThinking} className={`p-3 rounded-full ${newMessage.trim() && !sendingMessage && !aiThinking ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}><Send className="w-5 h-5" /></button>
            </form>
          </div>
        </>) : <div className="flex-1 flex items-center justify-center"><div className="text-center"><MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-600">Select a conversation</h3></div></div>}
      </div>
      {showNewChannelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between p-4 border-b"><h3 className="text-lg font-semibold">New Conversation</h3><button onClick={() => setShowNewChannelModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button></div>
            <div className="p-4">
              <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search users..." className="w-full pl-10 pr-4 py-2 border rounded-lg" autoFocus /></div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filtered.map(u => <button key={u.id} onClick={() => createDM(u)} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg text-left"><div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"><span className="text-sm font-medium">{(u.full_name || u.email)[0].toUpperCase()}</span></div><div className="flex-1"><p className="font-medium truncate">{u.full_name}</p><p className="text-sm text-gray-500 truncate">{u.email}</p></div></button>)}
                {!filtered.length && <p className="text-center text-gray-500 py-8">No users found</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChBtn({ ch, active, unread, onClick, getIcon, getName }) {
  return <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 ${active ? 'bg-blue-50 border-r-2 border-blue-600' : 'hover:bg-gray-50'}`}>{getIcon(ch.type)}<div className="flex-1 text-left"><p className={`font-medium truncate ${active ? 'text-blue-600' : ''}`}>{getName(ch)}</p></div>{unread > 0 && <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{unread > 99 ? '99+' : unread}</span>}</button>;
}
