import { useState, useEffect, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import ProductCard from "@/components/ProductCard";

const MAIN_CATEGORIES = [
    { key: "all", label: "Tout voir" },
    { key: "fruits", label: "Fruits" },
    { key: "legumes", label: "Legumes" },
    { key: "herbes", label: "Herbes" },
    { key: "epicerie", label: "Epicerie" },
    { key: "paniers", label: "Paniers" },
];

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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-boudal-ivory">
                <p className="text-boudal-green font-serif text-xl animate-pulse">Chargement des produits...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-boudal-ivory" data-testid="boutique-page">
            {/* Sticky filter bar */}
            <div className="bg-boudal-green py-5 md:py-6 text-center text-white sticky top-[72px] z-20 shadow-md">
                <h1 className="font-serif text-2xl md:text-3xl mb-1">
                    {activeSubcategory || "Nos Rayons"}
                </h1>
                <p className="text-boudal-sage text-xs mb-4">
                    {activeSubcategory
                        ? `${subcategoryProducts.length} produit${subcategoryProducts.length > 1 ? "s" : ""}`
                        : "Choisissez une famille de produits"
                    }
                </p>

                {!activeSubcategory && (
                    <div className="max-w-7xl mx-auto px-4 overflow-x-auto flex gap-3 justify-start md:justify-center no-scrollbar pb-1">
                        {MAIN_CATEGORIES.map(cat => (
                            <button
                                key={cat.key}
                                data-testid={`filter-${cat.key}`}
                                onClick={() => { setActiveCategory(cat.key); setActiveSubcategory(null); }}
                                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${activeCategory === cat.key ? "bg-boudal-gold text-white" : "bg-white/20 hover:bg-white/30 text-white"}`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                )}

                {activeSubcategory && (
                    <button
                        data-testid="back-to-categories"
                        onClick={() => setActiveSubcategory(null)}
                        className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-full text-sm flex items-center gap-2 mx-auto transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Retour aux rayons
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
                {!activeSubcategory ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        {subcategories.map(([sub, count]) => (
                            <div
                                key={sub}
                                data-testid={`category-card-${sub}`}
                                onClick={() => setActiveSubcategory(sub)}
                                className="relative h-48 md:h-64 rounded-xl overflow-hidden cursor-pointer group shadow-md"
                            >
                                <img
                                    src={subcategoryImages[sub] || "https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg?auto=compress&cs=tinysrgb&w=600"}
                                    alt={sub}
                                    className="absolute inset-0 w-full h-full object-cover img-zoom"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                                    <h3 className="text-xl md:text-2xl font-serif text-white font-bold mb-2 drop-shadow-md">
                                        {sub}
                                    </h3>
                                    <span className="bg-boudal-gold/90 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                        {count} Produit{count > 1 ? "s" : ""}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                        {subcategoryProducts.map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
