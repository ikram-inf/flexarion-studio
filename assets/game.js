/* Flexarion — « Opération Nomade » : le mini-jeu du décor, ses sons et sa musique.
   Chargé à la demande par site.js, uniquement si le jeu est activé. */
(() => {
if (!window.FLX) return;
const { $, $$, rand, RM, FINE, STORE, rebelTicker, glowSprite, smokeSprite, coneSprite } = window.FLX;
/* ---------- Audio : bruitages synthétisés, sirènes, mégaphone, foule, musique ---------- */
const SCRIPT_BASE = (document.currentScript && document.currentScript.src) ? new URL('.', document.currentScript.src).href : 'assets/';
let actx = null, muted = false;
try { muted = localStorage.getItem('flx-mute') === '1'; } catch (e) {}
function ac() {
  if (muted) return null;
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; } catch (e) { return null; }
}
function noiseBuf(a, sec, curve) {
  const len = Math.floor(a.sampleRate * sec), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (curve ? Math.pow(1 - i / len, curve) : 1);
  return buf;
}
function noise(a, at, sec, curve, type, freq, gain, q) {
  const s = a.createBufferSource(); s.buffer = noiseBuf(a, sec, curve);
  const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
  const g = a.createGain(); g.gain.value = gain;
  s.connect(f).connect(g).connect(a.destination); s.start(at);
}
function tone(a, at, freq, dur, gain, type = 'sine', toFreq) {
  const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(freq, at);
  if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, at + dur);
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(gain, at + .01); g.gain.exponentialRampToValueAtTime(.0001, at + dur);
  o.connect(g).connect(a.destination); o.start(at); o.stop(at + dur + .05);
}
function sound(kind) {
  const a = ac(); if (!a) return;
  const t = a.currentTime;
  switch (kind) {
    case 'shot': noise(a, t, .16, 4, 'lowpass', 2400, .16); break;
    case 'boom': noise(a, t, 1, 2, 'lowpass', 700, .45); break;
    case 'big': noise(a, t, 2.4, 1.5, 'lowpass', 380, .7); tone(a, t, 70, 1.2, .35, 'sine', 30); break;
    case 'hurt': noise(a, t, .5, 2, 'lowpass', 300, .5); break;
    case 'ping': tone(a, t, 1900, .09, .1); break;
    case 'beep': tone(a, t, 1500, .07, .07, 'square'); break;
    case 'chime': [660, 880, 1320].forEach((f, i) => tone(a, t + i * .1, f, .3, .1)); break;
    case 'alarm': [440, 330, 440, 330].forEach((f, i) => tone(a, t + i * .3, f, .28, .06, 'sawtooth')); break;
    case 'sniper': noise(a, t, .7, 2.5, 'lowpass', 1800, .75); tone(a, t, 90, .35, .5, 'sine', 35); break;
    case 'glass':
      noise(a, t, .45, 3, 'highpass', 2500, .55);
      for (let i = 0; i < 16; i++) tone(a, t + Math.random() * .8, 2500 + Math.random() * 4500, .12 + Math.random() * .15, .045);
      break;
    case 'sad': [523, 466, 392, 311].forEach((f, i) => tone(a, t + i * .24, f, .32, .07, 'triangle')); break;
    case 'coo': [370, 330].forEach((f, i) => tone(a, t + i * .32, f, .3, .035, 'sine', f * .9)); break;
    case 'powerdown': tone(a, t, 240, 1.5, .12, 'sawtooth', 25); noise(a, t, .25, 2, 'bandpass', 3000, .2, 2); break;
    case 'powerup': tone(a, t, 30, 1, .1, 'sawtooth', 320); [0, .25, .4].forEach(d => noise(a, t + .6 + d, .08, 2, 'bandpass', 2500, .15, 3)); break;
    case 'squelch': noise(a, t, .2, 1.5, 'bandpass', 1800, .14, 2.5); break;
    case 'pickup': [523, 659, 784, 1046].forEach((f, i) => tone(a, t + i * .07, f, .25, .08, 'triangle')); break;
  }
}

/* Sirènes de police (deux voitures : « wail » et « yelp ») */
let siren = null;
function sirenStart() {
  const a = ac(); if (!a || siren) return;
  const out = a.createGain(); out.gain.setValueAtTime(0, a.currentTime); out.gain.linearRampToValueAtTime(.05, a.currentTime + 2);
  const filt = a.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 1150; filt.Q.value = .8;
  const nodes = [];
  [[0, .2, 380, 'sine'], [40, .17, 330, 'triangle']].forEach(([det, rate, depth, lt], i) => {
    const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 950; o.detune.value = det;
    const lfo = a.createOscillator(); lfo.type = lt; lfo.frequency.value = rate;
    const lg = a.createGain(); lg.gain.value = depth; lfo.connect(lg).connect(o.frequency);
    const g = a.createGain(); g.gain.value = i ? .55 : 1;
    o.connect(g).connect(filt); o.start(); lfo.start(); nodes.push(o, lfo);
  });
  filt.connect(out).connect(a.destination);
  const timer = setInterval(() => { const y = Math.random() < .45; nodes[3].frequency.setTargetAtTime(y ? 3.4 : .17, a.currentTime, .15); }, 3200);
  siren = { out, nodes, timer };
}
function sirenStop() {
  if (!siren || !actx) { siren = null; return; }
  const s = siren; siren = null; clearInterval(s.timer);
  s.out.gain.setTargetAtTime(0, actx.currentTime, .5);
  setTimeout(() => s.nodes.forEach(o => { try { o.stop(); } catch (e) {} }), 2500);
}

/* Radio de police façon GTA : bip d'ouverture, souffle et crépitements pendant la voix, bip de fin.
   La voix vient de la synthèse vocale du système ; tout l'habillage radio est généré ici. */
let radioBed = null;
function radioBeep(open) {
  const a = ac(); if (!a) return; const t = a.currentTime;
  const out = a.createGain(); out.gain.value = .09;
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1600; bp.Q.value = 1.4;
  const sh = a.createWaveShaper(); const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 4); } sh.curve = curve;
  sh.connect(bp).connect(out).connect(a.destination);
  (open ? [[1750, 0, .06], [2350, .065, .07]] : [[2350, 0, .05], [1500, .055, .09]]).forEach(([f, d, du]) => {
    const o = a.createOscillator(), g = a.createGain(); o.type = 'square'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(1, t + d + .005); g.gain.setValueAtTime(1, t + d + du - .01); g.gain.linearRampToValueAtTime(0, t + d + du);
    o.connect(g).connect(sh); o.start(t + d); o.stop(t + d + du + .02);
  });
  noise(a, t + (open ? .13 : .14), open ? .12 : .32, 1.4, 'bandpass', 1900, open ? .12 : .2, 2.2);
}
function radioBedStart() {
  const a = ac(); if (!a || radioBed) return;
  const src = a.createBufferSource(); src.buffer = noiseBuf(a, 2); src.loop = true;
  const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = .9;
  const g = a.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(.05, a.currentTime + .08);
  src.connect(bp).connect(g).connect(a.destination); src.start();
  const crackle = setInterval(() => {                       // crépitements irréguliers
    if (!actx) return; const t = actx.currentTime;
    g.gain.setTargetAtTime(Math.random() < .2 ? .14 : .035 + Math.random() * .03, t, .01);
    if (Math.random() < .25) noise(actx, t, .02 + Math.random() * .03, 1, 'highpass', 3500, .07);
  }, 45);
  radioBed = { src, g, crackle };
}
function radioBedStop() {
  if (!radioBed || !actx) { radioBed = null; return; }
  const r = radioBed; radioBed = null; clearInterval(r.crackle);
  r.g.gain.setTargetAtTime(0, actx.currentTime, .03); setTimeout(() => { try { r.src.stop(); } catch (e) {} }, 300);
}
/* bavardage radio inintelligible en fond (comme le scanner de police de GTA) */
function radioChatter() {
  const a = ac(); if (!a || radioBed) return; const t = a.currentTime + .15, dur = 1 + Math.random() * 1.4;
  radioBeep(true);
  const src = a.createBufferSource(); src.buffer = noiseBuf(a, dur + .2);
  const f1 = a.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 900; f1.Q.value = 3;
  const f2 = a.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1900; f2.Q.value = 4;
  const g = a.createGain(); g.gain.setValueAtTime(0, t);
  for (let x = 0; x < dur; x += .09 + Math.random() * .1) {     // syllabes
    g.gain.setValueAtTime(Math.random() < .2 ? .02 : .22 + Math.random() * .25, t + x);
    f1.frequency.setValueAtTime(600 + Math.random() * 700, t + x);
  }
  g.gain.setValueAtTime(0, t + dur);
  const mix = a.createGain(); mix.gain.value = .55;
  src.connect(f1).connect(g); src.connect(f2).connect(g); g.connect(mix).connect(a.destination); src.start(t);
  noise(a, t, dur, 0, 'bandpass', 1700, .035, .9);
  setTimeout(() => radioBeep(false), (dur + .2) * 1000);
}
function pickVoice(lang) {
  const vs = speechSynthesis.getVoices().filter(v => v.lang && v.lang.replace('_', '-').startsWith(lang.slice(0, 2)));
  const pref = /david|mark|guy|male|google us english|alex|fred|daniel|thomas|paul/i;
  return vs.find(v => v.lang.replace('_', '-') === lang && pref.test(v.name)) || vs.find(v => v.lang.replace('_', '-') === lang) || vs.find(v => pref.test(v.name)) || vs[0] || null;
}
function megaphone(text, lang = 'en-US', pitch = .55) {
  if (muted) return;
  if (!('speechSynthesis' in window)) { radioChatter(); return; }
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.voice = pickVoice(lang);
    u.rate = 1.12; u.pitch = Math.max(.3, pitch * .9); u.volume = .75;
    u.onstart = () => radioBedStart();
    u.onend = u.onerror = () => { radioBedStop(); radioBeep(false); };
    radioBeep(true); setTimeout(() => speechSynthesis.speak(u), 160);
  } catch (e) { radioChatter(); }
}
if ('speechSynthesis' in window) try { speechSynthesis.getVoices(); } catch (e) {}

/* Chant de stade : « Ré-sis-tez ! » + grosse caisse + claps, dans l'écho d'un stade */
function crowd() {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + .25, beat = .5, bars = 4, end = t0 + bars * 4 * beat;
  const master = a.createGain(); master.gain.value = .85; master.connect(a.destination);
  const conv = a.createConvolver(), irLen = Math.floor(a.sampleRate * 2.8), ir = a.createBuffer(2, irLen, a.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2.6); }
  conv.buffer = ir; const wet = a.createGain(); wet.gain.value = .5; conv.connect(wet).connect(master);
  const bus = a.createGain(); bus.connect(master); bus.connect(conv);
  const nz = (at, dur, type, freq, q, gain, curve = 2) => {
    const s = a.createBufferSource(); s.buffer = noiseBuf(a, dur, curve);
    const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = a.createGain(); g.gain.value = gain; s.connect(f).connect(g).connect(bus); s.start(at);
  };
  const drum = at => {
    const o = a.createOscillator(), g = a.createGain();
    o.frequency.setValueAtTime(120, at); o.frequency.exponentialRampToValueAtTime(42, at + .35);
    g.gain.setValueAtTime(.7, at); g.gain.exponentialRampToValueAtTime(.001, at + .5);
    o.connect(g).connect(bus); o.start(at); o.stop(at + .55); nz(at, .12, 'lowpass', 260, .7, .5);
  };
  const claps = at => { for (let i = 0; i < 24; i++) nz(at + Math.random() * .04, .045, 'bandpass', 1100 + Math.random() * 900, 1.2, .07, 4); };
  /* nappe de foule + clameur finale */
  const bed = a.createBufferSource(); bed.buffer = noiseBuf(a, bars * 4 * beat + 6);
  const bf = a.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 900; bf.Q.value = .5;
  const bg = a.createGain();
  bg.gain.setValueAtTime(0, t0); bg.gain.linearRampToValueAtTime(.07, t0 + 1); bg.gain.setValueAtTime(.07, end - .3);
  bg.gain.linearRampToValueAtTime(.38, end + .5); bg.gain.linearRampToValueAtTime(0, end + 5.5);
  bed.connect(bf).connect(bg).connect(bus); bed.start(t0);
  /* voix : banc de formants (voyelles ouvertes, comme une foule qui crie) */
  const vbus = a.createGain(), lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2800; vbus.connect(lp);
  [[620, 3, 1], [1180, 4, .55], [2600, 5, .22]].forEach(([f, q, g]) => {
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    const gg = a.createGain(); gg.gain.value = g * 2; lp.connect(bp).connect(gg).connect(bus);
  });
  const sing = (at, du, f, n = 22, vol = .02) => {
    for (let v = 0; v < n; v++) {
      const o = a.createOscillator(), g = a.createGain(), vib = a.createOscillator(), vg = a.createGain();
      const ff = f * (v % 4 === 0 ? .5 : 1); o.type = 'sawtooth'; o.frequency.value = ff; o.detune.value = (Math.random() - .5) * 45;
      vib.frequency.value = 4.5 + Math.random() * 2; vg.gain.value = ff * .007; vib.connect(vg).connect(o.frequency);
      const s = at + Math.random() * .07, e = at + du + Math.random() * .05;
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(vol, s + .04); g.gain.setValueAtTime(vol, e - .07); g.gain.linearRampToValueAtTime(0, e);
      o.connect(g).connect(vbus); o.start(s); o.stop(e + .05); vib.start(s); vib.stop(e + .05);
    }
  };
  const SYL = [[0, .45, 220, 3200], [.5, .45, 220, 5500], [1, .58, 294, 4200]]; // Ré · sis · TEZ
  for (let bar = 0; bar < bars; bar++) {
    const b0 = t0 + bar * 4 * beat;
    SYL.forEach(([st, du, f, hiss]) => { const at = b0 + st * beat * 2 / 2 * 1; nz(at, .07, 'highpass', hiss, .7, .05); sing(at, du, f); });
    drum(b0 + 2 * beat); drum(b0 + 3 * beat);
    claps(b0 + 2 * beat); claps(b0 + 2.5 * beat); claps(b0 + 3 * beat);
  }
  drum(end); nz(end, .09, 'highpass', 3000, .7, .06); sing(end, 1.3, 330, 30, .022); claps(end + .2); claps(end + .45);
}

/* Rotor d'hélicoptère */
let rotor = null;
function rotorStart() {
  const a = ac(); if (!a || rotor) return;
  const out = a.createGain(); out.gain.setValueAtTime(0, a.currentTime); out.gain.linearRampToValueAtTime(.55, a.currentTime + 3.5);
  const src = a.createBufferSource(); src.buffer = noiseBuf(a, 2); src.loop = true;
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
  const am = a.createGain(); am.gain.value = .5;
  const lfo = a.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 12;
  const lg = a.createGain(); lg.gain.value = .5; lfo.connect(lg).connect(am.gain);
  const thump = a.createOscillator(); thump.frequency.value = 48; const tg = a.createGain(); tg.gain.value = .5; thump.connect(tg).connect(am);
  src.connect(lp).connect(am).connect(out).connect(a.destination);
  src.start(); lfo.start(); thump.start();
  rotor = { out, nodes: [src, lfo, thump] };
}
function rotorStop() {
  if (!rotor || !actx) { rotor = null; return; }
  const r = rotor; rotor = null; r.out.gain.setTargetAtTime(0, actx.currentTime, .3);
  setTimeout(() => r.nodes.forEach(n => { try { n.stop(); } catch (e) {} }), 1500);
}

const sb = $('.hud-sound');
if (sb) {
  const lab = () => { sb.textContent = muted ? 'Son : off' : 'Son : on'; sb.setAttribute('aria-pressed', String(!muted)); };
  lab(); sb.addEventListener('click', () => {
    muted = !muted; try { localStorage.setItem('flx-mute', muted ? '1' : '0'); } catch (e) {} lab();
    if (muted) { sirenStop(); rotorStop(); radioBedStop(); try { speechSynthesis.cancel(); } catch (e) {} }
  });
}

/* Musique de fond (« Squelch and Sweep ») : démarre au premier clic, reprend d'une page à l'autre */
const MUSIC = (() => {
  const btn = $('.hud-music'), noop = { duck() {}, restore() {}, fade() {} };
  if (!btn) return noop;
  let on = true; try { on = localStorage.getItem('flx-music') !== '0'; } catch (e) {}
  const el = new Audio(SCRIPT_BASE + 'audio/squelch-and-sweep.mp3'); el.loop = true; el.preload = 'none';
  const VOL = .35; el.volume = VOL;
  el.addEventListener('loadedmetadata', () => { try { const t = +sessionStorage.getItem('flx-music-t'); if (t && t < el.duration) el.currentTime = t; } catch (e) {} }, { once: true });
  const label = () => { btn.textContent = on ? 'Musique : on' : 'Musique : off'; btn.setAttribute('aria-pressed', String(on)); };
  const start = () => { if (on) el.play().catch(() => {}); };
  const first = e => {
    if (e.target && e.target.closest && e.target.closest('.hud-music')) return;
    start(); removeEventListener('pointerdown', first, true); removeEventListener('keydown', first, true);
  };
  addEventListener('pointerdown', first, true); addEventListener('keydown', first, true);
  btn.addEventListener('click', () => { on = !on; try { localStorage.setItem('flx-music', on ? '1' : '0'); } catch (e) {} label(); on ? start() : el.pause(); });
  addEventListener('pagehide', () => { try { sessionStorage.setItem('flx-music-t', el.currentTime); } catch (e) {} });
  let ft = 0;
  const to = (v, ms = 900) => {
    clearInterval(ft); const from = el.volume, s = performance.now();
    ft = setInterval(() => { const p = Math.min(1, (performance.now() - s) / ms); el.volume = Math.max(0, Math.min(1, from + (v - from) * p)); if (p >= 1) clearInterval(ft); }, 40);
  };
  label();
  return { duck: () => to(VOL * .3), restore: () => to(VOL), fade: () => to(0, 2200) };
})();

/* ---------- Opération Nomade : le mini-jeu du décor ---------- */
const OBJECTIVES = [
  { id: 'sniper', name: "Tireur d'élite", desc: "Toucher 5 cibles d'affilée sans rater." },
  { id: 'courier', name: 'Intercepter le courrier', desc: 'Abattre un drone courrier doré.' },
  { id: 'blackout', name: 'Black-out', desc: 'Détruire tous les projecteurs et plonger la ville dans le noir.' },
  { id: 'counter', name: 'Contre-sniper', desc: 'Neutraliser 3 snipers avant qu’ils ne tirent.' },
  { id: 'supply', name: 'Ravitaillé', desc: 'Récupérer un ravitaillement en tirant dessus.' },
  { id: 'chain', name: 'Réaction en chaîne', desc: "Abattre 2 drones d'un seul tir." },
  { id: 'boss', name: 'Abattre la Vigie', desc: 'Atteindre la vague 4 et détruire le dirigeable.' },
];
const SECRETS = [
  { id: 'konami', name: 'Code de la Résistance', hint: 'Un vieux code de joueur…', desc: 'Tir automatique : maintenez le clic.' },
  { id: 'pacifist', name: 'Pacifiste ?', hint: 'La paix a ses limites…', desc: 'La paix ne se brise pas. Elle se reconstruit.' },
  { id: 'nightvision', name: 'Vision nocturne', hint: 'Dites son nom…', desc: 'Tapez « nomade » pour l’activer ou la couper.' },
  { id: 'cruelty', name: 'Quelle cruauté', hint: 'Certains innocents volent encore…', desc: 'Vous avez tiré sur un pigeon. L’espoir ne vous le pardonnera pas.' },
  { id: 'ending', name: 'Fin de transmission', hint: 'Allez trop loin…', desc: 'Il n’y a aucun espoir. Ou peut-être que si.' },
];
const TYPES = {
  scout:   { hp: 1, r: 34, k: 1.5, sp: [70, 120], pts: 100 },
  courier: { hp: 1, r: 28, k: 1.0, sp: [230, 290], pts: 500 },
  armored: { hp: 3, r: 46, k: 2.1, sp: [45, 70], pts: 300 },
  hunter:  { hp: 1, r: 34, k: 1.3, sp: [90, 130], pts: 150 },
};
const ENDGAME = 16; // 15 vagues jouables, l'intervention survient ensuite
const POLICE = ['All units, shots fired in Sector 13. Suspect is armed.', 'Ten-four, dispatch. Moving in.', 'This is the police! Drop your weapon!', 'Officer needs assistance! Requesting backup!', 'Suspect is engaging the airship. All units respond.', 'Copy that. Air support is en route.', 'You are surrounded. Get down on the ground!'];
const WAVE_TXT = {
  2: ['Vague 2', 'Traqueurs et snipers : abattez-les avant qu’ils ne frappent.'],
  3: ['Vague 3', 'Drones blindés en approche : 3 tirs pour les abattre.'],
};

function Game(view, hero) {
  const q = s => $(s, hero);
  const hud = { score: q('.hud-score'), wave: q('.hud-wave'), signal: q('.signal'), sig: q('.signal i'),
    esp: q('.espoir'), espI: q('.espoir i'), bo: q('.bo-status'), cracks: q('.cracks'), end: q('.ending'), torch: q('.flashlight'),
    boss: q('.boss-bar'), bossBar: q('.boss-bar i'), toast: q('.toast'), panel: q('.mission'), btn: q('.hud-mission'), logo: q('.hero-logo') };
  let drones = [], bolts = [], boss = null, shots = [], sparks = [], smoke = [], debris = [], flashes = [], texts = [];
  let wave = 1, waveKills = 0, score = 0, signal = 100, nextSpawn = 1.2, streak = 0, over = 0, logoHits = 0;
  let espoir = 100, snipers = [], crates = [], pigeon = null, feathers = [], ending = null, blackoutT = 0, sniperKills = 0;
  let nextSniper = 8, nextCrate = 20, nextPigeon = rand(10, 18);
  const armorHp = () => Math.min(7, 3 + Math.max(0, Math.floor((wave - 3) / 2)));
  let resist = !!STORE.get('s_konami');
  hero.classList.add('armed');

  /* --- toasts --- */
  const queue = []; let toasting = false;
  function toast(title, sub = '', kind = '') { if (!hud.toast) return; queue.push([title, sub, kind]); if (!toasting) nextToast(); }
  function nextToast() {
    const m = queue.shift(); if (!m) { toasting = false; return; }
    toasting = true; hud.toast.className = 'toast game-ui show ' + m[2];
    hud.toast.innerHTML = `<b>${m[0]}</b>${m[1] ? `<span>${m[1]}</span>` : ''}`;
    setTimeout(() => { hud.toast.classList.remove('show'); setTimeout(nextToast, 320); }, 2700);
  }

  /* --- objectifs et secrets --- */
  function objective(id) {
    if (STORE.get('o_' + id)) return;
    STORE.set('o_' + id, 1); sound('chime');
    const o = OBJECTIVES.find(o => o.id === id);
    toast('Objectif accompli', o.name, 'gold'); renderPanel();
    if (OBJECTIVES.every(o => STORE.get('o_' + o.id))) setTimeout(() => toast('Opération Nomade terminée', 'Tous les objectifs sont accomplis. Respect.', 'gold'), 600);
  }
  function secret(id) {
    if (!STORE.get('s_' + id)) { STORE.set('s_' + id, 1); sound('chime'); }
    const s = SECRETS.find(s => s.id === id);
    toast('Secret découvert · ' + s.name, s.desc, 'secret'); renderPanel();
  }
  function renderPanel() {
    if (!hud.panel) return;
    const oDone = OBJECTIVES.filter(o => STORE.get('o_' + o.id)).length, sDone = SECRETS.filter(s => STORE.get('s_' + s.id)).length;
    hud.panel.innerHTML = `
      <div class="m-head"><h3>Opération Nomade</h3><button class="m-close" type="button" aria-label="Fermer le panneau Mission">✕</button></div>
      <dl class="m-stats">
        <div><dt>Vague</dt><dd>${wave}</dd></div>
        <div><dt>Espoir</dt><dd>${espoir}%</dd></div>
        <div><dt>Record</dt><dd>${String(STORE.get('best', 0)).padStart(6, '0')}</dd></div>
        <div><dt>Abattus</dt><dd>${STORE.get('kills', 0)}</dd></div>
      </dl>
      <h4>Objectifs <span>${oDone}/${OBJECTIVES.length}</span></h4>
      <ul>${OBJECTIVES.map(o => `<li class="${STORE.get('o_' + o.id) ? 'done' : ''}"><b>${o.name}</b><small>${o.desc}</small></li>`).join('')}</ul>
      <h4>Secrets <span>${sDone}/${SECRETS.length}</span></h4>
      <ul>${SECRETS.map(s => STORE.get('s_' + s.id) ? `<li class="done"><b>${s.name}</b><small>${s.desc}</small></li>` : `<li class="locked"><b>???</b><small>${s.hint}</small></li>`).join('')}</ul>
      <p class="m-help">Cliquez dans le décor pour tirer. Traqueurs, snipers et tirs de la Vigie font baisser votre signal : tirez sur les ravitaillements pour le recharger. Ne touchez pas aux pigeons.</p>
      <button class="m-reset" type="button">Réinitialiser la progression</button>`;
    $('.m-close', hud.panel).onclick = () => togglePanel(false);
    $('.m-reset', hud.panel).onclick = () => { if (hud.panel.dataset.confirm) { STORE.reset(); location.reload(); } else { hud.panel.dataset.confirm = 1; $('.m-reset', hud.panel).textContent = 'Confirmer : tout effacer ?'; } };
  }
  function togglePanel(open) {
    if (!hud.panel) return;
    open = open ?? hud.panel.hidden;
    hud.panel.hidden = !open; delete hud.panel.dataset.confirm;
    hud.btn && hud.btn.setAttribute('aria-expanded', String(open));
    if (open) renderPanel();
  }
  hud.btn && hud.btn.addEventListener('click', () => togglePanel());
  addEventListener('keydown', e => { if (e.key === 'Escape') togglePanel(false); });

  /* --- HUD --- */
  function updateHud() {
    if (score > STORE.get('best', 0)) STORE.set('best', score);
    if (hud.score) hud.score.textContent = String(score).padStart(6, '0');
    if (hud.wave) hud.wave.textContent = wave;
    if (hud.signal) { hud.signal.hidden = wave < 2 && signal >= 100; hud.sig.style.width = signal + '%'; hud.signal.classList.toggle('low', signal <= 30); }
    if (hud.esp) { hud.esp.hidden = wave < 2 && espoir >= 100; hud.espI.style.width = espoir + '%'; hud.esp.classList.toggle('low', espoir <= 30); }
    view.canvas.style.setProperty('--despair', ((100 - espoir) / 100 * .9).toFixed(2));
    view.canvas.classList.toggle('despair', espoir < 100);
    if (boss && hud.bossBar) hud.bossBar.style.width = Math.max(0, boss.hp / boss.max * 100) + '%';
  }
  function popText(x, y, txt, color) { texts.push({ x, y, txt, life: 1, color }); }
  const gb = q('.gbanner'); let gbT = 0;
  function bigBanner(title, sub, color = '#ff4632', life = 2.4) {
    if (!gb) return;
    gb.style.setProperty('--c', color); gb.innerHTML = `<b data-text="${title}">${title}</b><span>${sub}</span>`;
    gb.classList.remove('show'); void gb.offsetWidth; gb.classList.add('show');
    clearTimeout(gbT); gbT = setTimeout(() => gb.classList.remove('show'), life * 1000);
  }

  /* --- vagues --- */
  function nextWave() {
    wave++; waveKills = 0;
    if (wave >= ENDGAME) { startEnding('wave'); return; }
    if (wave === ENDGAME - 1) { bigBanner('Dernier avertissement', 'Si vous continuez, l’Ordre enverra ses troupes.', '#ff4632', 3.2); megaphone('Ceci est votre dernier avertissement.', 'fr-FR', .4); sound('alarm'); updateHud(); return; }
    if (wave % 4 === 0) { bigBanner('Alerte', 'Un dirigeable de l’Ordre approche', '#ff4632'); }
    else if (WAVE_TXT[wave]) { bigBanner(WAVE_TXT[wave][0], WAVE_TXT[wave][1], '#D5CE9B'); }
    else bigBanner(`Vague ${wave} / ${ENDGAME - 1}`, `Menace niveau ${wave} : drones plus rapides, blindés à ${armorHp()} tirs`, '#D5CE9B');
    sound('chime'); updateHud();
  }
  function pickType() {
    const r = Math.random();
    if (wave === 1) return 'scout';
    if (wave === 2) return r < .65 ? 'scout' : r < .9 ? 'hunter' : 'courier';
    if (wave === 3) return r < .45 ? 'scout' : r < .7 ? 'hunter' : r < .9 ? 'armored' : 'courier';
    return r < .35 ? 'scout' : r < .62 ? 'hunter' : r < .9 ? 'armored' : 'courier';
  }
  function spawn(type, x, y) {
    const { W, H, DPR } = view, T = TYPES[type], dir = Math.random() < .5 ? 1 : -1;
    const mul = Math.min(1.8, 1 + Math.max(0, wave - 2) * .07), hp = type === 'armored' ? armorHp() : T.hp;
    drones.push({ type, hp, max: hp, r: T.r, k: T.k, pts: T.pts, dir,
      x: x ?? (dir > 0 ? -60 * DPR : W + 60 * DPR), y: y ?? rand(H * .12, H * .42),
      vx: rand(T.sp[0], T.sp[1]) * DPR * dir * mul, vy: 0, ph: rand(0, 6), t: 0, diveAt: rand(1.2, 2.8), diving: false, hitT: 0 });
  }

  /* --- dégâts subis --- */
  function damage(n) {
    if (over > 0) return;
    signal = Math.max(0, signal - n); view.red = 1; view.shake = Math.max(view.shake, .7); sound('hurt');
    if (signal <= 0) gameOver();
    updateHud();
  }
  function gameOver() {
    over = 3.4; bigBanner('Signal perdu', `Vague ${wave} · Score ${String(score).padStart(6, '0')}`, '#ff4632', 3.2);
    drones.forEach(d => explode(d.x, d.y, .6)); drones = []; bolts = []; snipers = []; crates = [];
    if (view.dark) endBlackout(true); sirenStop(); radioBedStop(); try { speechSynthesis.cancel(); } catch (e) {}
    if (boss) { explode(boss.x, boss.y, 1.4); boss = null; hud.boss.hidden = true; }
    sound('big');
  }
  function restart() {
    wave = 1; waveKills = 0; score = 0; signal = 100; streak = 0; nextSpawn = 1.5; espoir = 100;
    snipers = []; crates = []; pigeon = null; nextSniper = 8; nextCrate = 20; repairCracks(); MUSIC.restore();
    toast('Reconnexion établie', 'Retour à la vague 1'); updateHud();
  }

  /* --- effets --- */
  function burst(x, y, n, hot, speed) {
    const DPR = view.DPR;
    n = Math.min(Math.ceil(n * .55), 320 - sparks.length);
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), v = rand(.2, 1) * speed * DPR, life = rand(.4, hot ? 1.3 : .5);
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (hot ? 60 * DPR : 0), life, max: life, s: rand(.8, hot ? 2.6 : 1.6) * DPR, hot });
    }
  }
  function explode(x, y, s = 1) {
    const DPR = view.DPR;
    flashes.push({ x, y, life: .5, max: .5, big: true, s });
    burst(x, y, Math.round(120 * s), true, 420 * Math.sqrt(s));
    for (let i = 0; i < 10 * s && smoke.length < 60; i++) { const life = rand(1.6, 3); smoke.push({ x: x + rand(-14, 14) * DPR * s, y: y + rand(-10, 10) * DPR, vx: rand(-30, 30) * DPR, vy: rand(-50, -10) * DPR, r: rand(10, 26) * DPR * s, life, max: life }); }
    for (let i = 0; i < 10 * s; i++) debris.push({ x, y, vx: rand(-160, 160) * DPR, vy: rand(-260, -60) * DPR, rot: rand(0, 6), vr: rand(-12, 12), w: rand(2, 7) * DPR, h: rand(1.5, 3.5) * DPR, life: 3 });
    view.shake = Math.max(view.shake, .8 * Math.min(1.3, s));
  }
  function kill(d) {
    const pts = d.pts * (view.dark ? 2 : 1);
    d.hp = 0; score += pts; waveKills++; STORE.set('kills', STORE.get('kills', 0) + 1);
    explode(d.x, d.y, d.type === 'armored' ? 1.25 : d.type === 'courier' ? .8 : 1);
    popText(d.x, d.y - 36 * view.DPR, '+' + pts + (view.dark ? ' ×2' : ''), d.type === 'courier' ? '#ffd27a' : '#D5CE9B'); sound('boom');
    if (d.type === 'courier') { objective('courier'); toast('Courrier intercepté', '« La Vigie survolera le secteur 13 ce soir. »', 'lore'); }
    if (wave % 4 !== 0 && waveKills >= (wave < 4 ? 5 : 6)) nextWave();
    return 1;
  }
  function chain(x, y, src) {
    let k = 0;
    drones.forEach(o => { if (o !== src && o.hp > 0 && Math.hypot(o.x - x, o.y - y) < 120 * view.DPR) { o.hp--; o.hitT = .12; if (o.hp <= 0) k += kill(o); } });
    return k;
  }

  /* --- la Vigie (boss) --- */
  function startBoss() {
    const { W, H, DPR } = view, n = Math.floor(wave / 4);
    const s = Math.min(1.25, Math.max(.62, W / DPR / 1300));
    boss = { x: W / 2, y: -160 * DPR, ty: H * (W / DPR < 700 ? .17 : .25), s, hp: 30 + 20 * n, max: 30 + 20 * n, t: 0, ft: 0, megaT: 3, state: 'enter', fireT: 2.5, dropT: 5, hitT: 0, dying: 0 };
    hud.boss.hidden = false; sound('alarm'); sirenStart(); MUSIC.duck(); toast('Alerte · La Vigie', 'Visez son œil rouge : dégâts x3', 'alert'); updateHud();
  }
  function fireBolt(rage) {
    const B = boss, DPR = view.DPR;
    bolts.push({ x: B.x, y: B.y + 40 * DPR * B.s, vx: rand(-60, 60) * DPR, vy: rand(95, 140) * DPR * (rage ? 1.3 : 1), dead: false, ph: rand(0, 6) });
  }
  function hitBoss(n, x, y, crit) {
    const B = boss; B.hp -= n; B.hitT = .1; score += n * 20;
    burst(x, y, crit ? 40 : 14, true, crit ? 320 : 180);
    popText(x, y - 24 * view.DPR, crit ? 'CRITIQUE −' + n : '−' + n, crit ? '#ff4632' : '#A9B0A6');
    sound(crit ? 'ping' : 'shot');
    if (B.hp <= 0) { B.hp = 0; B.state = 'dying'; sirenStop(); radioBedStop(); try { speechSynthesis.cancel(); } catch (e) {} sound('big'); bigBanner('La Vigie est touchée', 'Elle s’effondre sur la ville…', '#ff4632', 1.8); }
    updateHud();
  }
  function finishBoss() {
    explode(boss.x, boss.y, 2.4); view.red = .4;
    score += 5000; popText(boss.x, boss.y - 60 * view.DPR, '+5000', '#ffd27a');
    boss = null; hud.boss.hidden = true;
    STORE.set('boss', 1); rebelTicker(); objective('boss');
    bigBanner('La Vigie est tombée', 'Le secteur 13 respire. Le bandeau de propagande a changé…', '#ffd27a', 3.6);
    toast('Le site a changé', 'Regardez le bandeau de propagande sur chaque page.', 'gold');
    crowd(); if (!view.dark) MUSIC.restore();
    espoir = Math.min(100, espoir + 30);
    wave++; waveKills = 0; signal = Math.min(100, signal + 40); updateHud();
  }
  function updateBoss(dt, t) {
    const { W, H, DPR } = view, B = boss;
    B.t += dt; B.hitT = Math.max(0, B.hitT - dt);
    if (B.state === 'enter') { B.y += (B.ty - B.y) * dt * 1.1; if (Math.abs(B.y - B.ty) < 5 * DPR) { B.state = 'fight'; B.ft = 0; B.y = B.ty; } }
    else if (B.state === 'fight') {
      B.ft += dt; B.x = W / 2 + Math.sin(B.ft * .35) * W * .27; B.y = B.ty + Math.sin(B.ft * .9) * 12 * DPR;
      B.megaT -= dt; if (B.megaT <= 0) { B.megaT = rand(6, 9); megaphone(POLICE[B.line = ((B.line ?? -1) + 1) % POLICE.length]); B.chatT = rand(2.5, 4); }
      if (B.chatT > 0 && (B.chatT -= dt) <= 0) radioChatter();
      const rage = B.hp < B.max / 2;
      B.fireT -= dt; if (B.fireT <= 0) { B.fireT = rage ? rand(.9, 1.4) : rand(1.7, 2.5); fireBolt(rage); if (rage) fireBolt(rage); }
      B.dropT -= dt; if (B.dropT <= 0 && drones.length < 3) { B.dropT = rage ? 4.5 : 6.5; spawn(rage ? 'hunter' : 'scout', B.x, B.y + 40 * DPR * B.s); }
    } else if (B.state === 'dying') {
      B.dying += dt; B.y += 50 * DPR * dt;
      if (Math.random() < .22) explode(B.x + rand(-150, 150) * DPR * B.s, B.y + rand(-40, 40) * DPR * B.s, .7);
      view.shake = Math.max(view.shake, .5);
      if (B.dying > 1.8) { finishBoss(); return; }
    }
    drawBoss(B, t);
  }

  /* --- tir --- */
  function shoot(cx, cy) {
    const { W, H, DPR, canvas } = view, r = canvas.getBoundingClientRect();
    const x = (cx - r.left) * DPR, y = (cy - r.top) * DPR;
    shots.push({ ox: W / 2 + (x - W / 2) * .15, oy: H + 10 * DPR, x, y, life: .14, max: .14 });
    flashes.push({ x: W / 2 + (x - W / 2) * .15, y: H - 4 * DPR, life: .12, max: .12 });
    view.shake = Math.max(view.shake, resist ? .12 : .22); sound('shot');
    if (over > 0) return;
    if (ending) { burst(x, y, 10, false, 140); return; }
    let hit = false, kills = 0;
    const crate = crates.find(c => Math.hypot(x - c.x, y - c.y) < 26 * DPR || Math.hypot(x - c.x, y - (c.y - 55 * DPR)) < 36 * DPR);
    if (crate) { hit = true; collectCrate(crate); }
    const sn = !hit && snipers.find(z => { const sx = z.lx + (view.lox[2] || 0), sy = z.ly + (view.loy[2] || 0); return Math.hypot(x - sx, y - sy) < 48 * DPR || Math.hypot(x - sx, y - (sy - 60 * DPR)) < 34 * DPR; });
    if (sn) { hit = true; killSniper(sn); }
    const bolt = !hit && bolts.find(b => !b.dead && Math.hypot(x - b.x, y - b.y) < 28 * DPR);
    if (bolt) { bolt.dead = true; hit = true; score += 50; burst(bolt.x, bolt.y, 26, true, 240); flashes.push({ x: bolt.x, y: bolt.y, life: .22, max: .22 }); popText(bolt.x, bolt.y - 20 * DPR, '+50'); }
    if (!hit) {
      let best = null, bd = 1e9;
      drones.forEach(d => { const dd = Math.hypot(x - d.x, y - d.y); if (d.hp > 0 && dd < d.r * DPR && dd < bd) { best = d; bd = dd; } });
      if (best) {
        hit = true; best.hp--; best.hitT = .12;
        if (best.hp <= 0) { kills += kill(best); kills += chain(best.x, best.y, best); }
        else { sound('ping'); burst(x, y, 18, false, 220); popText(best.x, best.y - 40 * DPR, `blindage ${best.hp}/${best.max}`, '#A9B0A6'); }
      }
    }
    if (!hit && boss && boss.state === 'fight') {
      const s = boss.s * DPR;
      if (Math.hypot(x - boss.x, y - (boss.y + 38 * s)) < 22 * s) { hit = true; hitBoss(3, x, y, true); }
      else if (((x - boss.x) / (172 * s)) ** 2 + ((y - boss.y) / (50 * s)) ** 2 < 1) { hit = true; hitBoss(1, x, y, false); }
    }
    if (!hit && pigeon && Math.hypot(x - pigeon.x, y - pigeon.y) < 26 * DPR) { shootPigeon(); updateHud(); return; }
    if (!hit) {
      const bm = view.beams.find(b => !b.dead && b.sx != null && Math.hypot(x - b.sx, y - b.sy) < 24 * DPR);
      if (bm) {
        hit = true; bm.dead = true; view.deadBeams.add(view.beams.indexOf(bm));
        explode(bm.sx, bm.sy, .55); score += 200; popText(bm.sx, bm.sy - 24 * DPR, '+200'); sound('boom');
        const dead = view.beams.filter(b => b.dead).length;
        if (dead === view.beams.length) { objective('blackout'); startBlackout(); } else toast('Projecteur détruit', `${dead}/${view.beams.length} · la ville s’assombrit`);
      }
    }
    if (hit) { streak++; if (streak >= 5) objective('sniper'); }
    else { streak = 0; burst(x, y, 14, false, 160); flashes.push({ x, y, life: .15, max: .15 }); }
    if (kills >= 2) { objective('chain'); popText(x, y - 70 * DPR, `COUP ×${kills}`, '#ffd27a'); }
    updateHud();
  }

  /* --- écran brisé --- */
  function crack(x, y, big) {
    const box = hud.cracks; if (!box) return;
    const W = box.clientWidth, H = box.clientHeight, R = big ? Math.max(W, H) * .9 : rand(170, 320);
    const rays = big ? 24 : Math.round(rand(10, 15)), steps = big ? 9 : 6, segs = [];
    let d = '';
    for (let i = 0; i < rays; i++) {
      const ang = i / rays * Math.PI * 2 + rand(-.14, .14), len = R * rand(.45, 1), seg = [];
      for (let k = 1; k <= steps; k++) { const r = len * k / steps, a2 = ang + rand(-.07, .07); seg.push([x + Math.cos(a2) * r, y + Math.sin(a2) * r]); }
      d += `M${x.toFixed(1)},${y.toFixed(1)}` + seg.map(p => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
      segs.push(seg);
    }
    const rings = big ? 5 : 3; let shards = '';
    for (let k = 1; k <= rings; k++) {
      const idx = Math.min(steps - 1, Math.round(k * steps / (rings + 1)) - 1);
      for (let i = 0; i < rays; i++) {
        if (Math.random() < .3) continue;
        const p1 = segs[i][idx], p2 = segs[(i + 1) % rays][idx];
        if (!p1 || !p2) continue;
        const mx = (p1[0] + p2[0]) / 2 + rand(-6, 6), my = (p1[1] + p2[1]) / 2 + rand(-6, 6);
        d += `M${p1[0].toFixed(1)},${p1[1].toFixed(1)}Q${mx.toFixed(1)},${my.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
        if (k === 1 && Math.random() < .5) shards += `<path d="M${x},${y}L${p1[0].toFixed(1)},${p1[1].toFixed(1)}L${p2[0].toFixed(1)},${p2[1].toFixed(1)}Z" fill="rgba(255,255,255,${rand(.03, .09).toFixed(2)})"/>`;
      }
    }
    const el = document.createElement('div'); el.className = 'crack';
    el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${shards}
      <path d="${d}" fill="none" stroke="rgba(0,0,0,.6)" stroke-width="2.6" transform="translate(1.2 1.2)"/>
      <path d="${d}" fill="none" stroke="rgba(236,244,240,.88)" stroke-width="1.1" stroke-linejoin="round"/>
      <circle cx="${x}" cy="${y}" r="${big ? 26 : 9}" fill="rgba(255,255,255,.22)" stroke="rgba(255,255,255,.7)"/></svg>`;
    box.appendChild(el);
    while (box.children.length > 6) box.firstElementChild.remove();
  }
  function repairCracks() {
    if (!hud.cracks) return;
    [...hud.cracks.children].forEach(c => { c.classList.add('fix'); setTimeout(() => c.remove(), 900); });
  }

  /* --- snipers --- */
  function spawnSniper() {
    const { W, H, DPR } = view, left = Math.random() < .5;
    const sx = left ? rand(W * .05, W * .15) : rand(W * .85, W * .95), sy = rand(H * .3, H * .62);
    const dur = Math.max(1.7, 4.2 - (wave - 2) * .25);
    snipers.push({ lx: sx - (view.lox[2] || 0), ly: sy - (view.loy[2] || 0), t: 0, dur, beepT: 0,
      tx: rand(W * .25, W * .75), ty: rand(H * .3, H * .72), fade: 0 });
    if (!STORE.get('seenSniper')) { STORE.set('seenSniper', 1); toast('Sniper repéré', 'Abattez-le avant que sa visée rouge ne soit chargée.', 'alert'); }
  }
  function killSniper(z) {
    const DPR = view.DPR, x = z.lx + (view.lox[2] || 0), y = z.ly + (view.loy[2] || 0), pts = 400 * (view.dark ? 2 : 1);
    snipers = snipers.filter(o => o !== z); score += pts; sniperKills++;
    explode(x, y, .5); popText(x, y - 30 * DPR, '+' + pts + ' sniper', '#ffd27a'); sound('boom');
    if (sniperKills >= 3) objective('counter');
  }
  function sniperFire(z) {
    const DPR = view.DPR, x = z.lx + (view.lox[2] || 0), y = z.ly + (view.loy[2] || 0);
    flashes.push({ x, y, life: .25, max: .25 });
    crack(z.tx / DPR, z.ty / DPR, false); sound('sniper'); sound('glass');
    view.white = .35; damage(25);
  }
  function drawSniper(z, t) {
    const { ctx, DPR } = view, x = z.lx + (view.lox[2] || 0), y = z.ly + (view.loy[2] || 0), p = Math.min(1, z.t / z.dur);
    const late = p > .7, strobe = late ? (Math.sin(t * (22 + 160 * (p - .7))) > -.1 ? 1 : .35) : 1;
    const I = (.45 + .55 * p) * (.8 + .2 * Math.sin(t * 5 + z.lx)) * strobe;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const R = (22 + 46 * p) * DPR;
    ctx.globalAlpha = Math.min(1, I); ctx.drawImage(glowSprite('235,244,255'), x - R, y - R, R * 2, R * 2);
    ctx.globalAlpha = .45 * I; ctx.drawImage(glowSprite('150,190,255'), x - R * 1.8, y - R * 1.8, R * 3.6, R * 3.6);
    const L = (80 + 330 * p) * DPR, h = (2 + 3 * p) * DPR;
    let g = ctx.createLinearGradient(x - L, y, x + L, y);
    g.addColorStop(0, 'rgba(180,210,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(180,210,255,0)');
    ctx.globalAlpha = .9 * I; ctx.fillStyle = g; ctx.fillRect(x - L, y - h / 2, 2 * L, h);
    const V = L * .3; g = ctx.createLinearGradient(x, y - V, x, y + V);
    g.addColorStop(0, 'rgba(180,210,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(180,210,255,0)');
    ctx.globalAlpha = .7 * I; ctx.fillStyle = g; ctx.fillRect(x - h * .4, y - V, h * .8, 2 * V);
    ctx.globalAlpha = Math.min(1, I * 1.3); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, (3 + 3 * p) * DPR, 0, 7); ctx.fill();
    ctx.restore();
    // panneau « attention » au-dessus du reflet
    const s = (15 + 4 * p) * DPR * (late && strobe < 1 ? 1.12 : 1), ty = y - R * .55 - 26 * DPR;
    ctx.save(); ctx.translate(x, ty);
    ctx.fillStyle = late ? '#ff4632' : '#ffb020'; ctx.strokeStyle = '#0a0c0a'; ctx.lineWidth = 2.5 * DPR; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 1.1, s * .8); ctx.lineTo(-s * 1.1, s * .8); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.fillStyle = '#0a0c0a'; ctx.fillRect(-s * .1, -s * .45, s * .2, s * .75); ctx.fillRect(-s * .1, s * .42, s * .2, s * .2);
    ctx.restore();
  }

  /* --- ravitaillements --- */
  function spawnCrate() {
    const { W, DPR } = view;
    crates.push({ x: rand(W * .15, W * .85), y: -70 * DPR, ph: rand(0, 6) });
    sound('ping');
  }
  function collectCrate(c) {
    const DPR = view.DPR; crates = crates.filter(o => o !== c);
    burst(c.x, c.y, 50, false, 260); flashes.push({ x: c.x, y: c.y, life: .35, max: .35 });
    signal = Math.min(100, signal + 35); espoir = Math.min(100, espoir + 10); repairCracks();
    popText(c.x, c.y - 30 * DPR, 'Signal +35', '#9fd0dc'); sound('pickup');
    objective('supply'); toast('Ravitaillement récupéré', 'Signal +35 · Espoir +10 · écran réparé', 'gold');
  }
  function drawCrate(c, t) {
    const { ctx, DPR } = view, k = DPR * 1.2, cy = -46 * k;
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(Math.sin(t * 1.6 + c.ph) * .12);
    ctx.strokeStyle = 'rgba(213,206,155,.6)'; ctx.lineWidth = DPR; ctx.beginPath();
    [-28, -10, 10, 28].forEach(px => { ctx.moveTo(px * k, cy); ctx.lineTo(Math.sign(px) * 7 * k, -9 * k); }); ctx.stroke();
    ctx.fillStyle = '#D5CE9B'; ctx.beginPath(); ctx.ellipse(0, cy, 30 * k, 17 * k, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8C5828'; ctx.beginPath(); ctx.ellipse(0, cy, 10 * k, 17 * k, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4a3016'; ctx.fillRect(-11 * k, -10 * k, 22 * k, 20 * k);
    ctx.strokeStyle = '#c27a3a'; ctx.lineWidth = 1.5 * DPR; ctx.strokeRect(-11 * k, -10 * k, 22 * k, 20 * k);
    ctx.strokeStyle = '#D5CE9B'; ctx.lineWidth = 1.6 * DPR; ctx.beginPath();
    ctx.moveTo(-8 * k, 0); ctx.lineTo(-3 * k, 0); ctx.lineTo(-1 * k, -5 * k); ctx.lineTo(1.5 * k, 5 * k); ctx.lineTo(3.5 * k, 0); ctx.lineTo(8 * k, 0); ctx.stroke();
    if (Math.sin(t * 7) > 0) { const g = ctx.createRadialGradient(0, 12 * k, 0, 0, 12 * k, 12 * k); g.addColorStop(0, 'rgba(159,208,220,.9)'); g.addColorStop(1, 'rgba(159,208,220,0)'); ctx.fillStyle = g; ctx.fillRect(-12 * k, 0, 24 * k, 24 * k); }
    ctx.restore();
  }

  /* --- le pigeon --- */
  function spawnPigeon() {
    const { W, H, DPR } = view, dir = Math.random() < .5 ? 1 : -1;
    pigeon = { x: dir > 0 ? -40 * DPR : W + 40 * DPR, y: rand(H * .18, H * .5), vx: rand(95, 130) * DPR * dir, dir, ph: rand(0, 6) };
    sound('coo');
  }
  function shootPigeon() {
    const { DPR } = view, p = pigeon; pigeon = null; streak = 0;
    for (let i = 0; i < 34; i++) feathers.push({ x: p.x, y: p.y, vx: rand(-90, 90) * DPR, vy: rand(-120, 20) * DPR, rot: rand(0, 6), vr: rand(-4, 4), life: rand(2.5, 4), c: Math.random() < .3 ? '#d9ddd6' : '#9aa09a' });
    espoir = Math.max(0, espoir - 25); score = Math.max(0, score - 300);
    popText(p.x, p.y - 26 * DPR, 'Espoir −25', '#ff8a70'); sound('sad');
    secret('cruelty');
    toast('Quelle cruauté.', espoir > 0 ? 'C’était peut-être le dernier pigeon de la ville. L’espoir s’effondre.' : 'Il ne reste plus rien à protéger.', 'alert');
    if (espoir <= 0) setTimeout(() => startEnding('hope'), 900);
  }
  function drawPigeon(p, t) {
    const { ctx, DPR } = view, k = DPR * 1.3, flap = Math.sin(t * 14 + p.ph);
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.dir, 1);
    ctx.fillStyle = '#6f746d'; ctx.beginPath(); ctx.moveTo(-9 * k, -1 * k); ctx.lineTo(-18 * k, -3 * k); ctx.lineTo(-17 * k, 3 * k); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8e938b'; ctx.beginPath(); ctx.ellipse(0, 0, 11 * k, 5 * k, -.1, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(110,160,130,.85)'; ctx.beginPath(); ctx.arc(8.5 * k, -1.5 * k, 2.8 * k, 0, 7); ctx.fill();
    ctx.fillStyle = '#7d8380'; ctx.beginPath(); ctx.arc(11.5 * k, -3 * k, 3.6 * k, 0, 7); ctx.fill();
    ctx.fillStyle = '#d9a066'; ctx.beginPath(); ctx.moveTo(14.8 * k, -3.2 * k); ctx.lineTo(17.5 * k, -2.5 * k); ctx.lineTo(14.8 * k, -2 * k); ctx.fill();
    ctx.fillStyle = '#ff7a3a'; ctx.fillRect(12.4 * k, -4.3 * k, 1.3 * k, 1.3 * k);
    ctx.fillStyle = '#a7aca4'; ctx.beginPath(); ctx.moveTo(-4 * k, -2 * k); ctx.lineTo(6 * k, -2 * k); ctx.lineTo(-3 * k, (-2 - 14 * flap) * k); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /* --- black-out --- */
  function startBlackout() {
    if (view.dark || ending) return;
    hero.classList.add('flicker'); sound('powerdown'); MUSIC.duck();
    setTimeout(() => {
      hero.classList.remove('flicker');
      view.dark = true; view.rebuild && view.rebuild();
      hero.classList.add('blackout'); document.body.classList.add('blackout');
      blackoutT = 25; if (hud.bo) hud.bo.hidden = false;
      snipers.forEach(z => popText(z.lx + (view.lox[2] || 0), z.ly + (view.loy[2] || 0) - 26 * view.DPR, 'cible perdue', '#A9B0A6')); snipers = [];
      bigBanner('Black-out', 'Coupure de courant · drones aveugles · points ×2', '#ff4632', 3);
    }, 700);
  }
  function endBlackout(silent) {
    if (!view.dark) return;
    view.dark = false; blackoutT = 0; view.deadBeams.clear(); view.rebuild && view.rebuild();
    hero.classList.remove('blackout'); document.body.classList.remove('blackout');
    if (hud.bo) hud.bo.hidden = true;
    if (!silent) { sound('powerup'); toast('Courant rétabli', 'Les projecteurs de l’Ordre ont été réparés.'); }
    if (!boss) MUSIC.restore();
  }

  /* --- la fin : l'hélicoptère --- */
  function startEnding(reason) {
    if (ending) return;
    if (view.dark) endBlackout(true);
    sirenStop(); radioBedStop(); try { speechSynthesis.cancel(); } catch (e) {}
    if (boss) { boss = null; hud.boss.hidden = true; }
    snipers = []; crates = []; bolts = [];
    drones.forEach(d => { d.diving = false; d.vx = (d.x < view.W / 2 ? -1 : 1) * 420 * view.DPR; d.vy = -60 * view.DPR; });
    ending = { reason, t: 0, h: { x: view.W * 1.2, y: view.H * .16, s: .35, tilt: -.15, zoom: 1, alpha: 1 } };
    rotorStart(); MUSIC.fade(); togglePanel(false); hero.classList.add('ending-on');
    bigBanner('Intervention', reason === 'hope' ? 'Il ne reste plus rien à protéger.' : 'Vous êtes allé trop loin. L’Ordre envoie ses troupes.', '#ff4632', 3);
  }
  function showEnding() {
    const el = hud.end; if (!el) return;
    secret('ending'); STORE.set('endings', STORE.get('endings', 0) + 1);
    const sub = ending.reason === 'hope' ? 'Vous avez abattu le dernier symbole de paix.' : 'L’Ordre ne perd jamais. Pas contre un homme seul.';
    el.innerHTML = `<div class="end-in">
      <p class="end-tag">Transmission interrompue</p>
      <h2 class="glitch" data-text="Il n’y a aucun espoir.">Il n’y a aucun espoir.</h2>
      <p class="end-sub">${sub}</p>
      <p class="end-stats">Vague ${wave} · Score ${String(score).padStart(6, '0')} · ${STORE.get('kills', 0)} drones abattus</p>
      <button class="btn end-restart" type="button">Recommencer la mission</button>
      <p class="end-note">Dans Nomade, la résistance ne se gagne jamais seul.</p></div>`;
    el.hidden = false; hero.classList.add('end-shown'); requestAnimationFrame(() => el.classList.add('show'));
    $('.end-restart', el).addEventListener('click', () => {
      el.classList.remove('show'); setTimeout(() => { el.hidden = true; }, 600);
      ending = null; hero.classList.remove('ending-on', 'end-shown'); repairCracks(); restart();
    });
  }
  function updateEnding(dt, t) {
    const E = ending, h = E.h, { W, H, DPR } = view, base = Math.min(1.5, Math.max(.75, W / DPR / 1100));
    E.t += dt; E.laser = null;
    if (E.t < 3.4) {
      const p = E.t / 3.4, e = 1 - Math.pow(1 - p, 3);
      h.x = W * 1.2 + (W * .52 - W * 1.2) * e; h.y = H * .16 + (H * .38 - H * .16) * e; h.s = (.35 + 1.3 * e) * base; h.tilt = -.14 * (1 - e) + Math.sin(E.t * 2) * .02;
      h.zoom = 1; h.alpha = 1;
    } else {
      h.x = W * .52 + Math.sin(E.t * 1.3) * 6 * DPR; h.y = H * .38 + Math.sin(E.t * 2.1) * 5 * DPR;
      const z = Math.min(1, (E.t - 3.4) / .55); h.zoom = 1 + z * z * 5; h.alpha = 1 - Math.max(0, (E.t - 3.75) / .2);
    }
    if (h.alpha > 0) drawHeli(h, t);
    const ca = Math.max(0, Math.min(1, (E.t - 3.6) / .35));
    if (ca > 0 && !E.shown) drawCloseup(ca, t, E);
    if (!E.said && E.t > 4.4) { E.said = 1; megaphone('Target acquired.', 'en-US', .4); }
    if (!E.fired && E.t > 6.4) {
      E.fired = E.t; view.white = 1; view.shake = 1.8;
      crack(W / DPR / 2, H / DPR / 2, true); setTimeout(() => crack(W / DPR * .34, H / DPR * .6, false), 90);
      sound('sniper'); sound('glass'); setTimeout(rotorStop, 600);
    }
    if (E.fired && !E.shown && E.t > 7.2) { E.shown = 1; showEnding(); }
    if (E.shown && !E.said2 && E.t > 8.6) { E.said2 = 1; megaphone('Threat neutralized.', 'en-US', .4); }
  }

  /* Gros plan : le soldat dans l'embrasure, en contre-jour, fusil braqué sur la caméra */
  function drawCloseup(alpha, t, E) {
    const { ctx, W, H, DPR } = view, u = Math.min(H / 360, W / 330);
    const ox = W * .6 + Math.sin(t * 1.1) * 2.5 * u, oy = H * .7 + Math.sin(t * 1.7) * 1.5 * u;
    const P = (x, y) => [ox + x * u, oy + y * u];
    const rotor = .82 + .18 * Math.max(0, Math.sin(t * 25));
    ctx.save(); ctx.globalAlpha = alpha;
    // coque de l'hélicoptère + embrasure éclairée en rouge
    const hull = ctx.createLinearGradient(0, 0, W, H); hull.addColorStop(0, '#1a1e1b'); hull.addColorStop(1, '#070807');
    ctx.fillStyle = hull; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(169,176,166,.08)'; ctx.lineWidth = DPR;
    for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(0, H * i / 8); ctx.lineTo(W, H * i / 8 + 10 * DPR); ctx.stroke(); }
    const dx0 = W * .14, dy0 = H * .1, dx1 = W * .97;
    const cab = ctx.createRadialGradient(W * .85, H * .18, 0, W * .85, H * .18, W * .8);
    cab.addColorStop(0, `rgba(190,34,20,${rotor})`); cab.addColorStop(.35, `rgba(95,14,8,${rotor})`); cab.addColorStop(1, 'rgba(14,3,2,1)');
    ctx.fillStyle = cab; ctx.fillRect(dx0, dy0, dx1 - dx0, H);
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    for (let i = 0; i < 6; i++) ctx.fillRect(dx0 + (dx1 - dx0) * (.08 + i * .16), dy0, 3 * DPR, H * .35);
    ctx.fillStyle = '#0b0d0b'; ctx.fillRect(dx0 - 18 * DPR, dy0 - 18 * DPR, 22 * DPR, H); ctx.fillRect(dx0 - 18 * DPR, dy0 - 18 * DPR, dx1 - dx0 + 36 * DPR, 22 * DPR);
    ctx.fillStyle = 'rgba(213,206,155,.12)'; ctx.fillRect(dx0 + 2 * DPR, dy0 + 4 * DPR, 2 * DPR, H);
    // ombre du rotor qui balaie la scène
    const sw = ((t * 1.6) % 1) * (W * 1.6) - W * .3;
    const rs = ctx.createLinearGradient(sw - W * .15, 0, sw + W * .15, 0);
    rs.addColorStop(0, 'rgba(0,0,0,0)'); rs.addColorStop(.5, 'rgba(0,0,0,.35)'); rs.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rs; ctx.fillRect(0, 0, W, H);

    // soldat vu de face, en contre-jour rouge, fusil braqué sur la caméra
    const v = Math.min(H / 320, W / 360), cx = W * .56 + Math.sin(t * 1.1) * 2.5 * v, cy = H * .44 + Math.sin(t * 1.7) * 1.8 * v;
    const Q = (x, y) => [cx + x * v, cy + y * v];
    const rim = `rgba(255,58,36,${.8 * rotor})`;
    const part = (fill, draw, blur = 16) => {
      ctx.save(); ctx.shadowColor = rim; ctx.shadowBlur = blur * v; ctx.shadowOffsetX = 2.5 * v; ctx.shadowOffsetY = -2 * v;
      ctx.fillStyle = fill; ctx.beginPath(); draw(); ctx.fill(); ctx.restore();
    };
    const ell = (x, y, rx, ry, a0 = 0, a1 = Math.PI * 2) => { const [X, Y] = Q(x, y); ctx.ellipse(X, Y, rx * v, ry * v, 0, a0, a1); };
    const rect = (x, y, w, h) => { const [X, Y] = Q(x, y); ctx.rect(X, Y, w * v, h * v); };
    const grad = (y0, y1, c0, c1) => { const g = ctx.createLinearGradient(0, cy + y0 * v, 0, cy + y1 * v); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; };
    // buste et épaules
    part(grad(20, 200, '#0b0d0b', '#030403'), () => {
      ctx.moveTo(...Q(-175, 210)); ctx.lineTo(...Q(-168, 82)); ctx.quadraticCurveTo(...Q(-150, 34), ...Q(-92, 28)); ctx.lineTo(...Q(-34, 22));
      ctx.lineTo(...Q(34, 22)); ctx.lineTo(...Q(92, 28)); ctx.quadraticCurveTo(...Q(150, 34), ...Q(168, 82)); ctx.lineTo(...Q(175, 210)); ctx.closePath();
    }, 24);
    // gilet porte-plaques et poches
    ctx.fillStyle = '#0d100d'; ctx.beginPath(); rect(-78, 62, 156, 150); ctx.fill();
    ctx.strokeStyle = 'rgba(255,80,55,.16)'; ctx.lineWidth = 1.2 * DPR;
    [-74, -24, 26].forEach(x => { ctx.beginPath(); rect(x, 92, 46, 40); ctx.stroke(); ctx.beginPath(); rect(x, 92, 46, 9); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(...Q(-120, 40)); ctx.lineTo(...Q(-70, 66)); ctx.moveTo(...Q(120, 40)); ctx.lineTo(...Q(70, 66)); ctx.stroke();
    // tête, oreillettes
    part('#060706', () => ell(0, -6, 35, 44));
    part('#0b0d0b', () => { ell(-41, -2, 14, 17); }); part('#0b0d0b', () => { ell(41, -2, 14, 17); });
    // casque
    part(grad(-82, -10, '#1a1e1b', '#050605'), () => {
      ell(0, -30, 54, 50, Math.PI, Math.PI * 2); ctx.lineTo(...Q(54, -12)); ctx.lineTo(...Q(42, -8)); ctx.lineTo(...Q(-42, -8)); ctx.lineTo(...Q(-54, -12)); ctx.closePath();
    }, 20);
    ctx.fillStyle = '#0a0c0a'; ctx.beginPath(); rect(-57, -34, 9, 18); rect(48, -34, 9, 18); ctx.fill();
    ctx.strokeStyle = 'rgba(255,110,80,.4)'; ctx.lineWidth = 2 * DPR; ctx.beginPath(); ell(0, -30, 54, 50, -1.25, -.25); ctx.stroke();
    // jumelles de vision nocturne relevées
    ctx.fillStyle = '#080a08'; ctx.beginPath(); rect(-9, -86, 18, 12); ctx.fill();
    part('#0a0c0a', () => { rect(-27, -114, 54, 30); });
    [-13, 13].forEach(x => {
      ctx.fillStyle = '#020302'; ctx.beginPath(); ell(x, -99, 10, 10); ctx.fill();
      const [X, Y] = Q(x - 3, -102), gl = ctx.createRadialGradient(X, Y, 0, X, Y, 8 * v);
      gl.addColorStop(0, 'rgba(255,120,90,.6)'); gl.addColorStop(1, 'rgba(60,10,8,0)'); ctx.fillStyle = gl; ctx.beginPath(); ell(x, -99, 8, 8); ctx.fill();
    });
    // bras d'appui
    ctx.save(); ctx.shadowColor = rim; ctx.shadowBlur = 16 * v; ctx.strokeStyle = '#070807'; ctx.lineCap = 'round'; ctx.lineWidth = 44 * v;
    ctx.beginPath(); ctx.moveTo(...Q(-18, 62)); ctx.quadraticCurveTo(...Q(30, 120), ...Q(92, 180)); ctx.stroke(); ctx.restore();
    // garde-main en raccourci + rail
    part('#0b0d0b', () => { ctx.moveTo(...Q(-40, 14)); ctx.lineTo(...Q(-2, 14)); ctx.lineTo(...Q(4, 54)); ctx.lineTo(...Q(-46, 54)); ctx.closePath(); });
    // lunette devant l'œil droit
    part('#080a08', () => { ctx.moveTo(...Q(-26, 8)); ctx.lineTo(...Q(-8, 8)); ctx.lineTo(...Q(-6, 20)); ctx.lineTo(...Q(-28, 20)); ctx.closePath(); });
    part('#050605', () => ell(-17, -8, 22, 22), 22);
    { const [X, Y] = Q(-17, -8), lens = ctx.createRadialGradient(X - 5 * v, Y - 6 * v, 0, X, Y, 16 * v);
      lens.addColorStop(0, 'rgba(170,200,255,.6)'); lens.addColorStop(.45, 'rgba(45,60,110,.65)'); lens.addColorStop(1, 'rgba(4,6,16,.95)');
      ctx.fillStyle = lens; ctx.beginPath(); ell(-17, -8, 16, 16); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.6 * DPR; ctx.beginPath(); ell(-17, -8, 11, 11, 3.6, 4.7); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,90,60,.5)'; ctx.beginPath(); ell(-17, -8, 22, 22, -1.4, .1); ctx.stroke(); }
    // module laser
    ctx.fillStyle = '#0c0e0c'; ctx.beginPath(); rect(4, 22, 17, 20); ctx.fill();
    const [lex, ley] = Q(12.5, 32);
    // main gantée sous le garde-main
    part('#080a08', () => { ell(-20, 62, 32, 15); });
    ctx.strokeStyle = 'rgba(255,80,55,.22)'; ctx.lineWidth = 1.2 * DPR;
    [-38, -27, -16, -5].forEach(x => { ctx.beginPath(); ell(x, 54, 6, 7, Math.PI, Math.PI * 2); ctx.stroke(); });
    // bouche du canon, de face
    part('#0e100e', () => ell(-21, 38, 22, 22), 18);
    const [mx, my] = Q(-21, 38);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .2; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(mx + Math.cos(a) * 14 * v, my + Math.sin(a) * 14 * v, 2.6 * v, 2.6 * v, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(mx, my, 7.5 * v, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,100,70,.5)'; ctx.lineWidth = 1.6 * DPR; ctx.beginPath(); ctx.arc(mx, my, 22 * v, -1.9, .1); ctx.stroke();
    const aim = Math.max(0, Math.min(1, (E.t - 4.6) / 1.7));
    if (aim > 0 && !E.fired) {
      E.laser = { x: lex, y: ley, a: aim };
      ctx.fillStyle = `rgba(255,60,40,${aim})`; ctx.beginPath(); ctx.arc(lex, ley, 3 * v, 0, 7); ctx.fill();
    }
    // flash de bouche
    if (E.fired && E.t - E.fired < .16) {
      const f = 1 - (E.t - E.fired) / .16, R = 150 * v * (.6 + .4 * f);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, R);
      g.addColorStop(0, `rgba(255,255,240,${f})`); g.addColorStop(.25, `rgba(255,210,120,${.9 * f})`); g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mx, my, R, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(255,235,180,${f})`;
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2 + .3; ctx.beginPath(); ctx.moveTo(mx + Math.cos(a - .12) * 14 * v, my + Math.sin(a - .12) * 14 * v);
        ctx.lineTo(mx + Math.cos(a) * R * 1.3, my + Math.sin(a) * R * 1.3); ctx.lineTo(mx + Math.cos(a + .12) * 14 * v, my + Math.sin(a + .12) * 14 * v); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawHeli(h, t) {
    const { ctx, W, H, DPR } = view, k = DPR * h.s * h.zoom * .55;
    // éblouissement du projecteur + reflets d'objectif vers le centre de l'écran
    const lx = h.x - 55 * k, ly = h.y + 14 * k, glare = Math.min(1, h.s / 1.4) * h.alpha;
    ctx.save(); ctx.globalAlpha = h.alpha; ctx.translate(h.x, h.y); ctx.rotate(h.tilt); ctx.scale(-1, 1);
    ctx.fillStyle = '#060706';
    ctx.beginPath();
    ctx.moveTo(70 * k, -6 * k); ctx.bezierCurveTo(72 * k, -20 * k, 55 * k, -30 * k, 35 * k, -30 * k); ctx.lineTo(0, -32 * k); ctx.lineTo(-30 * k, -30 * k);
    ctx.lineTo(-45 * k, -22 * k); ctx.lineTo(-62 * k, -12 * k); ctx.lineTo(-150 * k, -10 * k); ctx.lineTo(-166 * k, -40 * k); ctx.lineTo(-176 * k, -40 * k);
    ctx.lineTo(-169 * k, -6 * k); ctx.lineTo(-150 * k, -2 * k); ctx.lineTo(-62 * k, 4 * k); ctx.lineTo(-40 * k, 16 * k); ctx.lineTo(40 * k, 18 * k);
    ctx.bezierCurveTo(60 * k, 16 * k, 70 * k, 8 * k, 70 * k, -6 * k); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-22 * k, -32 * k); ctx.lineTo(26 * k, -32 * k); ctx.lineTo(20 * k, -41 * k); ctx.lineTo(-16 * k, -41 * k); ctx.closePath(); ctx.fill();
    ctx.fillRect(-2 * k, -48 * k, 4 * k, 8 * k);
    ctx.fillStyle = 'rgba(127,184,200,.16)'; ctx.beginPath(); ctx.moveTo(63 * k, -8 * k); ctx.bezierCurveTo(61 * k, -22 * k, 49 * k, -27 * k, 37 * k, -27 * k); ctx.lineTo(31 * k, -27 * k); ctx.lineTo(31 * k, -6 * k); ctx.closePath(); ctx.fill();
    const rl = .7 + .3 * Math.sin(t * 25);
    ctx.fillStyle = `rgba(150,22,12,${rl})`; ctx.fillRect(-26 * k, -24 * k, 34 * k, 34 * k);
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-10 * k, -12 * k, 5 * k, 0, 7); ctx.fill(); ctx.fillRect(-17 * k, -7 * k, 14 * k, 17 * k);
    ctx.strokeStyle = '#060706'; ctx.lineWidth = 2.5 * k; ctx.beginPath();
    ctx.moveTo(32 * k, 16 * k); ctx.lineTo(36 * k, 25 * k); ctx.moveTo(-30 * k, 16 * k); ctx.lineTo(-34 * k, 25 * k); ctx.stroke();
    ctx.fillStyle = '#060706'; ctx.beginPath(); ctx.arc(36 * k, 26 * k, 4 * k, 0, 7); ctx.arc(-34 * k, 26 * k, 4 * k, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(169,176,166,${.14 + .08 * Math.sin(t * 40)})`; ctx.beginPath(); ctx.ellipse(0, -49 * k, 175 * k, 3.5 * k, 0, 0, 7); ctx.fill();
    const bx = Math.cos(t * 28) * 175 * k; ctx.strokeStyle = 'rgba(6,7,6,.9)'; ctx.lineWidth = 2.2 * k;
    ctx.beginPath(); ctx.moveTo(-bx, -49 * k); ctx.lineTo(bx, -49 * k); ctx.stroke();
    ctx.fillStyle = 'rgba(169,176,166,.3)'; ctx.beginPath(); ctx.ellipse(-171 * k, -22 * k, 2.2 * k, Math.max(.5, 15 * k * Math.abs(Math.sin(t * 45))), 0, 0, 7); ctx.fill();
    if (Math.sin(t * 6) > .6) { ctx.fillStyle = '#ff4632'; ctx.beginPath(); ctx.arc(-172 * k, -40 * k, 2.5 * k, 0, 7); ctx.fill(); }
    if (Math.sin(t * 9) > .85) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 20 * k, 2.5 * k, 0, 7); ctx.fill(); }
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const R = 90 * k + 40 * DPR;
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, R);
    g.addColorStop(0, `rgba(255,252,235,${glare})`); g.addColorStop(.1, `rgba(255,245,215,${.7 * glare})`); g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, R, 0, 7); ctx.fill();
    const sL = W * .4 * glare, sg = ctx.createLinearGradient(lx - sL, ly, lx + sL, ly);
    sg.addColorStop(0, 'rgba(170,205,255,0)'); sg.addColorStop(.5, `rgba(220,235,255,${.6 * glare})`); sg.addColorStop(1, 'rgba(170,205,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(lx - sL, ly - 1.5 * DPR, sL * 2, 3 * DPR);
    [[.35, 22, '120,200,255'], [.7, 12, '255,170,90'], [1.25, 40, '140,255,180'], [1.6, 18, '255,120,120']].forEach(([f, r, c]) => {
      const gx = lx + (W / 2 - lx) * f * 2, gy = ly + (H / 2 - ly) * f * 2;
      ctx.fillStyle = `rgba(${c},${.07 * glare})`; ctx.beginPath(); ctx.arc(gx, gy, r * DPR, 0, 7); ctx.fill();
    });
    ctx.restore();
  }

  /* --- mise à jour des nouvelles entités --- */
  function updateExtras(dt, t) {
    const { W, H, DPR } = view;
    snipers.forEach(z => {
      z.t += dt; z.beepT -= dt;
      const p = z.t / z.dur;
      if (z.beepT <= 0) { sound('beep'); z.beepT = Math.max(.08, .7 - p * .62); }
      drawSniper(z, t);
    });
    snipers = snipers.filter(z => { if (z.t >= z.dur) { sniperFire(z); return false; } return true; });
    crates.forEach(c => { c.y += 42 * DPR * dt; c.x += Math.sin(t * .9 + c.ph) * 12 * DPR * dt; drawCrate(c, t); });
    crates = crates.filter(c => { if (c.y > H - 30 * DPR) { toast('Ravitaillement perdu', 'Il s’est écrasé dans les ruines.'); return false; } return true; });
    if (pigeon) {
      pigeon.x += pigeon.vx * dt; pigeon.y += Math.sin(t * 3 + pigeon.ph) * 18 * DPR * dt;
      drawPigeon(pigeon, t);
      if (pigeon.x < -60 * DPR || pigeon.x > W + 60 * DPR) pigeon = null;
    }
    const { ctx } = view;
    feathers = feathers.filter(f => (f.life -= dt) > 0 && f.y < H + 20);
    feathers.forEach(f => {
      f.vy += (30 * DPR - f.vy) * dt * 1.5; f.vx *= .985; f.x += (f.vx + Math.sin(t * 3 + f.rot) * 22 * DPR) * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.globalAlpha = Math.min(1, f.life);
      ctx.fillStyle = f.c; ctx.beginPath(); ctx.ellipse(0, 0, 4.5 * DPR, 1.4 * DPR, 0, 0, 7); ctx.fill(); ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  /* --- dessin --- */
  function drawDrone(d, t) {
    const { ctx, H, DPR } = view, k = DPR * d.k;
    ctx.save(); ctx.translate(d.x, d.y);
    ctx.rotate(d.diving ? Math.max(-.7, Math.min(.7, d.vx / (300 * DPR))) : .06 * d.dir);
    if (!d.diving && !view.dark && (d.type === 'scout' || d.type === 'armored')) {
      ctx.drawImage(coneSprite(), -60 * k, 3 * k, 120 * k, H * .45);
    }
    if (d.diving) {
      ctx.globalAlpha = .55; ctx.drawImage(glowSprite('255,70,50'), -30 * k, -30 * k, 60 * k, 60 * k); ctx.globalAlpha = 1;
    }
    const body = d.type === 'courier' ? '#2b220e' : d.type === 'armored' ? '#1b201c' : '#0a0c0a';
    ctx.fillStyle = d.hitT > 0 ? '#fff4e0' : body;
    ctx.beginPath(); ctx.moveTo(-9 * k, -2 * k); ctx.lineTo(9 * k, -2 * k); ctx.lineTo(6 * k, 4 * k); ctx.lineTo(-6 * k, 4 * k); ctx.closePath(); ctx.fill();
    ctx.fillRect(-16 * k, -4 * k, 32 * k, 1.6 * k);
    ctx.fillRect(-15 * k, -6 * k, 1.4 * k, 4 * k); ctx.fillRect(13.6 * k, -6 * k, 1.4 * k, 4 * k);
    if (d.type === 'armored') { ctx.fillStyle = d.hitT > 0 ? '#fff4e0' : '#424D49'; ctx.fillRect(-11 * k, -3 * k, 22 * k, 2 * k); ctx.fillRect(-7 * k, 2 * k, 14 * k, 2.2 * k); }
    ctx.fillStyle = 'rgba(169,176,166,.35)';
    const sp = Math.abs(Math.sin(t * 40 + d.ph)) * 7 * k;
    ctx.fillRect(-14.3 * k - sp, -6.6 * k, sp * 2, .9 * k); ctx.fillRect(14.3 * k - sp, -6.6 * k, sp * 2, .9 * k);
    const eye = d.type === 'courier' ? '255,210,122' : '255,70,50';
    const er = (d.type === 'courier' ? 12 : 8) * k;
    ctx.globalAlpha = Math.sin(t * 10 + d.ph) > 0 || d.diving ? .95 : .5; ctx.drawImage(glowSprite(eye), -er, 3.5 * k - er, er * 2, er * 2); ctx.globalAlpha = 1;
    ctx.restore();
    if (d.type === 'armored') for (let i = 0; i < d.max; i++) {
      ctx.fillStyle = i < d.hp ? '#ff4632' : 'rgba(169,176,166,.3)';
      ctx.fillRect(d.x - 16 * DPR + i * 12 * DPR, d.y - 26 * DPR, 9 * DPR, 3 * DPR);
    }
  }
  function drawBolt(b, t) {
    const { ctx, DPR } = view, R = 18 * DPR;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, R);
    g.addColorStop(0, 'rgba(255,230,200,1)'); g.addColorStop(.25, 'rgba(255,70,50,.9)'); g.addColorStop(1, 'rgba(255,70,50,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, R * (1 + .15 * Math.sin(t * 20 + b.ph)), 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,70,50,.35)'; ctx.lineWidth = 4 * DPR; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * .25, b.y - b.vy * .25); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }
  function drawBoss(B, t) {
    const { ctx, H, DPR } = view, s = B.s * DPR;
    ctx.save(); ctx.translate(B.x, B.y); ctx.scale(s, s);
    if (B.state === 'dying') ctx.rotate(Math.min(.25, B.dying * .14));
    // faisceau de l'œil
    if (B.state !== 'dying') {
      const ang = Math.PI / 2 + Math.sin(B.t * .8) * .45, len = H / s;
      const cg = ctx.createLinearGradient(0, 38, Math.cos(ang) * len, 38 + Math.sin(ang) * len);
      cg.addColorStop(0, 'rgba(255,70,50,.28)'); cg.addColorStop(1, 'rgba(255,70,50,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(0, 38);
      ctx.lineTo(Math.cos(ang - .09) * len, 38 + Math.sin(ang - .09) * len); ctx.lineTo(Math.cos(ang + .09) * len, 38 + Math.sin(ang + .09) * len); ctx.fill();
    }
    // empennage
    ctx.fillStyle = '#0d100d';
    ctx.beginPath(); ctx.moveTo(-140, -10); ctx.lineTo(-200, -62); ctx.lineTo(-176, -8); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-140, 10); ctx.lineTo(-200, 58); ctx.lineTo(-176, 8); ctx.closePath(); ctx.fill();
    // coque
    const hull = ctx.createLinearGradient(0, -46, 0, 46);
    hull.addColorStop(0, '#4a524b'); hull.addColorStop(.35, '#262c27'); hull.addColorStop(1, '#090b09');
    ctx.fillStyle = hull; ctx.beginPath(); ctx.ellipse(0, 0, 172, 46, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(169,176,166,.14)'; ctx.lineWidth = 1.2;
    for (let i = -4; i <= 4; i++) { const xx = i * 36, hh = 46 * Math.sqrt(Math.max(0, 1 - (xx / 172) ** 2)); ctx.beginPath(); ctx.ellipse(xx, 0, 5, hh, 0, 0, 7); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(213,206,155,.25)'; ctx.beginPath(); ctx.ellipse(0, -2, 168, 42, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    // écran de propagande
    ctx.fillStyle = '#0b0906'; ctx.fillRect(-88, -20, 116, 30);
    ctx.strokeStyle = 'rgba(194,122,58,.6)'; ctx.strokeRect(-88, -20, 116, 30);
    ctx.font = '900 19px "Big Shoulders Display", Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const words = ['OBÉIR', "L'ORDRE VEILLE", 'PAIX = ORDRE'];
    ctx.fillStyle = Math.random() < .04 ? '#7fb8c8' : '#ff6a3a';
    ctx.fillText(words[Math.floor(B.t / 1.6) % 3], -30, -4);
    // nacelle + moteurs
    ctx.fillStyle = '#0a0c0a'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-52, 26, 104, 22, 6) : ctx.rect(-52, 26, 104, 22); ctx.fill();
    for (let i = -3; i <= 3; i++) if (i) { ctx.fillStyle = Math.sin(t * 3 + i) > -.3 ? 'rgba(213,206,155,.85)' : 'rgba(213,206,155,.2)'; ctx.fillRect(i * 13 - 3, 32, 6, 5); }
    [-118, 118].forEach(ex => {
      ctx.fillStyle = '#0a0c0a'; ctx.fillRect(ex - 14, 22, 28, 10);
      ctx.fillStyle = 'rgba(169,176,166,.3)'; const w = Math.abs(Math.sin(t * 30)) * 22; ctx.fillRect(ex - w, 33, w * 2, 2);
    });
    // feux de position
    [[-172, 0], [172, 0], [0, -46]].forEach(([lx, ly], i) => { if (Math.sin(t * 4 + i * 2) > .3) { ctx.fillStyle = '#ff4632'; ctx.beginPath(); ctx.arc(lx, ly, 3, 0, 7); ctx.fill(); } });
    // œil (point faible)
    const pulse = .7 + .3 * Math.sin(t * 6);
    const eg = ctx.createRadialGradient(0, 38, 0, 0, 38, 26);
    eg.addColorStop(0, `rgba(255,235,210,${pulse})`); eg.addColorStop(.25, `rgba(255,70,50,${pulse})`); eg.addColorStop(1, 'rgba(255,70,50,0)');
    ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(0, 38, 26, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,70,50,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 38, 13 + 3 * Math.sin(t * 6), 0, 7); ctx.stroke();
    // flash d'impact + feu quand elle tombe
    if (B.hitT > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,240,220,.35)'; ctx.beginPath(); ctx.ellipse(0, 0, 172, 46, 0, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    if (B.hp < B.max / 2 && Math.random() < .5) { ctx.fillStyle = `rgba(255,${rand(90, 180) | 0},40,.8)`; ctx.beginPath(); ctx.arc(rand(-120, 120), rand(-30, 10), rand(3, 8), 0, 7); ctx.fill(); }
    ctx.restore();
  }
  function drawFx(dt) {
    const { ctx, DPR } = view;
    ctx.globalCompositeOperation = 'lighter';
    shots = shots.filter(s => (s.life -= dt) > 0);
    shots.forEach(s => {
      const a = s.life / s.max, c = resist ? '255,120,60' : '255,215,150';
      const g = ctx.createLinearGradient(s.ox, s.oy, s.x, s.y);
      g.addColorStop(0, `rgba(${c},0)`); g.addColorStop(.7, `rgba(${c},${.5 * a})`); g.addColorStop(1, `rgba(255,240,200,${a})`);
      ctx.strokeStyle = g; ctx.lineWidth = 2.2 * DPR; ctx.beginPath(); ctx.moveTo(s.ox, s.oy); ctx.lineTo(s.x, s.y); ctx.stroke();
    });
    flashes = flashes.filter(f => (f.life -= dt) > 0);
    flashes.forEach(f => {
      const p = 1 - f.life / f.max, R = (f.big ? 140 * (f.s || 1) : 26) * DPR * (.3 + p);
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, R);
      g.addColorStop(0, `rgba(255,235,190,${(1 - p) * .95})`); g.addColorStop(.35, `rgba(255,140,50,${(1 - p) * .6})`); g.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, R, 0, 7); ctx.fill();
      if (f.big) { ctx.strokeStyle = `rgba(255,220,170,${(1 - p) * .6})`; ctx.lineWidth = 2 * DPR; ctx.beginPath(); ctx.arc(f.x, f.y, R * 1.3, 0, 7); ctx.stroke(); }
    });
    sparks = sparks.filter(p => (p.life -= dt) > 0);
    sparks.forEach(p => {
      p.vy += 260 * DPR * dt; p.vx *= .985; p.x += p.vx * dt; p.y += p.vy * dt;
      const a = p.life / p.max;
      ctx.strokeStyle = p.hot ? `rgba(255,${120 + 120 * a | 0},60,${a})` : `rgba(255,230,180,${a})`;
      ctx.lineWidth = p.s; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * .03, p.y - p.vy * .03); ctx.stroke();
    });
    ctx.globalCompositeOperation = 'source-over';
    smoke = smoke.filter(p => (p.life -= dt) > 0);
    smoke.forEach(p => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.r += 14 * DPR * dt; p.vx *= .98;
      ctx.globalAlpha = p.life / p.max; ctx.drawImage(smokeSprite(), p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); ctx.globalAlpha = 1;
    });
    debris = debris.filter(d => (d.life -= dt) > 0 && d.y < view.H + 40);
    debris.forEach(d => {
      d.vy += 420 * DPR * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt;
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot); ctx.fillStyle = '#0a0c0a'; ctx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h);
      ctx.fillStyle = 'rgba(255,120,40,.8)'; ctx.fillRect(-d.w / 2, -d.h / 2, Math.min(d.w, 1.5 * DPR), d.h); ctx.restore();
    });
  }

  /* --- entrées : souris, tactile, clavier --- */
  let px = 0, py = 0, auto = null;
  hero.addEventListener('pointermove', e => {
    px = e.clientX; py = e.clientY;
    const r = hero.getBoundingClientRect(); hero.style.setProperty('--fx', (px - r.left) + 'px'); hero.style.setProperty('--fy', (py - r.top) + 'px');
  }, { passive: true });
  hero.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('a, button, .mission, .ending')) return;
    px = e.clientX; py = e.clientY;
    if (e.target.closest('.hero-logo')) {
      logoHits++;
      hud.logo.classList.remove('hit'); void hud.logo.offsetWidth; hud.logo.classList.add('hit');
      if (logoHits === 7) {
        secret('pacifist'); hud.logo.classList.add('reborn');
        bigBanner('La paix ne se brise pas', 'Elle se reconstruit.', '#D5CE9B', 3.2);
        setTimeout(() => hud.logo.classList.remove('reborn'), 4000); logoHits = 0;
      }
    }
    shoot(px, py);
    if (resist) { clearInterval(auto); auto = setInterval(() => shoot(px, py), 95); }
  });
  const stop = () => { clearInterval(auto); auto = null; };
  addEventListener('pointerup', stop); hero.addEventListener('pointerleave', stop); addEventListener('blur', stop);

  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let kpos = 0, typed = '';
  addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input, textarea')) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    kpos = k === KONAMI[kpos] ? kpos + 1 : (k === KONAMI[0] ? 1 : 0);
    if (kpos === KONAMI.length) {
      kpos = 0; resist = true; secret('konami');
      bigBanner('Mode Résistance', 'Tir automatique : maintenez le clic dans le décor', '#c27a3a', 3);
    }
    if (k.length === 1) {
      typed = (typed + k).slice(-6);
      if (typed === 'nomade') {
        typed = ''; const on = view.canvas.classList.toggle('nv');
        if (on) secret('nightvision'); else toast('Vision nocturne coupée');
      }
    }
  });

  updateHud();
  if (!STORE.get('seenGame')) setTimeout(() => toast('Opération Nomade', 'Cliquez dans le décor pour abattre les drones. Ouvrez « Mission » pour vos objectifs.'), 4200);
  STORE.set('seenGame', 1);

  return {
    rescale(fx, fy) {
      const f = (o, k = ['x', 'y']) => { if (o) { o.x *= fx; o.y *= fy; if ('vx' in o) o.vx *= fx; if ('vy' in o) o.vy *= fy; } };
      drones.forEach(d => f(d)); bolts.forEach(b => f(b)); crates.forEach(c => f(c)); f(pigeon);
      snipers.forEach(z => { z.lx *= fx; z.ly *= fy; z.tx *= fx; z.ty *= fy; });
      if (boss) { boss.x *= fx; boss.y *= fy; boss.ty *= fy; }
      if (ending) { ending.h.x *= fx; ending.h.y *= fy; }
      sparks = []; smoke = []; debris = []; flashes = []; shots = []; texts = []; feathers = [];
    },
    update(dt, t) {
      const { W, H, DPR } = view;
      if (over > 0) { over -= dt; if (over <= 0) restart(); }
      if (blackoutT > 0) { blackoutT -= dt; if (hud.bo) hud.bo.textContent = `Alimentation de secours · ${Math.ceil(blackoutT)} s`; if (blackoutT <= 0) endBlackout(); }
      const bossWave = wave % 4 === 0;
      if (over <= 0 && !ending) {
        if (wave >= 2 && !view.dark && !(boss && boss.state === 'dying')) {
          nextSniper -= dt;
          if (nextSniper <= 0 && snipers.length < (wave >= 6 ? 2 : 1)) { spawnSniper(); nextSniper = Math.max(5, rand(10, 16) - wave * .5); }
        }
        if (wave >= 2) { nextCrate -= dt * (signal < 50 ? 2.2 : 1); if (nextCrate <= 0 && !crates.length) { spawnCrate(); nextCrate = rand(24, 36); } }
        nextPigeon -= dt; if (nextPigeon <= 0 && !pigeon) { spawnPigeon(); nextPigeon = rand(16, 30); }
      }
      if (over <= 0 && !ending) {
        if (!bossWave) {
          nextSpawn -= dt;
          const maxC = wave === 1 ? 1 : wave === 2 ? 2 : wave < 5 ? 3 : wave < 10 ? 4 : 5;
          if (nextSpawn <= 0 && drones.length < maxC) { spawn(pickType()); nextSpawn = Math.max(.7, rand(2.2, 3.6) - wave * .3); }
        } else if (!boss && drones.length === 0) startBoss();
      }
      drones.forEach(d => {
        d.t += dt; d.hitT = Math.max(0, d.hitT - dt);
        if (d.type === 'hunter' && !d.diving && !view.dark && !ending && d.t > d.diveAt) d.diving = true;
        if (d.diving) {
          const ang = Math.atan2(H + 20 * DPR - d.y, W / 2 - d.x), sp = (240 + d.t * 30) * DPR * Math.min(1.7, 1 + Math.max(0, wave - 2) * .06);
          d.vx += (Math.cos(ang) * sp - d.vx) * dt * 1.6; d.vy += (Math.sin(ang) * sp - d.vy) * dt * 1.6;
        } else d.y += Math.sin(t * 2 + d.ph) * .35 * DPR;
        if (d.type === 'courier') d.y += Math.sin(t * 6 + d.ph) * 1.2 * DPR;
        const slow = view.dark && !d.diving ? .55 : 1;
        d.x += d.vx * dt * slow; d.y += d.vy * dt;
        drawDrone(d, t);
      });
      drones = drones.filter(d => {
        if (d.diving && d.y > H - 12 * DPR) { explode(d.x, H - 24 * DPR, .7); damage(20); return false; }
        if (!d.diving && (d.x > W + 90 * DPR || d.x < -90 * DPR)) return false;
        return d.hp > 0;
      });
      updateExtras(dt, t);
      if (boss) updateBoss(dt, t);
      if (ending) updateEnding(dt, t);
      bolts.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; drawBolt(b, t); });
      bolts = bolts.filter(b => {
        if (b.dead) return false;
        if (b.y > H - 12 * DPR) { burst(b.x, H - 14 * DPR, 24, true, 220); flashes.push({ x: b.x, y: H - 14 * DPR, life: .3, max: .3 }); damage(10); return false; }
        return true;
      });
      drawFx(dt);
    },
    overlay(dt) {
      const { ctx, W, H, DPR } = view;
      if (view.red > 0) {
        view.red = Math.max(0, view.red - dt * 1.8);
        const g = ctx.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, W * .7);
        g.addColorStop(0, 'rgba(255,40,30,0)'); g.addColorStop(1, `rgba(255,40,30,${.45 * view.red})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      if (ending && ending.laser) {
        const L = ending.laser, a = L.a, fl = .6 + .4 * Math.random();
        ctx.strokeStyle = `rgba(255,50,40,${.6 * a * fl})`; ctx.lineWidth = 2 * DPR; ctx.beginPath(); ctx.moveTo(L.x, L.y); ctx.lineTo(W / 2, H / 2); ctx.stroke();
        const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, (8 + 22 * a) * DPR);
        g.addColorStop(0, `rgba(255,225,215,${a})`); g.addColorStop(.3, `rgba(255,40,30,${.9 * a})`); g.addColorStop(1, 'rgba(255,40,30,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W / 2, H / 2, (8 + 22 * a) * DPR, 0, 7); ctx.fill();
      }
      if (view.white > 0) { view.white = Math.max(0, view.white - dt * 1.6); ctx.fillStyle = `rgba(255,250,240,${view.white})`; ctx.fillRect(0, 0, W, H); }
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      texts = texts.filter(p => (p.life -= dt * .9) > 0);
      texts.forEach(p => {
        p.y -= 30 * DPR * dt; ctx.globalAlpha = Math.min(1, p.life * 2);
        ctx.font = `800 ${Math.round(17 * DPR)}px "Big Shoulders Display", Impact, sans-serif`;
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText(p.txt, p.x + DPR, p.y + DPR);
        ctx.fillStyle = p.color || '#D5CE9B'; ctx.fillText(p.txt, p.x, p.y);
      });
      ctx.globalAlpha = 1;
    }
  };
}


FLX.cities.forEach(c => {
  try { c.attach(Game(c.view, c.hero)); }
  catch (err) { console.error('[Flexarion] Le mini-jeu n’a pas pu démarrer :', err); $$('.game-ui', c.hero).forEach(e => e.remove()); }
});
})();
