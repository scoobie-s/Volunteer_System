import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { hashLoginCode, verifyLoginCode } from "@/lib/credentials";

function resolveAuthSecret() {
  return process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET ?? "crc-volunteer-portal-dev-secret";
}

function resolveBaseUrl() {
  return process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export const auth = betterAuth({
  secret: resolveAuthSecret(),
  baseURL: resolveBaseUrl(),
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    modelName: "User",
  },
  session: {
    modelName: "Session",
  },
  account: {
    modelName: "Account",
  },
  verification: {
    modelName: "Verification",
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    minPasswordLength: 4,
    maxPasswordLength: 12,
    password: {
      hash: async (password) => hashLoginCode(password),
      verify: async ({ hash, password }) => verifyLoginCode(password, hash),
    },
  },
  plugins: [nextCookies()],
});
