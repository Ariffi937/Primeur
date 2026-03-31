import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LogOut, Plus, Pencil, Trash2, Eye, RefreshCw } from "lucide-react";
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
    const [productForm, setProductForm] = useState({ name: "", price: "", category: "fruits", subcategory: "", unit: "kg", image_url: "", can_piece: false, piece_weight: "0", is_active: true });

    const fetchOrders = useCallback(async () => {
        try {
            const res = await api.get("/orders");
            setOrders(res.data);
        } catch (err) { console.error(err); }
    }, []);

    const fetchProducts = useCallback(async () => {
        try {
            const res = await api.get("/products/all");
            setProducts(res.data);
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => {
        fetchOrders();
        fetchProducts();
        const interval = setInterval(fetchOrders, 15000);
        return () => clearInterval(interval);
    }, [fetchOrders, fetchProducts]);

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
            });
        } else {
            setEditingProduct(null);
            setProductForm({ name: "", price: "", category: "fruits", subcategory: "", unit: "kg", image_url: "", can_piece: false, piece_weight: "0", is_active: true });
        }
        setProductDialog(true);
    };

    const saveProduct = async () => {
        const data = {
            ...productForm,
            price: parseFloat(productForm.price),
            piece_weight: parseFloat(productForm.piece_weight || "0"),
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
                            <div className="p-4 flex items-center justify-between border-b">
                                <h2 className="font-serif text-lg font-semibold text-boudal-green">Commandes recentes</h2>
                                <button onClick={fetchOrders} className="text-sm text-boudal-gold flex items-center gap-1 hover:underline">
                                    <RefreshCw className="w-3 h-3" /> Actualiser
                                </button>
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
                                        <TableHead>Actif</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products.map(p => (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-medium text-sm">{p.name}</TableCell>
                                            <TableCell className="text-xs capitalize">{p.subcategory}</TableCell>
                                            <TableCell className="text-sm">{p.price?.toFixed(2)}&euro;</TableCell>
                                            <TableCell className="text-xs">{p.unit}</TableCell>
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
                        <button data-testid="save-product-btn" onClick={saveProduct} className="w-full bg-boudal-gold text-white py-3 font-semibold text-sm uppercase tracking-wider hover:bg-boudal-gold/90 transition-colors rounded">
                            {editingProduct ? "Mettre a jour" : "Creer le produit"}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
