/**
 * SPA MéritoDocente · Arranque de la vista administrativa del diagnóstico.
 *
 * Archivo clásico (sin módulos ES ni bundler) cargado por indexInicial.html
 * en el orden declarado. Conserva el código original de la Etapa 1.
 * Ver docs/arquitectura-frontend.md.
 */
    function initializeAdminDiagnostic() {
      if (adminDiagnosticState.listenersReady) return;
      adminDiagnosticState.listenersReady = true;
      document.getElementById('adminExamSelect').addEventListener('change', async (event) => {
        adminDiagnosticState.selectedExam = event.target.value;
        adminDiagnosticState.selectedVersion = '';
        resetAdminImportPreview();
        updateAdminImportControls();
        renderAdminCategories();
        try {
          await loadAdminDiagnostic();
        } catch (error) {
          setAdminDiagnosticNotice(error.message);
        }
      });
      document.getElementById('adminVersionSelect').addEventListener('change', () => loadAdminQuestions('').catch((error) => setAdminDiagnosticNotice(error.message)));
      document.getElementById('adminCategoryFilter').addEventListener('change', () => loadAdminQuestions('').catch((error) => setAdminDiagnosticNotice(error.message)));
      let searchTimer;
      document.getElementById('adminQuestionSearch').addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => loadAdminQuestions('').catch((error) => setAdminDiagnosticNotice(error.message)), 250);
      });
      document.getElementById('adminCreateVersion').addEventListener('click', createAdminDraft);
      document.getElementById('adminDownloadTemplate').addEventListener('click', downloadAdminImportTemplate);
      document.getElementById('adminImportFile').addEventListener('change', () => {
        resetAdminImportPreview();
        updateAdminImportControls();
      });
      document.getElementById('adminImportVersionName').addEventListener('input', () => {
        resetAdminImportPreview();
        updateAdminImportControls();
      });
      document.getElementById('adminPreviewImport').addEventListener('click', previewAdminImport);
      document.getElementById('adminImportConfirmCheck').addEventListener('change', (event) => {
        document.getElementById('adminConfirmImport').disabled =
          !adminDiagnosticState.importPreview?.confirmable || !event.target.checked;
      });
      document.getElementById('adminConfirmImport').addEventListener('click', confirmAdminImport);
      document.getElementById('adminQuestionForm').addEventListener('submit', saveAdminQuestion);
      document.getElementById('adminPreviewButton').addEventListener('click', showAdminQuestionPreview);
      document.getElementById('adminHistoryButton').addEventListener('click', () => {
        showAdminQuestionHistory().catch((error) => setAdminDiagnosticNotice(error.message));
      });
      document.getElementById('adminAddQuestion').addEventListener('click', beginAdminNewQuestion);
    }

    async function loadPilotDuration() {
      const duration = document.getElementById('pilotDuration');
      if (!duration) return;

      try {
        const info = await apiFetch('/diagnostico-piloto/info');
        const minutes = info.examen?.duracion_min;
        duration.textContent = Number.isInteger(minutes) && minutes > 0
          ? `50 preguntas · duración sugerida: ${minutes} minutos`
          : '50 preguntas · tiempo sugerido informado al comenzar';
      } catch (error) {
        duration.textContent = '50 preguntas · duración y disponibilidad se confirman al comenzar';
      }
    }

