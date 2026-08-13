import React, { useState, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { AppLayout } from '../../components/AppLayout';
import { api } from '../../services/api';
import type { Post, Comment } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { renderContentWithHighlights, timeAgo } from '../../utils/textUtils';
import { Heart, MessageSquare, Bookmark, Plus, Flag, Sparkles, Image as ImageIcon, BarChart2, X, Globe, Users, AtSign, Smile, MapPin, Lightbulb, Handshake, Trophy, Info } from 'lucide-react';

export const FeedPage: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  
  // Post Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newPostType, setNewPostType] = useState<'HELP' | 'WIN' | 'IDEA' | 'COLLAB' | 'POLL'>('COLLAB');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [showPoll, setShowPoll] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [replyPrivacy, setReplyPrivacy] = useState<'everyone' | 'followers' | 'mentioned'>('everyone');
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [newLocation, setNewLocation] = useState('');

  // Active Comment Modal State
  const [activeCommentPost, setActiveCommentPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [replyParentId, setReplyParentId] = useState<number | null>(null);

  // Report Modal State
  const [reportingPostId, setReportingPostId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportDetails, setReportDetails] = useState('');

  const fetchPosts = async () => {
    try {
      const typeQuery = filterType !== 'ALL' ? `?post_type=${filterType}` : '';
      const data = await api.get<Post[]>(`/posts${typeQuery}`);
      setPosts(data);
    } catch (e) {
      console.error('Failed to load posts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [filterType]);
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setNewImageUrl(data.url);
      } else {
        alert(data.detail || 'Upload failed');
      }
    } catch (error) {
      console.error(error);
      alert('Error uploading image');
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
        reply_privacy: replyPrivacy,
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
      setReplyPrivacy('everyone');
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

  const openComments = async (post: Post) => {
    setActiveCommentPost(post);
    try {
      const comms = await api.get<Comment[]>(`/posts/${post.id}/comments`);
      setComments(comms);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommentPost || !commentInput.trim()) return;

    try {
      await api.post(`/posts/${activeCommentPost.id}/comments`, {
        content: commentInput.trim(),
        parent_id: replyParentId,
      });
      setCommentInput('');
      setReplyParentId(null);
      const comms = await api.get<Comment[]>(`/posts/${activeCommentPost.id}/comments`);
      setComments(comms);
      // Update comment count locally
      setPosts((prev) =>
        prev.map((p) =>
          p.id === activeCommentPost.id
            ? { ...p, comments_count: p.comments_count + 1 }
            : p
        )
      );
    } catch (err: any) {
      alert(err.message || 'Failed to add comment');
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingPostId) return;

    try {
      await api.post('/reports', {
        target_type: 'post',
        target_id: reportingPostId,
        reason: reportReason,
        details: reportDetails,
      });
      alert('Report submitted to moderators. Thank you.');
      setReportingPostId(null);
      setReportDetails('');
    } catch (err: any) {
      alert(err.message || 'Failed to submit report');
    }
  };

  const postTypes = ['ALL', 'HELP', 'WIN', 'IDEA', 'COLLAB', 'POLL'];

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Feed Header / Create Bar */}
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => setShowCreateModal(true)}>
            <img
              src={user?.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
              alt={user?.username}
              className="w-10 h-10 rounded-full border border-border object-cover"
            />
            <div className="bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-muted-foreground flex-1">
              Share what you're building, ask for help, or create a poll...
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="button button-small button-solid"
          >
            <Plus className="w-4 h-4 mr-1" /> Post
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {postTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filterType === type
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'bg-card text-muted-foreground border border-border hover:text-foreground'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Posts Feed */}
        {loading ? (
          <div className="py-20 text-center text-xs text-muted-foreground">Loading student feed...</div>
        ) : posts.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="text-lg font-bold text-foreground uppercase">No posts found</h3>
            <p className="text-xs text-muted-foreground mt-1">Be the first student to create a post in this section!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <article key={post.id} className="ui-card p-5 space-y-4">
                {/* Author row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={post.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author_username}`}
                      alt={post.author_username}
                      className="w-10 h-10 rounded-full border border-border object-cover"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        {post.author_name}
                        <span className="text-[10px] text-primary font-medium">@{post.author_username}</span>
                      </h4>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
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
                    <span className="post-badge">{post.post_type}</span>
                    <button
                      onClick={() => setReportingPostId(post.id)}
                      className="text-muted-foreground hover:text-red-400 p-1"
                      title="Report post"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title & Content */}
                {post.title && <h3 className="text-base font-bold text-foreground uppercase">{post.title}</h3>}
                <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">{renderContentWithHighlights(post.content)}</p>

                {/* Image if present */}
                {post.images && post.images.length > 0 && (
                  <div className="rounded-xl overflow-hidden border border-border max-h-80 bg-black/20 dark:bg-black/40">
                    <img src={post.images[0]} alt="Post visual" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Poll Options if present */}
                {post.post_type === 'POLL' && post.poll_options.length > 0 && (
                  <div className="space-y-2 bg-card p-3 rounded-xl border border-border">
                    {post.poll_options.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleVotePoll(post.id, opt.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          opt.user_voted
                            ? 'bg-primary/20 border border-primary text-primary'
                            : 'bg-secondary border border-border text-muted-foreground hover:border-primary/40'
                        }`}
                      >
                        <span>{opt.option_text}</span>
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {opt.votes_count} vote{opt.votes_count !== 1 ? 's' : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Interaction Footer */}
                <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <button
                    onClick={() => handleLikeToggle(post.id)}
                    className={`flex items-center gap-1.5 transition-colors ${
                      post.user_liked ? 'text-primary font-bold' : 'hover:text-foreground'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${post.user_liked ? 'fill-primary' : ''}`} />
                    <span>{post.likes_count}</span>
                  </button>

                  <button
                    onClick={() => openComments(post)}
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{post.comments_count} Comments</span>
                  </button>

                  <button
                    onClick={() => handleSaveToggle(post.id)}
                    className={`flex items-center gap-1.5 transition-colors ${
                      post.user_saved ? 'text-primary font-bold' : 'hover:text-foreground'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${post.user_saved ? 'fill-primary' : ''}`} />
                    <span>{post.user_saved ? 'Saved' : 'Save'}</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Create Post Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground uppercase">Create Post</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
              </div>
              <form onSubmit={handleCreatePost} className="space-y-4">
                <div className="flex gap-2 mb-2 border-b border-border pb-3 overflow-x-auto scrollbar-thin">
                  {[
                    { type: 'COLLAB', icon: Handshake },
                    { type: 'IDEA', icon: Lightbulb },
                    { type: 'HELP', icon: Info },
                    { type: 'WIN', icon: Trophy }
                  ].map(({ type, icon: Icon }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setNewPostType(type as any);
                        setShowPoll(false);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 flex items-center gap-1.5 border ${
                        newPostType === type && !showPoll ? 'bg-primary/10 text-primary border-primary' : 'bg-secondary text-muted-foreground border-transparent hover:border-border hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {type}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Subject or Title (optional)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-transparent text-sm text-foreground placeholder-muted-foreground font-bold focus:outline-none border-b border-border pb-2"
                  />

                  <textarea
                    rows={4}
                    required
                    placeholder="What do you want to share with the nexus?"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full bg-transparent text-xs text-foreground placeholder-muted-foreground focus:outline-none resize-none"
                  />
                  
                  {showLocationInput && (
                    <div className="relative mt-2">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Where are you?"
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        className="w-full bg-secondary text-sm text-foreground placeholder-muted-foreground pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                      />
                    </div>
                  )}

                  {newImageUrl && (
                    <div className="relative inline-block mt-2">
                      <img src={newImageUrl} alt="Attachment" className="max-h-40 rounded-xl border border-border object-cover" />
                      <button type="button" onClick={() => setNewImageUrl('')} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {showPoll && (
                    <div className="space-y-3 mt-4 p-4 bg-secondary/50 rounded-2xl border border-border">
                      <div className="flex items-center gap-2 mb-2 text-primary">
                        <BarChart2 className="w-4 h-4" />
                        <label className="text-xs font-bold uppercase tracking-wider">Create a Poll</label>
                      </div>
                      {pollOptions.map((opt, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <input
                            type="text"
                            placeholder={`Choice ${i + 1}`}
                            value={opt}
                            onChange={(e) => {
                              const copy = [...pollOptions];
                              copy[i] = e.target.value;
                              setPollOptions(copy);
                            }}
                            className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
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
                  {/* Privacy Selector */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowPrivacyDropdown(!showPrivacyDropdown)}
                      className="flex items-center gap-1.5 text-xs text-primary font-bold hover:bg-primary/10 px-3 py-1.5 rounded-full transition-colors w-fit"
                    >
                      {replyPrivacy === 'everyone' && <><Globe className="w-3.5 h-3.5" /> Everyone can reply</>}
                      {replyPrivacy === 'followers' && <><Users className="w-3.5 h-3.5" /> Followers only</>}
                      {replyPrivacy === 'mentioned' && <><AtSign className="w-3.5 h-3.5" /> Mentioned only</>}
                    </button>
                    {showPrivacyDropdown && (
                      <div className="absolute top-full left-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-10 py-1 flex flex-col overflow-hidden">
                        {[
                          { val: 'everyone', label: 'Everyone', icon: Globe },
                          { val: 'followers', label: 'Followers', icon: Users },
                          { val: 'mentioned', label: 'Mentioned', icon: AtSign },
                        ].map(opt => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => { setReplyPrivacy(opt.val as any); setShowPrivacyDropdown(false); }}
                            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold hover:bg-secondary transition-colors ${replyPrivacy === opt.val ? 'text-primary' : 'text-foreground'}`}
                          >
                            <opt.icon className="w-4 h-4" /> {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <label className="text-primary hover:text-primary/80 cursor-pointer p-2 rounded-full hover:bg-primary/10 transition-colors relative" title="Upload Media">
                        <ImageIcon className="w-5 h-5" />
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} disabled={isUploadingImage} />
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
                            <EmojiPicker onEmojiClick={(e) => setNewContent(prev => prev + e.emoji)} theme="auto" />
                          </div>
                        )}
                      </div>
                      <button type="button" onClick={() => setShowLocationInput(!showLocationInput)} title="Add Location" className={`p-2 rounded-full transition-colors hidden sm:block ${showLocationInput ? 'text-primary bg-primary/10' : 'text-primary hover:text-primary/80 hover:bg-primary/10'}`}>
                        <MapPin className="w-5 h-5" />
                      </button>
                    </div>
                  
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

        {/* Comments Modal */}
        {activeCommentPost && (
          <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-3xl w-full max-w-xl p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground uppercase">Discussion</h3>
                <button onClick={() => setActiveCommentPost(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {comments.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-8">Be the first student to start a discussion.</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="bg-secondary p-3 rounded-xl border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            src={c.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.author_username}`}
                            alt={c.author_username}
                            className="w-6 h-6 rounded-full border border-border object-cover"
                          />
                          <span className="text-xs font-bold text-foreground">{c.author_name}</span>
                          <span className="text-[10px] text-primary">@{c.author_username}</span>
                        </div>
                        <span className="text-[9px] text-muted-foreground">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs text-foreground/90 pl-8">{c.content}</p>

                      {/* Render nested replies */}
                      {c.replies && c.replies.length > 0 && (
                        <div className="pl-8 pt-2 space-y-2 border-l border-border ml-4">
                          {c.replies.map((reply) => (
                            <div key={reply.id} className="bg-secondary p-2 rounded-lg text-xs">
                              <span className="font-bold text-primary">@{reply.author_username}: </span>
                              <span className="text-muted-foreground">{reply.content}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => setReplyParentId(c.id)}
                        className="text-[10px] font-bold text-primary pl-8"
                      >
                        Reply
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="pt-3 border-t border-border flex gap-2">
                <input
                  type="text"
                  required
                  placeholder={replyParentId ? "Replying to comment..." : "Write a comment..."}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
                <button type="submit" className="button button-small button-solid">
                  Send
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Report Modal */}
        {reportingPostId && (
          <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-foreground uppercase">Report Post</h3>
              <form onSubmit={handleReport} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Reason</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="Spam">Spam</option>
                    <option value="Harassment">Harassment</option>
                    <option value="Inappropriate content">Inappropriate Content</option>
                    <option value="Scam">Scam</option>
                    <option value="Fake account">Fake Account</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <textarea
                    rows={3}
                    placeholder="Additional details for moderators (optional)..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setReportingPostId(null)} className="button button-ghost flex-1">
                    Cancel
                  </button>
                  <button type="submit" className="button button-primary flex-1">
                    Submit Report
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
