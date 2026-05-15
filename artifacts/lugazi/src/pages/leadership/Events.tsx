import { useListEvents, useCreateEvent, getListEventsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { leadershipNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

type Event = { id: number; title: string; date: string; time: string; location: string; category: string; attendeeCount: number };

export default function LeadershipEvents() {
  const { data: events = [], isLoading } = useListEvents();
  const createMutation = useCreateEvent();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const blank = { title: "", date: "", time: "09:00", location: "", category: "service" };
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(blank);
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  function handleAdd() {
    createMutation.mutate({ data: { title: form.title, date: form.date, time: form.time, location: form.location, category: form.category } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() }); toast({ title: "Event created" }); setShowAdd(false); setForm(blank); },
    });
  }

  return (
    <PortalLayout navItems={leadershipNavItems} portalLabel="Leadership Portal">
      <PageHeader title="Events" actions={<Button size="sm" onClick={() => { setForm(blank); setShowAdd(true); }} data-testid="button-add-event"><Plus className="h-4 w-4 mr-1" /> Add Event</Button>} />
      <DataTable
        columns={[{ header: "Title", key: "title" }, { header: "Date", key: "date" }, { header: "Time", key: "time" }, { header: "Location", key: "location" }, { header: "Attendees", key: "attendeeCount" }]}
        data={events as Event[]} keyField="id" isLoading={isLoading} emptyMessage="No events."
      />
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Event</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => f("title", e.target.value)} /></div>
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => f("date", e.target.value)} /></div>
            <div><Label>Time</Label><Input type="time" value={form.time} onChange={e => f("time", e.target.value)} /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={e => f("location", e.target.value)} /></div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v => f("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["service", "youth", "bible_study", "conference", "prayer", "outreach"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
