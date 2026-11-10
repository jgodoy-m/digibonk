# Clips del tutorial

Vídeos cortos grabados del propio juego con `?demo=1` (gancho de demo en `digibonk3d.html`).
Escenas: `mover`, `ataque`, `dash`, `nivel`, `cofre`, `zona`, `jefe`, `coleccion`.

Regenerar: `grabar-tutorial.js` graba las escenas en bruto; luego se recortan y comprimen a 640 px
con ffmpeg (VP9, CRF 40, sin audio). Los recortes usan los instantes de cada evento.
