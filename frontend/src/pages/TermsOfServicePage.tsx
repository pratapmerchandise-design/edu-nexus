import React from 'react';
import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';
import { SectionHeading } from '../components/motion';
import { FileCheck, UserCheck, ShieldAlert, Award, AlertTriangle, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TermsOfServicePage: React.FC = () => {
  const terms = [
    {
      icon: UserCheck,
      title: '1. Eligibility & Student Status',
      content: (
        <p className="text-muted-foreground leading-relaxed">
          EduNexus is designed exclusively for high school students, college undergraduates, graduate
          researchers, and accredited campus faculty. By creating an account, you represent that all
          academic affiliations, grades, and identity details provided are accurate and truthful.
        </p>
      ),
    },
    {
      icon: ShieldAlert,
      title: '2. Community Conduct & Zero Tolerance',
      content: (
        <>
          <p className="mb-2.5">
            EduNexus is dedicated to maintaining a constructive, positive academic environment. The following
            behaviors result in immediate, permanent account suspension:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
            <li>Harassment, bullying, hate speech, or stalking in public feeds, groups, or direct messages.</li>
            <li>Academic dishonesty, exam cheating services, or contract plagiarism sales.</li>
            <li>Impersonating another student, school administrator, or educational institution.</li>
            <li>Spamming unsolicited commercial services or unverified external links.</li>
          </ul>
        </>
      ),
    },
    {
      icon: Award,
      title: '3. Early Bird Founding Member Pass Terms',
      content: (
        <p className="text-muted-foreground leading-relaxed">
          The Early Bird promotional pass grants full access to premium membership features (including
          pro badge, verified feed reach multiplier, and priority hackathon squad placement) for 30 days at
          100% discount (0 INR/USD). EduNexus does not store credit cards during promotional claims, and no
          automatic renewal charges will occur upon expiration without explicit user opt-in.
        </p>
      ),
    },
    {
      icon: FileCheck,
      title: '4. Student Intellectual Property',
      content: (
        <p className="text-muted-foreground leading-relaxed">
          You retain full copyright and intellectual property rights over all research papers, project code,
          and multimedia content you upload to EduNexus. By publishing publicly, you grant EduNexus a
          worldwide, non-exclusive license solely to display and distribute your work across the platform.
        </p>
      ),
    },
    {
      icon: AlertTriangle,
      title: '5. Moderation & Account Suspension',
      content: (
        <p className="text-muted-foreground leading-relaxed">
          EduNexus community moderators reserve the right to review flagged posts, hide inappropriate content,
          and terminate access of users who breach safety standards or violate institutional academic integrity
          codes.
        </p>
      ),
    },
    {
      icon: Scale,
      title: '6. Governing Law & Contact',
      content: (
        <p className="text-muted-foreground leading-relaxed">
          These terms are governed by standard international digital service guidelines. Questions regarding
          terms or legal notices should be sent to{' '}
          <a href="mailto:edunexus.infodesk@gmail.com" className="font-bold text-primary hover:underline">
            edunexus.infodesk@gmail.com
          </a>{' '}
          or via our{' '}
          <Link to="/contact" className="font-bold text-primary hover:underline">
            Support Portal
          </Link>
          .
        </p>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="page-noise" aria-hidden="true" />
      <PublicNavbar />

      <main className="max-w-4xl mx-auto px-6 pt-36 pb-24">
        <SectionHeading
          eyebrow="Platform Governance"
          title={
            <>
              Terms of <span className="text-gradient">Service.</span>
            </>
          }
          subtitle="Clear, fair, student-first terms protecting peer collaboration worldwide."
        />

        <div className="mt-12 space-y-8">
          {terms.map((t, i) => {
            const Icon = t.icon;
            return (
              <div
                key={i}
                className="p-7 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{t.title}</h3>
                </div>
                <div className="text-sm text-foreground/90 pl-0 sm:pl-13">{t.content}</div>
              </div>
            );
          })}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default TermsOfServicePage;
