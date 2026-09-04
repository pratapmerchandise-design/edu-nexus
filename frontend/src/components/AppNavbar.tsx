import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { NotificationItem, Conversation } from '../types';
import { UserAvatar } from './UserAvatar';
import { MembershipBadge } from './MembershipBadge';
import { Home, Compass, MessageSquare, Award, Bell, User as UserIcon, Shield, LogOut, Search, Sun, Moon, Crown, Building2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const AppNavbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [unreadMsgsCount, setUnreadMsgsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const fetchUnreadCounts = async () => {
    if (!user) return;
    try {
      const notifs = await api.get<NotificationItem[]>('/notifications');
      setUnreadNotifsCount(notifs.filter(n => !n.is_read).length);

      const convs = await api.get<Conversation[]>('/conversations');
      const totalUnreadMsgs = convs.reduce((acc, c) => acc + (c.unread_count || 0), 0);
      setUnreadMsgsCount(totalUnreadMsgs);
    } catch (e) {
      // Ignore count fetch errors
    }
  };

  useEffect(() => {
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 12000);
    return () => clearInterval(interval);
  }, [user]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/app/discover?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navItems = [
    { label: 'Home', path: '/app/feed', icon: Home },
    { label: 'Discover', path: '/app/discover', icon: Compass },
    { label: 'School', path: '/app/school', icon: Building2 },
    { label: 'Opportunities', path: '/app/opportunities', icon: Award },
    { label: 'Profile', path: `/app/profile/${user?.username || ''}`, icon: UserIcon },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link to="/app/feed" className="flex items-center gap-3">
            <img src="/edu-nexus-logo-light.png" alt="Edu Nexus" className="h-8 object-contain logo-for-light" />
            <img src="/edu-nexus-logo.png" alt="Edu Nexus" className="h-8 object-contain logo-for-dark" />
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search students, posts, opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-input border border-border rounded-full pl-10 pr-4 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </form>

          {/* Action icons & User menu */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <Link
              to="/app/messages"
              className="relative p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Messages"
            >
              <MessageSquare className="w-5 h-5" />
              {unreadMsgsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground font-bold text-[9px] flex items-center justify-center">
                  {unreadMsgsCount > 9 ? '9+' : unreadMsgsCount}
                </span>
              )}
            </Link>

            <Link
              to="/app/notifications"
              className="relative p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground font-bold text-[9px] flex items-center justify-center">
                  {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                </span>
              )}
            </Link>

            {/* Early Bird Membership Callout */}
            <Link
              to="/app/membership"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-primary/15 to-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold text-xs hover:border-emerald-400/60 transition-all shadow-xs"
              title="Claim 1 Month Free Early Bird Pass"
            >
              <Crown className="w-3.5 h-3.5 text-primary" />
              <span>1 Mo Free</span>
            </Link>

            {user?.role === 'admin' && (
              <Link
                to="/app/admin"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary font-semibold text-xs hover:bg-primary/20 transition-all"
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </Link>
            )}

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-0.5 rounded-full transition-transform hover:scale-105"
                title="Account Menu"
              >
                <UserAvatar
                  src={user?.profile?.avatar_url}
                  username={user?.username}
                  membership={user?.membership}
                  size={36}
                />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-2xl py-2 z-50 animate-in">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-xs font-bold text-card-foreground truncate flex items-center gap-1.5">
                      {user?.profile?.full_name || user?.username}
                      <MembershipBadge membership={user?.membership} size={13} />
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">@{user?.username}</p>
                  </div>
                  <Link
                    to={`/app/profile/${user?.username}`}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
                  >
                    <UserIcon className="w-3.5 h-3.5" /> My Profile
                  </Link>
                  <Link
                    to="/app/membership"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Crown className="w-3.5 h-3.5 text-primary" /> Membership
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-400">
                      FREE
                    </span>
                  </Link>
                  {user?.role === 'admin' && (
                    <Link
                      to="/app/admin"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs text-primary hover:bg-secondary transition-colors"
                    >
                      <Shield className="w-3.5 h-3.5" /> Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-500 hover:bg-secondary transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-t border-border px-2 py-2 flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};
