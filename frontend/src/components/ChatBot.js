import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Leaf, ChevronDown } from "lucide-react";
import api from "@/lib/api";

// ─── Suggestions rapides ──────────────────────────────────────────────────────
const QUICK_SUGGESTIONS = [
    "Quels sont vos horaires ?",
    "Livrez-vous à domicile ?",
    "Comment passer une commande ?",
    "Quels fruits sont de saison ?",
];

// ─── Message système ──────────────────────────────────────────────────────────
const WELCOME_MESSAGE = {
    role: "assistant",
    content: "Bonjour ! 👋 Je suis l'assistant de **Primeur BOUDAL**. Comment puis-je vous aider aujourd'hui ?",
};

export default function ChatBot() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([WELCOME_MESSAGE]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [unread, setUnread] = useState(0);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    // Scroll automatique vers le bas
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Focus input à l'ouverture
    useEffect(() => {
        if (open) {
            setUnread(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    const sendMessage = async (text) => {
        const content = text || input.trim();
        if (!content || loading) return;

        const userMsg = { role: "user", content };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput("");
        setLoading(true);

        try {
            const res = await api.post("/chat", {
                messages: newMessages.map(m => ({
                    role: m.role,
                    content: m.content,
                })),
            });
            const assistantMsg = { role: "assistant", content: res.data.response };
            setMessages(prev => [...prev, assistantMsg]);
            if (!open) setUnread(u => u + 1);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "Désolé, une erreur est survenue. Réessayez ou contactez-nous au **04 66 29 52 23**.",
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const resetChat = () => {
        setMessages([WELCOME_MESSAGE]);
        setInput("");
    };

    // ── Rendu Markdown simple ──────────────────────────────────────────────────
    const renderContent = (text) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.*?)\*/g, "<em>$1</em>")
            .replace(/\n/g, "<br/>");
    };

    return (
        <>
            {/* ── Bouton flottant ────────────────────────────────────────── */}
            <button
                data-testid="chatbot-toggle"
                onClick={() => setOpen(o => !o)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-boudal-green text-white shadow-lg hover:bg-boudal-green/90 transition-all duration-200 flex items-center justify-center active:scale-95"
                aria-label="Ouvrir le chat"
            >
                {open ? (
                    <X className="w-6 h-6" />
                ) : (
                    <>
                        <MessageCircle className="w-6 h-6" />
                        {unread > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-boudal-gold text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                {unread}
                            </span>
                        )}
                    </>
                )}
            </button>

            {/* ── Panneau chat ───────────────────────────────────────────── */}
            {open && (
                <div
                    data-testid="chatbot-panel"
                    className="fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] max-w-sm bg-white shadow-2xl flex flex-col"
                    style={{ height: "480px" }}
                >
                    {/* En-tête */}
                    <div className="bg-boudal-green px-4 py-3 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-boudal-gold/20 flex items-center justify-center">
                                <Leaf className="w-5 h-5 text-boudal-gold" />
                            </div>
                            <div>
                                <p className="text-white font-serif font-semibold text-sm">Assistant Primeur</p>
                                <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                                    <p className="text-boudal-sage text-[10px]">En ligne</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={resetChat}
                                className="text-boudal-sage hover:text-white transition-colors text-[10px] uppercase tracking-wider"
                                title="Nouvelle conversation"
                            >
                                Réinitialiser
                            </button>
                            <button
                                onClick={() => setOpen(false)}
                                className="text-boudal-sage hover:text-white transition-colors"
                            >
                                <ChevronDown className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-boudal-ivory/40">
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                data-testid={`chat-message-${msg.role}`}
                            >
                                {msg.role === "assistant" && (
                                    <div className="w-6 h-6 bg-boudal-green flex items-center justify-center mr-2 mt-0.5 shrink-0">
                                        <Leaf className="w-3 h-3 text-white" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[80%] px-3 py-2 text-sm leading-relaxed ${
                                        msg.role === "user"
                                            ? "bg-boudal-green text-white"
                                            : "bg-white border border-boudal-sage/20 text-boudal-green"
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                                />
                            </div>
                        ))}

                        {/* Indicateur de saisie */}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="w-6 h-6 bg-boudal-green flex items-center justify-center mr-2 shrink-0">
                                    <Leaf className="w-3 h-3 text-white" />
                                </div>
                                <div className="bg-white border border-boudal-sage/20 px-3 py-2">
                                    <Loader2 className="w-4 h-4 text-boudal-green animate-spin" />
                                </div>
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Suggestions rapides (uniquement au début) */}
                    {messages.length <= 1 && (
                        <div className="px-3 py-2 flex gap-2 overflow-x-auto no-scrollbar border-t border-boudal-sage/20 shrink-0 bg-white">
                            {QUICK_SUGGESTIONS.map(s => (
                                <button
                                    key={s}
                                    onClick={() => sendMessage(s)}
                                    className="whitespace-nowrap text-[11px] px-3 py-1.5 border border-boudal-sage/40 text-boudal-green hover:bg-boudal-green hover:text-white transition-colors shrink-0"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Zone de saisie */}
                    <div className="border-t border-boudal-sage/20 p-3 flex items-end gap-2 bg-white shrink-0">
                        <textarea
                            ref={inputRef}
                            data-testid="chatbot-input"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Posez votre question..."
                            rows={1}
                            className="flex-1 text-sm text-boudal-green placeholder-boudal-green/30 bg-boudal-ivory/50 border border-boudal-sage/30 px-3 py-2 outline-none focus:border-boudal-gold resize-none"
                            style={{ minHeight: "36px", maxHeight: "80px" }}
                        />
                        <button
                            data-testid="chatbot-send"
                            onClick={() => sendMessage()}
                            disabled={!input.trim() || loading}
                            className="w-9 h-9 bg-boudal-gold text-white flex items-center justify-center hover:bg-boudal-gold/90 transition-colors disabled:opacity-40 shrink-0"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
