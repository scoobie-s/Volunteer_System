import { cookies, headers } from "next/headers";
import { auth } from "@/lib/better-auth";
import { AUTH_COOKIE } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return await auth.api.signOut({
    headers: await headers(),
    asResponse: true,
  });
}
