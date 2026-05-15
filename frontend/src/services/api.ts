import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// Request interceptor — attach token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const stored = localStorage.getItem("ig-intel-auth");
    if (stored) {
      try {
        const state = JSON.parse(stored);
        const token = state?.state?.accessToken;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {}
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 & token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const stored = localStorage.getItem("ig-intel-auth");
        if (stored) {
          const state = JSON.parse(stored);
          const refreshToken = state?.state?.refreshToken;

          if (refreshToken) {
            const response = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
            const { accessToken } = response.data.data;

            // Update stored token
            state.state.accessToken = accessToken;
            localStorage.setItem("ig-intel-auth", JSON.stringify(state));

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return apiClient(originalRequest);
          }
        }
      } catch {
        // Refresh failed — redirect to login
        localStorage.removeItem("ig-intel-auth");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// API service methods
export const authApi = {
  login: (email: string, password: string) => apiClient.post("/auth/login", { email, password }),
  register: (name: string, email: string, password: string) => apiClient.post("/auth/register", { name, email, password }),
  logout: (refreshToken: string) => apiClient.post("/auth/logout", { refreshToken }),
  me: () => apiClient.get("/auth/me"),
};

export const discoveryApi = {
  start: (params: any) => apiClient.post("/discovery/search", params),
  getJobs: (params?: any) => apiClient.get("/discovery/jobs", { params }),
  getJob: (id: string) => apiClient.get(`/discovery/jobs/${id}`),
  cancelJob: (id: string) => apiClient.delete(`/discovery/jobs/${id}`),
  getResults: (params?: any) => apiClient.get("/discovery/results", { params }),
};

export const profileApi = {
  list: (params?: any) => apiClient.get("/profiles", { params }),
  get: (id: string) => apiClient.get(`/profiles/${id}`),
  analyze: (id: string) => apiClient.post(`/profiles/${id}/analyze`),
};

export const analyticsApi = {
  overview: () => apiClient.get("/analytics/overview"),
  trends: (days?: number) => apiClient.get("/analytics/trends", { params: { days } }),
  niches: () => apiClient.get("/analytics/niches"),
};

export const leadApi = {
  list: (params?: any) => apiClient.get("/leads", { params }),
  create: (data: any) => apiClient.post("/leads", data),
  update: (id: string, data: any) => apiClient.patch(`/leads/${id}`, data),
};

export const exportApi = {
  create: (data: any) => apiClient.post("/export", data),
  getJobs: () => apiClient.get("/export/jobs"),
  download: (filename: string) => `${API_URL}/api/export/download/${filename}`,
};
