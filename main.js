(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* Smooth scroll */
  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const scrollToTarget = target => {
    if (lenis) lenis.scrollTo(target, { offset: -96, duration: 1.4 });
    else {
      const top = target === 0 ? 0 : target.getBoundingClientRect().top + scrollY - 96;
      scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
    }
  };
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id === '#main') return;
    const target = id === '#top' ? 0 : document.querySelector(id);
    if (target === null) return;
    e.preventDefault();
    scrollToTarget(target);
    history.replaceState(null, '', id);
  }));

  /* Theme */
  const metaTheme = $('meta[name="theme-color"]');
  const syncThemeUI = () => {
    const dark = root.getAttribute('data-theme') === 'dark';
    $$('.theme-btn').forEach(b => b.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme'));
    metaTheme.setAttribute('content', dark ? '#181818' : '#F5F4F0');
  };
  syncThemeUI();
  $$('[data-theme-toggle]').forEach(btn => btn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.classList.add('theme-anim');
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    syncThemeUI();
    setTimeout(() => root.classList.remove('theme-anim'), 600);
  }));

  /* Clock + year */
  const clockFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' });
  const tick = () => { const t = `PKT ${clockFmt.format(new Date())}`; $$('[data-clock]').forEach(el => { el.textContent = t; }); };
  tick();
  setInterval(tick, 15000);
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* Split headings into words for mask reveals */
  $$('[data-split]').forEach(el => {
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = text.split(/\s+/).map((w, i) => `<span class="split-word" aria-hidden="true"><span style="--w:${i}">${w}</span></span>`).join(' ');
  });

  /* Reveal once in view */
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      revealIO.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
  const startReveals = () => $$('.reveal, .stat, .job, [data-split]').forEach(el => revealIO.observe(el));

  /* Count up numbers */
  const countIO = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      countIO.unobserve(entry.target);
      const el = entry.target, to = Number(el.dataset.count);
      if (reduced) { el.textContent = to; return; }
      const start = performance.now(), dur = 1400;
      const step = now => {
        const t = clamp((now - start) / dur);
        el.textContent = Math.round(to * easeOut(t));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });

  /* Tool chips pop in per cluster */
  $$('.cluster').forEach(c => $$('.pop', c).forEach((li, i) => li.style.setProperty('--p', i)));
  const popIO = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-popped');
      popIO.unobserve(entry.target);
    });
  }, { threshold: 0.25 });

  /* Opening: greetings, then the curtain lifts with a curve that flattens */
  const loader = $('[data-loader]');
  let readyDone = false;
  const ready = () => {
    if (readyDone) return;
    readyDone = true;
    root.classList.add('is-ready');
    if (lenis) lenis.start();
    startReveals();
    $$('[data-count]').forEach(el => countIO.observe(el));
    $$('.cluster').forEach(el => popIO.observe(el));
    startRotator();
    startFlow();
  };
  if (root.classList.contains('skip-loader')) {
    loader.remove();
    requestAnimationFrame(ready);
  } else {
    if (lenis) lenis.stop();
    document.body.style.overflow = 'hidden';
    const wordEl = $('[data-loader-word]', loader);
    const path = $('[data-loader-path]', loader);
    const words = ['Hello', 'Assalam o Alaikum', 'Bonjour', 'Hola', 'Ciao', 'Hallo', 'Merhaba', 'مرحبا'];
    let i = 0;
    loader.classList.add('is-on');
    const lift = () => {
      loader.classList.add('is-leaving');
      const start = performance.now(), dur = 1000;
      const bend = now => {
        const t = clamp((now - start) / dur);
        path.setAttribute('d', `M0 0 L1000 0 Q500 ${100 * (1 - easeInOut(t))} 0 0 Z`);
        if (t < 1) requestAnimationFrame(bend);
      };
      requestAnimationFrame(bend);
      setTimeout(() => { document.body.style.overflow = ''; ready(); }, 350);
      setTimeout(() => loader.remove(), dur + 100);
    };
    const next = () => {
      i += 1;
      if (i >= words.length) { lift(); return; }
      wordEl.textContent = words[i];
      setTimeout(next, i === words.length - 1 ? 320 : 180);
    };
    setTimeout(next, 600);
  }

  /* Nav: active link */
  const nav = $('[data-nav]');
  const ring = $('[data-progress]');
  const links = $$('.nav__link');
  const navIO = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(l => {
        if (l.getAttribute('href') === `#${entry.target.id}`) l.setAttribute('aria-current', 'true');
        else l.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  ['work', 'tools', 'services', 'experience', 'faq'].forEach(id => { const s = document.getElementById(id); if (s) navIO.observe(s); });

  /* Mobile menu */
  const toggle = $('[data-menu-toggle]');
  const menu = $('[data-menu]');
  const setMenu = open => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) {
      menu.hidden = false;
      void menu.offsetHeight;
      menu.classList.add('is-open');
      if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden';
    } else {
      menu.classList.remove('is-open');
      if (lenis) lenis.start(); else document.body.style.overflow = '';
      setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 300);
    }
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); } });

  /* Fill buttons: fill rises from below on enter, exits upward on leave */
  $$('.fill').forEach(fill => {
    const el = fill.parentElement;
    el.classList.add('has-fill');
    let leaveTimer = 0;
    const reset = () => {
      el.classList.add('no-anim');
      el.classList.remove('is-leaving');
      void el.offsetWidth;
      el.classList.remove('no-anim');
    };
    const enter = () => {
      clearTimeout(leaveTimer);
      if (el.classList.contains('is-leaving')) reset();
      el.classList.add('is-filled');
    };
    const leave = () => {
      if (!el.classList.contains('is-filled')) return;
      el.classList.remove('is-filled');
      el.classList.add('is-leaving');
      leaveTimer = setTimeout(reset, 720);
    };
    if (finePointer) {
      el.addEventListener('pointerenter', enter);
      el.addEventListener('pointerleave', leave);
    }
    el.addEventListener('focus', enter);
    el.addEventListener('blur', leave);
  });

  /* Magnetic buttons */
  if (finePointer && !reduced) {
    $$('.magnetic').forEach(btn => {
      let raf = 0, tx = 0, ty = 0;
      const apply = () => { raf = 0; btn.style.transform = `translate3d(${tx}px, ${ty}px, 0)`; };
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        tx = (e.clientX - r.left - r.width / 2) * 0.3;
        ty = (e.clientY - r.top - r.height / 2) * 0.4;
        if (!raf) raf = requestAnimationFrame(apply);
      });
      btn.addEventListener('pointerleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(apply); });
    });
  }

  /* Work card mock tilt */
  if (finePointer && !reduced) {
    $$('.work__item').forEach(card => {
      const mock = $('[data-tilt]', card);
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        mock.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`);
        mock.style.setProperty('--rx', `${(y * -8).toFixed(2)}deg`);
      });
      card.addEventListener('pointerleave', () => { mock.style.setProperty('--ry', '0deg'); mock.style.setProperty('--rx', '0deg'); });
    });
  }

  /* Hero rotator */
  const rotator = $('[data-rotator]');
  const rotWords = $$('.rotator__word', rotator);
  const proof = $('[data-rotator-proof]');
  const proofs = [
    'Mikab Advertisers runs its bookings, invoices and payments on a Laravel 11 app I built.',
    "I'm rebuilding an old SuiteCRM in Laravel 11 so it can be sold to other firms as SaaS.",
    'My n8n workflows move leads from landing pages into the CRM and send the follow up messages.',
    'RealtyX adds a custom projects section to a WordPress real estate site, with admin approval on every listing.'
  ];
  let wordIndex = 0, heroVisible = true;
  const hero = $('.hero');
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe(hero);
  const ROTATE_MS = 3000;
  const rotate = () => {
    const current = rotWords[wordIndex];
    wordIndex = (wordIndex + 1) % rotWords.length;
    const nextWord = rotWords[wordIndex];
    nextWord.style.transition = 'none';
    nextWord.classList.remove('is-leaving', 'is-active');
    void nextWord.offsetWidth;
    nextWord.style.transition = '';
    current.classList.remove('is-active');
    current.classList.add('is-leaving');
    nextWord.classList.add('is-active');
    proof.classList.add('is-swapping');
    setTimeout(() => { proof.textContent = proofs[wordIndex]; proof.classList.remove('is-swapping'); }, 300);
  };
  function startRotator() {
    if (reduced) return;
    const loop = () => {
      if (heroVisible && !document.hidden) rotate();
      setTimeout(loop, ROTATE_MS);
    };
    setTimeout(loop, ROTATE_MS);
  }

  /* Tagline words light up as they pass a line */
  const tagline = $('[data-tagline]');
  const accentWords = new Set(['jobs', 'other', 'developers', 'avoid,']);
  tagline.innerHTML = tagline.textContent.trim().split(/\s+/)
    .map(w => `<span class="w${accentWords.has(w) ? ' accent' : ''}">${w}</span>`).join(' ');
  const taglineWords = $$('.w', tagline);
  if (reduced) taglineWords.forEach(w => w.classList.add('is-on'));

  /* Crossed tapes run only while on screen */
  const tapes = $('[data-tapes]');
  new IntersectionObserver(([e]) => tapes.classList.toggle('is-playing', e.isIntersecting)).observe(tapes);

  /* Process line fills with scroll */
  const steps = $('[data-steps]');
  const stepsLine = $('[data-steps-line]', steps).parentElement;
  const stepItems = $$('.step', steps);

  /* One scroll handler for everything scroll linked */
  let lastY = scrollY, navHidden = false;
  const onScroll = () => {
    const y = scrollY, delta = y - lastY;
    lastY = y;
    const max = root.scrollHeight - innerHeight;
    ring.style.strokeDashoffset = String(88 - 88 * (max > 0 ? y / max : 0));

    const hide = delta > 4 && y > 240 && menu.hidden;
    const show = delta < -4 || y < 240;
    if (hide && !navHidden) { nav.classList.add('is-hidden'); navHidden = true; }
    else if (show && navHidden) { nav.classList.remove('is-hidden'); navHidden = false; }

    if (!reduced) {
      const line = innerHeight * 0.72;
      taglineWords.forEach(w => { if (!w.classList.contains('is-on') && w.getBoundingClientRect().top < line) w.classList.add('is-on'); });
      const r = steps.getBoundingClientRect();
      const p = clamp((innerHeight * 0.75 - r.top) / (r.height * 0.6));
      stepsLine.style.setProperty('--p', p.toFixed(3));
      stepItems.forEach((s, i) => s.classList.toggle('is-lit', p >= i * 0.45));
    }
  };
  if (lenis) lenis.on('scroll', onScroll);
  else {
    let queued = false;
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; onScroll(); }); } }, { passive: true });
  }
  onScroll();
  if (reduced) stepItems.forEach(s => s.classList.add('is-lit'));

  /* Copy email */
  const copyBtn = $('[data-copy]');
  const copyLabel = $('[data-copy-label]');
  const copyStatus = $('[data-copy-status]');
  copyBtn.addEventListener('click', async () => {
    const email = copyBtn.dataset.copy;
    try {
      await navigator.clipboard.writeText(email);
      copyLabel.textContent = 'Email copied';
      copyStatus.textContent = 'Email address copied to clipboard';
    } catch {
      copyLabel.textContent = 'Copy failed, select it instead';
    }
    setTimeout(() => { copyLabel.textContent = email; copyStatus.textContent = ''; }, 2200);
  });

  /* Hero workflow: a lead travels through the stack */
  const flow = $('[data-flow]');
  const stage = $('[data-flow-stage]', flow);
  const svg = $('[data-flow-wires]', flow);
  const logEl = $('[data-flow-log]', flow);
  const flowToggle = $('[data-flow-toggle]', flow);
  const node = id => $(`[data-node="${id}"]`, stage);
  const wire = id => $(`[data-wire="${id}"]`, svg);
  const NODES = ['form', 'hook', 'n8n', 'crm', 'wa', 'pay'];
  const WIRES = ['form-hook', 'hook-n8n', 'n8n-crm', 'crm-wa', 'crm-pay'];
  const leads = [
    { name: 'Hamza R.', stream: 'Sales' },
    { name: 'Ayesha K.', stream: 'Onboarding' },
    { name: 'Daniel M.', stream: 'Support' },
    { name: 'Sana T.', stream: 'Partnerships' }
  ];

  const rel = el => {
    const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { l: r.left - s.left, r: r.right - s.left, t: r.top - s.top, b: r.bottom - s.top, cx: r.left - s.left + r.width / 2, cy: r.top - s.top + r.height / 2 };
  };
  const rounded = (pts, rad = 10) => {
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let k = 1; k < pts.length - 1; k++) {
      const [px, py] = pts[k - 1], [x, y] = pts[k], [nx, ny] = pts[k + 1];
      const r1 = Math.min(rad, Math.hypot(x - px, y - py) / 2), r2 = Math.min(rad, Math.hypot(nx - x, ny - y) / 2);
      const a = [x - Math.sign(x - px) * r1, y - Math.sign(y - py) * r1];
      const b = [x + Math.sign(nx - x) * r2, y + Math.sign(ny - y) * r2];
      d += ` L${a[0]},${a[1]} Q${x},${y} ${b[0]},${b[1]}`;
    }
    const last = pts[pts.length - 1];
    return `${d} L${last[0]},${last[1]}`;
  };
  const drawWires = () => {
    const s = stage.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${s.width} ${s.height}`);
    const f = rel(node('form')), h = rel(node('hook')), n = rel(node('n8n')), c = rel(node('crm')), w = rel(node('wa')), p = rel(node('pay'));
    const midA = (n.b + c.t) / 2, midB = (c.b + w.t) / 2;
    wire('form-hook').setAttribute('d', rounded([[f.r, f.cy], [h.l, h.cy]]));
    wire('hook-n8n').setAttribute('d', rounded([[h.r, h.cy], [n.l, n.cy]]));
    wire('n8n-crm').setAttribute('d', rounded([[n.cx, n.b], [n.cx, midA], [c.cx, midA], [c.cx, c.t]]));
    wire('crm-wa').setAttribute('d', rounded([[c.cx, c.b], [c.cx, midB], [w.cx, midB], [w.cx, w.t]]));
    wire('crm-pay').setAttribute('d', rounded([[c.cx, c.b], [c.cx, midB], [p.cx, midB], [p.cx, p.t]]));
  };

  let flowPaused = false, flowVisible = true, activeScene = 0;
  const waiters = [[], []];
  const running = (s = 0) => !flowPaused && flowVisible && !document.hidden && activeScene === s;
  const gate = (s = 0) => (running(s) ? Promise.resolve() : new Promise(r => waiters[s].push(r)));
  const release = () => [0, 1].forEach(s => {
    if (!running(s)) return;
    const w = waiters[s];
    waiters[s] = [];
    w.forEach(f => f());
  });
  const sleep = (ms, s = 0) => new Promise(r => setTimeout(r, ms)).then(() => gate(s));

  /* Scenes: workflow first, then the WhatsApp bot */
  const tabs = $$('[data-scene-tab]', flow);
  const scenes = $$('[data-scene]', flow);
  const sceneCaption = $('[data-scene-caption]', flow);
  const captions = ['The kind of flow I build. Demo data.', 'An AI campaign bot like the one I shipped. Demo data.'];
  const showScene = s => {
    activeScene = s;
    tabs.forEach((t, i) => { t.setAttribute('aria-selected', String(i === s)); t.tabIndex = i === s ? 0 : -1; });
    scenes.forEach((el, i) => { el.classList.toggle('is-active', i === s); el.inert = i !== s; });
    sceneCaption.textContent = captions[s];
    release();
  };
  /* Tab progress bars fill while each demo plays */
  const SCENE_MS = [8150, 11100];
  const elapsed = [0, 0];
  let progRaf = 0, progLast = 0;
  const progLoop = t => {
    const dt = progLast ? Math.min(100, t - progLast) : 0;
    progLast = t;
    if (running(activeScene)) elapsed[activeScene] += dt;
    tabs.forEach((tab, i) => tab.style.setProperty('--p', i === activeScene ? clamp(elapsed[i] / SCENE_MS[i]).toFixed(4) : '0'));
    progRaf = flowVisible ? requestAnimationFrame(progLoop) : 0;
  };
  const startProgress = () => { if (!progRaf) { progLast = 0; progRaf = requestAnimationFrame(progLoop); } };

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => showScene(i));
    t.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const n = (i + 1) % tabs.length;
      showScene(n);
      tabs[n].focus();
    });
  });

  const chatBody = $('[data-chat-body]', flow);
  const chatStatus = $('[data-chat-status]', flow);
  const hhmm = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' });
  const conversation = [
    { from: 'bot', text: 'Hi Sara, our spring offer is live: 20% off every plan until Friday.', label: 'Campaign' },
    { from: 'user', text: 'Does that include the yearly plan?' },
    { from: 'bot', text: 'Yes, the yearly plan is included. Should I send you the checkout link?', label: 'AI reply', ai: true },
    { from: 'user', text: 'Yes please' },
    { from: 'bot', text: 'Sent. I have also let the team know in case you need a hand.', label: 'AI reply', ai: true }
  ];
  const bubble = m => {
    const li = document.createElement('li');
    li.className = `msg msg--${m.from}`;
    const body = document.createElement('span');
    body.textContent = m.text;
    const meta = document.createElement('span');
    meta.className = 'msg__meta';
    if (m.label) {
      const tag = document.createElement('span');
      tag.className = m.ai ? 'msg__ai' : '';
      tag.textContent = m.label;
      meta.append(tag);
    }
    const time = document.createElement('span');
    time.textContent = hhmm.format(new Date());
    meta.append(time);
    li.append(body, meta);
    return li;
  };
  const addToChat = el => {
    chatBody.append(el);
    while (chatBody.children.length > 6) chatBody.firstElementChild.remove();
  };
  const runChat = async () => {
    for (;;) {
      await gate(1);
      elapsed[1] = 0;
      chatBody.replaceChildren();
      await sleep(500, 1);
      for (const m of conversation) {
        if (m.ai) {
          chatStatus.textContent = 'typing';
          const dots = document.createElement('li');
          dots.className = 'typing';
          dots.innerHTML = '<i></i><i></i><i></i>';
          addToChat(dots);
          await sleep(1100, 1);
          dots.remove();
          chatStatus.textContent = 'AI assistant, online';
        }
        addToChat(bubble(m));
        await sleep(m.from === 'user' ? 1000 : 1400, 1);
      }
      await sleep(2200, 1);
      showScene(0);
    }
  };

  const travel = (id, dur) => new Promise(resolve => {
    const path = wire(id);
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('r', '4');
    dot.setAttribute('class', 'flow__packet');
    svg.appendChild(dot);
    path.classList.add('is-live');
    let elapsed = 0, last = null;
    const step = ts => {
      if (!running()) { last = null; gate().then(() => requestAnimationFrame(step)); return; }
      if (last !== null) elapsed += ts - last;
      last = ts;
      const t = Math.min(1, elapsed / dur);
      const pt = path.getPointAtLength(path.getTotalLength() * easeInOut(t));
      dot.setAttribute('cx', pt.x);
      dot.setAttribute('cy', pt.y);
      if (t < 1) { requestAnimationFrame(step); return; }
      dot.remove();
      path.classList.remove('is-live');
      path.classList.add('is-done');
      resolve();
    };
    requestAnimationFrame(step);
  });

  const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const log = text => {
    const li = document.createElement('li');
    const time = document.createElement('span');
    const msg = document.createElement('span');
    time.className = 'flow__time';
    time.textContent = timeFmt.format(new Date());
    msg.textContent = text;
    li.append(time, msg);
    logEl.prepend(li);
    while (logEl.children.length > 3) logEl.lastElementChild.remove();
  };
  const activate = id => node(id).classList.add('is-active');
  const finish = id => { node(id).classList.remove('is-active'); node(id).classList.add('is-done'); };
  const resetFlow = () => {
    NODES.forEach(id => node(id).classList.remove('is-active', 'is-done'));
    WIRES.forEach(id => wire(id).classList.remove('is-live', 'is-done'));
  };

  const runFlow = async () => {
    for (let k = 0; ; k++) {
      const lead = leads[k % leads.length];
      resetFlow();
      elapsed[0] = 0;
      await sleep(500);
      activate('form'); log(`Form submitted by ${lead.name}`);
      await sleep(700);
      await travel('form-hook', 650); finish('form'); activate('hook'); log('POST /lead returned 200');
      await sleep(450);
      await travel('hook-n8n', 650); finish('hook'); activate('n8n'); log(`Routed to ${lead.stream}`);
      await sleep(600);
      await travel('n8n-crm', 900); finish('n8n'); activate('crm'); log('Lead created in the CRM');
      await sleep(600);
      await Promise.all([travel('crm-wa', 900), travel('crm-pay', 900)]);
      finish('crm'); activate('wa'); activate('pay'); log('WhatsApp reply and invoice sent');
      await sleep(900);
      finish('wa'); finish('pay');
      await sleep(1800);
      showScene(1);
    }
  };

  drawWires();
  new ResizeObserver(drawWires).observe(stage);
  function startFlow() {
    if (reduced) {
      NODES.forEach(finish);
      WIRES.forEach(id => wire(id).classList.add('is-done'));
      ['Lead created in the CRM', 'WhatsApp reply and invoice sent'].forEach(log);
      conversation.forEach(m => addToChat(bubble(m)));
      flowToggle.hidden = true;
      return;
    }
    new IntersectionObserver(([e]) => {
      flowVisible = e.isIntersecting;
      release();
      if (flowVisible) startProgress();
    }).observe(flow);
    document.addEventListener('visibilitychange', release);
    flowToggle.addEventListener('click', () => {
      flowPaused = !flowPaused;
      flowToggle.setAttribute('aria-pressed', String(flowPaused));
      flowToggle.textContent = flowPaused ? 'Play' : 'Pause';
      release();
    });
    setTimeout(() => { runFlow(); runChat(); }, 900);
  }
})();
