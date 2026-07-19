import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { cldFull } from "@/lib/cloudinary";

// @capacitor/filesystem is loaded lazily so the web Vite bundle doesn't crash
// if the package isn't in node_modules yet during a Firebase CI build.
// On web, Capacitor.isNativePlatform() is false so these code-paths never run.
let _fs: typeof import("@capacitor/filesystem") | null = null;
async function getFs() {
  if (_fs) return _fs;
  _fs = await import("@capacitor/filesystem");
  return _fs;
}

// ─── Manifest ────────────────────────────────────────────────────────────────
const MANIFEST_KEY = "dcl_media_cache_v1";
const CACHE_DIR    = "dcl_media";

type CacheEntry = { path: string; size: number; cachedAt: number };
type Manifest    = Record<string, CacheEntry>;

function loadManifest(): Manifest {
  try { return JSON.parse(localStorage.getItem(MANIFEST_KEY) ?? "{}"); }
  catch { return {}; }
}
function saveManifest(m: Manifest) {
  localStorage.setItem(MANIFEST_KEY, JSON.stringify(m));
}

async function ensureDir() {
  const { Filesystem, Directory } = await getFs();
  try { await Filesystem.mkdir({ path: CACHE_DIR, directory: Directory.Data, recursive: true }); }
  catch { /* already exists */ }
}

// ─── Core: get a usable URL (cached → local, otherwise remote) ───────────────
export async function getCachedMediaUrl(
  mediaId: string | number,
  remoteUrl: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  if (!Capacitor.isNativePlatform()) return remoteUrl;

  const { Filesystem, Directory } = await getFs();
  const key = String(mediaId);
  const manifest = loadManifest();
  const entry = manifest[key];

  if (entry) {
    try {
      const { uri } = await Filesystem.getUri({ path: entry.path, directory: Directory.Data });
      return Capacitor.convertFileSrc(uri);
    } catch {
      delete manifest[key];
      saveManifest(manifest);
    }
  }

  onProgress?.(0);
  const res = await fetch(remoteUrl);
  if (!res.ok) return remoteUrl;
  const blob = await res.blob();
  onProgress?.(55);

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  onProgress?.(80);

  const urlPath = remoteUrl.split("?")[0];
  const ext = urlPath.match(/\.([a-zA-Z0-9]+)$/)?.[1] ?? "jpg";
  const filePath = `${CACHE_DIR}/media_${key}.${ext}`;

  await ensureDir();
  await Filesystem.writeFile({ path: filePath, directory: Directory.Data, data: base64 });
  onProgress?.(100);

  manifest[key] = { path: filePath, size: blob.size, cachedAt: Date.now() };
  saveManifest(manifest);

  const { uri } = await Filesystem.getUri({ path: filePath, directory: Directory.Data });
  return Capacitor.convertFileSrc(uri);
}

// ─── Evict media deleted by admin ────────────────────────────────────────────
export async function evictDeletedMedia(currentServerIds: (string | number)[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { Filesystem, Directory } = await getFs();
  const manifest = loadManifest();
  const serverSet = new Set(currentServerIds.map(String));
  const stale = Object.keys(manifest).filter(id => !serverSet.has(id));
  if (!stale.length) return;
  for (const id of stale) {
    try { await Filesystem.deleteFile({ path: manifest[id].path, directory: Directory.Data }); }
    catch { /* already gone */ }
    delete manifest[id];
  }
  saveManifest(manifest);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function isMediaCached(mediaId: string | number): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  return Boolean(loadManifest()[String(mediaId)]);
}

export function getCacheStats(): { count: number; totalMB: number } {
  const entries = Object.values(loadManifest());
  return {
    count:   entries.length,
    totalMB: Math.round(entries.reduce((s, e) => s + e.size, 0) / (1024 * 1024) * 10) / 10,
  };
}

export async function clearMediaCache(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { Filesystem, Directory } = await getFs();
  for (const e of Object.values(loadManifest())) {
    try { await Filesystem.deleteFile({ path: e.path, directory: Directory.Data }); } catch {}
  }
  localStorage.removeItem(MANIFEST_KEY);
}

// ─── React hook — resolves best URL for a media item ─────────────────────────
// native + image  → cached local file (auto-downloads on first open)
// everything else → remote Cloudinary URL unchanged
export function useResolvedMediaUrl(
  mediaId: number | string | undefined,
  remoteUrl: string,
  mediaType: string,
): { resolvedUrl: string; caching: boolean; progress: number; isCached: boolean } {
  const [resolvedUrl, setResolvedUrl] = useState(
    mediaType === "image" ? cldFull(remoteUrl) : remoteUrl,
  );
  const [caching,  setCaching]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [isCached, setIsCached] = useState(() => (mediaId != null ? isMediaCached(mediaId) : false));

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (mediaId == null) return;
    if (mediaType !== "image") return;

    const fullUrl = cldFull(remoteUrl);

    if (isMediaCached(mediaId)) {
      getCachedMediaUrl(String(mediaId), fullUrl).then(url => {
        setResolvedUrl(url);
        setIsCached(true);
      });
      return;
    }

    setCaching(true);
    getCachedMediaUrl(String(mediaId), fullUrl, pct => setProgress(pct))
      .then(url => { setResolvedUrl(url); setIsCached(true); })
      .catch(() => setResolvedUrl(fullUrl))
      .finally(() => setCaching(false));
  }, [mediaId, remoteUrl, mediaType]);

  return { resolvedUrl, caching, progress, isCached };
}
