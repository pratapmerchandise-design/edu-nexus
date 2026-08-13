import React, { useState, useEffect } from 'react';
import { AppLayout } from '../../components/AppLayout';
import { api } from '../../services/api';
import { renderContentWithHighlights, timeAgo } from '../../utils/textUtils';
import type { User, Post } from '../../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';

export const DiscoverPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'students' | 'posts'>('students');

  // Search Filters
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [selectedInterest, setSelectedInterest] = useState('');

  const [students, setStudents] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      if (selectedSkill) params.append('skill', selectedSkill);
      if (selectedInterest) params.append('interest', selectedInterest);

      const res = await api.get<User[]>(`/discover/students?${params.toString()}`);
      setStudents(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      const res = await api.get<Post[]>(`/discover/posts?${params.toString()}`);
      setPosts(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudents();
    } else {
      fetchPosts();
    }
  }, [activeTab, query, selectedSkill, selectedInterest]);

  const handleFollowToggle = async (username: string, currentStatus?: boolean) => {
    try {
      if (currentStatus) {
        await api.delete(`/users/${username}/follow`);
      } else {
        await api.post(`/users/${username}/follow`);
      }
      fetchStudents();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartMessage = async (username: string) => {
    try {
      const conv = await api.post<any>(`/conversations?target_username=${username}`);
      navigate(`/app/messages?conv=${conv.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to start conversation');
    }
  };

  const sampleSkills = ['Python', 'Web Development', 'UI/UX Design', 'Robotics', 'C++', 'Machine Learning'];
  const sampleInterests = ['Artificial Intelligence', 'Programming', 'Research', 'Design', 'Business', 'Mathematics'];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-2xl font-bold uppercase tracking-tight text-foreground mb-2">Discover The Nexus</h2>
          <p className="text-xs text-muted-foreground">Search ambitious students, skills, location, and relevant posts.</p>

          {/* Search Inputs */}
          <div className="mt-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, username, bio..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>

            {/* Quick Skill & Interest Filter Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Skills:</span>
              {sampleSkills.map((sk) => (
                <button
                  key={sk}
                  onClick={() => setSelectedSkill(selectedSkill === sk ? '' : sk)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                    selectedSkill === sk
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground border border-border hover:text-foreground'
                  }`}
                >
                  {sk}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Interests:</span>
              {sampleInterests.map((intr) => (
                <button
                  key={intr}
                  onClick={() => setSelectedInterest(selectedInterest === intr ? '' : intr)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                    selectedInterest === intr
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground border border-border hover:text-foreground'
                  }`}
                >
                  {intr}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-4 border-b border-border mt-6 pt-2">
            <button
              onClick={() => setActiveTab('students')}
              className={`pb-3 text-xs font-bold uppercase transition-all ${
                activeTab === 'students' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
              }`}
            >
              Students ({students.length})
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`pb-3 text-xs font-bold uppercase transition-all ${
                activeTab === 'posts' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
              }`}
            >
              Posts ({posts.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="py-20 text-center text-xs text-muted-foreground">Searching the nexus...</div>
        ) : activeTab === 'students' ? (
          students.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <p className="text-sm font-bold text-foreground uppercase mb-1">No students found</p>
              <p className="text-xs text-muted-foreground">Try clearing filters or broadening your search term.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {students.map((student) => (
                <div key={student.id} className="ui-card p-5 space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <img
                        src={student.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.username}`}
                        alt={student.username}
                        className="w-12 h-12 rounded-full border-2 border-primary object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-foreground truncate">{student.profile?.full_name || student.username}</h4>
                        <p className="text-xs text-primary font-medium truncate">@{student.username}</p>
                        {student.profile?.school && (
                          <p className="text-[10px] text-muted-foreground truncate">📍 {student.profile.school}</p>
                        )}
                      </div>
                    </div>

                    {student.profile?.bio && (
                      <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">{student.profile.bio}</p>
                    )}

                    {student.skills && student.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {student.skills.slice(0, 4).map((sk) => (
                          <span key={sk} className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                            {sk}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border flex items-center gap-2">
                    <button
                      onClick={() => handleFollowToggle(student.username, student.is_following)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        student.is_following
                          ? 'bg-secondary text-muted-foreground border border-border'
                          : 'bg-primary text-primary-foreground hover:bg-secondary'
                      }`}
                    >
                      {student.is_following ? 'Following' : 'Follow'}
                    </button>
                    <button
                      onClick={() => handleStartMessage(student.username)}
                      className="px-3 py-2 rounded-xl bg-transparent border border-border text-xs text-muted-foreground font-bold hover:border-primary"
                    >
                      Message
                    </button>
                    <button
                      onClick={() => navigate(`/app/profile/${student.username}`)}
                      className="px-3 py-2 rounded-xl bg-secondary text-xs text-foreground font-bold hover:brightness-110"
                    >
                      Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="ui-card p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="post-badge">{post.post_type}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(post.created_at).toLocaleDateString()} • {timeAgo(post.created_at)}</span>
                </div>
                {post.title && <h4 className="text-sm font-bold text-foreground uppercase">{post.title}</h4>}
                <p className="text-xs text-foreground/90 whitespace-pre-wrap">{renderContentWithHighlights(post.content)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
