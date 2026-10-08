// Simple API client for frontend
const API_BASE = '/api';

class ApiClient {
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    };
    
    if (options.body && !(options.body instanceof FormData)) {
      config.body = JSON.stringify(options.body);
    } else if (options.body instanceof FormData) {
      delete config.headers['Content-Type'];
      config.body = options.body;
    }
    
    const response = await fetch(url, config);
    
    if (response.status === 401) {
      // Try to refresh token
      const refreshed = await this.refreshToken();
      if (refreshed) {
        return this.request(endpoint, options);
      }
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    
    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    
    return data;
  }
  
  async refreshToken() {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  get(endpoint, params = {}) {
    const searchParams = new URLSearchParams(params).toString();
    return this.request(`${endpoint}${searchParams ? '?' + searchParams : ''}`);
  }
  
  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body });
  }
  
  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body });
  }
  
  patch(endpoint, body) {
    return this.request(endpoint, { method: 'PATCH', body });
  }
  
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();