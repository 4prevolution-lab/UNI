import { verifyProofBundle } from "./core.js";

const $ = (selector) => document.querySelector(selector);
const input = $("#bundleInput");
const dropZone = $("#dropZone");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

async function inspect(file) {
  const result = $("#verificationResult");
  const stateNode = $("#verificationState");
  const details = $("#verificationDetails");
  result.hidden = false;
  stateNode.className = "verification-state pending";
  stateNode.innerHTML = "<strong>Vérification en cours…</strong><span>Calcul SHA‑256 dans le navigateur</span>";
  details.innerHTML = "";
  try {
    const bundle = JSON.parse(await file.text());
    const valid = await verifyProofBundle(bundle);
    stateNode.className = `verification-state ${valid ? "valid" : "invalid"}`;
    stateNode.innerHTML = `<strong>${valid ? "✓ ProofBundle intact" : "× ProofBundle non valide"}</strong><span>${valid ? "Le contenu et le journal correspondent à l’empreinte fournie." : "Le contenu a été modifié ou le format est incomplet."}</span>`;
    details.innerHTML = `
      <article><span>Mission</span><b>${escapeHtml(bundle.payload?.mission?.title || "Inconnue")}</b></article>
      <article><span>Création</span><b>${escapeHtml(bundle.payload?.createdAt ? new Date(bundle.payload.createdAt).toLocaleString("fr-CA") : "Inconnue")}</b></article>
      <article><span>Événements</span><b>${escapeHtml(bundle.payload?.ledger?.length ?? 0)}</b></article>
      <article><span>Algorithme</span><b>${escapeHtml(bundle.algorithm || "Inconnu")}</b></article>
      <article class="wide"><span>Checksum</span><code>${escapeHtml(bundle.checksum || "Absent")}</code></article>`;
  } catch (error) {
    stateNode.className = "verification-state invalid";
    stateNode.innerHTML = `<strong>× Fichier illisible</strong><span>${escapeHtml(error.message)}</span>`;
  }
}

$("#chooseBundle").addEventListener("click", () => input.click());
input.addEventListener("change", () => input.files[0] && inspect(input.files[0]));
for (const type of ["dragenter", "dragover"]) {
  dropZone.addEventListener(type, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });
}
for (const type of ["dragleave", "drop"]) {
  dropZone.addEventListener(type, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
  });
}
dropZone.addEventListener("drop", (event) => {
  const file = event.dataTransfer.files[0];
  if (file) inspect(file);
});
