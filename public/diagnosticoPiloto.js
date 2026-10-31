'use strict';

const API = '/api/v1/diagnostico-piloto';
const STORAGE_KEY = 'merito-docente-piloto-attempt';
const EXPECTED_QUESTIONS = 50;
const element = (id) => document.getElementById(id);
const state = {
  token: null,
  questions: [],
  answers: {},
  marked: {},
  position: 0,
  expiresAt: null,
};

const showMessage = (message) => {
  element('message').textContent = message;
};

const request = async (path, body) => {
  const response = await fetch(`${API}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error('El servidor devolvió una respuesta que no se pudo leer.');
  }
  if (!response.ok) throw new Error(payload.error || 'No se pudo completar la solicitud.');
  return payload;
};

const questionIds = () => new Set(state.questions.map((question) => question.id));
const answeredCount = () => Object.keys(state.answers).filter((id) => questionIds().has(id)).length;
const markedCount = () => Object.values(state.marked).filter(Boolean).length;

const saveAttempt = () => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    showMessage('No se pudieron guardar las respuestas en esta pestaña. Revisa la configuración del navegador antes de continuar.');
    return false;
  }
};

const restoreAttempt = () => {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return false;
    const parsed = JSON.parse(saved);
    const validQuestions = isValidQuestionSet(parsed.questions);
    const ids = new Set(validQuestions ? parsed.questions.map((question) => question.id) : []);
    const validAnswers = validQuestions &&
      parsed.answers && typeof parsed.answers === 'object' && !Array.isArray(parsed.answers) &&
      Object.entries(parsed.answers).every(([id, optionId]) => {
        const question = parsed.questions.find((item) => item.id === id);
        return ids.has(id) && question.opciones.some((option) => option.id === optionId);
      });
    const validMarks = parsed.marked === undefined ||
      (parsed.marked && typeof parsed.marked === 'object' && !Array.isArray(parsed.marked) &&
        Object.entries(parsed.marked).every(([id, marked]) => ids.has(id) && marked === true));
    const expiry = parsed.expiresAt ? Date.parse(parsed.expiresAt) : null;

    if (
      typeof parsed.token !== 'string' ||
      !/^[0-9a-f]{64}$/.test(parsed.token) ||
      !validQuestions ||
      !validAnswers ||
      !validMarks ||
      !Number.isInteger(parsed.position) ||
      parsed.position < 0 ||
      parsed.position >= EXPECTED_QUESTIONS ||
      (parsed.expiresAt && (!Number.isFinite(expiry) || expiry <= Date.now()))
    ) {
      sessionStorage.removeItem(STORAGE_KEY);
      showMessage('El intento guardado no es válido o ya expiró. Puedes iniciar uno nuevo.');
      return false;
    }

    Object.assign(state, parsed, { marked: parsed.marked || {} });
    return true;
  } catch (error) {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (storageError) {
      showMessage('No se pudo recuperar ni limpiar el intento guardado. Cierra esta pestaña después de guardar tus respuestas fuera del navegador.');
      return false;
    }
    showMessage('No se pudo recuperar el intento guardado en esta pestaña.');
    return false;
  }
};

const appendText = (parent, tag, content, className) => {
  const node = document.createElement(tag);
  node.textContent = content;
  if (className) node.className = className;
  parent.append(node);
  return node;
};

const setButtonState = (button, pressed) => {
  button.setAttribute('aria-pressed', String(pressed));
  button.textContent = pressed ? 'Quitar marca de revisión' : 'Marcar para revisar';
};

const renderQuestionNav = () => {
  const navigation = element('questionNav');
  navigation.replaceChildren();
  const ids = questionIds();

  state.questions.forEach((question, index) => {
    const answered = Object.prototype.hasOwnProperty.call(state.answers, question.id);
    const flagged = Boolean(state.marked[question.id]);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `question-jump${answered ? ' answered' : ''}${flagged ? ' flagged' : ''}`;
    button.textContent = String(index + 1);
    button.setAttribute('aria-label',
      `Pregunta ${index + 1}, ${answered ? 'respondida' : 'pendiente'}${flagged ? ', marcada para revisar' : ''}`);
    if (index === state.position) button.setAttribute('aria-current', 'step');
    button.addEventListener('click', () => moveToQuestion(index));
    navigation.append(button);
  });

  element('reviewCount').textContent = markedCount()
    ? `${markedCount()} para revisar`
    : '';
  element('answerSummary').textContent =
    `${answeredCount()} respondidas · ${EXPECTED_QUESTIONS - answeredCount()} pendientes`;
  element('progressBar').setAttribute('aria-valuenow', String(answeredCount()));
  element('fill').style.width = `${(answeredCount() / EXPECTED_QUESTIONS) * 100}%`;
};

const renderQuestion = () => {
  const question = state.questions[state.position];
  if (!question) return;
  const container = element('question');
  container.replaceChildren();

  appendText(container, 'span', question.categoria, 'category-label');
  if (typeof question.evidencia === 'string' && question.evidencia.trim()) {
    const evidence = document.createElement('p');
    evidence.className = 'question-evidence';
    appendText(evidence, 'strong', 'Evidencia evaluada: ');
    evidence.append(document.createTextNode(question.evidencia));
    container.append(evidence);
  }

  const fieldset = document.createElement('fieldset');
  fieldset.className = 'question-fieldset';
  const legend = appendText(fieldset, 'legend', question.enunciado);
  legend.id = 'questionHeading';
  legend.tabIndex = -1;

  for (const [index, option] of question.opciones.entries()) {
    const label = document.createElement('label');
    label.className = 'option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = `answer-${question.id}`;
    input.value = option.id;
    input.checked = state.answers[question.id] === option.id;
    input.setAttribute('aria-label', `Opción ${option.id}`);
    input.addEventListener('change', () => {
      state.answers[question.id] = option.id;
      if (saveAttempt()) renderQuestionNav();
    });
    appendText(label, 'span', option.id || String.fromCharCode(65 + index), 'option-letter');
    appendText(label, 'span', option.texto, 'option-text');
    label.prepend(input);
    fieldset.append(label);
  }

  container.append(fieldset);
  element('counter').textContent = `Pregunta ${state.position + 1} de ${state.questions.length}`;
  element('prev').disabled = state.position === 0;
  element('next').hidden = state.position === state.questions.length - 1;
  element('submit').hidden = state.position !== state.questions.length - 1;
  setButtonState(element('markReview'), Boolean(state.marked[question.id]));
  renderQuestionNav();
};

const showExam = () => {
  element('start').hidden = true;
  element('exam').hidden = false;
  renderQuestion();
  element('questionHeading').focus({ preventScroll: true });
};

const moveToQuestion = (position) => {
  if (!Number.isInteger(position) || position < 0 || position >= state.questions.length) return;
  const previousPosition = state.position;
  state.position = position;
  if (saveAttempt()) {
    renderQuestion();
    element('questionHeading').focus({ preventScroll: true });
  }
  else state.position = previousPosition;
};

const isValidQuestionSet = (questions) =>
  Array.isArray(questions) &&
  questions.length === EXPECTED_QUESTIONS &&
  new Set(questions.map((question) => question.id)).size === EXPECTED_QUESTIONS &&
  questions.every((question) =>
    typeof question.id === 'string' &&
    typeof question.enunciado === 'string' &&
    typeof question.categoria === 'string' &&
    Array.isArray(question.opciones) &&
    question.opciones.length === 4 &&
    !Object.prototype.hasOwnProperty.call(question, 'clave') &&
    !Object.prototype.hasOwnProperty.call(question, 'justificacion') &&
    question.opciones.every((option) =>
      typeof option.id === 'string' &&
      typeof option.texto === 'string' &&
      !Object.prototype.hasOwnProperty.call(option, 'correcta') &&
      !Object.prototype.hasOwnProperty.call(option, 'es_correcta')
    )
  );

const startAttempt = async () => {
  showMessage('');
  element('begin').disabled = true;
  try {
    const payload = await request('/start', { codigo_acceso: element('access').value });
    if (!isValidQuestionSet(payload.preguntas) || typeof payload.token !== 'string') {
      throw new Error('El servidor no entregó un conjunto de preguntas válido y seguro.');
    }
    Object.assign(state, {
      token: payload.token,
      questions: payload.preguntas,
      answers: {},
      marked: {},
      position: 0,
      expiresAt: payload.expira_en || null,
    });
    element('access').value = '';
    if (!saveAttempt()) return;
    showExam();
  } catch (error) {
    showMessage(error.message);
  } finally {
    element('begin').disabled = false;
  }
};

const confirmReturnToPanel = () => {
  if (answeredCount() > 0 &&
      !window.confirm('Tienes respuestas sin entregar. Se conservarán en esta pestaña. ¿Deseas volver a tu panel?')) {
    return;
  }
  window.location.assign('/?vista=panel');
};

const validateResult = (payload) => {
  if (
    !payload ||
    typeof payload !== 'object' ||
    !Number.isInteger(payload.aciertos) ||
    !Number.isInteger(payload.total) ||
    payload.total !== EXPECTED_QUESTIONS ||
    payload.aciertos < 0 ||
    payload.aciertos > payload.total ||
    !payload.por_categoria ||
    typeof payload.por_categoria !== 'object' ||
    Object.keys(payload.por_categoria).length !== 5 ||
    !Array.isArray(payload.por_pregunta) ||
    payload.por_pregunta.length !== EXPECTED_QUESTIONS ||
    new Set(payload.por_pregunta.map((answer) => answer.id)).size !== EXPECTED_QUESTIONS ||
    payload.por_pregunta.some((answer) =>
      !answer || typeof answer.id !== 'string' || typeof answer.correcta !== 'boolean' ||
      typeof answer.opcion !== 'string'
    ) ||
    state.questions.some((question) => !payload.por_pregunta.some((answer) => answer.id === question.id))
  ) {
    throw new Error('El servidor devolvió resultados incompletos. Contacta al equipo del piloto antes de cerrar esta página.');
  }
  const categories = Object.values(payload.por_categoria);
  if (
    categories.some((score) =>
      !score || !Number.isInteger(score.aciertos) || !Number.isInteger(score.total) ||
      score.total <= 0 || score.aciertos < 0 || score.aciertos > score.total
    ) ||
    categories.reduce((sum, score) => sum + score.total, 0) !== payload.total ||
    categories.reduce((sum, score) => sum + score.aciertos, 0) !== payload.aciertos
  ) {
    throw new Error('El servidor devolvió un resumen por categoría inconsistente.');
  }
  return payload;
};

const formatPercent = (value) => `${Number.isInteger(value) ? value : value.toFixed(1)}%`;

const renderResult = (rawPayload) => {
  const payload = validateResult(rawPayload);
  const result = element('result');
  result.replaceChildren();
  result.hidden = false;

  const heading = appendText(result, 'h2', 'Resultados del diagnóstico');
  heading.id = 'resultTitle';
  appendText(result, 'p', 'Este resultado es orientativo y no equivale a una calificación de la CNSC.', 'result-disclaimer');

  const incorrectas = payload.total - payload.aciertos;
  const porcentaje = (payload.aciertos / payload.total) * 100;
  const summary = document.createElement('div');
  summary.className = 'result-summary';

  const scorePanel = document.createElement('div');
  scorePanel.className = 'score-panel';
  const scoreRing = document.createElement('div');
  scoreRing.className = 'score-ring';
  scoreRing.style.setProperty('--score-angle', `${porcentaje}%`);
  scoreRing.setAttribute('role', 'img');
  scoreRing.setAttribute('aria-label', `Porcentaje general: ${formatPercent(porcentaje)}`);
  const scoreInner = document.createElement('div');
  scoreInner.className = 'score-ring-inner';
  appendText(scoreInner, 'span', formatPercent(porcentaje), 'score-percent');
  appendText(scoreInner, 'span', 'aciertos', 'score-label');
  scoreRing.append(scoreInner);
  scorePanel.append(scoreRing);
  appendText(scorePanel, 'p', `${payload.aciertos} de ${payload.total} respuestas correctas`, 'score-numbers');

  const statColumn = document.createElement('div');
  appendText(statColumn, 'h3', 'Resumen de tu intento');
  const stats = document.createElement('div');
  stats.className = 'result-stats';
  for (const [value, label] of [
    [payload.total, 'Preguntas'],
    [payload.aciertos, 'Aciertos'],
    [incorrectas, 'Incorrectas'],
  ]) {
    const card = document.createElement('div');
    card.className = 'stat-card';
    appendText(card, 'strong', String(value));
    appendText(card, 'span', label);
    stats.append(card);
  }
  statColumn.append(stats);
  appendText(statColumn, 'p', 'El resultado describe únicamente este ejercicio de práctica.', 'result-disclaimer');
  summary.append(scorePanel, statColumn);
  result.append(summary);

  appendText(result, 'h3', 'Desempeño por categoría');
  const categoryRows = [];
  const categoryResults = document.createElement('div');
  categoryResults.className = 'category-results';
  for (const [category, score] of Object.entries(payload.por_categoria)) {
    if (!Number.isInteger(score.aciertos) || !Number.isInteger(score.total) ||
        score.total <= 0 || score.aciertos < 0 || score.aciertos > score.total) {
      throw new Error('El servidor devolvió un resultado de categoría inválido.');
    }
    const percent = (score.aciertos / score.total) * 100;
    categoryRows.push({ category, percent });
    const row = document.createElement('div');
    row.className = 'category-row';
    appendText(row, 'span', category, 'category-name');
    appendText(row, 'span', `${score.aciertos} de ${score.total} · ${formatPercent(percent)}`, 'category-score');
    const track = document.createElement('div');
    track.className = 'category-track';
    track.setAttribute('role', 'img');
    track.setAttribute('aria-label', `${category}: ${score.aciertos} de ${score.total}, ${formatPercent(percent)}`);
    const fill = document.createElement('div');
    fill.className = 'category-fill';
    fill.style.width = `${percent}%`;
    track.append(fill);
    row.append(track);
    categoryResults.append(row);
  }
  result.append(categoryResults);

  const average = categoryRows.reduce((sum, item) => sum + item.percent, 0) / categoryRows.length;
  const aboveAverage = categoryRows.filter((item) => item.percent > average);
  const belowAverage = categoryRows.filter((item) => item.percent < average);
  const insights = document.createElement('div');
  insights.className = 'insight-grid';
  const strength = document.createElement('section');
  strength.className = 'insight-card';
  appendText(strength, 'h3', 'Fortalezas relativas');
  appendText(strength, 'p', aboveAverage.length
    ? `Categorías por encima de tu promedio: ${aboveAverage.map((item) => item.category).join(', ')}.`
    : 'No hay categorías por encima de tu promedio en este intento; revisa la retroalimentación para orientar tu estudio.');
  const reinforce = document.createElement('section');
  reinforce.className = 'insight-card';
  appendText(reinforce, 'h3', 'Prioridades para reforzar');
  appendText(reinforce, 'p', belowAverage.length
    ? `Categorías por debajo de tu promedio: ${belowAverage.map((item) => item.category).join(', ')}.`
    : 'No hay categorías por debajo de tu promedio. Puedes revisar las explicaciones para consolidar lo aprendido.');
  insights.append(strength, reinforce);
  result.append(insights);

  appendText(result, 'h3', 'Retroalimentación por pregunta');
  appendText(result, 'p', 'Abre cada pregunta para consultar tu respuesta y la explicación recibida.', 'muted');
  const answerById = new Map(payload.por_pregunta.map((answer) => [answer.id, answer]));
  const reviewList = document.createElement('div');
  reviewList.className = 'review-list';
  state.questions.forEach((question, index) => {
    const answer = answerById.get(question.id);
    if (!answer || typeof answer.correcta !== 'boolean') {
      throw new Error('Falta la retroalimentación de una pregunta en la respuesta del servidor.');
    }
    const details = document.createElement('details');
    details.className = `answer-review ${answer.correcta ? 'correct' : 'incorrect'}`;
    const summaryNode = document.createElement('summary');
    summaryNode.textContent = `Pregunta ${index + 1} · ${answer.correcta ? 'Correcta' : 'Por revisar'} · ${question.categoria}`;
    const content = document.createElement('div');
    content.className = 'answer-review-content';
    appendText(content, 'p', question.enunciado);
    const selectedOption = question.opciones.find((option) => option.id === answer.opcion);
    appendText(content, 'p', `Tu respuesta: ${selectedOption ? `${answer.opcion}. ${selectedOption.texto}` : 'No disponible'}`);
    appendText(content, 'p', answer.retroalimentacion || 'Sin retroalimentación adicional.');
    appendText(content, 'p', answer.justificacion || 'Sin justificación adicional.');
    details.append(summaryNode, content);
    reviewList.append(details);
  });
  result.append(reviewList);

  const actions = document.createElement('div');
  actions.className = 'result-actions';
  const returnLink = document.createElement('a');
  returnLink.className = 'button button-primary';
  returnLink.href = '/?vista=panel';
  returnLink.textContent = 'Volver a mi panel';
  actions.append(returnLink);
  result.append(actions);
  element('feedback').hidden = false;
  result.focus?.();
};

const submitAttempt = async () => {
  showMessage('');
  const count = answeredCount();
  if (count !== EXPECTED_QUESTIONS) {
    showMessage(`Aún hay ${EXPECTED_QUESTIONS - count} preguntas pendientes. Responde todas antes de entregar.`);
    return;
  }
  if (!window.confirm('¿Deseas entregar las respuestas? Esta acción no se puede deshacer.')) return;

  element('submit').disabled = true;
  let payload;
  try {
    payload = await request('/submit', {
      token: state.token,
      respuestas: state.questions.map((question) => ({
        id: question.id,
        opcion: state.answers[question.id],
      })),
    });
  } catch (error) {
    showMessage(error.message);
    element('submit').disabled = false;
    return;
  }

  try {
    validateResult(payload);
    renderResult(payload);
    sessionStorage.removeItem(STORAGE_KEY);
    element('exam').hidden = true;
  } catch (error) {
    sessionStorage.removeItem(STORAGE_KEY);
    element('exam').hidden = true;
    showMessage(`${error.message} El servidor confirmó el envío; no vuelvas a entregar este intento.`);
  }
};

const submitFeedback = async () => {
  showMessage('');
  element('sendFeedback').disabled = true;
  try {
    await request('/feedback', {
      token: state.token,
      calificacion: Number(element('rating').value),
      comentario: element('comment').value,
    });
    element('feedback').hidden = true;
    appendText(element('result'), 'p', 'Gracias. Tu opinión quedó registrada en el piloto.', 'feedback-success');
  } catch (error) {
    showMessage(error.message);
    element('sendFeedback').disabled = false;
  }
};

const initialize = async () => {
  element('accessForm').addEventListener('submit', (event) => {
    event.preventDefault();
    startAttempt();
  });
  element('prev').addEventListener('click', () => moveToQuestion(state.position - 1));
  element('next').addEventListener('click', () => moveToQuestion(state.position + 1));
  element('submit').addEventListener('click', submitAttempt);
  element('sendFeedback').addEventListener('click', submitFeedback);
  element('markReview').addEventListener('click', () => {
    const question = state.questions[state.position];
    if (!question) return;
    state.marked[question.id] = !state.marked[question.id];
    if (!state.marked[question.id]) delete state.marked[question.id];
    if (saveAttempt()) {
      setButtonState(element('markReview'), Boolean(state.marked[question.id]));
      renderQuestionNav();
      element('markReview').focus({ preventScroll: true });
    }
  });
  element('backPanel').addEventListener('click', (event) => {
    if (!element('exam').hidden) {
      event.preventDefault();
      confirmReturnToPanel();
    }
  });
  element('brandPanel').addEventListener('click', (event) => {
    if (!element('exam').hidden) {
      event.preventDefault();
      confirmReturnToPanel();
    }
  });
  element('backPanelDuringExam').addEventListener('click', confirmReturnToPanel);
  try {
    const payload = await request('/info');
    const exam = payload.examen;
    element('examInfo').textContent =
      `${exam.titulo} · ${payload.preguntas} preguntas · duración sugerida: ${exam.duracion_min} minutos.`;
    element('durationFact').textContent = `Duración sugerida: ${exam.duracion_min} min`;
    element('begin').disabled = false;
  } catch (error) {
    element('examInfo').textContent = 'El piloto no está disponible en este entorno.';
    showMessage(error.message);
  }

  if (restoreAttempt()) showExam();
};

initialize();
