import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { MessageSquare, Users, Bot, Send, Plus, Search, MoreVertical, X, Loader2 } from 'lucide-react';

export default function ChatPage() {
  const { user, profile } = useAuth();
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [clientName, setClientName] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load channels
  useEffect(() => { 
    if (profile) { 
      loadChannels(); 
      loadUsers();
      loadClientName();
    } 
  }, [profile]);

  const loadClientName = async () => {
    if (profile?.client_id) {
      const { data } = await supabase.from('clients').select('name').eq('id', profile.client_id).single();
      if (data) setClientName(data.name);
    }
  };

  // Load messages when channel changes
  useEffect(() => { 
    if (activeChannel) { 
      loadMessages(activeChannel.id); 
      markAsRead(activeChannel.id); 
    } 
  }, [activeChannel]);

  // Realtime subscription
  useEffect(() => {
    if (!activeChannel) return;
    const sub = supabase.channel(`chat:${activeChannel.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${activeChannel.id}` },
        async (payload) => {
          const msg = payload.new;
          if (msg.sender_id && msg.sender_type !== 'ai') {
            const { data: sender } = await supabase.from('profiles').select('full_name').eq('id', msg.sender_id).single();
            msg.sender = sender;
          }
          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          scrollToBottom();
          if (msg.sender_id !== user.id) markAsRead(activeChannel.id);
        }
      ).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [activeChannel]);

  useEffect(() => { scrollToBottom(); }, [messages]);
  const scrollToBottom = () => { 
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
    }, 100);
  };

  const loadChannels = async () => {
    try {
      setLoading(true);
      const { data: parts } = await supabase.from('chat_participants')
        .select('channel_id, last_read_at, chat_channels(id, type, name, client_id, created_by)')
        .eq('user_id', user.id);
      
      const list = parts?.map(p => ({ ...p.chat_channels, last_read_at: p.last_read_at })).filter(c => c?.id) || [];
      
      // Ensure user has their OWN AI channel (not shared)
      const hasOwnAI = list.find(c => c.type === 'ai_assistant' && c.created_by === user.id);
      if (!hasOwnAI && profile.role !== 'super_admin') {
        await createAIChannel();
        return loadChannels();
      }
      
      // Filter out AI channels created by others (legacy shared channels)
      const filteredList = list.filter(c => c.type !== 'ai_assistant' || c.created_by === user.id);
      
      setChannels(filteredList);
      await calcUnread(filteredList);
      
      if (!activeChannel && filteredList.length) {
        setActiveChannel(filteredList.find(c => c.type === 'ai_assistant') || filteredList[0]);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const createAIChannel = async () => {
    // Create a PRIVATE AI channel for this user only
    const { data: ch } = await supabase.from('chat_channels')
      .insert({ 
        type: 'ai_assistant', 
        name: `AI Assistant`, 
        created_by: user.id, 
        client_id: profile.client_id 
      })
      .select().single();
    
    if (ch) {
      // Only add the current user as participant - this keeps it private
      await supabase.from('chat_participants').insert({ 
        channel_id: ch.id, 
        user_id: user.id, 
        role: 'owner' 
      });
      
      // Welcome message
      const firstName = profile.full_name?.split(' ')[0] || 'there';
      await supabase.from('chat_messages').insert({
        channel_id: ch.id,
        sender_id: user.id,
        sender_type: 'ai',
        content: `👋 Hello ${firstName}! I'm your private AI Assistant powered by Claude.\n\nI can help you with:\n• **Check activities** - "What do I have pending?"\n• **Coaching** - "Request coaching on shift handover"\n• **Training** - "Show my trainings"\n• **Messages** - "Send Jean: Meeting at 2pm"\n• **Team** - "How is my team doing?"\n\nJust ask naturally! 🚀`,
        content_type: 'text'
      });
    }
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
    const { data } = await supabase.from('chat_messages')
      .select('*, sender:sender_id(full_name)')
      .eq('channel_id', chId)
      .eq('is_deleted', false)
      .order('created_at')
      .limit(100);
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
    setNewMessage('');
    setSendingMessage(true);
    
    try {
      // Save user message
      await supabase.from('chat_messages').insert({
        channel_id: activeChannel.id,
        sender_id: user.id,
        sender_type: 'user',
        content,
        content_type: 'text'
      });
      
      // If AI channel, process with Claude
      if (activeChannel.type === 'ai_assistant') {
        await processAIMessage(content);
      }
    } catch (e) { 
      console.error(e); 
      setNewMessage(content); 
    }
    finally { 
      setSendingMessage(false); 
      inputRef.current?.focus(); 
    }
  };

  // Process message with Claude AI via Edge Function
  const processAIMessage = async (content) => {
    setAiThinking(true);
    
    try {
      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('ai-agent', {
        body: {
          message: content,
          conversationHistory: messages.slice(-10),
          userId: user.id,
          profile: profile,
          clientName: clientName,
          channelId: activeChannel.id
        }
      });
      
      if (error) {
        console.error('AI Error:', error);
        await supabase.from('chat_messages').insert({
          channel_id: activeChannel.id,
          sender_id: user.id,
          sender_type: 'ai',
          content: "❌ I encountered an error. Please try again.",
          content_type: 'text'
        });
      }
      
      // Refresh channels in case actions were taken (new DMs, etc) - but don't reset scroll
      if (data?.toolResults?.some(r => r.success)) {
        // Just refresh channel list without changing active channel
        const { data: parts } = await supabase.from('chat_participants')
          .select('channel_id, last_read_at, chat_channels(id, type, name, client_id)')
          .eq('user_id', user.id);
        const list = parts?.map(p => ({ ...p.chat_channels, last_read_at: p.last_read_at })).filter(c => c?.id) || [];
        setChannels(list);
      }
      
    } catch (error) {
      console.error('AI Error:', error);
      await supabase.from('chat_messages').insert({
        channel_id: activeChannel.id,
        sender_id: user.id,
        sender_type: 'ai',
        content: "❌ I encountered an error. Please try again.",
        content_type: 'text'
      });
    } finally {
      setAiThinking(false);
    }
  };

  // Create DM
  const createDM = async (target) => {
    const { data: existing } = await supabase.from('chat_participants').select('channel_id').eq('user_id', user.id);
    const myIds = existing?.map(c => c.channel_id) || [];
    
    if (myIds.length) {
      const { data: shared } = await supabase.from('chat_participants')
        .select('channel_id, chat_channels!inner(type)')
        .eq('user_id', target.id)
        .in('channel_id', myIds)
        .eq('chat_channels.type', 'direct');
      
      if (shared?.length) {
        const ch = channels.find(c => c.id === shared[0].channel_id);
        if (ch) { setActiveChannel(ch); setShowNewModal(false); return; }
      }
    }
    
    const { data: ch } = await supabase.from('chat_channels')
      .insert({ type: 'direct', created_by: user.id, client_id: profile.client_id })
      .select().single();
    
    if (ch) {
      await supabase.from('chat_participants').insert([
        { channel_id: ch.id, user_id: user.id, role: 'member' },
        { channel_id: ch.id, user_id: target.id, role: 'member' }
      ]);
      await loadChannels();
      setActiveChannel(ch);
    }
    setShowNewModal(false);
  };

  const getChName = (ch) => ch.type === 'ai_assistant' ? (profile.role === 'super_admin' ? ch.name : 'AI Assistant') : ch.type === 'group' ? (ch.name || 'Group') : 'Direct Message';
  const getChIcon = (type) => type === 'ai_assistant' ? <Bot className="w-5 h-5 text-purple-500" /> : type === 'group' ? <Users className="w-5 h-5 text-blue-500" /> : <MessageSquare className="w-5 h-5 text-green-500" />;
  const formatTime = (ts) => { const d = new Date(ts); const now = new Date(); const diff = Math.floor((now - d) / 86400000); return diff === 0 ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : diff < 7 ? d.toLocaleDateString([], { weekday: 'short' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' }); };

  const grouped = { ai: channels.filter(c => c.type === 'ai_assistant'), dm: channels.filter(c => c.type === 'direct'), grp: channels.filter(c => c.type === 'group') };
  const filtered = users.filter(u => u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex justify-between mb-3">
            <h2 className="text-lg font-semibold">Messages</h2>
            <button onClick={() => setShowNewModal(true)} className="p-2 hover:bg-gray-100 rounded-lg">
              <Plus className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {grouped.ai.length > 0 && <div className="py-2"><div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">AI Assistant</div>{grouped.ai.map(ch => <ChItem key={ch.id} ch={ch} active={activeChannel?.id === ch.id} unread={unreadCounts[ch.id] || 0} onClick={() => setActiveChannel(ch)} getIcon={getChIcon} getName={getChName} />)}</div>}
          {grouped.dm.length > 0 && <div className="py-2"><div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">Direct Messages</div>{grouped.dm.map(ch => <ChItem key={ch.id} ch={ch} active={activeChannel?.id === ch.id} unread={unreadCounts[ch.id] || 0} onClick={() => setActiveChannel(ch)} getIcon={getChIcon} getName={getChName} />)}</div>}
          {grouped.grp.length > 0 && <div className="py-2"><div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase">Groups</div>{grouped.grp.map(ch => <ChItem key={ch.id} ch={ch} active={activeChannel?.id === ch.id} unread={unreadCounts[ch.id] || 0} onClick={() => setActiveChannel(ch)} getIcon={getChIcon} getName={getChName} />)}</div>}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {activeChannel ? (<>
          <div className="h-16 px-6 flex items-center justify-between bg-white border-b">
            <div className="flex items-center gap-3">
              {getChIcon(activeChannel.type)}
              <div>
                <h3 className="font-semibold">{getChName(activeChannel)}</h3>
                {activeChannel.type === 'ai_assistant' && <p className="text-xs text-gray-500">Powered by Claude AI</p>}
              </div>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg"><MoreVertical className="w-5 h-5 text-gray-500" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, i) => {
              const own = msg.sender_id === user.id && msg.sender_type === 'user';
              const ai = msg.sender_type === 'ai';
              const showAv = i === 0 || messages[i-1].sender_id !== msg.sender_id || messages[i-1].sender_type !== msg.sender_type;
              return (
                <div key={msg.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[70%] ${own ? 'flex-row-reverse' : ''}`}>
                    {showAv && <div className={`w-8 h-8 rounded-full flex items-center justify-center ${ai ? 'bg-purple-100' : own ? 'bg-blue-100' : 'bg-gray-100'}`}>{ai ? <Bot className="w-4 h-4 text-purple-600" /> : <span className="text-sm font-medium">{(msg.sender?.full_name || profile?.full_name || 'U')[0]}</span>}</div>}
                    {!showAv && <div className="w-8" />}
                    <div>
                      {showAv && <div className={`flex items-center gap-2 mb-1 ${own ? 'justify-end' : ''}`}><span className="text-sm font-medium text-gray-700">{ai ? 'AI Assistant' : msg.sender?.full_name || profile?.full_name}</span><span className="text-xs text-gray-400">{formatTime(msg.created_at)}</span></div>}
                      <div className={`rounded-2xl px-4 py-2 ${own ? 'bg-blue-600 text-white' : ai ? 'bg-purple-50 border border-purple-100' : 'bg-white border'}`}><p className="text-sm whitespace-pre-wrap">{msg.content}</p></div>
                    </div>
                  </div>
                </div>
              );
            })}
            {aiThinking && <div className="flex"><div className="flex gap-3"><div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center"><Bot className="w-4 h-4 text-purple-600" /></div><div className="rounded-2xl px-4 py-3 bg-purple-50 border border-purple-100"><div className="flex items-center gap-2 text-purple-600"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Thinking...</span></div></div></div></div>}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 bg-white border-t">
            <form onSubmit={sendMessage} className="flex items-center gap-3">
              <input ref={inputRef} value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder={activeChannel.type === 'ai_assistant' ? "Ask me anything..." : "Type a message..."} className="flex-1 px-4 py-2 bg-gray-100 rounded-full" disabled={sendingMessage || aiThinking} />
              <button type="submit" disabled={!newMessage.trim() || sendingMessage || aiThinking} className={`p-3 rounded-full ${newMessage.trim() && !sendingMessage && !aiThinking ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}><Send className="w-5 h-5" /></button>
            </form>
          </div>
        </>) : <div className="flex-1 flex items-center justify-center"><div className="text-center"><MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-600">Select a conversation</p></div></div>}
      </div>

      {/* New Chat Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between p-4 border-b"><h3 className="text-lg font-semibold">New Conversation</h3><button onClick={() => setShowNewModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <div className="p-4">
              <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search users..." className="w-full pl-10 pr-4 py-2 border rounded-lg" autoFocus /></div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filtered.map(u => <button key={u.id} onClick={() => createDM(u)} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg text-left"><div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"><span className="font-medium">{(u.full_name || u.email)[0]}</span></div><div className="flex-1"><p className="font-medium">{u.full_name}</p><p className="text-sm text-gray-500">{u.email}</p></div></button>)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChItem({ ch, active, unread, onClick, getIcon, getName }) {
  return <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 ${active ? 'bg-blue-50 border-r-2 border-blue-600' : 'hover:bg-gray-50'}`}>{getIcon(ch.type)}<div className="flex-1 text-left"><p className={`font-medium truncate ${active ? 'text-blue-600' : ''}`}>{getName(ch)}</p></div>{unread > 0 && <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{unread}</span>}</button>;
}
