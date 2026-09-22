# Invitación de boda · Lesly y Gleen

Invitación estática, móvil y personalizada para la boda de Lesly y Gleen, el 28 de noviembre de 2026 a las 3:00 PM.

## Vista local

```powershell
node server.js
```

Abre `http://localhost:3000/ivory-photo-booth-wedding-website/`.

El generador privado de enlaces está en `http://localhost:3000/admin.html`. Cada enlace incluye el nombre, los cupos reservados y la fecha de caducidad. Los enlaces dejan de ser válidos al comenzar el 23 de octubre de 2026 (hora de Perú).

## Publicar en GitHub y Vercel

1. Sube esta carpeta a un repositorio de GitHub.
2. En Vercel selecciona **Add New > Project** e importa ese repositorio.
3. Deja **Framework Preset** en `Other` y el directorio de salida como `.`.
4. Despliega. `vercel.json` conserva las rutas limpias y el subdirectorio público de la invitación.

Las fuentes, el monograma y la música están almacenados localmente. El formulario RSVP abre WhatsApp y no necesita una API ni una base de datos en Vercel.
