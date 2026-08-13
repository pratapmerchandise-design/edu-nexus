import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { AlertCircle } from 'lucide-react';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    dob: '',
    country: '',
    city: '',
    school: '',
    grade: '',
    interests: [] as string[],
    skills: [] as string[],
  });

  const availableInterests = [
    'Programming', 'Robotics', 'Artificial Intelligence', 'Design', 'Business', 
    'Mathematics', 'Science', 'Music', 'Research', 'Physics', 'Biology', 'Chemistry'
  ];

  const availableSkills = [
    'Python', 'Web Development', 'UI/UX Design', 'Video Editing', 'Public Speaking', 
    'C++', 'Machine Learning', 'Data Analysis', 'Writing', 'Graphic Design'
  ];

  const toggleInterest = (interest: string) => {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const toggleSkill = (skill: string) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post<{ access_token: string; user: any }>('/auth/register', form);
      login(res.access_token, res.user);
      navigate('/app/feed');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center p-4 relative">
      <div className="page-noise" aria-hidden="true" />

      <div className="w-full max-w-xl bg-card border border-border rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-6">
          <Link to="/" className="inline-block mb-3">
            <img src="/edu-nexus-logo.png" alt="Edu Nexus" className="h-8 mx-auto object-contain" />
          </Link>
          <h2 className="text-2xl font-bold uppercase tracking-tight text-foreground">Create Student Account</h2>
          <p className="text-xs text-muted-foreground mt-1">Join thousands of ambitious builders across the world</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`w-8 h-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-white/10'}`} />
          <div className={`w-8 h-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-white/10'}`} />
          <div className={`w-8 h-1 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-white/10'}`} />
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Step 1: Account Credentials</h3>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Aarav Mehta"
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="aarav_mehta"
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="aarav@school.edu"
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="At least 6 characters"
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!form.name || !form.username || !form.email || !form.password) {
                    setError('Please fill in all required credential fields.');
                    return;
                  }
                  setError('');
                  setStep(2);
                }}
                className="button button-primary w-full mt-4"
              >
                Next Step →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Step 2: Student Details</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">School / Academy</label>
                  <input
                    type="text"
                    value={form.school}
                    onChange={(e) => setForm({ ...form, school: e.target.value })}
                    placeholder="e.g. Delhi Public School"
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Grade / Year</label>
                  <input
                    type="text"
                    value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value })}
                    placeholder="e.g. Grade 12 or Undergrad"
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Country</label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="India"
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">City / Region</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Delhi"
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={form.dob}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="button button-ghost flex-1"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="button button-primary flex-1"
                >
                  Next: Skills & Interests →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Step 3: Skills & Interests</h3>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Interests</label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 mb-2">
                  {Array.from(new Set([...availableInterests, ...form.interests])).map((interest) => {
                    const selected = form.interests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                          selected
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                            : 'bg-secondary text-muted-foreground border border-border hover:text-foreground'
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder="Type an interest and press Enter..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = e.currentTarget.value.trim();
                      if (val && !form.interests.includes(val)) {
                        toggleInterest(val);
                      }
                      e.currentTarget.value = '';
                    }
                  }}
                  className="input input-small"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Skills</label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 mb-2">
                  {Array.from(new Set([...availableSkills, ...form.skills])).map((skill) => {
                    const selected = form.skills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                          selected
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                            : 'bg-secondary text-muted-foreground border border-border hover:text-foreground'
                        }`}
                      >
                        {skill}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder="Type a skill and press Enter..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = e.currentTarget.value.trim();
                      if (val && !form.skills.includes(val)) {
                        toggleSkill(val);
                      }
                      e.currentTarget.value = '';
                    }
                  }}
                  className="input input-small"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="button button-ghost flex-1"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="button button-primary flex-1"
                >
                  {loading ? 'Creating Account...' : 'Complete Profile →'}
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-bold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
