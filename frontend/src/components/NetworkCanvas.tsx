import React, { useEffect, useRef } from 'react';

interface NetworkOptions {
  density?: number;
  maxNodes?: number;
  lineDistance?: number;
  lineAlpha?: number;
  speed?: number;
  nodeColor?: string;
  className?: string;
}

export const NetworkCanvas: React.FC<NetworkOptions> = ({
  density = 15000,
  maxNodes = 75,
  lineDistance = 150,
  lineAlpha = 0.16,
  speed = 0.18,
  nodeColor = 'rgba(52,240,139,.72)',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let nodes: Array<{ x: number; y: number; vx: number; vy: number; r: number }> = [];
    let frameId = 0;

    function resize() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(maxNodes, Math.max(18, Math.floor((width * height) / density)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        r: Math.random() * 1.4 + 0.55,
      }));
    }

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (!reducedMotion) {
          a.x += a.vx;
          a.y += a.vy;
          if (a.x < 0 || a.x > width) a.vx *= -1;
          if (a.y < 0 || a.y > height) a.vy *= -1;
        }

        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance < lineDistance) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(42,220,120,${(1 - distance / lineDistance) * lineAlpha})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      if (!reducedMotion) {
        frameId = requestAnimationFrame(draw);
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(frameId);
      resize();
      draw();
    });

    resizeObserver.observe(canvas);
    resize();
    draw();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
    };
  }, [density, maxNodes, lineDistance, lineAlpha, speed, nodeColor]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
};
