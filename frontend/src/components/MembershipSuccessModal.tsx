import React from 'react';
import type { MyMembership } from '../types';
import { CheckCircle, FileText, ArrowRight, Zap } from 'lucide-react';
import { MembershipBadge } from './MembershipBadge';

interface MembershipSuccessModalProps {
  membership: MyMembership | null;
  isOpen: boolean;
  onClose: () => void;
  onViewInvoice: () => void;
}

export const MembershipSuccessModal: React.FC<MembershipSuccessModalProps> = ({
  membership,
  isOpen,
  onClose,
  onViewInvoice,
}) => {
  if (!isOpen || !membership) return null;

  const expirationFormatted = membership.expires_at
    ? new Date(membership.expires_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '30 days from today';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden my-8 text-center">
        {/* Glowing top line */}
        <div
          className="h-2 w-full"
          style={{ background: `linear-gradient(90deg, ${membership.color}, #00e599, ${membership.color})` }}
        />

        <div className="p-6 sm:p-8 space-y-6">
          {/* Animated Celebration Icon */}
          <div className="relative w-20 h-20 mx-auto">
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-25"
              style={{ background: membership.color }}
            />
            <div
              className="relative w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl border"
              style={{
                background: `${membership.color}20`,
                borderColor: `${membership.color}50`,
              }}
            >
              <MembershipBadge
                membership={{
                  tier: membership.tier,
                  active: true,
                  name: membership.name,
                  color: membership.color,
                }}
                size={40}
              />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-2">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>30-Day Early Bird Pass Activated</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Welcome, <span style={{ color: membership.color }}>{membership.name}</span>!
            </h2>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Your 100% free promotional pass is live. Your profile now proudly showcases your verified tick everywhere on the platform!
            </p>
          </div>

          {/* Highlights Card */}
          <div className="p-4 rounded-2xl bg-secondary/40 border border-border text-left space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-muted-foreground pb-2 border-b border-border/60">
              <span>Status</span>
              <span className="font-bold text-emerald-400 uppercase tracking-wider text-[10px]">Active (100% Off)</span>
            </div>

            <div className="flex items-center justify-between text-muted-foreground pb-2 border-b border-border/60">
              <span>Valid Until</span>
              <span className="font-bold text-foreground">{expirationFormatted} ({membership.days_remaining ?? 30} days left)</span>
            </div>

            {membership.invoice_number && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Receipt / Invoice #</span>
                <span className="font-mono font-bold text-primary text-[11px]">{membership.invoice_number}</span>
              </div>
            )}
          </div>

          {/* Quick Perks List */}
          <div className="text-left bg-primary/5 border border-primary/20 rounded-2xl p-4">
            <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-2 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Unlocked and ready to use</span>
            </p>
            <ul className="text-xs text-foreground/90 space-y-1.5">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Verified tick next to your name on posts &amp; chats</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Algorithm reach boost in the For You feed</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Expanded monthly outreach credits for new chats &amp; groups</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-2.5">
            <button
              onClick={onViewInvoice}
              className="w-full py-3 rounded-2xl bg-secondary border border-border text-xs font-bold text-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <FileText className="w-4 h-4 text-primary" />
              <span>View &amp; Print Official Receipt</span>
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-md glow-on-hover"
            >
              <span>Explore My Upgraded Feed</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
