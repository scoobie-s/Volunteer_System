import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { generatePasskeyAuthenticationOptions, persistPasskeyAuthenticationChallenge } from "@/lib/passkeys";

export async function POST() {
  const options = await generatePasskeyAuthenticationOptions();
  persistPasskeyAuthenticationChallenge(await cookies(), options);
  return NextResponse.json(options);
}

