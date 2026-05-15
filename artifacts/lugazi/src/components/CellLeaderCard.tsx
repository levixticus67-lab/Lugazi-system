import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Plus, Trash2, Search, X, MapPin, Clock, UsersRound } from "lucide-react";

interface CellMember {
  id: number;
  fullName: string;
  photoUrl: string | null;
  role: string;
  phone: string | null;
}

interface CellGroup {
  id: number;
  name: string;
  location: string | null;
  meetingDay: string | null;
  meetingTime: string | null;
  memberCount: number;
  members: CellMember[];
}

interface AllMember {
  id: number;
  fullName: string;
  photoUrl: string | null;
  role: string;
}

function Avatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  if (photoUrl) return <img src={photoUrl} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" />;
  return (
    <div className="w-8 h-8 rounded-full blue-gradient-bg flex items-center justify-center text-white text-xs font-bold shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function CellLeaderCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showAddMember, setShowAddMember] = useState(false);
  const [search, setSearch] = useState("");

  const { data: group, isLoading } = useQuery<CellGroup | null>({
    queryKey: ["my-cell-group", user?.id],
    queryFn: () => axios.get<CellGroup | null>("/api/groups/my-group").then(r => r.data).catch(() => null),
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: allMembers = [] } = useQuery<AllMember[]>({
    queryKey: ["members-for-cell"],
    queryFn: () => axios.get<AllMember[]>("/api/members").then(r => r.data).catch(() => [] as AllMember[]),
    enabled: showAddMember,
    staleTime: 30_000,
  });

  const addMember = useMutation({
    mutationFn: (memberId: number) => axios.post(`/api/groups/${group!.id}/members/${memberId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-cell-group"] }); setShowAddMember(false); setSearch(""); },
  });

  const removeMember = useMutation({
    mutationFn: (memberId: number) => axios.delete(`/api/groups/${group!.id}/members/${memberId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-cell-group"] }),
  });

  if (isLoading) {
    return <div className="glass-card p-4 animate-pulse h-28 rounded-xl" />;
  }

  if (!group) return null;

  const currentMemberIds = new Set((group.members ?? []).map(m => m.id));
  const filteredAll = allMembers
    .filter(m => !currentMemberIds.has(m.id) && m.fullName.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 10);

  return (
    <>
      <div className="glass-card p-4 animate-slide-in-up border-l-4 border-sky-500">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
              <UsersRound className="h-4 w-4 text-sky-500" />
            </div>
            <div>
              <p className="text-[10px] text-sky-500 font-semibold uppercase tracking-wide">Your Cell Group</p>
              <h4 className="font-semibold text-sm leading-tight">{group.name}</h4>
            </div>
          </div>
          <button
            onClick={() => setShowAddMember(true)}
            className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0 mt-1"
          >
            <Plus className="h-3.5 w-3.5" /> Add Member
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mb-3 text-[11px] text-muted-foreground">
          {group.location && (
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {group.location}</span>
          )}
          {group.meetingDay && (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {group.meetingDay}{group.meetingTime ? ` · ${group.meetingTime}` : ""}</span>
          )}
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {(group.members ?? []).length} members</span>
        </div>

        {(group.members ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">No members yet. Add members to your cell group.</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {(group.members ?? []).map(m => (
              <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/60 transition group">
                <Avatar name={m.fullName} photoUrl={m.photoUrl} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{m.fullName}</p>
                  {m.phone && <p className="text-[10px] text-muted-foreground">{m.phone}</p>}
                </div>
                <button
                  onClick={() => removeMember.mutate(m.id)}
                  disabled={removeMember.isPending}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition p-1"
                  title="Remove from cell"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-5 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Add Member to {group.name}</h3>
              <button onClick={() => { setShowAddMember(false); setSearch(""); }}><X className="h-4 w-4" /></button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                className="w-full bg-muted rounded-lg pl-9 pr-3 py-2 text-sm"
                placeholder="Search members…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {filteredAll.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {search ? "No matching members found" : "All members are in this cell group"}
                </p>
              ) : (
                filteredAll.map(m => (
                  <button
                    key={m.id}
                    onClick={() => addMember.mutate(m.id)}
                    disabled={addMember.isPending}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition text-left"
                  >
                    <Avatar name={m.fullName} photoUrl={m.photoUrl} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.fullName}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{m.role}</p>
                    </div>
                    <Plus className="h-4 w-4 text-primary shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
