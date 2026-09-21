import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/better-auth";
import { authenticateUserByCode, AUTH_COOKIE, getAuthCookieOptions } from "@/lib/auth";
import { findMockUserById } from "@/lib/mock-data";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: string };
    const loginCode = body.code?.trim();

    if (!loginCode) {
      return NextResponse.json({ error: "Login code is required." }, { status: 400 });
    }

    if (!/^\d{4,12}$/.test(loginCode)) {
      return NextResponse.json({ error: "Login code must contain digits only." }, { status: 400 });
    }

    const user = await authenticateUserByCode(loginCode);

    if (!user) {
      return NextResponse.json({ error: "Invalid login code." }, { status: 401 });
    }

    if (findMockUserById(user.id)) {
      const cookieStore = await cookies();
      cookieStore.set(AUTH_COOKIE, user.id, getAuthCookieOptions());

      return NextResponse.json({ ok: true, user });
    }

    return await auth.api.signInEmail({
      body: {
        email: user.email,
        password: loginCode,
      },
      headers: await headers(),
      asResponse: true,
    });
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Unable to sign in right now." }, { status: 500 });
  }
}
