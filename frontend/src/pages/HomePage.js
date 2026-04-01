import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingBasket, Truck, GraduationCap, UtensilsCrossed, MapPin, Phone, Clock, Tag } from "lucide-react";
import api from "@/lib/api";

export default function HomePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [promos, setPromos] = useState([]);

    useEffect(() => {
        api.get("/promotions").then(res => setPromos(res.data)).catch(() => {});
    }, []);

    useEffect(() => {
        if (location.state?.scrollTo) {
            setTimeout(() => {
                document.getElementById(location.state.scrollTo)?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        }
    }, [location.state]);

    return (
        <main>
            {/* HERO */}
            <section data-testid="hero-section" className="relative h-[calc(100vh-72px)] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0">
                    <img
                        src="https://images.pexels.com/photos/15279908/pexels-photo-15279908.jpeg?auto=compress&cs=tinysrgb&w=1920"
                        alt="Fruits et legumes frais"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 hero-overlay" />
                </div>
                <div className="relative z-10 text-center px-4 max-w-5xl mx-auto text-white">
                    <p className="text-boudal-gold uppercase tracking-[0.3em] text-xs md:text-sm font-semibold mb-4">
                        Institution Nimoise
                    </p>
                    <h1 className="font-serif text-3xl sm:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight tracking-tight">
                        L'Excellence des<br />
                        <span className="italic text-boudal-ivory">Halles de Nimes</span>
                    </h1>
                    <div className="w-16 sm:w-24 h-1 bg-boudal-gold mx-auto mb-6 sm:mb-8" />
                    <p className="text-sm sm:text-base md:text-lg mb-8 sm:mb-10 font-light text-gray-100 max-w-3xl mx-auto px-4">
                        Depuis plus de 20 ans, nous selectionnons chaque matin le meilleur du terroir pour votre table.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-6">
                        <button
                            data-testid="hero-cta-shop"
                            onClick={() => navigate("/boutique")}
                            className="bg-boudal-gold text-white font-serif italic text-base sm:text-lg py-3.5 sm:py-4 px-8 sm:px-10 hover:bg-white hover:text-boudal-green transition-colors active:scale-[0.97] rounded-sm"
                        >
                            Faire mon marche en ligne
                        </button>
                        <button
                            data-testid="hero-cta-story"
                            onClick={() => document.getElementById("histoire")?.scrollIntoView({ behavior: "smooth" })}
                            className="bg-white/10 backdrop-blur-md border border-white text-white font-serif italic text-base sm:text-lg py-3.5 sm:py-4 px-8 sm:px-10 hover:bg-white hover:text-boudal-green transition-colors active:scale-[0.97] rounded-sm"
                        >
                            Notre Histoire
                        </button>
                    </div>
                </div>
            </section>

            {/* PROMO BANNER */}
            {promos.length > 0 && (
                <section data-testid="promo-section" className="py-10 md:py-14 bg-boudal-green">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="flex items-center justify-center gap-2 mb-6">
                            <Tag className="w-5 h-5 text-boudal-gold" />
                            <h2 className="font-serif text-2xl md:text-3xl text-white font-bold">Promotions en cours</h2>
                        </div>
                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                            {promos.map(p => (
                                <div key={p.id} className="flex-shrink-0 w-48 sm:w-56 bg-white/10 backdrop-blur rounded-xl overflow-hidden">
                                    <div className="h-32 sm:h-40 relative">
                                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                                        <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                                            -{p.discount_percentage}%
                                        </span>
                                    </div>
                                    <div className="p-3">
                                        <p className="text-white font-medium text-sm truncate">{p.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-boudal-gold font-bold text-sm">
                                                {(p.price * (1 - p.discount_percentage / 100)).toFixed(2)}&euro;
                                            </span>
                                            <span className="text-gray-400 text-xs line-through">{p.price.toFixed(2)}&euro;</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="text-center mt-6">
                            <button onClick={() => navigate("/boutique")} className="bg-boudal-gold text-white py-2.5 px-8 font-semibold text-sm hover:bg-boudal-gold/90 transition-colors rounded-lg">
                                Voir toutes les offres
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {/* HISTOIRE */}
            <section id="histoire" data-testid="histoire-section" className="py-16 md:py-24 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
                        <div className="md:w-1/2 relative w-full h-80 md:h-[500px]">
                            <img
                                src="https://images.pexels.com/photos/2255938/pexels-photo-2255938.jpeg?auto=compress&cs=tinysrgb&w=800"
                                alt="Notre etal aux Halles"
                                className="rounded-lg shadow-2xl w-full h-full object-cover"
                            />
                        </div>
                        <div className="md:w-1/2">
                            <span className="text-boudal-gold uppercase tracking-widest text-sm font-bold">Une histoire de famille</span>
                            <h2 className="text-3xl md:text-4xl font-serif text-boudal-green font-bold mt-2 mb-6">
                                Au coeur des Halles depuis 20 ans
                            </h2>
                            <p className="text-gray-600 mb-6 leading-relaxed text-base md:text-lg">
                                Chez <span className="font-bold text-boudal-green">Primeur BOUDAL</span>, tout commence bien avant le lever du soleil.
                                Chaque matin, nous parcourons les marches de gros et rencontrons nos producteurs locaux pour denicher les perles rares.
                            </p>
                            <p className="text-gray-600 mb-8 leading-relaxed text-base md:text-lg">
                                Installes Avenue du General Perrier, nous sommes fiers d'etre devenus une reference pour les Nimois exigeants.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* SERVICES */}
            <section id="services" data-testid="services-section" className="py-16 md:py-24 bg-boudal-ivory">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-boudal-green mb-16 font-bold">
                        Nos Services Premium
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                        {[
                            { icon: ShoppingBasket, title: "Paniers Personnalises", desc: "Sur mesure selon vos gouts, vos habitudes ou vos evenements familiaux." },
                            { icon: Truck, title: "Livraison a Domicile", desc: "Service de livraison rapide partout a Nimes du lundi au dimanche." },
                            { icon: GraduationCap, title: "Conseils Experts", desc: "20 ans d'experience pour vous guider vers les bons choix." },
                            { icon: UtensilsCrossed, title: "Restauration & Pro", desc: "Arrivages premium pour les professionnels exigeants." },
                        ].map((s, i) => (
                            <div key={i} className="p-8 bg-white border border-boudal-sage/20 rounded-xl hover:shadow-xl transition-shadow">
                                <s.icon className="w-12 h-12 text-boudal-gold mx-auto mb-6" />
                                <h3 className="text-xl font-serif text-boudal-green mb-4 font-semibold">{s.title}</h3>
                                <p className="text-gray-600 text-sm">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CONTACT */}
            <section id="contact" data-testid="contact-section" className="py-16 md:py-24 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-12">
                        <h2 className="font-serif text-3xl md:text-4xl text-boudal-green font-bold">Nous Contacter</h2>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="bg-boudal-green text-white rounded-xl p-8 h-fit">
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <MapPin className="w-5 h-5 text-boudal-gold flex-shrink-0 mt-0.5" />
                                    <p className="text-sm">Halles de Nimes<br />Av. General Perrier<br />30000 Nimes</p>
                                </div>
                                <div className="flex items-start gap-4">
                                    <Phone className="w-5 h-5 text-boudal-gold flex-shrink-0 mt-0.5" />
                                    <p className="text-sm">04 66 29 52 23</p>
                                </div>
                                <div className="flex items-start gap-4">
                                    <Clock className="w-5 h-5 text-boudal-gold flex-shrink-0 mt-0.5" />
                                    <p className="text-sm">Lundi - Dimanche<br />07h00 - 13h00</p>
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-2 bg-boudal-ivory rounded-xl p-6 md:p-10">
                            <form className="space-y-5" onSubmit={e => e.preventDefault()}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input type="text" placeholder="Nom complet" className="p-3 border border-boudal-sage/30 rounded-lg bg-white text-sm focus:border-boudal-gold outline-none" />
                                    <input type="email" placeholder="Email" className="p-3 border border-boudal-sage/30 rounded-lg bg-white text-sm focus:border-boudal-gold outline-none" />
                                </div>
                                <select className="p-3 border border-boudal-sage/30 rounded-lg bg-white text-sm w-full focus:border-boudal-gold outline-none">
                                    <option>Demande d'information generale</option>
                                    <option>Commande specifique / Gros volume</option>
                                    <option>Evenement / Traiteur</option>
                                    <option>Autre</option>
                                </select>
                                <textarea rows={4} placeholder="Message" className="p-3 border border-boudal-sage/30 rounded-lg bg-white text-sm w-full focus:border-boudal-gold outline-none" />
                                <button type="submit" className="bg-boudal-gold text-white font-semibold py-3 px-8 text-sm uppercase tracking-wider hover:bg-boudal-green transition-colors">
                                    Envoyer
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
