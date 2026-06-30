# Mejoras recomendadas - Vision senior dev

Fecha: 2026-06-15

## 1. Objetivo

Este documento complementa la revision tecnica y lista las mejoras recomendadas en orden de prioridad, con foco en impacto real, costo razonable y cuidado del estado productivo actual.

No propone un rediseno total.
Propone mejoras incrementales sobre la base existente.

## 2. Resumen ejecutivo

La app no necesita una reescritura.

Las mejoras mas valiosas hoy son:

1. limpiar contratos legacy que ya no representan el flujo real;
2. consolidar duplicaciones evidentes en formularios y validaciones;
3. modularizar `read-models` y la capa de acciones antes de sumar mas features;
4. optimizar carga de datos de la pantalla principal segun la vista elegida;
5. reforzar consistencia operativa de acciones de escritura.

## 2.1 Como esta pensada la UI hoy

La UI sigue una logica simple: autenticacion primero, trabajo operativo despues.

El flujo visual principal es:

1. login;
2. vista personal del participante autenticado;
3. detalle de partido para cargar/ver pronosticos;
4. vistas administrativas separadas para tareas sensibles.

La app evita componentes visuales complejos y privilegia:

- bloques claros de informacion;
- acciones cercanas al dato que modifican;
- feedback inmediato de exito/error en formularios server action;
- estados de negocio visibles (abierto, bloqueado, resultado cargado).

### Estructura general de pantallas

Patron general que se repite:

- encabezado contextual con titulo y acciones secundarias;
- bloque principal de contenido (listas, cards o tabla);
- formularios al final de cada bloque o embebidos por fila/card;
- mensajes de estado discretos pero visibles.

Convencion de datos:

- lo sensible se valida en server actions;
- la UI solo refleja el estado final autorizado;
- si una accion no aplica (por kickoff o permisos), el formulario se bloquea o desaparece.

### Que renderiza cada pantalla

#### `/login`

Renderiza:

- formulario de acceso (usuario/slug + password);
- mensaje generico ante credenciales invalidas;
- redireccion al area autenticada cuando login es correcto.

Objetivo UX:

- entrada rapida;
- sin exponer si fallo usuario o password;
- sin pasos extra para una app de uso familiar.

#### `/` (entrada principal)

Comportamiento esperado:

- sin sesion: redireccion a login;
- con sesion: redireccion a la vista personal del participante.

Objetivo UX:

- eliminar ambiguedad de identidad;
- no mantener selector publico de participante como login de facto.

#### `/p/[participantId]`

Renderiza:

- resumen de partidos segun vista activa (dia, grupo o standings);
- estado del pronostico propio por partido (cargado, pendiente, bloqueado);
- accesos al detalle de partido;
- accesos de navegacion a vistas de estadisticas cuando corresponde.

Regla UX central:

- antes del kickoff: foco en completar/editar pronostico propio;
- desde kickoff: foco en lectura, comparacion y puntos.

Nota de contrato:

- aunque la URL tenga `participantId`, la identidad real la define la sesion.

#### `/p/[participantId]/matches/[matchId]`

Renderiza en modo pre-kickoff:

- datos del partido;
- formulario de pronostico del usuario autenticado;
- sin pronosticos de otros participantes.

Renderiza desde kickoff:

- datos del partido;
- resultado real si existe;
- lista de pronosticos de participantes activos;
- marca explicita de `Sin pronostico` para ausentes;
- puntos por participante si el resultado ya fue cargado.

Objetivo UX:

- preservar privacidad antes del inicio;
- revelar informacion completa cuando el partido ya esta bloqueado.

#### `/admin/results`

Renderiza:

- listado de partidos con estado de resultado;
- formulario para cargar o editar resultado por partido;
- advertencia de impacto en la tabla de puntos;
- trazabilidad discreta (agregado por / ultima edicion por).

Reglas UX/seguridad:

- solo visible/util para admin;
- accion de alto impacto con feedback claro;
- auditoria visible pero de baja jerarquia visual.

#### `/admin/participants`

Renderiza:

- listado de participantes con estado activo/inactivo y admin/no admin;
- formulario de alta administrada;
- acciones por fila para activar, desactivar o ajustar admin.

Objetivo UX:

- operacion administrativa simple;
- prevenir errores (por ejemplo, no dejar el sistema sin admin activo).

#### `/account/password`

Renderiza:

- formulario de cambio de password;
- validaciones de password actual, nueva y confirmacion;
- feedback de exito/error sin exponer datos sensibles.

Objetivo UX:

- autonomia de cada usuario;
- flujo corto y seguro.

### Estructura de componentes UI

La composicion actual se apoya en:

- formularios especializados por dominio (`login`, `prediction`, `result`, `password`, `participants`);
- componentes pequenos orientados a tarea;
- read models para entregar datos listos a la vista.

Direccion recomendada para sostener crecimiento sin romper simplicidad:

- extraer primitives reutilizables de layout/estado (header, card, badge, mensajes);
- centralizar patrones de formulario repetidos (inputs de score, estado pending/success/error);
- mantener separadas presentacion, reglas de negocio y persistencia.

### Matriz de render segun estado de negocio

Para evitar drift funcional, conviene tomar esta matriz como referencia:

- sin sesion: solo login;
- con sesion valida: vistas de participante;
- pre-kickoff: formulario propio habilitado, pronosticos ajenos ocultos;
- post-kickoff: formulario propio bloqueado, pronosticos ajenos visibles;
- resultado no cargado: sin puntos definitivos;
- resultado cargado: puntos y comparacion visibles;
- no admin: sin acceso operativo a resultados/participants admin.

Esta matriz alinea UI con reglas de dominio y evita que una mejora visual rompa privacidad, bloqueo o permisos.

## 3. Prioridades

## P1 - Alta prioridad

### P1.1 Eliminar o reconvertir el alta publica legacy de participantes

#### Problema

Siguen existiendo:

- `app/actions.ts`
- `components/participant-create-form.tsx`

Ese flujo crea participantes activos sin password y con narrativa previa a la autenticacion nueva.

#### Riesgo

- inconsistencia de producto;
- deuda semantica;
- confusion futura al retomar el repo;
- posible reuso accidental de un flujo que ya no deberia existir.

#### Recomendacion

Elegir una sola de estas opciones:

- eliminar ese flujo si ya no se usa;
- o reconvertirlo explicitamente a admin-only y alinearlo con el contrato actual.

#### Beneficio

- reduce ambiguedad funcional;
- limpia deuda de transicion;
- mejora consistencia general del producto.

### P1.2 Extraer un helper comun para score inputs y formularios similares

#### Problema

Hay duplicacion fuerte entre:

- `components/prediction-form.tsx`
- `components/result-form.tsx`

Y tambien duplicacion de parseo en:

- `app/p/[participantId]/actions.ts`
- `lib/admin-results.ts`

#### Recomendacion

Crear:

- un helper compartido para parsear goles y normalizar `advancesTeamName`;
- un componente base reutilizable para el bloque de inputs de marcador;
- opcionalmente un hook comun para el patron `useActionState + router.refresh`.

#### Beneficio

- menos drift entre formularios;
- menos mantenimiento duplicado;
- menos chance de divergencia UX/validacion.

### P1.3 Partir `lib/read-models.ts` en modulos con cohesion mas clara

#### Problema

`lib/read-models.ts` ya concentra demasiadas responsabilidades.

#### Recomendacion

Separarlo gradualmente, por ejemplo en:

- `lib/read-models/matches.ts`
- `lib/read-models/standings.ts`
- `lib/read-models/admin-results.ts`
- `lib/read-models/shared.ts`

O cualquier corte equivalente que preserve simplicidad.

#### Beneficio

- mejor navegacion;
- menor costo de cambio;
- mas facil testear y reutilizar selectores;
- menos riesgo de seguir agregando todo en un mismo archivo.

### P1.4 Definir una capa consistente para escritura

#### Problema

Hoy algunas validaciones y persistencia viven directo en server actions, otras en `lib/*`.

#### Recomendacion

Mover la logica sustantiva de escritura a funciones de aplicacion/servicio, dejando las server actions como adaptadores HTTP/Next.

Ejemplo de destino:

- `lib/predictions.ts` o `lib/application/predictions.ts`
- `lib/results.ts`
- `lib/participants.ts`

#### Beneficio

- acciones mas chicas;
- mejor testabilidad;
- reglas de negocio mas faciles de ubicar;
- patron uniforme para futuras features.

## P2 - Prioridad media

### P2.1 Evitar cargar standings y stats cuando no se usan

#### Problema

La pagina del participante carga tabla y estadisticas globales aunque la vista actual sea solo por dia o grupo.

#### Recomendacion

Cambiar la carga para que:

- la vista `standings` resuelva sus datos solo cuando se necesita;
- las vistas `day` y `group` no paguen ese costo.

#### Beneficio

- menor trabajo por request;
- mejor separacion por caso de uso;
- prepara la app para sumar mas participantes o mas metricas sin inflar el costo base.

### P2.2 Reutilizar selects/shape builders de Prisma

#### Problema

Hay muchos `select` similares sobre `match`.

#### Recomendacion

Consolidar fragments o builders de select tipados para:

- lista de partidos;
- match con resultado;
- match con predicciones;
- match para standings.

No hace falta una abstraccion compleja; alcanza con constantes o helpers claros.

#### Beneficio

- menos codigo repetido;
- menos errores al cambiar campos;
- menos drift entre pantallas.

### P2.3 Simplificar el contrato de URL autenticada

#### Problema

La ruta `/p/[participantId]` sigue siendo valida, pero depende de una verificacion de identidad contra la sesion.

#### Recomendacion

Mantenerlo si hace falta por ahora, pero planificar una evolucion hacia:

- `/me`
- `/matches/[matchId]`

dejando la identidad resuelta por sesion, no por parametro.

#### Beneficio

- menos friccion conceptual;
- menos validaciones repetidas;
- contrato mas limpio para una app autenticada.

### P2.4 Unificar formatters utilitarios de la pantalla principal

#### Problema

Hay utilidades casi duplicadas como:

- `formatAveragePoints`
- `formatStatAverage`

#### Recomendacion

Consolidarlas en un helper unico de formateo numerico.

#### Beneficio

- pequeña mejora de limpieza;
- menos ruido en paginas grandes.

## P3 - Prioridad baja pero valiosa

### P3.1 Evaluar `upsert` o transaccion en escrituras criticas

#### Problema

En predicciones y resultados hoy se usa patron:

1. buscar;
2. actualizar o crear.

#### Recomendacion

Evaluar:

- `upsert` cuando aplique;
- o transaccion corta si el dominio necesita pasos coordinados.

#### Beneficio

- mejor robustez ante concurrencia;
- menos branching repetido.

### P3.2 Introducir un pequeño sistema de convenciones UI reutilizables

#### Problema

Las paginas ya repiten bastante:

- headers oscuros con acciones;
- tarjetas de bloque;
- badges de estado;
- secciones de formulario.

#### Recomendacion

Extraer solo 3-5 primitives simples, no un design system entero.

Ejemplos:

- `PageHero`
- `StatusBadge`
- `SectionCard`

#### Beneficio

- coherencia visual;
- menos JSX repetido;
- paginas mas cortas.

### P3.3 Revisar estrategia de sesiones si el uso familiar crece

#### Situacion actual

La cookie firmada simple es valida hoy.

#### Recomendacion

No cambiarla ya.
Solo dejar documentado que, si mas adelante hace falta:

- invalidar sesiones al cambiar password;
- cerrar sesiones activas;
- auditar acceso;

entonces convendra introducir tabla `Session`.

## 4. Roadmap tecnico sugerido

## Etapa 1 - Orden corto y de alto retorno

- retirar flujo legacy de alta publica;
- extraer parser comun de scores;
- unificar formularios similares o su base compartida;
- consolidar helpers menores repetidos.

## Etapa 2 - Consolidacion estructural

- partir `lib/read-models.ts`;
- mover reglas de escritura a capa de aplicacion;
- consolidar `select` de Prisma reutilizables.

## Etapa 3 - Optimizacion selectiva

- carga lazy o condicional de standings/stats;
- simplificacion de rutas autenticadas;
- revisar `upsert`/transacciones donde tenga sentido.

## 5. Que no haria ahora

No recomendaria en este momento:

- reescribir la app;
- introducir CQRS formal;
- agregar Redux, Zustand o capas de estado innecesarias;
- pasar a auth compleja;
- meter RBAC avanzado;
- optimizar prematuramente para escalas que esta app no tiene.

La deuda actual se resuelve con orden y consolidacion, no con mas complejidad.

## 6. Recomendacion final

Si hubiera que elegir una sola direccion para la proxima iteracion tecnica, seria esta:

"Dejar de agregar piezas nuevas sobre la estructura actual sin antes consolidar formularios, acciones y read models."

Con una iteracion corta de refactor bien enfocada, esta app puede quedar mucho mas facil de mantener sin perder la simplicidad que hoy es una de sus mayores virtudes.
