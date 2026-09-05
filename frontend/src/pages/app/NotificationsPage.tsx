import React, { useState, useEffect } from 'react';
import { AppLayout } from '../../components/AppLayout';
import { api } from '../../services/api';
import type { NotificationItem } from '../../types';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCheck, 
  Heart, 
  MessageSquare, 
  UserPlus, 
  Award, 
  Sparkles, 
  UserCheck, 
  Check, 
  Trash2 
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchNotifications = async () => {
    try {
      const data = await api.get<NotificationItem[]>('/notifications');
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id: number, link?: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (e) {
      console.error(e);
    } finally {
      if (link) {
        navigate(link);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all notifications?')) return;
    try {
      await api.delete('/notifications/clear-all');
      setNotifications([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notifId: number) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    try {
      await api.delete(`/notifications/${notifId}`);
    } catch (err: any) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleAcceptFollow = async (e: React.MouseEvent, notif: NotificationItem) => {
    e.stopPropagation();
    const username = notif.sender_username || notif.link?.split('/').pop();
    if (!username) return;

    setProcessingId(notif.id);
    try {
      await api.post(`/users/${username}/accept-follow`);
      // Cleanly delete from DB
      try {
        await api.delete(`/notifications/${notif.id}`);
      } catch (e) {
        // Already handled by accept-follow
      }
      // Remove from UI
      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    } catch (err: any) {
      alert(err.message || 'Failed to accept request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectFollow = async (e: React.MouseEvent, notif: NotificationItem) => {
    e.stopPropagation();
    const username = notif.sender_username || notif.link?.split('/').pop();

    // Immediately remove from UI so user is never blocked or confused
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));

    try {
      if (username) {
        await api.post(`/users/${username}/reject-follow`);
      }
    } catch (err: any) {
      console.warn('Reject follow error:', err);
    }

    try {
      await api.delete(`/notifications/${notif.id}`);
    } catch (err: any) {
      console.warn('Delete notification error:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-red-400" />;
      case 'comment':
      case 'reply': return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case 'follow':
      case 'follow_request': return <UserPlus className="w-4 h-4 text-primary" />;
      case 'follow_accepted': return <UserCheck className="w-4 h-4 text-emerald-400" />;
      case 'opportunity': return <Award className="w-4 h-4 text-yellow-400" />;
      default: return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" /> Notifications
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Stay updated on followers, likes, comments, and direct messages.</p>
          </div>

          {notifications.length > 0 && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {notifications.some((n) => !n.is_read) && (
                <button
                  onClick={handleMarkAllRead}
                  className="px-3 py-1.5 rounded-xl bg-secondary border border-border text-xs font-bold text-primary hover:bg-white/5 flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <CheckCheck className="w-4 h-4" /> Mark All Read
                </button>
              )}
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 rounded-xl bg-secondary border border-border text-xs font-bold text-muted-foreground hover:text-red-400 hover:border-red-500/30 flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-muted-foreground">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="text-lg font-bold text-foreground uppercase">All caught up!</h3>
            <p className="text-xs text-muted-foreground mt-1">You have no new notifications right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const defaultLink = n.link || (n.sender_username ? `/app/profile/${n.sender_username}` : undefined);

              return (
                <div
                  key={n.id}
                  onClick={() => handleMarkRead(n.id, defaultLink)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 relative group ${
                    !n.is_read
                      ? 'bg-secondary/60 border-primary/30 shadow-md shadow-primary/10'
                      : 'bg-card border-border opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Sender Avatar / Icon - Clickable to Profile */}
                  <div
                    onClick={(e) => {
                      if (n.sender_username) {
                        e.stopPropagation();
                        handleMarkRead(n.id);
                        navigate(`/app/profile/${n.sender_username}`);
                      }
                    }}
                    className={`w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 overflow-hidden ${
                      n.sender_username ? 'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all' : ''
                    }`}
                    title={n.sender_username ? `View @${n.sender_username}'s profile` : undefined}
                  >
                    {n.sender_avatar ? (
                      <img src={n.sender_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      getIcon(n.type)
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-bold text-foreground">{n.title}</h4>
                        {n.sender_username && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkRead(n.id);
                              navigate(`/app/profile/${n.sender_username}`);
                            }}
                            className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center"
                          >
                            @{n.sender_username}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</span>
                        <button
                          onClick={(e) => handleDeleteNotification(e, n.id)}
                          className="p-1 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete notification"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.body}</p>

                    {/* Follow Request Quick Actions */}
                    {n.type === 'follow_request' && n.is_pending_request !== false && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          disabled={processingId === n.id}
                          onClick={(e) => handleAcceptFollow(e, n)}
                          className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" /> Confirm
                        </button>
                        <button
                          disabled={processingId === n.id}
                          onClick={(e) => handleRejectFollow(e, n)}
                          className="px-3 py-1.5 rounded-xl bg-secondary border border-border text-xs font-bold text-muted-foreground hover:text-red-400 hover:border-red-500/30 transition-all disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
