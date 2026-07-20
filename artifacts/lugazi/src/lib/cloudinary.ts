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

// Video for browser playback — strips any existing extension and appends
// .mp4 so browsers infer the MIME type without needing to sniff headers.
// Does NOT apply any Cloudinary transformation (avoids paid-plan charges).
// Non-Cloudinary URLs are returned unchanged.
export function cldVideo(url: string | null | undefined): string {
  if (!url) return "";
  if (!/res\.cloudinary\.com/i.test(url)) return url;
  if (!/\/video\/upload\//i.test(url)) return url;
  const [base, query] = url.split("?");
  const withoutExt = base.replace(/\.(mp4|webm|ogg|mov|avi|mkv|m4v|3gp|flv)$/i, "");
  const mp4Url = withoutExt + ".mp4";
  return query ? mp4Url + "?" + query : mp4Url;
}

// Browser video player — uses Cloudinary's free embeddable player iframe instead
// of a raw <video> element. The player handles codec negotiation, adaptive
// bitrate, and HTTP range requests itself, which eliminates the blank/broken
// video issue Chrome on Android has with direct Cloudinary delivery URLs.
// Returns null for non-Cloudinary URLs (caller should fall back to <video>).
export function cldPlayerUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!/res\.cloudinary\.com/i.test(url)) return null;
  if (!/\/video\/upload\//i.test(url)) return null;

  // Extract cloud name — the segment between res.cloudinary.com/ and /video/upload/
  const cloudMatch = url.match(/res\.cloudinary\.com\/([^/]+)\//i);
  if (!cloudMatch) return null;
  const cloudName = cloudMatch[1];

  // Everything after /video/upload/
  const afterUpload = url.split(/\/video\/upload\//i)[1] ?? "";
  // Drop query string
  const path = afterUpload.split("?")[0];
  const segments = path.split("/").filter(Boolean);

  // Strategy:
  // 1. If a version segment (v + digits) exists, public_id starts right after it.
  // 2. If no version, skip leading transformation segments — these contain
  //    underscores or commas (e.g. q_auto, f_auto, w_300,c_fill, vc_h264).
  // 3. Strip the file extension from the last segment.
  let startIdx = 0;
  const versionIdx = segments.findIndex(s => /^v\d+$/.test(s));
  if (versionIdx >= 0) {
    startIdx = versionIdx + 1;
  } else {
    // Skip transformation segments at the front
    while (startIdx < segments.length && /[_,]/.test(segments[startIdx])) {
      startIdx++;
    }
  }

  const publicIdSegments = segments.slice(startIdx);
  if (publicIdSegments.length === 0) return null;

  // Strip extension from the last segment
  publicIdSegments[publicIdSegments.length - 1] =
    publicIdSegments[publicIdSegments.length - 1].replace(/\.[a-z0-9]+$/i, "");

  const publicId = publicIdSegments.join("/");
  if (!publicId) return null;

  const params = new URLSearchParams({
    cloud_name: cloudName,
    public_id:  publicId,
    controls:   "true",
    autoplay:   "true",
  });
  return `https://player.cloudinary.com/embed/?${params.toString()}`;
}
