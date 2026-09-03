import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { passwordRules, isStrongPassword } from '../utils/passwordPolicy';
import { AlertCircle } from 'lucide-react';

const GRADES = ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingStep1, setCheckingStep1] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; username?: string }>({});
  const [showSuggest, setShowSuggest] = useState(false);

  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    dob: '',
    country: '',
    city: '',
    school: '',
    grade: '',
    interests: [] as string[],
    skills: [] as string[],
  });

  const [suggest, setSuggest] = useState({ name: '', contact_email: '', city: '', country: '' });

  const submitSuggest = async () => {
    if (!suggest.name.trim()) return;
    try {
      await api.post('/schools/suggestions', suggest);
      setShowSuggest(false);
      setSuggest({ name: '', contact_email: '', city: '', country: '' });
      alert('Thanks! Your school suggestion has been sent to our team for review.');
    } catch (e: any) {
      alert(e.message || 'Failed to submit suggestion.');
    }
  };

  const availableInterests = [
    'Programming', 'Robotics', 'Artificial Intelligence', 'Machine Learning', 'Data Science', 'Cybersecurity', 
    'Web Development', 'Mobile App Development', 'Game Development', 'Cloud Computing',
    'Mathematics', 'Physics', 'Biology', 'Chemistry', 'Astronomy', 'Environmental Science', 'Medical Science', 'Neuroscience', 'Genetics', 'Healthcare',
    'Design', 'UI/UX Design', 'Graphic Design', 'Architecture', 'Fashion Design', 'Interior Design',
    'Business', 'Entrepreneurship', 'Marketing', 'Finance', 'Economics', 'Management', 'Accounting',
    'Music', 'Music Production', 'Audio Engineering', 'Singing', 'Instrumental Performance',
    'Filmmaking', 'Video Editing', 'Cinematography', 'Screenwriting', 'Animation', 'VFX',
    'Research', 'Writing', 'Journalism', 'Literature', 'History', 'Philosophy', 'Psychology', 'Sociology',
    'Law', 'Political Science', 'International Relations', 'Public Speaking', 'Debate',
    'Sports', 'Esports', 'Athletics', 'Fitness', 'Nutrition',
    'Photography', 'Fine Arts', 'Theater', 'Acting', 'Dance'
  ].sort();

  const availableSkills = [
    'Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'Rust', 'Go', 'Swift', 'Kotlin', 'SQL',
    'React', 'Node.js', 'Next.js', 'Vue.js', 'Angular', 'Django', 'Flask', 'Spring Boot',
    'Machine Learning', 'Deep Learning', 'Data Analysis', 'Data Visualization', 'Pandas', 'TensorFlow', 'PyTorch',
    'UI/UX Design', 'Figma', 'Adobe XD', 'Sketch', 'Graphic Design', 'Adobe Photoshop', 'Adobe Illustrator',
    'Video Editing', 'Adobe Premiere Pro', 'Final Cut Pro', 'DaVinci Resolve', 'After Effects', '3D Modeling', 'Blender', 'Maya',
    'Music Production', 'FL Studio', 'Ableton Live', 'Logic Pro', 'Sound Design',
    'Public Speaking', 'Debating', 'Leadership', 'Project Management', 'Agile', 'Scrum',
    'Writing', 'Copywriting', 'Technical Writing', 'Creative Writing', 'Blogging',
    'Marketing', 'SEO', 'Social Media Management', 'Digital Marketing', 'Content Creation',
    'Finance', 'Financial Modeling', 'Accounting', 'Investment Analysis',
    'Medical Research', 'Lab Techniques', 'First Aid', 'Patient Care',
    'Language Translation', 'Teaching', 'Tutoring', 'Customer Service', 'Sales'
  ].sort();

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

  const checkEmailOnBlur = async () => {
    const trimmed = form.email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;
    try {
      const res = await api.post<{ available: boolean; errors: { email?: string } }>('/auth/check-availability', {
        email: trimmed,
      });
      if (res.errors?.email) {
        setFieldErrors((prev) => ({ ...prev, email: res.errors.email }));
        setError(res.errors.email);
      } else {
        setFieldErrors((prev) => ({ ...prev, email: undefined }));
        if (error && error.includes('Email is already registered')) setError('');
      }
    } catch (_) {}
  };

  const checkUsernameOnBlur = async () => {
    const trimmed = form.username.trim();
    if (!trimmed || trimmed.length < 3) return;
    try {
      const res = await api.post<{ available: boolean; errors: { username?: string } }>('/auth/check-availability', {
        username: trimmed,
      });
      if (res.errors?.username) {
        setFieldErrors((prev) => ({ ...prev, username: res.errors.username }));
        setError(res.errors.username);
      } else {
        setFieldErrors((prev) => ({ ...prev, username: undefined }));
        if (error && error.includes('Username is already taken')) setError('');
      }
    } catch (_) {}
  };

  const handleNextFromStep1 = async () => {
    setError('');
    setFieldErrors({});

    if (!form.name.trim() || !form.username.trim() || !form.email.trim() || !form.password) {
      setError('Please fill in all required credential fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      setError('Please enter a valid email address.');
      setFieldErrors({ email: 'Invalid email format' });
      return;
    }

    if (!isStrongPassword(form.password)) {
      setError('Please create a stronger password using all the rules shown.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setCheckingStep1(true);
    try {
      const res = await api.post<{
        available: boolean;
        email_available: boolean;
        username_available: boolean;
        errors: { email?: string; username?: string };
      }>('/auth/check-availability', {
        email: form.email.trim(),
        username: form.username.trim(),
      });

      if (!res.available) {
        if (res.errors.email) {
          setError(res.errors.email);
          setFieldErrors((prev) => ({ ...prev, email: res.errors.email }));
          return;
        }
        if (res.errors.username) {
          setError(res.errors.username);
          setFieldErrors((prev) => ({ ...prev, username: res.errors.username }));
          return;
        }
      }

      setError('');
      setFieldErrors({});
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Could not verify account details. Please try again.');
    } finally {
      setCheckingStep1(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        ...form,
        school: form.school || null,
        phone: form.phone || null,
        grade: form.grade || null,
      };
      const res = await api.post<{ access_token: string; user: any }>('/auth/register', payload);
      login(res.access_token, res.user);
      navigate('/verify-email');
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
            <img src="/edu-nexus-logo-light.png" alt="Edu Nexus" className="h-8 mx-auto object-contain logo-for-light" />
            <img src="/edu-nexus-logo.png" alt="Edu Nexus" className="h-8 mx-auto object-contain logo-for-dark" />
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
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.username}
                    onChange={(e) => {
                      setForm({ ...form, username: e.target.value });
                      if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: undefined }));
                    }}
                    onBlur={checkUsernameOnBlur}
                    placeholder="aarav_mehta"
                    className={`w-full bg-secondary border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none ${
                      fieldErrors.username ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
                    }`}
                  />
                  {fieldErrors.username && (
                    <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.username}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value });
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    onBlur={checkEmailOnBlur}
                    placeholder="aarav@school.edu"
                    className={`w-full bg-secondary border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none ${
                      fieldErrors.email ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{fieldErrors.email}</span>
                    </p>
                  )}
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
                <div className="mt-2 space-y-1 text-[10px]">{passwordRules.map(([label, test]) => <span key={label} className={`block ${test(form.password) ? 'text-green-600' : 'text-red-500'}`}>{test(form.password) ? '✓' : '✕'} {label}</span>)}</div>
                <input type="password" required value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Confirm password" className="w-full mt-2 bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary" />
                {form.confirmPassword && <p className={`text-[10px] font-bold ${form.password === form.confirmPassword ? 'text-primary' : 'text-red-500'}`}>{form.password === form.confirmPassword ? '✓ Passwords match' : '✕ Passwords do not match'}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Phone <span className="text-muted-foreground/70 normal-case">(optional — verify later)</span></label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 555 123 4567"
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <button
                type="button"
                onClick={handleNextFromStep1}
                disabled={checkingStep1}
                className="button button-primary w-full mt-4 flex items-center justify-center gap-2"
              >
                {checkingStep1 ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Verifying details...</span>
                  </>
                ) : (
                  <span>Next Step →</span>
                )}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Step 2: Student Details</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    School / Institution <span className="text-muted-foreground/70 normal-case">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.school}
                    onChange={(e) => setForm({ ...form, school: e.target.value })}
                    placeholder="e.g. Modern School, Stanford, DPS"
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">School Hubs are private. Your school admin can invite you directly.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Grade *</label>
                  <select
                    required
                    value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="">Select grade</option>
                    {GRADES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
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

      {showSuggest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowSuggest(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground mb-1">Suggest your school</h3>
            <p className="text-xs text-muted-foreground mb-4">We'll review and add it so you can join your school hub.</p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="School name"
                value={suggest.name}
                onChange={(e) => setSuggest({ ...suggest, name: e.target.value })}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
              />
              <input
                type="email"
                placeholder="Contact email (optional)"
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
              <button onClick={() => setShowSuggest(false)} className="button button-ghost flex-1">Cancel</button>
              <button onClick={submitSuggest} className="button button-primary flex-1">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
