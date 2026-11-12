# Convierte una hoja de 5 poses dibujada a mano (o generada) al formato del juego.
# Entrada: PNG con fondo transparente y las 5 poses en fila, cada una en su quinta parte del ancho,
#   en el orden reposo 1, reposo 2, ataque (preparación), ataque (golpe), daño.
# Salida: sprites/anim/<nombre>.png, 5 fotogramas cuadrados de LADO px, con el Digimon apoyado abajo
#   y la misma altura relativa en el fotograma que tenía la hoja anterior (así no cambia su tamaño en el juego).
# También actualiza la imagen fija sprites/adventure/<nombre>.png con la primera pose.
# Limpia el borde semitransparente, las motas sueltas y el fondo difuminado (umbral de alfa).
# Uso: python3 sprites/anim/importar_hoja.py <entrada.png> <nombre> [--alto 0.70] [--umbral 128] [--lado 256]
import argparse, os
from collections import deque
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
N = 5

def components(mask):
    """Etiqueta las zonas conectadas (8 vecinos). Devuelve (etiquetas, tamaños)."""
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    sizes = [0]
    for y0, x0 in zip(*np.nonzero(mask)):
        if lab[y0, x0]:
            continue
        n = len(sizes); lab[y0, x0] = n; q = deque([(y0, x0)]); s = 0
        while q:
            y, x = q.popleft(); s += 1
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = n; q.append((yy, xx))
        sizes.append(s)
    return lab, np.array(sizes)

def clean(mask, keep=0.02):
    """Quita motas (zonas de menos del 2 % de la mayor) y rellena huecos interiores."""
    lab, sizes = components(mask)
    if len(sizes) <= 1:
        return mask
    good = sizes >= sizes[1:].max() * keep
    good[0] = False
    m = good[lab]
    # huecos: zonas vacías que no tocan el borde
    holes, _ = components(~m)
    edge = set(np.unique(np.concatenate([holes[0], holes[-1], holes[:, 0], holes[:, -1]])))
    fill = ~np.isin(holes, list(edge)) & (holes > 0)
    return m | fill

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('entrada'); ap.add_argument('nombre')
    ap.add_argument('--alto', type=float, help='altura del Digimon respecto al fotograma (por defecto, la de la hoja actual)')
    ap.add_argument('--abajo', type=float, help='margen inferior respecto al alto del fotograma (por defecto, el de la hoja actual)')
    ap.add_argument('--umbral', type=int, default=128, help='alfa mínima que cuenta como sprite (sube a 240 si hay fondo difuminado)')
    ap.add_argument('--lado', type=int, default=256, help='lado del fotograma de salida')
    a = ap.parse_args()
    out = os.path.join(HERE, a.nombre + '.png')
    alto, abajo = a.alto, a.abajo
    if (alto is None or abajo is None) and os.path.exists(out):
        old = np.array(Image.open(out).convert('RGBA'))[..., 3] > 0
        hh = old.shape[0]; ys = np.nonzero(old[:, :hh].any(1))[0]
        if alto is None: alto = (ys.max() - ys.min() + 1) / hh
        if abajo is None: abajo = (hh - 1 - ys.max()) / hh
    alto = alto or 0.75; abajo = abajo or 0.02
    src = np.array(Image.open(a.entrada).convert('RGBA')).astype(np.float64)
    H, W = src.shape[:2]
    slots = []
    for i in range(N):
        x0, x1 = round(i * W / N), round((i + 1) * W / N)
        s = src[:, x0:x1].copy()
        m = clean(s[..., 3] >= a.umbral)
        s[..., 3] = np.where(m, 255, 0)
        slots.append(s)
    # caja común a las 5 poses, para que no salten entre fotogramas
    sw = min(s.shape[1] for s in slots)
    slots = [s[:, :sw] for s in slots]
    union = np.zeros((H, sw), bool)
    for s in slots: union |= s[..., 3] > 0
    ys, xs = np.nonzero(union)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    L = a.lado
    k = min(alto * L / (y1 - y0), (L - 4) / (x1 - x0))
    nw, nh = max(1, round((x1 - x0) * k)), max(1, round((y1 - y0) * k))
    sheet = Image.new('RGBA', (L * N, L), (0, 0, 0, 0))
    for i, s in enumerate(slots):
        c = s[y0:y1, x0:x1]
        al = c[..., 3:4] / 255
        pre = Image.fromarray(np.concatenate([c[..., :3] * al, c[..., 3:4]], 2).astype(np.uint8), 'RGBA')
        r = np.array(pre.resize((nw, nh), Image.LANCZOS)).astype(np.float64)
        alpha = r[..., 3]
        rgb = np.where(alpha[..., None] > 0, r[..., :3] * 255 / np.maximum(alpha[..., None], 1), 0)
        fr = np.concatenate([np.clip(rgb, 0, 255), np.where(alpha >= 128, 255, 0)[..., None]], 2).astype(np.uint8)
        px = i * L + (L - nw) // 2
        py = L - round(abajo * L) - nh
        sheet.alpha_composite(Image.fromarray(fr, 'RGBA'), (px, py))
    sheet.save(out)
    # Imagen fija (sprites/adventure/<nombre>.png): la pose de reposo recortada, cuadrada y con 8 px de margen
    fixed = os.path.join(HERE, '..', 'adventure', a.nombre + '.png')
    if os.path.exists(fixed):
        f0 = sheet.crop((0, 0, L, L)); bx = f0.getbbox()
        f0 = f0.crop(bx); side = max(f0.size) + 16
        sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        sq.alpha_composite(f0, ((side - f0.width) // 2, side - 8 - f0.height))
        sq.save(fixed)
    print(f'{out}: {L * N}x{L}, Digimon a {alto:.2f} del alto, escala {k:.3f}')

if __name__ == '__main__':
    main()
