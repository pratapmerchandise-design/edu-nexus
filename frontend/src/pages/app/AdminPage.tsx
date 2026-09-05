import React, { useState, useEffect } from 'react';
import { AppLayout } from '../../components/AppLayout';
import { api } from '../../services/api';
import type { User, ReportItem } from '../../types';
import {
  Shield, Users, Flag, Plus, Mail, Building2, Send, RefreshCw,
  Trash2, Clock, CheckCircle2, XCircle, Search, AlertCircle, X, Loader2
} from 'lucide-react';
import { SchoolAutocompleteInput } from '../../components/SchoolAutocompleteInput';
import { timeAgo } from '../../utils/textUtils';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'opportunities' | 'school_invites'>('users');
  
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [schoolInvites, setSchoolInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // School Admin Invites Filters & Modals
  const [inviteStatusFilter, setInviteStatusFilter] = useState<string>('all');
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSchoolName, setInviteSchoolName] = useState('');
  const [inviteSchoolId, setInviteSchoolId] = useState<number | undefined>(undefined);
  const [inviteExpiresDays, setInviteExpiresDays] = useState(7);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  // Opportunity Creation Form
  const [showAddOppModal, setShowAddOppModal] = useState(false);
  const [oppForm, setOppForm] = useState({
    title: '',
    description: '',
    organization: '',
    type: 'Hackathon',
    deadline: '',
    location: '',
    external_url: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const uList = await api.get<User[]>('/admin/users');
        setUsers(uList || []);
      } else if (activeTab === 'reports') {
        const rList = await api.get<ReportItem[]>('/admin/reports');
        setReports(rList || []);
      } else if (activeTab === 'school_invites') {
        const iList = await api.get<any[]>('/admin/school-invites');
        setSchoolInvites(iList || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleSendSchoolInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || (!inviteSchoolName.trim() && !inviteSchoolId)) {
      alert('Please provide an invitee email and target school.');
      return;
    }

    setSendingInvite(true);
    try {
      await api.post('/admin/school-invites', {
        email: inviteEmail.trim(),
        school_id: inviteSchoolId,
        school_name: inviteSchoolName.trim(),
        expires_in_days: Number(inviteExpiresDays) || 7
      });
      alert(`Invitation sent to ${inviteEmail}!`);
      setInviteEmail('');
      setInviteSchoolName('');
      setInviteSchoolId(undefined);
      setShowInviteModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to send invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleResendSchoolInvite = async (inviteId: number) => {
    setResendingId(inviteId);
    try {
      await api.post(`/admin/school-invites/${inviteId}/resend`, {});
      alert('Invitation resent successfully with a refreshed 7-day expiration timeline!');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to resend invitation');
    } finally {
      setResendingId(null);
    }
  };

  const handleCancelSchoolInvite = async (inviteId: number) => {
    if (!confirm('Are you sure you want to cancel and remove this invitation?')) return;
    setCancelingId(inviteId);
    try {
      await api.delete(`/admin/school-invites/${inviteId}`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove invitation');
    } finally {
      setCancelingId(null);
    }
  };

  const handleToggleSuspend = async (userId: number) => {
    try {
      await api.post(`/admin/users/${userId}/suspend`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle suspension');
    }
  };

  const handleToggleBan = async (userId: number) => {
    try {
      await api.post(`/admin/users/${userId}/ban`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle ban');
    }
  };

  const handleResolveReport = async (reportId: number, statusVal: string) => {
    try {
      await api.patch(`/admin/reports/${reportId}/resolve?status_val=${statusVal}`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update report');
    }
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/opportunities', oppForm);
      setShowAddOppModal(false);
      setOppForm({
        title: '',
        description: '',
        organization: '',
        type: 'Hackathon',
        deadline: '',
        location: '',
        external_url: '',
      });
      alert('Opportunity published successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to publish opportunity');
    }
  };

  const filteredInvites = schoolInvites.filter((inv) => {
    if (inviteStatusFilter !== 'all') {
      if (inviteStatusFilter === 'rejected') {
        if (inv.status !== 'rejected' && inv.status !== 'declined') return false;
      } else if (inv.status !== inviteStatusFilter) {
        return false;
      }
    }
    if (inviteSearchQuery.trim()) {
      const q = inviteSearchQuery.toLowerCase();
      const matchEmail = (inv.email || '').toLowerCase().includes(q);
      const matchSchool = (inv.school_name || '').toLowerCase().includes(q);
      if (!matchEmail && !matchSchool) return false;
    }
    return true;
  });

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-tight text-primary flex items-center gap-2">
              <Shield className="w-6 h-6" /> Admin Moderation Panel
            </h2>
            <p className="text-xs text-muted-foreground">Manage platform users, content moderation, reports, and opportunities.</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-900/20 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>Invite School Admin</span>
            </button>
            <button
              onClick={() => setShowAddOppModal(true)}
              className="button button-small button-solid cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Opportunity
            </button>
          </div>
        </div>

        {/* Admin Tabs */}
        <div className="flex gap-4 border-b border-border overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'users' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" /> Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('school_invites')}
            className={`pb-3 text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'school_invites' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mail className="w-4 h-4" /> School Admins ({schoolInvites.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`pb-3 text-xs font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'reports' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Flag className="w-4 h-4" /> Reports Queue ({reports.length})
          </button>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="py-20 text-center text-xs text-muted-foreground">Loading admin data...</div>
        ) : activeTab === 'users' ? (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground/90">
                <thead className="bg-secondary text-primary uppercase font-bold text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="p-4">User</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">School</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/5">
                      <td className="p-4 flex items-center gap-3">
                        <img
                          src={u.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`}
                          alt={u.username}
                          className="w-8 h-8 rounded-full border border-border object-cover"
                        />
                        <div>
                          <strong className="block text-foreground">{u.profile?.full_name || u.username}</strong>
                          <span className="text-[10px] text-primary">@{u.username}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          u.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-foreground'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-[11px] text-muted-foreground">{u.profile?.school || 'N/A'}</td>
                      <td className="p-4">
                        {u.is_banned ? (
                          <span className="text-red-400 font-bold">Banned</span>
                        ) : u.is_suspended ? (
                          <span className="text-yellow-400 font-bold">Suspended</span>
                        ) : (
                          <span className="text-primary">Active</span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleToggleSuspend(u.id)}
                          className="px-2.5 py-1 rounded-lg bg-secondary border border-border text-[10px] font-bold text-yellow-400 hover:bg-yellow-400/10"
                        >
                          {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                        <button
                          onClick={() => handleToggleBan(u.id)}
                          className="px-2.5 py-1 rounded-lg bg-secondary border border-border text-[10px] font-bold text-red-400 hover:bg-red-400/10"
                        >
                          {u.is_banned ? 'Unban' : 'Ban'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-12 text-center text-xs text-muted-foreground">
                No pending moderation reports.
              </div>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="bg-card border border-border rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase">
                        {r.reason}
                      </span>
                      <span className="text-[10px] text-muted-foreground">Target: {r.target_type} #{r.target_id}</span>
                    </div>
                    <p className="text-xs text-foreground">Reported by @{r.reporter_username}</p>
                    {r.details && <p className="text-xs text-muted-foreground mt-1">"{r.details}"</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-yellow-400 uppercase mr-2">{r.status}</span>
                    <button
                      onClick={() => handleResolveReport(r.id, 'resolved')}
                      className="px-3 py-1.5 rounded-xl bg-primary/20 border border-primary text-xs font-bold text-primary"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => handleResolveReport(r.id, 'dismissed')}
                      className="px-3 py-1.5 rounded-xl bg-white/5 border border-border text-xs font-bold text-muted-foreground"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB: SCHOOL ADMIN INVITATIONS */}
        {activeTab === 'school_invites' && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-card border border-border p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Invites</span>
                <span className="text-xl font-black text-foreground">{schoolInvites.length}</span>
              </div>
              <div className="bg-card border border-border p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-amber-500 block">Pending</span>
                <span className="text-xl font-black text-amber-500">
                  {schoolInvites.filter((i) => i.status === 'pending').length}
                </span>
              </div>
              <div className="bg-card border border-border p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-emerald-500 block">Accepted</span>
                <span className="text-xl font-black text-emerald-500">
                  {schoolInvites.filter((i) => i.status === 'accepted').length}
                </span>
              </div>
              <div className="bg-card border border-border p-4 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-rose-500 block">Rejected</span>
                <span className="text-xl font-black text-rose-500">
                  {schoolInvites.filter((i) => i.status === 'rejected' || i.status === 'declined').length}
                </span>
              </div>
              <div className="bg-card border border-border p-4 rounded-2xl col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Expired</span>
                <span className="text-xl font-black text-muted-foreground">
                  {schoolInvites.filter((i) => i.status === 'expired').length}
                </span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border p-3.5 rounded-2xl">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {['all', 'pending', 'accepted', 'rejected', 'expired'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setInviteStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                      inviteStatusFilter === st
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-1 sm:justify-end">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search email or school..."
                    value={inviteSearchQuery}
                    onChange={(e) => setInviteSearchQuery(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Invite Admin</span>
                </button>
              </div>
            </div>

            {/* Invitations Table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground/90">
                  <thead className="bg-secondary text-primary uppercase font-bold text-[10px] tracking-wider border-b border-border">
                    <tr>
                      <th className="p-4">Invitee Email</th>
                      <th className="p-4">Target Campus</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Timeline</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredInvites.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No school admin invitations match the selected criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredInvites.map((inv) => (
                        <tr key={inv.id} className="hover:bg-secondary/40 transition-colors">
                          <td className="p-4 font-semibold text-foreground">
                            <div>{inv.email || '—'}</div>
                            {inv.user_id && (
                              <span className="text-[10px] text-muted-foreground">Registered User #{inv.user_id}</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="font-bold flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="truncate max-w-[200px]">{inv.school_name || `School #${inv.school_id}`}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-extrabold uppercase whitespace-nowrap">
                              School Admin
                            </span>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            {inv.status === 'accepted' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                                <CheckCircle2 className="w-3 h-3" /> Accepted
                              </span>
                            ) : inv.status === 'pending' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold">
                                <Clock className="w-3 h-3" /> Pending
                              </span>
                            ) : inv.status === 'expired' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border text-[11px] font-bold">
                                <AlertCircle className="w-3 h-3" /> Expired
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-bold">
                                <XCircle className="w-3 h-3" /> Declined
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-muted-foreground text-[11px] whitespace-nowrap">
                            <div>Sent: {timeAgo(inv.created_at)}</div>
                            {inv.expires_at && (
                              <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                                Expires: {new Date(inv.expires_at).toLocaleDateString()}
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <button
                                onClick={() => handleResendSchoolInvite(inv.id)}
                                disabled={resendingId === inv.id}
                                title="Resend invitation email & renew expiry timeline"
                                className="p-1.5 rounded-lg bg-secondary hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${resendingId === inv.id ? 'animate-spin text-primary' : ''}`} />
                              </button>
                              <button
                                onClick={() => handleCancelSchoolInvite(inv.id)}
                                disabled={cancelingId === inv.id}
                                title="Cancel / Remove invitation"
                                className="p-1.5 rounded-lg bg-secondary hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Add Opportunity Modal */}
        {showAddOppModal && (
          <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground uppercase">Publish Opportunity</h3>
                <button onClick={() => setShowAddOppModal(false)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
              </div>

              <form onSubmit={handleCreateOpportunity} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={oppForm.title}
                    onChange={(e) => setOppForm({ ...oppForm, title: e.target.value })}
                    placeholder="e.g. Global STEM Fellowship 2026"
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Organization *</label>
                    <input
                      type="text"
                      required
                      value={oppForm.organization}
                      onChange={(e) => setOppForm({ ...oppForm, organization: e.target.value })}
                      placeholder="Nexus Foundation"
                      className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Type</label>
                    <select
                      value={oppForm.type}
                      onChange={(e) => setOppForm({ ...oppForm, type: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value="Hackathon">Hackathon</option>
                      <option value="Scholarships">Scholarships</option>
                      <option value="Research">Research</option>
                      <option value="Competitions">Competitions</option>
                      <option value="Summer Programs">Summer Programs</option>
                      <option value="Internships">Internships</option>
                      <option value="Jobs">Jobs</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Description *</label>
                  <textarea
                    rows={3}
                    required
                    value={oppForm.description}
                    onChange={(e) => setOppForm({ ...oppForm, description: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Deadline</label>
                    <input
                      type="date"
                      value={oppForm.deadline}
                      onChange={(e) => setOppForm({ ...oppForm, deadline: e.target.value })}
                      className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Location</label>
                    <input
                      type="text"
                      value={oppForm.location}
                      onChange={(e) => setOppForm({ ...oppForm, location: e.target.value })}
                      placeholder="Online or City"
                      className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Application URL</label>
                  <input
                    type="url"
                    value={oppForm.external_url}
                    onChange={(e) => setOppForm({ ...oppForm, external_url: e.target.value })}
                    placeholder="https://example.com/apply"
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowAddOppModal(false)} className="button button-ghost flex-1">
                    Cancel
                  </button>
                  <button type="submit" className="button button-primary flex-1">
                    Publish
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: INVITE SCHOOL ADMIN */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Invite School Admin</h3>
                    <p className="text-[11px] text-muted-foreground">Send official admin invite link via email</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSendSchoolInvite} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Invitee Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="principal@school.edu or admin@school.org"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Target School / Campus *
                  </label>
                  <SchoolAutocompleteInput
                    value={inviteSchoolName}
                    onChange={(name, id) => {
                      setInviteSchoolName(name);
                      setInviteSchoolId(id);
                    }}
                    placeholder="Select existing or type custom school name..."
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    If this school isn't in directory, typing its name will auto-register it!
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Invitation Expiration Timeline
                  </label>
                  <select
                    value={inviteExpiresDays}
                    onChange={(e) => setInviteExpiresDays(Number(e.target.value))}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value={3}>3 Days</option>
                    <option value={7}>7 Days (Recommended)</option>
                    <option value={14}>14 Days (2 Weeks)</option>
                    <option value={30}>30 Days (1 Month)</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    If not responded to within this timeline, the invite will expire automatically.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingInvite}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/20 hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {sendingInvite ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Send Invitation Email</span>
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
