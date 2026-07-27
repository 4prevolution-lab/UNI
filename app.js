import {
  addActivity,
  buildGoalOSExport,
  capabilityGaps,
  claimLevel,
  createDemoState,
  missionMetrics,
  normalizeState,
  now,
  uid
} from "./core.js";

const STORE = "uni-mission-lab-v0.1";
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
let state = load();
let currentRoute = "dashboard";
let modalHandler = null;
let saveTimer;

function load() {
  try {
    const stored = localStorage.getItem(STORE);
    return stored ? normalizeState(JSON.parse(stored)) : createDemoState();
  } catch {
    return createDemoState();
  }
}

function save(message = "Modifications enregistrées.") {
  localStorage.setItem(STORE, JSON.stringify(state));
  $("#saveState").textContent = "● Sauvegarde…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    $("#saveState").textContent = "● Sauvegardé localement";
  }, 450);
  if (message) toast("UNI Mission Lab", message);
}

function toast(title, message) {
  const node = $("#toast");
  $("strong", node).textContent = title;
  $("span", node).textContent = message;
  node.hidden = false;
  clearTimeout(node.timer);
  node.timer = setTimeout(() => (node.hidden = true), 3200);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function initials(name) {
  return String(name || "?").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function formatDate(value, options = { day: "numeric", month: "short" }) {
  if (!value) return "Sans date";
  return new Intl.DateTimeFormat("fr-CA", options).format(new Date(value));
}

function download(name, data) {
  const blob = new Blob([typeof data === "string" ? data : JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function personName(id) {
  return state.people.find((person) => person.id === id)?.name || "Non assigné";
}

function capabilityNames(ids = []) {
  return ids.map((id) => state.capabilities.find((capability) => capability.id === id)?.name).filter(Boolean);
}

function route(name) {
  currentRoute = name;
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === `view-${name}`));
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.route === name));
  $(".sidebar").classList.remove("open");
  window.location.hash = name;
  window.scrollTo({ top: 0, behavior: "smooth" });
  render();
}

function render() {
  $("#topMissionTitle").textContent = state.mission.title;
  renderDashboard();
  renderMission();
  renderCapabilities();
  renderPeople();
  renderContributions();
  renderProof();
  renderOutcomes();
  renderGoalOS();
}

function metric(label, value, note, trend = "") {
  return `<article class="metric">${trend ? `<span class="trend">${escapeHtml(trend)}</span>` : ""}<span class="eyebrow">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`;
}

function renderDashboard() {
  const metrics = missionMetrics(state);
  $("#heroTitle").textContent = state.mission.title;
  $("#heroOutcome").textContent = state.mission.outcome;
  $("#heroMeta").innerHTML = `
    <span class="chip live">${escapeHtml(state.mission.status)}</span>
    <span class="chip">Responsable · ${escapeHtml(state.mission.owner)}</span>
    <span class="chip">${escapeHtml(state.mission.participation)}</span>
    <span class="chip">Échéance · ${formatDate(state.mission.deadline, { day: "numeric", month: "long", year: "numeric" })}</span>`;
  $("#ringValue").textContent = `${metrics.evidenceRate}%`;
  $(".ring-value").style.strokeDashoffset = String(314 - (314 * metrics.evidenceRate / 100));
  $("#metricGrid").innerHTML =
    metric("CONTRIBUTIONS", metrics.total, `${metrics.active} actives`, "mission") +
    metric("PREUVES", `${metrics.evidenceRate}%`, `${metrics.withEvidence}/${metrics.total} documentées`, metrics.evidenceRate >= 80 ? "seuil atteint" : "à renforcer") +
    metric("VALIDATIONS", `${metrics.validationRate}%`, `${metrics.validated} acceptée${metrics.validated > 1 ? "s" : ""}`, "humaines") +
    metric("CONSENTEMENT", `${metrics.consentRate}%`, `${state.people.length} participants`, "explicite");

  $("#dashboardContributions").innerHTML = state.contributions.slice(0, 4).map((item) => {
    const progress = item.status === "validated" ? 100 : item.status === "review" ? 70 : item.status === "active" ? 42 : 10;
    return `<article class="contribution-row">
      <div><b>${escapeHtml(item.title)}</b><small>${escapeHtml(personName(item.ownerId))} · ${escapeHtml(capabilityNames(item.capabilityIds).join(", "))}</small></div>
      <div class="progress"><i style="width:${progress}%"></i></div>
      <span class="status ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span>
    </article>`;
  }).join("") || `<p class="lead">Aucune contribution.</p>`;

  const gaps = capabilityGaps(state);
  $("#gapList").innerHTML = gaps.slice(0, 4).map((gap) => `<article class="stack-item"><header><b>${escapeHtml(gap.name)}</b><span class="status review">−${gap.gap}</span></header><small>${gap.available} disponible · ${gap.required} nécessaire</small></article>`).join("") || `<article class="stack-item"><b>Aucune lacune critique</b><small>La capacité déclarée couvre les besoins.</small></article>`;
  $("#proofPosture").innerHTML = `<div class="posture-bars">
    ${postureBar("Preuves jointes", metrics.evidenceRate)}
    ${postureBar("Validations humaines", metrics.validationRate)}
    ${postureBar("Consentement", metrics.consentRate)}
  </div><div class="posture-note">${metrics.evidenceRate >= state.goalos.proofThreshold ? "Le seuil de preuve GoalOS est atteint." : `Dette de preuve ouverte : ${state.goalos.proofThreshold - metrics.evidenceRate} points avant le seuil GoalOS.`}</div>`;
  $("#activityFeed").innerHTML = state.activity.slice(0, 6).map((event) => `<article class="timeline-item"><b>${escapeHtml(event.text)}</b><small>${escapeHtml(event.actor)} · ${formatDate(event.at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</small></article>`).join("");
}

function postureBar(label, value) {
  return `<div class="posture-item"><header><span>${escapeHtml(label)}</span><b>${value}%</b></header><div class="progress"><i style="width:${value}%"></i></div></div>`;
}

function renderMission() {
  const form = $("#missionForm");
  for (const key of ["title", "outcome", "beneficiaries", "owner", "participation", "deadline"]) {
    form.elements[key].value = state.mission[key] || "";
  }
  form.elements.successCriteria.value = state.mission.successCriteria.join("\n");
  form.elements.stopConditions.value = state.mission.stopConditions.join("\n");
}

function renderCapabilities() {
  $("#capabilityGrid").innerHTML = state.capabilities.map((capability) => {
    const coverage = capability.required ? Math.min(100, Math.round(capability.available / capability.required * 100)) : 100;
    return `<article class="capability-card" data-capability="${escapeHtml(capability.id)}">
      <header><h3>${escapeHtml(capability.name)}</h3><span class="status ${coverage >= 100 ? "validated" : "review"}">${coverage >= 100 ? "couverte" : `écart ${capability.required - capability.available}`}</span></header>
      <div class="progress"><i style="width:${coverage}%"></i></div>
      <div class="capability-numbers"><div><small>Disponible</small><strong>${capability.available}</strong></div><div><small>Nécessaire</small><strong>${capability.required}</strong></div></div>
    </article>`;
  }).join("");
  $$("[data-capability]").forEach((card) => card.addEventListener("click", () => openCapability(card.dataset.capability)));
}

function renderPeople() {
  $("#peopleGrid").innerHTML = state.people.map((person) => `<article class="person-card">
    <div class="person-top"><span class="avatar">${escapeHtml(initials(person.name))}</span><div><h3>${escapeHtml(person.name)}</h3><small>${escapeHtml(person.role)}</small></div></div>
    <div class="person-meta"><span>${escapeHtml(person.availability)}</span><span>Visibilité · ${escapeHtml(person.visibility)}</span></div>
    <div class="tag-list">${capabilityNames(person.capabilities).map((name) => `<span class="tag">${escapeHtml(name)}</span>`).join("")}</div>
    <div class="consent">${person.consent ? "● Consentement actif" : "○ Consentement requis"}</div>
  </article>`).join("");
}

function renderContributions() {
  const columns = [
    ["planned", "PLANIFIÉE"],
    ["active", "EN COURS"],
    ["review", "EN RÉVISION"],
    ["validated", "VALIDÉE"]
  ];
  $("#contributionBoard").innerHTML = columns.map(([status, label]) => {
    const items = state.contributions.filter((item) => item.status === status);
    return `<section class="kanban-column"><header><span>${label}</span><b>${items.length}</b></header><div class="kanban-cards">${items.map((item) => `
      <article class="kanban-card" data-contribution="${escapeHtml(item.id)}">
        <span class="status ${status}">${escapeHtml(claimLevel(item))}</span>
        <h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p>
        <div class="tag-list">${capabilityNames(item.capabilityIds).slice(0, 2).map((name) => `<span class="tag">${escapeHtml(name)}</span>`).join("")}</div>
        <footer><span class="mini-avatar">${escapeHtml(initials(personName(item.ownerId)))}</span><small>${escapeHtml(item.effort || "Effort à définir")}</small></footer>
      </article>`).join("")}</div></section>`;
  }).join("");
  $$("[data-contribution]").forEach((card) => card.addEventListener("click", () => openContribution(card.dataset.contribution)));
}

function renderProof() {
  $("#proofList").innerHTML = state.contributions.map((item) => {
    const level = claimLevel(item);
    return `<article class="proof-row">
      <div><h3>${escapeHtml(item.title)}</h3><small>${escapeHtml(personName(item.ownerId))}</small></div>
      <span class="status ${level}">${escapeHtml(level)}</span>
      <div class="proof-ref"><b>${escapeHtml(item.evidence?.reference || "Aucune preuve")}</b><br><small>${escapeHtml(item.validation?.validator || "Non validée")}</small></div>
      <button class="quiet" data-proof="${escapeHtml(item.id)}">${item.evidence ? "Examiner" : "Ajouter une preuve"}</button>
    </article>`;
  }).join("");
  $$("[data-proof]").forEach((button) => button.addEventListener("click", () => openProof(button.dataset.proof)));
}

function renderOutcomes() {
  const metrics = missionMetrics(state);
  $("#outcomeMetrics").innerHTML =
    metric("PROGRESSION PREUVE", `${metrics.evidenceRate}%`, "objectif ≥ 80 %") +
    metric("CONTRIBUTIONS VALIDÉES", metrics.validated, `sur ${metrics.total}`) +
    metric("CAPACITÉS DÉMONTRÉES", new Set(state.contributions.filter((item) => item.evidence).flatMap((item) => item.capabilityIds)).size, "contextuelles") +
    metric("LACUNES ACTIVES", capabilityGaps(state).length, "à traiter");
  const completed = state.mission.completedCriteria || [];
  $("#criteriaList").innerHTML = state.mission.successCriteria.map((criterion, index) => `<label class="check-item"><input type="checkbox" data-criterion="${index}" ${completed.includes(index) ? "checked" : ""}><span>${escapeHtml(criterion)}</span></label>`).join("");
  $$("[data-criterion]").forEach((input) => input.addEventListener("change", () => {
    const index = Number(input.dataset.criterion);
    state.mission.completedCriteria = state.mission.completedCriteria || [];
    state.mission.completedCriteria = input.checked ? [...new Set([...state.mission.completedCriteria, index])] : state.mission.completedCriteria.filter((item) => item !== index);
    addActivity(state, "outcome.updated", `Critère de succès ${input.checked ? "confirmé" : "rouvert"} : ${state.mission.successCriteria[index]}`);
    save();
    renderDashboard();
  }));
  const validated = state.contributions.filter((item) => item.validation?.decision === "accepted");
  $("#credentialList").innerHTML = validated.map((item) => `<article class="stack-item"><header><b>${escapeHtml(personName(item.ownerId))}</b><span class="status validated">validée</span></header><small>A contribué à « ${escapeHtml(state.mission.title)} » en démontrant ${escapeHtml(capabilityNames(item.capabilityIds).join(", "))}, selon ${escapeHtml(item.evidence?.reference)}.</small></article>`).join("") || `<article class="stack-item"><small>Aucune attestation avant validation humaine.</small></article>`;
}

function renderGoalOS() {
  $("#goalosPreview").textContent = JSON.stringify(buildGoalOSExport(state), null, 2);
}

function field(label, name, value = "", options = {}) {
  const className = options.wide ? "wide" : "";
  if (options.type === "textarea") return `<label class="${className}">${label}<textarea name="${name}" rows="${options.rows || 3}" ${options.required ? "required" : ""}>${escapeHtml(value)}</textarea></label>`;
  if (options.type === "select") return `<label class="${className}">${label}<select name="${name}">${options.choices.map(([key, text]) => `<option value="${escapeHtml(key)}" ${key === value ? "selected" : ""}>${escapeHtml(text)}</option>`).join("")}</select></label>`;
  return `<label class="${className}">${label}<input name="${name}" type="${options.type || "text"}" value="${escapeHtml(value)}" ${options.required ? "required" : ""}></label>`;
}

function openModal(eyebrow, title, body, handler, submitLabel = "Enregistrer") {
  $("#modalEyebrow").textContent = eyebrow;
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = body;
  $("#modalSubmit").textContent = submitLabel;
  modalHandler = handler;
  $("#modal").showModal();
}

function openCapability(id) {
  const current = state.capabilities.find((item) => item.id === id);
  openModal("CARTE DES CAPACITÉS", current ? "Modifier la capacité" : "Ajouter une capacité",
    field("Nom", "name", current?.name, { wide: true, required: true }) +
    field("Niveau disponible", "available", current?.available ?? 0, { type: "number" }) +
    field("Niveau nécessaire", "required", current?.required ?? 1, { type: "number" }),
    (data) => {
      if (current) Object.assign(current, { name: data.get("name"), available: Number(data.get("available")), required: Number(data.get("required")) });
      else state.capabilities.push({ id: uid("cap"), name: data.get("name"), available: Number(data.get("available")), required: Number(data.get("required")) });
      addActivity(state, "capability.updated", `Capacité mise à jour : ${data.get("name")}`);
    });
}

function openPerson() {
  const capabilityChecks = state.capabilities.map((capability) => `<label><input type="checkbox" name="capabilities" value="${escapeHtml(capability.id)}"> ${escapeHtml(capability.name)}</label>`).join("");
  openModal("ÉQUIPE", "Inviter une personne",
    field("Nom", "name", "", { required: true }) + field("Rôle", "role", "", { required: true }) +
    field("Disponibilité", "availability", "4 h/sem") +
    field("Visibilité", "visibility", "mission", { type: "select", choices: [["private", "Privée"], ["mission", "Mission seulement"], ["public", "Publique"]] }) +
    `<div class="wide"><label>Capacités</label><div class="tag-list">${capabilityChecks}</div></div>` +
    `<label class="wide"><span><input type="checkbox" name="consent"> Consentement volontaire confirmé</span></label>`,
    (data) => {
      const person = { id: uid("person"), name: data.get("name"), role: data.get("role"), availability: data.get("availability"), visibility: data.get("visibility"), consent: data.get("consent") === "on", capabilities: data.getAll("capabilities") };
      state.people.push(person);
      addActivity(state, "person.invited", `${person.name} a rejoint la mission avec une visibilité ${person.visibility}.`);
    });
}

function contributionFields(current = {}) {
  const people = [["", "Non assigné"], ...state.people.filter((person) => person.consent).map((person) => [person.id, person.name])];
  const selected = current.capabilityIds || [];
  return field("Titre", "title", current.title, { wide: true, required: true }) +
    field("Description", "description", current.description, { wide: true, type: "textarea" }) +
    field("Responsable", "ownerId", current.ownerId, { type: "select", choices: people }) +
    field("Statut", "status", current.status || "planned", { type: "select", choices: [["planned", "Planifiée"], ["active", "En cours"], ["review", "En révision"], ["validated", "Validée"]] }) +
    field("Rôle humain", "humanRole", current.humanRole, { wide: true }) +
    field("Usage de l’IA", "aiUse", current.aiUse || "Aucun", { wide: true }) +
    field("Effort estimé", "effort", current.effort || "4 h") +
    `<div><label>Capacités mobilisées</label><div class="tag-list">${state.capabilities.map((capability) => `<label><input type="checkbox" name="capabilityIds" value="${escapeHtml(capability.id)}" ${selected.includes(capability.id) ? "checked" : ""}> ${escapeHtml(capability.name)}</label>`).join("")}</div></div>`;
}

function openContribution(id) {
  const current = state.contributions.find((item) => item.id === id);
  openModal("CONTRIBUTION", current ? "Modifier la contribution" : "Nouvelle contribution", contributionFields(current), (data) => {
    const values = {
      title: data.get("title"),
      description: data.get("description"),
      ownerId: data.get("ownerId"),
      status: data.get("status"),
      humanRole: data.get("humanRole"),
      aiUse: data.get("aiUse"),
      effort: data.get("effort"),
      capabilityIds: data.getAll("capabilityIds")
    };
    if (current) Object.assign(current, values);
    else state.contributions.push({ id: uid("contrib"), ...values, evidence: null, validation: null });
    addActivity(state, "contribution.updated", `Contribution mise à jour : ${values.title}`);
  });
}

function openProof(id) {
  const contribution = state.contributions.find((item) => item.id === id);
  const evidence = contribution.evidence || {};
  const validation = contribution.validation || {};
  openModal("PREUVE ET VALIDATION", contribution.title,
    field("Type de preuve", "evidenceType", evidence.type || "document", { type: "select", choices: [["document", "Document"], ["link", "Lien"], ["dataset", "Jeu de données"], ["observation", "Observation"]] }) +
    field("Référence ou URL", "reference", evidence.reference, { required: true }) +
    field("Note de provenance", "note", evidence.note, { wide: true, type: "textarea" }) +
    field("Décision humaine", "decision", validation.decision || "pending", { type: "select", choices: [["pending", "En attente"], ["accepted", "Accepter"], ["revision", "Demander une révision"], ["rejected", "Refuser"]] }) +
    field("Validateur identifié", "validator", validation.validator) +
    field("Justification", "rationale", validation.rationale, { wide: true, type: "textarea" }) +
    `<label class="wide"><span><input type="checkbox" name="conflict" ${validation.conflict ? "checked" : ""}> Conflit d’intérêts déclaré</span></label>`,
    (data) => {
      contribution.evidence = { type: data.get("evidenceType"), reference: data.get("reference"), note: data.get("note"), addedAt: evidence.addedAt || now() };
      const decision = data.get("decision");
      contribution.validation = decision === "pending" ? null : { decision, validator: data.get("validator") || "Validateur non nommé", rationale: data.get("rationale"), conflict: data.get("conflict") === "on", validatedAt: now() };
      if (decision === "accepted") contribution.status = "validated";
      else if (decision === "revision") contribution.status = "review";
      addActivity(state, decision === "accepted" ? "validation.accepted" : "evidence.added", `${contribution.title} : ${decision === "accepted" ? "validation acceptée" : "preuve mise à jour"}.`, data.get("validator") || personName(contribution.ownerId));
    }, "Enregistrer la preuve");
}

$("#missionForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  Object.assign(state.mission, {
    title: data.get("title"),
    outcome: data.get("outcome"),
    beneficiaries: data.get("beneficiaries"),
    owner: data.get("owner"),
    participation: data.get("participation"),
    deadline: data.get("deadline"),
    successCriteria: data.get("successCriteria").split("\n").map((line) => line.trim()).filter(Boolean),
    stopConditions: data.get("stopConditions").split("\n").map((line) => line.trim()).filter(Boolean)
  });
  addActivity(state, "mission.constituted", "La constitution de mission a été mise à jour.");
  save("Constitution enregistrée.");
  render();
});

$("#modalForm").addEventListener("submit", (event) => {
  const submitter = event.submitter;
  if (!submitter || submitter.value === "cancel") return;
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  modalHandler?.(new FormData(event.currentTarget));
  $("#modal").close();
  save();
  render();
});

$$(".nav-item").forEach((item) => item.addEventListener("click", () => route(item.dataset.route)));
$$("[data-go]").forEach((item) => item.addEventListener("click", () => route(item.dataset.go)));
$("#menuButton").addEventListener("click", () => $(".sidebar").classList.toggle("open"));
$("#addCapability").addEventListener("click", () => openCapability());
$("#addPerson").addEventListener("click", openPerson);
$("#addContribution").addEventListener("click", () => openContribution());
$("#exportButton").addEventListener("click", () => download(`uni-mission-${state.mission.id}.json`, state));
$("#goalosExport").addEventListener("click", () => {
  state.goalos.lastExportAt = now();
  addActivity(state, "goalos.exported", "Un paquet d’intégration GoalOS a été exporté.");
  download(`uni-goalos-${state.mission.id}.json`, buildGoalOSExport(state));
  save("Paquet GoalOS exporté.");
  render();
});
$("#importButton").addEventListener("click", () => $("#importInput").click());
$("#importInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    state = normalizeState(JSON.parse(await file.text()));
    addActivity(state, "state.imported", `État importé depuis ${file.name}.`);
    save("Import réussi.");
    render();
  } catch (error) {
    toast("Import impossible", error.message);
  }
  event.target.value = "";
});
$("#resetDemo").addEventListener("click", () => {
  if (!confirm("Réinitialiser toutes les données locales avec la démonstration UNI?")) return;
  state = createDemoState();
  save("Démonstration réinitialisée.");
  render();
});

const hash = window.location.hash.slice(1);
if (["dashboard", "mission", "capabilities", "team", "contributions", "proof", "outcomes", "goalos"].includes(hash)) route(hash);
else render();
