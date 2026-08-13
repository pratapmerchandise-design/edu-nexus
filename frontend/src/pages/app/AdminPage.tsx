import React, { useState, useEffect } from 'react';
import { AppLayout } from '../../components/AppLayout';
import { api } from '../../services/api';
import type { User, ReportItem } from '../../types';
import { Shield, Users, Flag, Plus } from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'opportunities'>('users');
  
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

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
        setUsers(uList);
      } else if (activeTab === 'reports') {
        const rList = await api.get<ReportItem[]>('/admin/reports');
        setReports(rList);
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

          <button
            onClick={() => setShowAddOppModal(true)}
            className="button button-small button-solid"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Opportunity
          </button>
        </div>

        {/* Admin Tabs */}
        <div className="flex gap-4 border-b border-border">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
              activeTab === 'users' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
            }`}
          >
            <Users className="w-4 h-4" /> Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`pb-3 text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
              activeTab === 'reports' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
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
      </div>
    </AppLayout>
  );
};
