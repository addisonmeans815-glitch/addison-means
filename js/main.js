// Addison Means — site behavior.
// Pages are sections tagged data-page="…"; the URL hash (#/work, #/about…) picks which ones show.
(() => {
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Router ----------
  const PAGES = ['home', 'work', 'experience', 'about'];
  const ALIAS = { faq: 'about' };   // #/faq is the About page, scrolled to the questions
  const sections = [...document.querySelectorAll('section[data-page]')];
  const navLinks = [...document.querySelectorAll('nav a')];
  let current = null;

  const show = page => {
    current = page;
    sections.forEach(s => s.classList.toggle('off', s.dataset.page !== page));
  };
  const route = () => {
    const h = location.hash.replace(/^#\/?/, '');
    const page = ALIAS[h] || (PAGES.includes(h) ? h : (h && document.getElementById(h) ? null : 'home'));
    if (page === null) { if (!current) show('home'); return; }  // plain anchor like #contact: let the browser scroll
    show(page);
    navLinks.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#/' + (h || 'home')));
    const jump = ALIAS[h] && document.getElementById(h);
    const top = jump ? jump.getBoundingClientRect().top + scrollY - 80 : 0;
    requestAnimationFrame(() => window.scrollTo({ top, behavior: 'instant' }));
  };
  addEventListener('hashchange', route);
  route();

  // ---------- Mobile menu ----------
  const navBtn = document.querySelector('.navtoggle');
  const siteNav = document.getElementById('sitenav');
  const setOpen = open => { siteNav.classList.toggle('open', open); navBtn.setAttribute('aria-expanded', String(open)); };
  navBtn.addEventListener('click', () => setOpen(!siteNav.classList.contains('open')));
  siteNav.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  addEventListener('resize', () => { if (innerWidth > 820) setOpen(false); });
  document.addEventListener('click', e => { if (!e.target.closest('header')) setOpen(false); });

  // ---------- Mirrors ----------
  // Home shows the same experience cards as the Experience page, so they're only written once.
  document.querySelectorAll('[data-mirror]').forEach(m => {
    const src = document.querySelector(m.dataset.mirror);
    if (src) m.innerHTML = src.innerHTML;
  });

  // ---------- Drag-to-scroll card strips (mouse; touch scrolls natively) ----------
  document.querySelectorAll('.strip').forEach(st => {
    let down = null;
    st.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse') down = { x: e.clientX, sl: st.scrollLeft, moved: false };
    });
    st.addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - down.x;
      if (Math.abs(dx) > 4) { down.moved = true; st.classList.add('dragging'); }
      st.scrollLeft = down.sl - dx;
    });
    const up = () => {
      if (!down) return;
      const moved = down.moved; down = null;
      setTimeout(() => st.classList.remove('dragging'), moved ? 50 : 0);
    };
    st.addEventListener('pointerup', up);
    st.addEventListener('pointerleave', up);
  });

  // ---------- "What I bring" marquee ----------
  // Tiles drift left forever; clones fill the gap so the loop is seamless. Hover pauses, drag scrubs.
  const tiles = document.querySelector('.tiles');
  if (tiles) {
    const track = document.createElement('div');
    track.className = 'tiles-track';
    const originals = [...tiles.children];
    originals.forEach(t => track.appendChild(t));
    tiles.appendChild(track);

    let setW = 0, offset = 0, hover = false, last = 0, drag = null;
    const sizeMarquee = () => {
      track.querySelectorAll('.clone').forEach(c => c.remove());
      setW = originals.reduce((w, t) => w + t.getBoundingClientRect().width + 16, 0);
      const copies = Math.ceil((tiles.clientWidth + setW) / setW);
      for (let i = 0; i < copies; i++) originals.forEach(t => {
        const c = t.cloneNode(true);
        c.classList.add('clone');
        c.setAttribute('aria-hidden', 'true');
        track.appendChild(c);
      });
    };
    const render = () => {
      if (!setW) return;
      offset = ((offset % setW) + setW) % setW;
      track.style.transform = `translateX(${(-offset).toFixed(2)}px)`;
    };
    const tick = t => {
      const dt = Math.min(64, t - (last || t)); last = t;
      if (!hover && !drag && !reduceMotion) { offset += 28 * dt / 1000; render(); }
      requestAnimationFrame(tick);
    };
    const endDrag = () => { drag = null; setTimeout(() => tiles.classList.remove('dragging'), 30); };

    tiles.addEventListener('pointerenter', () => hover = true);
    tiles.addEventListener('pointerleave', () => hover = false);
    tiles.addEventListener('wheel', e => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;  // vertical wheel scrolls the page
      e.preventDefault(); offset += e.deltaX; render();
    }, { passive: false });
    tiles.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse') return;
      drag = { x: e.clientX, o: offset };
      tiles.setPointerCapture(e.pointerId);
    });
    tiles.addEventListener('pointermove', e => {
      if (!drag) return;
      if (Math.abs(e.clientX - drag.x) > 3) tiles.classList.add('dragging');
      offset = drag.o - (e.clientX - drag.x); render();
    });
    tiles.addEventListener('pointerup', endDrag);
    tiles.addEventListener('pointercancel', endDrag);
    tiles.addEventListener('touchstart', e => { if (e.touches.length === 1) drag = { x: e.touches[0].clientX, o: offset }; }, { passive: true });
    tiles.addEventListener('touchmove', e => { if (drag) { offset = drag.o - (e.touches[0].clientX - drag.x); render(); } }, { passive: true });
    tiles.addEventListener('touchend', endDrag);
    tiles.addEventListener('transitionend', e => { if (e.propertyName === 'translate') sizeMarquee(); });
    addEventListener('resize', sizeMarquee);
    sizeMarquee();
    requestAnimationFrame(tick);
  }

  // ---------- Reveal on scroll ----------
  // Elements rise into place as they enter, staggered within their group.
  const REVEAL = '.offer, .tile, .titem, .facts-inline > div, .row, .together, .card, .sheet > div, details, .work a, .kickrow, .h-lg, .lede, .cgrid > *, .intro > *, .tl li, .aphoto';
  const HERO = '.hero h1, .hero .h-xl, .hero .lede, .hero .note, .portrait, .offer';
  const io = reduceMotion ? null : new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target;
    const pending = [...el.parentElement.children].filter(c => c.classList.contains('rv') && !c.classList.contains('in'));
    el.style.transitionDelay = Math.min(pending.indexOf(el), 10) * 110 + 'ms';
    el.classList.add('in');
    io.unobserve(el);
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  let heroDone = false;
  const initReveal = () => {
    if (!io) return;
    if (!heroDone) {
      heroDone = true;
      document.querySelectorAll(HERO).forEach((el, i) => {
        el.classList.add('rv');
        el.style.transitionDelay = (80 + i * 110) + 'ms';
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
      });
    }
    document.querySelectorAll(REVEAL).forEach(el => {
      if (el.closest('section.off') || el.classList.contains('in') || el.matches(HERO)) return;
      el.classList.add('rv');
      if (el.getBoundingClientRect().top < innerHeight * 0.92) {
        // Already on screen: show immediately without animating.
        el.style.transition = 'none';
        el.classList.add('in');
        requestAnimationFrame(() => requestAnimationFrame(() => el.style.transition = ''));
      } else io.observe(el);
    });
  };

  // ---------- Parallax ----------
  const PARALLAX = '.portrait, .offers, .tgrid, .sheet, .faq, .work, .strip';
  const rateFor = el => el.classList.contains('portrait') ? -0.12 : el.classList.contains('tgrid') ? -0.06 : -0.04;
  // Off on narrow screens: in a single column, drifting blocks overlap the text above them.
  const wide = matchMedia('(min-width: 900px)');
  let ticking = false;
  const parallax = () => {
    ticking = false;
    if (reduceMotion) return;
    if (!wide.matches) {
      document.querySelectorAll('.px').forEach(el => { el.classList.remove('px'); el.style.transform = ''; });
      return;
    }
    const vh = innerHeight;
    document.querySelectorAll(PARALLAX).forEach(el => {
      if (el.closest('section.off')) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      el.classList.add('px');
      el.style.transform = `translateY(${((r.top + r.height / 2 - vh / 2) * rateFor(el)).toFixed(1)}px)`;
    });
  };
  const onScrollPx = () => { if (!ticking) { ticking = true; requestAnimationFrame(parallax); } };
  addEventListener('scroll', onScrollPx, { passive: true });
  addEventListener('resize', onScrollPx);
  addEventListener('hashchange', () => setTimeout(() => { initReveal(); parallax(); }, 0));
  initReveal(); parallax();

  // ---------- What I do: dash-dot line through the row markers ----------
  // Desktop only. It steps down through each .cut node and draws in as you scroll.
  const work = document.getElementById('work');
  const svg = work.querySelector('.cutsvg');
  const maskPath = svg.querySelector('.cutmaskpath');
  let cutLen = 0, cutTop = 0, cutBottom = 0;

  const drawCut = () => {
    if (!cutLen) return;
    const p = Math.max(0, Math.min(1, (scrollY + innerHeight * 0.72 - cutTop) / (cutBottom - cutTop + 120)));
    maskPath.style.strokeDashoffset = cutLen * (1 - p);
  };
  const layoutCut = () => {
    if (work.classList.contains('off') || innerWidth < 1024) return;
    const nodes = [...work.querySelectorAll('.cut')].filter(n => n.offsetParent);
    if (nodes.length < 2) return;
    const sr = work.getBoundingClientRect();
    const pts = nodes.map(n => { const r = n.getBoundingClientRect(); return [r.left + r.width / 2 - sr.left, r.top + r.height / 2 - sr.top]; });

    let d = `M${pts[0][0]} ${pts[0][1] - 36}`;
    pts.forEach(([x, y], i) => {
      d += ` L${x} ${y}`;
      const next = pts[i + 1];
      if (next && next[0] !== x) d += ` L${x} ${next[1] - 30} L${next[0]} ${next[1] - 30}`;
    });
    const [fx, fy] = pts[0], [lx, ly] = pts[pts.length - 1];
    d += ` L${lx} ${ly + 44}`;

    svg.setAttribute('width', sr.width);
    svg.setAttribute('height', sr.height);
    svg.setAttribute('viewBox', `0 0 ${sr.width} ${sr.height}`);
    svg.querySelector('.cutpath').setAttribute('d', d);
    maskPath.setAttribute('d', d);
    cutLen = maskPath.getTotalLength();
    maskPath.style.strokeDasharray = cutLen;
    maskPath.style.strokeDashoffset = cutLen;
    svg.querySelector('.cuta').setAttribute('points', `${fx - 6},${fy - 46} ${fx + 6},${fy - 46} ${fx},${fy - 36}`);
    svg.querySelector('.cutb').setAttribute('points', `${lx - 6},${ly + 44} ${lx + 6},${ly + 44} ${lx},${ly + 54}`);
    cutTop = fy + sr.top + scrollY;
    cutBottom = ly + sr.top + scrollY;
    drawCut();
  };
  addEventListener('scroll', drawCut, { passive: true });
  addEventListener('resize', layoutCut);
  addEventListener('load', layoutCut);
  addEventListener('hashchange', () => setTimeout(layoutCut, 50));
  work.addEventListener('transitionend', e => { if (e.propertyName === 'translate') layoutCut(); });
  if (document.fonts) document.fonts.ready.then(layoutCut);
  layoutCut();

  // ---------- Header dot turns into the headshot after scrolling ----------
  const onScrollBrand = () => root.classList.toggle('scrolled', scrollY > 240);
  addEventListener('scroll', onScrollBrand, { passive: true });
  onScrollBrand();
})();
