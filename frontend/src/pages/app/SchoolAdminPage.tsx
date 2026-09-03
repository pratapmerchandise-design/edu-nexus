import React, { useState, useEffect } from 'react';
import { AppLayout } from '../../components/AppLayout';
import { api } from '../../services/api';
import { Building2, UserPlus, Check, Loader2, Shield } from 'lucide-react';

export const SchoolAdminPage: React.FC = () => {
  const [schools, setSchools] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [schoolForm, setSchoolForm] = useState({ name: '', description: '' });
  const [adminForm, setAdminForm] = useState({ school_id: '' as string | number, username: '', email: '', full_name: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [s, sug] = await Promise.all([
        api.get<any[]>('/schools'),
        api.get<any[]>('/schools/suggestions').catch(() => []),
      ]);
      setSchools(s);
      const allInvites = (await Promise.all(s.map((school: any) => api.get<any[]>(`/schools/${school.id}/invitations`).catch(() => [])))).flat();
      setInvitations(allInvites);
      setSuggestions(sug);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/schools', schoolForm);
      setSchoolForm({ name: '', description: '' });
      load();
    } catch (err: any) {
      alert(err.message || 'Failed to create school.');
    }
  };

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/schools/admins', { ...adminForm, school_id: Number(adminForm.school_id) });
      setAdminForm({ school_id: '', username: '', email: '', full_name: '' });
      alert('Invitation sent. The administrator will receive an EduNexus email to set their password and activate the account.');
    } catch (err: any) {
      alert(err.message || 'Failed to create admin.');
    }
  };

  const approveSuggestion = async (id: number) => {
    try {
      await api.post(`/schools/suggestions/${id}/approve`);
      load();
    } catch (err: any) {
      alert(err.message || 'Failed to approve.');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="py-24 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading School Management...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center border border-primary/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">School Management</h1>
            <p className="text-sm text-muted-foreground">Create schools and manage their administrators.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create School */}
          <form onSubmit={createSchool} className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> Create School
            </h2>
            <input
              required
              placeholder="School name"
              value={schoolForm.name}
              onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
            />
            <textarea
              placeholder="Description"
              value={schoolForm.description}
              onChange={(e) => setSchoolForm({ ...schoolForm, description: e.target.value })}
              rows={3}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:opacity-90 transition-all"
            >
              Create School
            </button>
          </form>

          {/* Create School Admin */}
          <form onSubmit={createAdmin} className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-sm">
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Create School Admin
            </h2>
            <p className="text-xs text-muted-foreground">Enter the administrator’s details. EduNexus will email them a secure activation link; you never need to create or share their password.</p>
            <select
              required
              value={adminForm.school_id}
              onChange={(e) => setAdminForm({ ...adminForm, school_id: e.target.value })}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">Select school</option>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input
              required
              placeholder="Full name"
              value={adminForm.full_name}
              onChange={(e) => setAdminForm({ ...adminForm, full_name: e.target.value })}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
            />
            <input
              required
              placeholder="Username"
              value={adminForm.username}
              onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={adminForm.email}
              onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:opacity-90 transition-all"
            >
              Send Admin Invitation
            </button>
          </form>
        </div>

        {/* Suggestions */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm"><h2 className="font-bold text-foreground mb-4">School Admin Invitations</h2>{invitations.length === 0 ? <p className="text-sm text-muted-foreground">No invitations sent yet.</p> : <div className="space-y-2">{invitations.map((inv) => <div key={inv.id} className="flex justify-between items-center p-3 rounded-xl bg-secondary border border-border"><div><p className="text-sm font-semibold">{inv.user?.profile?.full_name || inv.user?.email || 'Administrator'}</p><p className="text-[11px] text-muted-foreground">{inv.user?.email} · {inv.school?.name}</p></div><span className={`text-[10px] font-bold uppercase ${inv.status === 'accepted' ? 'text-primary' : inv.status === 'rejected' || inv.status === 'declined' || inv.status === 'expired' ? 'text-red-500' : 'text-amber-600'}`}>{inv.status}</span></div>)}</div>}</div>

        {/* Suggestions */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
          <h2 className="font-bold text-foreground mb-4">Pending School Suggestions</h2>
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending suggestions.</p>
          ) : (
            <div className="space-y-3">
              {suggestions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4 bg-secondary rounded-xl border border-border">
                  <div>
                    <p className="font-medium text-foreground text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{[s.city, s.country].filter(Boolean).join(', ') || '—'}</p>
                  </div>
                  <button
                    onClick={() => approveSuggestion(s.id)}
                    className="py-2 px-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20 hover:opacity-90 transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Approve & Create
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
