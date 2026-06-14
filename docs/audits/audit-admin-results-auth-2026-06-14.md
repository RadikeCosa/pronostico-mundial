# Audit tecnico: `/admin/results` + autenticacion simple

Fecha: 2026-06-14

## Recomendacion ejecutiva

No rehacer `/admin/results`. La pantalla y la action actuales son una buena base para uso familiar, pero antes de exponer login/password hay que cerrar tres cosas server-side:

1. Proteger ruta y action con sesion + admin.
2. Bloquear carga/edicion de resultados si `now < match.kickoffAt`.
3. Agregar trazabilidad minima en `MatchResult`: quien creo y quien edito por ultima vez.

Para mantener el alcance chico, alcanza con `Participant.isAdmin`. No hace falta RBAC complejo, OAuth, tabla de permisos ni redisenar la pantalla. Tampoco conviene agregar `MatchResult.status` en el mismo primer patch salvo que se quiera cambiar la semantica actual de resultado; hoy ausencia/presencia de fila funciona y reduce riesgo de migracion.

## Archivos revisados

- `AGENTS.md`
- `README.md`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `app/admin/results/page.tsx`
- `app/admin/results/actions.ts`
- `components/result-form.tsx`
- `components/local-date-time.tsx`
- `lib/read-models.ts`
- `lib/scoring.ts`
- `lib/presentation.ts`
- `lib/prisma.ts`
- `lib/read-models.test.ts`
- `lib/scoring.test.ts`
- `package.json`

## 1. Estado actual real de `/admin/results`

### Que permite hacer hoy

La ruta `app/admin/results/page.tsx` renderiza todos los partidos agrupados por dia con `getAdminResultsGroupedByDay()`. Para cada partido muestra:

- numero de partido;
- etapa y grupo si corresponde;
- equipos;
- kickoff en hora local del navegador;
- resultado actual o "Sin cargar";
- formulario para guardar resultado.

El formulario `components/result-form.tsx` permite:

- cargar goles local/visitante;
- editar goles local/visitante si ya existe resultado;
- cargar `advancesTeamName` en partidos no `GROUP`;
- enviar siempre que la tarjeta este renderizada.

La action `upsertMatchResultAction(matchId, state, formData)`:

- parsea goles como enteros no negativos;
- busca el partido por `matchId`;
- ignora `advancesTeamName` en fase de grupos;
- crea `MatchResult` si no existe;
- actualiza `MatchResult` si existe;
- revalida `/admin/results` y el layout.

### Validaciones actuales

Existen:

- goles obligatorios;
- goles enteros no negativos por regex y parse;
- partido existente;
- `advancesTeamName` solo se persiste si el partido no es de grupo.

No existen:

- sesion;
- admin;
- validacion de partido iniciado;
- trazabilidad de creador/editor;
- validacion de clasificado obligatorio si eliminatoria termina empatada;
- validacion de que `advancesTeamName` sea local, visitante o label valido;
- check constraints DB para goles no negativos;
- proteccion contra llamadas directas a la server action por usuarios no admin.

### Impacto en tabla de puntos

`MatchResult` alimenta el scoring en lectura:

- `getStandingsTable()` selecciona `matches.result` y `matches.predictions`;
- `buildStandingsTable()` llama `calculatePredictionScore()`;
- `getMatchReadModelById()` tambien calcula puntos visibles cuando hay resultado.

No hay puntajes persistidos. Por eso cualquier resultado creado/editado recalcula inmediatamente tabla y detalle en lecturas posteriores.

### Riesgos actuales

P1:

- Cualquier persona con acceso a la URL puede cargar o editar resultados.
- La server action tambien carece de permiso server-side.
- Se pueden cargar resultados de partidos futuros.

P2:

- No queda registro de quien cargo o edito.
- En eliminatorias se puede guardar empate sin clasificado.
- `advancesTeamName` es texto libre, con riesgo de typos.
- La pantalla lista y habilita todos los partidos, incluyendo futuros, lo que aumenta errores accidentales.

## 2. Integracion con autenticacion

### Como proteger la ruta

`/admin/results` debe resolver el usuario actual server-side al comienzo de `AdminResultsPage`.

Recomendacion:

- crear helper `getCurrentParticipant()` para leer cookie/sesion;
- crear helper `requireAdmin()` para:
  - exigir sesion valida;
  - exigir `active = true`;
  - exigir `isAdmin = true`;
  - redirigir a `/login` si no hay sesion;
  - devolver `notFound()` o redirigir a pantalla normal si hay sesion sin admin.

Para esta app familiar, un helper asi alcanza. No hace falta middleware obligatorio en el primer patch, aunque podria sumarse luego para UX.

### Como proteger `upsertMatchResultAction`

La action debe llamar `requireAdmin()` o una variante de action que no haga redirects problematicos y devuelva error de formulario:

- si no hay sesion: error generico o redirect a login;
- si usuario no admin: error "No tenes permiso para cargar resultados.";
- si admin: continuar.

La proteccion debe estar en la action aunque la pagina ya este protegida. Es la barrera real contra requests directos.

### Si alcanza con `Participant.isAdmin`

Si, alcanza. El dominio de permisos requerido es binario:

- participante normal: pronosticos propios;
- admin: resultados y administracion de participantes.

No se recomienda crear roles/permissions table todavia.

### Como resolver el admin actual desde sesion

Flujo recomendado:

1. Cookie httpOnly firmada contiene id/slug de sesion o participant id firmado.
2. Helper server-side valida firma y expiracion.
3. Helper consulta `Participant` por id/slug.
4. Rechaza si `active = false`.
5. `requireAdmin()` rechaza si `isAdmin = false`.
6. La action usa el `participant.id` devuelto para `createdByParticipantId`/`updatedByParticipantId`.

Helpers sugeridos:

- `lib/auth/session.ts`
  - `getCurrentParticipant()`
  - `requireParticipant()`
  - `requireAdmin()`
- `lib/auth/password.ts`
  - hashing/verificacion cuando se implemente login.

## 3. Regla de fecha para resultados

### Regla recomendada

Por defecto, impedir guardar resultados si el partido no empezo:

```ts
if (!isMatchLocked(match.kickoffAt, new Date())) {
  return {
    status: "error",
    message: "Todavia no se pueden cargar resultados de este partido.",
  };
}
```

Usar `isMatchLocked(kickoffAt, now)` ya existente en `lib/read-models.ts`, porque la regla coincide con "desde kickoff". La validacion debe estar en `upsertMatchResultAction`, no solo en UI.

### Cambios necesarios en la query de la action

Hoy la action busca `id` y `stage`. Debe agregar `kickoffAt`, y probablemente `homeTeamName`/`awayTeamName` si se valida clasificado.

### Copy/UX para partidos futuros

En tarjetas futuras:

- mostrar resultado actual si existiera por datos previos;
- deshabilitar formulario por defecto;
- mostrar texto chico: "Disponible desde el inicio del partido.";
- mantener kickoff visible.

El boton puede quedar disabled con label:

- "Resultado no disponible todavia"

O, si se prefiere menos cambio visual:

- reemplazar el formulario por una caja secundaria: "Este partido todavia no empezo."

### Override admin

Recomendacion para primer patch: no permitir override.

Motivo:

- reduce errores accidentales;
- mantiene la regla simple;
- no hay necesidad operativa clara antes del Mundial;
- evita sumar UI especial y logs de override.

Si mas adelante se permite override, UX segura:

- checkbox explicito "Cargar resultado antes del inicio";
- campo de confirmacion escribiendo `CONFIRMAR`;
- guardar tambien `overrideReason`;
- mostrar advertencia fuerte;
- mantener validacion server-side de que el admin marco override.

Eso queda fuera de alcance recomendado.

## 4. Trazabilidad

### Modelo recomendado

Agregar a `MatchResult`:

- `createdByParticipantId String?`
- `updatedByParticipantId String?`
- relaciones opcionales a `Participant`.

Deben ser nullable inicialmente para migracion no destructiva, porque puede haber resultados ya cargados en Vercel sin usuario asociado.

Relaciones sugeridas:

- `createdByParticipant Participant? @relation("MatchResultCreatedBy", fields: [createdByParticipantId], references: [id], onDelete: SetNull)`
- `updatedByParticipant Participant? @relation("MatchResultUpdatedBy", fields: [updatedByParticipantId], references: [id], onDelete: SetNull)`

En `Participant`, agregar arrays inversos con nombres de relacion.

### Comportamiento de create/update

Al crear resultado:

- `createdByParticipantId = currentAdmin.id`
- `updatedByParticipantId = currentAdmin.id`

Al editar resultado:

- conservar `createdByParticipantId`
- setear `updatedByParticipantId = currentAdmin.id`

No usar ids enviados desde el formulario.

### UI discreta

El read model admin debe seleccionar nombres:

- `createdByParticipant: { select: { name: true } }`
- `updatedByParticipant: { select: { name: true } }`

Copy recomendado:

- si solo creador: "Agregado por Ramiro"
- si creador y editor iguales: "Agregado por Ramiro"
- si creador y editor distintos: "Agregado por Ramiro · editado por Pedro"
- si no hay trazabilidad por datos anteriores: "Sin trazabilidad"

Ubicacion:

- debajo del "Resultado actual";
- texto `text-xs text-zinc-500`;
- no competir con marcador ni boton.

## 5. Modelo de datos

### Cambios minimos recomendados

Patch de auth/base:

- `Participant.slug String?` inicialmente o `String @unique` si se hace backfill en migracion.
- `Participant.normalizedName String?` inicialmente o unico si se backfillea.
- `Participant.passwordHash String?`
- `Participant.isAdmin Boolean @default(false)`
- opcional `Participant.lastLoginAt DateTime?`

Patch de resultados:

- `MatchResult.createdByParticipantId String?`
- `MatchResult.updatedByParticipantId String?`
- relaciones Prisma correspondientes.

### `status: pending | final`

Recomendacion: no agregar `status` ahora.

Razon:

- el modelo actual ya representa pendiente como ausencia de fila;
- la UI actual no necesita editar un "pending";
- agregar status obligaria a decidir si se crean 104 filas pendientes o si coexisten ausencia y pending;
- para el proximo objetivo, admin + kickoff + trazabilidad resuelven el riesgo principal.

Cuando si convendria:

- si se integra API externa;
- si se necesita guardar resultados parciales;
- si se quiere workflow de "borrador" vs "final";
- si se desea precargar filas para todos los partidos.

### Riesgos de migracion en Vercel

- Agregar campos requeridos sin default romperia datos existentes.
- Hacer `passwordHash` required de entrada romperia participantes actuales.
- Hacer `createdByParticipantId` required romperia resultados ya cargados.
- Hacer `slug`/`normalizedName` required sin backfill romperia.

Mitigacion:

- migracion 1 con campos nullable/defaults;
- script/backfill local o server-safe para Ramiro/Pedro;
- despues endurecer si hace falta.

### Backfill recomendado

Para este alcance:

- `isAdmin`: setear Ramiro admin en seed/backfill, y decidir si Pedro tambien.
- `slug`/`normalizedName`: backfill para participantes existentes.
- `passwordHash`: no generar contrasenas aleatorias invisibles en seed productivo. Mejor flujo de password inicial o script controlado.
- `createdByParticipantId`/`updatedByParticipantId`: dejar `null` para resultados historicos si no se sabe quien los cargo.

No correr seed en produccion salvo intencion explicita.

## 6. UX recomendada

### Pantalla con login/admin

Si no hay sesion:

- redirigir a `/login`.

Si hay sesion normal:

- redirigir a pantalla del participante o mostrar acceso no autorizado discreto.

Si hay admin:

- render actual con copy actualizado:
  - "Solo administradores pueden cargar resultados."
  - "Los resultados impactan directamente en la tabla de puntos."

### Partidos futuros no editables

En el read model ya existe `isLocked`, calculado por kickoff. Para admin results puede reutilizarse como `canEditResult = isLocked`.

UX:

- partidos futuros visibles pero formulario deshabilitado o reemplazado;
- texto: "Disponible desde el inicio del partido.";
- no ocultarlos por completo, porque sirve para revisar calendario.

### Priorizacion

Sin redisenar todo:

- mantener agrupacion por dia;
- ordenar como hoy por `kickoffAt`, `matchNumber`;
- opcionalmente agregar filtro simple mas adelante: "Pendientes jugados", "Con resultado", "Todos".

Primer patch puede evitar filtros nuevos si el bloqueo visual queda claro.

### Evitar carga accidental

Medidas chicas:

- formulario solo habilitado si partido iniciado;
- boton claro "Guardar resultado";
- mostrar resultado actual antes del form;
- en edicion, mantener valores actuales precargados;
- error server-side claro si el partido todavia no empezo.

No recomiendo modal de confirmacion en el primer patch; agrega friccion y codigo sin resolver el riesgo principal.

### Trazabilidad sin ensuciar

Mostrar una linea secundaria debajo del resultado:

- "Agregado por Ramiro"
- "Agregado por Ramiro · editado por Pedro"

No mostrar ids, timestamps extensos ni badges grandes en la primera version.

## 7. Tests necesarios

### Auth/admin

- acceso a `/admin/results` sin sesion redirige a `/login`;
- acceso con participante normal no renderiza admin;
- acceso con admin renderiza la pagina;
- `upsertMatchResultAction` sin sesion rechaza;
- `upsertMatchResultAction` con usuario normal rechaza;
- `upsertMatchResultAction` con admin permite seguir validaciones.

### Fecha de resultado

- partido futuro: action rechaza;
- kickoff exacto: action permite;
- despues de kickoff: action permite.

Usar `isMatchLocked` o helper equivalente para mantener la frontera consistente.

### Trazabilidad

- creacion guarda `createdByParticipantId` y `updatedByParticipantId`;
- edicion conserva `createdByParticipantId`;
- edicion cambia `updatedByParticipantId`;
- read model devuelve nombres de creador/editor;
- UI renderiza copy discreto.

### Scoring/tabla

- tabla de puntos cambia cuando se crea resultado;
- tabla de puntos cambia cuando se edita resultado;
- tabla no cambia por intento rechazado de partido futuro;
- no tocar reglas de `calculatePredictionScore`.

### UI

- partido futuro muestra estado no editable;
- partido iniciado muestra form;
- resultado existente muestra trazabilidad;
- resultado historico sin trazabilidad no rompe UI.

## 8. Plan de implementacion recomendado

### Patch 1: base de auth familiar

Objetivo: crear identidad server-side reusable.

Archivos a tocar:

- `prisma/schema.prisma`
- nueva migracion en `prisma/migrations/...`
- `prisma/seed.ts` o script/backfill controlado para `slug`, `normalizedName`, `isAdmin`
- `lib/auth/session.ts` nuevo
- `lib/auth/password.ts` nuevo
- `app/login/page.tsx` nuevo
- `app/login/actions.ts` nuevo
- `app/logout/actions.ts` nuevo o equivalente
- `app/page.tsx` si se decide redireccionar desde home
- tests nuevos de auth/session/password
- `.env.example`
- `README.md`

Decisiones previas:

- quien es admin inicial;
- estrategia de password inicial;
- cookie firmada simple vs tabla `Session`.

Fuera de alcance:

- `/admin/results`;
- cambio de contrasena;
- alta admin de usuarios;
- status de resultados.

### Patch 2: proteger `/admin/results`

Objetivo: que solo admin vea y ejecute resultados.

Archivos a tocar:

- `app/admin/results/page.tsx`
- `app/admin/results/actions.ts`
- `lib/auth/session.ts`
- tests de acceso/action admin

Cambios:

- `AdminResultsPage` llama `requireAdmin()`;
- `upsertMatchResultAction` llama `requireAdmin()`;
- la action usa el participante autenticado, no inputs del cliente;
- copy del header deja de decir "no tiene auth".

Fuera de alcance:

- trazabilidad DB si se quiere separar mas chico;
- filtros nuevos;
- status.

### Patch 3: bloquear resultados futuros

Objetivo: impedir carga antes del kickoff.

Archivos a tocar:

- `app/admin/results/actions.ts`
- `app/admin/results/page.tsx`
- `components/result-form.tsx`
- `lib/read-models.ts`
- `lib/read-models.test.ts` o test nuevo de admin read model/action

Cambios:

- action selecciona `kickoffAt`;
- action rechaza si `!isMatchLocked(match.kickoffAt, new Date())`;
- read model expone `canEditResult` o reutiliza `isLocked`;
- UI deshabilita/reemplaza form para futuros;
- copy "Disponible desde el inicio del partido."

Fuera de alcance:

- override admin.

### Patch 4: trazabilidad de resultados

Objetivo: saber quien creo/edito resultados.

Archivos a tocar:

- `prisma/schema.prisma`
- nueva migracion no destructiva
- `app/admin/results/actions.ts`
- `lib/read-models.ts`
- `app/admin/results/page.tsx`
- tests de action/read model/UI

Cambios:

- agregar `createdByParticipantId` y `updatedByParticipantId` nullable;
- create setea ambos;
- update conserva creador y actualiza editor;
- read model trae nombres;
- UI muestra linea discreta.

Fuera de alcance:

- backfill obligatorio para resultados antiguos;
- auditoria historica completa;
- timestamps visibles detallados.

### Patch 5 opcional: refinamiento de admin results

Objetivo: mejorar operacion sin redisenar.

Archivos posibles:

- `app/admin/results/page.tsx`
- `lib/read-models.ts`
- `components/result-form.tsx`

Cambios posibles:

- filtro "Jugados sin resultado";
- filtro "Con resultado";
- ordenar/colapsar dias futuros;
- validacion de clasificado obligatorio en empate de eliminatoria.

## Riesgos y mitigaciones

- Riesgo: romper datos en Vercel con campos required.
  - Mitigacion: campos nullable/defaults y backfill separado.
- Riesgo: proteger pagina pero olvidar action.
  - Mitigacion: `requireAdmin()` en ambos lugares, tests directos de action.
- Riesgo: depender del reloj del cliente.
  - Mitigacion: `new Date()` server-side en action.
- Riesgo: resultado futuro cargado por race o request manual.
  - Mitigacion: validacion server-side con `kickoffAt`.
- Riesgo: sobrecargar UI familiar.
  - Mitigacion: copy secundario, sin roles complejos ni modales iniciales.
- Riesgo: cambiar scoring accidentalmente.
  - Mitigacion: no tocar `lib/scoring.ts`; tests existentes deben seguir pasando.

## Decision final del audit

El camino mas directo y proporcionado es:

1. Implementar auth simple y `Participant.isAdmin`.
2. Proteger pagina y action de resultados con `requireAdmin`.
3. Bloquear server-side resultados futuros con `isMatchLocked`.
4. Agregar trazabilidad nullable en `MatchResult`.
5. Mantener ausencia/presencia de `MatchResult` como status implicito por ahora.

Esto integra `/admin/results` al nuevo login sin rehacer la funcionalidad, sin migraciones destructivas y sin agregar complejidad innecesaria.
