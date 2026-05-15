import { useState } from "react";
import { X, Download, ExternalLink, FileText, Music, Video, Image as ImageIcon, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

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
  onClose: () => void;
}

export function MediaViewer({ url, title, mediaType, onClose }: MediaViewerProps) {
  const type = detectType(url, mediaType);
  const [imgScale, setImgScale] = useState(1);
  const [imgRotation, setImgRotation] = useState(0);

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
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {type === "image" && (
            <>
              <button onClick={() => setImgScale(s => Math.max(0.5, s - 0.25))} className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition" title="Zoom out">
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-white/60 text-xs">{Math.round(imgScale * 100)}%</span>
              <button onClick={() => setImgScale(s => Math.min(4, s + 0.25))} className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition" title="Zoom in">
                <ZoomIn className="h-4 w-4" />
              </button>
              <button onClick={() => setImgRotation(r => (r + 90) % 360)} className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition" title="Rotate">
                <RotateCw className="h-4 w-4" />
              </button>
            </>
          )}
          <a href={url} download target="_blank" rel="noreferrer" className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition" title="Download">
            <Download className="h-4 w-4" />
          </a>
          <a href={url} target="_blank" rel="noreferrer" className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition" title="Open in new tab">
            <ExternalLink className="h-4 w-4" />
          </a>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        {type === "image" && (
          <img
            src={url}
            alt={title ?? "Media"}
            className="max-w-full max-h-full object-contain select-none"
            style={{ transform: `scale(${imgScale}) rotate(${imgRotation}deg)`, transition: "transform 0.2s ease" }}
            draggable={false}
          />
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
          <video
            src={url}
            controls
            autoPlay
            className="max-w-full max-h-full rounded-xl"
            style={{ maxHeight: "calc(100vh - 80px)" }}
            controlsList="nodownload"
          />
        )}

        {type === "document" && (
          <div className="w-full h-full flex flex-col" style={{ height: "calc(100vh - 80px)" }}>
            <iframe
              src={docViewerUrl}
              className="w-full flex-1 rounded-xl border-0 bg-white"
              title={title ?? "Document"}
              allow="fullscreen"
            />
          </div>
        )}

        {type === "unknown" && (
          <div className="text-center space-y-4">
            <FileText className="h-16 w-16 text-white/40 mx-auto" />
            <p className="text-white/70">Cannot preview this file type.</p>
            <a href={url} target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-2 px-4 py-2 rounded-xl blue-gradient-bg text-white text-sm font-medium">
              <ExternalLink className="h-4 w-4" /> Open File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

interface MediaThumbnailProps {
  url: string;
  title?: string;
  mediaType?: string;
  className?: string;
}

export function MediaThumbnail({ url, title, mediaType, className = "" }: MediaThumbnailProps) {
  const [open, setOpen] = useState(false);
  const type = detectType(url, mediaType);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`relative overflow-hidden rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition group ${className}`}
        title={`View ${title ?? "media"}`}
      >
        {type === "image" ? (
          <img src={url} alt={title} className="w-full h-full object-cover" />
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
      </button>
      {open && <MediaViewer url={url} title={title} mediaType={mediaType} onClose={() => setOpen(false)} />}
    </>
  );
}

export default MediaViewer;
