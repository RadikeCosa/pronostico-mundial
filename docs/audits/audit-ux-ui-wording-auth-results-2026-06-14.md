# Audit UX/UI y Wording — Pronósticos Mundial 2026

**Fecha:** 2026-06-14  
**Scope:** UX, wording y jerarquía visual. Sin cambios funcionales.  
**Objetivo:** Detectar mejoras concretas para que la app sea más clara, más fácil y más segura de usar en contexto familiar, especialmente para usuarios no técnicos o mayores.

---

## 1. Resumen ejecutivo

La app está en buen estado funcional. La estructura de páginas es lógica, el flujo de autenticación ya existe y las reglas de bloqueo/reveal están correctamente implementadas. No hay P0 que impida el uso normal.

Los problemas detectados son principalmente de wording inconsistente, jerarquía visual mejorable en listas de partidos, y algunos detalles de navegación que pueden confundir a usuarios poco técnicos. También hay una brecha funcional importante en `/admin/participants`: la tabla de usuarios es de solo lectura y no ofrece acciones de activar/desactivar ni cambio de contraseña por parte del admin, lo que limita la administración real.

El plan propuesto prioriza mejoras de wording sin tocar lógica (patch 1), luego jerarquía visual en listas de partidos (patch 2), y después mejoras incrementales de UX en flujos de admin y account.

---

## 2. Hallazgos priorizados

### P1 — Confusiones importantes

#### P1-A: Botón "Mi pantalla" está en la pantalla que ya es del participante

**Archivo:** `app/p/[participantId]/page.tsx`, línea del bloque de botones del header  
**Descripción:** El header de la pantalla del participante incluye un botón "Mi pantalla" que enlaza a `/p/${participantId}`, que es exactamente la URL actual. Para el usuario es un link que no hace nada, y puede generar confusión ("¿esto me lleva a otro lado? ¿Estoy en el lugar correcto?").  
**Recomendación:** Eliminar el botón "Mi pantalla" del header de la pantalla del participante. No aporta información ni navegación. Si se quiere mantener un anchor al home del participante en otras páginas (ej. admin), usar etiqueta diferente como "Mis partidos".

---

#### P1-B: Botón "Contraseña" en el header es demasiado ambiguo

**Archivo:** `app/p/[participantId]/page.tsx`  
**Texto actual:** `Contraseña`  
**Problema:** Un botón que solo dice "Contraseña" no comunica la acción. Un usuario mayor puede dudar si sirve para ver la contraseña, cambiarla, o configurarla.  
**Texto propuesto:** `Cambiar contraseña`

---

#### P1-C: Inconsistencia en el texto de "sin pronóstico"

**Archivos involucrados:**  
- `lib/presentation.ts` → `formatPredictionSummary` retorna `"Sin pronóstico"` para `null`  
- `app/p/[participantId]/matches/[matchId]/page.tsx` → para `status === "missing"` muestra `"No pronosticó"`

**Problema:** Dos textos distintos para el mismo estado en distintas pantallas. En la lista de partidos (`page.tsx` del participante) se mostrará "Tu pronóstico: Sin pronóstico" (desde `formatPredictionSummary`), mientras que en el detalle del partido, los pronósticos ajenos muestran "No pronosticó". Esto genera inconsistencia perceptible al usuario.  
**Recomendación:** Unificar. Propuesta: usar `"Sin pronóstico"` en todos los contextos, ya que es más natural en español rioplatense que "No pronosticó".  
- `lib/presentation.ts`: mantener `"Sin pronóstico"` (ya correcto)  
- `app/p/[participantId]/matches/[matchId]/page.tsx`: cambiar `"No pronosticó"` → `"Sin pronóstico"`

---

#### P1-D: Cabecera de columna "Ganador o empate" en la tabla de puntos es ambigua

**Archivo:** `app/p/[participantId]/page.tsx` (tabla standings)  
**Texto actual:** `Ganador o empate`  
**Problema:** Parece que la columna cuenta solo partidos donde hubo empate o el equipo local ganó. En realidad cuenta el signo acertado (local gana / empate / visitante gana = 1 punto). No está claro para alguien que no leyó las reglas.  
**Texto propuesto:** `Signo acertado`  
**Nota:** El término "signo" puede no ser familiar para todos. Alternativa más explícita: `Resultado correcto (1 pt)`. Elegir según el nivel de conocimiento de los participantes.

---

#### P1-E: "Ver detalle" no comunica si hay acción pendiente

**Archivo:** `app/p/[participantId]/page.tsx`  
**Texto actual:** siempre `Ver detalle` para todos los partidos  
**Problema:** Un partido que todavía no tiene pronóstico y está desbloqueado debería llamar más la atención. "Ver detalle" es igual de neutro para un partido pendiente de pronosticar y para uno ya bloqueado con resultado.  
**Recomendación:** Diferenciar el label del botón según el estado:

| Estado | Botón sugerido |
|---|---|
| Abierto, sin pronóstico propio | `Cargar pronóstico` |
| Abierto, con pronóstico propio | `Editar pronóstico` |
| Bloqueado | `Ver pronósticos` |
| Con resultado | `Ver resultado` |

Esto requiere pasar info de estado al componente de la tarjeta. Es un cambio pequeño pero de alto impacto para usuarios mayores.

---

#### P1-F: El formulario de admin de participantes no tiene acciones sobre usuarios existentes

**Archivo:** `app/admin/participants/page.tsx`  
**Descripción:** La tabla de usuarios es de solo lectura. No hay forma de desactivar, reactivar, cambiar contraseña ni revocar admin desde la UI. Solo se puede crear un usuario nuevo.  
**Riesgo funcional:** Si un participante olvida su contraseña, no hay forma de resetearla desde la app. Si un usuario ya no participa, no hay forma de desactivarlo.  
**Recomendación para patch futuro:** Agregar acciones inline por fila: botón "Desactivar" / "Activar", y opcionalmente "Resetear contraseña". Ver sección de plan de implementación.

---

#### P1-G: Label de campo en el formulario de pronóstico para eliminación directa es demasiado largo

**Archivo:** `components/prediction-form.tsx`  
**Texto actual:** `Quién clasifica si termina empatado`  
**Problema:** Para usuarios mayores con teléfono chico, este label ocupa mucho espacio y puede no leerse completo. Además la frase puede confundir: ¿siempre hay que elegir un clasificado, o solo si empata?  
**Texto propuesto:** `¿Quién clasifica?` seguido de un subtexto pequeño: `(obligatorio si el partido puede terminar empatado en goles)`  
O más simple: `Equipo que clasifica` con un hint inline `Solo si hay empate en goles`.

---

### P2 — Mejoras menores

#### P2-A: "Ingresar" como título del login puede sonar técnico

**Archivo:** `app/login/page.tsx`  
**Texto actual:** `h1: "Ingresar"`  
**Alternativa más coloquial:** `"Entrar"` o `"Acceder"`  
**Nivel de impacto:** Bajo. "Ingresar" es perfectamente comprensible. Solo es un tono levemente más formal.

---

#### P2-B: El campo "Nombre" del login no tiene placeholder

**Archivo:** `components/login-form.tsx`  
**Descripción:** El campo de nombre no tiene placeholder. Para un usuario mayor que no recuerda cuál es "su nombre en la app" (Ramiro, ramiro, RAMIRO...) puede ser un freno.  
**Recomendación:** Agregar `placeholder="Ej: Ramiro"` en el input de nombre. La búsqueda ya es case-insensitive server-side, pero el placeholder da tranquilidad.

---

#### P2-C: "Disponible desde el inicio del partido" en resultados no explica cuándo

**Archivo:** `app/admin/results/page.tsx`  
**Texto actual:** `Disponible desde el inicio del partido.`  
**Problema:** El admin ve este mensaje pero no sabe a qué hora exacta se habilitará el formulario sin mirar la hora del partido (que está visible en la misma tarjeta, sí, pero en otro lugar visual).  
**Texto propuesto:** `Este partido todavía no empezó. El formulario se habilita desde el inicio.`  
O incluir la hora: `Disponible desde las [hora]. El partido todavía no empezó.` (requeriría pasar la hora al componente de placeholder, lo cual es un cambio simple).

---

#### P2-D: "Sin cargar" como estado de resultado es poco descriptivo

**Archivo:** `app/admin/results/page.tsx`  
**Texto actual:** `Resultado actual: Sin cargar`  
**Texto propuesto:** `Resultado actual: Sin resultado` o simplemente `Resultado: —`  
**Razón:** "Sin cargar" suena técnico (como un estado de upload). "Sin resultado" es más natural.

---

#### P2-E: Columna "Partidos puntuados" en la tabla es redundante visualmente

**Archivo:** `app/p/[participantId]/page.tsx`  
**Descripción:** La tabla de standings tiene: Promedio / Puntos / Partidos puntuados / Resultados exactos / Ganador o empate / Partidos pronosticados / Sin pronóstico. Son 7 columnas. En mobile hace scroll horizontal, lo cual es aceptable, pero la columna "Partidos puntuados" es en la práctica casi idéntica a tener resultado cargado. Puede confundir.  
**Recomendación P2:** No remover por ahora (cambio de lógica de read model), pero documentar para una futura simplificación.

---

#### P2-F: "Resultado exacto" como label de columna podría confundirse con el resultado del partido

**Archivo:** `app/p/[participantId]/page.tsx`  
**Texto actual header:** `Resultados exactos`  
**Confusión posible:** "¿Resultados exactos cargados o pronósticos exactos?"  
**Texto propuesto:** `Pronósticos exactos` para aclarar que se trata de pronósticos que acertaron el marcador exacto.

---

#### P2-G: "Jugador" en la tabla de puntos vs "Participante" en el resto de la app

**Archivo:** `app/p/[participantId]/page.tsx`  
**Texto actual header tabla:** `Jugador`  
**Resto de la app usa:** "Participante", "participante activo", etc.  
**Recomendación:** Unificar a `Participante` en la cabecera de la tabla.

---

#### P2-H: El bloque "Peor pronóstico" puede ser desmotivador para usuarios mayores

**Archivo:** `app/p/[participantId]/page.tsx`  
**Descripción:** La card "Peor pronóstico" en la sección de standings muestra el pronóstico con mayor diferencia respecto al resultado real. Es una pieza divertida pero puede ser percibida negativamente.  
**Recomendación:** Sin cambios urgentes. Si el espíritu familiar lo acepta, mantenerla. Alternativa de wording: `Predicción más lejana` (más neutral).

---

#### P2-I: Estado de partido "Abierto" puede malinterpretarse

**Archivo:** `lib/presentation.ts` → `getMatchStatusLabel`  
**Texto actual:** `"Abierto"`  
**Posible confusión:** En contexto de apuestas, "abierto" puede sonar a "mercado abierto". Para uso familiar la interpretación natural es "todavía se puede cargar pronóstico".  
**Texto propuesto:** `"Pendiente"` o `"Disponible"` para partidos sin bloquear.  
**Impacto:** Bajo riesgo, cambio en una función.

---

#### P2-J: El texto de éxito al guardar pronóstico no confirma el pronóstico guardado

**Archivos:** `app/p/[participantId]/actions.ts` (lo que retorna), `components/prediction-form.tsx`  
**Descripción:** Cuando se guarda un pronóstico exitosamente, el formulario hace `router.refresh()` sin mostrar un mensaje de confirmación explícito antes del refresh. No se pudo ver el mensaje de éxito que retorna la action en el estado, pero el `router.refresh()` re-renderiza la página, por lo que el mensaje puede no mostrarse.  
**Recomendación:** Verificar que el mensaje de éxito sea visible antes de que se ejecute el refresh (al menos por 1-2 segundos), o confirmar visualmente el nuevo estado (el campo "Tu pronóstico" en la tarjeta ya se actualiza con el valor guardado, lo cual es suficiente confirmación visual).

---

#### P2-K: La pantalla de cambio de contraseña usa "Repetir nueva contraseña" como label

**Archivo:** `components/password-change-form.tsx`  
**Texto actual:** `Repetir nueva contraseña`  
**Alternativa más coloquial:** `Confirmá la contraseña nueva` o `Confirmación`  
**Nivel de impacto:** Mínimo. El texto actual es claro y estándar.

---

#### P2-L: La sección "Goles del Mundial" en standings muestra "Promedio" sin contexto

**Archivo:** `app/p/[participantId]/page.tsx`  
**Texto actual:** label `Promedio` bajo la card de estadísticas  
**Alternativa:** `Prom. x partido` para que quede explícito que es el promedio de goles por partido.

---

#### P2-M: "Clasifica" como label en el result-form es demasiado corto

**Archivo:** `components/result-form.tsx`  
**Texto actual:** `Clasifica`  
**Texto propuesto:** `Equipo que clasifica` (consistente con el prediction-form, aunque este sea para admin)

---

#### P2-N: El form de creación de participante legacy (`ParticipantCreateForm`) podría confundir

**Archivo:** `components/participant-create-form.tsx`  
**Descripción:** Tiene un texto que dice "Nuevo participante activo por defecto, sin login ni contraseña." Este componente parece ser legado (era la forma de crear participantes antes de la autenticación). Si sigue expuesto en alguna ruta, puede confundir a un admin que crea un usuario sin contraseña (ese usuario no podrá ingresar).  
**Recomendación:** Verificar si este componente sigue en uso en alguna ruta accesible. Si no, podría eliminarse en un patch futuro. Si sigue siendo accesible a admins, actualizar el texto para reflejar que el usuario sin contraseña no puede iniciar sesión.

---

## 3. Recomendaciones de wording concretas

| Ubicación | Texto actual | Texto propuesto | Prioridad |
|---|---|---|---|
| Header pantalla participante | `Mi pantalla` (botón) | Eliminar | P1 |
| Header pantalla participante | `Contraseña` (botón) | `Cambiar contraseña` | P1 |
| Detalle de partido — pronósticos ajenos | `No pronosticó` | `Sin pronóstico` | P1 |
| Tabla de puntos — cabecera columna | `Ganador o empate` | `Signo acertado` | P1 |
| Tabla de puntos — cabecera columna | `Resultados exactos` | `Pronósticos exactos` | P2 |
| Tabla de puntos — cabecera columna | `Jugador` | `Participante` | P2 |
| Tarjeta de partido en lista | `Ver detalle` | Condicional según estado (ver P1-E) | P1 |
| Admin resultados — partidos futuros | `Disponible desde el inicio del partido.` | `Este partido todavía no empezó. El formulario se habilita al inicio.` | P2 |
| Admin resultados — sin resultado | `Resultado actual: Sin cargar` | `Resultado: Sin cargar aún` o `Resultado: —` | P2 |
| Formulario pronóstico eliminación directa | `Quién clasifica si termina empatado` | `¿Quién clasifica?` + hint secundario `Solo si hay empate en goles` | P1 |
| Formulario resultado — eliminación directa | `Clasifica` | `Equipo que clasifica` | P2 |
| Login — campo | `Nombre` (sin placeholder) | Agregar `placeholder="Ej: Ramiro"` | P2 |
| Estado de partido | `Abierto` | `Disponible` o `Pendiente` | P2 |
| Cambio de contraseña — campo | `Repetir nueva contraseña` | `Confirmá la contraseña nueva` | P2 |
| Estadísticas goles — label | `Promedio` | `Prom. x partido` | P2 |
| Peor pronóstico — título card | `Peor pronóstico` | `Predicción más lejana` (opcional, si se quiere más neutral) | P2 |
| Mensaje éxito login | `Ingresando...` (estado pending) | Ya está bien | — |

---

## 4. Recomendaciones visuales concretas y limitadas

### 4.1 Indicador de estado con color en tarjetas de partido

**Archivo:** `app/p/[participantId]/page.tsx`  
**Estado actual:** El badge de estado (Abierto/Bloqueado/Con resultado) usa siempre `bg-zinc-100 text-zinc-700`. No hay diferenciación cromática.  
**Propuesta:** Diferenciar el badge por estado:

| Estado | Clases sugeridas |
|---|---|
| Disponible/Pendiente (sin pronóstico) | `bg-amber-100 text-amber-800` |
| Disponible (con pronóstico cargado) | `bg-emerald-100 text-emerald-800` |
| Bloqueado | `bg-zinc-100 text-zinc-500` |
| Con resultado | `bg-sky-100 text-sky-800` |

Esto da información visual sin tocar lógica de scoring ni read models. Solo cambia las clases CSS condicionadas al estado.

---

### 4.2 Diferenciar pronóstico pendiente de pronóstico cargado en la lista de partidos

**Archivo:** `app/p/[participantId]/page.tsx`  
**Estado actual:** La línea "Tu pronóstico: Sin pronóstico" aparece igual que "Tu pronóstico: 2 - 1".  
**Propuesta:** Usar color diferente para el caso sin pronóstico:
- Con pronóstico: texto normal `text-zinc-700`
- Sin pronóstico: texto de alerta suave `text-amber-700 font-medium` o similar, para que sea más notorio sin ser alarmante.

---

### 4.3 Tamaño mínimo de botones en mobile (accesibilidad)

**Archivos:** `components/prediction-form.tsx`, `components/result-form.tsx`, `components/login-form.tsx`  
**Estado actual:** El botón del formulario de pronóstico usa `py-3` (razonable), pero el botón del result-form usa `py-2` que puede ser pequeño en pantallas táctiles para usuarios mayores.  
**Propuesta:** Asegurarse de que todos los botones de acción principal usen al menos `min-h-[44px]` o `py-3` para alcanzar 44px de altura táctil (guideline de accesibilidad móvil).

---

### 4.4 Separación visual entre "Tu pronóstico" y el formulario en el detalle del partido

**Archivo:** `app/p/[participantId]/matches/[matchId]/page.tsx`  
**Estado actual:** Hay una sección separada que muestra el pronóstico actual ("Tu pronóstico") y luego el formulario para editar. Son dos cards adyacentes.  
**Propuesta:** Cuando hay pronóstico cargado, el primer card podría mostrar el pronóstico con un badge "Guardado" o un check visual suave, para que el usuario confirme visualmente que su pronóstico ya fue registrado antes de intentar editarlo.

---

### 4.5 Tabla de standings — mejorar legibilidad en mobile

**Archivo:** `app/p/[participantId]/page.tsx`  
**Estado actual:** La tabla tiene 7 columnas con scroll horizontal. En mobile puede ser difícil de leer.  
**Propuesta no disruptiva:** Las columnas numéricas (`Puntos`, `Promedio`) deberían ser las primeras después del nombre. El orden actual empieza con `Jugador / Promedio / Puntos / ...` que es correcto. No cambiar orden, pero considerar en un futuro condensar en una vista de tarjetas para mobile (fuera del alcance de este patch).

---

### 4.6 Admin — tabla de usuarios sin acciones (feedback visual)

**Archivo:** `app/admin/participants/page.tsx`  
**Estado actual:** La columna "Estado" muestra "Activo" o "Inactivo" como texto plano.  
**Propuesta mínima (sin acciones todavía):** Usar un badge con color:
- `Activo` → `bg-emerald-100 text-emerald-700`
- `Inactivo` → `bg-zinc-100 text-zinc-500`
- `Administrador` → badge adicional `bg-amber-100 text-amber-700`

Esto no agrega funcionalidad pero mejora la scanability de la tabla.

---

### 4.7 Trazabilidad de resultados — jerarquía visual correcta

**Archivos:** `app/admin/results/page.tsx`, `lib/presentation.ts`  
**Estado actual:** El texto de auditoría (`Agregado por Ramiro`) ya usa `text-xs text-zinc-500`, que es el nivel correcto.  
**Verificar:** Que este texto no compita visualmente con el marcador. Actualmente está en la sección izquierda de la tarjeta, debajo del "Resultado actual". Posición correcta. No requiere cambio.  
**Oportunidad:** Cuando no hay trazabilidad (resultado cargado sin `createdByParticipantId`), no se muestra nada. Esto es correcto.

---

## 5. Plan de implementación por patches

### Patch 1 — Wording sin tocar lógica

**Objetivo:** Corregir textos confusos sin modificar funcionalidad, tests ni lógica.  
**Prioridad:** Alta. Bajo riesgo.

**Archivos a tocar:**
- `app/p/[participantId]/page.tsx` — eliminar botón "Mi pantalla", cambiar "Contraseña" → "Cambiar contraseña", "Jugador" → "Participante" en tabla, "Ganador o empate" → "Signo acertado", "Resultados exactos" → "Pronósticos exactos"
- `app/p/[participantId]/matches/[matchId]/page.tsx` — cambiar "No pronosticó" → "Sin pronóstico"
- `components/login-form.tsx` — agregar `placeholder="Ej: Ramiro"` al campo nombre
- `components/result-form.tsx` — cambiar label "Clasifica" → "Equipo que clasifica"
- `components/prediction-form.tsx` — cambiar label "Quién clasifica si termina empatado" → "¿Quién clasifica?" con hint secundario
- `lib/presentation.ts` → `getMatchStatusLabel` — cambiar `"Abierto"` → `"Disponible"`
- `app/admin/results/page.tsx` — cambiar texto de partidos futuros y "Sin cargar"

**Cambios fuera de alcance:** Lógica de scoring, modelos de datos, rutas, tests.

**Tests sugeridos:** Revisar `lib/presentation.test.ts` — si hay test que espera el string `"Abierto"`, actualizar el test al nuevo string. Mismo para `"No pronosticó"` si existe en algún test.

**Riesgo:** Muy bajo. Solo strings. Único riesgo: snapshots de tests que comparen strings exactos.

**Criterio de aceptación:**
- Todos los textos listados fueron actualizados.
- `npm run lint` sin errores.
- `npm run test` pasa.
- `npx tsc --noEmit` sin errores.

---

### Patch 2 — Indicadores visuales de estado en tarjetas de partidos

**Objetivo:** Diferenciar cromáticamente el estado del partido en las tarjetas de la pantalla principal. Hacer más visible la ausencia de pronóstico.

**Archivos a tocar:**
- `app/p/[participantId]/page.tsx` — condicionar clases del badge de estado según `match.isLocked`, `match.hasResult`, y `match.currentPrediction !== null`
- Mismo archivo — condicionar color del texto "Tu pronóstico" cuando es null

**Cambios fuera de alcance:** Lógica de read models, scoring, rutas.

**Tests sugeridos:** Ninguno específico para este patch (visual only).

**Riesgo:** Bajo. Solo clases CSS condicionales. No afecta lógica.

**Criterio de aceptación:**
- Partidos sin pronóstico y desbloqueados se destacan visualmente.
- Partidos con resultado tienen badge diferente al de bloqueados.
- No hay regresión visual en otros estados.

---

### Patch 3 — Botón condicional en tarjetas de partido

**Objetivo:** Cambiar el label del botón "Ver detalle" según el estado del partido.

**Archivos a tocar:**
- `app/p/[participantId]/page.tsx` — lógica condicional para el label del botón de cada tarjeta

**Lógica sugerida:**
```
si !match.isLocked && !match.currentPrediction → "Cargar pronóstico"
si !match.isLocked && match.currentPrediction → "Editar pronóstico"
si match.hasResult → "Ver resultado"
si match.isLocked && !match.hasResult → "Ver pronósticos"
```

**Cambios fuera de alcance:** Lógica de read models, routing.

**Tests sugeridos:** Test unitario de la función de label (si se extrae como función pura).

**Riesgo:** Bajo. El botón ya navega correctamente; solo cambia el texto.

**Criterio de aceptación:**
- El texto del botón cambia según el estado real del partido.
- En todos los casos el botón navega a la misma URL de detalle.

---

### Patch 4 — UX de login y cambio de contraseña

**Objetivo:** Ajustes mínimos de UX en las páginas de autenticación.

**Archivos a tocar:**
- `components/login-form.tsx` — placeholder en campo nombre (ya mencionado en Patch 1, puede combinarse)
- `app/login/page.tsx` — evaluar si cambiar "Ingresar" → "Entrar" (opcional, decisión de tono)
- `components/password-change-form.tsx` — cambiar "Repetir nueva contraseña" → "Confirmá la contraseña nueva" (opcional)
- `app/account/password/page.tsx` — considerar agregar una pequeña nota sobre el mínimo de caracteres bajo el campo "Nueva contraseña" para no sorprender al usuario: `Mínimo 4 caracteres.`

**Cambios fuera de alcance:** Lógica de autenticación, hashing, sesión.

**Tests sugeridos:** Test de `changeParticipantPassword` ya debería cubrir validaciones (existe en `lib/auth/change-password.ts`). No requiere nuevos tests para el wording.

**Riesgo:** Muy bajo.

**Criterio de aceptación:**
- El formulario de cambio de contraseña informa el mínimo de caracteres.
- El campo de nombre en login tiene placeholder orientativo.

---

### Patch 5 — Acciones sobre usuarios existentes en `/admin/participants`

**Objetivo:** Agregar acciones inline en la tabla de participantes: activar/desactivar, y opcionalmente resetear contraseña como admin.

**Archivos a tocar:**
- `app/admin/participants/page.tsx` — agregar botones por fila
- `app/admin/participants/actions.ts` — nuevas server actions: `deactivateParticipantAction`, `activateParticipantAction`, `resetParticipantPasswordAction`
- `lib/admin-participants.ts` — funciones de dominio correspondientes
- `lib/admin-participants.test.ts` — tests de las nuevas funciones

**Restricciones de negocio:**
- No se puede desactivar al único admin activo.
- No se puede desactivar o cambiar contraseña del participante autenticado desde esta pantalla (o si se permite, debe advertirse).
- El reset de contraseña debe generar una contraseña temporal y mostrarla una vez (o pedir al admin que ingrese una nueva contraseña para ese usuario).

**Cambios fuera de alcance:** Sistema de email, recuperación automática, roles complejos.

**Tests sugeridos:**
- No se puede desactivar el único admin activo.
- Se puede desactivar un participante normal.
- Se puede reactivar un participante inactivo.
- Reset de contraseña actualiza el hash.

**Riesgo:** Medio. Involucra server actions nuevas y lógica de negocio (guard del último admin).

**Criterio de aceptación:**
- Se puede activar/desactivar usuarios.
- No se puede desactivar el último admin activo (error claro, no silencioso).
- Se puede resetear contraseña de otro usuario.

---

### Patch 6 — Indicadores visuales en `/admin/participants`

**Objetivo:** Agregar badges de color para estado (activo/inactivo) y tipo (admin/participante) en la tabla, sin funcionalidad nueva.

**Archivos a tocar:**
- `app/admin/participants/page.tsx` — clases condicionales para celdas de estado y tipo

**Cambios fuera de alcance:** Acciones, lógica.

**Tests sugeridos:** Ninguno (visual only).

**Riesgo:** Mínimo.

**Criterio de aceptación:**
- Admins tienen badge diferente a participantes normales.
- Usuarios inactivos son visualmente distinguibles.

---

### Patch 7 — UX de partidos futuros en `/admin/results`

**Objetivo:** Mejorar el mensaje para partidos que aún no empezaron, opcionalmente mostrando la hora de habilitación.

**Archivos a tocar:**
- `app/admin/results/page.tsx` — texto del placeholder de partidos no iniciados; opcionalmente pasar `match.kickoffAt` al componente de placeholder para mostrar la hora

**Cambios fuera de alcance:** Lógica de bloqueo, formulario de resultado.

**Tests sugeridos:** Ninguno (wording only).

**Riesgo:** Mínimo.

**Criterio de aceptación:**
- El mensaje para partidos futuros comunica claramente cuándo se habilitará.
- No hay regresión en partidos iniciados.

---

### Patch 8 — Confirmación visual de pronóstico guardado

**Objetivo:** Asegurar que el usuario recibe feedback positivo claro al guardar un pronóstico, incluso con el `router.refresh()`.

**Archivos a tocar:**
- `components/prediction-form.tsx` — revisar si el mensaje de éxito es visible antes del refresh; si no, agregar un delay mínimo o cambiar la UX para mostrar el pronóstico guardado de forma más prominente en la card "Tu pronóstico"

**Cambios fuera de alcance:** Lógica de server action, base de datos.

**Tests sugeridos:** Ninguno (interacción visual).

**Riesgo:** Bajo. Posible complejidad si se necesita coordinar el refresh con el mensaje.

**Criterio de aceptación:**
- Al guardar un pronóstico, el usuario ve claramente que fue guardado (ya sea por mensaje visible o por actualización de la card "Tu pronóstico").

---

## 6. Qué NO conviene tocar ahora

- **Reglas de scoring.** No cambiar la lógica ni los tests de scoring.
- **Modelo de datos.** No agregar ni quitar campos en esta etapa.
- **Rutas principales.** `/p/[participantId]`, `/admin/results`, `/login` funcionan correctamente.
- **Lógica de bloqueo y reveal.** Ya está correctamente implementada server-side.
- **Sistema de autenticación.** Ya funciona. No agregar OAuth, passkeys ni 2FA.
- **Fixture y seed.** No tocar datos base.
- **`ParticipantCreateForm` legado** — Verificar si está expuesto en alguna ruta antes de eliminarlo. Si no está en ninguna ruta pública, puede eliminarse en un patch separado, pero no es urgente.
- **Responsive design completo.** La app ya es mobile-first. No rehacer el diseño.
- **Agregar librerías UI** (Radix, shadcn, etc.). No agregar dependencias pesadas.

---

## 7. Checklist final para validar cada patch

Antes de cerrar cualquier patch:

- [ ] Los textos cambiados son los únicos cambios en el diff (si el patch es solo wording).
- [ ] No se modificó lógica de scoring.
- [ ] No se modificó el schema de Prisma.
- [ ] No se modificaron reglas de bloqueo ni reveal.
- [ ] `npm run lint` pasa sin errores.
- [ ] `npm run test` pasa. Si hubo cambio de strings, los tests que esperaban el string anterior fueron actualizados.
- [ ] `npx tsc --noEmit` pasa sin errores.
- [ ] `npm run build` pasa.
- [ ] En mobile (380px), los botones son tocables y el texto es legible.
- [ ] En la pantalla del participante, se puede identificar visualmente qué partidos están pendientes de pronóstico.
- [ ] En `/admin/results`, los partidos no iniciados muestran un mensaje claro y no un formulario vacío.
- [ ] Si se agregaron server actions nuevas, hay al menos un test que valida el caso de rechazo (sin permisos, datos inválidos).

---

## Apéndice — Estado de cada formulario revisado

| Componente | Estado actual | Observaciones |
|---|---|---|
| `LoginForm` | Bien. Labels claros, botón grande. | Solo falta placeholder en campo nombre. |
| `PasswordChangeForm` | Bien. Tres campos correctos, mensajes de error/éxito diferenciados. | Minor: label "Repetir nueva contraseña" puede suavizarse. |
| `PredictionForm` | Bien para fase de grupos. | Label del campo clasificado es largo en eliminación directa. |
| `ResultForm` | Funcional. | Labels más cortos que `PredictionForm` (inconsistencia menor). Tamaño de botón `py-2` es pequeño. |
| `AdminParticipantCreateForm` | Bien. Texto explicativo claro. | No hay acciones sobre usuarios existentes (brecha funcional en la page, no en este form). |
| `ParticipantCreateForm` (legado) | Desactualizado. | Texto menciona "sin login ni contraseña". Verificar si sigue siendo accesible. |
