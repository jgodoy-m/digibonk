# Nube y ranking (Supabase)

El juego funciona sin esto: con `CLOUD_CFG` vacío en `index.html` todo se guarda en el navegador, como antes.
Para activar el guardado en la nube y el ranking por regiones:

1. Crea un proyecto gratis en https://supabase.com (región: Europa, p. ej. Frankfurt).
2. **SQL Editor** → pega y ejecuta `supabase/schema.sql`.
3. **Authentication → Sign In / Providers**:
   - activa **Allow anonymous sign-ins** (cada jugador tiene cuenta sin registrarse);
   - deja activado **Email**.
   - Recomendado: **Attack Protection → CAPTCHA** más adelante, si aparecen cuentas basura.
4. **Authentication → Emails → Templates**: en **Magic Link** y en **Change Email Address**, añade el código al texto, por ejemplo
   `Tu código de DigiBonk: {{ .Token }}`. El juego pide ese código de 6 cifras (no usa enlaces, así funciona también dentro de itch.io).
5. **Project Settings → API**: copia la *Project URL* y la clave *anon public* en `index.html`:
   ```js
   const CLOUD_CFG = {url: 'https://xxxx.supabase.co', key: 'eyJ...'};
   ```
   La clave anon es pública por diseño; la seguridad la ponen las reglas de `schema.sql`.
6. El correo de Supabase por defecto solo envía unos pocos emails por hora. Para el lanzamiento conviene
   configurar un SMTP propio (Authentication → Emails → SMTP), por ejemplo Resend o Brevo, que tienen plan gratis.

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
