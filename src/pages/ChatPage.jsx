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
      const { data: participations, error: partError } = await supabase
        .from('chat_participants')
        .select(`channel_id, last_read_at, chat_channels (id, type, name, created_by, client_id, created_at, updated_at)`)
        .eq('user_id', user.id);
      if (partError) throw partError;
      const channelList = participations.map(p => ({ ...p.chat_channels, last_read_at: p.last_read_at })).filter(c => c.id);
      
      if (profile.role === 'super_admin') await ensureSuperAdminInAllAIChannels();
      
      const clientAiChannel = channelList.find(c => c.type === 'ai_assistant' && c.client_id === profile.client_id);
      if (!clientAiChannel && profile.role !== 'super_admin') {
        await createClientAIAssistantChannel(profile.client_id);
        await loadChannels();
        return;
      }
      setChannels(channelList);
      await calculateUnreadCounts(channelList);
      if (!activeChannel) {
        const defaultChannel = channelList.find(c => c.type === 'ai_assistant') || channelList[0];
        if (defaultChannel) setActiveChannel(defaultChannel);
      }
    } catch (error) { console.error('Error loading channels:', error); }
    finally { setLoading(false); }
  };

  const ensureSuperAdminInAllAIChannels = async () => {
    try {
      const { data: aiChannels } = await supabase.from('chat_channels').select('id, client_id, name').eq('type', 'ai_assistant');
      const { data: existingParts } = await supabase.from('chat_participants').select('channel_id').eq('user_id', user.id);
      const existingChannelIds = existingParts?.map(p => p.channel_id) || [];
      const missingChannels = aiChannels?.filter(c => !existingChannelIds.includes(c.id)) || [];
      if (missingChannels.length > 0) {
        await supabase.from('chat_participants').insert(missingChannels.map(c => ({ channel_id: c.id, user_id: user.id, role: 'admin' })));
      }
    } catch (error) { console.error('Error ensuring super_admin in AI channels:', error); }
  };

  const createClientAIAssistantChannel = async (clientId) => {
    try {
      const { data: existing } = await supabase.from('chat_channels').select('id').eq('type', 'ai_assistant').eq('client_id', clientId).single();
      if (existing) return;
      const { data: client } = await supabase.from('clients').select('name').eq('id', clientId).single();
      const { data: channel, error: channelError } = await supabase.from('chat_channels')
        .insert({ type: 'ai_assistant', name: `AI Assistant - ${client?.name || 'Client'}`, created_by: user.id, client_id: clientId })
        .select().single();
      if (channelError) throw channelError;
      
      const { data: clientUsers } = await supabase.from('profiles').select('id').eq('client_id', clientId).eq('is_active', true);
      const { data: superAdmins } = await supabase.from('profiles').select('id').eq('role', 'super_admin').eq('is_active', true);
      const allUserIds = new Set([...(clientUsers?.map(u => u.id) || []), ...(superAdmins?.map(u => u.id) || [])]);
      
      await supabase.from('chat_participants').insert(Array.from(allUserIds).map(userId => ({ channel_id: channel.id, user_id: userId, role: userId === user.id ? 'owner' : 'member' })));
      await supabase.from('chat_messages').insert({ channel_id: channel.id, sender_id: user.id, sender_type: 'ai', content: `👋 Welcome to the ${client?.name || 'Client'} AI Assistant!\n\nI can help with:\n• Training status & pending tasks\n• Finding experts\n• KPI summaries\n• Development questions\n\nJust ask!`, content_type: 'text' });
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
    try {
      await supabase.from('chat_participants').update({ last_read_at: new Date().toISOString() }).eq('channel_id', channelId).eq('user_id', user.id);
      setUnreadCounts(prev => ({ ...prev, [channelId]: 0 }));
    } catch (error) { console.error('Error marking as read:', error); }
  };

  const loadMessages = async (channelId) => {
    try {
      const { data, error } = await supabase.from('chat_messages')
        .select(`*, sender:sender_id (id, full_name, email)`)
        .eq('channel_id', channelId).eq('is_deleted', false)
        .order('created_at', { ascending: true }).limit(100);
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

  // ===== AI AGENT =====
  const triggerAIResponse = async (userMessage) => {
    setAiThinking(true);
    try {
      const lowerMsg = userMessage.toLowerCase();
      let response = '';
      
      if (lowerMsg.includes('training') || lowerMsg.includes('course')) response = await handlePendingTrainings();
      else if (lowerMsg.includes('coaching') || lowerMsg.includes('development activ')) response = await handlePendingCoaching();
      else if (lowerMsg.includes('competenc') || lowerMsg.includes('skill') || lowerMsg.includes('progress')) response = await handleCompetencyStatus();
      else if (lowerMsg.includes('expert') || lowerMsg.includes('who knows')) response = await handleFindExperts();
      else if ((lowerMsg.includes('team') || lowerMsg.includes('my team')) && ['team_lead','category_admin','site_admin','client_admin','super_admin'].includes(profile.role)) response = await handleTeamStatus();
      else if (lowerMsg.includes('kpi') || lowerMsg.includes('summary') || lowerMsg.includes('overview')) response = await handleKPISummary();
      else if (lowerMsg.includes('task') || lowerMsg.includes('attention') || lowerMsg.includes('to do')) response = await handleTasksNeedingAttention();
      else if (lowerMsg.includes('help')) response = getHelpMessage();
      else response = getDefaultResponse();

      await supabase.from('chat_messages').insert({ channel_id: activeChannel.id, sender_id: user.id, sender_type: 'ai', content: response, content_type: 'text' });
    } catch (error) {
      console.error('AI Error:', error);
      await supabase.from('chat_messages').insert({ channel_id: activeChannel.id, sender_id: user.id, sender_type: 'ai', content: "❌ Sorry, I encountered an error. Please try again.", content_type: 'text' });
    } finally { setAiThinking(false); }
  };

  const handlePendingTrainings = async () => {
    const { data } = await supabase.from('user_training').select(`id, status, due_date, module:module_id (title)`).eq('user_id', user.id).in('status', ['pending', 'in_progress']).order('due_date');
    if (!data?.length) return "✅ No pending trainings. You're all caught up!";
    let r = `📚 **Pending Trainings (${data.length})**\n\n`;
    data.forEach((t, i) => {
      const due = t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No due date';
      const overdue = t.due_date && new Date(t.due_date) < new Date();
      r += `${i+1}. ${t.status === 'in_progress' ? '🔄' : '⏳'} **${t.module?.title}**\n   Due: ${due}${overdue ? ' ⚠️ OVERDUE' : ''}\n\n`;
    });
    return r + "💡 Go to **My Training** to continue.";
  };

  const handlePendingCoaching = async () => {
    const { data } = await supabase.from('development_activities').select(`id, type, title, status, due_date, coach:coach_id(full_name), competency:competency_id(name)`).eq('trainee_id', user.id).in('status', ['pending', 'in_progress']).order('due_date');
    if (!data?.length) return "✅ No pending coaching activities.";
    let r = `🎯 **Development Activities (${data.length})**\n\n`;
    data.forEach((a, i) => {
      const due = a.due_date ? new Date(a.due_date).toLocaleDateString() : 'No due date';
      r += `${i+1}. ${a.type === 'coaching' ? '👨‍🏫' : '📋'} **${a.title}**\n   Coach: ${a.coach?.full_name || 'N/A'} | Due: ${due}\n\n`;
    });
    return r;
  };

  const handleCompetencyStatus = async () => {
    const { data } = await supabase.from('user_competencies').select(`current_level, target_level, status, competency:competency_id(name)`).eq('user_id', user.id);
    if (!data?.length) return "📊 No competencies assigned yet. Contact your team lead.";
    const achieved = data.filter(c => c.status === 'achieved').length;
    const gaps = data.filter(c => c.current_level < c.target_level);
    let r = `📊 **Competency Status**\n\n✅ Achieved: ${achieved}/${data.length}\n📈 Gaps: ${gaps.length}\n\n`;
    if (gaps.length) { r += "**To Develop:**\n"; gaps.slice(0,5).forEach(g => r += `• ${g.competency?.name}: ${g.current_level} → ${g.target_level}\n`); }
    return r;
  };

  const handleFindExperts = async () => {
    const { data } = await supabase.from('expert_network').select(`expertise_level, user:user_id(full_name, email), competency:competency_id(name)`).eq('status', 'active').eq('is_available', true).eq('client_id', profile.client_id).order('expertise_level', { ascending: false }).limit(10);
    if (!data?.length) return "🔍 No experts found. Contact admin to nominate experts.";
    let r = "👥 **Available Experts**\n\n";
    data.forEach(e => r += `• **${e.user?.full_name}** - ${e.competency?.name} (Level ${e.expertise_level})\n`);
    return r;
  };

  const handleTeamStatus = async () => {
    const { data: team } = await supabase.from('profiles').select('id, full_name').eq('reports_to', user.id).eq('is_active', true);
    if (!team?.length) return "👥 No direct reports assigned.";
    const teamIds = team.map(m => m.id);
    const { data: pt } = await supabase.from('user_training').select('id').in('user_id', teamIds).in('status', ['pending', 'in_progress']);
    const { data: av } = await supabase.from('development_activities').select('id').eq('coach_id', user.id).eq('status', 'completed');
    let r = `👥 **Team Overview** (${team.length} members)\n\n📚 Pending Trainings: ${pt?.length || 0}\n✅ Awaiting Validation: ${av?.length || 0}\n\n**Members:**\n`;
    team.forEach(m => r += `• ${m.full_name}\n`);
    return r;
  };

  const handleKPISummary = async () => {
    const { data: tr } = await supabase.from('user_training').select('status').eq('user_id', user.id);
    const { data: cp } = await supabase.from('user_competencies').select('status').eq('user_id', user.id);
    const tComplete = tr?.filter(t => t.status === 'passed').length || 0;
    const cAchieved = cp?.filter(c => c.status === 'achieved').length || 0;
    const tRate = tr?.length ? Math.round((tComplete / tr.length) * 100) : 0;
    const cRate = cp?.length ? Math.round((cAchieved / cp.length) * 100) : 0;
    return `📈 **KPI Summary**\n\n**Training:** ${tRate}% (${tComplete}/${tr?.length || 0})\n**Competencies:** ${cRate}% (${cAchieved}/${cp?.length || 0})`;
  };

  const handleTasksNeedingAttention = async () => {
    const tasks = [];
    const { data: overdue } = await supabase.from('user_training').select('module:module_id(title)').eq('user_id', user.id).in('status', ['pending', 'in_progress']).lt('due_date', new Date().toISOString());
    if (overdue?.length) { tasks.push(`⚠️ **${overdue.length} Overdue Training(s)**`); overdue.slice(0,2).forEach(t => tasks.push(`   • ${t.module?.title}`)); }
    if (['team_lead','category_admin','site_admin','client_admin','super_admin'].includes(profile.role)) {
      const { data: pv } = await supabase.from('development_activities').select('title').eq('coach_id', user.id).eq('status', 'completed');
      if (pv?.length) { tasks.push(`\n✅ **${pv.length} Awaiting Validation**`); pv.slice(0,2).forEach(v => tasks.push(`   • ${v.title}`)); }
    }
    return tasks.length ? `🎯 **Tasks Needing Attention**\n\n${tasks.join('\n')}` : "✅ **All Clear!** No urgent tasks.";
  };

  const getHelpMessage = () => `🤖 **How I Can Help**\n\n• "What are my pending trainings?"\n• "Show my competency progress"\n• "What coaching do I have?"\n• "Who are the experts?"\n• "Give me a KPI summary"\n• "What tasks need attention?"${['team_lead','category_admin','site_admin','client_admin','super_admin'].includes(profile.role) ? '\n• "How is my team doing?"' : ''}\n\nJust ask naturally! 💬`;
  const getDefaultResponse = () => `🤔 I'm not sure how to help with that.\n\nTry:\n• "My pending trainings"\n• "Competency status"\n• "Tasks needing attention"\n\nType **help** for more options!`;

  // ===== Direct Channel =====
  const createDirectChannel = async (targetUser) => {
    try {
      const { data: existingChannels } = await supabase.from('chat_participants').select('channel_id').eq('user_id', user.id);
      const myChannelIds = existingChannels?.map(c => c.channel_id) || [];
      if (myChannelIds.length > 0) {
        const { data: sharedChannels } = await supabase.from('chat_participants').select(`channel_id, chat_channels!inner(id, type)`).eq('user_id', targetUser.id).in('channel_id', myChannelIds).eq('chat_channels.type', 'direct');
        if (sharedChannels?.length > 0) {
          const existingChannel = channels.find(c => c.id === sharedChannels[0].channel_id);
          if (existingChannel) { setActiveChannel(existingChannel); setShowNewChannelModal(false); return; }
        }
      }
      const { data: channel, error: channelError } = await supabase.from('chat_channels').insert({ type: 'direct', name: null, created_by: user.id, client_id: profile.client_id }).select().single();
      if (channelError) throw channelError;
      await supabase.from('chat_participants').insert([{ channel_id: channel.id, user_id: user.id, role: 'member' }, { channel_id: channel.id, user_id: targetUser.id, role: 'member' }]);
      await loadChannels();
      setActiveChannel(channel);
      setShowNewChannelModal(false);
    } catch (error) { console.error('Error creating direct channel:', error); }
  };

  const getChannelDisplayName = (channel) => {
    if (channel.type === 'ai_assistant') return profile.role === 'super_admin' ? (channel.name || 'AI Assistant') : 'AI Assistant';
    if (channel.type === 'group') return channel.name || 'Group Chat';
    return channel.name || 'Direct Message';
  };

  const getChannelIcon = (type) => {
    if (type === 'ai_assistant') return <Bot className="w-5 h-5 text-purple-500" />;
    if (type === 'group') return <Users className="w-5 h-5 text-blue-500" />;
    if (type === 'direct') return <MessageSquare className="w-5 h-5 text-green-500" />;
    return <Hash className="w-5 h-5 text-gray-500" />;
  };

  const formatTime = (ts) => {
    const d = new Date(ts), now = new Date(), diff = Math.floor((now - d) / (1000*60*60*24));
    if (diff === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const groupedChannels = { ai_assistant: channels.filter(c => c.type === 'ai_assistant'), direct: channels.filter(c => c.type === 'direct'), group: channels.filter(c => c.type === 'group') };
  const filteredUsers = users.filter(u => u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Messages</h2>
            <button onClick={() => setShowNewChannelModal(true)} className="p-2 hover:bg-gray-100 rounded-lg"><Plus className="w-5 h-5 text-gray-600" /></button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search conversations..." className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {groupedChannels.ai_assistant.length > 0 && <div className="py-2"><div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">AI Assistant</div>{groupedChannels.ai_assistant.map(ch => <ChannelItem key={ch.id} channel={ch} active={activeChannel?.id === ch.id} unreadCount={unreadCounts[ch.id] || 0} onClick={() => setActiveChannel(ch)} getIcon={getChannelIcon} getDisplayName={getChannelDisplayName} />)}</div>}
          {groupedChannels.direct.length > 0 && <div className="py-2"><div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">Direct Messages</div>{groupedChannels.direct.map(ch => <ChannelItem key={ch.id} channel={ch} active={activeChannel?.id === ch.id} unreadCount={unreadCounts[ch.id] || 0} onClick={() => setActiveChannel(ch)} getIcon={getChannelIcon} getDisplayName={getChannelDisplayName} />)}</div>}
          {groupedChannels.group.length > 0 && <div className="py-2"><div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">Groups</div>{groupedChannels.group.map(ch => <ChannelItem key={ch.id} channel={ch} active={activeChannel?.id === ch.id} unreadCount={unreadCounts[ch.id] || 0} onClick={() => setActiveChannel(ch)} getIcon={getChannelIcon} getDisplayName={getChannelDisplayName} />)}</div>}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeChannel ? (<>
          <div className="h-16 px-6 flex items-center justify-between bg-white border-b border-gray-200">
            <div className="flex items-center gap-3">{getChannelIcon(activeChannel.type)}<div><h3 className="font-semibold text-gray-800">{getChannelDisplayName(activeChannel)}</h3>{activeChannel.type === 'ai_assistant' && <p className="text-xs text-gray-500">Always here to help</p>}</div></div>
            <button className="p-2 hover:bg-gray-100 rounded-lg"><MoreVertical className="w-5 h-5 text-gray-500" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, idx) => {
              const isOwn = msg.sender_id === user.id && msg.sender_type === 'user';
              const isAI = msg.sender_type === 'ai';
              const showAvatar = idx === 0 || messages[idx-1].sender_id !== msg.sender_id || messages[idx-1].sender_type !== msg.sender_type;
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[70%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                    {showAvatar && <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isAI ? 'bg-purple-100' : isOwn ? 'bg-blue-100' : 'bg-gray-100'}`}>{isAI ? <Bot className="w-4 h-4 text-purple-600" /> : <span className="text-sm font-medium text-gray-600">{(msg.sender?.full_name || profile?.full_name || 'U')[0].toUpperCase()}</span>}</div>}
                    {!showAvatar && <div className="w-8" />}
                    <div>
                      {showAvatar && <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'justify-end' : ''}`}><span className="text-sm font-medium text-gray-700">{isAI ? 'AI Assistant' : (msg.sender?.full_name || profile?.full_name || 'Unknown')}</span><span className="text-xs text-gray-400">{formatTime(msg.created_at)}</span></div>}
                      <div className={`rounded-2xl px-4 py-2 ${isOwn ? 'bg-blue-600 text-white' : isAI ? 'bg-purple-50 text-gray-800 border border-purple-100' : 'bg-white text-gray-800 border border-gray-200'}`}><p className="text-sm whitespace-pre-wrap">{msg.content}</p></div>
                    </div>
                  </div>
                </div>
              );
            })}
            {aiThinking && <div className="flex justify-start"><div className="flex gap-3"><div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-100"><Bot className="w-4 h-4 text-purple-600" /></div><div><div className="flex items-center gap-2 mb-1"><span className="text-sm font-medium text-gray-700">AI Assistant</span></div><div className="rounded-2xl px-4 py-3 bg-purple-50 border border-purple-100"><div className="flex items-center gap-2 text-purple-600"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Thinking...</span></div></div></div></div></div>}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 bg-white border-t border-gray-200">
            <form onSubmit={sendMessage} className="flex items-center gap-3">
              <button type="button" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><Paperclip className="w-5 h-5" /></button>
              <input ref={inputRef} type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={activeChannel.type === 'ai_assistant' ? "Ask me anything..." : "Type a message..."} className="flex-1 px-4 py-2 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-blue-500" disabled={sendingMessage || aiThinking} />
              <button type="button" className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><Smile className="w-5 h-5" /></button>
              <button type="submit" disabled={!newMessage.trim() || sendingMessage || aiThinking} className={`p-3 rounded-full ${newMessage.trim() && !sendingMessage && !aiThinking ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}><Send className="w-5 h-5" /></button>
            </form>
          </div>
        </>) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50"><div className="text-center"><MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-600">Select a conversation</h3></div></div>
        )}
      </div>

      {/* New Channel Modal */}
      {showNewChannelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200"><h3 className="text-lg font-semibold">New Conversation</h3><button onClick={() => setShowNewChannelModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button></div>
            <div className="p-4">
              <div className="relative mb-4"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search users..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" autoFocus /></div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filteredUsers.map(u => (
                  <button key={u.id} onClick={() => createDirectChannel(u)} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg text-left">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"><span className="text-sm font-medium text-gray-600">{(u.full_name || u.email)[0].toUpperCase()}</span></div>
                    <div className="flex-1 min-w-0"><p className="font-medium text-gray-800 truncate">{u.full_name || 'Unnamed'}</p><p className="text-sm text-gray-500 truncate">{u.email}</p></div>
                    <span className="text-xs text-gray-400 capitalize">{u.role?.replace('_', ' ')}</span>
                  </button>
                ))}
                {filteredUsers.length === 0 && <p className="text-center text-gray-500 py-8">No users found</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelItem({ channel, active, unreadCount, onClick, getIcon, getDisplayName }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${active ? 'bg-blue-50 border-r-2 border-blue-600' : 'hover:bg-gray-50'}`}>
      {getIcon(channel.type)}
      <div className="flex-1 min-w-0 text-left"><p className={`font-medium truncate ${active ? 'text-blue-600' : 'text-gray-800'}`}>{getDisplayName(channel)}</p></div>
      {unreadCount > 0 && <span className="bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
  );
}
