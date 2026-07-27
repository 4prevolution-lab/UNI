# 04 — Architecture conceptuelle

## Graphe minimal

### Nœuds

- Person
- Organization
- Mission
- Contribution
- Capability
- Evidence
- Validation
- Credential
- AI Agent
- Resource

### Relations

- une personne **déclare** un intérêt ou une capacité;
- une mission **requiert** une capacité;
- une personne ou un agent **réalise** une contribution;
- une contribution **sert** une mission;
- une contribution **mobilise** une capacité;
- une contribution **est soutenue par** une preuve;
- un validateur **évalue** une contribution;
- une validation **peut produire** un justificatif;
- une organisation **soutient ou gouverne** une mission.

## Niveaux d'affirmation

UNI doit afficher clairement la force de chaque affirmation :

1. **Déclarée** — la personne l'affirme.
2. **Observée** — une activité existe, sans validation formelle.
3. **Démontrée** — une preuve répond à des critères.
4. **Validée** — un validateur identifié accepte la preuve.
5. **Endossée** — une institution ou autorité soutient la validation.

Ces niveaux ne doivent jamais être fusionnés dans un score opaque.

## Rôle de l'IA

L'IA peut :

- suggérer des capacités requises;
- proposer une décomposition de mission;
- résumer une preuve;
- signaler une incohérence;
- recommander des collaborateurs;
- identifier une lacune;
- produire un parcours d'apprentissage;
- conserver la mémoire structurée de la mission.

L'IA ne doit pas, dans le pilote :

- attribuer seule une reconnaissance à fort enjeu;
- rendre une décision irrévocable;
- exposer un profil à un tiers sans consentement;
- classer globalement la valeur des participants;
- dissimuler les raisons d'une recommandation.

## Architecture technique indicative

- application web responsive;
- API applicative;
- base relationnelle pour les transactions et permissions;
- modèle de graphe logique, sans nécessité d'une base graphe au départ;
- stockage séparé des preuves;
- journal d'audit append-only;
- service d'IA avec sorties structurées et approbation humaine;
- export JSON/CSV dès la première version;
- compatibilité Open Badges / Verifiable Credentials préparée après validation du modèle.

## Principe d'interopérabilité

Les capacités, preuves et justificatifs appartiennent d'abord aux personnes et communautés qui les produisent. UNI doit permettre l'export et documenter ses schémas.
