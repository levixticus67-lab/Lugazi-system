import { useState } from "react";
import { useListMedia } from "@workspace/api-client-react";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { memberNavItems } from "./navItems";
import { MediaViewer } from "@/components/MediaViewer";
import { Image, Video, Music, FileText, Play, ZoomIn } from "lucide-react";

type MediaItem = { id: number; title: string; type: string; url: string; thumbnailUrl?: string; description?: string; createdAt: string };

export default function MemberMedia() {
  const { data: items = [], isLoading } = useListMedia();
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [viewType, setViewType] = useState<string | undefined>();
  const [viewTitle, setViewTitle] = useState<string | undefined>();

  function openViewer(url: string, type?: string, title?: string) {
    setViewUrl(url); setViewType(type); setViewTitle(title);
  }

  const images = (items as MediaItem[]).filter(i => i.type === "image");
  const videos = (items as MediaItem[]).filter(i => i.type === "video");
  const audios = (items as MediaItem[]).filter(i => i.type === "audio");
  const others = (items as MediaItem[]).filter(i => !["image","video","audio"].includes(i.type));

  return (
    <PortalLayout navItems={memberNavItems} portalLabel="Member Portal">
      <PageHeader title="Media Gallery" description="Photos, videos, and audio from church activities" />

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (items as MediaItem[]).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Image className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No media available yet.</p>
        </div>
      ) : (
        <div className="space-y-8 animate-slide-in-up">
          {images.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Image className="h-4 w-4 text-blue-400" />
                <h2 className="font-semibold text-sm">Photos ({images.length})</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {images.map(item => (
                  <button key={item.id} onClick={() => openViewer(item.url, "image", item.title)}
                    className="group glass-card overflow-hidden rounded-xl hover:shadow-lg transition-shadow text-left relative">
                    <div className="aspect-square bg-muted overflow-hidden">
                      <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <ZoomIn className="h-6 w-6 text-white drop-shadow" />
                    </div>
                    <div className="p-2"><p className="text-xs font-medium truncate">{item.title}</p></div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {videos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Video className="h-4 w-4 text-purple-400" />
                <h2 className="font-semibold text-sm">Videos ({videos.length})</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {videos.map(item => (
                  <button key={item.id} onClick={() => openViewer(item.url, "video", item.title)}
                    className="glass-card overflow-hidden rounded-xl text-left hover:shadow-lg transition-shadow group w-full">
                    <div className="aspect-video bg-black overflow-hidden flex items-center justify-center relative">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <Video className="h-12 w-12 text-white/30" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Play className="h-5 w-5 text-white ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3"><p className="text-sm font-medium truncate">{item.title}</p></div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {audios.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Music className="h-4 w-4 text-green-400" />
                <h2 className="font-semibold text-sm">Audio ({audios.length})</h2>
              </div>
              <div className="space-y-3">
                {audios.map(item => (
                  <div key={item.id} className="glass-card p-4 flex items-center gap-3">
                    <button onClick={() => openViewer(item.url, "audio", item.title)}
                      className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center hover:bg-green-200 transition shrink-0">
                      <Music className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      <audio controls src={item.url} className="w-full h-8 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-orange-400" />
                <h2 className="font-semibold text-sm">Documents ({others.length})</h2>
              </div>
              <div className="space-y-2">
                {others.map(item => (
                  <button key={item.id} onClick={() => openViewer(item.url, item.type, item.title)}
                    className="glass-card p-4 flex items-center gap-3 hover:shadow-md transition-shadow w-full text-left card-hover">
                    <FileText className="h-5 w-5 text-orange-400 shrink-0" />
                    <span className="flex-1 text-sm font-medium truncate">{item.title}</span>
                    <Play className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {viewUrl && <MediaViewer url={viewUrl} title={viewTitle} mediaType={viewType} onClose={() => setViewUrl(null)} />}
    </PortalLayout>
  );
}
