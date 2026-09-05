import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { MembershipBadge } from '../../components/MembershipBadge';
import { UserAvatar } from '../../components/UserAvatar';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import {
  Users, Loader2, Send, Building2, MapPin, Search, MessageSquare,
  Bell, Compass, Share2, Check, UserPlus, ShieldCheck,
  GraduationCap, ArrowRight, Heart, Newspaper,
  UserCheck, Clock
} from 'lucide-react';
import { SchoolAutocompleteInput } from '../../components/SchoolAutocompleteInput';
import { timeAgo } from '../../utils/textUtils';

export const SchoolHubPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [mySchools, setMySchools] = useState<any[]>([]);
  const [activeSchoolId, setActiveSchoolId] = useState<number | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'feed' | 'announcements' | 'clubs'>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [quickSchoolInput, setQuickSchoolInput] = useState(user?.profile?.school || '');
  const [joiningSchool, setJoiningSchool] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [followingMap, setFollowingMap] = useState<Record<number, boolean>>({});

  const activeSchool = mySchools.find((s) => s.id === activeSchoolId) || null;

  const loadSchoolData = useCallback(async (schoolId: number) => {
    setLoadingContent(true);
    try {
      const [membersRes, postsRes, announcementsRes, clubsRes] = await Promise.allSettled([
        api.get<any[]>(`/schools/${schoolId}/members`),
        api.get<any[]>(`/schools/${schoolId}/posts`),
        api.get<any[]>(`/schools/${schoolId}/announcements`),
        api.get<any[]>(`/schools/${schoolId}/clubs`),
      ]);

      if (membersRes.status === 'fulfilled') {
        setMembers(membersRes.value || []);
      } else {
        console.error('Failed to load members', membersRes.reason);
      }

      if (postsRes.status === 'fulfilled') {
        setPosts(postsRes.value || []);
      }

      if (announcementsRes.status === 'fulfilled') {
        setAnnouncements(announcementsRes.value || []);
      }

      if (clubsRes.status === 'fulfilled') {
        setClubs(clubsRes.value || []);
      }
    } catch (e) {
      console.error('Failed to load school hub data', e);
    } finally {
      setLoadingContent(false);
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const mine = await api.get<any[]>('/schools/my');
      setMySchools(mine || []);

      const aid: number | null = mine && mine.length ? mine[0].id : null;
      if (aid) {
        setActiveSchoolId(aid);
        await loadSchoolData(aid);
      } else {
        setActiveSchoolId(null);
      }
    } catch (e) {
      console.error('Failed to load schools', e);
    } finally {
      setLoading(false);
    }
  }, [loadSchoolData]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (user?.profile?.school) {
      setQuickSchoolInput(user.profile.school);
    }
  }, [user]);

  const handleQuickJoinSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSchoolInput.trim()) return;
    setJoiningSchool(true);
    try {
      await api.patch('/users/me/profile', { school: quickSchoolInput.trim() });
      if (refreshUser) await refreshUser();
      await reload();
    } catch (err: any) {
      alert(err.message || 'Failed to update school');
    } finally {
      setJoiningSchool(false);
    }
  };

  const selectSchool = async (id: number) => {
    setActiveSchoolId(id);
    await loadSchoolData(id);
  };

  const messageMember = async (username: string) => {
    try {
      const conv = await api.post<any>(`/conversations?target_username=${username}`);
      navigate(`/app/messages?conv=${conv.id}`);
    } catch (e: any) {
      const msg = e.message || 'Could not start conversation.';
      if (/limit/i.test(msg)) {
        if (confirm(`${msg}\n\nGo to Membership to upgrade?`)) navigate('/app/membership');
      } else {
        alert(msg);
      }
    }
  };

  const handleFollowToggle = async (person: any) => {
    if (!person || !person.id) return;
    setFollowingMap((prev) => ({ ...prev, [person.id]: true }));
    try {
      const res = await api.post<any>(`/users/${person.id}/follow`);
      setMembers((prev) =>
        prev.map((m) =>
          m.user?.id === person.id
            ? {
                ...m,
                user: {
                  ...m.user,
                  follow_status: res.status,
                  is_following: res.status === 'accepted',
                  followers_count:
                    res.status === 'accepted'
                      ? (m.user.followers_count || 0) + 1
                      : res.status === 'none'
                      ? Math.max(0, (m.user.followers_count || 1) - 1)
                      : m.user.followers_count,
                },
              }
            : m
        )
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update follow status');
    } finally {
      setFollowingMap((prev) => ({ ...prev, [person.id]: false }));
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-9 h-9 animate-spin text-primary mx-auto" />
            <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Loading School Hub…</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // If user has no school assigned yet
  if (!mySchools.length) {
    return (
      <AppLayout>
        <div className="max-w-xl mx-auto py-12 px-4 sm:px-6">
          <div className="text-center bg-card p-8 sm:p-10 rounded-3xl border border-border shadow-xl space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center border border-primary/20">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Connect to Your School Hub</h2>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                Join your campus network to see all classmates, connect directly with school peers, view school-only posts, and access extracurricular clubs.
              </p>
            </div>

            <form onSubmit={handleQuickJoinSchool} className="space-y-4 text-left">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground block">
                Enter Your School / Institution
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="flex-1">
                  <SchoolAutocompleteInput
                    value={quickSchoolInput}
                    onChange={(schoolName) => setQuickSchoolInput(schoolName)}
                    placeholder="Search campus, e.g. DPS, Modern School, APS..."
                    inputClassName="w-full bg-secondary border border-border rounded-xl pl-10 pr-10 py-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={joiningSchool || !quickSchoolInput.trim()}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold text-xs hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2 shadow-md shadow-primary/20 cursor-pointer"
                >
                  {joiningSchool ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Join School Hub
                </button>
              </div>
            </form>

            <div className="pt-2 border-t border-border flex items-center justify-center gap-3">
              <button
                onClick={() => navigate('/app/settings')}
                className="text-xs text-muted-foreground hover:text-foreground font-medium underline cursor-pointer"
              >
                Or edit full academic profile in Settings →
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Extract distinct grades from members for filter tabs
  const availableGrades = Array.from(
    new Set(
      members
        .map((m) => m.user?.profile?.grade)
        .filter((g): g is string => Boolean(g && g.trim()))
    )
  );

  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase();
    const name = (m.user?.profile?.full_name || '').toLowerCase();
    const username = (m.user?.username || '').toLowerCase();
    const grade = (m.user?.profile?.grade || '').toLowerCase();
    const skills = (m.user?.skills || []).map((s: string) => s.toLowerCase()).join(' ');

    const matchesSearch = !q || name.includes(q) || username.includes(q) || grade.includes(q) || skills.includes(q);
    const matchesGrade = gradeFilter === 'all' || m.user?.profile?.grade === gradeFilter;

    return matchesSearch && matchesGrade;
  });

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Campus Hub Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-card to-card/60 rounded-3xl border border-border/80 p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 shadow-inner">
                {activeSchool?.logo_url ? (
                  <img src={activeSchool.logo_url} alt={activeSchool.name} className="w-12 h-12 object-contain" />
                ) : (
                  <Building2 className="w-9 h-9 text-primary" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">{activeSchool?.name}</h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Campus
                  </span>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    {activeSchool?.city || activeSchool?.country ? `${activeSchool?.city || ''}${activeSchool?.city && activeSchool?.country ? ', ' : ''}${activeSchool?.country || ''}` : 'Campus Network'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    {members.length} {members.length === 1 ? 'student enrolled' : 'students enrolled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions & School Selector */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {mySchools.length > 1 && (
                <select
                  className="bg-secondary text-foreground border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  value={activeSchoolId || ''}
                  onChange={(e) => selectSchool(Number(e.target.value))}
                >
                  {mySchools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}

              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground text-xs font-semibold border border-border hover:bg-secondary/80 transition-colors cursor-pointer"
                title="Copy Hub Link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Share'}</span>
              </button>

              <button
                onClick={() => navigate('/app/settings')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground text-xs font-semibold border border-border hover:bg-secondary/80 transition-colors cursor-pointer"
                title="Edit Academic Info"
              >
                <span>Edit School</span>
              </button>
            </div>
          </div>
        </div>

        {/* School Hub Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border/70 pb-3 overflow-x-auto no-scrollbar">
          {loadingContent && <Loader2 className="w-4 h-4 animate-spin text-primary mr-1" />}
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'members'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Students & Peers</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'members' ? 'bg-primary-foreground/20' : 'bg-secondary'}`}>
              {members.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('feed')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'feed'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            <span>Campus Feed</span>
            {posts.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'feed' ? 'bg-primary-foreground/20' : 'bg-secondary'}`}>
                {posts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'announcements'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Announcements</span>
            {announcements.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'announcements' ? 'bg-primary-foreground/20' : 'bg-secondary'}`}>
                {announcements.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('clubs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'clubs'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Clubs & Groups</span>
            {clubs.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'clubs' ? 'bg-primary-foreground/20' : 'bg-secondary'}`}>
                {clubs.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: MEMBERS / STUDENT DIRECTORY */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border p-3.5 rounded-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search students by name, @username, grade, skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              {availableGrades.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground hidden sm:inline">Grade:</span>
                  <select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    className="bg-secondary text-foreground border border-border rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-primary"
                  >
                    <option value="all">All Grades</option>
                    {availableGrades.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Students Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMembers.map((m) => {
                const person = m.user;
                if (!person) return null;
                const isMe = person.id === user?.id || person.username === user?.username;
                const isFollowing = person.is_following;
                const isPending = person.follow_status === 'pending';
                const isUpdatingFollow = followingMap[person.id];

                return (
                  <div
                    key={m.id}
                    className="group bg-card p-5 rounded-2xl border border-border hover:border-primary/50 transition-all shadow-sm hover:shadow-md flex flex-col items-center text-center relative"
                  >
                    {/* User Avatar */}
                    <div className="relative mb-3 cursor-pointer" onClick={() => navigate(`/app/profile/${person.username}`)}>
                      <UserAvatar
                        src={person.profile?.avatar_url}
                        username={person.username}
                        size={64}
                        membership={person.membership}
                      />
                    </div>

                    {/* Name & Badge */}
                    <div className="flex items-center justify-center gap-1.5 flex-wrap w-full px-1">
                      <h3
                        onClick={() => navigate(`/app/profile/${person.username}`)}
                        className="font-bold text-sm text-foreground hover:text-primary transition-colors truncate max-w-[150px] cursor-pointer"
                        title={person.profile?.full_name || person.username}
                      >
                        {person.profile?.full_name || person.username}
                      </h3>
                      {person.membership?.active && <MembershipBadge membership={person.membership} size={14} />}
                    </div>

                    {/* Username & Role */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 mb-2">
                      <span>@{person.username}</span>
                      {m.role && m.role !== 'student' && (
                        <span className="px-1.5 py-0.2 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase">
                          {m.role}
                        </span>
                      )}
                    </div>

                    {/* Grade Chip */}
                    {person.profile?.grade && (
                      <div className="mb-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-foreground/80 border border-border">
                          <GraduationCap className="w-3 h-3 text-primary" />
                          {person.profile.grade}
                        </span>
                      </div>
                    )}

                    {/* Bio Snippet */}
                    {person.profile?.bio && (
                      <p className="text-xs text-muted-foreground/90 line-clamp-2 px-1 mb-3">
                        {person.profile.bio}
                      </p>
                    )}

                    {/* Skills Chips */}
                    {person.skills && person.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-center mb-4 max-h-12 overflow-hidden">
                        {person.skills.slice(0, 3).map((skill: string, idx: number) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border"
                          >
                            {skill}
                          </span>
                        ))}
                        {person.skills.length > 3 && (
                          <span className="text-[10px] text-muted-foreground self-center">
                            +{person.skills.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions Row */}
                    <div className="mt-auto w-full pt-3 border-t border-border/60 flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/app/profile/${person.username}`)}
                        className="flex-1 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Profile
                      </button>

                      {!isMe && (
                        <>
                          {/* Follow Button */}
                          <button
                            onClick={() => handleFollowToggle(person)}
                            disabled={isUpdatingFollow}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                              isFollowing
                                ? 'bg-secondary text-foreground border-border hover:border-red-500/50 hover:text-red-500'
                                : isPending
                                ? 'bg-secondary text-muted-foreground border-border'
                                : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-primary-foreground'
                            }`}
                            title={isFollowing ? 'Unfollow' : isPending ? 'Request sent' : 'Follow'}
                          >
                            {isUpdatingFollow ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isFollowing ? (
                              <UserCheck className="w-3.5 h-3.5" />
                            ) : isPending ? (
                              <Clock className="w-3.5 h-3.5" />
                            ) : (
                              <UserPlus className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Message Button */}
                          <button
                            onClick={() => messageMember(person.username)}
                            className="p-1.5 rounded-xl bg-primary text-primary-foreground hover:brightness-110 shadow-sm shadow-primary/20 transition-all cursor-pointer"
                            title={`Message @${person.username}`}
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredMembers.length === 0 && (
              <div className="text-center py-16 bg-card rounded-3xl border border-dashed border-border space-y-3">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/40" />
                <h3 className="text-base font-bold text-foreground">No students matched</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {searchQuery ? 'Try adjusting your search query or grade filter.' : 'Invite your classmates to EduNexus so they appear in your campus hub!'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setGradeFilter('all'); }}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CAMPUS FEED */}
        {activeTab === 'feed' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-card border border-border p-4 rounded-2xl">
              <div>
                <h3 className="font-bold text-sm text-foreground">Campus Feed</h3>
                <p className="text-xs text-muted-foreground">Posts shared by students at {activeSchool?.name}</p>
              </div>
              <button
                onClick={() => navigate('/app/feed')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 transition-all cursor-pointer shadow-sm shadow-primary/20"
              >
                <span>Compose Post</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {posts.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-3xl border border-dashed border-border space-y-3">
                <Newspaper className="w-12 h-12 mx-auto text-muted-foreground/40" />
                <h3 className="text-base font-bold text-foreground">No campus posts yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Be the first to share an update, project, or question with your schoolmates!
                </p>
                <button
                  onClick={() => navigate('/app/feed')}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/20 cursor-pointer"
                >
                  Create First Post
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => navigate(`/p/${post.id}`)}
                    className="bg-card border border-border hover:border-primary/40 rounded-2xl p-5 transition-all cursor-pointer shadow-sm space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        src={post.author_avatar}
                        username={post.author_username}
                        size={40}
                        membership={post.author_membership}
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-foreground">{post.author_name}</span>
                          <span className="text-xs text-muted-foreground">@{post.author_username}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">{timeAgo(post.created_at)}</span>
                      </div>
                    </div>

                    {post.title && <h4 className="font-bold text-base text-foreground">{post.title}</h4>}
                    <p className="text-xs text-foreground/90 whitespace-pre-wrap line-clamp-3 leading-relaxed">
                      {post.content}
                    </p>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-red-500" />
                        {post.likes_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-primary" />
                        {post.comments_count || 0}
                      </span>
                      <span className="text-primary font-semibold hover:underline flex items-center gap-1">
                        View conversation <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-card border border-border p-4 rounded-2xl">
              <div>
                <h3 className="font-bold text-sm text-foreground">Official School Notices</h3>
                <p className="text-xs text-muted-foreground">Important updates and announcements for {activeSchool?.name}</p>
              </div>
            </div>

            {announcements.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-3xl border border-dashed border-border space-y-3">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground/40" />
                <h3 className="text-base font-bold text-foreground">No announcements currently</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Official notices posted by your school ambassadors or admins will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((item) => (
                  <div key={item.id} className="bg-card border border-border rounded-2xl p-5 space-y-2 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                        <Bell className="w-4 h-4 text-primary" />
                        {item.title}
                      </h4>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {timeAgo(item.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {item.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CLUBS */}
        {activeTab === 'clubs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-card border border-border p-4 rounded-2xl">
              <div>
                <h3 className="font-bold text-sm text-foreground">Campus Clubs & Societies</h3>
                <p className="text-xs text-muted-foreground">Extracurricular activities and student organizations</p>
              </div>
            </div>

            {clubs.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-3xl border border-dashed border-border space-y-3">
                <Compass className="w-12 h-12 mx-auto text-muted-foreground/40" />
                <h3 className="text-base font-bold text-foreground">No clubs registered yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Student clubs for debating, robotics, arts, sports, and culture will be listed here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {clubs.map((club) => (
                  <div key={club.id} className="bg-card border border-border rounded-2xl p-5 space-y-3 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-base text-foreground">{club.name}</h4>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                        {club.members_count || 0} members
                      </span>
                    </div>
                    {club.description && (
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {club.description}
                      </p>
                    )}
                    <button
                      onClick={async () => {
                        try {
                          await api.post(`/schools/${activeSchoolId}/clubs/${club.id}/join`);
                          alert('Joined club!');
                          if (activeSchoolId) loadSchoolData(activeSchoolId);
                        } catch (e: any) {
                          alert(e.message || 'Could not join club');
                        }
                      }}
                      className="mt-auto w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:brightness-110 transition-all cursor-pointer"
                    >
                      Join Club
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </AppLayout>
  );
};
