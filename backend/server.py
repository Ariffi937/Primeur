from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, Request, HTTPException, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import csv
import io
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from typing import List, Optional
import bcrypt
import jwt
from fastapi.responses import StreamingResponse
import anthropic

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest
)
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from fastapi import BackgroundTasks

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== AUTH HELPERS ====================

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifie")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token invalide")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur non trouve")
        return {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expire")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")


# ==================== MODELS ====================

class LoginRequest(BaseModel):
    username: str
    password: str


class ProductCreate(BaseModel):
    name: str
    price: float
    category: str
    subcategory: str
    unit: str = "kg"
    image_url: str = ""
    can_piece: bool = False
    piece_weight: float = 0.0
    is_active: bool = True
    stock_quantity: int = -1
    low_stock_threshold: int = 5
    discount_percentage: float = 0.0
    discount_label: str = ""


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    unit: Optional[str] = None
    image_url: Optional[str] = None
    can_piece: Optional[bool] = None
    piece_weight: Optional[float] = None
    is_active: Optional[bool] = None
    stock_quantity: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    discount_percentage: Optional[float] = None
    discount_label: Optional[str] = None


class OrderItemCreate(BaseModel):
    product_id: str
    product_name: str
    quantity: float
    mode: str
    item_note: str = ""
    line_total: float


class OrderCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: str = ""
    customer_address: str = ""
    delivery_method: str = "livraison"
    delivery_slot: str = ""
    payment_method: str = "especes"
    global_comment: str = ""
    total_amount: float
    items: List[OrderItemCreate]


class CreateSessionRequest(BaseModel):
    order_id: str
    origin_url: str


class StatusUpdateRequest(BaseModel):
    status: str


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


# ==================== EMAIL HELPERS ====================

def build_order_email_html(order: dict, items: list, is_admin: bool = False) -> str:
    title = "Nouvelle commande !" if is_admin else "Confirmation de votre commande"
    greeting = "Une nouvelle commande vient d'arriver." if is_admin else f"Bonjour {order['customer_name']},"
    intro = "Voici le detail :" if is_admin else "Nous avons bien enregistre votre commande. Voici le recapitulatif :"
    delivery_label = "Livraison" if order["delivery_method"] == "livraison" else "Retrait aux Halles"
    payment_label = "Especes" if order["payment_method"] == "especes" else "Carte Bancaire"

    items_html = ""
    for item in items:
        qty_display = f"{item['quantity']} {'pcs' if item['mode'] == 'piece' else 'kg'}"
        items_html += f"""
        <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#333;">{item['product_name']}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#666;text-align:center;">{qty_display}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#333;text-align:right;font-weight:600;">{item['line_total']:.2f} EUR</td>
        </tr>"""

    return f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#F8F4EC;">
        <div style="background:#0F3D3E;padding:24px;text-align:center;">
            <h1 style="font-family:Georgia,serif;color:white;margin:0;font-size:24px;">
                Primeur <span style="color:#C9A063;font-style:italic;">BOUDAL</span>
            </h1>
            <p style="color:#A8C3A0;margin:4px 0 0;font-size:12px;">Halles de Nimes</p>
        </div>
        <div style="padding:32px 24px;">
            <h2 style="color:#0F3D3E;margin:0 0 8px;font-family:Georgia,serif;">{title}</h2>
            <p style="color:#666;font-size:14px;margin:0 0 4px;">{greeting}</p>
            <p style="color:#666;font-size:14px;margin:0 0 24px;">{intro}</p>
            <div style="background:white;border-radius:8px;overflow:hidden;margin-bottom:20px;">
                <div style="padding:12px 16px;background:#f5f5f5;border-bottom:1px solid #eee;">
                    <p style="margin:0;font-size:13px;color:#666;">
                        <strong style="color:#0F3D3E;">Client :</strong> {order['customer_name']} | {order['customer_phone']}
                    </p>
                    <p style="margin:4px 0 0;font-size:13px;color:#666;">
                        <strong style="color:#0F3D3E;">Mode :</strong> {delivery_label} | <strong style="color:#0F3D3E;">Paiement :</strong> {payment_label}
                    </p>
                    {"<p style='margin:4px 0 0;font-size:13px;color:#666;'><strong style='color:#0F3D3E;'>Adresse :</strong> " + order['customer_address'] + "</p>" if order.get('customer_address') else ""}
                </div>
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#fafafa;">
                            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#999;text-transform:uppercase;">Produit</th>
                            <th style="padding:10px 12px;text-align:center;font-size:12px;color:#999;text-transform:uppercase;">Qte</th>
                            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#999;text-transform:uppercase;">Total</th>
                        </tr>
                    </thead>
                    <tbody>{items_html}</tbody>
                </table>
            </div>
            <div style="background:#0F3D3E;color:white;padding:16px;border-radius:8px;text-align:center;">
                <span style="font-size:14px;">Total de la commande</span><br/>
                <strong style="font-size:24px;color:#C9A063;">{order['total_amount']:.2f} EUR</strong>
            </div>
            {f"<p style='margin-top:16px;font-size:13px;color:#666;'><em>Note : {order['global_comment']}</em></p>" if order.get('global_comment') else ""}
        </div>
        <div style="background:#0F3D3E;padding:16px;text-align:center;">
            <p style="color:#A8C3A0;font-size:11px;margin:0;">Primeur BOUDAL - Halles de Nimes, Av. General Perrier, 30000 Nimes</p>
            <p style="color:#A8C3A0;font-size:11px;margin:4px 0 0;">04 66 29 52 23</p>
        </div>
    </div>"""


def send_email_notification(to_email: str, subject: str, html_content: str):
    api_key = os.environ.get("SENDGRID_API_KEY")
    sender = os.environ.get("SENDER_EMAIL")
    if not api_key or not sender or not to_email:
        logger.warning(f"Email skipped: missing config (to={to_email}, sender={sender})")
        return
    try:
        message = Mail(
            from_email=sender,
            to_emails=to_email,
            subject=subject,
            html_content=html_content,
        )
        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        logger.info(f"Email sent to {to_email}: status {response.status_code}")
    except Exception as e:
        logger.error(f"Email send error to {to_email}: {e}")


def send_order_emails(order: dict, items: list):
    customer_email = order.get("customer_email", "")
    if customer_email:
        html = build_order_email_html(order, items, is_admin=False)
        send_email_notification(customer_email, f"Primeur BOUDAL - Commande #{order['id'][:8]} confirmee", html)

    admin_email = os.environ.get("ADMIN_NOTIFICATION_EMAIL")
    if admin_email:
        html = build_order_email_html(order, items, is_admin=True)
        send_email_notification(admin_email, f"Nouvelle commande #{order['id'][:8]} - {order['customer_name']}", html)


# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/login")
async def login(body: LoginRequest):
    user = await db.users.find_one({"email": body.username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    token = create_access_token(user["id"], user["email"])
    return {
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}
    }


@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return user


# ==================== PRODUCT ENDPOINTS ====================

@api_router.get("/products")
async def list_products():
    products = await db.products.find(
        {"is_active": True},
        {"_id": 0}
    ).to_list(1000)
    return products


@api_router.get("/products/all")
async def list_all_products(user=Depends(get_current_user)):
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    return products


@api_router.post("/products")
async def create_product(body: ProductCreate, user=Depends(get_current_user)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.products.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api_router.put("/products/{product_id}")
async def update_product(product_id: str, body: ProductUpdate, user=Depends(get_current_user)):
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(400, "Aucun champ a mettre a jour")
    result = await db.products.update_one({"id": product_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(404, "Produit non trouve")
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    return product


@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, user=Depends(get_current_user)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Produit non trouve")
    return {"message": "Produit supprime"}


# ==================== ORDER ENDPOINTS ====================

@api_router.post("/orders")
async def create_order(body: OrderCreate, background_tasks: BackgroundTasks):
    order_id = str(uuid.uuid4())
       order = {
        "id": order_id,
        "customer_name": body.customer_name,
        "customer_phone": body.customer_phone,
        "customer_email": body.customer_email,
        "customer_address": body.customer_address,
        "delivery_method": body.delivery_method,
        "delivery_slot": body.delivery_slot,
        "payment_method": body.payment_method,
        "global_comment": body.global_comment,
        "total_amount": body.total_amount,
        "status": "pending_payment" if body.payment_method == "cb" else "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.orders.insert_one(order)

    items_data = []
    for item in body.items:
        order_item = {
            "id": str(uuid.uuid4()),
            "order_id": order_id,
            "product_id": item.product_id,
            "product_name": item.product_name,
            "quantity": item.quantity,
            "mode": item.mode,
            "item_note": item.item_note,
            "line_total": item.line_total
        }
        await db.order_items.insert_one(order_item)
        items_data.append(order_item)

        # Decrement stock
        product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        if product and product.get("stock_quantity", -1) > 0:
            new_stock = max(0, product["stock_quantity"] - int(item.quantity if item.mode == "piece" else 1))
            update_fields = {"stock_quantity": new_stock}
            if new_stock == 0:
                update_fields["is_active"] = False
            await db.products.update_one({"id": item.product_id}, {"$set": update_fields})

    clean_order = {k: v for k, v in order.items() if k != "_id"}
    background_tasks.add_task(send_order_emails, clean_order, items_data)

    return clean_order


@api_router.get("/orders")
async def list_orders(user=Depends(get_current_user), search: str = "", status: str = ""):
    query = {}
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"customer_phone": {"$regex": search, "$options": "i"}},
            {"customer_email": {"$regex": search, "$options": "i"}},
        ]
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orders


@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, user=Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Commande non trouvee")
    items = await db.order_items.find({"order_id": order_id}, {"_id": 0}).to_list(100)
    order["items"] = items
    return order


@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, body: StatusUpdateRequest, user=Depends(get_current_user)):
    valid_statuses = ["pending", "processing", "ready", "delivered", "cancelled"]
    if body.status not in valid_statuses:
        raise HTTPException(400, f"Statut invalide. Doit etre: {valid_statuses}")
    result = await db.orders.update_one({"id": order_id}, {"$set": {"status": body.status}})
    if result.matched_count == 0:
        raise HTTPException(404, "Commande non trouvee")
    return {"message": "Statut mis a jour", "status": body.status}


# ==================== ORDER TRACKING (PUBLIC) ====================

@api_router.get("/orders/track/{order_id}")
async def track_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0, "global_comment": 0})
    if not order:
        raise HTTPException(404, "Commande non trouvee")
    items = await db.order_items.find({"order_id": order_id}, {"_id": 0}).to_list(100)
    order["items"] = items
    return order

# ==================== DELIVERY MANAGEMENT ====================

@api_router.get("/deliveries")
async def list_deliveries(user=Depends(get_current_user)):
    orders = await db.orders.find(
        {"delivery_method": "livraison", "status": {"$nin": ["cancelled", "delivered"]}},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)

    grouped = {}
    for order in orders:
        slot = order.get("delivery_slot") or "Non précisé"
        if slot not in grouped:
            grouped[slot] = []
        items = await db.order_items.find({"order_id": order["id"]}, {"_id": 0}).to_list(50)
        order["items"] = items
        grouped[slot].append(order)

    return {"grouped": grouped, "total": len(orders)}
# ==================== ADMIN STATS ====================

@api_router.get("/admin/stats")
async def admin_stats(user=Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    all_orders = await db.orders.find({}, {"_id": 0}).to_list(10000)

    def sum_orders(orders, since):
        return sum(o.get("total_amount", 0) for o in orders if o.get("created_at", "") >= since and o.get("status") not in ["cancelled", "pending_payment"])

    def count_orders(orders, since):
        return len([o for o in orders if o.get("created_at", "") >= since and o.get("status") not in ["cancelled", "pending_payment"]])

    ca_today = sum_orders(all_orders, today_start)
    ca_week = sum_orders(all_orders, week_start)
    ca_month = sum_orders(all_orders, month_start)
    orders_today = count_orders(all_orders, today_start)
    orders_week = count_orders(all_orders, week_start)
    orders_month = count_orders(all_orders, month_start)

    status_counts = {}
    for o in all_orders:
        s = o.get("status", "unknown")
        status_counts[s] = status_counts.get(s, 0) + 1

    # Top products
    all_items = await db.order_items.find({}, {"_id": 0}).to_list(10000)
    product_revenue = {}
    product_qty = {}
    for item in all_items:
        name = item.get("product_name", "")
        product_revenue[name] = product_revenue.get(name, 0) + item.get("line_total", 0)
        product_qty[name] = product_qty.get(name, 0) + item.get("quantity", 0)
    top_products = sorted(product_revenue.items(), key=lambda x: x[1], reverse=True)[:10]

    # Low stock products
    low_stock = await db.products.find(
        {"stock_quantity": {"$gte": 0, "$lte": 5}},
        {"_id": 0, "name": 1, "stock_quantity": 1, "low_stock_threshold": 1}
    ).to_list(50)

    return {
        "ca_today": round(ca_today, 2),
        "ca_week": round(ca_week, 2),
        "ca_month": round(ca_month, 2),
        "orders_today": orders_today,
        "orders_week": orders_week,
        "orders_month": orders_month,
        "status_counts": status_counts,
        "top_products": [{"name": n, "revenue": round(r, 2)} for n, r in top_products],
        "low_stock": low_stock,
        "total_products": await db.products.count_documents({}),
        "active_products": await db.products.count_documents({"is_active": True}),
    }


# ==================== ADMIN EXPORT ====================

@api_router.get("/admin/export-orders")
async def export_orders(user=Depends(get_current_user)):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(10000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Client", "Telephone", "Email", "Adresse", "Livraison", "Paiement", "Total", "Statut"])
    for o in orders:
        writer.writerow([
            o.get("created_at", "")[:16],
            o.get("customer_name", ""),
            o.get("customer_phone", ""),
            o.get("customer_email", ""),
            o.get("customer_address", ""),
            o.get("delivery_method", ""),
            o.get("payment_method", ""),
            f"{o.get('total_amount', 0):.2f}",
            o.get("status", ""),
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=commandes_{datetime.now().strftime('%Y%m%d')}.csv"}
    )


# ==================== ACTIVE PROMOTIONS ====================

@api_router.get("/promotions")
async def get_active_promotions():
    promos = await db.products.find(
        {"is_active": True, "discount_percentage": {"$gt": 0}},
        {"_id": 0}
    ).to_list(100)
    return promos


# ==================== CHAT / AGENT SUPPORT CLIENT ====================

@api_router.post("/chat")
async def chat_support(body: ChatRequest):
    """Agent support client IA pour Primeur BOUDAL."""

    SYSTEM_PROMPT = """Tu es l'assistant virtuel de Primeur BOUDAL, une épicerie primeur premium située aux Halles de Nîmes.
Tu réponds UNIQUEMENT en français, avec un ton chaleureux, professionnel et bienveillant.
Tu es concis (3-4 phrases max par réponse sauf si on te demande plus de détails).

INFORMATIONS SUR LA BOUTIQUE :
- Nom : Primeur BOUDAL
- Adresse : Halles de Nîmes, Avenue du Général Perrier, 30000 Nîmes
- Téléphone : 04 66 29 52 23
- Horaires : Lundi au Dimanche, 7h00 - 13h00
- Histoire : Institution nîmoise depuis plus de 20 ans, sélection quotidienne des meilleurs produits

PRODUITS DISPONIBLES :
- Fruits : pommes (Gala, Golden, Granny Smith, Fuji), poires, agrumes (oranges, citrons, clémentines), fruits exotiques (mangues, ananas, bananes, avocats), fruits rouges (fraises Gariguette, framboises, myrtilles), raisins
- Légumes : salades, tomates (rondes, cœur de bœuf, cerise, grappe), carottes, pommes de terre, poivrons, aubergines, brocolis, champignons, oignons, ail
- Herbes fraîches : persil, ciboulette, basilic, menthe, thym, romarin
- Épicerie : noix, amandes, noisettes
- Paniers personnalisés : Panier Famille (29,90€), Panier Solo (14,90€), Panier Mixte (22,90€)

LIVRAISON & COMMANDES :
- Livraison à domicile sur Nîmes (commande en ligne sur le site)
- Click & Collect aux Halles de Nîmes
- Créneaux : Matin (9h-12h), Midi (12h-14h), Après-midi (14h-18h), Soir (18h-20h)
- Paiement : espèces à la livraison ou carte bancaire en ligne (Stripe)
- Pour commander : aller dans la boutique en ligne, ajouter au panier, valider la commande

POLITIQUE PRODUITS :
- Arrivage quotidien chaque matin depuis les marchés de gros et producteurs locaux
- Produits vendus au poids (kg) ou à la pièce selon les articles
- Certains produits ont un toggle "au poids / à la pièce"

CE QUE TU NE PEUX PAS FAIRE :
- Modifier une commande existante (rediriger vers le 04 66 29 52 23)
- Donner les stocks en temps réel
- Faire des réservations

Si tu ne sais pas répondre, donne le numéro de téléphone : 04 66 29 52 23."""

    try:
        anthropic_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

        api_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in body.messages
            if msg.role in ("user", "assistant")
        ]

        response = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=512,
            system=SYSTEM_PROMPT,
            messages=api_messages,
        )

        return {"response": response.content[0].text}

    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Service temporairement indisponible. Contactez-nous au 04 66 29 52 23."
        )


# ==================== STRIPE ENDPOINTS ====================

@api_router.post("/checkout/create-session")
async def create_checkout(body: CreateSessionRequest, request: Request):
    order = await db.orders.find_one({"id": body.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Commande non trouvee")

    amount = float(order["total_amount"])
    success_url = f"{body.origin_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{body.origin_url}/boutique"

    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"

    stripe_checkout = StripeCheckout(
        api_key=os.environ["STRIPE_API_KEY"],
        webhook_url=webhook_url
    )

    checkout_request = CheckoutSessionRequest(
        amount=amount,
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"order_id": body.order_id}
    )

    session = await stripe_checkout.create_checkout_session(checkout_request)

    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "order_id": body.order_id,
        "session_id": session.session_id,
        "amount": amount,
        "currency": "eur",
        "payment_status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    await db.orders.update_one(
        {"id": body.order_id},
        {"$set": {"stripe_session_id": session.session_id}}
    )

    return {"url": session.url, "session_id": session.session_id}


@api_router.get("/checkout/status/{session_id}")
async def checkout_status(session_id: str, request: Request):
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(404, "Transaction non trouvee")

    if transaction.get("payment_status") == "paid":
        return {"payment_status": "paid", "status": "complete", "order_id": transaction.get("order_id")}

    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"

    stripe_checkout = StripeCheckout(
        api_key=os.environ["STRIPE_API_KEY"],
        webhook_url=webhook_url
    )

    try:
        status_response = await stripe_checkout.get_checkout_status(session_id)
        new_status = status_response.payment_status

        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": new_status, "status": status_response.status}}
        )

        if new_status == "paid" and transaction.get("payment_status") != "paid":
            await db.orders.update_one(
                {"id": transaction["order_id"]},
                {"$set": {"status": "pending"}}
            )

        return {"payment_status": new_status, "status": status_response.status, "order_id": transaction.get("order_id")}
    except Exception as e:
        logger.error(f"Stripe status error: {e}")
        return {"payment_status": transaction.get("payment_status", "unknown"), "status": "error", "order_id": transaction.get("order_id")}


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"

    try:
        stripe_checkout = StripeCheckout(api_key=os.environ["STRIPE_API_KEY"], webhook_url=webhook_url)
        webhook_response = await stripe_checkout.handle_webhook(body, signature)

        if webhook_response.payment_status == "paid":
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": {"payment_status": "paid", "status": "complete"}}
            )
            order_id = webhook_response.metadata.get("order_id")
            if order_id:
                await db.orders.update_one({"id": order_id}, {"$set": {"status": "pending"}})
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}


# ==================== SEED DATA ====================

SEED_PRODUCTS = [
    # PANIERS
    {"name": "Panier Famille", "price": 29.90, "category": "paniers", "subcategory": "Nos Paniers", "unit": "piece", "image_url": "https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    {"name": "Panier Solo", "price": 14.90, "category": "paniers", "subcategory": "Nos Paniers", "unit": "piece", "image_url": "https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    {"name": "Panier Mixte Fruits & Legumes", "price": 22.90, "category": "paniers", "subcategory": "Nos Paniers", "unit": "piece", "image_url": "https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    # FRUITS - Pommes
    {"name": "Pomme Gala", "price": 2.50, "category": "fruits", "subcategory": "Les Pommes", "unit": "kg", "image_url": "https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": True, "piece_weight": 0.18, "is_active": True},
    {"name": "Pomme Golden", "price": 2.30, "category": "fruits", "subcategory": "Les Pommes", "unit": "kg", "image_url": "https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": True, "piece_weight": 0.20, "is_active": True},
    {"name": "Pomme Granny Smith", "price": 2.60, "category": "fruits", "subcategory": "Les Pommes", "unit": "kg", "image_url": "https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": True, "piece_weight": 0.19, "is_active": True},
    {"name": "Pomme Fuji", "price": 2.80, "category": "fruits", "subcategory": "Les Pommes", "unit": "kg", "image_url": "https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": True, "piece_weight": 0.22, "is_active": True},
    # FRUITS - Poires
    {"name": "Poire Conference", "price": 3.20, "category": "fruits", "subcategory": "Les Poires", "unit": "kg", "image_url": "https://images.pexels.com/photos/568471/pexels-photo-568471.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": True, "piece_weight": 0.20, "is_active": True},
    {"name": "Poire Williams", "price": 3.50, "category": "fruits", "subcategory": "Les Poires", "unit": "kg", "image_url": "https://images.pexels.com/photos/568471/pexels-photo-568471.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": True, "piece_weight": 0.22, "is_active": True},
    {"name": "Poire Comice", "price": 3.80, "category": "fruits", "subcategory": "Les Poires", "unit": "kg", "image_url": "https://images.pexels.com/photos/568471/pexels-photo-568471.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": True, "piece_weight": 0.25, "is_active": True},
    # FRUITS - Agrumes
    {"name": "Orange Navel", "price": 2.50, "category": "fruits", "subcategory": "Les Agrumes", "unit": "kg", "image_url": "https://images.pexels.com/photos/2611810/pexels-photo-2611810.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": True, "piece_weight": 0.25, "is_active": True},
    {"name": "Citron Jaune", "price": 2.80, "category": "fruits", "subcategory": "Les Agrumes", "unit": "kg", "image_url": "https://images.pexels.com/photos/1414110/pexels-photo-1414110.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": True, "piece_weight": 0.12, "is_active": True},
    {"name": "Clementine", "price": 3.50, "category": "fruits", "subcategory": "Les Agrumes", "unit": "kg", "image_url": "https://images.pexels.com/photos/2090902/pexels-photo-2090902.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": True, "piece_weight": 0.08, "is_active": True},
    {"name": "Pamplemousse Rose", "price": 2.20, "category": "fruits", "subcategory": "Les Agrumes", "unit": "kg", "image_url": "https://images.pexels.com/photos/1435742/pexels-photo-1435742.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": True, "piece_weight": 0.35, "is_active": True},
    # FRUITS - Exotiques
    {"name": "Mangue", "price": 3.50, "category": "fruits", "subcategory": "Fruits Exotiques", "unit": "piece", "image_url": "https://images.pexels.com/photos/918643/pexels-photo-918643.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    {"name": "Ananas", "price": 2.90, "category": "fruits", "subcategory": "Fruits Exotiques", "unit": "piece", "image_url": "https://images.pexels.com/photos/1071878/pexels-photo-1071878.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    {"name": "Banane", "price": 1.95, "category": "fruits", "subcategory": "Fruits Exotiques", "unit": "kg", "image_url": "https://images.pexels.com/photos/2294471/pexels-photo-2294471.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": True, "piece_weight": 0.15, "is_active": True},
    {"name": "Avocat", "price": 1.80, "category": "fruits", "subcategory": "Fruits Exotiques", "unit": "piece", "image_url": "https://images.pexels.com/photos/557659/pexels-photo-557659.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    # FRUITS - Fruits Rouges
    {"name": "Fraise Gariguette", "price": 6.90, "category": "fruits", "subcategory": "Fruits Rouges", "unit": "barquette", "image_url": "https://images.pexels.com/photos/70746/strawberries-fruit-red-sweet-70746.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    {"name": "Framboise", "price": 4.50, "category": "fruits", "subcategory": "Fruits Rouges", "unit": "barquette", "image_url": "https://images.pexels.com/photos/1120970/pexels-photo-1120970.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    {"name": "Myrtille", "price": 4.90, "category": "fruits", "subcategory": "Fruits Rouges", "unit": "barquette", "image_url": "https://images.pexels.com/photos/1120970/pexels-photo-1120970.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    # FRUITS - Raisins
    {"name": "Raisin Blanc Italia", "price": 3.90, "category": "fruits", "subcategory": "Raisins", "unit": "kg", "image_url": "https://images.pexels.com/photos/708777/pexels-photo-708777.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    {"name": "Raisin Noir Muscat", "price": 4.50, "category": "fruits", "subcategory": "Raisins", "unit": "kg", "image_url": "https://images.pexels.com/photos/708777/pexels-photo-708777.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    # LEGUMES - Salades
    {"name": "Laitue", "price": 1.20, "category": "legumes", "subcategory": "Salades", "unit": "piece", "image_url": "https://images.pexels.com/photos/1199562/pexels-photo-1199562.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    {"name": "Batavia", "price": 1.30, "category": "legumes", "subcategory": "Salades", "unit": "piece", "image_url": "https://images.pexels.com/photos/1199562/pexels-photo-1199562.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    {"name": "Roquette", "price": 2.50, "category": "legumes", "subcategory": "Salades", "unit": "botte", "image_url": "https://images.pexels.com/photos/1199562/pexels-photo-1199562.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    # LEGUMES - Tomates
    {"name": "Tomate Ronde", "price": 2.90, "category": "legumes", "subcategory": "Tomates", "unit": "kg", "image_url": "https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": True, "piece_weight": 0.15, "is_active": True},
    {"name": "Tomate Coeur de Boeuf", "price": 4.50, "category": "legumes", "subcategory": "Tomates", "unit": "kg", "image_url": "https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": True, "piece_weight": 0.30, "is_active": True},
    {"name": "Tomate Grappe", "price": 3.20, "category": "legumes", "subcategory": "Tomates", "unit": "kg", "image_url": "https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    {"name": "Tomate Cerise", "price": 4.90, "category": "legumes", "subcategory": "Tomates", "unit": "barquette", "image_url": "https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    # LEGUMES - Racines
    {"name": "Carotte", "price": 1.90, "category": "legumes", "subcategory": "Racines & Navets", "unit": "kg", "image_url": "https://images.pexels.com/photos/143133/pexels-photo-143133.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    {"name": "Navet", "price": 2.20, "category": "legumes", "subcategory": "Racines & Navets", "unit": "kg", "image_url": "https://images.pexels.com/photos/244393/pexels-photo-244393.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    {"name": "Betterave", "price": 2.50, "category": "legumes", "subcategory": "Racines & Navets", "unit": "kg", "image_url": "https://images.pexels.com/photos/244393/pexels-photo-244393.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": True, "piece_weight": 0.25, "is_active": True},
    # LEGUMES - Pommes de Terre
    {"name": "Pomme de Terre Charlotte", "price": 2.20, "category": "legumes", "subcategory": "Pommes de Terre", "unit": "kg", "image_url": "https://images.pexels.com/photos/144248/pexels-photo-144248.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    {"name": "Pomme de Terre Grenaille", "price": 3.50, "category": "legumes", "subcategory": "Pommes de Terre", "unit": "kg", "image_url": "https://images.pexels.com/photos/144248/pexels-photo-144248.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    {"name": "Pomme de Terre Bintje", "price": 1.90, "category": "legumes", "subcategory": "Pommes de Terre", "unit": "kg", "image_url": "https://images.pexels.com/photos/144248/pexels-photo-144248.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    # LEGUMES - Poivrons & Aubergines
    {"name": "Poivron Rouge", "price": 3.90, "category": "legumes", "subcategory": "Poivrons & Aubergines", "unit": "kg", "image_url": "https://images.pexels.com/photos/1435904/pexels-photo-1435904.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": True, "piece_weight": 0.20, "is_active": True},
    {"name": "Poivron Vert", "price": 2.90, "category": "legumes", "subcategory": "Poivrons & Aubergines", "unit": "kg", "image_url": "https://images.pexels.com/photos/1435904/pexels-photo-1435904.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": True, "piece_weight": 0.18, "is_active": True},
    {"name": "Aubergine", "price": 2.50, "category": "legumes", "subcategory": "Poivrons & Aubergines", "unit": "kg", "image_url": "https://images.pexels.com/photos/321551/pexels-photo-321551.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": True, "piece_weight": 0.30, "is_active": True},
    # LEGUMES - Choux
    {"name": "Brocoli", "price": 2.90, "category": "legumes", "subcategory": "Choux & Brocolis", "unit": "kg", "image_url": "https://images.pexels.com/photos/47347/broccoli-vegetable-food-healthy-47347.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": True, "piece_weight": 0.40, "is_active": True},
    {"name": "Chou-Fleur", "price": 2.50, "category": "legumes", "subcategory": "Choux & Brocolis", "unit": "piece", "image_url": "https://images.pexels.com/photos/47347/broccoli-vegetable-food-healthy-47347.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    # LEGUMES - Aulx Oignons
    {"name": "Oignon Jaune", "price": 1.50, "category": "legumes", "subcategory": "Aulx, Oignons & Echalotes", "unit": "kg", "image_url": "https://images.pexels.com/photos/4197444/pexels-photo-4197444.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    {"name": "Ail Rose", "price": 12.00, "category": "legumes", "subcategory": "Aulx, Oignons & Echalotes", "unit": "kg", "image_url": "https://images.pexels.com/photos/4197444/pexels-photo-4197444.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": True, "piece_weight": 0.05, "is_active": True},
    {"name": "Echalote", "price": 4.50, "category": "legumes", "subcategory": "Aulx, Oignons & Echalotes", "unit": "kg", "image_url": "https://images.pexels.com/photos/4197444/pexels-photo-4197444.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    # LEGUMES - Champignons
    {"name": "Champignon de Paris", "price": 3.90, "category": "legumes", "subcategory": "Champignons", "unit": "kg", "image_url": "https://images.pexels.com/photos/1391487/pexels-photo-1391487.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    {"name": "Pleurote", "price": 8.90, "category": "legumes", "subcategory": "Champignons", "unit": "kg", "image_url": "https://images.pexels.com/photos/1391487/pexels-photo-1391487.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    # HERBES
    {"name": "Persil Plat", "price": 1.20, "category": "herbes", "subcategory": "Herbes Fraiches", "unit": "botte", "image_url": "https://images.pexels.com/photos/2802527/pexels-photo-2802527.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    {"name": "Ciboulette", "price": 1.50, "category": "herbes", "subcategory": "Herbes Fraiches", "unit": "botte", "image_url": "https://images.pexels.com/photos/2802527/pexels-photo-2802527.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    {"name": "Basilic", "price": 2.00, "category": "herbes", "subcategory": "Herbes Fraiches", "unit": "botte", "image_url": "https://images.pexels.com/photos/2802527/pexels-photo-2802527.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    {"name": "Menthe Fraiche", "price": 1.50, "category": "herbes", "subcategory": "Herbes Fraiches", "unit": "botte", "image_url": "https://images.pexels.com/photos/2802527/pexels-photo-2802527.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    {"name": "Thym", "price": 1.50, "category": "herbes", "subcategory": "Herbes Fraiches", "unit": "botte", "image_url": "https://images.pexels.com/photos/2802527/pexels-photo-2802527.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    {"name": "Romarin", "price": 1.50, "category": "herbes", "subcategory": "Herbes Fraiches", "unit": "botte", "image_url": "https://images.pexels.com/photos/2802527/pexels-photo-2802527.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    # EPICERIE
    {"name": "Noix", "price": 9.90, "category": "epicerie", "subcategory": "Fruits Secs & Epicerie", "unit": "kg", "image_url": "https://images.pexels.com/photos/129557/pexels-photo-129557.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    {"name": "Amandes", "price": 12.50, "category": "epicerie", "subcategory": "Fruits Secs & Epicerie", "unit": "kg", "image_url": "https://images.pexels.com/photos/129557/pexels-photo-129557.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
    {"name": "Noisettes", "price": 11.00, "category": "epicerie", "subcategory": "Fruits Secs & Epicerie", "unit": "kg", "image_url": "https://images.pexels.com/photos/129557/pexels-photo-129557.jpeg?auto=compress&cs=tinysrgb&w=400", "can_piece": False, "piece_weight": 0, "is_active": True},
]

SUBCATEGORY_IMAGES = {
    "Nos Paniers": "https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg?auto=compress&cs=tinysrgb&w=600",
    "Les Pommes": "https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg?auto=compress&cs=tinysrgb&w=600",
    "Les Poires": "https://images.pexels.com/photos/568471/pexels-photo-568471.jpeg?auto=compress&cs=tinysrgb&w=600",
    "Les Agrumes": "https://images.pexels.com/photos/2611810/pexels-photo-2611810.jpeg?auto=compress&cs=tinysrgb&w=600",
    "Fruits Exotiques": "https://images.pexels.com/photos/2294471/pexels-photo-2294471.jpeg?auto=compress&cs=tinysrgb&w=600",
    "Fruits Rouges": "https://images.pexels.com/photos/70746/strawberries-fruit-red-sweet-70746.jpeg?auto=compress&cs=tinysrgb&w=600",
    "Raisins": "https://images.pexels.com/photos/708777/pexels-photo-708777.jpeg?auto=compress&cs=tinysrgb&w=600",
    "Salades": "https://images.pexels.com/photos/1199562/pexels-photo-1199562.jpeg?auto=compress&cs=tinysrgb&w=600",
    "Tomates": "https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg?auto=compress&cs=tinysrgb&w=600",
    "Racines & Navets": "https://images.pexels.com/photos/244393/pexels-photo-244393.jpeg?auto=compress&cs=tinysrgb&w=600",
    "Pommes de Terre": "https://images.pexels.com/photos/144248/pexels-photo-144248.jpeg?auto=compress&cs=tinysrgb&w=600",
    "Poivrons & Aubergines": "https://images.pexels.com/photos/1435904/pexels-photo-1435904.jpeg?auto=compress&cs=tinysrgb&w=600",
    "Choux & Brocolis": "https://images.pexels.com/photos/47347/broccoli-vegetable-food-healthy-47347.jpeg?auto=compress&cs=tinysrgb&w=600",
    "Aulx, Oignons & Echalotes": "https://images.pexels.com/photos/4197444/pexels-photo-4197444.jpeg?auto=compress&cs=tinysrgb&w=600",
    "Champignons": "https://images.pexels.com/photos/1391487/pexels-photo-1391487.jpeg?auto=compress&cs=tinysrgb&w=600",
    "Herbes Fraiches": "https://images.pexels.com/photos/2802527/pexels-photo-2802527.jpeg?auto=compress&cs=tinysrgb&w=600",
    "Fruits Secs & Epicerie": "https://images.pexels.com/photos/129557/pexels-photo-129557.jpeg?auto=compress&cs=tinysrgb&w=600",
}


@api_router.get("/subcategory-images")
async def get_subcategory_images():
    return SUBCATEGORY_IMAGES


async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "ishaqRR")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Boudal@2026!Secure")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin BOUDAL",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info("Admin password updated")


async def seed_products():
    count = await db.products.count_documents({})
    if count == 0:
        for p in SEED_PRODUCTS:
            p["id"] = str(uuid.uuid4())
            p["created_at"] = datetime.now(timezone.utc).isoformat()
            p.setdefault("stock_quantity", -1)
            p.setdefault("low_stock_threshold", 5)
            p.setdefault("discount_percentage", 0.0)
            p.setdefault("discount_label", "")
        await db.products.insert_many(SEED_PRODUCTS)
        logger.info(f"Seeded {len(SEED_PRODUCTS)} products")


PRODUCT_IMAGE_MAP = {
    "Pomme Gala": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400",
    "Pomme Golden": "https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?w=400",
    "Pomme Granny Smith": "https://images.unsplash.com/photo-1584306670957-acf935f5033c?w=400",
    "Pomme Fuji": "https://images.unsplash.com/photo-1570913149827-d2ac84ab3f9a?w=400",
    "Poire Conference": "https://images.unsplash.com/photo-1514756331096-242fdeb70d4a?w=400",
    "Poire Williams": "https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=400",
    "Orange Navel": "https://images.unsplash.com/photo-1547514701-42782101795e?w=400",
    "Citron Jaune": "https://images.unsplash.com/photo-1590502593747-42a996133562?w=400",
    "Clementine": "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=400",
    "Mangue": "https://images.unsplash.com/photo-1553279768-865429fa0078?w=400",
    "Ananas": "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=400",
    "Banane": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400",
    "Avocat": "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400",
    "Fraise Gariguette": "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400",
    "Framboise": "https://images.unsplash.com/photo-1577069861033-55d04cec4ef5?w=400",
    "Myrtille": "https://images.unsplash.com/photo-1498159332174-be5f8a298c4c?w=400",
    "Tomate Ronde": "https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=400",
    "Tomate Coeur de Boeuf": "https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=400",
    "Tomate Grappe": "https://images.unsplash.com/photo-1561136594-7f68413baa99?w=400",
    "Carotte": "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400",
    "Poivron Rouge": "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400",
    "Aubergine": "https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=400",
    "Brocoli": "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400",
    "Oignon Jaune": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400",
    "Persil Plat": "https://images.unsplash.com/photo-1506073881649-4e23be3e9ed0?w=400",
    "Basilic": "https://images.unsplash.com/photo-1527964318766-73c5ea4c66ab?w=400",
    "Champignon de Paris": "https://images.unsplash.com/photo-1504545102780-26774c1bb073?w=400",
    "Laitue": "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400",
    "Pomme de Terre Charlotte": "https://images.unsplash.com/photo-1518977676601-b53f82ber633?w=400",
}


async def migrate_products():
    new_fields = {"stock_quantity": -1, "low_stock_threshold": 5, "discount_percentage": 0.0, "discount_label": ""}
    await db.products.update_many(
        {"stock_quantity": {"$exists": False}},
        {"$set": new_fields}
    )
    for name, url in PRODUCT_IMAGE_MAP.items():
        await db.products.update_one({"name": name}, {"$set": {"image_url": url}})
    logger.info("Product migration complete")


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.products.create_index("category")
    await db.orders.create_index("created_at")
    await seed_admin()
    await seed_products()
    await migrate_products()

    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write("## Admin\n")
        f.write(f"- Username: {os.environ.get('ADMIN_EMAIL', 'ishaqRR')}\n")
        f.write(f"- Password: {os.environ.get('ADMIN_PASSWORD', 'Boudal@2026!Secure')}\n")
        f.write("- Role: admin\n\n")
        f.write("## Auth Endpoints\n")
        f.write("- POST /api/auth/login (body: {username, password})\n")
        f.write("- GET /api/auth/me (Bearer token)\n")


app.include_router(api_router)


@app.on_event("shutdown")
async def shutdown():
    client.close()
