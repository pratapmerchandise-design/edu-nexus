import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { MembershipBadge } from '../../components/MembershipBadge';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import {
  Users, Loader2, Send, Building2, MapPin, Search
} from 'lucide-react';
import { SchoolAutocompleteInput } from '../../components/SchoolAutocompleteInput';

export const SchoolHubPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [mySchools, setMySchools] = useState<any[]>([]);
  const [activeSchoolId, setActiveSchoolId] = useState<number | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickSchoolInput, setQuickSchoolInput] = useState(user?.profile?.school || '');
  const [joiningSchool, setJoiningSchool] = useState(false);

  const activeSchool = mySchools.find((s) => s.id === activeSchoolId) || null;

  const loadMembers = useCallback(async (schoolId: number) => {
    try {
      const membersRes = await api.get<any[]>(`/schools/${schoolId}/members`);
      setMembers(membersRes);
    } catch (e) {
      console.error('Failed to load school members', e);
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const mine = await api.get<any[]>('/schools/my');
      setMySchools(mine);

      const aid: number | null = mine.length ? mine[0].id : null;
      if (aid) {
        setActiveSchoolId(aid);
        await loadMembers(aid);
      } else {
        setActiveSchoolId(null);
      }
    } catch (e) {
      console.error('Failed to load schools', e);
    } finally {
      setLoading(false);
    }
  }, [loadMembers]);

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
    await loadMembers(id);
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

  const viewProfile = (username: string) => {
    navigate(`/app/profile/${username}`);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!mySchools.length) {
    return (
      <AppLayout>
        <div className="max-w-xl mx-auto py-12 px-4 sm:px-6">
          <div className="text-center bg-card p-8 sm:p-10 rounded-3xl border border-border shadow-lg space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center border border-primary/20">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Connect to Your School Hub</h2>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Join your campus network to connect with classmates, message peers, and view what students at your school are posting.
              </p>
            </div>

            <form onSubmit={handleQuickJoinSchool} className="space-y-3 text-left">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground block">
                Enter Your School / Institution
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <SchoolAutocompleteInput
                    value={quickSchoolInput}
                    onChange={(schoolName) => setQuickSchoolInput(schoolName)}
                    placeholder="Search campus, e.g. DPS, Modern School..."
                    inputClassName="w-full bg-secondary border border-border rounded-xl pl-10 pr-10 py-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={joiningSchool || !quickSchoolInput.trim()}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold text-xs hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2 shadow-md shadow-primary/20"
                >
                  {joiningSchool ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Join School Hub
                </button>
              </div>
            </form>

            <div className="pt-2 border-t border-border flex items-center justify-center gap-3">
              <button
                onClick={() => navigate('/app/settings')}
                className="text-xs text-muted-foreground hover:text-foreground font-medium underline"
              >
                Or edit full academic profile in Settings →
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase();
    const name = (m.user?.profile?.full_name || '').toLowerCase();
    const username = (m.user?.username || '').toLowerCase();
    return name.includes(q) || username.includes(q);
  });

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
              {activeSchool?.logo_url ? (
                <img src={activeSchool.logo_url} alt={activeSchool.name} className="w-10 h-10 object-contain" />
              ) : (
                <Building2 className="w-8 h-8 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight mb-1">{activeSchool?.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {activeSchool?.city || 'N/A'}, {activeSchool?.country || 'N/A'}</span>
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {members.length} members</span>
              </div>
            </div>
          </div>
          
          {mySchools.length > 1 && (
            <select
              className="bg-secondary text-secondary-foreground border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-auto"
              value={activeSchoolId || ''}
              onChange={(e) => selectSchool(Number(e.target.value))}
            >
              {mySchools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Directory Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold">Student Directory</h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMembers.map((m) => {
              const person = m.user;
              if (!person) return null;
              const isMe = person.username === user?.username;

              return (
                <div key={m.id} className="group relative bg-card p-4 rounded-xl border border-border hover:border-primary/50 transition-colors flex flex-col items-center text-center">
                  <button onClick={() => viewProfile(person.username)} className="relative mb-3">
                    {person.profile?.avatar_url ? (
                      <img src={person.profile.avatar_url} alt={person.username} className="w-20 h-20 rounded-full object-cover border-2 border-border group-hover:border-primary transition-colors" />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center border-2 border-border group-hover:border-primary transition-colors">
                        <Users className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </button>
                  
                  <h3 className="font-semibold text-foreground truncate w-full px-2" title={person.profile?.full_name || person.username}>
                    {person.profile?.full_name || person.username}
                  </h3>
                  
                  <div className="flex items-center justify-center gap-2 mt-1 mb-2 h-6">
                    <span className="text-sm text-muted-foreground truncate max-w-[120px]">@{person.username}</span>
                    {person.membership?.active && <MembershipBadge membership={person.membership} />}
                  </div>

                  {person.profile?.grade && (
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground mb-4">
                      {person.profile.grade}
                    </span>
                  )}
                  
                  <div className="mt-auto w-full flex gap-2">
                    <button
                      onClick={() => viewProfile(person.username)}
                      className="flex-1 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
                    >
                      Profile
                    </button>
                    {!isMe && (
                      <button
                        onClick={() => messageMember(person.username)}
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                        title="Message"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredMembers.length === 0 && (
            <div className="text-center py-12 bg-secondary/50 rounded-xl border border-dashed border-border">
              <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No students found.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
