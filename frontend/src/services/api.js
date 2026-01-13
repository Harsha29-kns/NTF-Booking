import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// 1. Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 2. Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 3. Define the Service Object
const apiService = {
  // --- Auth Services ---
  setToken: (token) => {
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  },

  verifyToken: async (token) => {
    try {
      const response = await api.post('/auth/verify', { token });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  login: async (walletAddress, signature, message) => {
    try {
      const response = await api.post('/auth/login', {
        walletAddress,
        signature,
        message
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  register: async (walletAddress, signature, message, userData) => {
    try {
      const response = await api.post('/auth/register', {
        walletAddress,
        signature,
        message,
        ...userData 
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // --- User Services ---
  // ✅ FIXED: Moved inside the object
  getUserByWallet: async (walletAddress) => {
    try {
      const response = await api.get(`/auth/user/${walletAddress}`);
      return response.data;
    } catch (error) {
      console.warn("Could not fetch username:", error);
      return { username: 'Unknown' };
    }
  },

  getProfile: async () => {
    try {
      const response = await api.get('/users/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  updateProfile: async (userData) => {
    try {
      const response = await api.put('/users/profile', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  becomeOrganizer: async (organizerData) => {
    try {
      const response = await api.put('/users/profile', {
        isOrganizer: true,
        organizerInfo: organizerData
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

// 4. Exports
// Export 'api' as a named export (Fixes "api.get is not a function")
export { api }; 

// Export 'apiService' as default
export default apiService;