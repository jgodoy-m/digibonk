// Música original de DigiBonk: una pista por mapa, compuesta nota a nota para el juego.
// Se sintetiza con Web Audio (OfflineAudioContext) y sale como WAV; render.js la pasa a MP3.
// Obra propia del proyecto, sin muestras ni melodías de terceros: se publica como CC0.
//
// Notación: cada compás son 8 corcheas separadas por espacios. «C5», «F#4», «Eb5» = nota,
// «-» = mantener la anterior, «.» = silencio.

const SONGS = {
  // Bosque File: sol mayor, aventura alegre
  bosque: {
    bpm: 128, form: ['A', 'B', 'A', 'B'], lead: 'square', perc: 'rock', arp: true,
    chords: {
      A: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'],
      B: ['Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'D']
    },
    mel: {
      A: ['B4 - D5 - G5 - F#5 E5', 'D5 - A4 - F#4 - A4 -', 'E5 - G5 - B5 - A5 G5', 'E5 - - - C5 D5 E5 -',
          'D5 - B4 - G4 A4 B4 D5', 'F#5 - E5 D5 A4 - D5 -', 'E5 - G5 - E5 D5 C5 E5', 'D5 - - - . . A4 -'],
      B: ['G5 - - E5 B4 - E5 -', 'G5 - - E5 C5 - G5 -', 'B5 - A5 G5 D5 - G5 -', 'A5 - - - F#5 - D5 -',
          'E5 G5 B5 G5 E5 - B4 -', 'C5 E5 G5 E5 C6 - G5 -', 'A5 - G5 - E5 - C5 -', 'D5 - E5 - F#5 - A5 -']
    }
  },
  // Desierto de Datos: re frigio dominante, cuerda pulsada y percusión de mano
  desierto: {
    bpm: 104, form: ['A', 'B', 'A', 'B'], lead: 'pluck', perc: 'hand', arp: false, drone: true,
    chords: {
      A: ['D', 'D', 'Eb', 'D', 'Cm', 'Gm', 'Eb', 'D'],
      B: ['D', 'D', 'Eb', 'D', 'Gm', 'Eb', 'Cm', 'D']
    },
    mel: {
      A: ['D5 - Eb5 F#5 G5 - F#5 Eb5', 'D5 - - - A4 - - -', 'Eb5 - F#5 G5 A5 - G5 F#5', 'G5 F#5 Eb5 - D5 - - -',
          'C5 - D5 Eb5 F#5 - Eb5 D5', 'D5 - C5 Bb4 A4 - Bb4 C5', 'Eb5 - D5 C5 Bb4 - A4 Bb4', 'A4 - - - . . . .'],
      B: ['A5 - Bb5 A5 G5 - F#5 G5', 'A5 - - - D6 - - -', 'C6 - Bb5 A5 G5 - A5 Bb5', 'A5 - G5 F#5 Eb5 - D5 -',
          'G5 - Bb5 - D6 - Bb5 G5', 'G5 - F#5 Eb5 D5 - Eb5 -', 'C5 - Eb5 - G5 - A5 Bb5', 'A5 - - - F#5 - - -']
    }
  },
  // Montaña Helada: mi menor, campanas tranquilas sobre un colchón suave
  nevado: {
    bpm: 92, form: ['A', 'B', 'A', 'B'], lead: 'bell', perc: 'soft', arp: true, pad: true,
    chords: {
      A: ['Em', 'C', 'G', 'D', 'Am', 'C', 'Em', 'B'],
      B: ['Em', 'C', 'G', 'D', 'Am', 'C', 'Em', 'B']
    },
    mel: {
      A: ['B5 - - - G5 - E5 -', 'E5 - - - G5 - B5 -', 'D6 - - - B5 - G5 -', 'A5 - - - F#5 - - -',
          'C6 - - - A5 - E5 -', 'E5 - G5 - C6 - B5 -', 'G5 - F#5 - E5 - B4 -', 'D#5 - - - F#5 - B5 -'],
      B: ['E6 - - - D6 - B5 -', 'C6 - - - B5 - G5 -', 'B5 - - - A5 - G5 -', 'F#5 - - - D5 - A5 -',
          'A5 - C6 - E6 - C6 -', 'G5 - C6 - E6 - - -', 'B5 - G5 - E5 - G5 -', 'F#5 - - - D#5 - - -']
    }
  }
};

const NOTE = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
function midi(n){
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
  return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
// Acorde → notas MIDI (raíz en la octava 3)
function chord(name){
  const m = /^([A-G])(#|b)?(m?)$/.exec(name);
  const root = 48 + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return [root, root + (m[3] ? 3 : 4), root + 7];
}
// Compás de melodía → [{m, start, len}] en corcheas
function parseBar(s){
  const out = [];
  s.trim().split(/\s+/).forEach((tk, i) => {
    if (tk === '-'){ if (out.length && out[out.length - 1].open) out[out.length - 1].len++; }
    else if (tk === '.'){ if (out.length) out[out.length - 1].open = false; }
    else out.push({m: midi(tk), start: i, len: 1, open: true});
  });
  return out;
}

async function renderSong(key, rate = 44100){
  const S = SONGS[key];
  const eighth = 60 / S.bpm / 2, bar = eighth * 8;
  const bars = [];
  S.form.forEach((sec, pass) => S.chords[sec].forEach((c, i) => bars.push({sec, i, c, pass})));
  const len = bars.length * bar, tail = 4;
  const ctx = new OfflineAudioContext(2, Math.ceil((len + tail) * rate), rate);

  // Bus principal con un poco de eco estéreo y reverberación sintética
  const master = ctx.createGain(); master.gain.value = 0.8;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
  master.connect(comp); comp.connect(ctx.destination);
  const verbIn = ctx.createGain(); verbIn.gain.value = S.lead === 'bell' ? 0.45 : 0.22;
  const conv = ctx.createConvolver();
  const irLen = Math.floor(rate * 2.2), ir = ctx.createBuffer(2, irLen, rate);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 * 2 - 1;
  for (let ch = 0; ch < 2; ch++){ const d = ir.getChannelData(ch); for (let i = 0; i < irLen; i++) d[i] = rnd() * Math.pow(1 - i / irLen, 3); }
  conv.buffer = ir; verbIn.connect(conv); conv.connect(master);
  const echoIn = ctx.createGain(); echoIn.gain.value = S.lead === 'pluck' ? 0.3 : 0.15;
  const dl = ctx.createDelay(2); dl.delayTime.value = eighth * 3;
  const fb = ctx.createGain(); fb.gain.value = 0.3;
  const pan = ctx.createStereoPanner(); pan.pan.value = 0.4;
  echoIn.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(pan); pan.connect(master);

  const noiseBuf = ctx.createBuffer(1, rate, rate);
  { const d = noiseBuf.getChannelData(0); for (let i = 0; i < rate; i++) d[i] = rnd(); }
  const pulse = (duty) => {
    const n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * duty);
    return ctx.createPeriodicWave(re, im);
  };
  const P25 = pulse(0.25), P12 = pulse(0.125);
  const send = (node, dry, verb, echo, p = 0) => {
    const pn = ctx.createStereoPanner(); pn.pan.value = p; node.connect(pn);
    const gd = ctx.createGain(); gd.gain.value = dry; pn.connect(gd); gd.connect(master);
    if (verb){ const gv = ctx.createGain(); gv.gain.value = verb; pn.connect(gv); gv.connect(verbIn); }
    if (echo){ const ge = ctx.createGain(); ge.gain.value = echo; pn.connect(ge); ge.connect(echoIn); }
  };
  const env = (g, t, a, peak, d, sus, end, r) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setTargetAtTime(peak * sus, t + a, d);
    g.gain.setTargetAtTime(0.0001, end, r);
  };
  const osc = (type, f, t, end, wave) => {
    const o = ctx.createOscillator();
    if (wave) o.setPeriodicWave(wave); else o.type = type;
    o.frequency.value = f; o.start(t); o.stop(end + 1.5); return o;
  };

  // Instrumentos
  const lead = (m, t, dur) => {
    const end = t + dur;
    if (S.lead === 'square'){
      const o = osc(null, hz(m), t, end, P25), g = ctx.createGain();
      const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5.5; vg.gain.value = dur > eighth * 2 ? hz(m) * 0.006 : 0;
      vib.connect(vg); vg.connect(o.frequency); vib.start(t + 0.15); vib.stop(end + 0.3);
      env(g, t, 0.008, 0.16, 0.12, 0.7, end - 0.02, 0.04); o.connect(g); send(g, 1, 0.25, 0.4, -0.1);
    } else if (S.lead === 'pluck'){
      const o = osc('sawtooth', hz(m), t, end), o2 = osc('sawtooth', hz(m) * 1.004, t, end);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 4;
      f.frequency.setValueAtTime(hz(m) * 8, t); f.frequency.setTargetAtTime(hz(m) * 1.5, t, 0.08);
      const g = ctx.createGain(); env(g, t, 0.004, 0.2, 0.25, 0.25, end, 0.12);
      o.connect(f); o2.connect(f); f.connect(g); send(g, 1, 0.3, 0.8, 0.1);
    } else {   // campana: parcial inarmónico que se apaga antes
      const g = ctx.createGain(), end2 = t + Math.max(dur, 1.6);
      [[1, 0.22, 1.4], [2.76, 0.08, 0.5], [5.4, 0.03, 0.25]].forEach(([k, v, dec]) => {
        const o = osc('sine', hz(m) * k, t, end2), gg = ctx.createGain();
        gg.gain.setValueAtTime(0.0001, t); gg.gain.linearRampToValueAtTime(v, t + 0.004); gg.gain.setTargetAtTime(0.0001, t + 0.004, dec);
        o.connect(gg); gg.connect(g);
      });
      g.gain.value = 1; send(g, 0.9, 0.8, 0.5, 0.15);
    }
  };
  const bass = (m, t, dur, vol = 0.32) => {
    const o = osc('triangle', hz(m), t, t + dur), g = ctx.createGain();
    env(g, t, 0.006, vol, 0.2, 0.75, t + dur - 0.03, 0.03); o.connect(g); send(g, 1, 0, 0);
  };
  const arpNote = (m, t, dur, vol) => {
    const o = S.lead === 'bell' ? osc('sine', hz(m), t, t + dur) : osc(null, hz(m), t, t + dur, P12);
    const g = ctx.createGain(); env(g, t, 0.004, vol, 0.08, 0.3, t + dur, 0.05); o.connect(g); send(g, 1, 0.3, 0.2, 0.35);
  };
  const padChord = (notes, t, dur, vol) => {
    const g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1100;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35); g.gain.setTargetAtTime(0.0001, t + dur - 0.1, 0.25);
    notes.forEach((m, i) => [0.997, 1.003].forEach(d => { const o = osc('sawtooth', hz(m + 12) * d, t, t + dur); o.connect(f); }));
    f.connect(g); send(g, 1, 0.6, 0, -0.3);
  };
  const noiseHit = (t, type, freq, q, vol, dec, p = 0) => {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.setTargetAtTime(0.0001, t, dec);
    s.connect(f); f.connect(g); send(g, 1, 0.1, 0, p); s.start(t, Math.abs(rnd()) * 0.5); s.stop(t + dec * 8);
  };
  const kick = (t, vol = 0.7, f0 = 140) => {
    const o = osc('sine', f0, t, t + 0.25), g = ctx.createGain();
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(vol, t); g.gain.setTargetAtTime(0.0001, t + 0.02, 0.06); o.connect(g); send(g, 1, 0, 0);
  };
  const doum = (t, vol = 0.5) => {   // golpe grave de darbuka
    const o = osc('sine', 110, t, t + 0.4), g = ctx.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(80, t + 0.2);
    g.gain.setValueAtTime(vol, t); g.gain.setTargetAtTime(0.0001, t + 0.01, 0.1); o.connect(g); send(g, 1, 0.15, 0, -0.1);
  };

  bars.forEach((b, bi) => {
    const t0 = bi * bar;
    const notes = chord(b.c);
    const last = b.pass === S.form.length - 1;
    // Melodía (la segunda vuelta de cada sección sube una octava en el bosque para variar)
    parseBar(S.mel[b.sec][b.i]).forEach(n => {
      const up = S.lead === 'square' && b.pass >= 2 && b.sec === 'A' ? 12 : 0;
      lead(n.m + up, t0 + n.start * eighth, n.len * eighth * 0.95);
    });
    // Bajo
    const r = notes[0] - 12;
    if (S.drone){
      bass(r, t0, eighth * 3.8, 0.3); bass(r, t0 + eighth * 4, eighth * 1.8, 0.24); bass(r + 7, t0 + eighth * 6, eighth * 1.8, 0.22);
    } else if (S.lead === 'bell'){
      bass(r, t0, eighth * 7.6, 0.28);
    } else {
      [r, r + 12, r + 7, r + 12, r, r + 12, r + 7, r + 12].forEach((m, k) => bass(m, t0 + k * eighth, eighth * 0.85, k % 2 ? 0.22 : 0.3));
    }
    // Arpegio de semicorcheas (bosque) o corcheas (nevado)
    if (S.arp){
      const seq = [...notes.map(m => m + 12), notes[0] + 24];
      const steps = S.lead === 'bell' ? 8 : 16, st = bar / steps;
      for (let k = 0; k < steps; k++){
        const m = seq[S.lead === 'bell' ? [0, 1, 2, 3, 2, 1, 2, 1][k] : [0, 1, 2, 3][k % 4]];
        arpNote(m, t0 + k * st, st * 0.9, S.lead === 'bell' ? 0.05 : (b.pass ? 0.035 : 0.025));
      }
    }
    if (S.pad || S.drone) padChord(notes, t0, bar, S.drone ? 0.03 : 0.045);
    // Percusión
    for (let k = 0; k < 8; k++){
      const t = t0 + k * eighth;
      if (S.perc === 'rock'){
        if (k === 0 || k === 4 || (k === 7 && bi % 4 === 3)) kick(t);
        if (k === 2 || k === 6) noiseHit(t, 'bandpass', 1800, 0.8, 0.35, 0.06);
        noiseHit(t, 'highpass', 8000, 0.7, k % 2 ? 0.05 : 0.09, 0.02, 0.3);
      } else if (S.perc === 'hand'){
        if (k === 0 || k === 3 || (k === 6 && bi % 2)) doum(t);
        if (k === 2 || k === 5 || k === 7) noiseHit(t, 'bandpass', 3200, 2, 0.18, 0.03, 0.25);
        if (b.pass >= 2) noiseHit(t + eighth / 2, 'highpass', 9000, 0.7, 0.05, 0.03, -0.3);   // pandereta en la segunda vuelta
      } else {
        if (k === 0) kick(t, 0.4, 100);
        if (k === 4) noiseHit(t, 'bandpass', 2400, 0.6, 0.08, 0.09, -0.2);
        if (k % 2 === 1 && b.pass % 2) noiseHit(t, 'highpass', 9000, 0.7, 0.025, 0.03, 0.3);
      }
    }
  });

  const buf = await ctx.startRendering();
  // Bucle sin corte: la cola (reverberación y notas que suenan al final) se suma al principio
  const n = Math.round(len * rate), out = [];
  for (let ch = 0; ch < 2; ch++){
    const d = buf.getChannelData(ch), o = new Float32Array(n);
    o.set(d.subarray(0, n));
    for (let i = n; i < d.length; i++) o[i - n] += d[i];
    out.push(o);
  }
  return {rate, data: out, seconds: len};
}
if (typeof module !== 'undefined') module.exports = {SONGS};
