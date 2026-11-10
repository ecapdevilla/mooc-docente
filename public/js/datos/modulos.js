/**
 * SPA MéritoDocente · Datos publicados del catálogo (MODULES).
 *
 * Archivo clásico (sin módulos ES ni bundler) cargado por indexInicial.html
 * en el orden declarado. Conserva el código original de la Etapa 1.
 * Ver docs/arquitectura-frontend.md.
 */
    /* ============================================================
       DATOS: MÓDULOS CON LECCIONES Y QUIZZES
    ============================================================ */
    const MODULES = [
      {
        id: 'mod1',
        title: 'Fundamentos de Pedagogía y Didáctica',
        area: 'Pedagogía y Didáctica',
        level: 'Básico',
        levelClass: 'level-basico',
        cover: 'cover-mod1',
        icon: 'fas fa-chalkboard-teacher',
        description: 'Domina los conceptos esenciales de la pedagogía moderna y las estrategias didácticas para el aula. Repasa las principales corrientes pedagógicas y su aplicación práctica.',
        badge: { name: 'Pedagogo Inicial', icon: 'fas fa-chalkboard-teacher', color: 'gold' },
        lessons: [
          {
            title: '¿Qué es la Pedagogía?',
            content: `
              <p>La <strong>pedagogía</strong> es la ciencia que estudia la educación como fenómeno social y humano. No se limita a la escuela: abarca todos los procesos formativos que ocurren a lo largo de la vida.</p>
              <h4>Conceptos clave</h4>
              <ul>
                <li><strong>Educación:</strong> proceso permanente de formación integral del ser humano.</li>
                <li><strong>Pedagogía:</strong> reflexión teórica sobre la educación y sus métodos.</li>
                <li><strong>Didáctica:</strong> el arte y la ciencia de enseñar, centrada en el cómo.</li>
              </ul>
              <div class="info-box"><strong>Dato clave:</strong> en el concurso docente se evalúa la capacidad de fundamentar tu práctica en teorías pedagógicas sólidas.</div>
            `,
            quiz: {
              question: '¿Cuál es la diferencia central entre pedagogía y didáctica?',
              options: [
                'La pedagogía solo se aplica en primaria y la didáctica en secundaria.',
                'La pedagogía reflexiona sobre la educación; la didáctica se enfoca en el cómo enseñar.',
                'Son sinónimos exactos y se usan indistintamente.',
                'La didáctica es teórica y la pedagogía es práctica.'
              ],
              correct: 1,
              feedbackOk: '¡Excelente! La pedagogía es la reflexión sobre la educación, mientras la didáctica se centra en las estrategias de enseñanza.',
              feedbackKo: 'Casi. Recuerda: la pedagogía reflexiona sobre la educación en general; la didáctica se enfoca en el cómo enseñar.'
            }
          },
          {
            title: 'Corrientes pedagógicas contemporáneas',
            content: `
              <p>Conocer las principales corrientes pedagógicas te permite fundamentar tus decisiones en el aula y responder preguntas del concurso con argumentos sólidos.</p>
              <h4>Corrientes principales</h4>
              <ul>
                <li><strong>Constructivismo (Piaget, Vygotsky):</strong> el estudiante construye su conocimiento a partir de la interacción con el entorno.</li>
                <li><strong>Escuela Nueva:</strong> el niño es el centro del proceso, con aprendizaje activo y participativo.</li>
                <li><strong>Pedagogía crítica (Freire):</strong> la educación como práctica de libertad y transformación social.</li>
                <li><strong>Aprendizaje significativo (Ausubel):</strong> se aprende cuando el nuevo contenido se conecta con saberes previos.</li>
              </ul>
              <div class="info-box"><strong>Tip de examen:</strong> identifica el autor y el principio central de cada corriente. Son preguntas frecuentes.</div>
            `,
            quiz: {
              question: 'Según Ausubel, el aprendizaje significativo ocurre cuando:',
              options: [
                'El estudiante memoriza sin comprender.',
                'El nuevo contenido se relaciona con los saberes previos del estudiante.',
                'El docente expone sin participación del estudiante.',
                'Se evalúa únicamente con pruebas estandarizadas.'
              ],
              correct: 1,
              feedbackOk: '¡Correcto! El aprendizaje significativo conecta lo nuevo con lo que el estudiante ya sabe.',
              feedbackKo: 'Revisa: Ausubel plantea que el aprendizaje es significativo cuando se ancla en conocimientos previos.'
            }
          },
          {
            title: 'Estrategias didácticas para el aula',
            content: `
              <p>Las estrategias didácticas son el conjunto de decisiones que toma el docente para favorecer el aprendizaje. Deben ser variadas, intencionadas y contextualizadas.</p>
              <h4>Ejemplos prácticos</h4>
              <ul>
                <li><strong>Aprendizaje basado en proyectos:</strong> los estudiantes resuelven problemas reales.</li>
                <li><strong>Aula invertida:</strong> el contenido se estudia en casa y se practica en clase.</li>
                <li><strong>Gamificación:</strong> uso de elementos de juego para motivar.</li>
                <li><strong>Debate dirigido:</strong> desarrolla pensamiento crítico y argumentación.</li>
              </ul>
              <div class="info-box"><strong>Recuerda:</strong> no hay una estrategia mejor que otra; la clave está en la intencionalidad pedagógica y el contexto.</div>
            `,
            quiz: {
              question: '¿Qué caracteriza al aprendizaje basado en proyectos?',
              options: [
                'Los estudiantes memorizan contenidos para el examen.',
                'Los estudiantes resuelven problemas reales y desarrollan competencias.',
                'El docente dicta la clase sin participación.',
                'Se evalúa solo con pruebas escritas.'
              ],
              correct: 1,
              feedbackOk: '¡Muy bien! El ABP parte de problemas reales y desarrolla competencias en los estudiantes.',
              feedbackKo: 'El ABP se centra en resolver problemas reales, no en memorizar.'
            }
          },
          {
            title: 'L4. Didáctica activa y aprendizaje significativo',
            content: `
              <p><strong>Caso:</strong> Laura enseña sexto grado. Nota que sus estudiantes memorizan definiciones para la prueba, pero no saben aplicar los conceptos en situaciones reales de su comunidad.</p>
              <h4>🗺️ Mapa conceptual: de la teoría a la práctica</h4>
              <div class="info-box">
                <strong>Objetivo de aprendizaje</strong> → <strong>Estrategia didáctica</strong> → <strong>Actitud de aula</strong> → <strong>Evidencia de aprendizaje</strong>
              </div>
              <h4>Clase tradicional vs. Clase activa</h4>
              <table style="width:100%; border-collapse: collapse; margin: 12px 0;">
                <tr style="background:#f4f6f8;">
                  <th style="text-align:left; border:1px solid #ccc; padding:8px;">Elemento</th>
                  <th style="text-align:left; border:1px solid #ccc; padding:8px;">Tradicional</th>
                  <th style="text-align:left; border:1px solid #ccc; padding:8px;">Activa (significativa)</th>
                </tr>
                <tr>
                  <td style="border:1px solid #ccc; padding:8px;"><strong>Rol del docente</strong></td>
                  <td style="border:1px solid #ccc; padding:8px;">Explica y transmite conocimiento.</td>
                  <td style="border:1px solid #ccc; padding:8px;">Diseña situaciones y guía la construcción del estudiante.</td>
                </tr>
                <tr>
                  <td style="border:1px solid #ccc; padding:8px;"><strong>Rol del estudiante</strong></td>
                  <td style="border:1px solid #ccc; padding:8px;">Escucha y repite.</td>
                  <td style="border:1px solid #ccc; padding:8px;">Investiga, resuelve problemas y crea.</td>
                </tr>
                <tr>
                  <td style="border:1px solid #ccc; padding:8px;"><strong>Evaluación</strong></td>
                  <td style="border:1px solid #ccc; padding:8px;">Prueba escrita al final.</td>
                  <td style="border:1px solid #ccc; padding:8px;">Rúbricas, portafolios y desempeño en tareas reales.</td>
                </tr>
              </table>
              <div class="info-box"><strong>Dato clave del concurso:</strong> el aprendizaje significativo (Ausubel) ocurre cuando lo nuevo se conecta con los saberes previos del estudiante. No es "entretenimiento", es intención pedagógica.</div>
            `,
            quiz: {
              question: 'Laura diseña una clase de ciencias sobre el ciclo del agua. En lugar de solo explicar, lleva a los estudiantes a observar charcos, medir temperatura y dibujar el proceso en su entorno. ¿Qué principio didáctico aplica principalmente?',
              options: [
                'Memorización repetitiva para asegurar la respuesta correcta en la prueba.',
                'Conexión del nuevo conocimiento con los saberes previos y el contexto real de los estudiantes.',
                'Evaluación únicamente con pruebas escritas al final de la unidad.',
                'El docente explica todo el contenido y los estudiantes toman notas.'
              ],
              correct: 1,
              feedbackOk: 'Correcto. Es aprendizaje significativo: ancla lo nuevo en lo que el estudiante ya sabe y vive.',
              feedbackKo: 'A, C y D son enfoques tradicionales que no garantizan comprensión ni transferencia a la vida real.'
            }
          },
          {
            title: 'L5. Evaluación formativa y retroalimentación',
            content: `
              <p><strong>Caso:</strong> Carlos aplica una evaluación y el 60 % del grupo no alcanza el desempeño esperado. La familia pregunta por la nota final y Carlos no sabe si avanzar o reforzar.</p>
              <h4>🗺️ Mapa conceptual: tipos de evaluación</h4>
              <div class="info-box">
                <strong>Diagnóstico</strong> (inicio) → <strong>Formativo</strong> (durante) → <strong>Sumativo</strong> (cierre)
              </div>
              <h4>3 preguntas para retroalimentar bien</h4>
              <ul>
                <li>¿Qué logró el estudiante?</li>
                <li>¿Qué le falta por mejorar y por qué?</li>
                <li>¿Qué hará la próxima vez para avanzar?</li>
              </ul>
              <div class="info-box"><strong>Norma clave:</strong> Decreto 1290 de 2009 señala que la evaluación institucional es permanente y formativa; debe reorientar procesos, no solo calificar. [VERIFICAR arts. 3 y 4]</div>
            `,
            quiz: {
              question: 'Carlos quiere usar la evaluación formativa para mejorar los aprendizajes, no solo para calificar. ¿Qué acción es más coherente con este enfoque?',
              options: [
                'Anunciar la nota final sin explicar los errores, para que el estudiante asuma responsabilidad.',
                'Entregar una rúbrica con fortalezas, dificultades específicas y una actividad de mejora concreta antes de la próxima valoración.',
                'Suspender la materia al grupo entero hasta que todos aprueben una prueba de recuperación.',
                'Ignorar los resultados bajos y continuar con el siguiente tema según el cronograma.'
              ],
              correct: 1,
              feedbackOk: 'Correcto. La retroalimentación debe ser formativa: identificar fortalezas, dificultades y pasos concretos de mejora.',
              feedbackKo: 'A, C y D convierten la evaluación en castigo o trámite administrativo, sin función pedagógica de apoyo.'
            }
          },
          {
            title: 'L6. Gestión del aula y convivencia desde la didáctica',
            content: `
              <p><strong>Caso:</strong> En el recreo, dos estudiantes de quinto tienen un conflicto físico. La docente debe decidir si aplica solo la sanción del manual o diseña una estrategia pedagógica de reparación.</p>
              <h4>🗺️ Mapa conceptual: convivencia en el aula</h4>
              <div class="info-box">
                <strong>Reglas claras</strong> → <strong>Rutinas positivas</strong> → <strong>Relaciones de confianza</strong> → <strong>Reparación del daño</strong>
              </div>
              <h4>Lo que NO es una estrategia didáctica de convivencia</h4>
              <ul>
                <li>Castigar públicamente para dar ejemplo.</li>
                <li>Ignorar el conflicto para que "se les pase".</li>
                <li>Sancionar sin escuchar las versiones de los involucrados.</li>
              </ul>
              <div class="info-box"><strong>Norma clave:</strong> Ley 1620 de 2013 establece la Ruta de Atención Integral con componentes de promoción, prevención, atención y seguimiento. [VERIFICAR arts. 29 y 30]</div>
            `,
            quiz: {
              question: 'Ante un conflicto físico entre estudiantes en el recreo, ¿cuál actuación es más pertinente desde una gestión didáctica del aula?',
              options: [
                'Aplicar la sanción máxima del manual inmediatamente para cerrar el caso rápido.',
                'Escuchar las versiones, activar la ruta de convivencia del manual, definir medidas de reparación y hacer seguimiento con las familias.',
                'Ignorar el hecho porque ocurrió en el recreo y no es competencia del docente de aula.',
                'Publicar los nombres de los involucrados en el grupo de padres para transparencia.'
              ],
              correct: 1,
              feedbackOk: 'Correcto. Escuchar, activar ruta institucional, reparar y hacer seguimiento protege derechos y cumple con debido proceso.',
              feedbackKo: 'A es castigo sin proceso, C omite el deber de cuidado, y D vulnera la confidencialidad y el debido proceso.'
            }
          }
        ]
      },
      {
        id: 'mod2',
        title: 'Legislación Educativa Colombiana',
        area: 'Legislación Educativa',
        level: 'Básico',
        levelClass: 'level-basico',
        cover: 'cover-mod2',
        icon: 'fas fa-gavel',
        description: 'Estudia el marco normativo de la educación en Colombia: Ley General de Educación, decretos reglamentarios y las normas clave para el concurso docente.',
        badge: { name: 'Conocedor Normativo', icon: 'fas fa-gavel', color: 'green' },
        lessons: [
          {
            title: 'Ley General de Educación (Ley 115 de 1994)',
            content: `
              <p>La <strong>Ley 115 de 1994</strong> es el marco normativo principal del sistema educativo colombiano. Define los fines de la educación, los niveles, los actores y las responsabilidades.</p>
              <h4>Puntos clave</h4>
              <ul>
                <li>Define la educación como un proceso de formación permanente.</li>
                <li>Establece los niveles: preescolar, básica (primaria y secundaria) y media.</li>
                <li>Crea el gobierno escolar y el proyecto educativo institucional (PEI).</li>
                <li>Regula la educación formal, no formal e informal.</li>
              </ul>
              <div class="info-box"><strong>Dato clave:</strong> la Ley 115 es la norma más preguntada en el componente normativo del concurso.</div>
            `,
            quiz: {
              question: '¿Qué establece la Ley General de Educación (Ley 115 de 1994)?',
              options: [
                'Solo el calendario escolar.',
                'Los fines de la educación, niveles y actores del sistema educativo colombiano.',
                'Únicamente el salario de los docentes.',
                'El régimen disciplinario de los estudiantes.'
              ],
              correct: 1,
              feedbackOk: '¡Correcto! La Ley 115 define los fines, niveles y estructura del sistema educativo.',
              feedbackKo: 'La Ley 115 es el marco general: fines, niveles y actores del sistema educativo.'
            }
          },
          {
            title: 'Decreto 1278 de 2002: Estatuto Docente',
            content: `
              <p>El <strong>Decreto 1278 de 2002</strong> regula el Estatuto de Profesionalización Docente. Es fundamental para entender el concurso de méritos y la carrera docente.</p>
              <h4>Puntos clave</h4>
              <ul>
                <li>Establece el concurso de méritos como mecanismo de ingreso.</li>
                <li>Define los niveles: Escalafón docente con grados y niveles.</li>
                <li>Regula la evaluación de desempeño y las competencias docentes.</li>
                <li>Determina los derechos y deberes de los docentes oficiales.</li>
              </ul>
              <div class="info-box"><strong>Importante:</strong> este decreto es la base normativa del concurso al que te estás preparando.</div>
            `,
            quiz: {
              question: '¿Qué regula principalmente el Decreto 1278 de 2002?',
              options: [
                'El calendario académico.',
                'El Estatuto de Profesionalización Docente y el concurso de méritos.',
                'Los impuestos de las instituciones educativas.',
                'El transporte escolar.'
              ],
              correct: 1,
              feedbackOk: '¡Excelente! El Decreto 1278 regula la carrera docente y el concurso de méritos.',
              feedbackKo: 'El Decreto 1278 es el Estatuto Docente: regula la carrera y el concurso de méritos.'
            }
          },
          {
            title: 'L1. Ruta de atención y convivencia escolar (Ley 1620 de 2013)',
            content: `
              <p><strong>Caso:</strong> estudiantes reportan que, desde hace semanas, un compañero recibe mensajes ofensivos en el grupo de WhatsApp del curso y hoy fue ridiculizado frente a otros. El estudiante afectado pide que “no se arme un problema grande”.</p>
              <h4>Qué hacer</h4>
              <ul>
                <li><strong>Proteger</strong> al estudiante afectado sin exponerlo ni revictimizarlo.</li>
                <li><strong>Registrar</strong> los hechos, versiones y evidencias con trazabilidad.</li>
                <li><strong>Activar</strong> la Ruta de Atención Integral y el protocolo del manual de convivencia.</li>
                <li>Informar a las familias dentro del debido proceso y hacer <strong>seguimiento</strong>.</li>
              </ul>
              <div class="info-box"><strong>Norma clave:</strong> Ley 1620 de 2013 crea la Ruta de Atención Integral (promoción, prevención, atención y seguimiento). El Comité Escolar de Convivencia interviene en el marco del manual de convivencia. [VERIFICAR arts. 13, 29–31]</div>
            `,
            quiz: {
              question: 'Docente de 8°. Reportan mensajes ofensivos reiterados en WhatsApp del curso y ridiculización de un compañero. El afectado pide discreción. ¿Cuál actuación es más pertinente para iniciar el abordaje?',
              options: [
                'Citar a los involucrados con coordinación para escuchar versiones y compromisos, informando al grupo que el tema se maneja para evitar rumores.',
                'Acordar con el afectado una disculpa mediada y, si la acepta, dejar constancia informal para no activar un trámite mayor.',
                'Acoger el reporte con reserva, documentar lo conocido, orientar medidas inmediatas de protección y activar el protocolo/ruta según el manual institucional.',
                'Orientar al estudiante y su familia para recopilar capturas y denunciar ante autoridad externa, mientras el colegio observa si hay nuevos hechos.'
              ],
              correct: 2,
              feedbackOk: 'Correcto. La ruta se activa con reserva, protección del afectado y registro institucional; no se cierra con disculpas informales ni se deja solo al afectado.',
              feedbackKo: 'Opciones A, B y D fallan: expón al grupo (A), informalidad que ignora la ruta (B) o trasladas la carga al exterior sin activar el protocolo interno (D).'
            }
          },
          {
            title: 'L2. Evaluación formativa, SIEE y promoción (Decreto 1290 de 2009)',
            content: `
              <p><strong>Caso:</strong> al cierre de periodo, un estudiante obtiene bajo desempeño en ciencias y ha tenido inasistencias por situación familiar conocida. La familia pregunta si “ya perdió la materia”.</p>
              <h4>Qué hacer</h4>
              <ul>
                <li>Sustentar la valoración con <strong>evidencias y criterios del SIEE</strong>, no con una nota aislada.</li>
                <li><strong>Retroalimentar</strong> oportunamente y definir apoyos y seguimiento.</li>
                <li>Comunicar con claridad a la familia y al estudiante.</li>
                <li>Usar las instancias de reclamación si persiste el desacuerdo; decidir promoción según el SIEE.</li>
              </ul>
              <div class="info-box"><strong>Norma clave:</strong> Decreto 1290 de 2009 reglamenta la evaluación del aprendizaje y promoción. La evaluación institucional es permanente, objetiva y formativa; el SIEE define criterios de evaluación, promoción, apoyos e instancias de reclamación. [VERIFICAR arts. 3, 4, 6]</div>
            `,
            quiz: {
              question: '9°. Cierre de periodo: bajo desempeño en ciencias e inasistencias por situación familiar conocida. La familia pregunta si el estudiante “ya perdió”. ¿Cuál actuación es más pertinente?',
              options: [
                'Confirmar que el bajo desempeño del periodo define la pérdida, para que la familia tome medidas desde ya.',
                'Socializar evidencias y criterios del SIEE, explicar el estado del proceso, definir apoyos y seguimiento, y acordar compromisos, indicando cómo se valora según el sistema institucional.',
                'Ajustar la valoración a desempeño básico para evitar desmotivación, dejando los apoyos como opcionales.',
                'Suspender la valoración del periodo hasta normalizar la situación familiar, sin registro de evidencias ni plan de apoyo.'
              ],
              correct: 1,
              feedbackOk: 'Correcto. Hace transparente la evaluación, la vincula al SIEE y activa apoyo/seguimiento sin adelantar conclusiones improcedentes.',
              feedbackKo: 'Opciones A, C y D fallan: cierre prematuro (A), sacrificio de criterios y evidencias (C), o suspensión sin registro ni plan que debilita objetividad (D).'
            }
          },
          {
            title: 'L3. Educación inclusiva, ajustes razonables y PIAR (Decreto 1421 de 2017)',
            content: `
              <p><strong>Caso:</strong> ingresa a 5° un estudiante con discapacidad auditiva que usa apoyos comunicativos. La próxima unidad incluye videos, debate y evaluación escrita. ¿Bajar el nivel, exonerarlo o atenderlo aparte?</p>
              <h4>Qué hacer</h4>
              <ul>
                <li>Identificar <strong>barreras del entorno</strong>, no “deficit” del estudiante como excusa de exclusión.</li>
                <li>Planear con <strong>DUA</strong>: múltiples formas de presentar información, participar y evidenciar aprendizaje.</li>
                <li>Concertar y documentar <strong>ajustes razonables</strong> en el PIAR, sin reducir expectativas de aprendizaje.</li>
                <li>Articular con familia, apoyos y equipo institucional; mantener seguimiento.</li>
              </ul>
              <div class="info-box"><strong>Norma clave:</strong> Decreto 1421 de 2017 reglamenta la atención educativa en educación inclusiva. Define Ajustes Razonables, DUA y PIAR como herramienta para garantizar aprendizaje, participación, permanencia y promoción. [VERIFICAR definiciones en extracto]</div>
            `,
            quiz: {
              question: '5°. Estudiante con discapacidad auditiva usa apoyos comunicativos. La unidad incluye videos, debate y evaluación escrita. ¿Cuál actuación es más pertinente?',
              options: [
                'Mantener las actividades previstas para todos y ofrecer explicación adicional al final de cada clase.',
                'Diseñar con DUA y acordar en el PIAR ajustes razonables para acceso, participación y formas de evidenciar el aprendizaje.',
                'Asignar actividades alternativas sobre contenidos previos mientras el grupo desarrolla la unidad.',
                'Sustituir toda evaluación por observación informal, sin criterios registrados.'
              ],
              correct: 1,
              feedbackOk: 'Correcto. Elimina barreras desde el diseño y documenta ajustes individualizados sin excluir al estudiante.',
              feedbackKo: 'Opciones A, C y D fallan: refuerzo sin eliminar barreras (A), riesgo de separación curricular (C), o flexibilidad sin criterios/registro que debilita validez (D).'
            }
          },
          {
            title: 'L4. Protocolo de acoso escolar: pasos de actuación (Ley 1620)',
            content: `
              <p><strong>Caso:</strong> Un docente recibe un reporte de que un estudiante de séptimo es excluido y señalado en grupos de WhatsApp del curso. La familia pide "que se castigue ya".</p>
              <h4>🗺️ Mapa conceptual: actuación ante acoso escolar</h4>
              <div class="info-box">
                <strong>Acoger el reporte con reserva</strong> → <strong>Registrar hechos y evidencias</strong> → <strong>Activar ruta/comité de convivencia</strong> → <strong>Protección y seguimiento</strong>
              </div>
              <h4>Lo que NO se debe hacer</h4>
              <ul>
                <li>Sancionar sin investigación ni debido proceso.</li>
                <li>Exponer públicamente al estudiante agresor o a la víctima.</li>
                <li>Cerrar el caso con una disculpa informal sin seguimiento institucional.</li>
              </ul>
              <div class="info-box"><strong>Norma clave:</strong> Ley 1620 de 2013, Ruta de Atención Integral y protocolos del Comité Escolar de Convivencia. [VERIFICAR arts. 29–31]</div>
            `,
            quiz: {
              question: 'Ante un reporte de acoso escolar en grupos de WhatsApp del curso, ¿cuál es el primer paso más pertinente del docente?',
              options: [
                'Sancionar inmediatamente a los presuntos agresores para enviar mensaje contundente.',
                'Acoger el reporte con reserva, documentar lo conocido y activar la ruta de atención/comité según el manual de convivencia.',
                'Pedir a los estudiantes que resuelvan el conflicto solos entre ellos.',
                'Esperar a que la familia interponga una denuncia formal antes de actuar.'
              ],
              correct: 1,
              feedbackOk: 'Correcto. El primer paso es acoger, documentar y activar la ruta institucional con reserva.',
              feedbackKo: 'A, C y D omiten el debido proceso, la protección inmediata o la activación oportuna de la ruta.'
            }
          },
          {
            title: 'L5. Reclamaciones de evaluación y derechos de la familia (Decreto 1290)',
            content: `
              <p><strong>Caso:</strong> Una familia no está de acuerdo con la valoración final de su hijo y solicita "cambiar la nota" directamente al docente.</p>
              <h4>🗺️ Mapa conceptual: reclamo de evaluación</h4>
              <div class="info-box">
                <strong>Revisar evidencias y criterios del SIEE</strong> → <strong>Informar de forma clara y oportuna</strong> → <strong>Orientar sobre instancias de reclamación formal</strong>
              </div>
              <h4>Qué hacer ante el reclamo</h4>
              <ul>
                <li>Mostrar los criterios y evidencias que fundamentan la valoración.</li>
                <li>Explicar la escala de valoración institucional.</li>
                <li>Orientar sobre el procedimiento y tiempos de reclamación previstos en el SIEE.</li>
                <li>Dejar registro de la atención a la familia.</li>
              </ul>
              <div class="info-box"><strong>Norma clave:</strong> Decreto 1290 de 2009, art. 4 (instancias, procedimientos y mecanismos de atención y resolución de reclamaciones sobre evaluación y promoción). [VERIFICAR literal]</div>
            `,
            quiz: {
              question: 'Una familia solicita cambiar la valoración final de su hijo. ¿Cuál es la actuación más pertinente del docente?',
              options: [
                'Cambiar la nota de inmediato para evitar conflicto con la familia.',
                'Revisar evidencias y criterios del SIEE, informar claramente y orientar sobre el procedimiento formal de reclamación si persiste el desacuerdo.',
                'Negar toda explicación porque la decisión del docente es final e inapelable.',
                'Someter la nota a votación de los demás estudiantes para decidir.'
              ],
              correct: 1,
              feedbackOk: 'Correcto. Combina transparencia pedagógica con respeto por la vía institucional de reclamación.',
              feedbackKo: 'A, C y D vulneran criterios de equidad, desconocen instancias de reclamación o reducen la evaluación a trámites informales.'
            }
          },
          {
            title: 'L6. Ajustes razonables y PIAR en la práctica docente (Decreto 1421)',
            content: `
              <p><strong>Caso:</strong> Un estudiante con discapacidad motriz necesita usar computadora para escribir en clases y exámenes. El docente duda si "bajar el nivel" o cómo ajustar.</p>
              <h4>🗺️ Mapa conceptual: ajustes razonables</h4>
              <div class="info-box">
                <strong>Identificar barrera</strong> → <strong>Valorar pedagógica y socialmente</strong> → <strong>Acordar ajustes en el PIAR</strong> → <strong>Implementar con seguimiento</strong>
              </div>
              <h4>Ajustes razonables NO son</h4>
              <ul>
                <li>Bajar automáticamente el objetivo de aprendizaje.</li>
                <li>Exonerar al estudiante de toda evaluación sin criterio.</li>
                <li>Hacer un plan diferente y aislado sin articulación con el grupo.</li>
              </ul>
              <div class="info-box"><strong>Norma clave:</strong> Decreto 1421 de 2017, PIAR y ajustes razonables para garantizar acceso, participación, permanencia y promoción. [VERIFICAR definiciones de PIAR y DUA]</div>
            `,
            quiz: {
              question: 'Un estudiante con discapacidad motriz requiere computadora para escribir en clases y exámenes. ¿Cuál es la actuación más pertinente?',
              options: [
                'Bajar el objetivo de aprendizaje para que apruebe sin esfuerzo.',
                'Exonerarlo de toda evaluación escrita durante el periodo.',
                'Acordar en el PIAR el uso de computadora como ajuste razonable, manteniendo el propósito de aprendizaje con criterios claros.',
                'Dejar que el estudiante decida si escribe o no, sin registro institucional.'
              ],
              correct: 2,
              feedbackOk: 'Correcto. El ajuste razonable elimina barreras de acceso/expresión sin bajar el propósito de aprendizaje.',
              feedbackKo: 'A, B y D reducen expectativas, eliminan evidencias o carecen de trazabilidad institucional.'
            }
          }
        ]
      },
      {
        id: 'mod3',
        title: 'Inteligencia Artificial para Docentes',
        area: 'Tecnología Educativa',
        level: 'Intermedio',
        levelClass: 'level-intermedio',
        cover: 'cover-mod3',
        icon: 'fas fa-robot',
        description: 'Domina el uso pedagógico de la IA en el aula: planificación, evaluación, personalización y ética. Herramientas prácticas para transformar tu práctica docente con tecnología responsable.',
        badge: { name: 'Explorador IA', icon: 'fas fa-robot', color: 'blue' },
        lessons: [
          {
            title: '1.1 Historia y fundamentos de la IA',
            content: `
              <p>La <strong>Inteligencia Artificial (IA)</strong> no es nueva: lleva más de 70 años desarrollándose. Entender su evolución ayuda a los docentes a situarla críticamente y a aprovecharla con responsabilidad pedagógica.</p>
              <h4>Hitos clave</h4>
              <ul>
                <li><strong>1950 – Test de Turing:</strong> Alan Turing propone la pregunta «¿Puede una máquina pensar?»</li>
                <li><strong>1956 – Conferencia de Dartmouth:</strong> se acuña el término «Inteligencia Artificial».</li>
                <li><strong>2012 – Deep Learning:</strong> las redes neuronales profundas superan el rendimiento humano en reconocimiento de imágenes.</li>
                <li><strong>2022 – IA Generativa:</strong> ChatGPT y modelos similares democratizan el acceso a la IA para docentes.</li>
              </ul>
              <h4>Conceptos esenciales</h4>
              <ul>
                <li><strong>Machine Learning:</strong> la máquina aprende de datos sin ser programada explícitamente.</li>
                <li><strong>Red neuronal:</strong> modelo matemático inspirado en el cerebro humano.</li>
                <li><strong>IA Generativa:</strong> modelos que crean texto, imágenes y audio a partir de instrucciones.</li>
              </ul>
              <div class="info-box"><strong>Relevancia docente:</strong> la IA generativa ya está en manos de tus estudiantes. Comprenderla te permite orientar su uso ético y pedagógico.</div>
            `,
            quiz: {
              question: '¿Qué caracteriza a la IA Generativa frente a otros tipos de IA?',
              options: [
                'Solo puede realizar cálculos matemáticos avanzados.',
                'Crea contenido nuevo (texto, imágenes, audio) a partir de instrucciones del usuario.',
                'Requiere programar cada respuesta manualmente.',
                'Funciona únicamente con conexión física a servidores educativos.'
              ],
              correct: 1,
              feedbackOk: '¡Correcto! La IA Generativa produce contenido nuevo a partir de instrucciones (prompts), lo que la hace útil para planear clases, generar recursos y dar retroalimentación.',
              feedbackKo: 'La IA Generativa se distingue por crear contenido nuevo (texto, imagen, audio) a partir de instrucciones del usuario, no por calcular o programar manualmente.'
            }
          },
          {
            title: '2.1 Prompts efectivos para planificar clases',
            content: `
              <p>Un <strong>prompt</strong> es la instrucción que le das a una IA. Su calidad determina directamente la calidad de la respuesta. Los docentes que dominan el arte del prompt pueden generar planeaciones, rúbricas y materiales en minutos.</p>
              <h4>Estructura de un prompt docente efectivo</h4>
              <ul>
                <li><strong>Rol:</strong> «Actúa como experto en diseño curricular para primaria colombiana…»</li>
                <li><strong>Tarea:</strong> «…crea una secuencia didáctica de 3 sesiones sobre…»</li>
                <li><strong>Contexto:</strong> «…para estudiantes de grado 5° con acceso limitado a tecnología…»</li>
                <li><strong>Formato:</strong> «…presenta el resultado en tabla con columnas: objetivo, actividad, tiempo, recursos.»</li>
              </ul>
              <h4>Errores comunes</h4>
              <ul>
                <li>Prompts vagos («dame ideas para una clase»).</li>
                <li>No especificar el nivel educativo ni el contexto.</li>
                <li>No revisar críticamente el resultado generado.</li>
              </ul>
              <div class="info-box"><strong>Tip práctico:</strong> siempre verifica la información generada con fuentes confiables. La IA puede «alucinar» datos incorrectos.</div>
            `,
            quiz: {
              question: 'Al diseñar un prompt para planificar una clase, ¿qué elemento es más importante incluir?',
              options: [
                'El nombre del docente y la institución educativa.',
                'El rol, la tarea, el contexto del grupo y el formato deseado.',
                'La fecha exacta y el número de estudiantes.',
                'El nombre de la herramienta de IA que se va a usar.'
              ],
              correct: 1,
              feedbackOk: '¡Excelente! Un prompt efectivo incluye rol, tarea, contexto y formato para obtener respuestas precisas y utilizables.',
              feedbackKo: 'La clave está en la especificidad: rol (quién habla), tarea (qué necesitas), contexto (para quién) y formato (cómo lo quieres).'
            }
          },
          {
            title: '3.1 Evaluación y retroalimentación con IA',
            content: `
              <p>La IA puede transformar la evaluación formativa al permitir retroalimentación inmediata, personalizada y escalable. Sin embargo, el juicio pedagógico del docente sigue siendo insustituible.</p>
              <h4>Usos prácticos de la IA en evaluación</h4>
              <ul>
                <li><strong>Diseño de rúbricas:</strong> genera matrices de valoración con criterios e indicadores diferenciados.</li>
                <li><strong>Retroalimentación textual:</strong> analiza respuestas abiertas y sugiere comentarios formativos.</li>
                <li><strong>Banco de ítems:</strong> crea preguntas de selección múltiple alineadas a los estándares.</li>
                <li><strong>Análisis de brechas:</strong> identifica patrones de error para orientar refuerzo.</li>
              </ul>
              <h4>Limitaciones a considerar</h4>
              <ul>
                <li>La IA no evalúa contexto emocional ni relacional del estudiante.</li>
                <li>Puede sesgar la evaluación si los datos de entrenamiento son parciales.</li>
                <li>El docente debe validar siempre los resultados antes de compartirlos.</li>
              </ul>
              <div class="info-box"><strong>Principio clave:</strong> la IA apoya la evaluación formativa, pero la decisión pedagógica final siempre debe ser del docente.</div>
            `,
            quiz: {
              question: '¿Cuál de los siguientes usos de la IA en evaluación es el más adecuado pedagógicamente?',
              options: [
                'Delegar completamente la calificación de exámenes a la IA sin revisión docente.',
                'Usar la IA para generar rúbricas y sugerir retroalimentación, validando los resultados antes de compartirlos.',
                'Reemplazar al docente por sistemas automatizados de evaluación.',
                'Usar la IA solo para diseñar el formato visual de los exámenes.'
              ],
              correct: 1,
              feedbackOk: '¡Muy bien! La IA es una herramienta de apoyo: genera propuestas que el docente revisa, ajusta y valida antes de usarlas.',
              feedbackKo: 'La IA apoya el proceso evaluativo, pero siempre requiere la revisión y el juicio pedagógico del docente para garantizar equidad y pertinencia.'
            }
          },
          {
            title: '4.1 Ética, privacidad y uso responsable de la IA',
            content: `
              <p>El uso de IA en el aula conlleva responsabilidades éticas fundamentales. Los docentes deben proteger la privacidad de sus estudiantes y fomentar un uso crítico y responsable de la tecnología.</p>
              <h4>Principios éticos del uso de IA en educación</h4>
              <ul>
                <li><strong>Privacidad:</strong> no compartir datos personales de menores con plataformas de IA sin consentimiento informado.</li>
                <li><strong>Equidad:</strong> los sistemas de IA pueden perpetuar sesgos raciales, de género o socioeconómicos.</li>
                <li><strong>Transparencia:</strong> informar a estudiantes y familias cuando se usa IA en el proceso educativo.</li>
                <li><strong>Propiedad intelectual:</strong> el contenido generado con IA tiene implicaciones de derechos de autor.</li>
              </ul>
              <h4>Marco normativo colombiano</h4>
              <ul>
                <li><strong>Ley 1581 de 2012:</strong> Ley de Protección de Datos Personales (Habeas Data).</li>
                <li><strong>Código de Infancia (Ley 1098):</strong> protección especial de datos de menores.</li>
              </ul>
              <div class="info-box"><strong>Reflexión docente:</strong> ¿Tus estudiantes saben que estás usando IA? La transparencia genera confianza y modela un uso ético de la tecnología.</div>
            `,
            quiz: {
              question: 'Según la normatividad colombiana, ¿qué debe hacer un docente antes de usar una plataforma de IA con datos de sus estudiantes menores de edad?',
              options: [
                'Simplemente usar la plataforma si es gratuita y educativa.',
                'Verificar las políticas de privacidad y obtener consentimiento informado, conforme a la Ley 1581 de 2012.',
                'Registrar a los estudiantes con nombres falsos para proteger su identidad.',
                'Esperar instrucciones del Ministerio de Educación para cada caso.'
              ],
              correct: 1,
              feedbackOk: '¡Correcto! La Ley 1581 de 2012 exige proteger los datos personales y requerir consentimiento, especialmente tratándose de menores.',
              feedbackKo: 'La Ley 1581 de 2012 (Habeas Data) obliga a verificar políticas de privacidad y obtener consentimiento informado antes de procesar datos de estudiantes menores.'
            }
          },
          {
            title: '5.1 Liderazgo pedagógico con IA',
            content: `
              <p>El docente del siglo XXI no solo usa IA: lidera su integración en la institución educativa, acompaña a sus colegas y facilita el cambio cultural necesario para aprovecharla pedagógicamente.</p>
              <h4>Competencias del docente líder en IA</h4>
              <ul>
                <li><strong>Curación crítica:</strong> selecciona herramientas de IA relevantes y confiables para su contexto.</li>
                <li><strong>Formación entre pares:</strong> comparte sus aprendizajes y genera comunidades de práctica.</li>
                <li><strong>Gestión del cambio:</strong> identifica resistencias y acompaña la adopción gradual.</li>
                <li><strong>Investigación-acción:</strong> evalúa el impacto real de la IA en los aprendizajes de sus estudiantes.</li>
              </ul>
              <h4>Niveles de integración (Marco DigComp)</h4>
              <ul>
                <li><strong>Nivel 1 – Explorador:</strong> usa herramientas básicas de IA.</li>
                <li><strong>Nivel 2 – Adoptante:</strong> integra IA en su planeación regularmente.</li>
                <li><strong>Nivel 3 – Líder:</strong> diseña estrategias institucionales e investiga su impacto.</li>
              </ul>
              <div class="info-box"><strong>Meta del MOOC:</strong> avanzar de nivel explorador a adoptante, con bases para convertirte en líder pedagógico de la IA en tu institución.</div>
            `,
            quiz: {
              question: '¿Qué distingue a un docente "líder" en IA de uno "explorador" según el Marco DigComp?',
              options: [
                'El líder usa más herramientas de IA que el explorador.',
                'El líder diseña estrategias institucionales e investiga el impacto de la IA; el explorador solo usa herramientas básicas.',
                'El líder tiene más años de experiencia docente que el explorador.',
                'No hay diferencia real: ambos niveles son equivalentes.'
              ],
              correct: 1,
              feedbackOk: '¡Excelente! El nivel líder implica diseño estratégico, formación de pares e investigación del impacto, más allá del uso individual de herramientas.',
              feedbackKo: 'El Marco DigComp distingue al líder por su capacidad de diseñar estrategias institucionales, formar a colegas e investigar el impacto real de la IA.'
            }
          },
          {
            title: '6.1 Proyecto integrador: IA ética en mi práctica',
            content: `
              <p>El proyecto integrador es la culminación del curso. Diseñarás una <strong>intervención pedagógica real</strong> que incorpore IA de forma ética, justificada y medible en tu contexto docente.</p>
              <h4>Fases del proyecto</h4>
              <ul>
                <li><strong>Fase 1 – Definición del reto:</strong> identifica un problema concreto en tu aula (ej.: bajo nivel lector, escasa retroalimentación formativa).</li>
                <li><strong>Fase 2 – Diseño de la intervención:</strong> planifica cómo usar la IA para abordar el reto, con criterios éticos explícitos.</li>
                <li><strong>Fase 3 – Implementación:</strong> ejecuta la intervención con al menos un grupo de estudiantes.</li>
                <li><strong>Fase 4 – Análisis de impacto:</strong> mide resultados con evidencias (registros, rúbricas, encuestas).</li>
                <li><strong>Fase 5 – Comunicación:</strong> presenta los hallazgos a tu comunidad educativa.</li>
              </ul>
              <div class="info-box"><strong>Criterio de evaluación:</strong> el proyecto se valora por la coherencia pedagógica, el manejo ético de datos y la calidad de la reflexión sobre el impacto, no por la sofisticación tecnológica.</div>
            `,
            quiz: {
              question: '¿Cuál es el criterio principal para evaluar el proyecto integrador de este curso?',
              options: [
                'El número de herramientas de IA utilizadas en la intervención.',
                'La coherencia pedagógica, el manejo ético de datos y la reflexión sobre el impacto.',
                'El presupuesto invertido en tecnología para la intervención.',
                'La cantidad de estudiantes que participaron en el proyecto.'
              ],
              correct: 1,
              feedbackOk: '¡Muy bien! Lo esencial es la reflexión pedagógica y ética, no la complejidad tecnológica. Un proyecto simple pero bien fundamentado es más valioso.',
              feedbackKo: 'El proyecto integrador se evalúa por coherencia pedagógica, manejo ético de datos y reflexión sobre el impacto real en los aprendizajes, no por la cantidad de herramientas.'
            }
          },
          {
            title: 'L7. IA en la planificación didáctica: de la idea a la secuencia de clase',
            content: `
              <p><strong>Caso:</strong> María debe planear una semana de ciencias para quinto grado y no sabe por dónde empezar. Usa una IA para generar la planeación completa sin revisar los estándares curriculares ni el contexto de sus estudiantes.</p>
              <h4>🗺️ Mapa conceptual: planificación con IA responsable</h4>
              <div class="info-box">
                <strong>Reto del aula</strong> → <strong>Estándar curricular</strong> → <strong>Prompt con rol, tarea, contexto y formato</strong> → <strong>Revisión y ajuste docente</strong> → <strong>Secuencia de clase</strong>
              </div>
              <h4>Lo que hace el docente vs. lo que hace la IA</h4>
              <table style="width:100%; border-collapse: collapse; margin: 12px 0;">
                <tr style="background:#f4f6f8;">
                  <th style="text-align:left; border:1px solid #ccc; padding:8px;">Momento</th>
                  <th style="text-align:left; border:1px solid #ccc; padding:8px;">Solo IA (riesgo)</th>
                  <th style="text-align:left; border:1px solid #ccc; padding:8px;">Docente con IA (acertado)</th>
                </tr>
                <tr>
                  <td style="border:1px solid #ccc; padding:8px;"><strong>Definir objetivo</strong></td>
                  <td style="border:1px solid #ccc; padding:8px;">Acepta cualquier objetivo que sugiera la IA.</td>
                  <td style="border:1px solid #ccc; padding:8px;">Valida que esté alineado a los estándares curriculares y al nivel.</td>
                </tr>
                <tr>
                  <td style="border:1px solid #ccc; padding:8px;"><strong>Diseñar actividades</strong></td>
                  <td style="border:1px solid #ccc; padding:8px;">Copia y pega lo que genere la IA sin adaptar.</td>
                  <td style="border:1px solid #ccc; padding:8px;">Adapta al contexto, recursos y tiempos reales de su aula.</td>
                </tr>
                <tr>
                  <td style="border:1px solid #ccc; padding:8px;"><strong>Evaluar</strong></td>
                  <td style="border:1px solid #ccc; padding:8px;">Usa la rúbrica de la IA sin revisar criterios.</td>
                  <td style="border:1px solid #ccc; padding:8px;">Valida y ajusta la rúbrica con su juicio pedagógico.</td>
                </tr>
              </table>
              <div class="info-box"><strong>Principio clave:</strong> la IA genera propuestas; el docente decide, valida y es responsable pedagógicamente del resultado final.</div>
            `,
            quiz: {
              question: 'María usa una IA para generar su planeación semanal sin revisar estándares curriculares ni adaptar al contexto de sus estudiantes. ¿Cuál es el principal riesgo pedagógico?',
              options: [
                'La IA no permite exportar la planeación a Word o PDF.',
                'La secuencia puede no alinearse con los estándares ni con las necesidades reales del grupo.',
                'La IA tarda demasiado en generar los contenidos.',
                'La planeación queda almacenada en la nube de la plataforma de IA.'
              ],
              correct: 1,
              feedbackOk: 'Correcto. Sin revisión del docente, la IA puede producir contenidos genéricos, desalineados con el currículo o inadecuados para el contexto.',
              feedbackKo: 'A, C y D son problemas técnicos o secundarios; el riesgo central es la falta de validación pedagógica y curricular.'
            }
          },
          {
            title: 'L8. Sesgos, alucinaciones y verificación de IA generativa',
            content: `
              <p><strong>Caso:</strong> Un docente le pide a una IA que redacte una carta a padres sobre un proyecto de lectura. La IA inventa un decreto inexistente y cita un artículo del Código de la Infancia que no dice lo que afirma.</p>
              <h4>🗺️ Mapa conceptual: verificación crítica</h4>
              <div class="info-box">
                <strong>Resultado de IA</strong> → <strong>Identificar posible alucinación</strong> → <strong>Contrastar con fuente primaria</strong> → <strong>Corregir o descartar</strong>
              </div>
              <h4>Señales de alerta en contenido generado por IA</h4>
              <ul>
                <li>Citas de normas, leyes o autores sin número de artículo ni fuente verificable.</li>
                <li>Datos estadísticos o estudios que no se pueden rastrear.</li>
                <li>Respuestas muy seguras sobre temas específicos pero con imprecisiones técnicas.</li>
                <li>Referencias a páginas web que no existen o no abren.</li>
              </ul>
              <div class="info-box"><strong>Dato clave del concurso:</strong> la IA puede "alucinar" (inventar información presentándola como real). El docente debe contrastar con fuentes primarias antes de usar cualquier contenido con estudiantes o familias.</div>
            `,
            quiz: {
              question: 'Una IA generativa redacta un documento para familias y cita un artículo de una ley que parece plausible pero el docente no lo encuentra en el texto legal. ¿Qué debe hacer el docente?',
              options: [
                'Usar el texto igual porque la IA suena convincente y segura.',
                'Descartar la cita y contrastar la información con la fuente primaria (texto oficial de la ley) antes de incluirla.',
                'Preguntar a otro sistema de IA para confirmar si el artículo existe.',
                'Enviar el documento tal cual y pedir a las familias que verifiquen.'
              ],
              correct: 1,
              feedbackOk: 'Correcto. Nunca usar contenido generado por IA con citas legales sin contrastar con la fuente primaria oficial.',
              feedbackKo: 'A asume que la IA es infalible; C solo traslada el problema a otra IA posible; D transfiere la responsabilidad a las familias.'
            }
          },
          {
            title: 'L9. Protección de datos de menores y consentimiento con IA (Ley 1581 y 1098)',
            content: `
              <p><strong>Caso:</strong> Un docente quiere subir fotos y nombres de sus estudiantes de primaria a una plataforma de IA para generar avatares personalizados y materiales didácticos, sin consultar a las familias ni revisar la política de privacidad de la plataforma.</p>
              <h4>🗺️ Mapa conceptual: uso ético de datos con IA</h4>
              <div class="info-box">
                <strong>Identificar datos personales</strong> → <strong>Solicitar consentimiento informado a acudientes</strong> → <strong>Revisar política de privacidad de la plataforma</strong> → <strong>Minimizar datos compartidos</strong>
              </div>
              <h4>Qué NO hacer con datos de menores en plataformas de IA</h4>
              <ul>
                <li>Subir nombres completos, fotos o datos de salud sin consentimiento informado.</li>
                <li>Usar plataformas gratuitas sin revisar si almacenan o entrenan con esos datos.</li>
                <li>Suponer que "porque es educativo" ya está permitido.</li>
              </ul>
              <div class="info-box"><strong>Norma clave:</strong> Ley 1581 de 2012 (Protección de Datos Personales) y Ley 1098 de 2006 (Código de Infancia y Adolescencia). [VERIFICAR alcance para menores en contextos educativos]</div>
            `,
            quiz: {
              question: 'Un docente quiere subir fotos y nombres de estudiantes de primaria a una IA para generar avatares, sin consultar a las familias ni revisar la política de privacidad. ¿Cuál es la actuación más pertinente?',
              options: [
                'Proceder porque es material educativo y no se vende nada.',
                'Solicitar consentimiento informado a los acudientes, revisar la política de privacidad de la plataforma y minimizar los datos personales compartidos.',
                'Usar solo nombres de pila sin apellidos para "proteger la identidad" sin consentimiento.',
                'Pedir permiso después de subir las imágenes, si alguna familia se queja.'
              ],
              correct: 1,
              feedbackOk: 'Correcto. Se requiere consentimiento informado, revisión de la política de privacidad y minimización de datos antes de compartir información de menores.',
              feedbackKo: 'A, C y D vulneran la protección de datos personales de menores: no basta con fines educativos, omitir apellidos no elimina el dato personal, y pedir perdón después no sustituye al consentimiento previo.'
            }
          }
        ]
      },
    ];

