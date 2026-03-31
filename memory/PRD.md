# Primeur BOUDAL - E-Commerce Platform PRD

## Original Problem Statement
Transformer une maquette statique (site vitrine) pour "Primeur BOUDAL" (Halles de Nîmes) en une plateforme e-commerce full-stack avec base de données, gestion des commandes et espace administrateur.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python) + MongoDB
- **Auth**: JWT Bearer tokens (bcrypt + PyJWT)
- **Payments**: Stripe via emergentintegrations library
- **Design**: Vert bouteille #0F3D3E, Doré #C9A063, Ivoire #F8F4EC, Sauge #A8C3A0
- **Fonts**: Playfair Display (headings) + Inter (body)

## User Personas
1. **Client**: Parcourt le catalogue, ajoute au panier, passe commande (espèces ou CB)
2. **Admin (ishaqRR)**: Gère les commandes (statuts), CRUD produits, consulte le dashboard

## Core Requirements
- [x] Catalogue dynamique avec filtrage par catégories/sous-catégories
- [x] Logique Pièce/Kilo sur les produits compatibles
- [x] Panier latéral (Context API)
- [x] Checkout avec 2 modes de paiement (espèces / Stripe CB)
- [x] Admin protégé par JWT
- [x] Dashboard commandes (liste, détails, changement statut)
- [x] CRUD Produits complet
- [x] 55 produits seedés (fruits, légumes, herbes, épicerie, paniers)
- [x] Polling automatique des commandes (15s)

## What's Been Implemented (2026-03-31)
- Full backend API (auth, products CRUD, orders, Stripe checkout)
- Full frontend (HomePage, BoutiquePage, AdminLogin, AdminDashboard, CheckoutSuccess)
- CartContext + AuthContext
- 55 products seeded across 17 subcategories
- Stripe payment integration (test key)
- Admin: ishaqRR / Boudal@2026!Secure

## Prioritized Backlog
### P0 (Done)
- All core features implemented and tested

### P1 (Next)
- Real product images (photo shoot)
- Stripe live key configuration
- Email notifications on new orders
- Mobile responsive fine-tuning

### P2 (Future)
- Real-time WebSocket for admin order notifications
- Customer order tracking page
- Delivery zone management
- Seasonal promotions / discounts
- Customer accounts with order history
- Stock management / inventory tracking

## Next Tasks
- Configure Stripe live keys for production
- Add email notifications (SendGrid) for order confirmations
- Improve mobile UX for the cart panel
- Add product image upload functionality
