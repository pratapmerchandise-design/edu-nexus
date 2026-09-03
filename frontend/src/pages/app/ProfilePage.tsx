import React, { useState, useEffect } from 'react';
import { AppLayout } from '../../components/AppLayout';
import { api, uploadFile } from '../../services/api';
import { MembershipBadge } from '../../components/MembershipBadge';
import { UserAvatar } from '../../components/UserAvatar';
import { AuroraGlow } from '../../components/reactbits/AuroraGlow';
import { ShinyText } from '../../components/reactbits/ShinyText';
import { renderContentWithHighlights, timeAgo, isVideoUrl } from '../../utils/textUtils';
import type { User, Post } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit3, Share2 } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser, updateUser } = useAuth();
  const navigate = useNavigate();

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [uploading, setUploading] = useState(false);
  const [showShareProfile, setShowShareProfile] = useState(false);
  const [profileChats, setProfileChats] = useState<any[]>([]);
  const [profileShareError, setProfileShareError] = useState('');
  const [selectedProfileChats, setSelectedProfileChats] = useState<any[]>([]);
  const [sendingProfile, setSendingProfile] = useState(false);

  // Edit Profile Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    avatar_url: '',
    bio: '',
    country: '',
    city: '',
    school: '',
    grade: '',
    goals: '',
    skills: '',
    interests: '',
  });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const targetUsername = username || currentUser?.username;
      if (!targetUsername) return;

      const uData = await api.get<User>(`/users/${targetUsername}`);
      setProfileUser(uData);

      const postsData = await api.get<Post[]>(`/posts?user_id=${uData.id}`);
      setUserPosts(postsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const isOwnProfile = currentUser && profileUser && currentUser.id === profileUser.id;
  const profileShareUrl = `${window.location.origin}/u/${profileUser?.username || username}`;
  const openProfileShare = async () => { setProfileShareError(''); setShowShareProfile(true); try { setProfileChats(await api.get<any[]>('/conversations')); } catch (e: any) { setProfileChats([]); setProfileShareError(e.message || 'Could not load chats.'); } };
  const shareProfileOutside = async () => { try { if (navigator.share) await navigator.share({ title: `${profileUser?.profile?.full_name || profileUser?.username} on EduNexus`, url: profileShareUrl }); else { await navigator.clipboard.writeText(profileShareUrl); alert('Profile link copied!'); } } catch (e: any) { if (e?.name !== 'AbortError') setProfileShareError(e.message || 'Could not share profile.'); } };
  const toggleProfileChat = (chat: any) => setSelectedProfileChats((prev) => prev.some((c) => c.id === chat.id) ? prev.filter((c) => c.id !== chat.id) : [...prev, chat]);
  const confirmProfileChat = async () => { if (!selectedProfileChats.length) return; setSendingProfile(true); try { await Promise.all(selectedProfileChats.map((chat) => api.post(`/conversations/${chat.id}/messages`, { content: `Check out this EduNexus profile: ${profileShareUrl}` }))); setShowShareProfile(false); setSelectedProfileChats([]); alert('Profile shared in chat.'); } catch (e: any) { setProfileShareError(e.message || 'Could not share in chat.'); } finally { setSendingProfile(false); } };

  const handleFollowToggle = async () => {
    if (!profileUser) return;
    try {
      if (profileUser.is_following) {
        await api.delete(`/users/${profileUser.username}/follow`);
      } else {
        await api.post(`/users/${profileUser.username}/follow`);
      }
      fetchProfile();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartMessage = async () => {
    if (!profileUser) return;
    try {
      const conv = await api.post<any>(`/conversations?target_username=${profileUser.username}`);
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

  const openEditModal = () => {
    if (!profileUser) return;
    setEditForm({
      full_name: profileUser.profile?.full_name || '',
      avatar_url: profileUser.profile?.avatar_url || '',
      bio: profileUser.profile?.bio || '',
      country: profileUser.profile?.country || '',
      city: profileUser.profile?.city || '',
      school: profileUser.profile?.school || '',
      grade: profileUser.profile?.grade || '',
      goals: profileUser.profile?.goals || '',
      skills: profileUser.skills ? profileUser.skills.join(', ') : '',
      interests: profileUser.interests ? profileUser.interests.join(', ') : '',
    });
    setShowEditModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        full_name: editForm.full_name,
        avatar_url: editForm.avatar_url || undefined,
        bio: editForm.bio,
        country: editForm.country,
        city: editForm.city,
        school: editForm.school,
        grade: editForm.grade,
        goals: editForm.goals,
        skills: editForm.skills ? editForm.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
        interests: editForm.interests ? editForm.interests.split(',').map((i) => i.trim()).filter(Boolean) : [],
      };

      const updatedUser = await api.patch<User>('/users/me/profile', payload);
      updateUser(updatedUser);
      setProfileUser(updatedUser);
      setShowEditModal(false);
      fetchProfile();
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await uploadFile(file);
      setEditForm({ ...editForm, avatar_url: data.url });
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="py-20 text-center text-xs text-muted-foreground">Loading student profile...</div>
      </AppLayout>
    );
  }

  if (!profileUser) {
    return (
      <AppLayout>
        <div className="py-20 text-center text-xs text-muted-foreground">Student profile not found.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Card Header */}
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl">
          {/* Cover Banner with Aurora Glow */}
          <div className="h-40 bg-gradient-to-r from-[#082515] to-[#103f26] relative p-5 flex justify-between items-start overflow-hidden">
            <AuroraGlow size="full" opacity={0.7} />
            <span className="relative z-10 px-3.5 py-1 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 text-primary text-[9px] font-extrabold uppercase tracking-widest shadow-sm">
              {profileUser.profile?.open_to_collab ? (
                <ShinyText color="var(--primary)">OPEN TO COLLABORATE</ShinyText>
              ) : (
                'STUDENT'
              )}
            </span>

            {isOwnProfile ? (
              <button
                onClick={openEditModal}
                className="px-4 py-2 rounded-xl bg-secondary backdrop-blur-md border border-border text-xs font-bold text-foreground hover:bg-white/10 flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5 text-primary" /> Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleFollowToggle}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    profileUser.is_following
                      ? 'bg-secondary text-muted-foreground border border-border'
                      : 'bg-primary text-primary-foreground hover:bg-secondary'
                  }`}
                >
                  {profileUser.is_following ? 'Following' : 'Follow'}
                </button>
                <button
                  onClick={handleStartMessage}
                  className="px-4 py-2 rounded-xl bg-secondary backdrop-blur-md border border-border text-xs font-bold text-foreground hover:border-primary"
                >
                  Message
                </button>
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="px-6 pb-6 pt-0 relative">
            <button onClick={openProfileShare} className="absolute right-5 top-4 px-4 py-2 rounded-xl bg-secondary border border-border text-xs font-bold text-foreground hover:border-primary flex items-center gap-1.5"><Share2 className="w-3.5 h-3.5 text-primary" /> Share Profile</button>
            <div className="flex items-end justify-between -mt-12 mb-4">
              <UserAvatar
                src={profileUser.profile?.avatar_url}
                username={profileUser.username}
                membership={profileUser.membership}
                size={96}
                className="border-4 border-card bg-secondary shadow-xl z-20"
              />
              <div className="flex gap-6 text-center text-xs">
                <div>
                  <strong className="block text-base text-foreground">{profileUser.followers_count}</strong>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Followers</span>
                </div>
                <div>
                  <strong className="block text-base text-foreground">{profileUser.following_count}</strong>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Following</span>
                </div>
                <div 
                  onClick={() => {
                    setActiveTab('posts');
                    document.getElementById('profile-content-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="cursor-pointer hover:text-primary transition-colors"
                >
                  <strong className="block text-base text-foreground">{userPosts.length}</strong>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Posts</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground uppercase flex items-center gap-2">
                {profileUser.profile?.full_name || profileUser.username}
                <MembershipBadge membership={profileUser.membership} size={20} />
              </h2>
              <p className="text-xs text-primary font-medium">@{profileUser.username}</p>

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-2">
                {profileUser.profile?.school && (
                  <span className="flex items-center gap-1">📍 {profileUser.profile.school}</span>
                )}
                {profileUser.profile?.grade && (
                  <span className="flex items-center gap-1">🎓 {profileUser.profile.grade}</span>
                )}
                {profileUser.profile?.country && (
                  <span className="flex items-center gap-1">🌐 {profileUser.profile.city ? `${profileUser.profile.city}, ` : ''}{profileUser.profile.country}</span>
                )}
              </div>

              {profileUser.profile?.bio && (
                <p className="text-xs text-foreground/90 mt-4 leading-relaxed">{profileUser.profile.bio}</p>
              )}

              {profileUser.profile?.goals && (
                <div className="mt-4 p-3 rounded-xl bg-secondary border border-border text-xs text-muted-foreground">
                  <strong className="text-primary uppercase font-bold block mb-1">Current Ambition & Goals:</strong>
                  {profileUser.profile.goals}
                </div>
              )}

              {/* Skills & Interests Tags */}
              <div className="mt-4 space-y-2">
                {profileUser.skills && profileUser.skills.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Skills:</span>
                    {profileUser.skills.map((sk) => (
                      <span key={sk} className="text-[10px] px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold">
                        {sk}
                      </span>
                    ))}
                  </div>
                )}

                {profileUser.interests && profileUser.interests.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Interests:</span>
                    {profileUser.interests.map((intr) => (
                      <span key={intr} className="text-[10px] px-2.5 py-1 rounded-full bg-secondary border border-border text-muted-foreground font-semibold">
                        {intr}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* User Activity & Posts */}
        <div id="profile-content-tabs" className="space-y-4 pt-4">
          <div className="border-b border-border pb-2 flex gap-4">
            <button
              onClick={() => setActiveTab('posts')}
              className={`text-xs font-bold uppercase pb-2 transition-all ${
                activeTab === 'posts' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
              }`}
            >
              Posts ({userPosts.length})
            </button>
          </div>

          {userPosts.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <p className="text-sm font-bold text-foreground uppercase mb-1">No posts yet</p>
              <p className="text-xs text-muted-foreground">This student hasn't published any posts on the nexus yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userPosts.map((post) => (
                <div key={post.id} className="ui-card p-5 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-foreground">@{post.author_username}</span>
                    <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {post.audience && post.audience !== 'public' && (
                        <span className="px-2 py-0.5 rounded-full border border-dashed border-muted-foreground/40">
                          {post.audience === 'followers' ? 'Followers only' : 'Community'}
                        </span>
                      )}
                      {new Date(post.created_at).toLocaleDateString()} • {timeAgo(post.created_at)}
                    </span>
                  </div>
                  {post.title && <h4 className="text-sm font-bold text-foreground uppercase">{post.title}</h4>}
                  <p className="text-xs text-foreground/90 whitespace-pre-wrap">{renderContentWithHighlights(post.content)}</p>
                  {post.images && post.images.length > 0 && (
                    isVideoUrl(post.images[0]) ? (
                      <div className="rounded-2xl overflow-hidden border border-border/80 bg-black/60 flex items-center justify-center mt-2">
                        <video src={post.images[0]} controls playsInline preload="metadata" className="w-full max-h-[500px] object-contain rounded-2xl bg-black" />
                      </div>
                    ) : (
                      <div className="rounded-2xl overflow-hidden border border-border/80 bg-secondary/30 flex items-center justify-center mt-2">
                        <img src={post.images[0]} alt="Post visual" className="w-full max-h-[500px] object-contain rounded-2xl" loading="lazy" />
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {showShareProfile && <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"><div className="bg-card border border-border rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl"><div className="flex justify-between"><h3 className="font-bold">Share Profile</h3><button onClick={() => { setShowShareProfile(false); setSelectedProfileChats([]); }}>✕</button></div>{profileShareError && <p className="text-xs text-red-500">{profileShareError}</p>}<button onClick={shareProfileOutside} className="w-full button button-ghost">Share outside EduNexus</button><p className="text-[10px] font-bold uppercase text-muted-foreground">Choose one or more chats</p><div className="max-h-56 overflow-y-auto space-y-2">{profileChats.map((chat) => { const person=chat.other_user; const name=chat.is_group ? (chat.name || `Group (${chat.member_count || 0})`) : (person?.profile?.full_name || person?.username || 'Chat'); const selected=selectedProfileChats.some((c) => c.id === chat.id); return <button key={chat.id} onClick={() => toggleProfileChat(chat)} className={`w-full text-left p-3 rounded-xl bg-secondary border text-sm ${selected ? 'border-primary bg-primary/10' : 'border-border'}`}><span className="mr-2">{selected ? '✓' : '○'}</span>{name}<span className="block ml-5 text-[10px] text-muted-foreground">{chat.is_group ? `${chat.member_count || 0} members` : [person?.profile?.school, person?.username && `@${person.username}`].filter(Boolean).join(' · ')}</span></button>; })}</div>{!profileShareError && profileChats.length === 0 && <p className="text-xs text-muted-foreground">No chats found. Start a conversation first.</p>}{selectedProfileChats.length > 0 && <div className="border-t border-border pt-4"><p className="text-sm mb-3">Send this profile to <b>{selectedProfileChats.length} selected chats</b>?</p><div className="flex gap-2"><button onClick={() => setSelectedProfileChats([])} className="button button-ghost flex-1">Cancel</button><button disabled={sendingProfile} onClick={confirmProfileChat} className="button button-primary flex-1">{sendingProfile ? 'Sending…' : 'Send ➤'}</button></div></div>}</div></div>}

        {/* Edit Profile Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground uppercase">Edit Student Profile</h3>
                <button onClick={() => setShowEditModal(false)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Profile Picture</label>
                  <div className="flex items-center gap-4 mb-2">
                    <img 
                      src={editForm.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileUser?.username}`} 
                      className="w-14 h-14 rounded-full border-2 border-border object-cover bg-secondary"
                    />
                    <div className="flex-1">
                      <label className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-secondary border border-border text-xs font-bold text-foreground hover:brightness-110 relative overflow-hidden cursor-pointer transition-all">
                        {uploading ? 'Uploading...' : 'Upload Custom Photo'}
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={uploading} />
                      </label>
                    </div>
                  </div>
                  
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 mt-3">Or Choose an Avatar Style</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    {[
                      // Base username styles
                      ...['adventurer', 'bottts', 'fun-emoji', 'icons', 'micah', 'notionists', 'avataaars', 'shapes'].map(s => `https://api.dicebear.com/7.x/${s}/svg?seed=${profileUser?.username}`),
                      // Extra girl avatars
                      'https://api.dicebear.com/7.x/adventurer/svg?seed=Jocelyn',
                      'https://api.dicebear.com/7.x/lorelei/svg?seed=Sarah',
                      'https://api.dicebear.com/7.x/avataaars/svg?seed=Mia',
                      'https://api.dicebear.com/7.x/notionists/svg?seed=Jessica',
                      'https://api.dicebear.com/7.x/micah/svg?seed=Lily',
                      'https://api.dicebear.com/7.x/lorelei/svg?seed=Chloe'
                    ].map((url, i) => (
                        <img 
                          key={i}
                          src={url}
                          onClick={() => setEditForm({...editForm, avatar_url: url})}
                          className={`w-12 h-12 rounded-full cursor-pointer border-2 bg-secondary flex-shrink-0 transition-all hover:scale-110 ${editForm.avatar_url === url ? 'border-primary' : 'border-transparent hover:border-primary/50'}`}
                        />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Bio</label>
                  <textarea
                    rows={3}
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">School</label>
                    <input
                      type="text"
                      value={editForm.school}
                      onChange={(e) => setEditForm({ ...editForm, school: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Grade / Year</label>
                    <input
                      type="text"
                      value={editForm.grade}
                      onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Country</label>
                    <input
                      type="text"
                      value={editForm.country}
                      onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">City</label>
                    <input
                      type="text"
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Goals & Ambitions</label>
                  <input
                    type="text"
                    value={editForm.goals}
                    onChange={(e) => setEditForm({ ...editForm, goals: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Skills (comma separated)</label>
                  <input
                    type="text"
                    value={editForm.skills}
                    onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                    placeholder="Python, Web Development, UI/UX"
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Interests (comma separated)</label>
                  <input
                    type="text"
                    value={editForm.interests}
                    onChange={(e) => setEditForm({ ...editForm, interests: e.target.value })}
                    placeholder="Artificial Intelligence, Robotics, Research"
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowEditModal(false)} className="button button-ghost flex-1">
                    Cancel
                  </button>
                  <button type="submit" className="button button-primary flex-1">
                    Save Changes
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
