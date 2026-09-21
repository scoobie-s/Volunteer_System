import { VolunteersPageClient } from "@/components/module-pages";
import { requirePageAccess } from "@/lib/auth";
import { getScopedSnapshot } from "@/lib/data";
import { hasActionAccess } from "@/lib/permissions";
import { generateQrDataUrl } from "@/lib/qr";

export default async function VolunteersPage() {
  const currentUser = await requirePageAccess("Volunteer Hub");
  const snapshot = await getScopedSnapshot(currentUser);
  const volunteers = await Promise.all(
    snapshot.volunteers.map(async (volunteer) => ({
      ...volunteer,
      qrDataUrl: await generateQrDataUrl(volunteer.qrToken),
    })),
  );

  return (
    <VolunteersPageClient
      snapshot={snapshot}
      volunteers={volunteers}
      canExport={hasActionAccess(currentUser, "Volunteer Hub", "Export")}
    />
  );
}
