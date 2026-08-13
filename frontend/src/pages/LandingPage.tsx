import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicNavbar } from '../components/PublicNavbar';
import { NetworkCanvas } from '../components/NetworkCanvas';
import { ArrowRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans relative">
      <div className="page-noise" aria-hidden="true" />
      <PublicNavbar />

      {/* Hero Section */}
      <section className="hero relative min-h-screen flex items-center overflow-hidden bg-[radial-gradient(circle_at_70%_45%,#0b301d_0,#07110c_28%,#030504_67%)]" id="top">
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

        <NetworkCanvas density={22000} maxNodes={42} lineDistance={135} lineAlpha={0.12} speed={0.11} className="hero-network absolute inset-0 w-full h-full z-1 opacity-50" />
        <div className="hero-grid absolute inset-0 z-2 opacity-25" />
        <div className="hero-vignette absolute inset-0 z-4 bg-[linear-gradient(90deg,rgba(1,3,2,0.78)_0%,rgba(1,3,2,0.22)_52%,rgba(1,3,2,0.55)_100%),linear-gradient(0deg,rgba(1,3,2,0.8)_0%,transparent_30%,rgba(1,3,2,0.35)_100%)] shadow-sm" />

        <div className="hero-content relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-12">
          <div className="eyebrow flex items-center gap-3 text-xs tracking-[0.22em] uppercase font-bold text-muted-foreground mb-4">
            <span className="w-2 h-2 rounded-full bg-primary shadow-sm" /> 
            The student network
          </div>

          <h1 className="hero-title text-5xl md:text-8xl lg:text-9xl font-extrabold tracking-tighter leading-[0.88] my-6 text-white">
            <span className="block">Where Ambition</span>
            <span className="block">Meets <em className="not-italic text-primary drop-shadow-sm">Opportunity.</em></span>
          </h1>

          <p className="hero-copy text-base md:text-xl text-muted-foreground max-w-xl leading-relaxed my-6">
            Discover opportunities. <br />
            Meet ambitious students. <br />
            Share what you're building. <br />
            Grow together.
          </p>

          <div className="hero-actions flex flex-wrap gap-4 mt-8">
            <button 
              onClick={() => navigate('/signup')} 
              className="button button-primary group"
            >
              Create Your Profile <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => navigate('/features')} 
              className="button button-ghost"
            >
              Explore Nexus
            </button>
          </div>

          <p className="micro-tag text-[10px] tracking-[0.18em] uppercase font-bold text-muted-foreground mt-8">
            Connect <i className="text-primary not-italic mx-1.5">•</i> Learn <i className="text-primary not-italic mx-1.5">•</i> Create <i className="text-primary not-italic mx-1.5">•</i> Grow
          </p>
        </div>

        {/* Orbit cards floating */}
        <div className="hero-orbit hidden lg:block absolute z-10 right-16 top-1/3 w-80 h-96 pointer-events-none">
          <div className="orbit-card orbit-card-a">
            <span className="live-dot" /> 2,847 students building now
          </div>
          <div className="orbit-card orbit-card-b">
            <small>Trending skill</small>
            <strong>Artificial Intelligence</strong>
          </div>
          <div className="orbit-card orbit-card-c">
            <small>New opportunity</small>
            <strong>Global AI Hackathon</strong>
            <span>Open now ↗</span>
          </div>
        </div>
      </section>

      {/* 01 / The Nexus */}
      <section className="nexus light-section bg-background text-muted-foreground py-28 rounded-t-[38px] relative z-20">
        <div className="section-shell max-w-6xl mx-auto px-6">
          <div className="section-intro grid grid-cols-1 md:grid-cols-2 gap-8 items-end mb-16">
            <div>
              <p className="kicker text-xs font-extrabold uppercase tracking-[0.22em] text-muted-foreground mb-4">01 / The Nexus</p>
              <h2 className="display dark text-5xl md:text-7xl font-extrabold tracking-tighter uppercase leading-none text-muted-foreground">
                Your world.<br /><span className="text-muted-foreground">One nexus.</span>
              </h2>
            </div>
            <p className="lead text-lg md:text-xl text-muted-foreground">Discover people, ideas and opportunities beyond your classroom.</p>
          </div>

          <div className="pillar-grid grid grid-cols-1 md:grid-cols-3 gap-6">
            <article className="pillar-card">
              <div className="pillar-top"><span>01</span><i className="icon-search" /></div>
              <div>
                <h3 className="text-3xl font-bold uppercase tracking-tight my-4">Discover</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Find students who share your interests, skills and ambitions.</p>
              </div>
              <b className="text-xs font-bold mt-6 block">Explore the network <span className="text-muted-foreground float-right text-base">↗</span></b>
            </article>

            <article className="pillar-card featured">
              <div className="pillar-top"><span>02</span><i className="icon-link" /></div>
              <div>
                <h3 className="text-3xl font-bold uppercase tracking-tight my-4">Connect</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Meet creators, researchers, builders and future collaborators.</p>
              </div>
              <b className="text-xs font-bold mt-6 block">Find your people <span className="text-primary float-right text-base">↗</span></b>
            </article>

            <article className="pillar-card">
              <div className="pillar-top"><span>03</span><i className="icon-arrow">↗</i></div>
              <div>
                <h3 className="text-3xl font-bold uppercase tracking-tight my-4">Grow</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Find competitions, internships, scholarships and opportunities.</p>
              </div>
              <b className="text-xs font-bold mt-6 block">See what's next <span className="text-muted-foreground float-right text-base">↗</span></b>
            </article>
          </div>
        </div>
      </section>

      {/* Manifesto */}
      <section className="manifesto light-section bg-background text-muted-foreground py-24 border-t border-black/10">
        <div className="section-shell max-w-6xl mx-auto px-6">
          <p className="kicker text-xs font-extrabold uppercase tracking-[0.22em] text-muted-foreground">03 / Made for momentum</p>
          <div className="word-stack mt-8 space-y-4">
            <div className="manifesto-word border-t border-border pt-2 pb-4 flex justify-between items-center">
              <span className="text-6xl md:text-9xl font-extrabold uppercase tracking-tighter">Discover.</span>
              <b className="text-xs text-muted-foreground">01</b>
            </div>
            <div className="manifesto-word border-t border-border pt-2 pb-4 flex justify-between items-center text-muted-foreground">
              <span className="text-6xl md:text-9xl font-extrabold uppercase tracking-tighter">Connect.</span>
              <b className="text-xs text-muted-foreground">02</b>
            </div>
            <div className="manifesto-word border-t border-border pt-2 pb-4 flex justify-between items-center">
              <span className="text-6xl md:text-9xl font-extrabold uppercase tracking-tighter">Share.</span>
              <b className="text-xs text-muted-foreground">03</b>
            </div>
            <div className="manifesto-word border-t border-b border-border pt-2 pb-4 flex justify-between items-center text-muted-foreground">
              <span className="text-6xl md:text-9xl font-extrabold uppercase tracking-tighter">Participate.</span>
              <b className="text-xs text-muted-foreground">04</b>
            </div>
          </div>
          <p className="manifesto-end text-2xl md:text-4xl font-bold tracking-tight mt-12">
            One platform. <span className="text-muted-foreground">Thousands of possibilities.</span>
          </p>
        </div>
      </section>

      {/* Community Section */}
      <section className="community dark-section relative min-h-screen grid place-items-center bg-background text-foreground overflow-hidden" id="community">
        <NetworkCanvas density={13000} maxNodes={88} lineDistance={165} lineAlpha={0.22} speed={0.16} className="community-network absolute inset-0 w-full h-full opacity-80" />
        <div className="community-glow absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,224,121,0.12),transparent_48%)]" />

        <div className="community-content relative z-10 text-center px-6 py-24">
          <p className="kicker green text-xs font-extrabold uppercase tracking-[0.22em] text-primary mb-4">05 / The community</p>
          <h2 className="community-title text-6xl md:text-9xl font-extrabold uppercase tracking-tighter leading-none">
            Don't just<br /><span className="text-primary">scroll.</span><br />Build something.
          </h2>
          <p className="community-sub text-xl md:text-2xl text-primary tracking-tight mt-8">Meet the people who might build it with you.</p>

          <div className="mt-12 flex justify-center gap-4">
            <button onClick={() => navigate('/signup')} className="button button-primary">
              Join Edu Nexus Now <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-muted-foreground">
          <img src="/edu-nexus-logo.png" alt="Edu Nexus" className="h-8 object-contain" />
          <nav className="flex gap-6">
            <Link to="/features" className="hover:text-primary transition-colors">Discover</Link>
            <Link to="/opportunities" className="hover:text-primary transition-colors">Opportunities</Link>
            <Link to="/about" className="hover:text-primary transition-colors">About</Link>
            <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
          </nav>
          <p>© {new Date().getFullYear()} Edu Nexus. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};
