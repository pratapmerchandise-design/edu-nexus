import React, { useState, useEffect, useRef } from 'react';
import { AppLayout } from '../../components/AppLayout';
import { api } from '../../services/api';
import type { Conversation, Message } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { Send, Ban, MessageSquare, Check, CheckCheck } from 'lucide-react';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const targetConvIdParam = searchParams.get('conv');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(
    targetConvIdParam ? Number(targetConvIdParam) : null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'primary' | 'requests'>('primary');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  const fetchConversations = async (isBackground = false) => {
    try {
      const headers = isBackground ? { 'X-Background-Request': 'true' } : undefined;
      const convs = await api.get<Conversation[]>('/conversations', headers);
      setConversations(convs);
      if (!activeConvId && convs.length > 0) {
        setActiveConvId(convs[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: number, isBackground = false) => {
    try {
      const headers = isBackground ? { 'X-Background-Request': 'true' } : undefined;
      const msgs = await api.get<Message[]>(`/conversations/${convId}/messages`, headers);
      setMessages((prev) => {
        if (prev.length === msgs.length) {
          const isSame = prev.every((m, i) => 
            m.id === msgs[i].id && 
            m.is_read === msgs[i].is_read && 
            m.is_delivered === msgs[i].is_delivered
          );
          if (isSame) return prev;
        }
        return msgs;
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
      );
    } catch (e) {
      if (!isBackground) console.error(e);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
      setIsTyping(false);

      const pollInterval = setInterval(() => {
        fetchMessages(activeConvId, true);
        fetchConversations(true); // Also refresh conv list to get unread counts
      }, 2000);

      const host = window.location.hostname || 'localhost';
      const wsUrl = `ws://${host}:8000/api/conversations/ws/${activeConvId}`;

      try {
        const ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'typing') {
              if (data.sender_id !== user?.id) {
                setIsTyping(true);
                if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = window.setTimeout(() => setIsTyping(false), 3000);
              }
              return;
            }
            
            if (data.type === 'receipt') {
              setMessages((prev) => 
                prev.map(m => 
                  m.conversation_id === data.conversation_id && m.sender_id === user?.id
                    ? { ...m, is_read: data.status === 'read' || m.is_read, is_delivered: data.status === 'delivered' || data.status === 'read' || m.is_delivered }
                    : m
                )
              );
              return;
            }
            
            // Standard message broadcast
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, data];
            });
            setIsTyping(false);
            
            // Re-fetch conversations to update last message
            fetchConversations(true);
          } catch (err) {
            console.error(err);
          }
        };
        wsRef.current = ws;

        return () => {
          clearInterval(pollInterval);
          ws.close();
        };
      } catch (e) {
        return () => clearInterval(pollInterval);
      }
    }
  }, [activeConvId, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing', sender_id: user?.id }));
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConvId || !inputMessage.trim()) return;

    const content = inputMessage.trim();
    setInputMessage('');

    const optimisticMsg: Message = {
      id: Date.now(),
      conversation_id: activeConvId,
      sender_id: user?.id || 0,
      sender_username: user?.username || 'me',
      sender_name: user?.profile?.full_name || user?.username || 'Me',
      content: content,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const realMsg = await api.post<Message>(`/conversations/${activeConvId}/messages`, {
        content: content,
      });

      setMessages((prev) => {
        const wsAlreadyAdded = prev.some(m => m.id === realMsg.id);
        if (wsAlreadyAdded) {
          // If the WebSocket already delivered the real message, remove the temporary optimistic one
          return prev.filter(m => m.id !== optimisticMsg.id);
        }
        // Otherwise, replace the optimistic message with the real one
        return prev.map((m) => (m.id === optimisticMsg.id ? realMsg : m));
      });
      fetchConversations(true);
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    }
  };

  const handleBlockUser = async (username: string) => {
    if (!confirm(`Are you sure you want to block @${username}?`)) return;
    try {
      await api.post(`/users/${username}/block`);
      alert(`User @${username} has been blocked.`);
      fetchConversations();
    } catch (err: any) {
      alert(err.message || 'Failed to block user');
    }
  };

  const getLastSeenText = (lastSeen: string | undefined | null) => {
    if (!lastSeen) return null;
    const date = new Date(lastSeen.endsWith('Z') ? lastSeen : lastSeen + 'Z');
    const now = new Date();
    const diffSeconds = (now.getTime() - date.getTime()) / 1000;
    
    if (diffSeconds < 120 && diffSeconds > -120) {
      return (
        <span className="flex items-center gap-1 text-[10px] text-green-500 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Online
        </span>
      );
    }

    const isToday = now.toDateString() === date.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = yesterday.toDateString() === date.toDateString();
    
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return <span className="text-[10px] text-muted-foreground">last seen today at {timeStr}</span>;
    if (isYesterday) return <span className="text-[10px] text-muted-foreground">last seen yesterday at {timeStr}</span>;
    
    return <span className="text-[10px] text-muted-foreground">last seen {date.toLocaleDateString()}</span>;
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);

  const handleAcceptRequest = async () => {
    if (!activeConvId) return;
    try {
      await api.post(`/conversations/${activeConvId}/accept`);
      fetchConversations();
    } catch (err: any) {
      alert(err.message || 'Failed to accept request');
    }
  };

  const handleRejectRequest = async () => {
    if (!activeConvId) return;
    try {
      await api.post(`/conversations/${activeConvId}/reject`);
      setActiveConvId(null);
      fetchConversations();
    } catch (err: any) {
      alert(err.message || 'Failed to reject request');
    }
  };

  const filteredConversations = conversations.filter(c => {
    if (c.status === 'rejected') return false;
    const isRequest = c.status === 'pending' && c.initiator_id !== user?.id;
    return activeTab === 'requests' ? isRequest : !isRequest;
  });

  const requestCount = conversations.filter(c => c.status === 'pending' && c.initiator_id !== user?.id).length;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto h-[calc(100vh-120px)] bg-card border border-border rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-3">
        {/* Conversations List */}
        <div className="border-r border-border flex flex-col min-h-0 bg-background">
          <div className="p-4 border-b border-border">
            <h2 className="text-base font-bold uppercase tracking-tight text-foreground flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-primary" /> Messages
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('primary')}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors ${
                  activeTab === 'primary' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                Primary
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'requests' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                Requests
                {requestCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px]">
                    {requestCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-scroll divide-y divide-white/5">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Loading messages...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                {activeTab === 'requests' ? 'No message requests.' : 'No conversations yet. Visit Discover or a Profile to send a message.'}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === activeConvId;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={`w-full p-4 flex items-center gap-3 text-left transition-colors ${
                      isSelected ? 'bg-secondary border-l-4 border-primary' : 'hover:bg-secondary/50'
                    }`}
                  >
                    <img
                      src={conv.other_user?.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.other_user?.username}`}
                      alt={conv.other_user?.username}
                      className="w-10 h-10 rounded-full border border-border object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-foreground truncate">
                          {conv.other_user?.profile?.full_name || conv.other_user?.username}
                        </h4>
                        {conv.unread_count > 0 && (
                          <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {conv.last_message || 'Start chatting...'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="md:col-span-2 flex flex-col min-h-0 h-full bg-secondary">
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border flex items-center justify-between bg-card">
                <div className="flex items-center gap-3">
                  <img
                    src={activeConv.other_user?.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeConv.other_user?.username}`}
                    alt={activeConv.other_user?.username}
                    className="w-9 h-9 rounded-full border border-border object-cover"
                  />
                  <div>
                    <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                      {activeConv.other_user?.profile?.full_name || activeConv.other_user?.username}
                    </h3>
                    {getLastSeenText(activeConv.other_user?.last_seen) || <p className="text-[10px] text-primary">@{activeConv.other_user?.username}</p>}
                  </div>
                </div>

                <button
                  onClick={() => handleBlockUser(activeConv.other_user.username)}
                  className="text-xs text-muted-foreground hover:text-red-400 flex items-center gap-1"
                  title="Block User"
                >
                  <Ban className="w-3.5 h-3.5" /> Block
                </button>
              </div>

              {/* Message List */}
              <div className="flex-1 min-h-0 overflow-y-scroll p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="py-20 text-center text-xs text-muted-foreground">
                    No messages in this chat yet. Send your first message below!
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender_id === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            isMe
                              ? 'bg-primary text-primary-foreground rounded-br-none font-medium shadow-sm'
                              : 'bg-secondary text-muted-foreground border border-border rounded-bl-none'
                          }`}
                        >
                          {m.content}
                        </div>
                        <span className="text-[9px] text-muted-foreground mt-1 px-1 flex items-center gap-1">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isMe && (
                            <>
                              {m.is_read ? (
                                <CheckCheck className="w-3 h-3 text-primary" />
                              ) : m.is_delivered ? (
                                <CheckCheck className="w-3 h-3" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                            </>
                          )}
                        </span>
                      </div>
                    );
                  })
                )}
                {isTyping && (
                  <div className="flex items-start">
                    <div className="bg-secondary px-4 py-2.5 rounded-2xl rounded-bl-none flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bar or Request Actions */}
              {activeConv.status === 'pending' && activeConv.initiator_id !== user?.id ? (
                <div className="p-4 border-t border-border bg-card flex flex-col items-center justify-center text-center">
                  <h4 className="text-sm font-bold text-foreground mb-1">Message Request</h4>
                  <p className="text-xs text-muted-foreground mb-4">Do you want to accept messages from @{activeConv.other_user?.username}?</p>
                  <div className="flex gap-3 w-full max-w-sm">
                    <button onClick={handleRejectRequest} className="flex-1 py-2.5 rounded-xl border border-border bg-secondary text-foreground text-xs font-bold hover:bg-red-500/10 hover:text-red-400 transition-colors">
                      Reject
                    </button>
                    <button onClick={handleAcceptRequest} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 transition-colors">
                      Accept
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="p-3 border-t border-border flex gap-2 bg-card">
                  <input
                    type="text"
                    required
                    placeholder="Type your message..."
                    value={inputMessage}
                    onChange={handleTyping}
                    className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  />
                  <button type="submit" className="button button-small button-solid">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
              {activeConv.status === 'pending' && activeConv.initiator_id === user?.id && (
                <div className="px-4 py-2 bg-secondary/50 text-center text-[10px] text-muted-foreground border-t border-border">
                  Waiting for @{activeConv.other_user?.username} to accept your request.
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 text-primary mb-3 opacity-50" />
              <h3 className="text-sm font-bold text-foreground uppercase">Select a conversation</h3>
              <p className="text-xs mt-1">Choose a student from the sidebar to view your 1-to-1 chat history.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
