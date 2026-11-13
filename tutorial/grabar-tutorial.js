// Regenera los clips y las capturas de la guía «Cómo jugar».
// 1. Sirve la carpeta del juego: python3 -m http.server 8767
// 2. node tutorial/grabar-tutorial.js [escena]
// Graba cada escena con ?demo=1 fotograma a fotograma y la convierte a 640 px con ffmpeg
// (VP9, CRF 47, sin audio). Las capturas del menú se guardan en webp para los dos temas.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const DIR = __dirname;
const RAW = process.env.CLIPS_DIR || path.join(require('os').tmpdir(), 'dbk-clips');
const URL = 'http://localhost:8767/index.html?demo=1';
fs.mkdirSync(RAW, {recursive: true});
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Azar con semilla fija antes de empezar: el Digimon aparece siempre en el mismo sitio (en hierba, no en el lago)
const SEED = +(process.env.SEED || 5);
const start = (p, key = 'gabumon') => p.evaluate(([k, seed]) => {
  let a = seed >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  __dbk.setRun('bosque', 'normal', 'normal'); __dbk.startGame(k); }, [key, SEED]);
const ring = (p, n, r, spd) => p.evaluate(([n, r, spd]) => { const gg = __dbk.g;
  for (let i = 0; i < n; i++){ __dbk.spawnEnemy(); const e = gg.enemies[gg.enemies.length - 1], a = i / n * Math.PI * 2;
    e.x = gg.p.x + Math.cos(a) * r; e.z = gg.p.z + Math.sin(a) * r; if (spd != null) e.spd = spd; } }, [n, r, spd]);

// El juego se graba fotograma a fotograma (?demo=1 expone hold/step): w(ms) avanza el tiempo del juego
// y guarda un fotograma cada 40 ms (25 fps), así el vídeo sale fluido aunque el equipo sea lento.
const SCENES = {
  mover: async (p, w) => { await start(p); await w(300);
    await p.keyboard.down('d'); await w(1300); await p.keyboard.down('w'); await w(1300); await p.keyboard.up('d');
    await p.keyboard.press(' '); await w(1400); await p.keyboard.up('w'); await w(1200); },
  ataque: async (p, w) => { await start(p); await ring(p, 7, 8, 0.7); await w(5200); },
  dash: async (p, w) => { await start(p); await ring(p, 5, 6, 0.3); await w(300);
    await p.keyboard.down('w'); await w(700); await p.keyboard.press('Shift'); await w(1200); await p.keyboard.press(' '); await w(1500); await p.keyboard.up('w'); await w(800); },
  nivel: async (p, w) => { await start(p, 'palmon'); await ring(p, 5, 7, 0.5); await w(800);
    await p.evaluate(() => { __dbk.g.p.xp = __dbk.g.p.nextXp; }); await w(2600); await p.keyboard.press('1'); await w(1400); },
  cofre: async (p, w) => { await start(p, 'gatomon'); await p.evaluate(() => { const gg = __dbk.g; gg.p.z += 9; gg.p.dir = {x: 0, z: -1}; gg.bonk = 100; __dbk.nearChest(); }); await ring(p, 8, 9, 0.6); await w(300);
    await p.keyboard.down('w'); await w(800); await p.keyboard.up('w'); await p.keyboard.press('e'); await w(1800);
    await p.keyboard.press('1'); await w(900); await p.keyboard.press('q'); await w(1800); },
  evo: async (p, w) => { await start(p, 'agumon'); await ring(p, 4, 10, 0.2); await w(200);
    await p.evaluate(() => { const pl = __dbk.g.p; pl.hp = pl.maxHp * 0.15; }); await w(1300);
    await p.keyboard.press('r'); await w(5000); },
  jefe: async (p, w) => { await start(p); await w(600); await p.keyboard.press('b'); await w(6400); }
};

// Capturas del menú (los dos temas): menú de inicio y elección de mapa
async function shots(b){
  for (const th of ['claro', 'oscuro']){
    const ctx = await newCtx(b, th);
    const p = await ctx.newPage();
    await p.goto(URL); await sleep(2500);
    await shot(p, `menu_${th}`);
    await p.click('#playBtn'); await sleep(900); await p.keyboard.press('Enter'); await sleep(1200);
    await shot(p, `mapas_${th}`);
    await p.goto(URL); await sleep(2200); await p.click('#btnGacha'); await sleep(1200);
    await shot(p, `lab_${th}`);
    await ctx.close();
  }
}
async function shot(p, name){
  const png = path.join(RAW, name + '.png');
  await p.screenshot({path: png});
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', png, '-vf', 'scale=800:-1', '-quality', '78', path.join(DIR, name + '.webp')]);
  console.log('shot', name);
}
async function newCtx(b, theme){
  const ctx = await b.newContext({viewport: {width: 960, height: 540}});
  await ctx.addInitScript(t => { localStorage.setItem('digibonk3d-name', 'Ana'); localStorage.setItem('digibonk3d-quality', 'alta'); localStorage.setItem('digibonk3d-theme', t); }, theme);
  return ctx;
}
(async () => {
  const only = process.argv[2];
  const b = await chromium.launch({args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader']});
  if (!only || only === 'menu') await shots(b);
  for (const [name, sc] of Object.entries(SCENES)){
    if (only && only !== name) continue;
    const dir = path.join(RAW, name);
    fs.rmSync(dir, {recursive: true, force: true}); fs.mkdirSync(dir);
    const ctx = await newCtx(b, 'claro');
    const p = await ctx.newPage();
    p.on('pageerror', e => console.log(name, 'PAGE ERR', e.message));
    await p.goto(URL);
    await sleep(2500);
    // El juego queda en espera y avanza 40 ms por fotograma guardado: sin GPU va a ~2 fps en tiempo real
    await p.evaluate(() => __dbk.hold(true));
    let n = 0;
    const w = async ms => { for (let t = 0; t < ms; t += 40){
      await p.evaluate(() => __dbk.step(1)); await p.waitForFunction(() => __dbk.pending === 0);
      await p.screenshot({path: path.join(dir, `f${String(n++).padStart(4, '0')}.png`)});
      if (n % 25 === 0) console.log(name, n, 'fotogramas'); } };
    await sc(p, w);
    await ctx.close();
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '25', '-i', path.join(dir, 'f%04d.png'), '-an',
      '-vf', 'scale=640:-2', '-c:v', 'libvpx-vp9', '-crf', '47', '-b:v', '0', '-row-mt', '1', path.join(DIR, name + '.webm')]);
    console.log('recorded', name, n, 'frames');
  }
  await b.close();
})();
