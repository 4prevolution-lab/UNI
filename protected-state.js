import { normalizeState, now } from "./core.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const encoded = (value) => encodeURIComponent(value);
const latest = (rows) => [...rows].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] || null;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function newUuid() {
  return crypto.randomUUID();
}

export function ensureProtectedIds(state) {
  const capabilityIds = new Map();
  for (const capability of state.capabilities) {
    if (!uuidPattern.test(capability.id)) {
      const replacement = newUuid();
      capabilityIds.set(capability.id, replacement);
      capability.id = replacement;
    }
  }
  const participantIds = new Map();
  for (const person of state.people) {
    if (!uuidPattern.test(person.id)) {
      const replacement = newUuid();
      participantIds.set(person.id, replacement);
      person.id = replacement;
    }
    person.capabilities = (person.capabilities || []).map((id) => capabilityIds.get(id) || id);
  }
  for (const contribution of state.contributions) {
    if (!uuidPattern.test(contribution.id)) contribution.id = newUuid();
    contribution.ownerId = participantIds.get(contribution.ownerId) || contribution.ownerId || null;
    contribution.capabilityIds = (contribution.capabilityIds || []).map((id) => capabilityIds.get(id) || id);
  }
  for (const event of state.activity) {
    if (!uuidPattern.test(event.id)) event.id = newUuid();
  }
  return state;
}

export async function loadProtectedState(runtime, workspaceId, missionId) {
  const filter = `workspace_id=eq.${encoded(workspaceId)}`;
  const [missions, capabilities, participants, contributions, evidence, validations, audits] = await Promise.all([
    runtime.select("missions", `id=eq.${encoded(missionId)}&${filter}&select=*`),
    runtime.select("capabilities", `mission_id=eq.${encoded(missionId)}&${filter}&select=*&order=created_at.asc`),
    runtime.select("participants", `mission_id=eq.${encoded(missionId)}&${filter}&select=*&order=created_at.asc`),
    runtime.select("contributions", `mission_id=eq.${encoded(missionId)}&${filter}&select=*&order=created_at.asc`),
    runtime.select("evidence", `${filter}&select=*&order=created_at.asc`),
    runtime.select("validations", `${filter}&select=*&order=created_at.asc`),
    runtime.select("audit_events", `${filter}&select=*&order=created_at.asc`)
  ]);
  const mission = missions[0];
  if (!mission) throw new Error("Mission protégée introuvable ou non autorisée.");
  const contributionIds = new Set(contributions.map((item) => item.id));
  const relevantEvidence = evidence.filter((item) => contributionIds.has(item.contribution_id));
  const relevantValidations = validations.filter((item) => contributionIds.has(item.contribution_id));
  const peopleById = new Map(participants.map((item) => [item.id, item.display_name]));

  const state = normalizeState({
    schema: "https://uni.4prevolution.org/schemas/mission-lab-state/v0.1",
    version: "0.1",
    settings: mission.settings || {},
    mission: {
      id: mission.id,
      title: mission.title,
      outcome: mission.outcome,
      beneficiaries: mission.beneficiaries,
      owner: peopleById.get(mission.owner_id) || "Responsable de mission",
      participation: mission.participation,
      deadline: mission.deadline,
      status: mission.status,
      successCriteria: mission.success_criteria || [],
      stopConditions: mission.stop_conditions || [],
      completedCriteria: mission.completed_criteria || [],
      createdAt: mission.created_at
    },
    capabilities: capabilities.map((item) => ({
      id: item.id, name: item.name, required: Number(item.required_level), available: Number(item.available_level)
    })),
    people: participants.map((item) => ({
      id: item.id,
      name: item.display_name,
      role: item.role_label,
      availability: item.availability,
      consent: Boolean(item.consent_at) && !item.withdrawn_at,
      consentAt: item.consent_at,
      withdrawnAt: item.withdrawn_at,
      visibility: item.visibility,
      capabilities: item.capability_ids || []
    })),
    contributions: contributions.map((item) => {
      const proof = latest(relevantEvidence.filter((entry) => entry.contribution_id === item.id));
      const validation = latest(relevantValidations.filter((entry) => entry.contribution_id === item.id));
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        ownerId: item.participant_id,
        capabilityIds: item.capability_ids || [],
        status: item.status,
        humanRole: item.human_role,
        aiUse: item.ai_use,
        effort: item.effort,
        evidence: proof ? {
          type: proof.evidence_type, reference: proof.reference, note: proof.note, addedAt: proof.created_at
        } : null,
        validation: validation ? {
          decision: validation.decision,
          validator: "Validateur autorisé",
          rationale: validation.rationale,
          conflict: validation.conflict_declared,
          validatedAt: validation.created_at
        } : null
      };
    }),
    activity: audits.map((item) => ({
      id: item.id,
      type: item.event_type,
      text: item.payload?.text || item.event_type,
      actor: item.payload?.actor || "Membre autorisé",
      at: item.created_at
    })),
    goalos: mission.goalos || {}
  });
  Object.defineProperty(state, "__protected", {
    value: { workspaceId, missionId, missionOwnerId: mission.owner_id },
    enumerable: false
  });
  return state;
}

export async function syncProtectedState(runtime, state, context) {
  ensureProtectedIds(state);
  const { workspaceId, userId, missionOwnerId = userId } = context;
  const missionId = state.mission.id;

  await runtime.upsert("missions", [{
    id: missionId,
    workspace_id: workspaceId,
    title: state.mission.title,
    outcome: state.mission.outcome,
    beneficiaries: state.mission.beneficiaries || "",
    owner_id: missionOwnerId,
    participation: state.mission.participation,
    status: state.mission.status,
    deadline: state.mission.deadline || null,
    success_criteria: state.mission.successCriteria || [],
    stop_conditions: state.mission.stopConditions || [],
    completed_criteria: state.mission.completedCriteria || [],
    settings: state.settings || {},
    goalos: state.goalos || {}
  }]);

  if (state.capabilities.length) {
    await runtime.upsert("capabilities", state.capabilities.map((item) => ({
      id: item.id,
      workspace_id: workspaceId,
      mission_id: missionId,
      name: item.name,
      required_level: item.required,
      available_level: item.available
    })));
  }
  if (state.people.length) {
    await runtime.upsert("participants", state.people.map((item) => ({
      id: item.id,
      workspace_id: workspaceId,
      mission_id: missionId,
      display_name: item.name,
      role_label: item.role || "",
      availability: item.availability || "",
      visibility: item.visibility || "mission",
      consent_at: item.consent ? (item.consentAt || now()) : null,
      withdrawn_at: item.consent ? null : (item.withdrawnAt || now()),
      capability_ids: item.capabilities || []
    })));
  }
  if (state.contributions.length) {
    const existing = await runtime.select(
      "contributions",
      `mission_id=eq.${encoded(missionId)}&workspace_id=eq.${encoded(workspaceId)}&select=id`
    );
    const existingIds = new Set(existing.map((item) => item.id));
    const rows = state.contributions.map((item) => ({
      id: item.id,
      workspace_id: workspaceId,
      mission_id: missionId,
      participant_id: item.ownerId || null,
      title: item.title,
      description: item.description || "",
      status: item.status,
      human_role: item.humanRole || "",
      ai_use: item.aiUse || "Aucun",
      effort: item.effort || "",
      capability_ids: item.capabilityIds || []
    }));
    const additions = rows
      .filter((item) => !existingIds.has(item.id))
      .map((item) => ({ ...item, created_by: userId }));
    if (additions.length) await runtime.insert("contributions", additions);
    await Promise.all(rows.filter((item) => existingIds.has(item.id)).map(({ id, ...values }) => (
      runtime.update("contributions", id, values)
    )));
  }

  const filter = `workspace_id=eq.${encoded(workspaceId)}&select=*&order=created_at.asc`;
  const [remoteEvidence, remoteValidations, remoteAudits] = await Promise.all([
    runtime.select("evidence", filter),
    runtime.select("validations", filter),
    runtime.select("audit_events", filter)
  ]);
  for (const contribution of state.contributions) {
    const previousProof = latest(remoteEvidence.filter((item) => item.contribution_id === contribution.id));
    const proofShape = contribution.evidence && {
      evidence_type: contribution.evidence.type,
      reference: contribution.evidence.reference,
      note: contribution.evidence.note || ""
    };
    const previousProofShape = previousProof && {
      evidence_type: previousProof.evidence_type,
      reference: previousProof.reference,
      note: previousProof.note || ""
    };
    let evidenceId = previousProof?.id || null;
    if (proofShape && !same(proofShape, previousProofShape)) {
      const inserted = await runtime.insert("evidence", [{
        workspace_id: workspaceId,
        contribution_id: contribution.id,
        ...proofShape,
        submitted_by: userId
      }]);
      evidenceId = inserted[0]?.id || evidenceId;
    }

    const previousValidation = latest(remoteValidations.filter((item) => item.contribution_id === contribution.id));
    const validationShape = contribution.validation && {
      decision: contribution.validation.decision,
      rationale: contribution.validation.rationale || "Décision enregistrée",
      conflict_declared: Boolean(contribution.validation.conflict)
    };
    const previousValidationShape = previousValidation && {
      decision: previousValidation.decision,
      rationale: previousValidation.rationale,
      conflict_declared: previousValidation.conflict_declared
    };
    if (validationShape && !same(validationShape, previousValidationShape)) {
      await runtime.insert("validations", [{
        workspace_id: workspaceId,
        contribution_id: contribution.id,
        evidence_id: evidenceId,
        validator_id: userId,
        ...validationShape,
        supersedes_id: previousValidation?.id || null
      }]);
    }
  }

  const knownAuditIds = new Set(remoteAudits.map((item) => item.id));
  const newEvents = state.activity.filter((item) => !knownAuditIds.has(item.id));
  if (newEvents.length) {
    await runtime.insert("audit_events", newEvents.map((item) => ({
      id: item.id,
      workspace_id: workspaceId,
      actor_id: userId,
      event_type: item.type,
      subject_type: "mission",
      subject_id: missionId,
      payload: { text: item.text, actor: item.actor, mission_id: missionId },
      created_at: item.at || now()
    })));
  }
  return state;
}
