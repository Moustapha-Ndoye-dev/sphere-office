# Sphere Office

Application e-commerce et back-office construite avec React, TypeScript, Vite et Supabase.

## Verification locale

```bash
npm install
npm run typecheck
npm run lint
npm run build
npm run preview
```

## Variables d'environnement

```dotenv
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

- Les deux variables `VITE_*` sont publiques et utilisees par le navigateur.
- `SUPABASE_SERVICE_ROLE_KEY` est strictement reservee aux endpoints serveur `api/`.
- Ne jamais prefixer la cle service-role par `VITE_` et ne jamais l'exposer dans le bundle client.

## Deploiement

1. Appliquer, dans l'ordre, tous les fichiers de `supabase/migrations/` qui ne sont pas encore presents dans la base cible.
2. Verifier les politiques RLS, les fonctions securisees et les politiques du bucket `products`.
3. Configurer les trois variables d'environnement dans Vercel, avec la cle service-role uniquement cote serveur.
4. Deployer le build Vite et verifier les en-tetes declares dans `vercel.json`.
5. Executer un test de commande et un test back-office avec des donnees de recette dediees.

Le fichier historique `SETUP_DATABASE.sql` a ete retire. Il ne faut pas reconstruire la base avec un ancien script monolithique : les migrations ordonnees sont la source de verite.

## Authentification et roles

L'application ne propose pas d'inscription publique. Les comptes staff sont geres par un superadmin via l'API serveur protegee.

- `superadmin` : administration complete et gestion des comptes Auth ;
- `admin` : catalogue, commandes, statistiques, reglages et promotions ;
- `cashier` : caisse, factures et fonctions staff autorisees.

Les autorisations sensibles sont controlees dans PostgreSQL/RLS et dans les endpoints serveur. Les controles de route React ne constituent qu'une protection d'interface.

## Limites fonctionnelles explicites

- Le checkout public enregistre une commande non payee ; aucun paiement en ligne n'est integre.
- Les paiements du back-office sont des enregistrements manuels (especes, carte, Wave, etc.).
- Le formulaire de contact ouvre le client de messagerie de l'utilisateur avec `mailto:` ; aucun service d'envoi d'email transactionnel n'est integre.
- La reference de suivi est affichee apres la commande. Il n'existe pas encore d'envoi automatique d'email de confirmation.

## Securite

- Les prix, stocks et totaux du checkout sont recalcules par les RPC securisees.
- Les tables sensibles ne sont pas lisibles avec le role anonyme.
- Les uploads sont limites aux images JPEG, PNG et WebP valides, 5 Mo maximum.
- La generation PDF et la gestion des utilisateurs exigent un jeton staff valide ; la gestion des utilisateurs exige le role `superadmin`.
- Les secrets doivent rester dans les variables serveur et `.env` doit rester ignore par Git.
