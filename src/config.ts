// ─── Required env vars ────────────────────────────────────────────────────────

const REQUIRED = [
  "TEMPO_CLIENT_ID",
  "TEMPO_CLIENT_SECRET",
  "OAUTH_REDIRECT_URI",
  "PUBLIC_URL",
  "JIRA_URL",   // [SEC-L1] Required — used in OAuth authorize flow; silently breaking if empty
] as const;

export function validateEnv(): void {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`[tempo-mcp] Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  // [SEC-L3] Validate PUBLIC_URL is a well-formed http(s) URL.
  // A malformed value would corrupt OAuth discovery responses at runtime.
  const publicUrl = process.env["PUBLIC_URL"] ?? "";
  try {
    const parsed = new URL(publicUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("must use http or https");
    }
  } catch {
    console.error(`[tempo-mcp] PUBLIC_URL is not a valid http(s) URL: "${publicUrl}"`);
    process.exit(1);
  }

  // [SEC-L5] Validate TEMPO_TOKEN_URL if overridden — must point to Tempo's domain.
  // Prevents SSRF via a misconfigured or compromised environment variable.
  const tokenUrl = process.env["TEMPO_TOKEN_URL"];
  if (tokenUrl !== undefined) {
    if (!tokenUrl.startsWith("https://api.tempo.io/")) {
      console.error(`[tempo-mcp] TEMPO_TOKEN_URL must start with "https://api.tempo.io/", got: "${tokenUrl}"`);
      process.exit(1);
    }
  }
}

// ─── Config object ────────────────────────────────────────────────────────────

export const config = {
  tempo: {
    clientId: process.env.TEMPO_CLIENT_ID ?? "",
    clientSecret: process.env.TEMPO_CLIENT_SECRET ?? "",
    baseUrl: "https://api.tempo.io/4",
    authorizeUrl: "https://api.tempo.io/oauth/authorize/redirect",
    tokenUrl: process.env.TEMPO_TOKEN_URL ?? "https://api.tempo.io/oauth/token",
  },
  jiraUrl: process.env.JIRA_URL ?? "",  // guaranteed non-empty — validated by validateEnv()
  oauth: {
    redirectUri: process.env.OAUTH_REDIRECT_URI ?? "",
  },
  server: {
    port: parseInt(process.env.PORT ?? "3000", 10),
    publicUrl: (process.env.PUBLIC_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  },
} as const;
