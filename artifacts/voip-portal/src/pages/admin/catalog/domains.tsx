import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useAdminGetDomainTlds,
  useAdminCreateDomainTld,
  useAdminUpdateDomainTld,
  useAdminDeleteDomainTld,
  DomainTld,
  type CreateDomainTldRequestStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Globe, Trash2, Edit2, Tag, Calendar, LayoutGrid, List, Upload, Download } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { formatZar } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

type TldForm = {
  tld: string;
  description: string;
  registrationYears: string;
  retailPriceExclVat: string;
  priceInclVat: string;
  resellerPriceExclVat: string;
  resellerPriceInclVat: string;
  status: CreateDomainTldRequestStatus;
  sortOrder: string;
};

const defaultForm: TldForm = {
  tld: "",
  description: "",
  registrationYears: "1",
  retailPriceExclVat: "",
  priceInclVat: "",
  resellerPriceExclVat: "",
  resellerPriceInclVat: "",
  status: "active",
  sortOrder: "0",
};

const POPULAR_TLDS = [".co.za", ".com", ".net", ".org", ".io", ".africa", ".joburg", ".capetown", ".durban", ".web.za", ".net.za", ".org.za"];

export default function AdminDomainsCatalog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: tlds = [], isLoading } = useAdminGetDomainTlds();

  const createTld = useAdminCreateDomainTld();
  const updateTld = useAdminUpdateDomainTld();
  const deleteTld = useAdminDeleteDomainTld();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTld, setEditingTld] = useState<DomainTld | null>(null);
  const [form, setForm] = useState<TldForm>(defaultForm);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [isImporting, setIsImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleRetailChange = (val: string) => {
    const n = parseFloat(val);
    const incl = !isNaN(n) ? (n * 1.15).toFixed(2) : "";
    setForm(f => ({ ...f, retailPriceExclVat: val, priceInclVat: incl }));
  };

  const handleResellerChange = (val: string) => {
    const n = parseFloat(val);
    const incl = !isNaN(n) ? (n * 1.15).toFixed(2) : "";
    setForm(f => ({ ...f, resellerPriceExclVat: val, resellerPriceInclVat: incl }));
  };

  const handleExport = () => {
    const headers = ["tld", "description", "retailPriceExclVat", "resellerPriceExclVat", "resellerPriceInclVat", "priceInclVat", "status"];
    const rows = tlds.map((t: DomainTld) => [
      t.tld, t.description ?? "",
      (t as any).retailPriceExclVat ?? "", (t as any).resellerPriceExclVat ?? "",
      (t as any).resellerPriceInclVat ?? "", (t as any).priceInclVat ?? "",
      t.status,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Domains"); XLSX.writeFile(wb, "domains-export.xlsx");
    toast({ title: `Exported ${rows.length} TLDs` });
  };
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = ""; setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer(); const wb = XLSX.read(buffer, { type: "array" }); const ws = wb.Sheets[wb.SheetNames[0]]; const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (rows.length === 0) { toast({ title: "No data found", variant: "destructive" }); return; }
      const mapped = rows.map(r => ({ tld: String(r.tld || r.TLD || "").trim(), description: String(r.description || r.Description || "").trim() || undefined, retailPriceExclVat: r.retailPriceExclVat || undefined, resellerPriceExclVat: r.resellerPriceExclVat || undefined, resellerPriceInclVat: r.resellerPriceInclVat || undefined, priceInclVat: r.priceInclVat || undefined, status: r.status === "inactive" ? "inactive" : "active" }));
      const resp = await fetch("/api/admin/domain-tlds/bulk-import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: mapped }), credentials: "include" });
      const result = await resp.json(); if (!resp.ok) throw new Error(result.error || "Import failed");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/domain-tlds"] }); queryClient.invalidateQueries({ queryKey: ["/api/catalog/domain-tlds"] });
      toast({ title: `Imported ${result.created} TLDs${result.skipped ? `, skipped ${result.skipped}` : ""}${result.errors?.length ? `, ${result.errors.length} errors` : ""}` });
    } catch (err: any) { toast({ title: "Import failed", description: err.message, variant: "destructive" }); } finally { setIsImporting(false); }
  };

  const openCreate = (prefillTld?: string) => {
    setEditingTld(null);
    setForm({ ...defaultForm, tld: prefillTld ?? "" });
    setIsModalOpen(true);
  };

  const openEdit = (tld: DomainTld) => {
    setEditingTld(tld);
    setForm({
      tld: tld.tld,
      description: tld.description ?? "",
      registrationYears: String(tld.registrationYears),
      retailPriceExclVat: tld.retailPriceExclVat != null ? String(tld.retailPriceExclVat) : "",
      priceInclVat: tld.priceInclVat != null ? String(tld.priceInclVat) : "",
      resellerPriceExclVat: tld.resellerPriceExclVat != null ? String(tld.resellerPriceExclVat) : "",
      resellerPriceInclVat: tld.resellerPriceInclVat != null ? String(tld.resellerPriceInclVat) : "",
      status: tld.status,
      sortOrder: String(tld.sortOrder),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      tld: form.tld.startsWith(".") ? form.tld : `.${form.tld}`,
      description: form.description || undefined,
      registrationYears: parseInt(form.registrationYears) || 1,
      retailPriceExclVat: form.retailPriceExclVat ? parseFloat(form.retailPriceExclVat) : undefined,
      priceInclVat: form.priceInclVat ? parseFloat(form.priceInclVat) : undefined,
      resellerPriceExclVat: form.resellerPriceExclVat ? parseFloat(form.resellerPriceExclVat) : undefined,
      resellerPriceInclVat: form.resellerPriceInclVat ? parseFloat(form.resellerPriceInclVat) : undefined,
      status: form.status,
      sortOrder: parseInt(form.sortOrder) || 0,
    };
    try {
      if (editingTld) {
        await updateTld.mutateAsync({ id: editingTld.id, data: payload });
        toast({ title: "TLD updated" });
      } else {
        await createTld.mutateAsync({ data: payload });
        toast({ title: "TLD added" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/domain-tlds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/domain-tlds"] }); queryClient.invalidateQueries({ queryKey: ["/api/catalog/new-items"] });
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "") : "Unknown error";
      toast({ title: "Error saving TLD", description: msg, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this domain TLD?")) return;
    try {
      await deleteTld.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/domain-tlds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/domain-tlds"] }); queryClient.invalidateQueries({ queryKey: ["/api/catalog/new-items"] });
      toast({ title: "TLD removed" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "") : "Unknown error";
      toast({ title: "Delete failed", description: msg, variant: "destructive" });
    }
  };

  const existingTlds = new Set((tlds as DomainTld[]).map(t => t.tld.toLowerCase()));
  const suggestedTlds = POPULAR_TLDS.filter(t => !existingTlds.has(t.toLowerCase()));

  return (
    <AppLayout role="admin" title="Domain Pricing">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-sm text-muted-foreground mt-1">
            {(tlds as DomainTld[]).length} TLD{(tlds as DomainTld[]).length !== 1 ? "s" : ""} configured
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
            onClick={() => openCreate()}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Add TLD
          </button>
        </div>
      </div>

      {/* Quick-add suggestions */}
      {suggestedTlds.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2.5">Quick Add Popular TLDs</p>
          <div className="flex flex-wrap gap-2">
            {suggestedTlds.map(tld => (
              <button
                key={tld}
                onClick={() => openCreate(tld)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-background border border-border hover:border-primary/40 hover:bg-primary/5 text-foreground transition-all"
              >
                <Plus className="w-3 h-3 text-primary" />
                {tld}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (tlds as DomainTld[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Globe className="w-14 h-14 text-muted-foreground/20 mb-4" />
          <p className="text-lg font-semibold text-muted-foreground">No domain TLDs configured</p>
          <p className="text-sm text-muted-foreground/70 mt-1 mb-6">Add TLDs and their pricing to offer domain registrations</p>
          <button onClick={() => openCreate()} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold">
            <Plus className="w-4 h-4" /> Add First TLD
          </button>
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border/60">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">TLD</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Description</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Reg Period</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Reseller excl VAT</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(tlds as DomainTld[]).map((tld, i) => (
                <motion.tr
                  key={tld.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-primary text-sm">{tld.tld}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-[160px] truncate">
                    {tld.description || <span className="italic opacity-50">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {tld.registrationYears} yr{tld.registrationYears !== 1 ? "s" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-primary">
                    {tld.resellerPriceExclVat != null ? formatZar(tld.resellerPriceExclVat) : <span className="text-muted-foreground/50 font-normal">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tld.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                      {tld.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(tld)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(tld.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(tlds as DomainTld[]).map((tld, i) => (
            <motion.div
              key={tld.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Tag className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-mono font-bold text-primary">{tld.tld}</p>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${tld.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                      {tld.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(tld)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(tld.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {tld.description && (
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{tld.description}</p>
              )}

              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                <Calendar className="w-3 h-3" />
                <span>{tld.registrationYears} year registration</span>
              </div>

              <div className="space-y-1 border-t border-border/60 pt-3">
                {tld.resellerPriceExclVat != null && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Reseller excl VAT</span>
                    <span className="font-semibold text-primary">{formatZar(tld.resellerPriceExclVat)}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTld ? `Edit ${editingTld.tld}` : "Add Domain TLD"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">TLD *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">.</span>
                <input
                  value={form.tld.startsWith(".") ? form.tld.slice(1) : form.tld}
                  onChange={e => setForm(f => ({ ...f, tld: e.target.value ? `.${e.target.value.replace(/^\./,"")}` : "" }))}
                  required
                  placeholder="co.za"
                  className="w-full pl-6 pr-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">e.g. co.za, com, net, org</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Registration Period (years)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={form.registrationYears}
                onChange={e => setForm(f => ({ ...f, registrationYears: e.target.value }))}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. South African domain extension"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as CreateDomainTldRequestStatus }))}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Sort Order</label>
              <input
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>

            <div className="md:col-span-2 border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pricing (per registration period)</p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reseller excl VAT (R)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.resellerPriceExclVat}
                  onChange={e => handleResellerChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTld.isPending || updateTld.isPending}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-60"
            >
              {editingTld ? "Save Changes" : "Add TLD"}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
