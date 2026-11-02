/**
 * SPA MéritoDocente · Editor administrativo del diagnóstico piloto.
 *
 * Archivo clásico (sin módulos ES ni bundler) cargado por indexInicial.html
 * en el orden declarado. Conserva el código original de la Etapa 1.
 * Ver docs/arquitectura-frontend.md.
 */
    function setAdminDiagnosticNotice(message, isSuccess = false) {
      const notice = document.getElementById('adminDiagnosticNotice');
      if (!notice) return;
      notice.textContent = message || '';
      notice.style.color = isSuccess ? 'var(--accent-dark)' : 'var(--danger)';
    }

    function setAdminSelectOptions(select, options, value, placeholder) {
      select.replaceChildren();
      if (!options.length) {
        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = placeholder;
        select.append(empty);
        select.disabled = true;
        return;
      }
      select.disabled = false;
      for (const option of options) {
        const item = document.createElement('option');
        item.value = option.value;
        item.textContent = option.label;
        select.append(item);
      }
      if (options.some((option) => option.value === value)) select.value = value;
    }

    function renderAdminQuestionList() {
      const list = document.getElementById('adminQuestionList');
      list.replaceChildren();
      document.getElementById('adminQuestionCount').textContent = String(adminDiagnosticState.questions.length);
      for (const question of adminDiagnosticState.questions) {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `admin-question-item${question.id === adminDiagnosticState.selectedQuestion ? ' active' : ''}`;
        button.setAttribute('aria-pressed', String(question.id === adminDiagnosticState.selectedQuestion));
        const title = document.createElement('strong');
        title.textContent = `Pregunta ${question.orden} · ${question.categoria}`;
        const status = document.createElement('span');
        const noteCount = question.observaciones_revision?.length || 0;
        status.textContent = `${question.estado_revision || 'Pendiente de revisión'}${noteCount ? ` · ${noteCount} alertas` : ''}`;
        const excerpt = document.createElement('span');
        excerpt.textContent = question.enunciado;
        button.append(title, status, excerpt);
        button.addEventListener('click', () => {
          loadAdminQuestion(question.id, question.observaciones_revision)
            .catch((error) => setAdminDiagnosticNotice(error.message));
        });
        item.append(button);
        list.append(item);
      }
    }

    function renderAdminCategories() {
      const categories = adminDiagnosticState.exams.find(
        (exam) => exam.codigo === adminDiagnosticState.selectedExam
      )?.categorias || [];
      adminDiagnosticState.categories = categories;
      const options = categories.map((category) => ({ value: category, label: category }));
      setAdminSelectOptions(
        document.getElementById('adminCategoryFilter'),
        [{ value: '', label: 'Todas las categorías' }, ...options],
        '',
        'Sin categorías'
      );
      document.getElementById('adminCategoryFilter').disabled = categories.length === 0;
      setAdminSelectOptions(
        document.getElementById('adminQuestionCategory'),
        options,
        options[0]?.value || '',
        'No hay categorías en el examen'
      );
    }

    function setAdminEditorEnabled(enabled) {
      document.getElementById('adminEmptyState').hidden = enabled;
      document.getElementById('adminQuestionForm').hidden = !enabled;
      document.getElementById('adminQuestionFields').disabled = !enabled;
      document.querySelectorAll('#adminQuestionForm .admin-editor-actions button').forEach((button) => {
        button.disabled = !enabled;
      });
    }

    async function loadAdminDiagnostic() {
      if (state.user?.rol !== 'admin') {
        throw new Error('Solo una cuenta administradora puede acceder a la gestión académica.');
      }
      setAdminDiagnosticNotice('');
      const [examData, versionData] = await Promise.all([
        apiFetch('/admin/pilot-diagnostic/exams'),
        apiFetch('/admin/pilot-diagnostic/versions')
      ]);
      adminDiagnosticState.exams = examData.exams || [];
      adminDiagnosticState.versions = versionData.versions || [];
      if (!adminDiagnosticState.exams.length) {
        setAdminDiagnosticNotice('No hay exámenes piloto disponibles para crear borradores.');
        return;
      }

      if (!adminDiagnosticState.exams.some((exam) => exam.codigo === adminDiagnosticState.selectedExam)) {
        adminDiagnosticState.selectedExam = adminDiagnosticState.exams[0].codigo;
      }
      setAdminSelectOptions(
        document.getElementById('adminExamSelect'),
        adminDiagnosticState.exams.map((exam) => ({
          value: exam.codigo,
          label: `${exam.titulo} · v${exam.version} · ${exam.total_preguntas} preguntas`
        })),
        adminDiagnosticState.selectedExam,
        'No hay exámenes'
      );
      renderAdminCategories();
      const versions = adminDiagnosticState.versions.filter(
        (version) => version.codigo === adminDiagnosticState.selectedExam
      );
      if (!versions.some((version) => version.id === adminDiagnosticState.selectedVersion)) {
        adminDiagnosticState.selectedVersion = versions.find((version) => version.estado === 'borrador')?.id || '';
      }
      setAdminSelectOptions(
        document.getElementById('adminVersionSelect'),
        versions.map((version) => ({
          value: version.id,
          label: `${version.version} · ${version.estado} · ${version.total_preguntas} preguntas`
        })),
        adminDiagnosticState.selectedVersion,
        'Aún no hay borradores'
      );
      const selectedVersion = versions.find((version) => version.id === adminDiagnosticState.selectedVersion);
      document.getElementById('adminAddQuestion').disabled = selectedVersion?.estado !== 'borrador';
      if (!adminDiagnosticState.selectedVersion) {
        adminDiagnosticState.questions = [];
        adminDiagnosticState.selectedQuestion = '';
        adminDiagnosticState.nextQuestionOrder = 1;
        renderAdminQuestionList();
        setAdminEditorEnabled(false);
        return;
      }
      await loadAdminQuestions();
    }

    async function loadAdminQuestions(preferredQuestionId = adminDiagnosticState.selectedQuestion) {
      const versionId = document.getElementById('adminVersionSelect').value;
      if (!versionId) return;
      adminDiagnosticState.selectedVersion = versionId;
      const params = new URLSearchParams();
      const category = document.getElementById('adminCategoryFilter').value;
      const search = document.getElementById('adminQuestionSearch').value.trim();
      if (category) params.set('categoria', category);
      if (search) params.set('buscar', search);
      const suffix = params.toString() ? `?${params.toString()}` : '';
      const data = await apiFetch(`/admin/pilot-diagnostic/versions/${encodeURIComponent(versionId)}/questions${suffix}`);
      adminDiagnosticState.questions = data.questions || [];
      adminDiagnosticState.nextQuestionOrder = Number(data.siguiente_orden) || 1;
      const selected = adminDiagnosticState.questions.find((question) => question.id === preferredQuestionId) ||
        adminDiagnosticState.questions[0];
      adminDiagnosticState.selectedQuestion = selected?.id || '';
      renderAdminQuestionList();
      if (selected) await loadAdminQuestion(selected.id, selected.observaciones_revision);
      else setAdminEditorEnabled(false);
    }

    function renderAdminQuestionReviewNotes(notes) {
      const container = document.getElementById('adminQuestionReviewNotes');
      container.replaceChildren();
      for (const note of notes || []) {
        const item = document.createElement('li');
        item.textContent = note;
        container.append(item);
      }
    }

    function beginAdminNewQuestion() {
      const versionId = document.getElementById('adminVersionSelect').value;
      const version = adminDiagnosticState.versions.find((item) => item.id === versionId);
      if (state.user?.rol !== 'admin' || !version || version.estado !== 'borrador') {
        setAdminDiagnosticNotice('Selecciona una versión borrador para añadir una pregunta.');
        return;
      }

      const form = document.getElementById('adminQuestionForm');
      form.dataset.questionId = '';
      form.dataset.isNew = 'true';
      document.getElementById('adminQuestionTitle').textContent = 'Nueva pregunta';
      document.getElementById('adminQuestionStatus').textContent = 'Pendiente de revisión';
      document.getElementById('adminQuestionOrder').value = adminDiagnosticState.nextQuestionOrder;
      document.getElementById('adminQuestionCategory').value = adminDiagnosticState.categories[0] || '';
      document.getElementById('adminQuestionEvidence').value = '';
      document.getElementById('adminQuestionPrompt').value = '';
      document.getElementById('adminQuestionJustification').value = '';
      document.getElementById('adminQuestionSourceUrl').value = '';
      renderAdminOptionFields([], '');
      renderAdminQuestionReviewNotes([
        'Pregunta nueva: confirmar contexto situacional, alineación con la competencia, una sola respuesta defendible y retroalimentación útil para cada alternativa.',
      ]);
      document.getElementById('adminQuestionPreview').hidden = true;
      document.getElementById('adminQuestionHistory').hidden = true;
      setAdminEditorEnabled(true);
      document.getElementById('adminHistoryButton').disabled = true;
      document.getElementById('adminQuestionOrder').focus();
    }

    function renderAdminOptionFields(options, correctCode) {
      const container = document.getElementById('adminOptionFields');
      container.replaceChildren();
      for (const code of ['A', 'B', 'C', 'D']) {
        const option = options.find((item) => item.codigo === code) || {
          codigo: code,
          texto: '',
          retroalimentacion: ''
        };
        const row = document.createElement('div');
        row.className = 'admin-option-row';
        const codeLabel = document.createElement('label');
        codeLabel.className = 'admin-option-code';
        codeLabel.htmlFor = `adminOptionText${code}`;
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'adminCorrectKey';
        radio.value = code;
        radio.checked = code === correctCode;
        radio.setAttribute('aria-label', `Marcar opción ${code} como correcta`);
        const codeText = document.createElement('span');
        codeText.textContent = code;
        codeLabel.append(radio, codeText);

        const fields = document.createElement('div');
        const textLabel = document.createElement('label');
        textLabel.htmlFor = `adminOptionText${code}`;
        textLabel.textContent = `Texto de la opción ${code}`;
        const text = document.createElement('textarea');
        text.id = `adminOptionText${code}`;
        text.rows = 3;
        text.required = true;
        text.maxLength = 5000;
        text.value = option.texto || '';
        const feedbackLabel = document.createElement('label');
        feedbackLabel.htmlFor = `adminOptionFeedback${code}`;
        feedbackLabel.textContent = 'Retroalimentación para esta alternativa';
        const feedback = document.createElement('textarea');
        feedback.id = `adminOptionFeedback${code}`;
        feedback.rows = 2;
        feedback.maxLength = 5000;
        feedback.minLength = 20;
        feedback.required = true;
        feedback.value = option.retroalimentacion || '';
        feedback.placeholder = 'Explica por qué esta alternativa es adecuada o qué razonamiento debe revisarse (mínimo 20 caracteres).';
        fields.append(textLabel, text, feedbackLabel, feedback);
        row.append(codeLabel, fields);
        container.append(row);
      }
    }

    async function loadAdminQuestion(questionId, listReviewNotes = []) {
      const versionId = document.getElementById('adminVersionSelect').value;
      if (!versionId || !questionId) return;
      const data = await apiFetch(
        `/admin/pilot-diagnostic/versions/${encodeURIComponent(versionId)}/questions/${encodeURIComponent(questionId)}`
      );
      const question = data.question;
      adminDiagnosticState.selectedQuestion = question.id;
      renderAdminQuestionList();
      document.getElementById('adminQuestionTitle').textContent = `Pregunta ${question.orden}`;
      document.getElementById('adminQuestionStatus').textContent =
        question.version.estado === 'borrador' ? 'Pendiente de revisión' : question.version.estado;
      document.getElementById('adminQuestionOrder').value = question.orden;
      document.getElementById('adminQuestionCategory').value = question.categoria;
      document.getElementById('adminQuestionEvidence').value = question.evidencia;
      document.getElementById('adminQuestionPrompt').value = question.enunciado;
      document.getElementById('adminQuestionJustification').value = question.justificacion;
      document.getElementById('adminQuestionSourceUrl').value = question.fuente_url || '';
      renderAdminOptionFields(question.opciones, question.clave);
      renderAdminQuestionReviewNotes([
        ...(question.observaciones_revision || []),
        ...listReviewNotes.filter((note) => !(question.observaciones_revision || []).includes(note)),
      ]);
      document.getElementById('adminQuestionPreview').hidden = true;
      document.getElementById('adminQuestionHistory').hidden = true;
      document.getElementById('adminHistoryButton').disabled = false;
      setAdminEditorEnabled(question.version.estado === 'borrador');
      document.getElementById('adminQuestionForm').dataset.questionId = question.id;
      document.getElementById('adminQuestionForm').dataset.isNew = 'false';
    }

    async function createAdminDraft() {
      const button = document.getElementById('adminCreateVersion');
      const version = document.getElementById('adminVersionName').value.trim();
      if (!version) {
        setAdminDiagnosticNotice('Escribe un nombre para la nueva versión borrador.');
        document.getElementById('adminVersionName').focus();
        return;
      }
      button.disabled = true;
      setAdminDiagnosticNotice('');
      try {
        const data = await apiFetch('/admin/pilot-diagnostic/versions', {
          method: 'POST',
          body: { codigo: adminDiagnosticState.selectedExam, version }
        });
        adminDiagnosticState.selectedVersion = data.version.id;
        document.getElementById('adminVersionName').value = '';
        setAdminDiagnosticNotice('Borrador creado desde el examen actual. La versión publicada permanece intacta.', true);
        await loadAdminDiagnostic();
        document.getElementById('adminVersionSelect').value = data.version.id;
        adminDiagnosticState.selectedVersion = data.version.id;
        await loadAdminQuestions();
      } catch (error) {
        setAdminDiagnosticNotice(error.message);
      } finally {
        button.disabled = false;
      }
    }

    function resetAdminImportPreview() {
      adminDiagnosticState.importPreview = null;
      document.getElementById('adminImportPreview').replaceChildren();
      document.getElementById('adminImportPreview').hidden = true;
      document.getElementById('adminImportConfirmLabel').hidden = true;
      document.getElementById('adminImportConfirmCheck').checked = false;
      document.getElementById('adminConfirmImport').disabled = true;
    }

    function updateAdminImportControls() {
      const fileInput = document.getElementById('adminImportFile');
      const versionName = document.getElementById('adminImportVersionName').value.trim();
      const file = fileInput.files && fileInput.files[0];
      adminDiagnosticState.importFile = file || null;
      document.getElementById('adminPreviewImport').disabled =
        adminDiagnosticState.importing ||
        state.user?.rol !== 'admin' ||
        !file ||
        !versionName ||
        !adminDiagnosticState.selectedExam;
    }

    function renderAdminImportPreview(preview) {
      const section = document.getElementById('adminImportPreview');
      section.replaceChildren();
      const summary = document.createElement('p');
      summary.textContent =
        `Detectadas: ${preview.preguntas_detectadas} · Válidas: ${preview.preguntas_validas} · ` +
        `Con errores: ${preview.preguntas_con_errores} · Posibles duplicados: ${preview.posibles_duplicados.length}.`;
      section.append(summary);

      if (preview.errores.length) {
        const heading = document.createElement('strong');
        heading.textContent = 'Errores que bloquean la confirmación';
        const errors = document.createElement('ul');
        errors.className = 'admin-import-errors';
        for (const error of preview.errores) {
          const item = document.createElement('li');
          item.textContent = `${error.fila ? `Fila ${error.fila}: ` : ''}${error.mensaje}`;
          errors.append(item);
        }
        section.append(heading, errors);
      }

      if (preview.posibles_duplicados.length) {
        const heading = document.createElement('strong');
        heading.textContent = 'Posibles preguntas duplicadas o similares (revisión orientativa)';
        const duplicates = document.createElement('ul');
        duplicates.className = 'admin-import-duplicates';
        for (const duplicate of preview.posibles_duplicados) {
          const item = document.createElement('li');
          item.textContent = `Fila ${duplicate.fila} · pregunta ${duplicate.numero}: ${duplicate.observaciones.join(' ')}`;
          duplicates.append(item);
        }
        section.append(heading, duplicates);
      }

      const questionsHeading = document.createElement('strong');
      questionsHeading.textContent = 'Vista previa del contenido';
      section.append(questionsHeading);
      for (const question of preview.preguntas) {
        const details = document.createElement('details');
        const summaryItem = document.createElement('summary');
        summaryItem.textContent = `Fila ${question.fila} · Pregunta ${question.orden} · ${question.categoria}`;
        details.append(summaryItem);
        for (const [label, value] of [
          ['Evidencia', question.evidencia],
          ['Enunciado', question.enunciado],
          ['Justificación', question.justificacion],
          ['Clave correcta', question.clave],
          ['Fuente URL', question.fuente_url || 'No indicada'],
        ]) {
          const paragraph = document.createElement('p');
          paragraph.textContent = `${label}: ${value}`;
          details.append(paragraph);
        }
        for (const option of question.opciones) {
          const paragraph = document.createElement('p');
          paragraph.className = 'admin-preview-option';
          paragraph.textContent =
            `${option.codigo}. ${option.texto} · Retroalimentación: ${option.retroalimentacion}`;
          details.append(paragraph);
        }
        for (const note of question.observaciones_revision || []) {
          const paragraph = document.createElement('p');
          paragraph.className = 'admin-import-duplicates';
          paragraph.textContent = note;
          details.append(paragraph);
        }
        section.append(details);
      }
      section.hidden = false;
      const canConfirm = preview.confirmable && preview.preguntas_con_errores === 0;
      document.getElementById('adminImportConfirmLabel').hidden = !canConfirm;
      document.getElementById('adminConfirmImport').disabled = !canConfirm || adminDiagnosticState.importing;
    }

    async function sendAdminImportRequest(endpoint, file, confirmationToken = '') {
      const token = localStorage.getItem(TOKEN_KEY);
      const headers = {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'X-Upload-Filename': encodeURIComponent(file.name),
        'X-Exam-Code': adminDiagnosticState.selectedExam,
        'X-Editorial-Version': document.getElementById('adminImportVersionName').value.trim(),
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      if (confirmationToken) headers['X-Import-Token'] = confirmationToken;
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers,
        body: file,
      });
      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      if (!response.ok) {
        throw new Error(data?.error || `No fue posible procesar el archivo (HTTP ${response.status}).`);
      }
      return data;
    }

    async function previewAdminImport() {
      if (adminDiagnosticState.importing) return;
      const fileInput = document.getElementById('adminImportFile');
      const file = fileInput.files && fileInput.files[0];
      if (state.user?.rol !== 'admin' || !file) {
        setAdminDiagnosticNotice('Selecciona un archivo .xlsx para analizar.');
        return;
      }
      if (!/\.xlsx$/i.test(file.name)) {
        setAdminDiagnosticNotice('Solo se admite un archivo .xlsx sin macros.');
        return;
      }

      adminDiagnosticState.importing = true;
      resetAdminImportPreview();
      document.getElementById('adminImportProgress').hidden = false;
      document.getElementById('adminImportProgressText').textContent = 'Analizando archivo sin guardar preguntas…';
      document.getElementById('adminPreviewImport').disabled = true;
      document.getElementById('adminConfirmImport').disabled = true;
      setAdminDiagnosticNotice('');
      try {
        const preview = await sendAdminImportRequest('/admin/pilot-diagnostic/imports/preview', file);
        adminDiagnosticState.importPreview = preview;
        renderAdminImportPreview(preview);
        setAdminDiagnosticNotice(
          `Análisis completo: ${preview.preguntas_detectadas} detectadas, ` +
          `${preview.preguntas_validas} válidas y ${preview.preguntas_con_errores} con errores.`,
          preview.confirmable
        );
      } catch (error) {
        setAdminDiagnosticNotice(error.message);
      } finally {
        adminDiagnosticState.importing = false;
        document.getElementById('adminImportProgress').hidden = true;
        updateAdminImportControls();
        if (adminDiagnosticState.importPreview?.confirmable) {
          document.getElementById('adminConfirmImport').disabled =
            !document.getElementById('adminImportConfirmCheck').checked;
        }
      }
    }

    async function downloadAdminImportTemplate() {
      try {
        const headers = {};
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch(`${API_BASE}/admin/pilot-diagnostic/import-template`, { headers });
        if (!response.ok) throw new Error(`No fue posible descargar la plantilla (HTTP ${response.status}).`);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'plantilla-importacion-preguntas.xlsx';
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } catch (error) {
        setAdminDiagnosticNotice(error.message);
      }
    }

    async function confirmAdminImport() {
      const preview = adminDiagnosticState.importPreview;
      const file = adminDiagnosticState.importFile;
      if (
        adminDiagnosticState.importing ||
        state.user?.rol !== 'admin' ||
        !file ||
        !preview?.confirmable ||
        !document.getElementById('adminImportConfirmCheck').checked
      ) {
        return;
      }

      adminDiagnosticState.importing = true;
      document.getElementById('adminImportProgress').hidden = false;
      document.getElementById('adminImportProgressText').textContent = 'Guardando versión borrador en una transacción…';
      document.getElementById('adminConfirmImport').disabled = true;
      document.getElementById('adminPreviewImport').disabled = true;
      setAdminDiagnosticNotice('');
      try {
        const data = await sendAdminImportRequest(
          '/admin/pilot-diagnostic/imports/confirm',
          file,
          preview.confirmation_token
        );
        adminDiagnosticState.selectedVersion = data.version.id;
        adminDiagnosticState.importPreview = null;
        adminDiagnosticState.importFile = null;
        document.getElementById('adminImportFile').value = '';
        document.getElementById('adminImportVersionName').value = '';
        document.getElementById('adminImportConfirmCheck').checked = false;
        resetAdminImportPreview();
        await loadAdminDiagnostic();
        setAdminDiagnosticNotice(
          `Se creó el borrador "${data.version.version}" con ${data.version.total_preguntas} preguntas. El examen activo y sus resultados no se modificaron.`,
          true
        );
      } catch (error) {
        setAdminDiagnosticNotice(error.message);
      } finally {
        adminDiagnosticState.importing = false;
        document.getElementById('adminImportProgress').hidden = true;
        updateAdminImportControls();
        document.getElementById('adminConfirmImport').disabled =
          !adminDiagnosticState.importPreview?.confirmable ||
          !document.getElementById('adminImportConfirmCheck').checked;
      }
    }

    async function saveAdminQuestion(event) {
      event.preventDefault();
      if (adminDiagnosticState.saving) return;
      const form = document.getElementById('adminQuestionForm');
      const questionId = form.dataset.questionId;
      const isNew = form.dataset.isNew === 'true';
      const versionId = document.getElementById('adminVersionSelect').value;
      const correct = document.querySelector('input[name="adminCorrectKey"]:checked');
      if (!correct) {
        setAdminDiagnosticNotice('Selecciona una única respuesta correcta.');
        return;
      }
      const payload = {
        orden: Number(document.getElementById('adminQuestionOrder').value),
        categoria: document.getElementById('adminQuestionCategory').value,
        evidencia: document.getElementById('adminQuestionEvidence').value,
        enunciado: document.getElementById('adminQuestionPrompt').value,
        clave: correct.value,
        justificacion: document.getElementById('adminQuestionJustification').value,
        fuente_url: document.getElementById('adminQuestionSourceUrl').value,
        opciones: ['A', 'B', 'C', 'D'].map((code) => ({
          codigo: code,
          texto: document.getElementById(`adminOptionText${code}`).value,
          retroalimentacion: document.getElementById(`adminOptionFeedback${code}`).value
        }))
      };
      setAdminDiagnosticNotice('');
      adminDiagnosticState.saving = true;
      form.querySelectorAll('button[type="submit"]').forEach((button) => {
        button.disabled = true;
      });
      try {
        const endpoint = `/admin/pilot-diagnostic/versions/${encodeURIComponent(versionId)}/questions`;
        const data = await apiFetch(
          isNew ? endpoint : `${endpoint}/${encodeURIComponent(questionId)}`,
          { method: isNew ? 'POST' : 'PUT', body: payload }
        );
        setAdminDiagnosticNotice(isNew ? 'Pregunta añadida al borrador.' : 'Cambios guardados en el borrador.', true);
        await loadAdminQuestions(data.question.id);
      } catch (error) {
        setAdminDiagnosticNotice(error.message);
      } finally {
        adminDiagnosticState.saving = false;
        const fieldsDisabled = document.getElementById('adminQuestionFields').disabled;
        form.querySelectorAll('button[type="submit"]').forEach((button) => {
          button.disabled = fieldsDisabled;
        });
      }
    }

    function showAdminQuestionPreview() {
      const preview = document.getElementById('adminQuestionPreview');
      preview.replaceChildren();
      const heading = document.createElement('h3');
      heading.textContent = 'Vista previa del participante';
      const evidence = document.createElement('p');
      evidence.textContent = document.getElementById('adminQuestionEvidence').value;
      const prompt = document.createElement('p');
      prompt.textContent = document.getElementById('adminQuestionPrompt').value;
      const sourceUrl = document.createElement('p');
      sourceUrl.textContent = `Fuente URL: ${document.getElementById('adminQuestionSourceUrl').value || 'No indicada'}`;
      preview.append(heading, evidence, prompt, sourceUrl);
      for (const code of ['A', 'B', 'C', 'D']) {
        const option = document.createElement('p');
        option.className = 'admin-preview-option';
        option.textContent = `${code}. ${document.getElementById(`adminOptionText${code}`).value}`;
        preview.append(option);
      }
      preview.hidden = false;
    }

    async function showAdminQuestionHistory() {
      const versionId = document.getElementById('adminVersionSelect').value;
      const questionId = document.getElementById('adminQuestionForm').dataset.questionId;
      const section = document.getElementById('adminQuestionHistory');
      section.replaceChildren();
      const heading = document.createElement('h3');
      heading.textContent = 'Historial editorial';
      section.append(heading);
      try {
        const data = await apiFetch(
          `/admin/pilot-diagnostic/versions/${encodeURIComponent(versionId)}/questions/${encodeURIComponent(questionId)}/history`
        );
        if (!data.history.length) {
          const empty = document.createElement('p');
          empty.textContent = 'Todavía no hay cambios registrados para esta pregunta.';
          section.append(empty);
        }
        for (const entry of data.history) {
          const item = document.createElement('article');
          item.className = 'admin-history-entry';
          const title = document.createElement('strong');
          title.textContent = `${entry.accion} · ${entry.actor_nombre || 'Administrador'} · ${new Date(entry.creado_en).toLocaleString()}`;
          const snapshot = document.createElement('pre');
          snapshot.textContent = JSON.stringify({ antes: entry.antes, despues: entry.despues }, null, 2);
          item.append(title, snapshot);
          section.append(item);
        }
        section.hidden = false;
      } catch (error) {
        setAdminDiagnosticNotice(error.message);
      }
    }

