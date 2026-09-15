# Guía de agentes - MéritoDocente

## Propósito

Este archivo es el contexto operativo mínimo para agentes de IA que trabajen en el proyecto. Leerlo antes de explorar el repositorio. Mantenerlo actualizado cuando cambien comandos, arquitectura o decisiones importantes.

## Estado verificado

- Plataforma MOOC para preparación de concursos de méritos docentes.
- Backend: Node.js 18+, Express 4, PostgreSQL, JWT y bcryptjs.
- Frontend: HTML, CSS y JavaScript vanilla; la SPA principal está en `indexInicial.html` y usa `public/api-client.js` y `public/auth.js`.
- Punto de entrada backend: `src/server.js`.
- API base: `/api/v1`.
- Esquema de datos: `database/schema.sql`.
- Datos iniciales: `src/seed/data.sql` y `src/seed/seed.js`.
- Pruebas: la carpeta `tests/` está vacía actualmente. `npm test` termina con `No tests found`.
- Git: repositorio inicializado, rama `main`, remoto `origin` apuntando a `https://github.com/ecapdevilla/mooc-docente.git`.
- Swagger es opcional: el servidor solo monta `/api-docs` si existe `docs/swagger.yaml`.

## Auditoría de arquitectura (2026-09-10)

La hoja de ruta funcional completa, incluido el simulacro gratuito y la importación de 50 preguntas desde Word, está en `docs/roadmap.md`.

### Arquitectura real

El flujo actual es:

`Frontend -> Express -> rutas con SQL directo -> PostgreSQL`

- `src/server.js` configura Express, seguridad, rate limiting, rutas, `/health` y el arranque condicionado a una conexión válida.
- `src/config/database.js` usa `pg.Pool` y exige `DATABASE_URL`.
- Las consultas están directamente en `src/routes/`; `src/controllers/` y `src/models/` están vacíos.
- `public/api-client.js` y `public/auth.js` son el cliente de API y la gestión de sesión con `localStorage`.
- `app.js` es la lógica que intenta consumir la API.
- `indexInicial.html` es la SPA documentada, pero actualmente usa principalmente módulos y progreso locales; existe una segunda integración en `app.js`.

### Decisión de producto

`indexInicial.html` es la fuente principal de diseño, contenido y flujo de usuario: no es un archivo descartable, sino el prototipo más completo del producto. Los módulos, lecciones, quizzes, badges y pantallas que hoy funcionan con `localStorage` deben migrarse progresivamente a persistencia real.

`index.html` y `app.js` son una integración API provisional. No crear una tercera interfaz ni duplicar módulos. La dirección es conservar la experiencia de `indexInicial.html`, conectar sus acciones con la API y dejar una sola entrada frontend antes del despliegue.

### API registrada

- Pública: `GET /health`, `GET /api/v1/ping/health`, registro, login, listado y detalle de cursos.
- Autenticada: usuario actual, progreso, completar lección, perfil, actualización de perfil e inscripciones.
- Administrativa: listado de usuarios y actualización de usuarios bajo `/api/v1/admin`.

### Bloqueos verificados antes de conectar Supabase

Resolver estos puntos antes de usar datos reales o desplegar:

1. `npm run seed` apunta a `src/seed/seed.js`, pero ese archivo intenta importar `./src/seed/seed` desde su propia carpeta.
2. `src/seed/data.sql` inserta `lessons.descripcion`, columna que no existe en `database/schema.sql`.
3. El seed crea inscripciones y progreso inicial que pueden repetirse y violar las restricciones `UNIQUE`.
4. `src/routes/users.js` actualiza `users.actualizado_en`, columna que no existe en el esquema.
5. `src/routes/progress.js` lee `req.user.usuarioId`; `src/middleware/auth.js` entrega `req.user.id`.
6. La lógica de badges trata `existingBadge` como si fuera el resultado completo de `pool.query`, aunque ya desestructuró `rows`.
7. `validateProgress` está importado pero no se aplica a la ruta.
8. `GET /courses` y `GET /courses/:id` no exponen la misma forma de datos que espera `app.js`.
9. `app.js` envía un módulo a una ruta que espera `lessonId` y no establece de forma consistente `currentLessonId`.
10. `tests/` está vacío; `npm test` termina con `No tests found`.
11. `docs/swagger.yaml` no existe, por lo que `/api-docs` no se monta.
12. `index.html` carga `api-client.js` y `auth.js` desde la raíz, pero esos archivos están en `public/`; el frontend API necesita corregir esas rutas o su estructura de servido.

## Plan de conexión a Supabase

### Fase 1: Supabase como PostgreSQL administrado (recomendada)

Conservar Express, `pg`, JWT y bcryptjs. Crear el proyecto Supabase, ejecutar el esquema corregido en el SQL Editor, cargar un seed idempotente y poner la cadena PostgreSQL de Supabase en `DATABASE_URL`. Configurar SSL para producción y probar primero `/health`, registro, login, cursos y progreso.

Esta fase no requiere `@supabase/supabase-js`, Supabase Auth ni una reescritura de las consultas. El pooler de Supabase debe usarse según la cadena recomendada por el proyecto y las credenciales deben permanecer solo en `.env`.

### Fase 2: consolidación de aplicación

Elegir un único frontend oficial, alinear sus respuestas con la API y separar rutas, controladores y modelos solo cuando exista una necesidad concreta. Añadir pruebas mínimas para salud, autenticación, cursos y progreso.

### Fase 3: servicios nativos de Supabase (opcional)

Evaluar Supabase Auth, Storage y Row Level Security únicamente después de estabilizar la API actual. Es una migración mayor porque cambia identidad, autorización y acceso a datos.

## Punto actual y siguiente acción

Estado: arquitectura inventariada y documentada; `indexInicial.html` definido como fuente de producto; GitHub sincronizado; no hay conexión a Supabase todavía; no se han corregido los bloqueos funcionales listados arriba.

Siguiente acción concreta: corregir esquema/seed y contratos de autenticación, progreso y perfil; ejecutar validaciones locales; después crear el proyecto Supabase y probar la conexión con una `DATABASE_URL` de desarrollo. Luego migrar una vertical completa (login -> cursos -> una lección -> progreso) antes de convertir el resto de módulos.

## Comandos

```bash
npm install
npm run dev       # nodemon src/server.js
npm start         # node src/server.js
npm run seed      # requiere PostgreSQL y variables de entorno
npm test          # actualmente no hay tests; fallará por ausencia de archivos
```

Requisitos de ejecución: Node.js >= 18, PostgreSQL >= 14 y un `.env` basado en `.env.example`. El servidor verifica la conexión a la base de datos antes de escuchar en el puerto.

## Mapa rápido

- `src/routes/`: definición de endpoints y middleware asociado.
- `src/controllers/`: manejo de solicitudes y respuestas.
- `src/models/`: consultas y acceso a datos.
- `src/services/`: lógica de negocio reutilizable.
- `src/middleware/auth.js`: autenticación y autorización.
- `src/utils/validators.js`: validación de entradas.
- `public/`: cliente HTTP y autenticación del frontend.
- `database/schema.sql`: tablas, relaciones e índices.
- `docs/architecture.md`: descripción general de arquitectura.

## Contratos importantes

- Autenticación: `Authorization: Bearer <token>`.
- Rutas públicas y protegidas deben conservar el prefijo `/api/v1`.
- Las consultas SQL deben usar parámetros; no concatenar valores recibidos del cliente.
- No exponer secretos de `.env`, tokens ni contraseñas en código, logs o documentación.
- Los cambios de esquema deben incluir la actualización de `database/schema.sql` y del seed cuando aplique.
- Mantener compatibilidad con las respuestas que consume `indexInicial.html` y `public/api-client.js`.
- Antes de cambiar un endpoint, revisar su ruta, controlador/modelo y llamada del frontend inmediata; no explorar todo el repositorio sin necesidad.

## Protocolo de trabajo para agentes

1. Leer este archivo y el archivo directamente relacionado con la tarea.
2. Formular una hipótesis local sobre la causa o el cambio requerido.
3. Revisar solo un vecino: ruta, controlador, modelo, cliente o test relacionado.
4. Hacer el cambio más pequeño que pruebe la hipótesis.
5. Ejecutar una validación enfocada antes de continuar. Como mínimo, usar `node --check` sobre los JS modificados; para API usar una prueba HTTP o Jest cuando exista.
6. En el cierre, registrar archivos tocados, validación ejecutada, resultado y bloqueos.

No repetir lecturas ya cubiertas por este archivo. No modificar archivos no relacionados ni rehacer formato por estilo. No crear commits automáticamente.

## Handoff entre agentes

Usar este formato en el mensaje de entrega o en el resumen de la sesión:

```text
Objetivo:
Archivos revisados:
Cambio realizado:
Validación:
Resultado:
Bloqueos o decisiones pendientes:
Siguiente acción concreta:
```

El agente siguiente debe comenzar por `Siguiente acción concreta` y solo ampliar la exploración si la validación lo exige.

## Prioridades pendientes

1. Corregir esquema, seed y contratos de autenticación, progreso y perfil.
2. Añadir pruebas mínimas para salud, autenticación, cursos y progreso.
3. Crear Supabase y conectar PostgreSQL mediante `DATABASE_URL`.
4. Implementar el simulacro gratuito sin registro y su calificación en backend.
5. Crear editor, importar y publicar las primeras 50 preguntas desde Word.
6. Consolidar `indexInicial.html` como única SPA y migrar el progreso a la API.
7. Definir estrategia de ramas; Git ya está inicializado y sincronizado.

BANCO DIAGNÓSTICO — CONCURSO DOCENTE 2026–2027 30 PREGUNTAS
SITUACIONALES DE ALTA DIFICULTAD Formato: selección múltiple con única
respuesta Propósito: diagnóstico por áreas para orientar el estudio
posterior.

INSTRUCCIONES Seleccione en cada caso la actuación MÁS pertinente,
precisa o ajustada al marco pedagógico y normativo aplicable. Varias
alternativas contienen actuaciones razonables; la clave consiste en
identificar cuál responde mejor a la competencia, procedimiento,
autoridad y finalidad implicados.

============================================================ PREGUNTA 1
— EVALUACIÓN FORMATIVA / SIEE
============================================================ Al cierre
de un período, una docente encuentra que dos estudiantes obtuvieron
resultados bajos en la prueba acumulativa, aunque sus portafolios
evidencian avances sostenidos, las rúbricas muestran mejoramiento y las
autoevaluaciones identifican con precisión dificultades superadas. El
SIEE establece valoración integral, seguimiento continuo y estrategias
de apoyo. Algunas familias solicitan que se conserve la nota de la
prueba porque fue aplicada en igualdad de condiciones.

¿Cuál actuación resulta más pertinente?

A. Mantener la prueba como evidencia principal, contrastarla con
portafolios y autoevaluaciones, y ofrecer actividades de recuperación
para preservar la uniformidad del criterio aplicado al grupo. B.
Integrar las diferentes evidencias conforme a los criterios previamente
establecidos en el SIEE, valorar el proceso y determinar los apoyos
requeridos sin convertir una única prueba en criterio exclusivo. C.
Recalcular el resultado asignando igual ponderación a prueba,
portafolio, rúbrica y autoevaluación, pues la valoración integral exige
que todas las evidencias tengan idéntico peso. D. Sustituir la prueba
por las evidencias procesuales cuando estas muestren progreso, dejando
constancia de que la evaluación formativa prevalece sobre cualquier
valoración sumativa.

============================================================ PREGUNTA 2
— PEI / AUTONOMÍA ESCOLAR
============================================================ Una
institución pretende incorporar al PEI una estrategia pedagógica para
responder a cambios significativos en su población. El equipo docente la
considera técnicamente sólida y propone implementarla de inmediato. El
rector señala que esperar el trámite institucional podría retrasar la
respuesta educativa.

¿Cuál decisión es más precisa?

A. Autorizar una implementación provisional desde rectoría y presentar
posteriormente los resultados al Consejo Directivo para que determine su
incorporación definitiva. B. Encargar al Consejo Académico la adopción
de la estrategia, debido a su competencia sobre currículo y plan de
estudios, e informar al Consejo Directivo una vez sea aplicada. C.
Tramitar la propuesta mediante participación y deliberación de los
estamentos correspondientes y someter su adopción al Consejo Directivo,
con la consulta al Consejo Académico que corresponda. D. Incorporarla
directamente cuando responda al diagnóstico institucional, dado que la
autonomía escolar permite adaptar el PEI a las necesidades del contexto.

============================================================ PREGUNTA 3
— INCLUSIÓN / DUA / AJUSTES RAZONABLES
============================================================ Un
estudiante con discapacidad participa en las mismas actividades del
curso, pero persisten barreras para demostrar lo aprendido mediante el
formato habitual de evaluación. El docente ya ha utilizado recursos
accesibles y diversas formas de representación para todo el grupo.

¿Qué actuación responde mejor al enfoque inclusivo?

A. Mantener el instrumento común y ampliar el tiempo, porque modificar
la forma de respuesta podría alterar los objetivos de aprendizaje
establecidos para el grado. B. Diseñar una evaluación individual con
objetivos diferentes para el estudiante, pues la persistencia de
barreras demuestra que el currículo común no resulta pertinente. C.
Identificar las barreras que persisten y establecer los ajustes
razonables requeridos, manteniendo los objetivos pertinentes y
articulándolos con la valoración pedagógica y, cuando corresponda, el
PIAR. D. Eximir al estudiante de la actividad evaluativa y valorar su
participación durante las clases, priorizando permanencia e inclusión
sobre comparabilidad académica.

============================================================ PREGUNTA 4
— CONVIVENCIA ESCOLAR / RUTA DE ATENCIÓN
============================================================ Durante
varias semanas un estudiante recibe mensajes humillantes de compañeros
en un grupo digital creado fuera de la institución. Los mensajes se
relacionan con situaciones ocurridas en el colegio y han afectado su
participación en clase. El docente conoce capturas de pantalla, pero
todavía no se ha establecido plenamente quién inició las agresiones.

¿Cuál actuación es más adecuada?

A. Esperar la identificación definitiva de los responsables antes de
activar actuaciones institucionales, para evitar afectar el debido
proceso de estudiantes posiblemente ajenos. B. Abordar inicialmente el
asunto como conflicto interpersonal, promover conciliación entre los
involucrados y activar la ruta únicamente si la conducta vuelve a
presentarse. C. Informar y activar los procedimientos institucionales de
atención y protección correspondientes, documentar los hechos y
preservar el debido proceso sin condicionar la intervención inicial a
tener definida toda responsabilidad. D. Remitir inmediatamente el caso a
una autoridad externa, dado que el uso de medios digitales sitúa la
situación fuera de la competencia del establecimiento educativo.

============================================================ PREGUNTA 5
— FUNCIÓN DOCENTE / GESTIÓN ACADÉMICA
============================================================ Los
resultados de varias actividades muestran que un grupo memoriza
conceptos, pero tiene dificultades para transferirlos a situaciones
nuevas. El docente considera aumentar el número de ejercicios
repetitivos; otro profesor propone modificar la mediación didáctica.

Desde las competencias funcionales del docente de aula, ¿qué actuación
es más consistente?

A. Conservar la planeación y aumentar ejercicios graduados, porque el
dominio curricular exige asegurar primero automatización antes de
modificar la estrategia pedagógica. B. Revisar la planeación, analizar
las evidencias de aprendizaje y ajustar estrategias pedagógicas y
didácticas para favorecer aplicación, comprensión y relación de
conceptos. C. Remitir la dificultad al Consejo Académico para que
determine una modificación curricular institucional antes de realizar
cambios metodológicos en el aula. D. Mantener las actividades y
modificar únicamente el instrumento de evaluación, pues la dificultad
observada puede derivarse de una medición poco representativa.

============================================================ PREGUNTA 6
— GOBIERNO ESCOLAR / COMPETENCIAS
============================================================ Una familia
presenta inconformidad por la forma como se aplicaron criterios
académicos en una asignatura. El asunto requiere revisar el plan de
estudios, los criterios evaluativos y la coherencia pedagógica de la
decisión. Algunos integrantes proponen que el Consejo Directivo resuelva
de inmediato por ser la máxima instancia institucional.

¿Qué actuación es más precisa?

A. Remitir inicialmente el análisis académico al Consejo Académico
dentro de sus competencias, sin perjuicio de las instancias y
procedimientos institucionales que correspondan. B. Someter directamente
el caso al Consejo Directivo, porque toda reclamación que pueda afectar
derechos debe ser resuelta por la instancia de mayor jerarquía. C.
Encargar al rector la decisión definitiva, puesto que orienta la
ejecución del PEI y debe garantizar el cumplimiento de las funciones
docentes. D. Solicitar al docente modificar la calificación mientras se
estudia el caso, para proteger preventivamente el derecho del estudiante
y evitar un perjuicio académico.

============================================================ PREGUNTA 7
— EVALUACIÓN / PROMOCIÓN
============================================================ Un
estudiante termina el año con desempeño bajo en un área. Durante el
proceso recibió apoyos, mostró avances parciales y cumplió los
compromisos establecidos. La familia sostiene que esos avances obligan a
promoverlo; algunos docentes consideran que una sola área perdida impide
automáticamente la promoción.

¿Qué criterio debe orientar la decisión?

A. Promoverlo porque el cumplimiento de los apoyos demuestra superación
del riesgo académico aunque permanezca desempeño bajo. B. No promoverlo
porque el desempeño bajo en cualquier área constituye por sí mismo una
causal nacional uniforme de no promoción. C. Aplicar los criterios de
promoción definidos en el SIEE, valorando las evidencias y apoyos
desarrollados, sin crear una regla nacional automática basada
exclusivamente en el número de áreas. D. Someter la decisión
exclusivamente al Consejo Académico, porque la promoción es una
competencia colegiada que prevalece sobre los criterios del SIEE.

============================================================ PREGUNTA 8
— MANUAL DE CONVIVENCIA / DEBIDO PROCESO
============================================================ El manual
establece una consecuencia frente a determinada conducta. Un estudiante
reconoce haber participado, pero afirma que antes de imponer la medida
no se le permitió explicar circunstancias relevantes. La coordinación
considera innecesario reabrir el asunto porque existe reconocimiento del
hecho.

¿Cuál respuesta institucional es más adecuada?

A. Mantener la medida porque la aceptación del hecho hace innecesaria la
contradicción sobre circunstancias que no modifican la conducta
tipificada. B. Revisar el procedimiento y garantizar al estudiante
oportunidad efectiva de ser escuchado y ejercer defensa antes de
consolidar una decisión que lo afecte. C. Sustituir la medida por una
acción pedagógica, porque el enfoque formativo excluye consecuencias
disciplinarias cuando el estudiante reconoce su conducta. D. Remitir el
caso al Consejo Directivo para que imponga directamente la consecuencia
y subsane así cualquier defecto ocurrido en la instancia anterior.

============================================================ PREGUNTA 9
— CURRÍCULO / PROYECTO PEDAGÓGICO
============================================================ Una docente
quiere desarrollar un proyecto sobre contaminación del entorno. Propone
integrar ciencias, matemáticas y lenguaje alrededor de datos reales de
la comunidad. Otro docente afirma que esto reduce el tiempo destinado a
los contenidos de cada asignatura y debería hacerse solo como actividad
extracurricular.

¿Cuál alternativa se ajusta mejor a la orientación pedagógica del
Decreto 1860?

A. Desarrollarlo extracurricularmente para no alterar la secuencia de
asignaturas establecida en el plan de estudios. B. Integrarlo al trabajo
pedagógico cuando permita correlacionar conocimientos, habilidades y
problemas del entorno en coherencia con el currículo y el PEI. C.
Reemplazar temporalmente las asignaturas involucradas por el proyecto,
porque la metodología por proyectos tiene prioridad sobre la
organización curricular. D. Ejecutarlo únicamente si el Consejo
Directivo aprueba previamente cada actividad, debido a que implica
articulación de varias áreas del plan de estudios.

============================================================ PREGUNTA 10
— INCLUSIÓN / CURRÍCULO FLEXIBLE
============================================================ Un
estudiante presenta barreras persistentes para acceder a algunas
actividades. El equipo propone reducir de manera general los
aprendizajes esperados para él durante todo el año. El docente de apoyo
plantea primero revisar barreras, estrategias, apoyos y posibilidades de
acceso.

¿Cuál decisión es más consistente con educación inclusiva?

A. Reducir los objetivos para garantizar éxito académico y evitar que la
evaluación produzca experiencias reiteradas de fracaso. B. Mantener
exactamente los mismos medios, tiempos e instrumentos del grupo para
preservar igualdad y evitar discriminación. C. Conservar los objetivos
generales pertinentes y diversificar oportunidades de acceso,
estrategias, apoyos y ajustes según las barreras identificadas. D.
Trasladar la responsabilidad de adaptación al docente de apoyo, quien
posee la formación específica para determinar las actividades
diferenciadas.

============================================================ PREGUNTA 11
— CONVIVENCIA / CORRESPONSABILIDAD
============================================================ Después de
una situación reiterada de agresión entre estudiantes, varias familias
exigen que el colegio asuma de forma exclusiva la solución. El
establecimiento ha activado sus procedimientos y considera necesaria la
participación familiar en las medidas de seguimiento.

¿Qué principio orienta mejor la respuesta?

A. Autonomía institucional, porque el colegio debe resolver internamente
las situaciones que se originan en el ámbito escolar. B.
Corresponsabilidad, porque familia, establecimiento, sociedad y Estado
tienen responsabilidades articuladas en la formación y convivencia. C.
Subsidiariedad, porque las familias intervienen únicamente cuando la
institución demuestra incapacidad para resolver la situación. D.
Integralidad, porque toda situación de convivencia debe trasladarse
simultáneamente a las autoridades de los diferentes niveles del sistema.

============================================================ PREGUNTA 12
— AUTOEVALUACIÓN / DECRETO 1290
============================================================ Un equipo
docente aplica autoevaluación al final de cada período, pero esta
consiste únicamente en que cada estudiante asigne una nota numérica a su
desempeño. La institución quiere fortalecer el carácter formativo de
este proceso.

¿Qué ajuste es más pertinente?

A. Mantener la nota y aumentar su porcentaje para que la autoevaluación
tenga efectos reales sobre el resultado final. B. Sustituir la
autoevaluación por coevaluación, pues la valoración del propio desempeño
carece de suficiente objetividad. C. Articular la autoevaluación con
criterios conocidos, reflexión sobre evidencias, reconocimiento de
avances y dificultades y compromisos de mejoramiento. D. Aplicarla
únicamente a estudiantes con desempeño bajo, para que identifiquen las
causas personales de sus dificultades.

============================================================ PREGUNTA 13
— RECTOR / CONSEJO DIRECTIVO / CONSEJO ACADÉMICO
============================================================ Durante la
ejecución del PEI se detecta que un proyecto aprobado no está siendo
implementado según lo previsto. Existen fallas de coordinación docente y
comunicación entre estamentos.

¿Quién tiene la responsabilidad más directamente relacionada con
orientar la ejecución del PEI y aplicar las decisiones del gobierno
escolar?

A. Consejo Directivo. B. Consejo Académico. C. Rector. D. Consejo de
Padres.

============================================================ PREGUNTA 14
— PLANEACIÓN PEDAGÓGICA / DIVERSIDAD
============================================================ En un curso
existen ritmos y formas de participación muy diferentes. El docente
dispone de una planeación uniforme que permite cumplir el cronograma,
pero las evidencias muestran que una parte del grupo no logra acceder
adecuadamente a las actividades.

¿Qué actuación demuestra mejor competencia pedagógica?

A. Conservar la planeación para asegurar equidad, incorporando
actividades de recuperación únicamente después de la evaluación final.
B. Ajustar estrategias, recursos y formas de participación a partir de
las evidencias, manteniendo coherencia con los objetivos y referentes
curriculares. C. Diseñar un plan de estudios distinto para cada
estudiante, porque atender diversidad exige individualizar todos los
objetivos de aprendizaje. D. Mantener la metodología y flexibilizar las
calificaciones, de modo que las diferencias de ritmo no afecten los
resultados finales.

============================================================ PREGUNTA 15
— PARTICIPACIÓN ESTUDIANTIL
============================================================ El
personero recibe quejas reiteradas sobre una regla del manual de
convivencia. Algunos estudiantes le solicitan eliminarla inmediatamente
por considerar que vulnera sus derechos.

¿Cuál actuación corresponde mejor a su función?

A. Suspender provisionalmente la regla mientras el Consejo Directivo
determina su validez. B. Presentar las solicitudes y promover la
protección de derechos ante las instancias competentes, utilizando los
mecanismos institucionales previstos. C. Convocar al Consejo de
Estudiantes para derogar la regla mediante votación mayoritaria. D.
Ordenar al rector revisar la disposición, dado que el personero
representa directamente a todos los estudiantes ante el gobierno
escolar.

============================================================ PREGUNTA 16
— EVALUACIÓN / APOYO PEDAGÓGICO
============================================================ Un
estudiante acumula resultados bajos durante dos períodos. El docente ha
informado las notas a la familia, pero no ha modificado las estrategias
porque considera que el estudiante debe demostrar mayor esfuerzo antes
de recibir apoyos adicionales.

¿Cuál análisis es más adecuado?

A. La actuación es correcta si el estudiante conocía previamente los
criterios y las fechas de evaluación. B. La actuación es insuficiente
porque el seguimiento evaluativo debe aportar información para
implementar oportunamente estrategias pedagógicas de apoyo y
mejoramiento. C. La actuación es correcta mientras la institución
ofrezca una recuperación al final del año. D. La actuación es
insuficiente únicamente si el estudiante presenta una condición
formalmente diagnosticada que obligue a realizar ajustes.

============================================================ PREGUNTA 17
— CONVIVENCIA / MEDIDAS PEDAGÓGICAS
============================================================ Dos
estudiantes participan en una confrontación. La institución determina
que existe una situación que debe ser atendida conforme a su manual y a
la ruta institucional. Un grupo de docentes propone que cualquier
intervención restaurativa sustituya automáticamente las demás
actuaciones.

¿Cuál postura es más precisa?

A. La intervención restaurativa siempre sustituye cualquier consecuencia
porque el propósito educativo excluye medidas disciplinarias. B. La
respuesta debe articular medidas pedagógicas, protección, seguimiento y
las actuaciones procedimentales que correspondan según las
características de la situación. C. La respuesta debe centrarse primero
en establecer una sanción ejemplar y posteriormente desarrollar acciones
pedagógicas para evitar reincidencia. D. La institución debe limitarse a
mediar, salvo que exista lesión física comprobada o intervención de una
autoridad externa.

============================================================ PREGUNTA 18
— PEI / CONTEXTO
============================================================ Una
institución adopta sin modificaciones el PEI de otro colegio reconocido
por sus buenos resultados, argumentando que contiene una estrategia
pedagógica probada y cumple formalmente todos los componentes exigidos.

¿Cuál es la principal objeción?

A. Ninguna, si el Consejo Directivo lo adopta y el Consejo Académico
emite concepto favorable. B. El PEI debe expresar cómo la institución
alcanzará los fines educativos considerando sus propias condiciones
sociales, económicas y culturales y con participación de su comunidad.
C. Solo podría hacerse si ambas instituciones pertenecen a la misma
entidad territorial certificada. D. El PEI puede replicarse, pero el
manual de convivencia y el plan de estudios deben construirse de manera
independiente.

============================================================ PREGUNTA 19
— COMPETENCIA DOCENTE / TIC
============================================================ Una docente
incorpora una plataforma digital que automatiza cuestionarios y entrega
calificaciones inmediatas. Los resultados mejoran, pero al revisar las
actividades se observa que casi todas exigen reconocimiento literal y no
permiten establecer si los estudiantes comprenden o aplican lo
aprendido.

¿Cuál decisión profesional es más adecuada?

A. Mantener la herramienta porque la mejora cuantitativa evidencia mayor
aprendizaje y optimiza el uso pedagógico de TIC. B. Eliminar la
herramienta porque la automatización de la evaluación contradice la
mediación docente. C. Revisar el propósito pedagógico, rediseñar las
tareas y utilizar la tecnología como recurso para favorecer procesos de
aprendizaje y evidencias pertinentes, no como fin en sí misma. D.
Conservar los cuestionarios y complementar la nota con participación,
porque la diversidad de calificaciones garantiza valoración integral.

============================================================ PREGUNTA 20
— SIEE / PARTICIPACIÓN INSTITUCIONAL
============================================================ El rector
considera necesario modificar los criterios de evaluación del SIEE antes
del siguiente período. Para agilizar el proceso, propone elaborar la
nueva versión con los coordinadores, comunicarla a los docentes y
aplicarla inmediatamente.

¿Qué actuación es más precisa?

A. Proceder así, porque la rectoría puede realizar ajustes operativos al
sistema mientras no modifique la escala nacional. B. Someter la
modificación al procedimiento institucional de definición,
socialización, aprobación, incorporación al PEI y divulgación previsto
para el SIEE. C. Solicitar únicamente aprobación del Consejo Académico,
pues los criterios evaluativos pertenecen exclusivamente al ámbito
pedagógico. D. Aplicar la modificación durante un período piloto y
formalizarla después si mejora los resultados académicos.

============================================================ PREGUNTA 21
— PIAR / RESPONSABILIDAD DOCENTE
============================================================ En una
reunión, un docente afirma que el PIAR de un estudiante con discapacidad
debe ser elaborado y ejecutado exclusivamente por el docente de apoyo;
por tanto, él continuará con la planeación general y esperará
instrucciones específicas.

¿Cuál respuesta es más adecuada?

A. Es correcta, porque la especialización del docente de apoyo evita que
el docente de aula adopte decisiones sin suficiente formación. B. Es
parcialmente correcta: el docente de aula ejecuta los ajustes, pero la
formulación corresponde exclusivamente al profesional de apoyo. C. Es
incorrecta: la atención educativa y los ajustes deben articularse con la
planeación y práctica del docente de aula, con los apoyos y actores
correspondientes; el PIAR no desplaza su responsabilidad pedagógica. D.
Es correcta cuando el estudiante cuenta con diagnóstico clínico y
requiere ajustes que superan el Diseño Universal para el Aprendizaje.

============================================================ PREGUNTA 22
— CONSEJO DIRECTIVO / CONFLICTOS
============================================================ Se presenta
un conflicto entre un docente y un estudiante. La familia solicita que
el Consejo Directivo intervenga de inmediato. El manual establece
instancias previas para tramitar la situación.

¿Qué actuación corresponde mejor?

A. El Consejo Directivo debe resolver inmediatamente por ser el órgano
superior del gobierno escolar. B. Deben agotarse los procedimientos
previstos en el manual y, cuando corresponda, el Consejo Directivo puede
actuar como instancia institucional en los términos de sus funciones. C.
El Consejo Académico debe asumir el caso por tratarse de una relación
entre docente y estudiante. D. El rector debe decidir de manera
definitiva antes de cualquier actuación del Consejo Directivo, pues es
el representante legal del establecimiento.

============================================================ PREGUNTA 23
— APRENDIZAJE / MÉTODOS ACTIVOS
============================================================ Una
institución obtiene resultados aceptables en pruebas escritas, pero
observa baja capacidad de los estudiantes para investigar, argumentar y
resolver problemas del contexto. El equipo académico debate cómo
responder.

¿Cuál propuesta guarda mayor coherencia con las orientaciones
pedagógicas del Decreto 1860?

A. Incrementar pruebas objetivas de alta dificultad para entrenar
razonamiento bajo condiciones estandarizadas. B. Mantener la metodología
y aumentar tareas domiciliarias que consoliden los contenidos antes de
introducir problemas abiertos. C. Incorporar métodos activos y
vivenciales, observación, experimentación, práctica y proyectos que
relacionen saberes con situaciones significativas. D. Sustituir las
asignaturas por proyectos interdisciplinarios durante todo el año,
eliminando la organización del plan de estudios por áreas.

============================================================ PREGUNTA 24
— DERECHO A LA EDUCACIÓN / MEDIDA DISCIPLINARIA
============================================================ Ante una
falta grave, algunos miembros de la comunidad proponen una medida
inmediata que impediría al estudiante asistir durante un período
prolongado. El manual contempla procedimiento, instancias y medidas
posibles, pero todavía no se ha escuchado al estudiante.

¿Qué consideración debe prevalecer antes de adoptar la decisión?

A. La autonomía institucional permite aplicar inmediatamente la medida
si la conducta afecta gravemente la convivencia. B. La confesión o
evidencia inicial basta para adoptar la medida y el estudiante puede
controvertirla posteriormente. C. La institución debe respetar el
procedimiento, defensa, proporcionalidad y garantías aplicables,
considerando además la función formativa y el derecho a la educación. D.
Toda medida que afecte asistencia está prohibida, independientemente de
la conducta, el procedimiento y las disposiciones institucionales.

============================================================ PREGUNTA 25
— GESTIÓN COMUNITARIA / FUNCIÓN DOCENTE
============================================================ Una docente
identifica que la baja participación de varios estudiantes se relaciona
con dificultades de comunicación entre familias y escuela. Decide
limitar su intervención al aula porque considera que la relación con la
comunidad corresponde exclusivamente a directivos docentes.

Desde las competencias del docente de aula, ¿cuál valoración es más
adecuada?

A. Es correcta porque la gestión comunitaria es responsabilidad de
rectoría y coordinación. B. Es incorrecta porque la función docente
también comprende interacción con la comunidad educativa, comunicación
institucional y relación con el entorno en el marco de sus
responsabilidades. C. Es correcta siempre que entregue oportunamente los
informes académicos y remita los casos a coordinación. D. Es incorrecta
únicamente cuando el PEI asigna expresamente al docente funciones
administrativas de relación con las familias.

============================================================ PREGUNTA 26
— EVALUACIÓN INCLUSIVA / EQUIDAD
============================================================ Un docente
sostiene que evaluar con equidad significa aplicar exactamente el mismo
instrumento, tiempo y forma de respuesta a todos los estudiantes. Una
colega señala que esto puede producir barreras.

¿Cuál planteamiento es más preciso?

A. La igualdad de instrumentos es indispensable para que las
calificaciones sean objetivamente comparables. B. La equidad puede
requerir diversificación y ajustes razonables que eliminen barreras sin
desnaturalizar los propósitos de aprendizaje que se pretende valorar. C.
La equidad exige instrumentos distintos para cada estudiante, aun cuando
no existan barreras identificadas. D. Los ajustes solo pueden aplicarse
después de una evaluación médica que determine formalmente la
discapacidad.

============================================================ PREGUNTA 27
— PLAN DE ESTUDIOS / CONSEJO ACADÉMICO
============================================================ El Consejo
Directivo detecta que la distribución de actividades de un área no
responde a los objetivos institucionales y decide modificar directamente
la secuencia curricular. El Consejo Académico no ha estudiado la
propuesta.

¿Cuál observación es más precisa?

A. Es válida porque el Consejo Directivo participa en la planeación del
PEI, currículo y plan de estudios y puede sustituir el análisis
académico. B. La revisión curricular y organización del plan de estudios
involucran competencias específicas del Consejo Académico, por lo que no
debe desconocerse su función técnica y consultiva. C. La modificación
corresponde exclusivamente al rector, quien orienta la ejecución del
PEI. D. La modificación solo puede ser realizada por los docentes del
área, pues la autonomía de cátedra excluye intervención de órganos
colegiados.

============================================================ PREGUNTA 28
— PRUEBAS DEL CONCURSO / PREPARACIÓN
============================================================ Un
aspirante decide estudiar exclusivamente artículos de memoria porque
considera que una prueba de aptitudes y competencias básicas debe medir
principalmente reproducción normativa. Otro aspirante organiza su
preparación alrededor de casos que exigen interpretar situaciones,
distinguir competencias institucionales y aplicar principios pedagógicos
y normativos.

Para una preparación diagnóstica robusta, ¿cuál estrategia resulta más
pertinente?

A. La primera, porque la precisión literal elimina la ambigüedad de las
preguntas situacionales. B. La segunda, complementada con dominio
conceptual y normativo, porque permite evaluar aplicación y toma de
decisiones además del recuerdo. C. Ambas son equivalentes siempre que
cubran el mismo número de normas. D. La primera para docentes de aula y
la segunda únicamente para cargos directivos.

============================================================ PREGUNTA 29
— INTEGRACIÓN NORMATIVA: EVALUACIÓN + INCLUSIÓN
============================================================ Una
estudiante con discapacidad no alcanza el desempeño esperado mediante el
instrumento habitual. El docente ha documentado barreras de acceso, pero
propone registrar desempeño bajo y esperar al siguiente período para
definir apoyos, argumentando que modificar condiciones después de
iniciado el período afectaría la objetividad.

¿Cuál actuación es más consistente con la articulación entre evaluación
e inclusión?

A. Registrar el resultado y esperar, porque los ajustes deben definirse
antes de comenzar el período para preservar igualdad. B. Analizar
oportunamente las barreras y evidencias, implementar los apoyos y
ajustes pertinentes y continuar el seguimiento del aprendizaje conforme
al sistema institucional de evaluación. C. Eliminar la calificación del
período y sustituirla por un concepto cualitativo hasta que se formule
el PIAR. D. Promover automáticamente a la estudiante mientras existan
barreras, porque estas impiden atribuirle responsabilidad por el
desempeño.

============================================================ PREGUNTA 30
— CASO INTEGRADOR: FUNCIÓN DOCENTE / EVALUACIÓN / CONVIVENCIA /
INCLUSIÓN ============================================================
En un curso, un estudiante ha disminuido su desempeño y participación.
Registra varias entregas incompletas, ha recibido comentarios
humillantes reiterados de compañeros y manifiesta que algunas
actividades digitales le resultan difíciles de utilizar. El docente
posee suficientes calificaciones para cerrar el período y considera que
intervenir en los demás aspectos corresponde a orientación y
coordinación.

¿Cuál actuación refleja de manera más completa la responsabilidad
profesional del docente?

A. Cerrar la valoración con las evidencias disponibles y remitir
separadamente convivencia y accesibilidad a las instancias competentes,
evitando mezclar dimensiones que poseen procedimientos diferentes. B.
Suspender toda valoración hasta que orientación, coordinación y la
familia determinen si los factores externos explican el desempeño
académico. C. Analizar integralmente las evidencias y barreras, activar
o comunicar los procedimientos de convivencia que correspondan, ajustar
la mediación y los apoyos dentro de su competencia y articular el
seguimiento con las instancias pertinentes. D. Mantener la planeación y
ofrecer una recuperación académica individual, pues modificar
simultáneamente evaluación, convivencia y accesibilidad podría alterar
la igualdad frente al resto del grupo.

============================================================ CLAVE DE
RESPUESTAS — USO DEL SISTEMA / ADMINISTRADOR
============================================================ 1. B 2. C
3. C 4. C 5. B 6. A 7. C 8. B 9. B 10. C 11. B 12. C 13. C 14. B 15. B
16. B 17. B 18. B 19. C 20. B 21. C 22. B 23. C 24. C 25. B 26. B 27. B
28. B 29. B 30. C

============================================================ MATRIZ
DIAGNÓSTICA ============================================================
EVALUACIÓN Y SIEE: Preguntas 1, 7, 12, 16, 20, 29 Puntaje máximo: 6

PEI, CURRÍCULO Y GOBIERNO ESCOLAR: Preguntas 2, 6, 9, 13, 18, 22, 23, 27
Puntaje máximo: 8

INCLUSIÓN EDUCATIVA: Preguntas 3, 10, 21, 26, 29, 30 Puntaje máximo: 6

CONVIVENCIA, DERECHOS Y DEBIDO PROCESO: Preguntas 4, 8, 11, 17, 24, 30
Puntaje máximo: 6

FUNCIÓN Y COMPETENCIAS DOCENTES: Preguntas 5, 14, 19, 25, 30 Puntaje
máximo: 5

PREPARACIÓN / APLICACIÓN EN CONTEXTO DE CONCURSO: Pregunta 28, además
del desempeño transversal en las 29 restantes.

============================================================ REGLA
DIAGNÓSTICA PROPUESTA
============================================================ Para cada
área: 85–100 %: Dominio fuerte. Mantener práctica de alta dificultad.
70–84 %: Dominio funcional. Reforzar cruces normativos y casos
complejos. 50–69 %: Riesgo medio. Estudio dirigido del tema + práctica
focalizada. Menos de 50 %: Debilidad prioritaria. Estudio
conceptual/normativo antes de nuevos simulacros generales.

Para el resultado global: 27–30 aciertos: desempeño sobresaliente en
este banco. 23–26 aciertos: desempeño alto, con brechas específicas por
identificar. 18–22 aciertos: desempeño intermedio; requiere ruta
focalizada. 13–17 aciertos: desempeño vulnerable; requiere
fortalecimiento estructurado. 0–12 aciertos: base insuficiente para este
nivel de dificultad; conviene reconstruir fundamentos antes de aumentar
complejidad.

NOTA DE DISEÑO El diagnóstico no debe depender solo del puntaje global.
Una pregunta puede pertenecer a más de un dominio; por eso, en la
aplicación, conviene guardar etiquetas múltiples por pregunta y calcular
el porcentaje de dominio por tema. La retroalimentación posterior debe
indicar qué estudiar, qué norma revisar y qué tipo de error cometió el
usuario (competencia institucional, procedimiento, principio pedagógico,
interpretación normativa o integración de evidencias).
