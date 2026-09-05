import React, { useState, useEffect } from 'react';
import { AppLayout } from '../../components/AppLayout';
import { api } from '../../services/api';
import type { ForumCategory, ForumThread, ForumReply } from '../../types';
import { MessageSquare, ThumbsUp, ThumbsDown, Plus, UserX } from 'lucide-react';
import { MembershipBadge } from '../../components/MembershipBadge';
import { useNavigate } from 'react-router-dom';

export const ForumsPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);

  // Thread Creation Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Active Thread Modal State
  const [activeThread, setActiveThread] = useState<ForumThread | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [replyInput, setReplyInput] = useState('');
  const [replyAnonymous, setReplyAnonymous] = useState(false);

  const fetchCategories = async () => {
    try {
      const cats = await api.get<ForumCategory[]>('/forums/categories');
      setCategories(cats);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const catQuery = selectedCatId ? `?category_id=${selectedCatId}` : '';
      const data = await api.get<ForumThread[]>(`/forums/threads${catQuery}`);
      setThreads(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [selectedCatId]);

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      const catId = selectedCatId || (categories.length > 0 ? categories[0].id : 1);
      await api.post('/forums/threads', {
        category_id: catId,
        title: newTitle.trim(),
        content: newContent.trim(),
        is_anonymous: isAnonymous,
      });

      setShowCreateModal(false);
      setNewTitle('');
      setNewContent('');
      setIsAnonymous(false);
      fetchThreads();
    } catch (err: any) {
      alert(err.message || 'Failed to create thread');
    }
  };

  const handleToggleUpvote = async (threadId: number) => {
    try {
      const res = await api.post<{ upvoted: boolean; upvotes_count: number; downvoted: boolean; downvotes_count: number }>(`/forums/threads/${threadId}/upvote`);
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId ? { ...t, user_upvoted: res.upvoted, upvotes_count: res.upvotes_count, user_downvoted: res.downvoted, downvotes_count: res.downvotes_count } : t
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleDownvote = async (threadId: number) => {
    try {
      const res = await api.post<{ upvoted: boolean; upvotes_count: number; downvoted: boolean; downvotes_count: number }>(`/forums/threads/${threadId}/downvote`);
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId ? { ...t, user_upvoted: res.upvoted, upvotes_count: res.upvotes_count, user_downvoted: res.downvoted, downvotes_count: res.downvotes_count } : t
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  const openThreadDetails = async (t: ForumThread) => {
    setActiveThread(t);
    try {
      const repData = await api.get<ForumReply[]>(`/forums/threads/${t.id}/replies`);
      setReplies(repData);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !replyInput.trim()) return;

    try {
      await api.post(`/forums/threads/${activeThread.id}/replies`, {
        content: replyInput.trim(),
        is_anonymous: replyAnonymous,
      });

      setReplyInput('');
      setReplyAnonymous(false);
      const repData = await api.get<ForumReply[]>(`/forums/threads/${activeThread.id}/replies`);
      setReplies(repData);
      setThreads((prev) =>
        prev.map((t) => (t.id === activeThread.id ? { ...t, replies_count: t.replies_count + 1 } : t))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to add reply');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Forums Header */}
        <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-tight text-foreground mb-1">Student Forums</h2>
            <p className="text-xs text-muted-foreground">Ask questions, share research, and participate in academic discussions.</p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="button button-small button-solid"
          >
            <Plus className="w-4 h-4 mr-1" /> New Thread
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCatId(null)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCatId === null
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'bg-card text-muted-foreground border border-border hover:text-foreground'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCatId === cat.id
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'bg-card text-muted-foreground border border-border hover:text-foreground'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Threads List */}
        {loading ? (
          <div className="py-20 text-center text-xs text-muted-foreground">Loading forum discussions...</div>
        ) : threads.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <MessageSquare className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="text-lg font-bold text-foreground uppercase">No discussions yet</h3>
            <p className="text-xs text-muted-foreground mt-1">Be the first student to start a discussion in this category.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {threads.map((t) => (
              <div key={t.id} className="ui-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase">
                      {t.category_name}
                    </span>
                    {t.is_anonymous ? (
                      <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                        <UserX className="w-3 h-3 text-primary" /> Anonymous Student
                      </span>
                    ) : (
                      <span 
                        onClick={(e) => { e.stopPropagation(); navigate(`/app/profile/${t.author_username}`); }}
                        className="text-[10px] font-semibold text-foreground/90 flex items-center gap-1 cursor-pointer hover:underline hover:text-primary transition-colors"
                        title={`View @${t.author_username}'s profile`}
                      >
                        @{t.author_username}
                        <MembershipBadge membership={t.author_membership} size={12} />
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
                </div>

                <h3
                  onClick={() => openThreadDetails(t)}
                  className="text-base font-bold text-foreground uppercase hover:text-primary cursor-pointer transition-colors"
                >
                  {t.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{t.content}</p>

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleToggleUpvote(t.id)}
                      className={`flex items-center gap-1.5 transition-colors ${
                        t.user_upvoted ? 'text-primary font-bold' : 'hover:text-foreground'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>{t.upvotes_count} Upvotes</span>
                    </button>

                    <button
                      onClick={() => handleToggleDownvote(t.id)}
                      className={`flex items-center gap-1.5 transition-colors ${
                        t.user_downvoted ? 'text-red-500 font-bold' : 'hover:text-foreground'
                      }`}
                    >
                      <ThumbsDown className="w-4 h-4" />
                      <span>{t.downvotes_count} Downvotes</span>
                    </button>
                  </div>

                  <button
                    onClick={() => openThreadDetails(t)}
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{t.replies_count} Replies</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Thread Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground uppercase">New Forum Thread</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
              </div>

              <form onSubmit={handleCreateThread} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Title</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter discussion title..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Category</label>
                  <select
                    value={selectedCatId || (categories.length > 0 ? categories[0].id : 1)}
                    onChange={(e) => setSelectedCatId(Number(e.target.value))}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Body</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Explain your question or topic..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Anonymous Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="anon"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="accent-[#22e079]"
                  />
                  <label htmlFor="anon" className="text-xs text-muted-foreground font-medium cursor-pointer">
                    Post anonymously (Displays as "Anonymous Student")
                  </label>
                </div>

                <button type="submit" className="button button-primary w-full">
                  Post Thread
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Thread Detail Modal */}
        {activeThread && (
          <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-3xl w-full max-w-2xl p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-primary">{activeThread.category_name}</span>
                  <h3 className="text-lg font-bold text-foreground uppercase leading-snug">{activeThread.title}</h3>
                </div>
                <button onClick={() => setActiveThread(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
              </div>

              <div className="bg-secondary p-4 rounded-xl border border-border">
                <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">{activeThread.content}</p>
                <div className="mt-3 text-[10px] text-muted-foreground flex items-center justify-between">
                  <span>
                    Posted by:{' '}
                    {activeThread.is_anonymous ? (
                      'Anonymous Student'
                    ) : (
                      <span
                        onClick={() => navigate(`/app/profile/${activeThread.author_username}`)}
                        className="font-bold text-primary hover:underline cursor-pointer"
                        title={`View @${activeThread.author_username}'s profile`}
                      >
                        @{activeThread.author_username}
                      </span>
                    )}
                  </span>
                  <span>{new Date(activeThread.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Replies List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                <h4 className="text-xs font-bold uppercase text-muted-foreground">Replies ({replies.length})</h4>
                {replies.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-4">No replies yet. Be the first to answer!</p>
                ) : (
                  replies.map((r) => (
                    <div key={r.id} className="bg-secondary p-3 rounded-xl border border-border space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span 
                          onClick={() => !r.is_anonymous && navigate(`/app/profile/${r.author_username}`)}
                          className={`font-bold text-primary ${!r.is_anonymous ? 'hover:underline cursor-pointer' : ''}`}
                          title={!r.is_anonymous ? `View @${r.author_username}'s profile` : undefined}
                        >
                          {r.is_anonymous ? 'Anonymous Student' : `@${r.author_username}`}
                        </span>
                        <span className="text-[9px] text-muted-foreground">{new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{r.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleAddReply} className="pt-3 border-t border-border space-y-2">
                <textarea
                  rows={2}
                  required
                  placeholder="Write your response..."
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={replyAnonymous}
                      onChange={(e) => setReplyAnonymous(e.target.checked)}
                      className="accent-[#22e079]"
                    />
                    Reply Anonymously
                  </label>
                  <button type="submit" className="button button-small button-solid">
                    Submit Reply
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
