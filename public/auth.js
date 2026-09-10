/**
 * Auth state management
 * Handles user authentication and state
 */

class AuthManager {
  constructor() {
    this.state = {
      user: null,
      token: null,
      progress: {},
    };
    this.loadState();
  }

  loadState() {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('user');
    if (token && user) {
      this.state.token = token;
      this.state.user = JSON.parse(user);
    }
  }

  saveState() {
    if (this.state.token) {
      localStorage.setItem('auth_token', this.state.token);
    }
    if (this.state.user) {
      localStorage.setItem('user', JSON.stringify(this.state.user));
    }
  }

  clearState() {
    this.state.token = null;
    this.state.user = null;
    this.state.progress = {};
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }

  async register(userData) {
    try {
      const result = await api.post('/auth/register', userData);
      this.state.token = result.token;
      this.state.user = result.user;
      this.saveState();
      return result;
    } catch (error) {
      throw error;
    }
  }

  async login(email, password) {
    try {
      const result = await api.post('/auth/login', { email, password });
      this.state.token = result.token;
      this.state.user = result.user;
      this.saveState();
      return result;
    } catch (error) {
      throw error;
    }
  }

  async fetchProfile() {
    try {
      const result = await api.get('/users/profile');
      this.state.user = result.user;
      this.saveState();
      return result;
    } catch (error) {
      throw error;
    }
  }

  async logout() {
    this.clearState();
  }

  isLoggedIn() {
    return !!this.state.user;
  }

  getCurrentUser() {
    return this.state.user;
  }
}

const auth = new AuthManager();