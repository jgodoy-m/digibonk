#!/usr/bin/env python3
"""Aplica sitio.json al juego: dominio (etiquetas para compartir, robots, sitemap, CNAME),
nube y ranking (Supabase) y enlaces de Ko-fi, Discord y X.

Uso, desde la carpeta del repositorio:
    python3 tools/configurar.py            # aplica sitio.json
    python3 tools/configurar.py --comprobar  # solo dice qué falta, sin tocar nada

Se puede ejecutar las veces que haga falta: siempre reescribe los mismos bloques.
"""
import json, re, sys
from html import escape
from pathlib import Path
from urllib.parse import urlparse

RAIZ = Path(__file__).resolve().parent.parent
HTML = RAIZ / 'index.html'
TITULO = 'DigiBonk · Survivor 3D de Digimon'
DESC = 'Survivor 3D de Digimon, gratis en el navegador. Fan-game no oficial.'
IMG_ALT = 'Logo de DigiBonk sobre un paisaje pixel art con un portal y cascadas'


def fallo(msg):
    sys.exit('✗ ' + msg)


def limpiar_dominio(d):
    d = d.strip()
    if not d:
        return ''
    if '://' not in d:
        d = 'https://' + d
    u = urlparse(d)
    if u.scheme != 'https' or not u.hostname or '.' not in u.hostname:
        fallo(f'"dominio" no parece un dominio válido: {d!r} (ejemplo: "digibonk.com")')
    return u.hostname.lower()


def url_https(campo, v, host=None):
    v = v.strip()
    if not v:
        return ''
    u = urlparse(v)
    if u.scheme != 'https' or not u.hostname:
        fallo(f'"{campo}" tiene que ser una URL https completa: {v!r}')
    if host and not (u.hostname == host or u.hostname.endswith('.' + host)):
        fallo(f'"{campo}" debería ser de {host}: {v!r}')
    if any(c in v for c in '\'"<>\\ '):
        fallo(f'"{campo}" tiene caracteres no válidos: {v!r}')
    return v


def bloque_meta(dom):
    base = f'https://{dom}/' if dom else ''
    img = base + 'ui/compartir.jpg'
    a = lambda s: escape(s, quote=True)
    lineas = ['<!-- SITIO:inicio · lo escribe tools/configurar.py a partir de sitio.json (no lo edites a mano) -->']
    if not dom:
        lineas.append('<!-- Sin dominio en sitio.json: rutas relativas. Discord, X y WhatsApp solo muestran la imagen con URL absoluta. -->')
    else:
        lineas.append(f'<link rel="canonical" href="{base}">')
    lineas += [
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="DigiBonk">',
        f'<meta property="og:title" content="{a(TITULO)}">',
        f'<meta property="og:description" content="{a(DESC)}">',
    ]
    if dom:
        lineas.append(f'<meta property="og:url" content="{base}">')
    lineas += [
        f'<meta property="og:image" content="{img}">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        f'<meta property="og:image:alt" content="{a(IMG_ALT)}">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{a(TITULO)}">',
        f'<meta name="twitter:description" content="{a(DESC)}">',
        f'<meta name="twitter:image" content="{img}">',
        '<!-- SITIO:fin -->',
    ]
    return '\n'.join(lineas)


def sustituir(s, patron, nuevo, nombre):
    s2, n = re.subn(patron, lambda m: nuevo, s, flags=re.S)
    if n != 1:
        fallo(f'No encuentro el bloque {nombre} en index.html (¿se ha borrado el comentario SITIO:?)')
    return s2


def main():
    solo_comprobar = '--comprobar' in sys.argv
    cfg = json.loads((RAIZ / 'sitio.json').read_text(encoding='utf-8'))
    g = lambda k: str(cfg.get(k) or '')

    dom = limpiar_dominio(g('dominio'))
    sb_url = url_https('supabase_url', g('supabase_url')).rstrip('/')
    sb_key = g('supabase_anon_key').strip()
    if sb_url and not re.fullmatch(r'https://[a-z0-9-]+\.supabase\.co', sb_url):
        print(f'· Aviso: supabase_url no tiene la forma https://xxxx.supabase.co ({sb_url}); la uso igualmente.')
    if sb_key and not re.fullmatch(r'[A-Za-z0-9._-]{20,}', sb_key):
        fallo('"supabase_anon_key" no parece una clave anon (copia la "anon public" de Project Settings → API)')
    if sb_key.startswith('sb_secret_') or 'service_role' in sb_key:
        fallo('Esa es la clave secreta (service_role). Pon la "anon public": la secreta nunca va en el juego.')
    if bool(sb_url) != bool(sb_key):
        fallo('Para la nube hacen falta los dos: "supabase_url" y "supabase_anon_key"')
    kofi = url_https('kofi', g('kofi'), 'ko-fi.com')
    discord = url_https('discord', g('discord'))
    bugs = url_https('discord_bugs', g('discord_bugs'))
    x = url_https('x', g('x'))

    estado = [
        ('Dominio', dom or None),
        ('Nube y ranking (Supabase)', sb_url or None),
        ('Ko-fi', kofi or None),
        ('Discord', discord or None),
        ('X', x or None),
    ]
    for nombre, v in estado:
        print(f'{"✓" if v else "·"} {nombre}: {v or "vacío (apagado)"}')
    if solo_comprobar:
        return

    s = HTML.read_text(encoding='utf-8')
    s = sustituir(s, r'<!-- SITIO:inicio.*?<!-- SITIO:fin -->', bloque_meta(dom), 'SITIO:inicio/fin')
    s = sustituir(s, r"const CLOUD_CFG = \{[^\n]*?\};(?=\s*// SITIO:nube)",
                  f"const CLOUD_CFG = {{url: '{sb_url}', key: '{sb_key}'}};", 'SITIO:nube')
    s = sustituir(s, r"const HM_DISCORD_URL=[^\n]*?;(?=\s*// SITIO:enlaces)",
                  f"const HM_DISCORD_URL='{discord}', HM_DISCORD_BUGS_URL='{bugs}', HM_X_URL='{x}', HM_KOFI_URL='{kofi}';",
                  'SITIO:enlaces')
    HTML.write_text(s, encoding='utf-8')

    robots, sitemap, cname = RAIZ / 'robots.txt', RAIZ / 'sitemap.xml', RAIZ / 'CNAME'
    if dom:
        robots.write_text(f'User-agent: *\nAllow: /\n\nSitemap: https://{dom}/sitemap.xml\n', encoding='utf-8')
        sitemap.write_text('<?xml version="1.0" encoding="UTF-8"?>\n'
                           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                           f'  <url><loc>https://{dom}/</loc></url>\n</urlset>\n', encoding='utf-8')
        cname.write_text(dom + '\n', encoding='utf-8')   # solo lo usa GitHub Pages; Cloudflare Pages lo ignora
    else:
        for f in (robots, sitemap, cname):
            f.unlink(missing_ok=True)
    print('Listo: index.html actualizado' + (', con robots.txt, sitemap.xml y CNAME' if dom else '') + '.')


if __name__ == '__main__':
    main()
