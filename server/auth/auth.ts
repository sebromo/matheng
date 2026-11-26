import "server-only";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { getDatabase } from "../database/client";
import { accounts, sessions, users, verifications } from "../database/schema";

const developmentSecret =
  "forma-local-development-secret-do-not-use-in-production";
const configuredSignupLimit = Number(
  process.env.BETTER_AUTH_SIGNUP_RATE_LIMIT_MAX ?? 10,
);
const signupLimit =
  Number.isSafeInteger(configuredSignupLimit) && configuredSignupLimit > 0
    ? configuredSignupLimit
    : 10;

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  authInstance ??= createAuth();
  return authInstance;
}

function createAuth() {
  const configuredSecret = process.env.BETTER_AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && !configuredSecret) {
    throw new Error("BETTER_AUTH_SECRET must be set in production");
  }
  const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

  return betterAuth({
    database: drizzleAdapter(getDatabase(), {
      provider: "pg",
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
      },
    }),
    secret: configuredSecret ?? developmentSecret,
    baseURL,
    trustedOrigins: [baseURL],
    rateLimit: {
      customRules: {
        "/sign-up/email": { window: 60, max: signupLimit },
      },
    },
    emailAndPassword: { enabled: true },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  });
}
