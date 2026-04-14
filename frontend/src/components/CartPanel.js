import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useCart } from "@/contexts/CartContext";
import {
    Minus, Plus, Trash2, MessageSquare, Check, Loader2,
    ExternalLink, ShoppingBag, Clock, MapPin, CreditCard,
    Banknote, ChevronRight, ArrowLeft, Leaf
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

// ─── Créneaux de livraison ────────────────────────────────────────────────────
const DELIVERY_SLOTS = [
    { id: "matin", label: "Matin", time: "9h – 12h" },
    { id: "midi", label: "Midi", time: "12h – 14h" },
    { id: "aprem", label: "Après-midi", time: "14h – 18h" },
    { id: "soir", label: "Soir", time: "18h – 20h" },
];

// ─── Étapes checkout ──────────────────────────────────────────────────────────
const STEPS = ["panier", "livraison", "confirmation"];

export default function CartPanel({ open, onOpenChange }) {
    const { items, removeFromCart, updateQuantity, updateNote, clearCart, cartTotal } = useCart();
    const [step, setStep] = useState("panier");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const lastOrderId = useRef(null);
    const [form, setForm] = useState({
        name: "", phone: "", email: "",
        address: "", delivery: "livraison",
        slot: "matin", payment: "especes", comment: ""
    });

    const updateForm = (key, value) => setForm(p => ({ ...p, [key]: value }));

    const handleSubmit = async () => {
        if (!form.name || !form.phone) {
            toast.error("Veuillez remplir votre nom et téléphone");
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
                delivery_slot: form.slot,
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
                const sessionRes = await api.post("/checkout/create-session", {
                    order_id: res.data.id,
                    origin_url: window.location.origin,
                });
                window.location.href = sessionRes.data.url;
            } else {
                setSuccess(true);
                clearCart();
                toast.success("Commande enregistrée !");
            }
        } catch (err) {
            toast.error("Erreur lors de la commande. Réessayez.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const resetAndClose = () => {
        setStep("panier");
        setSuccess(false);
        lastOrderId.current = null;
        setForm({ name: "", phone: "", email: "", address: "", delivery: "livraison", slot: "matin", payment: "especes", comment: "" });
        onOpenChange(false);
    };

    // ── Vue succès ─────────────────────────────────────────────────────────────
    if (success) {
        return (
            <Sheet open={open} onOpenChange={resetAndClose}>
                <SheetContent side="right" className="w-full sm:max-w-md bg-boudal-ivory p-0 flex flex-col [&>button]:top-4 [&>button]:right-4">
                    <SheetHeader className="sr-only">
                        <SheetTitle>Commande confirmée</SheetTitle>
                        <SheetDescription>Votre commande a été enregistrée</SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                        <div className="w-20 h-20 bg-boudal-green/10 rounded-full flex items-center justify-center mb-6">
                            <Leaf className="w-10 h-10 text-boudal-green" />
                        </div>
                        <h2 className="font-serif text-3xl font-bold text-boudal-green mb-3">
                            Merci {form.name} !
                        </h2>
                        <p className="text-boudal-green/60 text-sm leading-relaxed mb-8 max-w-xs">
                            Votre commande est enregistrée. Nous vous contacterons au {form.phone} pour confirmer la livraison.
                        </p>
                        <div className="bg-white border border-boudal-sage/30 w-full p-4 mb-6 text-left">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-boudal-green/60">Total</span>
                                <span className="font-semibold text-boudal-green">{cartTotal.toFixed(2)} €</span>
                            </div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-boudal-green/60">Livraison</span>
                                <span className="font-semibold text-boudal-green capitalize">{form.delivery}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-boudal-green/60">Paiement</span>
                                <span className="font-semibold text-boudal-green">
                                    {form.payment === "cb" ? "Carte bancaire" : "Espèces"}
                                </span>
                            </div>
                        </div>
                        {lastOrderId.current && (
                            <a
                                href={`/track/${lastOrderId.current}`}
                                data-testid="track-order-link"
                                className="w-full flex items-center justify-center gap-2 bg-boudal-green text-boudal-ivory py-3 px-6 font-semibold text-sm uppercase tracking-wider hover:bg-boudal-green/90 transition-colors mb-3"
                            >
                                <ExternalLink className="w-4 h-4" /> Suivre ma commande
                            </a>
                        )}
                        <button
                            data-testid="back-to-home-btn"
                            onClick={resetAndClose}
                            className="text-boudal-gold font-medium text-sm hover:underline"
                        >
                            Retour à la boutique
                        </button>
                    </div>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md bg-boudal-ivory p-0 flex flex-col [&>button]:top-4 [&>button]:right-4">

                {/* ── En-tête ───────────────────────────────────────────── */}
                <SheetHeader className="p-5 bg-boudal-green text-white shrink-0">
                    <div className="flex items-center gap-3">
                        {step !== "panier" && (
                            <button
                                onClick={() => setStep(step === "confirmation" ? "livraison" : "panier")}
                                className="p-1 hover:bg-white/20 rounded transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        <div>
                            <SheetTitle className="font-serif text-xl text-white">
                                {step === "panier" && "Votre Panier"}
                                {step === "livraison" && "Livraison & Paiement"}
                                {step === "confirmation" && "Confirmation"}
                            </SheetTitle>
                            <SheetDescription className="text-boudal-sage text-xs mt-0.5">
                                {step === "panier" && `${items.length} article${items.length > 1 ? "s" : ""} · ${cartTotal.toFixed(2)} €`}
                                {step === "livraison" && "Vos informations de livraison"}
                                {step === "confirmation" && "Vérifiez votre commande"}
                            </SheetDescription>
                        </div>
                    </div>

                    {/* Indicateur d'étapes */}
                    <div className="flex items-center gap-1 mt-3">
                        {STEPS.map((s, i) => (
                            <div key={s} className="flex items-center gap-1 flex-1">
                                <div className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                    STEPS.indexOf(step) >= i ? "bg-boudal-gold" : "bg-white/20"
                                }`} />
                            </div>
                        ))}
                    </div>
                </SheetHeader>

                {/* ── Étape 1 : Panier ─────────────────────────────────── */}
                {step === "panier" && (
                    <>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="cart-items-list">
                            {items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full pt-20 text-center">
                                    <ShoppingBag className="w-16 h-16 text-boudal-green/20 mb-4" />
                                    <p className="font-serif text-xl text-boudal-green/40 mb-2">Panier vide</p>
                                    <button
                                        onClick={() => onOpenChange(false)}
                                        className="text-boudal-gold font-medium text-sm hover:underline"
                                    >
                                        Découvrir nos produits
                                    </button>
                                </div>
                            ) : (
                                items.map(item => (
                                    <CartItem
                                        key={item.uid}
                                        item={item}
                                        onRemove={removeFromCart}
                                        onUpdateQty={updateQuantity}
                                        onUpdateNote={updateNote}
                                    />
                                ))
                            )}
                        </div>

                        {items.length > 0 && (
                            <div className="shrink-0 border-t border-boudal-sage/20 p-4 bg-white space-y-3">
                                {/* Sous-total */}
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-boudal-green/60">Sous-total</span>
                                    <span className="font-bold text-lg text-boudal-green" data-testid="cart-total">
                                        {cartTotal.toFixed(2)} €
                                    </span>
                                </div>
                                <p className="text-xs text-boudal-green/40">Frais de livraison calculés à l'étape suivante</p>
                                <button
                                    data-testid="validate-cart-btn"
                                    onClick={() => setStep("livraison")}
                                    className="w-full bg-boudal-gold text-white py-3.5 font-semibold text-sm uppercase tracking-wider hover:bg-boudal-gold/90 transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
                                >
                                    Passer la commande <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* ── Étape 2 : Livraison & Paiement ───────────────────── */}
                {step === "livraison" && (
                    <>
                        <div className="flex-1 overflow-y-auto p-4 space-y-5">

                            {/* Infos personnelles */}
                            <div>
                                <h3 className="text-xs font-semibold text-boudal-green uppercase tracking-widest mb-3">
                                    Vos informations
                                </h3>
                                <div className="space-y-2">
                                    <input
                                        data-testid="checkout-name"
                                        value={form.name}
                                        onChange={e => updateForm("name", e.target.value)}
                                        placeholder="Nom complet *"
                                        className="w-full p-3 border border-boudal-sage/40 bg-white text-sm text-boudal-green placeholder-boudal-green/30 focus:border-boudal-gold outline-none"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            data-testid="checkout-phone"
                                            value={form.phone}
                                            onChange={e => updateForm("phone", e.target.value)}
                                            placeholder="Téléphone *"
                                            className="p-3 border border-boudal-sage/40 bg-white text-sm text-boudal-green placeholder-boudal-green/30 focus:border-boudal-gold outline-none"
                                        />
                                        <input
                                            data-testid="checkout-email"
                                            value={form.email}
                                            onChange={e => updateForm("email", e.target.value)}
                                            placeholder="Email"
                                            type="email"
                                            className="p-3 border border-boudal-sage/40 bg-white text-sm text-boudal-green placeholder-boudal-green/30 focus:border-boudal-gold outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Mode de livraison */}
                            <div>
                                <h3 className="text-xs font-semibold text-boudal-green uppercase tracking-widest mb-3">
                                    Mode de réception
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { value: "livraison", label: "Livraison", icon: MapPin, desc: "À domicile" },
                                        { value: "retrait", label: "Click & Collect", icon: ShoppingBag, desc: "Halles de Nîmes" },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            data-testid={`delivery-${opt.value}`}
                                            onClick={() => updateForm("delivery", opt.value)}
                                            className={`p-3 border text-left transition-all ${
                                                form.delivery === opt.value
                                                    ? "border-boudal-gold bg-boudal-gold/5"
                                                    : "border-boudal-sage/40 bg-white hover:border-boudal-gold/50"
                                            }`}
                                        >
                                            <opt.icon className={`w-4 h-4 mb-1 ${form.delivery === opt.value ? "text-boudal-gold" : "text-boudal-green/40"}`} />
                                            <p className="text-xs font-semibold text-boudal-green">{opt.label}</p>
                                            <p className="text-[10px] text-boudal-green/40">{opt.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Adresse (si livraison) */}
                            {form.delivery === "livraison" && (
                                <input
                                    data-testid="checkout-address"
                                    value={form.address}
                                    onChange={e => updateForm("address", e.target.value)}
                                    placeholder="Adresse complète à Nîmes *"
                                    className="w-full p-3 border border-boudal-sage/40 bg-white text-sm text-boudal-green placeholder-boudal-green/30 focus:border-boudal-gold outline-none"
                                />
                            )}

                            {/* Créneaux */}
                            <div>
                                <h3 className="text-xs font-semibold text-boudal-green uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5" /> Créneau souhaité
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {DELIVERY_SLOTS.map(slot => (
                                        <button
                                            key={slot.id}
                                            data-testid={`slot-${slot.id}`}
                                            onClick={() => updateForm("slot", slot.id)}
                                            className={`p-3 border text-center transition-all ${
                                                form.slot === slot.id
                                                    ? "border-boudal-gold bg-boudal-gold/5"
                                                    : "border-boudal-sage/40 bg-white hover:border-boudal-gold/50"
                                            }`}
                                        >
                                            <p className="text-xs font-semibold text-boudal-green">{slot.label}</p>
                                            <p className="text-[10px] text-boudal-green/50">{slot.time}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Paiement */}
                            <div>
                                <h3 className="text-xs font-semibold text-boudal-green uppercase tracking-widest mb-3">
                                    Mode de paiement
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { value: "especes", label: "Espèces", icon: Banknote, desc: "À la livraison" },
                                        { value: "cb", label: "Carte bancaire", icon: CreditCard, desc: "Paiement sécurisé" },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            data-testid={`payment-${opt.value}`}
                                            onClick={() => updateForm("payment", opt.value)}
                                            className={`p-3 border text-left transition-all ${
                                                form.payment === opt.value
                                                    ? "border-boudal-gold bg-boudal-gold/5"
                                                    : "border-boudal-sage/40 bg-white hover:border-boudal-gold/50"
                                            }`}
                                        >
                                            <opt.icon className={`w-4 h-4 mb-1 ${form.payment === opt.value ? "text-boudal-gold" : "text-boudal-green/40"}`} />
                                            <p className="text-xs font-semibold text-boudal-green">{opt.label}</p>
                                            <p className="text-[10px] text-boudal-green/40">{opt.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Commentaire */}
                            <textarea
                                data-testid="checkout-comment"
                                value={form.comment}
                                onChange={e => updateForm("comment", e.target.value)}
                                rows={2}
                                placeholder="Note ou instruction particulière..."
                                className="w-full p-3 border border-boudal-sage/40 bg-white text-sm text-boudal-green placeholder-boudal-green/30 focus:border-boudal-gold outline-none resize-none"
                            />
                        </div>

                        <div className="shrink-0 border-t border-boudal-sage/20 p-4 bg-white">
                            <button
                                data-testid="go-to-confirmation-btn"
                                onClick={() => setStep("confirmation")}
                                className="w-full bg-boudal-gold text-white py-3.5 font-semibold text-sm uppercase tracking-wider hover:bg-boudal-gold/90 transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                Continuer <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </>
                )}

                {/* ── Étape 3 : Confirmation ────────────────────────────── */}
                {step === "confirmation" && (
                    <>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">

                            {/* Récap produits */}
                            <div>
                                <h3 className="text-xs font-semibold text-boudal-green uppercase tracking-widest mb-3">
                                    Votre commande
                                </h3>
                                <div className="space-y-2">
                                    {items.map(item => (
                                        <div key={item.uid} className="flex justify-between items-center py-2 border-b border-boudal-sage/20 last:border-0">
                                            <div>
                                                <p className="text-sm font-medium text-boudal-green">{item.product_name}</p>
                                                <p className="text-xs text-boudal-green/50">
                                                    {item.mode === "piece"
                                                        ? `${item.quantity} pièce${item.quantity > 1 ? "s" : ""}`
                                                        : `${item.quantity.toFixed(1)} kg`
                                                    }
                                                </p>
                                            </div>
                                            <span className="text-sm font-semibold text-boudal-green">
                                                {item.line_total.toFixed(2)} €
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Récap livraison */}
                            <div className="bg-white border border-boudal-sage/30 p-4 space-y-2">
                                <h3 className="text-xs font-semibold text-boudal-green uppercase tracking-widest mb-3">
                                    Récapitulatif
                                </h3>
                                {[
                                    { label: "Nom", value: form.name },
                                    { label: "Téléphone", value: form.phone },
                                    { label: "Mode", value: form.delivery === "livraison" ? "Livraison à domicile" : "Click & Collect" },
                                    { label: "Créneau", value: DELIVERY_SLOTS.find(s => s.id === form.slot)?.time },
                                    { label: "Paiement", value: form.payment === "cb" ? "Carte bancaire" : "Espèces" },
                                    ...(form.address ? [{ label: "Adresse", value: form.address }] : []),
                                ].map(row => (
                                    <div key={row.label} className="flex justify-between text-sm">
                                        <span className="text-boudal-green/50">{row.label}</span>
                                        <span className="font-medium text-boudal-green text-right max-w-[60%]">{row.value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Total */}
                            <div className="bg-boudal-green p-4 flex justify-between items-center">
                                <span className="text-boudal-sage text-sm">Total à payer</span>
                                <span className="font-serif text-2xl font-bold text-boudal-ivory">
                                    {cartTotal.toFixed(2)} €
                                </span>
                            </div>
                        </div>

                        <div className="shrink-0 border-t border-boudal-sage/20 p-4 bg-white">
                            <button
                                data-testid="confirm-order-btn"
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full bg-boudal-gold text-white py-4 font-semibold text-sm uppercase tracking-wider hover:bg-boudal-gold/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                            >
                                {loading
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Check className="w-4 h-4" />
                                }
                                {form.payment === "cb" ? "Payer par carte" : "Confirmer la commande"}
                            </button>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}

// ─── Composant CartItem ───────────────────────────────────────────────────────
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
        <div data-testid={`cart-item-${item.uid}`} className="bg-white border border-boudal-sage/20 p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                    <p className="font-serif font-semibold text-sm text-boudal-green leading-tight">
                        {item.product_name}
                    </p>
                    <p className="text-xs text-boudal-green/40 mt-0.5">
                        {item.mode === "piece"
                            ? `À la pièce — ${item.price?.toFixed(2)} € / pièce`
                            : `Au poids — ${item.price?.toFixed(2)} € / ${item.unit}`
                        }
                    </p>
                </div>
                <p className="font-bold text-sm text-boudal-gold whitespace-nowrap">
                    {item.line_total.toFixed(2)} €
                </p>
            </div>

            <div className="flex items-center justify-between">
                {/* Quantité */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => adjust(-1)}
                        className="w-7 h-7 border border-boudal-sage/40 flex items-center justify-center hover:bg-boudal-sage/20 transition-colors text-boudal-green"
                    >
                        <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-medium w-10 text-center text-boudal-green">
                        {item.mode === "piece" ? item.quantity : item.quantity.toFixed(1)}
                        <span className="text-[10px] text-boudal-green/40 ml-0.5">
                            {item.mode === "piece" ? "p." : "kg"}
                        </span>
                    </span>
                    <button
                        onClick={() => adjust(1)}
                        className="w-7 h-7 border border-boudal-sage/40 flex items-center justify-center hover:bg-boudal-sage/20 transition-colors text-boudal-green"
                    >
                        <Plus className="w-3 h-3" />
                    </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setShowNote(!showNote)}
                        className={`p-1.5 transition-colors ${showNote ? "text-boudal-gold" : "text-boudal-green/30 hover:text-boudal-gold"}`}
                        title="Ajouter une note"
                    >
                        <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onRemove(item.uid)}
                        className="p-1.5 text-boudal-green/30 hover:text-red-400 transition-colors"
                        title="Supprimer"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {showNote && (
                <input
                    value={item.note || ""}
                    onChange={e => onUpdateNote(item.uid, e.target.value)}
                    placeholder="Note pour cet article (ex: bien mûr, sans noyau...)"
                    className="mt-2 w-full text-xs p-2 border border-boudal-sage/40 bg-boudal-ivory focus:border-boudal-gold outline-none"
                />
            )}
        </div>
    );
}
