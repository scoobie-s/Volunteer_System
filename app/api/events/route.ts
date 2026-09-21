import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { requireApiPermission } from "@/lib/auth";
import { createEvent, deleteEvent, listEventsForUser, updateEvent } from "@/lib/data";
import { eventSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireApiPermission("Events", "View");
  if (auth.error) return auth.error;
  return NextResponse.json(await listEventsForUser(auth.user));
}

export async function POST(request: Request) {
  const auth = await requireApiPermission("Events", "Create");
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const payload = eventSchema.parse(body);
    await createEvent(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to create event.");
  }
}

export async function PUT(request: Request) {
  const auth = await requireApiPermission("Events", "Edit");
  if (auth.error) return auth.error;
  try {
    const body = (await request.json()) as { id?: string } & Record<string, unknown>;
    if (!body.id) {
      return NextResponse.json({ error: "Event id is required." }, { status: 400 });
    }

    const payload = eventSchema.parse({
      name: body.name,
      date: body.date,
      type: body.type,
      sundayService: body.sundayService,
      startTime: body.startTime,
      endTime: body.endTime,
      campusId: body.campusId,
      allowDuplicate: body.allowDuplicate,
      isRecurring: body.isRecurring,
      recurringDays: body.recurringDays,
    });

    await updateEvent(body.id, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to update event.");
  }
}

export async function DELETE(request: Request) {
  const auth = await requireApiPermission("Events", "Delete");
  if (auth.error) return auth.error;
  try {
    const body = (await request.json()) as { id?: string };
    if (!body.id) {
      return NextResponse.json({ error: "Event id is required." }, { status: 400 });
    }

    await deleteEvent(body.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to delete event.");
  }
}
