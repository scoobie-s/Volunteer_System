import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  generatePasskeyRegistrationOptions,
  persistPasskeyRegistrationChallenge,
} from "@/lib/passkeys";

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const options = await generatePasskeyRegistrationOptions({
    userId: user.id,
    email: user.email,
    name: user.name,
  });
  persistPasskeyRegistrationChallenge(await cookies(), options, user.id);
  return NextResponse.json(options);
}
