import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  MessageSquare, 
  Users, 
  Bot, 
  Send, 
  Plus, 
  Search,
  MoreVertical,
  Check,
  CheckCheck,
  Smile,
  Paperclip,
  X,
  UserPlus,
  Hash,
  Circle
} from 'lucide-react';

export default function ChatPage() {
  const { user, profile } = useAuth();
  
  // State
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load channels on mount
  useEffect(() => {
    if (profile) {
      loadChannels();
      loadUsers();
    }
  }, [profile]);

  // Load messages when active channel changes
  useEffect(() => {
    if (activeChannel) {
      loadMessages(activeChannel.id);
      markAsRead(activeChannel.id);
    }
  }, [activeChannel]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!activeChannel) return;

    const subscription = supabase
      .channel(`chat:${activeChannel.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${activeChannel.id}`
        },
        (payload) => {
          const newMsg = payload.new;
          setMessages(prev => [...prev, newMsg]);
          scrollToBottom();
          
          // Mark as read if we're viewing this channel
          if (newMsg.sender_id !== user.id) {
            markAsRead(activeChannel.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [activeChannel]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load all channels for current user
  const loadChannels = async () => {
    try {
      setLoading(true);
      
      // Get channels where user is a participant
      const { data: participations, error: partError } = await supabase
        .from('chat_participants')
        .select(`
          channel_id,
          last_read_at,
          chat_channels (
            id,
            type,
            name,
            created_by,
            client_id,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id);

      if (partError) throw partError;

      const channelList = participations
        .map(p => ({
          ...p.chat_channels,
          last_read_at: p.last_read_at
        }))
        .filter(c => c.id); // Filter out any null channels

      // For super_admin: Check if they need to be added to client AI channels
      if (profile.role === 'super_admin') {
        await ensureSuperAdminInAllAIChannels();
      }

      // Check if client's AI Assistant channel exists
      const clientAiChannel = channelList.find(c => 
        c.type === 'ai_assistant' && c.client_id === profile.client_id
      );
      
      // For non-super_admin: create client AI channel if doesn't exist
      if (!clientAiChannel && profile.role !== 'super_admin') {
        await createClientAIAssistantChannel(profile.client_id);
        await loadChannels(); // Reload after creating
        return;
      }

      // For super_admin without a client_id, just load what they have access to
      // They get added to client AI channels via ensureSuperAdminInAllAIChannels

      setChannels(channelList);
      
      // Calculate unread counts
      await calculateUnreadCounts(channelList);
      
      // Auto-select AI Assistant channel if no active channel
      if (!activeChannel) {
        const defaultChannel = channelList.find(c => c.type === 'ai_assistant') || channelList[0];
        if (defaultChannel) setActiveChannel(defaultChannel);
      }
      
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setLoading(false);
    }
  };

  // Ensure super_admin is participant in all client AI Assistant channels
  const ensureSuperAdminInAllAIChannels = async () => {
    try {
      // Get all AI Assistant channels
      const { data: aiChannels, error: channelsError } = await supabase
        .from('chat_channels')
        .select('id, client_id, name')
        .eq('type', 'ai_assistant');

      if (channelsError) throw channelsError;

      // Check which ones super_admin is already in
      const { data: existingParts, error: partsError } = await supabase
        .from('chat_participants')
        .select('channel_id')
        .eq('user_id', user.id);

      if (partsError) throw partsError;

      const existingChannelIds = existingParts?.map(p => p.channel_id) || [];

      // Add super_admin to any AI channels they're not in
      const missingChannels = aiChannels?.filter(c => !existingChannelIds.includes(c.id)) || [];

      if (missingChannels.length > 0) {
        const newParticipations = missingChannels.map(c => ({
          channel_id: c.id,
          user_id: user.id,
          role: 'admin'
        }));

        await supabase
          .from('chat_participants')
          .insert(newParticipations);
      }
    } catch (error) {
      console.error('Error ensuring super_admin in AI channels:', error);
    }
  };

  // Create AI Assistant channel for a client (shared by all client users)
  const createClientAIAssistantChannel = async (clientId) => {
    try {
      // Double-check it doesn't already exist
      const { data: existing } = await supabase
        .from('chat_channels')
        .select('id')
        .eq('type', 'ai_assistant')
        .eq('client_id', clientId)
        .single();

      if (existing) return; // Already exists

      // Get client name for the channel
      const { data: client } = await supabase
        .from('clients')
        .select('name')
        .eq('id', clientId)
        .single();

      // Create the channel
      const { data: channel, error: channelError } = await supabase
        .from('chat_channels')
        .insert({
          type: 'ai_assistant',
          name: `AI Assistant - ${client?.name || 'Client'}`,
          created_by: user.id,
          client_id: clientId
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // Get all users for this client
      const { data: clientUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id')
        .eq('client_id', clientId)
        .eq('is_active', true);

      if (usersError) throw usersError;

      // Also get all super_admins
      const { data: superAdmins, error: saError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'super_admin')
        .eq('is_active', true);

      if (saError) throw saError;

      // Combine users (avoid duplicates)
      const allUserIds = new Set([
        ...(clientUsers?.map(u => u.id) || []),
        ...(superAdmins?.map(u => u.id) || [])
      ]);

      // Add all as participants
      const participations = Array.from(allUserIds).map(userId => ({
        channel_id: channel.id,
        user_id: userId,
        role: userId === user.id ? 'owner' : 'member'
      }));

      const { error: partError } = await supabase
        .from('chat_participants')
        .insert(participations);

      if (partError) throw partError;

      // Send welcome message from AI
      const { error: msgError } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: channel.id,
          sender_id: user.id,
          sender_type: 'ai',
          content: `👋 Welcome to the ${client?.name || 'Client'} AI Assistant!\n\nI'm here to help everyone on your team with:\n• Checking training status and pending tasks\n• Finding experts in specific competencies\n• Getting KPI summaries and reports\n• Answering questions about competencies and development\n\nJust type your question and I'll do my best to help!`,
          content_type: 'text'
        });

      if (msgError) throw msgError;

    } catch (error) {
      console.error('Error creating client AI Assistant channel:', error);
    }
  };

  // Calculate unread message counts per channel
  const calculateUnreadCounts = async (channelList) => {
    const counts = {};
    
    for (const channel of channelList) {
      if (!channel.last_read_at) {
        // Never read - count all messages not from current user
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', channel.id)
          .neq('sender_id', user.id);
        
        counts[channel.id] = count || 0;
      } else {
        // Count messages after last read
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', channel.id)
          .neq('sender_id', user.id)
          .gt('created_at', channel.last_read_at);
        
        counts[channel.id] = count || 0;
      }
    }
    
    setUnreadCounts(counts);
  };

  // Mark channel as read
  const markAsRead = async (channelId) => {
    try {
      await supabase
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('channel_id', channelId)
        .eq('user_id', user.id);
      
      setUnreadCounts(prev => ({ ...prev, [channelId]: 0 }));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Load messages for a channel
  const loadMessages = async (channelId) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles!chat_messages_sender_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('channel_id', channelId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Load users for creating new chats
  const loadUsers = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('is_active', true)
        .neq('id', user.id);
      
      // Filter by client for non-super_admin
      if (profile.role !== 'super_admin') {
        query = query.eq('client_id', profile.client_id);
      }
      
      const { data, error } = await query.order('full_name');
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // Send a message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel || sendingMessage) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSendingMessage(true);

    try {
      // Insert message
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: activeChannel.id,
          sender_id: user.id,
          sender_type: 'user',
          content: messageContent,
          content_type: 'text'
        });

      if (error) throw error;

      // Update channel's updated_at
      await supabase
        .from('chat_channels')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', activeChannel.id);

      // If AI Assistant channel, trigger AI response
      if (activeChannel.type === 'ai_assistant') {
        await triggerAIResponse(messageContent);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setSendingMessage(false);
      inputRef.current?.focus();
    }
  };

  // Trigger AI response (placeholder - will integrate Claude API)
  const triggerAIResponse = async (userMessage) => {
    try {
      // For now, send a placeholder response
      // TODO: Integrate with Claude API
      
      // Simulate typing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let aiResponse = "I'm still being set up! Soon I'll be able to help you with:\n\n";
      aiResponse += "• 📊 \"What are my pending trainings?\"\n";
      aiResponse += "• 👥 \"Who are the experts in spray drying?\"\n";
      aiResponse += "• 📈 \"Show my team's competency progress\"\n";
      aiResponse += "• ✅ \"What tasks need my attention?\"\n\n";
      aiResponse += "Stay tuned for full AI capabilities!";

      // Insert AI response
      await supabase
        .from('chat_messages')
        .insert({
          channel_id: activeChannel.id,
          sender_id: user.id, // We'll use a system user later
          sender_type: 'ai',
          content: aiResponse,
          content_type: 'text'
        });

    } catch (error) {
      console.error('Error generating AI response:', error);
    }
  };

  // Create a new direct message channel
  const createDirectChannel = async (targetUser) => {
    try {
      // Check if DM already exists between these users
      const { data: existingChannels } = await supabase
        .from('chat_participants')
        .select('channel_id')
        .eq('user_id', user.id);

      const myChannelIds = existingChannels?.map(c => c.channel_id) || [];

      if (myChannelIds.length > 0) {
        const { data: sharedChannels } = await supabase
          .from('chat_participants')
          .select(`
            channel_id,
            chat_channels!inner (
              id,
              type
            )
          `)
          .eq('user_id', targetUser.id)
          .in('channel_id', myChannelIds)
          .eq('chat_channels.type', 'direct');

        if (sharedChannels && sharedChannels.length > 0) {
          // DM already exists, switch to it
          const existingChannel = channels.find(c => c.id === sharedChannels[0].channel_id);
          if (existingChannel) {
            setActiveChannel(existingChannel);
            setShowNewChannelModal(false);
            return;
          }
        }
      }

      // Create new DM channel
      const { data: channel, error: channelError } = await supabase
        .from('chat_channels')
        .insert({
          type: 'direct',
          name: null, // DMs don't need names
          created_by: user.id,
          client_id: profile.client_id
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // Add both participants
      const { error: partError } = await supabase
        .from('chat_participants')
        .insert([
          { channel_id: channel.id, user_id: user.id, role: 'member' },
          { channel_id: channel.id, user_id: targetUser.id, role: 'member' }
        ]);

      if (partError) throw partError;

      // Reload channels and switch to new one
      await loadChannels();
      setActiveChannel(channel);
      setShowNewChannelModal(false);

    } catch (error) {
      console.error('Error creating direct channel:', error);
    }
  };

  // Get display name for a channel
  const getChannelDisplayName = (channel) => {
    if (channel.type === 'ai_assistant') {
      // For super_admin viewing multiple client AI channels, show the full name
      // For regular users, just show "AI Assistant"
      if (profile.role === 'super_admin') {
        return channel.name || 'AI Assistant';
      }
      return 'AI Assistant';
    }
    if (channel.type === 'group') return channel.name || 'Group Chat';
    if (channel.type === 'direct') {
      // For DMs, we need to find the other participant
      // This would require loading participants - simplified for now
      return channel.name || 'Direct Message';
    }
    return channel.name || 'Chat';
  };

  // Get icon for channel type
  const getChannelIcon = (type) => {
    switch (type) {
      case 'ai_assistant': return <Bot className="w-5 h-5 text-purple-500" />;
      case 'group': return <Users className="w-5 h-5 text-blue-500" />;
      case 'direct': return <MessageSquare className="w-5 h-5 text-green-500" />;
      default: return <Hash className="w-5 h-5 text-gray-500" />;
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Group channels by type
  const groupedChannels = {
    ai_assistant: channels.filter(c => c.type === 'ai_assistant'),
    direct: channels.filter(c => c.type === 'direct'),
    group: channels.filter(c => c.type === 'group')
  };

  // Filter users by search term
  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Channel List Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Messages</h2>
            <button
              onClick={() => setShowNewChannelModal(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="New conversation"
            >
              <Plus className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto">
          {/* AI Assistant */}
          {groupedChannels.ai_assistant.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                AI Assistant
              </div>
              {groupedChannels.ai_assistant.map(channel => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  active={activeChannel?.id === channel.id}
                  unreadCount={unreadCounts[channel.id] || 0}
                  onClick={() => setActiveChannel(channel)}
                  getIcon={getChannelIcon}
                  getDisplayName={getChannelDisplayName}
                />
              ))}
            </div>
          )}

          {/* Direct Messages */}
          {groupedChannels.direct.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Direct Messages
              </div>
              {groupedChannels.direct.map(channel => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  active={activeChannel?.id === channel.id}
                  unreadCount={unreadCounts[channel.id] || 0}
                  onClick={() => setActiveChannel(channel)}
                  getIcon={getChannelIcon}
                  getDisplayName={getChannelDisplayName}
                />
              ))}
            </div>
          )}

          {/* Group Channels */}
          {groupedChannels.group.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Groups
              </div>
              {groupedChannels.group.map(channel => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  active={activeChannel?.id === channel.id}
                  unreadCount={unreadCounts[channel.id] || 0}
                  onClick={() => setActiveChannel(channel)}
                  getIcon={getChannelIcon}
                  getDisplayName={getChannelDisplayName}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 flex flex-col">
        {activeChannel ? (
          <>
            {/* Channel Header */}
            <div className="h-16 px-6 flex items-center justify-between bg-white border-b border-gray-200">
              <div className="flex items-center gap-3">
                {getChannelIcon(activeChannel.type)}
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {getChannelDisplayName(activeChannel)}
                  </h3>
                  {activeChannel.type === 'ai_assistant' && (
                    <p className="text-xs text-gray-500">Always here to help</p>
                  )}
                </div>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <MoreVertical className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message, index) => {
                const isOwnMessage = message.sender_id === user.id && message.sender_type === 'user';
                const isAI = message.sender_type === 'ai';
                const showAvatar = index === 0 || 
                  messages[index - 1].sender_id !== message.sender_id ||
                  messages[index - 1].sender_type !== message.sender_type;

                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                      {/* Avatar */}
                      {showAvatar && (
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          isAI ? 'bg-purple-100' : isOwnMessage ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          {isAI ? (
                            <Bot className="w-4 h-4 text-purple-600" />
                          ) : (
                            <span className="text-sm font-medium text-gray-600">
                              {(message.sender?.full_name || 'U')[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                      )}
                      {!showAvatar && <div className="w-8" />}

                      {/* Message Bubble */}
                      <div>
                        {showAvatar && (
                          <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'justify-end' : ''}`}>
                            <span className="text-sm font-medium text-gray-700">
                              {isAI ? 'AI Assistant' : message.sender?.full_name || 'Unknown'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatTime(message.created_at)}
                            </span>
                          </div>
                        )}
                        <div className={`rounded-2xl px-4 py-2 ${
                          isOwnMessage 
                            ? 'bg-blue-600 text-white' 
                            : isAI 
                              ? 'bg-purple-50 text-gray-800 border border-purple-100'
                              : 'bg-white text-gray-800 border border-gray-200'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <form onSubmit={sendMessage} className="flex items-center gap-3">
                <button 
                  type="button"
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={activeChannel.type === 'ai_assistant' 
                    ? "Ask me anything..." 
                    : "Type a message..."}
                  className="flex-1 px-4 py-2 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  disabled={sendingMessage}
                />
                
                <button 
                  type="button"
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                >
                  <Smile className="w-5 h-5" />
                </button>
                
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sendingMessage}
                  className={`p-3 rounded-full transition-colors ${
                    newMessage.trim() && !sendingMessage
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          // No channel selected
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600">Select a conversation</h3>
              <p className="text-gray-400 mt-1">Choose a chat from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* New Channel Modal */}
      {showNewChannelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">New Conversation</h3>
              <button
                onClick={() => setShowNewChannelModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4">
              {/* Search Users */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>

              {/* User List */}
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filteredUsers.map(targetUser => (
                  <button
                    key={targetUser.id}
                    onClick={() => createDirectChannel(targetUser)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {(targetUser.full_name || targetUser.email)[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">
                        {targetUser.full_name || 'Unnamed User'}
                      </p>
                      <p className="text-sm text-gray-500 truncate">{targetUser.email}</p>
                    </div>
                    <span className="text-xs text-gray-400 capitalize">{targetUser.role?.replace('_', ' ')}</span>
                  </button>
                ))}
                
                {filteredUsers.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No users found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Channel Item Component
function ChannelItem({ channel, active, unreadCount, onClick, getIcon, getDisplayName }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
        active 
          ? 'bg-blue-50 border-r-2 border-blue-600' 
          : 'hover:bg-gray-50'
      }`}
    >
      {getIcon(channel.type)}
      <div className="flex-1 min-w-0 text-left">
        <p className={`font-medium truncate ${active ? 'text-blue-600' : 'text-gray-800'}`}>
          {getDisplayName(channel)}
        </p>
      </div>
      {unreadCount > 0 && (
        <span className="flex-shrink-0 bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
