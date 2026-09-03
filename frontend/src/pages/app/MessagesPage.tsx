import React, { useState, useEffect, useRef } from 'react';
import { AppLayout } from '../../components/AppLayout';
import { api } from '../../services/api';
import type { Conversation, Message } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Send, Ban, MessageSquare, Check, CheckCheck, Smile, Paperclip, Mic, Square, X, XCircle, Reply, ImageIcon, Lock, Camera, BarChart2, MoreHorizontal, Trash, Shield, Film, FileText } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { CreateGroupModal } from '../../components/CreateGroupModal';
import { InviteModal } from '../../components/InviteModal';
import { CameraModal } from './components/CameraModal';
import { CreatePollModal } from './components/CreatePollModal';
import { MembershipBadge } from '../../components/MembershipBadge';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const targetConvIdParam = searchParams.get('conv');
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(targetConvIdParam ? Number(targetConvIdParam) : null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [activeMessageMenu, setActiveMessageMenu] = useState<number | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editGroupInfo, setEditGroupInfo] = useState({ name: '', description: '', avatar_url: '' });
  const [showAvatarCamera, setShowAvatarCamera] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  const activeConv = conversations.find((c) => c.id === activeConvId);

  const [activeTab, setActiveTab] = useState<'chats' | 'discover' | 'requests'>('chats');
  const [searchGroupQuery, setSearchGroupQuery] = useState('');
  const [publicGroups, setPublicGroups] = useState<Conversation[]>([]);
  const [groupRequests, setGroupRequests] = useState<any[]>([]);
  
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    if (activeTab === 'discover') {
      const fetchGroups = async () => {
        try {
          const res = await api.get<Conversation[]>('/conversations/groups/discover?q=' + searchGroupQuery);
          setPublicGroups(res);
        } catch (e: any) { console.error("Failed to search groups", e); }
      };
      
      const timer = setTimeout(() => {
        fetchGroups();
      }, 300); // 300ms debounce
      
      return () => clearTimeout(timer);
    }
  }, [searchGroupQuery, activeTab]);

  const joinGroup = async (groupId: number) => {
    try {
      await api.post(`/conversations/${groupId}/join`);
      await fetchConversations();
      setActiveTab('chats');
      setActiveConvId(groupId);
    } catch (e: any) {
      const msg = e.message || "Failed to join";
      if (/limit/i.test(msg)) {
        if (confirm(`${msg}\n\nGo to Membership to upgrade?`)) window.location.href = '/app/membership';
      } else {
        alert(msg);
      }
    }
  };

  const fetchGroupRequests = async () => {
    try {
      const res = await api.get<any[]>('/conversations/requests/group');
      setGroupRequests(res);
    } catch (e) { console.error(e); }
  };

  const handleAcceptGroupRequest = async (reqId: number) => {
    try {
      await api.post(`/conversations/requests/${reqId}/accept`);
      await fetchGroupRequests();
      await fetchConversations();
    } catch (e: any) { alert(e.message || "Failed to accept"); }
  };

  const handleRejectGroupRequest = async (reqId: number) => {
    try {
      await api.post(`/conversations/requests/${reqId}/reject`);
      await fetchGroupRequests();
    } catch (e: any) { alert(e.message || "Failed to reject"); }
  };

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchGroupRequests();
    }
  }, [activeTab]);

  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string; type: 'image' | 'video' | 'audio' | 'file' } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const handleEmojiClick = (emojiObj: any) => {
    setInputMessage(prev => prev + emojiObj.emoji);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setLoading(true);
      const res = await api.post<{url: string}>('/upload', formData);
      const fileType = file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
        ? 'audio'
        : file.type.startsWith('image/')
        ? 'image'
        : 'file';
      setAttachment({ url: res.url, type: fileType });
    } catch (err: any) {
      alert(err.message || 'Failed to upload file');
    } finally {
      setLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio_message.webm');
        
        try {
          setLoading(true);
          const res = await api.post<{url: string}>('/upload', formData);
          setAttachment({ url: res.url, type: 'audio' });
        } catch (err: any) {
          alert(err.message || 'Failed to upload audio');
        } finally {
          setLoading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('Microphone access denied or error occurred');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

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
        fetchConversations(true);
      }, 2000);

      const env = import.meta.env as any;
      const wsBase = env.VITE_WS_BASE || `ws://${window.location.hostname || 'localhost'}:8000`;
      const wsUrl = `${wsBase}/api/conversations/ws/${activeConvId}`;

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
            
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev;
              return [...prev, data];
            });
            setIsTyping(false);
            
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

  const handleCapturePhoto = async (file: File) => {
    setShowCameraModal(false);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post<{ url: string }>('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAttachment({ url: res.url, type: 'image' });
    } catch (error) {
      alert('Failed to upload photo');
    }
  };

  const handleCreatePoll = async (question: string, options: string[], multipleAnswers: boolean) => {
    setShowPollModal(false);
    if (!activeConvId) return;

    try {
      const realMsg = await api.post<Message>(`/conversations/${activeConvId}/messages`, {
        content: question,
        is_poll: true,
        poll_multiple_answers: multipleAnswers,
        poll_options: options,
      });
      setMessages(prev => [...prev, realMsg]);
      fetchConversations(true);
    } catch (error: any) {
      alert(error.message || 'Failed to create poll');
    }
  };

  const handleDeleteMessage = async (msgId: number, deleteType: 'me' | 'everyone') => {
    try {
      await api.delete(`/conversations/messages/${msgId}?delete_type=${deleteType}`);
      setActiveMessageMenu(null);
      const res = await api.get<Message[]>(`/conversations/${activeConvId}/messages`);
      setMessages(res);
      fetchConversations(true);
    } catch (err: any) {
      alert(err.message || 'Failed to delete message');
    }
  };

  const handleVotePoll = async (msgId: number, optId: number) => {
    try {
      await api.post(`/conversations/messages/${msgId}/vote?option_id=${optId}`);
      // Refresh messages to get updated poll counts
      const res = await api.get<Message[]>(`/conversations/${activeConvId}/messages`);
      setMessages(res);
    } catch (err: any) {
      alert(err.message || 'Failed to vote');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConvId || (!inputMessage.trim() && !attachment)) return;

    const content = inputMessage.trim() || (attachment ? `[Attached ${attachment.type}]` : '');
    setInputMessage('');

    const optimisticMsg: Message = {
      id: Date.now(),
      conversation_id: activeConvId,
      sender_id: user?.id || 0,
      sender_username: user?.username || 'me',
      sender_name: user?.profile?.full_name || user?.username || 'Me',
      content: content,
      attachment_url: attachment?.url,
      attachment_type: attachment?.type,
      reply_to_id: replyingTo?.id,
      replied_to_message: replyingTo || undefined,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    const currentAttachment = attachment;
    const currentReplyingTo = replyingTo;
    
    setAttachment(null);
    setReplyingTo(null);
    setShowEmojiPicker(false);

    try {
      const realMsg = await api.post<Message>(`/conversations/${activeConvId}/messages`, {
        content: content,
        attachment_url: currentAttachment?.url,
        attachment_type: currentAttachment?.type,
        reply_to_id: currentReplyingTo?.id,
      });

      setMessages((prev) => {
        const wsAlreadyAdded = prev.some(m => m.id === realMsg.id);
        if (wsAlreadyAdded) {
          return prev.filter(m => m.id !== optimisticMsg.id);
        }
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

  const handleAcceptRequest = async () => {
    try {
      await api.post(`/conversations/${activeConvId}/accept`);
      await fetchConversations();
    } catch (err: any) { alert(err.message || 'Failed to accept'); }
  };

  const handleRejectRequest = async () => {
    try {
      await api.post(`/conversations/${activeConvId}/reject`);
      await fetchConversations();
      setActiveConvId(null);
    } catch (err: any) { alert(err.message || 'Failed to reject'); }
  };

  const handleScrollToMessage = (msgId: number) => {
    setHighlightedMsgId(msgId);
    setTimeout(() => setHighlightedMsgId(null), 1500);
    const el = document.getElementById(`message-${msgId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const getLastSeenText = (lastSeen: string | undefined | null) => {
    if (!lastSeen) return null;
    const date = new Date(lastSeen.endsWith('Z') ? lastSeen : lastSeen + 'Z');
    const now = new Date();
    const diffSeconds = (now.getTime() - date.getTime()) / 1000;
    
    if (diffSeconds < 60) return <p className="text-[10px] text-green-500 font-bold">Online</p>;
    if (diffSeconds < 3600) return <p className="text-[10px] text-muted-foreground">Last seen {Math.floor(diffSeconds / 60)}m ago</p>;
    if (diffSeconds < 86400) return <p className="text-[10px] text-muted-foreground">Last seen {Math.floor(diffSeconds / 3600)}h ago</p>;
    return <p className="text-[10px] text-muted-foreground">Last seen {Math.floor(diffSeconds / 86400)}d ago</p>;
  };


  const handleToggleAdminOnly = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeConv) return;
    try {
      await api.put(`/conversations/${activeConv.id}/settings`, {
        only_admins_can_message: e.target.checked
      });
      await fetchConversations();
    } catch (err: any) { alert(err.message || 'Failed to update settings'); }
  };

  const handleToggleAdminEditSettings = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeConv) return;
    try {
      await api.put(`/conversations/${activeConv.id}/settings`, {
        only_admins_can_edit_settings: e.target.checked
      });
      await fetchConversations();
    } catch (err: any) { alert(err.message || 'Failed to update settings'); }
  };

  const handleUpdateGroupInfo = async () => {
    if (!activeConv) return;
    try {
      await api.put(`/conversations/${activeConv.id}/settings`, editGroupInfo);
      setIsEditingGroup(false);
      await fetchConversations();
    } catch (err: any) { alert(err.message || 'Failed to update info'); }
  };

  const handleUpdateRole = async (userId: number, role: string) => {
    if (!activeConv) return;
    try {
      await api.put(`/conversations/${activeConv.id}/members/${userId}/role?role=${role}`, {});
      await fetchConversations();
    } catch (err: any) { alert(err.message || 'Failed to update role'); }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditGroupInfo({...editGroupInfo, avatar_url: reader.result as string});
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeConv || !window.confirm("Are you sure you want to leave this group?")) return;
    try {
      await api.delete(`/conversations/groups/${activeConv.id}/leave`);
      setShowGroupInfo(false);
      setActiveConvId(null);
      fetchConversations(true);
    } catch (err: any) {
      alert(err.message || 'Failed to leave group');
    }
  };

  return (
    <AppLayout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 h-[calc(100vh-8rem)] bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {/* Sidebar */}
        <div className="md:col-span-1 border-r border-border flex flex-col min-h-0 bg-card">
          <div className="p-4 border-b border-border flex flex-col gap-3 shrink-0">
            <h2 className="text-sm font-bold text-foreground">Direct Messages</h2>
            <div className="flex gap-1 bg-secondary p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('chats')} 
                className={`flex-1 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-colors ${activeTab === 'chats' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-border/50'}`}
              >
                Chats
              </button>
              <button 
                onClick={() => setActiveTab('discover')} 
                className={`flex-1 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-colors ${activeTab === 'discover' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-border/50'}`}
              >
                Discover
              </button>
              <button 
                onClick={() => setActiveTab('requests')} 
                className={`flex-1 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-colors relative ${activeTab === 'requests' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-border/50'}`}
              >
                Requests
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1">
            {activeTab === 'discover' ? (
              <div className="p-2 space-y-4">
                <div className="flex gap-2">
                  <input type="text" placeholder="Search public groups..." className="flex-1 bg-secondary border border-border rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-primary" value={searchGroupQuery} onChange={e => setSearchGroupQuery(e.target.value)} />
                </div>
                <button onClick={() => setShowCreateGroup(true)} className="w-full py-2 bg-secondary border border-border rounded-xl text-xs font-bold text-foreground hover:bg-border transition-colors">
                  + Create New Group
                </button>
                <div className="space-y-2 mt-4">
                  {publicGroups.map(g => (
                    <div key={g.id} className="p-3 bg-secondary rounded-xl flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{g.name}</h4>
                        <p className="text-[10px] text-muted-foreground">{g.member_count} members</p>
                      </div>
                      <button onClick={() => joinGroup(g.id)} className="button button-small button-solid">Join</button>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeTab === 'requests' ? (
              <div className="p-2 space-y-3">
                {groupRequests.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground mt-4">No pending requests</div>
                ) : (
                  groupRequests.map(req => (
                    <div key={req.id} className="p-3 bg-secondary rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <img 
                          src={req.type === 'join_request' ? (req.user?.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.user?.username}`) : `https://api.dicebear.com/7.x/initials/svg?seed=${req.conversation?.name}`} 
                          alt="avatar" 
                          className="w-8 h-8 rounded-full object-cover shrink-0 border border-border" 
                        />
                        <div className="min-w-0">
                          <p className="text-xs text-foreground truncate">
                            {req.type === 'join_request' ? (
                              <><span className="font-bold">{req.user?.profile?.full_name || req.user?.username}</span> requested to join <span className="font-bold">{req.conversation?.name}</span></>
                            ) : (
                              <>You were invited to join <span className="font-bold">{req.conversation?.name}</span></>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => handleAcceptGroupRequest(req.id)} className="flex-1 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:brightness-110">Accept</button>
                        <button onClick={() => handleRejectGroupRequest(req.id)} className="flex-1 py-1.5 border border-border bg-card text-xs font-bold rounded-lg hover:bg-red-500/10 hover:text-red-400">Reject</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                Loading chats...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No active conversations. Visit a student's profile or join a group to start chatting!
              </div>
            ) : (
              conversations.map((conv) => {
                const isGroup = conv.is_group;
                const title = isGroup ? conv.name : (conv.other_user?.profile?.full_name || conv.other_user?.username);
                const subtitle = isGroup ? `${conv.member_count} members` : (conv.last_message || 'Start chatting...');
                const avatar = isGroup ? `https://api.dicebear.com/7.x/initials/svg?seed=${conv.name}` : (conv.other_user?.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.other_user?.username}`);
                
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all duration-200 text-left ${
                      activeConvId === conv.id
                        ? 'bg-primary/10 border border-primary/20 scale-[0.98]'
                        : 'hover:bg-secondary border border-transparent'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={avatar}
                        alt="avatar"
                        className="w-10 h-10 rounded-full border border-border object-cover"
                      />
                      {!isGroup && conv.other_user?.last_seen && (new Date().getTime() - new Date(conv.other_user.last_seen.endsWith('Z') ? conv.other_user.last_seen : conv.other_user.last_seen + 'Z').getTime()) / 1000 < 60 && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
                          {title}
                          {!isGroup && <MembershipBadge membership={conv.other_user?.membership} size={13} />}
                        </h4>
                        {conv.unread_count > 0 && (
                          <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center shrink-0">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{subtitle}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`${showGroupInfo && activeConv?.is_group ? 'md:col-span-1' : 'md:col-span-2'} flex flex-col min-h-0 h-full bg-secondary`}>
          {activeConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border flex items-center justify-between bg-card">
                <div className="flex items-center gap-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-2 -ml-2 rounded-lg" onClick={() => activeConv?.is_group && setShowGroupInfo(true)}>
                  <img
                    src={activeConv.is_group ? `https://api.dicebear.com/7.x/initials/svg?seed=${activeConv.name}` : (activeConv.other_user?.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeConv.other_user?.username}`)}
                    alt="avatar"
                    className="w-9 h-9 rounded-full border border-border object-cover"
                  />
                  <div>
                    <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                      {activeConv.is_group ? activeConv.name : (activeConv.other_user?.profile?.full_name || activeConv.other_user?.username)}
                      {!activeConv.is_group && <MembershipBadge membership={activeConv.other_user?.membership} size={14} />}
                    </h3>
                    {!activeConv.is_group && (getLastSeenText(activeConv.other_user?.last_seen) || <p className="text-[10px] text-primary">@{activeConv.other_user?.username}</p>)}
                    {activeConv.is_group && <p className="text-[10px] text-muted-foreground">{activeConv.member_count} members</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeConv.is_group ? (
                    <button onClick={() => setShowInviteModal(true)} className="text-xs text-primary font-bold px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
                      + Invite
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBlockUser(activeConv.other_user!.username)}
                      className="text-xs text-muted-foreground hover:text-red-400 flex items-center gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" /> Block
                    </button>
                  )}
                </div>
              </div>

              {/* Message List Container with WhatsApp-style Doodle Wallpaper */}
              <div className="relative flex-1 min-h-0">
                <div className="absolute inset-0 chat-doodle-bg pointer-events-none" />
                <div className="relative h-full overflow-y-scroll p-4 space-y-3">
                  <div className="flex flex-col items-center justify-center my-6 space-y-2 opacity-80">
                    <div className="bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 border border-green-500/20 backdrop-blur-xs shadow-xs">
                      <Lock className="w-3 h-3" /> Messages are end-to-end encrypted
                    </div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">
                      Only the 50 most recent messages are kept
                    </p>
                  </div>
                {messages.length === 0 ? (
                  <div className="py-20 text-center text-xs text-muted-foreground">
                    No messages in this chat yet. Send your first message below!
                  </div>
                ) : (
                  messages.slice(-50).map((m) => {
                    const isMe = m.sender_id === user?.id;
                    return (
                      <div
                        id={`message-${m.id}`}
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                      >
                        <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                          {(!isMe && activeConv.is_group) && (
                            <img
                              src={m.sender_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.sender_username}`}
                              alt={m.sender_username}
                              className="w-6 h-6 rounded-full border border-border object-cover shrink-0 mb-1"
                            />
                          )}
                          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                            {(!isMe && activeConv.is_group) && (
                              <span className="text-[10px] font-bold text-muted-foreground ml-1 mb-0.5 opacity-80">
                                {m.sender_name}
                              </span>
                            )}
                            <div
                              className={`w-full px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm relative flex flex-col transition-all duration-500 ${
                                isMe
                                  ? 'bg-primary text-primary-foreground rounded-br-none font-medium'
                                  : 'bg-card text-foreground border border-border rounded-bl-none font-medium'
                              } ${
                                highlightedMsgId === m.id ? 'ring-4 ring-primary ring-opacity-50 ring-offset-2 ring-offset-background brightness-110 scale-[1.02]' : ''
                              }`}
                            >
                            {m.replied_to_message && (
                              <div 
                                onClick={() => handleScrollToMessage(m.replied_to_message!.id)}
                                className={`mb-1.5 p-2 rounded-xl text-[10px] border-l-2 cursor-pointer hover:opacity-80 transition-opacity ${
                                  isMe ? 'bg-white/10 border-white text-white/90' : 'bg-secondary border-primary text-muted-foreground'
                                }`}
                              >
                                <strong className="block truncate max-w-[200px]">
                                  {m.replied_to_message.sender_name}
                                </strong>
                                <span className="block truncate max-w-[200px] opacity-80">
                                  {m.replied_to_message.content}
                                </span>
                              </div>
                            )}
                            {m.attachment_url && m.attachment_type === 'image' && (
                              <img src={m.attachment_url} alt="attachment" className="max-w-[200px] rounded-lg mb-2 cursor-pointer hover:opacity-90" onClick={() => setPreviewImage(m.attachment_url!)} />
                            )}
                            {m.attachment_url && m.attachment_type === 'video' && (
                              <video src={m.attachment_url} controls playsInline preload="metadata" className="max-w-[260px] max-h-60 rounded-xl mb-2 bg-black" />
                            )}
                            {m.attachment_url && m.attachment_type === 'audio' && (
                              <audio src={m.attachment_url} controls className="w-[240px] max-w-full mb-1 h-10 rounded-md" />
                            )}
                            {m.attachment_url && !['image', 'video', 'audio'].includes(m.attachment_type || '') && (
                              <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-black/10 dark:bg-white/10 mb-2 hover:underline text-[11px] font-bold">
                                <FileText className="w-4 h-4" /> Download Attached File
                              </a>
                            )}
                            {m.is_poll && (
                              <div className="mt-2 space-y-2">
                                <p className="font-bold mb-2 text-[15px]">{m.content}</p>
                                {m.poll_options?.map((opt: any) => (
                                  <button key={opt.id} onClick={() => handleVotePoll(m.id, opt.id)} 
className={`block w-full text-left p-2.5 rounded-lg text-sm transition-all shadow-sm border ${opt.user_voted ? 'bg-black/20 dark:bg-white/20 font-bold border-black/30 dark:border-white/30' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border-transparent'}`}>
                                    <div className="flex justify-between items-center gap-4">
                                      <span className="truncate">{opt.option_text}</span>
                                      <span className="whitespace-nowrap text-xs opacity-90 font-medium">{opt.votes_count} {opt.votes_count === 1 ? 'vote' : 'votes'}</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                            {m.is_deleted ? (
                                <span className="italic opacity-80">
                                  <Ban className="inline-block w-3 h-3 mr-1" />
                                  {m.content}
                                </span>
                              ) : (
                                !m.is_poll && m.content && !m.content.startsWith('[Attached') && m.content
                              )}
                            </div>
                          </div>
                          
                          <div className="relative">
                              <button
                                onClick={() => setActiveMessageMenu(activeMessageMenu === m.id ? null : m.id)}
                                className="p-1.5 rounded-full bg-secondary text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground hover:bg-border"
                                title="Message options"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                              
                              {activeMessageMenu === m.id && (
                                <div className="absolute top-8 right-0 z-10 w-48 bg-card rounded-md shadow-lg border border-border py-1 text-sm">
                                  <button
                                    onClick={() => { setReplyingTo(m); setActiveMessageMenu(null); }}
                                    className="w-full text-left px-4 py-2 hover:bg-secondary flex items-center gap-2"
                                  >
                                    <Reply className="w-4 h-4" /> Reply
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMessage(m.id, 'me')}
                                    className="w-full text-left px-4 py-2 hover:bg-secondary flex items-center gap-2 text-destructive"
                                  >
                                    <Trash className="w-4 h-4" /> Delete for me
                                  </button>
                                  {(isMe || activeConv?.is_group) && (
                                    <button
                                      onClick={() => handleDeleteMessage(m.id, 'everyone')}
                                      className="w-full text-left px-4 py-2 hover:bg-secondary flex items-center gap-2 text-destructive"
                                    >
                                      <Shield className="w-4 h-4" /> Delete for everyone
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                        </div>
                        <span className="text-[9px] text-muted-foreground font-medium mt-1 px-1.5 py-0.5 rounded-full bg-background/50 dark:bg-background/70 backdrop-blur-xs flex items-center gap-1 shadow-xs">
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
              </div>

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
              ) : activeConv.status === 'pending' && activeConv.initiator_id === user?.id && messages.length > 0 ? (
                <div className="px-4 py-3 bg-secondary/50 text-center text-xs font-medium text-muted-foreground border-t border-border">
                  Waiting for @{activeConv.other_user?.username} to accept your request before you can send more messages.
                </div>
              ) : (
                <div className="flex flex-col border-t border-border bg-card relative">
                  {replyingTo && (
                    <div className="flex items-center justify-between px-4 py-2 bg-secondary/50 border-b border-border">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Reply className="w-4 h-4 text-primary shrink-0" />
                        <div className="text-xs">
                          <span className="text-primary font-bold mr-1">Replying to {replyingTo.sender_name}</span>
                          <span className="text-muted-foreground truncate max-w-[200px] inline-block align-bottom">{replyingTo.content}</span>
                        </div>
                      </div>
                      <button onClick={() => setReplyingTo(null)} className="p-1 rounded-full text-muted-foreground hover:bg-border transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {attachment && (
                    <div className="px-4 py-2 bg-secondary/30 flex items-center justify-between border-b border-border">
                      <div className="flex items-center gap-2 text-xs">
                        {attachment.type === 'image' && <ImageIcon className="w-4 h-4 text-primary" />}
                        {attachment.type === 'video' && <Film className="w-4 h-4 text-primary" />}
                        {attachment.type === 'audio' && <Mic className="w-4 h-4 text-primary" />}
                        {attachment.type === 'file' && <FileText className="w-4 h-4 text-primary" />}
                        <span className="text-muted-foreground truncate max-w-[200px]">Attached {attachment.type}</span>
                      </div>
                      <button onClick={() => setAttachment(null)} className="text-red-400 hover:text-red-500">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {showEmojiPicker && (
                    <div className="absolute bottom-[calc(100%+10px)] left-4 z-50 shadow-xl rounded-xl overflow-hidden">
                      <EmojiPicker onEmojiClick={handleEmojiClick} theme={Theme.DARK} />
                    </div>
                  )}
                  
                  {activeConv.is_group && activeConv.only_admins_can_message && activeConv.members?.find((m: any) => m.user.id === user?.id)?.role !== 'admin' ? (
                    <div className="p-4 text-center text-sm font-medium text-muted-foreground bg-secondary/50 border-t border-border">
                      Only admins can send messages
                    </div>
                  ) : (
                    <form onSubmit={handleSendMessage} className="p-3 flex gap-2 w-full items-center">
                    <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 rounded-full text-muted-foreground hover:bg-border transition-colors">
                      <Smile className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setShowCameraModal(true)} className="p-2 rounded-full text-muted-foreground hover:bg-border transition-colors">
                      <Camera className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setShowPollModal(true)} className="p-2 rounded-full text-muted-foreground hover:bg-border transition-colors">
                      <BarChart2 className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full text-muted-foreground hover:bg-border transition-colors" title="Attach file, photo or video">
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <input type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.pptx,.txt,.zip" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                    
                    <input
                      type="text"
                      placeholder={isRecording ? "Recording..." : "Type your message..."}
                      value={inputMessage}
                      onChange={handleTyping}
                      disabled={isRecording}
                      className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                    />
                    
                    {isRecording ? (
                      <button type="button" onClick={stopRecording} className="p-2 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors animate-pulse">
                        <Square className="w-4 h-4" />
                      </button>
                    ) : (
                      <button type="button" onClick={startRecording} className="p-2 rounded-full text-muted-foreground hover:bg-border transition-colors">
                        <Mic className="w-4 h-4" />
                      </button>
                    )}

                    <button type="submit" className="button button-small button-solid shrink-0" disabled={(!inputMessage.trim() && !attachment) || isRecording}>
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="relative flex-1 min-h-0 flex items-center justify-center p-8 text-muted-foreground chat-doodle-bg">
              <div className="relative z-10 bg-card/90 backdrop-blur-md p-8 rounded-3xl border border-border shadow-lg max-w-sm flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3 text-primary border border-primary/20">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-foreground tracking-wide">EduNexus Messenger</h3>
                <p className="text-xs mt-1.5 text-muted-foreground leading-relaxed">
                  Send and receive messages with fellow students, school mates, and project collaborators.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-[10px] font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                  <Lock className="w-3 h-3" /> End-to-end encrypted
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Group Info Sidebar */}
        {showGroupInfo && activeConv?.is_group && (
          <div className="md:col-span-1 border-l border-border bg-card flex flex-col min-h-0 h-full">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30 shrink-0">
              <h3 className="font-semibold text-foreground">Group Info</h3>
              <button onClick={() => setShowGroupInfo(false)} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
              <div className="flex-1 overflow-y-auto flex flex-col">
                <div className="p-6 flex flex-col items-center border-b border-border shrink-0">
                  {isEditingGroup ? (
                    <div className="w-full space-y-4">
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative group cursor-pointer w-24 h-24 rounded-full border overflow-hidden">
                          <img src={editGroupInfo.avatar_url || activeConv.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeConv.name}`} alt={activeConv.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => avatarInputRef.current?.click()} className="p-2 text-white hover:text-primary"><ImageIcon className="w-5 h-5" /></button>
                            <button onClick={() => setShowAvatarCamera(true)} className="p-2 text-white hover:text-primary"><Camera className="w-5 h-5" /></button>
                          </div>
                          <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={handleAvatarUpload} />
                        </div>
                      </div>
                      <input type="text" value={editGroupInfo.name} onChange={e => setEditGroupInfo({...editGroupInfo, name: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm" placeholder="Group Name" />
                      <textarea value={editGroupInfo.description} onChange={e => setEditGroupInfo({...editGroupInfo, description: e.target.value})} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm resize-none" placeholder="Description" rows={3}></textarea>
                      <div className="flex gap-2">
                        <button onClick={handleUpdateGroupInfo} className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold">Save</button>
                        <button onClick={() => setIsEditingGroup(false)} className="flex-1 py-2 bg-secondary text-foreground rounded-xl text-sm font-bold">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <img src={activeConv.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeConv.name}`} alt={activeConv.name} className="w-24 h-24 rounded-full border mb-4 object-cover" />
                      <h2 className="text-xl font-bold">{activeConv.name}</h2>
                      <p className="text-sm text-muted-foreground mt-1 text-center">{activeConv.description || 'No description provided.'}</p>
                      {(!activeConv.only_admins_can_edit_settings || activeConv.members?.find((m: any) => m.user.id === user?.id)?.role === 'admin') && (
                        <button onClick={() => { setEditGroupInfo({name: activeConv.name || '', description: activeConv.description || '', avatar_url: activeConv.avatar_url || ''}); setIsEditingGroup(true); }} className="mt-4 text-xs font-bold text-primary hover:underline">Edit Group Info</button>
                      )}
                    </>
                  )}
                </div>
                
                {activeConv.members?.find((m: any) => m.user.id === user?.id)?.role === 'admin' && (
                  <div className="p-4 border-b border-border shrink-0 space-y-4">
                    <div className="text-xs font-bold text-muted-foreground uppercase">Group Settings</div>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm font-medium">Only admins can send messages</span>
                      <input 
                        type="checkbox" 
                        className="toggle toggle-primary toggle-sm" 
                        checked={activeConv.only_admins_can_message || false}
                        onChange={handleToggleAdminOnly}
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm font-medium">Only admins can edit settings</span>
                      <input 
                        type="checkbox" 
                        className="toggle toggle-primary toggle-sm" 
                        checked={activeConv.only_admins_can_edit_settings || false}
                        onChange={handleToggleAdminEditSettings}
                      />
                    </label>
                  </div>
                )}
  
                <div className="p-4 shrink-0 flex-1">
                  <div className="text-xs font-bold text-muted-foreground uppercase mb-4">Members ({activeConv.member_count})</div>
                  <div className="space-y-4">
                    {activeConv.members?.map((member: any) => (
                      <div key={member.id} className="flex items-center justify-between group/member">
                        <div 
                          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => navigate(`/app/profile/${member.user.username}`)}
                        >
                          <img src={member.user.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user.username}`} alt={member.user.username} className="w-8 h-8 rounded-full border object-cover" />
                          <div>
                            <p className="font-semibold text-sm leading-none">{member.user.profile?.full_name || member.user.username}</p>
                            <p className="text-xs text-muted-foreground">@{member.user.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.role === 'admin' ? (
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">Admin</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground shrink-0">Member</span>
                          )}
                          {activeConv.members?.find((m: any) => m.user.id === user?.id)?.role === 'admin' && member.user.id !== user?.id && (
                            <div className="opacity-0 group-hover/member:opacity-100 transition-opacity flex gap-1">
                              {member.role === 'admin' ? (
                                <button onClick={() => handleUpdateRole(member.user.id, 'member')} className="text-[10px] bg-secondary border hover:bg-border px-2 py-0.5 rounded text-foreground">Demote</button>
                              ) : (
                                <button onClick={() => handleUpdateRole(member.user.id, 'admin')} className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded">Make Admin</button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            
            <div className="p-4 border-t border-border shrink-0">
              <button 
                onClick={handleLeaveGroup}
                className="w-full py-2.5 rounded-xl border border-red-500/20 text-red-500 font-bold text-sm hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
              >
                <Trash className="w-4 h-4" />
                Leave Group
              </button>
            </div>
          </div>
        )}

      </div>
    
      {showCreateGroup && (
        <CreateGroupModal 
          onClose={() => setShowCreateGroup(false)} 
          onSuccess={(id) => {
            setShowCreateGroup(false);
            fetchConversations();
            setActiveConvId(id);
          }} 
        />
      )}
      {showInviteModal && activeConv && (
        <InviteModal
          groupId={activeConv.id}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => fetchConversations()}
        />
      )}

      {showCameraModal && (
        <CameraModal onClose={() => setShowCameraModal(false)} onCapture={handleCapturePhoto} />
      )}
      
      {showPollModal && (
        <CreatePollModal onClose={() => setShowPollModal(false)} onSubmit={handleCreatePoll} />
      )}

      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setPreviewImage(null)}>
            <X className="w-8 h-8" />
          </button>
          <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
      {showAvatarCamera && (
        <CameraModal 
          onClose={() => setShowAvatarCamera(false)}
          onCapture={async (file: File) => {
            try {
              const formData = new FormData();
              formData.append('file', file);
              const token = localStorage.getItem('token');
              const res = await fetch('http://localhost:8000/api/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
              });
              const data = await res.json();
              if (res.ok && data.url) {
                setEditGroupInfo({...editGroupInfo, avatar_url: data.url});
              }
            } catch (e) {
              console.error(e);
            }
            setShowAvatarCamera(false);
          }}
        />
      )}
    </AppLayout>
  );
};
