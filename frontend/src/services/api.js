
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
// Public user lookup
  getUserByWallet: async (walletAddress) => {
    try {
      const response = await api.get(`/auth/user/${walletAddress}`);
      return response.data;
    } catch (error) {
      console.warn("Could not fetch username:", error);
      return { username: 'Unknown' };
    }
  }

const apiService = {
  // Auth Services
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
        ...userData // This contains username, email, isOrganizer, etc.
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // User Services
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
      // Assuming you have a specific route or use updateProfile
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

// CRITICAL: This default export fixes your "does not provide an export named 'default'" error
export default apiService;
