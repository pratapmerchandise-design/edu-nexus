import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AppLayout } from '../../components/AppLayout';
import { MembershipBadge } from '../../components/MembershipBadge';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import {
  Award, Users, Calendar, Megaphone, Shield, Check, X, Plus,
  Building2, Loader2, UserPlus, Send, Settings, Trash2, MessageCircle, User as UserIcon, Lock, Mail, Clock
} from 'lucide-react';
import { format } from 'date-fns';

export const SchoolHubPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mySchools, setMySchools] = useState<any[]>([]);
  const [myInvitations, setMyInvitations] = useState<any[]>([]);
  const [activeSchoolId, setActiveSchoolId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'announcements' | 'clubs' | 'events' | 'members' | 'settings' | 'roles'>('dashboard');
  const [loading, setLoading] = useState(true);

  const [clubs, setClubs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [sentInvitations, setSentInvitations] = useState<any[]>([]);

  // Modals
  const [showManage, setShowManage] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [modal, setModal] = useState<null | 'announcement' | 'club' | 'event'>(null);

  // Forms
  const [newRole, setNewRole] = useState({ name: '', description: '', color: '#22e079', permissions: {} as Record<string, boolean> });
  const [editingRole, setEditingRole] = useState<any>(null);
  const [suggest, setSuggest] = useState({ name: '', contact_email: '', city: '', country: '' });
  const [inviteForm, setInviteForm] = useState({ username_or_email: '', role: 'student' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCandidates, setInviteCandidates] = useState<any[]>([]);
  const [selectedInvitees, setSelectedInvitees] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', content: '', description: '', event_type: 'activity', event_date: '' });

  const activeSchool = mySchools.find((s) => s.id === activeSchoolId) || null;
  const myMembership = members.find((m) => Number(m.user_id ?? m.user?.id) === Number(user?.id) || m.user?.username === user?.username);
  const myRole = myMembership?.role;
  const normalizedRole = String(myRole || '').toLowerCase();
  const isAdmin = normalizedRole === 'admin' || normalizedRole === 'ambassador' || String(user?.role || '').toLowerCase() === 'admin';

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const loadSchoolData = useCallback(async (schoolId: number) => {
    const u = userRef.current;
    try {
      const [clubsRes, eventsRes, annRes, membersRes] = await Promise.all([
        api.get<any[]>(`/schools/${schoolId}/clubs`),
        api.get<any[]>(`/schools/${schoolId}/events`),
        api.get<any[]>(`/schools/${schoolId}/announcements`),
        api.get<any[]>(`/schools/${schoolId}/members`),
      ]);
      setClubs(clubsRes);
      setEvents(eventsRes);
      setAnnouncements(annRes);
      setMembers(membersRes);

      const admin = String(u?.role || '').toLowerCase() === 'admin' || membersRes.some((m: any) => (Number(m.user_id ?? m.user?.id) === Number(u?.id) || m.user?.username === u?.username) && ['admin', 'ambassador'].includes(String(m.role || '').toLowerCase()));
      if (admin) {
        try {
          const [r, sentInv] = await Promise.all([
            api.get<any[]>(`/schools/${schoolId}/roles`).catch(() => []),
            api.get<any[]>(`/schools/${schoolId}/invitations`).catch(() => []),
          ]);
          setRoles(r.length ? r : [
            { id: 'system-admin', name: 'admin', description: 'Full school management access', is_system: true, permissions: { manage_members: true, manage_content: true, manage_roles: true } },
            { id: 'system-ambassador', name: 'ambassador', description: 'Helps with school activities and content', is_system: true, permissions: { manage_content: true } },
            { id: 'system-student', name: 'student', description: 'Regular school member', is_system: true, permissions: {} },
          ]);
          setSentInvitations(sentInv);
        } catch {
          setRoles([
            { id: 'system-admin', name: 'admin', description: 'Full school management access', is_system: true, permissions: { manage_members: true, manage_content: true, manage_roles: true } },
            { id: 'system-ambassador', name: 'ambassador', description: 'Helps with school activities and content', is_system: true, permissions: { manage_content: true } },
            { id: 'system-student', name: 'student', description: 'Regular school member', is_system: true, permissions: {} },
          ]);
          setSentInvitations([]);
        }
      }
    } catch (e) {
      console.error('Failed to load school data', e);
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [mine, invites] = await Promise.all([
        api.get<any[]>('/schools/my'),
        api.get<any[]>('/schools/my-invitations').catch(() => []),
      ]);
      setMySchools(mine);
      setMyInvitations(invites);

      const aid: number | null = mine.length ? mine[0].id : null;
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

  const selectSchool = async (id: number) => {
    setActiveSchoolId(id);
    setActiveTab('dashboard');
    await loadSchoolData(id);
  };

  const handleAcceptInvite = async (inviteId: number) => {
    try {
      await api.post(`/schools/invitations/${inviteId}/accept`);
      alert('Invitation accepted! Welcome to the school hub.');
      await reload();
    } catch (e: any) {
      alert(e.message || 'Failed to accept invitation.');
    }
  };

  const handleDeclineInvite = async (inviteId: number) => {
    if (!confirm('Are you sure you want to decline this invitation?')) return;
    try {
      await api.post(`/schools/invitations/${inviteId}/decline`);
      setMyInvitations((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (e: any) {
      alert(e.message || 'Failed to decline invitation.');
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSchoolId || !inviteForm.username_or_email.trim()) return;
    setInviteLoading(true);
    try {
      await api.post(`/schools/${activeSchoolId}/invitations`, inviteForm);
      setInviteForm({ username_or_email: '', role: 'student' });
      setShowInviteModal(false);
      alert('Invitation sent successfully!');
      if (activeSchoolId) {
        const sentInv = await api.get<any[]>(`/schools/${activeSchoolId}/invitations`).catch(() => []);
        setSentInvitations(sentInv);
      }
    } catch (e: any) {
      alert(e.message || 'Failed to send invitation.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCancelSentInvitation = async (inviteId: number) => {
    if (!activeSchoolId) return;
    if (!confirm('Cancel this pending invitation?')) return;
    try {
      await api.delete(`/schools/${activeSchoolId}/invitations/${inviteId}`);
      setSentInvitations((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (e: any) {
      alert(e.message || 'Could not cancel invitation.');
    }
  };

  const submitSuggest = async () => {
    if (!suggest.name.trim()) return;
    try {
      await api.post('/schools/suggestions', suggest);
      setShowSuggest(false);
      setSuggest({ name: '', contact_email: '', city: '', country: '' });
      alert('Thanks! Your school suggestion has been sent to our team.');
    } catch (e: any) {
      alert(e.message || 'Failed to submit suggestion.');
    }
  };

  const openModal = (type: 'announcement' | 'club' | 'event') => {
    setForm({ title: '', content: '', description: '', event_type: 'activity', event_date: '' });
    setModal(type);
  };

  const submitModal = async () => {
    if (!activeSchoolId) return;
    try {
      if (modal === 'announcement') {
        await api.post(`/schools/${activeSchoolId}/announcements`, { title: form.title, content: form.content });
        const annRes = await api.get<any[]>(`/schools/${activeSchoolId}/announcements`);
        setAnnouncements(annRes);
      } else if (modal === 'club') {
        await api.post(`/schools/${activeSchoolId}/clubs`, { name: form.title, description: form.description });
        const clubsRes = await api.get<any[]>(`/schools/${activeSchoolId}/clubs`);
        setClubs(clubsRes);
      } else if (modal === 'event') {
        await api.post(`/schools/${activeSchoolId}/events`, {
          title: form.title,
          description: form.description,
          event_type: form.event_type,
          event_date: form.event_date ? new Date(form.event_date).toISOString() : null,
        });
        const eventsRes = await api.get<any[]>(`/schools/${activeSchoolId}/events`);
        setEvents(eventsRes);
      }
      setModal(null);
    } catch (e: any) {
      alert(e.message || 'Failed to create.');
    }
  };

  const joinClub = async (clubId: number) => {
    if (!activeSchoolId) return;
    try {
      await api.post(`/schools/${activeSchoolId}/clubs/${clubId}/join`);
      const clubsRes = await api.get<any[]>(`/schools/${activeSchoolId}/clubs`);
      setClubs(clubsRes);
    } catch (e: any) {
      alert(e.message || 'Could not join club.');
    }
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
  const openInvite = async () => { setShowInviteModal(true); if (activeSchoolId) setInviteCandidates(await api.get<any[]>(`/schools/${activeSchoolId}/invite-candidates`).catch(() => [])); };
  const toggleInvitee = (person: any) => setSelectedInvitees((prev) => prev.some((p) => p.id === person.id) ? prev.filter((p) => p.id !== person.id) : [...prev, person]);
  const sendSelectedInvites = async () => { if (!activeSchoolId || !selectedInvitees.length) return; setInviteLoading(true); try { await Promise.all(selectedInvitees.map((p) => api.post(`/schools/${activeSchoolId}/invitations`, { username_or_email: p.username, role: inviteForm.role }))); alert(`${selectedInvitees.length} invitation(s) sent.`); setSelectedInvitees([]); setShowInviteModal(false); } catch (e: any) { alert(e.message || 'Could not send invitations.'); } finally { setInviteLoading(false); } };

  const createRole = async () => {
    if (!activeSchoolId || !newRole.name.trim()) return;
    try {
      await api.post(`/schools/${activeSchoolId}/roles`, newRole);
      setNewRole({ name: '', description: '', color: '#22e079', permissions: {} });
      const r = await api.get<any[]>(`/schools/${activeSchoolId}/roles`);
      setRoles(r);
    } catch (e: any) {
      alert(e.message || 'Could not create role.');
    }
  };
  const saveEditedRole = async () => { if (!activeSchoolId || !editingRole) return; try { const updated = await api.patch(`/schools/${activeSchoolId}/roles/${editingRole.id}`, editingRole); setRoles((prev) => prev.map((r) => r.id === editingRole.id ? updated : r)); setEditingRole(null); } catch (e: any) { alert(e.message || 'Could not update role'); } };

  const assignRole = async (userId: number, role: string) => {
    if (!activeSchoolId) return;
    try {
      await api.put(`/schools/${activeSchoolId}/members/${userId}/role`, { role });
      await loadSchoolData(activeSchoolId);
    } catch (e: any) {
      alert(e.message || 'Could not update role.');
    }
  };

  const removeMember = async (userId: number) => {
    if (!activeSchoolId) return;
    if (!confirm('Remove this member from the school?')) return;
    try {
      await api.delete(`/schools/${activeSchoolId}/members/${userId}`);
      await loadSchoolData(activeSchoolId);
    } catch (e: any) {
      alert(e.message || 'Could not remove member.');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="py-24 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading School Hub...</p>
        </div>
      </AppLayout>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Award },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'clubs', label: 'Clubs', icon: Users },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'members', label: 'Members', icon: Shield },
    ...(isAdmin ? [{ id: 'roles' as const, label: 'Roles & Access', icon: Settings }] : []),
    ...(isAdmin ? [{ id: 'settings' as const, label: 'Admin Settings', icon: Settings }] : []),
  ] as const;

  // =========================================================================
  // STATE 1: User is NOT a member of any school
  // =========================================================================
  if (!activeSchool) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Pending Invitations Section (If Any) */}
          {myInvitations.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-primary/10 border border-primary/20 rounded-3xl p-6 md:p-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 text-primary">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Pending School Invitations</h2>
                    <p className="text-xs text-muted-foreground">You have been invited by school administrators to join their official school hub.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myInvitations.map((inv) => (
                  <div key={inv.id} className="bg-card border border-border rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:border-primary/40 transition-all">
                    <div>
                      <div className="flex items-start gap-3.5 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 overflow-hidden">
                          {inv.school?.logo_url ? (
                            <img src={inv.school.logo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Building2 className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-foreground text-sm leading-snug truncate">{inv.school?.name || 'School Hub'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{inv.school?.description || 'Official school collaboration hub.'}</p>
                        </div>
                      </div>

                      <div className="space-y-1.5 bg-secondary/50 p-3 rounded-xl border border-border mb-4 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground text-[11px]">Role Offered:</span>
                          <span className="font-bold text-primary capitalize text-[11px] bg-primary/10 px-2 py-0.5 rounded-md">{inv.role}</span>
                        </div>
                        {inv.invited_by && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-[11px]">Invited By:</span>
                            <span className="text-foreground font-medium text-[11px]">@{inv.invited_by.username}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground text-[11px]">Date:</span>
                          <span className="text-muted-foreground text-[11px]">{format(new Date(inv.created_at), 'PPP')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-border">
                      <button
                        onClick={() => handleDeclineInvite(inv.id)}
                        className="flex-1 py-2 px-3 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" /> Decline
                      </button>
                      <button
                        onClick={() => handleAcceptInvite(inv.id)}
                        className="flex-1 py-2 px-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept & Join
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Private Invite-Only Hub Screen */
            <div className="bg-card border border-border rounded-3xl p-8 md:p-12 text-center shadow-sm space-y-5">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto border border-primary/20 text-primary">
                <Lock className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Private School Hub</h2>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  School Hubs on Edu Nexus are private and managed directly by each institution. To prevent confusion and misuse, access is invite-only.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 bg-secondary/80 border border-border px-4 py-2 rounded-xl text-xs text-muted-foreground">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  Logged in as <strong className="text-foreground">@{user?.username}</strong> ({user?.email}). Invitations sent by your school administrator will automatically appear here.
                </span>
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  onClick={() => setShowSuggest(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs transition-all hover:border-primary/50 shadow-sm"
                >
                  <Plus className="w-4 h-4 text-primary" /> My school isn't registered on Edu Nexus? Suggest School
                </button>
              </div>
            </div>
          )}

          {showSuggest && (
            <SuggestModal suggest={suggest} setSuggest={setSuggest} onClose={() => setShowSuggest(false)} onSubmit={submitSuggest} />
          )}
        </div>
      </AppLayout>
    );
  }

  // =========================================================================
  // STATE 2: User is a Member of at least one School
  // =========================================================================
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Pending Invites Alert for other schools */}
        {myInvitations.length > 0 && (
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/30 shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">You have {myInvitations.length} pending school invitation(s)</p>
                <p className="text-[11px] text-muted-foreground">You've been invited to join {myInvitations.map((i) => i.school?.name).filter(Boolean).join(', ')}.</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {myInvitations.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => handleAcceptInvite(inv.id)}
                  className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:opacity-90 transition-all flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> Accept {inv.school?.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Multi-School Switcher (if member of multiple) */}
        {mySchools.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {mySchools.map((s) => (
              <button
                key={s.id}
                onClick={() => selectSchool(s.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  s.id === activeSchoolId
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        {/* School Header */}
        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-5 min-w-0">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-2xl flex items-center justify-center border-2 border-primary overflow-hidden shrink-0">
              {activeSchool.logo_url ? (
                <img src={activeSchool.logo_url} alt={activeSchool.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-8 h-8 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground truncate">{activeSchool.name}</h1>
                {isAdmin && (
                  <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-xs line-clamp-2 max-w-xl">{activeSchool.description || 'Official verified school hub.'}</p>
            </div>
          </div>

          {/* School Admin Actions */}
          {isAdmin && (
            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 transition-all"
              >
                <UserPlus className="w-4 h-4" /> Invite Member
              </button>
              <button
                onClick={() => setShowManage(true)}
                className="flex items-center justify-center p-2.5 rounded-xl bg-secondary border border-border hover:bg-secondary/80 text-foreground text-xs font-semibold transition-all"
                title="School Settings & Roles"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-2 border-b border-border pb-px scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
                  isActive ? 'border-primary text-foreground font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard icon={Users} label="Total Members" value={members.length} />
                <StatCard icon={Users} label="Active Clubs" value={clubs.length} />
                <StatCard icon={Calendar} label="Upcoming Events" value={events.length} />
              </div>

              {/* Pending Sent Invitations (Admin only) */}
              {isAdmin && sentInvitations.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                      <Mail className="w-4 h-4 text-primary" /> Pending Invitations ({sentInvitations.length})
                    </h3>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Invite More
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    {sentInvitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-3 bg-secondary/60 rounded-xl border border-border text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                            {inv.user?.username ? inv.user.username[0].toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{inv.user?.profile?.full_name || inv.user?.username}</p>
                            <p className="text-[11px] text-muted-foreground">@{inv.user?.username} • Invited as <span className="capitalize font-medium text-primary">{inv.role}</span></p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCancelSentInvitation(inv.id)}
                          className="px-2.5 py-1 text-red-400 hover:bg-red-500/10 border border-red-500/20 rounded-lg transition-colors text-[11px] font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {announcements.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-primary">Latest School Announcement</h3>
                  <h4 className="text-base font-bold text-foreground">{announcements[0].title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{announcements[0].content}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'announcements' && (
            <div className="space-y-4">
              {isAdmin && (
                <div className="flex justify-end">
                  <button
                    onClick={() => openModal('announcement')}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 transition-all"
                  >
                    <Plus className="w-4 h-4" /> New Announcement
                  </button>
                </div>
              )}
              {announcements.length === 0 ? (
                <div className="text-center text-muted-foreground py-16 bg-card rounded-3xl border border-border text-xs">
                  No announcements published yet.
                </div>
              ) : (
                announcements.map((ann) => (
                  <div key={ann.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-foreground">{ann.title}</h3>
                      <span className="text-[11px] text-muted-foreground">{format(new Date(ann.created_at), 'PPP')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{ann.content}</p>
                    {ann.author && <p className="text-[11px] text-primary pt-2">By {ann.author.profile?.full_name || ann.author.username}</p>}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'clubs' && (
            <div className="space-y-4">
              {isAdmin && (
                <div className="flex justify-end">
                  <button
                    onClick={() => openModal('club')}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 transition-all"
                  >
                    <Plus className="w-4 h-4" /> Create Club
                  </button>
                </div>
              )}
              {clubs.length === 0 ? (
                <div className="text-center text-muted-foreground py-16 bg-card rounded-3xl border border-border text-xs">
                  No clubs registered yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clubs.map((club) => {
                    const joined = club.members?.some((m: any) => Number(m.user_id ?? m.user?.id) === Number(user?.id)) || false;
                    return (
                      <div key={club.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-3.5 mb-3">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shrink-0">
                              <Users className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-bold text-sm text-foreground leading-tight">{club.name}</h3>
                              <p className="text-xs text-muted-foreground">{club.members_count || 0} Members</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{club.description || 'Active school student organization'}</p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
                          <span className="text-[11px] text-muted-foreground">Club Hub</span>
                          <button
                            onClick={() => !joined && joinClub(club.id)}
                            className={`text-xs font-bold transition-colors ${joined ? 'text-muted-foreground' : 'text-primary hover:underline'}`}
                          >
                            {joined ? '✓ Joined' : '+ Join Club'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <div className="space-y-4">
              {isAdmin && (
                <div className="flex justify-end">
                  <button
                    onClick={() => openModal('event')}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 transition-all"
                  >
                    <Plus className="w-4 h-4" /> Post Event
                  </button>
                </div>
              )}
              {events.length === 0 ? (
                <div className="text-center text-muted-foreground py-16 bg-card rounded-3xl border border-border text-xs">
                  No upcoming events scheduled.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {events.map((event) => (
                    <div key={event.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-5 items-start">
                      <div className="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 bg-primary/10 rounded-xl border border-primary/20">
                        <span className="text-[10px] font-bold text-primary uppercase">{event.event_date ? format(new Date(event.event_date), 'MMM') : 'TBA'}</span>
                        <span className="text-xl font-black text-foreground">{event.event_date ? format(new Date(event.event_date), 'dd') : ''}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                            {event.event_type}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-foreground mb-1">{event.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'roles' && isAdmin && editingRole && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><div className="bg-card border border-border rounded-2xl p-5 w-full max-w-md space-y-4"><div className="flex justify-between"><h3 className="font-bold">Edit {editingRole.name} role</h3><button onClick={() => setEditingRole(null)}>✕</button></div><input value={editingRole.name} disabled={editingRole.name.toLowerCase() === 'admin'} onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })} className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm"/><div className="space-y-2">{[['manage_content','Moderate content'],['invite_members','Invite members'],['manage_events','Manage events'],['manage_clubs','Manage clubs']].map(([key,label]) => <label key={key} className="block text-sm"><input type="checkbox" checked={!!editingRole.permissions?.[key]} onChange={(e) => setEditingRole({ ...editingRole, permissions: { ...editingRole.permissions, [key]: e.target.checked } })}/> <span className="ml-2">{label}</span></label>)}</div><div className="flex gap-2"><button onClick={() => setEditingRole(null)} className="button button-ghost flex-1">Cancel</button><button onClick={saveEditedRole} className="button button-primary flex-1">Save changes</button></div></div></div>}
          {activeTab === 'settings' && isAdmin && (
            <div className="bg-card border border-border rounded-3xl p-6 space-y-5"><div><h2 className="text-lg font-bold">School Admin Settings</h2><p className="text-xs text-muted-foreground mt-1">These controls affect how {activeSchool.name} appears and operates for students.</p></div><div className="grid md:grid-cols-2 gap-3"><div className="p-4 rounded-2xl bg-secondary border border-border"><p className="font-bold text-sm">School identity</p><p className="text-xs text-muted-foreground mt-1">School name, logo, description, location, and official contact details.</p></div><div className="p-4 rounded-2xl bg-secondary border border-border"><p className="font-bold text-sm">Member access</p><p className="text-xs text-muted-foreground mt-1">Invitations, roles, ambassadors, and removing members.</p></div><div className="p-4 rounded-2xl bg-secondary border border-border"><p className="font-bold text-sm">Content moderation</p><p className="text-xs text-muted-foreground mt-1">Review reports and keep bullying, harassment, spam, and personal-information posts out of the school community.</p></div><div className="p-4 rounded-2xl bg-secondary border border-border"><p className="font-bold text-sm">Student visibility</p><p className="text-xs text-muted-foreground mt-1">Students see the school profile, announcements, clubs, events, members, and school feed. They never see these admin controls.</p></div></div><div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-xs text-primary"><b>Admin role:</b> You are managing {activeSchool.name}. Platform-wide users, payments, and global moderation remain controlled by EduNexus Platform Admins.</div></div>
          )}

          {activeTab === 'roles' && isAdmin && <div className="mb-4 bg-card border border-border rounded-xl p-3 flex items-center gap-2"><b className="text-xs">Edit role:</b><select onChange={(e) => setEditingRole(roles.find((r) => String(r.id) === e.target.value))} className="bg-secondary border border-border rounded-xl px-3 py-2 text-xs"><option value="">Choose Ambassador, Student, or custom role</option>{roles.filter((r) => r.name.toLowerCase() !== 'admin').map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>}
          {activeTab === 'roles' && isAdmin && (
            <div className="space-y-4"><div><h2 className="text-lg font-bold">Roles &amp; Access</h2><p className="text-xs text-muted-foreground mt-1">See what every role can do and who currently holds it. Custom roles never receive administrator authority.</p></div>{roles.map((role) => { const roleMembers = members.filter((member) => String(member.role).toLowerCase() === String(role.name).toLowerCase()); const permissions = Object.entries(role.permissions || {}).filter(([, enabled]) => enabled).map(([key]) => key.replaceAll('_', ' ')); return <div key={role.id} className="bg-card border border-border rounded-2xl p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-foreground capitalize">{role.name}</h3><p className="text-xs text-muted-foreground mt-1">{role.description || (role.is_system ? 'Built-in school role' : 'Custom school role')}</p></div><span className="text-xs font-bold text-primary">{roleMembers.length} member{roleMembers.length === 1 ? '' : 's'}</span></div><div className="flex flex-wrap gap-2 mt-4">{permissions.length ? permissions.map((permission) => <span key={permission} className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] text-primary font-semibold capitalize">{permission}</span>) : <span className="text-[10px] text-muted-foreground">No management permissions</span>}</div><div className="border-t border-border mt-4 pt-3 space-y-2">{roleMembers.length ? roleMembers.map((member) => <div key={member.id} className="flex items-center gap-2 text-xs"><UserIcon className="w-4 h-4 text-primary"/><span className="font-semibold">{member.user?.profile?.full_name || member.user?.username}</span><span className="text-muted-foreground">@{member.user?.username}</span></div>) : <p className="text-[11px] text-muted-foreground">No members assigned to this role.</p>}</div></div>})}</div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-4">
              {isAdmin && (
                <div className="flex justify-end gap-2">
                  <button
                    onClick={openInvite}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 transition-all"
                  >
                    <UserPlus className="w-4 h-4" /> Invite Member
                  </button>
                  <button
                    onClick={() => setShowManage(true)}
                    className="flex items-center gap-2 bg-secondary border border-border hover:bg-secondary/80 text-foreground px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                  >
                    <Settings className="w-4 h-4" /> Manage School & Roles
                  </button>
                </div>
              )}
              {members.length === 0 ? (
                <div className="text-center text-muted-foreground py-16 bg-card rounded-3xl border border-border text-xs">
                  No members yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {members.map((m) => (
                    <div key={m.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                      <img
                        src={m.user?.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.user?.username}`}
                        alt=""
                        className="w-10 h-10 rounded-full border border-border object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-foreground truncate flex items-center gap-1.5">
                          {m.user?.profile?.full_name || m.user?.username}
                          <MembershipBadge membership={m.user?.membership} size={13} />
                        </p>
                        <p className="text-[11px] text-muted-foreground capitalize flex items-center gap-1">
                          {m.role === 'admin' || m.role === 'ambassador' ? (
                            <span className="text-primary font-semibold">{m.role}</span>
                          ) : (
                            m.role
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => navigate(`/app/profile/${m.user?.username}`)}
                          title="View profile"
                          className="p-1.5 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                        >
                          <UserIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => messageMember(m.user?.username)}
                          title="Message"
                          className="p-1.5 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Invite Member Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowInviteModal(false)}>
            <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-primary" /> Invite to {activeSchool?.name}
                </h3>
                <button onClick={() => setShowInviteModal(false)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the username or email address of the student or teacher. They will receive an invitation in their School Hub.
              </p>
              {inviteCandidates.length > 0 && <div className="max-h-48 overflow-y-auto space-y-2">{inviteCandidates.map((person) => { const selected = selectedInvitees.some((p) => p.id === person.id); return <button type="button" key={person.id} onClick={() => toggleInvitee(person)} className={`w-full text-left p-3 rounded-xl border ${selected ? 'border-primary bg-primary/10' : 'border-border bg-secondary'}`}><span className="mr-2">{selected ? '✓' : '○'}</span><b>{person.profile?.full_name || person.username}</b><span className="block ml-5 text-[10px] text-muted-foreground">@{person.username} · {person.profile?.school}</span></button>; })}</div>}
              {selectedInvitees.length > 0 && <p className="text-xs text-primary font-bold">{selectedInvitees.length} selected</p>}
              <form onSubmit={selectedInvitees.length ? (e) => { e.preventDefault(); sendSelectedInvites(); } : handleSendInvitation} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Username or Email *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. aarav_mehta or student@school.edu"
                    value={inviteForm.username_or_email}
                    onChange={(e) => setInviteForm({ ...inviteForm, username_or_email: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Assign Role</label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="student">Student</option>
                    <option value="ambassador">Ambassador</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-5 flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
                  >
                    {inviteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Send Invitation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Action Modal (Announcement/Club/Event) */}
        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setModal(null)}>
            <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold capitalize text-foreground">New {modal}</h3>
                <button onClick={() => setModal(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
              </div>
              <div className="space-y-3">
                <input
                  placeholder={modal === 'club' ? 'Club Name' : 'Title'}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
                <textarea
                  placeholder="Detailed description..."
                  value={form.description || form.content}
                  onChange={(e) => setForm(modal === 'announcement' ? { ...form, content: e.target.value } : { ...form, description: e.target.value })}
                  rows={4}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
                {modal === 'event' && (
                  <>
                    <select
                      value={form.event_type}
                      onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value="activity">Activity</option>
                      <option value="competition">Competition</option>
                      <option value="workshop">Workshop</option>
                      <option value="social">Social</option>
                    </select>
                    <input
                      type="datetime-local"
                      value={form.event_date}
                      onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                  </>
                )}
              </div>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setModal(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={submitModal}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:opacity-90 transition-all"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manage School & Roles Modal */}
        {showManage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowManage(false)}>
            <div className="w-full max-w-2xl bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto scrollbar-thin" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" /> Manage {activeSchool?.name}
                </h3>
                <button onClick={() => setShowManage(false)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
              </div>

              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-xs text-primary"><b>Admin governance:</b> {members.filter((m) => String(m.role).toLowerCase() === 'admin').length}/3 school-admin seats used. Custom roles can organize members but can never become admins or receive admin permissions. A fourth admin requires approval from the EduNexus Platform Admin.</div>

              {/* Pending Invitations Management */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Pending Invitations ({sentInvitations.length})</h4>
                  <button
                    onClick={() => { setShowManage(false); openInvite(); }}
                    className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Send Invite
                  </button>
                </div>
                {sentInvitations.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground bg-secondary/30 p-3 rounded-xl border border-border">No pending invitations.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin pr-1">
                    {sentInvitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-2.5 bg-secondary/50 border border-border rounded-xl text-xs">
                        <div>
                          <p className="font-semibold text-foreground">{inv.user?.profile?.full_name || inv.user?.username}</p>
                          <p className="text-[10px] text-muted-foreground">@{inv.user?.username} • Role: <span className="text-primary font-medium">{inv.role}</span></p>
                        </div>
                        <button
                          onClick={() => handleCancelSentInvitation(inv.id)}
                          className="px-2.5 py-1 text-red-400 hover:bg-red-500/10 border border-red-500/20 rounded-lg text-[11px]"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Roles */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Create a role and choose its permissions</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {roles.length === 0 && <span className="text-[11px] text-muted-foreground">No custom roles yet.</span>}
                  {roles.map((r) => (
                    <span key={r.id} className="text-[11px] font-semibold px-2.5 py-1 rounded-full border" style={{ color: r.color, borderColor: r.color }}>
                      {r.name}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    placeholder="New role name (e.g. Club Lead)"
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                    className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  />
                  <div className="flex-1 rounded-xl bg-secondary border border-border px-3 py-2"><p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Permissions</p><div className="flex flex-wrap gap-x-3 gap-y-1">{[['manage_content','Moderate content'],['invite_members','Invite members'],['manage_events','Manage events'],['manage_clubs','Manage clubs']].map(([key,label]) => <label key={key} className="text-[10px] text-foreground flex items-center gap-1"><input type="checkbox" checked={!!newRole.permissions[key]} onChange={(e) => setNewRole({ ...newRole, permissions: { ...newRole.permissions, [key]: e.target.checked } })} />{label}</label>)}</div><p className="text-[9px] text-muted-foreground mt-1">Admin access cannot be granted through custom roles.</p></div>
                  <button
                    onClick={createRole}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 inline" /> Add
                  </button>
                </div>
              </div>

              {/* Member Roles */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Assign or revoke member access</h4>
                <p className="text-[10px] text-muted-foreground mb-2">Changing a member to Student removes staff permissions. Admin is reserved for up to three school administrators.</p>
                <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin pr-1">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 bg-secondary/50 border border-border rounded-xl p-2.5">
                      <img
                        src={m.user?.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.user?.username}`}
                        alt=""
                        className="w-8 h-8 rounded-full border border-border object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs text-foreground truncate flex items-center gap-1.5">{m.user?.profile?.full_name || m.user?.username}
                          <MembershipBadge membership={m.user?.membership} size={13} />
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">@{m.user?.username}</p>
                      </div>
                      <select
                        value={m.role}
                        onChange={(e) => assignRole(m.user_id, e.target.value)}
                        disabled={m.user?.role === 'admin' || (String(m.role).toLowerCase() === 'admin' && m.user_id !== user?.id && user?.role !== 'admin')}
                        className="bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                      >
                        {['admin', 'ambassador', 'student', ...roles.filter((r) => !r.is_system).map((r) => r.name)].map((rn) => (
                          <option key={rn} value={rn}>{rn}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeMember(m.user_id)}
                        disabled={m.user?.role === 'admin' || (String(m.role).toLowerCase() === 'admin' && m.user_id !== user?.id && user?.role !== 'admin')}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Suggest Modal */}
        {showSuggest && (
          <SuggestModal suggest={suggest} setSuggest={setSuggest} onClose={() => setShowSuggest(false)} onSubmit={submitSuggest} />
        )}
      </div>
    </AppLayout>
  );
};

const StatCard: React.FC<{ icon: any; label: string; value: number }> = ({ icon: Icon, label, value }) => (
  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
    <div className="flex items-center gap-3 text-muted-foreground mb-2">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
        <Icon className="w-4 h-4" />
      </div>
      <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
    <div className="text-2xl font-bold text-foreground pl-1">{value}</div>
  </div>
);

const SuggestModal: React.FC<{
  suggest: any;
  setSuggest: React.Dispatch<React.SetStateAction<any>>;
  onClose: () => void;
  onSubmit: () => void;
}> = ({ suggest, setSuggest, onClose, onSubmit }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
    <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="text-base font-bold text-foreground">Suggest Your School</h3>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
      </div>
      <p className="text-xs text-muted-foreground">We will verify and add your institution so students can collaborate.</p>
      <div className="space-y-3">
        <input
          type="text"
          placeholder="School / College Name"
          value={suggest.name}
          onChange={(e) => setSuggest({ ...suggest, name: e.target.value })}
          className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
        />
        <input
          type="email"
          placeholder="Official Contact / Principal Email (optional)"
          value={suggest.contact_email}
          onChange={(e) => setSuggest({ ...suggest, contact_email: e.target.value })}
          className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="City"
            value={suggest.city}
            onChange={(e) => setSuggest({ ...suggest, city: e.target.value })}
            className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
          />
          <input
            type="text"
            placeholder="Country"
            value={suggest.country}
            onChange={(e) => setSuggest({ ...suggest, country: e.target.value })}
            className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 px-4 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs transition-all"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" /> Submit Suggestion
        </button>
      </div>
    </div>
  </div>
);
