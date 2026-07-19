// Injects Cloudinary delivery transformations (resize + auto quality/format)
// into a Cloudinary URL so the browser downloads a right-sized, compressed
// image instead of the full original — cuts bandwidth/storage usage against
// the Cloudinary free-tier quota, and speeds up load for the user.
//
// No-op for non-Cloudinary URLs (e.g. local placeholders), so it's always
// safe to wrap any image URL with this.
export function cldUrl(url: string | null | undefined, transform: string): string {
  if (!url) return "";
  const marker = "/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url; // not a Cloudinary delivery URL — leave untouched
  const insertAt = idx + marker.length;
  // Avoid double-inserting if this URL was already transformed somewhere.
  if (url.slice(insertAt).startsWith(transform + "/")) return url;
  return url.slice(0, insertAt) + transform + "/" + url.slice(insertAt);
}

// Small avatar/photo — tight square crop.
export const cldAvatar = (url: string | null | undefined, size = 64) =>
  cldUrl(url, `w_${size},h_${size},c_fill,g_face,q_auto,f_auto`);

// Grid/list thumbnail — bounded box, preserves aspect ratio.
export const cldThumb = (url: string | null | undefined, size = 400) =>
  cldUrl(url, `w_${size},c_limit,q_auto,f_auto`);

// Full-size viewer — capped well above any screen width, still compressed.
export const cldFull = (url: string | null | undefined, size = 1600) =>
  cldUrl(url, `w_${size},c_limit,q_auto,f_auto`);

// Video for browser playback — applies Cloudinary's f_mp4 transcoding
// transformation so the video is always delivered as MP4 regardless of the
// source format (MOV, AVI, MKV, etc.), then appends the .mp4 extension so
// browsers can infer the MIME type without sniffing. Non-Cloudinary URLs
// (or non-video Cloudinary URLs) are returned unchanged.
export function cldVideo(url: string | null | undefined): string {
  if (!url) return "";
  if (!/res\.cloudinary\.com/i.test(url)) return url;
  if (!/\/video\/upload\//i.test(url)) return url;
  // Insert f_mp4,q_auto — Cloudinary transcodes to MP4 on the fly.
  const transformed = cldUrl(url, "f_mp4,q_auto");
  // Strip any existing extension then append .mp4 for MIME-type sniffing.
  const [base, query] = transformed.split("?");
  const withoutExt = base.replace(/\.(mp4|webm|ogg|mov|avi|mkv|m4v|3gp|flv)$/i, "");
  const mp4Url = withoutExt + ".mp4";
  return query ? mp4Url + "?" + query : mp4Url;
}
