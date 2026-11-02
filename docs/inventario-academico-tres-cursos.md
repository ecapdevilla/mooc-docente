# Inventario académico de los tres cursos

**Fecha:** 2026-11-01
**Rama de trabajo:** `feat/learning-experience-2` (base `ca80549`, publicada en Production)
**Alcance:** Fundamentos de Pedagogía y Didáctica, Legislación Educativa Colombiana e Inteligencia Artificial para Docentes.

Este inventario distingue de forma explícita tres niveles de certeza:

- **A. Contenido en código** — lo que el repositorio define y puede verificarse sin base de datos.
- **B. Contenido confirmado en base de datos** — lo que el seed idempotente garantiza *si* se ejecutó sobre el entorno, más lo que la API devuelve en tiempo de ejecución.
- **C. Contenido pendiente o inexistente** — lo que hay que producir editorialmente.

> **Restricción respetada:** en esta sesión no se ejecutaron consultas de escritura ni lectura directa contra Supabase Production. El nivel B se apoya en `src/seed/data.sql` (idempotente) y en la forma documentada de las respuestas de `GET /api/v1/courses` y `GET /api/v1/courses/:id`. La verificación en vivo debe hacerse con un `SELECT` de solo lectura cuando exista una sesión autorizada.

---

## 1. Modelo de datos realmente disponible

`database/schema.sql` define:

| Tabla | Columnas relevantes | Qué aporta a la experiencia |
| --- | --- | --- |
| `courses` | `id`, `titulo`, `area`, `nivel`, `descripcion`, `icono`, `imagen_portada`, `activo` | Encabezado del curso, área, nivel, descripción e iconografía |
| `modules` | `id`, `curso_id`, `titulo`, `descripcion`, `orden`, `badge_nombre`, `badge_icono`, `badge_color` | Ruta de aprendizaje y encabezado del módulo |
| `lessons` | `id`, `modulo_id`, `titulo`, `descripcion`, `contenido`, `orden`, `tiene_quiz` | Lista de lecciones y contenido base |
| `quizzes` / `quiz_options` | `pregunta`, `explicacion_correcta`, `explicacion_incorrecta`, `opcion`, `es_correcta`, `orden` | Actividad de comprobación por lección |
| `user_progress` | `usuario_id`, `leccion_id`, `completada`, `puntaje` | Progreso real persistido por lección |
| `enrollments` | `usuario_id`, `curso_id`, `progreso_total` | Matrícula (se crea automáticamente al completar una lección) |
| `course_completion_rules` | `regla` JSONB | Regla de finalización; **no se usa hoy en el frontend** |

**No existen columnas** para: objetivos de módulo, competencias, resultados de aprendizaje, duración estimada, bibliografía, prerrequisitos ni reglas de bloqueo secuencial. Cualquier pantalla que los necesite debe mostrar un estado editorial pendiente, nunca contenido inventado.

---

## 2. Inventario A — contenido definido en el repositorio

### 2.1 Fundamentos de Pedagogía y Didáctica (referencia de implementación)

| Módulo (seed) | Orden | Lección | Orden | Contenido SPA | Quiz SPA |
| --- | --- | --- | --- | --- | --- |
| Fundamentos de Pedagogía | 1 | ¿Qué es la Pedagogía? | 1 | Sí (rico) | Sí |
| Fundamentos de Pedagogía | 1 | Estrategias didácticas para el aula | 2 | Sí (rico) | Sí |
| Corrientes Pedagógicas | 2 | Corrientes pedagógicas contemporáneas | 1 | Sí (rico) | Sí |

- Totales reales: **2 módulos, 3 lecciones**.
- El seed carga `contenido` como resumen de una frase; el SPA contiene el desarrollo completo (párrafos, listas, caja de dato clave).
- El SPA presenta las lecciones en otro orden (`¿Qué es la Pedagogía?`, `Corrientes`, `Estrategias`); el emparejamiento actual es **por título**, no por orden, por lo que el mapeo es correcto pero la agrupación por módulo difiere de la secuencia del prototipo.

### 2.2 Legislación Educativa Colombiana

| Módulo (seed) | Orden | Lección | Orden | Contenido SPA | Quiz SPA |
| --- | --- | --- | --- | --- | --- |
| Marco Normativo Colombiano | 1 | Ley General de Educación (Ley 115 de 1994) | 1 | Sí | Sí |
| Marco Normativo Colombiano | 1 | Decreto 1278 de 2002: Estatuto Docente | 2 | Sí | Sí |
| Constitución y Legislación | 2 | Constitución Política de Colombia | 1 | **No** | No |

- Totales reales: **2 módulos, 3 lecciones**.
- La lección `Constitución Política de Colombia` existe en la base de datos pero **no tiene contenido ni quiz en el SPA**. Debe mostrarse como *contenido en preparación*, sin botón que finja abrirla.

### 2.3 Inteligencia Artificial para Docentes

| Módulo (seed) | Orden | Lección | Contenido SPA | Quiz SPA |
| --- | --- | --- | --- | --- |
| Fundamentos de IA en Educación | 1 | 1.1 Historia y fundamentos de la IA | Sí | Sí |
| Planificación con IA | 2 | 2.1 Prompts efectivos para planificar clases | Sí | Sí |
| Evaluación y Retroalimentación con IA | 3 | 3.1 Evaluación y retroalimentación con IA | Sí | Sí |
| Ética, Privacidad y Ciudadanía Digital con IA | 4 | 4.1 Ética, privacidad y uso responsable de la IA | Sí | Sí |
| Liderazgo Pedagógico y Escalabilidad con IA | 5 | 5.1 Liderazgo pedagógico con IA | Sí | Sí |
| Proyecto Integrador: IA Ética en Mi Práctica Docente | 6 | 6.1 Proyecto integrador: IA ética en mi práctica | Sí | Sí |

- Totales reales: **6 módulos, 6 lecciones**. Correspondencia 1:1 entre módulo del seed y lección del SPA.

### 2.4 Curso adicional en base de datos, fuera del SPA

`Evaluación Educativa y Autonomía Institucional` (área Evaluación Educativa, nivel Avanzado): **1 módulo y 13 lecciones** según el seed, con banco de preguntas avanzado (50 preguntas del diagnóstico piloto). No aparece en el dashboard porque el SPA solo conoce tres cursos. **No se modifica ni se duplica**; se documenta para evitar que se interprete como error de datos.

---

## 3. Inventario B — estructura que la API entrega hoy

`GET /api/v1/courses` devuelve `{ courses: [{ id, titulo, area, nivel, descripcion, icono, modulo_count, lesson_count, ... }] }` ordenado por `id ASC`.

`GET /api/v1/courses/:id` devuelve `{ course: { ..., modulos: [{ id, titulo, descripcion, orden, badge_*, lecciones: [{ id, titulo, descripcion, contenido, orden, quizzes: [...] }] }] } }`.

`GET /api/v1/progress` devuelve, por módulo, `totalLessons`, `completedLessons`, `percent`, `completed` y `lessons: [{ id, modulo_id, titulo, orden, completada }]`, además de `globalProgress` y `badges`.

Consecuencias para la interfaz:

1. La vista de curso puede informar **módulos y lecciones reales** usando `modulo_count` y `lesson_count` (o la longitud de los arreglos del detalle).
2. La vista de módulo puede usar el **título y la descripción reales** del módulo, hoy descartados por `loadCourseMap`.
3. El progreso por lección debe seguir viniendo de `user_progress` (no de contadores locales) cuando hay sesión.
4. La API **no** expone objetivos, competencias, duración ni bibliografía: esas secciones deben declararse pendientes.

### 3.1 Estado de correspondencia SPA ↔ base de datos

| Curso SPA | Curso DB (título exacto) | Módulos DB | Lecciones DB | Lecciones SPA mapeadas | Observación |
| --- | --- | --- | --- | --- | --- |
| Fundamentos de Pedagogía y Didáctica | Igual | 2 | 3 | 3/3 | Mapeo por título correcto; orden de módulos distinto al prototipo |
| Legislación Educativa Colombiana | Igual | 2 | 3 | 2/3 | Falta contenido SPA para `Constitución Política de Colombia` |
| Inteligencia Artificial para Docentes | Igual | 6 | 6 | 6/6 | Correspondencia completa |

El emparejamiento se resuelve en tiempo de ejecución con `normalizeLessonTitle`; los IDs numéricos **no se codifican** en el HTML.

---

## 4. Inventario C — pendientes reales de contenido

| Necesidad | Estado | Impacto en la nueva interfaz |
| --- | --- | --- |
| Objetivos por módulo | No existen en el esquema | El módulo muestra resumen + panel "objetivos en curación" |
| Competencias y resultados de aprendizaje por curso | No existen | Se muestra estado editorial pendiente, sin afirmaciones inventadas |
| Duración estimada | No existe | Se omite deliberadamente; no se muestra un tiempo falso |
| Bibliografía y enlaces verificables | Parcial (menciones normativas dentro del texto) | Componente `.lx-biblio` preparado, sin entradas inventadas |
| Contenido de `Constitución Política de Colombia` | Ausente en el SPA | Fila "en preparación", sin acción |
| Actividades más allá del quiz | Solo quiz de una pregunta | Componentes `.lx-activity` y `.lx-reflection` preparados, sin botones falsos |
| Evaluaciones por módulo | No existen | No se muestran |
| Imágenes de lección | No existen | `.lx-figure` preparado |

---

## 5. Problemas reales detectados en la presentación anterior

1. **La "vista de curso" no existía.** `startModule` abría directamente la primera lección; el aspirante nunca veía la descripción, el nivel, el área, la ruta ni los totales reales.
2. **No existía vista de módulo.** La agrupación por módulo de la base de datos se descartaba (`loadCourseMap` guardaba solo IDs), de modo que la jerarquía curso → módulo → lección era invisible.
3. **La lección era un bloque único de texto** con un encabezado genérico: sin contexto de curso/módulo, sin índice, sin navegación persistente y con el quiz incrustado sin jerarquía.
4. **El estado del curso se reducía a una tarjeta** con porcentaje; no había distinción visual entre lección completada, lección actual y lección pendiente dentro del recorrido.
5. **No había estados vacíos ni de datos faltantes**: una lección sin contenido o un curso sin correspondencia se renderizaban como si existieran.
6. **Riesgo de sincronización:** si `GET /courses` no devuelve los tres cursos, `loadCourseMap` deja `courseId: null` y el progreso se degrada a local. La nueva interfaz debe mostrarlo sin bloquear el estudio.
7. **Advertencias conocidas:** consultas vacías de cursos en Production y avisos de `loadCourseMap` para los tres cursos. Preexistentes, no introducidas por este trabajo.

---

## 6. Contrato de datos de la nueva experiencia

El frontend construye un modelo de presentación a partir de tres fuentes: `MODULES` (contenido didáctico), `state.courseMap` (IDs reales) y `state.progress` (avance).

```text
curso  { idSpa, titulo, area, nivel, descripcion, icono,
         idApi, modulos[], totalLecciones, leccionesCompletadas, porcentaje, estado }

modulo { id, titulo, descripcion, orden, badge, lecciones[], porcentaje, estado,
         origen: 'api' | 'local' }

leccion{ index, titulo, descripcion, contenido, quiz, tieneContenido,
         idApi, moduloId, completada, esActual, enPreparacion }
```

Reglas:

- `estado` solo puede ser `nuevo`, `en-curso` o `completado`. **No se implementa estado bloqueado** porque no existe una regla real de bloqueo.
- Si no hay correspondencia con la API, `origen: 'local'` y el curso se agrupa en un módulo único llamado "Ruta del curso"; el avance sigue siendo local y se informa al usuario.
- Las lecciones de la API sin contenido en el SPA se marcan `enPreparacion` y no ofrecen acción.

---

## 7. Lo que necesitará el diseñador académico

1. Un campo o convención para **objetivos de módulo** y **resultados de aprendizaje** del curso (hoy no existen en el esquema).
2. Contenido completo para `Constitución Política de Colombia` y revisión de la cobertura de quizzes.
3. Sustento documental de cualquier **duración estimada** antes de mostrarla.
4. Bibliografía verificable por lección si se quiere activar `.lx-biblio`.
5. Confirmación de que el seed sigue siendo la fuente de carga mientras no exista el editor/importador de contenidos.

> Este documento no modifica la base de datos ni el seed: describe el estado y define el contrato que consume la nueva interfaz.



