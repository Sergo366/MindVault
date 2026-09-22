import axios from 'axios';
import Cookies from 'js-cookie';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001',
  withCredentials: true, // Crucial for HttpOnly cookies
});

// Request interceptor: attach access_token to headers
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't attempt refresh or redirect for auth endpoints
      if (originalRequest.url?.includes('/auth/signin') || originalRequest.url?.includes('/auth/signup')) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        // Attempt to refresh tokens
        // Backend extracts refresh_token from HttpOnly cookie automatically
        const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
        await axios.post(
          `${baseURL}/auth/refreshToken`,
          {},
          { withCredentials: true },
        );

        // Access token is updated in the cookie by the server response
        // Delete stale Authorization header so request interceptor picks up new cookie
        delete originalRequest.headers.Authorization;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // If refresh fails, redirect to login or handle session end
        if (typeof window !== 'undefined' && window.location.pathname !== '/auth') {
          // You could use a state manager or router here
          window.location.href = '/auth';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
