import React, { useEffect, useState } from 'react';
import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';
import { SectionHeading } from '../components/motion';
import { School as SchoolIcon, Users, ShieldCheck, Search, Sparkles, Building, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export const PublicSchoolsPage: React.FC = () => {
  const [schools, setSchools] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const res = await api.get<any[]>('/schools');
        setSchools(res || []);
      } catch (_) {
        setSchools([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSchools();
  }, []);

  const filtered = schools.filter((s) =>
    (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="page-noise" aria-hidden="true" />
      <PublicNavbar />

      <main className="max-w-6xl mx-auto px-6 pt-36 pb-24">
        <SectionHeading
          eyebrow="Campus Hubs"
          title={
            <>
              Connect with your <span className="text-gradient">School Network.</span>
            </>
          }
          subtitle="Discover verified student clubs, campus announcements, and cross-school collaboration hubs worldwide."
        />

        {/* Search Bar */}
        <div className="mt-10 max-w-xl mx-auto relative">
          <Search className="w-5 h-5 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search school name, club, or campus..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-border bg-card text-foreground placeholder-muted-foreground focus:border-primary focus:outline-hidden text-sm shadow-xs"
          />
        </div>

        {/* Schools Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full text-center py-16 text-muted-foreground text-sm">
              Loading verified campus directory...
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full p-10 sm:p-12 rounded-3xl border border-dashed border-border bg-card text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
                <Building className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h4 className="text-base font-bold text-foreground">
                  Official Campus Hubs Are Onboarding
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Partner schools, universities, and student councils are currently claiming and setting up their private campus channels.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/contact"
                  className="button button-solid font-bold px-6 py-2.5 text-xs inline-flex items-center gap-2 shadow-xs"
                  style={{ background: '#22e079', color: '#042f16' }}
                >
                  <span>Claim Your School Hub</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            filtered.map((school) => (
              <div
                key={school.id}
                className="p-6 rounded-3xl border border-border bg-card shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                      <SchoolIcon className="w-6 h-6" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" />
                      Verified Hub
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-foreground">{school.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {school.description || 'Active student community with clubs, hackathon rosters, and forums.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    {school.member_count || 120}+ Active Students
                  </span>
                  <Link
                    to="/signup"
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>Join Hub</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bring Your School to EduNexus CTA */}
        <div className="mt-16 p-8 sm:p-10 rounded-3xl bg-secondary/50 border border-border flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
              <Building className="w-3.5 h-3.5" />
              <span>Campus Expansion Program</span>
            </div>
            <h3 className="text-xl font-black text-foreground">
              Don't see your school or university?
            </h3>
            <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
              We help student council leads and educators set up verified campus hubs within 48 hours.
            </p>
          </div>

          <Link
            to="/contact"
            className="button button-solid font-bold px-6 py-3 text-xs shadow-md shrink-0 flex items-center gap-2"
            style={{ background: '#22e079', color: '#042f16' }}
          >
            <span>Register Your Campus</span>
            <Sparkles className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default PublicSchoolsPage;
