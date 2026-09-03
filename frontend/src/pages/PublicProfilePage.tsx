import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { UserAvatar } from '../components/UserAvatar';
import { UserPlus, MessageSquare, Share2 } from 'lucide-react';

export const PublicProfilePage: React.FC = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.get<any>(`/users/public/${username}`).then(setData).catch(() => setData(null)); }, [username]);
  const signInRequired = () => navigate(`/signup?redirect=/app/profile/${username}`);
  const share = async () => { const url = window.location.href; if (navigator.share) await navigator.share({ title: `${username} on EduNexus`, url }); else await navigator.clipboard.writeText(url); };
  if (!data) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Profile not found.</div>;
  const p = data.profile;
  return <main className="min-h-screen bg-background p-4 md:p-10"><div className="max-w-2xl mx-auto space-y-4">
    <div className="bg-card border border-border rounded-3xl p-6"><div className="flex items-center gap-4"><UserAvatar src={p.profile?.avatar_url} username={p.username} size={80}/><div className="flex-1"><h1 className="text-xl font-bold">{p.profile?.full_name || p.username}</h1><p className="text-primary">@{p.username}</p><p className="text-xs text-muted-foreground">{p.profile?.city || p.profile?.school || 'EduNexus student'}</p></div><button onClick={share} className="button button-ghost"><Share2 className="w-4 h-4"/> Share</button></div><p className="text-sm mt-5">{p.profile?.bio}</p><div className="flex gap-2 mt-5"><button onClick={signInRequired} className="button button-primary flex-1"><UserPlus className="w-4 h-4"/> Follow</button><button onClick={signInRequired} className="button button-ghost flex-1"><MessageSquare className="w-4 h-4"/> Message</button></div><p className="text-[11px] text-muted-foreground text-center mt-3">Join EduNexus to follow, message, and interact.</p></div>
    <section className="space-y-3"><h2 className="text-sm font-bold uppercase">Public posts</h2>{data.posts.map((post:any) => <article key={post.id} className="bg-card border border-border rounded-2xl p-4"><p className="text-sm whitespace-pre-wrap">{post.content}</p>{post.image_url && <img src={post.image_url} className="mt-3 rounded-xl max-h-96 w-full object-cover"/>}</article>)}</section>
    <Link to="/signup" className="block text-center text-sm text-primary">Create your free EduNexus account →</Link>
  </div></main>;
};
