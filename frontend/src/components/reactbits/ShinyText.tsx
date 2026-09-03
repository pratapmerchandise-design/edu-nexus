import React, { type ReactNode } from 'react';

interface ShinyTextProps {
  children: ReactNode;
  className?: string;
  duration?: number;
  color?: string;
}

export const ShinyText: React.FC<ShinyTextProps> = ({
  children,
  className = '',
  duration = 3,
  color = 'currentColor',
}) => {
  return (
    <span
      className={`inline text-transparent bg-clip-text bg-[linear-gradient(110deg,currentColor_35%,rgba(255,255,255,0.95)_50%,currentColor_65%)] dark:bg-[linear-gradient(110deg,currentColor_35%,#43f391_50%,currentColor_65%)] bg-[length:250%_100%] animate-shine align-baseline ${className}`}
      style={{
        color: color,
        animationDuration: `${duration}s`,
      }}
    >
      {children}
    </span>
  );
};
