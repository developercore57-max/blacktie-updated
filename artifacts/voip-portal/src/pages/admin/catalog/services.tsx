import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  useAdminGetServiceCategories, 
  useAdminGetServices,
  useAdminCreateServiceCategory,
  useAdminUpdateServiceCategory,
  useAdminCreateService,
  useAdminUpdateService,
  useAdminDeleteService,
  useAdminDeleteServiceCategory,
  Category,
  Service
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Server, FolderTree, Trash2, Edit2, Tag, LayoutGrid, List, Clock, Repeat, Zap, Folder, ChevronRight, X, Upload, Download } from "lucide-react";
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

export default function AdminServicesCatalog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: categories = [] } = useAdminGetServiceCategories();
  const { data: services = [] } = useAdminGetServices();
  
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [sidebarMode, setSidebarMode] = useState<"browse" | "manage">("browse");
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());

  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const createCat = useAdminCreateServiceCategory();
  const updateCat = useAdminUpdateServiceCategory();
  const createService = useAdminCreateService();
  const updateService = useAdminUpdateService();
  const deleteService = useAdminDeleteService();
  const deleteCat = useAdminDeleteServiceCategory();

  const filteredServices = selectedCatId 
    ? services.filter(s => s.categoryId === selectedCatId)
    : services;

  const parentCategories = (categories as Category[]).filter(c => !c.parentId);
  const subCatsOf = (id: number) => (categories as Category[]).filter(c => c.parentId === id);

  function toggleExpand(id: number) {
    setExpandedCats(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  }

  const [catForm, setCatForm] = useState({ name: "", description: "", parentId: "", sortOrder: "0" });
  const [serviceForm, setServiceForm] = useState({ 
    name: "", description: "", categoryId: "",
    retailPriceExclVat: "", resellerPriceExclVat: "", resellerPriceInclVat: "", priceInclVat: "",
    unit: "month", status: "active" 
  });

  const handleRetailPriceChange = (val: string) => {
    const num = parseFloat(val);
    const inclVat = !isNaN(num) ? (num * 1.15).toFixed(2) : "";
    setServiceForm(f => ({ ...f, retailPriceExclVat: val, priceInclVat: inclVat }));
  };

  const handleRetailInclChange = (val: string) => {
    const num = parseFloat(val);
    const exclVat = !isNaN(num) ? (num / 1.15).toFixed(2) : "";
    setServiceForm(f => ({ ...f, priceInclVat: val, retailPriceExclVat: exclVat }));
  };

  const handleResellerPriceChange = (val: string) => {
    const num = parseFloat(val);
    const inclVat = !isNaN(num) ? (num * 1.15).toFixed(2) : "";
    setServiceForm(f => ({ ...f, resellerPriceExclVat: val, resellerPriceInclVat: inclVat }));
  };

  const handleResellerInclChange = (val: string) => {
    const num = parseFloat(val);
    const exclVat = !isNaN(num) ? (num / 1.15).toFixed(2) : "";
    setServiceForm(f => ({ ...f, resellerPriceInclVat: val, resellerPriceExclVat: exclVat }));
  };

  function openCreateCat(parentId?: number) {
    setEditingCat(null);
    setCatForm({ name: "", description: "", parentId: parentId ? String(parentId) : "", sortOrder: "0" });
    setIsCatModalOpen(true);
  }

  function openEditCat(cat: Category) {
    setEditingCat(cat);
    setCatForm({ name: cat.name, description: cat.description ?? "", parentId: cat.parentId ? String(cat.parentId) : "", sortOrder: String(cat.sortOrder) });
    setIsCatModalOpen(true);
  }

  async function handleSaveCat() {
    if (!catForm.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const payload = { name: catForm.name.trim(), description: catForm.description.trim() || undefined, parentId: catForm.parentId ? parseInt(catForm.parentId) : undefined, sortOrder: parseInt(catForm.sortOrder) || 0 };
    try {
      if (editingCat) {
        await updateCat.mutateAsync({ id: editingCat.id, data: payload });
        toast({ title: `"${payload.name}" updated` });
      } else {
        await createCat.mutateAsync({ data: payload });
        toast({ title: `"${payload.name}" created` });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/services"] }); queryClient.invalidateQueries({ queryKey: ["/api/catalog/new-items"] });
      setIsCatModalOpen(false);
    } catch { toast({ title: "Failed to save category", variant: "destructive" }); }
  }

  async function handleDeleteCat(cat: Category) {
    if ((categories as Category[]).some(c => c.parentId === cat.id)) { toast({ title: "Remove sub-categories first", variant: "destructive" }); return; }
    if (services.some(s => s.categoryId === cat.id)) { toast({ title: "Reassign services before deleting this category", variant: "destructive" }); return; }
    if (!confirm(`Delete "${cat.name}"?`)) return;
    try {
      await deleteCat.mutateAsync({ id: cat.id });
      toast({ title: `"${cat.name}" deleted` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/services"] }); queryClient.invalidateQueries({ queryKey: ["/api/catalog/new-items"] });
      if (selectedCatId === cat.id) setSelectedCatId(null);
    } catch { toast({ title: "Failed to delete", variant: "destructive" }); }
  }

  const handleExport = () => {
    const headers = ["name", "description", "categoryName", "retailPriceExclVat", "resellerPriceExclVat", "resellerPriceInclVat", "priceInclVat", "unit", "status"];
    const rows = services.map((svc: Service) => [
      svc.name, svc.description ?? "", (svc as any).categoryName ?? "",
      (svc as any).retailPriceExclVat ?? "", (svc as any).resellerPriceExclVat ?? "",
      (svc as any).resellerPriceInclVat ?? "", (svc as any).priceInclVat ?? "",
      svc.unit, svc.status,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Services"); XLSX.writeFile(wb, "services-export.xlsx");
    toast({ title: `Exported ${rows.length} services` });
  };
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = ""; setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer(); const wb = XLSX.read(buffer, { type: "array" }); const ws = wb.Sheets[wb.SheetNames[0]]; const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (rows.length === 0) { toast({ title: "No data found", variant: "destructive" }); return; }
      const mapped = rows.map(r => ({ name: String(r.name || r.Name || "").trim(), description: String(r.description || r.Description || "").trim() || undefined, retailPriceExclVat: r.retailPriceExclVat || undefined, resellerPriceExclVat: r.resellerPriceExclVat || undefined, resellerPriceInclVat: r.resellerPriceInclVat || undefined, priceInclVat: r.priceInclVat || undefined, unit: r.unit || "month", status: r.status === "inactive" ? "inactive" : "active" }));
      const resp = await fetch("/api/admin/services/bulk-import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: mapped }), credentials: "include" });
      const result = await resp.json(); if (!resp.ok) throw new Error(result.error || "Import failed");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/service-categories"] }); queryClient.invalidateQueries({ queryKey: ["/api/catalog/services"] });
      toast({ title: `Imported ${result.created} services${result.skipped ? `, skipped ${result.skipped}` : ""}${result.errors?.length ? `, ${result.errors.length} errors` : ""}` });
    } catch (err: any) { toast({ title: "Import failed", description: err.message, variant: "destructive" }); } finally { setIsImporting(false); }
  };

  const openAddService = () => {
    setEditingService(null);
    setServiceForm({ name: "", description: "", categoryId: selectedCatId ? String(selectedCatId) : "", retailPriceExclVat: "", resellerPriceExclVat: "", resellerPriceInclVat: "", priceInclVat: "", unit: "month", status: "active" });
    setIsServiceModalOpen(true);
  };

  const openEditService = (service: Service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description ?? "",
      categoryId: service.categoryId != null ? String(service.categoryId) : "",
      retailPriceExclVat: service.retailPriceExclVat != null ? String(service.retailPriceExclVat) : "",
      resellerPriceExclVat: (service as any).resellerPriceExclVat != null ? String((service as any).resellerPriceExclVat) : "",
      resellerPriceInclVat: (service as any).resellerPriceInclVat != null ? String((service as any).resellerPriceInclVat) : "",
      priceInclVat: service.priceInclVat != null ? String(service.priceInclVat) : "",
      unit: service.unit,
      status: service.status,
    });
    setIsServiceModalOpen(true);
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const retailExcl = serviceForm.retailPriceExclVat ? parseFloat(serviceForm.retailPriceExclVat) : undefined;
      const resellerExcl = serviceForm.resellerPriceExclVat ? parseFloat(serviceForm.resellerPriceExclVat) : undefined;
      const resellerInclVat = serviceForm.resellerPriceInclVat ? parseFloat(serviceForm.resellerPriceInclVat) : undefined;
      const inclVat = serviceForm.priceInclVat ? parseFloat(serviceForm.priceInclVat) : undefined;
      const payload = {
        name: serviceForm.name, description: serviceForm.description,
        categoryId: serviceForm.categoryId ? parseInt(serviceForm.categoryId) : undefined,
        retailPriceExclVat: retailExcl, resellerPriceExclVat: resellerExcl,
        resellerPriceInclVat: resellerInclVat, priceInclVat: inclVat,
        price: retailExcl ?? 0, unit: serviceForm.unit,
        status: serviceForm.status as any, sortOrder: 0
      };
      if (editingService) {
        await updateService.mutateAsync({ id: editingService.id, data: payload });
        toast({ title: "Service updated" });
      } else {
        await createService.mutateAsync({ data: payload });
        toast({ title: "Service created" });
      }
      setIsServiceModalOpen(false);
      setEditingService(null);
      setServiceForm({ name: "", description: "", categoryId: "", retailPriceExclVat: "", resellerPriceExclVat: "", resellerPriceInclVat: "", priceInclVat: "", unit: "month", status: "active" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/services"] }); queryClient.invalidateQueries({ queryKey: ["/api/catalog/new-items"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "") : "Unknown error";
      toast({ title: editingService ? "Error updating service" : "Error creating service", description: msg, variant: "destructive" });
    }
  };

  const handleDeleteService = async (id: number) => {
    if (confirm("Are you sure you want to delete this service?")) {
      try {
        await deleteService.mutateAsync({ id });
        toast({ title: "Service deleted" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/services"] }); queryClient.invalidateQueries({ queryKey: ["/api/catalog/new-items"] });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "") : "Unknown error";
        toast({ title: "Error deleting service", description: msg, variant: "destructive" });
      }
    }
  };

  return (
    <AppLayout role="admin" title="Services Catalog">
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)]">

        {/* Category sidebar */}
        <div className="w-full lg:w-56 flex flex-col bg-card border border-border rounded-2xl shadow-lg overflow-hidden shrink-0">
          <div className="p-3 border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-1 p-1 bg-muted/30 border border-border rounded-xl">
              <button
                onClick={() => setSidebarMode("browse")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${sidebarMode === "browse" ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Server className="w-3 h-3" /> Browse
              </button>
              <button
                onClick={() => setSidebarMode("manage")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${sidebarMode === "manage" ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}
              >
                <FolderTree className="w-3 h-3" /> Manage
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            <AnimatePresence mode="wait">
              {sidebarMode === "browse" ? (
                <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="space-y-1">
                  <button
                    onClick={() => setSelectedCatId(null)}
                    className={`w-full text-left flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all ${selectedCatId === null ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "hover:bg-black/5 text-muted-foreground hover:text-foreground"}`}
                  >
                    <span>All Services</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${selectedCatId === null ? "bg-black/[0.1]" : "bg-black/[0.07]"}`}>{services.length}</span>
                  </button>
                  {parentCategories.map(parent => {
                    const subs = subCatsOf(parent.id);
                    return (
                      <div key={parent.id}>
                        <button
                          onClick={() => setSelectedCatId(parent.id === selectedCatId ? null : parent.id)}
                          className={`w-full text-left flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all ${selectedCatId === parent.id ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "hover:bg-black/5 text-muted-foreground hover:text-foreground"}`}
                        >
                          <div className="flex items-center gap-2 min-w-0"><Tag className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{parent.name}</span></div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${selectedCatId === parent.id ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>{services.filter(s => s.categoryId === parent.id).length}</span>
                        </button>
                        {subs.map(sub => (
                          <button key={sub.id} onClick={() => setSelectedCatId(sub.id === selectedCatId ? null : sub.id)}
                            className={`w-full text-left flex items-center justify-between pl-7 pr-3 py-1.5 rounded-xl text-xs transition-all ${selectedCatId === sub.id ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 font-semibold" : "text-muted-foreground hover:bg-black/5 hover:text-foreground"}`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0"><Tag className="w-2.5 h-2.5 shrink-0" /><span className="truncate">{sub.name}</span></div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${selectedCatId === sub.id ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>{services.filter(s => s.categoryId === sub.id).length}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div key="manage" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="space-y-2">
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
                  <button onClick={() => openCreateCat()} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-primary/40 text-xs font-semibold text-primary hover:bg-primary/5 transition-all">
                    <Plus className="w-3.5 h-3.5" /> Add Category
                  </button>
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
                            <div className="flex items-center gap-1.5 px-2.5 py-2 group">
                              <button onClick={() => toggleExpand(parent.id)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                                <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""} ${subs.length === 0 ? "opacity-20" : ""}`} />
                              </button>
                              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                <Folder className="w-3 h-3 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">{parent.name}</p>
                                <p className="text-[10px] text-muted-foreground">{subs.length} sub · {services.filter(s => s.categoryId === parent.id).length} items</p>
                              </div>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button onClick={() => openCreateCat(parent.id)} title="Add sub-category" className="p-1 hover:bg-emerald-500/10 rounded text-muted-foreground hover:text-emerald-600 transition-colors"><Plus className="w-3 h-3" /></button>
                                <button onClick={() => openEditCat(parent)} title="Edit" className="p-1 hover:bg-primary/10 rounded text-muted-foreground hover:text-primary transition-colors"><Edit2 className="w-3 h-3" /></button>
                                <button onClick={() => handleDeleteCat(parent)} title="Delete" className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            </div>
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden border-t border-border/50 bg-muted/5">
                                  {subs.map(sub => (
                                    <div key={sub.id} className="flex items-center gap-1.5 pl-8 pr-2.5 py-1.5 group/sub border-t border-dashed border-border/30 first:border-t-0">
                                      <Tag className="w-2.5 h-2.5 text-primary/50 shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-medium text-foreground truncate">{sub.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{services.filter(s => s.categoryId === sub.id).length} items</p>
                                      </div>
                                      <div className="flex items-center gap-0.5 opacity-0 group-hover/sub:opacity-100 transition-opacity shrink-0">
                                        <button onClick={() => openEditCat(sub)} className="p-1 hover:bg-primary/10 rounded text-muted-foreground hover:text-primary transition-colors"><Edit2 className="w-2.5 h-2.5" /></button>
                                        <button onClick={() => handleDeleteCat(sub)} className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-2.5 h-2.5" /></button>
                                      </div>
                                    </div>
                                  ))}
                                  <button onClick={() => openCreateCat(parent.id)} className="w-full flex items-center gap-1.5 pl-8 pr-2.5 py-1.5 text-[11px] text-primary/60 hover:text-primary hover:bg-primary/5 transition-colors border-t border-dashed border-border/30">
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
        </div>

        {/* Service panel */}
        <div className="flex-1 flex flex-col bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/20">
            <h3 className="font-display font-bold flex items-center gap-2 text-lg">
              <Server className="w-5 h-5 text-primary" />
              {selectedCatId ? categories.find(c => c.id === selectedCatId)?.name : "All Services"}
              <span className="text-xs font-normal text-muted-foreground">({filteredServices.length})</span>
            </h3>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center bg-muted/30 rounded-lg p-0.5 border border-border/50">
                <button
                  onClick={() => setViewMode("card")}
                  className={`p-1.5 rounded-md transition-all ${viewMode === "card" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  title="Card view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
              <button onClick={() => importFileRef.current?.click()} disabled={isImporting} title="Import from Excel" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"><Upload className="w-3.5 h-3.5" /> {isImporting ? "Importing..." : "Import"}</button>
              <button onClick={handleExport} title="Export to Excel" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"><Download className="w-3.5 h-3.5" /> Export</button>
              <button
                onClick={openAddService}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
              >
                <Plus className="w-4 h-4" /> Add Service
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {filteredServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <Server className="w-10 h-10 opacity-20" />
                <p>No services found in this category.</p>
              </div>
            ) : viewMode === "card" ? (
              /* ── Card View ─────────────────────────────────────────── */
              <div className="p-4 grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filteredServices.map((service: Service, idx) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="bg-background border border-border rounded-xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Header band */}
                    <div className="relative bg-primary/5 border-b border-border/50 px-4 pt-5 pb-4 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Server className="w-4 h-4 text-primary" />
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          service.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                        }`}>
                          {service.status}
                        </span>
                      </div>
                      <p className="font-semibold text-sm text-foreground leading-tight line-clamp-2">{service.name}</p>
                      <p className="text-[11px] text-muted-foreground">{service.categoryName || "Uncategorized"}</p>
                    </div>

                    {/* Body */}
                    <div className="p-3 flex flex-col flex-1 gap-2">
                      {service.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{service.description}</p>
                      )}

                      <div className="flex items-center gap-1.5 mt-auto">
                        <UnitBadge unit={service.unit} />
                      </div>

                      {/* Pricing */}
                      <div className="space-y-0.5 pt-1 border-t border-border/40">
                        {service.retailPriceExclVat != null && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Retail excl VAT</span>
                            <span className="font-semibold text-foreground">{formatZar(service.retailPriceExclVat)}</span>
                          </div>
                        )}
                        {service.priceInclVat != null && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Retail incl VAT</span>
                            <span className="font-medium text-foreground">{formatZar(service.priceInclVat)}</span>
                          </div>
                        )}
                        {service.resellerPriceExclVat != null && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Reseller excl VAT</span>
                            <span className="font-semibold text-primary">{formatZar(service.resellerPriceExclVat)}</span>
                          </div>
                        )}
                        {(service as any).resellerPriceInclVat != null && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Reseller incl VAT</span>
                            <span className="font-bold text-primary">{formatZar((service as any).resellerPriceInclVat)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-3 pb-3 flex gap-2">
                      <button
                        onClick={() => openEditService(service)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors border border-border/50"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteService(service.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-muted/30 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors border border-border/50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* ── List View ─────────────────────────────────────────── */
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/10 sticky top-0 backdrop-blur-md z-10">
                  <tr>
                    <th className="px-4 py-4 font-semibold">Service Name</th>
                    <th className="px-4 py-4 font-semibold">Category</th>
                    <th className="px-4 py-4 font-semibold">Retail excl VAT</th>
                    <th className="px-4 py-4 font-semibold">Retail incl VAT</th>
                    <th className="px-4 py-4 font-semibold">Reseller excl VAT</th>
                    <th className="px-4 py-4 font-semibold">Reseller incl VAT</th>
                    <th className="px-4 py-4 font-semibold">Status</th>
                    <th className="px-4 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredServices.map((service: Service, idx) => (
                    <motion.tr
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={service.id}
                      className="hover:bg-black/[0.03] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{service.name}</p>
                        {service.description && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{service.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{service.categoryName || "Uncategorized"}</td>
                      <td className="px-4 py-3 font-medium text-foreground text-sm">
                        {service.retailPriceExclVat != null ? <>{formatZar(service.retailPriceExclVat)} <span className="text-muted-foreground text-xs">/{service.unit}</span></> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground text-sm">
                        {service.priceInclVat != null ? <>{formatZar(service.priceInclVat)} <span className="text-muted-foreground text-xs">/{service.unit}</span></> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-primary text-sm">
                        {service.resellerPriceExclVat != null ? <>{formatZar(service.resellerPriceExclVat)} <span className="text-muted-foreground text-xs">/{service.unit}</span></> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary text-sm">
                        {(service as any).resellerPriceInclVat != null ? <>{formatZar((service as any).resellerPriceInclVat)} <span className="text-muted-foreground text-xs">/{service.unit}</span></> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          service.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>
                          {service.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditService(service)}
                            className="p-2 hover:bg-black/[0.07] rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service.id)}
                            className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Category Modal */}
      <Modal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} title={editingCat ? `Edit: ${editingCat.name}` : catForm.parentId ? "Add Sub-Category" : "Add Category"} maxWidth="max-w-md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Type</label>
            <select value={catForm.parentId} onChange={e => setCatForm(f => ({ ...f, parentId: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">— Top-level category</option>
              {parentCategories.filter(p => !editingCat || p.id !== editingCat.id).map(p => (
                <option key={p.id} value={p.id}>Sub-category of: {p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Name *</label>
            <input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} autoFocus className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder={catForm.parentId ? "e.g., Cloud PBX Basic" : "e.g., Cloud PBX"} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Description</label>
            <textarea value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Optional description..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Sort Order</label>
            <input type="number" value={catForm.sortOrder} onChange={e => setCatForm(f => ({ ...f, sortOrder: e.target.value }))} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setIsCatModalOpen(false)} className="flex-1 px-4 py-2 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted/20 transition-colors">Cancel</button>
            <button onClick={handleSaveCat} disabled={createCat.isPending || updateCat.isPending} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 disabled:opacity-60">
              {editingCat ? "Save Changes" : "Create"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add / Edit Service Modal */}
      <Modal isOpen={isServiceModalOpen} onClose={() => { setIsServiceModalOpen(false); setEditingService(null); }} title={editingService ? "Edit Service" : "Add Service"} maxWidth="max-w-2xl">
        <form onSubmit={handleServiceSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Service Name</label>
              <input required value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g., Standard Extension" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Category</label>
              <select value={serviceForm.categoryId} onChange={e => setServiceForm({...serviceForm, categoryId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none appearance-none">
                <option value="">None</option>
                {parentCategories.flatMap(parent => [
                  <option key={parent.id} value={String(parent.id)}>{parent.name}</option>,
                  ...subCatsOf(parent.id).map(sub =>
                    <option key={sub.id} value={String(sub.id)}>  ↳ {sub.name}</option>
                  ),
                ])}
              </select>
            </div>

            <div className="col-span-2">
              <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pricing (ZAR)</p>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reseller excl VAT</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R</span>
                    <input type="number" step="0.01" min="0" value={serviceForm.resellerPriceExclVat} onChange={e => handleResellerPriceChange(e.target.value)} className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none text-sm" placeholder="0.00" />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Billing Unit</label>
              <select value={serviceForm.unit} onChange={e => setServiceForm({...serviceForm, unit: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none appearance-none">
                <option value="month">Per Month</option>
                <option value="year">Per Year</option>
                <option value="once">Once-off</option>
                <option value="minute">Per Minute</option>
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Status</label>
              <select value={serviceForm.status} onChange={e => setServiceForm({...serviceForm, status: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none appearance-none">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Description</label>
              <RichTextEditor
                value={serviceForm.description}
                onChange={(html) => setServiceForm(f => ({ ...f, description: html }))}
                placeholder="Features and details…"
              />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => { setIsServiceModalOpen(false); setEditingService(null); }} className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-black/5 transition-colors">Cancel</button>
            <button type="submit" disabled={createService.isPending || updateService.isPending} className="px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl transition-all disabled:opacity-50">
              {(createService.isPending || updateService.isPending) ? "Saving..." : editingService ? "Save Changes" : "Create Service"}
            </button>
          </div>
        </form>
      </Modal>

    </AppLayout>
  );
}
