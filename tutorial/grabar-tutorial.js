// Regenera los vídeos del tutorial: sirve la carpeta del juego en el puerto 8767 (python3 -m http.server 8767)
// y ejecuta: node grabar-tutorial.js [escena]. Después recorta y convierte con ffmpeg (ver tutorial/README.md).
// Graba escenas reales del juego (con ?demo=1) para el tutorial
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.env.CLIPS_DIR || '/tmp/claude-0/clips';
fs.mkdirSync(OUT, {recursive: true});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SCENES = {
  mover: async (p) => { await p.evaluate(() => __dbk.startGame('gabumon')); await sleep(700);
    await p.keyboard.down('d'); await sleep(1200); await p.keyboard.down('w'); await sleep(1500); await p.keyboard.up('d'); await sleep(1800); await p.keyboard.up('w'); await sleep(400); },
  ataque: async (p) => { await p.evaluate(() => { __dbk.startGame('gabumon'); const gg = __dbk.g;
      for (let i = 0; i < 5; i++){ __dbk.spawnEnemy(); const e = gg.enemies[gg.enemies.length-1]; const a = i/5*Math.PI*2;
        e.x = gg.p.x + Math.cos(a)*7; e.z = gg.p.z + Math.sin(a)*7; e.spd = 0.6; } }); await sleep(4500); },
  dash: async (p) => { await p.evaluate(() => __dbk.startGame('gabumon')); await sleep(600);
    await p.evaluate(() => { __dbk.spawnEnemy(); const gg = __dbk.g, e = gg.enemies[gg.enemies.length-1]; e.x = gg.p.x + 6; e.z = gg.p.z; e.spd = 0; });
    await p.keyboard.down('w'); await sleep(500); await p.keyboard.press('Shift'); await sleep(1800); await p.keyboard.up('w'); await sleep(400); },
  nivel: async (p) => { await p.evaluate(() => { __dbk.startGame('palmon'); __dbk.g.p.xp = __dbk.g.p.nextXp; }); await p.waitForFunction(() => __dbk.state === 'levelup', null, {timeout: 60000}); await sleep(2500); },
  cofre: async (p) => { await p.evaluate(() => { __dbk.startGame('gatomon'); __dbk.nearChest(); }); await sleep(600);
    await p.keyboard.down('w'); await sleep(900); await p.keyboard.up('w'); await p.keyboard.press('e'); await sleep(2200); },
  zona: async (p) => { await p.evaluate(() => { __dbk.startGame('gabumon'); __dbk.g.t = 597; }); await p.waitForFunction(() => __dbk.g.zone === 2, null, {timeout: 120000}); await sleep(3500); },
  jefe: async (p) => { await p.evaluate(() => { __dbk.startGame('gabumon'); __dbk.g.t = 1197; }); await p.waitForFunction(() => __dbk.g.bossSpawned, null, {timeout: 120000}); await sleep(4500); },
  coleccion: async (p) => { await p.evaluate(() => __dbk.showCollection()); await sleep(3000); },
  gacha: async (p) => { await p.evaluate(() => __dbk.showGacha()); await sleep(3000); }
};
(async () => {
  const only = process.argv[2];
  const b = await chromium.launch({args:['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  for (const [name, run] of Object.entries(SCENES)){
    if (only && only !== name) continue;
    const ctx = await b.newContext({viewport:{width:960,height:540}, recordVideo:{dir: OUT + '/' + name, size:{width:960,height:540}}});
    await ctx.addInitScript(() => { localStorage.setItem('digibonk3d-name','Ana'); localStorage.setItem('digibonk3d-quality','alta'); });
    const p = await ctx.newPage();
    p.on('pageerror', e => console.log(name, 'PAGE ERR', e.message));
    await p.goto('http://localhost:8767/digibonk3d.html?demo=1');
    await sleep(2500);
    await run(p);
    await ctx.close();
    console.log('recorded', name);
  }
  await b.close();
})();
