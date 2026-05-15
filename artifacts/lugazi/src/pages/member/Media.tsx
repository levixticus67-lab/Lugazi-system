import { useListMedia } from "@workspace/api-client-react";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { memberNavItems } from "./navItems";
import { ExternalLink, Image, Video, Music, FileText, Play } from "lucide-react";

type MediaItem = { id: number; title: string; type: string; url: string; thumbnailUrl?: string; description?: string; createdAt: string };

const typeIcon: Record<string, React.ReactNode> = {
  image: <Image className="h-5 w-5 text-blue-400" />,
  video: <Video className="h-5 w-5 text-purple-400" />,
  audio: <Music className="h-5 w-5 text-green-400" />,
  document: <FileText className="h-5 w-5 text-orange-400" />,
};

export default function MemberMedia() {
  const { data: items = [], isLoading } = useListMedia();

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
                  <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                    className="group glass-card overflow-hidden rounded-xl hover:shadow-lg transition-shadow">
                    <div className="aspect-square bg-muted overflow-hidden">
                      <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => { (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Failed to load</div>`; }} />
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{item.title}</p>
                    </div>
                  </a>
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
                  <div key={item.id} className="glass-card overflow-hidden rounded-xl">
                    <div className="aspect-video bg-black overflow-hidden">
                      <video src={item.url} controls className="w-full h-full" preload="metadata" poster={item.thumbnailUrl} />
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
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
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center">
                      <Music className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
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
                  <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                    className="glass-card p-4 flex items-center gap-3 hover:shadow-md transition-shadow card-hover">
                    {typeIcon[item.type] ?? <FileText className="h-5 w-5 text-muted-foreground" />}
                    <span className="flex-1 text-sm font-medium truncate">{item.title}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PortalLayout>
  );
}
