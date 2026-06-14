# AGENTS.md — Pronósticos Mundial

## 1. Objetivo del producto

Construir una aplicación de uso familiar para cargar, bloquear, revelar y puntuar pronósticos de partidos del Mundial 2026.

La app debe priorizar:

* simplicidad operativa;
* claridad visual;
* reglas de juego confiables;
* privacidad de pronósticos antes del inicio de cada partido;
* trazabilidad básica en acciones sensibles, especialmente carga y edición de resultados.

No es una app pública. Es una app de uso familiar, por lo que no se busca una arquitectura de autenticación empresarial, pero sí una capa mínima de autenticación para evitar errores, suplantaciones accidentales y edición de resultados por usuarios no autorizados.

## 2. Estado actual del proyecto

El proyecto ya tiene una v1 vertical funcional y desplegable en Vercel.

Estado funcional actual:

* Next.js App Router.
* Prisma.
* Postgres.
* Seed del fixture.
* Participantes por defecto.
* Alta simple de participantes.
* Carga y edición de pronósticos.
* Bloqueo server-side desde el kickoff.
* Reveal de pronósticos desde el kickoff.
* Tabla de puntos calculada en lectura.
* Carga manual de resultados en `/admin/results`.

La carga manual de resultados ya existe. El próximo trabajo no debe implementarla desde cero, sino protegerla con autenticación/admin y mejorar la trazabilidad de quién cargó o editó cada resultado.

## 3. Stack definido

* Framework: Next.js con App Router.
* Lenguaje: TypeScript.
* Deploy: Vercel.
* Base de datos: Postgres serverless compatible con Vercel.
* ORM: Prisma ORM.
* UI: componentes simples, responsive, mobile-first.
* Tests: Vitest para lógica de dominio, scoring, read models y server actions críticas.

Principios técnicos:

* Mantener el dominio de scoring aislado en funciones puras.
* No mezclar cálculo de puntos dentro de componentes React.
* No confiar en validaciones client-side para reglas sensibles.
* Validar bloqueo, identidad y permisos del lado servidor.
* Evitar sobreingeniería.
* Priorizar migraciones no destructivas.

## 4. Datos base disponibles

Existe un archivo `fixture.json` con:

* Torneo: FIFA World Cup 2026.
* 48 equipos.
* 104 partidos.
* 72 partidos de fase de grupos.
* 16 partidos de Round of 32.
* 8 partidos de Round of 16.
* 4 cuartos de final.
* 2 semifinales.
* partido por tercer puesto.
* final.

Notas del fixture:

* `matchNumber` es el identificador operativo principal del partido.
* `kickoffAt` está en ET, UTC-4.
* Para persistencia se debe guardar como Date real/instante absoluto, no como string local ambiguo.
* Los partidos simultáneos deben diferenciarse por `matchNumber`, no solo por fecha/hora.
* Los partidos de eliminación directa pueden tener equipos descriptivos o TBD hasta que se definan los cruces.

## 5. Usuarios y autenticación simple para uso familiar

La app debe inicializarse con dos participantes por defecto:

* Ramiro
* Pedro

Debe existir posibilidad de agregar más participantes.

El proyecto originalmente funcionaba sin autenticación, usando selección de participante desde la pantalla inicial. A partir del próximo hito, la app debe incorporar una autenticación simple para uso familiar basada en:

* nombre de usuario o slug;
* contraseña;
* cookie de sesión `httpOnly`;
* logout;
* posibilidad de cambiar contraseña;
* posibilidad de crear nuevos usuarios con contraseña.

No implementar en esta etapa:

* OAuth;
* passkeys;
* recuperación de contraseña por email;
* magic links;
* 2FA;
* RBAC complejo;
* invitaciones públicas;
* registro abierto sin control.

La solución debe ser simple, pero no debe guardar contraseñas en texto plano.

### Modelo recomendado para Participant

Extender `Participant` en lugar de crear un sistema separado de usuarios.

Campos esperados:

* `id`
* `name`
* `slug`
* `normalizedName`
* `passwordHash`
* `isAdmin`
* `active`
* `createdAt`
* `updatedAt`
* opcional `lastLoginAt`

Reglas:

* `slug` debe ser único.
* `normalizedName` debe ayudar a evitar duplicados por mayúsculas/minúsculas.
* `passwordHash` debe guardar siempre un hash, nunca la contraseña plana.
* `isAdmin` debe habilitar acciones administrativas mínimas.
* `active = false` debe impedir login y operación normal.

### Sesión

Para una app de uso familiar, se acepta una estrategia simple:

* cookie firmada `httpOnly`;
* `SESSION_SECRET` obligatorio en producción;
* expiración razonable;
* identidad resuelta server-side.

Las acciones sensibles no deben confiar en `participantId` enviado desde formularios o URLs. Deben resolver el usuario actual desde la sesión.

Si se quiere invalidar sesiones al cambiar contraseña, agregar tabla `Session`. Si no, puede mantenerse cookie firmada simple para este alcance.

### Cambio de contraseña

Debe existir una pantalla simple, por ejemplo:

* `/account/password`

Reglas:

* pedir contraseña actual;
* pedir contraseña nueva;
* pedir confirmación;
* validar todo server-side;
* guardar nuevo hash;
* no revelar información sensible en errores;
* opcionalmente cerrar otras sesiones si existe tabla `Session`.

### Alta de nuevos usuarios

Para evitar registros accidentales o duplicados, la creación de usuarios con contraseña debe ser acción admin.

Ruta sugerida:

* `/admin/participants`

Debe permitir:

* listar participantes;
* crear participante con nombre y contraseña inicial;
* activar/desactivar participante;
* marcar o desmarcar admin, con cuidado de no dejar el sistema sin ningún admin activo.

No permitir desactivar el último admin activo.

## 6. Roles y permisos mínimos

No implementar roles complejos.

Usar una regla simple:

* participante normal: puede cargar y editar sus propios pronósticos antes del kickoff;
* admin: además puede cargar y editar resultados, y administrar participantes.

Permisos esperados:

| Acción                                       | Participante | Admin |
| -------------------------------------------- | -----------: | ----: |
| Ver su pantalla                              |           Sí |    Sí |
| Crear/editar su pronóstico antes del kickoff |           Sí |    Sí |
| Ver pronósticos ajenos antes del kickoff     |           No |    No |
| Ver pronósticos ajenos desde kickoff         |           Sí |    Sí |
| Cargar resultados                            |           No |    Sí |
| Editar resultados                            |           No |    Sí |
| Crear usuarios                               |           No |    Sí |
| Activar/desactivar usuarios                  |           No |    Sí |
| Cambiar su propia contraseña                 |           Sí |    Sí |

Todas las validaciones de permisos deben hacerse server-side.

## 7. Regla central de privacidad y bloqueo

Antes del horario de inicio de un partido:

* cada usuario puede crear o editar solamente su propio pronóstico;
* ningún usuario debe ver pronósticos de otros participantes;
* la UI puede mostrar si el usuario actual ya cargó o no su pronóstico.

Desde el horario de inicio del partido:

* el pronóstico queda bloqueado;
* no se puede crear ni editar pronóstico para ese partido;
* se revelan los pronósticos de todos los participantes activos;
* para participantes sin pronóstico debe mostrarse explícitamente “Sin pronóstico”.

La comparación temporal debe hacerse en servidor usando la hora del servidor/base de datos, no confiando en el reloj del navegador.

La UI puede mostrar estados visuales, pero la barrera real debe estar en server actions/read models.

## 8. Resultados

Los resultados se cargan manualmente.

La ruta actual `/admin/results` ya existe. El próximo alcance sobre esta funcionalidad debe ser:

* protegerla con autenticación;
* exigir usuario admin;
* registrar quién cargó el resultado;
* registrar quién lo editó por última vez;
* mostrar esa trazabilidad de forma discreta en la UI;
* mantener advertencia clara de que los resultados impactan directamente en la tabla de puntos.

Cada partido debe poder tener:

* goles reales equipo local;
* goles reales equipo visitante;
* en eliminación directa, equipo clasificado/ganador de la llave cuando corresponda;
* timestamps de creación y actualización;
* usuario que creó/cargó el resultado;
* usuario que lo editó por última vez.

### Modelo recomendado para MatchResult

Extender el modelo actual con trazabilidad mínima:

* `id`
* `matchId`
* `homeScore`
* `awayScore`
* `advancesTeamName`
* `createdAt`
* `updatedAt`
* `createdByParticipantId`
* `updatedByParticipantId`

Relaciones:

* `createdByParticipantId` referencia a `Participant`.
* `updatedByParticipantId` referencia a `Participant`.

Reglas:

* `matchId` debe ser único.
* goles deben ser enteros >= 0.
* en eliminación directa, si el resultado en goles es empate, debe indicarse clasificado.
* solo admin puede crear o editar resultados.
* no mutar puntajes acumulados; la tabla debe recalcularse en lectura.

### Status de resultado

El modelo actual representa:

* sin fila en `MatchResult`: resultado no cargado;
* con fila en `MatchResult`: resultado cargado.

Esto es aceptable para la app familiar.

Agregar `status: pending | final` solamente si el patch lo necesita explícitamente para mejorar UX o preparar integración externa. No agregarlo si complica innecesariamente la migración.

### UI de trazabilidad de resultados

En la UI, mostrar el dato de auditoría de manera chica y no invasiva.

Ejemplos:

* `Agregado por Ramiro`
* `Agregado por Pedro · editado por Ramiro`
* `Resultado cargado por Ramiro · última edición 14/06/2026 18:42`
* `Última edición: Pedro`

No usar este dato como elemento visual principal. Debe servir para resolver dudas familiares si un resultado fue mal cargado.

En tarjetas o filas de partido, ubicarlo cerca del resultado, con estilo secundario:

* texto pequeño;
* color de baja jerarquía;
* sin competir con marcador, estado ni botones principales.

## 9. Pronósticos

Cada pronóstico debe registrar:

* participante;
* partido;
* goles pronosticados para equipo local;
* goles pronosticados para equipo visitante;
* en eliminación directa, equipo que pasa/clasifica si el partido termina empatado o si la regla de la app exige elegir clasificado;
* timestamps de creación y actualización.

Restricción:

* un participante puede tener como máximo un pronóstico por partido.

Reglas:

* no permitir goles negativos;
* no permitir crear/editar si `now >= match.kickoffAt`;
* resolver el participante actual desde sesión, no desde input arbitrario;
* si queda una ruta con `participantId`, debe validarse que coincida con la sesión o redirigir a la pantalla correcta.

## 10. Reglas de puntuación

### Fase de grupos

* Acertar signo/resultado deportivo básico: 1 punto.

  * local gana;
  * empate;
  * visitante gana.
* Acertar resultado exacto de ambos equipos: 3 puntos.
* El resultado exacto reemplaza al punto de signo; no suma 1 + 3.

Ejemplos:

* Real: México 2 - 1 Sudáfrica.

  * Pronóstico 1 - 0 México: 1 punto.
  * Pronóstico 2 - 1 México: 3 puntos.
  * Pronóstico 1 - 1: 0 puntos.

### Eliminación directa

Regla base documentada originalmente:

* acertar resultado exacto de goles: 3 puntos;
* si el partido fue empatado en goles y el usuario además acertó quién pasa, suma 1 punto adicional;
* en ese caso el máximo total es 4 puntos.

Diferencia detectada en el estado actual:

* el código actual otorga 1 punto por acertar clasificado en eliminación directa cuando hay empate no exacto y clasificado correcto.

Antes de modificar scoring, decidir explícitamente si esa regla queda oficial o si se revierte al contrato inicial.

Mientras no se pida cambiar scoring, no tocar la regla implementada sin una decisión explícita.

## 11. Pronósticos iniciales ya conocidos

Estos datos deben cargarse como seed inicial.

### Partido 1 — Mexico vs South Africa

* Pedro: Mexico 1 - 0 South Africa.
* Ramiro: Mexico 1 - 1 South Africa.

### Partido 2 — Korea Republic vs Czechia

* Pedro: Korea Republic 2 - 1 Czechia.
* Ramiro: Korea Republic 2 - 3 Czechia.

### Partido 3 — Canada vs Bosnia and Herzegovina

* Pedro: Canada 1 - 2 Bosnia and Herzegovina.
* Ramiro: Canada 2 - 1 Bosnia and Herzegovina.

### Partido 4 — United States vs Paraguay

* Ramiro: United States 2 - 0 Paraguay.
* Pedro: United States 0 - 1 Paraguay.

### Partido 5 — Qatar vs Switzerland

* Pedro: Qatar 1 - 1 Switzerland.
* Ramiro: Qatar 3 - 2 Switzerland.

### Partido 6 — Brazil vs Morocco

* Pedro: Brazil 1 - 1 Morocco.
* Ramiro: Brazil 0 - 2 Morocco.

### Partido 7 — Haiti vs Scotland

El fixture tiene a Haiti como local y Scotland como visitante.

* Ramiro: Haiti 0 - 3 Scotland.
* Pedro: Haiti 0 - 2 Scotland.

Nota: el audit actual detectó que el seed también incluye partido 8 para Ramiro y Pedro. Antes de tocar seeds, decidir si ese dato es válido o si fue drift accidental.

## 12. Modelo de datos esperado

### Participant

Campos recomendados:

* `id`
* `name`
* `slug`
* `normalizedName`
* `passwordHash`
* `isAdmin`
* `active`
* `createdAt`
* `updatedAt`
* opcional `lastLoginAt`

Restricciones:

* `slug` único.
* `normalizedName` único.
* nombres visibles simples.
* contraseña siempre hasheada.
* no permitir eliminar/desactivar el último admin activo.

### Team

Campos:

* `id`
* `name`
* `code`
* `groupName`
* opcional `createdAt`
* opcional `updatedAt`

Restricciones:

* `name` único.
* `code` único.

### Match

Campos:

* `id`
* `matchNumber`
* `stage`
* `groupName`
* `homeTeamId`
* `awayTeamId`
* `homeTeamName` o `homeTeamLabel`
* `awayTeamName` o `awayTeamLabel`
* `kickoffAt`
* `venue`
* `city`
* opcional `createdAt`
* opcional `updatedAt`

Notas:

* en fase de grupos conviene resolver `homeTeamId` y `awayTeamId`;
* en cruces todavía indefinidos se permite `homeTeamId`/`awayTeamId` nullable y se conserva label descriptivo;
* `matchNumber` debe ser único;
* `kickoffAt` debe tratarse como instante absoluto.

### Prediction

Campos:

* `id`
* `participantId`
* `matchId`
* `homeScore`
* `awayScore`
* `advancesTeamName`
* `createdAt`
* `updatedAt`

Restricciones:

* unique `(participantId, matchId)`;
* goles enteros >= 0;
* no permitir escritura si `now >= match.kickoffAt`;
* no confiar en `participantId` arbitrario desde el cliente.

### MatchResult

Campos actuales/recomendados:

* `id`
* `matchId`
* `homeScore`
* `awayScore`
* `advancesTeamName`
* `createdAt`
* `updatedAt`
* `createdByParticipantId`
* `updatedByParticipantId`

Restricciones:

* unique `(matchId)`;
* goles enteros >= 0;
* si eliminación directa termina empatada, clasificado obligatorio;
* solo admin puede crear o editar.

### Session opcional

Usar solo si se decide manejar sesiones persistidas/revocables.

Campos sugeridos:

* `id`
* `participantId`
* `tokenHash`
* `expiresAt`
* `createdAt`
* `lastUsedAt`

Si se usa cookie firmada simple, esta tabla puede omitirse.

## 13. Read models principales

### Login

Debe mostrar:

* campo usuario/nombre;
* campo contraseña;
* error genérico ante credenciales inválidas;
* redirección al participante autenticado si login correcto.

No revelar si falló el usuario o la contraseña por separado.

### Home / pantalla inicial

Con autenticación incorporada, `/` puede:

* redirigir a `/login` si no hay sesión;
* redirigir a la pantalla del participante si hay sesión;
* o funcionar como home autenticada.

Evitar mantener selección pública de participante como mecanismo de identidad una vez que exista autenticación.

### Pantalla del participante

Debe mostrar:

* próximos partidos;
* partidos de hoy;
* partidos ya bloqueados;
* estado de pronóstico propio: cargado | pendiente | bloqueado sin pronóstico;
* filtros por día;
* filtros por grupo;
* acceso a tabla de puntos;
* acceso al detalle de partido.

### Detalle/tarjeta de partido

Antes del kickoff:

* datos del partido;
* formulario de pronóstico propio;
* no mostrar pronósticos ajenos.

Desde kickoff:

* datos del partido;
* resultado real si fue cargado;
* pronósticos de todos los participantes activos;
* puntos obtenidos por cada participante si el resultado está cargado;
* participantes sin pronóstico con texto explícito “Sin pronóstico”.

### Tabla de puntos

Debe mostrar:

* participante;
* puntos totales;
* cantidad de exactos;
* cantidad de signos acertados;
* cantidad de partidos pronosticados;
* cantidad de partidos sin pronóstico ya bloqueados.

La tabla se calcula desde resultados cargados y pronósticos existentes. No persistir el puntaje salvo que aparezca una necesidad clara.

### Admin resultados

Debe mostrar:

* listado de partidos;
* filtros por día/grupo/estado;
* resultado actual si existe;
* formulario para cargar o editar resultado;
* advertencia de impacto en tabla;
* trazabilidad discreta de quién cargó/editó.

Por defecto, conviene priorizar partidos ya iniciados o jugados.

Opcional:

* bloquear carga de resultados de partidos no iniciados;
* permitir override admin explícito si se considera necesario.

### Admin participantes

Debe mostrar:

* participantes activos/inactivos;
* admins;
* acción para crear participante;
* acción para activar/desactivar;
* acción para definir contraseña inicial;
* acción para marcar admin si corresponde.

## 14. Rutas sugeridas

Estado actual:

* `/`
* `/p/[participantId]`
* `/p/[participantId]/matches/[matchId]`
* `/admin/results`

Rutas recomendadas para próximo hito:

* `/login`
* `/logout` o server action de logout
* `/me` o redirección segura a la pantalla del participante autenticado
* `/account/password`
* `/admin/results`
* `/admin/participants`

No es obligatorio migrar inmediatamente de `/p/[participantId]` a `/u/[participantSlug]` o `/me`, pero si se mantiene `/p/[participantId]`, debe validarse que el participante de la URL coincida con la sesión.

Preferencia futura:

* `/me` para pantalla principal autenticada;
* `/matches/[matchId]` para detalle autenticado;
* `/admin/results` para resultados;
* `/admin/participants` para usuarios.

## 15. Server actions / comandos esperados

Acciones existentes o esperadas:

* `loginAction`
* `logoutAction`
* `changePasswordAction`
* `createParticipantAction`
* `upsertPredictionAction`
* `upsertMatchResultAction`
* `createAdminParticipantAction`
* `updateParticipantStatusAction`
* opcional `updateParticipantAdminStatusAction`

Reglas críticas:

* `loginAction` debe validar hash de contraseña.
* `logoutAction` debe limpiar sesión/cookie.
* `changePasswordAction` debe validar contraseña actual.
* `upsertPredictionAction` debe validar server-side que el partido no empezó.
* `upsertPredictionAction` debe resolver participante desde sesión.
* `upsertMatchResultAction` debe exigir admin.
* `upsertMatchResultAction` debe registrar `createdByParticipantId` y/o `updatedByParticipantId`.
* `upsertMatchResultAction` no debe mutar puntajes acumulados.
* `createParticipantAction` pública debe revisarse: con autenticación, probablemente debe pasar a ser admin-only o reemplazarse por una acción específica de admin.

## 16. Seeds

El seed inicial debe:

1. Crear participantes Ramiro y Pedro.
2. Crear equipos desde `fixture.json`.
3. Crear partidos desde `fixture.json`.
4. Crear los pronósticos ya conocidos.
5. Asignar admin inicial al menos a Ramiro.
6. Definir cómo se crea la contraseña inicial.

Opciones aceptables para contraseña inicial:

* script one-off local;
* variables temporales de entorno para seed inicial;
* flujo de “crear contraseña inicial” si `passwordHash` está vacío.

No cargar passwords hardcodeadas permanentes en el repositorio.

No correr seed en producción sin intención explícita, porque puede pisar datos manuales si actualiza fixture, participantes o pronósticos.

## 17. Variables de entorno esperadas

Base de datos:

* `DATABASE_URL`
* `DIRECT_DATABASE_URL`

Sesión/auth simple:

* `SESSION_SECRET`

Opcional para bootstrap inicial:

* `INITIAL_ADMIN_PASSWORD`
* `RAMIRO_INITIAL_PASSWORD`
* `PEDRO_INITIAL_PASSWORD`

No commitear secretos reales.

En producción, `SESSION_SECRET` debe existir y ser suficientemente largo.

## 18. Principios de implementación

* Mantener cambios incrementales.
* Evitar migraciones destructivas.
* Proteger datos existentes de Vercel.
* No reseedear producción sin decisión explícita.
* Usar server actions con validación fuerte.
* Mantener scoring puro y testeado.
* Mantener read models separados de UI.
* Usar `matchNumber` como referencia humana y operativa.
* Usar `kickoffAt` como instante absoluto.
* Mostrar horarios en hora local del usuario, pero guardar instantes absolutos.
* Evitar auth compleja.
* Evitar roles complejos.
* Diseñar resultados para que luego pueda incorporarse una API externa sin migración traumática.

## 19. Tests mínimos obligatorios

### Scoring fase de grupos

* exacto local gana = 3.
* exacto empate = 3.
* exacto visitante gana = 3.
* signo local gana = 1.
* signo empate = 1.
* signo visitante gana = 1.
* incorrecto = 0.

### Scoring eliminación directa

Cubrir la regla actualmente decidida.

Si se mantiene regla actual:

* resultado exacto sin empate = 3.
* empate exacto + clasificado correcto = 4.
* empate exacto + clasificado incorrecto = 3.
* empate no exacto + clasificado correcto = 1.
* no exacto sin clasificado correcto = 0.

Si se revierte al contrato inicial:

* resultado exacto sin empate = 3.
* empate exacto + clasificado correcto = 4.
* empate exacto + clasificado incorrecto = 3.
* no exacto = 0.

No cambiar tests sin decidir primero la regla oficial.

### Bloqueo

* antes de kickoff permite crear/editar pronóstico propio.
* en kickoff exacto bloquea.
* después de kickoff bloquea.
* antes de kickoff no revela pronósticos ajenos.
* desde kickoff revela pronósticos ajenos y ausencias.

### Autenticación

* usuario existente con password correcto autentica.
* password incorrecto rechaza.
* usuario inexistente rechaza con error genérico.
* usuario inactivo no autentica.
* logout elimina sesión.
* rutas protegidas redirigen a login sin sesión.

### Cambio de contraseña

* cambia con contraseña actual correcta.
* rechaza contraseña actual incorrecta.
* rechaza confirmación distinta.
* nuevo password permite login.
* password anterior deja de funcionar.

### Permisos

* participante normal no puede acceder/modificar resultados.
* admin puede cargar resultado.
* admin puede editar resultado.
* server action de resultado rechaza usuario no admin.
* server action de pronóstico usa usuario de sesión y no `participantId` arbitrario.

### Trazabilidad de resultados

* al crear resultado guarda `createdByParticipantId`.
* al crear resultado guarda `updatedByParticipantId`.
* al editar resultado conserva `createdByParticipantId`.
* al editar resultado actualiza `updatedByParticipantId`.
* read model expone nombre del usuario que cargó/editó.
* UI muestra texto discreto de auditoría.

### Seeds

* crea 104 partidos.
* crea 48 equipos.
* crea Ramiro y Pedro.
* crea al menos un admin inicial.
* crea pronósticos iniciales esperados.
* respeta home/away del fixture.
* no guarda passwords planas.

## 20. Roadmap recomendado

### Hito 1 — Autenticación simple para uso familiar

Objetivo:

* agregar login por nombre/slug + password;
* cookie `httpOnly`;
* logout;
* proteger rutas;
* proteger server actions.

No cambiar scoring ni rediseñar toda la UI en este hito.

### Hito 2 — Cambio de contraseña

Objetivo:

* permitir que cada usuario cambie su contraseña;
* validar contraseña actual;
* actualizar hash;
* mantener UX simple.

### Hito 3 — Admin de participantes

Objetivo:

* crear usuarios con contraseña inicial;
* activar/desactivar usuarios;
* marcar admin;
* evitar quedarse sin admin activo.

### Hito 4 — Proteger y auditar resultados

Objetivo:

* exigir admin en `/admin/results`;
* exigir admin en server action;
* guardar `createdByParticipantId`;
* guardar `updatedByParticipantId`;
* mostrar “Agregado por…” o “Editado por…” de forma discreta.

Este hito puede combinarse con Hito 1 si el patch sigue siendo simple y testeable.

### Hito 5 — Refinamiento UX de resultados

Objetivo:

* filtros más cómodos;
* priorizar partidos ya iniciados;
* mejorar estados visuales;
* prevenir carga accidental de partidos futuros;
* mantener advertencia de impacto en tabla.

## 21. No objetivos actuales

No implementar por ahora:

* OAuth;
* passkeys;
* 2FA;
* recuperación por email;
* invitaciones públicas;
* registro público abierto;
* roles/permisos complejos;
* API externa de resultados;
* chat;
* comentarios;
* notificaciones;
* diseño visual complejo;
* persistencia de puntajes agregados;
* predicción de campeón o brackets completos antes de tener partidos definidos.

## 22. Checklist antes de cada patch

Antes de tocar código:

* leer este `AGENTS.md`;
* revisar README;
* revisar docs/audits más recientes;
* verificar estado real de schema y rutas;
* evitar asumir que el contrato viejo sigue vigente si el audit dice otra cosa.

Antes de tocar Prisma:

* diseñar migración no destructiva;
* revisar impacto en seed;
* revisar datos existentes en Vercel;
* evitar borrar o recrear tablas con datos productivos.

Antes de cerrar patch:

* `npm run prisma:validate`
* `npm run lint`
* `npm run test`
* `npx tsc --noEmit`
* `npm run build`

Documentar:

* cambios de modelo;
* nuevas variables de entorno;
* impacto en producción;
* pasos de migración;
* decisiones tomadas sobre scoring o auth.

## 23. Criterio general para Codex

Cuando haya tensión entre simplicidad y robustez, elegir la solución más simple que preserve estas garantías:

* nadie puede editar pronósticos después del kickoff;
* nadie puede ver pronósticos ajenos antes del kickoff;
* nadie puede operar como otro participante cambiando una URL o input oculto;
* solo admin puede cargar o editar resultados;
* si un resultado está mal cargado, debe poder saberse qué usuario lo cargó o editó;
* las contraseñas nunca se guardan en texto plano;
* los puntajes se calculan de forma confiable desde pronósticos y resultados.
