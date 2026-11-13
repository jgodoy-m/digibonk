# Guía «Cómo jugar»

Los textos de la guía están en `GUIDE` dentro de `index.html`.

- Vídeos (`*.webm`): partidas reales grabadas con `?demo=1`. Escenas: `mover`, `ataque`, `dash`, `nivel`, `cofre`, `evo`, `jefe`.
- Capturas del menú (`*_claro.webp`, `*_oscuro.webp`): `menu`, `mapas` y `lab`. La guía muestra la del tema activo.

Para regenerarlos, sirve la carpeta del juego en el puerto 8767 (`python3 -m http.server 8767`) y ejecuta
`node tutorial/grabar-tutorial.js [escena|menu]`. Necesita Playwright y ffmpeg.

El script avanza el juego fotograma a fotograma, así que los vídeos salen fluidos aunque el equipo no
tenga GPU. Cada vídeo se convierte a 640 px con VP9 (CRF 47, sin audio).
