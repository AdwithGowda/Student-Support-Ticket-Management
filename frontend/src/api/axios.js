import axios from "axios";

const api = axios.create({
    baseURL: "http://127.0.0.1:8000/api",
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // If 401 Unauthorized and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) {
                    throw new Error("No refresh token");
                }
                
                // Attempt to refresh
                const res = await axios.post("http://127.0.0.1:8000/api/auth/refresh/", {
                    refresh: refreshToken
                });
                
                // Save new access token
                localStorage.setItem('accessToken', res.data.access);
                
                // Update header and retry
                originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
                return api(originalRequest);
                
            } catch (refreshError) {
                // Refresh failed, clear auth and force login
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
