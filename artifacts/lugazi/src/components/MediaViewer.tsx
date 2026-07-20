import { useState, useEffect, lazy, Suspense } from "react";
import { X, Download, ExternalLink, FileText, Music, Video, Image as ImageIcon, ZoomIn, ZoomOut, RotateCw, HardDrive, Loader2 } from "lucide-react";
import { cldFull, cldThumb, cldVideo } from "@/lib/cloudinary";
const ReactPlayer = lazy(() => import("react-player/lazy"));
import { Capacitor } from "@capacitor/core";
import { useResolvedMediaUrl, getCachedMediaUrl, isMediaCached } from "@/hooks/use-media-cache";

type MediaType = "image" | "audio" | "video" | "document" | "unknown";

function detectType(url: string, hint?: string): MediaType {
  if (hint) {
    if (hint === "audio") return "audio";
    if (hint === "video") return "video";
    if (hint === "document") return "document";
    if (hint === "image") return "image";
  }
  const lower = url.toLowerCase().split("?")[0];
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg|avif|heic)/.test(lower)) return "image";
  if (/\.(mp3|wav|ogg|aac|flac|m4a|opus)/.test(lower)) return "audio";
  if (/\.(mp4|webm|ogg|mov|avi|mkv|m4v)/.test(lower)) return "video";
  if (/\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt)/.test(lower)) return "document";
  if (/cloudinary\.com.*\/image\//.test(lower)) return "image";
  if (/cloudinary\.com.*\/video\//.test(lower)) return "video";
  return "unknown";
}

interface MediaViewerProps {
  url: string;
  title?: string;
  mediaType?: string;
  /** Pass the DB id so the native cache can key by it. */
  mediaId?: number | string;
  onClose: () => void;
}

export function MediaViewer({ url, title, mediaType, mediaId, onClose }: MediaViewerProps) {
  const type = detectType(url, mediaType);
  const [imgScale, setImgScale] = useState(1);
  const [imgRotation, setImgRotation] = useState(0);

  // Image: resolve from local cache (auto-downloads on first open on native)
  const { resolvedUrl, caching, progress, isCached } = useResolvedMediaUrl(
    mediaId, url, type,
  );

  // Video: manual "save offline" on native only
  // Keep native video src in state so it swaps to the local file once cached.
  const [videoSaving, setVideoSaving] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [nativeVideoSrc, setNativeVideoSrc] = useState<string | null>(null);
  const [videoCached, setVideoCached] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (type !== "video" || !mediaId || !Capacitor.isNativePlatform()) return;
    if (isMediaCached(mediaId)) {
      getCachedMediaUrl(String(mediaId), url).then(u => {
        setNativeVideoSrc(u);
        setVideoCached(true);
      });
    }
  }, [mediaId, url, type]);

  async function saveVideoOffline() {
    if (!mediaId) return;
    setVideoSaving(true);
    setVideoProgress(0);
    try {
      const localUrl = await getCachedMediaUrl(String(mediaId), url, pct => setVideoProgress(pct));
      setNativeVideoSrc(localUrl);
      setVideoCached(true);
    } catch { /* leave as remote */ }
    finally { setVideoSaving(false); }
  }

  // On native prefer the locally cached file path; on web use the raw URL
  // exactly as stored — Cloudinary serves it with correct headers on redirect.
  const effectiveVideoSrc = (Capacitor.isNativePlatform() && nativeVideoSrc)
    ? nativeVideoSrc
    : url;

  const docViewerUrl = url.toLowerCase().endsWith(".pdf")
    ? url
    : `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 shrink-0">
        <div className="flex items-center gap-2 text-white min-w-0">
          {type === "image" && <ImageIcon className="h-4 w-4 shrink-0 opacity-70" />}
          {type === "audio" && <Music className="h-4 w-4 shrink-0 opacity-70" />}
          {type === "video" && <Video className="h-4 w-4 shrink-0 opacity-70" />}
          {type === "document" && <FileText className="h-4 w-4 shrink-0 opacity-70" />}
          <span className="text-sm font-medium truncate">{title ?? "Media Viewer"}</span>
          {isCached && Capacitor.isNativePlatform() && (
            <span className="ml-1 text-[10px] text-green-400 flex items-center gap-0.5 shrink-0">
              <HardDrive className="h-3 w-3" /> saved
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {type === "image" && (
            <>
              <button onClick={() => setImgScale(s => Math.max(0.5, s - 0.25))} className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition" title="Zoom out"><ZoomOut className="h-4 w-4" /></button>
              <span className="text-white/60 text-xs">{Math.round(imgScale * 100)}%</span>
              <button onClick={() => setImgScale(s => Math.min(4, s + 0.25))} className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition" title="Zoom in"><ZoomIn className="h-4 w-4" /></button>
              <button onClick={() => setImgRotation(r => (r + 90) % 360)} className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition" title="Rotate"><RotateCw className="h-4 w-4" /></button>
            </>
          )}
          <a href={url} download target="_blank" rel="noreferrer" className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition" title="Download"><Download className="h-4 w-4" /></a>
          <a href={url} target="_blank" rel="noreferrer" className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition" title="Open in new tab"><ExternalLink className="h-4 w-4" /></a>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition" title="Close"><X className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Thin download-progress bar (only visible while caching for first time) */}
      {caching && (
        <div className="h-0.5 bg-white/10 shrink-0">
          <div className="h-full bg-green-400 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        {type === "image" && (
          caching && progress < 10 ? (
            <div className="flex flex-col items-center gap-3 text-white/60">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Loading image…</p>
            </div>
          ) : (
            <img
              loading="lazy"
              src={resolvedUrl}
              alt={title ?? "Media"}
              className="max-w-full max-h-full object-contain select-none"
              style={{ transform: `scale(${imgScale}) rotate(${imgRotation}deg)`, transition: "transform 0.2s ease" }}
              draggable={false}
            />
          )
        )}

        {type === "audio" && (
          <div className="glass-card p-8 rounded-2xl w-full max-w-md text-center space-y-6">
            <div className="w-24 h-24 mx-auto rounded-full blue-gradient-bg flex items-center justify-center">
              <Music className="h-12 w-12 text-white" />
            </div>
            <p className="text-white font-semibold">{title ?? "Audio"}</p>
            <audio controls src={url} className="w-full" autoPlay controlsList="nodownload" />
          </div>
        )}

        {type === "video" && (
          <div className="flex flex-col items-center gap-3 w-full max-h-full">
            {videoError ? (
              <div className="flex flex-col items-center gap-4 text-center p-8">
                <Video className="h-16 w-16 text-white/30" />
                <p className="text-white/60 text-sm">Unable to play this video.</p>
                <a href={url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-semibold transition">
                  <ExternalLink className="h-4 w-4" /> Open video in browser
                </a>
              </div>
            ) : Capacitor.isNativePlatform() ? (
              /* Native APK — play local cached file or raw URL */
              <video
                src={effectiveVideoSrc}
                controls
                autoPlay
                playsInline
                className="max-w-full rounded-xl"
                style={{ maxHeight: "calc(100vh - 160px)" }}
                controlsList="nodownload"
                onError={() => setVideoError(true)}
              />
            ) : (
              /* Web — ReactPlayer handles codec negotiation and format detection */
              <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-white/60" />}>
                <ReactPlayer
                  url={cldVideo(url)}
                  controls
                  width="100%"
                  height="auto"
                  style={{ maxHeight: "calc(100vh - 160px)", borderRadius: "0.75rem", overflow: "hidden" }}
                  onError={() => setVideoError(true)}
                  config={{ file: { attributes: { playsInline: true, controlsList: "nodownload" } } }}
                />
              </Suspense>
            )}
            {/* Save offline button — only on native, only if not already cached */}
            {Capacitor.isNativePlatform() && mediaId && !videoCached && (
              <button
                onClick={saveVideoOffline}
                disabled={videoSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition disabled:opacity-60"
              >
                {videoSaving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving… {videoProgress}%</>
                ) : (
                  <><HardDrive className="h-4 w-4" /> Save offline</>
                )}
              </button>
            )}
            {Capacitor.isNativePlatform() && videoCached && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <HardDrive className="h-3 w-3" /> Saved on device
              </span>
            )}
          </div>
        )}

        {type === "document" && (
          <div className="w-full h-full flex flex-col" style={{ height: "calc(100vh - 80px)" }}>
            <iframe src={docViewerUrl} className="w-full flex-1 rounded-xl border-0 bg-white" title={title ?? "Document"} allow="fullscreen" />
          </div>
        )}

        {type === "unknown" && (
          <div className="text-center space-y-4">
            <FileText className="h-16 w-16 text-white/40 mx-auto" />
            <p className="text-white/70">Cannot preview this file type.</p>
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl blue-gradient-bg text-white text-sm font-medium">
              <ExternalLink className="h-4 w-4" /> Open File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

interface MediaThumbnailProps { url: string; title?: string; mediaType?: string; mediaId?: number | string; className?: string; }

export function MediaThumbnail({ url, title, mediaType, mediaId, className = "" }: MediaThumbnailProps) {
  const [open, setOpen] = useState(false);
  const type = detectType(url, mediaType);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className={`relative overflow-hidden rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition group ${className}`}
        title={`View ${title ?? "media"}`}>
        {type === "image" ? (
          <img loading="lazy" src={cldThumb(url, 320)} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-muted text-muted-foreground p-4">
            {type === "audio" && <Music className="h-8 w-8 text-primary" />}
            {type === "video" && <Video className="h-8 w-8 text-primary" />}
            {type === "document" && <FileText className="h-8 w-8 text-primary" />}
            {type === "unknown" && <ExternalLink className="h-8 w-8" />}
            <span className="text-xs text-center font-medium truncate w-full">{title ?? "Open"}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
          <ZoomIn className="h-6 w-6 text-white drop-shadow" />
        </div>
        {isMediaCached(mediaId ?? "") && Capacitor.isNativePlatform() && (
          <div className="absolute bottom-1 right-1 bg-black/60 rounded-full p-0.5">
            <HardDrive className="h-3 w-3 text-green-400" />
          </div>
        )}
      </button>
      {open && <MediaViewer url={url} title={title} mediaType={mediaType} mediaId={mediaId} onClose={() => setOpen(false)} />}
    </>
  );
}

export default MediaViewer;
