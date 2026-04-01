import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HomePage from "@/pages/HomePage";
import BoutiquePage from "@/pages/BoutiquePage";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import CheckoutSuccess from "@/pages/CheckoutSuccess";
import TrackOrderPage from "@/pages/TrackOrderPage";

function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return <div className="min-h-screen flex items-center justify-center bg-boudal-ivory"><p className="text-boudal-green font-serif text-xl">Chargement...</p></div>;
    if (!isAuthenticated) return <Navigate to="/admin" replace />;
    return children;
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<><Header /><HomePage /><Footer /></>} />
            <Route path="/boutique" element={<><Header /><BoutiquePage /><Footer /></>} />
            <Route path="/checkout/success" element={<><Header /><CheckoutSuccess /><Footer /></>} />
            <Route path="/track/:orderId" element={<><Header /><TrackOrderPage /><Footer /></>} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <CartProvider>
                    <Toaster position="bottom-center" richColors />
                    <AppRoutes />
                </CartProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
