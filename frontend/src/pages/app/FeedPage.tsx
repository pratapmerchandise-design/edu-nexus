import React, { useState, useEffect } from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { AppLayout } from '../../components/AppLayout';
import { api, uploadFile } from '../../services/api';
import { MembershipBadge } from '../../components/MembershipBadge';
import { UserAvatar } from '../../components/UserAvatar';
import { SpotlightCard } from '../../components/reactbits/SpotlightCard';
import { AuroraGlow } from '../../components/reactbits/AuroraGlow';
import type { Post, Comment } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { renderContentWithHighlights, timeAgo, isVideoUrl } from '../../utils/textUtils';
import { Heart, MessageSquare, Bookmark, Plus, Flag, Sparkles, Image as ImageIcon, BarChart2, X, Globe, Users, AtSign, Smile, MapPin, Lightbulb, Handshake, Trophy, Info, ChevronDown, Send, FileText, GraduationCap, Check } from 'lucide-react';
import { GifPicker } from '../../components/GifPicker';
import { StickerPicker } from '../../components/StickerPicker';
import { InlineComments } from '../../components/InlineComments';

export const FeedPage: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [feedMode, setFeedMode] = useState<'for-you' | 'following' | 'trending' | 'school'>('for-you');
  
  // Post Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newPostType, setNewPostType] = useState<'HELP' | 'WIN' | 'IDEA' | 'COLLAB' | 'POLL' | 'CASUAL'>('CASUAL');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [showPoll, setShowPoll] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [replyPrivacy, setReplyPrivacy] = useState<string[]>(['everyone']);
  const [audience, setAudience] = useState<'public' | 'followers' | 'community'>('public');
  const [communityId, setCommunityId] = useState<number | null>(null);
  const [mySchools, setMySchools] = useState<any[]>([]);
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [newLocation, setNewLocation] = useState('');

  // Inline comments: only one post is expanded at a time, comments live in a
  // per-post cache so the user can flip between posts without re-fetching.
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<number | null>(null);
  const [commentsByPostId, setCommentsByPostId] = useState<Record<number, Comment[]>>({});
  const [loadingCommentsPostId, setLoadingCommentsPostId] = useState<number | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<number, { text: string; parentId: number | null; replyToUser: string | null }>>({});

  // State hooks above


  const fetchPosts = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType !== 'ALL') params.set('post_type', filterType);
      if (feedMode === 'for-you') params.set('feed', 'recommended');
      if (feedMode === 'following') params.set('feed', 'following');
      if (feedMode === 'trending') params.set('feed', 'trending');
      if (feedMode === 'school') params.set('school_only', 'true');
      const qs = params.toString();
      const data = await api.get<Post[]>(`/posts${qs ? `?${qs}` : ''}`);
      setPosts(data);
    } catch (e) {
      console.error('Failed to load posts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [filterType, feedMode]);

  useEffect(() => {
    if (showCreateModal && mySchools.length === 0) {
      api.get<any[]>('/schools').then(setMySchools).catch(() => setMySchools([]));
    }
  }, [showCreateModal, mySchools.length]);

  const isPaidMember = !!(user?.membership?.active && user?.membership?.tier);

  const openCreate = () => {
    setAudience('public');
    setCommunityId(null);
    setReplyPrivacy(['everyone']);
    setShowPrivacyDropdown(false);
    setShowCreateModal(true);
  };
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const data = await uploadFile(file);
      setNewImageUrl(data.url);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Error uploading image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    try {
      const payload: any = {
        title: newTitle.trim() || undefined,
        content: newContent.trim(),
        post_type: newPostType,
        image_url: newImageUrl.trim() || undefined,
        reply_privacy: replyPrivacy.length > 0 ? replyPrivacy.join(',') : 'everyone',
        audience: audience,
        community_id: audience === 'community' ? communityId : undefined,
        location: newLocation.trim() || undefined,
      };

      if (newPostType === 'POLL') {
        payload.poll_options = pollOptions.filter((opt) => opt.trim() !== '');
      }

      await api.post<Post>('/posts', payload);
      setShowCreateModal(false);
      setNewTitle('');
      setNewContent('');
      setNewImageUrl('');
      setPollOptions(['', '']);
      setReplyPrivacy(['everyone']);
      setShowPrivacyDropdown(false);
      setAudience('public');
      setCommunityId(null);
      setShowEmojiPicker(false);
      setShowLocationInput(false);
      setNewLocation('');
      fetchPosts();
    } catch (err: any) {
      alert(err.message || 'Failed to create post');
    }
  };

  const handleLikeToggle = async (postId: number) => {
    try {
      const res = await api.post<{ liked: boolean; likes_count: number }>(`/posts/${postId}/like`);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, user_liked: res.liked, likes_count: res.likes_count }
            : p
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveToggle = async (postId: number) => {
    try {
      const res = await api.post<{ saved: boolean }>(`/posts/${postId}/save`);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, user_saved: res.saved } : p))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleVotePoll = async (postId: number, optionId: number) => {
    try {
      await api.post(`/posts/${postId}/poll/vote/${optionId}`);
      fetchPosts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleCommentLike = async (commentId: number, postId: number) => {
    try {
      const res = await api.post<{ liked: boolean; likes_count: number }>(`/posts/comments/${commentId}/like`);
      // Update both top-level comments and nested replies for this post only.
      const apply = (list: Comment[]): Comment[] =>
        list.map((c) => {
          if (c.id === commentId) return { ...c, user_liked: res.liked, likes_count: res.likes_count };
          if (c.replies?.length) return { ...c, replies: apply(c.replies) };
          return c;
        });
      setCommentsByPostId((prev) => {
        const list = prev[postId];
        if (!list) return prev;
        return { ...prev, [postId]: apply(list) };
      });
    } catch (e) {
      console.error(e);
    }
  };

  const canReplyForPost = React.useCallback(
    (post: Post) => {
      if (!user) return { allowed: true };
      if (post.author_id === user.id) return { allowed: true };

      const raw = (post.reply_privacy || 'everyone').toLowerCase();
      const parts = new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
      if (parts.has('everyone') || parts.size === 0) return { allowed: true };

      if (parts.has('school') || parts.has('my_school')) {
        const curSchool = (user.profile?.school || '').trim().toLowerCase();
        const authorSchool = (post.author_school || '').trim().toLowerCase();
        if (curSchool && authorSchool && curSchool === authorSchool) return { allowed: true };
      }

      if (parts.has('mentioned')) {
        const tag = `@${user.username.toLowerCase()}`;
        if (
          (post.content || '').toLowerCase().includes(tag) ||
          (post.title || '').toLowerCase().includes(tag)
        ) {
          return { allowed: true };
        }
      }

      const labels: string[] = [];
      if (parts.has('school') || parts.has('my_school')) labels.push(`members from ${post.author_school || 'their school'}`);
      if (parts.has('followers')) labels.push('followers');
      if (parts.has('mentioned')) labels.push('mentioned accounts');
      return { allowed: false, reason: `Only ${labels.join(' or ')} can reply to this post.` };
    },
    [user]
  );

  const toggleComments = async (post: Post) => {
    if (expandedCommentsPostId === post.id) {
      setExpandedCommentsPostId(null);
      return;
    }
    setExpandedCommentsPostId(post.id);
    if (!commentsByPostId[post.id]) {
      setLoadingCommentsPostId(post.id);
      try {
        const comms = await api.get<Comment[]>(`/posts/${post.id}/comments`);
        setCommentsByPostId((prev) => ({ ...prev, [post.id]: comms || [] }));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingCommentsPostId(null);
      }
    }
  };

  const setCommentInputFor = (postId: number, patch: Partial<{ text: string; parentId: number | null; replyToUser: string | null }>) => {
    setCommentInputs((prev) => {
      const current = prev[postId] || { text: '', parentId: null, replyToUser: null };
      return { ...prev, [postId]: { ...current, ...patch } };
    });
  };

  const handleAddComment = async (postId: number) => {
    const state = commentInputs[postId] || { text: '', parentId: null, replyToUser: null };
    if (!state.text.trim()) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const gate = canReplyForPost(post);
    if (!gate.allowed) {
      alert(gate.reason || 'You do not have permission to reply to this post.');
      return;
    }
    try {
      await api.post(`/posts/${postId}/comments`, {
        content: state.text.trim(),
        parent_id: state.parentId,
      });
      setCommentInputFor(postId, { text: '', parentId: null, replyToUser: null });
      const comms = await api.get<Comment[]>(`/posts/${postId}/comments`);
      setCommentsByPostId((prev) => ({ ...prev, [postId]: comms || [] }));
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to add comment');
    }
  };

  const postCategories = [
    { type: 'ALL', label: 'All Posts', icon: Globe },
    { type: 'CASUAL', label: 'Casual', icon: Sparkles },
    { type: 'COLLAB', label: 'Collaborations', icon: Handshake },
    { type: 'IDEA', label: 'Project Ideas', icon: Lightbulb },
    { type: 'HELP', label: 'Questions & Help', icon: Info },
    { type: 'WIN', label: 'Wins & Milestones', icon: Trophy },
    { type: 'POLL', label: 'Polls & Surveys', icon: BarChart2 },
  ];

  const getPostTypeBadge = (type: string) => {
    switch (type) {
      case 'CASUAL':
        return { label: 'Casual', icon: Sparkles, className: 'bg-teal-500/10 text-teal-500 border-teal-500/20' };
      case 'COLLAB':
        return { label: 'Collaboration', icon: Handshake, className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
      case 'IDEA':
        return { label: 'Project Idea', icon: Lightbulb, className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
      case 'HELP':
        return { label: 'Asking for Help', icon: Info, className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
      case 'WIN':
        return { label: 'Win & Milestone', icon: Trophy, className: 'bg-purple-500/10 text-purple-500 border-purple-500/20' };
      case 'POLL':
        return { label: 'Poll', icon: BarChart2, className: 'bg-pink-500/10 text-pink-500 border-pink-500/20' };
      default:
        return { label: type, icon: Sparkles, className: 'bg-secondary text-muted-foreground border-border' };
    }
  };

  // Build a human label like "Ramesh and Suresh liked this" or
  // "Ramesh and 3 others liked this". Capped at 2 names by the backend.
  const buildSocialLabel = (people: { username: string; full_name?: string | null }[] | undefined, verb: string) => {
    if (!people || people.length === 0) return null;
    const display = (p: { username: string; full_name?: string | null }) => p.full_name || p.username;
    if (people.length === 1) return `${display(people[0])} ${verb}`;
    if (people.length === 2) return `${display(people[0])} and ${display(people[1])} ${verb}`;
    return `${display(people[0])} and ${people.length - 1} others ${verb}`;
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Feed Header / Create Bar with subtle ambient glow */}
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm relative overflow-hidden">
          <AuroraGlow size="sm" opacity={0.3} />
          <div className="flex items-center gap-3 flex-1 cursor-pointer relative z-10" onClick={() => setShowCreateModal(true)}>
            <UserAvatar
              src={user?.profile?.avatar_url}
              username={user?.username}
              size={40}
            />
            <div className="bg-secondary/70 backdrop-blur-sm border border-border rounded-xl px-4 py-2.5 text-xs text-muted-foreground flex-1 hover:border-primary/40 transition-colors">
              What's on your mind? Share something with the Nexus...
            </div>
          </div>

          <button
            onClick={openCreate}
            className="button button-small button-solid relative z-10 glow-on-hover"
          >
            <Plus className="w-4 h-4 mr-1" /> New Post
          </button>
        </div>

        {/* Feed Mode Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-secondary border border-border rounded-full p-1">
            <button
              onClick={() => setFeedMode('for-you')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                feedMode === 'for-you' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              For You
            </button>
            <button
              onClick={() => setFeedMode('following')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                feedMode === 'following' ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Following
            </button>
            {(['trending', 'school'] as const).map((mode) => (
              <button key={mode} onClick={() => setFeedMode(mode)} className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${feedMode === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {mode === 'school' ? '🏫 In My School' : 'Trending'}
              </button>
            ))}
          </div>
          {feedMode === 'for-you' && (
            <span className="text-[10px] text-muted-foreground hidden sm:block">Ranked by your interests, skills &amp; people you follow</span>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {postCategories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = filterType === cat.type;
            return (
              <button
                key={cat.type}
                onClick={() => setFilterType(cat.type)}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'bg-card text-muted-foreground border border-border hover:text-foreground hover:bg-secondary'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Posts Feed */}
        {loading ? (
          <div className="py-20 text-center text-xs text-muted-foreground animate-pulse">Loading student feed...</div>
        ) : posts.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-sm">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="text-base font-bold text-foreground">No posts found</h3>
            <p className="text-xs text-muted-foreground mt-1">Be the first student to create a post in this category!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const badge = getPostTypeBadge(post.post_type);
              const BadgeIcon = badge.icon;
              return (
                <SpotlightCard key={post.id} className="p-6 space-y-5 glow-on-hover shadow-sm">
                  {/* Author row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        src={post.author_avatar}
                        username={post.author_username}
                        membership={post.author_membership}
                        size={42}
                      />
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          {post.author_name}
                          <MembershipBadge membership={post.author_membership} size={14} />
                          <span className="text-xs text-primary font-medium">@{post.author_username}</span>
                        </h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                          <span>
                            {post.author_school ? `${post.author_school} ` : ''}
                            <span className="mx-1">•</span>
                            {new Date(post.created_at).toLocaleDateString()}
                            <span className="mx-1">•</span>
                            <span className="hover:underline">{timeAgo(post.created_at)}</span>
                          </span>
                          {post.location && (
                            <span className="flex items-center gap-0.5 text-primary">
                              • <MapPin className="w-3 h-3 ml-1" /> {post.location}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.className}`}>
                        <BadgeIcon className="w-3 h-3" />
                        <span>{badge.label}</span>
                      </span>
                      {post.audience && post.audience !== 'public' && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-dashed border-muted-foreground/40 text-muted-foreground">
                          {post.audience === 'followers' ? 'Followers only' : 'Community'}
                        </span>
                      )}
                      <button
                        onClick={async () => {
                          if (!confirm('Report this post to moderators?')) return;
                          try {
                            await api.post('/reports', { target_type: 'post', target_id: post.id, reason: 'Spam', details: '' });
                            alert('Report submitted to moderators. Thank you.');
                          } catch (e: any) {
                            alert(e.message || 'Failed to submit report');
                          }
                        }}
                        className="text-muted-foreground hover:text-red-400 p-1"
                        title="Report post"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Content */}
                  <div className="space-y-2">
                    {post.title && <h3 className="text-base font-bold text-foreground leading-snug">{post.title}</h3>}
                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{renderContentWithHighlights(post.content)}</p>
                  </div>

                  {/* Media (Image, Video, or Document) if present */}
                  {post.images && post.images.length > 0 && (
                    isVideoUrl(post.images[0]) ? (
                      <div className="rounded-2xl overflow-hidden border border-border/80 bg-black/60 flex items-center justify-center shadow-sm">
                        <video 
                          src={post.images[0]} 
                          controls 
                          playsInline 
                          preload="metadata"
                          className="w-full max-h-[600px] object-contain rounded-2xl bg-black"
                        />
                      </div>
                    ) : post.images[0].toLowerCase().match(/\.(pdf|doc|docx|txt|csv)$/) ? (
                      <div className="mt-2 border border-border bg-secondary/50 rounded-xl overflow-hidden shadow-sm">
                        {post.images[0].toLowerCase().endsWith('.pdf') ? (
                          <iframe src={post.images[0]} className="w-full h-[400px] border-none bg-white" title="PDF Document" />
                        ) : (
                          <div className="p-8 flex flex-col items-center justify-center bg-secondary/30 text-muted-foreground gap-3">
                            <FileText className="w-12 h-12 opacity-50" />
                            <span className="text-sm font-medium">Document attached</span>
                          </div>
                        )}
                        <div className="p-3 border-t border-border flex items-center justify-between gap-3 text-xs bg-card">
                          <div className="flex flex-col min-w-0">
                            <span className="truncate font-bold text-[11px] uppercase tracking-wider">
                              {post.images[0].split('/').pop() || 'Document'}
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-0.5">Click Open to view</span>
                          </div>
                          <a href={post.images[0]} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg font-bold shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                            Open
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => window.open(post.images[0], '_blank')}
                        className="rounded-2xl overflow-hidden border border-border/80 bg-secondary/30 flex items-center justify-center cursor-pointer group hover:border-primary/50 transition-all shadow-sm"
                        title="Click to view full image"
                      >
                        <img 
                          src={post.images[0]} 
                          alt="Post visual" 
                          className="w-full max-h-[600px] object-contain rounded-2xl transition-transform duration-200 group-hover:scale-[1.005]" 
                          loading="lazy"
                        />
                      </div>
                    )
                  )}

                  {/* Poll Options if present */}
                  {post.post_type === 'POLL' && post.poll_options.length > 0 && (
                    <div className="space-y-2.5 bg-secondary/50 p-4 rounded-2xl border border-border">
                      {post.poll_options.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => handleVotePoll(post.id, opt.id)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                            opt.user_voted
                              ? 'bg-primary/20 border border-primary text-primary'
                              : 'bg-card border border-border text-muted-foreground hover:border-primary/40'
                          }`}
                        >
                          <span>{opt.option_text}</span>
                          <span className="text-xs font-bold text-muted-foreground">
                            {opt.votes_count} vote{opt.votes_count !== 1 ? 's' : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Interaction Footer */}
                  <div className="pt-4 mt-1 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
                    <button
                      onClick={() => handleLikeToggle(post.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                        post.user_liked ? 'text-primary font-bold bg-primary/10' : 'hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${post.user_liked ? 'fill-primary' : ''}`} />
                      <span>{post.likes_count}</span>
                    </button>

                    <button
                      onClick={() => toggleComments(post)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                        expandedCommentsPostId === post.id
                          ? 'text-primary font-bold bg-primary/10'
                          : 'hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{post.comments_count} Comments</span>
                    </button>

                    <button
                      onClick={() => handleSaveToggle(post.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                        post.user_saved ? 'text-primary font-bold bg-primary/10' : 'hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${post.user_saved ? 'fill-primary' : ''}`} />
                      <span>{post.user_saved ? 'Saved' : 'Save'}</span>
                    </button>
                    <button
                      onClick={async () => {
                        const url = `${window.location.origin}/p/${post.id}`;
                        try {
                          if (navigator.share) await navigator.share({ title: post.title || 'EduNexus post', text: post.content.slice(0, 120), url });
                          else { await navigator.clipboard.writeText(url); alert('Post link copied!'); }
                        } catch { /* cancelled */ }
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:text-primary hover:bg-secondary transition-colors"
                      title="Share post"
                    >
                      <Send className="w-4 h-4" />
                      <span>Share</span>
                    </button>
                  </div>

                  {/* Follow-context line: who you follow liked or commented on this */}
                  {((post.liked_by_following && post.liked_by_following.length > 0) ||
                    (post.commented_by_following && post.commented_by_following.length > 0)) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-[11px] text-muted-foreground">
                      {(() => {
                        const likers = post.liked_by_following || [];
                        const commenters = post.commented_by_following || [];
                        const likeLabel = buildSocialLabel(likers, 'liked this');
                        const commentLabel = buildSocialLabel(commenters, 'commented on this');
                        return (
                          <>
                            {likeLabel && (
                              <div className="flex items-center gap-1.5">
                                <div className="flex -space-x-1.5">
                                  {likers.slice(0, 2).map((u) => (
                                    <UserAvatar key={`lk-${u.id}`} src={u.avatar_url} username={u.username} size={18} className="ring-2 ring-card" />
                                  ))}
                                </div>
                                <Heart className="w-3 h-3 fill-primary text-primary" />
                                <span className="font-medium">{likeLabel}</span>
                              </div>
                            )}
                            {commentLabel && (
                              <div className="flex items-center gap-1.5">
                                <div className="flex -space-x-1.5">
                                  {commenters.slice(0, 2).map((u) => (
                                    <UserAvatar key={`cm-${u.id}`} src={u.avatar_url} username={u.username} size={18} className="ring-2 ring-card" />
                                  ))}
                                </div>
                                <MessageSquare className="w-3 h-3 text-primary" />
                                <span className="font-medium">{commentLabel}</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Inline comments panel (only rendered for the expanded post) */}
                  {expandedCommentsPostId === post.id && (
                    <InlineComments
                      post={post}
                      user={user}
                      comments={commentsByPostId[post.id] || []}
                      loading={loadingCommentsPostId === post.id}
                      commentState={commentInputs[post.id] || { text: '', parentId: null, replyToUser: null }}
                      onChangeInput={(patch) => setCommentInputFor(post.id, patch)}
                      onSubmit={() => handleAddComment(post.id)}
                      onLikeComment={(cid) => handleToggleCommentLike(cid, post.id)}
                      canReply={canReplyForPost(post)}
                    />
                  )}
                </SpotlightCard>
              );
            })}
          </div>
        )}

        {/* Create Post Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground">Create a Post</h3>
                  <p className="text-xs text-muted-foreground">Share an update, find collaborators, or ask questions</p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
              </div>
              <form onSubmit={handleCreatePost} className="space-y-4">
                {/* Category Selection */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-foreground">Choose Category</label>
                    <span className="text-[10px] font-semibold text-primary">Required</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {[
                      { type: 'CASUAL', label: 'Casual', desc: 'General thoughts', icon: Sparkles },
                      { type: 'COLLAB', label: 'Collaboration', desc: 'Find teammates', icon: Handshake },
                      { type: 'IDEA', label: 'Project Idea', desc: 'Share a concept', icon: Lightbulb },
                      { type: 'HELP', label: 'Ask for Help', desc: 'Get assistance', icon: Info },
                      { type: 'WIN', label: 'Win / Milestone', desc: 'Celebrate wins', icon: Trophy }
                    ].map(({ type, label, desc, icon: Icon }) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setNewPostType(type as any);
                          setShowPoll(false);
                        }}
                        className={`p-2.5 rounded-xl text-left transition-all border flex flex-col justify-between ${
                          newPostType === type && !showPoll
                            ? 'bg-primary/10 text-primary border-primary ring-1 ring-primary/40'
                            : 'bg-secondary text-muted-foreground border-border hover:text-foreground hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <Icon className="w-3.5 h-3.5" />
                          <span>{label}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-0.5">{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Title (Optional) */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-semibold text-foreground">Headline or Title</span>
                      <span className="text-[10px] text-muted-foreground font-medium">Optional</span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Looking for React developer for autonomous robotics project"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Content (Required) */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-semibold text-foreground">Post Content</span>
                      <span className="text-[10px] text-primary font-semibold">Required</span>
                    </div>
                    <textarea
                      rows={4}
                      required
                      placeholder="Describe what you are working on, what help you need, or what you want to share with fellow students..."
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-xl p-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary resize-none leading-relaxed"
                    />
                  </div>
                  
                  {showLocationInput && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-semibold text-foreground">Location</span>
                        <span className="text-[10px] text-muted-foreground font-medium">Optional</span>
                      </div>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="e.g. Delhi, Campus, Online"
                          value={newLocation}
                          onChange={(e) => setNewLocation(e.target.value)}
                          className="w-full bg-secondary text-xs text-foreground placeholder-muted-foreground pl-9 pr-3 py-2 rounded-xl border border-border focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  )}

                  {newImageUrl && (
                    <div className="relative inline-block mt-2 max-w-full">
                      <div className="rounded-xl overflow-hidden border border-border bg-secondary/40 flex items-center justify-center p-1">
                        {isVideoUrl(newImageUrl) ? (
                          <video src={newImageUrl} controls className="max-h-56 max-w-full rounded-lg bg-black" />
                        ) : (
                          <img src={newImageUrl} alt="Attachment" className="max-h-56 max-w-full object-contain rounded-lg" />
                        )}
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setNewImageUrl('')} 
                        className="absolute top-3 right-3 bg-black/70 hover:bg-black text-white rounded-full p-1.5 shadow-md transition-colors"
                        title="Remove media"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {showPoll && (
                    <div className="space-y-3 p-4 bg-secondary/50 rounded-2xl border border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-primary font-bold text-xs">
                          <BarChart2 className="w-4 h-4" />
                          <span>Create a Community Poll</span>
                        </div>
                        <span className="text-[10px] text-primary font-semibold">Min 2 choices required</span>
                      </div>
                      {pollOptions.map((opt, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <input
                            type="text"
                            placeholder={`Choice ${i + 1} ${i < 2 ? '(Required)' : '(Optional)'}`}
                            value={opt}
                            onChange={(e) => {
                              const copy = [...pollOptions];
                              copy[i] = e.target.value;
                              setPollOptions(copy);
                            }}
                            className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                          />
                          {pollOptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))}
                              className="p-2 text-muted-foreground hover:text-red-400 bg-card border border-border rounded-xl transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      {pollOptions.length < 5 && (
                        <button type="button" onClick={() => setPollOptions([...pollOptions, ''])} className="button button-ghost button-small w-full justify-center">
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add Choice
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 pt-2 border-t border-border">
                  {/* Privacy Selector (Multi-Select) */}
                  <div className="relative">
                    {(() => {
                      const getSummary = () => {
                        if (replyPrivacy.includes('everyone') || replyPrivacy.length === 0) {
                          return { icon: Globe, text: 'Everyone can reply' };
                        }
                        const hasSchool = replyPrivacy.includes('school');
                        const hasFollowers = replyPrivacy.includes('followers');
                        const hasMentioned = replyPrivacy.includes('mentioned');
                        const count = [hasSchool, hasFollowers, hasMentioned].filter(Boolean).length;

                        if (count === 3) return { icon: GraduationCap, text: 'School, Followers & Mentioned can reply' };
                        if (hasSchool && hasFollowers) return { icon: GraduationCap, text: 'School & Followers can reply' };
                        if (hasSchool && hasMentioned) return { icon: GraduationCap, text: 'School & Mentioned can reply' };
                        if (hasFollowers && hasMentioned) return { icon: Users, text: 'Followers & Mentioned can reply' };
                        if (hasSchool) return { icon: GraduationCap, text: 'My school only can reply' };
                        if (hasFollowers) return { icon: Users, text: 'Followers only can reply' };
                        if (hasMentioned) return { icon: AtSign, text: 'Mentioned only can reply' };
                        return { icon: Globe, text: 'Everyone can reply' };
                      };

                      const summary = getSummary();
                      const SummaryIcon = summary.icon;
                      return (
                        <button
                          type="button"
                          onClick={() => setShowPrivacyDropdown(!showPrivacyDropdown)}
                          className="flex items-center gap-1.5 text-xs text-primary font-bold hover:bg-primary/10 px-3 py-1.5 rounded-full transition-colors w-fit border border-primary/20"
                        >
                          <SummaryIcon className="w-3.5 h-3.5" />
                          <span>{summary.text}</span>
                          <ChevronDown className={`w-3 h-3 transition-transform ${showPrivacyDropdown ? 'rotate-180' : ''}`} />
                        </button>
                      );
                    })()}

                    {showPrivacyDropdown && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-2xl shadow-2xl z-30 p-2 flex flex-col space-y-1 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="text-[10px] font-extrabold text-muted-foreground px-2 py-1 uppercase tracking-wider">
                          Who can reply? (Select multiple)
                        </div>
                        {[
                          { val: 'everyone', label: 'Everyone', icon: Globe, description: 'Anyone on EduNexus can reply' },
                          { val: 'school', label: 'My school only', icon: GraduationCap, description: 'Students & staff from your school' },
                          { val: 'followers', label: 'Followers', icon: Users, description: 'People who follow your profile' },
                          { val: 'mentioned', label: 'Mentioned', icon: AtSign, description: 'Only accounts tagged with @' },
                        ].map((opt) => {
                          const isSelected = replyPrivacy.includes(opt.val);
                          const Icon = opt.icon;

                          const handleToggle = () => {
                            if (opt.val === 'everyone') {
                              setReplyPrivacy(['everyone']);
                              return;
                            }
                            if (replyPrivacy.includes('everyone')) {
                              setReplyPrivacy([opt.val]);
                              return;
                            }
                            if (replyPrivacy.includes(opt.val)) {
                              const remaining = replyPrivacy.filter((item) => item !== opt.val);
                              setReplyPrivacy(remaining.length > 0 ? remaining : ['everyone']);
                            } else {
                              setReplyPrivacy([...replyPrivacy, opt.val]);
                            }
                          };

                          return (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={handleToggle}
                              className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                                isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-secondary text-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                                  }`}
                                >
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold leading-tight truncate">{opt.label}</div>
                                  <div className="text-[10px] text-muted-foreground leading-tight truncate">{opt.description}</div>
                                </div>
                              </div>

                              {/* Multi-select checkmark indicator */}
                              <div
                                className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ml-2 transition-colors ${
                                  isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 bg-card'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </button>
                          );
                        })}

                        <div className="pt-1.5 mt-1 border-t border-border flex items-center justify-between px-1">
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            {replyPrivacy.includes('everyone') ? 'Open to everyone' : `${replyPrivacy.length} option${replyPrivacy.length > 1 ? 's' : ''} active`}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowPrivacyDropdown(false)}
                            className="text-[11px] font-bold text-primary hover:underline px-2 py-0.5"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Audience Selector (non-public options are members-only) */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-muted-foreground">Audience:</span>
                    {(['public', 'followers', 'community'] as const).map((a) => {
                      const disabled = a !== 'public' && !isPaidMember;
                      const active = audience === a;
                      return (
                        <button
                          key={a}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            setAudience(a);
                            if (a === 'community' && !communityId && mySchools.length > 0) {
                              setCommunityId(mySchools[0].id);
                            }
                          }}
                          title={disabled ? 'Members only' : ''}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                            active ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
                          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {a === 'public' ? 'Public' : a === 'followers' ? 'Followers' : 'Community'}
                        </button>
                      );
                    })}
                    {audience === 'community' && (
                      <select
                        value={communityId ?? ''}
                        onChange={(e) => setCommunityId(Number(e.target.value))}
                        className="bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                      >
                        <option value="" disabled>Select community</option>
                        {mySchools.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    )}
                    {!isPaidMember && (
                      <span className="text-[10px] text-muted-foreground">Upgrade to post to followers / community</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <label className="text-primary hover:text-primary/80 cursor-pointer p-2 rounded-full hover:bg-primary/10 transition-colors relative" title="Upload Photo or Video">
                        <ImageIcon className="w-5 h-5" />
                        <input type="file" accept="image/*,video/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} disabled={isUploadingImage} />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPoll(!showPoll);
                          if (!showPoll) setNewPostType('POLL');
                          else setNewPostType('COLLAB');
                        }}
                        title="Create Poll"
                        className={`p-2 rounded-full transition-colors ${showPoll ? 'text-primary bg-primary/10' : 'text-primary hover:text-primary/80 hover:bg-primary/10'}`}
                      >
                        <BarChart2 className="w-5 h-5" />
                      </button>
                      <div className="relative">
                        <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Add Emoji" className={`p-2 rounded-full transition-colors ${showEmojiPicker ? 'text-primary bg-primary/10' : 'text-primary hover:text-primary/80 hover:bg-primary/10'}`}>
                          <Smile className="w-5 h-5" />
                        </button>
                        {showEmojiPicker && (
                          <div className="absolute bottom-full left-0 mb-2 z-50">
                            <EmojiPicker onEmojiClick={(e) => setNewContent(prev => prev + e.emoji)} theme={Theme.AUTO} />
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowGifPicker(true)}
                        title="Add Animated GIF"
                        className={`p-2 rounded-full transition-colors flex items-center justify-center font-black text-[11px] leading-none ${showGifPicker ? 'text-primary bg-primary/10' : 'text-primary hover:text-primary/80 hover:bg-primary/10'}`}
                      >
                        <span className="border border-current px-1 py-0.5 rounded text-[10px] tracking-tight">GIF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowStickerPicker(true)}
                        title="Add a Sticker (Members)"
                        className={`relative p-2 rounded-full transition-all flex items-center justify-center ${showStickerPicker ? 'text-primary bg-primary/10 ring-1 ring-primary/40' : 'text-primary hover:text-primary/80 hover:bg-primary/10'}`}
                      >
                        <Sparkles className="w-5 h-5" />
                      </button>
                      <button type="button" onClick={() => setShowLocationInput(!showLocationInput)} title="Add Location" className={`p-2 rounded-full transition-colors hidden sm:block ${showLocationInput ? 'text-primary bg-primary/10' : 'text-primary hover:text-primary/80 hover:bg-primary/10'}`}>
                        <MapPin className="w-5 h-5" />
                      </button>
                    </div>

                    {showGifPicker && (
                      <GifPicker
                        onSelect={(gifUrl) => {
                          setNewImageUrl(gifUrl);
                          setShowGifPicker(false);
                        }}
                        onClose={() => setShowGifPicker(false)}
                        title="Attach GIF to Post"
                      />
                    )}
                    {showStickerPicker && (
                      <StickerPicker
                        onSelect={(sticker) => {
                          setNewImageUrl(sticker.url);
                          setShowStickerPicker(false);
                        }}
                        onClose={() => setShowStickerPicker(false)}
                        title="Attach a Sticker"
                      />
                    )}
                  
                  <div className="flex items-center gap-3">
                    {isUploadingImage && <span className="text-[10px] text-muted-foreground font-bold animate-pulse">UPLOADING...</span>}
                    <button type="submit" disabled={isUploadingImage} className="button button-primary button-small px-6 rounded-full disabled:opacity-50">
                      Publish
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
    </AppLayout>
  );
};
