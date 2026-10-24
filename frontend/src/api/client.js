export const API_URL_ORIGIN = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '';
export const API_BASE_URL = `${API_URL_ORIGIN}/api`;

export const getMediaUrl = (url) => {
  if (!url) return null;
  if (typeof url !== 'string') return url;

  // If already absolute URL starting with http:// or https://
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (API_URL_ORIGIN && (url.includes('127.0.0.1:8000') || url.includes('localhost:8000'))) {
      return url.replace(/^https?:\/\/(127\.0\.0\.1|localhost):8000/, API_URL_ORIGIN);
    }
    return url;
  }

  // If relative path like /media/... or media/...
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  if (API_URL_ORIGIN) {
    return `${API_URL_ORIGIN}${cleanPath}`;
  }
  return cleanPath;
};

export const apiClient = {
  // Hospital Authentication
  async loginHospital(hospital_id, password) {
    const res = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hospital_id, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to authenticate hospital');
    return data;
  },

  async registerHospital(hospitalData) {
    const res = await fetch(`${API_BASE_URL}/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hospitalData)
    });
    const data = await res.json();
    if (!res.ok) {
      const err = data.errors ? Object.values(data.errors).flat().join(', ') : (data.error || 'Registration failed');
      throw new Error(err);
    }
    return data;
  },

  async getHospitalMe(token) {
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`${API_BASE_URL}/auth/me/`, { headers });
    if (!res.ok) throw new Error('Session invalid');
    return await res.json();
  },

  // District Centers
  async getCenters() {
    const res = await fetch(`${API_BASE_URL}/centers/`);
    if (!res.ok) throw new Error('Failed to fetch centers');
    const data = await res.json();
    return data.results || data;
  },

  // Patients
  async getPatients(search = '') {
    const url = search ? `${API_BASE_URL}/patients/?search=${encodeURIComponent(search)}` : `${API_BASE_URL}/patients/`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch patients');
    const data = await res.json();
    return data.results || data;
  },

  async createPatient(patientData) {
    const res = await fetch(`${API_BASE_URL}/patients/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientData)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = typeof data === 'object' && Object.keys(data).length > 0
        ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
        : 'Failed to create patient';
      throw new Error(errMsg);
    }
    return data;
  },

  // Screening Sessions
  async getScreenings() {
    const res = await fetch(`${API_BASE_URL}/screenings/`);
    if (!res.ok) throw new Error('Failed to fetch screening sessions');
    const data = await res.json();
    return data.results || data;
  },

  async getScreeningDetail(id) {
    const res = await fetch(`${API_BASE_URL}/screenings/${id}/`);
    if (!res.ok) throw new Error('Failed to fetch screening detail');
    return await res.json();
  },

  async createScreeningSession(sessionData) {
    const res = await fetch(`${API_BASE_URL}/screenings/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = typeof data === 'object' && Object.keys(data).length > 0
        ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
        : 'Failed to create screening session';
      throw new Error(errMsg);
    }
    return data;
  },


  async uploadRetinalImage(sessionId, formData) {
    const res = await fetch(`${API_BASE_URL}/screenings/${sessionId}/upload_image/`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload retinal image');
    return await res.json();
  },

  async validateSession(sessionId, validationData) {
    const res = await fetch(`${API_BASE_URL}/screenings/${sessionId}/validate_session/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validationData)
    });
    if (!res.ok) throw new Error('Failed to validate session');
    return await res.json();
  },

  // Analytics
  async getAnalyticsOverview() {
    const res = await fetch(`${API_BASE_URL}/analytics/overview/`);
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return await res.json();
  },

  // Simulink Simulation
  async runSimulation(params) {
    const res = await fetch(`${API_BASE_URL}/simulation/run/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('Failed to run simulation');
    return await res.json();
  },

  // Seed benchmark
  async seedBenchmark() {
    const res = await fetch(`${API_BASE_URL}/seed-benchmark/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Failed to seed benchmark cases');
    return await res.json();
  }
};
