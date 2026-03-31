import { MapPin, Phone, Clock } from "lucide-react";

export default function Footer() {
    return (
        <footer data-testid="footer" className="bg-boudal-green text-white">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <h3 className="font-serif text-xl font-bold mb-4">
                            Primeur <span className="text-boudal-gold italic">BOUDAL</span>
                        </h3>
                        <p className="text-boudal-sage text-sm leading-relaxed">
                            Depuis plus de 20 ans, nous selectionnons le meilleur du terroir pour votre table.
                        </p>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <MapPin className="w-4 h-4 text-boudal-gold mt-1 flex-shrink-0" />
                            <p className="text-sm text-gray-300">Halles de Nimes<br />Av. General Perrier<br />30000 Nimes</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <Phone className="w-4 h-4 text-boudal-gold mt-1 flex-shrink-0" />
                            <p className="text-sm text-gray-300">04 66 29 52 23</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-boudal-gold mt-1 flex-shrink-0" />
                        <p className="text-sm text-gray-300">Lundi - Dimanche<br />07h00 - 13h00</p>
                    </div>
                </div>
                <div className="border-t border-white/10 mt-8 pt-6 text-center text-xs text-gray-400">
                    &copy; {new Date().getFullYear()} Primeur BOUDAL. Tous droits reserves.
                </div>
            </div>
        </footer>
    );
}
