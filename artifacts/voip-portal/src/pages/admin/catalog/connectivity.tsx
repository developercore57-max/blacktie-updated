import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useAdminGetConnectivityCategories,
  useAdminGetConnectivityItems,
  useAdminCreateConnectivityItem,
  useAdminUpdateConnectivityItem,
  useAdminDeleteConnectivityItem,
  useAdminCreateConnectivityCategory,
  useAdminUpdateConnectivityCategory,
  useAdminDeleteConnectivityCategory,
  ConnectivityItem,
  Category,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wifi, Plus, Trash2, Edit2, LayoutGrid, List, Tag, Clock,
  Zap, Building, Cable, SignalHigh, FolderTree, Folder, ChevronRight,
  Settings2, X, Upload, Download,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { formatZar } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

type ViewMode = "card" | "list";
type SidebarMode = "browse" | "manage";

interface ItemForm {
  categoryId: string;
  name: string;
  description: string;
  speed: string;
  provider: string;
  contention: string;
  contractMonths: string;
  setupFeeExclVat: string;
  retailPriceExclVat: string;
  retailPriceInclVat: string;
  resellerPriceExclVat: string;
  resellerPriceInclVat: string;
  status: string;
  sortOrder: string;
}

interface CatForm {
  name: string;
  description: string;
  parentId: string;
  sortOrder: string;
}

const defaultItemForm: ItemForm = {
  categoryId: "", name: "", description: "", speed: "", provider: "",
  contention: "", contractMonths: "12", setupFeeExclVat: "",
  retailPriceExclVat: "", retailPriceInclVat: "",
  resellerPriceExclVat: "", resellerPriceInclVat: "",
  status: "active", sortOrder: "0",
};

const defaultCatForm: CatForm = { name: "", description: "", parentId: "", sortOrder: "0" };

const VAT = 0.15;

function autoFillVat(changed: keyof ItemForm, value: string): Partial<ItemForm> {
  const n = parseFloat(value) || 0;
  if (changed === "retailPriceExclVat") return { retailPriceInclVat: (n * (1 + VAT)).toFixed(2) };
  if (changed === "retailPriceInclVat") return { retailPriceExclVat: (n / (1 + VAT)).toFixed(2) };
  if (changed === "resellerPriceExclVat") return { resellerPriceInclVat: (n * (1 + VAT)).toFixed(2) };
  if (changed === "resellerPriceInclVat") return { resellerPriceExclVat: (n / (1 + VAT)).toFixed(2) };
  return {};
}

function getCategoryHierarchy(categories: Category[], catId: number | null | undefined): string {
  if (!catId) return "Uncategorised";
  const cat = categories.find(c => c.id === catId);
  if (!cat) return "Unknown";
  if (cat.parentId) {
    const parent = categories.find(c => c.id === cat.parentId);
    return parent ? `${parent.name} → ${cat.name}` : cat.name;
  }
  return cat.name;
}

function PriceInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-semibold">R</span>
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="0.00"
        />
      </div>
    </div>
  );
}

export default function AdminConnectivityCatalog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: categories = [] } = useAdminGetConnectivityCategories();
  const { data: items = [] } = useAdminGetConnectivityItems();

  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("browse");
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());

  // Item modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConnectivityItem | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm>(defaultItemForm);

  // Category modal
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState<CatForm>(defaultCatForm);
  const [isImporting, setIsImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const createItem = useAdminCreateConnectivityItem();
  const updateItem = useAdminUpdateConnectivityItem();
  const delItem = useAdminDeleteConnectivityItem();

  const createCat = useAdminCreateConnectivityCategory();
  const updateCat = useAdminUpdateConnectivityCategory();
  const delCat = useAdminDeleteConnectivityCategory();

  const filteredItems = selectedCatId
    ? items.filter(i => i.categoryId === selectedCatId)
    : items;

  const parentCategories = (categories as Category[]).filter(c => !c.parentId);
  const subCatsOf = (id: number) => (categories as Category[]).filter(c => c.parentId === id);

  function toggleExpand(id: number) {
    setExpandedCats(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  const handleExport = () => {
    const headers = ["name", "description", "categoryName", "speed", "provider", "contention", "contractMonths", "setupFeeExclVat", "retailPriceExclVat", "resellerPriceExclVat", "priceInclVat", "status"];
    const rows = items.map((item: ConnectivityItem) => [
      item.name, item.description ?? "", (item as any).categoryName ?? "",
      item.speed ?? "", item.provider ?? "", item.contention ?? "", item.contractMonths ?? "",
      item.setupFeeExclVat ?? "", (item as any).retailPriceExclVat ?? "",
      (item as any).resellerPriceExclVat ?? "",
      (item as any).retailPriceInclVat ?? (item as any).priceInclVat ?? "",
      item.status,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Connectivity"); XLSX.writeFile(wb, "connectivity-export.xlsx");
    toast({ title: `Exported ${rows.length} items` });
  };
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = ""; setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer(); const wb = XLSX.read(buffer, { type: "array" }); const ws = wb.Sheets[wb.SheetNames[0]]; const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (rows.length === 0) { toast({ title: "No data found", variant: "destructive" }); return; }
      const mapped = rows.map(r => ({ name: String(r.name || r.Name || "").trim(), description: String(r.description || r.Description || "").trim() || undefined, speed: r.speed || undefined, provider: r.provider || undefined, contention: r.contention || undefined, contractMonths: r.contractMonths ? parseInt(String(r.contractMonths)) : undefined, setupFeeExclVat: r.setupFeeExclVat || undefined, retailPriceExclVat: r.retailPriceExclVat || undefined, resellerPriceExclVat: r.resellerPriceExclVat || undefined, retailPriceInclVat: r.priceInclVat || r.retailPriceInclVat || undefined, status: r.status === "inactive" ? "inactive" : "active" }));
      const resp = await fetch("/api/admin/connectivity-items/bulk-import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: mapped }), credentials: "include" });
      const result = await resp.json(); if (!resp.ok) throw new Error(result.error || "Import failed");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/connectivity-items"] }); queryClient.invalidateQueries({ queryKey: ["/api/catalog/connectivity"] });
      toast({ title: `Imported ${result.created} items${result.skipped ? `, skipped ${result.skipped}` : ""}${result.errors?.length ? `, ${result.errors.length} errors` : ""}` });
    } catch (err: any) { toast({ title: "Import failed", description: err.message, variant: "destructive" }); } finally { setIsImporting(false); }
  };

  // ── Item CRUD ──────────────────────────────────────────────────────────────

  function openCreateItem() {
    setEditingItem(null);
    setItemForm({ ...defaultItemForm, categoryId: selectedCatId ? String(selectedCatId) : "" });
    setIsItemModalOpen(true);
  }

  function openEditItem(item: ConnectivityItem) {
    setEditingItem(item);
    setItemForm({
      categoryId: item.categoryId ? String(item.categoryId) : "",
      name: item.name,
      description: item.description ?? "",
      speed: item.speed ?? "",
      provider: item.provider ?? "",
      contention: item.contention ?? "",
      contractMonths: String(item.contractMonths ?? 12),
      setupFeeExclVat: item.setupFeeExclVat != null ? String(item.setupFeeExclVat) : "",
      retailPriceExclVat: item.retailPriceExclVat != null ? String(item.retailPriceExclVat) : "",
      retailPriceInclVat: item.retailPriceInclVat != null ? String(item.retailPriceInclVat) : "",
      resellerPriceExclVat: item.resellerPriceExclVat != null ? String(item.resellerPriceExclVat) : "",
      resellerPriceInclVat: item.resellerPriceInclVat != null ? String(item.resellerPriceInclVat) : "",
      status: item.status ?? "active",
      sortOrder: String(item.sortOrder ?? 0),
    });
    setIsItemModalOpen(true);
  }

  function setItemField(key: keyof ItemForm, value: string) {
    const extra = autoFillVat(key, value);
    setItemForm(f => ({ ...f, [key]: value, ...extra }));
  }

  async function handleSaveItem() {
    if (!itemForm.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const payload = {
      categoryId: itemForm.categoryId ? parseInt(itemForm.categoryId) : undefined,
      name: itemForm.name.trim(),
      description: itemForm.description || undefined,
      speed: itemForm.speed || undefined,
      provider: itemForm.provider || undefined,
      contention: itemForm.contention || undefined,
      contractMonths: parseInt(itemForm.contractMonths) || 12,
      setupFeeExclVat: itemForm.setupFeeExclVat ? parseFloat(itemForm.setupFeeExclVat) : undefined,
      retailPriceExclVat: itemForm.retailPriceExclVat ? parseFloat(itemForm.retailPriceExclVat) : undefined,
      retailPriceInclVat: itemForm.retailPriceInclVat ? parseFloat(itemForm.retailPriceInclVat) : undefined,
      resellerPriceExclVat: itemForm.resellerPriceExclVat ? parseFloat(itemForm.resellerPriceExclVat) : undefined,
      resellerPriceInclVat: itemForm.resellerPriceInclVat ? parseFloat(itemForm.resellerPriceInclVat) : undefined,
      status: itemForm.status as "active" | "inactive",
      sortOrder: parseInt(itemForm.sortOrder) || 0,
    };
    try {
      if (editingItem) {
        await updateItem.mutateAsync({ id: editingItem.id, data: payload });
        toast({ title: `"${payload.name}" updated` });
      } else {
        await createItem.mutateAsync({ data: payload });
        toast({ title: `"${payload.name}" added` });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/connectivity-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/connectivity"] }); queryClient.invalidateQueries({ queryKey: ["/api/catalog/new-items"] });
      setIsItemModalOpen(false);
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  }

  async function handleDeleteItem(item: ConnectivityItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await delItem.mutateAsync({ id: item.id });
      toast({ title: `"${item.name}" deleted` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/connectivity-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/connectivity"] }); queryClient.invalidateQueries({ queryKey: ["/api/catalog/new-items"] });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  }

  // ── Category CRUD ──────────────────────────────────────────────────────────

  function openCreateCat(parentId?: number) {
    setEditingCat(null);
    setCatForm({ ...defaultCatForm, parentId: parentId ? String(parentId) : "" });
    setIsCatModalOpen(true);
  }

  function openEditCat(cat: Category) {
    setEditingCat(cat);
    setCatForm({
      name: cat.name,
      description: cat.description ?? "",
      parentId: cat.parentId ? String(cat.parentId) : "",
      sortOrder: String(cat.sortOrder),
    });
    setIsCatModalOpen(true);
  }

  async function handleSaveCat() {
    if (!catForm.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const payload = {
      name: catForm.name.trim(),
      description: catForm.description.trim() || undefined,
      parentId: catForm.parentId ? parseInt(catForm.parentId) : undefined,
      sortOrder: parseInt(catForm.sortOrder) || 0,
    };
    try {
      if (editingCat) {
        await updateCat.mutateAsync({ id: editingCat.id, data: payload });
        toast({ title: `"${payload.name}" updated` });
      } else {
        await createCat.mutateAsync({ data: payload });
        toast({ title: `"${payload.name}" created` });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/connectivity-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/connectivity"] }); queryClient.invalidateQueries({ queryKey: ["/api/catalog/new-items"] });
      setIsCatModalOpen(false);
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  }

  async function handleDeleteCat(cat: Category) {
    const hasSubs = (categories as Category[]).some(c => c.parentId === cat.id);
    if (hasSubs) {
      toast({ title: "Remove sub-categories first", variant: "destructive" });
      return;
    }
    const hasItems = items.some(i => i.categoryId === cat.id);
    if (hasItems) {
      toast({ title: "Reassign items before deleting this category", variant: "destructive" });
      return;
    }
    if (!confirm(`Delete "${cat.name}"?`)) return;
    try {
      await delCat.mutateAsync({ id: cat.id });
      toast({ title: `"${cat.name}" deleted` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/connectivity-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/connectivity"] }); queryClient.invalidateQueries({ queryKey: ["/api/catalog/new-items"] });
      if (selectedCatId === cat.id) setSelectedCatId(null);
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  }

  return (
    <AppLayout role="admin">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Connectivity Catalog</h1>
              <p className="text-xs text-muted-foreground">Manage fibre, LTE, wireless &amp; other connectivity products</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("card")}
                className={`p-2 ${viewMode === "card" ? "bg-primary text-primary-foreground" : "hover:bg-muted/20 text-muted-foreground"}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted/20 text-muted-foreground"}`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
            <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
            <button onClick={() => importFileRef.current?.click()} disabled={isImporting} title="Import from Excel" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"><Upload className="w-3.5 h-3.5" /> {isImporting ? "Importing..." : "Import"}</button>
            <button onClick={handleExport} title="Export to Excel" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"><Download className="w-3.5 h-3.5" /> Export</button>
            <button
              onClick={openCreateItem}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
        </div>

        <div className="flex gap-5">
          {/* Sidebar */}
          <div className="w-56 shrink-0 space-y-2">

            {/* Sidebar mode toggle */}
            <div className="flex items-center gap-1 p-1 bg-muted/20 border border-border rounded-xl">
              <button
                onClick={() => setSidebarMode("browse")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${sidebarMode === "browse" ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Wifi className="w-3 h-3" /> Browse
              </button>
              <button
                onClick={() => setSidebarMode("manage")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${sidebarMode === "manage" ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}
              >
                <FolderTree className="w-3 h-3" /> Manage
              </button>
            </div>

            <AnimatePresence mode="wait">
              {sidebarMode === "browse" ? (
                <motion.div
                  key="browse"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-1"
                >
                  {/* All items */}
                  <button
                    onClick={() => setSelectedCatId(null)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      !selectedCatId ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground hover:bg-muted/20 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2"><Wifi className="w-3.5 h-3.5" />All Items</div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${!selectedCatId ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>
                      {items.length}
                    </span>
                  </button>

                  {parentCategories.map(parent => {
                    const subs = subCatsOf(parent.id);
                    const parentActive = selectedCatId === parent.id;
                    return (
                      <div key={parent.id}>
                        <button
                          onClick={() => setSelectedCatId(parent.id === selectedCatId ? null : parent.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                            parentActive ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground hover:bg-muted/20 hover:text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Cable className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{parent.name}</span>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${parentActive ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>
                            {items.filter(i => i.categoryId === parent.id).length}
                          </span>
                        </button>
                        {subs.map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => setSelectedCatId(sub.id === selectedCatId ? null : sub.id)}
                            className={`w-full flex items-center justify-between pl-7 pr-3 py-1.5 rounded-lg text-xs transition-all ${
                              selectedCatId === sub.id ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 font-semibold" : "text-muted-foreground hover:bg-muted/20 hover:text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Tag className="w-3 h-3 shrink-0" />
                              <span className="truncate">{sub.name}</span>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${selectedCatId === sub.id ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>
                              {items.filter(i => i.categoryId === sub.id).length}
                            </span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </motion.div>
              ) : (
                /* ── Manage mode ── */
                <motion.div
                  key="manage"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-2"
                >
                  {/* Stats mini-row */}
                  <div className="flex gap-1.5">
                    <div className="flex-1 bg-background border border-border rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-foreground">{parentCategories.length}</p>
                      <p className="text-[10px] text-muted-foreground">Categories</p>
                    </div>
                    <div className="flex-1 bg-background border border-border rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-foreground">{(categories as Category[]).filter(c => !!c.parentId).length}</p>
                      <p className="text-[10px] text-muted-foreground">Sub-cats</p>
                    </div>
                  </div>

                  {/* Add top-level category */}
                  <button
                    onClick={() => openCreateCat()}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-primary/40 text-xs font-semibold text-primary hover:bg-primary/5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Category
                  </button>

                  {/* Category tree with CRUD */}
                  {parentCategories.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground/50">
                      <FolderTree className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">No categories yet</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {parentCategories.map(parent => {
                        const subs = subCatsOf(parent.id);
                        const isExpanded = expandedCats.has(parent.id);
                        return (
                          <div key={parent.id} className="bg-background border border-border rounded-xl overflow-hidden">
                            {/* Parent row */}
                            <div className="flex items-center gap-1.5 px-2.5 py-2 group">
                              <button
                                onClick={() => toggleExpand(parent.id)}
                                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                              >
                                <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""} ${subs.length === 0 ? "opacity-20" : ""}`} />
                              </button>
                              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                <Folder className="w-3 h-3 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">{parent.name}</p>
                                <p className="text-[10px] text-muted-foreground">{subs.length} sub-cat{subs.length !== 1 ? "s" : ""} · {items.filter(i => i.categoryId === parent.id).length} items</p>
                              </div>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  onClick={() => openCreateCat(parent.id)}
                                  title="Add sub-category"
                                  className="p-1 hover:bg-emerald-500/10 rounded text-muted-foreground hover:text-emerald-600 transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => openEditCat(parent)}
                                  title="Edit"
                                  className="p-1 hover:bg-primary/10 rounded text-muted-foreground hover:text-primary transition-colors"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCat(parent)}
                                  title="Delete"
                                  className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Sub-category rows */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="overflow-hidden border-t border-border/50 bg-muted/5"
                                >
                                  {subs.map(sub => (
                                    <div key={sub.id} className="flex items-center gap-1.5 pl-8 pr-2.5 py-1.5 group/sub border-t border-dashed border-border/30 first:border-t-0">
                                      <Tag className="w-2.5 h-2.5 text-primary/50 shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-medium text-foreground truncate">{sub.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{items.filter(i => i.categoryId === sub.id).length} items</p>
                                      </div>
                                      <div className="flex items-center gap-0.5 opacity-0 group-hover/sub:opacity-100 transition-opacity shrink-0">
                                        <button
                                          onClick={() => openEditCat(sub)}
                                          title="Edit"
                                          className="p-1 hover:bg-primary/10 rounded text-muted-foreground hover:text-primary transition-colors"
                                        >
                                          <Edit2 className="w-2.5 h-2.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteCat(sub)}
                                          title="Delete"
                                          className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                          <Trash2 className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  {/* Quick add sub */}
                                  <button
                                    onClick={() => openCreateCat(parent.id)}
                                    className="w-full flex items-center gap-1.5 pl-8 pr-2.5 py-1.5 text-[11px] text-primary/60 hover:text-primary hover:bg-primary/5 transition-colors border-t border-dashed border-border/30"
                                  >
                                    <Plus className="w-2.5 h-2.5" /> Add sub-category
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Category context bar */}
            {selectedCatId && sidebarMode === "browse" && (
              <div className="flex items-center justify-between mb-4 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-center gap-2 text-sm">
                  <Folder className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-foreground">{getCategoryHierarchy(categories as Category[], selectedCatId)}</span>
                  <span className="text-muted-foreground text-xs">· {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}</span>
                </div>
                <button onClick={() => setSelectedCatId(null)} className="p-1 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {filteredItems.length === 0 ? (
              <div className="bg-background border border-border rounded-xl p-12 text-center">
                <Wifi className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No connectivity items yet</p>
                <button onClick={openCreateItem} className="mt-3 text-xs font-semibold text-primary hover:underline">
                  + Add your first item
                </button>
              </div>
            ) : viewMode === "card" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="bg-background border border-border rounded-xl p-4 group hover:shadow-md hover:shadow-black/5 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <SignalHigh className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditItem(item)} className="p-1.5 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteItem(item)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-semibold text-sm text-foreground mb-0.5 truncate">{item.name}</h3>
                    {item.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{item.description}</p>}

                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.speed && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-blue-500/10 text-blue-500 border-blue-500/20">
                          <Zap className="w-2.5 h-2.5" />{item.speed}
                        </span>
                      )}
                      {item.provider && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-violet-500/10 text-violet-500 border-violet-500/20">
                          <Building className="w-2.5 h-2.5" />{item.provider}
                        </span>
                      )}
                      {item.contractMonths && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-600 border-amber-500/20">
                          <Clock className="w-2.5 h-2.5" />{item.contractMonths}mo
                        </span>
                      )}
                    </div>

                    <div className="border-t border-dashed border-border pt-2 space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Retail (incl VAT)</span>
                        <span className="font-bold text-foreground">{formatZar(item.retailPriceInclVat ?? 0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Reseller (incl VAT)</span>
                        <span className="font-semibold text-primary">{formatZar(item.resellerPriceInclVat ?? 0)}</span>
                      </div>
                      {item.setupFeeExclVat != null && item.setupFeeExclVat > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Setup fee</span>
                          <span className="text-muted-foreground">{formatZar(item.setupFeeExclVat)}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground truncate">
                        {getCategoryHierarchy(categories as Category[], item.categoryId)}
                      </p>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.status === "active"
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : "bg-red-500/10 text-red-500 border-red-500/20"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-background border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="px-5 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Speed</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Provider</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Retail incl</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Reseller incl</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredItems.map((item, idx) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        className="hover:bg-muted/10 transition-colors group"
                      >
                        <td className="px-5 py-3">
                          <p className="font-semibold text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{getCategoryHierarchy(categories as Category[], item.categoryId)}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{item.speed ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{item.provider ?? "—"}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{formatZar(item.retailPriceInclVat ?? 0)}</td>
                        <td className="px-4 py-3 font-semibold text-primary">{formatZar(item.resellerPriceInclVat ?? 0)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.status === "active"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditItem(item)} className="p-1.5 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteItem(item)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Item Modal ──────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItem ? `Edit: ${editingItem.name}` : "Add Connectivity Item"}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Category</label>
            <select
              value={itemForm.categoryId}
              onChange={e => setItemField("categoryId", e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">— No category</option>
              {(categories as Category[]).map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.parentId ? `  ↳ ${cat.name}` : cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1.5">Name *</label>
              <input
                value={itemForm.name}
                onChange={e => setItemField("name", e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. Fibre 100/50 Mbps Residential"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Status</label>
              <select
                value={itemForm.status}
                onChange={e => setItemField("status", e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Description</label>
            <textarea
              value={itemForm.description}
              onChange={e => setItemField("description", e.target.value)}
              rows={2}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="Optional description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Speed</label>
              <input
                value={itemForm.speed}
                onChange={e => setItemField("speed", e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. 100/50 Mbps"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Provider</label>
              <input
                value={itemForm.provider}
                onChange={e => setItemField("provider", e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. Openserve"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Contention Ratio</label>
              <input
                value={itemForm.contention}
                onChange={e => setItemField("contention", e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. 1:1"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Contract (months)</label>
              <input
                type="number"
                min="0"
                value={itemForm.contractMonths}
                onChange={e => setItemField("contractMonths", e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Pricing</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <PriceInput label="Setup Fee (excl VAT)" value={itemForm.setupFeeExclVat} onChange={v => setItemField("setupFeeExclVat", v)} />
              <div />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PriceInput label="Reseller excl VAT" value={itemForm.resellerPriceExclVat} onChange={v => setItemField("resellerPriceExclVat", v)} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setIsItemModalOpen(false)}
              className="flex-1 px-4 py-2 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted/20 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveItem}
              disabled={createItem.isPending || updateItem.isPending}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 disabled:opacity-60"
            >
              {editingItem ? "Save Changes" : "Add Item"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Category Modal ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title={editingCat ? `Edit: ${editingCat.name}` : catForm.parentId ? "Add Sub-Category" : "Add Category"}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Type</label>
            <select
              value={catForm.parentId}
              onChange={e => setCatForm(f => ({ ...f, parentId: e.target.value }))}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">— Top-level category</option>
              {parentCategories
                .filter(p => !editingCat || p.id !== editingCat.id)
                .map(p => (
                  <option key={p.id} value={p.id}>Sub-category of: {p.name}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Name *</label>
            <input
              value={catForm.name}
              onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder={catForm.parentId ? "e.g. Residential" : "e.g. Fibre Internet"}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Description</label>
            <textarea
              value={catForm.description}
              onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="Optional description..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Sort Order</label>
            <input
              type="number"
              value={catForm.sortOrder}
              onChange={e => setCatForm(f => ({ ...f, sortOrder: e.target.value }))}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setIsCatModalOpen(false)}
              className="flex-1 px-4 py-2 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted/20 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCat}
              disabled={createCat.isPending || updateCat.isPending}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 disabled:opacity-60"
            >
              {editingCat ? "Save Changes" : "Create"}
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
