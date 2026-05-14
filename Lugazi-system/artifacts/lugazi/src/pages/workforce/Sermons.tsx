import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { workforceNavItems } from "./navItems";
import { Mic2, Play, FileText } from "lucide-react";

type Sermon = {
  id: number; title: string; preacher: string; sermonDate: string; series?: string;
  description?: string; mediaUrl?: string; mediaType?: string; thumbnailUrl?: string; scriptureRef?: string;
};

export default function WorkforceSermons() {
  const { data: sermons = [], isLoading } = useQuery<Sermon[]>({
    queryKey: ["sermons-workforce"],
    queryFn: () => axios.get<Sermon[]>("/api/sermons").then(r => r.data),
  });

  return (
    <PortalLayout navItems={workforceNavItems} portalLabel="Workforce Portal">
      <PageHeader title="Sermon Library" description="Access messages and sermon resources" />
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : (sermons as Sermon[]).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><Mic2 className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No sermons available yet.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-in-up">
          {(sermons as Sermon[]).map(s => (
            <div key={s.id} className="glass-card p-5 card-hover">
              <div className="flex gap-3">
                {s.thumbnailUrl ? <img src={s.thumbnailUrl} alt={s.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" /> :
                  <div className="w-16 h-16 rounded-lg blue-gradient-bg flex items-center justify-center flex-shrink-0"><Mic2 className="h-7 w-7 text-white" /></div>}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.preacher} · {new Date(s.sermonDate).toLocaleDateString()}</p>
                  {s.series && <p className="text-xs text-primary mt-0.5">{s.series}</p>}
                  {s.scriptureRef && <p className="text-xs text-muted-foreground italic mt-0.5">{s.scriptureRef}</p>}
                </div>
              </div>
              {s.mediaUrl && <div className="mt-3">
                {s.mediaType === "audio" ? <audio controls src={s.mediaUrl} className="w-full h-8 mt-1" /> :
                  <a href={s.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium mt-1">
                    {s.mediaType === "video" ? <><Play className="h-4 w-4" /> Watch</> : <><FileText className="h-4 w-4" /> View</>}
                  </a>}
              </div>}
            </div>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}
