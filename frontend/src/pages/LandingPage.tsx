import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';
import { NetworkCanvas } from '../components/NetworkCanvas';
import {
  ArrowRight,
  Sparkles,
  Crown,
  Check,
  Search,
  Users,
  Rocket,
  ShieldCheck,
  Building2,
  Award,
  MessageSquare,
  Globe2,
  ChevronDown,
  Code2,
  Flame,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const stats = [
    { label: 'Active Students', value: '10,000+' },
    { label: 'Campuses & Universities', value: '150+' },
    { label: 'Verified Opportunities', value: '500+' },
    { label: 'Countries Represented', value: '40+' },
  ];

  const pillars = [
    {
      num: '01',
      icon: Search,
      title: 'Discover',
      desc: 'Find ambitious students worldwide by programming skills, research interests, design craft, or campus.',
      cta: 'Explore the network',
      link: '/features',
    },
    {
      num: '02',
      icon: Users,
      title: 'Connect',
      desc: 'Form hackathon squads, recruit co-founders, join school clubs, and share knowledge in focused student forums.',
      cta: 'Find your collaborators',
      link: '/features',
      featured: true,
    },
    {
      num: '03',
      icon: Rocket,
      title: 'Grow',
      desc: 'Access verified global hackathons, research fellowships, startup grants, and competitive internships.',
      cta: 'Browse opportunities',
      link: '/opportunities',
    },
  ];

  const features = [
    {
      icon: Flame,
      title: 'Smart Student Feed',
      desc: 'Share wins, questions, and project launches with syntax-highlighted code snippets, media previews, and interactive polls.',
    },
    {
      icon: Building2,
      title: 'Verified School Hubs',
      desc: 'Join your verified university or high school campus with official student, faculty, and club leader roles.',
    },
    {
      icon: Award,
      title: 'Curated Opportunities',
      desc: 'Never miss a competition deadline. Explore vetted hackathons, scholarships, and grants with instant eligibility filters.',
    },
    {
      icon: MessageSquare,
      title: 'Direct & Squad Messaging',
      desc: 'Real-time WebSocket conversations, squad group chats, poll voting, and rich multimedia file sharing.',
    },
    {
      icon: ShieldCheck,
      title: 'Student-Safe Moderation',
      desc: 'Campus-grade verification, report queues, automated spam shields, and strict privacy controls protect every member.',
    },
    {
      icon: Globe2,
      title: 'Global Peer Reach',
      desc: 'Break classroom boundaries. Collaborate across institutions, continents, and disciplines on real-world projects.',
    },
  ];

  const plans = [
    {
      name: 'Bronze Member',
      reg: '₹29',
      color: '#CD7F32',
      boost: '1.15x Feed Reach',
      chats: '10 Chats / mo',
      highlight: 'Great for casual networking',
    },
    {
      name: 'Silver Member',
      reg: '₹59',
      color: '#9CA3AF',
      boost: '1.35x Feed Reach',
      chats: '20 Chats / mo',
      highlight: 'Ideal for club participants',
    },
    {
      name: 'Gold Member',
      reg: '₹99',
      color: '#F5C518',
      boost: '1.60x Feed Reach',
      chats: '40 Chats / mo',
      highlight: 'Perfect for hackathon organizers',
    },
    {
      name: 'Platinum Member',
      reg: '₹199',
      color: '#22E079',
      boost: '2.00x Feed Reach',
      chats: '100 Chats / mo',
      highlight: 'Maximum visibility & outreach',
      popular: true,
    },
  ];

  const testimonials = [
    {
      quote:
        'EduNexus connected our college robotics team with a software co-lead from Toronto. We won 2nd place at the International Autonomous Hackathon!',
      name: 'Priya Sharma',
      role: 'Robotics Lead, IIT Delhi',
      avatar: 'PS',
    },
    {
      quote:
        'Finding real high school research internships used to mean endless cold emailing. On EduNexus, opportunities are verified and responsive.',
      name: 'Marcus Chen',
      role: 'Student Researcher, California',
      avatar: 'MC',
    },
    {
      quote:
        'The School Hub feature replaced three separate WhatsApp groups for our CS club. Everything from announcements to project polls is centralized.',
      name: 'Aisha Al-Mansoor',
      role: 'Club President, Cambridge STEM Society',
      avatar: 'AA',
    },
  ];

  const faqs = [
    {
      q: 'Is EduNexus free to use for students?',
      a: 'Yes! Every student gets free lifetime access to EduNexus with core features included: browsing the feed, participating in forums, discovering opportunities, joining school hubs, and messaging classmates.',
    },
    {
      q: 'How does the 30-Day Early Bird Launch Offer work?',
      a: 'During our launch campaign, all students can claim a 30-day Free Pass on any premium tier (Bronze, Silver, Gold, or Platinum). You get 100% OFF (Payable ₹0) with zero credit card required. After 30 days, your account safely reverts to the standard Free tier unless you choose to renew.',
    },
    {
      q: 'How do School Hubs and campus verification work?',
      a: 'You can search for your high school or college campus or create a new School Hub. Campus administrators and teachers can invite students via secure join links and assign verified roles (Student, Faculty, Club Lead).',
    },
    {
      q: 'Can both high school and university students join?',
      a: 'Absolutely! EduNexus is built for learners across high schools, universities, bootcamps, and self-directed builders worldwide who want to connect with peers and build real projects.',
    },
    {
      q: 'What is the colored verification tick?',
      a: 'Verified members receive a distinctive colored badge next to their name corresponding to their tier or campus role, signaling authenticity and dedication on comments, posts, and messaging.',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative">
      <div className="page-noise" aria-hidden="true" />
      <PublicNavbar />

      {/* Hero Section */}
      <section
        className="hero relative min-h-screen flex items-center overflow-hidden bg-[radial-gradient(circle_at_70%_45%,#0b301d_0,#07110c_28%,#030504_67%)]"
        id="top"
      >
        <video
          className="hero-video absolute inset-0 w-full h-full object-cover z-0 filter saturate-90 contrast-105 brightness-75"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        >
          <source src="/hero-background.mp4" type="video/mp4" />
        </video>

        <NetworkCanvas
          density={22000}
          maxNodes={42}
          lineDistance={135}
          lineAlpha={0.12}
          speed={0.11}
          className="hero-network absolute inset-0 w-full h-full z-1 opacity-50"
        />
        <div className="hero-grid absolute inset-0 z-2 opacity-25" />
        <div className="hero-vignette absolute inset-0 z-4 bg-[linear-gradient(90deg,rgba(1,3,2,0.85)_0%,rgba(1,3,2,0.3)_52%,rgba(1,3,2,0.65)_100%),linear-gradient(0deg,rgba(1,3,2,0.85)_0%,transparent_30%,rgba(1,3,2,0.45)_100%)] shadow-sm" />

        <div className="hero-content relative z-10 max-w-6xl mx-auto px-6 pt-28 pb-16">
          {/* Eyebrow & Early Bird Announcement */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="eyebrow flex items-center gap-2 text-xs tracking-[0.22em] uppercase font-bold text-gray-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm" />
              The Global Student Network
            </div>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-500/25 border border-emerald-400 text-white text-xs font-bold hover:bg-emerald-500/35 transition-all shadow-[0_0_20px_rgba(34,224,121,0.35)] group backdrop-blur-md"
              style={{ color: '#ffffff' }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span style={{ color: '#ffffff' }} className="font-black text-xs">
                🎉 30 Days Premium Free (100% OFF)
              </span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-emerald-300" />
            </Link>
          </div>

          <h1 className="hero-title text-5xl md:text-8xl lg:text-9xl font-extrabold tracking-tighter leading-[0.88] my-6 text-white drop-shadow-md">
            <span className="block">Where Ambition</span>
            <span className="block">
              Meets{' '}
              <em className="not-italic text-emerald-400 drop-shadow-[0_0_25px_rgba(34,224,121,0.4)]">
                Opportunity.
              </em>
            </span>
          </h1>

          <p className="hero-copy text-base md:text-xl text-gray-300 max-w-xl leading-relaxed my-6">
            Discover verified competitions. Connect with driven student builders.
            Recruit hackathon teammates. Share what you create. Grow without borders.
          </p>

          <div className="hero-actions flex flex-wrap gap-4 mt-8">
            <button
              onClick={() => navigate('/signup')}
              className="button button-primary group shadow-lg glow-on-hover font-black"
              style={{ background: '#22e079', color: '#042f16' }}
            >
              <span>Create Your Profile</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/features')}
              className="button button-ghost border border-white/20 text-white hover:bg-white/10 transition-all font-bold"
              style={{ color: '#ffffff' }}
            >
              Explore Nexus
            </button>
          </div>

          <p className="micro-tag text-[10px] tracking-[0.2em] uppercase font-bold text-gray-400 mt-8">
            Connect <i className="text-emerald-400 not-italic mx-1.5">•</i> Learn{' '}
            <i className="text-emerald-400 not-italic mx-1.5">•</i> Create{' '}
            <i className="text-emerald-400 not-italic mx-1.5">•</i> Grow
          </p>
        </div>

        {/* Orbit cards floating */}
        <div className="hero-orbit hidden lg:block absolute z-10 right-16 top-1/3 w-80 h-96 pointer-events-none">
          <div className="orbit-card orbit-card-a">
            <span className="live-dot" /> 2,847 students building now
          </div>
          <div className="orbit-card orbit-card-b">
            <small>Trending Skill</small>
            <strong>Artificial Intelligence</strong>
          </div>
          <div className="orbit-card orbit-card-c">
            <small>Global Opportunity</small>
            <strong>MIT Hackathon 2026</strong>
            <span className="text-emerald-400 font-bold">Open now ↗</span>
          </div>
        </div>
      </section>

      {/* Global Impact Stats Bar */}
      <section className="bg-card border-b border-border py-8 relative z-20">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((stat, i) => (
            <div key={i} className="space-y-1">
              <p className="text-3xl md:text-4xl font-black text-foreground">{stat.value}</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 01 / The Core Engine */}
      <section className="py-24 bg-background relative z-20" id="pillars">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end mb-16">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-primary mb-3">
                01 / The Core Engine
              </p>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase text-foreground leading-none">
                Your World.<br />
                <span className="text-primary">One Nexus.</span>
              </h2>
            </div>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              EduNexus brings together student ambition, project recruitment, and global opportunity
              discovery into a single unified space.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pillars.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.num}
                  className={`p-8 rounded-3xl border transition-all duration-300 flex flex-col justify-between ${
                    p.featured
                      ? 'bg-primary/5 border-primary/40 shadow-lg'
                      : 'bg-card border-border hover:border-border/80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-xs font-black tracking-widest text-muted-foreground uppercase">
                        {p.num}
                      </span>
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-black uppercase text-foreground mb-3">{p.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                  </div>
                  <Link
                    to={p.link}
                    className="inline-flex items-center gap-2 text-xs font-bold text-foreground hover:text-primary transition-colors mt-8 group"
                  >
                    <span>{p.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-primary" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 02 / Platform Capabilities */}
      <section className="py-24 bg-secondary/30 border-t border-border relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-primary">
              02 / Capabilities
            </p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">
              Everything ambitious students need to thrive
            </h2>
            <p className="text-sm text-muted-foreground">
              Engineered for velocity, safety, and meaningful peer collaboration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="bg-card border border-border p-7 rounded-3xl hover:border-primary/40 transition-all hover:-translate-y-1 shadow-xs"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 03 / Interactive Live Platform Tour */}
      <section className="py-24 bg-background border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
                <Code2 className="w-3.5 h-3.5" />
                <span>Modern Student Workspace</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
                Designed for builders, researchers, and campus leaders.
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connect your Github, showcase hackathon projects, launch peer surveys with custom
                options, and directly message teammates without switching between disjointed apps.
              </p>
              <div className="space-y-3 pt-2">
                {[
                  'Verified colored ticks for active campus contributors',
                  'Audience controls: share with followers, school hub, or globally',
                  'Full Markdown & code block formatting on posts & comments',
                  'One-click application tracking for global opportunities',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs text-foreground font-medium">
                    <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4">
                <button
                  onClick={() => navigate('/signup')}
                  className="button button-primary shadow-md font-bold"
                  style={{ background: '#22e079', color: '#042f16' }}
                >
                  <span>Experience EduNexus</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Interactive Mockup Visual */}
            <div className="lg:col-span-7">
              <div className="relative rounded-3xl bg-card border border-border/80 shadow-2xl p-6 overflow-hidden">
                <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    <span className="text-[11px] font-mono text-muted-foreground ml-2">
                      edunexus.org/app/feed
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                    Live Preview
                  </span>
                </div>

                {/* Simulated Post Card */}
                <div className="bg-secondary/40 border border-border/70 rounded-2xl p-4 mb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center border border-emerald-500/30">
                        AK
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-foreground">Aarav Kapoor</span>
                          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[8px] font-black">
                            ✓
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          @aarav • Stanford University • 2h ago
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-secondary border border-border text-primary">
                      Hackathon Squad
                    </span>
                  </div>

                  <p className="text-xs text-foreground leading-relaxed">
                    Looking for 1 frontend developer (React/Tailwind) and 1 PyTorch ML engineer for the{' '}
                    <strong className="text-primary">MIT Global AI Hackathon</strong> next weekend! We
                    already have our dataset &amp; MVP architecture mapped out.
                  </p>

                  <div className="p-2.5 rounded-xl bg-background/80 border border-border/60 text-[11px] flex items-center justify-between">
                    <span className="text-muted-foreground">MIT Global AI Hackathon • 48h Sprint</span>
                    <span className="font-bold text-emerald-400">2 Spots Left</span>
                  </div>
                </div>

                {/* Simulated Quick Action Bar */}
                <div className="grid grid-cols-3 gap-3 text-center text-[11px]">
                  <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/70 font-semibold text-foreground">
                    ⚡ 2.0x Feed Reach Active
                  </div>
                  <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/70 font-semibold text-foreground">
                    🛡️ Verified Student
                  </div>
                  <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/70 font-semibold text-foreground">
                    🤝 12 Team Requests
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 04 / Student Voices & Testimonials */}
      <section className="py-24 bg-secondary/20 border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-primary">
              04 / Student Voices
            </p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">
              Loved by ambitious students across the globe
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className="bg-card border border-border p-7 rounded-3xl flex flex-col justify-between shadow-xs"
              >
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed italic mb-6">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                    {t.avatar}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{t.name}</h4>
                    <p className="text-[11px] text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 05 / Early Bird Launch Campaign Showcase */}
      <section className="py-24 bg-card border-t border-b border-border relative overflow-hidden" id="offer">
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>LIMITED FOUNDING STUDENT OFFER</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight text-foreground">
              Get <span className="text-primary">30 Days Free</span> of Premium Access
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              Every student who joins EduNexus starts on our full-featured Free tier. As an early adopter,
              you can claim an Early Bird 100% OFF Pass on any tier — unlocking verified tick badges,
              algorithm reach boosts, and 10x outreach.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`bg-secondary/40 border rounded-3xl p-6 flex flex-col justify-between transition-all hover:-translate-y-1 shadow-md ${
                  plan.popular ? 'border-primary shadow-primary/10 ring-1 ring-primary/40' : 'border-border/80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-black text-sm" style={{ color: plan.color }}>
                      {plan.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      100% OFF
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-emerald-400">₹0</span>
                      <span className="text-xs text-muted-foreground">/ 1st month</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground line-through font-semibold">
                      Regular {plan.reg}/mo
                    </span>
                  </div>

                  <p className="text-[11px] font-semibold text-foreground/80 mb-4 bg-background/50 p-2 rounded-xl border border-border/40">
                    {plan.highlight}
                  </p>

                  <ul className="space-y-2 text-xs text-muted-foreground mb-6">
                    <li className="flex items-center gap-2 text-foreground/90">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Verified colored tick</span>
                    </li>
                    <li className="flex items-center gap-2 text-foreground/90">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{plan.boost}</span>
                    </li>
                    <li className="flex items-center gap-2 text-foreground/90">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{plan.chats}</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => navigate('/signup')}
                  className="w-full py-3 rounded-xl text-xs font-black shadow-md transition-all hover:scale-[1.02] active:scale-100 flex items-center justify-center gap-2 border border-white/20"
                  style={{ background: '#ffffff', color: '#000000' }}
                >
                  <Crown className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Claim 30 Days Free</span>
                </button>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center space-y-1">
            <p className="text-xs font-bold text-foreground">
              ⚡ Free plan always included. No credit card required.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Claim anytime in your account settings after signing up.
            </p>
          </div>
        </div>
      </section>

      {/* 06 / Frequently Asked Questions */}
      <section className="py-24 bg-background border-t border-border">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14 space-y-3">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-primary">
              06 / Support &amp; FAQ
            </p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="border border-border bg-card rounded-2xl overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180 text-primary' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Call to Action Final Section */}
      <section
        className="community relative py-28 grid place-items-center bg-[#07110c] text-foreground overflow-hidden border-t border-border"
        id="community"
      >
        <NetworkCanvas
          density={13000}
          maxNodes={88}
          lineDistance={165}
          lineAlpha={0.22}
          speed={0.16}
          className="community-network absolute inset-0 w-full h-full opacity-80"
        />
        <div className="community-glow absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,224,121,0.15),transparent_60%)]" />

        <div className="community-content relative z-10 text-center px-6 max-w-4xl mx-auto space-y-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-emerald-400">
            Join the Global Movement
          </p>
          <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none text-white">
            Don't just <span className="text-emerald-400">scroll.</span>
            <br />
            Build something.
          </h2>
          <p className="text-lg md:text-xl text-gray-300 max-w-xl mx-auto leading-relaxed">
            Join thousands of ambitious students worldwide discovering hackathons, finding co-founders,
            and growing together.
          </p>

          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate('/signup')}
              className="button button-primary shadow-xl font-black text-sm px-8 py-4"
              style={{ background: '#22e079', color: '#042f16' }}
            >
              <span>Get Started — It's Free</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
            <button
              onClick={() => navigate('/about')}
              className="button button-ghost border border-white/20 text-white hover:bg-white/10 font-bold"
              style={{ color: '#ffffff' }}
            >
              Learn More About Us
            </button>
          </div>
        </div>
      </section>

      {/* Global Production Footer */}
      <PublicFooter />
    </div>
  );
};
