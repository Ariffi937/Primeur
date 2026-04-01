import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Package, Truck, Check, Clock, XCircle, MapPin, Phone, User } from "lucide-react";
import api from "@/lib/api";

const STEPS = [
    { key: "pending", label: "En attente", icon: Clock },
    { key: "processing", label: "En preparation", icon: Package },
    { key: "ready", label: "Pret", icon: Check },
    { key: "delivered", label: "Livre", icon: Truck },
];

export default function TrackOrderPage() {
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = () => {
            api.get(`/orders/track/${orderId}`)
                .then(res => { setOrder(res.data); setError(false); })
                .catch(() => setError(true))
                .finally(() => setLoading(false));
        };
        fetchOrder();
        const interval = setInterval(fetchOrder, 15000);
        return () => clearInterval(interval);
    }, [orderId]);

    if (loading) return (
        <div className="min-h-[60vh] flex items-center justify-center bg-boudal-ivory">
            <p className="text-boudal-green font-serif text-xl animate-pulse">Chargement...</p>
        </div>
    );

    if (error || !order) return (
        <div className="min-h-[60vh] flex items-center justify-center bg-boudal-ivory px-4">
            <div className="text-center">
                <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h2 className="font-serif text-2xl text-boudal-green mb-2">Commande introuvable</h2>
                <p className="text-gray-500 mb-6">Le lien de suivi est invalide ou la commande n'existe pas.</p>
                <Link to="/" className="bg-boudal-gold text-white py-3 px-8 font-semibold inline-block">Retour a l'accueil</Link>
            </div>
        </div>
    );

    const isCancelled = order.status === "cancelled";
    const isPendingPayment = order.status === "pending_payment";
    const currentStepIdx = STEPS.findIndex(s => s.key === order.status);

    return (
        <div className="min-h-[60vh] bg-boudal-ivory py-8 md:py-16 px-4" data-testid="track-order-page">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="font-serif text-2xl md:text-3xl text-boudal-green font-bold mb-1">Suivi de commande</h1>
                    <p className="text-sm text-gray-500">Commande #{order.id?.slice(0, 8)}</p>
                </div>

                {/* Status Timeline */}
                {!isCancelled && !isPendingPayment && (
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                        <div className="flex items-center justify-between relative">
                            <div className="absolute top-5 left-8 right-8 h-0.5 bg-gray-200 -z-0" />
                            <div className="absolute top-5 left-8 h-0.5 bg-boudal-green -z-0 transition-all duration-700" style={{ width: `${Math.max(0, currentStepIdx) / (STEPS.length - 1) * 100}%`, maxWidth: 'calc(100% - 64px)' }} />
                            {STEPS.map((step, i) => {
                                const done = i <= currentStepIdx;
                                const active = i === currentStepIdx;
                                return (
                                    <div key={step.key} className="flex flex-col items-center z-10 relative">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${done ? "bg-boudal-green text-white" : "bg-gray-200 text-gray-400"} ${active ? "ring-4 ring-boudal-sage/40 scale-110" : ""}`}>
                                            <step.icon className="w-5 h-5" />
                                        </div>
                                        <span className={`text-[10px] sm:text-xs mt-2 font-medium text-center ${done ? "text-boudal-green" : "text-gray-400"}`}>{step.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {isCancelled && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6 text-center">
                        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
                        <p className="font-semibold text-red-600">Cette commande a ete annulee</p>
                    </div>
                )}

                {isPendingPayment && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-6 text-center">
                        <Clock className="w-12 h-12 text-orange-400 mx-auto mb-2" />
                        <p className="font-semibold text-orange-600">En attente de paiement</p>
                    </div>
                )}

                {/* Customer Info */}
                <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2"><User className="w-4 h-4 text-boudal-gold" /> <span className="font-medium">{order.customer_name}</span></div>
                        <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-boudal-gold" /> <span>{order.customer_phone}</span></div>
                        {order.customer_address && <div className="flex items-center gap-2 sm:col-span-2"><MapPin className="w-4 h-4 text-boudal-gold flex-shrink-0" /> <span>{order.customer_address}</span></div>}
                        <div className="text-gray-500 text-xs sm:col-span-2">
                            {order.delivery_method === "livraison" ? "Livraison a domicile" : "Retrait aux Halles"} | {order.payment_method === "cb" ? "Carte Bancaire" : "Especes"}
                        </div>
                    </div>
                </div>

                {/* Order Items */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
                    <div className="p-4 border-b bg-gray-50">
                        <h3 className="font-serif font-semibold text-boudal-green">Articles commandes</h3>
                    </div>
                    {order.items?.map((item, i) => (
                        <div key={i} className="flex justify-between items-center px-4 py-3 border-b last:border-0">
                            <div>
                                <p className="font-medium text-sm">{item.product_name}</p>
                                <p className="text-xs text-gray-500">{item.quantity} {item.mode === "piece" ? "pcs" : "kg"} {item.item_note && `- ${item.item_note}`}</p>
                            </div>
                            <span className="font-semibold text-sm">{item.line_total?.toFixed(2)}&euro;</span>
                        </div>
                    ))}
                    <div className="flex justify-between items-center px-4 py-4 bg-boudal-green text-white font-bold">
                        <span>Total</span>
                        <span className="text-boudal-gold text-lg">{order.total_amount?.toFixed(2)}&euro;</span>
                    </div>
                </div>

                <div className="text-center">
                    <Link to="/" className="text-boudal-gold font-medium text-sm hover:underline">Retour a l'accueil</Link>
                </div>
            </div>
        </div>
    );
}
