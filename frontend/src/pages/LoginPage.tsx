import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post<{ access_token: string; user: any }>('/auth/login', {
        email_or_username: emailOrUsername,
        password: password,
      });

      login(res.access_token, res.user);
      navigate('/app/feed');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center p-4 relative">
      <div className="page-noise" aria-hidden="true" />

      {/* Top right theme toggle and home link */}
      <div className="absolute top-5 right-5 sm:top-6 sm:right-6 z-20 flex items-center gap-2">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-4">
            <img src="/edu-nexus-logo-light.png" alt="Edu Nexus" className="h-9 mx-auto object-contain logo-for-light" />
            <img src="/edu-nexus-logo.png" alt="Edu Nexus" className="h-9 mx-auto object-contain logo-for-dark" />
          </Link>
          <h2 className="text-2xl font-bold uppercase tracking-tight text-foreground">Welcome Back</h2>
          <p className="text-xs text-muted-foreground mt-1">Sign in to your Edu Nexus student account</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Email or Username</label>
            <input
              type="text"
              required
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder="aarav or student@school.edu"
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Password</label>
              <Link to="/forgot-password" className="text-[11px] font-bold text-primary hover:underline">Forgot Password?</Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="button button-primary w-full mt-4"
          >
            {loading ? 'Signing in...' : 'Sign In'} <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/signup" className="text-primary font-bold hover:underline">
            Create Profile
          </Link>
        </div>
      </div>
    </div>
  );
};
