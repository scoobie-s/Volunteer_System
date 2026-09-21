import type { cookies as cookiesFn } from "next/headers";
import { generateAuthenticationOptions, generateRegistrationOptions } from "@simplewebauthn/server";
import type {
  AuthenticatorTransportFuture,
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server";
import { prisma } from "@/lib/prisma";

const PASSKEY_REGISTER_CHALLENGE_COOKIE = "crc_passkey_register_challenge";
const PASSKEY_REGISTER_USER_COOKIE = "crc_passkey_register_user";
const PASSKEY_AUTH_CHALLENGE_COOKIE = "crc_passkey_auth_challenge";
const PASSKEY_TIMEOUT_MS = 1000 * 60 * 5;
const PASSKEY_COOKIE_MAX_AGE = 60 * 5;

type CookieStore = Awaited<ReturnType<typeof cookiesFn>>;

export function getPasskeyRpID() {
  const baseUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new URL(baseUrl).hostname;
}

export function getPasskeyOrigins() {
  const origins = new Set<string>([
    process.env.BETTER_AUTH_URL ?? "",
    process.env.NEXT_PUBLIC_APP_URL ?? "",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);

  return Array.from(origins).filter(Boolean);
}

function setChallengeCookie(cookieStore: CookieStore, name: string, value: string) {
  cookieStore.set(name, value, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PASSKEY_COOKIE_MAX_AGE,
  });
}

function clearChallengeCookie(cookieStore: CookieStore, name: string) {
  cookieStore.set(name, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function clearPasskeyRegistrationCookies(cookieStore: CookieStore) {
  clearChallengeCookie(cookieStore, PASSKEY_REGISTER_CHALLENGE_COOKIE);
  clearChallengeCookie(cookieStore, PASSKEY_REGISTER_USER_COOKIE);
}

export function clearPasskeyAuthenticationCookies(cookieStore: CookieStore) {
  clearChallengeCookie(cookieStore, PASSKEY_AUTH_CHALLENGE_COOKIE);
}

export async function generatePasskeyRegistrationOptions(input: {
  userId: string;
  email: string;
  name: string;
}) {
  const existingPasskeys = await prisma.passkeyCredential.findMany({
    where: { userId: input.userId },
    select: {
      credentialId: true,
      transports: true,
    },
  });

  return generateRegistrationOptions({
    rpName: "CRC Volunteer Management System",
    rpID: getPasskeyRpID(),
    userName: input.email,
    userDisplayName: input.name,
    userID: Buffer.from(input.userId, "utf8"),
    timeout: PASSKEY_TIMEOUT_MS,
    attestationType: "none",
    excludeCredentials: existingPasskeys.map((entry) => ({
      id: entry.credentialId,
      transports: entry.transports as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
      authenticatorAttachment: "platform",
    },
    preferredAuthenticatorType: "localDevice",
  });
}

export function persistPasskeyRegistrationChallenge(
  cookieStore: CookieStore,
  options: PublicKeyCredentialCreationOptionsJSON,
  userId: string,
) {
  setChallengeCookie(cookieStore, PASSKEY_REGISTER_CHALLENGE_COOKIE, options.challenge);
  setChallengeCookie(cookieStore, PASSKEY_REGISTER_USER_COOKIE, userId);
}

export function persistPasskeyAuthenticationChallenge(
  cookieStore: CookieStore,
  options: PublicKeyCredentialRequestOptionsJSON,
) {
  setChallengeCookie(cookieStore, PASSKEY_AUTH_CHALLENGE_COOKIE, options.challenge);
}

export async function verifyPasskeyRegistration(input: {
  response: RegistrationResponseJSON;
  expectedChallenge: string;
}) {
  return verifyRegistrationResponse({
    response: input.response,
    expectedChallenge: input.expectedChallenge,
    expectedOrigin: getPasskeyOrigins(),
    expectedRPID: getPasskeyRpID(),
    requireUserVerification: true,
  });
}

export async function storePasskeyCredential(input: {
  userId: string;
  response: RegistrationResponseJSON;
  verification: Awaited<ReturnType<typeof verifyPasskeyRegistration>>;
}) {
  if (!input.verification.verified || !input.verification.registrationInfo) {
    throw new Error("Passkey registration was not verified.");
  }

  const { credential, credentialBackedUp, credentialDeviceType } = input.verification.registrationInfo;
  const transports = input.response.response.transports ?? [];

  await prisma.passkeyCredential.upsert({
    where: { credentialId: credential.id },
    create: {
      userId: input.userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      name: "This device",
      lastUsedAt: new Date(),
    },
    update: {
      userId: input.userId,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      lastUsedAt: new Date(),
    },
  });
}

export async function generatePasskeyAuthenticationOptions() {
  return generateAuthenticationOptions({
    rpID: getPasskeyRpID(),
    timeout: PASSKEY_TIMEOUT_MS,
    userVerification: "required",
  });
}

export async function verifyPasskeyAuthentication(input: {
  response: AuthenticationResponseJSON;
  expectedChallenge: string;
}) {
  const passkey = await prisma.passkeyCredential.findUnique({
    where: { credentialId: input.response.id },
    include: {
      user: true,
    },
  });

  if (!passkey) {
    return { verified: false as const, userId: null, passkeyId: null, newCounter: null };
  }

  const verification = await verifyAuthenticationResponse({
    response: input.response,
    expectedChallenge: input.expectedChallenge,
    expectedOrigin: getPasskeyOrigins(),
    expectedRPID: getPasskeyRpID(),
    credential: {
      id: passkey.credentialId,
      publicKey: Buffer.from(passkey.publicKey, "base64url"),
      counter: passkey.counter,
      transports: passkey.transports as AuthenticatorTransportFuture[],
    },
    requireUserVerification: true,
  });

  if (!verification.verified) {
    return { verified: false as const, userId: null, passkeyId: passkey.id, newCounter: null };
  }

  return {
    verified: true as const,
    userId: passkey.userId,
    passkeyId: passkey.id,
    newCounter: verification.authenticationInfo.newCounter,
  };
}

export async function markPasskeyUsed(passkeyId: string, newCounter: number) {
  await prisma.passkeyCredential.update({
    where: { id: passkeyId },
    data: {
      counter: newCounter,
      lastUsedAt: new Date(),
    },
  });
}

export async function listPasskeysForUser(userId: string) {
  return prisma.passkeyCredential.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      deviceType: true,
      backedUp: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });
}

