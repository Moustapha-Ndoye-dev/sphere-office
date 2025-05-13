# Sphere Office E-commerce

Application e-commerce pour une entreprise de fournitures de bureau, construite avec React, TypeScript et Supabase.

## Configuration de l'authentification Supabase

### Résolution des erreurs d'authentification

Si vous rencontrez des erreurs lors de la création d'utilisateurs avec Supabase Auth, comme :
```
POST https://secbwiwphqmcbemhdvdf.supabase.co/auth/v1/signup 500 (Internal Server Error)
Error creating user: AuthApiError: Database error saving new user
```

Cela est généralement dû à une configuration incomplète de la base de données Supabase. Suivez ces étapes pour résoudre le problème :

1. **Structure de la base de données requise** : Supabase Auth nécessite une table `profiles` avec une relation vers `auth.users` pour fonctionner correctement avec les rôles utilisateur personnalisés.

2. **Exécuter le script de migration** : Exécutez le script SQL suivant dans l'éditeur SQL de Supabase pour configurer correctement les tables et fonctions nécessaires :

```sql
-- Chemin du fichier: project/supabase/migrations/20240501_create_user_functions.sql
```

Ce script va :
- Créer la table `profiles` si elle n'existe pas déjà
- Configurer les politiques RLS (Row Level Security)
- Créer des fonctions PL/pgSQL pour gérer les utilisateurs et leurs profils
- Mettre en place des déclencheurs (triggers) pour maintenir la cohérence des données

3. **Utilisation des fonctions** : L'application utilise maintenant un mécanisme de fallback pour créer des utilisateurs :
   - D'abord avec l'API Auth standard de Supabase
   - Si cela échoue, en utilisant une fonction RPC personnalisée `create_user_with_profile`

### Confirmation automatique des utilisateurs

Par défaut, Supabase envoie un email de confirmation lors de la création d'un utilisateur. Pour activer la confirmation automatique des utilisateurs (sans nécessiter de cliquer sur un lien d'email) :

1. **Exécuter le script de confirmation automatique** :

```sql
-- Chemin du fichier: project/supabase/migrations/20240501_autoconfirm_users.sql
```

Ce script va :
- Créer une fonction `admin_confirm_user` pour confirmer manuellement un utilisateur
- Tenter de désactiver l'exigence de confirmation par email au niveau système
- Confirmer tous les utilisateurs existants qui ne sont pas encore confirmés

2. **Configuration du tableau de bord Supabase** :
   - Connectez-vous au tableau de bord Supabase
   - Allez dans "Authentication" > "Providers" > "Email"
   - Désactivez l'option "Confirm email" ou "Email confirmation"
   - Sauvegardez les modifications

3. **Dans le code** : L'application utilise maintenant plusieurs méthodes pour s'assurer que les utilisateurs sont automatiquement confirmés :
   - Définition explicite de `email_confirmed_at` lors de la création d'utilisateurs via SQL
   - Utilisation de l'API Admin pour confirmer les utilisateurs après leur création
   - Fonction RPC de secours pour confirmer les utilisateurs si l'API Admin échoue

### Rôles utilisateur

L'application prend en charge deux rôles d'utilisateur :
- **admin** : Accès complet au tableau de bord d'administration, à la gestion des utilisateurs, etc.
- **cashier** : Accès limité pour les caissiers au point de vente (POS) et aux fonctionnalités de base.

Les rôles sont stockés dans :
1. Les métadonnées utilisateur de Supabase Auth (`user_metadata.role`)
2. La table `profiles` dans la colonne `role`

## Dépannage supplémentaire

Si les erreurs persistent après l'exécution du script SQL :

1. Vérifiez les journaux d'erreur Supabase pour des messages plus détaillés
2. Assurez-vous que les extensions PostgreSQL requises sont activées (`uuid-ossp`, `pgcrypto`)
3. Vérifiez que l'utilisateur service Supabase a les permissions suffisantes
4. Essayez de créer manuellement un utilisateur via l'interface d'administration Supabase 