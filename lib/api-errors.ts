import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

function formatPrismaTarget(target: unknown) {
  if (!target) {
    return "record";
  }

  if (Array.isArray(target) && target.length > 0) {
    return String(target[target.length - 1]).replace(/Id$/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
  }

  return String(target).replace(/Id$/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? fallback;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = formatPrismaTarget(error.meta?.target);
      return `A record with this ${target.toLowerCase()} already exists.`;
    }

    if (error.code === "P2003") {
      return "This change is blocked by linked records. Remove or update the related records first.";
    }

    if (error.code === "P2025") {
      return "The requested record was not found or may already have been removed.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export function apiErrorResponse(error: unknown, fallback: string, status = 400) {
  return NextResponse.json({ error: getApiErrorMessage(error, fallback) }, { status });
}
