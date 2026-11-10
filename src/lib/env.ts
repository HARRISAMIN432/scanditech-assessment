import "server-only";
import { ConfigError } from "@/lib/errors";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new ConfigError(`Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`);
  return value;
}

/** Lazy getters so a missing variable fails the request (with a clear message), not the build. */
export const env = {
  get supabaseUrl() {
    return required("SUPABASE_URL");
  },
  get supabaseServiceKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get geminiApiKey() {
    return required("GEMINI_API_KEY");
  },
  get geminiModel() {
    return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  },
};
