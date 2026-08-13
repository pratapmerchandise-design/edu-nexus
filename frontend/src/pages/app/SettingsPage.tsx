import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { AppLayout } from '../../components/AppLayout';
import { Settings as SettingsIcon, Shield, Mail, Phone, Lock, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

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

  if (!user) return null;

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
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

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
          <SettingsIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-foreground">Settings</h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Manage your account preferences</p>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

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
      </div>
    </AppLayout>
  );
};
