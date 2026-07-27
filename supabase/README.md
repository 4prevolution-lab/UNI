# UNI Protected Runtime

Cette migration prépare un runtime Supabase/PostgreSQL multiutilisateur. Elle ne doit pas être appliquée à un projet qui n'est pas contrôlé par UNI.

## Frontières d'autorité

- `owner` : gouvernance de l'espace et membres;
- `facilitator` : missions, capacités et participants;
- `contributor` : contributions et preuves;
- `validator` : décisions de validation;
- `observer` : lecture autorisée.

Une personne doit posséder une adhésion active et un consentement daté. Les profils privés ne sont visibles que par leur propriétaire et les facilitateurs. Les preuves, validations et événements d'audit sont append-only : une correction ajoute un nouvel enregistrement.

## Mise en service

1. Créer un projet Supabase appartenant à UNI.
2. Appliquer `migrations/0001_uni_core.sql`.
3. Créer les profils lors de l'inscription et inscrire le propriétaire dans `memberships`.
4. Renseigner `runtime-config.public.js` avec l'URL du projet et la clé publique `anon`.
5. Ne jamais y placer une clé privée ou `service_role`.
6. Vérifier les politiques RLS avec au moins deux comptes de test avant tout pilote.

Ne jamais placer la clé `service_role` dans le navigateur ou dans Git.

## Limites actuelles

Le schéma et l'adaptateur sont prêts, mais l'interface d'authentification n'est pas activée sans projet configuré. Le Mission Lab conserve son mode local explicite.
