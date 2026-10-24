/**
 * Reads an image File, scales it down to fit within maxEdge, and returns a JPEG
 * data URL. Done in the browser so uploads stay small (good for the database and
 * for load times) and Linda never has to resize anything herself.
 */
export async function fileToDataUrl(file: File, maxEdge = 1280, quality = 0.82): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("That image could not be opened."));
    el.src = dataUrl;
  });

  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl; // very old browser: fall back to the original
  ctx.drawImage(img, 0, 0, w, h);

  // GIFs/PNGs with transparency look wrong flattened to JPEG; keep PNG for those, else JPEG.
  const out = /image\/(png|gif)/.test(file.type) && file.size < 1_500_000 ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", quality);
  return out;
}
