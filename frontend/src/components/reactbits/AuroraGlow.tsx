import React from 'react';

interface AuroraGlowProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  opacity?: number;
}

export const AuroraGlow: React.FC<AuroraGlowProps> = ({
  className = '',
  size = 'md',
  opacity = 0.5,
}) => {
  const sizeClasses = {
    sm: 'h-32',
    md: 'h-48',
    lg: 'h-64',
    full: 'inset-0',
  }[size];

  return (
    <div
      className={`pointer-events-none absolute overflow-hidden ${sizeClasses} ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <div className="absolute -top-1/2 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/20 blur-[90px] animate-aurora-1" />
      <div className="absolute -top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-emerald-400/15 blur-[80px] animate-aurora-2" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-teal-300/10 blur-[70px] animate-aurora-3" />
    </div>
  );
};
