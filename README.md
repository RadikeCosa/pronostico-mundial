Aplicación familiar de pronósticos para el Mundial 2026 construida con Next.js, Prisma y Postgres.

## Estado actual

El repo ya tiene una v1 funcional de base de datos, scoring, selección de participante, carga de pronósticos, reveal por kickoff, tabla parcial y carga manual de resultados.

Audit actual:

- [Estado del proyecto 2026-06-14](/home/ramiro/dev/pronosticos-mundial/docs/audits/audit-estado-proyecto-pronosticos-mundial-2026-06-14.md)

## Variables de entorno

Copiá `.env.example` a `.env.local` para desarrollo local.

- `DATABASE_URL`
  Conexión principal de la app. En Neon o Vercel Postgres puede ser la URL pooled/runtime.
- `DIRECT_DATABASE_URL`
  Opcional pero recomendada para Prisma Migrate. Usá la URL directa/no pooled si el proveedor la expone.

También se aceptan los alias que suelen crear las integraciones de Vercel/Neon:

- Runtime: `POSTGRES_PRISMA_URL` o `POSTGRES_URL`.
- Migraciones: `DATABASE_URL_UNPOOLED` o `POSTGRES_URL_NON_POOLING`.

No subas secretos reales al repo. `.env*` ya está ignorado.

## Setup local

1. Instalar dependencias:
   `npm install`
2. Crear `.env.local` desde `.env.example`.
3. Validar Prisma:
   `npm run prisma:validate`
4. Aplicar migraciones:
   `npm run db:migrate:deploy`
   Para desarrollo local también podés usar `npm run db:migrate:dev`.
5. Cargar datos iniciales:
   `npm run db:seed`
6. Levantar la app:
   `npm run dev`

## Setup DB

El proyecto usa Postgres. No depende de SQLite.

- Schema Prisma: `prisma/schema.prisma`
- Config Prisma 7: `prisma.config.ts`
- Migración inicial versionada: `prisma/migrations/20260614_initial_schema/migration.sql`
- Fixture base: `prisma/seed-data/fixture.json`

Comandos útiles:

- `npm run prisma:generate`
- `npm run db:migrate:dev`
- `npm run db:migrate:deploy`
- `npm run db:seed`

## Seed

El seed:

- crea participantes Ramiro y Pedro
- crea equipos desde `fixture.json`
- crea los 104 partidos
- crea los pronósticos históricos de los partidos 1 a 7

Es idempotente a nivel aplicación para participantes, equipos, partidos y esos pronósticos.

Local:

- `npm run db:migrate:deploy`
- `npm run db:seed`

Producción:

- correr primero migraciones
- correr seed solo si querés inicializar datos base en una base vacía

El seed usa `DATABASE_URL` y cae en `DIRECT_DATABASE_URL` si no existe.

## Deploy

Checklist para Vercel + Neon:

1. Crear base Postgres en Neon o Vercel Marketplace.
2. Configurar en Vercel:
   - `DATABASE_URL`
   - `DIRECT_DATABASE_URL` recomendable para migraciones
   Si usás la integración de Neon/Vercel, también sirven `POSTGRES_PRISMA_URL`,
   `POSTGRES_URL`, `DATABASE_URL_UNPOOLED` o `POSTGRES_URL_NON_POOLING`.
3. Build command:
   `npm run build`
4. Install command:
   `npm install`
5. Antes o inmediatamente después del primer deploy, aplicar migraciones:
   `npm run db:migrate:deploy`
6. Si la base está vacía y querés datos iniciales:
   `npm run db:seed`

Nota:

- En este repo el build genera Prisma Client antes de compilar Next.
- `postinstall` también ejecuta `prisma generate`, útil para entornos CI/Vercel.

## Operación manual

Resultados manuales:

- ruta: `/admin/results`
- permite cargar o editar `homeScore`, `awayScore` y `advancesTeamName` en cruces
- no modifica pronósticos
- al guardar, la tabla de puntos se recalcula desde `MatchResult + Prediction`

Participantes:

- alta simple desde `/`
- nuevos participantes quedan activos por defecto
- no hay borrado ni auth real en v1

La unicidad del nombre se valida de forma case-insensitive en la app. La restricción única dura de base sigue siendo `name` tal como está hoy en el schema.

## Scripts

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
