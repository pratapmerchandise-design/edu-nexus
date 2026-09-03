import React from 'react';
import type { InvoiceDetails } from '../types';
import { X, Printer, CheckCircle, ShieldCheck, Sparkles, Award } from 'lucide-react';
import { MembershipBadge } from './MembershipBadge';

interface PaymentInvoiceModalProps {
  invoice: InvoiceDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentInvoiceModal: React.FC<PaymentInvoiceModalProps> = ({
  invoice,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(invoice.issue_date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm p-3 sm:p-6 flex justify-center items-start sm:items-center animate-fadeIn">
      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible;
          }
          #printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            padding: 20px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        id="printable-invoice"
        className="relative w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Fixed Header Banner */}
        <div className="shrink-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-5 sm:p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shadow-inner shrink-0">
              <Award className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                  Edu<span className="text-primary">Nexus</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
                  Official Receipt
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                Student Social &amp; Collaboration Platform
              </p>
            </div>
          </div>

          <div className="no-print flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary border border-border text-xs font-bold text-foreground hover:bg-secondary/80 transition-colors shadow-xs"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="overflow-y-auto p-5 sm:p-7 space-y-5 flex-1">
          {/* Invoice Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 p-4 rounded-2xl bg-secondary/40 border border-border text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px] sm:text-[11px]">Invoice Number</span>
              <span className="font-mono font-bold text-foreground text-xs mt-0.5 block break-all">
                {invoice.invoice_number}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] sm:text-[11px]">Date Issued</span>
              <span className="font-semibold text-foreground text-xs mt-0.5 block">{formattedDate}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] sm:text-[11px]">Payment Method</span>
              <span className="font-semibold text-foreground text-xs mt-0.5 capitalize block">
                {invoice.billing.is_early_bird ? '🎁 Early Bird 100% Pass' : invoice.provider}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] sm:text-[11px]">Payment Status</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-500 text-xs mt-0.5">
                <CheckCircle className="w-3.5 h-3.5" />
                {invoice.status}
              </span>
            </div>
          </div>

          {/* Student Billing Details */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 p-4 rounded-2xl bg-secondary/20 border border-border">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Billed To (Student)
              </p>
              <p className="text-sm font-bold text-foreground">{invoice.student.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                @{invoice.student.username} {invoice.student.email && `• ${invoice.student.email}`}
              </p>
              {invoice.student.school && (
                <p className="text-xs text-primary font-medium mt-1">School: {invoice.student.school}</p>
              )}
            </div>

            <div className="sm:text-right">
              <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Membership Plan
              </p>
              <div className="inline-flex items-center gap-1.5">
                <MembershipBadge
                  membership={{
                    tier: invoice.plan.tier,
                    active: true,
                    name: invoice.plan.name,
                    color: invoice.plan.color,
                  }}
                  size={16}
                />
                <span className="text-sm font-bold text-foreground" style={{ color: invoice.plan.color }}>
                  {invoice.plan.name}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Valid for {invoice.plan.validity_days} Days</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/60 text-muted-foreground border-b border-border uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5 text-center">Period</th>
                  <th className="p-3.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr>
                  <td className="p-3.5">
                    <p className="font-bold text-foreground">{invoice.plan.name} Subscription</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Includes verified tick, reach multiplier, expanded upload capacity, and monthly outreach quotas.
                    </p>
                  </td>
                  <td className="p-3.5 text-center text-muted-foreground whitespace-nowrap">
                    {invoice.plan.validity_days} Days
                  </td>
                  <td className="p-3.5 text-right font-medium text-foreground">
                    ₹{invoice.billing.original_amount}.00
                  </td>
                </tr>

                {invoice.billing.discount_amount > 0 && (
                  <tr className="bg-emerald-500/5">
                    <td className="p-3.5" colSpan={2}>
                      <div className="flex items-center gap-1.5 text-emerald-500 font-bold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{invoice.billing.discount_name || 'Promotional Discount (100% OFF)'}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Special Early Bird Launch Campaign discount applied to your student account.
                      </p>
                    </td>
                    <td className="p-3.5 text-right font-bold text-emerald-500">
                      -₹{invoice.billing.discount_amount}.00
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-secondary/40 border-t border-border font-bold">
                <tr>
                  <td className="p-3.5 text-muted-foreground" colSpan={2}>
                    Total Amount Paid (INR)
                  </td>
                  <td className="p-3.5 text-right text-base text-foreground font-black">
                    ₹{invoice.billing.net_paid}.00
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Perks Summary Badge */}
          <div className="p-3.5 sm:p-4 rounded-2xl border border-primary/20 bg-primary/5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-foreground">Benefits Unlocked &amp; Active</p>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">
                Your profile tick is live everywhere on EduNexus. Monthly chat and group outreach quotas have been upgraded.
              </p>
            </div>
          </div>

          {/* Official Stamp & Security Note */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-[11px] text-muted-foreground border-t border-border">
            <div>
              <p className="font-semibold text-foreground/80">EduNexus Platform • Student Verification Division</p>
              <p className="text-[10px]">Tax Invoice / Transaction Confirmation • No Signature Required</p>
            </div>

            <div className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-bold tracking-wider text-[10px] uppercase flex items-center gap-1.5 shrink-0">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Verified &amp; Activated</span>
            </div>
          </div>
        </div>

        {/* Fixed Sticky Footer Actions */}
        <div className="no-print shrink-0 p-4 sm:p-5 bg-secondary/40 border-t border-border flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-secondary border border-border text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-transform active:scale-95"
            style={{ background: '#22e079', color: '#042f16' }}
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentInvoiceModal;
