import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components/AppLayout';
import { UserAvatar } from '../components/UserAvatar';
import { MembershipBadge } from '../components/MembershipBadge';
import { InlineComments } from '../components/InlineComments';
import { SharePostModal } from '../components/SharePostModal';
import { AuroraGlow } from '../components/reactbits/AuroraGlow';
import type { Post, Comment } from '../types';
import { 
  renderContentWithHighlights, 
  timeAgo, 
  isVideoUrl 
} from '../utils/textUtils';
import { 
  Heart, 
  MessageSquare, 
  Bookmark, 
  Share2, 
  ArrowLeft, 
  Sparkles, 
  Building2, 
  Lock, 
  LogIn, 
  UserPlus, 
  Check, 
  BarChart2, 
  AlertCircle
} from 'lucide-react';

export const PublicPostPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Interactive post state
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [pollOptions, setPollOptions] = useState<any[]>([]);
  const [votingPoll, setVotingPoll] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState<{ text: string; parentId: number | null; replyToUser: string | null }>({
    text: '',
    parentId: null,
    replyToUser: null,
  });

  const fetchPost = async () => {
    if (!id) return;
    setLoading(true);
    setErrorStatus(null);
    try {
      // Use authenticated endpoint if user is logged in, else public endpoint
      const endpoint = user ? `/posts/${id}` : `/posts/public/${id}`;
      const data = await api.get<Post>(endpoint);
      setPost(data);
      setLikesCount(data.likes_count || 0);
      setIsLiked(!!data.user_liked);
      setIsSaved(!!data.user_saved);
      setPollOptions(data.poll_options || []);

      // Fetch comments
      fetchComments();
    } catch (e: any) {
      console.error('Failed to load post', e);
      setErrorStatus(e.status || 404);
      setErrorMessage(e.message || 'Post not found or is no longer available.');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!id) return;
    setLoadingComments(true);
    try {
      const data = await api.get<Comment[]>(`/posts/${id}/comments`);
      setComments(data);
    } catch (e) {
      console.error('Failed to load comments', e);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [id, user]);

  const handleLikeToggle = async () => {
    if (!user) {
      navigate(`/login?redirect=/p/${id}`);
      return;
    }
    if (!post) return;

    const nextLiked = !isLiked;
    const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    setIsLiked(nextLiked);
    setLikesCount(nextCount);

    try {
      await api.post(`/posts/${post.id}/like`);
    } catch {
      // Revert on failure
      setIsLiked(!nextLiked);
      setLikesCount(likesCount);
    }
  };

  const handleSaveToggle = async () => {
    if (!user) {
      navigate(`/login?redirect=/p/${id}`);
      return;
    }
    if (!post) return;

    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    try {
      await api.post(`/posts/${post.id}/save`);
    } catch {
      setIsSaved(!nextSaved);
    }
  };

  const handleVotePoll = async (optionId: number) => {
    if (!user) {
      navigate(`/login?redirect=/p/${id}`);
      return;
    }
    if (!post || votingPoll) return;

    setVotingPoll(true);
    try {
      await api.post(`/posts/${post.id}/poll/vote/${optionId}`);
      // Refresh post data to reflect updated vote counts
      const updated = await api.get<Post>(user ? `/posts/${post.id}` : `/posts/public/${post.id}`);
      setPollOptions(updated.poll_options || []);
    } catch (e: any) {
      alert(e.message || 'Failed to record vote');
    } finally {
      setVotingPoll(false);
    }
  };

  const handleAddComment = async () => {
    if (!user) {
      navigate(`/login?redirect=/p/${id}`);
      return;
    }
    if (!post || !commentInput.text.trim()) return;

    try {
      await api.post(`/posts/${post.id}/comments`, {
        content: commentInput.text.trim(),
        parent_id: commentInput.parentId,
      });
      setCommentInput({ text: '', parentId: null, replyToUser: null });
      fetchComments();
      setPost((prev) => prev ? { ...prev, comments_count: (prev.comments_count || 0) + 1 } : prev);
    } catch (e: any) {
      alert(e.message || 'Failed to post comment');
    }
  };

  const handleLikeComment = async (commentId: number) => {
    if (!user) {
      navigate(`/login?redirect=/p/${id}`);
      return;
    }
    try {
      await api.post(`/comments/${commentId}/like`);
      fetchComments();
    } catch (e: any) {
      console.error(e);
    }
  };

  // Render post content inside page
  const renderPostCard = () => {
    if (!post) return null;

    const totalPollVotes = pollOptions.reduce((sum, opt) => sum + (opt.votes_count || 0), 0);

    return (
      <article className="bg-card border border-border rounded-3xl p-5 sm:p-7 shadow-xl space-y-5">
        {/* Post Author Header */}
        <div className="flex items-center justify-between gap-3">
          <div 
            onClick={() => navigate(user ? `/app/profile/${post.author_username}` : `/u/${post.author_username}`)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <UserAvatar
              src={post.author_avatar}
              username={post.author_username}
              alt={post.author_name}
              size={48}
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-foreground group-hover:text-primary transition-colors text-sm sm:text-base">
                  {post.author_name}
                </span>
                <MembershipBadge membership={post.author_membership} size={16} />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>@{post.author_username}</span>
                <span>•</span>
                <span>{timeAgo(post.created_at)}</span>
              </div>
            </div>
          </div>

          {post.author_school && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-secondary/70 border border-border text-xs text-muted-foreground">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span className="truncate max-w-[150px]">{post.author_school}</span>
            </div>
          )}
        </div>

        {/* Post Title & Content */}
        <div className="space-y-3">
          {post.title && (
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-tight">
              {post.title}
            </h1>
          )}
          <div className="text-foreground/90 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
            {renderContentWithHighlights(post.content)}
          </div>
        </div>

        {/* Media / Images Gallery */}
        {post.images && post.images.length > 0 && (
          <div className={`grid gap-2.5 rounded-2xl overflow-hidden ${
            post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
          }`}>
            {post.images.map((imgUrl, idx) => (
              <div key={idx} className="relative rounded-2xl overflow-hidden bg-secondary/30 border border-border">
                {isVideoUrl(imgUrl) ? (
                  <video
                    src={imgUrl}
                    controls
                    className="w-full max-h-[500px] object-contain rounded-2xl"
                  />
                ) : (
                  <img
                    src={imgUrl}
                    alt={`Post attachment ${idx + 1}`}
                    className="w-full max-h-[550px] object-cover rounded-2xl hover:scale-[1.01] transition-transform duration-300 cursor-pointer"
                    onClick={() => window.open(imgUrl, '_blank')}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Poll Options */}
        {pollOptions.length > 0 && (
          <div className="p-4 rounded-2xl bg-secondary/40 border border-border space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <BarChart2 className="w-4 h-4 text-primary" />
              <span>Poll ({totalPollVotes} {totalPollVotes === 1 ? 'vote' : 'votes'})</span>
            </div>

            <div className="space-y-2">
              {pollOptions.map((opt) => {
                const percent = totalPollVotes > 0 ? Math.round((opt.votes_count / totalPollVotes) * 100) : 0;
                return (
                  <button
                    key={opt.id}
                    disabled={votingPoll || !user}
                    onClick={() => handleVotePoll(opt.id)}
                    className={`w-full relative overflow-hidden text-left p-3 rounded-xl border transition-all flex items-center justify-between text-xs font-semibold ${
                      opt.user_voted
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card hover:bg-secondary/60 text-foreground'
                    }`}
                  >
                    {/* Progress Bar Background */}
                    <div
                      className={`absolute top-0 bottom-0 left-0 transition-all duration-500 opacity-20 ${
                        opt.user_voted ? 'bg-primary' : 'bg-muted-foreground'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                    <div className="relative z-10 flex items-center gap-2">
                      {opt.user_voted && <Check className="w-4 h-4 text-primary" />}
                      <span>{opt.option_text}</span>
                    </div>
                    <span className="relative z-10 font-mono text-xs opacity-75">{percent}%</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons Bar */}
        <div className="pt-3 border-t border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Like */}
            <button
              onClick={handleLikeToggle}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isLiked
                  ? 'text-red-500 bg-red-500/10 shadow-sm'
                  : 'text-muted-foreground hover:text-red-500 hover:bg-red-500/10'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500' : ''}`} />
              <span>{likesCount}</span>
            </button>

            {/* Comment */}
            <button
              onClick={() => {
                if (!user) {
                  navigate(`/login?redirect=/p/${id}`);
                } else {
                  const inputEl = document.querySelector('textarea');
                  if (inputEl) inputEl.focus();
                }
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{comments.length || post.comments_count || 0}</span>
            </button>

            {/* Save (bookmark) */}
            {user && (
              <button
                onClick={handleSaveToggle}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isSaved
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-primary hover:bg-secondary'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-primary' : ''}`} />
                <span>{isSaved ? 'Saved' : 'Save'}</span>
              </button>
            )}
          </div>

          {/* Share Button */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:brightness-110 shadow-md shadow-primary/20 transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>

        {/* Comments Section */}
        <div className="pt-2">
          {user ? (
            <InlineComments
              post={post}
              user={user}
              comments={comments}
              loading={loadingComments}
              commentState={commentInput}
              onChangeInput={(patch) => setCommentInput((prev) => ({ ...prev, ...patch }))}
              onSubmit={handleAddComment}
              onLikeComment={handleLikeComment}
              canReply={{ allowed: true }}
            />
          ) : (
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Comments ({comments.length})
              </h3>

              {comments.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No comments yet. Be the first to join the conversation!
                </div>
              ) : (
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="p-3.5 rounded-2xl bg-secondary/30 border border-border/60 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar src={c.author_avatar} username={c.author_username} alt={c.author_name} size={32} />
                        <div>
                          <span className="text-xs font-bold text-foreground">{c.author_name}</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">@{c.author_username}</span>
                        </div>
                      </div>
                      <p className="text-xs text-foreground/90 pl-10 leading-relaxed">{c.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </article>
    );
  };

  // Loading State
  if (loading) {
    const loadingCard = (
      <div className="max-w-2xl mx-auto p-4 sm:p-8 space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-secondary rounded-xl" />
        <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-secondary" />
            <div className="space-y-2">
              <div className="w-32 h-4 bg-secondary rounded" />
              <div className="w-20 h-3 bg-secondary rounded" />
            </div>
          </div>
          <div className="h-5 w-3/4 bg-secondary rounded" />
          <div className="h-20 bg-secondary rounded-2xl" />
        </div>
      </div>
    );

    return user ? <AppLayout>{loadingCard}</AppLayout> : (
      <main className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
        {loadingCard}
      </main>
    );
  }

  // Error State (404 / 403)
  if (!post || errorStatus) {
    const errorCard = (
      <div className="max-w-md mx-auto my-12 bg-card border border-border rounded-3xl p-8 text-center shadow-xl space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
          {errorStatus === 403 ? <Lock className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
        </div>
        <h2 className="text-lg font-bold text-foreground uppercase tracking-tight">
          {errorStatus === 403 ? 'Private Post' : 'Post Not Found'}
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {errorMessage || 'The post you are looking for does not exist, was removed, or is restricted to approved followers.'}
        </p>
        <div className="pt-2 flex flex-col gap-2">
          {errorStatus === 403 && !user ? (
            <button
              onClick={() => navigate(`/login?redirect=/p/${id}`)}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-primary/20"
            >
              <LogIn className="w-4 h-4" /> Log In to View
            </button>
          ) : (
            <button
              onClick={() => navigate(user ? '/app/feed' : '/')}
              className="w-full py-2.5 rounded-xl bg-secondary border border-border font-bold text-xs text-foreground hover:bg-secondary/80 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Go to {user ? 'Feed' : 'Home'}
            </button>
          )}
        </div>
      </div>
    );

    return user ? <AppLayout>{errorCard}</AppLayout> : (
      <main className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
        {errorCard}
      </main>
    );
  }

  // 1. Authenticated View (Inside AppLayout)
  if (user) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto space-y-4 pb-12">
          {/* Back Navigation Bar */}
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-1.5 rounded-xl bg-secondary/80 border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-2 transition-all w-fit"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {renderPostCard()}
        </div>

        {/* Share Modal */}
        <SharePostModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          post={post}
        />
      </AppLayout>
    );
  }

  // 2. Unauthenticated Public View (Outside AppLayout)
  return (
    <main className="min-h-screen bg-background text-foreground relative selection:bg-primary/20 flex flex-col">
      {/* Background Aurora Effect */}
      <div className="fixed inset-0 pointer-events-none opacity-30 z-0">
        <AuroraGlow />
      </div>

      {/* Public Top Navbar */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-emerald-400 flex items-center justify-center text-primary-foreground font-black shadow-md shadow-primary/20">
              E
            </div>
            <span className="text-base font-black tracking-tight text-foreground">
              Edu<span className="text-primary">Nexus</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl text-xs font-bold text-foreground hover:bg-secondary/60 transition-colors"
            >
              Log In
            </Link>
            <Link
              to={`/signup?redirect=/p/${id}`}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 shadow-md shadow-primary/20 transition-all flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" /> Sign Up Free
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-6 my-4">
        {renderPostCard()}

        {/* Call-to-action Card */}
        <div className="bg-gradient-to-br from-primary/10 via-secondary/40 to-card border border-primary/20 rounded-3xl p-6 text-center space-y-3 shadow-xl">
          <Sparkles className="w-7 h-7 text-primary mx-auto" />
          <h2 className="text-lg font-bold text-foreground">
            Connect with students on EduNexus
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Create your profile, follow classmates, participate in discussions, and discover academic opportunities worldwide.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              to={`/signup?redirect=/p/${id}`}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:brightness-110 transition-all"
            >
              Join EduNexus
            </Link>
            <Link
              to={`/u/${post.author_username}`}
              className="px-4 py-2.5 rounded-xl bg-secondary border border-border font-bold text-xs text-foreground hover:bg-secondary/80 transition-all"
            >
              View Author Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <SharePostModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        post={post}
      />
    </main>
  );
};
