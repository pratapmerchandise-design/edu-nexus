import React, { useState } from 'react';
import { api } from '../services/api';
import { X } from 'lucide-react';

interface CreateGroupModalProps {
  onClose: () => void;
  onSuccess: (groupId: number) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      const res = await api.post<{id: number}>('/conversations/groups', { name: name.trim(), is_public: isPublic });
      onSuccess(res.id);
    } catch (err: any) {
      alert(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-sm font-bold text-foreground">Create New Group</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1">Group Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Study Group"
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded border-border bg-secondary"
            />
            <label htmlFor="isPublic" className="text-xs text-muted-foreground cursor-pointer">
              Make this group public (discoverable)
            </label>
          </div>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:brightness-110 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  );
};
