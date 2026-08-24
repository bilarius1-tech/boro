const PUBLIC_MARKER = "/storage/v1/object/public/listing-media/";

/** Extract object path inside the listing-media bucket from a public URL. */
export function storagePathFromPublicUrl(url: string): string | null {
  try {
    const idx = url.indexOf(PUBLIC_MARKER);
    if (idx === -1) return null;
    const path = decodeURIComponent(url.slice(idx + PUBLIC_MARKER.length));
    return path.split("?")[0] || null;
  } catch {
    return null;
  }
}
