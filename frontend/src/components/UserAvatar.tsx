import React from 'react';
import type { MembershipInfo } from '../types';

interface UserAvatarProps {
  src?: string | null;
  username?: string;
  alt?: string;
  size?: number;
  membership?: MembershipInfo | null;
  className?: string;
  onClick?: () => void;
  title?: string;
}

const TIER_RINGS: Record<string, { gradient: string; glow: string; border: string }> = {
  bronze: {
    gradient: 'linear-gradient(135deg, #e59850, #b0621d, #783a06, #f59e0b)',
    glow: 'rgba(205, 127, 50, 0.65)',
    border: 'rgba(255, 180, 100, 0.5)',
  },
  silver: {
    gradient: 'linear-gradient(135deg, #ffffff, #94a3b8, #cbd5e1, #64748b)',
    glow: 'rgba(200, 215, 235, 0.7)',
    border: 'rgba(255, 255, 255, 0.65)',
  },
  gold: {
    gradient: 'linear-gradient(135deg, #fff382, #f5c518, #d97706, #fbbf24)',
    glow: 'rgba(245, 197, 24, 0.8)',
    border: 'rgba(255, 235, 120, 0.6)',
  },
  platinum: {
    gradient: 'linear-gradient(135deg, #a7ffcd, #22e079, #10b981, #059669)',
    glow: 'rgba(34, 224, 121, 0.85)',
    border: 'rgba(167, 255, 205, 0.65)',
  },
  diamond: {
    gradient: 'linear-gradient(135deg, #c7f9ff, #38bdf8, #0284c7, #67e8f9)',
    glow: 'rgba(56, 189, 248, 0.9)',
    border: 'rgba(200, 250, 255, 0.75)',
  },
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  username = 'user',
  alt = 'avatar',
  size = 40,
  membership,
  className = '',
  onClick,
  title,
}) => {
  const isMember = Boolean(membership && membership.active && membership.tier);
  const tierKey = (membership?.tier || '').toLowerCase();
  const ring = isMember ? (TIER_RINGS[tierKey] || TIER_RINGS.platinum) : null;
  const avatarUrl = src || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

  // Ring padding based on avatar size
  const ringPadding = size >= 64 ? 3.5 : size >= 40 ? 2.5 : 2;
  const cursorClass = onClick ? 'cursor-pointer hover:opacity-85 hover:scale-[1.03] transition-all' : '';

  if (isMember && ring) {
    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 group ${cursorClass} ${className}`}
        style={{ width: size, height: size }}
        onClick={onClick}
        title={title || username}
      >
        {/* Ambient Aura Glow behind DP */}
        <div
          className="absolute inset-0 rounded-full blur-[6px] animate-avatar-aura pointer-events-none"
          style={{
            background: ring.glow,
          }}
        />

        {/* Animated Rotating Gradient Halo Ring */}
        <div
          className="absolute inset-0 rounded-full p-[2px] animate-avatar-halo"
          style={{
            background: ring.gradient,
            boxShadow: `0 0 8px ${ring.glow}`,
          }}
        />

        {/* Inner Avatar Image */}
        <div
          className="relative w-full h-full rounded-full overflow-hidden bg-card border border-white/20 z-10"
          style={{
            padding: `${ringPadding}px`,
          }}
        >
          <img
            src={avatarUrl}
            alt={alt}
            className="w-full h-full rounded-full object-cover bg-secondary transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      </div>
    );
  }

  // Standard Non-Member Avatar
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden border border-border bg-secondary ${cursorClass} ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      title={title || username}
    >
      <img
        src={avatarUrl}
        alt={alt}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
};
