import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  const productLinks = [
    { label: 'Platform Features', to: '/features' },
    { label: 'Verified Opportunities', to: '/opportunities' },
    { label: 'School Hubs Directory', to: '/schools' },
    { label: 'Founding Member Pass', to: '/signup' },
  ];

  const communityLinks = [
    { label: 'Explore Network', to: '/features' },
    { label: 'Student Guidelines', to: '/guidelines' },
    { label: 'Hackathon Rosters', to: '/opportunities' },
    { label: 'Campus Club Hubs', to: '/schools' },
  ];

  const companyLinks = [
    { label: 'About EduNexus', to: '/about' },
    { label: 'Contact Support', to: '/contact' },
    { label: 'Privacy Policy', to: '/privacy' },
    { label: 'Terms of Service', to: '/terms' },
  ];

  return (
    <footer className="w-full border-t border-border bg-card text-foreground transition-colors">
      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Full-Width Top Action Banner */}
        <div className="w-full rounded-3xl bg-secondary/50 border border-border p-6 sm:p-8 mb-14 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Founding Student Pass • 100% OFF for 30 Days</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-foreground">
              Ready to find your collaborators?
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
              Create your verified student profile to unlock campus networks, hackathon squads, and
              exclusive global opportunities. Free forever.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            <Link
              to="/signup"
              className="button button-solid font-bold px-6 py-3 text-xs shadow-md flex items-center gap-2 transition-transform hover:scale-[1.02]"
              style={{ background: '#22e079', color: '#042f16' }}
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="button button-ghost font-bold px-5 py-3 text-xs text-foreground hover:bg-secondary border border-border transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Guaranteed 4-Column Responsive Grid */}
        <div className="footer-grid">
          {/* Brand Col */}
          <div className="space-y-4">
            <Link to="/" className="inline-block" aria-label="EduNexus Home">
              <img
                src="/edu-nexus-logo-light.png"
                alt="Edu Nexus"
                className="h-8 object-contain logo-for-light"
              />
              <img
                src="/edu-nexus-logo.png"
                alt="Edu Nexus"
                className="h-8 object-contain logo-for-dark"
              />
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The global student network connecting ambitious builders, researchers, and campus
              communities across 40+ countries.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold text-foreground/90 whitespace-nowrap">
                Campus Verified &amp; Student-Safe
              </span>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
              Product
            </p>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              {productLinks.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="transition-colors hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Community Links */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
              Community
            </p>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              {communityLinks.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="transition-colors hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform & Legal Links */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
              Platform &amp; Legal
            </p>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              {companyLinks.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="transition-colors hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar with Operational Status */}
        <div className="mt-14 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <p>© {new Date().getFullYear()} EduNexus Inc. All rights reserved.</p>
            <span className="hidden sm:inline text-muted-foreground/40">•</span>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Global AWS Infrastructure Active</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs">
            <Link to="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <Link to="/guidelines" className="hover:text-primary transition-colors">
              Student Guidelines
            </Link>
            <Link to="/contact" className="hover:text-primary transition-colors">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
