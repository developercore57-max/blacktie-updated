import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  useAdminGetCybersecurityCategories, 
  useAdminGetCybersecurityItems,
  useAdminCreateCybersecurityCategory,
  useAdminUpdateCybersecurityCategory,
  useAdminCreateCybersecurityItem,
  useAdminUpdateCybersecurityItem,
  useAdminDeleteCybersecurityItem,
  useAdminDeleteCybersecurityCategory,
  Category,
  Service
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Shield, FolderTree, Trash2, Edit2, Tag, LayoutGrid, List, Folder, ChevronRight, X, Upload, Download } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { formatZar } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import * as XLSX from "xlsx";

type ViewMode = "card" | "list";

function UnitBadge({ unit }: { unit: string }) {
  const map: Record<string, { label: string; color: string }> = {
    month:  { label: "/ month",   color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
    year:   { label: "/ year",    color: "bg-violet-500/10 text-violet-500 border-violet-500/20" },
    once:   { label: "Once-off",  color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    minute: { label: "/ minute",  color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  };
  const m = map[unit] ?? { label: unit, color: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${m.color}`}>
      {m.label}
    </span>
  );
}

export default function AdminCybersecurityCatalog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: categories = [] } = useAdminGetCybersecurityCategories();
  const { data: items = [] } = useAdminGetCybersecurityItems();
  
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [sidebarMode, setSidebarMode] = useState<"browse" | "manage">("browse");
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Service | null>(null);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const createCat = useAdminCreateCybersecurityCategory();
  const updateCat = useAdminUpdateCybersecurityCategory();
  const createItem = useAdminCreateCybersecurityItem();
  const updateItem = useAdminUpdateCybersecurityItem();
  const deleteItem = useAdminDeleteCybersecurityItem();
  const deleteCat = useAdminDeleteCybersecurityCategory();

  const filteredItems = selectedCatId ? items.filter(s => s.categoryId === selectedCatId) : items;
  const parentCategories = (categories as Category[]).filter(c => !c.parentId);
  const subCatsOf = (id: number) => (categories as Category[]).filter(c => c.parentId === id);

  function toggleExpand(id: number) {
    setExpandedCats(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  }

  const [catForm, setCatForm] = useState({ name: "", description: "", parentId: "", sortOrder: "0" });
  const [itemForm, setItemForm] = useState({ name: "", description: "", categoryId: "", retailPriceExclVat: "", resellerPriceExclVat: "", resellerPriceInclVat: "", priceInclVat: "", unit: "month", status: "active" });

  const handleRetailPriceChange = (val: string) => { const n = parseFloat(val); setItemForm(f => ({ ...f, retailPriceExclVat: val, priceInclVat: !isNaN(n) ? (n * 1.15).toFixed(2) : "" })); };
  const handleRetailInclChange = (val: string) => { const n = parseFloat(val); setItemForm(f => ({ ...f, priceInclVat: val, retailPriceExclVat: !isNaN(n) ? (n / 1.15).toFixed(2) : "" })); };
  const handleResellerPriceChange = (val: string) => { const n = parseFloat(val); setItemForm(f => ({ ...f, resellerPriceExclVat: val, resellerPriceInclVat: !isNaN(n) ? (n * 1.15).toFixed(2) : "" })); };
  const handleResellerInclChange = (val: string) => { const n = parseFloat(val); setItemForm(f => ({ ...f, resellerPriceInclVat: val, resellerPriceExclVat: !isNaN(n) ? (n / 1.15).toFixed(2) : "" })); };

  function openCreateCat(parentId?: number) { setEditingCat(null); setCatForm({ name: "", description: "", parentId: parentId ? String(parentId) : "", sortOrder: "0" }); setIsCatModalOpen(true); }
  function openEditCat(cat: Category) { setEditingCat(cat); setCatForm({ name: cat.name, description: cat.description ?? "", parentId: cat.parentId ? String(cat.parentId) : "", sortOrder: String(cat.sortOrder) }); setIsCatModalOpen(true); }

  async function handleSaveCat() {
    if (!catForm.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const payload = { name: catForm.name.trim(), description: catForm.description.trim() || undefined, parentId: catForm.parentId ? parseInt(catForm.parentId) : undefined, sortOrder: parseInt(catForm.sortOrder) || 0 };
    try {
      if (editingCat) { await updateCat.mutateAsync({ id: editingCat.id, data: payload }); toast({ title: `"${payload.name}" updated` }); }
      else { await createCat.mutateAsync({ data: payload }); toast({ title: `"${payload.name}" created` }); }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cybersecurity-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/cybersecurity"] }); queryClient.invalidateQueries({ queryKey: ["/api/catalog/new-items"] });
      setIsCatModalOpen(false);
    } catch { toast({ title: "Failed to save category", variant: "destructive" }); }
  }

  async function handleDeleteCat(cat: Category) {
    if ((categories as Category[]).some(c => c.parentId === cat.id)) { toast({ title: "Remove sub-categories first", variant: "destructive" }); return; }
    if (items.some(s => s.categoryId === cat.id)) { toast({ title: "Reassign items before deleting this category", variant: "destructive" }); return; }
    if (!confirm(`Delete "${cat.name}"?`)) return;
    try {
      await deleteCat.mutateAsync({ id: cat.id });
      toast({ title: `"${cat.name}" deleted` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cybersecurity-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/cybersecurity"] }); queryClient.invalidateQueries({ queryKey: ["/api/catalog/new-items"] });
      if (selectedCatId === cat.id) setSelectedCatId(null);
    } catch { toast({ title: "Failed to delete", variant: "destructive" }); }
  }

  const handleExport = () => {
    const headers = ["name", "description", "categoryName", "retailPriceExclVat", "resellerPriceExclVat", "resellerPriceInclVat", "priceInclVat", "unit", "status"];
    const rows = items.map((item: Service) => [
      item.name, item.description ?? "", (item as any).categoryName ?? "",
      (item as any).retailPriceExclVat ?? "", (item as any).resellerPriceExclVat ?? "",
      (item as any).resellerPriceInclVat ?? "", (item as any).priceInclVat ?? "",
      item.unit, item.status,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cybersecurity");
    XLSX.writeFile(wb, "cybersecurity-export.xlsx");
    toast({ title: `Exported ${rows.length} items` });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = "";
    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (rows.length === 0) { toast({ title: "No data found", variant: "destructive" }); return; }
      const mapped = rows.map(r => ({
        name: String(r.name || r.Name || "").trim(),
        description: String(r.description || r.Description || "").trim() || undefined,
        retailPriceExclVat: r.retailPriceExclVat || undefined,
        resellerPriceExclVat: r.resellerPriceExclVat || undefined,
        resellerPriceInclVat: r.resellerPriceInclVat || undefined,
        priceInclVat: r.priceInclVat || undefined,
        unit: r.unit || "month", status: r.status === "inactive" ? "inactive" : "active",
      }));
      const resp = await fetch("/api/admin/cybersecurity-items/bulk-import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: mapped }), credentials: "include",
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Import failed");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cybersecurity-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/cybersecurity"] });
      toast({ title: `Imported ${result.created} items${result.skipped ? `, skipped ${result.skipped}` : ""}${result.errors?.length ? `, ${result.errors.length} errors` : ""}` });
    } catch (err: any) { toast({ title: "Import failed", description: err.message, variant: "destructive" }); }
    finally { setIsImporting(false); }
  };

  const openAddItem = () => { setEditingItem(null); setItemForm({ name: "", description: "", categoryId: selectedCatId ? String(selectedCatId) : "", retailPriceExclVat: "", resellerPriceExclVat: "", resellerPriceInclVat: "", priceInclVat: "", unit: "month", status: "active" }); setIsItemModalOpen(true); };
  const openEditItem = (item: Service) => { setEditingItem(item); setItemForm({ name: item.name, description: item.description ?? "", categoryId: item.categoryId != null ? String(item.categoryId) : "", retailPriceExclVat: item.retailPriceExclVat != null ? String(item.retailPriceExclVat) : "", resellerPriceExclVat: (item as any).resellerPriceExclVat != null ? String((item as any).resellerPriceExclVat) : "", resellerPriceInclVat: (item as any).resellerPriceInclVat != null ? String((item as any).resellerPriceInclVat) : "", priceInclVat: item.priceInclVat != null ? String(item.priceInclVat) : "", unit: item.unit, status: item.status }); setIsItemModalOpen(true); };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const retailExcl = itemForm.retailPriceExclVat ? parseFloat(itemForm.retailPriceExclVat) : undefined;
      const resellerExcl = itemForm.resellerPriceExclVat ? parseFloat(itemForm.resellerPriceExclVat) : undefined;
      const resellerIncl = itemForm.resellerPriceInclVat ? parseFloat(itemForm.resellerPriceInclVat) : undefined;
      const inclVat = itemForm.priceInclVat ? parseFloat(itemForm.priceInclVat) : undefined;
      const payload = { name: itemForm.name, description: itemForm.description, categoryId: itemForm.categoryId ? parseInt(itemForm.categoryId) : undefined, retailPriceExclVat: retailExcl, resellerPriceExclVat: resellerExcl, resellerPriceInclVat: resellerIncl, priceInclVat: inclVat, price: retailExcl ?? 0, unit: itemForm.unit, status: itemForm.status as any, sortOrder: 0 };
      if (editingItem) { await updateItem.mutateAsync({ id: editingItem.id, data: payload }); toast({ title: "Item updated" }); }
      else { await createItem.mutateAsync({ data: payload }); toast({ title: "Item created" }); }
      setIsItemModalOpen(false); setEditingItem(null);
      setItemForm({ name: "", description: "", categoryId: "", retailPriceExclVat: "", resellerPriceExclVat: "", resellerPriceInclVat: "", priceInclVat: "", unit: "month", status: "active" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cybersecurity-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/cybersecurity"] }); queryClient.invalidateQueries({ queryKey: ["/api/catalog/new-items"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "") : "Unknown error";
      toast({ title: editingItem ? "Error updating item" : "Error creating item", description: msg, variant: "destructive" });
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (confirm("Delete this item?")) {
      try { await deleteItem.mutateAsync({ id }); toast({ title: "Item deleted" }); queryClient.invalidateQueries({ queryKey: ["/api/admin/cybersecurity-items"] }); queryClient.invalidateQueries({ queryKey: ["/api/catalog/cybersecurity"] }); queryClient.invalidateQueries({ queryKey: ["/api/catalog/new-items"] }); }
      catch (err: unknown) { const msg = err instanceof Error ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "") : "Unknown error"; toast({ title: "Error deleting item", description: msg, variant: "destructive" }); }
    }
  };

  return (
    <AppLayout role="admin" title="Cybersecurity Catalog">
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)]">
        {/* Category sidebar */}
        <div className="w-full lg:w-56 flex flex-col bg-card border border-border rounded-2xl shadow-lg overflow-hidden shrink-0">
          <div className="p-3 border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-1 p-1 bg-muted/30 border border-border rounded-xl">
              <button onClick={() => setSidebarMode("browse")} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${sidebarMode === "browse" ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}>
                <Shield className="w-3 h-3" /> Browse
              </button>
              <button onClick={() => setSidebarMode("manage")} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${sidebarMode === "manage" ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}>
                <FolderTree className="w-3 h-3" /> Manage
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <AnimatePresence mode="wait">
              {sidebarMode === "browse" ? (
                <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="space-y-1">
                  <button onClick={() => setSelectedCatId(null)} className={`w-full text-left flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all ${selectedCatId === null ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "hover:bg-black/5 text-muted-foreground hover:text-foreground"}`}>
                    <span>All Items</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${selectedCatId === null ? "bg-black/[0.1]" : "bg-black/[0.07]"}`}>{items.length}</span>
                  </button>
                  {parentCategories.map(parent => {
                    const subs = subCatsOf(parent.id);
                    return (
                      <div key={parent.id}>
                        <button onClick={() => setSelectedCatId(parent.id === selectedCatId ? null : parent.id)} className={`w-full text-left flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all ${selectedCatId === parent.id ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "hover:bg-black/5 text-muted-foreground hover:text-foreground"}`}>
                          <div className="flex items-center gap-2 min-w-0"><Tag className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{parent.name}</span></div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${selectedCatId === parent.id ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>{items.filter(s => s.categoryId === parent.id).length}</span>
                        </button>
                        {subs.map(sub => (
                          <button key={sub.id} onClick={() => setSelectedCatId(sub.id === selectedCatId ? null : sub.id)} className={`w-full text-left flex items-center justify-between pl-7 pr-3 py-1.5 rounded-xl text-xs transition-all ${selectedCatId === sub.id ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 font-semibold" : "text-muted-foreground hover:bg-black/5 hover:text-foreground"}`}>
                            <div className="flex items-center gap-1.5 min-w-0"><Tag className="w-2.5 h-2.5 shrink-0" /><span className="truncate">{sub.name}</span></div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${selectedCatId === sub.id ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>{items.filter(s => s.categoryId === sub.id).length}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div key="manage" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="space-y-2">
                  <div className="flex gap-1.5">
                    <div className="flex-1 bg-background border border-border rounded-lg p-2 text-center"><p className="text-lg font-bold text-foreground">{parentCategories.length}</p><p className="text-[10px] text-muted-foreground">Categories</p></div>
                    <div className="flex-1 bg-background border border-border rounded-lg p-2 text-center"><p className="text-lg font-bold text-foreground">{(categories as Category[]).filter(c => !!c.parentId).length}</p><p className="text-[10px] text-muted-foreground">Sub-cats</p></div>
                  </div>
                  <button onClick={() => openCreateCat()} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-primary/40 text-xs font-semibold text-primary hover:bg-primary/5 transition-all"><Plus className="w-3.5 h-3.5" /> Add Category</button>
                  {parentCategories.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground/50"><FolderTree className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-xs">No categories yet</p></div>
                  ) : (
                    <div className="space-y-1">
                      {parentCategories.map(parent => {
                        const subs = subCatsOf(parent.id);
                        const isExpanded = expandedCats.has(parent.id);
                        return (
                          <div key={parent.id} className="bg-background border border-border rounded-xl overflow-hidden">
                            <div className="flex items-center gap-1.5 px-2.5 py-2 group">
                              <button onClick={() => toggleExpand(parent.id)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0"><ChevronRight className={`w-3.5 h-3.5 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""} ${subs.length === 0 ? "opacity-20" : ""}`} /></button>
                              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0"><Folder className="w-3 h-3 text-primary" /></div>
                              <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-foreground truncate">{parent.name}</p><p className="text-[10px] text-muted-foreground">{subs.length} sub · {items.filter(s => s.categoryId === parent.id).length} items</p></div>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button onClick={() => openCreateCat(parent.id)} className="p-1 hover:bg-emerald-500/10 rounded text-muted-foreground hover:text-emerald-600 transition-colors"><Plus className="w-3 h-3" /></button>
                                <button onClick={() => openEditCat(parent)} className="p-1 hover:bg-primary/10 rounded text-muted-foreground hover:text-primary transition-colors"><Edit2 className="w-3 h-3" /></button>
                                <button onClick={() => handleDeleteCat(parent)} className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            </div>
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden border-t border-border/50 bg-muted/5">
                                  {subs.map(sub => (
                                    <div key={sub.id} className="flex items-center gap-1.5 pl-8 pr-2.5 py-1.5 group/sub border-t border-dashed border-border/30 first:border-t-0">
                                      <Tag className="w-2.5 h-2.5 text-primary/50 shrink-0" />
                                      <div className="flex-1 min-w-0"><p className="text-[11px] font-medium text-foreground truncate">{sub.name}</p><p className="text-[10px] text-muted-foreground">{items.filter(s => s.categoryId === sub.id).length} items</p></div>
                                      <div className="flex items-center gap-0.5 opacity-0 group-hover/sub:opacity-100 transition-opacity shrink-0">
                                        <button onClick={() => openEditCat(sub)} className="p-1 hover:bg-primary/10 rounded text-muted-foreground hover:text-primary transition-colors"><Edit2 className="w-2.5 h-2.5" /></button>
                                        <button onClick={() => handleDeleteCat(sub)} className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-2.5 h-2.5" /></button>
                                      </div>
                                    </div>
                                  ))}
                                  <button onClick={() => openCreateCat(parent.id)} className="w-full flex items-center gap-1.5 pl-8 pr-2.5 py-1.5 text-[11px] text-primary/60 hover:text-primary hover:bg-primary/5 transition-colors border-t border-dashed border-border/30"><Plus className="w-2.5 h-2.5" /> Add sub-category</button>
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
        </div>

        {/* Items panel */}
        <div className="flex-1 flex flex-col bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/20">
            <h3 className="font-display font-bold flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-primary" />
              {selectedCatId ? categories.find(c => c.id === selectedCatId)?.name : "All Items"}
              <span className="text-xs font-normal text-muted-foreground">({filteredItems.length})</span>
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-muted/30 rounded-lg p-0.5 border border-border/50">
                <button onClick={() => setViewMode("card")} className={`p-1.5 rounded-md transition-all ${viewMode === "card" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}><LayoutGrid className="w-4 h-4" /></button>
                <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}><List className="w-4 h-4" /></button>
              </div>
              <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
              <button onClick={() => importFileRef.current?.click()} disabled={isImporting} title="Import from Excel" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"><Upload className="w-3.5 h-3.5" /> {isImporting ? "Importing..." : "Import"}</button>
              <button onClick={handleExport} title="Export to Excel" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"><Download className="w-3.5 h-3.5" /> Export</button>
              <button onClick={openAddItem} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3"><Shield className="w-10 h-10 opacity-20" /><p>No items found in this category.</p></div>
            ) : viewMode === "card" ? (
              <div className="p-4 grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filteredItems.map((item: Service, idx) => (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }} className="bg-background border border-border rounded-xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
                    <div className="h-1.5 bg-gradient-to-r from-blue-500 to-cyan-500" />
                    <div className="p-3 flex-1 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                          {(item as any).categoryName && <p className="text-[10px] text-muted-foreground truncate">{(item as any).categoryName}</p>}
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${item.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{item.status}</span>
                      </div>
                      {item.description && <p className="text-[11px] text-muted-foreground line-clamp-2">{item.description}</p>}
                      <div className="mt-auto pt-2 border-t border-border/50 space-y-1">
                        <div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground">Reseller excl. VAT</span><span className="text-xs font-semibold text-primary">{(item as any).resellerPriceExclVat != null ? formatZar(Number((item as any).resellerPriceExclVat)) : "—"}</span></div>
                        <div className="flex items-center justify-between"><UnitBadge unit={item.unit} /></div>
                      </div>
                    </div>
                    <div className="p-2 pt-0 flex gap-1.5">
                      <button onClick={() => openEditItem(item)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all"><Edit2 className="w-3 h-3" /> Edit</button>
                      <button onClick={() => handleDeleteItem(item.id)} className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-all"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filteredItems.map((item: Service) => (
                  <div key={item.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-foreground truncate">{item.name}</p><p className="text-xs text-muted-foreground truncate">{(item as any).categoryName ?? "Uncategorised"}</p></div>
                    <div className="text-right shrink-0"><p className="text-xs text-primary font-semibold">{(item as any).resellerPriceExclVat != null ? formatZar(Number((item as any).resellerPriceExclVat)) : "—"}</p></div>
                    <UnitBadge unit={item.unit} />
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${item.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{item.status}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditItem(item)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category modal */}
      <Modal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} title={editingCat ? "Edit Category" : "New Category"}>
        <div className="space-y-3 p-1">
          <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name *</label><input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
          <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</label><textarea value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" /></div>
          <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Parent Category</label>
            <select value={catForm.parentId} onChange={e => setCatForm(f => ({ ...f, parentId: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">None (top-level)</option>
              {parentCategories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sort Order</label><input type="number" value={catForm.sortOrder} onChange={e => setCatForm(f => ({ ...f, sortOrder: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setIsCatModalOpen(false)} className="flex-1 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/50 transition-colors">Cancel</button>
            <button onClick={handleSaveCat} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">Save</button>
          </div>
        </div>
      </Modal>

      {/* Item modal */}
      <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} title={editingItem ? "Edit Item" : "New Item"}>
        <form onSubmit={handleItemSubmit} className="space-y-3 p-1">
          <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name *</label><input required value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
          <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</label><div className="mt-1"><RichTextEditor value={itemForm.description} onChange={(html) => setItemForm(f => ({ ...f, description: html }))} minHeight="100px" /></div></div>
          <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</label>
            <select value={itemForm.categoryId} onChange={e => setItemForm(f => ({ ...f, categoryId: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Uncategorised</option>
              {(categories as Category[]).map(c => <option key={c.id} value={String(c.id)}>{c.parentId ? `  ↳ ${c.name}` : c.name}</option>)}
            </select>
          </div>
          <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reseller excl. VAT</label><input type="number" step="0.01" value={itemForm.resellerPriceExclVat} onChange={e => handleResellerPriceChange(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unit</label>
              <select value={itemForm.unit} onChange={e => setItemForm(f => ({ ...f, unit: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="month">Month</option><option value="year">Year</option><option value="once">Once-off</option><option value="minute">Minute</option>
              </select>
            </div>
            <div><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</label>
              <select value={itemForm.status} onChange={e => setItemForm(f => ({ ...f, status: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="active">Active</option><option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setIsItemModalOpen(false)} className="flex-1 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/50 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">{editingItem ? "Update" : "Create"}</button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
