import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { requireApiPermission } from "@/lib/auth";
import { createSection, listSectionsForUser } from "@/lib/data";
import { sectionSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireApiPermission("Sections", "View");
  if (auth.error) return auth.error;
  return NextResponse.json(await listSectionsForUser(auth.user));
}

export async function POST(request: Request) {
  const auth = await requireApiPermission("Sections", "Create");
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const payload = sectionSchema.parse(body);
    await createSection(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to create section.");
  }
}
