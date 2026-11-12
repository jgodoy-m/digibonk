// Genera las hojas de skin (recoloreados) a partir de las hojas animadas base.
// Uso: sirve la carpeta del juego (p. ej. python3 -m http.server 8790) y ejecuta
//   node sprites/anim/recolor.js http://localhost:8790/index.html
// Los filtros salen de SKINS en index.html, así que el juego y los archivos no se desalinean.
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
(async () => {
  const url = process.argv[2] || 'http://localhost:8790/index.html';
  const out = path.join(__dirname);
  const browser = await chromium.launch({args: ['--use-gl=swiftshader', '--no-sandbox']});
  const page = await browser.newPage();
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'demo=1');
  await page.waitForFunction(() => window.__dbk && window.__dbk.SKINS);
  const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
  const files = await page.evaluate(async (only) => {
    const { SKINS, EVO_LINE, CHARS, SEASONS, glitchPixels } = window.__dbk;
    const name = p => p.split('/').pop().replace(/\.png$/, '');
    const load = src => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error(src)); im.src = src; });
    const res = [];
    for (const key of SEASONS.adventure.chars){
      if (key === 'agumon' || key === 'gabumon') continue;   // sprites nuevos: sus skins se van a rehacer
      for (let st = 0; st <= EVO_LINE[key].length; st++){
        if (only.length && !only.includes(key + '_' + st)) continue;
        const base = name(st ? EVO_LINE[key][st - 1].sprite : CHARS[key].sprite);
        const img = await load(`sprites/anim/${base}.png`);
        for (const sk of SKINS){
          if (sk.id === 'clasico' || sk.px) continue;   // las de Navidad salen de navidad.py
          const c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          const x = c.getContext('2d');
          x.filter = sk.f || 'none';
          x.drawImage(img, 0, 0);
          x.filter = 'none';
          if (sk.fx === 'glitch') glitchPixels(x, c.width, c.height);
          res.push({file: `${key}_${st}_${sk.id}.png`, data: c.toDataURL('image/png')});
        }
      }
    }
    return res;
  }, ONLY);
  for (const f of files){
    fs.writeFileSync(path.join(out, f.file), Buffer.from(f.data.split(',')[1], 'base64'));
  }
  console.log('Generadas', files.length, 'hojas en', out);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
