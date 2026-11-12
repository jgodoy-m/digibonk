# Skin variocolor (versión oscura de cada Digimon): mapa de degradado sobre las hojas base.
# Es una skin oculta: solo se obtiene con la probabilidad de variocolor (1 entre 8192).
# Uso: python3 sprites/anim/variocolor.py   (desde la raíz del repo)
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from navidad import BASES, gradient_map  # mismas hojas base que las skins de Navidad

# Escala oscura: negro con brillos grises (luminosidad 0-1 -> color)
STOPS = [(0.0, (6, 6, 10)), (0.5, (38, 38, 48)), (0.85, (120, 120, 136)), (1.0, (220, 220, 232))]

# Las líneas de Agumon y Gabumon tienen sprites nuevos y sus skins se van a rehacer: no se generan aquí
SKIP_KEYS = {"agumon", "gabumon"}

ONLY = set(filter(None, os.environ.get("ONLY", "").split(",")))

def main():
    n = 0
    for key, stages in BASES.items():
        for st, base in enumerate(stages):
            if key in SKIP_KEYS:
                continue
            if ONLY and f"{key}_{st}" not in ONLY:
                continue
            src = os.path.join(HERE, base + ".png")
            gradient_map(src, STOPS).save(os.path.join(HERE, f"{key}_{st}_variocolor.png"))
            n += 1
    print("Generadas", n, "hojas variocolor")

if __name__ == "__main__":
    main()
