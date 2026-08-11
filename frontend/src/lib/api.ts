import axios from "axios";

// Use env var in production, fallback to localhost for local dev
const finalApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8005/api/v1";

const api = axios.create({
  baseURL: finalApiUrl,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRoute = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh');
    
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (refreshToken) {
          const res = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refresh_token: refreshToken });
          const { access_token, refresh_token } = res.data;
          localStorage.setItem("access_token", access_token);
          localStorage.setItem("refresh_token", refresh_token);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        if (typeof window !== "undefined") window.location.href = "/login";
      }
    }

    // Intercept Offline/Network Errors for Mutations
    if (
      (!error.response || error.code === "ERR_NETWORK" || error.code === "ECONNABORTED") &&
      originalRequest.method &&
      ["post", "put", "delete", "patch"].includes(originalRequest.method.toLowerCase()) &&
      !isAuthRoute
    ) {
      // Dynamic import to avoid SSR issues with IndexedDB
      const { addOfflineMutation } = await import("./offlineQueue");
      
      const url = originalRequest.url?.replace(api.defaults.baseURL || "", "") || "";
      const method = originalRequest.method.toUpperCase();
      const data = originalRequest.data ? JSON.parse(originalRequest.data) : null;
      
      await addOfflineMutation(method, url, data, originalRequest.headers);
      
      // Trigger sync if service worker is active
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg: any) => {
          if (reg.sync) {
            reg.sync.register("dla-sync-queue").catch(console.warn);
          }
        });
      }
      
      // Return a 202 Accepted response to the UI
      return Promise.resolve({
        data: { message: "Sin conexión. Guardado localmente para sincronización posterior.", offline_cached: true },
        status: 202,
        statusText: "Accepted Offline",
        headers: {},
        config: originalRequest
      });
    }

    return Promise.reject(error);
  }
);

export default api;
