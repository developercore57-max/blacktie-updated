import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  useGetCatalogDomainTlds,
  useGetCatalogHostingPackages,
  useResellerCheckDomain,
  type DomainTld,
  type HostingPackage,
} from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Search, Loader2, CheckCircle2, XCircle, ArrowRight,
  Tag, ShoppingCart, Server, Shield, HardDrive, Database, Mail,
  ChevronRight, RefreshCw, LayoutGrid, List, Calendar, Filter,
} from "lucide-react";
import { formatZar } from "@/lib/utils";

const VAT_RATE = 0.15;

function vatPrices(item: any): { exclVat: number; inclVat: number } {
  const excl = item.resellerPriceExclVat ?? item.price ?? 0;
  const incl = item.resellerPriceInclVat ?? item.priceInclVat ?? excl * (1 + VAT_RATE);
  return { exclVat: Number(excl), inclVat: Number(incl) };
}

type Step = "search" | "result" | "hosting" | "summary";

export default function ResellerDomainCheck() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: domainTlds = [] } = useGetCatalogDomainTlds();
  const { data: hostingPackages = [] } = useGetCatalogHostingPackages();

  const [domainLabel, setDomainLabel] = useState("");
  const [selectedTldId, setSelectedTldId] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [action, setAction] = useState<"register" | "transfer" | null>(null);
  const [selectedHostingId, setSelectedHostingId] = useState<number | null>(null);
  const [hostingModalOpen, setHostingModalOpen] = useState(false);
  const [step, setStep] = useState<Step>("search");
  const [tldViewMode, setTldViewMode] = useState<"grid" | "list">("grid");
  const [tldSearch, setTldSearch] = useState("");
  const [tldFilter, setTldFilter] = useState<"all" | "active" | "inactive">("all");

  const filteredTlds = useMemo(() => {
    return (domainTlds as DomainTld[]).filter((tld) => {
      const matchSearch = !tldSearch || tld.tld.toLowerCase().includes(tldSearch.toLowerCase()) || (tld.description && tld.description.toLowerCase().includes(tldSearch.toLowerCase()));
      const matchFilter = tldFilter === "all" || tld.status === tldFilter;
      return matchSearch && matchFilter;
    });
  }, [domainTlds, tldSearch, tldFilter]);

  const selectedTld = useMemo(
    () => (domainTlds as DomainTld[]).find((t) => t.id === selectedTldId) ?? null,
    [domainTlds, selectedTldId],
  );

  const domainFull = useMemo(() => {
    if (!selectedTld) return "";
    const tld = String(selectedTld.tld).replace(/^\./, "");
    const label = domainLabel.trim().toLowerCase().replace(/\s+/g, "");
    return label && tld ? `${label}.${tld}` : "";
  }, [selectedTld, domainLabel]);

  const checkQuery = useResellerCheckDomain(
    { domain: domainFull || "example.com" },
    { query: { enabled: false } },
  );

  const selectedHosting = useMemo(
    () => (hostingPackages as HostingPackage[]).find((p) => p.id === selectedHostingId) ?? null,
    [hostingPackages, selectedHostingId],
  );

  const handleCheck = async () => {
    if (!domainFull) {
      toast({ title: "Enter a domain", description: "Type a domain name and select a TLD.", variant: "destructive" });
      return;
    }
    const r = await checkQuery.refetch();
    setChecked(true);
    setStep("result");
    if (r.data?.available) {
      setAction("register");
    } else {
      setAction(null);
    }
  };

  const handleAddToOrder = () => {
    setHostingModalOpen(true);
  };

  const handleTransfer = () => {
    setAction("transfer");
    setHostingModalOpen(true);
  };

  const handleConfirmHosting = () => {
    if (!selectedHostingId) {
      toast({ title: "Select hosting", description: "A hosting package is required.", variant: "destructive" });
      return;
    }
    setHostingModalOpen(false);
    setStep("summary");
  };

  const handleGoToOrder = () => {
    const act = action === "transfer" ? "transfer" : "register";
    const params = new URLSearchParams({
      tab: "domains",
      domainAction: act,
      domain: domainFull,
      tldId: String(selectedTldId),
      hostingId: String(selectedHostingId),
    });
    setLocation(`/reseller/orders/new?${params.toString()}`);
  };

  const resetSearch = () => {
    setDomainLabel("");
    setChecked(false);
    setAction(null);
    setSelectedHostingId(null);
    setStep("search");
  };

  return (
    <AppLayout role="reseller" title="Domain Check">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-2">
            <Globe className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Domain Availability Check</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Search for your perfect domain name. Register a new domain or transfer an existing one, then pair it with a hosting package.
          </p>
        </div>

        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-6 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={domainLabel}
                onChange={(e) => {
                  setDomainLabel(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""));
                  if (checked) {
                    setChecked(false);
                    setAction(null);
                    setStep("search");
                  }
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleCheck(); }}
                placeholder="mydomain"
                className="flex-1 min-w-0 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <select
                value={selectedTldId ?? ""}
                onChange={(e) => {
                  setSelectedTldId(e.target.value ? Number(e.target.value) : null);
                  if (checked) {
                    setChecked(false);
                    setAction(null);
                    setStep("search");
                  }
                }}
                className="w-36 rounded-xl border border-border bg-background px-3 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">Select TLD</option>
                {(domainTlds as DomainTld[]).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tld}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCheck}
              disabled={!domainFull || checkQuery.isFetching}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
            >
              {checkQuery.isFetching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Check Availability
            </button>
          </div>
          {domainFull && (
            <div className="mt-2 text-xs text-muted-foreground">
              Checking: <span className="font-semibold text-foreground">{domainFull}</span>
            </div>
          )}
        </motion.div>

        {/* Result Section */}
        <AnimatePresence mode="wait">
          {checked && step === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-card border border-border rounded-2xl p-6 shadow-sm"
            >
              {checkQuery.data?.available ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground">{domainFull}</h3>
                      <p className="text-sm text-emerald-600 font-semibold">Domain is available!</p>
                      {selectedTld && (
                        <div className="mt-2 flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Registration: <span className="font-bold text-foreground">{formatZar(vatPrices(selectedTld).inclVat)}</span>
                            <span className="text-xs ml-1">/ {selectedTld.registrationYears} yr{selectedTld.registrationYears !== 1 ? "s" : ""}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={resetSearch}
                      className="px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-muted/30 transition-all"
                    >
                      New Search
                    </button>
                    <button
                      onClick={handleAddToOrder}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Register & Add to Order
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground">{domainFull}</h3>
                      <p className="text-sm text-red-600 font-semibold">Domain is already registered</p>
                      {(checkQuery.data as any)?.nameservers && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Nameservers: {((checkQuery.data as any).nameservers as string[]).join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground">
                      This domain is already registered. If you own it and want to move it to our hosting, you can transfer it.
                    </p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={resetSearch}
                      className="px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-muted/30 transition-all"
                    >
                      Try Another Domain
                    </button>
                    <button
                      onClick={handleTransfer}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Transfer Domain
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Summary after hosting selected */}
          {step === "summary" && selectedHosting && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5"
            >
              <h3 className="text-lg font-bold text-foreground">Order Summary</h3>

              {/* Domain line item */}
              <div className="bg-muted/10 rounded-xl p-4 border border-border/50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      {action === "transfer" ? "Domain Transfer" : "Domain Registration"}: {domainFull}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedTld?.tld} — {selectedTld?.registrationYears} year{(selectedTld?.registrationYears ?? 1) !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-bold text-foreground">{selectedTld ? formatZar(vatPrices(selectedTld).inclVat) : ""}</div>
              </div>

              {/* Hosting line item */}
              <div className="bg-muted/10 rounded-xl p-4 border border-border/50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Server className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">{selectedHosting.name}</div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" />{selectedHosting.diskSpaceGb}GB</span>
                      <span className="flex items-center gap-1"><Database className="w-3 h-3" />{selectedHosting.databases} DB</span>
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{selectedHosting.emailAccounts} Email</span>
                      {selectedHosting.sslIncluded && <span className="flex items-center gap-1"><Shield className="w-3 h-3" />SSL</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-foreground">{formatZar(vatPrices(selectedHosting).inclVat)}</div>
                  <div className="text-[11px] text-muted-foreground">/month</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={resetSearch}
                  className="px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-muted/30 transition-all"
                >
                  Start Over
                </button>
                <button
                  onClick={() => setHostingModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-muted/30 transition-all"
                >
                  Change Hosting
                </button>
                <button
                  onClick={handleGoToOrder}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Proceed to Order
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Available TLDs quick reference */}
        {step === "search" && !checked && (domainTlds as DomainTld[]).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-bold text-foreground shrink-0">Available TLDs</h3>
              <div className="flex items-center gap-2 flex-1 justify-end">
                {/* Search */}
                <div className="relative w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    value={tldSearch}
                    onChange={(e) => setTldSearch(e.target.value)}
                    placeholder="Search TLDs..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs focus:ring-2 focus:ring-primary/30 outline-none"
                  />
                </div>
                {/* Status filter */}
                <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5">
                  {(["all", "active", "inactive"] as const).map((f) => (
                    <button key={f} onClick={() => setTldFilter(f)} className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-all ${tldFilter === f ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{f}</button>
                  ))}
                </div>
                {/* View toggle */}
                <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5">
                  <button onClick={() => setTldViewMode("grid")} className={`p-1.5 rounded-md transition-all ${tldViewMode === "grid" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setTldViewMode("list")} className={`p-1.5 rounded-md transition-all ${tldViewMode === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><List className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>

            {filteredTlds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Tag className="w-8 h-8 opacity-20" />
                <p className="text-sm font-medium">No TLDs match your search</p>
              </div>
            ) : tldViewMode === "list" ? (
              <div className="space-y-2">
                {filteredTlds.map((tld) => {
                  const price = vatPrices(tld);
                  return (
                    <motion.button
                      key={tld.id}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      onClick={() => setSelectedTldId(tld.id)}
                      className={`w-full text-left flex items-center gap-4 px-4 py-3 rounded-xl border transition-all ${
                        selectedTldId === tld.id
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                          : "border-border/60 bg-background hover:border-primary/30 hover:bg-primary/5"
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${selectedTldId === tld.id ? "bg-primary/15" : "bg-primary/10"}`}>
                        <Tag className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-primary">{tld.tld}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tld.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>{tld.status}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {tld.description && <span className="text-xs text-muted-foreground line-clamp-1">{tld.description}</span>}
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0"><Calendar className="w-3 h-3" />{tld.registrationYears} yr</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 min-w-[80px]">
                        <div className="text-sm font-bold text-foreground">{formatZar(price.inclVat)}</div>
                        <div className="text-[10px] text-muted-foreground">incl VAT</div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {filteredTlds.map((tld) => {
                const price = vatPrices(tld);
                return (
                  <button
                    key={tld.id}
                    onClick={() => setSelectedTldId(tld.id)}
                    className={`flex flex-col px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      selectedTldId === tld.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 bg-background hover:border-primary/30 hover:bg-primary/5"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{tld.tld}</span>
                      <span className="text-xs font-bold text-muted-foreground">{formatZar(price.inclVat)}</span>
                    </div>
                    {tld.description && (
                      <p className="text-[10px] font-normal text-muted-foreground mt-1 text-left line-clamp-2">{tld.description}</p>
                    )}
                    <div className="flex items-center gap-1 text-[10px] font-normal text-muted-foreground mt-1">
                      <Calendar className="w-3 h-3" />{tld.registrationYears} yr registration
                    </div>
                  </button>
                );
              })}
            </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Hosting Package Selection Modal */}
      <Modal
        isOpen={hostingModalOpen}
        onClose={() => setHostingModalOpen(false)}
        title="Select Hosting Package"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="bg-muted/10 rounded-xl p-3 border border-border/50">
            <p className="text-xs text-muted-foreground">
              A hosting package is required for your domain. Choose the plan that best fits your needs.
            </p>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {(hostingPackages as HostingPackage[]).map((pkg) => {
              const price = vatPrices(pkg);
              const selected = selectedHostingId === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedHostingId(selected ? null : pkg.id)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all ${
                    selected
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                      : "border-border/60 bg-background hover:border-primary/30 hover:bg-primary/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-foreground">{pkg.name}</div>
                      {pkg.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{pkg.description}</p>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground mt-1.5">
                        <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" />{pkg.diskSpaceGb}GB Disk</span>
                        <span className="flex items-center gap-1"><Database className="w-3 h-3" />{pkg.databases} Database{pkg.databases !== 1 ? "s" : ""}</span>
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{pkg.emailAccounts} Email</span>
                        {pkg.sslIncluded && <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-emerald-500" />Free SSL</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-foreground">{formatZar(price.inclVat)}</div>
                      <div className="text-[11px] text-muted-foreground">/month</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
            <button
              onClick={() => setHostingModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-muted/30 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmHosting}
              disabled={!selectedHostingId}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
            >
              <ArrowRight className="w-4 h-4" />
              Continue
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
