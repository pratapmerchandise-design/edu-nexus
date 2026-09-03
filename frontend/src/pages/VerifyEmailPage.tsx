import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Mail, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  if (user.is_email_verified) {
    navigate('/app/feed', { replace: true });
    return null;
  }

  const maskedEmail = (user.email || '').replace(/^(.)(.*)(@.*)$/, '$1***$3');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/verify-email-otp', { contact: user!.email, otp_code: code });
      await refreshUser();
      navigate('/app/feed', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    setMessage('');
    try {
      await api.post('/auth/request-email-otp');
      setMessage('A new verification code has been sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Could not resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center p-4 relative">
      <div className="page-noise" aria-hidden="true" />
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-2xl relative z-10 text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Mail className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold uppercase tracking-tight text-foreground">Verify your email</h2>
        <p className="text-sm text-muted-foreground mt-2">
          We sent a 6-digit verification code to <span className="text-foreground font-semibold">{maskedEmail}</span>.
          Enter it below to activate your account.
        </p>

        {error && (
          <div className="mt-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div className="mt-5 p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs text-left">{message}</div>
        )}

        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="••••••"
            className="w-full text-center tracking-[0.5em] text-lg bg-secondary border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
          />
          <button type="submit" disabled={loading} className="button button-primary w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify email <ShieldCheck className="w-4 h-4 ml-2" /></>}
          </button>
        </form>

        <button
          onClick={handleResend}
          disabled={resending}
          className="mt-5 text-xs font-semibold text-primary hover:underline disabled:opacity-60"
        >
          {resending ? 'Sending...' : "Didn't get the code? Resend"}
        </button>

        <div className="mt-6 pt-5 border-t border-border text-xs text-muted-foreground">
          Wrong account?{' '}
          <button onClick={() => { localStorage.removeItem('edunexus_token'); navigate('/login'); }} className="text-primary font-bold hover:underline">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};
