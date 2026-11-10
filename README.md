# DigiBonk

Prototipo de juego de supervivencia estilo Digimon (fan-game no oficial y sin ánimo de lucro).

## Archivos

- `digibonk3d.html`: versión 3D principal (Three.js 0.160 desde CDN). Es la que se sigue desarrollando.
- `digibonk.html`: prototipo 2D original, sin uso actual.
- `sprites/`: sprites de Digimon del pack de King (uso no comercial, ver `sprites/CREDITS.txt`).
- `digimon-pack/`: pack descargado original, de donde salieron los sprites.

## Probar en local

Hace falta conexión a internet (Three.js se carga desde unpkg). Desde esta carpeta:

```bash
python -m http.server 8765
```

Luego abre `http://localhost:8765/digibonk3d.html` en el navegador.

## Estado

- Temporada 1 (Digimon Adventure), con el Pueblo Primario como primera zona.
- Pendiente: árboles y assets de ambientación con licencia clara, y revisar la licencia del pack de SwampWitch32 antes de incluirlo.
