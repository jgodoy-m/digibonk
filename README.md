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

- Temporada 1 (Digimon Adventure). Los Bits se gastan en el Laboratorio del menú (mejoras permanentes); el gacha (botón Gacha del menú) se paga con tickets.
- Tres mapas, que se eligen después del Digimon junto con la dificultad (Fácil, Normal, Difícil, Pesadilla):
  1. Bosque File: Bosque Inicial y Pantano de Datos, unidos por un portal. Andromon abre el portal y Piedmon es el jefe final.
  2. Desierto de Datos: Dunas de Datos y Ruinas del Faraón, unidas por un portal. Scorpiomon abre el portal y MetalEtemon es el jefe final.
  3. Montaña Helada: Valle Nevado y Fortaleza Oscura. Sin jefes menores; Machinedramon es el único jefe final (huye por el portal a mitad de vida y te espera al otro lado).
- En los tres mapas el jefe de cada pantalla se invoca cuando quieras (tecla B o botón) y siempre tiene la misma fuerza. Si pasas 20 minutos en una pantalla empieza el Infierno.
- Supervivencia: cualquier mapa, una oleada por minuto y un jefe menor cada 5 oleadas.
- Assets de ambientación de los mapas 2 y 3, iconos del HUD y partículas del gacha: Kenney, CC0 (ver `textures/CREDITOS.txt`).
