const { cargarSpa } = require('./spa-dom');

const VERSION_ID = 'eeb7b88c-1d3c-4a2d-8a15-4f4a98261111';
const QUESTION_ID = 'dab5fdf0-20a1-4e51-9bf7-d4034f001111';
const IMPORTED_VERSION_ID = 'eeb7b88c-1d3c-4a2d-8a15-4f4a98262222';
const EXAM_CODE = 'MD-DIA-2026-PILOTO-001';

const waitFor = async (condition, timeout = 3000) => {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) throw new Error('Timed out waiting for UI state.');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

const createMockApi = (role) => {
  const requests = [];
  let version = null;
  let importedVersion = null;
  let question = {
    id: QUESTION_ID,
    version_id: VERSION_ID,
    orden: 1,
    categoria: 'Pedagogía',
    evidencia: 'Analiza una situación de aula.',
    enunciado: 'Una situación de prueba plantea una decisión pedagógica.',
    clave: 'A',
    justificacion: 'La decisión considera las evidencias del aprendizaje.',
    version: { estado: 'borrador' },
    opciones: ['A', 'B', 'C', 'D'].map((codigo) => ({
      codigo,
      texto: `Alternativa ${codigo}`,
      retroalimentacion: `Explica el razonamiento de la alternativa ${codigo}.`,
    })),
  };
  const exam = {
    codigo: EXAM_CODE,
    titulo: 'Diagnóstico piloto',
    version: '1',
    estado: 'publicado',
    total_preguntas: 50,
    categorias: ['Pedagogía'],
  };
  let questions = Array.from({ length: 50 }, (_, index) => ({
    id: index === 0 ? QUESTION_ID : `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    orden: index + 1,
    categoria: 'Pedagogía',
    enunciado: `Situación de evaluación ${index + 1}.`,
    estado_revision: 'pendiente de revisión',
  }));

  const fetch = async (url, options = {}) => {
    const requestUrl = new URL(url);
    const endpoint = requestUrl.pathname.replace('/api/v1', '');
    const method = options.method || 'GET';
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : null;
    requests.push({ endpoint, method, body, headers: options.headers || {} });

    let data = {};
    if (endpoint === '/auth/me') {
      data = { user: { id: 12, nombre: 'Administradora', rol: role } };
    } else if (endpoint === '/courses') {
      data = { courses: [] };
    } else if (endpoint === '/progress') {
      data = { modules: [], badges: [] };
    } else if (endpoint === '/diagnostico-piloto/info') {
      data = { examen: { duracion_min: 85 } };
    } else if (endpoint === '/admin/pilot-diagnostic/exams') {
      data = { exams: [exam] };
    } else if (endpoint === '/admin/pilot-diagnostic/versions') {
      if (method === 'POST') {
        version = {
          id: VERSION_ID,
          codigo: EXAM_CODE,
          version: body.version,
          estado: 'borrador',
          total_preguntas: 1,
        };
        data = { version };
      } else {
        data = { versions: [importedVersion, version].filter(Boolean) };
      }
    } else if (endpoint === '/admin/pilot-diagnostic/import-template') {
      return {
        ok: true,
        status: 200,
        blob: async () => ({}),
        json: async () => ({}),
      };
    } else if (endpoint === '/admin/pilot-diagnostic/imports/preview') {
      data = {
        version: { codigo: EXAM_CODE, nombre: 'Importación JSDOM' },
        preguntas_detectadas: 1,
        preguntas_validas: 1,
        preguntas_con_errores: 0,
        errores: [],
        posibles_duplicados: [],
        confirmable: true,
        confirmation_token: 'signed-preview-token',
        preguntas: [{
          fila: 6,
          orden: 1,
          categoria: 'Pedagogía',
          evidencia: 'Analiza evidencias del aprendizaje.',
          enunciado: 'Una docente analiza evidencias de aprendizaje y decide cómo ajustar la estrategia pedagógica.',
          clave: 'A',
          justificacion: 'La decisión se basa en evidencias y permite seguimiento formativo.',
          fuente_url: null,
          opciones: ['A', 'B', 'C', 'D'].map((codigo) => ({
            codigo,
            texto: `Alternativa ${codigo}`,
            retroalimentacion: `Explicación pedagógica para la alternativa ${codigo}.`,
          })),
          observaciones_revision: [],
        }],
      };
    } else if (endpoint === '/admin/pilot-diagnostic/imports/confirm') {
      importedVersion = {
        id: IMPORTED_VERSION_ID,
        codigo: EXAM_CODE,
        version: 'Importación JSDOM',
        estado: 'borrador',
        total_preguntas: 1,
      };
      version = null;
      questions = [{
        id: QUESTION_ID,
        orden: 1,
        categoria: 'Pedagogía',
        enunciado: 'Una docente analiza evidencias de aprendizaje y decide cómo ajustar la estrategia pedagógica.',
        estado_revision: 'pendiente de revisión',
      }];
      question = {
        ...question,
        version_id: IMPORTED_VERSION_ID,
        version: { estado: 'borrador' },
      };
      data = { version: importedVersion };
    } else if (
      endpoint.endsWith(`/versions/${VERSION_ID}/questions`) ||
      endpoint.endsWith(`/versions/${IMPORTED_VERSION_ID}/questions`)
    ) {
      if (method === 'POST') {
        const id = '00000000-0000-4000-8000-000000000051';
        question = { ...body, id, version_id: VERSION_ID, version: { estado: 'borrador' } };
        questions = [...questions, {
          id,
          orden: body.orden,
          categoria: body.categoria,
          enunciado: body.enunciado,
          estado_revision: 'pendiente de revisión',
        }];
        data = { question };
      } else {
        data = { questions, siguiente_orden: questions.length + 1 };
      }
    } else if (
      endpoint.endsWith(`/versions/${VERSION_ID}/questions/${QUESTION_ID}/history`) ||
      endpoint.endsWith(`/versions/${IMPORTED_VERSION_ID}/questions/${QUESTION_ID}/history`)
    ) {
      data = { history: [] };
    } else if (
      (endpoint.includes(`/versions/${VERSION_ID}/questions/`) ||
        endpoint.includes(`/versions/${IMPORTED_VERSION_ID}/questions/`)) &&
      !endpoint.endsWith('/history')
    ) {
      if (method === 'PUT') {
        question = { ...question, ...body, opciones: body.opciones };
        data = { question };
      } else {
        data = { question };
      }
    }

    return {
      ok: true,
      status: 200,
      json: async () => data,
    };
  };

  return { fetch, requests };
};

const loadPage = async (role) => {
  const mockApi = createMockApi(role);
  const dom = await cargarSpa({
    url: 'http://localhost/?vista=panel',
    beforeParse(window) {
      window.localStorage.setItem('auth_token', 'mock-session-token');
      window.fetch = mockApi.fetch;
    },
  });
  await waitFor(() => {
    const dashboard = dom.window.document.getElementById('view-dashboard');
    return dashboard && !dashboard.classList.contains('hidden');
  });
  return { dom, window: dom.window, requests: mockApi.requests };
};

describe('Interfaz administrativa del diagnóstico piloto', () => {
  test('el administrador crea y edita un borrador, ve la vista previa y el historial', async () => {
    const { dom, window, requests } = await loadPage('admin');
    const document = window.document;

    try {
      const shortcut = document.getElementById('adminDashboardShortcut');
      expect(shortcut.style.display).toBe('flex');
      shortcut.querySelector('button').click();
      await waitFor(() => document.getElementById('adminExamSelect').options.length === 1);
      expect(document.getElementById('view-admin-diagnostic').classList.contains('hidden')).toBe(false);

      document.getElementById('adminVersionName').value = 'borrador de prueba';
      document.getElementById('adminCreateVersion').click();
      await waitFor(() => !document.getElementById('adminQuestionForm').hidden);
      await waitFor(() => document.getElementById('adminQuestionList').children.length === 50);
      expect(document.getElementById('adminQuestionList').children).toHaveLength(50);
      expect(document.getElementById('adminDownloadTemplate')).toBeTruthy();
      expect(document.getElementById('adminImportFile').accept).toContain('.xlsx');
      expect(requests.some((request) =>
        request.endpoint === '/admin/pilot-diagnostic/versions' &&
        request.method === 'POST'
      )).toBe(true);

      document.getElementById('adminQuestionPrompt').value = 'Enunciado editado de prueba.';
      document.getElementById('adminOptionTextA').value = 'Alternativa revisada A';
      document.querySelector('input[name="adminCorrectKey"][value="B"]').checked = true;
      document.getElementById('adminQuestionForm').dispatchEvent(
        new window.Event('submit', { bubbles: true, cancelable: true })
      );
      await waitFor(() => document.getElementById('adminDiagnosticNotice').textContent.includes('guardados'));
      expect(requests.some((request) =>
        request.method === 'PUT' &&
        request.body.enunciado === 'Enunciado editado de prueba.' &&
        request.body.clave === 'B'
      )).toBe(true);

      document.getElementById('adminPreviewButton').click();
      const preview = document.getElementById('adminQuestionPreview');
      expect(preview.hidden).toBe(false);
      expect(preview.textContent).toContain('Alternativa revisada A');
      expect(preview.textContent).not.toContain('Respuesta correcta');

      document.getElementById('adminHistoryButton').click();
      await waitFor(() => !document.getElementById('adminQuestionHistory').hidden);
      expect(requests.some((request) => request.endpoint.endsWith('/history'))).toBe(true);
      expect(window.localStorage.getItem('auth_token')).toBe('mock-session-token');

      document.getElementById('adminAddQuestion').click();
      expect(document.getElementById('adminQuestionTitle').textContent).toBe('Nueva pregunta');
      document.getElementById('adminQuestionEvidence').value = 'Evalúa una decisión docente ante evidencias del aprendizaje.';
      document.getElementById('adminQuestionPrompt').value = 'En una institución educativa, una docente revisa evidencias diversas de sus estudiantes y debe decidir qué estrategia pedagógica implementar durante el siguiente periodo.';
      document.getElementById('adminQuestionJustification').value = 'La decisión debe partir de las evidencias, atender la diversidad del grupo y permitir seguimiento formativo.';
      for (const code of ['A', 'B', 'C', 'D']) {
        document.getElementById(`adminOptionText${code}`).value = `Alternativa de decisión pedagógica ${code}`;
        document.getElementById(`adminOptionFeedback${code}`).value =
          `Esta alternativa requiere valorar sus efectos pedagógicos para el grupo ${code}.`;
      }
      document.querySelector('input[name="adminCorrectKey"][value="A"]').checked = true;
      document.getElementById('adminQuestionForm').dispatchEvent(
        new window.Event('submit', { bubbles: true, cancelable: true })
      );
      await waitFor(() => document.getElementById('adminDiagnosticNotice').textContent.includes('Pregunta añadida'));
      expect(requests.some((request) =>
        request.endpoint === `/admin/pilot-diagnostic/versions/${VERSION_ID}/questions` &&
        request.method === 'POST' &&
        request.body.orden === 51 &&
        request.body.opciones.every((option) => option.retroalimentacion.length >= 20)
      )).toBe(true);

      document.getElementById('adminImportVersionName').value = 'Importación JSDOM';
      const fileInput = document.getElementById('adminImportFile');
      Object.defineProperty(fileInput, 'files', {
        configurable: true,
        value: [new window.File(['mock xlsx content'], 'preguntas.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })],
      });
      fileInput.dispatchEvent(new window.Event('change', { bubbles: true }));
      document.getElementById('adminPreviewImport').click();
      await waitFor(() => !document.getElementById('adminImportPreview').hidden);
      await waitFor(() => document.getElementById('adminImportProgress').hidden);
      expect(document.getElementById('adminImportPreview').textContent).toContain('Detectadas: 1');
      expect(requests.some((request) =>
        request.endpoint === '/admin/pilot-diagnostic/imports/preview' &&
        request.method === 'POST' &&
        request.body === null
      )).toBe(true);
      document.getElementById('adminImportConfirmCheck').click();
      expect(document.getElementById('adminConfirmImport').disabled).toBe(false);
      document.getElementById('adminConfirmImport').click();
      await waitFor(() => document.getElementById('adminDiagnosticNotice').textContent.includes('Se creó el borrador'));
      expect(requests.some((request) =>
        request.endpoint === '/admin/pilot-diagnostic/imports/confirm' &&
        request.headers['X-Import-Token'] === 'signed-preview-token'
      )).toBe(true);
    } finally {
      window.close();
      dom.window.close();
    }
  });

  test('un estudiante no ve el acceso administrativo y no puede abrir su vista', async () => {
    const { dom, window } = await loadPage('estudiante');
    const document = window.document;

    try {
      expect(document.getElementById('adminDiagnosticNav').style.display).toBe('none');
      expect(document.getElementById('adminDashboardShortcut').style.display).toBe('none');
      window.showView('admin-diagnostic');
      expect(document.getElementById('view-admin-diagnostic').classList.contains('hidden')).toBe(true);
      expect(document.getElementById('view-dashboard').classList.contains('hidden')).toBe(false);
    } finally {
      window.close();
      dom.window.close();
    }
  });
});
