import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { listPasskeysForUser } from "@/lib/passkeys";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const passkeys = await listPasskeysForUser(user.id);
  return NextResponse.json({ passkeys });
}
