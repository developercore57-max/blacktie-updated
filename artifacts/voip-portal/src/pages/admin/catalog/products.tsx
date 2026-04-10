import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  useAdminGetProductCategories, 
  useAdminGetProducts,
  useAdminCreateProductCategory,
  useAdminUpdateProductCategory,
  useAdminDeleteProductCategory,
  useAdminCreateProduct,
  useAdminUpdateProduct,
  useAdminDeleteProduct,
  Category,
  Product
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Package, FolderTree, Trash2, Edit2, Tag, LayoutGrid, List, Folder, ChevronRight, Download, Upload } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { formatZar } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload, getImageSrc } from "@/components/ui/image-upload";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import * as XLSX from "xlsx";

type ViewMode = "card" | "list";

const emptyProductForm = {
  name: "", description: "", categoryId: "", sku: "", imageUrl: "",
  retailPriceExclVat: "", resellerPriceExclVat: "", resellerPriceInclVat: "", priceInclVat: "",
  stockCount: "0", status: "active"
};

export default function AdminProductsCatalog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: categories = [] } = useAdminGetProductCategories();
  const { data: products = [] } = useAdminGetProducts();
  
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [sidebarMode, setSidebarMode] = useState<"browse" | "manage">("browse");
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());
  
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const createCat = useAdminCreateProductCategory();
  const updateCat = useAdminUpdateProductCategory();
  const deleteCat = useAdminDeleteProductCategory();
  const createProduct = useAdminCreateProduct();
  const updateProduct = useAdminUpdateProduct();
  const deleteProduct = useAdminDeleteProduct();

  const importFileRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const filteredProducts = selectedCatId 
    ? products.filter(p => p.categoryId === selectedCatId)
    : products;

  const parentCategories = (categories as Category[]).filter(c => !c.parentId);
  const subCatsOf = (id: number) => (categories as Category[]).filter(c => c.parentId === id);

  function toggleExpand(id: number) {
    setExpandedCats(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  }

  const [catForm, setCatForm] = useState({ name: "", description: "", parentId: "", sortOrder: "0" });
  const [productForm, setProductForm] = useState(emptyProductForm);

  const handleRetailPriceChange = (val: string) => {
    const num = parseFloat(val);
    const inclVat = !isNaN(num) ? (num * 1.15).toFixed(2) : "";
    setProductForm(f => ({ ...f, retailPriceExclVat: val, priceInclVat: inclVat }));
  };

  const handleRetailInclChange = (val: string) => {
    const num = parseFloat(val);
    const exclVat = !isNaN(num) ? (num / 1.15).toFixed(2) : "";
    setProductForm(f => ({ ...f, priceInclVat: val, retailPriceExclVat: exclVat }));
  };

  const handleResellerPriceChange = (val: string) => {
    const num = parseFloat(val);
    const inclVat = !isNaN(num) ? (num * 1.15).toFixed(2) : "";
    setProductForm(f => ({ ...f, resellerPriceExclVat: val, resellerPriceInclVat: inclVat }));
  };

  const handleResellerInclChange = (val: string) => {
    const num = parseFloat(val);
    const exclVat = !isNaN(num) ? (num / 1.15).toFixed(2) : "";
    setProductForm(f => ({ ...f, resellerPriceInclVat: val, resellerPriceExclVat: exclVat }));
  };

  const openCreate = () => {
    setEditingProduct(null);
    setProductForm(emptyProductForm);
    setIsProductModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description ?? "",
      categoryId: product.categoryId != null ? String(product.categoryId) : "",
      sku: product.sku ?? "",
      imageUrl: product.imageUrl ?? "",
      retailPriceExclVat: (product as any).retailPriceExclVat != null ? String((product as any).retailPriceExclVat) : "",
      priceInclVat: (product as any).priceInclVat != null ? String((product as any).priceInclVat) : "",
      resellerPriceExclVat: (product as any).resellerPriceExclVat != null ? String((product as any).resellerPriceExclVat) : "",
      resellerPriceInclVat: (product as any).resellerPriceInclVat != null ? String((product as any).resellerPriceInclVat) : "",
      stockCount: product.stockCount != null ? String(product.stockCount) : "0",
      status: product.status,
    });
    setIsProductModalOpen(true);
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/product-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/products"] }); queryClient.invalidateQueries({ queryKey: ["/api/catalog/new-items"] });
      setIsCatModalOpen(false);
    } catch { toast({ title: "Failed to save category", variant: "destructive" }); }
  }

  async function handleDeleteCat(cat: Category) {
    if ((categories as Category[]).some(c => c.parentId === cat.id)) { toast({ title: "Remove sub-categories first", variant: "destructive" }); return; }
    if (products.some(p => p.categoryId === cat.id)) { toast({ title: "Reassign products before deleting this category", variant: "destructive" }); return; }
    if (!confirm(`Delete "${cat.name}"?`)) return;
    try {
      await deleteCat.mutateAsync({ id: cat.id });
      toast({ title: `"${cat.name}" deleted` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/product-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/products"] }); queryClient.invalidateQueries({ queryKey: ["/api/catalog/new-items"] });
      if (selectedCatId === cat.id) setSelectedCatId(null);
    } catch { toast({ title: "Failed to delete", variant: "destructive" }); }
  }

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const retailExcl = productForm.retailPriceExclVat ? parseFloat(productForm.retailPriceExclVat) : undefined;
    const resellerExcl = productForm.resellerPriceExclVat ? parseFloat(productForm.resellerPriceExclVat) : undefined;
    const resellerInclVat = productForm.resellerPriceInclVat ? parseFloat(productForm.resellerPriceInclVat) : undefined;
    const inclVat = productForm.priceInclVat ? parseFloat(productForm.priceInclVat) : undefined;
    const payload = {
      name: productForm.name,
      description: productForm.description || undefined,
      categoryId: productForm.categoryId ? parseInt(productForm.categoryId) : undefined,
      sku: productForm.sku || undefined,
      imageUrl: productForm.imageUrl || undefined,
      retailPriceExclVat: retailExcl,
      resellerPriceExclVat: resellerExcl,
      resellerPriceInclVat: resellerInclVat,
      priceInclVat: inclVat,
      price: retailExcl ?? 0,
      stockCount: parseInt(productForm.stockCount || "0"),
      status: productForm.status as any,
      sortOrder: 0,
    };
    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, data: payload });
        toast({ title: "Product updated" });
      } else {
        await createProduct.mutateAsync({ data: payload });
        toast({ title: "Product created" });
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
      setProductForm(emptyProductForm);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
        queryClient.invalidateQueries({ queryKey: ["/api/catalog/products"] }); queryClient.invalidateQueries({ queryKey: ["/api/catalog/new-items"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "") : "Unknown error";
      toast({ title: editingProduct ? "Error updating product" : "Error creating product", description: msg, variant: "destructive" });
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteProduct.mutateAsync({ id });
        toast({ title: "Product deleted" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
        queryClient.invalidateQueries({ queryKey: ["/api/catalog/products"] }); queryClient.invalidateQueries({ queryKey: ["/api/catalog/new-items"] });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "") : "Unknown error";
        toast({ title: "Error deleting product", description: msg, variant: "destructive" });
      }
    }
  };

  const handleExport = () => {
    const headers = ["name", "description", "sku", "category", "retailPriceExclVat", "priceInclVat", "resellerPriceExclVat", "resellerPriceInclVat", "stockCount", "status", "imageUrl"];
    const rows = products.map(p => [
      p.name, p.description ?? "", p.sku ?? "", p.categoryName ?? "",
      (p as any).retailPriceExclVat ?? "", (p as any).priceInclVat ?? "",
      (p as any).resellerPriceExclVat ?? "", (p as any).resellerPriceInclVat ?? "",
      p.stockCount ?? 0, p.status, p.imageUrl ?? "",
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "products-export.xlsx");
    toast({ title: `Exported ${rows.length} products` });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      if (rows.length === 0) {
        toast({ title: "No data found in file", variant: "destructive" });
        return;
      }

      const products = rows.map(r => ({
        name: String(r.name || r.Name || "").trim(),
        description: String(r.description || r.Description || "").trim() || undefined,
        sku: String(r.sku || r.SKU || "").trim() || undefined,
        imageUrl: String(r.imageUrl || r.image_url || "").trim() || undefined,
        retailPriceExclVat: r.retailPriceExclVat || r.retail_price_excl_vat || undefined,
        priceInclVat: r.priceInclVat || r.price_incl_vat || undefined,
        resellerPriceExclVat: r.resellerPriceExclVat || r.reseller_price_excl_vat || undefined,
        resellerPriceInclVat: r.resellerPriceInclVat || r.reseller_price_incl_vat || undefined,
        stockCount: r.stockCount ?? r.stock_count ?? 0,
        status: r.status === "inactive" ? "inactive" : "active",
      }));

      const resp = await fetch("/api/admin/products/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products }),
        credentials: "include",
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Import failed");

      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/products"] });

      const desc = result.errors?.length > 0 ? `${result.errors.length} row(s) had errors` : undefined;
      toast({ title: `Imported ${result.created} products`, description: desc });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Import failed", description: msg, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <AppLayout role="admin" title="Products Catalog">
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)]">
        
        {/* Category sidebar */}
        <div className="w-full lg:w-56 flex flex-col bg-card border border-border rounded-2xl shadow-lg overflow-hidden shrink-0">
          <div className="p-3 border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-1 p-1 bg-muted/30 border border-border rounded-xl">
              <button
                onClick={() => setSidebarMode("browse")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${sidebarMode === "browse" ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Package className="w-3 h-3" /> Browse
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
                    <span>All Products</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${selectedCatId === null ? "bg-black/[0.1]" : "bg-black/[0.07]"}`}>{products.length}</span>
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
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${selectedCatId === parent.id ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>{products.filter(p => p.categoryId === parent.id).length}</span>
                        </button>
                        {subs.map(sub => (
                          <button key={sub.id} onClick={() => setSelectedCatId(sub.id === selectedCatId ? null : sub.id)}
                            className={`w-full text-left flex items-center justify-between pl-7 pr-3 py-1.5 rounded-xl text-xs transition-all ${selectedCatId === sub.id ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 font-semibold" : "text-muted-foreground hover:bg-black/5 hover:text-foreground"}`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0"><Tag className="w-2.5 h-2.5 shrink-0" /><span className="truncate">{sub.name}</span></div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${selectedCatId === sub.id ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>{products.filter(p => p.categoryId === sub.id).length}</span>
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
                                <p className="text-[10px] text-muted-foreground">{subs.length} sub · {products.filter(p => p.categoryId === parent.id).length} items</p>
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
                                        <p className="text-[10px] text-muted-foreground">{products.filter(p => p.categoryId === sub.id).length} items</p>
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

        {/* Product panel */}
        <div className="flex-1 flex flex-col bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/20">
            <h3 className="font-display font-bold flex items-center gap-2 text-lg">
              <Package className="w-5 h-5 text-primary" />
              {selectedCatId ? categories.find(c => c.id === selectedCatId)?.name : "All Products"}
              <span className="text-xs font-normal text-muted-foreground">({filteredProducts.length})</span>
            </h3>
            <div className="flex items-center gap-2">
              <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
              <button
                onClick={() => importFileRef.current?.click()}
                disabled={isImporting}
                title="Import from Excel"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" /> {isImporting ? "Importing..." : "Import"}
              </button>
              <button
                onClick={handleExport}
                title="Export to Excel"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export
              </button>
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
              <button 
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
              >
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <Package className="w-10 h-10 opacity-20" />
                <p>No products found in this category.</p>
              </div>
            ) : viewMode === "card" ? (
              /* ── Card View ─────────────────────────────────────────── */
              <div className="p-4 grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filteredProducts.map((product: Product, idx) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="bg-background border border-border rounded-xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="relative flex items-center justify-center h-40 border-b border-border/50 overflow-hidden bg-gradient-to-br from-primary/5 via-primary/[0.03] to-transparent">
                      {product.imageUrl ? (
                        <>
                          <img
                            key={product.imageUrl}
                            src={getImageSrc(product.imageUrl)}
                            alt={product.name}
                            className="w-full h-full object-contain p-3"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              img.style.display = "none";
                              const fallback = img.nextElementSibling as HTMLElement | null;
                              if (fallback) fallback.style.display = "flex";
                            }}
                          />
                          <div className="flex flex-col items-center justify-center gap-2 select-none" style={{ display: "none" }}>
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner">
                              <span className="text-2xl font-bold text-primary/40">
                                {product.name.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground/50 font-medium tracking-wide uppercase">No Image</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2 select-none">
                          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner">
                            <span className="text-2xl font-bold text-primary/40">
                              {product.name.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground/50 font-medium tracking-wide uppercase">No Image</span>
                        </div>
                      )}
                      <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        product.status === "active"
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          : "bg-red-500/10 text-red-500 border border-red-500/20"
                      }`}>
                        {product.status}
                      </span>
                    </div>

                    <div className="p-3 flex flex-col flex-1 gap-1">
                      <p className="font-semibold text-sm text-foreground leading-tight line-clamp-2">{product.name}</p>
                      <p className="text-[11px] text-muted-foreground">{product.categoryName || "Uncategorized"}</p>
                      {product.sku && (
                        <p className="text-[10px] font-mono text-muted-foreground/70">{product.sku}</p>
                      )}

                      <div className="mt-auto pt-2 space-y-0.5">
                        {(product as any).resellerPriceExclVat != null && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Reseller excl VAT</span>
                            <span className="font-semibold text-primary">{formatZar((product as any).resellerPriceExclVat)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${product.stockCount > 0 ? "bg-black/5 text-foreground" : "bg-red-500/10 text-red-400"}`}>
                          {product.stockCount} in stock
                        </span>
                      </div>
                    </div>

                    <div className="px-3 pb-3 flex gap-2">
                      <button
                        onClick={() => openEdit(product)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-muted/30 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors border border-border/50"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
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
                    <th className="px-4 py-4 font-semibold">Product</th>
                    <th className="px-4 py-4 font-semibold">SKU</th>
                    <th className="px-4 py-4 font-semibold">Reseller excl VAT</th>
                    <th className="px-4 py-4 font-semibold">Stock</th>
                    <th className="px-4 py-4 font-semibold">Status</th>
                    <th className="px-4 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredProducts.map((product: Product, idx) => (
                    <motion.tr
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={product.id}
                      className="hover:bg-black/[0.03] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <>
                              <img
                                key={product.imageUrl}
                                src={getImageSrc(product.imageUrl)}
                                alt={product.name}
                                className="w-10 h-10 object-contain rounded-lg bg-white border border-border/50 shrink-0"
                                onError={(e) => {
                                  const img = e.target as HTMLImageElement;
                                  img.style.display = "none";
                                  const fallback = img.nextElementSibling as HTMLElement | null;
                                  if (fallback) fallback.style.display = "flex";
                                }}
                              />
                              <div className="w-10 h-10 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-center shrink-0" style={{ display: "none" }}>
                                <Package className="w-5 h-5 text-muted-foreground/40" />
                              </div>
                            </>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-center shrink-0">
                              <Package className="w-5 h-5 text-muted-foreground/40" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-foreground">{product.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{product.categoryName || "Uncategorized"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{product.sku || "—"}</td>
                      <td className="px-4 py-3 font-medium text-primary text-sm">
                        {(product as any).resellerPriceExclVat != null ? formatZar((product as any).resellerPriceExclVat) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${product.stockCount > 0 ? "bg-black/5 text-foreground" : "bg-red-500/10 text-red-400"}`}>
                          {product.stockCount} in stock
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          product.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>
                          {product.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(product)}
                            className="p-2 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                            title="Edit product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete product"
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
            <input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} autoFocus className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder={catForm.parentId ? "e.g., IP Phones" : "e.g., Hardware"} />
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

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => { setIsProductModalOpen(false); setEditingProduct(null); }}
        title={editingProduct ? `Edit: ${editingProduct.name}` : "Add Product"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleProductSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Product Name *</label>
              <input required value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g., Yealink T43U" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">SKU</label>
              <input value={productForm.sku} onChange={e => setProductForm({...productForm, sku: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none" placeholder="YEA-T43U" />
            </div>
            <div className="col-span-2">
              <ImageUpload
                value={productForm.imageUrl}
                onChange={(url) => setProductForm(f => ({ ...f, imageUrl: url }))}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Description</label>
              <RichTextEditor
                value={productForm.description}
                onChange={(html) => setProductForm(f => ({ ...f, description: html }))}
                placeholder="Product description…"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Category</label>
              <select value={productForm.categoryId} onChange={e => setProductForm({...productForm, categoryId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none">
                <option value="">Uncategorized</option>
                {categories.map((cat: Category) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Status</label>
              <select value={productForm.status} onChange={e => setProductForm({...productForm, status: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="col-span-2 border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pricing (once-off)</p>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Reseller excl VAT (R)</label>
                <input type="number" step="0.01" min="0" value={productForm.resellerPriceExclVat} onChange={e => handleResellerPriceChange(e.target.value)} placeholder="0.00" className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none" />
              </div>
            </div>

          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <button
              type="button"
              onClick={() => { setIsProductModalOpen(false); setEditingProduct(null); }}
              className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-black/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createProduct.isPending || updateProduct.isPending}
              className="px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-50"
            >
              {editingProduct ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
