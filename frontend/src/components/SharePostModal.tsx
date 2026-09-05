import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Post, Conversation } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { UserAvatar } from './UserAvatar';
import { 
  X, 
  Search, 
  Send, 
  Check, 
  Copy, 
  Share2, 
  MessageSquare, 
  ExternalLink,
  Users
} from 'lucide-react';

interface SharePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
}

export const SharePostModal: React.FC<SharePostModalProps> = ({
  isOpen,
  onClose,
  post,
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sentConvIds, setSentConvIds] = useState<Set<number>>(new Set());
  const [sendingConvId, setSendingConvId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setLoadingChats(true);
      api.get<Conversation[]>('/conversations')
        .then((data) => {
          setConversations(data.filter((c) => c.status === 'accepted'));
        })
        .catch((e) => console.error('Failed to load conversations for sharing', e))
        .finally(() => setLoadingChats(false));
    } else {
      setSearchQuery('');
      setSentConvIds(new Set());
      setCopied(false);
    }
  }, [isOpen, user]);

  if (!isOpen || !post) return null;

  const shareUrl = `${window.location.origin}/p/${post.id}`;
  const shareTitle = post.title || `Post by @${post.author_username}`;
  const shareText = post.content ? post.content.slice(0, 100) : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleSendToChat = async (convId: number) => {
    if (sentConvIds.has(convId) || sendingConvId === convId) return;

    setSendingConvId(convId);
    try {
      const messageText = `Check out this post: ${shareUrl}`;
      await api.post(`/conversations/${convId}/messages`, {
        content: messageText,
      });
      setSentConvIds((prev) => new Set([...prev, convId]));
    } catch (e: any) {
      alert(e.message || 'Failed to send post to chat');
    } finally {
      setSendingConvId(null);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (c.is_group) {
      return (c.name || '').toLowerCase().includes(q);
    }
    const other = c.other_user;
    const name = other?.profile?.full_name || other?.username || '';
    return name.toLowerCase().includes(q) || (other?.username || '').toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">Share Post</h3>
              <p className="text-xs text-muted-foreground">Send to friends in EduNexus or share externally</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Post Preview Snippet */}
        <div className="p-4 bg-secondary/30 border-b border-border/60 mx-4 mt-4 rounded-2xl flex items-center gap-3">
          <UserAvatar
            src={post.author_avatar}
            username={post.author_username}
            alt={post.author_name}
            size={40}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground truncate">{post.author_name}</span>
              <span className="text-[11px] text-muted-foreground truncate">@{post.author_username}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {post.title ? `${post.title} — ` : ''}{post.content}
            </p>
          </div>
          {post.images && post.images.length > 0 && (
            <img
              src={post.images[0]}
              alt="Post preview"
              className="w-12 h-12 rounded-xl object-cover border border-border shrink-0"
            />
          )}
        </div>

        {/* Modal Body: Two Sections */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* 1. Share Outside App */}
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2.5">
              Share Outside EduNexus
            </span>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 bg-secondary/60 border border-border px-3.5 py-2 rounded-xl text-xs text-muted-foreground truncate select-all font-mono">
                {shareUrl}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLink}
                  className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shrink-0 ${
                    copied
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>

                {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                  <button
                    onClick={handleNativeShare}
                    className="p-2 rounded-xl bg-secondary border border-border text-foreground hover:bg-secondary/80 transition-colors"
                    title="Share via other apps"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Social Buttons */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareTitle}\n\n${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-bold text-[11px] border border-emerald-500/20 transition-all"
              >
                WhatsApp
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 font-bold text-[11px] border border-sky-500/20 transition-all"
              >
                Twitter / X
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold text-[11px] border border-blue-500/20 transition-all"
              >
                Telegram
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold text-[11px] border border-indigo-500/20 transition-all"
              >
                LinkedIn
              </a>
            </div>
          </div>

          {/* 2. Send in EduNexus Chats */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Send in Direct Message or Group
              </span>
              <span className="text-[11px] text-muted-foreground">
                {filteredConversations.length} {filteredConversations.length === 1 ? 'chat' : 'chats'}
              </span>
            </div>

            {/* Search chats */}
            {conversations.length > 3 && (
              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-secondary/50 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
            )}

            {loadingChats ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Loading your chats...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground bg-secondary/20 rounded-2xl border border-border/50">
                <MessageSquare className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-50" />
                {searchQuery ? 'No chats match your search.' : 'You have no open conversations yet.'}
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {filteredConversations.map((conv) => {
                  const isGroup = conv.is_group;
                  const otherUser = !isGroup ? conv.other_user : null;
                  const title = isGroup
                    ? conv.name || 'Group Chat'
                    : otherUser?.profile?.full_name || otherUser?.username || 'Student';
                  const subtitle = isGroup ? 'Group' : `@${otherUser?.username || ''}`;
                  const isSent = sentConvIds.has(conv.id);
                  const isSending = sendingConvId === conv.id;

                  return (
                    <div
                      key={conv.id}
                      className="p-2.5 rounded-2xl hover:bg-secondary/40 border border-border/50 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isGroup ? (
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                            <Users className="w-5 h-5" />
                          </div>
                        ) : (
                          <UserAvatar
                            src={otherUser?.profile?.avatar_url}
                            username={otherUser?.username || ''}
                            alt={title}
                            size={40}
                          />
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-foreground truncate">{title}</h4>
                          <span className="text-[10px] text-muted-foreground truncate block">{subtitle}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSendToChat(conv.id)}
                        disabled={isSent || isSending}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                          isSent
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : isSending
                            ? 'bg-secondary text-muted-foreground opacity-70 cursor-wait'
                            : 'bg-primary text-primary-foreground hover:brightness-110 shadow-sm'
                        }`}
                      >
                        {isSent ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Sent
                          </>
                        ) : isSending ? (
                          <span>Sending...</span>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" /> Send
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-secondary/20 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-secondary border border-border text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
