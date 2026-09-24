# Invitación de boda · Gleen y Lesly

Invitación estática, móvil y personalizada para la boda de Gleen y Lesly, el 28 de noviembre de 2026 a las 3:00 PM.

## Vista local

```powershell
node server.js
```

Abre `http://localhost:3000/`.

El panel privado está en `http://localhost:3000/admin`. Los nuevos enlaces guardan el invitado, los cupos, la fecha de caducidad y la confirmación en Supabase. Los enlaces dejan de ser válidos al comenzar el 23 de octubre de 2026 (hora de Perú).

## Base de datos y panel privado

1. Crea un proyecto en Supabase y ejecuta `supabase/migrations/202609230001_create_invitation_rsvp.sql` en **SQL Editor**.
2. Crea en Supabase Auth el usuario que administrará la lista.
3. Copia `.env.example` como `.env.local` y completa sus valores. `.env.local` está ignorado por Git.
4. Configura las mismas variables en Vercel para Production, Preview y Development:

   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `ADMIN_EMAILS` (uno o varios correos separados por coma)
   - `WHATSAPP_NUMBER` (código de país y número, solo dígitos)

La clave secreta solo se usa dentro de las funciones `/api/admin` y `/api/invitation`; nunca se expone en el HTML. Las tablas tienen RLS habilitado y no conceden acceso a `anon` ni `authenticated`.

## Publicar en GitHub y Vercel

1. Sube esta carpeta a un repositorio de GitHub.
2. En Vercel selecciona **Add New > Project** e importa ese repositorio.
3. Deja **Framework Preset** en `Other`. No hace falta configurar comandos: `vercel.json` fija el directorio de salida en `.` y desactiva el build.
4. Despliega. La portada y todas las pantallas usan rutas limpias; los enlaces antiguos con `/ivory-photo-booth-wedding-website` redirigen automáticamente a las nuevas rutas.

Las fuentes, el monograma y la música están almacenados localmente. El formulario guarda primero la confirmación en Supabase y luego abre WhatsApp. Los enlaces antiguos con `?i=` continúan abriendo la invitación, pero no registran respuestas en el panel; las invitaciones nuevas usan `?invite=`.
