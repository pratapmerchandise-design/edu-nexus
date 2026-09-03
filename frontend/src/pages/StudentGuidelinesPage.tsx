import React from 'react';
import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';
import { SectionHeading } from '../components/motion';
import { HeartHandshake, ShieldCheck, MessageSquare, Flag, Sparkles, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export const StudentGuidelinesPage: React.FC = () => {
  const guidelines = [
    {
      icon: HeartHandshake,
      title: 'Be Constructive, Uplifting & Inclusive',
      description:
        'EduNexus brings together students from over 40 countries, with varying levels of experience. Celebrate wins, provide thoughtful feedback on projects, and foster an environment where everyone feels confident sharing their work.',
      rules: [
        'Give actionable, kind code reviews and project suggestions.',
        'Welcome junior students and beginners who are just starting their journey.',
        'Respect diverse academic backgrounds, perspectives, and cultures.',
      ],
    },
    {
      icon: BookOpen,
      title: 'Honor Academic Integrity & True Collaboration',
      description:
        'Collaboration is about learning together, not taking shortcuts. EduNexus projects should showcase original student effort and authentic problem-solving.',
      rules: [
        'Always credit teammates, mentors, open-source libraries, and research papers.',
        'Do not request or sell completed homework assignments, test answers, or exam materials.',
        'Be transparent about team roles when submitting group projects to hackathons.',
      ],
    },
    {
      icon: ShieldCheck,
      title: 'Protect Your Personal Privacy',
      description:
        'Your safety is our top priority. Never share sensitive private data on public feeds, group chats, or direct messages.',
      rules: [
        'Never share passwords, banking/payment information, or government ID numbers.',
        'Report any account asking for money, paid exam services, or inappropriate contact.',
        'Use the platform messaging system rather than taking sensitive conversations off-platform.',
      ],
    },
    {
      icon: MessageSquare,
      title: 'Keep Discussions Focused & Respectful',
      description:
        'Subject forums and school feeds thrive when content is relevant, educational, and engaging.',
      rules: [
        'Post questions in the corresponding subject forum (e.g. Computer Science, Robotics, Biology).',
        'Avoid repetitive spam, unsolicited crypto/NFT promotions, or unrelated marketing.',
        'Disagree with ideas respectfully without attacking individuals.',
      ],
    },
    {
      icon: Flag,
      title: 'How to Report Content & Get Help',
      description:
        'Moderators review flagged content 24/7 to maintain high campus standards.',
      rules: [
        'Click the "..." menu on any post or message and select "Report" to alert administrators.',
        'If you experience urgent harassment or safety issues, email edunexus.infodesk@gmail.com immediately.',
        'False reporting or weaponizing flags against peers is also a community violation.',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="page-noise" aria-hidden="true" />
      <PublicNavbar />

      <main className="max-w-4xl mx-auto px-6 pt-36 pb-24">
        <SectionHeading
          eyebrow="Community Standards"
          title={
            <>
              Student Safety &amp; <span className="text-gradient">Guidelines.</span>
            </>
          }
          subtitle="The rules of engagement that make EduNexus a trusted, inspiring hub for student builders worldwide."
        />

        <div className="mt-12 space-y-8">
          {guidelines.map((g, i) => {
            const Icon = g.icon;
            return (
              <div
                key={i}
                className="p-7 sm:p-8 rounded-3xl border border-border bg-card shadow-xs space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{g.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-0 sm:pl-13">
                  {g.description}
                </p>
                <div className="pl-0 sm:pl-13">
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-foreground/90 font-medium">
                    {g.rules.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}

          <div className="p-8 rounded-3xl bg-secondary/60 border border-border text-center space-y-3">
            <Sparkles className="w-6 h-6 text-primary mx-auto" />
            <h4 className="text-base font-bold text-foreground">Need to reach our Safety Team?</h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Our safety leads are available around the clock. Contact us anytime for questions or moderation assistance.
            </p>
            <div className="pt-2">
              <Link
                to="/contact"
                className="button button-solid font-bold px-6 py-2.5 text-xs inline-flex items-center gap-2"
                style={{ background: '#22e079', color: '#042f16' }}
              >
                Contact Safety Team
              </Link>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default StudentGuidelinesPage;
