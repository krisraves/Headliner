// ============================================================
// HEADLINER — procedural audio (Web Audio API, no asset files)
// ============================================================
let ctx = null;
function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone({ freq = 440, end = freq, dur = 0.1, type = "square", vol = 0.12, delay = 0 }) {
  const a = ac();
  const t0 = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(end, 1), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise({ dur = 0.15, vol = 0.1, delay = 0 }) {
  const a = ac();
  const t0 = a.currentTime + delay;
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t0);
  src.connect(g).connect(a.destination);
  src.start(t0);
}

export const SFX = {
  unlock() { ac(); }, // call on first user gesture
  jump()   { tone({ freq: 320, end: 620, dur: 0.12, type: "square", vol: 0.07 }); },
  djump()  { tone({ freq: 420, end: 880, dur: 0.14, type: "square", vol: 0.07 }); },
  dash()   { noise({ dur: 0.12, vol: 0.1 }); tone({ freq: 900, end: 200, dur: 0.12, type: "sawtooth", vol: 0.05 }); },
  swing()  { noise({ dur: 0.06, vol: 0.08 }); },
  hitEnemy() { tone({ freq: 220, end: 90, dur: 0.1, type: "square", vol: 0.1 }); },
  hurt()   { tone({ freq: 160, end: 60, dur: 0.25, type: "sawtooth", vol: 0.12 }); noise({ dur: 0.1, vol: 0.08 }); },
  pickup() { [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, dur: 0.1, type: "triangle", vol: 0.09, delay: i * 0.07 })); },
  save()   { tone({ freq: 660, dur: 0.08, type: "triangle", vol: 0.08 }); tone({ freq: 990, dur: 0.12, type: "triangle", vol: 0.08, delay: 0.09 }); },
  brick()  { noise({ dur: 0.2, vol: 0.15 }); tone({ freq: 120, end: 50, dur: 0.18, type: "square", vol: 0.1 }); },
  laugh() { // crowd laugh — burst of descending chirps
    for (let i = 0; i < 6; i++)
      tone({ freq: 500 + Math.random() * 400, end: 200, dur: 0.08, type: "triangle", vol: 0.04, delay: i * 0.05 });
  },
  bossHit() { tone({ freq: 180, end: 70, dur: 0.2, type: "sawtooth", vol: 0.13 }); },
  death()  { tone({ freq: 300, end: 40, dur: 0.7, type: "sawtooth", vol: 0.12 }); },
};
