import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  useAdminGetAreaCodes, 
  useAdminCreateAreaCode,
  useAdminGetDids,
  useAdminCreateDid,
  useAdminAssignDid,
  useAdminUnassignDid,
  useAdminGetResellers,
  useAdminImportDidsFromSheets,
  useAdminGetDidSheetConfig,
  useAdminPatchDidSheetConfig,
  AreaCode,
  Did,
  Reseller
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Phone, MapPin, Link2, Unlink, FileSpreadsheet, CheckCircle2, AlertCircle, ExternalLink, ShoppingCart, User, Search, X, SlidersHorizontal, Save, Clock, RefreshCw, ToggleLeft, ToggleRight, Layers, Trash2, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";

type ImportStep = "input" | "preview" | "importing" | "done";

interface PreviewData {
  totalRows: number;
  headers: string[];
  sample: Array<{ areaCode: string; number: string; region?: string; province?: string; notes?: string }>;
}

interface ImportResult {
  created: number;
  skipped: number;
  restored: number;
  areaCodesCreated: number;
  totalRows: number;
}

export default function AdminDidManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const [selectedAreaCodeId, setSelectedAreaCodeId] = useState<number | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
  const [selectedResellerId, setSelectedResellerId] = useState<string>("");
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: areaCodes = [] } = useAdminGetAreaCodes();
  const { data: dids = [] } = useAdminGetDids({ 
    areaCodeId: selectedAreaCodeId,
    status: selectedStatus === "all" ? undefined : selectedStatus 
  });
  const { data: resellers = [] } = useAdminGetResellers();

  const filteredDids = useMemo(() => {
    let result = dids as Did[];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(d =>
        d.number.toLowerCase().includes(q) ||
        d.areaCode?.toLowerCase().includes(q) ||
        (d.region ?? "").toLowerCase().includes(q)
      );
    }
    if (selectedResellerId) {
      if (selectedResellerId === "__unassigned__") {
        result = result.filter(d => !d.resellerId);
      } else {
        result = result.filter(d => String(d.resellerId) === selectedResellerId);
      }
    }
    if (selectedProvince) {
      const matchingCodes = new Set(areaCodes.filter(ac => ac.province === selectedProvince).map(ac => ac.code));
      result = result.filter(d => matchingCodes.has(d.areaCode ?? ""));
    }
    return result;
  }, [dids, searchQuery, selectedResellerId, selectedProvince, areaCodes]);

  const hasActiveFilters = !!(searchQuery || selectedAreaCodeId || (selectedStatus && selectedStatus !== "all") || selectedResellerId || selectedProvince);

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedAreaCodeId(undefined);
    setSelectedStatus(undefined);
    setSelectedResellerId("");
    setSelectedProvince("");
  };

  const [isAreaCodeModalOpen, setIsAreaCodeModalOpen] = useState(false);
  const [isDidModalOpen, setIsDidModalOpen] = useState(false);
  const [assignModal, setAssignModal] = useState<{isOpen: boolean, didId: number | null}>({ isOpen: false, didId: null });

  // Google Sheets import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>("input");
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string>("");

  const importSheets = useAdminImportDidsFromSheets();

  // Scheduled Google Sheets import config
  const { data: sheetConfig, refetch: refetchSheetConfig } = useAdminGetDidSheetConfig();
  const patchSheetConfig = useAdminPatchDidSheetConfig();
  const [savedSheetUrl, setSavedSheetUrl] = useState("");
  const [sheetEnabled, setSheetEnabled] = useState(false);
  const [sheetUrlDirty, setSheetUrlDirty] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [sheetRunning, setSheetRunning] = useState(false);

  useEffect(() => {
    if (sheetConfig) {
      setSavedSheetUrl(sheetConfig.didSheetUrl ?? "");
      setSheetEnabled(sheetConfig.didSheetEnabled ?? false);
      setSheetUrlDirty(false);
    }
  }, [sheetConfig]);

  const handleSaveSheetConfig = async () => {
    setSheetSaving(true);
    try {
      await patchSheetConfig.mutateAsync({ data: { didSheetUrl: savedSheetUrl, didSheetEnabled: sheetEnabled } });
      toast({ title: "Scheduled import saved" });
      setSheetUrlDirty(false);
      refetchSheetConfig();
    } catch {
      toast({ title: "Error saving sheet config", variant: "destructive" });
    } finally {
      setSheetSaving(false);
    }
  };

  const handleToggleSheetEnabled = async (enabled: boolean) => {
    setSheetEnabled(enabled);
    setSheetUrlDirty(true);
  };

  const handleRunNow = async () => {
    if (!savedSheetUrl) { toast({ title: "Paste and save a Google Sheets URL first", variant: "destructive" }); return; }
    setSheetRunning(true);
    try {
      const result = await importSheets.mutateAsync({ data: { url: savedSheetUrl, dryRun: false } });
      const r = result as any;
      const restoredMsg = (r.restored ?? 0) > 0 ? `, restored: ${r.restored}` : "";
      toast({ title: `Import done — created: ${r.created ?? 0}${restoredMsg}, skipped: ${r.skipped ?? 0}` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/area-codes"] });
      refetchSheetConfig();
    } catch (err: any) {
      toast({ title: err?.data?.error ?? "Import failed", variant: "destructive" });
    } finally {
      setSheetRunning(false);
    }
  };

  // Bulk DID Add state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkAreaCodeId, setBulkAreaCodeId] = useState("");
  const [bulkNumbers, setBulkNumbers] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const parsedBulkNumbers = useMemo(() => {
    return bulkNumbers
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(Boolean);
  }, [bulkNumbers]);

  const handleBulkAdd = async () => {
    if (!bulkAreaCodeId || parsedBulkNumbers.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/dids/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ areaCodeId: parseInt(bulkAreaCodeId), numbers: parsedBulkNumbers }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error ?? "Bulk add failed", variant: "destructive" });
      } else {
        toast({ title: data.message ?? "DIDs added successfully" });
        setBulkAreaCodeId("");
        setBulkNumbers("");
        setIsBulkModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/dids"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/area-codes"] });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setBulkLoading(false);
    }
  };

  // Delete DID
  const handleDeleteDid = async (did: Did) => {
    if (!confirm(`Delete DID ${did.number}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/dids/${did.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: data.error ?? "Failed to delete DID", variant: "destructive" });
      } else {
        toast({ title: `DID ${did.number} deleted` });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/dids"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/area-codes"] });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    }
  };

  const createAreaCode = useAdminCreateAreaCode();
  const createDid = useAdminCreateDid();
  const assignDid = useAdminAssignDid();
  const unassignDid = useAdminUnassignDid();

  const [areaCodeForm, setAreaCodeForm] = useState({ code: "", region: "", province: "Gauteng" });
  const [didForm, setDidForm] = useState({ areaCodeId: "", number: "", notes: "" });
  const [assignForm, setAssignForm] = useState({ resellerId: "" });

  const handleAreaCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAreaCode.mutateAsync({ data: areaCodeForm });
      toast({ title: "Area code created" });
      setIsAreaCodeModalOpen(false);
      setAreaCodeForm({ code: "", region: "", province: "Gauteng" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/area-codes"] });
    } catch {
      toast({ title: "Error creating area code", variant: "destructive" });
    }
  };

  const handleDidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDid.mutateAsync({ 
        data: { 
          areaCodeId: parseInt(didForm.areaCodeId), 
          number: didForm.number, 
          notes: didForm.notes 
        } 
      });
      toast({ title: "DID added" });
      setIsDidModalOpen(false);
      setDidForm({ areaCodeId: "", number: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/area-codes"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "") : "Unknown error";
      toast({ title: "Error adding DID", description: msg, variant: "destructive" });
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModal.didId || !assignForm.resellerId) return;
    try {
      await assignDid.mutateAsync({
        id: assignModal.didId,
        data: { resellerId: parseInt(assignForm.resellerId) }
      });
      toast({ title: "DID Assigned successfully" });
      setAssignModal({ isOpen: false, didId: null });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/area-codes"] });
    } catch {
      toast({ title: "Error assigning DID", variant: "destructive" });
    }
  };

  const handleUnassign = async (id: number) => {
    if (confirm("Remove this DID from the reseller? It will become available again.")) {
      try {
        await unassignDid.mutateAsync({ id });
        toast({ title: "DID unassigned" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/dids"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/area-codes"] });
      } catch {
        toast({ title: "Error unassigning DID", variant: "destructive" });
      }
    }
  };

  const handleImportPreview = async () => {
    setImportError("");
    try {
      const result = await importSheets.mutateAsync({ data: { url: sheetsUrl, dryRun: true } });
      setPreviewData({
        totalRows: result.totalRows,
        headers: (result as any).headers ?? [],
        sample: (result as any).sample ?? [],
      });
      setImportStep("preview");
    } catch (err: any) {
      const msg = err?.data?.error ?? err?.message ?? "Failed to fetch sheet";
      setImportError(msg);
    }
  };

  const handleImportConfirm = async () => {
    setImportStep("importing");
    setImportError("");
    try {
      const result = await importSheets.mutateAsync({ data: { url: sheetsUrl, dryRun: false } });
      setImportResult({
        created: (result as any).created ?? 0,
        skipped: (result as any).skipped ?? 0,
        restored: (result as any).restored ?? 0,
        areaCodesCreated: (result as any).areaCodesCreated ?? 0,
        totalRows: result.totalRows,
      });
      setImportStep("done");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dids"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/area-codes"] });
    } catch (err: any) {
      const msg = err?.data?.error ?? err?.message ?? "Import failed";
      setImportError(msg);
      setImportStep("preview");
    }
  };

  const resetImportModal = () => {
    setImportStep("input");
    setSheetsUrl("");
    setPreviewData(null);
    setImportResult(null);
    setImportError("");
    setIsImportModalOpen(false);
  };

  const inputCls = "w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none text-sm";
  const labelCls = "block text-sm font-medium text-muted-foreground mb-1.5";

  return (
    <AppLayout role="admin" title="DID Management">
      {/* Scheduled Google Sheets Import */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="flex items-center gap-3 p-5 border-b border-border bg-emerald-500/5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-foreground">Scheduled Google Sheets Import</h2>
            <p className="text-xs text-muted-foreground">Auto-imports DID numbers from a Google Sheet every 30 minutes</p>
          </div>
          {sheetUrlDirty && (
            <button
              onClick={handleSaveSheetConfig}
              disabled={sheetSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 text-white shadow-md shadow-emerald-500/25 hover:bg-emerald-400 transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {sheetSaving ? "Saving…" : "Save"}
            </button>
          )}
        </div>
        <div className="p-5 space-y-4">
          {/* URL input */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Google Sheets URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={savedSheetUrl}
                onChange={e => { setSavedSheetUrl(e.target.value); setSheetUrlDirty(true); }}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-border text-foreground font-mono text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none"
              />
              {savedSheetUrl && (
                <a href={savedSheetUrl} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-colors"
                  title="Open sheet">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Sheet must be shared as <strong className="text-foreground">"Anyone with the link can view"</strong> and have <span className="font-mono">area_code</span> and <span className="font-mono">number</span> columns.</p>
          </div>

          {/* Enable toggle + Run Now */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => handleToggleSheetEnabled(!sheetEnabled)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${sheetEnabled ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20" : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50"}`}
            >
              {sheetEnabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {sheetEnabled ? "Auto-import enabled" : "Auto-import disabled"}
            </button>

            <button
              onClick={handleRunNow}
              disabled={sheetRunning || !savedSheetUrl}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-card border border-border text-foreground hover:bg-muted/30 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${sheetRunning ? "animate-spin" : ""}`} />
              {sheetRunning ? "Importing…" : "Import Now"}
            </button>

            {/* Last run status */}
            {sheetConfig?.didSheetLastRunAt && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
                <Clock className="w-3.5 h-3.5" />
                Last run: {format(new Date(sheetConfig.didSheetLastRunAt), "d MMM yyyy, HH:mm")}
                {sheetConfig.didSheetLastRunResult && (
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${sheetConfig.didSheetLastRunResult.startsWith("error") ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-600"}`}>
                    {sheetConfig.didSheetLastRunResult}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* DIDs Section */}
      <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden flex flex-col mb-8">
        {/* Title bar + action buttons */}
        <div className="p-4 border-b border-border/50 flex flex-wrap items-center justify-between gap-3 bg-muted/20">
          <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" /> DID Numbers
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {filteredDids.length !== dids.length
                ? `${filteredDids.length} of ${dids.length}`
                : dids.length}
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { resetImportModal(); setIsImportModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-sm hover:bg-emerald-500/20 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" /> Import from Google Sheets
            </button>
            <button 
              onClick={() => { setBulkAreaCodeId(""); setBulkNumbers(""); setIsBulkModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/10 text-violet-500 border border-violet-500/20 font-semibold text-sm hover:bg-violet-500/20 transition-colors"
            >
              <Layers className="w-4 h-4" /> Bulk Add DIDs
            </button>
            <button 
              onClick={() => setIsDidModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <Plus className="w-4 h-4" /> Add DID Number
            </button>
          </div>
        </div>

        {/* Search + Filter bar */}
        <div className="px-4 py-3 border-b border-border/40 bg-muted/10 flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground shrink-0" />
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search number or region…"
              className="w-full pl-8 pr-8 py-1.5 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* Status */}
          <select 
            value={selectedStatus || "all"} 
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none appearance-none"
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="assigned">Assigned</option>
          </select>
          {/* Province */}
          <select 
            value={selectedProvince}
            onChange={e => { setSelectedProvince(e.target.value); setSelectedAreaCodeId(undefined); }}
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none appearance-none"
          >
            <option value="">All Provinces</option>
            {[...new Set(areaCodes.map(ac => ac.province).filter(Boolean))].sort().map(p => (
              <option key={p} value={p!}>{p}</option>
            ))}
          </select>
          {/* Area Code */}
          <select 
            value={selectedAreaCodeId || ""} 
            onChange={e => { setSelectedAreaCodeId(e.target.value ? parseInt(e.target.value) : undefined); setSelectedProvince(""); }}
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none appearance-none"
          >
            <option value="">All Area Codes</option>
            {(selectedProvince
              ? areaCodes.filter(ac => ac.province === selectedProvince)
              : areaCodes
            ).map(ac => <option key={ac.id} value={ac.id}>{ac.code} – {ac.region}</option>)}
          </select>
          {/* Reseller */}
          <select 
            value={selectedResellerId}
            onChange={e => setSelectedResellerId(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none appearance-none"
          >
            <option value="">All Resellers</option>
            <option value="__unassigned__">Unassigned</option>
            {resellers.map((r: Reseller) => <option key={r.id} value={String(r.id)}>{r.companyName}</option>)}
          </select>
          {/* Clear all */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-black/5 border border-border transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
        
        <div className="overflow-auto" style={{ maxHeight: 540 }}>
          <table className="w-full text-sm text-left relative">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/10 sticky top-0 backdrop-blur-md z-10">
              <tr>
                <th className="px-6 py-4 font-semibold">Number</th>
                <th className="px-6 py-4 font-semibold">Area Info</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Assignment</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredDids.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    {hasActiveFilters ? (
                      <span>No DIDs match your filters. <button onClick={clearAllFilters} className="text-primary hover:underline font-medium">Clear filters</button></span>
                    ) : "No DIDs found."}
                  </td>
                </tr>
              ) : (
                filteredDids.map((did: Did, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                    key={did.id} className="hover:bg-black/[0.03] transition-colors"
                  >
                    <td className="px-6 py-4 font-mono font-medium text-foreground text-base tracking-wider">{did.number}</td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-foreground">{did.areaCode}</span>
                      <span className="text-xs text-muted-foreground block">{did.region}</span>
                    </td>
                    <td className="px-6 py-4">
                      {did.status === 'available' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          Available
                        </span>
                      ) : did.status === 'reserved' ? (
                        <button
                          onClick={() => navigate("/admin/orders")}
                          title={`Reserved by Order #${(did as any).reservedByOrderId}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                        >
                          <ShoppingCart className="w-2.5 h-2.5" /> Reserved
                        </button>
                      ) : (
                        <button
                          onClick={() => did.resellerId && navigate(`/admin/resellers/${did.resellerId}`)}
                          title={`Assigned to ${did.resellerName}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                        >
                          <User className="w-2.5 h-2.5" /> Assigned
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {did.status === 'reserved' && (did as any).reservedByOrderId ? (
                        <button
                          onClick={() => navigate("/admin/orders")}
                          className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 font-semibold text-xs hover:underline"
                        >
                          <ShoppingCart className="w-3 h-3" />
                          Order #{(did as any).reservedByOrderId}
                        </button>
                      ) : did.resellerName ? (
                        <button
                          onClick={() => did.resellerId && navigate(`/admin/resellers/${did.resellerId}`)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold text-xs hover:underline"
                        >
                          <User className="w-3 h-3" />
                          {did.resellerName}
                          <span className="text-[10px] text-muted-foreground font-normal ml-1">{did.assignedAt ? format(new Date(did.assignedAt), "PP") : ""}</span>
                        </button>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {did.status === 'available' ? (
                          <button 
                            onClick={() => setAssignModal({ isOpen: true, didId: did.id })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white font-medium text-xs transition-colors"
                          >
                            <Link2 className="w-3.5 h-3.5" /> Assign
                          </button>
                        ) : did.status === 'reserved' ? (
                          <span className="text-xs text-muted-foreground italic">Via order</span>
                        ) : (
                          <button 
                            onClick={() => handleUnassign(did.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white font-medium text-xs transition-colors"
                          >
                            <Unlink className="w-3.5 h-3.5" /> Unassign
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteDid(did)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-medium text-xs transition-colors"
                          title="Delete DID"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Area Codes Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" /> Area Codes
          </h2>
          <button 
            onClick={() => setIsAreaCodeModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm hover:bg-black/[0.07] transition-colors border border-border"
          >
            <Plus className="w-4 h-4" /> Add Area Code
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {areaCodes.map((ac: AreaCode, idx) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              key={ac.id}
              className="bg-card border border-border rounded-xl p-5 shadow-lg shadow-black/10 hover:shadow-xl transition-all"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-2xl font-display font-bold text-primary">{ac.code}</h3>
                <span className="text-xs font-medium text-muted-foreground bg-black/5 px-2 py-1 rounded-md border border-white/5">{ac.province}</span>
              </div>
              <p className="text-sm text-foreground mb-4 font-medium">{ac.region}</p>
              
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-foreground text-sm">{ac.totalDids}</span>
                </div>
                <div className="w-px h-6 bg-border/50"></div>
                <div className="flex flex-col">
                  <span className="text-emerald-400">Available</span>
                  <span className="text-foreground text-sm">{ac.availableDids}</span>
                </div>
                <div className="w-px h-6 bg-border/50"></div>
                <div className="flex flex-col">
                  <span className="text-blue-400">Assigned</span>
                  <span className="text-foreground text-sm">{ac.assignedDids}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────── */}

      {/* Area Code Modal */}
      <Modal isOpen={isAreaCodeModalOpen} onClose={() => setIsAreaCodeModalOpen(false)} title="Add Area Code">
        <form onSubmit={handleAreaCodeSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Code</label>
            <input required value={areaCodeForm.code} onChange={e => setAreaCodeForm({...areaCodeForm, code: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g., 011" />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Region</label>
            <input required value={areaCodeForm.region} onChange={e => setAreaCodeForm({...areaCodeForm, region: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g., Johannesburg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Province</label>
            <select value={areaCodeForm.province} onChange={e => setAreaCodeForm({...areaCodeForm, province: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none appearance-none">
              <option>Gauteng</option><option>Western Cape</option><option>KwaZulu-Natal</option>
              <option>Eastern Cape</option><option>Free State</option><option>Mpumalanga</option>
              <option>Limpopo</option><option>North West</option><option>Northern Cape</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsAreaCodeModalOpen(false)} className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-black/5">Cancel</button>
            <button type="submit" disabled={createAreaCode.isPending} className="px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground">Save</button>
          </div>
        </form>
      </Modal>

      {/* Add DID Modal */}
      <Modal isOpen={isDidModalOpen} onClose={() => setIsDidModalOpen(false)} title="Add DID Number">
        <form onSubmit={handleDidSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Area Code</label>
            <select required value={didForm.areaCodeId} onChange={e => setDidForm({...didForm, areaCodeId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none appearance-none">
              <option value="">Select Area Code</option>
              {areaCodes.map(ac => <option key={ac.id} value={ac.id}>{ac.code} - {ac.region}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Phone Number</label>
            <input required value={didForm.number} onChange={e => setDidForm({...didForm, number: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none font-mono" placeholder="e.g., +27 11 555 1234" />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Notes (Optional)</label>
            <input value={didForm.notes} onChange={e => setDidForm({...didForm, notes: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none" />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsDidModalOpen(false)} className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-black/5">Cancel</button>
            <button type="submit" disabled={createDid.isPending} className="px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground">Add Number</button>
          </div>
        </form>
      </Modal>

      {/* Assign DID Modal */}
      <Modal isOpen={assignModal.isOpen} onClose={() => setAssignModal({isOpen: false, didId: null})} title="Assign DID to Reseller">
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Select Reseller</label>
            <select required value={assignForm.resellerId} onChange={e => setAssignForm({resellerId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-primary/50 outline-none appearance-none">
              <option value="">-- Choose Reseller --</option>
              {resellers.map((r: Reseller) => <option key={r.id} value={r.id}>{r.companyName}</option>)}
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setAssignModal({isOpen: false, didId: null})} className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-black/5">Cancel</button>
            <button type="submit" disabled={assignDid.isPending} className="px-5 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground">Assign DID</button>
          </div>
        </form>
      </Modal>

      {/* ── Google Sheets Import Modal ─────────────────── */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={resetImportModal}
        title="Import DIDs from Google Sheets"
        maxWidth="max-w-2xl"
      >
        {/* Step 1: URL Input */}
        {importStep === "input" && (
          <div className="space-y-5">
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-sm">
              <p className="font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" /> How to prepare your sheet
              </p>
              <ul className="text-muted-foreground space-y-1 text-xs leading-relaxed">
                <li>• Share the sheet as <strong className="text-foreground">"Anyone with the link can view"</strong></li>
                <li>• First row must be a header row with these columns:</li>
                <li className="ml-3 font-mono text-foreground">area_code &nbsp;|&nbsp; number &nbsp;|&nbsp; region &nbsp;|&nbsp; province &nbsp;|&nbsp; notes</li>
                <li className="ml-3 text-muted-foreground/70">(region, province and notes are optional)</li>
                <li>• Column aliases accepted: <span className="font-mono">code, prefix, did, phone, telephone</span></li>
                <li>• Duplicate numbers are safely skipped</li>
                <li>• Missing area codes are created automatically</li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Google Sheets URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={sheetsUrl}
                  onChange={e => { setSheetsUrl(e.target.value); setImportError(""); }}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-border text-foreground font-mono text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none"
                />
                {sheetsUrl && (
                  <a
                    href={sheetsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground transition-colors"
                    title="Open sheet"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              {importError && (
                <div className="mt-3 flex items-start gap-2 text-sm text-red-400 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{importError}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={resetImportModal} className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-black/5">Cancel</button>
              <button
                onClick={handleImportPreview}
                disabled={!sheetsUrl.trim() || importSheets.isPending}
                className="px-6 py-2.5 rounded-xl font-semibold bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 disabled:opacity-40 transition-colors"
              >
                {importSheets.isPending ? "Fetching sheet..." : "Preview Import"}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {importStep === "preview" && previewData && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/10 rounded-xl p-4 border border-border/50 text-center">
                <p className="text-2xl font-display font-bold text-foreground">{previewData.totalRows}</p>
                <p className="text-xs text-muted-foreground mt-1">Rows to import</p>
              </div>
              <div className="bg-muted/10 rounded-xl p-4 border border-border/50 text-center col-span-2">
                <p className="text-xs text-muted-foreground mb-1.5">Detected columns</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {previewData.headers.map((h, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-mono">{h}</span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Preview — first {previewData.sample.length} rows
              </p>
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/10 text-muted-foreground uppercase">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold text-left">Area Code</th>
                      <th className="px-3 py-2.5 font-semibold text-left">Number</th>
                      <th className="px-3 py-2.5 font-semibold text-left">Region</th>
                      <th className="px-3 py-2.5 font-semibold text-left">Province</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {previewData.sample.map((row, i) => (
                      <tr key={i} className="hover:bg-black/[0.03]">
                        <td className="px-3 py-2.5 font-mono font-bold text-primary">{row.areaCode}</td>
                        <td className="px-3 py-2.5 font-mono text-foreground">{row.number}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{row.region || "—"}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{row.province || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewData.totalRows > previewData.sample.length && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  …and {previewData.totalRows - previewData.sample.length} more rows
                </p>
              )}
            </div>

            {importError && (
              <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            <div className="flex justify-between gap-3 pt-2">
              <button onClick={() => { setImportStep("input"); setImportError(""); }} className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-black/5 border border-border">
                ← Back
              </button>
              <div className="flex gap-2">
                <button onClick={resetImportModal} className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-black/5">Cancel</button>
                <button
                  onClick={handleImportConfirm}
                  className="px-6 py-2.5 rounded-xl font-bold bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-colors"
                >
                  Import {previewData.totalRows} DIDs
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Importing spinner */}
        {importStep === "importing" && (
          <div className="py-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto" />
            <p className="text-muted-foreground font-medium">Importing DIDs…</p>
            <p className="text-xs text-muted-foreground/60">This may take a moment for large sheets</p>
          </div>
        )}

        {/* Step 4: Done */}
        {importStep === "done" && importResult && (
          <div className="space-y-5">
            <div className="text-center py-4">
              <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-2xl font-display font-bold text-foreground mb-1">Import Complete</h3>
              <p className="text-muted-foreground text-sm">Your DIDs have been added to the system</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
                <p className="text-3xl font-display font-bold text-emerald-400">{importResult.created}</p>
                <p className="text-xs text-muted-foreground mt-1">DIDs Created</p>
              </div>
              <div className={`${(importResult.restored ?? 0) > 0 ? "bg-amber-500/5 border-amber-500/20" : "bg-muted/10 border-border/50"} border rounded-xl p-4 text-center`}>
                <p className={`text-3xl font-display font-bold ${(importResult.restored ?? 0) > 0 ? "text-amber-500" : "text-foreground"}`}>{importResult.restored ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Restored to Available</p>
              </div>
              <div className="bg-muted/10 border border-border/50 rounded-xl p-4 text-center">
                <p className="text-3xl font-display font-bold text-foreground">{importResult.skipped}</p>
                <p className="text-xs text-muted-foreground mt-1">Already Exists / Skipped</p>
              </div>
              <div className={`${importResult.areaCodesCreated > 0 ? "bg-primary/5 border-primary/20" : "bg-muted/10 border-border/50"} border rounded-xl p-4 text-center`}>
                <p className={`text-3xl font-display font-bold ${importResult.areaCodesCreated > 0 ? "text-primary" : "text-foreground"}`}>{importResult.areaCodesCreated}</p>
                <p className="text-xs text-muted-foreground mt-1">Area Codes Created</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={resetImportModal}
                className="px-6 py-2.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Bulk Add DIDs Modal ─────────────────────────── */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Add DID Numbers"
        maxWidth="max-w-xl"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Area Code</label>
            <select
              value={bulkAreaCodeId}
              onChange={e => setBulkAreaCodeId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:ring-2 focus:ring-violet-500/50 outline-none appearance-none text-sm"
            >
              <option value="">Select Area Code…</option>
              {areaCodes.map((ac: AreaCode) => (
                <option key={ac.id} value={ac.id}>{ac.code} — {ac.region} ({ac.province})</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-muted-foreground">DID Numbers</label>
              {parsedBulkNumbers.length > 0 && (
                <span className="text-xs text-violet-500 font-semibold bg-violet-500/10 px-2 py-0.5 rounded-full">
                  {parsedBulkNumbers.length} number{parsedBulkNumbers.length !== 1 ? "s" : ""} detected
                </span>
              )}
            </div>
            <textarea
              value={bulkNumbers}
              onChange={e => setBulkNumbers(e.target.value)}
              rows={8}
              placeholder={"Paste or type numbers — one per line, or comma/semicolon separated:\n\n0110001234\n0110001235\n0110001236"}
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground font-mono text-sm focus:ring-2 focus:ring-violet-500/50 outline-none resize-none placeholder:text-muted-foreground/50"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">Supports paste from Excel/Sheets. Duplicates are automatically skipped.</p>
          </div>

          {parsedBulkNumbers.length > 0 && (
            <div className="bg-muted/20 border border-border rounded-xl p-3 max-h-32 overflow-y-auto">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preview</p>
              <div className="flex flex-wrap gap-1.5">
                {parsedBulkNumbers.slice(0, 30).map((n, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-500 border border-violet-500/20 text-xs font-mono">{n}</span>
                ))}
                {parsedBulkNumbers.length > 30 && (
                  <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs">+{parsedBulkNumbers.length - 30} more</span>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(false)}
              className="px-5 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkAdd}
              disabled={bulkLoading || !bulkAreaCodeId || parsedBulkNumbers.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold bg-violet-500 text-white shadow-lg shadow-violet-500/25 hover:bg-violet-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</>
                : <><Layers className="w-4 h-4" /> Add {parsedBulkNumbers.length > 0 ? parsedBulkNumbers.length : ""} DID{parsedBulkNumbers.length !== 1 ? "s" : ""}</>
              }
            </button>
          </div>
        </div>
      </Modal>

    </AppLayout>
  );
}
