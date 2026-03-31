import { createContext, useContext, useState, useCallback, useMemo } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
    const [items, setItems] = useState([]);

    const addToCart = useCallback((product, quantity, mode) => {
        const uid = `${product.id}-${mode === "piece" ? "p" : "w"}`;
        const lineTotal = mode === "piece"
            ? quantity * product.piece_weight * product.price
            : quantity * product.price;

        setItems(prev => {
            const existing = prev.find(i => i.uid === uid);
            if (existing) {
                return prev.map(i =>
                    i.uid === uid
                        ? { ...i, quantity: i.quantity + quantity, line_total: (i.quantity + quantity) * (mode === "piece" ? product.piece_weight * product.price : product.price) }
                        : i
                );
            }
            return [...prev, {
                uid,
                product_id: product.id,
                product_name: product.name,
                price: product.price,
                unit: product.unit,
                quantity,
                mode,
                piece_weight: product.piece_weight || 0,
                note: "",
                line_total: lineTotal,
            }];
        });
    }, []);

    const removeFromCart = useCallback((uid) => {
        setItems(prev => prev.filter(i => i.uid !== uid));
    }, []);

    const updateQuantity = useCallback((uid, quantity) => {
        setItems(prev => prev.map(i => {
            if (i.uid !== uid) return i;
            const lt = i.mode === "piece"
                ? quantity * i.piece_weight * i.price
                : quantity * i.price;
            return { ...i, quantity, line_total: lt };
        }));
    }, []);

    const updateNote = useCallback((uid, note) => {
        setItems(prev => prev.map(i => i.uid === uid ? { ...i, note } : i));
    }, []);

    const clearCart = useCallback(() => setItems([]), []);

    const cartCount = useMemo(() => items.length, [items]);
    const cartTotal = useMemo(() => items.reduce((sum, i) => sum + i.line_total, 0), [items]);

    return (
        <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, updateNote, clearCart, cartCount, cartTotal }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error("useCart must be used within CartProvider");
    return ctx;
}
