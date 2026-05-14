import { useListEvents } from "@workspace/api-client-react";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { memberNavItems } from "./navItems";

type Event = { id: number; title: string; date: string; time: string; location: string; category: string; attendeeCount: number };

export default function MemberEvents() {
  const { data: events = [], isLoading } = useListEvents();
  const upcoming = (events as Event[]).filter(e => new Date(e.date) >= new Date()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <PortalLayout navItems={memberNavItems} portalLabel="Member Portal">
      <PageHeader title="Upcoming Events" description={`${upcoming.length} events coming up`} />
      <DataTable
        columns={[{ header: "Event", key: "title" }, { header: "Date", key: "date" }, { header: "Time", key: "time" }, { header: "Location", key: "location" }, { header: "Category", key: "category" }]}
        data={upcoming} keyField="id" isLoading={isLoading} emptyMessage="No upcoming events."
      />
    </PortalLayout>
  );
}
