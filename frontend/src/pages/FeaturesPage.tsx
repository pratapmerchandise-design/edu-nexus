import React from 'react';
import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';
import { useNavigate } from 'react-router-dom';
import { Reveal, SectionHeading } from '../components/motion';
import {
  MessageSquare,
  Compass,
  Award,
  Shield,
  Flame,
  Lock,
  ArrowRight,
  Check,
} from 'lucide-react';

const features = [
  {
    icon: Compass,
    title: 'Student Discovery',
    description:
      'Search and filter students by programming language, AI interest, design skill, location, or school.',
  },
  {
    icon: Flame,
    title: 'Interactive Feed & Polls',
    description:
      'Share wins, ask for help, present project ideas, recruit collaborators, and create interactive student polls.',
  },
  {
    icon: Award,
    title: 'Verified Opportunities',
    description:
      'Access curated hackathons, scholarships, summer research programs, and global STEM competitions.',
  },
  {
    icon: MessageSquare,
    title: 'Category Forums',
    description:
      'Participate in subject-specific discussions across CS, Math, Physics, Bio, Research, and Admissions.',
  },
  {
    icon: Lock,
    title: 'Real-time Messaging',
    description:
      'Direct messaging powered by WebSockets with strict server-side authorization and read receipts.',
  },
  {
    icon: Shield,
    title: 'Moderation & Reporting',
    description:
      'Comprehensive report handling, user blocking, and admin content moderation for student safety.',
  },
];

const pillars = [
  {
    title: 'Discover',
    body: 'Find the people, ideas, and opportunities that match your goals — beyond your classroom.',
  },
  {
    title: 'Connect',
    body: 'Meet creators, researchers, and builders through messaging, forums, and school hubs.',
  },
  {
    title: 'Grow',
    body: 'Apply to opportunities, launch projects, and track your momentum over time.',
  },
];

export const FeaturesPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="page-noise" aria-hidden="true" />
      <PublicNavbar />

      <main className="max-w-6xl mx-auto px-6 pt-36 pb-24">
        <SectionHeading
          eyebrow="Platform capabilities"
          title={
            <>
              Built for <span className="text-gradient">student momentum.</span>
            </>
          }
          subtitle="Everything you need to collaborate, discover opportunities, and share your journey — in one trusted place."
        />

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={i} direction="up" delay={(i % 3) * 90}>
                <div className="group h-full rounded-3xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_60px_rgba(34,224,121,0.08)]">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/25 transition-colors group-hover:bg-primary/20">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold uppercase text-foreground">{f.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    {f.description}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Pillars band */}
        <Reveal direction="up">
          <div className="mt-24 grid gap-6 md:grid-cols-3">
            {pillars.map((p, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 to-transparent p-8"
              >
                <span className="text-5xl font-extrabold text-primary/20">{`0${i + 1}`}</span>
                <h3 className="mt-3 text-2xl font-bold text-foreground">{p.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Comparison / reassurance */}
        <Reveal direction="up">
          <div className="mt-24 rounded-3xl border border-border bg-[radial-gradient(circle_at_50%_0%,rgba(34,224,121,0.08),transparent_60%)] p-8 lg:p-12">
            <div className="grid gap-8 md:grid-cols-2 md:items-center">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  A network that respects your time
                </h2>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  No noise, no recruiters spamming your inbox. Just the students, opportunities,
                  and conversations that move you forward.
                </p>
              </div>
              <ul className="space-y-3">
                {[
                  'Verified opportunities only',
                  'Student-first moderation',
                  'Privacy-conscious by design',
                  'Free for every student',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-foreground/90">
                    <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-primary/15 text-primary">
                      <Check className="h-3 w-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        <Reveal direction="up">
          <div className="mt-16 text-center">
            <button onClick={() => navigate('/signup')} className="button button-primary">
              Get started now <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </Reveal>
      </main>

      <PublicFooter />
    </div>
  );
};
