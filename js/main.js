
/* ═══════════════════════════════════════════════════════════
   CHERRY BLOSSOM PETAL ENGINE
═══════════════════════════════════════════════════════════ */
class Petal {
  constructor(W, H, spawnAtTop) {
    this.W = W; this.H = H;
    this.init(spawnAtTop);
  }

  init(atTop) {
    // Position
    this.x = Math.random() * this.W * 1.3 - this.W * 0.15;
    this.y = atTop
      ? -Math.random() * this.H * 0.5
      : Math.random() * this.H;

    // Size: subtle — 7 to 16px half-height
    this.sz = Math.random() * 9 + 7;

    // Fall speed (vary for depth)
    const depth = 0.4 + Math.random() * 0.6; // 0.4 (far) – 1.0 (close)
    this.vy     = (0.35 + Math.random() * 0.45) * depth;
    this.vx     = (Math.random() - 0.5) * 0.18;

    // Rotation
    this.rot      = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.012;

    // Horizontal sway (wind)
    this.swingPhase = Math.random() * Math.PI * 2;
    this.swingSpeed = 0.012 + Math.random() * 0.01;
    this.swingAmp   = 0.55 + Math.random() * 1.1;

    // Opacity: far petals are lighter
    this.opacity = (0.22 + Math.random() * 0.42) * depth;

    // Slight tilt angle that changes slowly (tumble)
    this.tilt      = Math.random() * 0.3 - 0.15;
    this.tiltSpeed = (Math.random() - 0.5) * 0.004;

    // Color palette — delicate pinks
    const palette = [
      { t: '#FDF4F2', m: '#F6D9D4', b: '#EDB8B0' },
      { t: '#FEF0EE', m: '#F8DDD9', b: '#EFBFBA' },
      { t: '#FCE9E6', m: '#F2CCC7', b: '#E4A9A3' },
      { t: '#FDECEA', m: '#F5D0CB', b: '#E8B2AC' },
    ];
    const c = palette[Math.floor(Math.random() * palette.length)];
    this.cTop = c.t; this.cMid = c.m; this.cBot = c.b;
  }

  update() {
    this.swingPhase += this.swingSpeed;
    this.x   += this.vx + Math.sin(this.swingPhase) * this.swingAmp;
    this.y   += this.vy;
    this.rot += this.rotSpeed;
    this.tilt += this.tiltSpeed;

    if (this.y > this.H + 40 || this.x < -80 || this.x > this.W + 80) {
      this.x = Math.random() * this.W * 1.2 - this.W * 0.1;
      this.y = -20 - Math.random() * 60;
      this.vy = 0.35 + Math.random() * 0.45;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot + this.tilt);
    ctx.globalAlpha = this.opacity;

    const h = this.sz;
    const w = this.sz * 0.56;

    // Petal silhouette — elongated oval, natural curve
    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.bezierCurveTo( w * 1.1, -h * 0.35,  w * 1.05,  h * 0.52,  0,  h);
    ctx.bezierCurveTo(-w * 1.05,  h * 0.52, -w * 1.1,  -h * 0.35,  0, -h);

    const grd = ctx.createLinearGradient(0, -h, 0, h);
    grd.addColorStop(0,    this.cTop);
    grd.addColorStop(0.45, this.cMid);
    grd.addColorStop(1,    this.cBot);
    ctx.fillStyle = grd;
    ctx.fill();

    // Delicate centre vein
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.85);
    ctx.quadraticCurveTo(w * 0.12, 0, 0, h * 0.85);
    ctx.strokeStyle = `rgba(180,120,115,${this.opacity * 0.35})`;
    ctx.lineWidth = 0.55;
    ctx.stroke();

    ctx.restore();
  }
}

function createPetalSystem(canvasEl, count, opacity, burstCount, burstDuration) {
  if (!canvasEl) return;
  const ctx = canvasEl.getContext('2d');
  let W, H, petals = [];
  const startTime = performance.now();
  const _burst = burstCount ?? count;

  function resize() {
    W = canvasEl.offsetWidth;
    H = canvasEl.offsetHeight;
    canvasEl.width  = W;
    canvasEl.height = H;
    // Seed ~70% of petals already within the viewport so they're visible immediately,
    // the rest start above (atTop=true) and drift in naturally.
    const inView = Math.round(_burst * 0.7);
    petals = [
      ...Array.from({ length: inView },          () => new Petal(W, H, false)),
      ...Array.from({ length: _burst - inView }, () => new Petal(W, H, true)),
    ];
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });

  function tick() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = opacity ?? 1;

    // After the burst window, quietly trim excess petals as they recycle
    if (burstDuration && performance.now() - startTime > burstDuration) {
      if (petals.length > count) petals.splice(count);
    }

    petals.forEach(p => { p.W = W; p.H = H; p.update(); p.draw(ctx); });
    ctx.restore();
    requestAnimationFrame(tick);
  }
  tick();
}

// Hero: burst of 65 petals for first 3 s, then settle to 38
createPetalSystem(document.getElementById('petal-canvas'), 38, 1, 65, 3000);
// Booking: 22 petals, no burst needed
createPetalSystem(document.getElementById('booking-canvas'), 22, 1);


/* ═══════════════════════════════════════════════════════════
   BLOOM ENGINE — flowers behind booking section
═══════════════════════════════════════════════════════════ */
(function () {
  const section = document.getElementById('booking');
  const canvas  = document.getElementById('flower-canvas');
  if (!section || !canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H;
  const MAX_FLOWERS = 20;
  const flowers = [];
  let rafId = null;
  const hint = document.getElementById('bloom-hint');
  let hintGone = false;

  /* ── Resize ── */
  function resize() {
    W = section.offsetWidth;
    H = section.offsetHeight;
    canvas.width  = W;
    canvas.height = H;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  /* ── Palette library ── */
  const PALETTES = [
    { tips: ['#E8D5C4', '#D4B8A4', '#C4A090'], center: '#F4E8DC' },
    { tips: ['#DCC8B8', '#C8A898', '#B89080'], center: '#EDD8C8' },
    { tips: ['#E2CABC', '#D4A98A', '#C49878'], center: '#F2DFD0' },
    { tips: ['#D8C4B8', '#C8AFA4', '#B8A094'], center: '#EAD8CC' },
    { tips: ['#EAD8CA', '#D8C0B0', '#C8A898'], center: '#F6EAE0' },
    { tips: ['#DBBDB0', '#C8A898', '#B89480'], center: '#EDD4C4' },
  ];

  /* ── Easing ── */
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
  const easeInCubic  = t => t * t * t;

  /* ══════════════════════════════════════════════════════════
     Flower class
  ══════════════════════════════════════════════════════════ */
  class Flower {
    constructor(x, y) {
      this.x = x; this.y = y;
      this.born = performance.now();

      this.n    = 5 + Math.floor(Math.random() * 4);
      this.size = 26 + Math.random() * 30;
      this.rot  = Math.random() * Math.PI * 2;
      this.rotV = (Math.random() - 0.5) * 0.0025;
      this.pal  = PALETTES[Math.floor(Math.random() * PALETTES.length)];

      this.tBloom = 750 + Math.random() * 450;
      this.tHold  = 4200 + Math.random() * 1800;
      this.tFade  = 900  + Math.random() * 300;
      this.tTotal = this.tBloom + this.tHold + this.tFade;

      const pc = 6 + Math.floor(Math.random() * 6);
      this.pollen = Array.from({ length: pc }, () => ({
        a:    Math.random() * Math.PI * 2,
        maxD: this.size * (1.2 + Math.random() * 0.9),
        r:    0.9 + Math.random() * 2,
        op:   0.35 + Math.random() * 0.45,
      }));

      this.dead = false;
    }

    _alpha(age) {
      if (age < this.tBloom * 0.35)
        return easeOutCubic(age / (this.tBloom * 0.35));
      if (age < this.tBloom + this.tHold) return 1;
      const t = (age - this.tBloom - this.tHold) / this.tFade;
      return Math.max(0, 1 - easeInCubic(t));
    }

    update(now) {
      const age = now - this.born;
      if (age >= this.tTotal) { this.dead = true; return; }
      this.rot += this.rotV;
    }

    draw(ctx, now) {
      const age   = now - this.born;
      if (age >= this.tTotal) return;
      const alpha = this._alpha(age);
      if (alpha <= 0) return;

      const bloomP = easeOutQuart(Math.min(age / this.tBloom, 1));

      /* ── PETALS ───────────────────────────────────────── */
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.globalAlpha = alpha;

      for (let i = 0; i < this.n; i++) {
        const start = (i / this.n) * 0.55;
        const raw   = (bloomP - start) / (1 - start);
        const ep    = raw <= 0 ? 0 : easeOutQuart(Math.min(raw, 1));
        if (ep <= 0) continue;

        const pLen = this.size * ep;
        const pW   = this.size * 0.42 * ep;

        ctx.save();
        ctx.rotate((i / this.n) * Math.PI * 2);

        const grd = ctx.createLinearGradient(0, 0, 0, -pLen);
        const col = this.pal.tips[i % this.pal.tips.length];
        grd.addColorStop(0,    this.pal.center);
        grd.addColorStop(0.35, col);
        grd.addColorStop(1,    col + '60');

        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo( pW,       -pLen * 0.22,  pW * 1.08, -pLen * 0.72,  pW * 0.28, -pLen);
        ctx.bezierCurveTo( pW * 0.1, -pLen * 1.06, -pW * 0.1,  -pLen * 1.06, -pW * 0.28, -pLen);
        ctx.bezierCurveTo(-pW * 1.08, -pLen * 0.72, -pW, -pLen * 0.22, 0, 0);
        ctx.fill();
        ctx.restore();
      }

      /* centre disc */
      const cR = this.size * 0.14 * easeOutQuart(Math.min(bloomP * 2.5, 1));
      if (cR > 0.5) {
        const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, cR);
        cg.addColorStop(0, '#FFFAF5');
        cg.addColorStop(1, this.pal.center);
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(0, 0, cR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      /* ── POLLEN ───────────────────────────────────────── */
      const pollenAlpha = bloomP < 0.8
        ? easeOutCubic(bloomP / 0.8)
        : 1 - easeInCubic((bloomP - 0.8) / 0.2);

      if (pollenAlpha > 0) {
        ctx.save();
        ctx.translate(this.x, this.y);
        this.pollen.forEach(p => {
          const d  = p.maxD * easeOutCubic(Math.min(bloomP * 1.6, 1));
          const px = Math.cos(p.a) * d;
          const py = Math.sin(p.a) * d;
          ctx.globalAlpha = alpha * p.op * pollenAlpha * (1 - d / p.maxD * 0.45);
          ctx.fillStyle = this.pal.tips[0];
          ctx.beginPath();
          ctx.arc(px, py, p.r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }
    }
  }

  /* ── spawn flower ── */
  function bloom(x, y) {
    while (flowers.length >= MAX_FLOWERS) {
      const deadIdx = flowers.findIndex(f => f.dead);
      flowers.splice(deadIdx !== -1 ? deadIdx : 0, 1);
    }
    flowers.push(new Flower(x, y));
  }

  /* ── render loop ── */
  function tick(now) {
    ctx.clearRect(0, 0, W, H);
    for (let i = flowers.length - 1; i >= 0; i--) {
      flowers[i].update(now);
      flowers[i].draw(ctx, now);
      if (flowers[i].dead) flowers.splice(i, 1);
    }
    rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);

  /* ── input handling ── */
  const SKIP_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A', 'LABEL']);

  function getPos(e) {
    const rect = section.getBoundingClientRect();
    if (e.touches) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onInteract(e) {
    if (SKIP_TAGS.has(e.target.tagName) || e.target.closest('button, a, input, select, textarea, label')) return;
    const { x, y } = getPos(e);
    bloom(x, y);
    if (!hintGone) { hintGone = true; hint.classList.add('gone'); }
  }

  section.addEventListener('click',     onInteract);
  section.addEventListener('touchstart', onInteract, { passive: true });
})();


/* ═══════════════════════════════════════════════════════════
   TIMELINE ANIMATION
═══════════════════════════════════════════════════════════ */
(function () {
  const wrap = document.getElementById('salon-timeline');
  if (!wrap) return;

  const axisLine = wrap.querySelector('.tl-axis-line');
  const dots     = wrap.querySelectorAll('.tl-dot');
  const cards    = wrap.querySelectorAll('.tl-card');

  const obs = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;

    // 1. Draw the horizontal line left → right
    axisLine.classList.add('tl-drawn');

    // 2. Dots and cards reveal themselves via their individual transition-delay values
    dots.forEach(d => d.classList.add('tl-visible'));
    cards.forEach(c => c.classList.add('tl-visible'));

    obs.unobserve(wrap);
  }, { threshold: 0.2 });

  obs.observe(wrap);
})();


/* ═══════════════════════════════════════════════════════════
   NAV SCROLL
═══════════════════════════════════════════════════════════ */
const navEl = document.getElementById('nav');
window.addEventListener('scroll', () => {
  navEl.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

/* Mobile burger (simple toggle — extend as needed) */
document.getElementById('burger').addEventListener('click', () => {
  const links = navEl.querySelector('.nav-links');
  if (!links) return;
  const open = links.style.display === 'flex';
  links.style.display = open ? '' : 'flex';
  if (!open) {
    links.style.cssText = `
      display: flex; flex-direction: column; gap: 1.4rem;
      position: fixed; inset: 0;
      background: rgba(250,247,245,.97);
      backdrop-filter: blur(18px);
      align-items: center; justify-content: center;
      z-index: 99;
    `;
    links.querySelectorAll('a').forEach(a => {
      a.style.cssText = 'font-size:1.4rem; letter-spacing:.1em; color:#1A1714;';
    });
    links.addEventListener('click', () => { links.style.display = ''; }, { once: true });
  }
});


/* ═══════════════════════════════════════════════════════════
   SCROLL REVEAL
═══════════════════════════════════════════════════════════ */
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('[data-reveal]').forEach(el => revealObs.observe(el));


/* ═══════════════════════════════════════════════════════════
   FAQ ACCORDION
═══════════════════════════════════════════════════════════ */
document.querySelectorAll('.faq-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const item = trigger.closest('.faq-item');
    const body = item.querySelector('.faq-body');
    const inner = item.querySelector('.faq-body-inner');
    const isOpen = item.classList.contains('open');

    // Close all
    document.querySelectorAll('.faq-item.open').forEach(openItem => {
      openItem.classList.remove('open');
      openItem.querySelector('.faq-body').style.maxHeight = '0';
      openItem.querySelector('.faq-trigger').setAttribute('aria-expanded', 'false');
    });

    // Open clicked (if it was closed)
    if (!isOpen) {
      item.classList.add('open');
      body.style.maxHeight = inner.offsetHeight + 'px';
      trigger.setAttribute('aria-expanded', 'true');
    }
  });
});



/* ═══════════════════════════════════════════════════════════
   PORTFOLIO LIGHTBOX
═══════════════════════════════════════════════════════════ */
(function () {
  const overlay = document.getElementById('lb-overlay');
  const lbImg   = document.getElementById('lb-img');
  const closeBtn = document.getElementById('lb-close');
  const prevBtn  = document.getElementById('lb-prev');
  const nextBtn  = document.getElementById('lb-next');
  if (!overlay) return;

  // Collect unique source images (first 15, skip duplicates)
  const allCards = Array.from(document.querySelectorAll('.mq-card'));
  const srcs = [];
  allCards.forEach(card => {
    const s = card.querySelector('img').src;
    if (!srcs.includes(s)) srcs.push(s);
  });

  let current = 0;

  function openAt(idx) {
    current = (idx + srcs.length) % srcs.length;
    lbImg.src = srcs[current];
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { lbImg.src = ''; }, 350);
  }

  // Open on card click — find which source index it is
  allCards.forEach(card => {
    card.addEventListener('click', () => {
      const s = card.querySelector('img').src;
      const idx = srcs.indexOf(s);
      openAt(idx !== -1 ? idx : 0);
    });
  });

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => openAt(current - 1));
  nextBtn.addEventListener('click', () => openAt(current + 1));

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  document.addEventListener('keydown', e => {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape')     close();
    if (e.key === 'ArrowLeft')  openAt(current - 1);
    if (e.key === 'ArrowRight') openAt(current + 1);
  });
})();


/* ═══════════════════════════════════════════════════════════
   BOOKING FORM
═══════════════════════════════════════════════════════════ */
function handleBooking(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.form-submit');
  btn.textContent = 'Request received ✓';
  btn.style.background = '#5C4E48';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = 'Send Request';
    btn.style.background = '';
    btn.disabled = false;
    e.target.reset();
  }, 4000);
}
