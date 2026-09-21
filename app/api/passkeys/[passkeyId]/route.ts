import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { createPortalNotification } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export async function DELETE(_: Request, context: { params: Promise<{ passkeyId: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { passkeyId } = await context.params;

  const passkey = await prisma.passkeyCredential.findFirst({
    where: {
      id: passkeyId,
      userId: user.id,
    },
  });

  if (!passkey) {
    return NextResponse.json({ error: "Passkey not found." }, { status: 404 });
  }

  await prisma.passkeyCredential.delete({
    where: { id: passkey.id },
  });
  await createPortalNotification({
    title: "Device login removed",
    detail: user.name,
  });

  return NextResponse.json({ ok: true });
}
