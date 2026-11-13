# Agix móvil

App de Agix para Android e iOS, hecha con **Expo (SDK 58) + React Native + TypeScript** y
**Expo Router**. Usa el mismo backend que la web: Supabase (Auth, tablas con RLS) y la Edge
Function `estimate-task`. Es un proyecto independiente de la web (`Agix-App`): tiene su propio
`package.json` (con npm) y no comparte código con ella.

## Puesta en marcha

```bash
npm install
cp .env.example .env   # pon la misma URL y clave anónima de Supabase que usa la web
npx expo start         # escanea el QR con Expo Go, o pulsa «a» (Android) / «w» (web)
```

- La `.env` solo lleva valores **públicos** (`EXPO_PUBLIC_SUPABASE_URL`,
  `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_WEB_URL`). La seguridad la ponen las
  políticas RLS. **Nunca** pongas en la app la `service_role`, `AGIX_API_KEY` ni
  `GROQ_API_KEY`: esas son secretos de las Edge Functions.
- Sin `.env`, la pantalla de acceso ofrece **«Probar con datos de ejemplo»**: un modo
  demostración que guarda todo en el dispositivo y no toca ninguna cuenta.
- Para instalarla como app se usa EAS (ver «Generar el APK» más abajo).

## Generar el APK

El `.env` **no** viaja a los servidores de EAS (está en `.gitignore`), así que las variables
públicas se guardan una vez en EAS:

```bash
npx eas-cli@latest login
npx eas-cli@latest init        # vincula el proyecto y añade projectId a app.json
npx eas-cli@latest env:set --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co --visibility plaintext
npx eas-cli@latest env:set --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon-key> --visibility plaintext
npx eas-cli@latest env:set --environment production --name EXPO_PUBLIC_WEB_URL --value https://agixwebapp.web.app --visibility plaintext
npx eas-cli@latest build -p android --profile apk   # o: npm run build:apk
```

Atajo: con el `.env` ya relleno, `npx eas-cli@latest env:push --environment production` sube las
tres variables de una vez.

Perfiles de `eas.json`:

| Perfil | Resultado |
|---|---|
| `apk` | APK firmado para instalar directo (descarga desde la landing). |
| `production` | AAB para Google Play. |
| `development` | Development build para depurar con módulos nativos. |

EAS crea y guarda la clave de firma la primera vez: **usa siempre la misma** (no la borres en
expo.dev), o los teléfonos no podrán actualizar sobre la versión instalada.

## Comandos

| Comando | Para qué |
|---|---|
| `npm start` | Servidor de desarrollo (Expo Go, emulador o web) |
| `npm test` | Pruebas de la lógica (Vitest) |
| `npm run typecheck` | Comprobación de tipos |
| `npm run lint` | ESLint de Expo |
| `npx expo-doctor` | Revisa dependencias y configuración |

## Qué hace

| Pantalla | Historia | Detalle |
|---|---|---|
| Acceso | — | Correo y contraseña, las mismas credenciales de la web; la sesión queda guardada. |
| Proyectos | HU-43 | Personales y por equipo, con avance; resumen del día y cronómetro en curso. Abre al instante con la última copia guardada y avisa cuando no hay conexión. |
| Tablero | HU-44 | Columnas deslizables, filtro por sprint y **«Mover a»** con botones grandes. Antes de mover relee la tarea: si otra persona ya la movió, no pisa su cambio y lo avisa. |
| Detalle de tarea | HU-44/45 | Estimado frente a real, historia con criterios, RNF, incidencias y cronómetro. |
| Cronómetro | HU-45 | Usa `time_sessions`, igual que la web: si se inicia en la computadora aparece aquí, y el tiempo sale de `started_at`, así que sigue contando en segundo plano. |
| Avisos | HU-46 | Tareas asignadas, tareas pasadas de su estimación, cronómetro olvidado y lecciones nuevas. |
| Perfil | — | Datos editables, horas de la semana y cierre de sesión (borra la copia local). |
| Nueva tarea | — | Sugerencia de horas con la IA (`estimate-task`: modelo propio de Agix o sustituto provisional), guardada en `task_estimates` como en la web. |

Reglas compartidas con la web (se respetan a propósito):

- El tiempo real de una tarea es el mayor entre sus sesiones y `tiempo_real`, más `extra_time_seconds`.
- Al pausar se copia el total de sesiones a `tiempo_real`; al finalizar, la tarea pasa a la última columna.
- Mover una tarea la deja al final de la columna destino (`position` = máximo + 1024).

## Estructura

```
src/
  app/        Rutas de Expo Router (cada archivo es una pantalla)
  data/       Backend (Supabase y demostración), estado global, caché local
  domain/     Lógica pura y probada: tiempos, tablero, cronómetro, avisos, estimación
  ui/         Sistema visual de Agix: tema, tarjetas, botones, logo, barra de pestañas
  hooks/      useNow (reloj en vivo)
  lib/        Configuración, cliente de Supabase, almacenamiento
```

## Límites conocidos

- La base no emite cambios en vivo (Realtime no está activado), así que la app recarga al
  volver a primer plano, cada minuto y al deslizar hacia abajo.
- No hay avisos de vencimiento: las fechas del cronograma todavía no se guardan en la base.
- Crear proyectos con IA, el cronograma, los informes y la gestión de equipos siguen en la web.
