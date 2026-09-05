import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import { LandingPage } from './pages/LandingPage';
import { AboutPage } from './pages/AboutPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { PublicOpportunitiesPage } from './pages/PublicOpportunitiesPage';
import { ContactPage } from './pages/ContactPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';

import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { StudentGuidelinesPage } from './pages/StudentGuidelinesPage';
import { PublicSchoolsPage } from './pages/PublicSchoolsPage';

import { FeedPage } from './pages/app/FeedPage';
import { DiscoverPage } from './pages/app/DiscoverPage';
import { ForumsPage } from './pages/app/ForumsPage';
import { OpportunitiesPage } from './pages/app/OpportunitiesPage';
import { MessagesPage } from './pages/app/MessagesPage';
import { NotificationsPage } from './pages/app/NotificationsPage';
import { ProfilePage } from './pages/app/ProfilePage';
import { AdminPage } from './pages/app/AdminPage';
import { SettingsPage } from './pages/app/SettingsPage';
import { SchoolHubPage } from './pages/app/SchoolHubPage';
import { MembershipPage } from './pages/app/MembershipPage';
import { PublicProfilePage } from './pages/PublicProfilePage';
import { PublicPostPage } from './pages/PublicPostPage';
import { RejectInvitationPage } from './pages/RejectInvitationPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center text-xs">
        Loading Edu Nexus...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.is_email_verified) {
    return <Navigate to="/verify-email" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/app/feed" replace />;
  }

  return <>{children}</>;
};

export const AppContent: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/opportunities" element={<PublicOpportunitiesPage />} />
      <Route path="/schools" element={<PublicSchoolsPage />} />
      <Route path="/guidelines" element={<StudentGuidelinesPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/set-password" element={<ForgotPasswordPage />} />
      <Route path="/reject-invitation" element={<RejectInvitationPage />} />
      <Route path="/u/:username" element={<PublicProfilePage />} />
      <Route path="/p/:id" element={<PublicPostPage />} />
      <Route path="/post/:id" element={<PublicPostPage />} />
      <Route path="/posts/:id" element={<PublicPostPage />} />
      <Route path="/app/post/:id" element={<PublicPostPage />} />
      <Route path="/app/posts/:id" element={<PublicPostPage />} />

      {/* Authenticated Application Shell Routes */}
      <Route path="/app" element={<Navigate to="/app/feed" replace />} />
      <Route path="/app/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
      <Route path="/app/discover" element={<ProtectedRoute><DiscoverPage /></ProtectedRoute>} />
      <Route path="/app/forums" element={<ProtectedRoute><ForumsPage /></ProtectedRoute>} />
      <Route path="/app/opportunities" element={<ProtectedRoute><OpportunitiesPage /></ProtectedRoute>} />
      <Route path="/app/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
      <Route path="/app/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/app/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/app/profile/:username" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/app/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/app/school" element={<ProtectedRoute><SchoolHubPage /></ProtectedRoute>} />
      <Route path="/app/membership" element={<ProtectedRoute><MembershipPage /></ProtectedRoute>} />
      <Route path="/app/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />


      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
