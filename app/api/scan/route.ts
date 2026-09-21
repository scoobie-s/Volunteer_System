import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { requireApiPermission } from "@/lib/auth";
import { processAccessScan, processAttendanceScan } from "@/lib/data";
import { accessScanSchema, attendanceScanSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const auth = await requireApiPermission("Scanner", "Scan");
  if (auth.error) return auth.error;
  try {
    const body = await request.json();

    if (body.mode === "attendance") {
      const parsed = attendanceScanSchema.parse(body);
      return NextResponse.json(await processAttendanceScan(parsed));
    }

    const parsed = accessScanSchema.parse(body);
    return NextResponse.json(await processAccessScan(parsed));
  } catch (error) {
    return apiErrorResponse(error, "Unable to process this scan.");
  }
}
