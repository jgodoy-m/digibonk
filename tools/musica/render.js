// Renderiza las pistas de componer.js a audio/musica/<mapa>.mp3
// Uso: node tools/musica/render.js   (necesita Playwright con Chromium y ffmpeg)
const fs = require('fs'), path = require('path'), {execFileSync} = require('child_process');
const {chromium} = require('playwright');

(async () => {
  const src = fs.readFileSync(path.join(__dirname, 'componer.js'), 'utf8');
  const outDir = path.join(__dirname, '..', '..', 'audio', 'musica');
  fs.mkdirSync(outDir, {recursive: true});
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<html><body></body></html>');
  await page.addScriptTag({content: src});
  for (const key of ['bosque', 'desierto', 'nevado']){
    const b64 = await page.evaluate(async (k) => {
      const {rate, data} = await renderSong(k);
      // WAV estéreo de 16 bits
      const n = data[0].length, buf = new ArrayBuffer(44 + n * 4), v = new DataView(buf);
      const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
      w(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true);
      v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 4, true);
      v.setUint16(32, 4, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 4, true);
      let o = 44;
      for (let i = 0; i < n; i++) for (let ch = 0; ch < 2; ch++){ const s = Math.max(-1, Math.min(1, data[ch][i])); v.setInt16(o, s * 32767, true); o += 2; }
      let bin = ''; const u = new Uint8Array(buf);
      for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
      return btoa(bin);
    }, key);
    const wav = path.join(outDir, key + '.wav'), mp3 = path.join(outDir, key + '.mp3');
    fs.writeFileSync(wav, Buffer.from(b64, 'base64'));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-af', 'loudnorm=I=-12:TP=-1.5:LRA=11', '-ar', '44100', '-ac', '2', '-b:a', '96k', mp3]);
    fs.unlinkSync(wav);
    console.log('ok', mp3);
  }
  await browser.close();
})();
