# Audit UX/UI — Vista de Tabla de Posiciones

**Fecha:** 2026-06-14  
**Scope:** vista `Tabla de puntos` dentro de `app/p/[participantId]/page.tsx`  
**Objetivo:** mejorar jerarquía visual, uso del espacio, legibilidad y claridad en desktop y mobile sin cambiar scoring, lógica de negocio, datos ni rutas.

---

## 1. Resumen ejecutivo

La vista actual de standings funciona y usa datos correctos, pero la jerarquía visual está invertida respecto de la prioridad real de la pantalla. El elemento más importante debería ser la tabla de posiciones, pero hoy queda desplazado hacia abajo por dos cards grandes que consumen mucho alto visible, especialmente en desktop.

El problema principal no es de lógica sino de layout y densidad:

- `Goles del Mundial` ocupa más espacio del que justifica su importancia.
- `Peor pronóstico` tiene más protagonismo visual del deseado para una app familiar y compite con la tabla.
- la tabla tiene demasiadas columnas para mobile y, aun en desktop, no destaca con suficiente claridad `Puntos` como métrica principal.
- el uso del color en `Peor pronóstico` es más intenso que el peso semántico real del contenido.

La recomendación preferida es compactar las métricas superiores y subir la tabla, manteniendo la información actual pero reordenada. No hace falta rediseñar toda la app: con cambios acotados en la misma página se puede conseguir una mejora visible.

---

## 2. Diagnóstico de la vista actual

### 2.1 Superficie auditada

La vista de standings se renderiza en `app/p/[participantId]/page.tsx` dentro del branch `view === "standings"`.

Datos consumidos:

- `getStandingsTable(now)` en `lib/read-models.ts`
- `getStandingsStats()` en `lib/read-models.ts`

Datos actualmente disponibles para la UI:

- tabla con `participantName`, `totalPoints`, `averagePoints`, `scoredPredictions`, `exactCount`, `outcomeCount`, `predictedMatches`, `missedLockedMatches`
- resumen de goles con `totalGoals`, `resultedMatches`, `averageGoalsPerMatch`
- lista `worstPredictions[]` ya calculada

No hace falta cambiar modelo de datos para implementar mejoras de layout propuestas en este audit.

### 2.2 Jerarquía visual actual

El elemento que debería ser principal en esta vista es la tabla de posiciones. Es el motivo por el cual el usuario entra a `Tabla de puntos` y es la pieza que responde la pregunta central: quién va primero y con qué diferencia.

Hoy esa prioridad no se refleja del todo porque:

- la tabla aparece recién después de dos cards altas.
- las cards superiores usan fondos temáticos, títulos grandes y padding generoso.
- `Peor pronóstico` puede renderizar varias filas internas y crecer bastante en altura.
- el primer scroll o primer viewport desktop queda dominado por contenido secundario.

Resultado: la vista transmite más protagonismo al contexto decorativo/estadístico que a la tabla de posiciones.

### 2.3 Estado de `Goles del Mundial`

La card es clara, pero está sobredimensionada para el valor que aporta.

Fortalezas:

- el dato se entiende rápido.
- la separación en tres métricas funciona.
- el texto `Calculado solo con resultados cargados` ayuda.

Problemas:

- usa una card completa con mucho alto para solo tres números.
- deja aire vertical desaprovechado.
- en desktop podría resolverse como una franja horizontal compacta sin perder claridad.

Conclusión: útil, pero compactable.

### 2.4 Estado de `Peor pronóstico`

La card hoy tiene demasiado peso visual para un contenido secundario y lúdico.

Fortalezas:

- es un dato simpático y diferenciador.
- el contenido ya está calculado y no requiere lógica adicional.

Problemas:

- el título `Peor pronóstico` puede sonar duro para un contexto familiar.
- el fondo rosado, borde rosado y badge oscuro hacen que llame más la atención que la tabla.
- si hay varios empates en distancia, la card puede crecer en altura y empujar aún más la tabla.
- el detalle textual es largo para un bloque que no es la tarea principal del usuario.

Conclusión: conviene bajar su protagonismo visual y posiblemente compactar el contenido.

### 2.5 Tabla de posiciones actual

La tabla actual tiene 8 columnas:

1. Participante
2. Promedio
3. Puntos
4. Partidos puntuados
5. Pronósticos exactos
6. Signo acertado
7. Partidos pronosticados
8. Sin pronóstico

Observaciones:

- la columna más importante debería ser `Puntos`, pero comparte el mismo peso visual que `Promedio`.
- `Promedio` aparece antes que `Puntos`, lo cual puede ser coherente con el orden actual de ranking, pero no con la comprensión inmediata del usuario.
- para usuarios familiares o mayores, ocho columnas es denso.
- varias columnas son útiles como detalle, pero no todas merecen igual prioridad en primera vista.
- en mobile, la tabla horizontal completa es funcional, pero no es la opción más legible si el ancho es muy limitado.

### 2.6 Tabs y filtros

Los tabs `Por día`, `Por grupo`, `Tabla de puntos` se entienden como modos de vista. El activo es razonablemente claro por contraste `bg-black text-white`.

Puntos a vigilar:

- en mobile, tres pills seguidas siguen siendo tocables, pero pueden quedar apretadas según ancho del dispositivo.
- `Tabla de puntos` es el label más largo y puede dominar visualmente el grupo.
- no hay problema conceptual serio; el issue acá no es de comprensión sino de ergonomía y balance.

### 2.7 Estado de tests

Hay cobertura sobre el read model de standings en `lib/read-models.test.ts`:

- construcción de filas agregadas
- orden por `averagePoints` antes de `totalPoints`
- estadísticas globales de goles y peores pronósticos

No se detectó un test específico de render de la vista standings en `app/p/[participantId]/page.tsx`. Para cambios visuales acotados no es obligatorio introducirlo, pero sería útil en patches de UI para fijar headers visibles y fallback states.

---

## 3. Hallazgos priorizados P1/P2

### P1

#### P1.1 La tabla no tiene suficiente protagonismo

La vista de `Tabla de puntos` debería priorizar ranking y diferencia entre participantes. Hoy la tabla queda demasiado abajo y compite con dos cards de mayor tamaño del necesario.

#### P1.2 `Peor pronóstico` está sobredimensionado respecto de su importancia

Es una pieza secundaria, pero puede ocupar más alto que la tabla visible en primer viewport. Eso perjudica claridad y foco.

#### P1.3 `Goles del Mundial` desaprovecha espacio

El contenido es valioso como contexto, pero el formato de card amplia no está justificado. La misma información podría vivir en una franja compacta.

#### P1.4 La tabla tiene demasiadas columnas para mobile y lectura rápida

Aunque todas las métricas son correctas, no todas son primera prioridad. En mobile la densidad horizontal sube demasiado y obliga a lectura lateral poco cómoda.

#### P1.5 `Puntos` no tiene suficiente jerarquía frente a `Promedio`

El ranking actual se ordena por promedio y luego puntos, lo cual no debe tocarse sin decisión de producto. Pero en la UI general el usuario suele buscar primero puntos totales. Ese dato necesita ser visualmente dominante aunque el criterio de orden siga igual.

### P2

#### P2.1 El wording `Peor pronóstico` puede sentirse duro

Para una app familiar conviene evaluar wording más neutral como `Predicción más lejana` o `Mayor diferencia`.

#### P2.2 El color rosado/rojo actual llama demasiado la atención

La semántica visual sugiere error o castigo. Para este contexto conviene una paleta más suave o más neutra.

#### P2.3 Los tabs podrían beneficiarse de más aire horizontal en mobile

No es un problema grave, pero sí una mejora táctica: más consistencia de alto táctil y mejor wrap.

#### P2.4 Falta una estrategia explícita para mobile standings

La tabla con scroll horizontal es aceptable como fallback, pero no es la solución más amable para personas mayores o usuarios de pantalla chica.

---

## 4. Propuestas visuales concretas

### Opción A: compactar cards superiores y subir la tabla

Idea:

- mantener `Goles del Mundial` y `Peor pronóstico` arriba
- reducir padding, títulos y altura total
- limitar `Peor pronóstico` a una versión más breve
- dejar la tabla inmediatamente debajo, más cerca del nav

Cómo se vería:

- dos bloques más bajos en una grilla 2 columnas en desktop
- en mobile, uno debajo del otro pero con menos alto
- la tabla empieza antes en el scroll

Ventajas:

- cambio pequeño
- conserva toda la estructura actual
- bajo riesgo de regresión visual

Desventajas:

- la tabla sigue sin ser el primer bloque visible
- mejora el síntoma, no corrige del todo la prioridad

### Opción B: convertir `Goles del Mundial` en una fila de métricas

Idea:

- reemplazar la card azul por una franja horizontal compacta
- mantener tres métricas: `Total`, `Prom. x partido`, `Partidos con resultado`

Cómo se vería:

- un contenedor bajo con tres celdas o tres mini cards
- título corto a la izquierda o arriba
- ideal para quedar encima de la tabla sin empujarla mucho

Ventajas:

- mejor uso del espacio
- la información sigue presente
- fácil de leer en desktop y adaptable en mobile

Desventajas:

- requiere tocar la estructura del bloque, aunque no la lógica

### Opción C: mover `Peor pronóstico` debajo de la tabla o volverlo compacto/colapsable

Idea:

- sacar `Peor pronóstico` del área premium superior
- dejar la tabla primero
- ubicar el resumen lúdico después del ranking

Variantes posibles:

- debajo de la tabla como card secundaria
- card compacta con solo 1 caso principal
- summary + link o botón `Ver más` en una etapa futura

Ventajas:

- corrige mejor la jerarquía
- baja la distracción visual
- protege la experiencia de usuarios que entran solo a ver posiciones

Desventajas:

- cambia más el orden visual actual
- si se hace colapsable ya entra en una interacción nueva, aunque simple

### Opción D: tabla desktop + cards mobile

Idea:

- mantener tabla completa en desktop
- renderizar en mobile una versión por participante en formato card

Cada card podría mostrar:

- nombre del participante
- posición
- puntos totales en grande
- promedio
- exactos
- signo acertado
- sin pronóstico

Ventajas:

- mucha mejor legibilidad en teléfono
- evita scroll horizontal largo
- más amigable para usuarios mayores

Desventajas:

- agrega doble representación del mismo contenido
- aumenta algo el markup de la página
- requiere más cuidado de testing visual

---

## 5. Recomendación de layout preferido

La recomendación preferida es una combinación de Opción B + Opción C + una versión mínima de Opción D.

### Layout recomendado para desktop

Orden sugerido:

1. header del participante
2. tabs de modo de vista
3. franja compacta `Goles del Mundial`
4. tabla de posiciones
5. card secundaria `Predicción más lejana` o `Peor pronóstico`

Por qué:

- la tabla sube y recupera protagonismo
- las métricas globales siguen visibles como contexto útil
- el bloque secundario deja de competir con la función principal de la pantalla

### Layout recomendado para mobile

Orden sugerido:

1. header
2. tabs con altura táctil sostenida
3. franja compacta de métricas en 2 o 3 bloques apilables
4. standings en cards por participante o, como mínimo viable, tabla simplificada
5. bloque de `Predicción más lejana` al final

### Propuesta mínima mobile sin rediseño completo

Si no se quiere implementar cards mobile todavía, la alternativa mínima aceptable es:

- mantener tabla
- reducir columnas visibles en mobile
- dejar `Participante`, `Puntos`, `Promedio`, `Exactos`, `Sin pronóstico`
- ocultar `Partidos puntuados`, `Partidos pronosticados` y eventualmente `Signo acertado` en pantallas chicas

Esta versión ya mejora mucho sin duplicar componentes.

---

## 6. Recomendaciones específicas por área

### 6.1 Jerarquía visual

- el elemento principal debe ser la tabla de posiciones.
- `Puntos` debe tener más jerarquía visual que `Promedio`.
- `Promedio` puede seguir visible, pero con menor peso tipográfico o como dato secundario.
- el líder debería destacarse mejor, por ejemplo con una fila resaltada suave, un badge `1°` o una marca lateral.

### 6.2 Uso del espacio en desktop

- no conviene mantener dos cards grandes arriba si el objetivo principal es ver posiciones.
- `Goles del Mundial` debería comprimirse a una franja o mini summary.
- `Peor pronóstico` debería reducir altura o moverse debajo de la tabla.
- la tabla debería aparecer más arriba en el viewport.

### 6.3 Tabla de posiciones

Orden visual ideal de columnas en desktop:

1. Pos.
2. Participante
3. Puntos
4. Promedio
5. Exactos
6. Signo acertado
7. Sin pronóstico
8. Partidos puntuados
9. Partidos pronosticados

Notas:

- `Pos.` se puede derivar del `index`, no requiere datos nuevos.
- `Puntos` debe ir antes que `Promedio` por lectura humana.
- `Partidos puntuados` y `Partidos pronosticados` son útiles, pero de menor prioridad.

Orden recomendado para mobile:

- visible: `Participante`, `Puntos`, `Promedio`, `Exactos`, `Sin pronóstico`
- secundarias u ocultas: `Partidos puntuados`, `Partidos pronosticados`, `Signo acertado`

### 6.4 Card `Goles del Mundial`

Versión compacta recomendada:

- título breve
- tres métricas en línea
- labels:
  - `Total`
  - `Prom. x partido`
  - `Partidos con resultado`

Ubicación sugerida:

- resumen horizontal encima de la tabla

### 6.5 Card `Peor pronóstico`

Wording sugerido más neutral:

- `Predicción más lejana`
- `Mayor diferencia`

Recomendación de contenido:

- mostrar 1 caso principal por defecto
- si hay empates, evaluar un texto corto `Hay otros casos con la misma diferencia`
- no usar top 3 en la parte superior; eso agrega ruido y altura

Tratamiento visual sugerido:

- bajar saturación del color
- evitar rojos intensos
- usar estilo secundario, no hero card

### 6.6 Tabs/filtros

Evaluación:

- se entienden como modos de vista
- el activo es suficientemente claro

Opciones de wording, solo si se quiere suavizar:

- `Por día`
- `Por grupo`
- `Posiciones`

No es un cambio necesario. `Tabla de puntos` es correcto, aunque algo largo.

### 6.7 Accesibilidad práctica

- asegurar contraste suficiente en textos secundarios, especialmente los celestes y rosados claros.
- evitar depender solo del color para identificar al líder o estados.
- mantener alto táctil mínimo en tabs y botones.
- aumentar claridad de la tabla evitando demasiada densidad horizontal.
- priorizar tamaños de texto robustos para usuarios mayores: la tabla no debería caer por debajo de un cuerpo cómodo en mobile.

---

## 7. Plan de implementación por patches

### Patch 1 — Reordenar la jerarquía de la pantalla

**Objetivo:** hacer que la tabla de posiciones gane protagonismo sin cambiar lógica.

**Archivos probables a tocar:**

- `app/p/[participantId]/page.tsx`

**Cambios concretos:**

- mover la tabla por encima de `Peor pronóstico`
- convertir `Goles del Mundial` en un bloque más compacto
- reducir padding vertical de las cards superiores

**Qué queda fuera de alcance:**

- cambios de datos
- cambios de scoring
- componentes nuevos compartidos

**Riesgo:** bajo

**Tests necesarios:**

- verificación visual manual desktop/mobile
- si se agrega test de render, verificar presencia y orden de headings

**Criterio de aceptación:**

- la tabla entra más arriba en desktop
- `Goles del Mundial` ocupa menos alto
- `Peor pronóstico` deja de competir con la tabla

### Patch 2 — Ajustar la tabla para lectura rápida

**Objetivo:** mejorar claridad del ranking.

**Archivos probables a tocar:**

- `app/p/[participantId]/page.tsx`

**Cambios concretos:**

- agregar columna `Pos.` derivada del índice
- reordenar columnas visuales para mostrar `Puntos` antes que `Promedio`
- dar más peso tipográfico a `Puntos`
- resaltar suavemente la fila líder

**Qué queda fuera de alcance:**

- cambiar criterio de orden del ranking
- cambiar cálculos de read model

**Riesgo:** bajo

**Tests necesarios:**

- validación manual de orden visual
- si se agrega test de render, verificar headers y fila destacada

**Criterio de aceptación:**

- el usuario identifica más rápido quién va primero
- `Puntos` se percibe como la métrica principal

### Patch 3 — Estrategia mínima para mobile

**Objetivo:** reducir densidad en teléfono sin rediseño completo.

**Archivos probables a tocar:**

- `app/p/[participantId]/page.tsx`

**Cambios concretos:**

- ocultar columnas secundarias en breakpoints chicos
- mantener solo el subconjunto más útil de datos en mobile
- asegurar tamaño táctil cómodo en tabs

**Qué queda fuera de alcance:**

- crear una experiencia mobile totalmente distinta
- nuevos componentes complejos

**Riesgo:** bajo

**Tests necesarios:**

- validación manual responsive

**Criterio de aceptación:**

- la pantalla deja de sentirse demasiado ancha o densa en teléfono

### Patch 4 — Refinar `Peor pronóstico`

**Objetivo:** mantener el dato lúdico sin que domine la pantalla.

**Archivos probables a tocar:**

- `app/p/[participantId]/page.tsx`

**Cambios concretos:**

- evaluar renombre a `Predicción más lejana`
- bajar intensidad cromática
- mostrar solo un caso principal
- moverlo debajo de la tabla

**Qué queda fuera de alcance:**

- cambiar cómo se calcula `worstPredictions`
- agregar interacciones complejas

**Riesgo:** bajo

**Tests necesarios:**

- revisión manual de copy y layout

**Criterio de aceptación:**

- el bloque se entiende como secundario y no como foco principal

### Patch 5 — Opcional: cards mobile para standings

**Objetivo:** ofrecer una versión más amable para teléfonos si el patch 3 no alcanza.

**Archivos probables a tocar:**

- `app/p/[participantId]/page.tsx`

**Cambios concretos:**

- render alternativo por breakpoint
- card por participante con las 4 o 5 métricas clave

**Qué queda fuera de alcance:**

- alterar datos del read model
- introducir librerías UI

**Riesgo:** medio

**Tests necesarios:**

- validación manual responsive
- opcional test de render básico para ambas variantes

**Criterio de aceptación:**

- lectura más clara en teléfono para usuarios no técnicos o mayores

---

## 8. Qué NO tocar ahora

- scoring
- criterio de cálculo de puntos
- criterio de orden del ranking en `buildStandingsTable`
- modelo de datos o Prisma
- seed o fixture
- auth
- rutas
- `/admin/results`
- admin participants
- lógica de read models salvo que hiciera falta exponer un dato ya calculable localmente

---

## 9. Checklist de validación

- la tabla de posiciones es claramente el bloque principal de la pantalla
- `Puntos` tiene más jerarquía visual que `Promedio`
- el contenido superior ocupa menos alto que hoy
- `Goles del Mundial` se entiende de un vistazo
- `Peor pronóstico` no roba protagonismo al ranking
- la vista desktop usa mejor el espacio horizontal
- la vista mobile no exige demasiada lectura lateral
- tabs y botones mantienen altura táctil cómoda
- el contraste sigue siendo suficiente
- no se cambió scoring ni lógica de negocio
- `npm run lint`
- `npm run test`
- `npx tsc --noEmit`

---

## 10. Recomendación final

Si hay que elegir un único camino acotado, la mejor secuencia es:

1. compactar `Goles del Mundial`
2. subir la tabla
3. mover `Peor pronóstico` debajo de la tabla
4. simplificar la tabla en mobile ocultando columnas secundarias

Esa combinación mejora jerarquía, espacio y legibilidad con cambios chicos, localizados y sin tocar la lógica del producto.