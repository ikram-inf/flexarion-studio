/* Flexarion — site : décor animé, apparitions, curseur, menu… (fonctionne sans le jeu) */
(() => {
const RM_SYS = matchMedia('(prefers-reduced-motion: reduce)').matches;
let RM_PREF = null; try { RM_PREF = localStorage.getItem('flx-motion'); } catch (e) {}
const RM = RM_PREF === 'off' ? true : RM_PREF === 'on' ? false : RM_SYS;
document.documentElement.classList.toggle('rm', RM);
const setMotion = v => { try { localStorage.setItem('flx-motion', v); } catch (e) {} location.reload(); };
const FINE = matchMedia('(pointer: fine)').matches;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const rand = (a, b) => a + Math.random() * (b - a);
let seed = 13;
const srand = (a, b) => { seed = (seed * 16807) % 2147483647; return a + (seed / 2147483647) * (b - a); };

/* ---------- 1. Écran de démarrage (une fois par session) ---------- */
const boot = $('.boot');
if (boot) {
  let seen = false;
  try { seen = sessionStorage.getItem('flx-boot') === '1'; sessionStorage.setItem('flx-boot', '1'); } catch (e) {}
  if (seen || RM) boot.remove();
  else {
    const bar = $('.boot-bar i', boot), pct = $('.boot-pct', boot), lines = $$('.boot-line', boot);
    let p = 0;
    const t = setInterval(() => {
      p = Math.min(100, p + rand(4, 11));
      bar.style.width = p + '%'; pct.textContent = String(Math.floor(p)).padStart(3, '0') + '%';
      lines.forEach((l, i) => { if (p > (i + 1) * 100 / (lines.length + 1)) l.classList.add('on'); });
      if (p >= 100) { clearInterval(t); setTimeout(() => { boot.classList.add('done'); setTimeout(() => boot.remove(), 700); }, 220); }
    }, 70);
  }
}


/* ---------- Sauvegarde de la progression ---------- */
const STORE = (() => {
  let d = {};
  try { d = JSON.parse(localStorage.getItem('flx-game') || '{}') || {}; } catch (e) {}
  const save = () => { try { localStorage.setItem('flx-game', JSON.stringify(d)); } catch (e) {} };
  return { get: (k, v) => (k in d ? d[k] : v), set: (k, v) => { d[k] = v; save(); }, reset: () => { d = {}; save(); } };
})();

/* ---------- Bandeau rebelle (après la chute de la Vigie, sur tout le site) ---------- */
const REBEL = ["L'espoir ne s'éteint pas", 'La Vigie est tombée', 'Ils ne peuvent pas tout voir', 'Secteur 13 libéré', 'Résistez', 'Deviation · un jeu Flexarion'];
function rebelTicker() {
  $$('.ticker').forEach(t => {
    t.classList.add('rebel');
    t.firstElementChild.innerHTML = [...REBEL, ...REBEL].map(w => `<span>${w}</span><span>✕</span>`).join('');
  });
}
if (STORE.get('boss')) rebelTicker();


/* ---------- Sprites pré-rendus (performances) ---------- */
const SPR = {};
function sprite(key, w, h, paint) {
  if (SPR[key]) return SPR[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); return (SPR[key] = c);
}
const glowSprite = rgb => sprite('glow' + rgb, 64, 64, (g, w) => {
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, `rgba(${rgb},1)`); r.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = r; g.fillRect(0, 0, w, w);
});
const smokeSprite = () => sprite('smoke', 64, 64, (g, w) => {
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(40,42,38,.55)'); r.addColorStop(1, 'rgba(40,42,38,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w);
});
const coneSprite = () => sprite('cone', 128, 256, (g, w, h) => {
  const r = g.createLinearGradient(0, 0, 0, h); r.addColorStop(0, 'rgba(213,206,155,.2)'); r.addColorStop(1, 'rgba(213,206,155,0)');
  g.fillStyle = r; g.beginPath(); g.moveTo(w / 2 - 3, 0); g.lineTo(0, h); g.lineTo(w, h); g.lineTo(w / 2 + 3, 0); g.fill();
});

/* ---------- Pont entre le site et le jeu (game.js) ---------- */
const SITE_BASE = (document.currentScript && document.currentScript.src) ? new URL('.', document.currentScript.src).href : 'assets/';
const setPlay = v => { try { localStorage.setItem('flx-play', v); } catch (e) {} location.reload(); };
window.FLX = { $, $$, rand, RM, FINE, STORE, rebelTicker, glowSprite: null, smokeSprite: null, coneSprite: null, cities: [] };
let gameRequested = false;
function loadGame(hero) {
  if (gameRequested) return; gameRequested = true;
  const sc = document.createElement('script'); sc.src = SITE_BASE + 'game.js'; sc.async = true;
  sc.onerror = () => { console.warn('[Flexarion] game.js introuvable : le site fonctionne sans le jeu.'); $$('.game-ui').forEach(e => e.remove()); };
  document.head.appendChild(sc);
}

/* ---------- 2. Ville procédurale (canvas, nette en 4K) ---------- */
function City(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1, layers = [], embers = [], lights = [], beams = [], clouds = [];
  let mx = 0, my = 0, tx = 0, ty = 0, visible = true, raf = 0, t0 = performance.now();
  let quality = 1, bgC = null, vigC = null, ema = 16, slow = 0;
  const view = { shake: 0, red: 0, white: 0, dark: false, lox: [], loy: [], deadBeams: new Set(), canvas, ctx };
  let game = null;
  const small = innerWidth < 700;

  const LAYERS = [
    { depth: .15, color: [66, 77, 73], alpha: .55, hMin: .22, hMax: .55, wMin: 40, wMax: 110, win: .0, ruin: .25 },
    { depth: .35, color: [39, 45, 39], alpha: .85, hMin: .25, hMax: .7, wMin: 50, wMax: 130, win: .035, ruin: .35 },
    { depth: .65, color: [24, 28, 24], alpha: 1, hMin: .18, hMax: .52, wMin: 60, wMax: 160, win: .06, ruin: .4 },
    { depth: 1, color: [12, 14, 12], alpha: 1, hMin: .08, hMax: .3, wMin: 90, wMax: 220, win: .05, ruin: .5 },
  ];

  function building(c, x, w, h, L, base, wins) {
    const top = base - h;
    c.beginPath();
    c.moveTo(x, base);
    c.lineTo(x, top + h * .06);
    // toit : plat, en gradins ou en ruine
    const kind = srand(0, 1);
    if (kind < L.ruin) {
      let px = x; const steps = 6 + Math.floor(srand(0, 6));
      for (let i = 1; i <= steps; i++) { px = x + w * i / steps; c.lineTo(px, top + srand(0, h * .18)); }
    } else if (kind < L.ruin + .25) {
      c.lineTo(x + w * .2, top + h * .06); c.lineTo(x + w * .2, top); c.lineTo(x + w * .8, top); c.lineTo(x + w * .8, top + h * .06); c.lineTo(x + w, top + h * .06);
    } else { c.lineTo(x, top); c.lineTo(x + w, top); }
    c.lineTo(x + w, base); c.closePath(); c.fill();
    // antenne + feu rouge
    if (srand(0, 1) < .35 && kind >= L.ruin) {
      const ax = x + w * srand(.3, .7), ah = srand(20, 70) * DPR;
      c.fillRect(ax - DPR, top - ah, 2 * DPR, ah);
      if (L.depth > .3) lights.push({ L, x: ax, y: top - ah, ph: srand(0, 6) });
      if (L.depth > .3 && L.depth < .9 && beams.length < 3 && srand(0, 1) < .45) beams.push({ L, x: ax, y: top - ah, a: srand(-1, 1), sp: srand(.15, .3) * (srand(0, 1) < .5 ? -1 : 1) });
    }
    // fenêtres
    if (L.win) {
      const cw = 6 * DPR, ch = 9 * DPR, gx = 7 * DPR, gy = 11 * DPR;
      for (let yy = top + h * .12; yy < base - ch; yy += ch + gy)
        for (let xx = x + 6 * DPR; xx < x + w - cw - 4 * DPR; xx += cw + gx)
          if (srand(0, 1) < L.win) {
            const warm = srand(0, 1) < .8;
            wins.push({ x: xx, y: yy, w: cw, h: ch, c: warm ? '213,206,155' : '184,116,54', a: srand(.35, .9), flick: srand(0, 1) < .12 });
          }
    }
  }

  function build() {
    seed = 13; lights = []; beams = []; layers = [];
    const ext = W * 1.25;
    LAYERS.forEach((L, i) => {
      const off = document.createElement('canvas');
      off.width = Math.ceil(ext); off.height = H;
      const c = off.getContext('2d');
      const base = H * (0.86 + i * .045);
      c.fillStyle = `rgb(${L.color})`;
      const wins = [];
      let x = -20;
      while (x < ext) {
        const w = srand(L.wMin, L.wMax) * DPR * (W / DPR > 1400 ? 1.2 : 1);
        const h = srand(L.hMin, L.hMax) * H;
        building(c, x, w, h, L, base, wins);
        x += w + srand(-8, 14) * DPR;
      }
      c.fillRect(0, base - 1, ext, H - base + 1);
      // brume au pied de la couche
      const g = c.createLinearGradient(0, base - H * .25, 0, base);
      g.addColorStop(0, 'rgba(122,130,121,0)'); g.addColorStop(1, `rgba(122,130,121,${.10 + .04 * (3 - i)})`);
      c.fillStyle = g; c.fillRect(0, base - H * .25, ext, H * .25);
      layers.push({ L, img: off, wins: wins.filter(w => w.flick), base });
      // fenêtres fixes cuites dans la couche
      if (!view.dark) wins.filter(w => !w.flick).forEach(w => { c.fillStyle = `rgba(${w.c},${w.a})`; c.fillRect(w.x, w.y, w.w, w.h); });
    });
    clouds = Array.from({ length: 7 }, () => ({ x: rand(0, W), y: rand(H * .05, H * .45), r: rand(W * .15, W * .35), sp: rand(4, 12) * DPR, a: rand(.05, .12) }));
    const n = RM ? 0 : Math.round((small ? 30 : 70) * quality);
    embers = Array.from({ length: n }, () => newEmber(true));
  }
  function newEmber(any) {
    return { x: rand(0, W), y: any ? rand(0, H) : H + 10, vy: rand(12, 45) * DPR, vx: rand(-8, 8) * DPR, s: rand(.6, 2.2) * DPR, ph: rand(0, 6), life: rand(.4, 1) };
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    DPR = Math.min(devicePixelRatio || 1, 1.5) * quality;
    const px = r.width * r.height * DPR * DPR, MAXPX = 1.6e6;
    if (px > MAXPX) DPR *= Math.sqrt(MAXPX / px);
    const oW = W, oH = H;
    W = Math.round(r.width * DPR); H = Math.round(r.height * DPR);
    if (!W || !H) return;
    if (game && oW && oH) game.rescale(W / oW, H / oH);
    canvas.width = W; canvas.height = H;
    build();
    beams = beams.filter(b => { const sx = b.x - W * .08; return sx > W * .06 && sx < W * .94; }).slice(0, 3);
    while (beams.length < 2) beams.push({ L: LAYERS[2], x: W * (.35 + .45 * beams.length), y: H * (.52 + .05 * beams.length), a: rand(-1, 1), sp: .22 });
    beams.forEach((b, i) => { b.dead = view.deadBeams.has(i); });
    Object.assign(view, { W, H, DPR, beams });
    // fond (ciel + soleil) et vignette pré-rendus
    bgC = document.createElement('canvas'); bgC.width = W; bgC.height = H;
    const b = bgC.getContext('2d'), sky = b.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0b0d0b'); sky.addColorStop(.55, '#1d231e'); sky.addColorStop(.85, '#3a3424'); sky.addColorStop(1, '#121512');
    b.fillStyle = sky; b.fillRect(0, 0, W, H);
    const sx = W * .22, sy = H * .62, sun = b.createRadialGradient(sx, sy, 0, sx, sy, W * .45);
    sun.addColorStop(0, 'rgba(255,196,120,.85)'); sun.addColorStop(.06, 'rgba(214,132,60,.5)'); sun.addColorStop(.35, 'rgba(140,88,40,.18)'); sun.addColorStop(1, 'rgba(140,88,40,0)');
    b.globalAlpha = view.dark ? .22 : 1; b.fillStyle = sun; b.fillRect(0, 0, W, H);
    vigC = document.createElement('canvas'); vigC.width = W; vigC.height = H;
    const vg = vigC.getContext('2d'), v = vg.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, W * .75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.6)'); vg.fillStyle = v; vg.fillRect(0, 0, W, H);
    if (RM) draw(0, 0);
  }

  function draw(time, dt) {
    const t = time / 1000;
    tx += (mx - tx) * .05; ty += (my - ty) * .05;
    // ciel
    view.shake = Math.max(0, view.shake - dt * 2.2);
    const sk = view.shake * view.shake * 14 * DPR;
    ctx.setTransform(1, 0, 0, 1, rand(-sk, sk), rand(-sk, sk));
    ctx.drawImage(bgC, -30, -30, W + 60, H + 60);
    // nuages
    clouds.forEach(c => {
      c.x += c.sp * dt; if (c.x - c.r > W) c.x = -c.r;
      ctx.globalAlpha = c.a; ctx.drawImage(glowSprite('169,176,166'), c.x - c.r, c.y - c.r * .32, c.r * 2, c.r * .64); ctx.globalAlpha = 1;
    });
    // couches de la ville + projecteurs entre les couches
    layers.forEach((ly, i) => {
      const ox = -W * .1 - tx * W * .05 * ly.L.depth, oy = -ty * H * .02 * ly.L.depth;
      view.lox[i] = ox; view.loy[i] = oy;
      if (i === 2 && !view.dark) drawBeams(t, ox);
      ctx.globalAlpha = ly.L.alpha; ctx.drawImage(ly.img, ox, oy); ctx.globalAlpha = 1;
      if (!view.dark) ly.wins.forEach(w => {
        const on = Math.sin(t * 3 + w.x) > -.2 && Math.random() > .02;
        if (on) { ctx.fillStyle = `rgba(${w.c},${w.a})`; ctx.fillRect(w.x + ox, w.y + oy, w.w, w.h); }
      });
      if (!view.dark) lights.filter(l => l.L === ly.L).forEach(l => {
        const a = (Math.sin(t * 2.2 + l.ph) + 1) / 2;
        const lx = l.x + ox, lyy = l.y + oy;
        ctx.globalAlpha = .9 * a; ctx.drawImage(glowSprite('255,70,50'), lx - 9 * DPR, lyy - 9 * DPR, 18 * DPR, 18 * DPR); ctx.globalAlpha = 1;
      });
    });
    if (game) game.update(dt, t);
    // braises
    ctx.globalCompositeOperation = 'lighter';
    embers.forEach((e, i) => {
      e.y -= e.vy * dt; e.x += (e.vx + Math.sin(t * 1.5 + e.ph) * 14 * DPR) * dt;
      if (e.y < -10) embers[i] = newEmber(false);
      const a = e.life * (.5 + .5 * Math.sin(t * 4 + e.ph)) * Math.min(1, e.y / (H * .5));
      ctx.fillStyle = `rgba(255,${150 + 50 * e.life | 0},80,${a})`;
      ctx.fillRect(e.x, e.y, e.s * 1.6, e.s * 1.6);
    });
    ctx.globalCompositeOperation = 'source-over';
    // vignette
    ctx.drawImage(vigC, -30, -30, W + 60, H + 60);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (game) game.overlay(dt, t);
  }

  function drawBeams(t, ox) {
    ctx.globalCompositeOperation = 'lighter';
    beams.forEach(b => {
      const x = b.x + ox * .8, y = b.y;
      b.sx = x; b.sy = y;
      if (b.dead) return;
      const ang = -Math.PI / 2 + Math.sin(t * b.sp + b.a) * .65, len = H * 1.2, spread = .06;
      const lamp = ctx.createRadialGradient(x, y, 0, x, y, 14 * DPR);
      lamp.addColorStop(0, 'rgba(255,250,220,.95)'); lamp.addColorStop(1, 'rgba(255,250,220,0)');
      ctx.fillStyle = lamp; ctx.fillRect(x - 14 * DPR, y - 14 * DPR, 28 * DPR, 28 * DPR);
      const g = ctx.createLinearGradient(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      g.addColorStop(0, 'rgba(213,206,155,.22)'); g.addColorStop(1, 'rgba(213,206,155,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang - spread) * len, y + Math.sin(ang - spread) * len);
      ctx.lineTo(x + Math.cos(ang + spread) * len, y + Math.sin(ang + spread) * len); ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
  }
  let last = performance.now(), last0 = performance.now();
  function loop(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (visible) {
      draw(now - t0, dt);
      ema += ((now - last0) - ema) * .05; last0 = now;
      if (ema > 24 && quality > .5) { if (++slow > 60) { slow = 0; ema = 16; quality = Math.max(.5, quality * .8); resize(); } }
      else slow = Math.max(0, slow - 1);
    } else last0 = now;
    raf = requestAnimationFrame(loop);
  }
  view.rebuild = resize;
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); io.observe(canvas);
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
  resize();
  if (!RM) raf = requestAnimationFrame(loop);
  const hero = canvas.closest('.hero');
  if (!hero) return;
  let play = 'on'; try { play = localStorage.getItem('flx-play') || 'on'; } catch (e) {}
  const panel = (label, btn, action) => {
    $$('.game-ui', hero).forEach(e => e.remove());
    const box = document.createElement('div'); box.className = 'motion-on';
    box.innerHTML = `<span>${label}</span><button type="button">${btn}</button>`;
    $('button', box).onclick = action; hero.appendChild(box);
  };
  if (RM) panel(RM_SYS ? 'Animations réduites (réglage Windows)' : 'Animations désactivées', 'Activer les animations et le jeu', () => setMotion('on'));
  else if (play === 'off') panel('Mode visite · jeu désactivé', 'Activer le jeu', () => setPlay('on'));
  else {
    FLX.cities.push({ view, hero, attach: g => { game = g; } });
    const row = $('.hud-row', hero);
    if (row) {
      const mk = (txt, title, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'motion-off'; b.textContent = txt; b.title = title; b.onclick = fn; return b; };
      row.prepend(mk('Jeu : on', 'Désactiver le mini-jeu (le site reste animé)', () => setPlay('off')), mk('Animations : on', 'Réduire les animations', () => setMotion('off')));
    }
    loadGame(hero);
  }
}
Object.assign(window.FLX, { glowSprite, smokeSprite, coneSprite });
$$('canvas.city').forEach(c => { try { City(c); } catch (err) { console.error('[Flexarion] Décor :', err); } });

/* ---------- 3. Apparition au défilement + textes décodés + compteurs ---------- */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/\\<>_';
function scramble(el) {
  if (RM || el.dataset.done) return; el.dataset.done = 1;
  const nodes = []; const walk = n => n.childNodes.forEach(c => c.nodeType === 3 ? nodes.push(c) : walk(c)); walk(el);
  const orig = nodes.map(n => n.textContent); let f = 0; const total = 26;
  const tick = () => {
    nodes.forEach((n, i) => {
      const s = orig[i], k = Math.floor(s.length * f / total);
      n.textContent = s.slice(0, k) + [...s.slice(k)].map(ch => ch === ' ' || ch === '\n' ? ch : GLYPHS[Math.random() * GLYPHS.length | 0]).join('');
    });
    if (++f <= total) requestAnimationFrame(tick); else nodes.forEach((n, i) => n.textContent = orig[i]);
  };
  tick();
}
function count(el) {
  const end = +el.dataset.count, d = 1400, s = performance.now();
  const step = n => { const p = Math.min(1, (n - s) / d), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(end * e); if (p < 1) requestAnimationFrame(step); };
  if (RM) el.textContent = end; else requestAnimationFrame(step);
}
const io = new IntersectionObserver(es => es.forEach(x => {
  if (!x.isIntersecting) return;
  const el = x.target; el.classList.add('in'); io.unobserve(el);
  if (el.matches('.scramble')) scramble(el);
  $$('.scramble', el).forEach(scramble);
  $$('[data-count]', el).forEach(count);
}), { threshold: .15 });
$$('.reveal, .scramble').forEach(el => io.observe(el));

/* ---------- 4. Cartes inclinables avec reflet ---------- */
if (FINE && !RM) $$('.tilt').forEach(c => {
  c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.style.setProperty('--rx', ((.5 - y) * 10).toFixed(2) + 'deg'); c.style.setProperty('--ry', ((x - .5) * 12).toFixed(2) + 'deg');
    c.style.setProperty('--gx', x * 100 + '%'); c.style.setProperty('--gy', y * 100 + '%');
  });
  c.addEventListener('pointerleave', () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
});

/* ---------- 5. Boutons magnétiques ---------- */
if (FINE && !RM) $$('.btn').forEach(b => {
  b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px,${(e.clientY - r.top - r.height / 2) * .3}px)`; });
  b.addEventListener('pointerleave', () => { b.style.transform = ''; });
});

/* ---------- 6. Viseur qui suit la souris ---------- */
const cur = $('.cursor');
if (cur && FINE && !RM) {
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; cur.classList.add('on'); }, { passive: true });
  document.addEventListener('pointerleave', () => cur.classList.remove('on'));
  $$('.hero.armed, .hero').forEach(h => { h.addEventListener('pointerover', e => cur.classList.toggle('aim', !e.target.closest('a, button'))); h.addEventListener('pointerleave', () => cur.classList.remove('aim')); });
  $$('a, button, .tilt').forEach(a => { a.addEventListener('pointerenter', () => cur.classList.add('hot')); a.addEventListener('pointerleave', () => cur.classList.remove('hot')); });
  const f = () => { cx += (x - cx) * .2; cy += (y - cy) * .2; cur.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(f); }; f();
} else if (cur) cur.remove();

/* ---------- 7. Barre de progression + en-tête compact ---------- */
const prog = $('.progress i'), head = $('.site-header');
const onScroll = () => {
  const h = document.documentElement, p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
  if (prog) prog.style.transform = `scaleX(${p})`;
  head && head.classList.toggle('compact', h.scrollTop > 40);
};
addEventListener('scroll', onScroll, { passive: true }); onScroll();

/* ---------- 8. Horloge HUD + coordonnées ---------- */
const clock = $('.hud-clock');
if (clock) { const up = () => { clock.textContent = new Date().toLocaleTimeString('fr-FR'); }; up(); setInterval(up, 1000); }

/* ---------- 9. Menu mobile ---------- */
const mb = $('.menu-btn'), nav = $('#nav');
mb && mb.addEventListener('click', () => { const o = nav.classList.toggle('open'); mb.setAttribute('aria-expanded', o); mb.textContent = o ? 'Fermer' : 'Menu'; });

/* ---------- 10. Le premier choix (mini scène interactive) ---------- */
$$('.choice').forEach(box => {
  const out = $('.choice-out', box), hope = $('.meter-hope i', box), fear = $('.meter-fear i', box), btns = $$('.choice-btn', box), reset = $('.choice-reset', box);
  const type = (txt) => {
    out.textContent = ''; out.classList.add('typing'); let i = 0;
    const go = () => { out.textContent = txt.slice(0, ++i); if (i < txt.length) setTimeout(go, RM ? 0 : 16); else out.classList.remove('typing'); };
    go();
  };
  btns.forEach(b => b.addEventListener('click', () => {
    btns.forEach(x => { x.disabled = true; x.classList.toggle('picked', x === b); });
    box.classList.add('glitching'); setTimeout(() => box.classList.remove('glitching'), 450);
    hope.style.width = b.dataset.hope + '%'; fear.style.width = b.dataset.fear + '%';
    type(b.dataset.out); reset.hidden = false;
  }));
  reset.addEventListener('click', () => {
    btns.forEach(x => { x.disabled = false; x.classList.remove('picked'); });
    hope.style.width = '50%'; fear.style.width = '50%'; out.textContent = out.dataset.idle; reset.hidden = true;
  });
});
})();
