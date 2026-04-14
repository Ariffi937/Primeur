import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Leaf, ChevronDown } from "lucide-react";
import api from "@/lib/api";
import ProductCard from "@/components/ProductCard";

const MAIN_CATEGORIES = [
    { key: "all", label: "Tout voir" },
    { key: "fruits", label: "Fruits" },
    { key: "legumes", label: "Légumes" },
    { key: "herbes", label: "Herbes" },
    { key: "epicerie", label: "Épicerie" },
    { key: "paniers", label: "Paniers" },
];

const CATEGORY_HERO_IMAGES = {
    fruits: "https://images.unsplash.com/photo-1629527821795-79d67a6e39bf?w=1200&q=80",
    legumes: "https://images.unsplash.com/photo-1722810767143-40a6a7a74b13?w=1200&q=80",
    herbes: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=1200&q=80",
    epicerie: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80",
    paniers: "https://images.unsplash.com/photo-1573246123716-6b1782bfc499?w=1200&q=80",
    all: "https://images.pexels.com/photos/15279908/pexels-photo-15279908.jpeg?auto=compress&cs=tinysrgb&w=1200",
};

const FALLBACK_IMAGE = "https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg?auto=compress&cs=tinysrgb&w=600";

export default function BoutiquePage() {
    const [products, setProducts] = useState([]);
    const [subcategoryImages, setSubcategoryImages] = useState({});
    const [activeCategory, setActiveCategory] = useState("all");
    const [activeSubcategory, setActiveSubcategory] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get("/products"),
            api.get("/subcategory-images"),
        ]).then(([prodRes, imgRes]) => {
            setProducts(prodRes.data);
            setSubcategoryImages(imgRes.data);
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    const filteredProducts = useMemo(() => {
        if (activeCategory === "all") return products;
        return products.filter(p => p.category === activeCategory);
    }, [products, activeCategory]);

    const subcategories = useMemo(() => {
        const subs = {};
        filteredProducts.forEach(p => {
            if (!subs[p.subcategory]) subs[p.subcategory] = 0;
            subs[p.subcategory]++;
        });
        return Object.entries(subs).sort((a, b) => a[0].localeCompare(b[0]));
    }, [filteredProducts]);

    const subcategoryProducts = useMemo(() => {
        if (!activeSubcategory) return [];
        return filteredProducts.filter(p => p.subcategory === activeSubcategory);
    }, [filteredProducts, activeSubcategory]);

    const handleCategoryChange = (key) => {
        setActiveCategory(key);
        setActiveSubcategory(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-boudal-ivory">
                <div className="flex flex-col items-center gap-4">
                    <Leaf className="w-8 h-8 text-boudal-green animate-pulse" />
                    <p className="text-boudal-green font-serif text-xl">Chargement des produits...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-boudal-ivory" data-testid="boutique-page">

            {/* ── HERO BANNER ─────────────────────────────────────── */}
            {!activeSubcategory && (
                <section className="relative h-[40vh] min-h-[280px] overflow-hidden" data-testid="boutique-hero">
                    <img
                        src={CATEGORY_HERO_IMAGES[activeCategory] || CATEGORY_HERO_IMAGES.all}
                        alt="Nos produits frais"
                        className="w-full h-full object-cover transition-all duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-boudal-green/80 via-boudal-green/30 to-transparent" />
                    <div className="absolute inset-0 flex flex-col justify-end px-6 md:px-16 pb-10 md:pb-14">
                        <p className="text-boudal-sage text-xs uppercase tracking-widest mb-2 font-medium">
                            Arrivage quotidien · Produits frais
                        </p>
                        <h1 className="font-serif text-3xl md:text-5xl text-boudal-ivory font-bold leading-tight mb-4">
                            {activeCategory === "all"
                                ? "Toute notre sélection"
                                : MAIN_CATEGORIES.find(c => c.key === activeCategory)?.label}
                        </h1>
                        <a
                            href="#catalogue"
                            className="w-fit bg-boudal-gold text-white py-2.5 px-7 text-xs uppercase tracking-wider font-semibold hover:bg-boudal-gold/90 transition-colors flex items-center gap-2"
                            data-testid="hero-discover-cta"
                        >
                            Découvrir <ChevronDown className="w-4 h-4" />
                        </a>
                    </div>
                </section>
            )}

            {/* ── BARRE DE FILTRES STICKY ──────────────────────────── */}
            <div
                className="bg-boudal-green py-4 text-center text-white sticky top-[72px] z-20 shadow-md"
                data-testid="filter-bar"
            >
                {!activeSubcategory ? (
                    <div className="max-w-7xl mx-auto px-4 overflow-x-auto flex gap-2 justify-start md:justify-center no-scrollbar">
                        {MAIN_CATEGORIES.map(cat => (
                            <button
                                key={cat.key}
                                data-testid={`filter-${cat.key}`}
                                onClick={() => handleCategoryChange(cat.key)}
                                className={`whitespace-nowrap px-5 py-2 text-sm font-medium transition-all flex-shrink-0 border ${
                                    activeCategory === cat.key
                                        ? "bg-boudal-gold text-white border-boudal-gold"
                                        : "bg-transparent border-white/30 hover:border-white/60 text-white"
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-boudal-sage text-xs">
                            {subcategoryProducts.length} produit{subcategoryProducts.length > 1 ? "s" : ""}
                        </p>
                        <h2 className="font-serif text-xl md:text-2xl text-white font-bold">
                            {activeSubcategory}
                        </h2>
                        <button
                            data-testid="back-to-categories"
                            onClick={() => setActiveSubcategory(null)}
                            className="mt-1 bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 text-sm flex items-center gap-2 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> Retour aux rayons
                        </button>
                    </div>
                )}
            </div>

            {/* ── CONTENU PRINCIPAL ────────────────────────────────── */}
            <div id="catalogue" className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-16">

                {!activeSubcategory ? (
                    <>
                        {/* Compteur produits / rayons */}
                        <div className="flex items-center justify-between mb-8">
                            <p className="text-boudal-green/60 text-sm">
                                {filteredProducts.length} produit{filteredProducts.length > 1 ? "s" : ""}
                                {activeCategory !== "all" && (
                                    <span> dans <span className="font-semibold text-boudal-green">
                                        {MAIN_CATEGORIES.find(c => c.key === activeCategory)?.label}
                                    </span></span>
                                )}
                            </p>
                            <span className="text-xs text-boudal-sage uppercase tracking-widest">
                                {subcategories.length} rayon{subcategories.length > 1 ? "s" : ""}
                            </span>
                        </div>

                        {/* Bento grid sous-catégories */}
                        {subcategories.length === 0 ? (
                            <div className="text-center py-24 text-boudal-green/40">
                                <Leaf className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                <p className="font-serif text-xl">Aucun produit dans cette catégorie.</p>
                            </div>
                        ) : (
                            <div
                                className="grid grid-cols-2 md:grid-cols-12 gap-4 md:gap-6"
                                data-testid="subcategories-grid"
                            >
                                {subcategories.map(([sub, count], index) => {
                                    // Bento asymétrique : alternance grande/petite carte
                                    const isLarge = index % 5 === 0 || index % 5 === 3;
                                    const colSpan = isLarge ? "md:col-span-7" : "md:col-span-5";
                                    const height = isLarge ? "h-56 md:h-72" : "h-48 md:h-64";

                                    return (
                                        <div
                                            key={sub}
                                            data-testid={`category-card-${sub}`}
                                            onClick={() => setActiveSubcategory(sub)}
                                            className={`relative overflow-hidden cursor-pointer group ${colSpan} ${height}`}
                                        >
                                            <img
                                                src={subcategoryImages[sub] || FALLBACK_IMAGE}
                                                alt={sub}
                                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                                loading="lazy"
                                            />
                                            {/* Overlay dégradé */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-boudal-green/75 to-transparent transition-opacity duration-300 group-hover:from-boudal-green/85" />
                                            {/* Contenu */}
                                            <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-7">
                                                <span className="inline-block bg-boudal-gold text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wider mb-2 w-fit">
                                                    {count} produit{count > 1 ? "s" : ""}
                                                </span>
                                                <h3 className="font-serif text-xl md:text-2xl text-boudal-ivory font-bold leading-tight">
                                                    {sub}
                                                </h3>
                                                <p className="text-boudal-sage text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    Voir la sélection →
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* Grille produits */}
                        <div
                            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-10"
                            data-testid="products-grid"
                        >
                            {subcategoryProducts.map(product => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                        {subcategoryProducts.length === 0 && (
                            <div className="text-center py-24 text-boudal-green/40">
                                <Leaf className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                <p className="font-serif text-xl">Aucun produit disponible.</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── BANDEAU SERVICES ─────────────────────────────────── */}
            {!activeSubcategory && (
                <section className="bg-boudal-green py-14 px-6 md:px-16" data-testid="services-banner">
                    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
                        {[
                            { emoji: "🌿", title: "Produits frais", desc: "Arrivage chaque matin du marché local" },
                            { emoji: "🚚", title: "Livraison rapide", desc: "Chez vous en 2h sur la zone de livraison" },
                            { emoji: "♻️", title: "Zéro déchet", desc: "Emballages recyclables et sacs réutilisables" },
                        ].map(s => (
                            <div key={s.title} className="flex flex-col items-center gap-3">
                                <span className="text-3xl">{s.emoji}</span>
                                <h3 className="font-serif text-boudal-ivory text-lg font-semibold">{s.title}</h3>
                                <p className="text-boudal-sage text-sm leading-relaxed">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
