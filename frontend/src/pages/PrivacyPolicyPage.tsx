import React from 'react';
import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';
import { SectionHeading } from '../components/motion';
import { Shield, Lock, Eye, FileText, CheckCircle, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PrivacyPolicyPage: React.FC = () => {
  const sections = [
    {
      icon: Shield,
      title: '1. Information We Collect',
      content: (
        <>
          <p className="mb-3">
            EduNexus collects information necessary to connect students with peer collaborators,
            campus communities, and verified opportunities:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
            <li>
              <strong>Account Information:</strong> Name, chosen username, school email, hashed password,
              and optional contact details.
            </li>
            <li>
              <strong>Student Profile:</strong> Academic institution, grade level, area of study, personal bio,
              interests, and verified skills.
            </li>
            <li>
              <strong>Platform Activity:</strong> Posts, project collaboration requests, forum discussions,
              and direct peer communications.
            </li>
          </ul>
        </>
      ),
    },
    {
      icon: Lock,
      title: '2. How We Protect Student Data',
      content: (
        <>
          <p className="mb-3">
            Security and student confidentiality are core tenets of our AWS infrastructure:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
            <li>All data in transit is encrypted using modern TLS 1.3 encryption protocols.</li>
            <li>Passwords are cryptographically hashed using salted bcrypt before database persistence.</li>
            <li>
              We enforce strict Role-Based Access Control (RBAC) ensuring student data is only accessible
              by authorized members and moderators.
            </li>
          </ul>
        </>
      ),
    },
    {
      icon: Eye,
      title: '3. Zero Data Selling Policy',
      content: (
        <p className="text-muted-foreground leading-relaxed">
          EduNexus does not sell, rent, or monetize student personal data or activity logs to third-party
          advertisers or data brokers. Our platform is built for students, funded transparently by verified
          academic institution partnerships and optional premium platform features.
        </p>
      ),
    },
    {
      icon: FileText,
      title: '4. Institutional & Campus Safety (FERPA & COPPA)',
      content: (
        <p className="text-muted-foreground leading-relaxed">
          We comply with international educational privacy frameworks, including FERPA guidelines for
          school-affiliated records and COPPA regulations for underage student safety. School verification
          badges require administrative domain verification or authorized campus moderator sign-off.
        </p>
      ),
    },
    {
      icon: CheckCircle,
      title: '5. Your Rights & Data Portability',
      content: (
        <>
          <p className="mb-3">Every student on EduNexus retains full ownership over their data:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
            <li>You can request a full JSON export of your student profile and project portfolio at any time.</li>
            <li>You can update or retract public visibility of your profile in Account Settings.</li>
            <li>
              You can request permanent account deletion, which cascades and scrubs all personal records
              from our primary database within 30 days.
            </li>
          </ul>
        </>
      ),
    },
    {
      icon: HelpCircle,
      title: '6. Privacy Inquiries & Data Protection Officer',
      content: (
        <p className="text-muted-foreground leading-relaxed">
          For privacy concerns, compliance audits, or data deletion requests, contact our Data Protection Officer
          directly at{' '}
          <a href="mailto:edunexus.infodesk@gmail.com" className="font-bold text-primary hover:underline">
            edunexus.infodesk@gmail.com
          </a>{' '}
          or submit an inquiry through our{' '}
          <Link to="/contact" className="font-bold text-primary hover:underline">
            Contact Support page
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
          eyebrow="Legal & Trust"
          title={
            <>
              Student Privacy <span className="text-gradient">Policy.</span>
            </>
          }
          subtitle="Last revised: September 2026 • Effective worldwide for all students and campus hubs."
        />

        <div className="mt-12 space-y-8">
          {sections.map((sec, i) => {
            const Icon = sec.icon;
            return (
              <div
                key={i}
                className="p-7 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{sec.title}</h3>
                </div>
                <div className="text-sm text-foreground/90 pl-0 sm:pl-13">{sec.content}</div>
              </div>
            );
          })}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default PrivacyPolicyPage;
