import React, { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { X, Search } from 'lucide-react';
import type { User } from '../../../types';

interface Props {
  onClose: () => void;
  onSuccess: (groupId: number) => void;
}

export const CreateGroupModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [selectedUsernames, setSelectedUsernames] = useState<string[]>([]);
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

  const handleAddUser = (user: User) => {
    if (!selectedUsernames.includes(user.username)) {
      setSelectedUsernames([...selectedUsernames, user.username]);
    }
    // Don't clear search immediately, allow adding multiple
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post<any>('/conversations/groups', {
        name,
        description,
        is_public: isPublic,
        initial_member_usernames: selectedUsernames
      });
      onSuccess(res.id);
    } catch (e: any) {
      alert(e.message || "Failed to create group");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/30 rounded-t-2xl">
          <h2 className="text-sm font-bold tracking-tight">Create Group</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleCreate} className="p-4 overflow-y-auto space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Group Name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="e.g., Hackathon Team" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm resize-none" placeholder="What's this group about?" rows={3} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isPublic" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="rounded border-border bg-secondary" />
            <label htmlFor="isPublic" className="text-sm font-medium">Make Group Public (Discoverable)</label>
          </div>

          <div className="pt-4 border-t border-border">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Invite Members</label>
            <div className="flex gap-2 mb-2">
              <input type="text" value={searchUsername} onChange={e => setSearchUsername(e.target.value)} className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2 text-sm" placeholder="Search by name or username..." />
              <div className="button button-secondary px-3 flex items-center"><Search className="w-4 h-4" /></div>
            </div>
            {searchResults.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1 mb-2">
                {searchResults.map(u => (
                  <div key={u.id} className="flex items-center justify-between bg-secondary/50 p-2 rounded-xl">
                    <div className="text-xs font-bold">
                      {u.profile?.full_name || u.username} <span className="text-[10px] text-muted-foreground font-normal">@{u.username}</span>
                    </div>
                    {!selectedUsernames.includes(u.username) ? (
                      <button type="button" onClick={() => handleAddUser(u)} className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-1 rounded-md">Add</button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-bold px-2 py-1">Added</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex flex-wrap gap-2">
              {selectedUsernames.map(u => (
                <span key={u} className="text-[10px] font-bold px-2 py-1 bg-secondary border border-border rounded-lg flex items-center gap-1">
                  @{u} <X className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={() => setSelectedUsernames(selectedUsernames.filter(x => x !== u))} />
                </span>
              ))}
            </div>
          </div>

          <button type="submit" className="button button-solid w-full mt-4">Create Group</button>
        </form>
      </div>
    </div>
  );
};
