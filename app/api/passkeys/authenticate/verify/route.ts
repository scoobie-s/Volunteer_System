import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE, PASSKEY_AUTH_COOKIE_MAX_AGE, getAuthCookieOptions } from "@/lib/auth";
import { findUserAccountById } from "@/lib/data";
import {
  clearPasskeyAuthenticationCookies,
  markPasskeyUsed,
  verifyPasskeyAuthentication,
} from "@/lib/passkeys";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { response?: AuthenticationResponseJSON };
  const cookieStore = await cookies();
  const expectedChallenge = cookieStore.get("crc_passkey_auth_challenge")?.value;

  if (!body.response || !expectedChallenge) {
    clearPasskeyAuthenticationCookies(cookieStore);
    return NextResponse.json({ error: "Device login session expired. Try again." }, { status: 400 });
  }

  const verification = await verifyPasskeyAuthentication({
    response: body.response,
    expectedChallenge,
  });

  if (!verification.verified || !verification.userId || !verification.passkeyId || verification.newCounter === null) {
    clearPasskeyAuthenticationCookies(cookieStore);
    return NextResponse.json({ error: "Device authentication failed." }, { status: 401 });
  }

  const user = await findUserAccountById(verification.userId);
  if (!user) {
    clearPasskeyAuthenticationCookies(cookieStore);
    return NextResponse.json({ error: "User account could not be loaded." }, { status: 404 });
  }

  await markPasskeyUsed(verification.passkeyId, verification.newCounter);
  clearPasskeyAuthenticationCookies(cookieStore);
  cookieStore.set(AUTH_COOKIE, user.id, getAuthCookieOptions(PASSKEY_AUTH_COOKIE_MAX_AGE));

  return NextResponse.json({ ok: true, user });
}

