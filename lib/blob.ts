import { del, put } from "@vercel/blob";

const DATA_IMAGE_PREFIX = "data:image/";

function getBlobExtension(contentType: string) {
  const extension = contentType.split("/")[1]?.split(";")[0]?.toLowerCase();
  return extension === "jpeg" ? "jpg" : extension || "bin";
}

export function isDataImage(value: string | undefined) {
  return Boolean(value?.startsWith(DATA_IMAGE_PREFIX));
}

export async function uploadVolunteerPhoto(photoDataUrl: string | undefined, key: string) {
  if (!photoDataUrl || !isDataImage(photoDataUrl)) {
    return photoDataUrl;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn("BLOB_READ_WRITE_TOKEN is not configured; keeping the image in the database.");
    return photoDataUrl;
  }

  const match = photoDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid volunteer image format.");
  }

  const [, contentType, encodedImage] = match;
  const image = Buffer.from(encodedImage, "base64");
  if (image.length > 5 * 1024 * 1024) {
    throw new Error("Volunteer images must be smaller than 5 MB.");
  }

  const blob = await put(`volunteers/${key}.${getBlobExtension(contentType)}`, image, {
    access: "public",
    addRandomSuffix: true,
    contentType,
  });

  return blob.url;
}

export async function deleteVolunteerPhoto(photoUrl: string | null | undefined) {
  if (!photoUrl || isDataImage(photoUrl) || !process.env.BLOB_READ_WRITE_TOKEN) {
    return;
  }

  if (photoUrl.includes("blob.vercel-storage.com")) {
    await del(photoUrl);
  }
}
