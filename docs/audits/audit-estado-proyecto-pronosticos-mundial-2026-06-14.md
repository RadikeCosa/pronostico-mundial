# Audit de estado del proyecto - 2026-06-14

## Resumen ejecutivo

El proyecto ya superó el estado de bootstrap y hoy tiene una primera versión vertical funcional para v1: schema Prisma, migración inicial, seed con fixture, scoring puro con tests, selección de participante, carga/edición de pronósticos con bloqueo server-side, reveal desde kickoff, tabla parcial de puntos y carga manual de resultados.

El principal riesgo no está en falta de implementación sino en drift entre el contrato de `AGENTS.md` y el estado real del código. Los desvíos más visibles son la regla actual de scoring knock-out, el uso de `participantId` en rutas en lugar de `slug`, y la ausencia de `MatchResult.status`.

No se detectaron hallazgos P0 que obliguen a un patch urgente para seguir iterando. Sí hay decisiones de contrato que conviene cerrar antes de seguir expandiendo UI o endurecer el modelo.

## Estado actual del proyecto

- Stack real confirmado: Next.js App Router + TypeScript + Prisma 7 + Postgres + Vitest.
- Deploy objetivo confirmado: Vercel.
- Base de datos esperada y documentada: Postgres compatible con Neon/Vercel.
- Fixture base presente en `prisma/seed-data/fixture.json`.
- Migración inicial presente en `prisma/migrations/20260614_initial_schema/migration.sql`.
- Seed presente en `prisma/seed.ts`.
- No existe `src/`; la app usa `app/`, `components/`, `lib/` y `prisma/`.

## Funcionalidades implementadas

- Home con listado de participantes activos.
- Alta simple de participantes desde `/`.
- Navegación por participante en `/p/[participantId]`.
- Vistas de partidos por día, por grupo y tabla parcial de puntos.
- Detalle de partido en `/p/[participantId]/matches/[matchId]`.
- Carga y edición de pronóstico propio antes del kickoff.
- Bloqueo server-side desde `kickoffAt <= now`.
- Reveal de todos los pronósticos desde kickoff, incluyendo `Sin pronóstico`.
- Carga manual de resultados en `/admin/results`.
- Recalculo de puntajes en lectura desde `Prediction + MatchResult`.
- Motor de scoring puro en `lib/scoring.ts`.
- Tests de dominio y read models con Vitest.

## Funcionalidades faltantes o incompletas

- No hay auth real, por diseño v1.
- No existe ruta basada en `slug` como propone `AGENTS.md`; hoy se usa `participantId`.
- No existe `/u/[participantSlug]`, `/u/[participantSlug]/matches` ni `/u/[participantSlug]/standings`; la UX está concentrada en `/p/[participantId]`.
- No hay gestión de activación/desactivación de participantes.
- No hay tests de integración con base real para server actions.
- No hay script explícito de reset local de base.
- No hay protección adicional para `/admin`, también por diseño v1.

## Reglas de negocio confirmadas

- Antes del kickoff cada participante solo puede ver su propio pronóstico.
- Antes del kickoff puede crear o editar su propio pronóstico.
- Desde kickoff se bloquea la edición.
- Desde kickoff se revelan todos los pronósticos y las ausencias.
- La tabla de puntos se calcula desde resultados y pronósticos persistidos.
- Los resultados se cargan manualmente.
- `kickoffAt` se trata como `DateTime` absoluto en base y en Prisma.

## Desvíos confirmados respecto de AGENTS.md

### 1. Regla knock-out

`AGENTS.md` todavía documenta la regla inicial: en eliminación directa, acertar solo quién pasa sin exactitud no suma.

El código actual implementa otra regla ya pedida más adelante en la conversación:

- empate exacto + clasificado correcto = 4
- empate exacto + clasificado incorrecto = 3
- empate no exacto + clasificado correcto = 1

Esto está reflejado tanto en `lib/scoring.ts` como en `lib/scoring.test.ts`.

### 2. Rutas y participante

`AGENTS.md` propone `slug` y rutas `/u/[participantSlug]`. El estado real usa:

- `Participant.name`
- `Participant.id`
- rutas `/p/[participantId]`

No hay campo `slug` en schema.

### 3. MatchResult

`AGENTS.md` propone `status: pending | final` en `MatchResult`. El schema actual no tiene ese campo. La app deriva implícitamente:

- sin fila en `MatchResult`: sin resultado
- con fila en `MatchResult`: hay resultado cargado

### 4. Modelo extendido

`AGENTS.md` propone `createdAt` y `updatedAt` en `Team` y `Match`. El schema actual no los incluye. Para v1 no bloquea, pero es un drift claro de contrato.

## Riesgos

### P1

- Drift de contrato entre `AGENTS.md` y el código real. Si no se corrige, el próximo agente puede reintroducir reglas viejas.
- La unicidad case-insensitive de participantes está validada en app, pero no endurecida a nivel DB. El `@unique` real sigue siendo sensible al valor exacto de `name`.
- No hay check constraints en DB para garantizar `homeScore >= 0` y `awayScore >= 0`.
- No hay validación de que `advancesTeamName` sea consistente con un equipo real o uno de los labels del cruce.

### P2

- El modelo usa labels textuales y ids nullable para cruces TBD, lo cual está bien para v1, pero deja margen a inconsistencias ortográficas en etapas de eliminación directa.
- `Team` y `Match` no tienen timestamps.
- La UI y los read models están limpios para una app familiar, pero bastante concentrados en `lib/read-models.ts`; si el proyecto crece convendrá modularizar por agregado.
- La ruta admin está abierta por diseño y depende solo de discreción operativa familiar.

## Decisiones técnicas vigentes

- Postgres como única base soportada. No hay dependencia en SQLite.
- Prisma 7 con `@prisma/adapter-pg`.
- Prisma Client se genera en `build` y también en `postinstall`.
- `matchNumber` es el identificador operativo humano del fixture.
- Los partidos TBD conservan `homeTeamName` y `awayTeamName` aunque `homeTeamId` y `awayTeamId` queden en null.
- El scoring no se persiste; se recalcula en lectura.
- La privacidad y el bloqueo se validan del lado servidor.

## Modelo de datos actual

### Participant

- `id`
- `name` unico
- `active`
- `createdAt`
- `updatedAt`

### Team

- `id`
- `name` unico
- `code` unico
- `groupName` nullable

### Match

- `id`
- `matchNumber` unico
- `stage`
- `groupName` nullable
- `homeTeamName`
- `awayTeamName`
- `homeTeamId` nullable
- `awayTeamId` nullable
- `kickoffAt`
- `venue` nullable
- `city` nullable

### Prediction

- `id`
- `participantId`
- `matchId`
- `homeScore`
- `awayScore`
- `advancesTeamName` nullable
- `createdAt`
- `updatedAt`
- unique `(participantId, matchId)`

### MatchResult

- `id`
- `matchId` unico
- `homeScore`
- `awayScore`
- `advancesTeamName` nullable
- `createdAt`
- `updatedAt`

## Estado de tests

- `lib/scoring.test.ts`: cubre grupos, knockout, ausencia de resultado, ausencia de pronóstico y el comportamiento actual de knockout con 1 punto por empate no exacto + clasificado correcto.
- `lib/read-models.test.ts`: cubre bloqueo exacto en kickoff, agrupación por día ET, privacidad antes de kickoff, reveal después de kickoff, reveal exacto en kickoff y tabla agregada sin filtrar pronósticos futuros.
- Estado verificado en esta línea de trabajo: tests pasando.

## Estado de seed y migraciones

- Fixture importado desde `prisma/seed-data/fixture.json`.
- Seed con `upsert` para participantes, equipos, partidos y pronósticos históricos.
- Seed idempotente por código para los datos semilla definidos.
- Migración inicial versionada.
- El seed requiere `DATABASE_URL` o `DIRECT_DATABASE_URL`.
- No se pudo validar contenido real en DB dentro de esta auditoría sin una base conectada, pero la lógica de seed y constraints del schema son coherentes.

## Estado de UI

- La UI es simple, mobile-first y suficiente para v1.
- No hay dependencia de librerías de componentes externas.
- El flujo principal ya existe:
  - `/`
  - `/p/[participantId]`
  - `/p/[participantId]/matches/[matchId]`
  - `/admin/results`
- El estado visual distingue abierto, bloqueado y con resultado.

## Estado de deploy y preparación Vercel

- `.env.example` existe y documenta `DATABASE_URL` y `DIRECT_DATABASE_URL`.
- `README.md` ya cubre setup local, setup DB, seed, deploy y operación manual.
- `package.json` expone scripts suficientes para dev, build, lint, test, Prisma y seed.
- `build` hoy corre `prisma generate && next build`, que corrige el problema típico de Vercel cuando Prisma Client no fue generado.
- `postinstall` también ejecuta `prisma generate`.

Nota operativa:

- En esta sesión `npm run build` no quedó totalmente verificado por una limitación del entorno sandbox local con Next/Turbopack. En Vercel, el error previo reportado por falta de `PrismaClient` exportado quedó cubierto por el script actual de build.

## Próximos patches recomendados

1. Alinear contrato y código.
   - Actualizar `AGENTS.md` para reflejar la regla real de knockout y la estrategia actual de rutas o, alternativamente, migrar el código a `slug`.
2. Endurecer integridad de datos.
   - Agregar constraints/checks para scores no negativos y definir si la unicidad de participante debe ser case-insensitive también en DB.
3. Mejorar operación de base local.
   - Agregar un script documentado de reset local para desarrollo y seed reproducible en base vacía.
4. Cubrir server actions con pruebas de integración livianas.
   - Especialmente `upsertPredictionAction` y `upsertMatchResultAction`.
5. Decidir si `MatchResult.status` sigue fuera de alcance o si conviene agregarlo para claridad operativa.

## Checklist para continuar iterando

- Leer `AGENTS.md` y este audit antes de cambiar reglas.
- Verificar variables de entorno.
- Correr `npm install`.
- Correr `npm run prisma:generate`.
- Correr `npm run prisma:validate`.
- Correr `npm run test`.
- Correr `npm run lint`.
- Si hay DB configurada, correr `npm run db:migrate:deploy` y `npm run db:seed`.
- Recién después tocar schema, scoring o rutas.

## Comandos útiles

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run prisma:validate`
- `npm run prisma:generate`
- `npm run db:migrate:dev`
- `npm run db:migrate:deploy`
- `npm run db:push`
- `npm run db:seed`

## No alcances explícitos de v1

- Auth real
- Passwords
- Roles complejos
- API externa de resultados
- Persistencia de scores agregados
- Bracket completo de campeón
- Diseño visual avanzado
