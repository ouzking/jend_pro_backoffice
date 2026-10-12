# JËND PRO — Console d'administration (back-office)

Console interne de l'équipe JËND PRO : entreprises, utilisateurs, abonnements, paiements,
support, annonces, audit et indicateurs SaaS de la plateforme. **Ce n'est pas l'application
des commerçants.**

- Stack : React 19 · TypeScript (strict) · Vite · Tailwind CSS v4 · TanStack Query · React Router · Recharts
- Backend : [`jend_pro_backend`](https://github.com/ouzking/jend_pro_backend) (Supabase) — **source de vérité**
- Phase backend associée : **Phase 16 — back-office plateforme** (RBAC staff + RPC `admin_*`)

## Identité visuelle

Issue des maquettes de marque (signalétique du siège, kit, application, cartes) :

| Rôle | Couleur | Usage |
|---|---|---|
| Vert forêt | `--brand-*` (`#1a704d`) | Actions principales, sélection, tuile du logo |
| Menthe Signal | `--mint` (`#8fe3c2`) | Carré du logo, indicateurs actifs, signaux en direct |
| Laiton | `--accent` (`#b8864b`) | Dorure : rares accents premium (super admin, propriétaires) |

Monogramme et mot-symbole : `src/components/layout/Logo.tsx` (géométrie unique partagée par
toutes les variantes ; mot-symbole en Jost). Tous les tokens sont dans `src/index.css` (thèmes
clair et sombre) ; la palette des graphiques est validée pour la lisibilité (daltonisme, contraste).

## Démarrage

```bash
# 1. Backend local (dans ../jend_pro_backend)
npx supabase start && npx supabase db reset

# 2. Back-office
cp .env.example .env.local        # puis la clé publishable (npx supabase status)
npm install
npm run dev                       # http://localhost:5173
```

Comptes de démonstration (local uniquement, mot de passe `jendpro-demo`) :

| Compte | Accès |
|---|---|
| `admin@demo.jendpro.local` | SUPER_ADMIN — tout, y compris la gestion de l'équipe |
| `support@demo.jendpro.local` | SUPPORT — tickets, consultation des comptes |
| `owner@demo.jendpro.local` | Commerçant : **refusé** par la console (preuve du contrôle d'accès) |

Premier super administrateur en production (éditeur SQL du Dashboard, une seule fois) :

```sql
insert into public.platform_admins (user_id, role)
select id, 'SUPER_ADMIN' from auth.users where email = '<email>';
```

## Mise en ligne (Vercel)

Configuration versionnée dans `vercel.json` : routes de l'application, cache des fichiers et
en-têtes de sécurité (CSP stricte limitée à Supabase et Google Fonts, interdiction d'affichage
en iframe, pas d'indexation, HTTPS forcé).

1. vercel.com → **Add New… → Project** → importer `ouzking/jend_pro_backoffice`
   (Vercel détecte Vite ; ne rien changer).
2. **Environment Variables** (Production) :
   `VITE_SUPABASE_URL` = `https://lmyhrksehcodyylzphyn.supabase.co`,
   `VITE_SUPABASE_PUBLISHABLE_KEY` = clé *publishable* (jamais la clé secrète).
3. **Deploy**. Ensuite, chaque push sur `main` est mis en ligne automatiquement ;
   chaque pull request reçoit une URL de prévisualisation.
4. *(Facultatif)* **Settings → Domains** : ajouter par ex. `console.jendpro.sn`.
5. Supabase → **Authentication → URL Configuration** → **Redirect URLs** : ajouter
   `https://<adresse-de-la-console>/**`, sinon les liens « mot de passe oublié » ne
   reviennent pas vers la console.

## Donner l'accès à un membre de l'équipe

1. **Créer son compte** : Supabase → Authentication → Users → **Add user → Create new user**
   (son e-mail, un mot de passe provisoire, cocher *Auto Confirm User*).
   *(S'il a déjà un compte JËND PRO, passer à l'étape 2.)*
2. **Lui donner un rôle** : dans la console, **Paramètres → Équipe → Ajouter / changer un rôle**
   (son e-mail + le rôle). Réservé au super admin, avec la double authentification activée.
3. **Lui envoyer** l'adresse de la console. À la première connexion, il clique sur
   « Mot de passe oublié ? », reçoit un e-mail et **choisit son propre mot de passe**
   (écran dédié), puis active sa double authentification dans Paramètres.

Retirer un accès : Paramètres → Équipe → **Suspendre** (effet immédiat, son compte JËND PRO
reste utilisable comme commerçant).

## Scripts

| Script | Rôle |
|---|---|
| `npm run dev` / `build` / `preview` | Développement, build de production, prévisualisation |
| `npm run check` | **Avant chaque commit** : types + lint + format + tests |
| `npm run test` | Tests unitaires et composants (Vitest + Testing Library) |
| `npm run test:integration` | Contrats avec le vrai backend local (`INTEGRATION=1`) |
| `npm run types:sync` | Recopie les types générés du backend après une migration |

## Architecture

```text
src/
├── app/            Composition : providers, routeur (une route = un chunk chargé à la demande)
├── core/
│   ├── api/        Client Supabase unique, types générés, contrat d'erreurs, pagination
│   ├── auth/       AuthRepository (interface) + implémentation Supabase + AuthProvider
│   ├── permissions/ Permissions plateforme et `can()`
│   ├── config/     Env validé, vocabulaire des enums (libellés, tons) — source unique
│   ├── router/     Arbre de navigation (sidebar, palette de commandes et gardes)
│   └── utils/      Formatage FCFA / dates (Dakar), périodes, hooks, thème
├── components/
│   ├── ui/         Design system : Button, Field, Select, Badge, Card, Modal, Drawer,
│   │               ConfirmDialog, Menu, Tabs, Toast, Tooltip, Pagination, États…
│   ├── tables/     DataTable (tri serveur, sélection, colonnes configurables, états)
│   ├── charts/     Séries temporelles, tuiles KPI, répartitions (palette validée)
│   └── layout/     AppShell, Sidebar, Topbar, PageHeader
└── features/<domaine>/
    ├── <domaine>.repository.ts   Interface + types métier (indépendants du transport)
    ├── <domaine>.supabase.ts     Implémentation V1 + mappers snake_case → domaine
    ├── api.ts                    Point de bascule V2 + hooks React Query
    └── *Page.tsx                 Écrans
```

Domaines : `dashboard`, `analytics`, `businesses`, `users`, `subscriptions`, `payments`,
`support`, `notifications` (annonces), `audit`, `settings` (équipe, rôles), `search` (⌘K).

### Règles

1. **Le backend décide.** Aucune table, colonne, statut ou règle n'est inventé : tout vient
   des migrations de `jend_pro_backend` et des types générés. Les indicateurs (MRR, churn…)
   sont calculés en SQL et seulement affichés ici.
2. **Le frontend n'est pas une couche de sécurité.** `can()` adapte l'interface ; chaque RPC
   `admin_*` revérifie la permission en base. La clé `service_role` est refusée au démarrage
   (`core/config/env.ts`).
3. **Aucun plan codé en dur.** Le catalogue vient de `subscription_plans` (`usePlans()`).
4. **Vocabulaire centralisé.** Statuts, rôles et libellés : `core/config/domain.ts`.
5. **Actions sensibles** (suspension, paiement manuel, accès staff, envoi d'annonce) :
   `ConfirmDialog`, avec un motif enregistré dans l'audit si le backend le demande.

### Migration Laravel (V2)

Les écrans ne connaissent que les interfaces `*Repository`. Pour basculer un domaine :
écrire `<domaine>.laravel.ts` qui implémente la même interface (appels HTTP vers
`/api/admin/...`, mapping vers les mêmes types) et changer **une ligne** dans `api.ts`.
Chaque RPC `admin_*` correspond à un endpoint (voir la table des RPC dans
`jend_pro_backend/docs/roles-and-permissions.md §6`). Les erreurs passent par `toApiError`,
qui accepte n'importe quel transport.

### Performance

- Routes et graphiques chargés à la demande (`charts` ≈ 110 kB gzip, seulement sur les pages graphiques)
- Listes paginées côté serveur (25 lignes par défaut, maximum 100), journal d'audit en pagination keyset
- Agrégats en SQL (jamais calculés sur des listes complètes), cache React Query (30 s), `keepPreviousData`
- Filtres, tri et page dans l'URL : liens partageables, bouton retour fonctionnel

## Ce qui n'existe pas encore (volontairement)

| Besoin | Pourquoi | Piste |
|---|---|---|
| Paiements « en attente / échoué / remboursé » | Le backend ne stocke que les paiements confirmés (`billing_events`) | Adaptateurs Wave / Orange Money |
| Bloquer un compte, réinitialiser un mot de passe | Exige l'API admin Auth (`service_role`) | Edge Function dédiée |
| Rétention par cohorte, DAU/MAU, MRR historique | Pas d'historique de sessions ni de snapshots | Table de snapshots quotidiens (`pg_cron`) |
| Modifier les plans et les prix depuis l'interface | Catalogue versionné par migration | Gardé volontairement en migration |
