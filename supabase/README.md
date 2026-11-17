# Nube y ranking (Supabase)

El juego funciona sin esto: con `supabase_url` vacío en `sitio.json` todo se guarda en el navegador, como antes.
Para activar el guardado en la nube y el ranking por regiones:

Antes: ten creado el correo de DigiBonk y, si puede ser, el dominio comprado (orden completo en [`LANZAMIENTO.md`](../LANZAMIENTO.md)).
Lo marcado con 🔒 es secreto: va a un gestor de contraseñas, nunca a un chat ni al repositorio.

1. **Crear el proyecto.** https://supabase.com/dashboard → regístrate con el correo de DigiBonk → **New project**.
   - Organization: la que te crea por defecto (plan **Free**).
   - Project name: `digibonk`.
   - Database password: pulsa **Generate a password** y guárdala 🔒. El juego no la usa; solo sirve para entrar a la base de datos desde fuera.
   - Region: **Central EU (Frankfurt)** (o la más cercana a la mayoría de jugadores).
   - Espera un par de minutos a que diga que el proyecto está listo.
2. **Crear las tablas.** Menú izquierdo → **SQL Editor** → **New query** → pega todo `supabase/schema.sql` → **Run**.
   Tiene que acabar en «Success. No rows returned». Se puede volver a ejecutar sin perder datos: hazlo cada vez que un cambio del juego toque `schema.sql`.
3. **Cuentas.** **Authentication → Sign In / Providers**:
   - activa **Allow anonymous sign-ins** (cada jugador tiene cuenta sin registrarse) y guarda;
   - en **Email**, deja activado el proveedor y **Confirm email** (el juego confirma con un código).
   - Más adelante, si aparecen cuentas basura: **Attack Protection → CAPTCHA**.
4. **Correo con código.** **Authentication → Emails → Templates**: en **Magic Link** y en **Change Email Address**, cambia el texto para que lleve el código, por ejemplo:
   ```
   Asunto: Tu código de DigiBonk
   Tu código de DigiBonk es {{ .Token }}. Caduca en una hora. Si no lo has pedido, ignora este correo.
   ```
   El juego pide ese código de 6 cifras (no usa enlaces, así funciona también dentro de itch.io).
5. **Dominio.** **Authentication → URL Configuration → Site URL**: `https://tu-dominio` (sin barra final). Si aún no lo tienes, déjalo para luego.
6. **Claves para el juego.** **Project Settings → API Keys** (o el botón **Connect** de arriba):
   - *Project URL*: `https://xxxx.supabase.co`
   - *Publishable key* (`sb_publishable_...`) o, en la pestaña *Legacy*, la *anon public* (`eyJ...`). Cualquiera de las dos vale.

   Estas dos son públicas por diseño (van dentro del juego); la seguridad la ponen las reglas de `schema.sql`.
   Ponlas en `sitio.json` y ejecuta `python3 tools/configurar.py`, o pásalas por el chat para que lo haga un hilo:
   ```json
   "supabase_url": "https://xxxx.supabase.co",
   "supabase_anon_key": "sb_publishable_..."
   ```
   **Nunca** uses la *Secret key* (`sb_secret_...`) ni la *service_role* 🔒: el script las rechaza.
7. **Correo propio (antes de abrir al público).** El correo de Supabase por defecto solo manda unos pocos emails por hora, y los códigos dejarían de llegar.
   - Crea una cuenta gratis en https://resend.com con el correo de DigiBonk → **Domains → Add domain** → tu dominio. Si el dominio está en Cloudflare, Resend ofrece añadir los registros DNS solo; si no, cópialos a mano en Cloudflare → DNS.
   - Cuando Resend marque el dominio como *Verified*: **API Keys → Create API key** (permiso *Sending access*) 🔒.
   - En Supabase, **Authentication → Emails → SMTP Settings** → **Enable Custom SMTP**:
     host `smtp.resend.com`, puerto `465`, usuario `resend`, contraseña = esa API key 🔒, remitente `noreply@tu-dominio`, nombre `DigiBonk`.
   - Prueba: vincula tu correo desde el juego y comprueba que llega el código.
8. En el plan gratis, Supabase pausa el proyecto tras 7 días sin ninguna visita. Con jugadores no pasa;
   si se pausa, se reactiva desde el panel con un clic.

## Tu cuenta de desarrollador (todo desbloqueado)

El juego publicado no tiene ningún atajo ni código para desbloquearlo todo: lo decide el servidor.

1. Entra en el juego online, ve a **Ajustes → Nube y ranking** y vincula tu email (así la cuenta es permanente y la usas en cualquier dispositivo).
2. En Supabase, **Authentication → Users**, busca tu email y copia su **User UID**.
3. **SQL Editor** → ejecuta (cambiando el UID):
   ```sql
   insert into public.devs (user_id, note) values ('00000000-0000-0000-0000-000000000000', 'Jaime');
   ```
4. Recarga el juego. Al sincronizar con la nube, tu cuenta recibe todos los Digimon, skins, evoluciones, marcos, títulos,
   objetos y 99.999 Bits. Si más adelante se añade contenido nuevo, lo recibe al cargar el juego.

Las partidas de una cuenta de desarrollador no entran en el ranking. Para quitarla: `delete from public.devs where user_id = '...';`
(lo ya desbloqueado se queda en esa cuenta).

## Cómo funciona

- Al entrar, el juego crea una cuenta anónima y sube el progreso (el mismo contenido que el código DBK1-).
  Se vuelve a subir al acabar cada partida, cada minuto en los menús y al cerrar la pestaña, solo si ha cambiado.
- Vincular un email convierte esa cuenta en permanente. En otro dispositivo se entra con el mismo email.
- Si dos dispositivos han cambiado el progreso a la vez, el juego pregunta cuál conservar. Si solo cambió uno, lo carga sin preguntar.
- El modo invitado (de pruebas, todo desbloqueado) no sube nada.
- Ranking: mejor marca de cada jugador por modo, mapa y dificultad, mundial o por región. La región se deduce
  de la zona horaria del dispositivo y se puede cambiar en Ajustes → Nube y ranking.
- "Eliminar cuenta" en Ajustes también borra la cuenta y las marcas de la nube.

## Límites conocidos

- Las partidas se calculan en el navegador, así que alguien con conocimientos puede enviar marcas falsas.
  `submit_score` rechaza cifras imposibles y partidas más largas que el tiempo pasado desde la anterior,
  pero no es a prueba de trampas. Para borrar una marca: Table Editor → `scores`.
- Los nombres de entrenador no se moderan (máx. 16 caracteres).
