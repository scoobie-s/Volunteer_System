import Image from "next/image";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { findVolunteerBadgeByQrToken } from "@/lib/data";
import { generateQrDataUrl } from "@/lib/qr";
import { formatEnum } from "@/lib/utils";

export default async function BadgePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const badge = await findVolunteerBadgeByQrToken(token);

  if (!badge) {
    notFound();
  }

  const { volunteer, sectionName, departmentName, campusName } = badge;
  const qrDataUrl = await generateQrDataUrl(volunteer.qrToken);

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="bg-white text-[#111827]">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-slate-500">
          CRC Volunteer Pass
        </p>
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_240px]">
          <div>
            <h1 className="text-3xl font-semibold">{volunteer.fullName}</h1>
            <p className="mt-2 text-sm text-slate-500">{volunteer.email}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-slate-200 px-3 py-1">{campusName}</span>
              <span className="rounded-full border border-slate-200 px-3 py-1">{departmentName}</span>
              <span className="rounded-full border border-slate-200 px-3 py-1">{sectionName}</span>
              <span className="rounded-full border border-slate-200 px-3 py-1">
                {formatEnum(volunteer.role)}
              </span>
            </div>
            <p className="mt-6 font-mono text-xs text-slate-500">{volunteer.qrToken}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 p-4">
            <Image src={qrDataUrl} alt={volunteer.fullName} width={220} height={220} />
          </div>
        </div>
      </Card>
    </div>
  );
}
