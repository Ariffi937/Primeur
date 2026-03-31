import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingBasket, Menu, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import CartPanel from "@/components/CartPanel";

export default function Header() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [cartOpen, setCartOpen] = useState(false);
    const { cartCount } = useCart();
    const location = useLocation();
    const navigate = useNavigate();

    const scrollToSection = (id) => {
        setMobileOpen(false);
        if (location.pathname !== "/") {
            navigate("/", { state: { scrollTo: id } });
        } else {
            document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        }
    };

    const navLinks = [
        { label: "Accueil", to: "/", action: null },
        { label: "Commander", to: "/boutique", action: null },
        { label: "Services", to: null, action: () => scrollToSection("services") },
        { label: "Contact", to: null, action: () => scrollToSection("contact") },
    ];

    return (
        <>
            <nav data-testid="main-navigation" className="sticky top-0 z-50 backdrop-blur-xl bg-boudal-ivory/80 border-b border-boudal-sage/30">
                <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-[72px]">
                    <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
                        <span className="font-serif text-xl md:text-2xl font-bold text-boudal-green tracking-tight">
                            Primeur <span className="text-boudal-gold italic">BOUDAL</span>
                        </span>
                    </Link>

                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            link.to ? (
                                <Link
                                    key={link.label}
                                    to={link.to}
                                    data-testid={`nav-${link.label.toLowerCase()}`}
                                    className={`text-sm font-medium tracking-wide transition-colors hover:text-boudal-gold ${location.pathname === link.to ? "text-boudal-gold" : "text-boudal-green"}`}
                                >
                                    {link.label}
                                </Link>
                            ) : (
                                <button
                                    key={link.label}
                                    onClick={link.action}
                                    data-testid={`nav-${link.label.toLowerCase()}`}
                                    className="text-sm font-medium tracking-wide text-boudal-green transition-colors hover:text-boudal-gold"
                                >
                                    {link.label}
                                </button>
                            )
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            data-testid="cart-button"
                            onClick={() => setCartOpen(true)}
                            className="relative p-2 text-boudal-green hover:text-boudal-gold transition-colors"
                        >
                            <ShoppingBasket className="w-6 h-6" />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-boudal-gold text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                        <button
                            data-testid="mobile-menu-toggle"
                            className="md:hidden p-2 text-boudal-green"
                            onClick={() => setMobileOpen(!mobileOpen)}
                        >
                            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {mobileOpen && (
                    <div className="md:hidden bg-boudal-ivory/95 backdrop-blur-lg border-t border-boudal-sage/20 px-4 pb-4">
                        {navLinks.map((link) => (
                            link.to ? (
                                <Link
                                    key={link.label}
                                    to={link.to}
                                    onClick={() => setMobileOpen(false)}
                                    className="block py-3 text-boudal-green font-medium border-b border-boudal-sage/10 hover:text-boudal-gold transition-colors"
                                >
                                    {link.label}
                                </Link>
                            ) : (
                                <button
                                    key={link.label}
                                    onClick={link.action}
                                    className="block w-full text-left py-3 text-boudal-green font-medium border-b border-boudal-sage/10 hover:text-boudal-gold transition-colors"
                                >
                                    {link.label}
                                </button>
                            )
                        ))}
                    </div>
                )}
            </nav>

            <CartPanel open={cartOpen} onOpenChange={setCartOpen} />
        </>
    );
}
