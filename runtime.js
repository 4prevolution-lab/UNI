export function runtimeConfiguration(source = globalThis.UNI_RUNTIME_CONFIG) {
  if (!source) return { mode: "local", configured: false };
  const url = String(source.url || "").replace(/\/+$/, "");
  const anonKey = String(source.anonKey || "");
  const configured = source.provider === "supabase"
    && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)
    && anonKey.length > 20
    && !anonKey.includes("YOUR_");
  return configured
    ? { mode: "protected", configured: true, provider: "supabase", url, anonKey }
    : { mode: "local", configured: false, reason: "Configuration Supabase absente ou invalide." };
}

export class UNIRuntime {
  constructor(configuration = runtimeConfiguration()) {
    this.configuration = configuration;
    this.accessToken = null;
  }

  get mode() {
    return this.configuration.mode;
  }

  setSession(accessToken) {
    this.accessToken = accessToken || null;
  }

  async authRequest(path, options = {}) {
    if (!this.configuration.configured) throw new Error("Runtime protégé non configuré.");
    const response = await fetch(`${this.configuration.url}/auth/v1/${String(path).replace(/^\/+/, "")}`, {
      ...options,
      headers: {
        apikey: this.configuration.anonKey,
        "Content-Type": "application/json",
        ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
        ...(options.headers || {})
      }
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Authentification UNI ${response.status}: ${detail.slice(0, 300)}`);
    }
    if (response.status === 204) return null;
    return response.json();
  }

  sendMagicLink(email, redirectTo) {
    return this.authRequest(`otp?redirect_to=${encodeURIComponent(redirectTo)}`, {
      method: "POST",
      body: JSON.stringify({
        email,
        create_user: true
      })
    });
  }

  getUser() {
    if (!this.accessToken) throw new Error("Session authentifiée requise.");
    return this.authRequest("user");
  }

  signOut() {
    if (!this.accessToken) return Promise.resolve(null);
    return this.authRequest("logout", { method: "POST" }).finally(() => this.setSession(null));
  }

  async request(path, options = {}) {
    if (!this.configuration.configured) throw new Error("Runtime protégé non configuré.");
    if (!this.accessToken) throw new Error("Session authentifiée requise.");
    const response = await fetch(`${this.configuration.url}/rest/v1/${String(path).replace(/^\/+/, "")}`, {
      ...options,
      headers: {
        apikey: this.configuration.anonKey,
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...(options.headers || {})
      }
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Runtime UNI ${response.status}: ${detail.slice(0, 300)}`);
    }
    if (response.status === 204) return null;
    return response.json();
  }

  listWorkspaces() {
    return this.request("workspaces?select=id,name,data_classification,updated_at&order=updated_at.desc");
  }

  listMissions(workspaceId) {
    const id = encodeURIComponent(workspaceId);
    return this.request(`missions?workspace_id=eq.${id}&select=*&order=updated_at.desc`);
  }

  saveProfile(profile) {
    return this.request("profiles?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(profile)
    });
  }

  createWorkspace(workspace) {
    return this.request("workspaces", {
      method: "POST",
      body: JSON.stringify(workspace)
    });
  }

  callRpc(name, parameters) {
    return this.request(`rpc/${name}`, {
      method: "POST",
      body: JSON.stringify(parameters)
    });
  }

  createInvite(workspaceId, role, lifetimeHours = 168, allowedUses = 1) {
    return this.callRpc("uni_create_invite", {
      target_workspace: workspaceId,
      invited_role: role,
      lifetime_hours: lifetimeHours,
      allowed_uses: allowedUses
    });
  }

  redeemInvite(code) {
    return this.callRpc("uni_redeem_invite", { invite_code: code });
  }
}

export function createRuntime(configuration) {
  return new UNIRuntime(configuration || runtimeConfiguration());
}
