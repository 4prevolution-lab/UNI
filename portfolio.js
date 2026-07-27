import { duplicateAsTemplate, normalizeState, portfolioSummaries, upsertPortfolio } from "./core.js";

const STATE_STORE = "uni-mission-lab-v0.1";
const PORTFOLIO_STORE = "uni-mission-portfolio-v0.1";
const $ = (selector) => document.querySelector(selector);
let portfolio = loadPortfolio();

function loadPortfolio() {
  let stored;
  try { stored = JSON.parse(localStorage.getItem(PORTFOLIO_STORE)); } catch { stored = null; }
  try {
    const current = normalizeState(JSON.parse(localStorage.getItem(STATE_STORE)));
    return upsertPortfolio(stored, current);
  } catch {
    return stored || { version: "0.1", activeId: null, workspaces: {} };
  }
}

function save(message) {
  localStorage.setItem(PORTFOLIO_STORE, JSON.stringify(portfolio));
  if (message) toast(message);
}

function toast(message) {
  const node = $("#toast");
  $("strong", node).textContent = "UNI Portfolio";
  $("span", node).textContent = message;
  node.hidden = false;
  clearTimeout(node.timer);
  node.timer = setTimeout(() => (node.hidden = true), 3000);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function formatDate(value) {
  if (!value) return "Sans date";
  return new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function render() {
  const summaries = portfolioSummaries(portfolio);
  $("#workspaceCount").textContent = summaries.length;
  $("#portfolioGrid").innerHTML = summaries.map((item) => `
    <article class="workspace-card ${item.id === portfolio.activeId ? "active" : ""}">
      <header><span class="status ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span>${item.id === portfolio.activeId ? '<span class="active-space">● actif</span>' : ""}</header>
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.owner)} · échéance ${escapeHtml(formatDate(item.deadline))}</p>
      <div class="workspace-metrics"><div><b>${item.contributions}</b><small>contributions</small></div><div><b>${item.evidenceRate}%</b><small>preuves</small></div><div><b>${item.validationRate}%</b><small>validations</small></div></div>
      <footer><button class="quiet" data-duplicate="${escapeHtml(item.id)}">Dupliquer</button><button class="quiet danger-quiet" data-delete="${escapeHtml(item.id)}" ${summaries.length === 1 ? "disabled" : ""}>Retirer</button><button class="button primary" data-activate="${escapeHtml(item.id)}">${item.id === portfolio.activeId ? "Ouvrir" : "Activer"}</button></footer>
    </article>`).join("") || `<section class="panel empty-portfolio"><h2>Aucune mission</h2><p>Constituez un premier pilote pour démarrer.</p><a class="button primary link-button" href="pilot.html">Ouvrir le Pilot Launchpad</a></section>`;
  document.querySelectorAll("[data-activate]").forEach((button) => button.addEventListener("click", () => activate(button.dataset.activate)));
  document.querySelectorAll("[data-duplicate]").forEach((button) => button.addEventListener("click", () => duplicate(button.dataset.duplicate)));
  document.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => remove(button.dataset.delete)));
}

function activate(id) {
  const workspace = portfolio.workspaces[id];
  if (!workspace) return;
  portfolio.activeId = id;
  localStorage.setItem(STATE_STORE, JSON.stringify(workspace));
  save();
  window.location.href = "./#dashboard";
}

function duplicate(id) {
  const workspace = portfolio.workspaces[id];
  if (!workspace) return;
  const copy = duplicateAsTemplate(workspace);
  const activeId = portfolio.activeId;
  portfolio = upsertPortfolio(portfolio, copy);
  portfolio.activeId = activeId;
  save("Modèle créé sans données personnelles ni preuves.");
  render();
}

function remove(id) {
  if (id === portfolio.activeId) {
    toast("Activez un autre espace avant de retirer celui-ci.");
    return;
  }
  if (!confirm("Retirer cet espace du portefeuille local? Exportez-le d’abord si nécessaire.")) return;
  delete portfolio.workspaces[id];
  save("Espace retiré du portefeuille local.");
  render();
}

function download(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

$("#exportPortfolio").addEventListener("click", () => download("uni-mission-portfolio.json", portfolio));
$("#importPortfolio").addEventListener("click", () => $("#portfolioInput").click());
$("#portfolioInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (imported?.version !== "0.1" || typeof imported.workspaces !== "object") throw new Error("Format de portefeuille non reconnu.");
    for (const workspace of Object.values(imported.workspaces)) normalizeState(workspace);
    portfolio = imported;
    save("Portefeuille importé.");
    render();
  } catch (error) {
    toast(error.message);
  }
  event.target.value = "";
});

save();
render();
