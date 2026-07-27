# UNI — Universal Network Intelligence

## Dossier maître

UNI est une infrastructure de coordination des capacités humaines et artificielles autour de missions concrètes.

Sa thèse centrale :

> Le prochain grand défi n'est pas seulement de créer davantage d'intelligence, mais de rendre les capacités humaines et artificielles découvrables, vérifiables et coordonnables.

## Formule de départ

UNI aide une communauté à :

1. déclarer une mission;
2. décomposer cette mission en capacités nécessaires;
3. découvrir des personnes capables ou désireuses d'apprendre;
4. former une équipe humaine augmentée par l'IA;
5. réaliser des contributions;
6. joindre des preuves aux contributions;
7. faire vérifier ces preuves;
8. reconnaître les capacités démontrées;
9. conserver les apprentissages pour les missions suivantes.

## Principe stratégique

UNI ne doit pas commencer comme un « réseau mondial pour toute l'humanité ». Il doit commencer comme un produit étroit qui résout très bien un problème de coordination observable.

Le premier produit proposé est un **Mission Lab** : un espace où une petite communauté réalise une mission réelle, avec profils de capacités, tâches, preuves, validations et bilan final.

## Documents

- [01 — Thèse et positionnement](01-THESE-ET-POSITIONNEMENT.md)
- [02 — Paysage existant et différenciation](02-PAYSAGE-ET-DIFFERENCIATION.md)
- [03 — Premier produit et expérience pilote](03-MVP-MISSION-LAB.md)
- [04 — Architecture conceptuelle](04-ARCHITECTURE-CONCEPTUELLE.md)
- [05 — Risques et principes de gouvernance](05-RISQUES-ET-GOUVERNANCE.md)
- [Décisions à prendre](DECISIONS.md)

## UNI Mission Lab — MVP

Le dépôt contient maintenant un MVP fonctionnel de la boucle de mission :

- constitution de mission et critères de succès;
- cartographie des capacités et détection des lacunes;
- équipe avec consentement et visibilité contrôlée;
- portefeuille de contributions;
- déclaration distincte du rôle humain et de l'usage de l'IA;
- preuves, provenance et validation humaine;
- niveaux d'affirmation explicites;
- bilan et attestations contextuelles;
- journal d'activité;
- persistance locale et export JSON;
- pont d'interopérabilité GoalOS v0.1.
- compilateur local de contributions fondé sur les lacunes de capacités;
- installation PWA et fonctionnement hors ligne;
- schémas JSON publics pour l'état UNI et le pont GoalOS.
- ProofBundles avec empreinte SHA-256 et journal chaîné;
- rapport de mission autonome, imprimable ou enregistrable en PDF.
- vérificateur public de ProofBundles fonctionnant entièrement dans le navigateur;
- brouillons d'attestations structurés selon Open Badges 3.0.
- Pilot Launchpad avec dix conditions de préparation transparentes;
- export d'une charte de pilote et transfert direct vers Mission Lab.
- portefeuille local multi-missions avec activation explicite;
- duplication de modèles sans personnes, contributions, preuves ou historique.
- fondation Supabase/PostgreSQL pour un runtime protégé multiutilisateur;
- cinq rôles séparés, politiques RLS et chaîne d'audit calculée côté serveur.
- Centre d'accès prêt pour liens magiques et sessions éphémères;
- création de profils et d'espaces protégés soumise à RLS.
- invitations temporaires par rôle, expiration et nombre d'utilisations;
- codes stockés uniquement sous forme d'empreinte SHA-256.

### Lancer localement

Prérequis : Node.js 20 ou plus récent.

```bash
npm start
```

Ouvrir ensuite `http://localhost:4173`.

### Tester

```bash
npm test
```

Les tests vérifient notamment que le produit ne confond jamais preuve et validation, et que le paquet GoalOS conserve les conditions d'arrêt et la posture de preuve.

### Schémas d'interopérabilité

- [`schemas/mission-lab-state.schema.json`](schemas/mission-lab-state.schema.json) — état portable d'une mission;
- [`schemas/goalos-bridge.schema.json`](schemas/goalos-bridge.schema.json) — paquet UNI vers GoalOS.
- [`schemas/proof-bundle.schema.json`](schemas/proof-bundle.schema.json) — archive de mission avec somme de contrôle et journal chaîné.
- [`schemas/credential-collection.schema.json`](schemas/credential-collection.schema.json) — collection de brouillons Open Badges non signés.

Le vérificateur autonome est accessible dans [`verify.html`](verify.html). Les fichiers analysés ne quittent pas le navigateur.

Le [`Pilot Launchpad`](pilot.html) qualifie une communauté, une mission et ses règles de confiance avant de remplacer les données de démonstration. Il n'utilise aucun score opaque : les dix conditions sont visibles et vérifiables séparément.

Le [`Mission Portfolio`](portfolio.html) conserve plusieurs espaces locaux et permet l'export d'une archive complète. Son schéma est documenté dans [`schemas/mission-portfolio.schema.json`](schemas/mission-portfolio.schema.json).

## Runtime protégé

Le dossier [`supabase`](supabase) contient la première migration du backend multiutilisateur. Le mode protégé reste désactivé par défaut : l'application continue d'annoncer clairement son stockage local tant qu'aucun projet contrôlé par UNI n'est configuré.

La migration sépare les rôles `owner`, `facilitator`, `contributor`, `validator` et `observer`. Les preuves, validations et événements d'audit sont append-only. La chaîne d'audit est calculée par PostgreSQL, pas fournie par le navigateur.

Le [`Centre d'accès`](account.html) reste verrouillé tant que le runtime n'est pas configuré. Lorsqu'il est actif, le jeton est conservé dans `sessionStorage`, retiré immédiatement de l'URL et perdu à la fermeture de la session du navigateur.

La migration `0002_workspace_invites.sql` ajoute des invitations bornées. Le code en clair est retourné une seule fois; PostgreSQL ne conserve que son empreinte. Un facilitateur ne peut pas inviter un autre facilitateur, et le rôle d'une adhésion existante n'est jamais rétrogradé par un code.

Le compilateur local n'appelle aucun modèle externe. Il propose des contributions à partir des écarts de capacités déclarés, laisse le responsable non assigné et exige une décision humaine.

### Données et confidentialité

Cette première version ne possède pas de backend. Les données restent dans le stockage local du navigateur jusqu'à leur export explicite par l'utilisateur. La démonstration utilise des données synthétiques : aucune donnée confidentielle ne doit être saisie avant un déploiement protégé révisé.

### Déploiement

Le workflow GitHub Actions exécute les tests et déploie l'application sur GitHub Pages à chaque mise à jour de `main`, lorsque Pages est configuré avec la source **GitHub Actions** dans les paramètres du dépôt.

## État actuel

Version 0.1 — fondation stratégique et MVP statique. Les prochaines étapes sont de choisir la première communauté pilote, la première mission et le résultat mesurable, puis de remplacer la persistance locale par un environnement protégé multiutilisateur.
