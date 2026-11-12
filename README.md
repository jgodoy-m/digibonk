# Digibonk

Prototipo de juego de supervivencia estilo Digimon (fan-game no oficial y sin ánimo de lucro).

## Archivos

- `index.html`: el juego, versión 3D principal (Three.js 0.160 desde CDN). Es la que se sigue desarrollando.
- `sprites/`: sprites de Digimon de la base DMC y de Digimon Adventure (uso no comercial, ver `sprites/CREDITS.txt`).

## Probar en local

Hace falta conexión a internet (Three.js se carga desde unpkg). Desde esta carpeta:

```bash
python -m http.server 8765
```

Luego abre `http://localhost:8765/` en el navegador.

## Estado

- Temporada 1 (Digimon Adventure). El mapa empieza en el Bosque Inicial y los Bits se gastan en el Laboratorio del menú (mejoras permanentes); el gacha se paga con tickets.
- Pendiente: árboles y assets de ambientación con licencia clara, y revisar la licencia del pack de SwampWitch32 antes de incluirlo.
