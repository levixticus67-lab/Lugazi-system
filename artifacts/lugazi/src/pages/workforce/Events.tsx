import { useListEvents } from "@workspace/api-client-react";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { workforceNavItems } from "./navItems";

type Event = { id: number; title: string; date: string; time: string; location: string; category: string };

export default function WorkforceEvents() {
  const { data: events = [], isLoading } = useListEvents();
  const upcoming = (events as Event[]).filter(e => new Date(e.date) >= new Date());
  return (
    <PortalLayout navItems={workforceNavItems} portalLabel="Workforce Portal">
      <PageHeader title="Events" description={`${upcoming.length} upcoming events`} />
      <DataTable
        columns={[{ header: "Title", key: "title" }, { header: "Date", key: "date" }, { header: "Time", key: "time" }, { header: "Location", key: "location" }, { header: "Category", key: "category" }]}
        data={events as Event[]} keyField="id" isLoading={isLoading} emptyMessage="No events."
      />
    </PortalLayout>
  );
}
