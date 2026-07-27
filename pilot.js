import { addActivity, createDemoState, evaluatePilot, normalizeState, pilotToMission } from "./core.js";

const STORE = "uni-mission-lab-v0.1";
const $ = (selector) => document.querySelector(selector);
const form = $("#pilotForm");
let currentPilot = {};
let currentEvaluation = evaluatePilot(currentPilot);

function serialize() {
  const data = new FormData(form);
  return {
    community: data.get("community"),
    participants: Number(data.get("participants")),
    owner: data.get("owner"),
    language: data.get("language"),
    missionTitle: data.get("missionTitle"),
    problem: data.get("problem"),
    outcome: data.get("outcome"),
    beneficiaries: data.get("beneficiaries"),
    durationWeeks: Number(data.get("durationWeeks")),
    startDate: data.get("startDate"),
    participation: data.get("participation"),
    successCriteria: data.get("successCriteria"),
    stopConditions: data.get("stopConditions"),
    validationMethod: data.get("validationMethod"),
    consentPlan: data.get("consentPlan") === "on"
  };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function render() {
  currentPilot = serialize();
  currentEvaluation = evaluatePilot(currentPilot);
  $("#readinessValue").textContent = `${currentEvaluation.passed}/${currentEvaluation.total}`;
  $("#readinessTitle").textContent = currentEvaluation.ready ? "Prêt à constituer" : currentEvaluation.status === "nearly-ready" ? "Presque prêt" : "Pilote incomplet";
  $("#readinessNote").textContent = currentEvaluation.ready ? "Les dix conditions explicites sont satisfaites. Une revue humaine finale reste requise." : `${currentEvaluation.total - currentEvaluation.passed} condition${currentEvaluation.total - currentEvaluation.passed > 1 ? "s" : ""} à compléter avant le lancement.`;
  $("#readinessList").innerHTML = currentEvaluation.checks.map((check) => `<div class="readiness-check ${check.pass ? "pass" : ""}"><i>${check.pass ? "✓" : "○"}</i><span>${escapeHtml(check.label)}</span></div>`).join("");
  $("#launchPilot").disabled = !currentEvaluation.ready;
}

function charterMarkdown() {
  const evaluation = evaluatePilot(currentPilot);
  return `# Charte de pilote UNI

Générée le ${new Date().toLocaleString("fr-CA")}

## Communauté

- Communauté : ${currentPilot.community || "À définir"}
- Participants : ${currentPilot.participants || "À définir"}
- Responsable humain : ${currentPilot.owner || "À définir"}
- Langue : ${currentPilot.language || "À définir"}

## Mission

- Titre : ${currentPilot.missionTitle || "À définir"}
- Problème : ${currentPilot.problem || "À définir"}
- Résultat mesurable : ${currentPilot.outcome || "À définir"}
- Bénéficiaires : ${currentPilot.beneficiaries || "À définir"}
- Durée : ${currentPilot.durationWeeks || "À définir"} semaines
- Participation : ${currentPilot.participation || "À définir"}

## Critères de succès

${String(currentPilot.successCriteria || "").split("\n").filter(Boolean).map((line) => `- ${line}`).join("\n") || "- À définir"}

## Conditions d’arrêt

${String(currentPilot.stopConditions || "").split("\n").filter(Boolean).map((line) => `- ${line}`).join("\n") || "- À définir"}

## Confiance

- Consentement et retrait prévus : ${currentPilot.consentPlan ? "Oui" : "Non"}
- Méthode de validation : ${currentPilot.validationMethod || "À définir"}

## Conditions de lancement

${evaluation.checks.map((check) => `- [${check.pass ? "x" : " "}] ${check.label}`).join("\n")}

Statut : ${evaluation.ready ? "PRÊT POUR REVUE HUMAINE FINALE" : "INCOMPLET"}

> Cette charte ne remplace pas une revue juridique, éthique ou sectorielle lorsque la mission l’exige.
`;
}

function download(name, content) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

form.addEventListener("input", render);
form.addEventListener("change", render);
$("#exportCharter").addEventListener("click", () => {
  currentPilot = serialize();
  download("uni-charte-pilote.md", charterMarkdown());
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  currentPilot = serialize();
  currentEvaluation = evaluatePilot(currentPilot);
  if (!currentEvaluation.ready) return;
  let state;
  try {
    state = normalizeState(JSON.parse(localStorage.getItem(STORE)));
  } catch {
    state = createDemoState();
  }
  state.mission = pilotToMission(currentPilot);
  state.capabilities = [];
  state.people = [];
  state.contributions = [];
  state.activity = [];
  addActivity(state, "pilot.constituted", `Pilote constitué pour ${currentPilot.community}.`, currentPilot.owner);
  localStorage.setItem(STORE, JSON.stringify(state));
  window.location.href = "./#mission";
});

render();
