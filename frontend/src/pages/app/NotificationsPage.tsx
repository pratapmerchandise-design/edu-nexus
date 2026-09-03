import React, { useState, useEffect } from 'react';
import { AppLayout } from '../../components/AppLayout';
import { api } from '../../services/api';
import type { NotificationItem } from '../../types';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Heart, MessageSquare, UserPlus, Award, Sparkles } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-red-400" />;
      case 'comment':
      case 'reply': return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case 'follow': return <UserPlus className="w-4 h-4 text-primary" />;
      case 'opportunity': return <Award className="w-4 h-4 text-yellow-400" />;
      default: return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" /> Notifications
            </h2>
            <p className="text-xs text-muted-foreground">Stay updated on followers, likes, comments, and direct messages.</p>
          </div>

          {notifications.some((n) => !n.is_read) && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 rounded-xl bg-secondary border border-border text-xs font-bold text-primary hover:bg-white/5 flex items-center gap-1.5"
            >
              <CheckCheck className="w-4 h-4" /> Mark All Read
            </button>
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
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleMarkRead(n.id, n.link)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                  !n.is_read
                    ? 'bg-secondary border-primary/30 shadow-md shadow-primary/20'
                    : 'bg-card border-border opacity-75 hover:opacity-100'
                }`}
              >
                <div className="p-2 rounded-full bg-secondary border border-border shrink-0">
                  {getIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-foreground">{n.title}</h4>
                    <span className="text-[9px] text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{n.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
