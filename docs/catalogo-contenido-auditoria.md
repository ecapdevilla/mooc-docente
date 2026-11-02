# Auditoría del contenido académico del catálogo de tres cursos

Estado: 2026-11-01. Documento de trabajo local. Describe exactamente el
contenido que instala el lote `20261101-catalogo-tres-cursos` y separa lo que
está completo de lo que requiere revisión académica antes de una publicación
comercial. No se modificó contenido ni se ejecutó nada en Production.

Reproducible con:

```bash
npm run contenido:catalogo          # tabla y semáforo por lección
npm run contenido:catalogo -- --json
```

El script lee `const MODULES` de `public/js/datos/modulos.js` (archivo de datos que
carga `indexInicial.html` desde la Etapa 1) con el mismo parser que
`scripts/generar-carga-catalogo.js`, de modo que mide exactamente lo que la
carga escribe en PostgreSQL (HTML con espacios colapsados).

## 1. Alcance instalado

| Curso | Módulos | Lecciones | Cuestionarios | Opciones | Badges |
| --- | --- | --- | --- | --- | --- |
| Fundamentos de Pedagogía y Didáctica | 2 | 3 | 3 | 12 | 2 |
| Legislación Educativa Colombiana | 1 | 2 | 2 | 8 | 1 |
| Inteligencia Artificial para Docentes | 6 | 6 | 6 | 24 | 6 |
| **Total** | **9** | **11** | **11** | **44** | **9** |

## 2. Medición por lección

`car.` = caracteres almacenados en `lessons.contenido` (HTML con espacios
colapsados); `pal.` = palabras de texto sin etiquetas; `sub.` = subtítulos
`<h3>/<h4>`; `ítems` = elementos de lista; `norm.` = citas a Ley/Decreto/
Resolución/CONPES; `expOk`/`expKo` = longitud de la retroalimentación correcta e
incorrecta.

| # | Curso | Módulo | Lección | car. | pal. | sub. | ítems | norm. | opc. | correcta | expOk | expKo | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pedagogía | Fundamentos de Pedagogía | ¿Qué es la Pedagogía? | 679 | 83 | 1 | 3 | 0 | 4 | B | 125 | 113 | Requiere revisión |
| 2 | Pedagogía | Fundamentos de Pedagogía | Estrategias didácticas para el aula | 736 | 79 | 1 | 4 | 0 | 4 | B | 89 | 63 | Requiere revisión |
| 3 | Pedagogía | Corrientes Pedagógicas | Corrientes pedagógicas contemporáneas | 864 | 95 | 1 | 4 | 0 | 4 | B | 90 | 101 | Requiere revisión |
| 4 | Legislación | Marco Normativo Colombiano | Ley General de Educación (Ley 115 de 1994) | 655 | 82 | 1 | 4 | 2 | 4 | B | 83 | 79 | Requiere revisión |
| 5 | Legislación | Marco Normativo Colombiano | Decreto 1278 de 2002: Estatuto Docente | 617 | 75 | 1 | 4 | 1 | 4 | B | 79 | 83 | Requiere revisión |
| 6 | IA | Fundamentos de IA en Educación | 1.1 Historia y fundamentos de la IA | 1261 | 144 | 2 | 7 | 0 | 4 | B | 171 | 158 | Completo |
| 7 | IA | Planificación con IA | 2.1 Prompts efectivos para planificar clases | 1084 | 123 | 2 | 7 | 0 | 4 | B | 117 | 127 | Completo |
| 8 | IA | Evaluación y Retroalimentación con IA | 3.1 Evaluación y retroalimentación con IA | 1140 | 126 | 2 | 7 | 0 | 4 | B | 120 | 142 | Completo |
| 9 | IA | Ética, Privacidad y Ciudadanía Digital con IA | 4.1 Ética, privacidad y uso responsable de la IA | 1174 | 139 | 2 | 6 | 2 | 4 | B | 130 | 159 | Completo |
| 10 | IA | Liderazgo Pedagógico y Escalabilidad con IA | 5.1 Liderazgo pedagógico con IA | 1208 | 139 | 2 | 7 | 0 | 4 | B | 147 | 148 | Completo |
| 11 | IA | Proyecto Integrador: IA Ética en Mi Práctica Docente | 6.1 Proyecto integrador: IA ética en mi práctica | 1104 | 137 | 1 | 5 | 0 | 4 | B | 147 | 172 | Completo |

Resumen: **6 lecciones completas**, **5 requieren revisión académica**.
Las 11 tienen contenido no vacío, 4 opciones y exactamente 1 correcta, y
retroalimentación en ambos sentidos.

## 3. Hallazgos que requieren decisión académica

1. **La respuesta correcta es la opción B en las 11 lecciones.** No es un error
   de datos (cada quiz tiene una sola correcta), pero es un patrón explotable:
   un estudiante puede acertar sin leer. Antes de publicar comercialmente debe
   variarse la posición de la respuesta correcta. Es una decisión de contenido
   académico, no un cambio técnico: la carga replica fielmente la fuente.
2. **Pedagogía y Legislación están por debajo del umbral editorial** (617–864
   caracteres almacenados, 3–4 ítems, sin tablas). Sirven como material
   introductorio, no como contenido de curso vendible. Requieren ampliación:
   más ejemplos de aula, casos y actividad práctica.
3. **Citas normativas escasas.** Solo tres lecciones citan una norma con
   número (Ley 115 dos veces, Decreto 1278 una). Para un producto de
   preparación de concursos de mérito, las lecciones de Legislación deberían
   citar artículo y jurisdicción de forma verificable, y las de Pedagogía
   referenciar autores o lineamientos del MEN.
4. **Los seis módulos del curso de IA tienen una sola lección cada uno.** El
   curso se ve completo en la navegación, pero la densidad es baja: cada módulo
   es un tema con una lectura. Se recomienda 2–4 lecciones por módulo antes de
   ofrecerlo como curso intermedio.
5. **No se usan tablas comparativas** en ninguna lección, aunque el contenido
   se presta para ello (corrientes pedagógicas, normas, herramientas de IA).
6. **Contenido sin fecha de revisión ni autoría.** Para uso comercial conviene
   registrar versión, fecha y responsable académico de cada lección; hoy la
   única trazabilidad es el lote `catalog_load_batches`/`catalog_load_items` y
   el propio `public/js/datos/modulos.js`.

## 4. Badges: por qué se crean nueve

La carga crea un badge por módulo (`badges.nombre`, `descripcion =
"Badge obtenido al completar <módulo>"`), tomando nombre, icono y color del
`badge` declarado en cada módulo de `public/js/datos/modulos.js`:

| Curso | Badge |
| --- | --- |
| Fundamentos de Pedagogía y Didáctica | Pedagogo Inicial, Pensador |
| Legislación Educativa Colombiana | Conocedor Normativo |
| Inteligencia Artificial para Docentes | Explorador IA, Planificador IA, Evaluador IA, Guardián Ético, Líder IA, Practicante IA |

Comprobaciones:

- **No hay recompensas engañosas**: el badge no otorga puntos, certificados,
  insignias verificables ni acceso a contenido; es una marca de avance del
  módulo, igual que en el prototipo.
- **No se otorgan automáticamente**: se crean las definiciones en `badges`; la
  fila en `user_badges` solo aparece cuando el usuario completa el módulo.
- **Son alcanzables**: cada badge cuelga de un módulo con lecciones activas y
  cuestionarios publicados. Si un módulo se desactiva (reversión segura), el
  badge deja de ser alcanzable pero no se borra el ya obtenido.
- **No se duplican**: la inserción usa `WHERE NOT EXISTS` por
  `(modulo_id, nombre)`; reejecutar la carga no crea badges repetidos.
- **Riesgo comercial**: un badge por módulo con una sola lección (curso de IA)
  puede percibirse como recompensa inflada. Se recomienda exigir el
  cuestionario para completar el módulo antes de comunicarlo como logro.

## 5. Pendientes antes de la publicación comercial

| Pendiente | Responsable | Bloquea |
| --- | --- | --- |
| Variar la posición de la respuesta correcta en las 11 lecciones | Académico | Sí (integridad de la evaluación) |
| Ampliar Pedagogía y Legislación a ≥1000 caracteres con ejemplos | Académico | Sí (calidad percibida) |
| Citar norma y artículo en las lecciones de Legislación | Académico | Recomendado |
| Añadir 2–4 lecciones por módulo en el curso de IA | Académico | No (pero afecta el precio) |
| Definir si el badge exige cuestionario aprobado | Producto | No |
| Registrar autoría, fecha y versión de cada lección | Producto | Recomendado |
| Revisar el mapeo de los 50 ítems del diagnóstico piloto | Académico | No (es otro curso) |

