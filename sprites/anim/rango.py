# Genera las hojas de rango de los enemigos fuertes a partir de su hoja normal (mismas 5 poses y tamaño):
#   <id>_elite.webp  élites: contorno de brasas (rojo anaranjado), cuerpo con un tinte rojizo
#   <id>_jefe.webp   jefes menores: contorno dorado con halo morado y sombras moradas
# Así se distinguen a simple vista de los enemigos normales del mismo Digimon (Tyrannomon es tanque y élite, por ejemplo).
# Uso: python3 sprites/anim/rango.py            (regenera todas las de ELITES y JEFES)
#      python3 sprites/anim/rango.py tyrannomon elite
import os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
N = 5
PAD = 0.05   # margen añadido a cada lado, en fracción del fotograma (el fotograma crece 2·PAD)
ELITES = ['tyrannomon', 'darktyrannomon', 'gigadramon', 'megadramon', 'skullgreymon', 'andromon', 'mammothmon']
JEFES = ['devimon', 'etemon', 'myotismon', 'metalseadramon', 'puppetmon', 'machinedramon']

def rgb(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32)

ESTILO = {
    # anillos del contorno de dentro afuera; tinte = mezcla del cuerpo hacia un color en las zonas oscuras
    'elite': {'anillos': ['#1a0300', '#ff3d00', '#ff3d00', '#ff8a1a', '#ffd27a'], 'tinte': '#b3261e', 'fuerza': 0.16},
    'jefe':  {'anillos': ['#14031f', '#ffc400', '#ffc400', '#fff176', '#d500f9', '#d500f9'], 'tinte': '#7b1fa2', 'fuerza': 0.16},
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
    return out.astype(np.uint8)

def hacer(nombre, tipo):
    src = os.path.join(HERE, nombre + '.webp')
    a = np.array(Image.open(src).convert('RGBA'))
    H, W = a.shape[:2]; fw = W // N
    # El contorno grueso no cabe en el margen de la hoja: cada fotograma crece un 10 % (P a los lados y 2P arriba,
    # nada abajo para que los pies sigan en el suelo) y el juego agranda el sprite lo mismo (RANK_K en index.html)
    P = round(fw * PAD)
    nf = fw + 2 * P
    out = np.zeros((nf, nf * N, 4), np.uint8)
    for f in range(N):
        src_f = np.zeros((nf, nf, 4), np.uint8)
        src_f[nf - H:, P:P + fw] = a[:, f * fw:(f + 1) * fw]
        out[:, f * nf:(f + 1) * nf] = frame(src_f, tipo)
    dst = os.path.join(HERE, f'{nombre}_{tipo}.webp')
    Image.fromarray(out).save(dst, lossless=True, quality=100, method=6)
    return dst

if __name__ == '__main__':
    if len(sys.argv) == 3: print(hacer(sys.argv[1], sys.argv[2]))
    else:
        for n in ELITES: print(hacer(n, 'elite'))
        for n in JEFES: print(hacer(n, 'jefe'))
