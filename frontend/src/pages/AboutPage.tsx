import React from 'react';
import { PublicNavbar } from '../components/PublicNavbar';
import { useNavigate } from 'react-router-dom';
import { Users, Award, ShieldCheck } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="page-noise" aria-hidden="true" />
      <PublicNavbar />

      <main className="max-w-5xl mx-auto px-6 pt-36 pb-24">
        <p className="text-xs uppercase tracking-[0.22em] font-extrabold text-primary mb-4">About Edu Nexus</p>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter uppercase leading-tight mb-8">
          The Student Network For <span className="text-primary">Ambitious Builders.</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-12 max-w-3xl">
          Edu Nexus is created for students who are looking beyond traditional classroom boundaries. Whether you are building an AI project, competing in global hackathons, publishing research, or searching for collaborators, Edu Nexus provides the space to connect and thrive.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-16">
          <div className="bg-card border border-border rounded-2xl p-6">
            <Users className="w-8 h-8 text-primary mb-4" />
            <h3 className="text-xl font-bold uppercase mb-2">Peer Discovery</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Find students by skills, interests, and location to build project teams and research groups.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <Award className="w-8 h-8 text-primary mb-4" />
            <h3 className="text-xl font-bold uppercase mb-2">Opportunities</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Discover verified competitions, hackathons, scholarships, and research grants worldwide.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <ShieldCheck className="w-8 h-8 text-primary mb-4" />
            <h3 className="text-xl font-bold uppercase mb-2">Student First</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Safe, moderated environment designed to showcase real achievements and facilitate peer messaging.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#0b2817] to-[#06110a] border border-primary/30 rounded-3xl p-10 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold uppercase mb-4">Ready to start?</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-lg mx-auto">Create your profile today and connect with thousands of ambitious students.</p>
          <button onClick={() => navigate('/signup')} className="button button-primary">
            Create Profile →
          </button>
        </div>
      </main>
    </div>
  );
};
