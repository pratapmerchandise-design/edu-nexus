import React, { useState } from 'react';
import type { MembershipTier } from '../types';
import {
  X,
  Sparkles,
  Check,
  ShieldCheck,
  Zap,
  ArrowRight,
  Tag,
  GraduationCap,
  BookOpen,
  Building2,
  Target,
} from 'lucide-react';
import { MembershipBadge } from './MembershipBadge';

interface EarlyBirdClaimModalProps {
  tier: MembershipTier | null;
  isOpen: boolean;
  onClose: () => void;
  onClaim: (payload: {
    tierKey: string;
    occupation: string;
    fieldOfStudy: string;
    institution: string;
    primaryGoal: string;
  }) => Promise<void>;
}

const OCCUPATION_OPTIONS = [
  'College / University Student',
  'High School Student',
  'Graduate / Master’s Student',
  'Self-Taught Developer / Builder',
  'Researcher / Academic',
  'Club or Community Leader',
];

const FIELD_OPTIONS = [
  'Computer Science & AI',
  'Engineering & Robotics',
  'Business, Finance & Economics',
  'Design, UI/UX & Creative Arts',
  'Natural Sciences & Medicine',
  'Social Sciences & Law',
  'General / Multidisciplinary',
];

const GOAL_OPTIONS = [
  'Find hackathon & project teammates',
  'Discover competitions, grants & scholarships',
  'Grow my reach & showcase what I build',
  'Join campus clubs & student groups',
  'Network with ambitious peers globally',
];

export const EarlyBirdClaimModal: React.FC<EarlyBirdClaimModalProps> = ({
  tier,
  isOpen,
  onClose,
  onClaim,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [occupation, setOccupation] = useState(OCCUPATION_OPTIONS[0]);
  const [fieldOfStudy, setFieldOfStudy] = useState(FIELD_OPTIONS[0]);
  const [institution, setInstitution] = useState('');
  const [primaryGoal, setPrimaryGoal] = useState(GOAL_OPTIONS[0]);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !tier) return null;

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution.trim()) {
      alert('Please enter your school, college, or university name.');
      return;
    }
    setStep(2);
  };

  const handleFinalClaim = async () => {
    setLoading(true);
    try {
      await onClaim({
        tierKey: tier.key,
        occupation,
        fieldOfStudy,
        institution: institution.trim(),
        primaryGoal,
      });
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const originalPrice = tier.original_price_inr ?? tier.price_inr;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Top glowing gradient line */}
        <div
          className="h-2 w-full"
          style={{ background: `linear-gradient(90deg, ${tier.color}, #00e599, ${tier.color})` }}
        />

        <div className="p-6 sm:p-7 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner"
                style={{ background: `${tier.color}20`, border: `1px solid ${tier.color}40` }}
              >
                <MembershipBadge
                  membership={{ tier: tier.key, active: true, name: tier.name, color: tier.color }}
                  size={24}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-foreground" style={{ color: tier.color }}>
                    {tier.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                    100% OFF
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step === 1 ? 'Step 1 of 2: Student Verification' : 'Step 2 of 2: Confirm 30-Day Pass'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={loading}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* STEP 1: Student Verification Survey */}
          {step === 1 && (
            <form onSubmit={handleNext} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 text-xs">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Tell us about yourself to activate your free pass</span>
                </p>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  EduNexus is student-first. We use these details to personalize your feed and opportunities.
                </p>
              </div>

              {/* Occupation / Academic Level */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-primary" />
                  <span>What best describes you?</span>
                </label>
                <select
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary font-medium"
                >
                  {OCCUPATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field of Study */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span>Your Field of Study or Focus</span>
                </label>
                <select
                  value={fieldOfStudy}
                  onChange={(e) => setFieldOfStudy(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary font-medium"
                >
                  {FIELD_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Institution / College */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <span>School, College, or Organization</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stanford University / Apex High School / Self-Taught"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/60"
                />
              </div>

              {/* Primary Goal */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  <span>Main Goal on EduNexus</span>
                </label>
                <select
                  value={primaryGoal}
                  onChange={(e) => setPrimaryGoal(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary font-medium"
                >
                  {GOAL_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-md glow-on-hover"
                >
                  <span>Continue to Summary</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Order Summary & Confirmation */}
          {step === 2 && (
            <div className="space-y-5 animate-fadeIn">
              {/* Profile summary chip */}
              <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Student Profile</span>
                  <button
                    onClick={() => setStep(1)}
                    className="text-primary font-bold hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <p className="font-bold text-foreground">{occupation}</p>
                <p className="text-muted-foreground text-[11px]">
                  {fieldOfStudy} • {institution}
                </p>
              </div>

              {/* Pricing breakdown */}
              <div className="p-4 rounded-2xl bg-secondary/50 border border-border space-y-2.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Regular Monthly Plan</span>
                  <span className="line-through font-semibold">₹{originalPrice}.00</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Coupon: EARLYBIRD_30D</span>
                  </div>
                  <span className="font-bold text-emerald-400">-₹{originalPrice}.00 (100% OFF)</span>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground block">Payable Today</span>
                    <span className="text-[10px] text-muted-foreground">Valid for 30 days • No credit card needed</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-400">₹0</span>
                    <span className="text-[10px] text-muted-foreground ml-1">/ 1st month</span>
                  </div>
                </div>
              </div>

              {/* Unlocked Benefits */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Everything you unlock instantly</span>
                </p>
                <ul className="space-y-2">
                  {tier.perks.map((perk, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-foreground/90">
                      <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Zero Risk Trust Guarantee */}
              <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 flex items-center gap-3 text-xs">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="font-bold text-foreground">Zero Risk • Zero Auto-Charge</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Your account reverts safely to the Free tier after 30 days unless you choose to renew.
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleFinalClaim}
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl text-xs sm:text-sm font-black text-background bg-primary hover:bg-primary/90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg glow-on-hover disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                      <span>Activating Your 30-Day Pass...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Confirm &amp; Claim 30 Days Free {tier.name}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="w-full py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back to Details
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
