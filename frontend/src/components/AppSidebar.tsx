import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserAvatar } from './UserAvatar';
import { MembershipBadge } from './MembershipBadge';
import { Home, Compass, MessageSquare, Award, Bell, User as UserIcon, Shield, Settings, Building2, Sparkles, Crown } from 'lucide-react';

export const AppSidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const mainLinks = [
    { label: 'Home', path: '/app/feed', icon: Home },
    { label: 'Find Your Next Collaborator', path: '/app/discover', icon: Compass },
    { label: 'Opportunities', path: '/app/opportunities', icon: Award },
    { label: 'Direct Messages', path: '/app/messages', icon: MessageSquare },
    { label: 'Notifications', path: '/app/notifications', icon: Bell },
  ];

  const campusLinks = [
    { label: 'School Hub', path: '/app/school', icon: Building2 },
    { label: 'Membership', path: '/app/membership', icon: Crown, badge: '1 Mo Free' },
    { label: 'My Profile', path: `/app/profile/${user?.username || ''}`, icon: UserIcon },
    { label: 'Settings', path: '/app/settings', icon: Settings },
  ];

  const adminLinks = [
    { label: 'Moderation Queue', path: '/app/admin', icon: Shield },
  ];

  return (
    <aside className="app-sidebar hidden md:flex flex-col w-64 border-r border-border p-4 shrink-0 h-full overflow-y-auto overflow-x-hidden bg-card backdrop-blur-md scrollbar-thin">
      {/* User profile snippet card */}
      <Link
        to={`/app/profile/${user?.username || ''}`}
        className="w-full box-border bg-secondary/50 hover:bg-secondary border border-border/70 hover:border-primary/40 rounded-2xl p-3.5 mb-5 shadow-xs shrink-0 transition-all group block"
      >
        <div className="flex items-center gap-3">
          <UserAvatar
            src={user?.profile?.avatar_url}
            username={user?.username}
            membership={user?.membership}
            size={42}
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors flex items-center gap-1.5">
              {user?.profile?.full_name || user?.username}
              <MembershipBadge membership={user?.membership} size={14} />
            </h4>
            <p className="text-[11px] text-muted-foreground truncate">@{user?.username}</p>
          </div>
        </div>
        {user?.profile?.school && (
          <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
            <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{user.profile.school}</span>
          </div>
        )}
      </Link>

      {/* Main Navigation */}
      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-2">Menu</p>
          <nav className="space-y-1.5">
            {mainLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                    isActive
                      ? 'bg-primary/10 text-primary font-bold border-primary/25 shadow-xs'
                      : 'text-foreground/80 hover:text-foreground bg-secondary/20 hover:bg-secondary border-border/30 hover:border-border/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Campus & Account */}
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-2">Campus & Profile</p>
          <nav className="space-y-1.5">
            {campusLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                    isActive
                      ? 'bg-primary/10 text-primary font-bold border-primary/25 shadow-xs'
                      : 'text-foreground/80 hover:text-foreground bg-secondary/20 hover:bg-secondary border-border/30 hover:border-border/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="truncate flex-1">{item.label}</span>
                  {(item as any).badge && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {(item as any).badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Admin Navigation (If authorized) */}
        {user?.role === 'admin' && (
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-2">Administration</p>
            <nav className="space-y-1.5">
              {adminLinks.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                      isActive
                        ? 'bg-primary/10 text-primary font-bold border-primary/25 shadow-xs'
                        : 'text-foreground/80 hover:text-foreground bg-secondary/20 hover:bg-secondary border-border/30 hover:border-border/80'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Sidebar Footer Badge */}
      <div className="mt-auto pt-4 border-t border-border shrink-0">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Edu Nexus • Verified Network</span>
        </div>
      </div>
    </aside>
  );
};
