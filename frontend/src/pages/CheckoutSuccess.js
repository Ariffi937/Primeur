import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Check, Loader2, AlertCircle } from "lucide-react";
import api from "@/lib/api";

export default function CheckoutSuccess() {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get("session_id");
    const [status, setStatus] = useState("polling");
    const [orderId, setOrderId] = useState(null);

    useEffect(() => {
        if (!sessionId) {
            setStatus("error");
            return;
        }

        let attempts = 0;
        const maxAttempts = 8;
        const interval = 2500;

        const poll = async () => {
            try {
                const res = await api.get(`/checkout/status/${sessionId}`);
                setOrderId(res.data.order_id);

                if (res.data.payment_status === "paid") {
                    setStatus("success");
                    return;
                }
                if (res.data.status === "expired") {
                    setStatus("expired");
                    return;
                }

                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(poll, interval);
                } else {
                    setStatus("timeout");
                }
            } catch {
                setStatus("error");
            }
        };

        poll();
    }, [sessionId]);

    return (
        <div className="min-h-[60vh] flex items-center justify-center px-4 bg-boudal-ivory" data-testid="checkout-success-page">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
                {status === "polling" && (
                    <>
                        <Loader2 className="w-16 h-16 text-boudal-gold mx-auto mb-6 animate-spin" />
                        <h2 className="font-serif text-2xl font-bold text-boudal-green mb-2">Verification du paiement...</h2>
                        <p className="text-gray-500 text-sm">Merci de patienter quelques instants.</p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="w-10 h-10 text-boudal-green" />
                        </div>
                        <h2 className="font-serif text-2xl font-bold text-boudal-green mb-2">Paiement reussi !</h2>
                        <p className="text-gray-600 mb-6">Votre commande est enregistree. Nous vous contacterons sous peu.</p>
                        <Link
                            to="/"
                            data-testid="back-home-link"
                            className="inline-block bg-boudal-green text-white py-3 px-8 font-semibold hover:bg-boudal-green/90 transition-colors"
                        >
                            Retour a l'accueil
                        </Link>
                    </>
                )}

                {(status === "error" || status === "expired" || status === "timeout") && (
                    <>
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-10 h-10 text-red-500" />
                        </div>
                        <h2 className="font-serif text-2xl font-bold text-boudal-green mb-2">
                            {status === "expired" ? "Session expiree" : "Erreur de paiement"}
                        </h2>
                        <p className="text-gray-600 mb-6">
                            {status === "timeout"
                                ? "La verification prend trop de temps. Contactez-nous pour confirmer."
                                : "Un probleme est survenu. Reessayez ou contactez-nous."
                            }
                        </p>
                        <Link
                            to="/boutique"
                            className="inline-block bg-boudal-gold text-white py-3 px-8 font-semibold hover:bg-boudal-gold/90 transition-colors"
                        >
                            Retour a la boutique
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}
