import React, { useState, useEffect } from 'react';
import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';
import { useNavigate } from 'react-router-dom';
import { Reveal, SectionHeading } from '../components/motion';
import { api } from '../services/api';
import type { Opportunity } from '../types';
import { ExternalLink, Calendar, MapPin, Search, Loader2 } from 'lucide-react';

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
    const matchesSearch =
      !search ||
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.description.toLowerCase().includes(search.toLowerCase());
    const matchesType =
      selectedType === 'All' || o.type.toLowerCase().includes(selectedType.toLowerCase());
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="page-noise" aria-hidden="true" />
      <PublicNavbar />

      <main className="max-w-6xl mx-auto px-6 pt-36 pb-24">
        <SectionHeading
          align="left"
          eyebrow="Discover & apply"
          title={
            <>
              Curated student <span className="text-gradient">opportunities.</span>
            </>
          }
          subtitle="Explore international hackathons, STEM scholarships, research grants, and summer programs — verified by our team."
        />

        {/* Search & filters */}
        <Reveal direction="up" delay={80}>
          <div className="mt-12 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search opportunities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {types.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                    selectedType === t
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        {/* List */}
        <div className="mt-10">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-24 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Loading opportunities...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card py-20 text-center">
              <p className="text-base font-bold text-foreground">No opportunities found</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try adjusting your search query or filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {filtered.map((opp, i) => (
                <Reveal key={opp.id} direction="up" delay={(i % 2) * 90}>
                  <div className="group flex h-full flex-col justify-between rounded-3xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_60px_rgba(34,224,121,0.08)]">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                          {opp.type}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Status: {opp.status}</span>
                      </div>

                      <h3 className="mt-4 text-2xl font-bold uppercase leading-tight text-foreground">
                        {opp.title}
                      </h3>
                      <p className="mt-2 text-sm font-semibold text-primary">
                        Organized by {opp.organization}
                      </p>
                      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                        {opp.description}
                      </p>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-4">
                        {opp.deadline && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-primary" /> {opp.deadline}
                          </span>
                        )}
                        {opp.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-primary" /> {opp.location}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => navigate('/signup')}
                        className="flex items-center gap-1 text-xs font-bold text-primary transition-colors group-hover:gap-2"
                      >
                        View & apply <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
