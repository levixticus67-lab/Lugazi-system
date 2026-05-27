import { useState } from "react";
  import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
  import axios from "@/lib/axios";
  import PortalLayout from "@/components/PortalLayout";
  import PageHeader from "@/components/PageHeader";
  import { workforceNavItems } from "./navItems";
  import { useToast } from "@/hooks/use-toast";
  import { CheckCircle2, Clock, AlertCircle, Loader2, ClipboardList } from "lucide-react";
  import { Button } from "@/components/ui/button";

  interface Task { id: number; title: string; description: string | null; assignedByName: string | null; dueDate: string | null; priority: string; status: string; category: string | null; notes: string | null; completedAt: string | null; createdAt: string; }

  const PRIORITY_COLORS: Record<string,string> = { high:"bg-red-100 text-red-700", medium:"bg-yellow-100 text-yellow-700", low:"bg-green-100 text-green-700" };
  const STATUS_COLORS: Record<string,string> = { pending:"bg-slate-100 text-slate-600", "in-progress":"bg-blue-100 text-blue-700", completed:"bg-green-100 text-green-700" };

  export default function WorkforceTasks() {
    const qc = useQueryClient();
    const { toast } = useToast();
    const [updating, setUpdating] = useState<number | null>(null);

    const { data: tasks = [], isLoading } = useQuery<Task[]>({
      queryKey: ["my-tasks"],
      queryFn: () => axios.get<Task[]>("/api/tasks").then(r => r.data),
      refetchInterval: 30_000,
    });

    async function updateStatus(id: number, status: string) {
      setUpdating(id);
      try {
        await axios.patch(`/api/tasks/${id}`, { status });
        qc.invalidateQueries({ queryKey: ["my-tasks"] });
        toast({ title: status === "completed" ? "Task marked as completed!" : "Status updated" });
      } catch { toast({ title: "Failed to update", variant: "destructive" }); }
      finally { setUpdating(null); }
    }

    const pending = tasks.filter(t => t.status === "pending");
    const inProgress = tasks.filter(t => t.status === "in-progress");
    const completed = tasks.filter(t => t.status === "completed");

    return (
      <PortalLayout navItems={workforceNavItems} portalLabel="Workforce Portal">
        <PageHeader title="My Tasks" description="Ministry tasks assigned to you" />

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[{label:"Pending",count:pending.length,color:"text-yellow-600"},{label:"In Progress",count:inProgress.length,color:"text-blue-600"},{label:"Completed",count:completed.length,color:"text-green-600"}].map(s => (
            <div key={s.label} className="glass-card p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="glass-card p-5 h-28 animate-pulse"/>)}</div>
        ) : tasks.length === 0 ? (
          <div className="glass-card p-12 text-center"><ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" /><p className="text-muted-foreground">No tasks assigned yet.</p></div>
        ) : (
          <div className="space-y-4">
            {[...pending, ...inProgress, ...completed].map(task => (
              <div key={task.id} className={`glass-card p-5 ${task.status === "completed" ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-sm">{task.title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_COLORS[task.priority] || ""}`}>{task.priority}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[task.status] || ""}`}>{task.status}</span>
                    </div>
                    {task.description && <p className="text-sm text-muted-foreground mb-2">{task.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {task.assignedByName && <span>Assigned by: <span className="text-foreground font-medium">{task.assignedByName}</span></span>}
                      {task.dueDate && <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                      {task.category && <span>{task.category}</span>}
                    </div>
                    {task.notes && <p className="text-xs text-muted-foreground mt-2 italic">{task.notes}</p>}
                  </div>
                  <div className="shrink-0 flex flex-col gap-2">
                    {task.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(task.id, "in-progress")} disabled={updating === task.id} className="text-xs">
                        {updating === task.id ? <Loader2 className="h-3 w-3 animate-spin"/> : "Start"}
                      </Button>
                    )}
                    {task.status === "in-progress" && (
                      <Button size="sm" onClick={() => updateStatus(task.id, "completed")} disabled={updating === task.id} className="blue-gradient-bg text-white border-0 hover:opacity-90 text-xs">
                        {updating === task.id ? <Loader2 className="h-3 w-3 animate-spin"/> : <><CheckCircle2 className="h-3 w-3 mr-1"/>Done</>}
                      </Button>
                    )}
                    {task.status === "completed" && <CheckCircle2 className="h-5 w-5 text-green-500 mt-1" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PortalLayout>
    );
  }
  