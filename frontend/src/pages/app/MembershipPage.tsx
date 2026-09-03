import React, { useState, useEffect } from 'react';
import { AppLayout } from '../../components/AppLayout';
import { api } from '../../services/api';
import { MembershipBadge } from '../../components/MembershipBadge';
import { ReflectiveCard } from '../../components/reactbits/ReflectiveCard';
import { BorderBeam } from '../../components/reactbits/BorderBeam';
import { AuroraGlow } from '../../components/reactbits/AuroraGlow';
import { ShinyText } from '../../components/reactbits/ShinyText';
import { EarlyBirdClaimModal } from '../../components/EarlyBirdClaimModal';
import { MembershipSuccessModal } from '../../components/MembershipSuccessModal';
import { PaymentInvoiceModal } from '../../components/PaymentInvoiceModal';
import type {
  MembershipTier,
  MyMembership,
  PaymentTransaction,
  PaymentConfig,
  InvoiceDetails,
} from '../../types';
import {
  Crown,
  Check,
  Sparkles,
  Star,
  Zap,
  ShieldCheck,
  Tag,
  Clock,
  FileText,
  CreditCard,
  Gift,
} from 'lucide-react';

const OutreachStat: React.FC<{ label: string; data: any }> = ({ label, data }) => {
  const limit = data?.limit;
  const used = data?.used ?? 0;
  const remaining = data?.remaining;
  const unlimited = limit == null;
  const pct = unlimited ? 100 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold text-foreground">{unlimited ? 'Unlimited' : `${remaining} left`}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">
        {unlimited ? 'No monthly cap on your plan' : `${used} of ${limit} used this month`}
      </p>
    </div>
  );
};

export const MembershipPage: React.FC = () => {
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [mine, setMine] = useState<MyMembership | null>(null);
  const [limits, setLimits] = useState<any>(null);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [claimModalTier, setClaimModalTier] = useState<MembershipTier | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [invoiceModalData, setInvoiceModalData] = useState<InvoiceDetails | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [t, m, l, cfg, txs] = await Promise.all([
        api.get<MembershipTier[]>('/membership/tiers'),
        api.get<MyMembership | null>('/membership/me').catch(() => null),
        api.get<any>('/membership/limits').catch(() => null),
        api.get<PaymentConfig>('/membership/config').catch(() => null),
        api.get<PaymentTransaction[]>('/membership/transactions').catch(() => []),
      ]);
      setTiers(t || []);
      setMine(m);
      setLimits(l);
      setPaymentConfig(cfg);
      setTransactions(txs || []);
    } catch (e) {
      console.error('Failed to load membership data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Preload Razorpay script if needed in the future
  useEffect(() => {
    if (paymentConfig?.razorpay_key_id) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
      return () => {
        try {
          document.body.removeChild(script);
        } catch (_) {}
      };
    }
  }, [paymentConfig]);

  // Claim Early Bird 100% Free Pass
  const handleClaimEarlyBird = async (payload: {
    tierKey: string;
    occupation: string;
    fieldOfStudy: string;
    institution: string;
    primaryGoal: string;
  }) => {
    try {
      const updated = await api.post<MyMembership>('/membership/claim-early-bird', {
        tier: payload.tierKey,
        promo_code: 'EARLYBIRD_FREE30',
        role_or_occupation: payload.occupation,
        field_of_study: payload.fieldOfStudy,
        institution_name: payload.institution,
        primary_goal: payload.primaryGoal,
      });
      setMine(updated);
      setClaimModalTier(null);
      setSuccessModalOpen(true);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Could not activate Early Bird pass');
    }
  };

  // View specific invoice
  const handleViewInvoice = async (invoiceNumber?: string) => {
    const invNum = invoiceNumber || mine?.invoice_number;
    if (!invNum) return;
    try {
      const inv = await api.get<InvoiceDetails>(`/membership/invoice/${invNum}`);
      setInvoiceModalData(inv);
      setInvoiceModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Could not load invoice');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel auto-renew? You will keep full benefits until your 30-day period ends.')) return;
    try {
      await api.post<MyMembership>('/membership/cancel');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Could not cancel membership');
    }
  };

  const paidTiers = tiers.filter((t) => t.key !== 'free');
  const freeTier = tiers.find((t) => t.key === 'free');

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        {/* Promotional Launch Banner with Aurora Glow */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-9 text-center shadow-xl relative overflow-hidden">
          <AuroraGlow size="full" opacity={0.7} />

          <div className="relative z-10 space-y-4">
            {/* Live Campaign Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black tracking-wide shadow-sm animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>EARLY BIRD LAUNCH OFFER • 100% OFF 30-DAY PASS</span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight">
                Stand Out on EduNexus with{' '}
                <ShinyText color="var(--primary)">Premium Perks</ShinyText>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-xl mx-auto leading-relaxed">
                Unlock your colored verification tick, 2x For You feed boost, expanded upload capacity, and higher
                messaging outreach limits — completely <span className="text-emerald-400 font-bold">100% FREE</span> for your first 30 days.
              </p>
            </div>

            {/* If user currently has active membership */}
            {mine?.tier && mine?.status === 'active' ? (
              <div className="inline-flex flex-wrap items-center justify-center gap-3 p-3 px-5 rounded-2xl bg-secondary/80 border border-border shadow-md">
                <div className="flex items-center gap-2">
                  <MembershipBadge
                    membership={{ tier: mine.tier, active: true, name: mine.name, color: mine.color }}
                    size={18}
                  />
                  <span className="text-xs font-bold text-foreground">
                    Active Plan: <span style={{ color: mine.color }}>{mine.name}</span>
                  </span>
                </div>
                <div className="h-4 w-px bg-border hidden sm:block" />
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>{mine.days_remaining ? `${mine.days_remaining} days remaining` : '30 days active'}</span>
                </div>
                {mine.invoice_number && (
                  <>
                    <div className="h-4 w-px bg-border hidden sm:block" />
                    <button
                      onClick={() => handleViewInvoice(mine.invoice_number)}
                      className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Receipt #{mine.invoice_number}</span>
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-secondary/40 px-3.5 py-1.5 rounded-full border border-border">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>No credit card required • Instant 1-click activation</span>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center text-xs text-muted-foreground py-16 animate-pulse">
            Loading early bird membership benefits...
          </div>
        ) : (
          <>
            {/* Paid Tiers Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    <span>Choose Your Member Tier</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select any tier below to claim your 30-Day Free Early Bird Pass.
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                  <Tag className="w-3 h-3" />
                  <span>Promo applied automatically</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {paidTiers.map((t) => {
                  const isCurrent = mine?.tier === t.key && mine?.status === 'active';
                  const isTopTier = t.key === 'platinum';
                  const originalPrice = t.original_price_inr ?? t.price_inr;

                  return (
                    <ReflectiveCard
                      key={t.key}
                      tiltIntensity={8}
                      spotlightColor={`${t.color}25`}
                      glareColor="rgba(255, 255, 255, 0.25)"
                      isFeatured={isCurrent || isTopTier}
                      className="bg-card border border-border h-full flex flex-col relative overflow-hidden"
                    >
                      <div className="p-6 flex flex-col h-full relative">
                        {/* Glow Beam on Active or Platinum Tier */}
                        {(isCurrent || isTopTier) && (
                          <BorderBeam colorFrom={t.color} colorTo="#00e599" duration={6} size={220} />
                        )}

                        {/* Top Tier Tag */}
                        {isTopTier && !isCurrent && (
                          <div className="absolute -top-3.5 right-4 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-primary text-background shadow-md">
                            Most Popular
                          </div>
                        )}

                        {/* Tier Title */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <MembershipBadge
                              membership={{ tier: t.key, active: true, name: t.name, color: t.color }}
                              size={22}
                            />
                            <h3 className="font-extrabold text-base" style={{ color: t.color }}>
                              {isTopTier ? <ShinyText color={t.color}>{t.name}</ShinyText> : t.name}
                            </h3>
                          </div>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Active
                            </span>
                          )}
                        </div>

                        {/* Promotional Strikethrough Pricing */}
                        <div className="mb-5 p-3 rounded-2xl bg-secondary/40 border border-border/80">
                          <div className="flex items-center justify-between">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-3xl font-black text-emerald-400">₹0</span>
                              <span className="text-xs font-semibold text-muted-foreground">/ 1st mo</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-black border border-emerald-500/20">
                              100% OFF
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                            <span>Standard price:</span>
                            <span className="line-through text-muted-foreground/80 font-bold">₹{originalPrice}/mo</span>
                          </div>
                        </div>

                        {/* Perks List */}
                        <ul className="space-y-2.5 mb-6 flex-1">
                          {t.perks.map((p, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-snug">
                              <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5 stroke-[2.5]" />
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Action CTA */}
                        {isCurrent ? (
                          <div className="space-y-2">
                            <button
                              onClick={() => handleViewInvoice(mine?.invoice_number)}
                              className="w-full py-2.5 rounded-xl bg-secondary border border-border text-xs font-bold text-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <FileText className="w-3.5 h-3.5 text-primary" />
                              <span>View Receipt</span>
                            </button>
                            <button
                              onClick={handleCancel}
                              className="w-full py-1.5 text-[11px] font-medium text-muted-foreground hover:text-red-400 transition-colors"
                            >
                              Cancel membership
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setClaimModalTier(t)}
                            className="w-full py-3 rounded-xl text-xs font-black shadow-md hover:scale-[1.02] active:scale-100 transition-all flex items-center justify-center gap-1.5 glow-on-hover"
                            style={{ background: t.color, color: '#04210f' }}
                          >
                            <Gift className="w-3.5 h-3.5" />
                            <span>Claim 30 Days Free</span>
                          </button>
                        )}
                      </div>
                    </ReflectiveCard>
                  );
                })}
              </div>
            </div>

            {/* Free Tier Default Callout */}
            {freeTier && (
              <div className="bg-secondary/30 border border-border rounded-2xl p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground">
                  <Star className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{freeTier.name} Plan — Always Included</p>
                  <p className="text-xs text-muted-foreground">{freeTier.perks[0]}</p>
                </div>
                {!(mine?.tier && mine?.status === 'active') && (
                  <span className="px-2.5 py-1 rounded-full bg-secondary text-[11px] font-bold text-primary border border-border">
                    Current Default
                  </span>
                )}
              </div>
            )}

            {/* Monthly Outreach Limit Meters */}
            {limits && (
              <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span>Your Monthly Outreach Limits</span>
                  </h4>
                  {mine?.tier && mine?.status === 'active' && (
                    <span className="text-xs font-semibold text-primary">
                      Upgraded via {mine.name}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <OutreachStat label="New chats with new classmates" data={limits.new_conversations} />
                  <OutreachStat label="Group joins" data={limits.group_joins} />
                </div>

                {(!mine?.tier || mine?.status !== 'active') && limits.new_conversations?.remaining === 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    You've reached this month's free outreach cap.{' '}
                    <button
                      onClick={() => setClaimModalTier(paidTiers[0])}
                      className="text-primary font-bold underline"
                    >
                      Claim your free 30-day Early Bird pass
                    </button>{' '}
                    to message more students!
                  </p>
                )}
              </div>
            )}

            {/* How Member Benefits Work */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Zap className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-foreground">For You Feed Reach</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Posts by verified members are boosted by the recommendation algorithm, giving your questions, ideas, and wins up to 2x more student reach.
                </p>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-foreground">Colored Verification Tick</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Stand out in comments, direct chats, groups, and school forums with an official verified badge in your tier's distinctive color.
                </p>
              </div>

              <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-foreground">Higher Quotas &amp; Media</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Upload high-res files, photos, and project videos up to 150 MB, add up to 10 poll options, and enjoy extended monthly chat quotas.
                </p>
              </div>
            </div>

            {/* Billing & Receipts History Ledger */}
            {transactions.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    <span>Billing &amp; Receipts History</span>
                  </h4>
                  <span className="text-xs text-muted-foreground">{transactions.length} record(s)</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-secondary/50 text-muted-foreground uppercase text-[10px] font-semibold border-b border-border">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Plan / Description</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Invoice #</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="p-3 text-muted-foreground whitespace-nowrap">
                            {new Date(tx.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="p-3 font-semibold text-foreground capitalize">
                            {tx.plan_name || `${tx.tier} Membership`}
                          </td>
                          <td className="p-3 font-bold text-foreground">
                            {tx.amount_inr === 0 ? (
                              <span className="text-emerald-400">₹0 (100% Free)</span>
                            ) : (
                              `₹${tx.amount_inr}`
                            )}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {tx.status}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-muted-foreground">
                            {tx.invoice_number || '—'}
                          </td>
                          <td className="p-3 text-right">
                            {tx.invoice_number ? (
                              <button
                                onClick={() => handleViewInvoice(tx.invoice_number)}
                                className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-bold text-[11px] transition-colors inline-flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3 text-primary" />
                                <span>Invoice</span>
                              </button>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Claim Modal */}
      <EarlyBirdClaimModal
        tier={claimModalTier}
        isOpen={Boolean(claimModalTier)}
        onClose={() => setClaimModalTier(null)}
        onClaim={handleClaimEarlyBird}
      />

      {/* Celebratory Post-Claim Modal */}
      <MembershipSuccessModal
        membership={mine}
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        onViewInvoice={() => {
          setSuccessModalOpen(false);
          handleViewInvoice(mine?.invoice_number);
        }}
      />

      {/* Printable Invoice Modal */}
      <PaymentInvoiceModal
        invoice={invoiceModalData}
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
      />
    </AppLayout>
  );
};
