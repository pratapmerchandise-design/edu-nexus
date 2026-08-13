import React, { useState, useEffect } from 'react';
import { PublicNavbar } from '../components/PublicNavbar';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Opportunity } from '../types';
import { ExternalLink, Calendar, MapPin, Search } from 'lucide-react';

export const PublicOpportunitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOpps = async () => {
      try {
        const data = await api.get<Opportunity[]>('/opportunities');
        setOpportunities(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchOpps();
  }, []);

  const types = ['All', 'Hackathon', 'Scholarships', 'Research', 'Competitions'];

  const filtered = opportunities.filter((o) => {
    const matchesSearch = !search || o.title.toLowerCase().includes(search.toLowerCase()) || o.description.toLowerCase().includes(search.toLowerCase());
    const matchesType = selectedType === 'All' || o.type.toLowerCase().includes(selectedType.toLowerCase());
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="page-noise" aria-hidden="true" />
      <PublicNavbar />

      <main className="max-w-6xl mx-auto px-6 pt-36 pb-24">
        <div className="mb-12">
          <p className="text-xs uppercase tracking-[0.22em] font-extrabold text-primary mb-4">Discover & Apply</p>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter uppercase leading-tight mb-4">
            Curated Student <span className="text-primary">Opportunities.</span>
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl">
            Explore international hackathons, STEM scholarships, research grants, and summer programs.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search opportunities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedType === t
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:text-foreground border border-border'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Opportunities List */}
        {loading ? (
          <div className="py-20 text-center text-xs text-muted-foreground">Loading opportunities...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center bg-card border border-border rounded-2xl">
            <p className="text-sm font-bold text-foreground mb-2">No opportunities found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your search query or filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((opp) => (
              <div key={opp.id} className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between hover:border-primary/30 transition-all">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
                      {opp.type}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Status: {opp.status}</span>
                  </div>

                  <h3 className="text-2xl font-bold uppercase text-foreground mb-2 leading-tight">{opp.title}</h3>
                  <p className="text-xs text-primary font-semibold mb-3">Organized by {opp.organization}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-3">{opp.description}</p>
                </div>

                <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-4">
                    {opp.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary" /> {opp.deadline}
                      </span>
                    )}
                    {opp.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-primary" /> {opp.location}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => navigate('/signup')}
                    className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    View & Apply <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
