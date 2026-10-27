const DATA_IMAGE_PREFIX = "data:image/";

/**
 * Private Blob objects cannot be loaded by a browser directly. Keep data URLs
 * local for new-image previews and serve Blob URLs through the authenticated
 * application route.
 */
export function getVolunteerPhotoSrc(photoUrl: string) {
  if (photoUrl.startsWith(DATA_IMAGE_PREFIX) || !photoUrl.includes("blob.vercel-storage.com")) {
    return photoUrl;
  }

  return `/api/volunteer-photo?url=${encodeURIComponent(photoUrl)}`;
}
