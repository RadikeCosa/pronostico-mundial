# AGENTS.md — Pronósticos Mundial

## 1. Objetivo del producto

Construir una aplicación familiar para cargar, bloquear, revelar y puntuar pronósticos de partidos del Mundial 2026.

La app debe priorizar simplicidad operativa, claridad visual y reglas de juego confiables. No es una app pública ni requiere autenticación formal en la primera versión.

## 2. Stack definido

- Framework: Next.js con App Router.
- Lenguaje: TypeScript.
- Deploy: Vercel.
- Base de datos: Postgres serverless compatible con Vercel, preferentemente Neon mediante integración de Vercel Marketplace.
- ORM recomendado: Prisma ORM.
- UI: componentes simples, responsive, mobile-first.
- Tests: Vitest para lógica de dominio y scoring; tests de integración livianos para server actions/read models críticos.

## 3. Datos base disponibles

Existe un archivo `fixture.json` con:

- Torneo: FIFA World Cup 2026.
- 48 equipos.
- 104 partidos.
- 72 partidos de fase de grupos.
- 16 partidos de Round of 32.
- 8 partidos de Round of 16.
- 4 cuartos de final.
- 2 semifinales.
- partido por tercer puesto.
- final.

Notas del fixture:

- `matchNumber` es el identificador operativo principal del partido.
- `kickoffAt` está en ET, UTC-4.
- Para persistencia se debe guardar como `timestamptz`/Date real, no como string local ambiguo.
- Los partidos simultáneos deben diferenciarse por `matchNumber`, no por fecha/hora.
- Los partidos de eliminación directa pueden tener equipos descriptivos o TBD hasta que se definan los cruces.

## 4. Usuarios

La app debe inicializarse con dos participantes por defecto:

- Ramiro
- Pedro

Debe existir posibilidad de agregar más participantes.

No hay login, contraseña ni auth real en v1. El ingreso se resuelve eligiendo el nombre del participante desde una pantalla inicial.

La selección del participante puede persistirse en cookie o localStorage para comodidad, pero todas las reglas sensibles deben validarse server-side.

## 5. Regla central de privacidad y bloqueo

Antes del horario de inicio de un partido:

- Cada usuario puede crear o editar solamente su propio pronóstico.
- Ningún usuario debe ver pronósticos de otros participantes.
- La UI puede mostrar si el usuario actual ya cargó o no su pronóstico.

Desde el horario de inicio del partido:

- El pronóstico queda bloqueado.
- No se puede crear ni editar pronóstico para ese partido.
- Se revelan los pronósticos de todos los participantes.
- Para participantes sin pronóstico, debe mostrarse explícitamente “Sin pronóstico”.

La comparación temporal debe hacerse en servidor usando la hora del servidor/base de datos, no confiando en el reloj del navegador.

## 6. Resultados

En v1 los resultados se cargan manualmente.

Cada partido debe poder tener:

- goles reales equipo local.
- goles reales equipo visitante.
- estado del resultado: pendiente | finalizado.
- en eliminación directa, equipo clasificado/ganador de la llave cuando corresponda.

Más adelante se podrá integrar una API externa de resultados, pero eso queda fuera de la primera versión.

## 7. Pronósticos

Cada pronóstico debe registrar:

- participante.
- partido.
- goles pronosticados para equipo local.
- goles pronosticados para equipo visitante.
- en eliminación directa, equipo que pasa/clasifica si el partido termina empatado o si la regla de la app exige elegir clasificado.
- timestamps de creación y actualización.

Restricción:

- Un participante puede tener como máximo un pronóstico por partido.

## 8. Reglas de puntuación

### Fase de grupos

- Acertar signo/resultado deportivo básico: 1 punto.
  - local gana.
  - empate.
  - visitante gana.
- Acertar resultado exacto de ambos equipos: 3 puntos.
- El resultado exacto reemplaza al punto de signo; no suma 1 + 3.

Ejemplos:

- Real: México 2 - 1 Sudáfrica.
  - Pronóstico 1 - 0 México: 1 punto.
  - Pronóstico 2 - 1 México: 3 puntos.
  - Pronóstico 1 - 1: 0 puntos.

### Eliminación directa

Regla base:

- Acertar resultado exacto de goles: 3 puntos.
- Si el partido fue empatado en goles y el usuario además acertó quién pasa, suma 1 punto adicional.
- En ese caso el máximo total es 4 puntos.

Decisión pendiente a confirmar antes de implementar knock-out avanzado:

- Si en eliminación directa también debe existir 1 punto por acertar clasificado aunque no se acierte el resultado exacto.

Hasta confirmación, implementar solo lo explícitamente definido:

- empate exacto + clasificado correcto = 4.
- empate exacto + clasificado incorrecto = 3.
- resultado exacto sin empate = 3.
- no exacto = 0, salvo que se confirme otra regla.

## 9. Pronósticos iniciales ya conocidos

Estos datos deben cargarse como seed inicial.

### Partido 1 — Mexico vs South Africa

- Pedro: Mexico 1 - 0 South Africa.
- Ramiro: Mexico 1 - 1 South Africa.

### Partido 2 — Korea Republic vs Czechia

- Pedro: Korea Republic 2 - 1 Czechia.
- Ramiro: Korea Republic 2 - 3 Czechia.

### Partido 3 — Canada vs Bosnia and Herzegovina

- Pedro: Canada 1 - 2 Bosnia and Herzegovina.
- Ramiro: Canada 2 - 1 Bosnia and Herzegovina.

### Partido 4 — United States vs Paraguay

- Ramiro: United States 2 - 0 Paraguay.
- Pedro: United States 0 - 1 Paraguay.

### Partido 5 — Qatar vs Switzerland

- Pedro: Qatar 1 - 1 Switzerland.
- Ramiro: Qatar 3 - 2 Switzerland.

### Partido 6 — Brazil vs Morocco

- Pedro: Brazil 1 - 1 Morocco.
- Ramiro: Brazil 0 - 2 Morocco.

### Partido 7 — Haiti vs Scotland

El fixture tiene a Haiti como local y Scotland como visitante.

- Ramiro: Haiti 0 - 3 Scotland.
- Pedro: Haiti 0 - 2 Scotland.

## 10. Modelo de datos propuesto

Entidades mínimas:

### Participant

- id
- name
- slug
- isActive
- createdAt
- updatedAt

Restricciones:

- `slug` único.
- nombres visibles simples.

### Team

- id
- name
- code
- groupName nullable
- createdAt
- updatedAt

### Match

- id
- matchNumber
- stage
- groupName nullable
- homeTeamId nullable
- awayTeamId nullable
- homeTeamLabel
- awayTeamLabel
- kickoffAt
- venue nullable
- city nullable
- createdAt
- updatedAt

Notas:

- En fase de grupos conviene resolver `homeTeamId` y `awayTeamId`.
- En cruces todavía indefinidos se permite `homeTeamId`/`awayTeamId` nullable y se conserva label descriptivo.
- `matchNumber` debe ser único.

### Prediction

- id
- participantId
- matchId
- homeGoals
- awayGoals
- advancingTeamId nullable
- advancingTeamLabel nullable
- createdAt
- updatedAt

Restricciones:

- unique(participantId, matchId).
- goles enteros >= 0.
- No permitir escritura si `now >= match.kickoffAt`.

### MatchResult

- id
- matchId
- homeGoals nullable
- awayGoals nullable
- advancingTeamId nullable
- advancingTeamLabel nullable
- status: pending | final
- createdAt
- updatedAt

Restricciones:

- unique(matchId).
- Si status = final, debe haber goles reales.

## 11. Read models principales

### Home / selección de participante

Debe mostrar:

- participantes activos.
- botón para ingresar como cada participante.
- acción simple para agregar participante.

### Pantalla del participante

Debe mostrar:

- próximos partidos.
- partidos de hoy.
- partidos ya bloqueados.
- estado de pronóstico propio: cargado | pendiente | bloqueado sin pronóstico.
- filtros por día.
- filtros por grupo.
- acceso a tabla de posiciones.

### Detalle/tarjeta de partido

Antes del kickoff:

- datos del partido.
- formulario de pronóstico propio.
- no mostrar pronósticos ajenos.

Desde kickoff:

- datos del partido.
- resultado real si fue cargado.
- pronósticos de todos los participantes.
- puntos obtenidos por cada participante si el resultado está finalizado.

### Tabla de puntos

Debe mostrar:

- participante.
- puntos totales.
- cantidad de exactos.
- cantidad de signos acertados.
- cantidad de partidos pronosticados.
- cantidad de partidos sin pronóstico ya bloqueados.

La tabla se calcula desde resultados finalizados y pronósticos existentes. No persistir el puntaje en v1 salvo que aparezca una necesidad clara.

## 12. Rutas sugeridas

- `/` selección de participante.
- `/u/[participantSlug]` pantalla principal del participante.
- `/u/[participantSlug]/matches` listado completo con filtros.
- `/u/[participantSlug]/standings` tabla de puntos.
- `/admin/results` carga manual de resultados.
- `/admin/participants` agregar/activar/desactivar participantes.

Como no hay auth real, `/admin` tampoco está protegido en v1. Si se quiere minimizar errores familiares, se puede usar un enlace poco destacado o una advertencia visual.

## 13. Server actions / comandos sugeridos

- `selectParticipant` si se decide usar cookie server-side.
- `createParticipant`.
- `upsertPrediction`.
- `setMatchResult`.

Reglas críticas:

- `upsertPrediction` debe validar server-side que el partido no empezó.
- `upsertPrediction` no debe aceptar participantId arbitrario si se trabaja con slug/cookie; resolver participante de manera controlada.
- `setMatchResult` debe recalcular en lectura, no mutar puntajes acumulados.

## 14. Seeds

El seed inicial debe:

1. Crear participantes Ramiro y Pedro.
2. Crear equipos desde `fixture.json`.
3. Crear partidos desde `fixture.json`.
4. Crear resultados como `pending` para todos los partidos.
5. Crear los pronósticos ya conocidos de los partidos 1 a 7.

No cargar resultados reales iniciales salvo que se provean explícitamente.

## 15. Principios de implementación

- Mantener dominio de scoring aislado en funciones puras.
- No mezclar cálculo de puntos dentro de componentes React.
- No confiar en validaciones client-side para bloqueo.
- Usar `matchNumber` como referencia humana y operativa.
- Usar `kickoffAt` como instante absoluto.
- Mostrar horarios en hora local del usuario, pero guardar instantes absolutos.
- Evitar sobreingeniería de auth, permisos o auditoría en v1.
- Diseñar el modelo para que luego pueda incorporarse una API de resultados sin migración traumática.

## 16. Tests mínimos obligatorios

### Scoring fase de grupos

- exacto local gana = 3.
- exacto empate = 3.
- exacto visitante gana = 3.
- signo local gana = 1.
- signo empate = 1.
- signo visitante gana = 1.
- incorrecto = 0.

### Scoring eliminación directa

- resultado exacto sin empate = 3.
- empate exacto + clasificado correcto = 4.
- empate exacto + clasificado incorrecto = 3.
- no exacto = 0 bajo la regla inicial.

### Bloqueo

- antes de kickoff permite crear/editar pronóstico propio.
- en kickoff exacto bloquea.
- después de kickoff bloquea.
- antes de kickoff no revela pronósticos ajenos.
- desde kickoff revela pronósticos ajenos y ausencias.

### Seeds

- crea 104 partidos.
- crea 48 equipos.
- crea Ramiro y Pedro.
- crea pronósticos iniciales de partidos 1 a 7.
- respeta home/away del fixture.

## 17. Primer hito recomendado

Implementar una versión vertical mínima:

1. Crear proyecto Next.js + TypeScript.
2. Configurar Prisma + Postgres.
3. Definir schema Prisma.
4. Crear seed desde `fixture.json` + pronósticos iniciales.
5. Implementar scoring puro con tests.
6. Implementar selección de participante.
7. Implementar listado de partidos con filtro por día/grupo.
8. Implementar upsert de pronóstico con bloqueo server-side.
9. Implementar reveal desde kickoff.
10. Implementar carga manual de resultados.
11. Implementar tabla de puntos.

## 18. No objetivos de v1

- Auth real.
- Passwords.
- Roles/permisos complejos.
- API externa de resultados.
- Chat, comentarios o notificaciones.
- Diseño visual complejo.
- Predicción de campeones o brackets completos antes de tener partidos definidos.
