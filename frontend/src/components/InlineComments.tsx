import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageSquare, Send, X, ChevronDown, ChevronUp, CornerDownRight, Sparkles, Lock, Users, Smile, Trash } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { MembershipBadge } from './MembershipBadge';
import { StickerPicker } from './StickerPicker';
import { ReactionPicker } from './ReactionPicker';
import type { Post, Comment } from '../types';
import { timeAgo, isStickerOnlyContent, renderContentWithHighlights } from '../utils/textUtils';

interface InlineCommentsProps {
  post: Post;
  user: any;
  comments: Comment[];
  loading: boolean;
  commentState: { text: string; parentId: number | null; replyToUser: string | null };
  onChangeInput: (patch: Partial<{ text: string; parentId: number | null; replyToUser: string | null }>) => void;
  onSubmit: () => void;
  onLikeComment: (commentId: number) => void;
  onReactComment?: (commentId: number, emoji: string) => void;
  onDeleteComment?: (commentId: number) => void;
  canReply: { allowed: boolean; reason?: string };
}

export const InlineComments: React.FC<InlineCommentsProps> = ({
  post,
  user,
  comments,
  loading,
  commentState,
  onChangeInput,
  onSubmit,
  onLikeComment,
  onReactComment,
  onDeleteComment,
  canReply,
}) => {
  const navigate = useNavigate();
  const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});
  const [activeReactionCommentId, setActiveReactionCommentId] = useState<number | null>(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  const startReply = (parentId: number, replyTo: string) => {
    onChangeInput({ parentId, replyToUser: replyTo });
  };
  const cancelReply = () => {
    onChangeInput({ parentId: null, replyToUser: null });
  };

  return (
    <div className="mt-3 pt-4 border-t border-border/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
      {/* Audience indicator */}
      {post.audience && post.audience !== 'public' && (
        <div className="px-3 py-1.5 bg-secondary/40 border border-border rounded-lg text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          Posted to {post.audience === 'followers' ? 'your Followers' : 'a Community'} only
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-6 text-xs text-muted-foreground">Loading comments…</div>
        ) : comments.length === 0 ? (
          <div className="text-center py-6 space-y-1">
            <MessageSquare className="w-6 h-6 text-muted-foreground/40 mx-auto" />
            <p className="text-xs font-semibold text-foreground">No comments yet</p>
            <p className="text-[11px] text-muted-foreground">Be the first to add one.</p>
          </div>
        ) : (
          comments.map((c) => {
            const hasReplies = c.replies && c.replies.length > 0;
            const isExpanded = !!expandedReplies[c.id];
            const canDeleteComment = user && (c.author_id === user.id || post.author_id === user.id || user.role === 'admin');

            return (
              <div key={c.id} className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <UserAvatar
                    src={c.author_avatar}
                    username={c.author_username}
                    membership={c.author_membership}
                    size={30}
                    onClick={() => navigate(`/app/profile/${c.author_username}`)}
                    title={`View @${c.author_username}'s profile`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span 
                        onClick={() => navigate(`/app/profile/${c.author_username}`)}
                        className="text-xs font-bold text-foreground hover:underline hover:text-primary cursor-pointer flex items-center gap-1.5 transition-colors"
                        title={`View @${c.author_username}'s profile`}
                      >
                        {c.author_name || c.author_username}
                        <MembershipBadge membership={c.author_membership} size={12} />
                      </span>
                      <span 
                        onClick={() => navigate(`/app/profile/${c.author_username}`)}
                        className="text-[10px] text-muted-foreground hover:text-primary cursor-pointer hover:underline transition-colors"
                        title={`View @${c.author_username}'s profile`}
                      >
                        @{c.author_username}
                      </span>
                      <span className="text-[10px] text-muted-foreground">• {timeAgo(c.created_at)}</span>
                    </div>
                    {isStickerOnlyContent(c.content) ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.content.trim().split(/\s+/).map((url, i) => (
                          <img key={i} src={url} alt="sticker" className="w-16 h-16" draggable={false} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-foreground/90 mt-0.5 whitespace-pre-wrap leading-relaxed">
                        {renderContentWithHighlights(c.content)}
                      </p>
                    )}
                    <div className="flex items-center gap-2.5 mt-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => onLikeComment(c.id)}
                        className={`flex items-center gap-1 py-0.5 transition-colors cursor-pointer ${
                          c.user_liked ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Heart className={`w-3 h-3 ${c.user_liked ? 'fill-primary text-primary' : ''}`} />
                        <span className="text-[10px]">{(c.likes_count ?? 0) > 0 ? c.likes_count : ''}</span>
                      </button>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setActiveReactionCommentId(activeReactionCommentId === c.id ? null : c.id)}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-full hover:bg-secondary"
                          title="React to comment"
                        >
                          <Smile className="w-3 h-3" />
                        </button>
                        {activeReactionCommentId === c.id && onReactComment && (
                          <ReactionPicker
                            position="top"
                            align="left"
                            onSelect={(emoji) => onReactComment(c.id, emoji)}
                            onClose={() => setActiveReactionCommentId(null)}
                          />
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => startReply(c.id, c.author_username)}
                        className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors py-0.5 cursor-pointer"
                      >
                        Reply
                      </button>

                      {canDeleteComment && onDeleteComment && (
                        <button
                          type="button"
                          onClick={() => onDeleteComment(c.id)}
                          className="p-1 text-muted-foreground hover:text-red-400 rounded-md hover:bg-red-500/10 transition-colors cursor-pointer ml-auto"
                          title="Delete comment"
                        >
                          <Trash className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Comment Reaction Pills */}
                    {c.reactions && c.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.reactions.map((r) => (
                          <button
                            key={r.emoji}
                            type="button"
                            onClick={() => onReactComment?.(c.id, r.emoji)}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                              r.user_reacted
                                ? 'bg-primary/20 border-primary/50 text-primary font-bold'
                                : 'bg-card/90 border-border text-foreground/80 hover:bg-secondary'
                            }`}
                            title={r.usernames && r.usernames.length > 0 ? r.usernames.join(', ') : `${r.count} reactions`}
                          >
                            <span>{r.emoji}</span>
                            <span className="text-[9px] font-bold">{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {hasReplies && (
                      <div className="mt-1.5">
                        <button
                          type="button"
                          onClick={() => setExpandedReplies((p) => ({ ...p, [c.id]: !p[c.id] }))}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:text-primary/80 transition-colors py-0.5"
                        >
                          <span className="w-4 h-[1px] bg-primary/40 inline-block" />
                          {isExpanded ? (
                            <><ChevronUp className="w-3 h-3" /> Hide {c.replies.length} {c.replies.length === 1 ? 'reply' : 'replies'}</>
                          ) : (
                            <><ChevronDown className="w-3 h-3" /> View {c.replies.length} {c.replies.length === 1 ? 'reply' : 'replies'}</>
                          )}
                        </button>
                        {isExpanded && (
                          <div className="mt-2 pl-3 space-y-2.5 border-l-2 border-border/80 ml-1">
                            {c.replies.map((reply) => {
                              const canDeleteReply = user && (reply.author_id === user.id || post.author_id === user.id || user.role === 'admin');
                              return (
                                <div key={reply.id} className="flex items-start gap-2">
                                  <UserAvatar
                                    src={reply.author_avatar}
                                    username={reply.author_username}
                                    membership={reply.author_membership}
                                    size={24}
                                    onClick={() => navigate(`/app/profile/${reply.author_username}`)}
                                    title={`View @${reply.author_username}'s profile`}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span 
                                        onClick={() => navigate(`/app/profile/${reply.author_username}`)}
                                        className="text-[11px] font-bold text-foreground hover:underline hover:text-primary cursor-pointer flex items-center gap-1.5 transition-colors"
                                        title={`View @${reply.author_username}'s profile`}
                                      >
                                        {reply.author_name || reply.author_username}
                                        <MembershipBadge membership={reply.author_membership} size={11} />
                                      </span>
                                      <span 
                                        onClick={() => navigate(`/app/profile/${reply.author_username}`)}
                                        className="text-[9px] text-muted-foreground hover:text-primary cursor-pointer hover:underline transition-colors"
                                        title={`View @${reply.author_username}'s profile`}
                                      >
                                        @{reply.author_username}
                                      </span>
                                      <span className="text-[9px] text-muted-foreground">• {timeAgo(reply.created_at)}</span>
                                    </div>
                                    {isStickerOnlyContent(reply.content) ? (
                                      <div className="mt-0.5 flex flex-wrap gap-1">
                                        {reply.content.trim().split(/\s+/).map((url, i) => (
                                          <img key={i} src={url} alt="sticker" className="w-14 h-14" draggable={false} />
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-[11px] text-foreground/90 mt-0.5 whitespace-pre-wrap leading-relaxed">
                                        {renderContentWithHighlights(reply.content)}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1 text-xs">
                                      <button
                                        type="button"
                                        onClick={() => onLikeComment(reply.id)}
                                        className={`flex items-center gap-1 py-0.5 transition-colors cursor-pointer ${
                                          reply.user_liked ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                      >
                                        <Heart className={`w-3 h-3 ${reply.user_liked ? 'fill-primary text-primary' : ''}`} />
                                        <span className="text-[10px]">{(reply.likes_count ?? 0) > 0 ? reply.likes_count : ''}</span>
                                      </button>

                                      <div className="relative">
                                        <button
                                          type="button"
                                          onClick={() => setActiveReactionCommentId(activeReactionCommentId === reply.id ? null : reply.id)}
                                          className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-full hover:bg-secondary"
                                          title="React to reply"
                                        >
                                          <Smile className="w-3 h-3" />
                                        </button>
                                        {activeReactionCommentId === reply.id && onReactComment && (
                                          <ReactionPicker
                                            position="top"
                                            align="left"
                                            onSelect={(emoji) => onReactComment(reply.id, emoji)}
                                            onClose={() => setActiveReactionCommentId(null)}
                                          />
                                        )}
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => startReply(c.id, reply.author_username)}
                                        className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors py-0.5 cursor-pointer"
                                      >
                                        Reply
                                      </button>

                                      {canDeleteReply && onDeleteComment && (
                                        <button
                                          type="button"
                                          onClick={() => onDeleteComment(reply.id)}
                                          className="p-1 text-muted-foreground hover:text-red-400 rounded-md hover:bg-red-500/10 transition-colors cursor-pointer ml-auto"
                                          title="Delete reply"
                                        >
                                          <Trash className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>

                                    {/* Reply Reaction Pills */}
                                    {reply.reactions && reply.reactions.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {reply.reactions.map((r) => (
                                          <button
                                            key={r.emoji}
                                            type="button"
                                            onClick={() => onReactComment?.(reply.id, r.emoji)}
                                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                                              r.user_reacted
                                                ? 'bg-primary/20 border-primary/50 text-primary font-bold'
                                                : 'bg-card/90 border-border text-foreground/80 hover:bg-secondary'
                                            }`}
                                            title={r.usernames && r.usernames.length > 0 ? r.usernames.join(', ') : `${r.count} reactions`}
                                          >
                                            <span>{r.emoji}</span>
                                            <span className="text-[9px] font-bold">{r.count}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sticky input */}
      <div className="pt-2 border-t border-border/40">
        {commentState.replyToUser && (
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5 mb-2 text-xs">
            <div className="flex items-center gap-1.5 text-primary font-semibold">
              <CornerDownRight className="w-3.5 h-3.5" />
              <span>Replying to <b className="font-bold">@{commentState.replyToUser}</b></span>
            </div>
            <button
              type="button"
              onClick={cancelReply}
              className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-card transition-colors"
              title="Cancel reply"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {canReply.allowed ? (
          <form
            ref={formRef}
            onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
            className="flex items-center gap-2.5"
          >
            <UserAvatar src={user?.profile?.avatar_url} username={user?.username} size={30} />
            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                placeholder={commentState.replyToUser ? `Reply to @${commentState.replyToUser}…` : 'Add a comment…'}
                value={commentState.text}
                onChange={(e) => onChangeInput({ text: e.target.value })}
                className="w-full bg-secondary border border-border rounded-full pl-4 pr-20 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowStickerPicker(true)}
                title="Send a sticker (Members)"
                className="absolute right-9 p-1.5 rounded-full text-primary hover:bg-primary/10 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
              <button
                type="submit"
                disabled={!commentState.text.trim()}
                className="absolute right-1.5 p-1.5 rounded-full bg-primary text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all"
                title="Post comment"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            {showStickerPicker && (
              <StickerPicker
                onSelect={(sticker) => {
                  setShowStickerPicker(false);
                  onChangeInput({ text: sticker.url });
                  setTimeout(() => formRef.current?.requestSubmit(), 0);
                }}
                onClose={() => setShowStickerPicker(false)}
                title="Reply with a sticker"
              />
            )}
          </form>
        ) : (
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-secondary/80 border border-border rounded-2xl text-xs text-muted-foreground">
            <Lock className="w-4 h-4 text-primary shrink-0" />
            <span>{canReply.reason}</span>
          </div>
        )}
      </div>
    </div>
  );
};
