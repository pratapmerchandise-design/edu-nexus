import React from 'react';
import { PublicNavbar } from '../components/PublicNavbar';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Compass, Award, Shield, Flame, Lock } from 'lucide-react';

export const FeaturesPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Compass,
      title: 'Student Discovery',
      description: 'Search and filter students by programming language, AI interest, design skill, location, or school.'
    },
    {
      icon: Flame,
      title: 'Interactive Feed & Polls',
      description: 'Share wins, ask for help, present project ideas, recruit collaborators, and create interactive student polls.'
    },
    {
      icon: Award,
      title: 'Verified Opportunities',
      description: 'Access curated hackathons, scholarships, summer research programs, and global STEM competitions.'
    },
    {
      icon: MessageSquare,
      title: 'Category Forums',
      description: 'Participate in subject-specific discussions across CS, Math, Physics, Bio, Research, and Admissions.'
    },
    {
      icon: Lock,
      title: 'Real-time 1-to-1 Messaging',
      description: 'Direct messaging powered by WebSockets with strict server-side authorization and read receipts.'
    },
    {
      icon: Shield,
      title: 'Moderation & Reporting',
      description: 'Comprehensive report handling, user blocking, and admin content moderation for student safety.'
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="page-noise" aria-hidden="true" />
      <PublicNavbar />

      <main className="max-w-6xl mx-auto px-6 pt-36 pb-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-xs uppercase tracking-[0.22em] font-extrabold text-primary mb-4">Platform Capabilities</p>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter uppercase leading-tight">
            Built For <span className="text-primary">Student Momentum.</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mt-4">
            Everything you need to collaborate, discover opportunities, and share your journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/40 transition-colors">
                <Icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="text-xl font-bold uppercase mb-2">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <button onClick={() => navigate('/signup')} className="button button-primary">
            Get Started Now →
          </button>
        </div>
      </main>
    </div>
  );
};
