import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { AppLayout } from '../../components/AppLayout';
import { 
  Settings as SettingsIcon, Shield, Mail, Phone, Lock, Save, 
  Loader2, CheckCircle2, AlertCircle, GraduationCap, Building2, 
  MapPin, Globe, ArrowRight 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SchoolAutocompleteInput } from '../../components/SchoolAutocompleteInput';

export const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [savingAcademic, setSavingAcademic] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Academic & School Profile state
  const [schoolInput, setSchoolInput] = useState(user?.profile?.school || '');
  const [gradeInput, setGradeInput] = useState(user?.profile?.grade || '');
  const [cityInput, setCityInput] = useState(user?.profile?.city || '');
  const [countryInput, setCountryInput] = useState(user?.profile?.country || '');
  const [fullNameInput, setFullNameInput] = useState(user?.profile?.full_name || '');

  // Privacy toggles state
  const [showEmail, setShowEmail] = useState(user?.profile?.show_email ?? true);
  const [showPhone, setShowPhone] = useState(user?.profile?.show_phone ?? false);
  const [showDob, setShowDob] = useState(user?.profile?.show_dob ?? false);

  // Verification state
  const [emailOtp, setEmailOtp] = useState('');
  const [phoneInput, setPhoneInput] = useState(user?.phone || '');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [showEmailOtpField, setShowEmailOtpField] = useState(false);
  const [showPhoneOtpField, setShowPhoneOtpField] = useState(false);

  useEffect(() => {
    if (user?.profile) {
      setSchoolInput(user.profile.school || '');
      setGradeInput(user.profile.grade || '');
      setCityInput(user.profile.city || '');
      setCountryInput(user.profile.country || '');
      setFullNameInput(user.profile.full_name || '');
      setShowEmail(user.profile.show_email ?? true);
      setShowPhone(user.profile.show_phone ?? false);
      setShowDob(user.profile.show_dob ?? false);
    }
    if (user?.phone) {
      setPhoneInput(user.phone);
    }
  }, [user]);

  if (!user) return null;

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const handleSaveAcademic = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingAcademic(true);
    try {
      await api.patch('/users/me/profile', {
        full_name: fullNameInput.trim() || user.username,
        school: schoolInput.trim(),
        grade: gradeInput.trim(),
        city: cityInput.trim(),
        country: countryInput.trim()
      });
      await refreshUser();
      showMessage('School and profile information updated! Your School Hub is now synced.', 'success');
    } catch (err: any) {
      showMessage(err.message || 'Failed to update academic profile', 'error');
    } finally {
      setSavingAcademic(false);
    }
  };

  const handleSavePrivacy = async () => {
    setLoading(true);
    try {
      await api.patch('/users/me/profile', {
        show_email: showEmail,
        show_phone: showPhone,
        show_dob: showDob
      });
      await refreshUser();
      showMessage('Privacy settings updated', 'success');
    } catch (err: any) {
      showMessage(err.message || 'Failed to update privacy settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestEmailOtp = async () => {
    setLoading(true);
    try {
      const res = await api.post<{message: string}>('/auth/request-email-otp', {});
      showMessage(res.message, 'success');
      setShowEmailOtpField(true);
    } catch (err: any) {
      showMessage(err.message || 'Failed to send OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!emailOtp) return;
    setLoading(true);
    try {
      const res = await api.post<{message: string}>('/auth/verify-email-otp', { contact: user.email, otp_code: emailOtp });
      showMessage(res.message, 'success');
      setShowEmailOtpField(false);
      await refreshUser();
    } catch (err: any) {
      showMessage(err.message || 'Verification failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPhoneOtp = async () => {
    if (!phoneInput) {
      showMessage('Please enter a phone number', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{message: string}>('/auth/request-phone-otp', { contact: phoneInput });
      showMessage(res.message, 'success');
      setShowPhoneOtpField(true);
    } catch (err: any) {
      showMessage(err.message || 'Failed to send OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!phoneOtp) return;
    setLoading(true);
    try {
      const res = await api.post<{message: string}>('/auth/verify-phone-otp', { contact: phoneInput, otp_code: phoneOtp });
      showMessage(res.message, 'success');
      setShowPhoneOtpField(false);
      await refreshUser();
    } catch (err: any) {
      showMessage(err.message || 'Verification failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you absolutely sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.')) {
      return;
    }
    
    setLoading(true);
    try {
      await api.delete('/users/me');
      alert('Your account has been successfully deleted.');
      window.location.href = '/login';
    } catch (err: any) {
      showMessage(err.message || 'Failed to delete account', 'error');
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-tight text-foreground">Settings &amp; Preferences</h1>
            <p className="text-xs text-muted-foreground font-medium tracking-wider">Manage your school affiliation, verification, and privacy</p>
          </div>
        </div>

        {message.text && (
          <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* 1. School & Academic Affiliation (Prominent First Section) */}
        <div className="bg-secondary/50 border border-border rounded-2xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold uppercase tracking-tight text-foreground">School &amp; Academic Affiliation</h2>
                <p className="text-xs text-muted-foreground">Join your school community to see classmates in the School Hub and campus posts</p>
              </div>
            </div>

            {user?.profile?.school ? (
              <Link
                to="/app/school"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline px-3.5 py-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0 w-fit transition-all hover:bg-primary/20"
              >
                <Building2 className="w-4 h-4" />
                <span>Open {user.profile.school} Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <span className="text-[11px] font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg shrink-0">
                No school assigned yet
              </span>
            )}
          </div>

          <form onSubmit={handleSaveAcademic} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Display Name
                </label>
                <input
                  type="text"
                  value={fullNameInput}
                  onChange={(e) => setFullNameInput(e.target.value)}
                  placeholder="Your full name"
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* School Name */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  School / Institution Name
                </label>
                <SchoolAutocompleteInput
                  value={schoolInput}
                  onChange={(schoolName) => setSchoolInput(schoolName)}
                  placeholder="Search campus, e.g. DPS, Modern School, Stanford..."
                  inputClassName="w-full bg-background border border-border rounded-xl pl-10 pr-10 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors font-medium"
                />
                <p className="text-[11px] text-muted-foreground">
                  Entering your school automatically links you to fellow students from that school in your <strong>School Hub</strong> and populates the <strong>🏫 In My School</strong> home feed.
                </p>
              </div>

              {/* Grade / Academic Level */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-primary" />
                  Grade / Academic Level
                </label>
                <input
                  type="text"
                  value={gradeInput}
                  onChange={(e) => setGradeInput(e.target.value)}
                  placeholder="e.g. Grade 11, Sophomore, Undergrad"
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Location (City & Country) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    City
                  </label>
                  <input
                    type="text"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    placeholder="e.g. New Delhi"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-primary" />
                    Country
                  </label>
                  <input
                    type="text"
                    value={countryInput}
                    onChange={(e) => setCountryInput(e.target.value)}
                    placeholder="e.g. India"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {user?.profile?.school ? (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Currently enrolled in <strong>{user.profile.school}</strong></span>
                </div>
              ) : (
                <div className="text-xs text-amber-500">
                  Save your school to connect with classmates.
                </div>
              )}
              <button
                type="submit"
                disabled={savingAcademic}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-md shadow-primary/20"
              >
                {savingAcademic ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                SAVE ACADEMIC PROFILE
              </button>
            </div>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Verification Section */}
          <div className="bg-secondary/50 border border-border rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold uppercase tracking-tight">Account Verification</h2>
            </div>

            {/* Email Verification */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{user.email}</span>
                </div>
                {user.is_email_verified ? (
                  <span className="text-[10px] uppercase font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-md">Verified</span>
                ) : (
                  <button onClick={handleRequestEmailOtp} disabled={loading} className="text-[10px] uppercase font-bold text-primary hover:underline">
                    Verify Now
                  </button>
                )}
              </div>
              
              {showEmailOtpField && !user.is_email_verified && (
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP" 
                    className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs"
                  />
                  <button onClick={handleVerifyEmail} disabled={loading} className="px-4 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/90">
                    Submit
                  </button>
                </div>
              )}
            </div>

            <div className="h-px bg-border my-4" />

            {/* Phone Verification */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium w-full max-w-[200px]">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  {!user.is_phone_verified && !showPhoneOtpField ? (
                     <input 
                       type="tel" 
                       value={phoneInput} 
                       onChange={(e) => setPhoneInput(e.target.value)} 
                       placeholder="+1234567890"
                       className="bg-background border border-border rounded-lg px-2 py-1 text-xs w-full"
                     />
                  ) : (
                     <span>{user.phone || 'No phone set'}</span>
                  )}
                </div>
                {user.is_phone_verified ? (
                  <span className="text-[10px] uppercase font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-md">Verified</span>
                ) : (
                  <button onClick={handleRequestPhoneOtp} disabled={loading} className="text-[10px] uppercase font-bold text-primary hover:underline whitespace-nowrap">
                    Verify Phone
                  </button>
                )}
              </div>

              {showPhoneOtpField && !user.is_phone_verified && (
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={phoneOtp}
                    onChange={(e) => setPhoneOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP" 
                    className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs"
                  />
                  <button onClick={handleVerifyPhone} disabled={loading} className="px-4 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/90">
                    Submit
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Privacy Section */}
          <div className="bg-secondary/50 border border-border rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold uppercase tracking-tight">Privacy Toggles</h2>
            </div>
            
            <p className="text-xs text-muted-foreground font-medium mb-4">
              Choose what information is visible to other users on your profile.
            </p>

            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Show Email Address</span>
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={showEmail} onChange={(e) => setShowEmail(e.target.checked)} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${showEmail ? 'bg-primary' : 'bg-muted'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showEmail ? 'translate-x-4' : ''}`}></div>
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Show Phone Number</span>
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={showPhone} onChange={(e) => setShowPhone(e.target.checked)} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${showPhone ? 'bg-primary' : 'bg-muted'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showPhone ? 'translate-x-4' : ''}`}></div>
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Show Date of Birth</span>
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={showDob} onChange={(e) => setShowDob(e.target.checked)} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${showDob ? 'bg-primary' : 'bg-muted'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showDob ? 'translate-x-4' : ''}`}></div>
                </div>
              </label>
            </div>

            <button
              onClick={handleSavePrivacy}
              disabled={loading}
              className="w-full mt-6 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              SAVE PRIVACY SETTINGS
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 space-y-6 mt-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold text-red-500 uppercase tracking-tight">Danger Zone</h2>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-foreground">Delete Account</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
            
            <button
              onClick={handleDeleteAccount}
              disabled={loading}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors whitespace-nowrap"
            >
              DELETE ACCOUNT
            </button>
          </div>
        </div>

      </div>
    </AppLayout>
  );
};
