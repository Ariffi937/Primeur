import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LogOut, Plus, Pencil, Trash2, Eye, RefreshCw, TrendingUp, Package, Download, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = [
    { value: "pending", label: "En attente", color: "bg-yellow-100 text-yellow-800" },
    { value: "processing", label: "En preparation", color: "bg-blue-100 text-blue-800" },
    { value: "ready", label: "Pret", color: "bg-green-100 text-green-800" },
    { value: "delivered", label: "Livre", color: "bg-gray-100 text-gray-800" },
    { value: "cancelled", label: "Annule", color: "bg-red-100 text-red-800" },
    { value: "pending_payment", label: "Paiement en attente", color: "bg-orange-100 text-orange-800" },
];

function getStatusBadge(status) {
    const s = STATUS_OPTIONS.find(o => o.value === status) || { label: status, color: "bg-gray-100 text-gray-700" };
    return <span className={`text-xs font-medium px-2 py-1 rounded-full ${s.color}`}>{s.label}</span>;
}

export default function AdminDashboard() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderDetail, setOrderDetail] = useState(null);
    const [productDialog, setProductDialog] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [productForm, setProductForm] = useState({ name: "", price: "", category: "fruits", subcategory: "", unit: "kg", image_url: "", can_piece: false, piece_weight: "0", is_active: true, stock_quantity: "-1", low_stock_threshold: "5", discount_percentage: "0", discount_label: "" });
    const [stats, setStats] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const fetchOrders = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append("search", searchQuery);
            if (statusFilter) params.append("status", statusFilter);
            const res = await api.get(`/orders?${params.toString()}`);
            setOrders(res.data);
        } catch (err) { console.error(err); }
    }, [searchQuery, statusFilter]);

    const fetchProducts = useCallback(async () => {
        try {
            const res = await api.get("/products/all");
            setProducts(res.data);
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => {
        fetchOrders();
        fetchProducts();
        api.get("/admin/stats").then(r => setStats(r.data)).catch(console.error);
        const interval = setInterval(() => {
            fetchOrders();
            api.get("/admin/stats").then(r => setStats(r.data)).catch(() => {});
        }, 15000);
        return () => clearInterval(interval);
    }, [fetchOrders, fetchProducts]);

    useEffect(() => {
        fetchOrders();
    }, [searchQuery, statusFilter, fetchOrders]);

    const viewOrderDetail = async (orderId) => {
        try {
            const res = await api.get(`/orders/${orderId}`);
            setOrderDetail(res.data);
            setSelectedOrder(orderId);
        } catch (err) { toast.error("Erreur chargement commande"); }
    };

    const updateStatus = async (orderId, newStatus) => {
        try {
            await api.put(`/orders/${orderId}/status`, { status: newStatus });
            toast.success("Statut mis a jour");
            fetchOrders();
            if (orderDetail?.id === orderId) {
                setOrderDetail(prev => ({ ...prev, status: newStatus }));
            }
        } catch (err) { toast.error("Erreur mise a jour"); }
    };

    const openProductForm = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setProductForm({
                name: product.name, price: String(product.price), category: product.category,
                subcategory: product.subcategory, unit: product.unit, image_url: product.image_url || "",
                can_piece: product.can_piece, piece_weight: String(product.piece_weight || 0), is_active: product.is_active,
                stock_quantity: String(product.stock_quantity ?? -1), low_stock_threshold: String(product.low_stock_threshold ?? 5),
                discount_percentage: String(product.discount_percentage ?? 0), discount_label: product.discount_label || "",
            });
        } else {
            setEditingProduct(null);
            setProductForm({ name: "", price: "", category: "fruits", subcategory: "", unit: "kg", image_url: "", can_piece: false, piece_weight: "0", is_active: true, stock_quantity: "-1", low_stock_threshold: "5", discount_percentage: "0", discount_label: "" });
        }
        setProductDialog(true);
    };

    const saveProduct = async () => {
        const data = {
            ...productForm,
            price: parseFloat(productForm.price),
            piece_weight: parseFloat(productForm.piece_weight || "0"),
            stock_quantity: parseInt(productForm.stock_quantity || "-1"),
            low_stock_threshold: parseInt(productForm.low_stock_threshold || "5"),
            discount_percentage: parseFloat(productForm.discount_percentage || "0"),
        };
        try {
            if (editingProduct) {
                await api.put(`/products/${editingProduct.id}`, data);
                toast.success("Produit mis a jour");
            } else {
                await api.post("/products", data);
                toast.success("Produit cree");
            }
            setProductDialog(false);
            fetchProducts();
        } catch (err) { toast.error("Erreur sauvegarde"); }
    };

    const deleteProduct = async (id) => {
        if (!window.confirm("Supprimer ce produit ?")) return;
        try {
            await api.delete(`/products/${id}`);
            toast.success("Produit supprime");
            fetchProducts();
        } catch (err) { toast.error("Erreur suppression"); }
    };

    const handleLogout = () => {
        logout();
        navigate("/admin");
    };

    return (
        <div className="min-h-screen bg-boudal-ivory" data-testid="admin-dashboard">
            {/* Header */}
            <div className="bg-boudal-green text-white px-4 md:px-8 py-4 flex items-center justify-between shadow-md">
                <h1 className="font-serif text-lg md:text-xl font-bold">
                    Primeur <span className="text-boudal-gold italic">BOUDAL</span>
                    <span className="text-boudal-sage text-sm font-sans ml-2 hidden md:inline">Administration</span>
                </h1>
                <button data-testid="admin-logout-btn" onClick={handleLogout} className="flex items-center gap-2 text-sm text-boudal-sage hover:text-white transition-colors">
                    <LogOut className="w-4 h-4" /> Deconnexion
                </button>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
                {/* STATS CARDS */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6" data-testid="admin-stats">
                        <div className="bg-white rounded-lg p-4 border shadow-sm">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">CA Aujourd'hui</p>
                            <p className="text-xl font-bold text-boudal-green mt-1">{stats.ca_today?.toFixed(2)}&euro;</p>
                            <p className="text-xs text-gray-400">{stats.orders_today} commande{stats.orders_today > 1 ? "s" : ""}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border shadow-sm">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">CA Semaine</p>
                            <p className="text-xl font-bold text-boudal-green mt-1">{stats.ca_week?.toFixed(2)}&euro;</p>
                            <p className="text-xs text-gray-400">{stats.orders_week} commande{stats.orders_week > 1 ? "s" : ""}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border shadow-sm">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">CA Mois</p>
                            <p className="text-xl font-bold text-boudal-gold mt-1">{stats.ca_month?.toFixed(2)}&euro;</p>
                            <p className="text-xs text-gray-400">{stats.orders_month} commande{stats.orders_month > 1 ? "s" : ""}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border shadow-sm">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Produits</p>
                            <p className="text-xl font-bold text-boudal-green mt-1">{stats.active_products}</p>
                            <p className="text-xs text-gray-400">sur {stats.total_products} total</p>
                        </div>
                    </div>
                )}

                {/* LOW STOCK ALERT */}
                {stats?.low_stock?.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-start gap-3" data-testid="low-stock-alert">
                        <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-orange-700">Stock bas</p>
                            <p className="text-xs text-orange-600">{stats.low_stock.map(p => `${p.name} (${p.stock_quantity})`).join(", ")}</p>
                        </div>
                    </div>
                )}

                {/* TOP PRODUCTS */}
                {stats?.top_products?.length > 0 && (
                    <div className="bg-white rounded-lg p-4 border shadow-sm mb-6">
                        <h3 className="text-sm font-semibold text-boudal-green mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-boudal-gold" /> Produits les plus vendus</h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            {stats.top_products.slice(0, 5).map((tp, i) => (
                                <div key={i} className="text-center p-2 bg-gray-50 rounded">
                                    <p className="text-xs font-medium text-boudal-green truncate">{tp.name}</p>
                                    <p className="text-sm font-bold text-boudal-gold">{tp.revenue.toFixed(2)}&euro;</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <Tabs defaultValue="orders">
                    <TabsList className="bg-white mb-6 border">
                        <TabsTrigger data-testid="tab-orders" value="orders" className="data-[state=active]:bg-boudal-green data-[state=active]:text-white">
                            Commandes ({orders.length})
                        </TabsTrigger>
                        <TabsTrigger data-testid="tab-products" value="products" className="data-[state=active]:bg-boudal-green data-[state=active]:text-white">
                            Produits ({products.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* ORDERS TAB */}
                    <TabsContent value="orders">
                        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                            <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b">
                                <h2 className="font-serif text-lg font-semibold text-boudal-green">Commandes</h2>
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
                                        <input
                                            data-testid="orders-search"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="Rechercher..."
                                            className="pl-8 pr-3 py-2 border rounded-lg text-sm w-40 focus:border-boudal-gold outline-none"
                                        />
                                    </div>
                                    <select
                                        data-testid="orders-status-filter"
                                        value={statusFilter}
                                        onChange={e => setStatusFilter(e.target.value)}
                                        className="px-3 py-2 border rounded-lg text-sm bg-white focus:border-boudal-gold outline-none"
                                    >
                                        <option value="">Tous les statuts</option>
                                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                    <button
                                        data-testid="export-orders-btn"
                                        onClick={() => {
                                            const url = `${process.env.REACT_APP_BACKEND_URL}/api/admin/export-orders`;
                                            const token = localStorage.getItem("boudal_token");
                                            fetch(url, { headers: { Authorization: `Bearer ${token}` } })
                                                .then(r => r.blob())
                                                .then(b => {
                                                    const a = document.createElement("a");
                                                    a.href = URL.createObjectURL(b);
                                                    a.download = `commandes_${new Date().toISOString().slice(0,10)}.csv`;
                                                    a.click();
                                                })
                                                .catch(() => toast.error("Erreur export"));
                                        }}
                                        className="px-3 py-2 bg-boudal-green text-white text-sm rounded-lg flex items-center gap-1.5 hover:bg-boudal-green/90"
                                    >
                                        <Download className="w-3.5 h-3.5" /> Export CSV
                                    </button>
                                    <button onClick={fetchOrders} className="text-sm text-boudal-gold flex items-center gap-1 hover:underline">
                                        <RefreshCw className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Client</TableHead>
                                        <TableHead>Methode</TableHead>
                                        <TableHead>Total</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">Aucune commande</TableCell></TableRow>
                                    ) : orders.map(o => (
                                        <TableRow key={o.id}>
                                            <TableCell className="text-xs">{new Date(o.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</TableCell>
                                            <TableCell className="font-medium text-sm">{o.customer_name}</TableCell>
                                            <TableCell className="text-xs capitalize">{o.delivery_method === "livraison" ? "Livraison" : "Retrait"}</TableCell>
                                            <TableCell className="font-semibold text-sm">{o.total_amount?.toFixed(2)}&euro;</TableCell>
                                            <TableCell>{getStatusBadge(o.status)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <button data-testid={`view-order-${o.id}`} onClick={() => viewOrderDetail(o.id)} className="p-1.5 text-boudal-green hover:text-boudal-gold transition-colors">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <select
                                                        data-testid={`status-select-${o.id}`}
                                                        value={o.status}
                                                        onChange={e => updateStatus(o.id, e.target.value)}
                                                        className="text-xs border rounded px-1 py-0.5 bg-white"
                                                    >
                                                        {STATUS_OPTIONS.filter(s => s.value !== "pending_payment").map(s => (
                                                            <option key={s.value} value={s.value}>{s.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    {/* PRODUCTS TAB */}
                    <TabsContent value="products">
                        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                            <div className="p-4 flex items-center justify-between border-b">
                                <h2 className="font-serif text-lg font-semibold text-boudal-green">Catalogue</h2>
                                <button data-testid="add-product-btn" onClick={() => openProductForm()} className="bg-boudal-gold text-white text-sm px-4 py-2 font-medium flex items-center gap-2 hover:bg-boudal-gold/90 transition-colors rounded">
                                    <Plus className="w-4 h-4" /> Ajouter
                                </button>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nom</TableHead>
                                        <TableHead>Categorie</TableHead>
                                        <TableHead>Prix</TableHead>
                                        <TableHead>Unite</TableHead>
                                        <TableHead>Stock</TableHead>
                                        <TableHead>Actif</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products.map(p => (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-medium text-sm">{p.name}</TableCell>
                                            <TableCell className="text-xs capitalize">{p.subcategory}</TableCell>
                                            <TableCell className="text-sm">
                                                {p.discount_percentage > 0 ? (
                                                    <span className="text-red-500">{(p.price * (1 - p.discount_percentage / 100)).toFixed(2)}&euro; <span className="text-gray-400 line-through text-xs">{p.price?.toFixed(2)}&euro;</span></span>
                                                ) : (
                                                    <span>{p.price?.toFixed(2)}&euro;</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs">{p.unit}</TableCell>
                                            <TableCell>
                                                {p.stock_quantity === -1 ? (
                                                    <span className="text-xs text-gray-400">Illimite</span>
                                                ) : p.stock_quantity === 0 ? (
                                                    <span className="text-xs text-red-500 font-semibold">Rupture</span>
                                                ) : p.stock_quantity <= (p.low_stock_threshold || 5) ? (
                                                    <span className="text-xs text-orange-500 font-semibold">{p.stock_quantity}</span>
                                                ) : (
                                                    <span className="text-xs text-green-600">{p.stock_quantity}</span>
                                                )}
                                            </TableCell>
                                            <TableCell><span className={`text-xs font-medium ${p.is_active ? "text-green-600" : "text-red-500"}`}>{p.is_active ? "Oui" : "Non"}</span></TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <button data-testid={`edit-product-${p.id}`} onClick={() => openProductForm(p)} className="p-1.5 text-boudal-green hover:text-boudal-gold transition-colors">
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button data-testid={`delete-product-${p.id}`} onClick={() => deleteProduct(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* ORDER DETAIL DIALOG */}
            <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
                <DialogContent className="max-w-lg bg-white">
                    <DialogHeader>
                        <DialogTitle className="font-serif text-boudal-green">Detail de la commande</DialogTitle>
                        <DialogDescription className="text-xs text-gray-500">Commande #{orderDetail?.id?.slice(0, 8)}</DialogDescription>
                    </DialogHeader>
                    {orderDetail && (
                        <div className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                                <div><span className="text-gray-500">Client:</span> <strong>{orderDetail.customer_name}</strong></div>
                                <div><span className="text-gray-500">Tel:</span> <strong>{orderDetail.customer_phone}</strong></div>
                                <div><span className="text-gray-500">Livraison:</span> <strong className="capitalize">{orderDetail.delivery_method}</strong></div>
                                <div><span className="text-gray-500">Paiement:</span> <strong className="capitalize">{orderDetail.payment_method}</strong></div>
                            </div>
                            {orderDetail.customer_email && <div><span className="text-gray-500">Email:</span> {orderDetail.customer_email}</div>}
                            {orderDetail.customer_address && <div><span className="text-gray-500">Adresse:</span> {orderDetail.customer_address}</div>}
                            {orderDetail.global_comment && <div><span className="text-gray-500">Note:</span> {orderDetail.global_comment}</div>}
                            <div className="border-t pt-3 space-y-2">
                                <p className="font-semibold text-boudal-green">Articles:</p>
                                {orderDetail.items?.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center py-1 border-b border-dashed last:border-0">
                                        <div>
                                            <p className="font-medium">{item.product_name}</p>
                                            <p className="text-xs text-gray-500">{item.quantity} {item.mode === "piece" ? "pcs" : "kg"} {item.item_note && `- ${item.item_note}`}</p>
                                        </div>
                                        <span className="font-semibold">{item.line_total?.toFixed(2)}&euro;</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between font-bold text-lg text-boudal-green border-t pt-2">
                                <span>Total</span>
                                <span>{orderDetail.total_amount?.toFixed(2)}&euro;</span>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* PRODUCT FORM DIALOG */}
            <Dialog open={productDialog} onOpenChange={setProductDialog}>
                <DialogContent className="max-w-lg bg-white">
                    <DialogHeader>
                        <DialogTitle className="font-serif text-boudal-green">{editingProduct ? "Modifier le produit" : "Ajouter un produit"}</DialogTitle>
                        <DialogDescription className="text-xs text-gray-500">Remplissez les informations du produit</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <input data-testid="product-name-input" value={productForm.name} onChange={e => setProductForm(p => ({...p, name: e.target.value}))} placeholder="Nom du produit" className="w-full p-2.5 border rounded text-sm focus:border-boudal-gold outline-none" />
                        <div className="grid grid-cols-2 gap-3">
                            <input data-testid="product-price-input" value={productForm.price} onChange={e => setProductForm(p => ({...p, price: e.target.value}))} placeholder="Prix" type="number" step="0.01" className="p-2.5 border rounded text-sm focus:border-boudal-gold outline-none" />
                            <select value={productForm.unit} onChange={e => setProductForm(p => ({...p, unit: e.target.value}))} className="p-2.5 border rounded text-sm bg-white focus:border-boudal-gold outline-none">
                                <option value="kg">kg</option>
                                <option value="piece">piece</option>
                                <option value="botte">botte</option>
                                <option value="barquette">barquette</option>
                                <option value="sachet">sachet</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <select value={productForm.category} onChange={e => setProductForm(p => ({...p, category: e.target.value}))} className="p-2.5 border rounded text-sm bg-white focus:border-boudal-gold outline-none">
                                <option value="fruits">Fruits</option>
                                <option value="legumes">Legumes</option>
                                <option value="herbes">Herbes</option>
                                <option value="epicerie">Epicerie</option>
                                <option value="paniers">Paniers</option>
                            </select>
                            <input value={productForm.subcategory} onChange={e => setProductForm(p => ({...p, subcategory: e.target.value}))} placeholder="Sous-categorie" className="p-2.5 border rounded text-sm focus:border-boudal-gold outline-none" />
                        </div>
                        <input value={productForm.image_url} onChange={e => setProductForm(p => ({...p, image_url: e.target.value}))} placeholder="URL image" className="w-full p-2.5 border rounded text-sm focus:border-boudal-gold outline-none" />
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={productForm.can_piece} onChange={e => setProductForm(p => ({...p, can_piece: e.target.checked}))} className="rounded" />
                                Vente a la piece
                            </label>
                            {productForm.can_piece && (
                                <input value={productForm.piece_weight} onChange={e => setProductForm(p => ({...p, piece_weight: e.target.value}))} placeholder="Poids piece (kg)" type="number" step="0.01" className="p-2 border rounded text-sm w-32 focus:border-boudal-gold outline-none" />
                            )}
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={productForm.is_active} onChange={e => setProductForm(p => ({...p, is_active: e.target.checked}))} className="rounded" />
                            Produit actif (visible en boutique)
                        </label>
                        <div className="border-t border-dashed pt-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Gestion de stock</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Quantite en stock (-1 = illimite)</label>
                                    <input value={productForm.stock_quantity} onChange={e => setProductForm(p => ({...p, stock_quantity: e.target.value}))} type="number" className="w-full p-2.5 border rounded text-sm focus:border-boudal-gold outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Seuil alerte stock bas</label>
                                    <input value={productForm.low_stock_threshold} onChange={e => setProductForm(p => ({...p, low_stock_threshold: e.target.value}))} type="number" className="w-full p-2.5 border rounded text-sm focus:border-boudal-gold outline-none" />
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-dashed pt-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Promotion</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Reduction (%)</label>
                                    <input data-testid="product-discount-input" value={productForm.discount_percentage} onChange={e => setProductForm(p => ({...p, discount_percentage: e.target.value}))} type="number" step="1" min="0" max="90" className="w-full p-2.5 border rounded text-sm focus:border-boudal-gold outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Label promo (optionnel)</label>
                                    <input value={productForm.discount_label} onChange={e => setProductForm(p => ({...p, discount_label: e.target.value}))} placeholder="Ex: Ete" className="w-full p-2.5 border rounded text-sm focus:border-boudal-gold outline-none" />
                                </div>
                            </div>
                        </div>
                        <button data-testid="save-product-btn" onClick={saveProduct} className="w-full bg-boudal-gold text-white py-3 font-semibold text-sm uppercase tracking-wider hover:bg-boudal-gold/90 transition-colors rounded">
                            {editingProduct ? "Mettre a jour" : "Creer le produit"}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
