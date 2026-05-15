import { useState } from "react";
import { useListTransactions, useGetFinanceSummary, useCreateTransaction, useDeleteTransaction, getListTransactionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import StatCard from "@/components/StatCard";
import { adminNavItems } from "./navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown } from "lucide-react";

type Transaction = { id: number; type: string; amount: number; currency: string; description: string; category: string; date: string; memberName?: string | null; createdAt: string };

export default function AdminFinance() {
  const { data: transactions = [], isLoading } = useListTransactions();
  const { data: summary } = useGetFinanceSummary();
  const createMutation = useCreateTransaction();
  const deleteMutation = useDeleteTransaction();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type: "tithe", amount: "", description: "", category: "General", date: new Date().toISOString().split("T")[0] });

  function handleAdd() {
    if (!form.amount || !form.description) { toast({ title: "Amount and description required", variant: "destructive" }); return; }
    createMutation.mutate(
      { data: { type: form.type, amount: Number(form.amount), currency: "UGX", description: form.description, category: form.category, date: form.date } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
          toast({ title: "Transaction recorded" });
          setShowAdd(false);
          setForm({ type: "tithe", amount: "", description: "", category: "General", date: new Date().toISOString().split("T")[0] });
        },
        onError: () => toast({ title: "Error recording transaction", variant: "destructive" }),
      }
    );
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this transaction?")) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() }),
    });
  }

  return (
    <PortalLayout navItems={adminNavItems} portalLabel="Admin Portal">
      <PageHeader
        title="Finance"
        description="Track income and expenses"
        actions={<Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-transaction"><Plus className="h-4 w-4 mr-1" /> Record</Button>}
      />

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Income" value={`UGX ${Number(summary.totalIncome).toLocaleString()}`} icon={<TrendingUp className="h-5 w-5" />} />
          <StatCard title="Total Expenses" value={`UGX ${Number(summary.totalExpenses).toLocaleString()}`} icon={<TrendingDown className="h-5 w-5" />} />
          <StatCard title="Net Balance" value={`UGX ${Number(summary.netBalance).toLocaleString()}`} icon={<Wallet className="h-5 w-5" />} />
          <StatCard title="This Month" value={`UGX ${Number(summary.thisMonth).toLocaleString()}`} subtitle={`Tithes: UGX ${Number(summary.tithes).toLocaleString()}`} />
        </div>
      )}

      <DataTable
        columns={[
          { header: "Date", key: "date" },
          { header: "Type", key: "type" },
          { header: "Amount (UGX)", key: "amount", render: r => Number(r.amount).toLocaleString() },
          { header: "Description", key: "description" },
          { header: "Category", key: "category" },
          { header: "Actions", key: "actions", render: r => (
            <button className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(r.id)} data-testid={`button-delete-tx-${r.id}`}><Trash2 className="h-4 w-4" /></button>
          )},
        ]}
        data={transactions as Transaction[]}
        keyField="id"
        isLoading={isLoading}
        emptyMessage="No transactions recorded."
      />

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent data-testid="dialog-add-transaction">
          <DialogHeader><DialogTitle>Record Transaction</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger data-testid="select-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["tithe", "offering", "donation", "seed", "expense"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount (UGX)</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} data-testid="input-amount" /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} data-testid="input-description" /></div>
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} data-testid="input-date" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending} data-testid="button-save-transaction">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
