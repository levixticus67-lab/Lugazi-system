import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import { adminNavItems } from "./navItems";
import { useToast } from "@/hooks/use-toast";
import { Star, CheckCircle2, Trash2, Clock, Filter } from "lucide-react";

interface Testimony {
  id: number;
  memberName: string;
  title: string;
  content: string;
  category: string;
  isApproved: boolean;
  isPublic: boolean;
  createdAt: string;
}

const CAT_COLORS: Record<string, string> = {
  healing: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  provision: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  salvation: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  protection: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  relationship: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
  business: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  other: "bg-muted text-muted-foreground",
};

type Filter = "all" | "pending" | "approved";

export default function AdminTestimonies() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("pending");

  const { data: testimonies = [], isLoading } = useQuery<Testimony[]>({
    queryKey: ["testimonies-admin"],
    queryFn: () => axios.get<Testimony[]>("/api/testimonies").then(r => r.data).catch(() => [] as Testimony[]),
    refetchInterval: 30_000,
  });

  const displayed = testimonies.filter(t => {
    if (filter === "pending") return !t.isApproved;
    if (filter === "approved") return t.isApproved;
    return true;
  });

  const pendingCount = testimonies.filter(t => !t.isApproved).length;

  async function approve(id: number) {
    try {
      await axios.patch(`/api/testimonies/${id}/approve`);
      qc.invalidateQueries({ queryKey: ["testimonies-admin"] });
      toast({ title: "Testimony approved and is now visible to all" });
    } catch { toast({ title: "Failed to approve", variant: "destructive" }); }
  }

  async function reject(id: number) {
    if (!confirm("Delete this testimony? This cannot be undone.")) return;
    try {
      await axios.delete(`/api/testimonies/${id}`);
      qc.invalidateQueries({ queryKey: ["testimonies-admin"] });
      toast({ title: "Testimony deleted" });
    } catch { toast({ title: "Failed to delete", variant: "destructive" }); }
  }

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader
        title="Testimonies"
        description="Review and approve member testimonies before they go public"
      />

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["pending", "approved", "all"] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? "blue-gradient-bg text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f === "pending" ? `Pending${pendingCount > 0 ? ` (${pendingCount})` : ""}` :
             f === "approved" ? "Approved" : "All"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{filter === "pending" ? "No pending testimonies — all caught up!" : "No testimonies found"}</p>
        </div>
      ) : (
        <div className="space-y-4 animate-slide-in-up">
          {displayed.map(t => (
            <div key={t.id} className={`glass-card p-5 border-l-4 ${t.isApproved ? "border-green-500" : "border-amber-500"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${CAT_COLORS[t.category] ?? CAT_COLORS.other}`}>
                      {t.category}
                    </span>
                    {t.isApproved ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                        <CheckCircle2 className="h-3 w-3" /> Approved
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        <Clock className="h-3 w-3" /> Pending Review
                      </span>
                    )}
                    {!t.isPublic && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Private</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{t.title}</h3>
                  <p className="text-xs text-muted-foreground mb-2">By {t.memberName} · {new Date(t.createdAt).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })}</p>
                  <p className="text-sm text-foreground leading-relaxed">{t.content}</p>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  {!t.isApproved && (
                    <button
                      onClick={() => approve(t.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </button>
                  )}
                  <button
                    onClick={() => reject(t.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive text-xs font-semibold hover:bg-destructive/10 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {t.isApproved ? "Remove" : "Reject"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}
