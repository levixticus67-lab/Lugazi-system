import { useState } from "react";
  import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
  import axios from "@/lib/axios";
  import PortalLayout from "@/components/PortalLayout";
  import PageHeader from "@/components/PageHeader";
  import { adminNavItems } from "./navItems";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Textarea } from "@/components/ui/textarea";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
  import { useToast } from "@/hooks/use-toast";
  import { Plus, Trash2, ClipboardList, CheckCircle2, Clock, AlertCircle, User } from "lucide-react";

  interface Task { id: number; title: string; description: string | null; assignedToName: string | null; assignedByName: string | null; dueDate: string | null; priority: string; status: string; category: string | null; notes: string | null; createdAt: string; }
  interface UserOption { id: number; displayName: string; role: string; }

  const PRIORITY_COLORS: Record<string,string> = { high:"bg-red-100 text-red-700", medium:"bg-yellow-100 text-yellow-700", low:"bg-green-100 text-green-700" };
  const STATUS_COLORS: Record<string,string> = { pending:"bg-slate-100 text-slate-600","in-progress":"bg-blue-100 text-blue-700",completed:"bg-green-100 text-green-700" };

  export default function AdminTasks() {
    const qc = useQueryClient();
    const { toast } = useToast();
    const [showCreate, setShowCreate] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");
    const [form, setForm] = useState({ title: "", description: "", assignedToUserId: "", assignedToName: "", dueDate: "", priority: "medium", category: "", notes: "" });

    const { data: tasks = [], isLoading } = useQuery<Task[]>({
      queryKey: ["admin-tasks"],
      queryFn: () => axios.get<Task[]>("/api/tasks").then(r => r.data),
      refetchInterval: 30_000,
    });

    const { data: users = [] } = useQuery<UserOption[]>({
      queryKey: ["users-for-assignment"],
      queryFn: () => axios.get<UserOption[]>("/api/users").then(r => r.data.filter(u => ["workforce","leadership"].includes(u.role))),
    });

    const createMut = useMutation({
      mutationFn: (data: typeof form) => axios.post("/api/tasks", { ...data, assignedToUserId: data.assignedToUserId ? Number(data.assignedToUserId) : undefined }),
      onSuccess: () => { qc.invalidateQueries({queryKey:["admin-tasks"]}); toast({title:"Task created"}); setShowCreate(false); setForm({title:"",description:"",assignedToUserId:"",assignedToName:"",dueDate:"",priority:"medium",category:"",notes:""}); },
      onError: () => toast({title:"Failed to create",variant:"destructive"}),
    });

    const deleteMut = useMutation({
      mutationFn: (id: number) => axios.delete(`/api/tasks/${id}`),
      onSuccess: () => { qc.invalidateQueries({queryKey:["admin-tasks"]}); toast({title:"Task deleted"}); },
    });

    const updateMut = useMutation({
      mutationFn: ({id, status}: {id: number; status: string}) => axios.patch(`/api/tasks/${id}`, {status}),
      onSuccess: () => qc.invalidateQueries({queryKey:["admin-tasks"]}),
    });

    const filtered = statusFilter === "all" ? tasks : tasks.filter(t => t.status === statusFilter);
    const pending = tasks.filter(t=>t.status==="pending").length;
    const inProg = tasks.filter(t=>t.status==="in-progress").length;
    const done = tasks.filter(t=>t.status==="completed").length;

    function handleUserSelect(userId: string) {
      const u = users.find(u => String(u.id) === userId);
      setForm(f => ({...f, assignedToUserId: userId, assignedToName: u?.displayName || ""}));
    }

    return (
      <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
        <PageHeader title="Task Assignments" description="Create and manage ministry task assignments" actions={
          <Button size="sm" onClick={() => setShowCreate(true)} className="blue-gradient-bg text-white border-0 hover:opacity-90"><Plus className="h-4 w-4 mr-1"/>New Task</Button>
        } />

        <div className="grid grid-cols-3 gap-4 mb-4">
          {[{label:"Pending",v:pending,c:"text-yellow-600"},{label:"In Progress",v:inProg,c:"text-blue-600"},{label:"Completed",v:done,c:"text-green-600"}].map(s=>(
            <div key={s.label} className="glass-card p-4 text-center"><p className={`text-2xl font-bold ${s.c}`}>{s.v}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
          ))}
        </div>

        <div className="mb-4 flex gap-2">
          {["all","pending","in-progress","completed"].map(s=>(
            <button key={s} onClick={()=>setStatusFilter(s)} className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize transition-colors ${statusFilter===s?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground hover:bg-muted/80"}`}>{s}</button>
          ))}
        </div>

        {isLoading ? <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="glass-card p-5 h-24 animate-pulse"/>)}</div>
         : filtered.length === 0 ? (
          <div className="glass-card p-12 text-center"><ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3"/><p className="text-muted-foreground">No tasks{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.</p></div>
        ) : (
          <div className="space-y-3">
            {filtered.map(task=>(
              <div key={task.id} className="glass-card p-5 flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-sm">{task.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]||""}`}>{task.priority}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[task.status]||""}`}>{task.status}</span>
                  </div>
                  {task.description && <p className="text-sm text-muted-foreground mb-1">{task.description}</p>}
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-1">
                    {task.assignedToName && <span className="flex items-center gap-1"><User className="h-3 w-3"/>To: {task.assignedToName}</span>}
                    {task.assignedByName && <span>By: {task.assignedByName}</span>}
                    {task.dueDate && <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Select value={task.status} onValueChange={v=>updateMut.mutate({id:task.id,status:v})}>
                    <SelectTrigger className="h-7 text-xs w-32"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-7 w-7 p-0" onClick={()=>deleteMut.mutate(task.id)}><Trash2 className="h-3.5 w-3.5"/></Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create New Task</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title *</Label><Input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="mt-1" placeholder="Task title"/></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="mt-1" rows={2}/></div>
              <div><Label>Assign To</Label>
                <Select value={form.assignedToUserId} onValueChange={handleUserSelect}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select person…"/></SelectTrigger>
                  <SelectContent>{users.map(u=><SelectItem key={u.id} value={String(u.id)}>{u.displayName} ({u.role})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v=>setForm(f=>({...f,priority:v}))}>
                    <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                    <SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))} className="mt-1"/></div>
              </div>
              <div><Label>Category</Label><Input value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="mt-1" placeholder="e.g. Worship, Ushering…"/></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className="mt-1" rows={2}/></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={()=>setShowCreate(false)}>Cancel</Button>
              <Button onClick={()=>createMut.mutate(form)} disabled={!form.title||createMut.isPending} className="blue-gradient-bg text-white border-0 hover:opacity-90">Create Task</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PortalLayout>
    );
  }
  