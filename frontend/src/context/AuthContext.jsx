import { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('accessToken');
            if (token) {
                try {
                    const response = await api.get('/auth/me/');
                    setUser(response.data);
                } catch (error) {
                    console.error("Failed to fetch user:", error);
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                }
            }
            setLoading(false);
        };
        fetchUser();
    }, []);

    const register = async (userData) => {
        try {
            await api.post('/auth/register/', userData);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.response?.data?.email?.[0] || 'Registration failed' };
        }
    };

    const login = async (email, password) => {
        const response = await api.post('/auth/login/', { email, password });
        localStorage.setItem('accessToken', response.data.access);
        localStorage.setItem('refreshToken', response.data.refresh);
        
        const userResponse = await api.get('/auth/me/');
        setUser(userResponse.data);
        return userResponse.data;
    };


    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
