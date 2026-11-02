/**
 * SPA MéritoDocente · Simulacro diagnóstico posterior al inicio de sesión.
 *
 * Archivo clásico (sin módulos ES ni bundler) cargado por indexInicial.html
 * en el orden declarado. Conserva el código original de la Etapa 1.
 * Ver docs/arquitectura-frontend.md.
 */
    async function loadPostLoginQuiz() {
      if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
      const panel = document.getElementById('postLoginQuizPanel');
      if (!panel || !state.user || !state.apiOnline || !localStorage.getItem(TOKEN_KEY)) {
        panel?.classList.add('hidden');
        return;
      }

      panel.classList.remove('hidden');
      panel.innerHTML = '<h3><i class="fas fa-clipboard-check"></i> Diagnóstico inicial</h3><p class="quiz-intro">Responde estas preguntas avanzadas para identificar tus puntos de partida.</p><p>Cargando preguntas...</p>';

      try {
        const data = await apiFetch('/quizzes/post-login');
        const questions = data.quiz?.preguntas || [];

        if (!questions.length) {
          panel.classList.add('hidden');
          return;
        }

        state.postLoginAnswers = {};
        state.postLoginQuiz = data.quiz;
        state.postLoginQuestionIndex = 0;
        renderPostLoginQuiz(data.quiz);
      } catch (err) {
        panel.classList.add('hidden');
        if (err.status !== 401) {
          console.warn('No se pudo cargar el diagnóstico inicial:', err.message);
        }
      }
    }

    window.openDiagnosticQuiz = function () {
      const panel = document.getElementById('postLoginQuizPanel');
      if (!panel) return;

      panel.classList.remove('hidden');
      loadPostLoginQuiz();
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    window.closeDiagnosticQuiz = function () {
      document.getElementById('postLoginQuizPanel')?.classList.add('hidden');
    };

    function renderPostLoginQuiz(quiz) {
      const panel = document.getElementById('postLoginQuizPanel');
      panel.innerHTML = '';
      const questionIndex = state.postLoginQuestionIndex || 0;
      const question = quiz.preguntas[questionIndex];
      const isLastQuestion = questionIndex === quiz.preguntas.length - 1;

      const title = document.createElement('h3');
      title.id = 'postLoginQuizTitle';
      title.innerHTML = '<i class="fas fa-clipboard-check"></i> Diagnóstico inicial';
      panel.appendChild(title);

      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'btn btn-ghost btn-sm';
      closeButton.textContent = 'Cerrar';
      closeButton.addEventListener('click', closeDiagnosticQuiz);
      panel.appendChild(closeButton);

      const intro = document.createElement('p');
      intro.className = 'quiz-intro';
      intro.textContent = 'Responde estas preguntas avanzadas para identificar tus puntos de partida.';
      panel.appendChild(intro);

      const progress = document.createElement('div');
      progress.className = 'diagnostic-progress';
      progress.innerHTML = `<span>Pregunta ${questionIndex + 1} de ${quiz.preguntas.length}</span><div class="diagnostic-progress-bar"><div class="diagnostic-progress-fill" style="width:${((questionIndex + 1) / quiz.preguntas.length) * 100}%"></div></div>`;
      panel.appendChild(progress);

      const questionBlock = document.createElement('div');
      questionBlock.className = 'post-login-question';

      const questionTitle = document.createElement('div');
      questionTitle.className = 'quiz-question';
      questionTitle.textContent = question.pregunta;
      questionBlock.appendChild(questionTitle);

      const options = document.createElement('div');
      options.className = 'quiz-options';

      question.opciones.forEach((option, optionIndex) => {
        const optionButton = document.createElement('button');
        optionButton.type = 'button';
        optionButton.className = 'quiz-option';
        optionButton.dataset.questionId = question.id;
        optionButton.dataset.optionId = option.id;

        const letter = document.createElement('span');
        letter.className = 'letter';
        letter.textContent = String.fromCharCode(65 + optionIndex);

        const optionText = document.createElement('span');
        optionText.textContent = option.opcion;
        optionButton.append(letter, optionText);
        if (state.postLoginAnswers[question.id] === option.id) optionButton.classList.add('selected');
        optionButton.addEventListener('click', () => selectPostLoginOption(optionButton));
        options.appendChild(optionButton);
      });

      questionBlock.appendChild(options);
      panel.appendChild(questionBlock);

      const navigation = document.createElement('div');
      navigation.className = 'diagnostic-nav';

      const previousButton = document.createElement('button');
      previousButton.type = 'button';
      previousButton.className = 'btn btn-ghost btn-sm';
      previousButton.innerHTML = '<i class="fas fa-arrow-left"></i> Anterior';
      previousButton.disabled = questionIndex === 0;
      previousButton.addEventListener('click', () => changePostLoginQuestion(-1));
      navigation.appendChild(previousButton);

      const nextButton = document.createElement('button');
      nextButton.type = 'button';
      nextButton.className = 'btn btn-secondary btn-sm';
      nextButton.disabled = state.postLoginAnswers[question.id] === undefined;
      nextButton.innerHTML = isLastQuestion ? '<i class="fas fa-paper-plane"></i> Finalizar simulacro' : 'Siguiente <i class="fas fa-arrow-right"></i>';
      nextButton.addEventListener('click', () => {
        if (isLastQuestion) submitPostLoginQuiz();
        else changePostLoginQuestion(1);
      });
      navigation.appendChild(nextButton);
      panel.appendChild(navigation);
    }

    function selectPostLoginOption(optionButton) {
      const questionId = optionButton.dataset.questionId;
      const options = document.querySelectorAll(`[data-question-id="${questionId}"]`);
      options.forEach((option) => option.classList.remove('selected'));
      optionButton.classList.add('selected');
      state.postLoginAnswers[questionId] = Number(optionButton.dataset.optionId);
      renderPostLoginQuiz(state.postLoginQuiz);
    }

    function changePostLoginQuestion(direction) {
      const nextIndex = state.postLoginQuestionIndex + direction;
      if (nextIndex < 0 || nextIndex >= state.postLoginQuiz.preguntas.length) return;
      state.postLoginQuestionIndex = nextIndex;
      renderPostLoginQuiz(state.postLoginQuiz);
    }

    async function submitPostLoginQuiz() {
      try {
        const answers = Object.entries(state.postLoginAnswers).map(([questionId, optionId]) => ({
          questionId: Number(questionId),
          optionId,
        }));
        const data = await apiFetch('/quizzes/post-login/attempts', {
          method: 'POST',
          body: { answers },
        });
        renderPostLoginResult(data);
      } catch (err) {
        alert(`No pudimos calificar el diagnóstico: ${err.message}`);
      }
    }

    function renderPostLoginResult(data) {
      const panel = document.getElementById('postLoginQuizPanel');
      panel.innerHTML = '';

      const title = document.createElement('h3');
      title.innerHTML = '<i class="fas fa-chart-line"></i> Resultado del diagnóstico';
      panel.appendChild(title);

      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'btn btn-ghost btn-sm';
      closeButton.textContent = 'Cerrar';
      closeButton.addEventListener('click', closeDiagnosticQuiz);
      panel.appendChild(closeButton);

      const summary = document.createElement('div');
      summary.className = 'post-login-result';
      const summaryText = document.createElement('strong');
      summaryText.textContent = `${data.attempt.aciertos}/${data.attempt.total_preguntas} respuestas correctas · ${data.attempt.puntaje}%`;
      summary.appendChild(summaryText);
      panel.appendChild(summary);

      const grouped = {};
      data.results.forEach((result) => {
        const key = result.topic || result.area || 'General';
        if (!grouped[key]) grouped[key] = { correct: 0, total: 0 };
        grouped[key].total += 1;
        if (result.correct) grouped[key].correct += 1;
      });

      const report = document.createElement('div');
      report.className = 'diagnostic-report';

      const chartTitle = document.createElement('h4');
      chartTitle.textContent = 'Tu desempeño por área de estudio';
      report.appendChild(chartTitle);

      const chart = document.createElement('div');
      chart.className = 'diagnostic-chart';
      const priorities = [];

      Object.entries(grouped).forEach(([topic, values]) => {
        const percentage = Math.round((values.correct / values.total) * 100);
        if (percentage < 70) priorities.push(topic);

        const row = document.createElement('div');
        row.className = 'diagnostic-chart-row';
        const label = document.createElement('span');
        label.className = 'diagnostic-chart-label';
        label.textContent = topic;
        const track = document.createElement('div');
        track.className = 'diagnostic-chart-track';
        const fill = document.createElement('div');
        fill.className = `diagnostic-chart-fill ${percentage < 50 ? 'low' : (percentage < 70 ? 'mid' : '')}`;
        fill.style.width = `${percentage}%`;
        track.appendChild(fill);
        const value = document.createElement('strong');
        value.textContent = `${percentage}%`;
        row.append(label, track, value);
        chart.appendChild(row);
      });
      report.appendChild(chart);

      const focus = document.createElement('div');
      focus.className = 'diagnostic-focus';
      const focusTitle = document.createElement('strong');
      focusTitle.textContent = priorities.length ? 'Áreas prioritarias para reforzar: ' : 'Fortaleza inicial: ';
      focus.appendChild(focusTitle);
      const focusText = document.createElement('span');
      focusText.textContent = priorities.length
        ? `${priorities.join(', ')}. Te recomendamos comenzar por estas lecciones y revisar nuevamente los conceptos antes de repetir el simulacro.`
        : 'Presentas un punto de partida equilibrado. Continúa con las lecciones y profundiza en las explicaciones de cada respuesta.';
      focus.appendChild(focusText);
      report.appendChild(focus);

      const detailsTitle = document.createElement('h4');
      detailsTitle.textContent = 'Retroalimentación de tus respuestas';
      report.appendChild(detailsTitle);
      const details = document.createElement('div');
      details.className = 'diagnostic-details';
      data.results.forEach((result, resultIndex) => {
        const detail = document.createElement('div');
        detail.className = `diagnostic-detail ${result.correct ? 'ok' : 'review'}`;
        detail.textContent = `${resultIndex + 1}. ${result.correct ? 'Correcta' : 'Para revisar'} · ${result.topic}: ${result.explanation}`;
        details.appendChild(detail);
      });
      report.appendChild(details);
      panel.appendChild(report);
    }

