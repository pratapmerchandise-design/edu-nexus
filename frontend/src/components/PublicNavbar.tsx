import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

export const PublicNavbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`site-nav ${scrolled ? 'scrolled' : ''} ${menuOpen ? 'menu-open' : ''}`} id="site-nav">
      <Link className="brand" to="/" aria-label="Edu Nexus home">
        <img src="/edu-nexus-logo.png" alt="Edu Nexus" className="brand-logo" />
      </Link>

      <nav className="nav-links" aria-label="Primary navigation">
        <Link to="/features">Discover</Link>
        <Link to="/opportunities">Opportunities</Link>
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
      </nav>

      <div className="nav-actions flex items-center gap-2.5">
        <ThemeToggle />
        <Link
          to="/signup"
          className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/25 border border-emerald-400 text-white text-xs font-bold hover:bg-emerald-500/35 transition-all shadow-[0_0_15px_rgba(34,224,121,0.3)]"
          style={{ color: '#ffffff' }}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span style={{ color: '#ffffff' }} className="font-black text-xs tracking-wide">
            🎁 1 Mo Free Pass
          </span>
        </Link>
        <Link className="text-button" to="/login">Login</Link>
        <button 
          className="button button-small button-solid"
          onClick={() => navigate('/signup')}
        >
          Create Profile
        </button>
      </div>

      <button 
        className="menu-button" 
        aria-label="Toggle navigation" 
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span></span><span></span>
      </button>
    </header>
  );
};
