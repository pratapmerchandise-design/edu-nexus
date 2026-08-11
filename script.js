const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const nav = document.querySelector('.site-nav');
const menuButton = document.querySelector('.menu-button');

const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 30);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

menuButton.addEventListener('click', () => {
  const open = nav.classList.toggle('menu-open');
  menuButton.setAttribute('aria-expanded', String(open));
});

document.querySelectorAll('.site-nav a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('menu-open');
  menuButton.setAttribute('aria-expanded', 'false');
}));

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });

document.querySelectorAll('.animate-in, .manifesto-word').forEach(el => observer.observe(el));
document.getElementById('year').textContent = new Date().getFullYear();

const hero = document.querySelector('.hero');
if (!reducedMotion && matchMedia('(pointer:fine)').matches) {
  hero.addEventListener('pointermove', event => {
    const bounds = hero.getBoundingClientRect();
    hero.style.setProperty('--mouse-x', `${event.clientX - bounds.left}px`);
    hero.style.setProperty('--mouse-y', `${event.clientY - bounds.top}px`);
  });
}

function makeNetwork(canvas, options = {}) {
  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let nodes = [];
  let frame = 0;
  const density = options.density || 15000;
  const maxNodes = options.maxNodes || 75;
  const lineDistance = options.lineDistance || 150;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(maxNodes, Math.max(18, Math.floor((width * height) / density)));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - .5) * (options.speed || .18),
      vy: (Math.random() - .5) * (options.speed || .18),
      r: Math.random() * 1.4 + .55
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (!reducedMotion) {
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > width) a.vx *= -1;
        if (a.y < 0 || a.y > height) a.vy *= -1;
      }
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fillStyle = options.nodeColor || 'rgba(52,240,139,.72)';
      ctx.fill();
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance < lineDistance) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(42,220,120,${(1 - distance / lineDistance) * (options.lineAlpha || .16)})`;
          ctx.lineWidth = .7;
          ctx.stroke();
        }
      }
    }
    if (!reducedMotion) frame = requestAnimationFrame(draw);
  }

  const resizeObserver = new ResizeObserver(() => { cancelAnimationFrame(frame); resize(); draw(); });
  resizeObserver.observe(canvas);
  resize(); draw();
}

makeNetwork(document.querySelector('.hero-network'), { density: 22000, maxNodes: 42, lineDistance: 135, lineAlpha: .12, speed: .11 });
makeNetwork(document.querySelector('.community-network'), { density: 13000, maxNodes: 88, lineDistance: 165, lineAlpha: .22, speed: .16 });
