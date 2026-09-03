import React, { useRef, useState, useCallback, type ReactNode } from 'react';

interface ReflectiveCardProps {
  children: ReactNode;
  className?: string;
  glareColor?: string;
  spotlightColor?: string;
  tiltIntensity?: number; // max tilt degrees, default 10
  isFeatured?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const ReflectiveCard: React.FC<ReflectiveCardProps> = ({
  children,
  className = '',
  glareColor = 'rgba(255, 255, 255, 0.25)',
  spotlightColor = 'rgba(34, 224, 121, 0.15)',
  tiltIntensity = 8,
  isFeatured = false,
  onClick,
  style = {},
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });
  const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const percentX = (x / rect.width) * 100;
    const percentY = (y / rect.height) * 100;

    // Calculate rotation (-tiltIntensity to +tiltIntensity)
    const rotX = ((y - rect.height / 2) / (rect.height / 2)) * -tiltIntensity;
    const rotY = ((x - rect.width / 2) / (rect.width / 2)) * tiltIntensity;

    setRotateX(rotX);
    setRotateY(rotY);
    setGlarePos({ x: percentX, y: percentY, opacity: 1 });
    setSpotlightPos({ x, y, opacity: 1 });
  }, [tiltIntensity]);

  const handleMouseLeave = useCallback(() => {
    setRotateX(0);
    setRotateY(0);
    setGlarePos(prev => ({ ...prev, opacity: 0 }));
    setSpotlightPos(prev => ({ ...prev, opacity: 0 }));
  }, []);

  return (
    <div
      style={{ perspective: 1000 }}
      className="relative transition-transform duration-300 ease-out"
    >
      <div
        ref={cardRef}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transformStyle: 'preserve-3d',
          ...style,
        }}
        className={`relative overflow-hidden rounded-3xl transition-transform duration-150 ease-out ${
          isFeatured ? 'ring-1 ring-primary/40 shadow-xl' : ''
        } ${className}`}
      >
        {/* Spotlight overlay */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300 ease-out z-10"
          style={{
            opacity: spotlightPos.opacity,
            background: `radial-gradient(350px circle at ${spotlightPos.x}px ${spotlightPos.y}px, ${spotlightColor}, transparent 70%)`,
          }}
        />

        {/* Holographic Glare overlay */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300 ease-out z-20 mix-blend-overlay"
          style={{
            opacity: glarePos.opacity,
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, ${glareColor}, transparent 60%), linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(34,224,121,0.1) 100%)`,
          }}
        />

        {/* Content Container */}
        <div className="relative z-0 h-full w-full">
          {children}
        </div>
      </div>
    </div>
  );
};
