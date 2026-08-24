/** Compress image in browser → JPEG blob for fast mobile upload. */
export async function compressImage(
  file: File,
  opts?: { maxEdge?: number; quality?: number }
): Promise<Blob> {
  // Mobile-first: smaller files, still sharp enough on phone screens
  const maxEdge = opts?.maxEdge ?? 960;
  const quality = opts?.quality ?? 0.55;

  if (!file.type.startsWith("image/")) {
    throw new Error("Можно только фото");
  }

  if (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.heic$/i.test(file.name)
  ) {
    throw new Error(
      "Формат HEIC не поддерживается. Выберите JPEG/PNG или «Самое совместимое» в камере."
    );
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Не удалось обработать фото");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Не удалось сжать фото"))),
      "image/jpeg",
      quality
    );
  });

  return blob;
}
