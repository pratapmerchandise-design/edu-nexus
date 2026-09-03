import React, { useEffect, useRef, useState, type ReactNode } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

interface RevealProps {
  children: ReactNode;
  className?: string;
  direction?: Direction;
  delay?: number;
  as?: React.ElementType;
  once?: boolean;
}

const offset: Record<Direction, string> = {
  up: 'translate-y-8',
  down: '-translate-y-8',
  left: 'translate-x-8',
  right: '-translate-x-8',
  none: '',
};

export const Reveal: React.FC<RevealProps> = ({
  children,
  className = '',
  direction = 'up',
  delay = 0,
  as = 'div',
  once = true,
}) => {
  const Tag = as as React.ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.unobserve(entry.target);
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`reveal ${visible ? 'reveal-in' : offset[direction]} ${className}`}
    >
      {children}
    </Tag>
  );
};

interface CountUpProps {
  end: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
}

export const CountUp: React.FC<CountUpProps> = ({
  end,
  duration = 1800,
  suffix = '',
  prefix = '',
  decimals = 0,
  className = '',
}) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setValue(end);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(end * eased);
            if (progress < 1) requestAnimationFrame(tick);
            else setValue(end);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [end, duration, started]);

  const display = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString();

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
};

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className = '',
}) => (
  <div
    className={`${align === 'center' ? 'mx-auto text-center max-w-2xl' : 'max-w-2xl'} ${className}`}
  >
    {eyebrow && (
      <Reveal direction="down">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-primary mb-4">
          <span className="h-px w-6 bg-primary/60" />
          {eyebrow}
        </span>
      </Reveal>
    )}
    <Reveal>
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
        {title}
      </h2>
    </Reveal>
    {subtitle && (
      <Reveal delay={80}>
        <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">{subtitle}</p>
      </Reveal>
    )}
  </div>
);
