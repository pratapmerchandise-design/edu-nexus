import React, { useState, useEffect } from 'react';
import { AppLayout } from '../../components/AppLayout';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { SpotlightCard } from '../../components/reactbits/SpotlightCard';
import { ShinyText } from '../../components/reactbits/ShinyText';
import { AuroraGlow } from '../../components/reactbits/AuroraGlow';
import type { Opportunity } from '../../types';
import { Bookmark, ExternalLink, Calendar, Search, Plus, Trash2, X, Loader2, Globe, MapPin, UserCheck } from 'lucide-react';

export const OpportunitiesPage: React.FC = () => {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Creation State
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [postError, setPostError] = useState<string | null>(null);

  const [newOpp, setNewOpp] = useState({
    title: '',
    organization: '',
    type: 'Hackathon',
    description: '',
    deadline: '',
    location: '',
    is_online: true,
    eligibility: '',
    category: '',
    external_url: '',
    tags: ''
  });

  // Filters
  const [selectedType, setSelectedType] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'saved'>('all');
  const [activeOppModal, setActiveOppModal] = useState<Opportunity | null>(null);

  // New LinkedIn-style filters
  const [locationFilter, setLocationFilter] = useState<'All' | 'Remote' | 'On-site'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Closing Soon' | 'Closed'>('All');
  const [dateFilter, setDateFilter] = useState<'Any' | 'Past24' | 'PastWeek' | 'PastMonth'>('Any');
  const [experienceFilter, setExperienceFilter] = useState<'Any' | 'High School' | 'Undergraduate' | 'Graduate'>('Any');

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'saved' ? '/opportunities/saved' : '/opportunities';
      const data = await api.get<Opportunity[]>(endpoint);
      setOpportunities(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, [activeTab]);

  const handleBookmarkToggle = async (oppId: number) => {
    try {
      const res = await api.post<{ bookmarked: boolean }>(`/opportunities/${oppId}/bookmark`);
      setOpportunities((prev) =>
        prev.map((o) => (o.id === oppId ? { ...o, user_bookmarked: res.bookmarked } : o))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpp.title.trim() || !newOpp.organization.trim() || !newOpp.description.trim()) {
      setPostError("Please fill in Title, Organization, and Description.");
      return;
    }
    setIsSubmitting(true);
    setPostError(null);
    try {
      const created = await api.post<Opportunity>('/opportunities', {
        title: newOpp.title.trim(),
        organization: newOpp.organization.trim(),
        type: newOpp.type,
        description: newOpp.description.trim(),
        deadline: newOpp.deadline || undefined,
        location: newOpp.location.trim() || undefined,
        is_online: newOpp.is_online,
        eligibility: newOpp.eligibility.trim() || undefined,
        category: newOpp.category.trim() || undefined,
        external_url: newOpp.external_url.trim() || undefined,
        tags: newOpp.tags.trim() || undefined,
        status: 'Open'
      });
      setOpportunities((prev) => [created, ...prev]);
      setIsPostModalOpen(false);
      setNewOpp({
        title: '',
        organization: '',
        type: 'Hackathon',
        description: '',
        deadline: '',
        location: '',
        is_online: true,
        eligibility: '',
        category: '',
        external_url: '',
        tags: ''
      });
    } catch (err: any) {
      console.error(err);
      setPostError(err.response?.data?.detail || "Failed to create opportunity. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOpportunity = async (oppId: number) => {
    if (!window.confirm("Are you sure you want to delete this opportunity? This action cannot be undone.")) {
      return;
    }
    setDeletingId(oppId);
    try {
      await api.delete(`/opportunities/${oppId}`);
      setOpportunities((prev) => prev.filter((o) => o.id !== oppId));
      if (activeOppModal && activeOppModal.id === oppId) {
        setActiveOppModal(null);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to delete opportunity.");
    } finally {
      setDeletingId(null);
    }
  };

  const types = ['All', 'Hackathon', 'Scholarships', 'Research', 'Competitions', 'Internships', 'Jobs'];

  const filtered = opportunities.filter((o) => {
    const matchesSearch = !search || o.title.toLowerCase().includes(search.toLowerCase()) || o.description.toLowerCase().includes(search.toLowerCase()) || o.organization.toLowerCase().includes(search.toLowerCase());
    const matchesType = selectedType === 'All' || o.type.toLowerCase().includes(selectedType.toLowerCase());
    
    let matchesLocation = true;
    if (locationFilter === 'Remote') matchesLocation = o.is_online === true;
    if (locationFilter === 'On-site') matchesLocation = o.is_online === false;

    let matchesStatus = true;
    if (statusFilter !== 'All') matchesStatus = o.status === statusFilter;

    let matchesDate = true;
    if (dateFilter !== 'Any' && o.created_at) {
      const createdDate = new Date(o.created_at);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      if (dateFilter === 'Past24') matchesDate = diffDays <= 1;
      if (dateFilter === 'PastWeek') matchesDate = diffDays <= 7;
      if (dateFilter === 'PastMonth') matchesDate = diffDays <= 30;
    }

    let matchesExperience = true;
    if (experienceFilter !== 'Any') {
      const eligibility = o.eligibility?.toLowerCase() || '';
      const grade = o.grade_requirements?.toLowerCase() || '';
      const exp = experienceFilter.toLowerCase();
      matchesExperience = eligibility.includes(exp) || grade.includes(exp);
    }

    return matchesSearch && matchesType && matchesLocation && matchesStatus && matchesDate && matchesExperience;
  });

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with Aurora Glow */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-md relative overflow-hidden">
          <AuroraGlow size="md" opacity={0.4} />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-extrabold uppercase tracking-tight text-foreground mb-1 flex items-center gap-2">
                <span>Student</span>
                <ShinyText color="var(--primary)">Opportunities</ShinyText>
              </h2>
              <p className="text-xs text-muted-foreground">Discover and bookmark jobs, hackathons, and research grants.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsPostModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:brightness-110 flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Post Opportunity</span>
              </button>

              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'all' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                All Opportunities
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'saved' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                Saved ({opportunities.filter((o) => o.user_bookmarked).length})
              </button>
            </div>
          </div>

          {/* Filters Section */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by title, organization, or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-background border border-border rounded-xl pl-11 pr-4 py-3 text-xs font-medium text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm transition-all"
              />
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex overflow-x-auto pb-1 -mb-1 hide-scrollbar">
                <div className="flex gap-2 min-w-max">
                  {types.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedType(t)}
                      className={`px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
                        selectedType === t
                          ? 'bg-foreground text-background shadow-md'
                          : 'bg-secondary text-muted-foreground border border-border hover:border-foreground/30 hover:text-foreground'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <select 
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="pill-select"
                >
                  <option value="Any">Date Posted</option>
                  <option value="Past24">Past 24 hours</option>
                  <option value="PastWeek">Past Week</option>
                  <option value="PastMonth">Past Month</option>
                </select>

                <select 
                  value={experienceFilter}
                  onChange={(e) => setExperienceFilter(e.target.value as any)}
                  className="pill-select"
                >
                  <option value="Any">Experience Level</option>
                  <option value="High School">High School</option>
                  <option value="Undergraduate">Undergraduate</option>
                  <option value="Graduate">Graduate</option>
                </select>

                <select 
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value as any)}
                  className="pill-select"
                >
                  <option value="All">Location</option>
                  <option value="Remote">Remote</option>
                  <option value="On-site">On-site</option>
                </select>

                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="pill-select"
                >
                  <option value="All">Status</option>
                  <option value="Open">Open</option>
                  <option value="Closing Soon">Closing Soon</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Opportunity Cards */}
        {loading ? (
          <div className="py-20 text-center text-xs text-muted-foreground">Loading opportunities...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <p className="text-sm font-bold text-foreground uppercase mb-1">No opportunities found</p>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'saved' ? 'No saved opportunities yet.' : 'Try adjusting your search filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((opp) => {
              const canDelete = user && (user.role === 'admin' || opp.author_id === user.id);
              return (
                <SpotlightCard key={opp.id} className="p-5 space-y-3 flex flex-col justify-between glow-on-hover shadow-sm">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase">
                          {opp.type}
                        </span>
                        {opp.is_online ? (
                          <span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                            <Globe className="w-3 h-3" /> Remote
                          </span>
                        ) : opp.location ? (
                          <span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {opp.location}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1">
                        {canDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteOpportunity(opp.id);
                            }}
                            disabled={deletingId === opp.id}
                            title={user?.role === 'admin' ? "Platform Admin: Delete" : "Delete My Post"}
                            className="p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            {deletingId === opp.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleBookmarkToggle(opp.id)}
                          className={`p-1.5 rounded-full transition-colors ${
                            opp.user_bookmarked ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Bookmark className={`w-4 h-4 ${opp.user_bookmarked ? 'fill-primary' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <h3
                      onClick={() => setActiveOppModal(opp)}
                      className="text-base font-bold text-foreground uppercase mt-2.5 hover:text-primary cursor-pointer transition-colors leading-snug"
                    >
                      {opp.title}
                    </h3>
                    <p className="text-xs text-primary font-medium">{opp.organization}</p>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-3 leading-relaxed">{opp.description}</p>

                    {(opp.author_name || opp.author_username) && (
                      <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-border/50 text-[11px] text-muted-foreground">
                        <UserCheck className="w-3.5 h-3.5 text-primary/70" />
                        <span>Posted by</span>
                        <span className="font-semibold text-foreground/90">{opp.author_name || opp.author_username}</span>
                        {opp.author_id === user?.id && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-primary/15 text-primary border border-primary/20">
                            You
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
                    {opp.deadline ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary" /> {opp.deadline}
                      </span>
                    ) : (
                      <span>Open Application</span>
                    )}
                    <button
                      onClick={() => setActiveOppModal(opp)}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      View Details →
                    </button>
                  </div>
                </SpotlightCard>
              );
            })}
          </div>
        )}

        {/* Opportunity Detail Modal */}
        {activeOppModal && (
          <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase">
                  {activeOppModal.type}
                </span>
                <button onClick={() => setActiveOppModal(null)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <h2 className="text-xl font-bold uppercase text-foreground leading-tight">{activeOppModal.title}</h2>
                <p className="text-xs text-primary font-semibold mt-1">Organized by {activeOppModal.organization}</p>
                {(activeOppModal.author_name || activeOppModal.author_username) && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Posted by <strong className="text-foreground/80">{activeOppModal.author_name || activeOppModal.author_username}</strong>
                    {activeOppModal.author_id === user?.id && " (You)"}
                  </p>
                )}
              </div>

              <div className="bg-secondary p-4 rounded-xl border border-border space-y-2 text-xs">
                <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">{activeOppModal.description}</p>
                {activeOppModal.eligibility && (
                  <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/50"><strong>Eligibility:</strong> {activeOppModal.eligibility}</p>
                )}
                {activeOppModal.location && (
                  <p className="text-[11px] text-muted-foreground"><strong>Location:</strong> {activeOppModal.location}</p>
                )}
                {activeOppModal.deadline && (
                  <p className="text-[11px] text-muted-foreground"><strong>Deadline:</strong> {activeOppModal.deadline}</p>
                )}
              </div>

              <div className="flex gap-2 pt-2 items-center">
                {user && (user.role === 'admin' || activeOppModal.author_id === user.id) && (
                  <button
                    onClick={() => handleDeleteOpportunity(activeOppModal.id)}
                    disabled={deletingId === activeOppModal.id}
                    className="button bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30 px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    {deletingId === activeOppModal.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    <span>{user.role === 'admin' && activeOppModal.author_id !== user.id ? 'Delete (Admin)' : 'Delete'}</span>
                  </button>
                )}
                <button
                  onClick={() => handleBookmarkToggle(activeOppModal.id)}
                  className={`button flex-1 ${
                    activeOppModal.user_bookmarked ? 'button-ghost text-primary' : 'button-ghost'
                  }`}
                >
                  {activeOppModal.user_bookmarked ? 'Saved in Bookmarks' : 'Save Opportunity'}
                </button>
                {activeOppModal.external_url && (
                  <a
                    href={activeOppModal.external_url}
                    target="_blank"
                    rel="noreferrer"
                    className="button button-primary flex-1 text-center flex items-center justify-center gap-1.5"
                  >
                    Apply Now <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Post Opportunity Modal */}
        {isPostModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-3xl w-full max-w-xl p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto scrollbar-thin animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground uppercase tracking-tight">Post an Opportunity</h3>
                    <p className="text-[11px] text-muted-foreground">Share internships, hackathons, research grants, or contests.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPostModalOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {postError && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive font-medium">
                  {postError}
                </div>
              )}

              <form onSubmit={handleCreateOpportunity} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Opportunity Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Google Summer of Code 2026 / NASA Space Apps"
                    value={newOpp.title}
                    onChange={(e) => setNewOpp({ ...newOpp, title: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Organization / Host *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MIT Labs, EduNexus, CERN"
                      value={newOpp.organization}
                      onChange={(e) => setNewOpp({ ...newOpp, organization: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Opportunity Type *
                    </label>
                    <select
                      value={newOpp.type}
                      onChange={(e) => setNewOpp({ ...newOpp, type: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value="Hackathon">Hackathon</option>
                      <option value="Scholarships">Scholarships</option>
                      <option value="Research">Research</option>
                      <option value="Competitions">Competitions</option>
                      <option value="Internships">Internships</option>
                      <option value="Jobs">Jobs</option>
                      <option value="Summer Programs">Summer Programs</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Description *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide details about this opportunity, awards, agenda, eligibility, and expectations..."
                    value={newOpp.description}
                    onChange={(e) => setNewOpp({ ...newOpp, description: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Application Deadline
                    </label>
                    <input
                      type="date"
                      value={newOpp.deadline}
                      onChange={(e) => setNewOpp({ ...newOpp, deadline: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      External Application URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://apply.example.com"
                      value={newOpp.external_url}
                      onChange={(e) => setNewOpp({ ...newOpp, external_url: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Format
                    </label>
                    <div className="flex items-center gap-3 pt-2">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          checked={newOpp.is_online}
                          onChange={() => setNewOpp({ ...newOpp, is_online: true })}
                          className="accent-primary"
                        />
                        <span>Online / Remote</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          checked={!newOpp.is_online}
                          onChange={() => setNewOpp({ ...newOpp, is_online: false })}
                          className="accent-primary"
                        />
                        <span>In-person</span>
                      </label>
                    </div>
                  </div>

                  {!newOpp.is_online && (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Location / City
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. San Francisco, CA"
                        value={newOpp.location}
                        onChange={(e) => setNewOpp({ ...newOpp, location: e.target.value })}
                        className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Eligibility Requirements
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. High school & undergrad students"
                      value={newOpp.eligibility}
                      onChange={(e) => setNewOpp({ ...newOpp, eligibility: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Tags (Comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AI, Python, Grant, Fellowship"
                      value={newOpp.tags}
                      onChange={(e) => setNewOpp({ ...newOpp, tags: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsPostModalOpen(false)}
                    className="button button-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="button button-primary flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Posting...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Publish Opportunity</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
