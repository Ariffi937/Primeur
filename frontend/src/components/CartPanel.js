import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useCart } from "@/contexts/CartContext";
import { Minus, Plus, Trash2, MessageSquare, Check, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function CartPanel({ open, onOpenChange }) {
    const { items, removeFromCart, updateQuantity, updateNote, clearCart, cartTotal } = useCart();
    const [showCheckout, setShowCheckout] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const lastOrderId = useRef(null);
    const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", delivery: "livraison", payment: "especes", comment: "" });

    const handleSubmit = async () => {
        if (!form.name || !form.phone) {
            toast.error("Veuillez remplir votre nom et telephone");
            return;
        }
        if (form.delivery === "livraison" && !form.address) {
            toast.error("Veuillez indiquer votre adresse de livraison");
            return;
        }
        setLoading(true);
        try {
            const orderData = {
                customer_name: form.name,
                customer_phone: form.phone,
                customer_email: form.email,
                customer_address: form.address,
                delivery_method: form.delivery,
                payment_method: form.payment,
                global_comment: form.comment,
                total_amount: parseFloat(cartTotal.toFixed(2)),
                items: items.map(i => ({
                    product_id: i.product_id,
                    product_name: i.product_name,
                    quantity: i.quantity,
                    mode: i.mode,
                    item_note: i.note,
                    line_total: parseFloat(i.line_total.toFixed(2)),
                })),
            };
            const res = await api.post("/orders", orderData);
            lastOrderId.current = res.data.id;

            if (form.payment === "cb") {
                const origin = window.location.origin;
                const sessionRes = await api.post("/checkout/create-session", {
                    order_id: res.data.id,
                    origin_url: origin,
                });
                window.location.href = sessionRes.data.url;
            } else {
                setSuccess(true);
                clearCart();
                toast.success("Commande enregistree !");
            }
        } catch (err) {
            toast.error("Erreur lors de la commande. Reessayez.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const resetAndClose = () => {
        setShowCheckout(false);
        setSuccess(false);
        lastOrderId.current = null;
        setForm({ name: "", phone: "", email: "", address: "", delivery: "livraison", payment: "especes", comment: "" });
        onOpenChange(false);
    };

    if (success) {
        const trackUrl = lastOrderId.current ? `/track/${lastOrderId.current}` : null;
        return (
            <Sheet open={open} onOpenChange={resetAndClose}>
                <SheetContent side="right" className="w-full sm:max-w-md bg-white p-0 flex flex-col [&>button]:top-4 [&>button]:right-4">
                    <SheetHeader className="sr-only"><SheetTitle>Confirmation</SheetTitle><SheetDescription>Votre commande</SheetDescription></SheetHeader>
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                            <Check className="w-10 h-10 text-boudal-green" />
                        </div>
                        <h2 className="font-serif text-2xl font-bold text-boudal-green mb-2">Merci !</h2>
                        <p className="text-gray-600 mb-6">Votre commande est enregistree. Nous vous contacterons rapidement.</p>
                        {trackUrl && (
                            <a
                                href={trackUrl}
                                data-testid="track-order-link"
                                className="flex items-center gap-2 bg-boudal-green text-white py-3 px-6 font-semibold text-sm hover:bg-boudal-green/90 transition-colors rounded-lg mb-3"
                            >
                                <ExternalLink className="w-4 h-4" /> Suivre ma commande
                            </a>
                        )}
                        <button data-testid="back-to-home-btn" onClick={resetAndClose} className="text-boudal-gold font-medium text-sm hover:underline">
                            Retour a la boutique
                        </button>
                    </div>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md bg-white p-0 flex flex-col [&>button]:top-4 [&>button]:right-4">
                <SheetHeader className="p-4 sm:p-5 bg-boudal-green text-white">
                    <SheetTitle className="font-serif text-lg sm:text-xl italic text-white">Votre Panier</SheetTitle>
                    <SheetDescription className="text-boudal-sage text-xs">
                        {items.length > 0 ? `${items.length} article${items.length > 1 ? "s" : ""}` : "Vide"}
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="cart-items-list">
                    {items.length === 0 ? (
                        <div className="text-center mt-16 text-gray-400">
                            <p className="text-lg font-medium mb-2">Votre panier est vide</p>
                            <button onClick={() => onOpenChange(false)} className="text-boudal-gold font-medium underline text-sm">
                                Voir les rayons
                            </button>
                        </div>
                    ) : (
                        items.map(item => (
                            <CartItem key={item.uid} item={item} onRemove={removeFromCart} onUpdateQty={updateQuantity} onUpdateNote={updateNote} />
                        ))
                    )}
                </div>

                {items.length > 0 && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
                        <div className="flex justify-between text-lg font-bold text-boudal-green">
                            <span>Total estime</span>
                            <span data-testid="cart-total">{cartTotal.toFixed(2)}&euro;</span>
                        </div>

                        {showCheckout && (
                            <div className="space-y-3 border-t border-dashed border-gray-300 pt-3 max-h-[50vh] overflow-y-auto">
                                <input data-testid="checkout-name" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Votre Nom *" className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white focus:border-boudal-gold outline-none" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <input data-testid="checkout-phone" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} placeholder="Telephone *" className="p-3 border border-gray-300 rounded-lg text-sm bg-white focus:border-boudal-gold outline-none" />
                                    <input data-testid="checkout-email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="Email (confirmation)" type="email" className="p-3 border border-gray-300 rounded-lg text-sm bg-white focus:border-boudal-gold outline-none" />
                                </div>
                                <input data-testid="checkout-address" value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))} placeholder="Adresse complete a Nimes" className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white focus:border-boudal-gold outline-none" />
                                <select data-testid="checkout-delivery" value={form.delivery} onChange={e => setForm(p => ({...p, delivery: e.target.value}))} className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white focus:border-boudal-gold outline-none">
                                    <option value="livraison">Livraison a domicile (Nimes)</option>
                                    <option value="retrait">Retrait aux Halles (Click & Collect)</option>
                                </select>
                                <div className="space-y-2 text-sm">
                                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-white transition bg-gray-50">
                                        <input type="radio" name="pay" value="especes" checked={form.payment === "especes"} onChange={() => setForm(p => ({...p, payment: "especes"}))} className="text-boudal-green" />
                                        <span>Especes a la livraison</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-white transition bg-gray-50">
                                        <input type="radio" name="pay" value="cb" checked={form.payment === "cb"} onChange={() => setForm(p => ({...p, payment: "cb"}))} className="text-boudal-green" />
                                        <span>Paiement en ligne (Carte Bancaire)</span>
                                    </label>
                                </div>
                                <textarea data-testid="checkout-comment" value={form.comment} onChange={e => setForm(p => ({...p, comment: e.target.value}))} rows={2} placeholder="Note globale..." className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white focus:border-boudal-gold outline-none" />
                            </div>
                        )}

                        {!showCheckout ? (
                            <button
                                data-testid="validate-cart-btn"
                                onClick={() => setShowCheckout(true)}
                                className="w-full bg-boudal-green text-white py-4 font-semibold text-sm uppercase tracking-wider hover:bg-boudal-green/90 transition-colors rounded-lg active:scale-[0.98]"
                            >
                                Valider mon panier
                            </button>
                        ) : (
                            <button
                                data-testid="confirm-order-btn"
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full bg-boudal-gold text-white py-4 font-semibold text-sm uppercase tracking-wider hover:bg-boudal-gold/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 rounded-lg active:scale-[0.98]"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                {form.payment === "cb" ? "Payer par carte" : "Confirmer la commande"}
                            </button>
                        )}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

function CartItem({ item, onRemove, onUpdateQty, onUpdateNote }) {
    const [showNote, setShowNote] = useState(false);
    const isKg = item.unit === "kg" && item.mode === "weight";
    const step = item.mode === "piece" ? 1 : (isKg ? 0.1 : 1);
    const min = item.mode === "piece" ? 1 : (isKg ? 0.1 : 1);

    const adjust = (dir) => {
        const next = dir > 0 ? item.quantity + step : item.quantity - step;
        const rounded = Math.round(next * 100) / 100;
        if (rounded >= min) onUpdateQty(item.uid, rounded);
    };

    return (
        <div data-testid={`cart-item-${item.uid}`} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-boudal-green truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-500">
                        {item.mode === "piece" ? "A la piece" : `${item.price.toFixed(2)}\u20AC/${item.unit}`}
                    </p>
                </div>
                <p className="font-semibold text-sm text-boudal-green whitespace-nowrap">{item.line_total.toFixed(2)}&euro;</p>
            </div>
            <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                    <button onClick={() => adjust(-1)} className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-200 transition-colors">
                        <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-medium w-12 text-center">
                        {item.mode === "piece" ? item.quantity : item.quantity.toFixed(1)}
                    </span>
                    <button onClick={() => adjust(1)} className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-200 transition-colors">
                        <Plus className="w-3 h-3" />
                    </button>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setShowNote(!showNote)} className="p-1.5 text-gray-400 hover:text-boudal-gold transition-colors">
                        <MessageSquare className="w-4 h-4" />
                    </button>
                    <button onClick={() => onRemove(item.uid)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
            {showNote && (
                <input
                    value={item.note}
                    onChange={e => onUpdateNote(item.uid, e.target.value)}
                    placeholder="Note pour cet article..."
                    className="mt-2 w-full text-xs p-2 border rounded bg-white focus:border-boudal-gold outline-none"
                />
            )}
        </div>
    );
}
