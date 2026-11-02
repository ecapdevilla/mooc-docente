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
          }
        ]
      },
    ];

