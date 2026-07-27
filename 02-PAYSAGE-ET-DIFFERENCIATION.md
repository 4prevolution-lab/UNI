# 02 — Paysage existant et différenciation

## Conclusion du préflight

Plusieurs briques de UNI existent déjà. Il serait inutile et risqué de recréer leurs standards. La nouveauté potentielle de UNI se trouve dans leur assemblage autour d'une boucle de mission et de contribution.

## Briques à réutiliser

### Open Badges 3.0

Open Badges représente un accomplissement individuel avec des métadonnées sur le bénéficiaire, l'émetteur, les critères et les preuves. La version 3.0 est compatible avec le modèle W3C Verifiable Credentials.

Décision : utiliser ou rester compatible avec Open Badges pour les reconnaissances portables. Ne pas inventer un format propriétaire de badge au départ.

Source : https://www.1edtech.org/standards/open-badges

### W3C Verifiable Credentials

Les Verifiable Credentials fournissent un modèle standard pour exprimer des affirmations signées et vérifiables.

Décision : considérer cette norme comme couche d'interopérabilité future. Le pilote peut d'abord conserver des attestations classiques dans une base de données, tout en préparant un modèle exportable.

Source : https://www.w3.org/TR/vc-data-model-2.0/

### ESCO

ESCO fournit une classification multilingue des professions et compétences, avec des relations exploitables par des systèmes numériques. La Commission européenne annonce 3 039 professions et 13 939 compétences dans 28 langues.

Décision : utiliser ESCO comme vocabulaire initial pour les capacités professionnelles quand il convient, tout en permettant des capacités locales, culturelles, sportives et communautaires absentes de cette taxonomie.

Source : https://esco.ec.europa.eu/en/about-esco/what-esco

### Europass et justificatifs numériques

Europass montre l'importance de profils portables, de qualifications comparables et de justificatifs numériques pour l'apprentissage.

Décision : assurer la portabilité et l'export des preuves; UNI ne doit pas emprisonner l'identité d'une personne.

Source : https://europass.europa.eu/

### Plateformes de financement et biens publics

Gitcoin et d'autres écosystèmes expérimentent la coordination, le financement et la reconnaissance de contributions à des biens publics.

Décision : étudier leurs mécanismes d'incitation, mais ne pas introduire de jeton ou de cryptoéconomie dans le premier produit.

Source : https://gitcoin.co/

## Familles de concurrents ou substituts

- LinkedIn, Workday et marchés de talents : profils, recrutement et compétences.
- Degreed, Coursera, Credly et plateformes d'apprentissage : parcours et justificatifs.
- GitHub : preuve très forte dans le contexte du logiciel, mais limitée à certains travaux.
- Jira, Asana, Linear et Notion : coordination du travail, sans graphe portable de capacités.
- Upwork, Fiverr et plateformes de missions : transaction et réputation de marché.
- Open-source communities et plateformes de bénévolat : contribution réelle, mais preuve et développement souvent fragmentés.
- réseaux de justificatifs numériques : portabilité et vérification, sans nécessairement coordonner une mission.

## Différenciation défendable

UNI ne gagnera pas par une liste de fonctionnalités. Sa différence doit être une architecture cohérente :

1. la mission est l'unité de coordination;
2. la contribution est l'unité d'activité;
3. la preuve est l'unité de confiance;
4. la capacité contextuelle est l'unité de découverte;
5. l'IA assiste la décomposition et la mise en relation;
6. la décision et le consentement restent humains;
7. les résultats et justificatifs sont portables.

## Ce qu'il ne faut pas construire au début

- une blockchain ou un jeton;
- une identité mondiale;
- une note universelle de réputation;
- une taxonomie complète de toutes les capacités humaines;
- un réseau social avec fil d'actualité;
- un marché mondial;
- des agents autonomes capables d'engager des personnes sans consentement;
- une gouvernance constitutionnelle complexe avant l'existence d'une communauté réelle.
