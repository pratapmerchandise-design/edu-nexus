import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Mail, Key, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await api.post<{ message: string }>('/auth/forgot-password', { email });
      setMessage(res.message);
      setStep(2);
    } catch (err: any) {
      alert(err.message || 'Failed to request reset');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await api.post('/auth/reset-password', { token, new_password: newPassword });
      alert('Password reset successfully! You can now login.');
      navigate('/login');
    } catch (err: any) {
      alert(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary items-center justify-center overflow-hidden">
        <div className="absolute inset-0 pattern-dots opacity-20 mix-blend-overlay"></div>
        <div className="relative z-10 text-primary-foreground max-w-lg p-12">
          <ShieldCheck className="w-16 h-16 mb-6" />
          <h1 className="text-4xl font-black uppercase tracking-tight leading-none mb-6">
            Recover<br />Account
          </h1>
          <p className="text-lg opacity-90 font-medium">
            Reset your password and get back to learning.
          </p>
        </div>
      </div>

      {/* Right side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-tight text-foreground">
              {step === 1 ? 'Forgot Password' : 'Reset Password'}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              {step === 1 
                ? 'Enter your email address to receive a reset token.' 
                : 'Enter the reset token sent to your email and a new password.'}
            </p>
          </div>

          {message && (
            <div className="bg-primary/10 text-primary px-4 py-3 rounded-xl text-sm font-bold border border-primary/20">
              {message}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestReset} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-secondary border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="button button-primary w-full h-12 flex items-center justify-center font-bold"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  Reset Token
                </label>
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-4 py-3.5 bg-secondary border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Paste your reset token here"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                  New Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Key className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-secondary border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="Enter new password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="button button-primary w-full h-12 flex items-center justify-center font-bold"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="text-center">
            <Link
              to="/login"
              className="text-sm font-bold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
            >
              Back to Login <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
