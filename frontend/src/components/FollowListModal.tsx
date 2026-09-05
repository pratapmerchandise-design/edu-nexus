import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { User } from '../types';
import { UserAvatar } from './UserAvatar';
import { MembershipBadge } from './MembershipBadge';
import { X, Search, UserCheck, UserPlus, Clock, UserX, Check, ShieldAlert } from 'lucide-react';
import { AuroraGlow } from './reactbits/AuroraGlow';

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'followers' | 'following' | 'requests';
  username: string;
  isOwnProfile: boolean;
  onStatsChange?: () => void;
}

export const FollowListModal: React.FC<FollowListModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'followers',
  username,
  isOwnProfile,
  onStatsChange,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'followers' | 'following' | 'requests'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [requests, setRequests] = useState<User[]>([]);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery('');
      loadData();
    }
  }, [isOpen, username, initialTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [followersData, followingData] = await Promise.all([
        api.get<User[]>(`/users/${username}/followers`),
        api.get<User[]>(`/users/${username}/following`),
      ]);
      setFollowers(followersData);
      setFollowing(followingData);

      if (isOwnProfile) {
        try {
          const reqs = await api.get<User[]>('/users/follow-requests/pending');
          setRequests(reqs);
        } catch {
          setRequests([]);
        }
      }
    } catch (err) {
      console.error('Error loading follow relationships:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (targetUser: User, action: 'follow' | 'unfollow' | 'cancel_request' | 'remove_follower' | 'accept_request' | 'reject_request') => {
    const key = `${targetUser.username}_${action}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));

    try {
      if (action === 'follow') {
        const res = await api.post<{ follow_status?: string }>(`/users/${targetUser.username}/follow`);
        const newStatus = (res.follow_status || 'pending') as 'none' | 'pending' | 'accepted';
        updateUserRelationship(targetUser.username, newStatus);
        onStatsChange?.();
      } else if (action === 'unfollow' || action === 'cancel_request') {
        await api.delete(`/users/${targetUser.username}/follow`);
        updateUserRelationship(targetUser.username, 'none');
        if (action === 'unfollow' && isOwnProfile && activeTab === 'following') {
          setFollowing((prev) => prev.filter((u) => u.username !== targetUser.username));
        }
        onStatsChange?.();
      } else if (action === 'remove_follower') {
        if (confirm(`Remove @${targetUser.username} from your followers?`)) {
          await api.delete(`/users/${targetUser.username}/remove-follower`);
          setFollowers((prev) => prev.filter((u) => u.username !== targetUser.username));
          onStatsChange?.();
        }
      } else if (action === 'accept_request') {
        await api.post(`/users/${targetUser.username}/accept-follow`);
        setRequests((prev) => prev.filter((u) => u.username !== targetUser.username));
        // Add to followers list
        setFollowers((prev) => [{ ...targetUser, is_following: false, follow_status: 'none' }, ...prev]);
        onStatsChange?.();
      } else if (action === 'reject_request') {
        await api.post(`/users/${targetUser.username}/reject-follow`);
        setRequests((prev) => prev.filter((u) => u.username !== targetUser.username));
        onStatsChange?.();
      }
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const updateUserRelationship = (uname: string, newStatus: 'none' | 'pending' | 'accepted') => {
    const updateList = (list: User[]) =>
      list.map((u) =>
        u.username === uname
          ? {
              ...u,
              follow_status: newStatus,
              is_following: newStatus === 'accepted',
            }
          : u
      );

    setFollowers(updateList);
    setFollowing(updateList);
    setRequests((prev) => prev.filter((u) => u.username !== uname));
  };

  const currentList = useMemo(() => {
    let list: User[] = [];
    if (activeTab === 'followers') list = followers;
    else if (activeTab === 'following') list = following;
    else if (activeTab === 'requests') list = requests;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.profile?.full_name && u.profile.full_name.toLowerCase().includes(q)) ||
        (u.profile?.school && u.profile.school.toLowerCase().includes(q))
    );
  }, [activeTab, followers, following, requests, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative animate-in zoom-in-95 duration-200">
        <AuroraGlow size="full" opacity={0.3} />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-foreground">
              @{username}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="relative z-10 flex border-b border-border bg-secondary/50">
          <button
            onClick={() => { setActiveTab('followers'); setSearchQuery(''); }}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'followers'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Followers
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary border border-border">
              {followers.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('following'); setSearchQuery(''); }}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'following'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Following
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary border border-border">
              {following.length}
            </span>
          </button>

          {isOwnProfile && (
            <button
              onClick={() => { setActiveTab('requests'); setSearchQuery(''); }}
              className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                activeTab === 'requests'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Requests
              {requests.length > 0 ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-extrabold animate-pulse">
                  {requests.length}
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary border border-border">
                  0
                </span>
              )}
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative z-10 p-3 border-b border-border bg-card">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full bg-secondary border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* User List Content */}
        <div className="relative z-10 flex-1 overflow-y-auto divide-y divide-border/40 p-2 min-h-[260px] max-h-[50vh]">
          {loading ? (
            <div className="py-16 text-center text-xs text-muted-foreground animate-pulse">
              Loading {activeTab}...
            </div>
          ) : currentList.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
              <div className="w-10 h-10 rounded-full bg-secondary border border-border mx-auto flex items-center justify-center text-muted-foreground">
                <UserCheck className="w-5 h-5 opacity-60" />
              </div>
              <p className="font-semibold text-foreground">
                {searchQuery
                  ? 'No matching students found.'
                  : activeTab === 'followers'
                  ? 'No followers yet.'
                  : activeTab === 'following'
                  ? 'Not following anyone yet.'
                  : 'No pending follow requests.'}
              </p>
              <p className="text-[11px] text-muted-foreground/80 max-w-xs mx-auto">
                {activeTab === 'requests'
                  ? 'When students request to follow you, they will appear here.'
                  : 'Connect with students through Discover, campus posts, and collaboration groups.'}
              </p>
            </div>
          ) : (
            currentList.map((targetUser) => {
              const fullName = targetUser.profile?.full_name || targetUser.username;
              const isFollowerTab = activeTab === 'followers';
              const isRequestsTab = activeTab === 'requests';
              const isFollowingTab = activeTab === 'following';

              const followStatus = targetUser.follow_status || (targetUser.is_following ? 'accepted' : 'none');

              return (
                <div
                  key={targetUser.id}
                  className="p-3 rounded-2xl hover:bg-secondary/40 transition-colors flex items-center justify-between gap-3 group"
                >
                  {/* User Avatar + Details */}
                  <div
                    onClick={() => {
                      onClose();
                      navigate(`/app/profile/${targetUser.username}`);
                    }}
                    className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                  >
                    <UserAvatar
                      src={targetUser.profile?.avatar_url}
                      username={targetUser.username}
                      membership={targetUser.membership}
                      size={42}
                      className="border border-border shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {fullName}
                        </span>
                        <MembershipBadge membership={targetUser.membership} size={14} />
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        @{targetUser.username}
                      </p>
                      {targetUser.profile?.school && (
                        <p className="text-[10px] text-primary/80 truncate mt-0.5">
                          📍 {targetUser.profile.school}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isRequestsTab ? (
                      /* Follow Requests Tab: Confirm / Delete */
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={actionLoading[`${targetUser.username}_accept_request`]}
                          onClick={() => handleAction(targetUser, 'accept_request')}
                          className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 flex items-center gap-1 shadow-sm transition-all"
                        >
                          <Check className="w-3.5 h-3.5" /> Confirm
                        </button>
                        <button
                          disabled={actionLoading[`${targetUser.username}_reject_request`]}
                          onClick={() => handleAction(targetUser, 'reject_request')}
                          className="px-2.5 py-1.5 rounded-xl bg-secondary border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:border-border/80 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    ) : isFollowerTab && isOwnProfile ? (
                      /* Own Profile Followers Tab: Remove follower button */
                      <button
                        disabled={actionLoading[`${targetUser.username}_remove_follower`]}
                        onClick={() => handleAction(targetUser, 'remove_follower')}
                        className="px-3 py-1.5 rounded-xl bg-secondary border border-border text-xs font-bold text-muted-foreground hover:text-red-400 hover:border-red-500/40 transition-all flex items-center gap-1"
                        title="Remove as follower"
                      >
                        <UserX className="w-3.5 h-3.5" /> Remove
                      </button>
                    ) : (
                      /* General Follow / Requested / Following button */
                      <div>
                        {followStatus === 'accepted' ? (
                          <button
                            disabled={actionLoading[`${targetUser.username}_unfollow`]}
                            onClick={() => handleAction(targetUser, 'unfollow')}
                            className="px-3.5 py-1.5 rounded-xl bg-secondary border border-border text-xs font-bold text-muted-foreground hover:text-red-400 hover:border-red-500/40 transition-all flex items-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-primary" /> Following
                          </button>
                        ) : followStatus === 'pending' ? (
                          <button
                            disabled={actionLoading[`${targetUser.username}_cancel_request`]}
                            onClick={() => handleAction(targetUser, 'cancel_request')}
                            className="px-3.5 py-1.5 rounded-xl bg-secondary border border-primary/30 text-xs font-bold text-primary hover:bg-primary/10 transition-all flex items-center gap-1"
                            title="Click to cancel follow request"
                          >
                            <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} /> Requested
                          </button>
                        ) : (
                          <button
                            disabled={actionLoading[`${targetUser.username}_follow`]}
                            onClick={() => handleAction(targetUser, 'follow')}
                            className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 transition-all flex items-center gap-1 shadow-sm"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Follow
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
