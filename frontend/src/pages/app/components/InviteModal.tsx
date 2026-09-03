import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { X, Search } from 'lucide-react';
import type { User } from '../../../types';

interface Props {
  groupId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const InviteModal: React.FC<Props> = ({ groupId, onClose, onSuccess }) => {
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!searchUsername.trim()) {
        setSearchResults([]);
        return;
      }
      try {
        const res = await api.get<User[]>(`/discover/students?query=${searchUsername.trim()}`);
        setSearchResults(res);
      } catch (e) {
        setSearchResults([]);
      }
    };
    
    const timeoutId = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchUsername]);

  const handleInvite = async (user: User) => {
    try {
      await api.post(`/conversations/${groupId}/invite?target_username=${user.username}`);
      alert("Invitation sent!");
      onSuccess();
      onClose();
    } catch (e: any) {
      alert(e.message || "Failed to invite user");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/30 rounded-t-2xl">
          <h2 className="text-sm font-bold tracking-tight">Invite to Group</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto space-y-4">
          <div className="flex gap-2">
            <input type="text" value={searchUsername} onChange={e => setSearchUsername(e.target.value)} className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2 text-sm" placeholder="Search by name or username..." />
            <div className="button button-secondary px-3 flex items-center"><Search className="w-4 h-4" /></div>
          </div>
          
          {searchResults.length > 0 && (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {searchResults.map(u => (
                <div key={u.id} className="flex items-center justify-between bg-secondary/50 p-2 rounded-xl">
                  <div className="flex items-center gap-2">
                    <img src={u.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} className="w-6 h-6 rounded-full" />
                    <div className="text-xs font-bold">
                      {u.profile?.full_name || u.username} <span className="text-[10px] text-muted-foreground font-normal">@{u.username}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => handleInvite(u)} className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-1 rounded-md">Invite</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
