import { createRuntime } from "./runtime.js";

const SESSION_KEY = "uni-protected-session-v0.1";
const $ = (selector) => document.querySelector(selector);
const runtime = createRuntime();
let user = null;
let workspacesCache = [];

function toast(title, message) {
  const node = $("#toast");
  $("strong", node).textContent = title;
  $("span", node).textContent = message;
  node.hidden = false;
  clearTimeout(node.timer);
  node.timer = setTimeout(() => (node.hidden = true), 3500);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function consumeCallback() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get("access_token");
  const expiresIn = Number(params.get("expires_in") || 0);
  if (!accessToken) return null;
  const session = { accessToken, expiresAt: Date.now() + Math.max(0, expiresIn - 30) * 1000 };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  history.replaceState(null, "", `${location.pathname}${location.search}`);
  return session;
}

function restoreSession() {
  const callback = consumeCallback();
  if (callback) return callback;
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if (session?.accessToken && session.expiresAt > Date.now()) return session;
  } catch {}
  sessionStorage.removeItem(SESSION_KEY);
  return null;
}

async function initialize() {
  const configured = runtime.configuration.configured;
  $("#runtimeLocked").hidden = configured;
  $("#runtimePill").textContent = configured ? "● RUNTIME PROTÉGÉ" : "○ MODE LOCAL";
  $("#runtimePill").classList.toggle("online", configured);
  if (!configured) return;
  const session = restoreSession();
  if (!session) {
    $("#authEntry").hidden = false;
    return;
  }
  runtime.setSession(session.accessToken);
  try {
    user = await runtime.getUser();
    $("#sessionArea").hidden = false;
    $("#sessionEmail").textContent = user.email;
    $("#profileForm").elements.displayName.value = user.user_metadata?.display_name || "";
    await loadWorkspaces();
  } catch (error) {
    sessionStorage.removeItem(SESSION_KEY);
    runtime.setSession(null);
    $("#authEntry").hidden = false;
    toast("Session expirée", "Demandez un nouveau lien sécurisé.");
  }
}

async function loadWorkspaces() {
  const list = $("#workspaceAccessList");
  list.innerHTML = `<p class="lead">Chargement…</p>`;
  try {
    workspacesCache = await runtime.listWorkspaces();
    list.innerHTML = workspacesCache.map((workspace) => `<article><div><b>${escapeHtml(workspace.name)}</b><small>${escapeHtml(workspace.data_classification)}</small></div><span class="status validated">autorisé</span></article>`).join("") || `<p class="lead">Aucun espace autorisé.</p>`;
    $("#inviteWorkspace").innerHTML = workspacesCache.map((workspace) => `<option value="${escapeHtml(workspace.id)}">${escapeHtml(workspace.name)}</option>`).join("");
    $("#createInviteForm").querySelector("button[type=submit]").disabled = workspacesCache.length === 0;
  } catch (error) {
    list.innerHTML = `<p class="lead">${escapeHtml(error.message)}</p>`;
  }
}

$("#magicForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("button", event.currentTarget);
  button.disabled = true;
  try {
    await runtime.sendMagicLink(new FormData(event.currentTarget).get("email"), `${location.origin}${location.pathname}`);
    toast("Lien envoyé", "Consultez votre boîte de réception pour terminer la connexion.");
  } catch (error) {
    toast("Connexion impossible", error.message);
  } finally {
    button.disabled = false;
  }
});

$("#profileForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const data = new FormData(event.currentTarget);
    await runtime.saveProfile({ id: user.id, display_name: data.get("displayName"), locale: data.get("locale") });
    toast("Profil enregistré", "Votre identité minimale est prête.");
  } catch (error) {
    toast("Profil non enregistré", error.message);
  }
});

$("#workspaceForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const data = new FormData(event.currentTarget);
    await runtime.createWorkspace({ name: data.get("name"), data_classification: data.get("classification"), owner_id: user.id });
    event.currentTarget.reset();
    toast("Espace créé", "L’adhésion propriétaire a été créée automatiquement.");
    await loadWorkspaces();
  } catch (error) {
    toast("Création impossible", error.message);
  }
});

$("#redeemInviteForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  if (data.get("joinConsent") !== "on") return;
  try {
    await runtime.redeemInvite(String(data.get("inviteCode")).trim());
    event.currentTarget.reset();
    toast("Invitation acceptée", "Votre adhésion consentie est maintenant active.");
    await loadWorkspaces();
  } catch (error) {
    toast("Invitation refusée", error.message);
  }
});

$("#createInviteForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  try {
    const result = await runtime.createInvite(
      data.get("workspaceId"),
      data.get("role"),
      Number(data.get("lifetimeHours")),
      Number(data.get("allowedUses"))
    );
    const invitation = Array.isArray(result) ? result[0] : result;
    $("#inviteCodeOutput").textContent = invitation.invite_code;
    $("#inviteOutput").hidden = false;
    toast("Invitation créée", "Copiez le code maintenant : il n’est pas conservé en clair.");
  } catch (error) {
    toast("Invitation impossible", error.message);
  }
});

$("#copyInvite").addEventListener("click", async () => {
  const code = $("#inviteCodeOutput").textContent;
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    toast("Code copié", "Partagez-le par un canal approprié.");
  } catch {
    toast("Copie manuelle requise", "Sélectionnez le code affiché.");
  }
});

$("#refreshWorkspaces").addEventListener("click", loadWorkspaces);
$("#signOutButton").addEventListener("click", async () => {
  try { await runtime.signOut(); } catch {}
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
});

initialize();
