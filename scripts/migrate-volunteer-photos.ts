import { PrismaClient } from "@prisma/client";
import { uploadVolunteerPhoto } from "../lib/blob";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required before migrating volunteer photos.");
  }

  const volunteers = await prisma.volunteer.findMany({
    where: { photoDataUrl: { startsWith: "data:image/" } },
    select: { id: true, fullName: true, photoDataUrl: true },
  });

  let migrated = 0;
  for (const volunteer of volunteers) {
    if (!volunteer.photoDataUrl) continue;
    const blobUrl = await uploadVolunteerPhoto(volunteer.photoDataUrl, volunteer.id);
    await prisma.volunteer.update({
      where: { id: volunteer.id },
      data: { photoDataUrl: blobUrl },
    });
    migrated += 1;
    console.log(`Migrated ${migrated}/${volunteers.length}: ${volunteer.fullName}`);
  }

  console.log(`Migrated ${migrated} volunteer photos.`);
}

main()
  .catch((error) => {
    console.error("Photo migration failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
