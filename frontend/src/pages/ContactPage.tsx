import React, { useState } from 'react';
import { PublicNavbar } from '../components/PublicNavbar';
import { Send } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="page-noise" aria-hidden="true" />
      <PublicNavbar />

      <main className="max-w-4xl mx-auto px-6 pt-36 pb-24">
        <div className="text-center max-w-xl mx-auto mb-12">
          <p className="text-xs uppercase tracking-[0.22em] font-extrabold text-primary mb-4">Contact Us</p>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter uppercase leading-tight">
            Get In <span className="text-primary">Touch.</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-3">
            Have questions, feedback, or need help with your Edu Nexus account? We're here to help.
          </p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-8 md:p-12">
          {submitted ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto mb-4">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold uppercase mb-2">Message Sent!</h3>
              <p className="text-xs text-muted-foreground">Thank you for reaching out. Our team will get back to you shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Your Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Aarav Mehta"
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@school.edu"
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Message</label>
                <textarea
                  rows={5}
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="How can we help you?"
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <button type="submit" className="button button-primary w-full">
                Send Message <Send className="w-4 h-4 ml-2" />
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};
