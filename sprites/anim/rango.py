# Genera las hojas de rango de los enemigos fuertes a partir de su hoja normal (mismas 5 poses y tamaño):
#   <id>_elite.webp  élites: contorno de brasas (rojo anaranjado), cuerpo con un tinte rojizo y una gema roja sobre la cabeza
#   <id>_jefe.webp   jefes menores: contorno dorado con halo morado, sombras moradas y una corona dorada sobre la cabeza
# Así se distinguen a simple vista de los enemigos normales del mismo Digimon (Tyrannomon es tanque y élite, por ejemplo).
# Uso: python3 sprites/anim/rango.py            (regenera todas las de ELITES y JEFES)
#      python3 sprites/anim/rango.py tyrannomon elite
import os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
N = 5
ELITES = ['tyrannomon', 'darktyrannomon', 'gigadramon', 'megadramon', 'skullgreymon', 'andromon', 'mammothmon']
JEFES = ['devimon', 'etemon', 'myotismon', 'metalseadramon', 'puppetmon', 'machinedramon']

def rgb(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32)

ESTILO = {
    # anillos del contorno de dentro afuera; tinte = mezcla del cuerpo hacia un color en las zonas oscuras
    'elite': {'anillos': ['#2a0600', '#ff4d12', '#ffa040'], 'tinte': '#b3261e', 'fuerza': 0.16},
    'jefe':  {'anillos': ['#1e0630', '#ffc107', '#d500f9'], 'tinte': '#7b1fa2', 'fuerza': 0.16},
}

def exterior(al):
    """Transparente unido al borde del fotograma: el contorno no rellena los huecos entre brazos y alas."""
    free = ~al
    ext = np.zeros_like(al)
    ext[0, :] = free[0, :]; ext[-1, :] = free[-1, :]; ext[:, 0] = free[:, 0]; ext[:, -1] = free[:, -1]
    while True:
        n = dilate(ext, 1) & free
        if (n == ext).all(): return ext
        ext = n

def dilate(m, r=1):
    o = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy > r * r + r: continue
            s = np.zeros_like(m)
            ys = slice(max(dy, 0), m.shape[0] + min(dy, 0)); yd = slice(max(-dy, 0), m.shape[0] + min(-dy, 0))
            xs = slice(max(dx, 0), m.shape[1] + min(dx, 0)); xd = slice(max(-dx, 0), m.shape[1] + min(-dx, 0))
            s[ys, xs] = m[yd, xd]; o |= s
    return o

# Emblemas en pixel art (1 = contorno oscuro, 2 = color, 3 = luz, 4 = gema)
GEMA = ["...1...",
        "..121..",
        ".12321.",
        "1223221",
        ".12221.",
        "..121..",
        "...1..."]
CORONA = ["1....1....1",
          "21..141..12",
          "231.121.132",
          "22312221322",
          "22222222222",
          "24242424242",
          "11111111111"]
def emblema(tipo):
    pat = GEMA if tipo == 'elite' else CORONA
    pal = {'elite': {'1': '#2a0600', '2': '#e53917', '3': '#ffd0a0', '4': '#ff6a1a'},
           'jefe':  {'1': '#2a0a3a', '2': '#ffc107', '3': '#fff3b0', '4': '#d500f9'}}[tipo]
    return pat, pal

def stamp(out, pat, pal, cx, top, k):
    """Dibuja el patrón con píxeles de k×k, centrado en cx, empezando en y=top."""
    h = len(pat); w = len(pat[0])
    x0 = int(round(cx - w * k / 2))
    for j, row in enumerate(pat):
        for i, ch in enumerate(row):
            if ch == '.': continue
            y = top + j * k; x = x0 + i * k
            if y < 0 or x < 0 or y + k > out.shape[0] or x + k > out.shape[1]: continue
            out[y:y + k, x:x + k, :3] = rgb(pal[ch]); out[y:y + k, x:x + k, 3] = 255

def frame(a, tipo):
    st = ESTILO[tipo]
    al = a[..., 3] > 0
    out = a.astype(np.float32).copy()
    # tinte en las sombras: lo oscuro se va hacia el color del rango, lo claro casi no cambia
    lum = (out[..., :3] @ np.array([0.299, 0.587, 0.114], np.float32)) / 255
    w = (st['fuerza'] * (1 - lum) ** 1.2 * np.clip(lum * 4, 0, 1))[..., None]
    out[..., :3] = out[..., :3] * (1 - w) + rgb(st['tinte']) * w
    # contorno por anillos (de dentro afuera)
    prev = al; ext = exterior(al)
    for i, col in enumerate(st['anillos']):
        ring = dilate(prev, 1) & ~prev & ext
        out[ring, :3] = rgb(col); out[ring, 3] = 255
        prev = prev | ring
    out = out.clip(0, 255)
    # emblema sobre la cabeza: centrado en lo más alto de la silueta
    ys, xs = np.nonzero(al)
    top = ys.min()
    head = xs[ys <= top + 6]
    cx = (head.min() + head.max()) / 2
    pat, pal = emblema(tipo)
    k = 3 if tipo == 'elite' else 2
    hgt = len(pat) * k
    y = max(1, top - 6 - hgt)
    stamp(out, pat, pal, cx, y, k)
    return out.astype(np.uint8)

def hacer(nombre, tipo):
    src = os.path.join(HERE, nombre + '.webp')
    a = np.array(Image.open(src).convert('RGBA'))
    H, W = a.shape[:2]; fw = W // N
    out = np.zeros_like(a)
    for f in range(N):
        out[:, f * fw:(f + 1) * fw] = frame(a[:, f * fw:(f + 1) * fw], tipo)
    dst = os.path.join(HERE, f'{nombre}_{tipo}.webp')
    Image.fromarray(out).save(dst, lossless=True, quality=100, method=6)
    return dst

if __name__ == '__main__':
    if len(sys.argv) == 3: print(hacer(sys.argv[1], sys.argv[2]))
    else:
        for n in ELITES: print(hacer(n, 'elite'))
        for n in JEFES: print(hacer(n, 'jefe'))
