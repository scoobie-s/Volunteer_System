import { cookies, headers } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/lib/better-auth";
import { verifyLoginCode } from "@/lib/credentials";
import { findUserAccountById, syncCredentialAccountHash } from "@/lib/data";
import { findMockUserByCode, findMockUserById } from "@/lib/mock-data";
import { getFirstAccessibleRoute, hasActionAccess, hasPageAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const AUTH_COOKIE = "crc_portal_user";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 12;
export const PASSKEY_AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const CREDENTIAL_PROVIDER_ID = "credential";

export function getAuthCookieOptions(maxAge = AUTH_COOKIE_MAX_AGE) {
  return {
    httpOnly: true as const,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

function shouldUseMockAuth() {
  return process.env.ALLOW_MOCK_AUTH === "true";
}

export async function authenticateUserByCode(loginCode: string) {
  if (shouldUseMockAuth()) {
    const mockUser = findMockUserByCode(loginCode);
    if (mockUser) {
      return mockUser;
    }
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      passwordHash: true,
      accounts: {
        where: {
          providerId: CREDENTIAL_PROVIDER_ID,
        },
        select: {
          password: true,
        },
      },
    },
  });

  for (const user of users) {
    const accountHash = user.accounts[0]?.password ?? null;
    const storedHash = accountHash ?? user.passwordHash ?? "";
    if (!storedHash || !verifyLoginCode(loginCode, storedHash)) {
      continue;
    }

    if (!accountHash && user.passwordHash) {
      await syncCredentialAccountHash(user.id, user.passwordHash);
    }

    return findUserAccountById(user.id);
  }

  return null;
}

export const getAuthenticatedUser = cache(async function getAuthenticatedUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user?.id) {
    const dbUser = await findUserAccountById(session.user.id);
    if (dbUser) {
      return dbUser;
    }
  }

  const cookieStore = await cookies();
  const userId = cookieStore.get(AUTH_COOKIE)?.value;

  if (!userId) {
    return null;
  }

  if (shouldUseMockAuth()) {
    const mockUser = findMockUserById(userId);
    if (mockUser) {
      return mockUser;
    }
  }

  return findUserAccountById(userId);
});

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/");
  }

  return user;
}

export async function requirePageAccess(page: string) {
  const user = await requireAuthenticatedUser();

  if (!hasPageAccess(user, page)) {
    redirect(getFirstAccessibleRoute(user));
  }

  return user;
}

export async function requireApiPermission(page: string, action: string) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
      user: null,
    };
  }

  if (!hasPageAccess(user, page) || !hasActionAccess(user, page, action)) {
    return {
      error: NextResponse.json({ error: "You do not have permission for this action." }, { status: 403 }),
      user: null,
    };
  }

  return { error: null, user };
}
