import { useState } from "react";
import { useListEvents, useCreateEvent, useUpdateEvent, useDeleteEvent, getListEventsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { adminNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Event = { id: number; title: string; date: string; time: string; location: string; category: string; attendeeCount: number };

const CATEGORIES = ["service", "youth", "bible_study", "conference", "prayer", "outreach", "other"];

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

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader title="Events" description="Manage church events" actions={
        <Button size="sm" onClick={() => { setForm(blankForm); setShowAdd(true); }} data-testid="button-add-event"><Plus className="h-4 w-4 mr-1" /> Add Event</Button>
      } />
      <DataTable
        columns={[
          { header: "Title", key: "title" },
          { header: "Date", key: "date" },
          { header: "Time", key: "time" },
          { header: "Location", key: "location" },
          { header: "Category", key: "category" },
          { header: "Attendance", key: "attendeeCount" },
          { header: "Actions", key: "actions", render: r => (
            <div className="flex gap-2">
              <button className="text-muted-foreground hover:text-foreground" onClick={() => { setEditEvent(r); setForm({ title: r.title, description: "", date: r.date, time: r.time, location: r.location, category: r.category }); }} data-testid={`button-edit-event-${r.id}`}><Pencil className="h-4 w-4" /></button>
              <button className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(r.id)} data-testid={`button-delete-event-${r.id}`}><Trash2 className="h-4 w-4" /></button>
            </div>
          )},
        ]}
        data={events as Event[]}
        keyField="id"
        isLoading={isLoading}
        emptyMessage="No events scheduled."
      />

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent data-testid="dialog-add-event">
          <DialogHeader><DialogTitle>Add Event</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => f("title", e.target.value)} data-testid="input-title" /></div>
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => f("date", e.target.value)} /></div>
            <div><Label>Time</Label><Input type="time" value={form.time} onChange={e => f("time", e.target.value)} /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={e => f("location", e.target.value)} /></div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => f("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending} data-testid="button-save-event">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editEvent} onOpenChange={() => setEditEvent(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Event</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => f("title", e.target.value)} /></div>
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => f("date", e.target.value)} /></div>
            <div><Label>Time</Label><Input type="time" value={form.time} onChange={e => f("time", e.target.value)} /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={e => f("location", e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEvent(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
