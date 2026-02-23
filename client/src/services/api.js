import axios from 'axios';
import { useAuthStore } from '../store';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      useAuthStore.getState().logout();
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

// Complaint APIs
export const complaintApi = {
  // Create a new complaint
  create: async (formData) => {
    try {
      const response = await api.post('/complaints', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      // Handle duplicate detection (409 Conflict)
      if (error.response?.status === 409 && error.response?.data?.isDuplicate) {
        return {
          success: false,
          isDuplicate: true,
          message: error.response.data.message,
          duplicates: error.response.data.duplicates,
        };
      }
      throw error;
    }
  },
  
  // Check for duplicates
  checkDuplicates: async (latitude, longitude, category) => {
    const response = await api.post('/complaints/check-duplicates', {
      latitude,
      longitude,
      category,
    });
    return response.data;
  },
  
  // Reverse geocode
  reverseGeocode: async (latitude, longitude) => {
    const response = await api.get('/complaints/geocode', {
      params: { latitude, longitude },
    });
    return response.data;
  },
  
  // Get complaint status (public)
  getStatus: async (complaintId, phone) => {
    const response = await api.get(`/complaints/status/${complaintId}`, {
      params: phone ? { phone } : {},
    });
    return response.data;
  },
  
  // Get all complaints (admin)
  getAll: async (params = {}) => {
    const response = await api.get('/complaints', { params });
    return response.data;
  },
  
  // Get single complaint (admin)
  getById: async (id) => {
    const response = await api.get(`/complaints/${id}`);
    return response.data;
  },
  
  // Get complaints for map (admin)
  getForMap: async (params = {}) => {
    const response = await api.get('/complaints/map', { params });
    return response.data;
  },
  
  // Get statistics (admin)
  getStats: async (params = {}) => {
    const response = await api.get('/complaints/stats', { params });
    return response.data;
  },
  
  // Update status (admin)
  updateStatus: async (id, status, remarks) => {
    const response = await api.patch(`/complaints/${id}/status`, {
      status,
      remarks,
    });
    return response.data;
  },
  
  // Assign complaint (admin)
  assign: async (id, adminId) => {
    const response = await api.patch(`/complaints/${id}/assign`, {
      adminId,
    });
    return response.data;
  },
  
  // Get image URL
  getImageUrl: (id) => `${API_BASE_URL}/complaints/${id}/image`,
};

// Admin APIs
export const adminApi = {
  // Initialize super admin (first time only)
  initialize: async (email, password, name) => {
    const response = await api.post('/admin/initialize', {
      email,
      password,
      name,
    });
    return response.data;
  },
  
  // Login
  login: async (email, password) => {
    const response = await api.post('/admin/login', {
      email,
      password,
    });
    return response.data;
  },
  
  // Get profile
  getProfile: async () => {
    const response = await api.get('/admin/profile');
    return response.data;
  },
  
  // Update profile
  updateProfile: async (updates) => {
    const response = await api.patch('/admin/profile', updates);
    return response.data;
  },
  
  // Change password
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/admin/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
  
  // Logout
  logout: async () => {
    const response = await api.post('/admin/logout');
    return response.data;
  },
  
  // Get all admins (super admin)
  getAll: async () => {
    const response = await api.get('/admin/all');
    return response.data;
  },
  
  // Create admin (super admin)
  create: async (adminData) => {
    const response = await api.post('/admin', adminData);
    return response.data;
  },
  
  // Update admin (super admin)
  update: async (id, updates) => {
    const response = await api.patch(`/admin/${id}`, updates);
    return response.data;
  },
  
  // Delete admin (super admin)
  delete: async (id) => {
    const response = await api.delete(`/admin/${id}`);
    return response.data;
  },
  
  // Get complaints (admin dashboard)
  getComplaints: async (params = {}) => {
    const response = await api.get('/complaints', { params });
    return response.data;
  },
  
  // Get single complaint (admin)
  getComplaint: async (id) => {
    const response = await api.get(`/complaints/${id}`);
    return response.data;
  },
  
  // Get map data
  getMapData: async (params = {}) => {
    const response = await api.get('/complaints/map', { params });
    return response.data;
  },
  
  // Get statistics
  getStats: async (params = {}) => {
    const response = await api.get('/complaints/stats', { params });
    return response.data;
  },
  
  // Update complaint
  updateComplaint: async (id, updates) => {
    const response = await api.patch(`/complaints/${id}`, updates);
    return response.data;
  },
};

// Community APIs
export const communityApi = {
  // Get community feed
  getFeed: async (params = {}) => {
    const response = await api.get('/community/feed', { params });
    return response.data;
  },

  // Get trending complaints
  getTrending: async () => {
    const response = await api.get('/community/trending/list');
    return response.data;
  },

  // Get community stats
  getStats: async () => {
    const response = await api.get('/community/stats/summary');
    return response.data;
  },

  // Get single complaint details
  getComplaint: async (complaintId) => {
    const response = await api.get(`/community/${complaintId}`);
    return response.data;
  },

  // Upvote a complaint
  upvote: async (complaintId, voterPhone = null) => {
    const response = await api.post(`/community/${complaintId}/upvote`, {
      voterPhone,
    });
    return response.data;
  },
};

// Citizen Portal APIs
export const citizenApi = {
  // Request OTP
  requestOTP: async (phoneNumber) => {
    const response = await api.post('/citizen/request-otp', { phoneNumber });
    return response.data;
  },

  // Verify OTP
  verifyOTP: async (phoneNumber, otp) => {
    const response = await api.post('/citizen/verify-otp', { phoneNumber, otp });
    return response.data;
  },

  // Get profile
  getProfile: async (token) => {
    const response = await api.get('/citizen/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  // Update profile
  updateProfile: async (token, updates) => {
    const response = await api.patch('/citizen/profile', updates, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  // Get citizen's complaints
  getComplaints: async (token, params = {}) => {
    const response = await api.get('/citizen/complaints', {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    return response.data;
  },

  // Submit feedback
  submitFeedback: async (token, complaintId, rating, comment) => {
    const response = await api.post(
      `/citizen/complaints/${complaintId}/feedback`,
      { rating, comment },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  // Logout
  logout: async (token) => {
    const response = await api.post('/citizen/logout', {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  // Register push subscription
  registerPush: async (token, subscription) => {
    const response = await api.post('/citizen/push-subscription', subscription, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};

// Analytics APIs
export const analyticsApi = {
  // Get dashboard analytics
  getDashboardStats: async (params = {}) => {
    const response = await api.get('/complaints/stats', { params });
    return response.data;
  },

  // Get trend data
  getTrends: async (days = 30) => {
    const response = await api.get('/complaints/stats', {
      params: { trendDays: days },
    });
    return response.data;
  },

  // Get SLA stats
  getSLAStats: async () => {
    const response = await api.get('/complaints/stats');
    return response.data;
  },
};

export default api;
