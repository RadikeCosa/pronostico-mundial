# Estado actual del proyecto — Pronósticos Mundial 2026

**Fecha:** 2026-06-14  
**Alcance:** estado funcional, auth simple, administración, resultados manuales, trazabilidad, UX/UI y deuda técnica visible.  
**Objetivo:** dejar un documento fuente actualizado para seguir iterando sin perder contexto.

---

## 1. Resumen Ejecutivo

El proyecto ya tiene una v1 funcional y desplegable. La base de pronósticos, bloqueo por kickoff, reveal desde kickoff, tabla de puntos y carga manual de resultados están en producción funcional dentro del código actual. Sobre esa base, ya se sumaron autenticación simple para uso familiar, cambio de contraseña, administración básica de participantes, protección de `/admin/results`, bloqueo server-side de partidos futuros y trazabilidad mínima de resultados.

El estado actual es bueno para seguir iterando con patches chicos. No hay una deuda estructural urgente, pero sí quedan decisiones de producto y UX por completar: administración de participantes todavía es simple, la visualización de resultados puede seguir refinándose, y el contrato de algunas pantallas todavía mezcla lenguaje de app familiar con términos más técnicos.

---

## 2. Estado Funcional Actual

La app resuelve el flujo principal de uso familiar:

- un participante puede iniciar sesión con nombre/slug y contraseña;
- puede cambiar su contraseña;
- puede cargar y editar sus propios pronósticos antes del kickoff;
- al kickoff se bloquea la edición y se revelan pronósticos ajenos;
- la tabla de puntos se calcula en lectura;
- un admin puede cargar y editar resultados manuales;
- los resultados futuros están bloqueados server-side;
- la trazabilidad de resultados ya se guarda y se muestra de forma discreta.

La app no intenta resolver todavía un sistema de identidad complejo, ni roles sofisticados, ni autenticación enterprise. La unidad funcional sigue siendo la familiaridad: simples reglas, textos claros y validaciones del lado servidor.

---

## 3. Rutas Existentes y Qué Hace Cada Una

### `/`
Redirige a `/login` si no hay sesión. Si hay sesión, redirige a la pantalla del participante autenticado. No funciona ya como selección pública de participante.

### `/login`
Muestra el formulario de acceso con nombre o slug y contraseña. Si ya hay sesión válida, redirige a la pantalla del participante.

### `/logout`
Cierra sesión limpiando la cookie firmada.

### `/account/password`
Pantalla para que el usuario cambie su propia contraseña validando contraseña actual, nueva contraseña y confirmación.

### `/p/[participantId]`
Pantalla principal autenticada del participante. Muestra filtros por día y grupo, lista de partidos, estado del pronóstico propio y tabla de puntos. Si el `participantId` de la URL no coincide con la sesión, redirige al usuario autenticado.

### `/p/[participantId]/matches/[matchId]`
Detalle de un partido para el participante autenticado. Antes del kickoff permite ver/editar el pronóstico propio. Desde kickoff bloquea el formulario y revela los pronósticos de todos los participantes activos.

### `/admin/results`
Pantalla de administración manual de resultados. Solo admins pueden acceder. Muestra partidos por día, resultado actual, formulario de resultado y trazabilidad discreta de quién lo agregó o editó.

### `/admin/participants`
Pantalla de administración simple de participantes. Solo admins pueden acceder. Permite crear usuarios nuevos con contraseña inicial y, además, activar/desactivar participantes y cambiar su contraseña desde admin.

---

## 4. Modelo de Datos Actual

### `Participant`
Campos actuales:

- `id`
- `name`
- `slug`
- `normalizedName`
- `passwordHash`
- `isAdmin`
- `active`
- `createdAt`
- `updatedAt`
- `lastLoginAt` opcional

Notas:

- `slug` y `normalizedName` son únicos.
- `passwordHash` nunca debe guardar texto plano.
- `isAdmin` habilita acciones administrativas mínimas.
- `active = false` bloquea login y operación normal.

### `Team`
Campos actuales:

- `id`
- `name`
- `code`
- `groupName`

### `Match`
Campos actuales:

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

### `Prediction`
Campos actuales:

- `id`
- `participantId`
- `matchId`
- `homeScore`
- `awayScore`
- `advancesTeamName`
- `createdAt`
- `updatedAt`

Restricción principal:

- único por `(participantId, matchId)`.

### `MatchResult`
Campos actuales:

- `id`
- `matchId`
- `homeScore`
- `awayScore`
- `advancesTeamName`
- `createdByParticipantId` nullable
- `updatedByParticipantId` nullable
- `createdAt`
- `updatedAt`

Relaciones:

- `createdByParticipantId` referencia a `Participant` con `onDelete: SetNull`.
- `updatedByParticipantId` referencia a `Participant` con `onDelete: SetNull`.

Notas:

- no existe `status` en `MatchResult`;
- la presencia o ausencia de fila sigue siendo el estado funcional del resultado;
- los campos de trazabilidad son opcionales para no romper datos históricos.

---

## 5. Estado de Autenticación y Sesiones

La autenticación simple ya está implementada y es server-side.

### Login
- `authenticateParticipant` acepta nombre o slug.
- valida password con hash.
- rechaza usuarios inactivos.
- no diferencia entre usuario inexistente y password incorrecta en el mensaje visible.

### Sesión
- se usa una cookie firmada `httpOnly`;
- el nombre de la cookie es `pronosticos_session`;
- la sesión expira por tiempo;
- `SESSION_SECRET` es obligatorio en producción;
- la identidad actual se resuelve server-side con `getCurrentParticipant`.

### Guards
- `requireParticipant` redirige a `/login` sin sesión;
- `requireAdmin` redirige a la pantalla del participante si el usuario no es admin;
- las acciones sensibles no deben depender de ids enviados desde el cliente.

### Cambio de contraseña
- la pantalla `/account/password` pide contraseña actual, nueva contraseña y confirmación;
- `changeParticipantPassword` valida todo server-side;
- la nueva contraseña se guarda como hash;
- no hay recuperación por email ni links mágicos;
- no se fuerza cambio de contraseña al primer login en este estado del proyecto.

---

## 6. Estado de Administración de Participantes

La administración simple de participantes ya está completa en funcionalidad básica.

### Qué permite hoy
- crear un nuevo participante con contraseña inicial;
- activar y desactivar participantes existentes;
- cambiar la contraseña de otro participante desde admin;
- mantener la protección de no desactivar el último admin activo.

### Cómo se resuelve
- la página `/admin/participants` usa `requireAdmin`;
- las actions de activación/desactivación/cambio de password también validan `requireAdmin` server-side;
- los botones por fila son simples y pensados para mobile;
- la UI muestra badges para `Admin`, `Participante`, `Activo`, `Inactivo` y estado de contraseña.

### Reglas importantes ya cubiertas
- no se eliminan participantes físicamente;
- se usa `active = false`;
- no se puede dejar el sistema sin admin activo;
- el cambio de password guarda hash, no texto plano;
- no se permite manipular ids de usuario vía form como fuente de verdad.

### Estado UX
La pantalla es funcional y simple, pero todavía tiene margen para pulido fino: el enfoque actual privilegia claridad y bajo riesgo por sobre densidad de acciones.

---

## 7. Estado de Resultados Manuales

La administración manual de resultados ya está integrada con auth/admin.

### Qué hace hoy `/admin/results`
- solo admins pueden entrar;
- muestra partidos agrupados por día;
- muestra resultado actual si existe;
- permite crear o editar resultados;
- mantiene visible la fecha/hora del partido;
- mantiene la advertencia de que el resultado impacta la tabla de puntos.

### Qué hace `upsertMatchResultAction`
- valida `requireAdmin` server-side;
- llama al helper de dominio `upsertAdminMatchResult`;
- revalida la ruta `/admin/results` y el layout raíz cuando guarda con éxito;
- no acepta ids de usuario desde el formulario.

### UX actual
Para partidos futuros no se muestra el formulario editable. Se reemplaza por el mensaje:

> Este partido todavía no empezó. El formulario se habilita al inicio.

Eso mantiene la pantalla simple y evita el falso incentivo de editar antes de tiempo.

---

## 8. Regla de Bloqueo de Resultados Futuros

La regla ya está implementada server-side y usa el kickoff como barrera real.

### Regla
- si `now < kickoffAt`, no se puede crear ni editar resultado;
- en el kickoff exacto sí se permite guardar;
- después del kickoff también;
- la UI puede ocultar o deshabilitar el formulario, pero no es la barrera real.

### Implementación actual
- el helper `isMatchLocked(kickoffAt, now)` devuelve true cuando `kickoffAt <= now`;
- `upsertAdminMatchResult` usa esa regla antes de crear o editar;
- `app/admin/results/page.tsx` oculta el formulario mientras el partido no está iniciado.

### Resultado práctico
La aplicación no depende del reloj del navegador para esta regla. La validación crítica queda del lado servidor.

---

## 9. Trazabilidad de Resultados

La trazabilidad mínima ya está implementada y visible.

### Al crear un resultado
- `createdByParticipantId = admin actual`;
- `updatedByParticipantId = admin actual`.

### Al editar un resultado
- se conserva `createdByParticipantId`;
- se actualiza `updatedByParticipantId = admin actual`.

### Cómo se muestra
El read model expone `createdByParticipantName` y `updatedByParticipantName`. La UI muestra trazabilidad de forma secundaria y discreta cerca del resultado.

Comportamientos visibles:
- si creador y editor son la misma persona: `Agregado por Ramiro`;
- si son distintos: `Agregado por Ramiro · editado por Pedro`;
- si no hay trazabilidad histórica en un resultado viejo: no rompe la UI y simplemente no muestra la línea.

### Qué no hace todavía
- no hay auditoría histórica completa;
- no hay tabla de logs;
- no hay timestamps visibles extensos;
- no hay UI de historial de cambios.

---

## 10. Estado de UX/UI y Wording

Se aplicó un patch de wording y micro-jerarquía visual de bajo riesgo.

### Cambios ya presentes
- se eliminó el botón redundante `Mi pantalla` en la pantalla del participante;
- `Contraseña` pasó a `Cambiar contraseña`;
- `No pronosticó` pasó a `Sin pronóstico`;
- `Jugador` pasó a `Participante` en la tabla de puntos;
- `Ganador o empate` pasó a `Signo acertado`;
- `Resultados exactos` pasó a `Pronósticos exactos`;
- `Abierto` pasó a `Disponible`;
- login tiene placeholder `Ej: Ramiro`;
- en eliminación directa, el label del clasificado es más claro;
- el botón de `result-form` usa una altura táctil más cómoda;
- `/admin/results` usa el copy más claro para partidos futuros y para el estado sin resultado.

### Micro-jerarquía visual ya aplicada
- badges diferenciados para estado y rol en `/admin/participants`;
- badge de estado diferenciado en la pantalla del participante;
- texto de `Tu pronóstico` con énfasis suave si está vacío;
- botón condicional en las tarjetas de partido según estado.

### Observación general
La app ya quedó bastante más consistente para usuarios no técnicos o mayores. El siguiente paso de UX debería ser refinamiento incremental, no rediseño.

---

## 11. Tests Existentes Relevantes

### Auth
- `lib/auth.test.ts`
  - hash y verificación de password;
  - login correcto;
  - password incorrecta;
  - usuario inexistente;
  - usuario inactivo;
  - `requireParticipant` y `requireAdmin` con y sin sesión;
  - cambio de contraseña.

### Admin participantes
- `lib/admin-participants.test.ts`
  - creación de usuario con password hasheada;
  - rechazo por nombre duplicado;
  - rechazo por password corta;
  - desactivar participante normal;
  - activar participante inactivo;
  - rechazo al desactivar el último admin;
  - cambio de contraseña de otro participante;
  - login con contraseña nueva y rechazo de la vieja.
- `app/admin/participants/actions.test.ts`
  - auth de las acciones;
  - activación;
  - desactivación;
  - cambio de contraseña.

### Admin resultados
- `lib/admin-results.test.ts`
  - guarda resultado para partido iniciado;
  - rechaza partido futuro;
  - permite guardar en kickoff exacto;
  - preserva creador al editar y actualiza editor.
- `app/admin/results/actions.test.ts`
  - auth de la action;
  - ejecución correcta para admin.
- `app/admin/results/page.test.ts`
  - protección de la página;
  - acceso para admin.

### Read models y presentación
- `lib/read-models.test.ts`
  - bloqueo por kickoff;
  - reveal antes y después del kickoff;
  - estado en boundary exacto;
  - trazabilidad en read model de admin/results;
  - cálculo de tabla y scoring.
- `lib/presentation.test.ts`
  - formato de nombre;
  - formato de trazabilidad (`Agregado por...`).

### Pronósticos
- `app/p/[participantId]/actions.test.ts`
  - no permite guardar pronósticos como otro participante.
- `lib/scoring.test.ts`
  - cobertura de reglas de scoring de grupos y eliminatorias.

---

## 12. Variables de Entorno Necesarias

### Requeridas
- `DATABASE_URL`
- `DIRECT_DATABASE_URL` recomendada para migraciones
- `SESSION_SECRET`

### Opcionales para seed inicial
- `RAMIRO_INITIAL_PASSWORD`
- `PEDRO_INITIAL_PASSWORD`

### Alias soportados en Vercel/Neon
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL`
- `DATABASE_URL_UNPOOLED`
- `POSTGRES_URL_NON_POOLING`

---

## 13. Riesgos y Deuda Técnica Actual

### Riesgos bajos pero reales
- la administración de participantes todavía es simple y sin histórico de acciones;
- la trazabilidad de resultados cubre creador/editor, pero no registra timestamps visibles ni auditoría completa;
- la experiencia depende bastante de textos cuidadosos porque el producto está pensado para uso familiar y usuarios mayores;
- el botón/tabla y formularios siguen siendo sensibles a cambios de copy porque los tests cubren comportamiento, no toda la UX.

### Deuda técnica aceptada
- no existe sistema de roles complejo;
- no hay tabla de sesiones persistidas;
- no hay recuperación de contraseña por email;
- no hay `MatchResult.status`;
- no hay persistencia de puntajes agregados;
- no hay auditoría histórica completa;
- la app mantiene rutas con `participantId` en vez de una abstracción tipo `/me`.

### Riesgo operacional
El seed y el esquema están orientados a mantener integridad y no destruir datos. Hay que seguir evitando migraciones destructivas y reseed en producción sin intención explícita.

---

## 14. Próximos Pasos Recomendados

Ordenados por prioridad:

1. Refinar la administración de participantes si hace falta volverla más cómoda, por ejemplo con acciones inline más explícitas o confirmaciones suaves si el equipo familiar lo pide.
2. Seguir puliendo `/admin/results` con pequeños ajustes de lectura, sin tocar la regla ni la trazabilidad ya existente.
3. Evaluar si conviene simplificar todavía más la pantalla de standings en mobile, pero solo si se ve un problema real de lectura.
4. Si se necesita más control familiar, considerar una sesión persistida/revocable, pero solo si aparece un caso de uso claro.
5. Mantener el contrato actual de UX y wording como base estable antes de introducir nuevos cambios de producto.

---

## 15. Qué No Conviene Tocar Por Ahora

- no tocar scoring;
- no tocar fixture;
- no tocar seed;
- no agregar `MatchResult.status`;
- no rehacer `/admin/results`;
- no agregar auditoría histórica completa;
- no agregar OAuth, passkeys, 2FA o recuperación por email;
- no cambiar rutas sin una razón funcional clara;
- no meter dependencias UI pesadas;
- no rediseñar la app; el foco ya es iterar sobre lo existente.

---

## 16. Validación Reciente

En el estado actual del repo, las validaciones pasan:

- `npm run prisma:validate`
- `npm run lint`
- `npm run test`
- `npx tsc --noEmit`
- `npm run build`

---

## 17. Cierre

El proyecto ya está en una fase buena para iterar por refinamiento. La base funcional está cerrada y protegida, y el próximo valor está más en pulido de experiencia, consistencia de textos y pequeñas mejoras operativas que en cambios de arquitectura.
