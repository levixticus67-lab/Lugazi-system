import { useQuery } from "@tanstack/react-query";
  import axios from "@/lib/axios";
  import { Target, Eye, Heart } from "lucide-react";

  interface PublicSettings {
    churchName: string;
    tagline: string;
    mission: string | null;
    vision: string | null;
    coreValues: string | null;
  }

  export default function ChurchValuesCard() {
    const { data } = useQuery<PublicSettings>({
      queryKey: ["church-values-public"],
      queryFn: () => axios.get<PublicSettings>("/api/settings/public").then(r => r.data),
      staleTime: 5 * 60 * 1000,
    });

    if (!data || (!data.mission && !data.vision && !data.coreValues)) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.mission && (
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg blue-gradient-bg">
                <Target className="h-3.5 w-3.5 text-white" />
              </div>
              <h3 className="font-serif font-semibold text-sm">Our Mission</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{data.mission}</p>
          </div>
        )}
        {data.vision && (
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-sky-500">
                <Eye className="h-3.5 w-3.5 text-white" />
              </div>
              <h3 className="font-serif font-semibold text-sm">Our Vision</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{data.vision}</p>
          </div>
        )}
        {data.coreValues && (
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-rose-500">
                <Heart className="h-3.5 w-3.5 text-white" />
              </div>
              <h3 className="font-serif font-semibold text-sm">Core Values</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{data.coreValues}</p>
          </div>
        )}
      </div>
    );
  }
  