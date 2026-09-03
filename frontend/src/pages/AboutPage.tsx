import React from 'react';
import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';
import { useNavigate } from 'react-router-dom';
import { Reveal, CountUp, SectionHeading } from '../components/motion';
import { Users, Award, ShieldCheck, Compass, ArrowRight, Quote, Sparkles } from 'lucide-react';

const values = [
  {
    icon: Users,
    title: 'Peer Discovery',
    body: 'Find students by skills, interests, and location to build project teams and research groups.',
  },
  {
    icon: Award,
    title: 'Real Opportunities',
    body: 'Discover verified competitions, hackathons, scholarships, and research grants worldwide.',
  },
  {
    icon: ShieldCheck,
    title: 'Student First',
    body: 'A safe, moderated environment designed to showcase real achievements and facilitate peer messaging.',
  },
];

const story = [
  {
    icon: Compass,
    title: 'We started with a gap',
    body: 'Talented students were scattered across group chats, spreadsheets, and scattered forums. Opportunity discovery should not feel like a second job.',
  },
  {
    icon: Sparkles,
    title: 'So we built Edu Nexus',
    body: 'A single, focused home for student ambition — where discovery, collaboration, and opportunity live together.',
  },
  {
    icon: ArrowRight,
    title: 'And we keep shipping',
    body: 'Every feature is shaped by the students who use it. Moderation, privacy, and momentum are non-negotiable.',
  },
];

const testimonials = [
  {
    quote: 'Edu Nexus feels like the professional network I always wished existed for students.',
    name: 'Priya Nair',
    role: 'Data Science, IISc',
    initials: 'PN',
  },
  {
    quote: 'Our school hub replaced three disconnected tools overnight. The students love it.',
    name: 'Mr. Daniels',
    role: 'Faculty Advisor, Toronto',
    initials: 'MD',
  },
];

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="page-noise" aria-hidden="true" />
      <PublicNavbar />

      <main className="max-w-6xl mx-auto px-6 pt-36 pb-24">
        <SectionHeading
          align="left"
          eyebrow="About Edu Nexus"
          title={
            <>
              The student network for{' '}
              <span className="text-gradient">ambitious builders.</span>
            </>
          }
          subtitle="Edu Nexus exists for students reaching beyond the classroom — building AI projects, competing globally, publishing research, and finding collaborators who make the work better."
        />

        {/* Story */}
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {story.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={i} direction="up" delay={i * 100}>
                <div className="h-full rounded-3xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/25">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 text-xl font-bold text-foreground">{s.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Values */}
        <Reveal direction="up">
          <div className="mt-24 rounded-3xl border border-border bg-[radial-gradient(circle_at_50%_0%,rgba(34,224,121,0.08),transparent_60%)] p-8 lg:p-12">
            <SectionHeading
              eyebrow="What we stand for"
              title={
                <>
                  Built on three <span className="text-gradient">commitments</span>
                </>
              }
            />
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {values.map((v, i) => {
                const Icon = v.icon;
                return (
                  <Reveal key={i} direction="up" delay={i * 100}>
                    <div className="rounded-2xl border border-border bg-background/40 p-6">
                      <Icon className="h-7 w-7 text-primary" />
                      <h3 className="mt-4 text-lg font-bold uppercase text-foreground">{v.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{v.body}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* Testimonials */}
        <div className="mt-24 grid gap-6 md:grid-cols-2">
          {testimonials.map((t, i) => (
            <Reveal key={i} direction="up" delay={i * 100}>
              <figure className="flex h-full flex-col rounded-3xl border border-border bg-card p-7">
                <Quote className="h-7 w-7 text-primary/60" />
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground/90">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                  <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-gradient-to-br from-primary to-emerald-600 text-xs font-bold text-primary-foreground">
                    {t.initials}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>

        {/* CTA */}
        <Reveal direction="up">
          <div className="mt-24 overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-r from-[#0b2817] to-[#06110a] p-10 text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Ready to get started?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
              Create your profile today and connect with thousands of ambitious students.
            </p>
            <button onClick={() => navigate('/signup')} className="button button-primary mt-6">
              Create your profile <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </Reveal>

        {/* Mini stats */}
        <div className="mt-16 grid grid-cols-2 gap-8 border-t border-border pt-12 lg:grid-cols-4">
          {[
            { v: 12000, s: '+', l: 'Active students' },
            { v: 850, s: '+', l: 'Opportunities' },
            { v: 64, s: '', l: 'Countries' },
            { v: 320, s: '+', l: 'Projects' },
          ].map((x, i) => (
            <Reveal key={i} direction="up" delay={i * 80}>
              <div className="text-center">
                <p className="text-3xl font-extrabold text-gradient">
                  <CountUp end={x.v} suffix={x.s} />
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{x.l}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
