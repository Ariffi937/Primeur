import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("boudal_token");
        if (token) {
            api.get("/auth/me")
                .then(res => setUser(res.data))
                .catch(() => {
                    localStorage.removeItem("boudal_token");
                    localStorage.removeItem("boudal_user");
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = useCallback(async (username, password) => {
        const res = await api.post("/auth/login", { username, password });
        localStorage.setItem("boudal_token", res.data.token);
        localStorage.setItem("boudal_user", JSON.stringify(res.data.user));
        setUser(res.data.user);
        return res.data;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem("boudal_token");
        localStorage.removeItem("boudal_user");
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
