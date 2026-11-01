const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const spaHtml = fs.readFileSync(path.join(root, 'indexInicial.html'), 'utf8');
const diagnosticHtml = fs.readFileSync(path.join(root, 'diagnosticoPiloto.html'), 'utf8');
const diagnosticCss = fs.readFileSync(path.join(root, 'public', 'diagnosticoPiloto.css'), 'utf8');

const spaDocument = new JSDOM(spaHtml).window.document;
const diagnosticDocument = new JSDOM(diagnosticHtml).window.document;

describe('Sistema visual UX/UI 2.0', () => {
  test('conserva las vistas principales y los puntos de integración existentes', () => {
    [
      'view-landing',
      'view-dashboard',
      'view-lesson',
      'view-admin-diagnostic',
      'adminDownloadTemplate',
      'adminPreviewImport',
      'adminConfirmImport',
      'adminQuestionList',
      'adminQuestionForm',
      'modulesGrid',
      'lessonView',
      'postLoginQuizPanel',
    ].forEach((id) => {
      expect(spaDocument.getElementById(id)).not.toBeNull();
    });

    expect(spaDocument.querySelector('main#mainContent')).not.toBeNull();
    expect(spaDocument.querySelector('.skip-link')?.getAttribute('href')).toBe('#mainContent');
  });

  test('usa identidad visual coherente, responsive y con movimiento reducido', () => {
    const spaStyles = spaDocument.querySelector('style')?.textContent || '';

    ['#14284B', '#2563EB', '#0D9488'].forEach((color) => {
      expect(spaStyles.toLowerCase()).toContain(color.toLowerCase());
    });
    expect(spaStyles).toMatch(/@media\s*\(max-width:\s*768px\)/);
    expect(spaStyles).toMatch(/@media\s*\(max-width:\s*540px\)/);
    expect(spaStyles).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(diagnosticCss.toLowerCase()).toContain('--navy: #14284b');
    expect(diagnosticCss.toLowerCase()).toContain('--blue: #2563eb');
    expect(diagnosticCss.toLowerCase()).toContain('--teal: #0d9488');
    expect(diagnosticCss).toMatch(/prefers-reduced-motion:\s*reduce/);
  });

  test('mantiene contraste suficiente en las acciones principales', () => {
    const spaStyles = spaDocument.querySelector('style')?.textContent || '';

    expect(spaStyles).toMatch(/\.btn-primary\s*\{[^}]*color:\s*#fff/i);
    expect(spaStyles).toMatch(/\.cta-box\s+\.btn\s*\{[^}]*background:\s*#0f766e[^}]*color:\s*#fff/i);
    expect(spaStyles).toMatch(/\.cta-box\s+\.btn:hover\s*\{[^}]*background:\s*#115e59[^}]*color:\s*#fff/i);
    expect(spaStyles).toMatch(/\.welcome-progress\s+\.value\s*\{\s*color:\s*#fff/i);
    expect(spaStyles).toMatch(/\.cta-box h2 \.accent\s*\{\s*color:\s*#ccfbf1/i);
  });

  test('expone acceso y modales con nombres accesibles y controles etiquetados', () => {
    expect(spaDocument.querySelector('nav[aria-label="Navegación principal"]')).not.toBeNull();
    expect(spaDocument.getElementById('loginModal')?.getAttribute('role')).toBe('dialog');
    expect(spaDocument.getElementById('loginModal')?.getAttribute('aria-modal')).toBe('true');
    expect(spaDocument.getElementById('loginModal')?.getAttribute('aria-labelledby')).toBe('loginDialogTitle');
    expect(spaDocument.getElementById('loginEmail')?.getAttribute('aria-label')).toBe('Correo electrónico');
    expect(spaDocument.getElementById('loginPassword')?.getAttribute('aria-label')).toBe('Contraseña');
    expect(diagnosticDocument.querySelector('main#mainContent[tabindex="-1"]')).not.toBeNull();
    expect(diagnosticDocument.querySelector('.skip-link[href="#mainContent"]')).not.toBeNull();
  });

  test('el diálogo de acceso conserva el foco, lo limita y lo devuelve al cerrarse', async () => {
    const dom = new JSDOM(spaHtml, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'http://localhost/',
      beforeParse(window) {
        window.fetch = async () => ({
          ok: false,
          status: 404,
          json: async () => ({ error: 'API de prueba no disponible' }),
        });
        window.alert = () => {};
        window.confirm = () => true;
        window.scrollTo = () => {};
      },
    });

    try {
      const { window } = dom;
      const trigger = window.document.getElementById('loginBtn');
      trigger.focus();
      window.openLogin();

      expect(window.document.activeElement.id).toBe('loginEmail');

      window.document.dispatchEvent(new window.KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
      }));
      expect(window.document.activeElement.getAttribute('href')).toBe('#registro');

      window.document.dispatchEvent(new window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      }));
      expect(window.document.getElementById('loginModal').classList.contains('show')).toBe(false);
      expect(window.document.activeElement.id).toBe('loginBtn');
    } finally {
      dom.window.close();
    }
  });

  test('no usa estadísticas promocionales inventadas ni promesas de resultado', () => {
    const landingText = spaDocument.getElementById('view-landing').textContent;
    expect(landingText).not.toMatch(/cupos limitados|todo lo que necesitas para aprobar|tu plaza docente/i);
    expect(spaDocument.querySelectorAll('.hero-stats .stat')).toHaveLength(3);
    expect(diagnosticDocument.querySelector('#durationFact')).not.toBeNull();
    expect(diagnosticDocument.querySelector('#result')).not.toBeNull();
  });
});
