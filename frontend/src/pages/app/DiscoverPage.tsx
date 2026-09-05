import React, { useState, useEffect } from 'react';
import { AppLayout } from '../../components/AppLayout';
import { api } from '../../services/api';
import { MembershipBadge } from '../../components/MembershipBadge';
import { UserAvatar } from '../../components/UserAvatar';
import { renderContentWithHighlights, timeAgo, isVideoUrl } from '../../utils/textUtils';
import type { User, Post } from '../../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, UserCheck, UserPlus, Clock, Heart, MessageSquare, Share2, FileText } from 'lucide-react';
import { SharePostModal } from '../../components/SharePostModal';

export const DiscoverPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'students' | 'posts'>('students');

  // Search Filters
  const [query, setQuery] = useState(searchParams.get('q') || '');

  const [students, setStudents] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingPost, setSharingPost] = useState<Post | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('query', query);

      const res = await api.get<User[]>(`/discover/students?${params.toString()}`);
      setStudents(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      const res = await api.get<Post[]>(`/discover/posts?${params.toString()}`);
      setPosts(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudents();
    } else {
      fetchPosts();
    }
  }, [activeTab, query]);

  const handleFollowToggle = async (username: string, followStatus?: string, isFollowing?: boolean) => {
    const current = followStatus || (isFollowing ? 'accepted' : 'none');
    try {
      if (current === 'accepted') {
        if (confirm(`Unfollow @${username}?`)) {
          await api.delete(`/users/${username}/follow`);
          fetchStudents();
        }
      } else if (current === 'pending') {
        if (confirm(`Cancel follow request sent to @${username}?`)) {
          await api.delete(`/users/${username}/follow`);
          fetchStudents();
        }
      } else {
        await api.post(`/users/${username}/follow`);
        fetchStudents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartMessage = async (username: string) => {
    try {
      const conv = await api.post<any>(`/conversations?target_username=${username}`);
      navigate(`/app/messages?conv=${conv.id}`);
    } catch (err: any) {
      const msg = err.message || 'Failed to start conversation';
      if (/limit/i.test(msg)) {
        if (confirm(`${msg}\n\nGo to Membership to upgrade?`)) navigate('/app/membership');
      } else {
        alert(msg);
      }
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-2xl font-bold uppercase tracking-tight text-foreground mb-2">Find Your Next Collaborator</h2>
          <p className="text-xs text-muted-foreground">Need someone for a video, game, team, idea, or creative project? Find interesting students by interests, skills, and school.</p>

          {/* Search Inputs */}
          <div className="mt-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search a person, skill, interest, or school..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <p className="text-[11px] text-muted-foreground pt-1">Search any keyword—such as a hobby, sport, language, skill, school, city, or interest.</p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-4 border-b border-border mt-6 pt-2">
            <button
              onClick={() => setActiveTab('students')}
              className={`pb-3 text-xs font-bold uppercase transition-all ${
                activeTab === 'students' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
              }`}
            >
              Students ({students.length})
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`pb-3 text-xs font-bold uppercase transition-all ${
                activeTab === 'posts' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
              }`}
            >
              Posts ({posts.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="py-20 text-center text-xs text-muted-foreground">Searching the nexus...</div>
        ) : activeTab === 'students' ? (
          students.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <p className="text-sm font-bold text-foreground uppercase mb-1">No students found</p>
              <p className="text-xs text-muted-foreground">Try clearing filters or broadening your search term.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {students.map((student) => (
                <div key={student.id} className="ui-card p-5 space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        src={student.profile?.avatar_url}
                        username={student.username}
                        membership={student.membership}
                        size={48}
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-foreground truncate flex items-center gap-1.5">
                          {student.profile?.full_name || student.username}
                          <MembershipBadge membership={student.membership} size={15} />
                        </h4>
                        <p className="text-xs text-primary font-medium truncate">@{student.username}</p>
                        {student.profile?.school && (
                          <p className="text-[10px] text-muted-foreground truncate">📍 {student.profile.school}</p>
                        )}
                      </div>
                    </div>

                    {student.profile?.bio && (
                      <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">{student.profile.bio}</p>
                    )}

                    {student.skills && student.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {student.skills.slice(0, 4).map((sk) => (
                          <span key={sk} className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                            {sk}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border flex items-center gap-2">
                    {(() => {
                      const status = student.follow_status || (student.is_following ? 'accepted' : 'none');
                      if (status === 'accepted') {
                        return (
                          <button
                            onClick={() => handleFollowToggle(student.username, student.follow_status, student.is_following)}
                            className="flex-1 py-2 rounded-xl text-xs font-bold bg-secondary text-muted-foreground border border-border hover:text-red-400 hover:border-red-500/40 transition-all flex items-center justify-center gap-1.5"
                            title="Click to unfollow"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-primary" /> Following
                          </button>
                        );
                      }
                      if (status === 'pending') {
                        return (
                          <button
                            onClick={() => handleFollowToggle(student.username, student.follow_status, student.is_following)}
                            className="flex-1 py-2 rounded-xl text-xs font-bold bg-secondary border border-primary/40 text-primary hover:bg-primary/10 transition-all flex items-center justify-center gap-1.5"
                            title="Click to cancel follow request"
                          >
                            <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} /> Requested
                          </button>
                        );
                      }
                      return (
                        <button
                          onClick={() => handleFollowToggle(student.username, student.follow_status, student.is_following)}
                          className="flex-1 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Follow
                        </button>
                      );
                    })()}
                    <button
                      onClick={() => handleStartMessage(student.username)}
                      className="px-3 py-2 rounded-xl bg-transparent border border-border text-xs text-muted-foreground font-bold hover:border-primary"
                    >
                      Message
                    </button>
                    <button
                      onClick={() => navigate(`/app/profile/${student.username}`)}
                      className="px-3 py-2 rounded-xl bg-secondary text-xs text-foreground font-bold hover:brightness-110"
                    >
                      Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const label = post.post_type === 'COLLAB' ? 'Collaboration'
                : post.post_type === 'IDEA' ? 'Project Idea'
                : post.post_type === 'HELP' ? 'Need Help'
                : post.post_type === 'WIN' ? 'Win & Milestone'
                : post.post_type === 'POLL' ? 'Poll'
                : post.post_type;
              return (
                <div key={post.id} className="ui-card p-5 space-y-3">
                  {/* Author Header */}
                  <div className="flex items-center justify-between gap-3">
                    <div 
                      onClick={() => navigate(`/app/profile/${post.author_username}`)}
                      className="flex items-center gap-2.5 cursor-pointer group"
                    >
                      <UserAvatar
                        src={post.author_avatar}
                        username={post.author_username}
                        alt={post.author_name}
                        size={36}
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {post.author_name}
                          </span>
                          <span className="text-[11px] text-muted-foreground">@{post.author_username}</span>
                          <MembershipBadge membership={post.author_membership} size={14} />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{new Date(post.created_at).toLocaleDateString()} • {timeAgo(post.created_at)}</span>
                          {post.author_school && (
                            <>
                              <span>•</span>
                              <span>{post.author_school}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                      {label}
                    </span>
                  </div>

                  {post.title && <h4 className="text-sm font-bold text-foreground uppercase">{post.title}</h4>}
                  <p className="text-xs text-foreground/90 whitespace-pre-wrap">{renderContentWithHighlights(post.content)}</p>

                  {/* Media Visual: Video, Document, or Image */}
                  {post.images && post.images.length > 0 && (
                    isVideoUrl(post.images[0]) ? (
                      <div className="rounded-2xl overflow-hidden border border-border/80 bg-black/60 flex items-center justify-center mt-2 shadow-sm">
                        <video
                          src={post.images[0]}
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full max-h-[500px] object-contain rounded-2xl bg-black"
                        />
                      </div>
                    ) : post.images[0].toLowerCase().match(/\.(pdf|doc|docx|txt|csv)$/) ? (
                      <div className="mt-2 border border-border bg-secondary/50 rounded-xl overflow-hidden shadow-sm">
                        {post.images[0].toLowerCase().endsWith('.pdf') ? (
                          <iframe src={post.images[0]} className="w-full h-[350px] border-none bg-white" title="PDF Document" />
                        ) : (
                          <div className="p-6 flex flex-col items-center justify-center bg-secondary/30 text-muted-foreground gap-2">
                            <FileText className="w-10 h-10 opacity-50" />
                            <span className="text-xs font-medium">Document attached</span>
                          </div>
                        )}
                        <div className="p-3 border-t border-border flex items-center justify-between gap-3 text-xs bg-card">
                          <span className="truncate font-bold text-[11px]">
                            {post.images[0].split('/').pop() || 'Document'}
                          </span>
                          <a href={post.images[0]} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                            Open
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => window.open(post.images[0], '_blank')}
                        className="rounded-2xl overflow-hidden border border-border/80 bg-secondary/30 flex items-center justify-center mt-2 cursor-pointer group hover:border-primary/50 transition-all shadow-sm"
                        title="Click to view full visual"
                      >
                        <img
                          src={post.images[0]}
                          alt="Post visual"
                          className="w-full max-h-[500px] object-contain rounded-2xl transition-transform duration-200 group-hover:scale-[1.005]"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget;
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('video')) {
                              const videoEl = document.createElement('video');
                              videoEl.src = post.images[0];
                              videoEl.controls = true;
                              videoEl.playsInline = true;
                              videoEl.className = 'w-full max-h-[500px] object-contain rounded-2xl bg-black';
                              parent.replaceChild(videoEl, target);
                            }
                          }}
                        />
                      </div>
                    )
                  )}

                  {/* Post Actions Footer */}
                  <div className="pt-2.5 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" />
                        {post.likes_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {post.comments_count || 0}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSharingPost(post)}
                        className="px-2.5 py-1 rounded-lg hover:bg-secondary text-foreground font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share</span>
                      </button>
                      <button
                        onClick={() => navigate(`/app/posts/${post.id}`)}
                        className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-colors"
                      >
                        View Post →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Share Post Modal */}
      <SharePostModal
        isOpen={!!sharingPost}
        onClose={() => setSharingPost(null)}
        post={sharingPost}
      />
    </AppLayout>
  );
};
