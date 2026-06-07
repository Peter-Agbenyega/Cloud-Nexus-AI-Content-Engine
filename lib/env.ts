/**
 * Public env vars required at build time and runtime (safe for static generation).
 * Server-only secrets (SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY) are validated
 * lazily at the point of use — see lib/supabase/service.ts and lib/openai.ts.
 */
const publicRequired = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

const serverRequired = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
];

export function validateEnv() {
  if (typeof window !== "undefined") return;

  const missing = publicRequired.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}

export function validateServerEnv() {
  validateEnv();

  const missing = serverRequired.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required server environment variables: ${missing.join(", ")}`,
    );
  }
}
