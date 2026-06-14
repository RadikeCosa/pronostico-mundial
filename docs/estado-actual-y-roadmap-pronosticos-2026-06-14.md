# Estado actual y roadmap - Pronosticos Mundial 2026

Fecha del audit: 2026-06-14

## Resumen ejecutivo

El proyecto ya tiene una v1 vertical funcional, desplegable en Vercel, con Next.js App Router, Prisma 7, Postgres, seed del fixture, seleccion de participante, alta simple de participantes, carga/edicion de pronosticos, bloqueo server-side por kickoff, reveal de pronosticos desde kickoff, tabla de puntos calculada en lectura y carga manual de resultados en `/admin/results`.

No se detectan bloqueos P0 para seguir iterando. El principal trabajo antes del proximo patch no es arrancar desde cero, sino alinear el contrato funcional con el codigo real y agregar una capa minima de login familiar sin romper los datos existentes.

Hay dos diferencias importantes contra el contrato original:

- La carga manual de resultados ya existe.
- El scoring de eliminacion directa implementa 1 punto por acertar clasificado en empate no exacto, aunque el contrato inicial decia dejar esa regla pendiente.

## Estado funcional actual

### Flujo de ingreso

La ruta `/` muestra participantes activos y permite ingresar haciendo click en una tarjeta de participante. No hay login, password, cookie de sesion ni localStorage: la identidad operativa queda representada por el `participantId` en la URL.

Tambien desde `/` se puede crear un participante nuevo con nombre. El participante queda activo por defecto.

### Flujo de participante

La ruta `/p/[participantId]` muestra:

- header con el nombre del participante;
- filtros por dia;
- filtros por grupo;
- tabla de puntos;
- listado de partidos;
- estado del pronostico propio por partido;
- link al detalle de partido.

No existen hoy las rutas sugeridas `/u/[participantSlug]`, `/u/[participantSlug]/matches` ni `/u/[participantSlug]/standings`. La app usa ids internos en `/p/[participantId]`.

### Flujo de pronostico

La ruta `/p/[participantId]/matches/[matchId]` muestra el detalle del partido. Antes del kickoff:

- muestra el pronostico propio si existe;
- muestra formulario para crear o editar el pronostico propio;
- no muestra pronosticos de otros participantes;
- informa que los pronosticos ajenos se revelan desde el kickoff.

Desde el kickoff:

- oculta el formulario;
- muestra mensaje de bloqueo;
- revela pronosticos de todos los participantes activos;
- muestra explicitamente participantes sin pronostico;
- muestra resultado cargado si existe;
- muestra puntos por participante si hay resultado.

La accion `upsertPredictionAction` vuelve a validar server-side que el participante exista, este activo, el partido exista y `now < kickoffAt`. La UI no es la unica barrera.

### Flujo de resultados

La ruta `/admin/results` ya existe y permite cargar o editar resultados manualmente. La ruta no tiene auth ni permisos en este momento y avisa visualmente que impacta directo en la tabla de puntos.

El resultado actual se modela como presencia o ausencia de una fila en `MatchResult`:

- sin fila: sin resultado cargado;
- con fila: resultado cargado.

No existe todavia `status: pending | final`.

### Tabla de puntos

La tabla de puntos se calcula en lectura desde `Prediction + MatchResult`, sin persistir puntajes agregados. Incluye:

- participante;
- puntos totales;
- exactos;
- signos;
- partidos pronosticados;
- partidos bloqueados sin pronostico.

### Fecha, hora y timezone

El fixture guarda `kickoffAt` con offset `-04:00`. El seed lo convierte con `new Date(match.kickoffAt)`, por lo que Prisma guarda un instante absoluto en Postgres.

El bloqueo compara `kickoffAt.getTime() <= now.getTime()` del lado servidor. A nivel read model, los grupos por dia usan `Intl.DateTimeFormat` con `America/New_York`. La visualizacion en cliente usa `LocalDateTime` y `toLocaleString` del navegador.

Esto es correcto para bloqueo, pero hay que seguir cuidando el significado de "dia" porque el fixture esta en ET y el usuario puede estar en otra zona horaria.

## Arquitectura actual

### Stack real

- Next.js 16.2.9 con App Router.
- React 19.2.4.
- TypeScript 5.
- Prisma 7.8.0.
- `@prisma/adapter-pg` + `pg`.
- Postgres como unica base soportada.
- Tailwind CSS 4 mediante PostCSS.
- ESLint 9.
- Vitest 4.1.8.
- Deploy objetivo: Vercel.

### Estructura relevante

- `app/`: rutas, paginas y server actions.
- `components/`: formularios y componentes UI reutilizables.
- `lib/`: Prisma client, scoring, read models y helpers de presentacion.
- `prisma/`: schema, migraciones, seed y fixture.
- `docs/`: documentacion.

No existe directorio `src/`.

### Rutas principales

- `/`: seleccion y alta simple de participantes.
- `/p/[participantId]`: pantalla principal del participante, filtros y tabla.
- `/p/[participantId]/matches/[matchId]`: detalle, pronostico, reveal y resultado.
- `/admin/results`: carga manual de resultados.

No existen todavia:

- `/admin/participants`;
- `/u/[participantSlug]`;
- `/u/[participantSlug]/matches`;
- `/u/[participantSlug]/standings`.

### Componentes principales

- `components/participant-create-form.tsx`: alta simple de participante.
- `components/prediction-form.tsx`: formulario de pronostico.
- `components/result-form.tsx`: formulario de resultado.
- `components/local-date-time.tsx`: render de fecha/hora local del navegador.

### Server actions y modulos de dominio

- `app/actions.ts`
  - `createParticipantAction`.
- `app/p/[participantId]/actions.ts`
  - `upsertPredictionAction`.
- `app/admin/results/actions.ts`
  - `upsertMatchResultAction`.
- `lib/scoring.ts`
  - `calculatePredictionScore`.
- `lib/read-models.ts`
  - bloqueo, reveal, tablas y queries de lectura.
- `lib/prisma.ts`
  - singleton de Prisma Client con fallback de variables Postgres.
- `lib/presentation.ts`
  - labels y summaries de UI.

### Fixture

El fixture vive en `prisma/seed-data/fixture.json`.

Verificacion del archivo:

- 48 equipos.
- 104 partidos.
- 72 partidos de fase de grupos.
- 16 partidos de Round of 32.
- 8 partidos de Round of 16.
- 4 cuartos de final.
- 2 semifinales.
- 1 partido por tercer puesto.
- 1 final.

`matchNumber` es unico y usado como referencia humana/operativa en el seed. Los cruces con equipos no definidos conservan labels textuales como `TBD`; en esos casos `homeTeamId` y `awayTeamId` pueden quedar en `null`.

## Modelo de datos actual

### Participant

Campos:

- `id`
- `name`
- `active`
- `createdAt`
- `updatedAt`

Constraints:

- `name` unico en DB.

Notas:

- No existe `slug`.
- No existe password.
- No existe rol.
- La accion de alta valida duplicados case-insensitive en app, pero la DB solo tiene unique normal sobre `name`.

### Team

Campos:

- `id`
- `name`
- `code`
- `groupName`

Constraints:

- `name` unico.
- `code` unico.

Notas:

- No tiene `createdAt` ni `updatedAt`.

### Match

Campos:

- `id`
- `matchNumber`
- `stage`
- `groupName`
- `homeTeamName`
- `awayTeamName`
- `homeTeamId`
- `awayTeamId`
- `kickoffAt`
- `venue`
- `city`

Constraints:

- `matchNumber` unico.
- FK opcional a `Team` para local y visitante.

Notas:

- `homeTeamName` y `awayTeamName` son obligatorios, incluso cuando los ids son nulos.
- No tiene `createdAt` ni `updatedAt`.
- `kickoffAt` es `DateTime` Prisma. En Postgres la migracion actual usa `TIMESTAMP(3)`, no `TIMESTAMPTZ` explicito.

### Prediction

Campos:

- `id`
- `participantId`
- `matchId`
- `homeScore`
- `awayScore`
- `advancesTeamName`
- `createdAt`
- `updatedAt`

Constraints:

- FK a `Participant` con cascade delete.
- FK a `Match` con cascade delete.
- unique `(participantId, matchId)`.

Notas:

- La no negatividad de goles se valida en server action, no con check constraint DB.
- `advancesTeamName` es texto libre.

### MatchResult

Campos:

- `id`
- `matchId`
- `homeScore`
- `awayScore`
- `advancesTeamName`
- `createdAt`
- `updatedAt`

Constraints:

- FK a `Match` con cascade delete.
- `matchId` unico.

Notas:

- No existe `status`.
- No existe distincion entre resultado pendiente/finalizado salvo ausencia/presencia de fila.
- La no negatividad de goles se valida en server action, no con check constraint DB.

## Seeds y migraciones

### Migraciones

Existe migracion inicial:

- `prisma/migrations/20260614_initial_schema/migration.sql`

Comandos disponibles:

- `npm run db:migrate:dev`
- `npm run db:migrate:deploy`
- `npm run db:push`

### Seed

El seed esta en `prisma/seed.ts` y se ejecuta con:

- `npm run db:seed`

El seed:

- crea/actualiza Ramiro y Pedro como activos;
- crea/actualiza equipos desde fixture;
- crea/actualiza los 104 partidos desde fixture;
- crea/actualiza pronosticos historicos.

Hallazgo: el contrato original menciona pronosticos iniciales para partidos 1 a 7, pero el seed actual incluye tambien partido 8 para Ramiro y Pedro. Esto no rompe la app, pero debe decidirse si es dato valido o drift accidental.

El seed no crea filas `MatchResult` pendientes. En el modelo actual eso es esperable porque no hay `status`; la ausencia de fila equivale a "sin resultado".

## Variables de entorno

Documentadas en `.env.example` y README:

- `DATABASE_URL`: conexion runtime principal.
- `DIRECT_DATABASE_URL`: conexion directa/no pooled recomendada para migraciones.

Aliases aceptados por el runtime:

- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL`
- `DATABASE_URL_UNPOOLED`
- `POSTGRES_URL_NON_POOLING`

`prisma.config.ts` carga `.env.local` y `.env`, y usa fallback local `postgresql://postgres:postgres@localhost:5432/pronosticos_mundial?schema=public` si no hay URL para migraciones. El runtime de la app no usa ese fallback: `lib/prisma.ts` exige alguna URL real.

## Calidad tecnica y validaciones

Dependencias: no hizo falta instalar dependencias; `node_modules` ya estaba presente.

Comandos ejecutados:

- `npm run lint`: pasa.
- `npm run test`: pasa, 2 archivos, 17 tests.
- `npm run prisma:validate`: pasa.
- `npx tsc --noEmit`: pasa.
- `npm run build`: fallo primero dentro del sandbox por restriccion de entorno de Turbopack (`binding to a port`, `Operation not permitted`), luego paso correctamente fuera del sandbox con permiso escalado.

Resultado del build verificado:

- `prisma generate`: OK.
- `next build`: OK.
- rutas generadas:
  - `/`
  - `/_not-found`
  - `/admin/results`
  - `/p/[participantId]`
  - `/p/[participantId]/matches/[matchId]`

Cobertura de tests actual:

- scoring de grupos;
- scoring de eliminacion directa bajo la regla actualmente implementada;
- ausencia de resultado;
- ausencia de pronostico;
- bloqueo exacto en kickoff;
- reveal antes/despues/en kickoff;
- agrupacion por dia ET;
- tabla agregada.

Gaps de tests:

- no hay tests de integracion contra DB para server actions;
- no hay tests del seed contra fixture real;
- no hay test que falle si se seedearan mas pronosticos que los esperados por contrato;
- no hay tests de permisos/admin porque no existe auth.

## Hallazgos

### P0

No se encontraron P0. El proyecto compila, tipa, lint pasa y tests pasan.

### P1

1. Scoring knockout no esta alineado con el contrato inicial.

El contrato inicial decia que, hasta confirmacion, "no exacto = 0" en eliminacion directa. El codigo y los tests actuales dan 1 punto cuando el partido real empata, el pronostico tambien empata pero no exacto, y el clasificado es correcto. Antes de sumar login o resultados, conviene decidir si esta regla queda oficial o se revierte.

2. `/admin/results` permite modificar resultados sin auth.

Esto era aceptable para v1 familiar, pero choca con el proximo paso de login. En cuanto exista password, resultados deberia requerir una capacidad minima de admin o una lista simple de usuarios autorizados.

3. El modelo de usuario no soporta login todavia.

`Participant` no tiene password hash, slug, rol ni datos de sesion. El proximo patch de login va a requerir migracion no destructiva.

4. La migracion usa `TIMESTAMP(3)` para `kickoffAt`, no `TIMESTAMPTZ` explicito.

Prisma maneja `DateTime` como instantes, y el seed parsea offsets correctamente, pero el contrato operativo habla de `timestamptz`. Conviene revisar esto antes de que haya mas datos productivos.

5. Seed incluye partido 8 ademas de los partidos 1 a 7 documentados.

Puede ser intencional, pero hoy no esta reflejado en el contrato provisto.

### P2

1. No hay `Participant.slug`.

Las rutas usan ids internos. Funciona, pero para login con nombres y URLs mas estables puede convenir agregar `slug` o mover a una sesion con rutas sin identidad en path.

2. No hay `MatchResult.status`.

La ausencia/presencia de fila alcanza para v1, pero la UI de carga manual y futuras APIs van a ser mas claras con `pending | final`.

3. No hay check constraints DB para goles no negativos.

Las server actions validan, pero DB no endurece.

4. `advancesTeamName` es texto libre.

Simple para v1, riesgoso para fases eliminatorias por typos o labels `TBD`.

5. Unicidad case-insensitive de participantes solo esta en app.

La DB permitiria nombres que difieran solo en mayusculas/minusculas si entran por otro camino.

6. No hay auditoria de resultados.

Para uso familiar puede no hacer falta, pero al menos `updatedAt` ya permite saber que se edito. Si hay disputas, convendria guardar `updatedByParticipantId`.

## Verificacion de capacidades requeridas

- Usuarios default: soportado por seed para Ramiro y Pedro.
- Nuevos usuarios/participantes: soportado como participante sin password desde `/`.
- Pronosticos por usuario y partido: soportado con unique `(participantId, matchId)`.
- Bloqueo por horario: soportado server-side con `kickoffAt <= now`.
- No revelar ajenos antes del kickoff: soportado por read model.
- Reveal desde kickoff y ausencias: soportado.
- Resultados manuales: ya implementado.
- Calculo de puntajes: implementado en lectura.
- Login/password: no implementado.
- Cambio de password: no implementado.
- Alta de usuario con password: no implementado.
- Permisos para resultados: no implementado.

## Riesgos y deuda tecnica

### Seguridad minima para login familiar

No conviene sumar una solucion enterprise, pero si conviene evitar passwords en texto plano, sesiones faciles de falsificar y acciones sensibles sin verificacion server-side.

Recomendacion:

- usar hash fuerte de password;
- cookie de sesion httpOnly;
- validar usuario actual server-side en cada action sensible;
- no confiar en ids enviados desde formularios para identidad.

### Almacenamiento de contrasenas

Debe agregarse `passwordHash`, nunca `password`. Para simplicidad compatible con Vercel, una opcion pragmatica es `bcryptjs` o `@node-rs/argon2` si se confirma compatibilidad runtime. Para una app familiar, `bcryptjs` con costo razonable es simple y suficiente.

### Colisiones de usuarios

Hoy `Participant.name` es unico case-sensitive a nivel DB y case-insensitive solo en app. Para login por nombre, conviene agregar `slug` o `normalizedName` unico.

### Rol admin

Para uso familiar, no hace falta RBAC complejo. Si se va a proteger resultados, alcanza con `isAdmin Boolean @default(false)` en `Participant`, dejando a Ramiro como admin inicial y opcionalmente Pedro si corresponde.

### Quien puede cargar resultados

Recomendacion: solo admin. En v1.1 puede ser `isAdmin`; no hace falta roles multiples.

### Riesgo de romper datos existentes en Vercel

Al agregar login, usar migraciones no destructivas:

- agregar columnas nullable o con defaults;
- backfill de usuarios default;
- recien despues endurecer constraints si hace falta;
- evitar reseed destructivo en produccion.

### Timezone y kickoffAt

El parseo actual del fixture es razonable, pero conviene revisar `TIMESTAMP` vs `TIMESTAMPTZ` y mantener todos los bloqueos en servidor. No mover reglas de bloqueo al navegador.

### Partidos simultaneos

El modelo usa `matchNumber` unico y ordena por `kickoffAt` + `matchNumber`. Correcto.

### Eliminatorias con placeholder

Los labels `TBD` y `advancesTeamName` texto libre alcanzan para v1, pero pueden generar inconsistencias cuando se definan cruces. Conviene planear una actualizacion controlada del fixture o una pantalla admin para resolver equipos.

### Seed duplicado

El seed usa `upsert`, asi que es bastante idempotente. El riesgo es que actualice datos manualmente corregidos si se corre en produccion despues de cambios reales de fixture o participantes.

### Fixture cambiante

Si FIFA cambia horario, sede o cruces, correr el seed puede pisar campos de `Match`. Se recomienda tratar `fixture.json` como base versionada y documentar cualquier actualizacion antes de aplicarla.

## Decisiones recomendadas

1. Oficializar o revertir la regla de 1 punto por clasificado en eliminacion directa sin exacto.
2. Implementar login simple como extension de `Participant`, no como sistema separado de usuarios.
3. Agregar `slug` o `normalizedName` antes o junto con login.
4. Agregar `isAdmin` para proteger `/admin/results`.
5. Mantener scoring calculado en lectura.
6. Mantener resultados manuales, pero agregar `status` si se quiere distinguir pendiente/final con claridad.
7. Evitar migraciones destructivas y no correr seed en produccion sin intencion explicita.

## Roadmap incremental

### Fase 1: login simple con nombre y password

Alcance minimo:

- pantalla de login;
- login por nombre/slug + password;
- cookie httpOnly de sesion;
- logout;
- redireccion a pantalla del participante autenticado;
- proteger rutas de participante para que no se pueda operar como otro usuario cambiando la URL;
- proteger server actions con usuario de sesion.

Modelo propuesto:

- agregar a `Participant`:
  - `slug String @unique`;
  - `passwordHash String?`;
  - `isAdmin Boolean @default(false)`;
  - opcional `lastLoginAt DateTime?`.
- agregar `Session` si se quieren sesiones persistidas/revocables:
  - `id`;
  - `participantId`;
  - `tokenHash`;
  - `expiresAt`;
  - `createdAt`;
  - `lastUsedAt`.

Opcion aun mas simple:

- cookie firmada con `SESSION_SECRET` y participant id;
- sin tabla `Session`.

Recomendacion: para app familiar, cookie firmada httpOnly puede alcanzar. Si se quiere cambio de password con invalidacion de sesiones, usar tabla `Session`.

Hashing:

- usar `bcryptjs` o libreria equivalente compatible con runtime Node en Vercel;
- nunca guardar passwords planos;
- exigir minimo 6-8 caracteres, sin politica excesiva.

Redirecciones:

- `/login` si no hay sesion;
- despues de login: `/p/[participantId]` o futura ruta `/me`;
- `/` puede transformarse en selector solo para usuarios logueados o redirigir a `/login`.

Tests sugeridos:

- password correcto autentica;
- password incorrecto falla;
- usuario inexistente falla sin revelar demasiado;
- action de pronostico usa usuario de sesion, no participantId arbitrario.

### Fase 2: cambio de contrasena

Flujo minimo:

- ruta simple tipo `/account/password`;
- pedir password actual;
- pedir password nuevo y confirmacion;
- validar password actual server-side;
- guardar nuevo hash;
- opcionalmente invalidar otras sesiones.

Usuarios default:

- crear password inicial por seed o por script one-off;
- si `passwordHash` esta null, forzar pantalla de "crear contrasena inicial" para Ramiro/Pedro.

Tests sugeridos:

- cambia con password actual correcta;
- rechaza password actual incorrecta;
- rechaza confirmacion distinta;
- nuevo login funciona y viejo password no.

### Fase 3: alta de nuevos usuarios con password

Decision recomendada:

- solo admin puede crear usuarios con password.

Motivo:

- sigue siendo simple;
- evita que cualquiera cree usuarios desde una ruta publica;
- permite controlar nombres familiares y duplicados.

UX minima:

- `/admin/participants`;
- listar participantes;
- crear nombre + password inicial;
- marcar activo/inactivo;
- marcar admin solo si hace falta.

Validaciones:

- nombre obligatorio;
- slug/normalizedName unico;
- password minimo;
- no permitir desactivar el ultimo admin activo.

### Fase 4: carga manual de resultados

Estado actual:

- ya existe `/admin/results`;
- guarda/edita goles y clasificado;
- impacta en tabla recalculada.

Proximo alcance recomendado:

- proteger con admin;
- agregar `status` si se quiere representar pendiente/final explicitamente;
- permitir edicion admin;
- opcional `updatedByParticipantId`;
- impedir cargar resultados de partidos que no empezaron, salvo override admin explicito.

Modelo propuesto:

- `MatchResult.status` con enum `PENDING | FINAL`, o mantener ausencia/presencia y documentarlo.
- `homeScore`/`awayScore` nullable si se agrega `PENDING`; si se mantiene presencia/final, pueden seguir required.
- `updatedByParticipantId String?` si se quiere trazabilidad.

Reglas:

- si status final, goles obligatorios;
- si eliminatoria empatada, `advancesTeamName` obligatorio;
- si partido no empezo, bloquear por defecto;
- recalcular puntos en lectura, como hoy.

UI minima:

- filtrar por dia/grupo/estado;
- mostrar solo partidos iniciados por defecto;
- guardar resultado;
- editar resultado;
- mostrar aviso de impacto en tabla.

## Checklist para el proximo prompt de implementacion

1. Confirmar regla de scoring knockout:
   - mantener 1 punto por clasificado sin exacto, o revertir a 0.
2. Confirmar estrategia de login:
   - cookie firmada simple o tabla `Session`.
3. Confirmar usuarios admin iniciales:
   - Ramiro solo, o Ramiro y Pedro.
4. Confirmar passwords iniciales:
   - seed/script local, variables temporales, o flujo de primera contrasena.
5. Confirmar si se agrega `slug`/`normalizedName`.
6. Confirmar si `/p/[participantId]` queda o se migra a `/me`/`/u/[slug]`.
7. Confirmar si `/admin/results` debe bloquear partidos no iniciados.
8. Confirmar si `MatchResult.status` entra en el mismo patch o queda para despues.
9. Antes de tocar schema, correr:
   - `npm run prisma:validate`;
   - `npm run test`;
   - `npm run lint`;
   - `npm run build`.
10. Despues del patch, verificar migracion no destructiva y seed/backfill.

## Archivos revisados

- `AGENTS.md`
- `README.md`
- `package.json`
- `.env.example`
- `next.config.ts`
- `prisma.config.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260614_initial_schema/migration.sql`
- `prisma/seed.ts`
- `prisma/seed-data/fixture.json`
- `app/page.tsx`
- `app/actions.ts`
- `app/p/[participantId]/page.tsx`
- `app/p/[participantId]/actions.ts`
- `app/p/[participantId]/matches/[matchId]/page.tsx`
- `app/admin/results/page.tsx`
- `app/admin/results/actions.ts`
- `components/participant-create-form.tsx`
- `components/prediction-form.tsx`
- `components/result-form.tsx`
- `components/local-date-time.tsx`
- `lib/prisma.ts`
- `lib/read-models.ts`
- `lib/scoring.ts`
- `lib/presentation.ts`
- `lib/scoring.test.ts`
- `lib/read-models.test.ts`
- `docs/audits/audit-estado-proyecto-pronosticos-mundial-2026-06-14.md`

## Confirmacion de alcance

Este audit no implemento login, cambio de contrasena, alta de usuarios con password, nueva carga de resultados, nuevo calculo de puntajes, refactors grandes, cambios visuales ni migraciones destructivas.

El unico cambio realizado fue crear este documento en `docs/`.
