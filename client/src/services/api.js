import axios from 'axios';

const defaultBaseURL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://everything-about-ai-assignment-1-1.onrender.com/api'
    : '/api');

const api = axios.create({
  baseURL: defaultBaseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token from localStorage to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('splitease_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept 401 Unauthorized responses to clear stale auth state
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-clear if it was a login attempt failure
      const isAuthRoute = error.config.url.includes('/auth/login') || error.config.url.includes('/auth/register');
      if (!isAuthRoute) {
        localStorage.removeItem('splitease_token');
        localStorage.removeItem('splitease_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?expired=true';
        }
      }
    }
    return Promise.reject(error);
  }
);

// API Service Methods
export const authService = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  searchUser: (email) => api.get(`/auth/search-user?email=${encodeURIComponent(email)}`)
};

export const groupService = {
  createGroup: (data) => api.post('/groups', data),
  getGroups: () => api.get('/groups'),
  getGroupById: (id) => api.get(`/groups/${id}`),
  addMember: (id, email) => api.post(`/groups/${id}/members`, { email }),
  getBalances: (id) => api.get(`/groups/${id}/balances`)
};

export const expenseService = {
  createExpense: (data) => api.post('/expenses', data),
  getGroupExpenses: (groupId) => api.get(`/expenses/group/${groupId}`),
  getExpenseById: (id) => api.get(`/expenses/${id}`),
  updateExpense: (id, data) => api.put(`/expenses/${id}`, data),
  deleteExpense: (id) => api.delete(`/expenses/${id}`)
};

export const settlementService = {
  getSettlementPlan: (groupId) => api.get(`/settlements/plan/${groupId}`),
  recordSettlement: (data) => api.post('/settlements', data),
  getGroupSettlements: (groupId) => api.get(`/settlements/group/${groupId}`),
  deleteSettlement: (id) => api.delete(`/settlements/${id}`)
};

export default api;
