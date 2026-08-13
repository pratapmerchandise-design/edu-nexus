import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Compass, MessageSquare, Award, Bell, User as UserIcon, Shield, Sparkles, Settings } from 'lucide-react';

export const AppSidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const links = [
    { label: 'Home Feed', path: '/app/feed', icon: Home },
    { label: 'Discover Students', path: '/app/discover', icon: Compass },
    { label: 'Forums & Discussions', path: '/app/forums', icon: MessageSquare },
    { label: 'Opportunities', path: '/app/opportunities', icon: Award },
    { label: 'Direct Messages', path: '/app/messages', icon: MessageSquare },
    { label: 'Notifications', path: '/app/notifications', icon: Bell },
    { label: 'My Profile', path: `/app/profile/${user?.username || ''}`, icon: UserIcon },
    { label: 'Settings', path: '/app/settings', icon: Settings },
  ];

  if (user?.role === 'admin') {
    links.push({ label: 'Admin Moderation', path: '/app/admin', icon: Shield });
  }

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border p-4 shrink-0 h-[calc(100vh-65px)] sticky top-[65px] overflow-y-scroll overflow-x-hidden bg-background/60 backdrop-blur-sm">
      {/* User profile snippet card */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-6 relative overflow-hidden shadow-sm">
        <div className="flex items-center gap-3">
          <img
            src={user?.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
            alt={user?.username}
            className="w-11 h-11 rounded-full border-2 border-primary object-cover"
          />
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-card-foreground truncate">{user?.profile?.full_name || user?.username}</h4>
            <p className="text-xs text-primary font-medium truncate">@{user?.username}</p>
          </div>
        </div>
        {user?.profile?.school && (
          <p className="text-[11px] text-muted-foreground mt-3 truncate">📍 {user.profile.school}</p>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="space-y-1.5">
        {links.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer Badge */}
      <div className="mt-auto pt-6 border-t border-border">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Edu Nexus V1 • Active</span>
        </div>
      </div>
    </aside>
  );
};
