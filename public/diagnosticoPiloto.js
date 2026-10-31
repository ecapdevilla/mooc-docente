'use strict';

const API = '/api/v1/diagnostico-piloto';
const STORAGE_KEY = 'merito-docente-piloto-attempt';
const EXPECTED_QUESTIONS = 50;
const element = (id) => document.getElementById(id);
const state = {
  token: null,
  questions: [],
  answers: {},
  position: 0,
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
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'No se pudo completar la solicitud.');
  return payload;
};

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
    if (
      typeof parsed.token !== 'string' ||
      !Array.isArray(parsed.questions) ||
      parsed.questions.length !== EXPECTED_QUESTIONS ||
      typeof parsed.answers !== 'object' ||
      parsed.answers === null ||
      !Number.isInteger(parsed.position) ||
      parsed.position < 0 ||
      parsed.position >= EXPECTED_QUESTIONS
    ) {
      sessionStorage.removeItem(STORAGE_KEY);
      return false;
    }

    Object.assign(state, parsed);
    return true;
  } catch (error) {
    showMessage('No se pudo recuperar el intento guardado en esta pestaña.');
    return false;
  }
};

const appendText = (parent, tag, content) => {
  const node = document.createElement(tag);
  node.textContent = content;
  parent.append(node);
  return node;
};

const renderQuestion = () => {
  const question = state.questions[state.position];
  const answeredCount = Object.keys(state.answers).length;
  element('counter').textContent =
    `Pregunta ${state.position + 1} de ${state.questions.length} · ` +
    `${answeredCount} respondidas · ${question.categoria}`;
  element('fill').style.width = `${(answeredCount / state.questions.length) * 100}%`;

  const container = element('question');
  container.replaceChildren();
  const fieldset = document.createElement('fieldset');
  appendText(fieldset, 'legend', question.enunciado);

  for (const option of question.opciones) {
    const label = document.createElement('label');
    label.className = 'option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'answer';
    input.value = option.id;
    input.checked = state.answers[question.id] === option.id;
    input.addEventListener('change', () => {
      state.answers[question.id] = option.id;
      if (saveAttempt()) renderQuestion();
    });
    label.append(input, document.createTextNode(`${option.id}. ${option.texto}`));
    fieldset.append(label);
  }

  container.append(fieldset);
  element('prev').disabled = state.position === 0;
  element('next').hidden = state.position === state.questions.length - 1;
  element('submit').hidden = state.position !== state.questions.length - 1;
};

const showExam = () => {
  element('start').hidden = true;
  element('exam').hidden = false;
  renderQuestion();
};

const startAttempt = async () => {
  showMessage('');
  element('begin').disabled = true;
  try {
    const payload = await request('/start', { codigo_acceso: element('access').value });
    if (!Array.isArray(payload.preguntas) || payload.preguntas.length !== EXPECTED_QUESTIONS) {
      throw new Error('El servidor no entregó un conjunto de preguntas válido.');
    }
    Object.assign(state, {
      token: payload.token,
      questions: payload.preguntas,
      answers: {},
      position: 0,
    });
    element('access').value = '';
    if (!saveAttempt()) return;
    element('start').hidden = true;
    showExam();
  } catch (error) {
    showMessage(error.message);
  } finally {
    element('begin').disabled = false;
  }
};

const submitAttempt = async () => {
  showMessage('');
  const answerCount = Object.keys(state.answers).length;
  if (answerCount !== EXPECTED_QUESTIONS) {
    showMessage(`Debes responder las 50 preguntas. Faltan ${EXPECTED_QUESTIONS - answerCount}.`);
    return;
  }
  if (!window.confirm('¿Deseas entregar las respuestas? Esta acción no se puede deshacer.')) return;

  element('submit').disabled = true;
  try {
    const payload = await request('/submit', {
      token: state.token,
      respuestas: state.questions.map((question) => ({
        id: question.id,
        opcion: state.answers[question.id],
      })),
    });
    sessionStorage.removeItem(STORAGE_KEY);
    element('exam').hidden = true;
    renderResult(payload);
  } catch (error) {
    showMessage(error.message);
    element('submit').disabled = false;
  }
};

const renderResult = (payload) => {
  const result = element('result');
  result.replaceChildren();
  result.hidden = false;
  appendText(result, 'h2', `Resultado: ${payload.aciertos} / ${payload.total}`);
  appendText(result, 'p', 'El resultado es orientativo y no equivale a una calificación de la CNSC.');
  appendText(result, 'h3', 'Resultados por categoría');
  for (const [category, score] of Object.entries(payload.por_categoria)) {
    appendText(result, 'p', `${category}: ${score.aciertos} de ${score.total}`);
  }
  appendText(result, 'h3', 'Retroalimentación de respuestas');
  for (const [index, answer] of payload.por_pregunta.entries()) {
    const review = document.createElement('div');
    review.className = 'review';
    appendText(review, 'strong', `${index + 1}. ${answer.correcta ? 'Correcta' : 'Por revisar'}`);
    appendText(review, 'p', answer.retroalimentacion || 'Sin retroalimentación adicional.');
    appendText(review, 'p', answer.justificacion || 'Sin justificación adicional.');
    result.append(review);
  }
  element('feedback').hidden = false;
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
    appendText(element('result'), 'p', 'Gracias. Tu opinión quedó registrada en el piloto.');
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
  element('prev').addEventListener('click', () => {
    if (state.position > 0) {
      const previousPosition = state.position;
      state.position -= 1;
      if (saveAttempt()) renderQuestion();
      else state.position = previousPosition;
    }
  });
  element('next').addEventListener('click', () => {
    if (state.position < state.questions.length - 1) {
      const previousPosition = state.position;
      state.position += 1;
      if (saveAttempt()) renderQuestion();
      else state.position = previousPosition;
    }
  });
  element('submit').addEventListener('click', submitAttempt);
  element('sendFeedback').addEventListener('click', submitFeedback);

  try {
    const payload = await request('/info');
    const exam = payload.examen;
    element('examInfo').textContent =
      `${exam.titulo} · ${payload.preguntas} preguntas · ` +
      `${exam.duracion_min} minutos sugeridos (${exam.version}).`;
    element('begin').disabled = false;
  } catch (error) {
    element('examInfo').textContent = 'El piloto no está disponible en este entorno.';
    showMessage(error.message);
    return;
  }

  if (restoreAttempt()) showExam();
};

initialize();
