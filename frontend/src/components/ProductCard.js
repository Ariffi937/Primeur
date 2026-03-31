import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";

export default function ProductCard({ product }) {
    const { addToCart } = useCart();
    const [mode, setMode] = useState("weight");
    const [quantity, setQuantity] = useState(product.unit === "kg" ? 0.5 : 1);

    const isKg = product.unit === "kg";
    const canToggle = product.can_piece && isKg;
    const isPieceMode = canToggle && mode === "piece";

    const step = isPieceMode ? 1 : (isKg ? 0.1 : 1);
    const minQty = isPieceMode ? 1 : (isKg ? 0.1 : 1);

    const displayPrice = isPieceMode
        ? (product.price * product.piece_weight).toFixed(2)
        : product.price.toFixed(2);

    const displayUnit = isPieceMode ? "piece" : product.unit;

    const adjustQty = (dir) => {
        setQuantity(prev => {
            const next = dir > 0 ? prev + step : prev - step;
            return Math.max(minQty, Math.round(next * 100) / 100);
        });
    };

    const handleAdd = () => {
        addToCart(product, quantity, isPieceMode ? "piece" : "weight");
        toast.success(`${product.name} ajoute au panier`);
        setQuantity(isPieceMode ? 1 : (isKg ? 0.5 : 1));
    };

    return (
        <div data-testid={`product-card-${product.id}`} className="group">
            <div className="relative overflow-hidden rounded-xl aspect-square mb-3 bg-gray-100">
                <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover img-zoom"
                    loading="lazy"
                />
            </div>

            <h3 className="font-serif text-sm sm:text-base font-semibold text-boudal-green leading-tight mb-1 line-clamp-2">
                {product.name}
            </h3>

            <p className="text-sm font-medium text-boudal-gold mb-2 sm:mb-3">
                {displayPrice}&euro; / {displayUnit}
            </p>

            {canToggle && (
                <div data-testid={`unit-toggle-${product.id}`} className="flex mb-2 sm:mb-3 rounded-full overflow-hidden border border-boudal-green">
                    <button
                        data-testid={`toggle-weight-${product.id}`}
                        onClick={() => { setMode("weight"); setQuantity(0.5); }}
                        className={`flex-1 py-2 text-xs font-medium transition-colors ${mode === "weight" ? "bg-boudal-green text-boudal-ivory" : "text-boudal-green hover:bg-boudal-green/5"}`}
                    >
                        Au poids
                    </button>
                    <button
                        data-testid={`toggle-piece-${product.id}`}
                        onClick={() => { setMode("piece"); setQuantity(1); }}
                        className={`flex-1 py-2 text-xs font-medium transition-colors ${mode === "piece" ? "bg-boudal-green text-boudal-ivory" : "text-boudal-green hover:bg-boudal-green/5"}`}
                    >
                        A la piece
                    </button>
                </div>
            )}

            <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3 justify-center">
                <button
                    data-testid={`qty-minus-${product.id}`}
                    onClick={() => adjustQty(-1)}
                    className="w-9 h-9 sm:w-8 sm:h-8 rounded-full border border-boudal-sage/50 flex items-center justify-center text-boudal-green hover:bg-boudal-sage/20 transition-colors active:bg-boudal-sage/30"
                >
                    <Minus className="w-3 h-3" />
                </button>
                <span className="w-14 sm:w-16 text-center text-sm font-medium text-boudal-green">
                    {isPieceMode ? quantity : quantity.toFixed(1)} {isPieceMode ? "p." : (isKg ? "kg" : "")}
                </span>
                <button
                    data-testid={`qty-plus-${product.id}`}
                    onClick={() => adjustQty(1)}
                    className="w-9 h-9 sm:w-8 sm:h-8 rounded-full border border-boudal-sage/50 flex items-center justify-center text-boudal-green hover:bg-boudal-sage/20 transition-colors active:bg-boudal-sage/30"
                >
                    <Plus className="w-3 h-3" />
                </button>
            </div>

            <button
                data-testid={`add-to-cart-${product.id}`}
                onClick={handleAdd}
                className="w-full bg-boudal-gold text-white py-3 text-xs sm:text-sm font-semibold uppercase tracking-wider hover:bg-boudal-gold/90 transition-colors rounded-lg active:scale-[0.97]"
            >
                Ajouter
            </button>
        </div>
    );
}
