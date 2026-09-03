import React from 'react';

interface BorderBeamProps {
  className?: string;
  size?: number; // size in pixels of the beam
  duration?: number; // animation duration in seconds
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

export const BorderBeam: React.FC<BorderBeamProps> = ({
  className = '',
  size = 180,
  duration = 8,
  borderWidth = 1.5,
  colorFrom = '#22e079',
  colorTo = '#43f391',
  delay = 0,
}) => {
  return (
    <div
      style={
        {
          '--size': `${size}px`,
          '--duration': `${duration}s`,
          '--border-width': `${borderWidth}px`,
          '--color-from': colorFrom,
          '--color-to': colorTo,
          '--delay': `-${delay}s`,
        } as React.CSSProperties
      }
      className={`pointer-events-none absolute inset-0 rounded-[inherit] border-[length:var(--border-width)] border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)] z-20 ${className}`}
    >
      <div
        className="absolute aspect-square w-[calc(var(--size))] bg-gradient-to-l from-[var(--color-from)] via-[var(--color-to)] to-transparent animate-border-beam"
        style={{
          offsetAnchor: '100% 50%',
          offsetPath: 'rect(0 auto auto 0 round var(--size))',
        }}
      />
    </div>
  );
};
