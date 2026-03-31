import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function AdminLogin() {
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    if (isAuthenticated) {
        navigate("/admin/dashboard", { replace: true });
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(username, password);
            navigate("/admin/dashboard");
        } catch (err) {
            const detail = err.response?.data?.detail;
            setError(typeof detail === "string" ? detail : "Identifiants incorrects");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-boudal-green flex items-center justify-center px-4" data-testid="admin-login-page">
            <div className="bg-white rounded-xl shadow-2xl p-8 md:p-10 w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="font-serif text-2xl font-bold text-boudal-green">
                        Primeur <span className="text-boudal-gold italic">BOUDAL</span>
                    </h1>
                    <p className="text-gray-500 text-sm mt-2">Espace Administration</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div data-testid="login-error" className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-boudal-green mb-1">Identifiant</label>
                        <input
                            data-testid="login-username"
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:border-boudal-gold outline-none text-sm"
                            placeholder="Votre identifiant"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-boudal-green mb-1">Mot de passe</label>
                        <input
                            data-testid="login-password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:border-boudal-gold outline-none text-sm"
                            placeholder="Votre mot de passe"
                            required
                        />
                    </div>
                    <button
                        data-testid="login-submit-btn"
                        type="submit"
                        disabled={loading}
                        className="w-full bg-boudal-gold text-white py-3 font-semibold text-sm uppercase tracking-wider hover:bg-boudal-gold/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 rounded-lg"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Se connecter
                    </button>
                </form>
            </div>
        </div>
    );
}
