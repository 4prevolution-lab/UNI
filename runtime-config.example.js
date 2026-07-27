// Copy to runtime-config.js only for a protected deployment.
// The anon key is public by design; Row Level Security remains mandatory.
window.UNI_RUNTIME_CONFIG = {
  provider: "supabase",
  url: "https://YOUR_PROJECT.supabase.co",
  anonKey: "YOUR_PUBLIC_ANON_KEY"
};
