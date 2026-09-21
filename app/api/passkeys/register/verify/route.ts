import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { createPortalNotification } from "@/lib/data";
import {
  clearPasskeyRegistrationCookies,
  storePasskeyCredential,
  verifyPasskeyRegistration,
} from "@/lib/passkeys";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const body = (await request.json()) as { response?: RegistrationResponseJSON };
  const cookieStore = await cookies();
  const expectedChallenge = cookieStore.get("crc_passkey_register_challenge")?.value;
  const challengeUserId = cookieStore.get("crc_passkey_register_user")?.value;

  if (!body.response || !expectedChallenge || challengeUserId !== user.id) {
    clearPasskeyRegistrationCookies(cookieStore);
    return NextResponse.json({ error: "Passkey registration session expired. Try again." }, { status: 400 });
  }

  const verification = await verifyPasskeyRegistration({
    response: body.response,
    expectedChallenge,
  });

  if (!verification.verified) {
    clearPasskeyRegistrationCookies(cookieStore);
    return NextResponse.json({ error: "Passkey registration could not be verified." }, { status: 400 });
  }

  await storePasskeyCredential({
    userId: user.id,
    response: body.response,
    verification,
  });
  clearPasskeyRegistrationCookies(cookieStore);
  await createPortalNotification({
    title: "Device login enabled",
    detail: user.name,
  });

  return NextResponse.json({ ok: true });
}
