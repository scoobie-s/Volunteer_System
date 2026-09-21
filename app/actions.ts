"use server";

import { revalidatePath } from "next/cache";
import { createAccessPoint, createEvent, createVolunteer } from "@/lib/data";
import { accessPointSchema, eventSchema, volunteerSchema } from "@/lib/validation";

export async function createVolunteerAction(formData: FormData) {
  const payload = volunteerSchema.parse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    membershipStatus: formData.get("membershipStatus"),
    role: formData.get("role"),
    availability: formData.get("availability"),
    sectionId: formData.get("sectionId"),
    notes: formData.get("notes") || undefined,
  });

  await createVolunteer(payload);
  revalidatePath("/");
  revalidatePath("/volunteers");
}

export async function createEventAction(formData: FormData) {
  const payload = eventSchema.parse({
    name: formData.get("name"),
    date: formData.get("date"),
    type: formData.get("type"),
    sundayService: formData.get("sundayService"),
    startTime: formData.get("startTime"),
    campusId: formData.get("campusId"),
    allowDuplicate: formData.get("allowDuplicate") === "on",
    isRecurring: false,
    recurringDays: [],
  });

  await createEvent(payload);
  revalidatePath("/");
  revalidatePath("/events");
}

export async function createAccessPointAction(formData: FormData) {
  const payload = accessPointSchema.parse({
    name: formData.get("name"),
    location: formData.get("location"),
    color: formData.get("color"),
    isActive: formData.get("isActive") === "on",
  });

  await createAccessPoint(payload);
  revalidatePath("/");
  revalidatePath("/access");
}
