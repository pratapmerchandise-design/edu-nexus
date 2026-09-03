import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X, Search } from 'lucide-react';
import type { UserOut } from '../types';

interface InviteModalProps {
  groupId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ groupId, onClose, onSuccess }) => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const url = query.trim() ? `/discover/students?query=${encodeURIComponent(query.trim())}` : '/discover/students';
        const res = await api.get<UserOut[]>(url);
        setUsers(res);
      } catch (e) {
        console.error('Failed to search users:', e);
      } finally {
        setLoading(false);
      }
    };
    
    // Add debounce for search query
    const debounceId = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounceId);
  }, [query]);

  const handleInvite = async (username: string) => {
    try {
      setInviting(username);
      await api.post(`/conversations/${groupId}/invite/${username}`);
      alert(`Invited @${username} to the group!`);
      onSuccess?.();
    } catch (err: any) {
      alert(err.message || 'Failed to invite user');
    } finally {
      setInviting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="text-sm font-bold text-foreground">Invite to Group</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 border-b border-border shrink-0 bg-secondary/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search students to invite..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="p-4 text-center text-xs text-muted-foreground">Searching...</div>
          ) : users.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">No users found.</div>
          ) : (
            <div className="space-y-1">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-secondary transition-colors">
                  <div className="flex items-center gap-3">
                    <img 
                      src={u.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} 
                      alt={u.username}
                      className="w-8 h-8 rounded-full border border-border object-cover"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{u.profile?.full_name || u.username}</h4>
                      <p className="text-[10px] text-muted-foreground">@{u.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleInvite(u.username)}
                    disabled={inviting === u.username}
                    className="px-3 py-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-lg hover:brightness-110 disabled:opacity-50"
                  >
                    {inviting === u.username ? 'Inviting...' : 'Invite'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
