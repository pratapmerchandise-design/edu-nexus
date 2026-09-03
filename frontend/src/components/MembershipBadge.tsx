import React from 'react';
import { Check } from 'lucide-react';
import type { MembershipInfo } from '../types';

interface MembershipBadgeProps {
  membership?: MembershipInfo | null;
  size?: number;
  className?: string;
}

const TIER_THEMES: Record<string, { gradient: string; glow: string; border: string }> = {
  bronze: {
    gradient: 'linear-gradient(135deg, #e59850 0%, #b0621d 50%, #783a06 100%)',
    glow: 'rgba(205, 127, 50, 0.8)',
    border: 'rgba(255, 200, 150, 0.4)',
  },
  silver: {
    gradient: 'linear-gradient(135deg, #ffffff 0%, #a8b2c1 50%, #64748b 100%)',
    glow: 'rgba(200, 215, 235, 0.85)',
    border: 'rgba(255, 255, 255, 0.6)',
  },
  gold: {
    gradient: 'linear-gradient(135deg, #fff275 0%, #f5c518 50%, #b8860b 100%)',
    glow: 'rgba(245, 197, 24, 0.85)',
    border: 'rgba(255, 245, 160, 0.5)',
  },
  platinum: {
    gradient: 'linear-gradient(135deg, #a7ffcd 0%, #22e079 50%, #059669 100%)',
    glow: 'rgba(34, 224, 121, 0.9)',
    border: 'rgba(180, 255, 210, 0.6)',
  },
  diamond: {
    gradient: 'linear-gradient(135deg, #c7f9ff 0%, #38bdf8 50%, #0284c7 100%)',
    glow: 'rgba(56, 189, 248, 0.95)',
    border: 'rgba(210, 250, 255, 0.7)',
  },
};

/**
 * Verification tick for paid members (Bronze/Silver/Gold/Platinum/Diamond).
 * Features continuous sweeping light glare, animated pulse glow, and 3D metallic sheen.
 */
export const MembershipBadge: React.FC<MembershipBadgeProps> = ({ membership, size = 14, className = '' }) => {
  if (!membership || !membership.active || !membership.tier) return null;

  const tierKey = membership.tier.toLowerCase();
  const theme = TIER_THEMES[tierKey] || {
    gradient: `linear-gradient(135deg, #a7ffcd, ${membership.color || '#22e079'}, #059669)`,
    glow: `${membership.color || '#22e079'}cc`,
    border: 'rgba(255, 255, 255, 0.4)',
  };

  const iconSize = Math.max(8, Math.round(size * 0.64));

  return (
    <span
      title={membership.name}
      aria-label={membership.name}
      className={`inline-flex items-center justify-center rounded-full shrink-0 relative overflow-hidden transition-transform duration-200 hover:scale-125 align-middle animate-badge-pulse ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        background: theme.gradient,
        border: `1px solid ${theme.border}`,
        boxShadow: `0 0 0 1px var(--card), 0 0 10px ${theme.glow}, inset 0 1px 1px rgba(255,255,255,0.7)`,
        ['--glow-color' as any]: theme.glow,
      }}
    >
      {/* 3D Drop-shadowed Tick */}
      <Check
        size={iconSize}
        strokeWidth={3.8}
        className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] relative z-10"
      />

      {/* Sweeping Light Sheen / Glimmer Beam */}
      <span
        className="absolute inset-0 w-[45%] h-full bg-gradient-to-r from-transparent via-white/80 to-transparent animate-badge-shimmer pointer-events-none z-20"
      />
    </span>
  );
};
