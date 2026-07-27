export const CLAIM_LEVELS = ["declared", "observed", "demonstrated", "validated", "endorsed"];

export function uid(prefix = "item") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function now() {
  return new Date().toISOString();
}

export function createDemoState() {
  const createdAt = now();
  return {
    schema: "https://uni.4prevolution.org/schemas/mission-lab-state/v0.1",
    version: "0.1",
    settings: { language: "fr", theme: "dark" },
    mission: {
      id: "mission-quartier-001",
      title: "Réduire le gaspillage alimentaire du quartier",
      outcome: "Tester un circuit local qui détourne 500 kg de nourriture en six semaines.",
      beneficiaries: "Résidents, commerces et organismes communautaires du quartier",
      owner: "SOLOS",
      participation: "hybride",
      deadline: "2026-09-15",
      status: "active",
      successCriteria: [
        "500 kg de nourriture redistribuée",
        "5 commerces participants",
        "80 % des contributions accompagnées d’une preuve"
      ],
      stopConditions: [
        "Risque sanitaire non maîtrisé",
        "Absence de consentement des bénéficiaires"
      ],
      createdAt
    },
    capabilities: [
      { id: "cap-research", name: "Recherche terrain", required: 3, available: 2 },
      { id: "cap-logistics", name: "Logistique locale", required: 3, available: 1 },
      { id: "cap-data", name: "Analyse de données", required: 2, available: 2 },
      { id: "cap-community", name: "Relations communautaires", required: 3, available: 2 },
      { id: "cap-design", name: "Design de service", required: 2, available: 1 }
    ],
    people: [
      { id: "person-1", name: "Maya", role: "Coordination", availability: "6 h/sem", consent: true, visibility: "mission", capabilities: ["cap-community", "cap-research"] },
      { id: "person-2", name: "Alex", role: "Données", availability: "4 h/sem", consent: true, visibility: "mission", capabilities: ["cap-data"] },
      { id: "person-3", name: "Noor", role: "Design", availability: "5 h/sem", consent: true, visibility: "private", capabilities: ["cap-design", "cap-research"] }
    ],
    contributions: [
      {
        id: "contrib-1",
        title: "Cartographier les commerces partenaires",
        description: "Qualifier dix commerces et documenter leur capacité de don.",
        ownerId: "person-1",
        capabilityIds: ["cap-community", "cap-research"],
        status: "validated",
        humanRole: "Entretiens, jugement et synthèse",
        aiUse: "IA utilisée pour structurer la grille d’entretien",
        effort: "8 h",
        evidence: { type: "document", reference: "Registre terrain v1", note: "10 commerces contactés", addedAt: createdAt },
        validation: { decision: "accepted", validator: "Responsable de mission", rationale: "Échantillon complet et traçable", conflict: false, validatedAt: createdAt }
      },
      {
        id: "contrib-2",
        title: "Concevoir le protocole de collecte",
        description: "Définir pesée, traçabilité, consentement et sécurité.",
        ownerId: "person-3",
        capabilityIds: ["cap-design", "cap-data"],
        status: "review",
        humanRole: "Architecture du protocole et arbitrage",
        aiUse: "Aucune",
        effort: "6 h",
        evidence: { type: "document", reference: "Protocole v0.2", note: "À réviser avec un expert sanitaire", addedAt: createdAt },
        validation: null
      },
      {
        id: "contrib-3",
        title: "Tableau de mesure d’impact",
        description: "Suivre poids, provenance, destination et pertes.",
        ownerId: "person-2",
        capabilityIds: ["cap-data"],
        status: "active",
        humanRole: "Définition des indicateurs",
        aiUse: "Agent de code pour le prototype",
        effort: "5 h",
        evidence: null,
        validation: null
      }
    ],
    activity: [
      { id: "event-1", type: "validation.accepted", text: "La cartographie des commerces a été validée.", actor: "Responsable de mission", at: createdAt },
      { id: "event-2", type: "evidence.added", text: "Une preuve a été ajoutée au protocole de collecte.", actor: "Noor", at: createdAt }
    ],
    goalos: {
      enabled: true,
      authorityCoverage: 62,
      proofThreshold: 80,
      lastExportAt: null
    }
  };
}

export function normalizeState(input) {
  if (!input || typeof input !== "object") throw new Error("État UNI invalide.");
  const demo = createDemoState();
  return {
    ...demo,
    ...input,
    settings: { ...demo.settings, ...(input.settings || {}) },
    mission: { ...demo.mission, ...(input.mission || {}) },
    capabilities: Array.isArray(input.capabilities) ? input.capabilities : [],
    people: Array.isArray(input.people) ? input.people : [],
    contributions: Array.isArray(input.contributions) ? input.contributions : [],
    activity: Array.isArray(input.activity) ? input.activity : [],
    goalos: { ...demo.goalos, ...(input.goalos || {}) }
  };
}

export function missionMetrics(state) {
  const contributions = state.contributions || [];
  const withEvidence = contributions.filter((item) => item.evidence).length;
  const validated = contributions.filter((item) => item.validation?.decision === "accepted").length;
  const active = contributions.filter((item) => ["active", "review"].includes(item.status)).length;
  const consented = (state.people || []).filter((person) => person.consent).length;
  return {
    total: contributions.length,
    active,
    withEvidence,
    validated,
    evidenceRate: contributions.length ? Math.round((withEvidence / contributions.length) * 100) : 0,
    validationRate: contributions.length ? Math.round((validated / contributions.length) * 100) : 0,
    consentRate: state.people?.length ? Math.round((consented / state.people.length) * 100) : 0
  };
}

export function capabilityGaps(state) {
  return (state.capabilities || [])
    .map((capability) => ({ ...capability, gap: Math.max(0, capability.required - capability.available) }))
    .filter((capability) => capability.gap > 0)
    .sort((a, b) => b.gap - a.gap);
}

export function compileContributionSuggestions(state) {
  const existingCapabilities = new Set(
    (state.contributions || []).flatMap((contribution) => contribution.capabilityIds || [])
  );
  const gaps = capabilityGaps(state);
  const prioritized = gaps.length ? gaps : (state.capabilities || []).filter((capability) => !existingCapabilities.has(capability.id));
  return prioritized.slice(0, 4).map((capability) => ({
    title: `Renforcer : ${capability.name}`,
    description: `Produire un livrable vérifiable qui réduit l’écart de capacité « ${capability.name} » pour la mission.`,
    ownerId: "",
    capabilityIds: [capability.id],
    status: "planned",
    humanRole: "Définir le livrable, exercer le jugement et accepter le résultat",
    aiUse: "Assistant local utilisé uniquement pour proposer cette décomposition",
    effort: "À estimer",
    evidence: null,
    validation: null
  }));
}

export function claimLevel(contribution) {
  if (contribution.validation?.decision === "accepted") return "validated";
  if (contribution.evidence) return "demonstrated";
  if (contribution.status && contribution.status !== "planned") return "observed";
  return "declared";
}

export function addActivity(state, type, text, actor = "SOLOS") {
  state.activity.unshift({ id: uid("event"), type, text, actor, at: now() });
}

export function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(typeof value === "string" ? value : canonicalize(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildProofBundle(state) {
  let previousHash = "GENESIS";
  const ledger = [];
  for (const event of [...(state.activity || [])].reverse()) {
    const entry = { event, previousHash };
    const hash = await sha256Hex(entry);
    ledger.push({ ...entry, hash });
    previousHash = hash;
  }
  const payload = {
    schema: "https://uni.4prevolution.org/schemas/proof-bundle/v0.1",
    createdAt: now(),
    mission: state.mission,
    capabilities: state.capabilities,
    contributions: state.contributions,
    ledger,
    ledgerHead: previousHash
  };
  return { payload, checksum: await sha256Hex(payload), algorithm: "SHA-256" };
}

export async function verifyProofBundle(bundle) {
  if (!bundle?.payload || !bundle?.checksum || bundle.algorithm !== "SHA-256") return false;
  if (await sha256Hex(bundle.payload) !== bundle.checksum) return false;
  let previousHash = "GENESIS";
  for (const entry of bundle.payload.ledger || []) {
    if (entry.previousHash !== previousHash) return false;
    const expected = await sha256Hex({ event: entry.event, previousHash: entry.previousHash });
    if (entry.hash !== expected) return false;
    previousHash = entry.hash;
  }
  return previousHash === bundle.payload.ledgerHead;
}

export function buildCredentialDrafts(state) {
  return (state.contributions || [])
    .filter((contribution) => contribution.validation?.decision === "accepted")
    .map((contribution) => {
      const person = state.people.find((candidate) => candidate.id === contribution.ownerId);
      const capabilities = contribution.capabilityIds
        .map((id) => state.capabilities.find((capability) => capability.id === id)?.name)
        .filter(Boolean);
      return {
        "@context": [
          "https://www.w3.org/ns/credentials/v2",
          "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json"
        ],
        id: `urn:uuid:${uid("credential")}`,
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        name: `Contribution validée — ${contribution.title}`,
        issuer: {
          id: "https://github.com/4prevolution-lab/UNI",
          type: ["Profile"],
          name: state.mission.owner
        },
        validFrom: contribution.validation.validatedAt || now(),
        credentialSubject: {
          id: `urn:uni:person:${person?.id || contribution.ownerId || "unassigned"}`,
          type: ["AchievementSubject"],
          achievement: {
            id: `urn:uni:achievement:${contribution.id}`,
            type: ["Achievement"],
            name: contribution.title,
            description: `Contribution à la mission « ${state.mission.title} » démontrant : ${capabilities.join(", ")}.`,
            criteria: { narrative: contribution.validation.rationale || "Validation humaine documentée dans UNI." }
          }
        },
        evidence: [{
          id: contribution.evidence?.reference || `urn:uni:evidence:${contribution.id}`,
          type: ["Evidence"],
          narrative: contribution.evidence?.note || "Preuve référencée dans UNI Mission Lab."
        }],
        credentialStatus: {
          type: "UNISigningStatus",
          status: "unsignedDraft",
          notice: "Brouillon portable non signé. Une vérification cryptographique d’émetteur reste requise."
        }
      };
    });
}

export function evaluatePilot(pilot) {
  const checks = [
    { id: "community", label: "Communauté existante identifiée", pass: String(pilot.community || "").trim().length >= 3 },
    { id: "participants", label: "Groupe de 15 à 40 personnes", pass: Number(pilot.participants) >= 15 && Number(pilot.participants) <= 40 },
    { id: "owner", label: "Responsable humain nommé", pass: String(pilot.owner || "").trim().length >= 2 },
    { id: "problem", label: "Problème concret décrit", pass: String(pilot.problem || "").trim().length >= 20 },
    { id: "beneficiary", label: "Bénéficiaire identifiable", pass: String(pilot.beneficiaries || "").trim().length >= 3 },
    { id: "outcome", label: "Résultat mesurable défini", pass: String(pilot.outcome || "").trim().length >= 20 },
    { id: "duration", label: "Durée de quatre à huit semaines", pass: Number(pilot.durationWeeks) >= 4 && Number(pilot.durationWeeks) <= 8 },
    { id: "participation", label: "Nature de la participation explicite", pass: ["bénévole", "éducative", "rémunérée", "hybride"].includes(pilot.participation) },
    { id: "consent", label: "Consentement et retrait prévus", pass: Boolean(pilot.consentPlan) },
    { id: "validation", label: "Méthode de validation humaine prévue", pass: String(pilot.validationMethod || "").trim().length >= 10 }
  ];
  const passed = checks.filter((check) => check.pass).length;
  return {
    checks,
    passed,
    total: checks.length,
    ready: passed === checks.length,
    status: passed === checks.length ? "ready" : passed >= 7 ? "nearly-ready" : "not-ready"
  };
}

export function pilotToMission(pilot) {
  const start = pilot.startDate ? new Date(`${pilot.startDate}T12:00:00`) : new Date();
  const deadline = new Date(start);
  deadline.setDate(deadline.getDate() + Number(pilot.durationWeeks || 6) * 7);
  return {
    id: uid("mission"),
    title: pilot.missionTitle || "Mission pilote UNI",
    outcome: pilot.outcome,
    beneficiaries: pilot.beneficiaries,
    owner: pilot.owner,
    participation: pilot.participation,
    deadline: deadline.toISOString().slice(0, 10),
    status: "active",
    successCriteria: String(pilot.successCriteria || pilot.outcome).split("\n").map((line) => line.trim()).filter(Boolean),
    stopConditions: String(pilot.stopConditions || "Risques supérieurs à la valeur observée").split("\n").map((line) => line.trim()).filter(Boolean),
    pilot: {
      community: pilot.community,
      participants: Number(pilot.participants),
      durationWeeks: Number(pilot.durationWeeks),
      language: pilot.language || "fr",
      validationMethod: pilot.validationMethod,
      consentPlan: Boolean(pilot.consentPlan)
    },
    createdAt: now()
  };
}

export function buildGoalOSExport(state) {
  const metrics = missionMetrics(state);
  return {
    schema: "https://uni.4prevolution.org/schemas/goalos-bridge/v0.1",
    exportedAt: now(),
    source: { system: "UNI Mission Lab", version: state.version },
    mission: {
      id: state.mission.id,
      name: state.mission.title,
      objective: state.mission.outcome,
      owner: state.mission.owner,
      deadline: state.mission.deadline,
      status: state.mission.status,
      successCriteria: state.mission.successCriteria,
      stopConditions: state.mission.stopConditions
    },
    proofPosture: {
      evidenceRate: metrics.evidenceRate,
      validationRate: metrics.validationRate,
      threshold: state.goalos.proofThreshold,
      ready: metrics.evidenceRate >= state.goalos.proofThreshold
    },
    capabilities: state.capabilities.map((capability) => ({
      id: capability.id,
      name: capability.name,
      current: capability.available,
      target: capability.required,
      disposition: capability.available >= capability.required ? "PRESERVE" : "UPGRADE"
    })),
    contributions: state.contributions.map((contribution) => ({
      id: contribution.id,
      name: contribution.title,
      owner: state.people.find((person) => person.id === contribution.ownerId)?.name || "Non assigné",
      status: contribution.status.toUpperCase(),
      claimLevel: claimLevel(contribution),
      proof: contribution.evidence?.reference || null,
      validation: contribution.validation || null,
      aiUse: contribution.aiUse
    }))
  };
}
