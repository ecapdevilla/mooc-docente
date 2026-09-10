/**
 * Main application controller
 * Handles app initialization, navigation and API integration
 */

class App {
  constructor() {
    this.auth = new AuthManager();
    this.currentView = 'landing';
    this.initializeEventListeners();
    this.setupAuthStateListener();
    this.init();
  }

  initializeEventListeners() {
    // Auth form submissions
    document.addEventListener('DOMContentLoaded', () => {
      const registroForm = document.getElementById('registroForm');
      if (registroForm) {
        registroForm.addEventListener('submit', (e) => this.auth.handleRegister(e));
      }
    });
  }

  async init() {
    // Check auth state
    if (this.auth.isLoggedIn()) {
      await this.auth.fetchProfile();
      this.showView('dashboard');
      this.loadDashboard();
    } else {
      this.showView('landing');
    }
  }

  setupAuthStateListener() {
    // Listen for auth state changes
    window.addEventListener('storage', (e) => {
      if (e.key === 'auth_token' || e.key === 'user') {
        this.auth.loadState();
        if (this.auth.isLoggedIn()) {
          this.showView('dashboard');
          this.loadDashboard();
        } else {
          this.showView('landing');
        }
      }
    });
  }

  showView(view) {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

    // Show target view
    const targetView = document.getElementById(`view-${view}`);
    if (targetView) {
      targetView.classList.remove('hidden');
      this.currentView = view;

      // Update navigation
      const navLink = document.querySelector(`.nav-links a[onclick*="${view}"]`);
      if (navLink) navLink.classList.add('active');
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async loadDashboard() {
    try {
      const result = await api.get('/progress');
      this.renderDashboard(result);
      this.loadUserStats();
    } catch (err) {
      console.error('❌ Error loading dashboard:', err);
      this.showNotification('Error al cargar el dashboard', 'error');
    }
  }

  renderDashboard(data) {
    // Render modules
    const modulesGrid = document.getElementById('modulesGrid');
    if (modulesGrid && data.modules) {
      modulesGrid.innerHTML = data.modules.map((mod, idx) => `
        <div class="module-card animate-fadeUp" style="animation-delay: ${idx * 0.08}s">
          <div class="module-cover ${mod.cover || ''}">
            <i class="${mod.icon || 'fas fa-book'}"></i>
            ${mod.completed ? '<div class="module-status done"><i class="fas fa-check"></i> Completado</div>' : 
              mod.percent > 0 ? '<div class="module-status"><i class="fas fa-play"></i> En curso</div>' : 
              '<div class="module-status"><i class="fas fa-book-open"></i> Nuevo</div>'}
          </div>
          <div class="module-body">
            <div class="module-meta">
              <span class="tag-area">${mod.area || 'Área'}</span>
              <span class="tag-level ${mod.levelClass || ''}">${mod.level || 'Básico'}</span>
            </div>
            <h3>${mod.titulo}</h3>
            <p>${mod.descripcion || 'Descripción del módulo'}</p>
            <div class="module-progress">
              <div class="progress-bar">
                <div class="progress-fill ${mod.completed ? 'done' : ''}" style="width:${mod.percent || 0}%"></div>
              </div>
              <div class="progress-text">
                <span>${mod.completedLessons || 0}/${mod.totalLessons || 0} lecciones</span>
                <span>${mod.percent || 0}%</span>
              </div>
            </div>
            <button class="btn ${mod.completed ? 'btn-ghost' : 'btn-secondary'} btn-block btn-sm" onclick="app.startModule('${mod.id}')">
              ${mod.completed ? '<i class="fas fa-redo"></i> Repasar módulo' : (mod.completedLessons > 0 ? '<i class="fas fa-play"></i> Continuar' : '<i class="fas fa-play"></i> Empezar módulo')}
            </button>
          </div>
        </div>
      `).join('');
    }

    // Render badges
    const badgesGrid = document.getElementById('badgesGrid');
    if (badgesGrid && data.badges) {
      badgesGrid.innerHTML = data.badges.map(badge => `
        <div class="badge-card ${badge.earned ? 'earned' : 'locked'}">
          <div class="badge-card-icon ${badge.color || 'gray'}">
            <i class="${badge.icono || 'fas fa-award'}"></i>
          </div>
          <h5>${badge.nombre}</h5>
          <span>${badge.earned ? 'Obtenida' : 'Bloqueada'}</span>
        </div>
      `).join('');
    }

    // Update progress display
    const globalProgress = document.getElementById('globalProgress');
    if (globalProgress) globalProgress.textContent = `${data.globalProgress}%`;

    const statModules = document.getElementById('statModules');
    if (statModules) statModules.textContent = `${data.completedLessons}/${data.totalLessons}`;

    const statLessons = document.getElementById('statLessons');
    if (statLessons) statLessons.textContent = `${data.completedLessons}/${data.totalLessons}`;

    const statBadges = document.getElementById('statBadges');
    if (statBadges) {
      const earnedBadges = data.badges ? data.badges.filter(b => b.earned).length : 0;
      statBadges.textContent = `${earnedBadges}/${data.totalBadges || 2}`;
    }
  }

  async loadUserStats() {
    try {
      const result = await api.get('/users/profile');
      this.updateUserUI(result.user);
    } catch (err) {
      console.error('❌ Error loading user stats:', err);
    }
  }

  updateUserUI(user) {
    const chip = document.getElementById('userChip');
    const logoutBtn = document.getElementById('logoutBtn');
    const avatar = document.getElementById('userAvatar');
    const name = document.getElementById('userName');
    const role = document.getElementById('userRole');

    if (user) {
      chip.style.display = 'flex';
      logoutBtn.style.display = 'flex';
      avatar.textContent = user.nombre.charAt(0).toUpperCase();
      name.textContent = user.nombre.split(' ')[0];
      role.textContent = 'Preparándose';
    } else {
      chip.style.display = 'none';
      logoutBtn.style.display = 'none';
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
        <span>${message}</span>
      </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  async startModule(modId) {
    try {
      const result = await api.post('/progress/lesson/' + modId);
      this.loadDashboard();
      this.showNotification('Módulo iniciado', 'success');
      // Redirect to lesson view
      this.showView('lesson');
      this.loadLessonContent(modId);
    } catch (err) {
      this.showNotification('Error al iniciar módulo', 'error');
    }
  }

  async loadLessonContent(modId) {
    try {
      const result = await api.get('/courses');
      const course = result.courses.find(c => c.modulos.some(m => m.id === modId));
      if (course) {
        const module = course.modulos.find(m => m.id === modId);
        if (module && module.lecciones && module.lecciones.length > 0) {
          const lesson = module.lecciones[0];
          this.renderLessonContent(lesson, modId, module.id);
        }
      }
    } catch (err) {
      console.error('❌ Error loading lesson:', err);
    }
  }

  renderLessonContent(lesson, modId, moduleId) {
    const lessonView = document.getElementById('lessonView');
    if (lessonView) {
      lessonView.innerHTML = `
        <div class="lesson-header">
          <button class="back-btn" onclick="app.showView('dashboard')" title="Volver">
            <i class="fas fa-arrow-left"></i>
          </button>
          <div class="lesson-header-info">
            <div class="module-tag">${moduleId} · Lección ${lesson.id}</div>
            <h2>${lesson.titulo}</h2>
          </div>
        </div>
        <div class="lesson-content">
          <h3>${lesson.titulo}</h3>
          <div class="info-box">
            <strong>Esta es una versión básica del contenido.</strong> En la implementación completa, aquí se mostraría el contenido completo de la lección con markdown, formateo avanzado y elementos interactivos.
          </div>
          <div class="quiz" id="quizBlock">
            <h4><i class="fas fa-question-circle" style="color:var(--secondary-light);"></i> Evaluación de la lección</h4>
            <div class="quiz-question">¿Cuál es la respuesta correcta a esta pregunta de muestra?</div>
            <div class="quiz-options" id="quizOptions">
              <button class="quiz-option" onclick="app.answerQuiz(0)">
                <span class="letter">A</span>
                <span>Respuesta A</span>
              </button>
              <button class="quiz-option" onclick="app.answerQuiz(1)">
                <span class="letter">B</span>
                <span>Respuesta B (correcta)</span>
              </button>
              <button class="quiz-option" onclick="app.answerQuiz(2)">
                <span class="letter">C</span>
                <span>Respuesta C</span>
              </button>
              <button class="quiz-option" onclick="app.answerQuiz(3)">
                <span class="letter">D</span>
                <span>Respuesta D</span>
              </button>
            </div>
            <div class="quiz-feedback" id="quizFeedback"></div>
          </div>
          <div class="lesson-nav">
            <div class="lesson-nav-info">Selecciona una respuesta para continuar</div>
            <button class="btn btn-secondary btn-sm" onclick="app.showView('dashboard')">
              Saltar lección <i class="fas fa-check"></i>
            </button>
          </div>
        </div>
      `;
    }
  }

  async answerQuiz(selectedIdx) {
    // Mark selected option
    const options = document.querySelectorAll('.quiz-option');
    options.forEach(o => o.classList.add('disabled'));
    
    // Show correct answer
    const correctIdx = 1; // B is correct
    options[correctIdx].classList.add('correct');
    
    if (selectedIdx !== correctIdx) {
      options[selectedIdx].classList.add('incorrect');
    }

    // Show feedback
    const feedback = document.getElementById('quizFeedback');
    if (feedback) {
      feedback.classList.add('show', 'ok');
      feedback.innerHTML = '<i class="fas fa-check-circle"></i> ¡Respuesta correcta!';
      this.showNotification('¡Excelente! Has completado la lección.', 'success');
    }

    // Update nav info
    const navInfo = document.querySelector('.lesson-nav-info');
    if (navInfo) {
      navInfo.innerHTML = '<i class="fas fa-check-circle" style="color:var(--accent);"></i> Lección completada';
    }

    // Mark as completed via API
    try {
      await api.post('/progress/lesson/' + this.currentLessonId, { puntaje: 100 });
      this.loadDashboard();
    } catch (err) {
      console.error('❌ Error marking lesson complete:', err);
    }
  }

  async completeLesson() {
    // For the basic version
    this.showView('dashboard');
    this.showNotification('Lección completada con éxito.', 'success');
  }

  startSpinner() {
    console.log('🌪️ Spinner started');
  }

  stopSpinner() {
    console.log('✅ Spinner stopped');
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  console.log('🚀 MéritoDocente App initialized');
});

// Add global closeBadgeModal function
window.closeBadgeModal = function() {
  document.getElementById('badgeModal').classList.remove('show');
};

// Add global notification styles
const style = document.createElement('style');
style.textContent = `
.notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: white;
  border-radius: var(--r-md);
  padding: 1rem 1.5rem;
  box-shadow: var(--shadow-lg);
  transform: translateY(100px);
  transition: transform 0.3s;
  z-index: 3000;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.notification.show {
  transform: translateY(0);
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.notification.success { border-left: 4px solid var(--accent); }
.notification.error { border-left: 4px solid var(--danger); }
.notification.info { border-left: 4px solid var(--secondary); }
`;
document.head.appendChild(style);