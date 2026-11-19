# Lanzamiento: dominio propio, ranking global y Ko-fi

Todo lo que se configura está en **`sitio.json`**. Rellena lo que tengas y ejecuta:

```bash
python3 tools/configurar.py              # aplica sitio.json a index.html
python3 tools/configurar.py --comprobar  # solo dice qué está activo y qué falta
```

Lo que se deja vacío sigue apagado: el juego funciona igual que ahora. Se puede ir rellenando por partes y volver a ejecutarlo.

## Orden recomendado (de principio a fin)

Cada paso usa lo del anterior, así que conviene hacerlos en este orden. Lo marcado con 🔒 es secreto: guárdalo en un gestor de contraseñas y **no lo pegues en ningún chat ni en el repositorio**.

| # | Qué | Dónde | Qué sale de aquí |
|---|---|---|---|
| 1 | Crear el correo de DigiBonk (p. ej. una cuenta de Gmail nueva) y activar la verificación en dos pasos | Gmail | El correo con el que se crean todas las cuentas de abajo 🔒 (su contraseña) |
| 2 | Crear la cuenta de Cloudflare con ese correo y activar la verificación en dos pasos | https://dash.cloudflare.com/sign-up | — |
| 3 | Comprobar y comprar el dominio | Cloudflare → **Domain Registration → Register Domains** | El dominio, p. ej. `digibonk.com` (apartado 1) |
| 4 | Publicar el juego con Cloudflare Pages y enlazar el dominio | Cloudflare → **Workers & Pages** | El juego en `https://tu-dominio` (apartado 1) |
| 5 | Crear el proyecto de Supabase con el mismo correo (puedes entrar con GitHub, pero mejor con el correo de DigiBonk) | https://supabase.com/dashboard | 🔒 contraseña de la base de datos; la *Project URL* y la *Publishable key* (son públicas) |
| 6 | Seguir [`supabase/README.md`](supabase/README.md): `schema.sql`, cuentas anónimas, plantillas de correo, Site URL | Panel de Supabase | El ranking listo en el servidor |
| 7 | Correo propio para los códigos de inicio de sesión (SMTP con Resend) | https://resend.com + DNS de Cloudflare | 🔒 clave de Resend (solo se pega en Supabase) |
| 8 | Página de Ko-fi | https://ko-fi.com | La URL de tu Ko-fi (apartado 3) |
| 9 | Rellenar `sitio.json` con lo público (dominio, Project URL, Publishable key, Ko-fi, autor) y ejecutar `python3 tools/configurar.py` | Repositorio | El juego publicado ya usa la nube y el ranking |
| 10 | Tu cuenta de desarrollador con todo desbloqueado (cuando esté fusionado el cambio que la añade) | Juego + Supabase | Ver «Tu cuenta de desarrollador» en `supabase/README.md` |

**Qué es público y qué no.** El dominio, la *Project URL* de Supabase, la *Publishable key* (o *anon public*) y la URL de Ko-fi acaban dentro del juego, así que cualquiera puede verlas: se pueden pasar por el chat para que las ponga un hilo en `sitio.json`.
Nunca van al juego ni a un chat: la contraseña del correo, la de Cloudflare, la de la base de datos de Supabase, la *Secret key* / *service_role* de Supabase y la clave de Resend.

| Campo de `sitio.json` | Qué activa | De dónde sale |
|---|---|---|
| `dominio` | Vista previa con imagen al compartir el enlace (Discord, X, WhatsApp), `robots.txt`, `sitemap.xml` y `CNAME` | El dominio que compres, p. ej. `digibonk.com` |
| `supabase_url` y `supabase_anon_key` | Guardado en la nube y ranking mundial y por regiones | Supabase → Project Settings → API |
| `kofi` | Botón «Apoyar» del menú (mantenimiento del servidor) | Tu página de Ko-fi, p. ej. `https://ko-fi.com/digibonk` |
| `discord`, `discord_bugs`, `x` | Botones de Discord, X y de reportar bugs | Más adelante |
| `autor` | Nombre o alias que sale como autor en la pantalla de Créditos (vacío: se ve el aviso «Pendiente») | Tu nombre o alias público |

## 1. Dominio y alojamiento

Recomendación: **Cloudflare** para las dos cosas. El alojamiento (Cloudflare Pages) es gratis, sin límite de tráfico, admite repositorios privados de GitHub y publica solo cada vez que se fusiona en la rama del juego. El dominio en Cloudflare Registrar se paga a precio de coste (un `.com` ronda los 10 € al año).

1. Compra el dominio. Comprueba antes que está libre: `digibonk.com` es el más fácil de recordar; `.gg` y `.io` son habituales en juegos pero cuestan bastante más.
   Evita poner «digimon» en el dominio: es marca registrada de Bandai y es lo primero que se reclama.
2. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** → elige `jgodoy-m/digibonk`.
   - Production branch: **`master-9z61e4`**. Es la rama en la que se fusionan todos los cambios; `master` lleva días sin actualizarse y publicaría una versión vieja.
   - Framework: *None*. Build command: vacío. Output directory: `/`.
3. En el proyecto de Pages → **Custom domains → Set up a custom domain** → tu dominio (y `www` si quieres que redirija). Si el dominio es de Cloudflare, el DNS y el certificado se ponen solos.
   La primera vez, Cloudflare pide permiso para leer el repositorio en GitHub: dáselo solo para `jgodoy-m/digibonk`.
   Cada fusión en `master-9z61e4` se publica sola en un par de minutos. Los PR en borrador también reciben una vista previa en una dirección `*.pages.dev` aparte, sin tocar el dominio.
4. Pon el dominio en `sitio.json`, ejecuta `python3 tools/configurar.py` y sube el cambio.
5. Comprueba la vista previa pegando la URL en https://www.opengraph.xyz o en un chat de Discord.

> Alternativa: GitHub Pages también vale (el archivo `CNAME` ya se genera), pero con el repositorio privado necesita GitHub Pro.

## 2. Ranking global (Supabase)

Los pasos detallados están en [`supabase/README.md`](supabase/README.md). En resumen: crear el proyecto, ejecutar `schema.sql`, activar las cuentas anónimas, poner el código `{{ .Token }}` en las plantillas de correo, y copiar la *Project URL* y la clave *anon public* en `sitio.json`.
Con el dominio ya comprado, añádelo en Supabase → Authentication → URL Configuration → **Site URL** (`https://tu-dominio`).

## 3. Ko-fi

1. Crea la página en https://ko-fi.com (gratis; Ko-fi no cobra comisión en las donaciones sueltas).
2. En la descripción, deja claro para qué es: «DigiBonk es gratis. Las donaciones pagan el servidor del ranking y el dominio». No vendas nada a cambio (ni personajes ni ventajas): con un fan-game de Digimon, cobrar por contenido es lo que más riesgo tiene.
3. Copia la URL de tu página en `kofi` y ejecuta `python3 tools/configurar.py`. El botón «Apoyar» del menú aparece solo.
4. Agradecimiento opcional: el código `DIGIMECENAS` (se canjea en la Tienda del menú) da el marco y el título «Mecenas», solo cosméticos. Puedes ponerlo en el mensaje de gracias de Ko-fi. Ten en cuenta que, aunque sea solo estética, es algo a cambio de dinero; si prefieres no arriesgar, no lo publiques. Para cambiar el código, cambia su huella en `REWARD_CODES` de `index.html` (FNV-1a del código en mayúsculas sin guiones).

Coste aproximado del servidor: Supabase es gratis hasta 500 MB de base de datos y 50.000 usuarios activos al mes. El plan de pago (25 $/mes) solo hace falta si se supera eso. El dominio son unos 10 € al año.
