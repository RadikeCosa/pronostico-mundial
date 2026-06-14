Aplicacion familiar de pronosticos para el Mundial 2026 construida con Next.js, Prisma y Postgres.

## Scripts

- `npm run dev`: inicia la app.
- `npm run lint`: corre ESLint.
- `npm run test`: corre los tests unitarios de dominio con Vitest.
- `npm run prisma:validate`: valida el schema Prisma.
- `npm run prisma:generate`: genera Prisma Client.
- `npm run db:push`: aplica el schema a la base configurada.
- `npm run db:seed`: carga participantes, equipos, partidos y pronosticos historicos.

## Scoring

El motor de scoring vive en `lib/scoring.ts` y es logica pura.

- Fase de grupos:
  exacto = 3, signo correcto sin exacto = 1.
- Knockout:
  exacto = 3, y si el partido termina empatado el clasificado correcto suma 1 adicional.
- Regla actual:
  si pronostica empate sin acertar el resultado exacto, pero acierta quien clasifica, suma 1 punto.

## Read models

Las funciones server-side viven en `lib/read-models.ts`.

- participantes activos
- partidos agrupados por dia
- partidos filtrados por grupo
- detalle de partido con bloqueo, reveal y predicciones visibles
- tabla de posiciones parcial recalculada desde resultados y pronosticos

## UI inicial

- `/`: seleccion de participante
- `/`: formulario simple para alta de participantes
- `/p/[participantId]`: partidos y tabla de puntos
- `/p/[participantId]/matches/[matchId]`: detalle y carga de pronostico
- `/admin/results`: carga manual de resultados

La unicidad del nombre se valida de forma case-insensitive en la app. La restriccion unica dura de base sigue siendo `name` tal como esta en el schema actual.

## Base de datos

Defini `DATABASE_URL` antes de correr comandos de Prisma que hablen con la base.

El fixture base esta en `prisma/seed-data/fixture.json`.

## Desarrollo

Abrir [http://localhost:3000](http://localhost:3000) despues de `npm run dev`.
