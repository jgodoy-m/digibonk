# Skins de Navidad (Papá Noel y Reno): mapa de degradado sobre las hojas animadas base.
# Cada píxel toma un color según su luminosidad, así se conserva el sombreado del sprite.
# Uso: python3 sprites/anim/navidad.py   (desde la raíz del repo)
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))

# Hoja base de cada etapa (0 = inicial)
BASES = {
    "agumon": ["agumon", "greymon", "metalgreymon", "wargreymon"],
    "gabumon": ["gabumon", "garurumon", "weregarurumon", "metalgarurumon"],
    "biyomon": ["biyomon", "birdramon", "garudamon"],
    "tentomon": ["tentomon", "kabuterimon", "megakabuterimon"],
    "palmon": ["palmon", "togemon", "lillymon"],
    "gomamon": ["gomamon", "ikkakumon", "zudomon"],
    "patamon": ["patamon", "angemon", "magnaangemon"],
    "gatomon": ["gatomon", "angewomon"],
}

# Escalas de color: (luminosidad 0-1, color RGB). Oscuro -> medio -> claro
PALETTES = {
    "festival": [(0.0, (46, 8, 10)), (0.45, (183, 28, 28)), (0.8, (244, 210, 200)), (1.0, (255, 255, 255))],  # Papá Noel
    "reno":     [(0.0, (24, 12, 6)), (0.45, (112, 64, 30)), (0.8, (206, 160, 104)), (1.0, (240, 222, 190))],  # Reno
}

def ramp(stops, t):
    for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
        if t <= t1:
            k = 0 if t1 == t0 else (t - t0) / (t1 - t0)
            return tuple(round(c0[i] + (c1[i] - c0[i]) * k) for i in range(3))
    return stops[-1][1]

def gradient_map(src, stops):
    im = Image.open(src).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
            cr, cg, cb = ramp(stops, lum)
            px[x, y] = (cr, cg, cb, a)
    return im

# La línea de Agumon tiene skins de Navidad dibujadas a mano: no se regeneran aquí
SKIP = {"agumon"}

ONLY = set(filter(None, os.environ.get("ONLY", "").split(",")))

def main():
    n = 0
    for key, stages in BASES.items():
        if key in SKIP:
            continue
        for st, base in enumerate(stages):
            if ONLY and f"{key}_{st}" not in ONLY:
                continue
            src = os.path.join(HERE, base + ".png")
            for skin, stops in PALETTES.items():
                out = os.path.join(HERE, f"{key}_{st}_{skin}.png")
                gradient_map(src, stops).save(out)
                n += 1
    print("Generadas", n, "hojas de Navidad")

if __name__ == "__main__":
    main()
