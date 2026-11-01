# Guion de demostración — MÉRITO DOCENTE / Areandina Impulsa

**Uso:** material de preparación. Describe lo que el código del repositorio ofrece; no acredita usuarios participantes, métricas de piloto, ventas ni validación externa. Revisar la interfaz y el despliegue vigentes antes de presentar capturas.

## Recorrido propuesto: Diagnosticar → Aprender → Practicar → Mejorar

### 1. Diagnosticar

Mostrar el acceso al diagnóstico piloto de 50 preguntas, con 200 alternativas previstas por el contrato funcional. Explicar que el examen es privado y **no oficial**; la ruta exige código de acceso configurado. No mostrar claves antes del envío ni iniciar intentos de Production durante ensayos de presentación.

### 2. Aprender

Mostrar el panel de cursos y la navegación por módulos/lecciones de `indexInicial.html`. El contenido y progreso de cursos existen en una combinación de frontend/API; indicar con precisión qué se ejecuta en el entorno de la demostración y evitar describir como migrado a PostgreSQL el contenido que siga siendo local.

### 3. Practicar

Demostrar un quiz de lección o el simulacro autenticado post-login si está disponible en el entorno. En el caso del diagnóstico, las preguntas se obtienen del backend y la calificación ocurre en servidor. No confundir la interfaz de práctica con una evaluación oficial de selección.

### 4. Mejorar

Usar una respuesta de demostración previamente finalizada en un entorno de prueba para mostrar aciertos, desempeño por categoría y retroalimentación individual. No fabricar resultados: anotar si la captura procede de datos sintéticos, de una cuenta de prueba o de un piloto autorizado.

## Estado funcional que se puede comunicar

- **Implementado en código:** login/registro y rutas protegidas; cursos/progreso; diagnóstico piloto de 50 preguntas con inicio, envío, calificación y persistencia; resultados con análisis por categoría y retroalimentación; módulo editorial de borradores y auditoría en desarrollo local.
- **No habilitado aún en Production:** migración editorial y administrador académico; flujo de publicación/versionado de banco; despliegue del editor.
- **Pendiente de validar o ampliar:** revisión académica individual del banco activo, cobertura por convocatoria con fuentes oficiales vigentes, prueba completa con docentes, métricas observadas del piloto, y estado de publicación/despliegue de cada cambio.

Antes de una demo externa, verificar el deployment actualmente activo y retirar de las diapositivas cualquier promesa de características no presentes en esa versión.

## Guion breve (4–5 minutos)

1. **30 s — Propósito:** “MÉRITO DOCENTE busca acompañar la preparación con diagnóstico, aprendizaje, práctica y retroalimentación. Es una herramienta independiente; no reemplaza información oficial ni promete resultados de concurso.”
2. **60 s — Diagnóstico:** recorrer instrucción, pregunta situacional, alternativas y avance; no revelar claves.
3. **60 s — Aprendizaje:** abrir un curso, módulo y lección; mostrar cómo regresar al panel.
4. **60 s — Mejora:** presentar resultados de un intento ya finalizado y explicar una recomendación basada en sus categorías reales.
5. **60 s — Evolución editorial:** mostrar solo en entorno local de revisión el borrador, las cuatro opciones, justificación, alertas heurísticas y auditoría. Aclarar que el editor no publica versiones.
6. **30 s — Pregunta de cierre:** solicitar retroalimentación sobre claridad, utilidad y barreras de uso, no una valoración de “aprobación CNSC”.

## Indicadores para un piloto con diez docentes

No hay resultados recopilados en este documento. Con consentimiento y minimización de datos, acordar antes de invitar participantes:

- invitaciones, inicios y finalizaciones; abandonos por etapa;
- duración observada y problemas técnicos, incluyendo dispositivo/navegador si se recogen;
- respuestas omitidas y distribución agregada de aciertos por categoría;
- claridad percibida de enunciados, opciones y explicaciones mediante encuesta breve;
- utilidad percibida para orientar estudio, no como pronóstico de concurso;
- accesibilidad: teclado, lector de pantalla, legibilidad y uso móvil;
- solicitudes de corrección académica, referencias por verificar y alertas heurísticas revisadas;
- consentimiento, retención, acceso, anonimización y eliminación de datos del piloto.

Reportar denominadores y datos faltantes; con diez participantes usar cifras descriptivas, no inferir eficacia ni generalizar a la población aspirante. No publicar nombres, respuestas individuales ni resultados identificables sin autorización.

## Capturas reales que conviene actualizar

1. Inicio del diagnóstico y aviso de no oficialidad.
2. Pregunta en computador y en celular, sin acceso a la clave.
3. Resumen de resultados y gráfico por categorías con datos de un intento consentido o claramente sintético.
4. Curso, lección y quiz disponibles en el deployment que se presenta.
5. Flujo de regreso al panel manteniendo sesión.
6. Para una revisión técnica interna, editor local de borradores e historial; no presentarlo como publicado.

Registrar fecha, rama/deployment, viewport y tipo de dato mostrado. Difuminar correo, token, códigos de acceso y cualquier información personal antes de compartir capturas.
