# Revision tecnica senior - Pronosticos Mundial

Fecha: 2026-06-15

## 1. Objetivo de esta revision

Este documento evalua la aplicacion desde la perspectiva de arquitectura, buenas practicas, eficiencia de consultas, clean code, redundancia y mantenibilidad general.

La revision se basa en:

- lectura del codigo fuente actual;
- lectura de `README.md`, `AGENTS.md` y auditorias existentes;
- verificacion del estado tecnico real con:
  - `npm run prisma:validate`
  - `npm run lint`
  - `npm run test`
  - `npx tsc --noEmit`
  - `npm run build`

Resultado de validacion actual:

- Prisma valida correctamente.
- Lint pasa sin errores.
- Tests: 66 tests, 10 archivos, todo en verde.
- TypeScript compila sin errores.
- Build de Next.js exitoso.

Conclusion de contexto: la app no esta en un estado fragil ni roto. La base actual es funcional, desplegable y razonablemente consistente para el alcance familiar definido.

## 2. Veredicto ejecutivo

### Estado general

La aplicacion esta bien encaminada y, para su escala actual, tiene una base tecnica sana.

Puntos especialmente positivos:

- el dominio de scoring esta aislado en funciones puras (`lib/scoring.ts`);
- la autenticacion familiar simple esta implementada con una complejidad razonable;
- las reglas sensibles principales se validan server-side;
- hay cobertura automatizada sobre scoring, auth, read models y acciones criticas;
- la trazabilidad basica de resultados ya esta modelada y visible;
- la app compila y construye correctamente en el estado revisado.

Mi conclusion como senior dev es:

- la app sigue bastantes buenas practicas para una v1/v1.5;
- no presenta hoy signos de sobreingenieria;
- tampoco presenta problemas serios de performance para el volumen real esperado;
- si no se ordena pronto cierta deuda estructural, la siguiente etapa va a empezar a costar mas de lo necesario.

No veo blockers severos para uso familiar actual.

Si veo deuda tecnica clara en tres frentes:

1. consolidacion de capa de aplicacion y capa de lectura;
2. reduccion de duplicacion en formularios y validaciones;
3. limpieza de contratos viejos que quedaron convivendo con el flujo autenticado nuevo.

## 3. Evaluacion de arquitectura

### 3.1 Lo que esta bien resuelto

#### Separacion razonable por capas

La app muestra una separacion util entre:

- UI/paginas en `app/*`;
- componentes en `components/*`;
- logica de dominio y lectura en `lib/*`;
- persistencia modelada en Prisma.

El scoring esta correctamente desacoplado de React y de Prisma:

- `lib/scoring.ts`

Esto es una muy buena decision porque:

- facilita testeo;
- evita meter reglas de negocio dentro de componentes;
- baja el costo de cambiar reglas de puntuacion mas adelante.

#### Auth simple acorde al problema

La estrategia de sesion firmada en cookie `httpOnly` es apropiada para el contexto familiar:

- `lib/auth/session.ts`

No intenta resolver problemas enterprise que no forman parte del alcance.

Ademas, las acciones sensibles no confian ciegamente en el cliente:

- `app/p/[participantId]/actions.ts`
- `app/admin/results/actions.ts`
- `app/admin/participants/actions.ts`

Eso esta alineado con el contrato de producto.

#### Read models centrados en casos de uso

La carpeta `lib/read-models.ts` concentra transformaciones utiles para pantalla:

- tabla de posiciones;
- detalle de partido;
- partidos agrupados;
- admin de resultados.

La idea es buena: separar lectura preparada para UI de los componentes de presentacion.

### 3.2 Lo que ya muestra deuda arquitectonica

#### `lib/read-models.ts` esta creciendo como modulo omnibus

Hoy `lib/read-models.ts` mezcla demasiadas responsabilidades:

- tipos de vista;
- utilidades de fecha y lock;
- normalizacion de resultados y pronosticos;
- agrupacion;
- armado de standings;
- queries Prisma;
- metricas globales;
- armado del detalle de partido.

Evidencia:

- `lib/read-models.ts:595-893`

No es un problema urgente por tamaño de negocio, pero si es una señal clasica de que una buena idea inicial ya esta absorbiendo demasiadas funciones.

Riesgo:

- cambios futuros van a tocar un archivo demasiado central;
- cuesta navegarlo;
- aumenta la probabilidad de duplicar selects y helpers;
- baja la cohesion del modulo.

#### La capa de aplicacion no esta del todo consolidada

Parte de la logica vive en `lib/*`, pero otra parte relevante vive directamente en server actions o paginas:

- `app/p/[participantId]/actions.ts:21-134`
- `app/admin/participants/page.tsx:12-23`

Esto genera una arquitectura intermedia:

- no es mala para una app chica;
- pero empieza a mezclar capa HTTP/UI con reglas y acceso a datos.

Ejemplo claro:

- `app/admin/participants/page.tsx` consulta Prisma directo en vez de pasar por un read model o servicio de lectura;
- `app/p/[participantId]/actions.ts` implementa parsing, permisos, validacion de lock y persistencia en el mismo lugar.

No rompe nada hoy, pero debilita consistencia de diseño.

#### Hay contrato viejo conviviendo con contrato nuevo

La app ya migro a auth, pero todavia existe el flujo viejo de alta simple sin password:

- `app/actions.ts:12-59`
- `components/participant-create-form.tsx`

Y ese flujo ya no encaja bien con el estado actual del producto:

- crea participantes activos sin password;
- contradice el contrato de alta admin-only del hito nuevo;
- el componente incluso describe "sin login ni contraseña".

Ademas, este flujo no aparece conectado al home actual, que redirige directo a login:

- `app/page.tsx`

Esto es deuda funcional y semantica, aunque no sea un bug en runtime.

## 4. Buenas practicas y clean code

### 4.1 Fortalezas claras

#### Dominio testeable

La mejor decision de clean architecture del repo es mantener el scoring puro y testeado:

- `lib/scoring.ts`
- `lib/scoring.test.ts`

Lo mismo aplica a piezas como auth, admin results y read models, que tambien tienen tests dedicados.

#### Nombres en general claros

Los nombres son mayormente correctos y expresan intencion:

- `authenticateParticipant`
- `changeParticipantPassword`
- `upsertAdminMatchResult`
- `getMatchReadModelById`
- `buildStandingsTable`

Eso ayuda a mantener el codigo legible.

#### Validaciones server-side bien ubicadas

Buenas decisiones concretas:

- bloqueo por kickoff validado en servidor;
- permiso admin validado en servidor;
- sesion resuelta en servidor;
- password hasheada, nunca plana;
- audit trail de resultados persistido.

#### Ausencia de complejidad innecesaria

No hay capas artificiales, factories innecesarias, abstracciones genéricas prematuras ni RBAC sobrediseñado.

Para una app familiar, eso es una virtud.

### 4.2 Debilidades de clean code

#### Duplicacion de logica de parseo y formularios

Hay duplicacion concreta entre:

- `app/p/[participantId]/actions.ts:9-19`
- `lib/admin-results.ts:27-37`

La funcion `parseScore` esta repetida.

Tambien hay una repeticion muy alta entre:

- `components/prediction-form.tsx:1-115`
- `components/result-form.tsx:1-107`

Comparten:

- estado de accion;
- `useActionState`;
- `useEffect` con `router.refresh()`;
- estructura de inputs para goles;
- estructura del campo de clasificado;
- patron de mensajes;
- patron del submit.

No es solo similitud visual. Ya es una duplicacion de comportamiento y markup suficiente como para justificar un componente base compartido o un hook reutilizable.

#### Repeticion de formatters y helpers menores

En `app/p/[participantId]/page.tsx` existen dos funciones equivalentes:

- `formatAveragePoints`
- `formatStatAverage`

Evidencia:

- `app/p/[participantId]/page.tsx:47-59`

Esto no es grave, pero es un ejemplo de que la pagina ya esta absorbiendo detalles que deberian consolidarse.

#### Paginas con mucha responsabilidad

La pantalla del participante concentra:

- resolucion de auth;
- proteccion de ruta;
- carga paralela de datos;
- normalizacion de filtros;
- composicion de varias vistas;
- UI larga y variada.

Evidencia:

- `app/p/[participantId]/page.tsx`

La pagina sigue siendo entendible, pero ya esta entrando en territorio de componente/page grande y pesada.

#### Inconsistencia de lugar para acceso a datos

Ejemplo:

- `app/admin/participants/page.tsx:12-23` consulta Prisma directo;
- otras pantallas usan `lib/read-models.ts`.

Esto no es mala practica por si solo, pero a escala de mantenimiento suele derivar en criterios mezclados y consultas repetidas.

## 5. Eficiencia de consultas

## 5.1 Estado actual

Para la escala esperada de esta app, las consultas son suficientemente eficientes.

Razones:

- el dataset actual es pequeño;
- el fixture es finito: 104 partidos;
- cantidad de participantes familiar, no masiva;
- Prisma selecciona campos puntuales y no hace `select *`;
- no detecte patrones clasicos de N+1 graves en render.

En otras palabras: hoy no veo un problema real de performance.

### 5.2 Lo que esta bien

#### Seleccion de campos acotada

Las consultas suelen usar `select`, por ejemplo en:

- `getParticipantMatches`
- `getMatchReadModelById`
- `getStandingsTable`
- `getAdminResultsGroupedByDay`

Evidencia:

- `lib/read-models.ts:680-893`

Esto ayuda a mantener la lectura controlada.

#### Uso razonable de `Promise.all`

Se usa paralelismo donde tiene sentido:

- `getMatchReadModelById`
- `getStandingsTable`
- pagina principal del participante

Eso esta bien.

### 5.3 Oportunidades de mejora

#### Varias vistas cargan mas de lo necesario

La pantalla del participante siempre ejecuta:

- `getParticipantMatches`
- `getStandingsTable`
- `getStandingsStats`

Evidencia:

- `app/p/[participantId]/page.tsx:90-95`

Aunque el usuario este viendo solo "Por dia" o "Por grupo", igualmente se calcula tabla y estadisticas globales.

Con 104 partidos esto es tolerable.
Con mas participantes, mas resultados y nuevas estadisticas, va a empezar a costar mas de lo necesario.

#### Mucha logica de filtrado ocurre en memoria

Ejemplo:

- se cargan todos los partidos del participante;
- luego se agrupan y filtran por dia o grupo en memoria.

Evidencia:

- `app/p/[participantId]/page.tsx:101-128`

Para 104 partidos esta perfecto.
Como patron de crecimiento, convendria ir desacoplando la carga por vista o al menos permitir queries mas especificas.

#### Los read models repiten selects muy parecidos

Hay varias consultas a `match.findMany` con estructuras casi iguales:

- `lib/read-models.ts:638-651`
- `lib/read-models.ts:661-675`
- `lib/read-models.ts:685-723`
- `lib/read-models.ts:813-841`
- `lib/read-models.ts:855-885`

Esto no impacta fuerte en runtime, pero si en mantenibilidad:

- cualquier cambio de shape obliga a tocar varias ramas;
- es facil introducir drift entre pantallas.

#### Patron create/update manual sin transaccion ni `upsert`

En:

- `app/p/[participantId]/actions.ts:95-124`
- `lib/admin-results.ts:88-114`

se hace:

1. buscar existente;
2. actualizar o crear.

Con el volumen actual el riesgo es bajo.
Pero tecnicamente:

- hay una ventana de carrera;
- la unicidad de DB protege parcialmente;
- el flujo podria simplificarse con `upsert` o con manejo explicito de colision.

No es urgente, pero es una mejora valida.

## 6. Seguridad y robustez

### Fortalezas

- Cookie `httpOnly` firmada.
- `SESSION_SECRET` obligatorio en produccion.
- `timingSafeEqual` en verificacion de firma y hash.
- Passwords hasheadas con PBKDF2.
- El usuario actual se resuelve server-side.
- Admin requerido para resultados y administracion.
- Participantes inactivos no autentican.

Evidencia principal:

- `lib/auth/session.ts`
- `lib/auth/password.ts`
- `lib/auth/login.ts`

### Observaciones

La estrategia de cookie firmada simple es valida para el alcance.

Su principal tradeoff no es seguridad inmediata, sino control operativo:

- no hay revocacion selectiva de sesiones;
- no hay invalidacion centralizada tras cambio de password;
- no hay tabla de sesiones.

Esto ya estaba permitido por el contrato, asi que no lo considero defecto de implementacion, sino decision de alcance.

## 7. Redundancia y codigo repetitivo

Los principales focos reales son:

### 7.1 Formularios similares

- `components/prediction-form.tsx`
- `components/result-form.tsx`

La duplicacion es suficientemente alta como para considerarla deuda.

### 7.2 Parsing y validaciones de score duplicadas

- `app/p/[participantId]/actions.ts:9-19`
- `lib/admin-results.ts:27-37`

### 7.3 Selects repetidos de Prisma

Especialmente en `lib/read-models.ts`.

### 7.4 Flujo legado no alineado con auth

- `app/actions.ts`
- `components/participant-create-form.tsx`

No solo repite funcionalidad: ademas sostiene un contrato viejo que compite con el actual.

## 8. Calidad de testing

La cobertura visible es buena para el tamaño del producto.

Lo mejor cubierto:

- scoring;
- auth;
- admin results;
- admin participants;
- read models;
- algunas rutas/paginas protegidas.

Esto es una muy buena señal de disciplina tecnica.

La principal mejora pendiente no es "mas tests por cantidad", sino enfocar tests donde hay deuda estructural futura:

- helpers compartidos de formularios;
- capa de servicios si se extrae logica de acciones;
- contratos de queries/read models una vez que se modularicen.

## 9. Conclusiones por tema

### Arquitectura

Buena para el alcance actual, con una deuda creciente de modularidad en lectura y acciones.

### Buenas practicas

Mayormente si. Especialmente en dominio puro, validacion server-side y tests.

### Eficiencia de consultas

Suficiente y razonable hoy. No detecto problemas graves. Si detecto oportunidades claras de optimizacion por diseño y no por urgencia.

### Redundancia

Si, existe. Principalmente en formularios, parsing y consultas repetidas.

### Clean code

En un nivel bueno para v1, pero con sintomas de crecimiento:

- archivos grandes;
- responsabilidad mezclada en paginas;
- restos de contrato legacy;
- helpers chicos duplicados.

## 10. Conclusion final de senior review

Si tuviera que resumir esta app en una frase:

"Es una base correcta, funcional y bastante sana para una app familiar, pero ya pide una segunda pasada de consolidacion para evitar que el siguiente hito empiece a generar deuda innecesaria."

No recomendaria un rewrite.

Si recomendaria:

- una etapa corta de ordenamiento tecnico;
- limpieza de flujos legacy;
- consolidacion de formularios/validaciones;
- segmentacion de read models y servicios.

La app esta en un buen punto para seguir creciendo, siempre que el proximo paso no sea seguir agregando features encima de la duplicacion actual sin antes acomodar la estructura.
