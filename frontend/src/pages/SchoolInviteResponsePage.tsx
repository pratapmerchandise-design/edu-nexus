import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Shield, Building2, CheckCircle2, XCircle, Clock, ArrowRight, Loader2, Lock, User as UserIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface InviteDetails {
  id: number;
  school_id: number;
  school_name: string;
  school_logo?: string;
  email: string;
  role: string;
  status: string;
  expires_at?: string;
  is_expired: boolean;
  user_exists: boolean;
  existing_username?: string;
}

export const SchoolInviteResponsePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const token = searchParams.get('token') || '';
  const isDeclineParam = searchParams.get('action') === 'decline';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAccepted, setIsAccepted] = useState(false);
  const [isRejected, setIsRejected] = useState(false);

  // New user registration fields if not yet registered
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing invitation token.');
      setLoading(false);
      return;
    }

    const fetchInvite = async () => {
      setLoading(true);
      try {
        const data = await api.get<InviteDetails>(`/schools/admin-invites/${encodeURIComponent(token)}`);
        setInvite(data);
        if (data.status === 'accepted') {
          setIsAccepted(true);
        } else if (data.status === 'rejected' || data.status === 'declined') {
          setIsRejected(true);
        }
      } catch (err: any) {
        setError(err.message || 'Could not load invitation details.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [token]);

  const handleAccept = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setError(null);
    try {
      const payload: any = { action: 'accept' };
      if (!invite?.user_exists) {
        if (!password || password.length < 6) {
          setError('Password must be at least 6 characters long.');
          setSubmitting(false);
          return;
        }
        payload.full_name = fullName.trim();
        payload.password = password;
      }

      const res = await api.post<any>(`/schools/admin-invites/${encodeURIComponent(token)}/respond`, payload);
      setIsAccepted(true);
      setSuccessMessage(res.message || 'Invitation accepted successfully!');

      // If user was newly created, auto-log them in
      if (!invite?.user_exists && payload.password && invite?.email) {
        try {
          await login(invite.email, payload.password);
        } catch (loginErr) {
          console.warn('Auto-login note:', loginErr);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!token) return;
    if (!confirm('Are you sure you want to decline this School Administrator invitation?')) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<any>(`/schools/admin-invites/${encodeURIComponent(token)}/respond`, {
        action: 'reject'
      });
      setIsRejected(true);
      setSuccessMessage(res.message || 'Invitation declined.');
    } catch (err: any) {
      setError(err.message || 'Failed to decline invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-4 selection:bg-primary selection:text-primary-foreground">
      {/* Brand Header */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-2">
          <Shield className="w-4 h-4" /> EduNexus Campus Governance
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          School Administrator Invitation
        </h1>
      </div>

      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground font-medium">Verifying invitation credentials...</p>
          </div>
        ) : error && !invite ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Invitation Error</h2>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold transition-all cursor-pointer"
            >
              Return to Login
            </button>
          </div>
        ) : invite?.is_expired ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Invitation Expired</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                The response timeline for this invitation to administer <strong>{invite.school_name}</strong> has ended.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Please reach out to the EduNexus Platform Administrator to request a new invitation.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold transition-all cursor-pointer"
            >
              Go to EduNexus Home
            </button>
          </div>
        ) : isAccepted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto ring-8 ring-primary/5">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Access Granted!</h2>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                {successMessage || `You are now the active School Administrator for ${invite?.school_name}.`}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-secondary/50 border border-border text-left space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <Shield className="w-4 h-4" /> Admin Controls Active
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                You can now post official announcements, schedule events, and organize clubs inside your School Hub.
              </p>
            </div>

            <button
              onClick={() => navigate('/app/school-hub')}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-lg shadow-primary/25 hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Enter {invite?.school_name} Hub</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : isRejected ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Invitation Declined</h2>
              <p className="text-xs text-muted-foreground mt-1">
                You have declined the administrator invitation for <strong>{invite?.school_name}</strong>.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 rounded-xl bg-secondary text-foreground text-xs font-bold hover:bg-secondary/80 transition-all cursor-pointer"
            >
              Return to EduNexus
            </button>
          </div>
        ) : (
          /* PENDING INVITATION FORM */
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-secondary/60 border border-border">
              <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border border-border text-primary shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Target Campus</span>
                <h3 className="text-sm font-bold text-foreground truncate">{invite?.school_name}</h3>
                <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Role: School Administrator
                </span>
              </div>
            </div>

            {isDeclineParam && !isAccepted && !isRejected && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                You selected <strong>Decline</strong> in your email. You can confirm your decision below or accept instead.
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                {error}
              </div>
            )}

            {!invite?.user_exists ? (
              /* User needs to complete account setup */
              <form onSubmit={handleAccept} className="space-y-4">
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                  <p className="text-[11px] text-muted-foreground">
                    This email (<strong>{invite?.email}</strong>) is not yet registered. Set a display name and secure password to activate your School Admin account.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-muted-foreground" /> Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajesh Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" /> Create Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-lg shadow-primary/20 hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <>
                        <span>Activate & Accept Invitation</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleDecline}
                    className="w-full py-2.5 rounded-xl text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Decline Invitation
                  </button>
                </div>
              </form>
            ) : (
              /* Existing user 1-click confirmation */
              <div className="space-y-4 pt-1">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You are registered as <strong>@{invite?.existing_username}</strong> ({invite?.email}). Confirming will grant you administrative privileges for <strong>{invite?.school_name}</strong>.
                </p>

                <div className="space-y-2">
                  <button
                    onClick={() => handleAccept()}
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-lg shadow-primary/20 hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <>
                        <span>Accept Administrator Role</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleDecline}
                    className="w-full py-2.5 rounded-xl text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Decline Invitation
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="mt-6 text-center text-[11px] text-muted-foreground">
        EduNexus — Modern Student Social & Collaboration Network
      </div>
    </div>
  );
};
