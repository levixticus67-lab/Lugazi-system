import { useState } from "react";
import { useListEvents, useCreateEvent, useUpdateEvent, useDeleteEvent, getListEventsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Plus, Pencil, Trash2, Clock, MapPin, Users, CalendarDays } from "lucide-react";

type Event = { id: number; title: string; description?: string | null; date: string; time: string; location: string; category: string; attendeeCount: number };

const CATEGORIES = ["service", "youth", "bible_study", "conference", "prayer", "outreach", "other"];
const CAT_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  service:     { label: "Service",     color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",     dot: "bg-blue-500" },
  youth:       { label: "Youth",       color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300", dot: "bg-purple-500" },
  bible_study: { label: "Bible Study", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",   dot: "bg-amber-500" },
  conference:  { label: "Conference",  color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300", dot: "bg-indigo-500" },
  prayer:      { label: "Prayer",      color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",       dot: "bg-rose-500" },
  outreach:    { label: "Outreach",    color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",   dot: "bg-green-500" },
  other:       { label: "Other",       color: "bg-muted text-muted-foreground",                                        dot: "bg-muted-foreground" },
};

export default function AdminEvents() {
  const { data: events = [], isLoading } = useListEvents();
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const blankForm = { title: "", description: "", date: "", time: "09:00", location: "", category: "service" };
  const [showAdd, setShowAdd] = useState(false);
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [form, setForm] = useState(blankForm);
  const [filterCat, setFilterCat] = useState("all");
  function f(key: string, val: string) { setForm(prev => ({ ...prev, [key]: val })); }

  function handleAdd() {
    createMutation.mutate({ data: { title: form.title, description: form.description || undefined, date: form.date, time: form.time, location: form.location, category: form.category } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() }); toast({ title: "Event created" }); setShowAdd(false); setForm(blankForm); },
      onError: () => toast({ title: "Error creating event", variant: "destructive" }),
    });
  }
  function handleUpdate() {
    if (!editEvent) return;
    updateMutation.mutate({ id: editEvent.id, data: { title: form.title, date: form.date, time: form.time, location: form.location, category: form.category } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() }); toast({ title: "Event updated" }); setEditEvent(null); setForm(blankForm); },
    });
  }
  function handleDelete(id: number) {
    if (!confirm("Delete this event?")) return;
    deleteMutation.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() }) });
  }

  const all = events as Event[];
  const now = new Date();
  const upcoming = all.filter(e => new Date(e.date) >= now).sort((a,b)=>a.date.localeCompare(b.date));
  const past = all.filter(e => new Date(e.date) < now).sort((a,b)=>b.date.localeCompare(a.date));
  const applyFilter = (list: Event[]) => filterCat === "all" ? list : list.filter(e => e.category === filterCat);

  function EventCard({ e, dimmed }: { e: Event; dimmed?: boolean }) {
    const cfg = CAT_CONFIG[e.category] ?? CAT_CONFIG.other;
    const d = new Date(e.date + "T00:00:00");
    const day = d.toLocaleDateString("en-UG", { day: "2-digit" });
    const month = d.toLocaleDateString("en-UG", { month: "short" }).toUpperCase();
    const weekday = d.toLocaleDateString("en-UG", { weekday: "long" });
    return (
      <div className={`glass-card overflow-hidden flex transition-all hover:shadow-md ${dimmed ? "opacity-60" : ""}`}>
        {/* Date accent */}
        <div className="w-16 shrink-0 blue-gradient-bg flex flex-col items-center justify-center py-4 text-white">
          <span className="text-2xl font-bold leading-none">{day}</span>
          <span className="text-[10px] font-semibold tracking-wider mt-0.5">{month}</span>
        </div>
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{e.title}</p>
              <p className="text-xs text-muted-foreground">{weekday}</p>
            </div>
            <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{e.time}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/>{e.location}</span>
            {e.attendeeCount > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3"/>{e.attendeeCount} attended</span>}
          </div>
        </div>
        <div className="flex flex-col gap-1 p-3 justify-center shrink-0">
          <button onClick={() => { setEditEvent(e); setForm({ title: e.title, description: "", date: e.date, time: e.time, location: e.location, category: e.category }); }}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader title="Events" description={`${upcoming.length} upcoming · ${past.length} past`}
        actions={<Button size="sm" onClick={() => { setForm(blankForm); setShowAdd(true); }}><Plus className="h-4 w-4 mr-1" />Add Event</Button>} />

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button onClick={() => setFilterCat("all")}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterCat === "all" ? "blue-gradient-bg text-white shadow" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
          All ({all.length})
        </button>
        {CATEGORIES.map(c => {
          const count = all.filter(e => e.category === c).length;
          if (count === 0) return null;
          const cfg = CAT_CONFIG[c];
          return (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterCat === c ? `${cfg.color} shadow ring-1 ring-current/30` : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({length:4}).map((_,i) => <div key={i} className="glass-card h-24 animate-pulse" />)}</div>
      ) : all.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">No events yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first church event to get started.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {applyFilter(upcoming).length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upcoming</h3>
              <div className="space-y-3">{applyFilter(upcoming).map(e => <EventCard key={e.id} e={e} />)}</div>
            </section>
          )}
          {applyFilter(past).length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Past</h3>
              <div className="space-y-3">{applyFilter(past).map(e => <EventCard key={e.id} e={e} dimmed />)}</div>
            </section>
          )}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Event</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div><Label>Title *</Label><Input className="mt-1" placeholder="Sunday Service" value={form.title} onChange={e=>f("title",e.target.value)} /></div>
            <div><Label>Description</Label><Textarea className="mt-1 resize-none" rows={2} placeholder="Brief description" value={form.description} onChange={e=>f("description",e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date *</Label><Input className="mt-1" type="date" value={form.date} onChange={e=>f("date",e.target.value)} /></div>
              <div><Label>Time *</Label><Input className="mt-1" type="time" value={form.time} onChange={e=>f("time",e.target.value)} /></div>
            </div>
            <div><Label>Location *</Label><Input className="mt-1" placeholder="Main Hall" value={form.location} onChange={e=>f("location",e.target.value)} /></div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v=>f("category",v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c=><SelectItem key={c} value={c}>{CAT_CONFIG[c].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.title||!form.date||!form.location||createMutation.isPending}>
              {createMutation.isPending?"Creating…":"Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editEvent} onOpenChange={v => { if (!v) setEditEvent(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Event</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div><Label>Title</Label><Input className="mt-1" value={form.title} onChange={e=>f("title",e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input className="mt-1" type="date" value={form.date} onChange={e=>f("date",e.target.value)} /></div>
              <div><Label>Time</Label><Input className="mt-1" type="time" value={form.time} onChange={e=>f("time",e.target.value)} /></div>
            </div>
            <div><Label>Location</Label><Input className="mt-1" value={form.location} onChange={e=>f("location",e.target.value)} /></div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v=>f("category",v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c=><SelectItem key={c} value={c}>{CAT_CONFIG[c].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setEditEvent(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>{updateMutation.isPending?"Saving…":"Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
