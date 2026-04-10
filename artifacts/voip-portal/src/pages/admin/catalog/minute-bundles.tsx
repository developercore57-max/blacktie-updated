import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { formatZar } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Clock, Edit2, LayoutGrid, List, Plus, Trash2, Upload, Download } from "lucide-react";
import * as XLSX from "xlsx";
import {
  MinuteBundle,
  MinuteBundleStatus,
  useAdminCreateMinuteBundle,
  useAdminDeleteMinuteBundle,
  useAdminGetMinuteBundles,
  useAdminUpdateMinuteBundle,
} from "@workspace/api-client-react";

type BundleForm = {
  name: string;
  description: string;
  minutes: string;
  retailPriceExclVat: string;
  priceInclVat: string;
  resellerPriceExclVat: string;
  resellerPriceInclVat: string;
  status: MinuteBundleStatus;
  sortOrder: string;
};

const defaultForm: BundleForm = {
  name: "",
  description: "",
  minutes: "60",
  retailPriceExclVat: "",
  priceInclVat: "",
  resellerPriceExclVat: "",
  resellerPriceInclVat: "",
  status: "active",
  sortOrder: "0",
};

function moneyOrNull(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function AdminMinuteBundlesCatalog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: bundles = [], isLoading } = useAdminGetMinuteBundles();
  const createBundle = useAdminCreateMinuteBundle();
  const updateBundle = useAdminUpdateMinuteBundle();
  const deleteBundle = useAdminDeleteMinuteBundle();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<MinuteBundle | null>(null);
  const [form, setForm] = useState<BundleForm>(defaultForm);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [isImporting, setIsImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleRetailChange = (val: string) => {
    const n = Number(val);
    const incl = Number.isFinite(n) ? (n * 1.15).toFixed(2) : "";
    setForm((f) => ({ ...f, retailPriceExclVat: val, priceInclVat: incl }));
  };

  const handleResellerChange = (val: string) => {
    const n = Number(val);
    const incl = Number.isFinite(n) ? (n * 1.15).toFixed(2) : "";
    setForm((f) => ({ ...f, resellerPriceExclVat: val, resellerPriceInclVat: incl }));
  };

  const handleExport = () => {
    const headers = ["name", "description", "minutes", "retailPriceExclVat", "resellerPriceExclVat", "resellerPriceInclVat", "priceInclVat", "status"];
    const rows = bundles.map((b: MinuteBundle) => [
      b.name, b.description ?? "", b.minutes,
      (b as any).retailPriceExclVat ?? "", (b as any).resellerPriceExclVat ?? "",
      (b as any).resellerPriceInclVat ?? "", (b as any).priceInclVat ?? "",
      b.status,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "MinuteBundles"); XLSX.writeFile(wb, "minute-bundles-export.xlsx");
    toast({ title: `Exported ${rows.length} bundles` });
  };
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = ""; setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer(); const wb = XLSX.read(buffer, { type: "array" }); const ws = wb.Sheets[wb.SheetNames[0]]; const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (rows.length === 0) { toast({ title: "No data found", variant: "destructive" }); return; }
      const mapped = rows.map(r => ({ name: String(r.name || r.Name || "").trim(), description: String(r.description || r.Description || "").trim() || undefined, minutes: Number(r.minutes || r.Minutes || 0), retailPriceExclVat: r.retailPriceExclVat || undefined, resellerPriceExclVat: r.resellerPriceExclVat || undefined, resellerPriceInclVat: r.resellerPriceInclVat || undefined, priceInclVat: r.priceInclVat || undefined, status: r.status === "inactive" ? "inactive" : "active" }));
      const resp = await fetch("/api/admin/minute-bundles/bulk-import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: mapped }), credentials: "include" });
      const result = await resp.json(); if (!resp.ok) throw new Error(result.error || "Import failed");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/minute-bundles"] });
      toast({ title: `Imported ${result.created} bundles${result.skipped ? `, skipped ${result.skipped}` : ""}${result.errors?.length ? `, ${result.errors.length} errors` : ""}` });
    } catch (err: any) { toast({ title: "Import failed", description: err.message, variant: "destructive" }); } finally { setIsImporting(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setIsModalOpen(true);
  };

  const openEdit = (b: MinuteBundle) => {
    setEditing(b);
    setForm({
      name: b.name,
      description: b.description ?? "",
      minutes: String(b.minutes),
      retailPriceExclVat: b.retailPriceExclVat != null ? String(b.retailPriceExclVat) : "",
      priceInclVat: b.priceInclVat != null ? String(b.priceInclVat) : "",
      resellerPriceExclVat: b.resellerPriceExclVat != null ? String(b.resellerPriceExclVat) : "",
      resellerPriceInclVat: b.resellerPriceInclVat != null ? String(b.resellerPriceInclVat) : "",
      status: b.status,
      sortOrder: String(b.sortOrder),
    });
    setIsModalOpen(true);
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/minute-bundles"] });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const minutes = Number(form.minutes);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      toast({ title: "Minutes must be a positive number", variant: "destructive" });
      return;
    }

    const payload = {
      name: form.name,
      description: form.description || null,
      minutes: Math.floor(minutes),
      retailPriceExclVat: form.retailPriceExclVat ? moneyOrNull(form.retailPriceExclVat) : null,
      priceInclVat: form.priceInclVat ? moneyOrNull(form.priceInclVat) : null,
      resellerPriceExclVat: form.resellerPriceExclVat ? moneyOrNull(form.resellerPriceExclVat) : null,
      resellerPriceInclVat: form.resellerPriceInclVat ? moneyOrNull(form.resellerPriceInclVat) : null,
      status: form.status,
      sortOrder: Number(form.sortOrder) || 0,
    };

    try {
      if (editing) {
        await updateBundle.mutateAsync({ id: editing.id, data: payload });
        toast({ title: "Minute bundle updated" });
      } else {
        await createBundle.mutateAsync({ data: payload });
        toast({ title: "Minute bundle created" });
      }
      await invalidate();
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "") : "Unknown error";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this minute bundle?")) return;
    try {
      await deleteBundle.mutateAsync({ id });
      await invalidate();
      toast({ title: "Minute bundle deleted" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "") : "Unknown error";
      toast({ title: "Delete failed", description: msg, variant: "destructive" });
    }
  };

  const list = bundles as MinuteBundle[];

  return (
    <AppLayout role="admin" title="Minute Bundles Catalog">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-sm text-muted-foreground mt-1">
            {list.length} bundle{list.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/40 rounded-lg p-0.5 border border-border/50">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "table" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
          <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
          <button onClick={() => importFileRef.current?.click()} disabled={isImporting} title="Import from Excel" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"><Upload className="w-3.5 h-3.5" /> {isImporting ? "Importing..." : "Import"}</button>
          <button onClick={handleExport} title="Export to Excel" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"><Download className="w-3.5 h-3.5" /> Export</button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Bundle
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Clock className="w-14 h-14 text-muted-foreground/20 mb-4" />
          <p className="text-lg font-semibold text-muted-foreground">No minute bundles configured</p>
          <p className="text-sm text-muted-foreground/70 mt-1 mb-6">Add bundles to sell minutes as catalog items</p>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold">
            <Plus className="w-4 h-4" /> Add First Bundle
          </button>
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border/60">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Bundle</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Minutes</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Reseller excl VAT</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.map((b, i) => (
                <motion.tr
                  key={b.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border/40 hover:bg-muted/10 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold">{b.name}</div>
                    {b.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{b.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{b.minutes}</td>
                  <td className="px-4 py-3 text-right font-medium">{(b as any).resellerPriceExclVat != null ? formatZar((b as any).resellerPriceExclVat) : "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-[11px] font-semibold ${
                        b.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(b)}
                        className="p-2 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{b.name}</div>
                  {b.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.description}</div>}
                </div>
                <span
                  className={`shrink-0 px-2 py-1 rounded-full text-[11px] font-semibold ${
                    b.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {b.status}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Minutes</div>
                  <div className="mt-1 font-semibold">{b.minutes}</div>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Reseller excl VAT</div>
                  <div className="mt-1 font-semibold">{(b as any).resellerPriceExclVat != null ? formatZar((b as any).resellerPriceExclVat) : "—"}</div>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border border-border/50">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Sort</div>
                  <div className="mt-1 font-semibold">{b.sortOrder}</div>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => openEdit(b)}
                  className="px-3 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted/20 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="px-3 py-2 text-xs font-semibold rounded-xl border border-red-500/30 text-red-600 hover:bg-red-500/10 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? "Edit Minute Bundle" : "Add Minute Bundle"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Minutes</label>
              <input
                value={form.minutes}
                onChange={(e) => setForm((f) => ({ ...f, minutes: e.target.value }))}
                type="number"
                min={1}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-background text-sm min-h-20"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Reseller price excl VAT</label>
              <input
                value={form.resellerPriceExclVat}
                onChange={(e) => handleResellerChange(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as MinuteBundleStatus }))}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Sort order</label>
              <input
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                type="number"
                className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-border bg-background text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}

