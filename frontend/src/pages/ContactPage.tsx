import React, { useState } from 'react';
import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';
import { SectionHeading } from '../components/motion';
import { Mail, Copy, Check, ExternalLink, ShieldCheck, Sparkles, Building2, Clock } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const supportEmail = 'edunexus.infodesk@gmail.com';

  const handleCopy = () => {
    navigator.clipboard.writeText(supportEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(supportEmail)}`;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="page-noise" aria-hidden="true" />
      <PublicNavbar />

      <main className="max-w-5xl mx-auto px-6 pt-36 pb-24">
        <SectionHeading
          eyebrow="Direct Support"
          title={
            <>
              Get in <span className="text-gradient">touch with us.</span>
            </>
          }
          subtitle="We communicate directly via email. Reach out for technical support, campus partnerships, or student inquiries."
        />

        <div className="mt-14 grid gap-8 md:grid-cols-[1.2fr_0.8fr] items-start">
          {/* Main Direct Mail Card */}
          <div className="rounded-3xl border border-border bg-card p-8 sm:p-10 shadow-xs space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground">
                  Official Support Helpdesk
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Replies typically within 24 hours</span>
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              To contact the EduNexus team, please send an email directly to our official desk. You can
              copy the address below or click to open directly in Gmail or your preferred email application.
            </p>

            {/* Big Email Box with 1-Click Copy */}
            <div className="p-5 rounded-2xl bg-secondary border border-border space-y-4">
              <div className="text-center sm:text-left">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Official Contact Email
                </span>
                <span className="text-base sm:text-lg font-mono font-bold text-primary select-all break-all">
                  {supportEmail}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="button button-solid font-bold px-4 py-2.5 text-xs flex items-center gap-2 shadow-xs transition-transform active:scale-95"
                  style={{ background: '#22e079', color: '#042f16' }}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Email Address</span>
                    </>
                  )}
                </button>

                <a
                  href={gmailComposeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button-ghost font-bold px-4 py-2.5 text-xs text-foreground bg-card hover:bg-card/80 border border-border flex items-center gap-1.5 transition-colors"
                >
                  <span>Open in Gmail</span>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </a>

                <a
                  href={`mailto:${supportEmail}`}
                  className="button button-ghost font-bold px-4 py-2.5 text-xs text-foreground bg-card hover:bg-card/80 border border-border flex items-center gap-1.5 transition-colors"
                >
                  <span>Mail App</span>
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
              </div>
            </div>

            {/* How to Reach Us Step-by-Step */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                How to reach us
              </h4>
              <ol className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>Click <strong>"Copy Email Address"</strong> above or copy <code>{supportEmail}</code>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>Open your email client (Gmail, Apple Mail, Outlook, or school webmail).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>Include your account username (if applicable) and a brief description of your request.</span>
                </li>
              </ol>
            </div>
          </div>

          {/* Side Info Cards */}
          <div className="space-y-4">
            {/* School Partnerships */}
            <div className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-2">
              <div className="flex items-center gap-2.5 text-primary">
                <Building2 className="w-5 h-5" />
                <h4 className="text-sm font-bold text-foreground">Campus &amp; School Hubs</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If you are a student council president, faculty advisor, or administrator looking to set up an official school hub, write with your campus affiliation in the subject line.
              </p>
            </div>

            {/* Student Safety */}
            <div className="p-6 rounded-3xl border border-border bg-card shadow-xs space-y-2">
              <div className="flex items-center gap-2.5 text-primary">
                <ShieldCheck className="w-5 h-5" />
                <h4 className="text-sm font-bold text-foreground">Safety &amp; Moderation</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Reports of community violations or academic dishonesty are reviewed with high priority by platform moderators.
              </p>
            </div>

            {/* Global Dispatch Note */}
            <div className="p-6 rounded-3xl bg-secondary/60 border border-border space-y-2">
              <div className="flex items-center gap-2 text-primary text-xs font-bold">
                <Sparkles className="w-4 h-4" />
                <span>EduNexus Operations</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Our support desk monitors incoming mail 7 days a week. For account-specific inquiries, please email us from the email registered to your EduNexus account.
              </p>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default ContactPage;
