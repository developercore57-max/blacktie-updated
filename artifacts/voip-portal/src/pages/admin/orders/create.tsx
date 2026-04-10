import { Fragment, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { formatZar } from "@/lib/utils";
import { useLocation } from "wouter";
import {
  CheckCircle2,
  ChevronDown,
  Globe,
  HardDrive,
  Loader2,
  MapPin,
  Package,
  Phone,
  Plus,
  Server,
  Trash2,
  XCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  useAdminGetResellers,
  useAdminGetClients,
  useAdminGetAreaCodes,
  type Reseller,
  type Client,
  type AreaCode,
  type Did,
  useAdminCreateOrder,
} from "@workspace/api-client-react";

// ─── Catalog item type ────────────────────────────────────────────────────────

type CatalogItem = {
  id?: number;
  name?: string | null;
  tld?: string | null;
  price?: number | null;
  retailPriceExclVat?: number | null;
  resellerPriceExclVat?: number | null;
  resellerPriceInclVat?: number | null;
  priceInclVat?: number | null;
  minutes?: number | null;
  categoryName?: string | null;
  diskSpaceGb?: number | null;
  bandwidthGb?: number | null;
  emailAccounts?: number | null;
  databases?: number | null;
  subdomains?: number | null;
  sslIncluded?: boolean | null;
};

// ─── Order item form ──────────────────────────────────────────────────────────

type ItemForm = {
  itemType: string;
  referenceId: string;
  name: string;
  sku: string;
  quantity: string;
  unitPriceExclVat: string;
  unitPriceInclVat: string;
};

// ─── Per-row panel states ─────────────────────────────────────────────────────

type VoipPanelState = {
  areaCodeId?: number;
  selectedDidId?: number | null;
  bundleId?: number | null;
};

type DomainPanelState = {
  label: string;
  checking: boolean;
  checked: boolean;
  available?: boolean;
  nameservers?: string[];
  offerHosting: boolean;
  confirmedDomain?: string;
};

// ─── Constants & helpers ──────────────────────────────────────────────────────

const VAT_RATE = 0.15;

const DEFAULT_ITEM: ItemForm = {
  itemType: "service",
  referenceId: "",
  name: "",
  sku: "",
  quantity: "1",
  unitPriceExclVat: "",
  unitPriceInclVat: "",
};

function defaultDomainPanel(): DomainPanelState {
  return { label: "", checking: false, checked: false, offerHosting: false };
}

async function fetchCatalog<T = CatalogItem>(url: string): Promise<T[]> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) return [];
  return res.json() as Promise<T[]>;
}

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function vatPricesFromItem(item: CatalogItem): { exclVat: number; inclVat: number } {
  const excl = item.resellerPriceExclVat ?? item.retailPriceExclVat ?? item.price ?? 0;
  const incl = item.resellerPriceInclVat ?? item.priceInclVat ?? Number(excl) * (1 + VAT_RATE);
  return { exclVat: Number(excl), inclVat: Number(incl) };
}

function requiresMinuteBundle(item: CatalogItem): boolean {
  const hay = `${item.name ?? ""} ${item.categoryName ?? ""}`.toLowerCase();
  return (
    /\bsingle\s*line\b/.test(hay) ||
    /hosted\s*pbx\s*extension/.test(hay) ||
    /\bpbx\s*extension\b/.test(hay)
  );
}

function getItemDisplayName(item: CatalogItem, itemType: string): string {
  if (itemType === "domain") return item.tld ?? item.name ?? "";
  return item.name ?? "";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminCreateOrder() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: resellers = [] } = useAdminGetResellers();
  const { data: clients = [] } = useAdminGetClients();
  const createOrder = useAdminCreateOrder();

  // ── Catalog data ──
  const { data: catalogServices = [], isLoading: loadingServices } = useQuery<CatalogItem[]>({
    queryKey: ["catalog-services"],
    queryFn: () => fetchCatalog("/api/catalog/services"),
    staleTime: 5 * 60_000,
  });
  const { data: catalogProducts = [], isLoading: loadingProducts } = useQuery<CatalogItem[]>({
    queryKey: ["catalog-products"],
    queryFn: () => fetchCatalog("/api/catalog/products"),
    staleTime: 5 * 60_000,
  });
  const { data: catalogHosting = [], isLoading: loadingHosting } = useQuery<CatalogItem[]>({
    queryKey: ["catalog-hosting"],
    queryFn: () => fetchCatalog("/api/catalog/hosting-packages"),
    staleTime: 5 * 60_000,
  });
  const { data: catalogDomains = [], isLoading: loadingDomains } = useQuery<CatalogItem[]>({
    queryKey: ["catalog-domains"],
    queryFn: () => fetchCatalog("/api/catalog/domain-tlds"),
    staleTime: 5 * 60_000,
  });
  const { data: catalogConnectivity = [], isLoading: loadingConnectivity } = useQuery<CatalogItem[]>({
    queryKey: ["catalog-connectivity"],
    queryFn: () => fetchCatalog("/api/catalog/connectivity"),
    staleTime: 5 * 60_000,
  });
  const { data: catalogVoip = [], isLoading: loadingVoip } = useQuery<CatalogItem[]>({
    queryKey: ["catalog-voip"],
    queryFn: () => fetchCatalog("/api/catalog/voip-solutions"),
    staleTime: 5 * 60_000,
  });
  const { data: catalogMinuteBundles = [], isLoading: loadingMinuteBundles } = useQuery<CatalogItem[]>({
    queryKey: ["catalog-minute-bundles"],
    queryFn: () => fetchCatalog("/api/catalog/minute-bundles"),
    staleTime: 5 * 60_000,
  });

  // ── Area codes ──
  const { data: areaCodes = [] } = useAdminGetAreaCodes();

  // ── VoIP panel state ──
  const [voipPanelIdx, setVoipPanelIdx] = useState<number | null>(null);
  const [voipPanels, setVoipPanels] = useState<Record<number, VoipPanelState>>({});

  // ── Domain panel state ──
  const [domainPanelIdx, setDomainPanelIdx] = useState<number | null>(null);
  const [domainPanels, setDomainPanels] = useState<Record<number, DomainPanelState>>({});

  // ── Hosting panel state ──
  const [hostingPanelIdx, setHostingPanelIdx] = useState<number | null>(null);

  // Panel state helpers
  function getPanelState(idx: number): VoipPanelState {
    return voipPanels[idx] ?? {};
  }

  function updatePanelState(idx: number, patch: Partial<VoipPanelState>) {
    setVoipPanels((prev) => ({ ...prev, [idx]: { ...(prev[idx] ?? {}), ...patch } }));
  }

  function getDomainPanel(idx: number): DomainPanelState {
    return domainPanels[idx] ?? defaultDomainPanel();
  }

  function updateDomainPanel(idx: number, patch: Partial<DomainPanelState>) {
    setDomainPanels((prev) => ({ ...prev, [idx]: { ...(prev[idx] ?? defaultDomainPanel()), ...patch } }));
  }

  function openVoipPanel(idx: number) {
    setVoipPanelIdx(idx);
    setDomainPanelIdx(null);
    setHostingPanelIdx(null);
  }

  function openDomainPanel(idx: number) {
    setDomainPanelIdx(idx);
    setVoipPanelIdx(null);
    setHostingPanelIdx(null);
  }

  function openHostingPanel(idx: number) {
    setHostingPanelIdx(idx);
    setVoipPanelIdx(null);
    setDomainPanelIdx(null);
  }

  function closeVoipPanel() { setVoipPanelIdx(null); }
  function closeDomainPanel() { setDomainPanelIdx(null); }
  function closeHostingPanel() { setHostingPanelIdx(null); }

  // Active DID query (VoIP panel)
  const activePanelState = voipPanelIdx !== null ? getPanelState(voipPanelIdx) : {};

  const { data: availableDids = [], isLoading: didsLoading } = useQuery<Did[]>({
    queryKey: ["admin-available-dids", activePanelState.areaCodeId],
    queryFn: () =>
      fetchCatalog<Did>(
        `/api/admin/dids?areaCodeId=${activePanelState.areaCodeId}&status=available`
      ),
    enabled: !!activePanelState.areaCodeId,
    staleTime: 30_000,
  });

  // ── Form state ──
  const [resellerId, setResellerId] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [items, setItems] = useState<ItemForm[]>([{ ...DEFAULT_ITEM }]);

  const resellerOptions = resellers as Reseller[];
  const clientOptions = clients as Client[];

  const selectedResellerId = useMemo(() => {
    const n = Number(resellerId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [resellerId]);

  const filteredClients = useMemo(() => {
    if (!selectedResellerId) return [];
    return clientOptions.filter((c) => c.resellerId === selectedResellerId);
  }, [clientOptions, selectedResellerId]);

  // ── Totals ──
  const totals = useMemo(() => {
    let excl = 0;
    let incl = 0;
    for (const row of items) {
      const qty = Number(row.quantity) || 0;
      const unitExcl = Number(row.unitPriceExclVat) || 0;
      const unitIncl = row.unitPriceInclVat.trim()
        ? Number(row.unitPriceInclVat) || 0
        : unitExcl * (1 + VAT_RATE);
      excl += unitExcl * qty;
      incl += unitIncl * qty;
    }
    return { excl, vat: incl - excl, incl };
  }, [items]);

  // ── Catalog helpers ──
  const getCatalogState = (
    itemType: string
  ): { items: CatalogItem[]; loading: boolean; hasCatalog: boolean } => {
    switch (itemType) {
      case "service":       return { items: catalogServices,      loading: loadingServices,      hasCatalog: true };
      case "product":       return { items: catalogProducts,      loading: loadingProducts,      hasCatalog: true };
      case "hosting":       return { items: catalogHosting,       loading: loadingHosting,       hasCatalog: true };
      case "domain":        return { items: catalogDomains,       loading: loadingDomains,       hasCatalog: true };
      case "connectivity":  return { items: catalogConnectivity,  loading: loadingConnectivity,  hasCatalog: true };
      case "voip":          return { items: catalogVoip,          loading: loadingVoip,          hasCatalog: true };
      case "minute-bundle": return { items: catalogMinuteBundles, loading: loadingMinuteBundles, hasCatalog: true };
      default:              return { items: [],                   loading: false,                hasCatalog: false };
    }
  };

  // ── Item mutation helpers ──
  const addItem = () => setItems((prev) => [...prev, { ...DEFAULT_ITEM }]);

  function reindexPanels(removedIdx: number, insertCount = 0) {
    // Reindex voipPanels
    setVoipPanels((prev) => {
      const next: Record<number, VoipPanelState> = {};
      for (const k of Object.keys(prev)) {
        const ki = Number(k);
        if (ki === removedIdx) continue;
        const newKey = ki > removedIdx ? ki - 1 + insertCount : ki;
        next[newKey] = prev[ki];
      }
      return next;
    });
    // Reindex domainPanels
    setDomainPanels((prev) => {
      const next: Record<number, DomainPanelState> = {};
      for (const k of Object.keys(prev)) {
        const ki = Number(k);
        if (ki === removedIdx) continue;
        const newKey = ki > removedIdx ? ki - 1 + insertCount : ki;
        next[newKey] = prev[ki];
      }
      return next;
    });
    // Close open panels if they pointed to removed row, or shift them
    setVoipPanelIdx((prev) => {
      if (prev === null) return null;
      if (prev === removedIdx) return null;
      return prev > removedIdx ? prev - 1 + insertCount : prev;
    });
    setDomainPanelIdx((prev) => {
      if (prev === null) return null;
      if (prev === removedIdx) return null;
      return prev > removedIdx ? prev - 1 + insertCount : prev;
    });
    setHostingPanelIdx((prev) => {
      if (prev === null) return null;
      if (prev === removedIdx) return null;
      return prev > removedIdx ? prev - 1 + insertCount : prev;
    });
  }

  const removeItem = (idx: number) => {
    reindexPanels(idx);
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, patch: Partial<ItemForm>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  // When name is chosen from catalog, auto-fill prices and open correct panel
  const handleNameSelect = (
    idx: number,
    name: string,
    itemType: string,
    catalogItems: CatalogItem[]
  ) => {
    if (!name) {
      updateItem(idx, { name: "", referenceId: "", unitPriceExclVat: "", unitPriceInclVat: "" });
      if (voipPanelIdx === idx) closeVoipPanel();
      if (domainPanelIdx === idx) closeDomainPanel();
      if (hostingPanelIdx === idx) closeHostingPanel();
      return;
    }
    const match = catalogItems.find((i) => getItemDisplayName(i, itemType) === name);
    if (match) {
      const { exclVat, inclVat } = vatPricesFromItem(match);
      updateItem(idx, {
        name,
        referenceId: match.id ? String(match.id) : "",
        unitPriceExclVat: exclVat.toFixed(2),
        unitPriceInclVat: inclVat.toFixed(2),
      });
    } else {
      updateItem(idx, { name });
    }

    if (itemType === "voip") {
      openVoipPanel(idx);
    } else if (itemType === "domain") {
      // Reset domain panel state (except label) when TLD changes
      setDomainPanels((prev) => ({
        ...prev,
        [idx]: {
          ...(prev[idx] ?? defaultDomainPanel()),
          checked: false,
          available: undefined,
          nameservers: undefined,
          offerHosting: false,
          confirmedDomain: undefined,
        },
      }));
      openDomainPanel(idx);
    } else if (itemType === "hosting") {
      openHostingPanel(idx);
    }
  };

  // ── Domain check & confirm ──
  async function checkDomainAvailability(rowIdx: number) {
    const panel = getDomainPanel(rowIdx);
    const item = items[rowIdx];
    if (!item) return;

    const label = panel.label.trim().toLowerCase();
    if (!label) {
      toast({ title: "Enter a domain label first", variant: "destructive" });
      return;
    }

    // Extract TLD from item.name (which holds the TLD string from the dropdown)
    const tld = item.name.replace(/^\./, "");
    if (!tld) return;

    const domain = `${label}.${tld}`;
    updateDomainPanel(rowIdx, { checking: true, checked: false, available: undefined });

    try {
      const res = await fetch(`/api/admin/check-domain?domain=${encodeURIComponent(domain)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        updateDomainPanel(rowIdx, { checking: false });
        toast({
          title: "Domain check failed",
          description: "Unable to verify domain availability. Please try again.",
          variant: "destructive",
        });
        return;
      }
      const data = await res.json();
      updateDomainPanel(rowIdx, {
        checking: false,
        checked: true,
        available: data.available,
        nameservers: data.nameservers ?? [],
      });
    } catch {
      updateDomainPanel(rowIdx, { checking: false });
      toast({
        title: "Domain check failed",
        description: "Network error — please try again.",
        variant: "destructive",
      });
    }
  }

  function confirmDomain(rowIdx: number) {
    const panel = getDomainPanel(rowIdx);
    const item = items[rowIdx];
    if (!item) return;

    const tld = item.name.replace(/^\./, "");
    const label = panel.label.trim().toLowerCase();
    const fullDomain = `${label}.${tld}`;

    updateItem(rowIdx, { name: fullDomain });
    updateDomainPanel(rowIdx, { confirmedDomain: fullDomain, offerHosting: true });
    closeDomainPanel();
    toast({ title: "Domain confirmed", description: `${fullDomain} added to order.` });
  }

  function editDomain(rowIdx: number) {
    const panel = getDomainPanel(rowIdx);
    // Restore TLD display name
    const confirmedDomain = panel.confirmedDomain ?? "";
    const parts = confirmedDomain.split(".");
    const tld = parts.length > 1 ? `.${parts.slice(1).join(".")}` : "";

    // Find catalog item matching tld
    const tldItem = catalogDomains.find(
      (d) => (d.tld ?? "") === tld || (d.tld ?? "").replace(/^\./, "") === tld.replace(/^\./, "")
    );
    if (tldItem) {
      const displayName = getItemDisplayName(tldItem, "domain");
      updateItem(rowIdx, { name: displayName });
    }
    updateDomainPanel(rowIdx, {
      confirmedDomain: undefined,
      offerHosting: false,
      checked: false,
      available: undefined,
    });
    openDomainPanel(rowIdx);
  }

  // ── Add domain row before hosting row (for Pair with Domain) ──
  function addDomainRowBefore(hostingIdx: number) {
    const newDomainRow: ItemForm = { ...DEFAULT_ITEM, itemType: "domain" };

    setItems((prev) => {
      const next = [...prev];
      next.splice(hostingIdx, 0, newDomainRow);
      return next;
    });
    // Shift all panel states at or after hostingIdx up by 1
    setVoipPanels((prev) => {
      const next: Record<number, VoipPanelState> = {};
      for (const k of Object.keys(prev)) {
        const ki = Number(k);
        next[ki >= hostingIdx ? ki + 1 : ki] = prev[ki];
      }
      return next;
    });
    setDomainPanels((prev) => {
      const next: Record<number, DomainPanelState> = {};
      for (const k of Object.keys(prev)) {
        const ki = Number(k);
        next[ki >= hostingIdx ? ki + 1 : ki] = prev[ki];
      }
      return next;
    });
    // Open domain panel for the new row at hostingIdx
    setDomainPanelIdx(hostingIdx);
    setVoipPanelIdx(null);
    setHostingPanelIdx(null);
  }

  // ── Confirm DID selection for a voip row ──
  function confirmDID(rowIdx: number) {
    const panel = getPanelState(rowIdx);
    const did = availableDids.find((d) => d.id === panel.selectedDidId);
    if (!did) return;

    const voipItem = items[rowIdx]
      ? catalogVoip.find((i) => i.name === items[rowIdx].name)
      : undefined;
    const bundleRequired = voipItem ? requiresMinuteBundle(voipItem) : false;

    if (bundleRequired && !panel.bundleId) {
      toast({
        title: "Minute bundle required",
        description: "Please select a minute bundle to continue.",
        variant: "destructive",
      });
      return;
    }

    const newRows: ItemForm[] = [
      {
        itemType: "did",
        referenceId: String(did.id),
        name: `DID: ${did.number}`,
        sku: "",
        quantity: "1",
        unitPriceExclVat: "0.00",
        unitPriceInclVat: "0.00",
      },
    ];

    if (panel.bundleId) {
      const bundle = catalogMinuteBundles.find((b) => b.id === panel.bundleId);
      if (bundle) {
        const { exclVat, inclVat } = vatPricesFromItem(bundle);
        const bundleName = bundle.minutes
          ? `${bundle.name} (${bundle.minutes} min)`
          : bundle.name ?? "";
        newRows.push({
          itemType: "minute-bundle",
          referenceId: String(bundle.id ?? ""),
          name: bundleName,
          sku: "",
          quantity: "1",
          unitPriceExclVat: exclVat.toFixed(2),
          unitPriceInclVat: inclVat.toFixed(2),
        });
      }
    }

    const insertCount = newRows.length;
    setItems((prev) => {
      const next = [...prev];
      next.splice(rowIdx + 1, 0, ...newRows);
      return next;
    });
    setVoipPanels((prev) => {
      const next: Record<number, VoipPanelState> = {};
      for (const k of Object.keys(prev)) {
        const ki = Number(k);
        if (ki === rowIdx) continue;
        next[ki > rowIdx ? ki + insertCount : ki] = prev[ki];
      }
      return next;
    });
    setDomainPanels((prev) => {
      const next: Record<number, DomainPanelState> = {};
      for (const k of Object.keys(prev)) {
        const ki = Number(k);
        next[ki > rowIdx ? ki + insertCount : ki] = prev[ki];
      }
      return next;
    });
    closeVoipPanel();
    toast({ title: "DID added", description: `${did.number} added to order.` });
  }

  // ── Submit ──
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rid = Number(resellerId);
    if (!Number.isFinite(rid) || rid <= 0) {
      toast({ title: "Select a reseller", variant: "destructive" });
      return;
    }

    if (items.length === 0) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }

    const payloadItems = items.map((row) => {
      const qty = Number(row.quantity) || 1;
      const unitExcl = Number(row.unitPriceExclVat) || 0;
      const unitIncl = row.unitPriceInclVat.trim()
        ? Number(row.unitPriceInclVat) || 0
        : unitExcl * (1 + VAT_RATE);
      return {
        itemType: row.itemType || "product",
        referenceId: numberOrNull(row.referenceId),
        name: row.name,
        sku: row.sku.trim() ? row.sku.trim() : null,
        quantity: qty,
        unitPriceExclVat: unitExcl,
        unitPriceInclVat: unitIncl,
      };
    });

    if (payloadItems.some((i) => !i.name.trim())) {
      toast({ title: "Each item must have a name", variant: "destructive" });
      return;
    }

    try {
      const created = await createOrder.mutateAsync({
        data: {
          resellerId: rid,
          clientId: clientId.trim() ? Number(clientId) : null,
          notes: notes.trim() ? notes : null,
          adminNotes: adminNotes.trim() ? adminNotes : null,
          items: payloadItems,
        },
      });
      toast({ title: `Order #${created.id} created` });
      setLocation("/admin/orders");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message.replace(/^HTTP \d+[^:]*:\s*/, "")
          : "Unknown error";
      toast({ title: "Create order failed", description: msg, variant: "destructive" });
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AppLayout role="admin" title="Create Order">
      <form onSubmit={submit} className="max-w-5xl space-y-6">

        {/* ── Reseller / Client / Notes ── */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Reseller</label>
              <select
                value={resellerId}
                onChange={(e) => { setResellerId(e.target.value); setClientId(""); }}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                required
              >
                <option value="">Select reseller…</option>
                {resellerOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.companyName} ({r.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Client (optional)</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                disabled={!selectedResellerId}
              >
                <option value="">No client</option>
                {filteredClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName} ({c.email})
                  </option>
                ))}
              </select>
              {!selectedResellerId && (
                <p className="mt-1 text-xs text-muted-foreground">Select a reseller to choose from their clients.</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Reseller Notes (visible to reseller)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Admin Notes (internal)</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none"
              />
            </div>
          </div>
        </div>

        {/* ── Order Items ── */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-bold">Order Items</div>
              <div className="text-xs text-muted-foreground">
                Prices auto-fill from catalog. VoIP, domain and hosting items open inline panels.
              </div>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          <div className="rounded-xl border border-border/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/10">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold">Type</th>
                  <th className="px-3 py-3 text-left font-semibold">Name</th>
                  <th className="px-3 py-3 text-right font-semibold">Qty</th>
                  <th className="px-3 py-3 text-right font-semibold">Unit excl VAT</th>
                  <th className="px-3 py-3 text-right font-semibold">Unit incl VAT</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {items.map((row, idx) => {
                  const {
                    items: catalogItems,
                    loading: catalogLoading,
                    hasCatalog,
                  } = getCatalogState(row.itemType);
                  const catalogNames = catalogItems
                    .map((i) => getItemDisplayName(i, row.itemType))
                    .filter(Boolean);

                  const isVoipOpen = voipPanelIdx === idx;
                  const isDomainOpen = domainPanelIdx === idx;
                  const isHostingOpen = hostingPanelIdx === idx;
                  const isAnyPanelOpen = isVoipOpen || isDomainOpen || isHostingOpen;

                  const panel = getPanelState(idx);
                  const domainPanel = getDomainPanel(idx);

                  const voipItem =
                    row.itemType === "voip" && row.name
                      ? catalogVoip.find((i) => i.name === row.name)
                      : undefined;
                  const bundleRequired = voipItem ? requiresMinuteBundle(voipItem) : false;

                  // Hosting item from catalog (for specs panel)
                  const hostingItem =
                    row.itemType === "hosting" && row.name
                      ? catalogHosting.find((i) => i.name === row.name)
                      : undefined;

                  // Check if order already has a domain row (for hosting pair hint)
                  const hasDomainRow = items.some((it, i) => i !== idx && it.itemType === "domain");

                  // Domain TLD for display in panel
                  const domainTld = row.itemType === "domain" && !domainPanel.confirmedDomain
                    ? row.name.replace(/^\./, "")
                    : "";
                  const domainPreview = domainPanel.label.trim() && domainTld
                    ? `${domainPanel.label.trim().toLowerCase()}.${domainTld}`
                    : null;

                  return (
                    <Fragment key={idx}>
                      {/* ── Main item row ── */}
                      <tr className={isAnyPanelOpen ? "bg-primary/5" : ""}>
                        <td className="px-3 py-2">
                          <select
                            value={row.itemType}
                            onChange={(e) => {
                              closeVoipPanel();
                              closeDomainPanel();
                              closeHostingPanel();
                              updateItem(idx, {
                                itemType: e.target.value,
                                name: "",
                                referenceId: "",
                                unitPriceExclVat: "",
                                unitPriceInclVat: "",
                              });
                            }}
                            className="w-full px-2 py-2 rounded-lg border border-border bg-background text-sm"
                          >
                            <option value="service">service</option>
                            <option value="product">product</option>
                            <option value="hosting">hosting</option>
                            <option value="domain">domain</option>
                            <option value="connectivity">connectivity</option>
                            <option value="voip">voip</option>
                            <option value="did">did</option>
                            <option value="minute-bundle">minute-bundle</option>
                            <option value="other">other</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          {/* Domain row: show confirmed domain as badge, or TLD dropdown */}
                          {row.itemType === "domain" && domainPanel.confirmedDomain ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 text-xs font-mono font-semibold border border-green-500/20">
                                {domainPanel.confirmedDomain}
                              </span>
                              <button
                                type="button"
                                onClick={() => editDomain(idx)}
                                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                              >
                                Edit
                              </button>
                            </div>
                          ) : hasCatalog ? (
                            <select
                              value={row.name}
                              onChange={(e) =>
                                handleNameSelect(idx, e.target.value, row.itemType, catalogItems)
                              }
                              className="w-full px-2 py-2 rounded-lg border border-border bg-background text-sm disabled:opacity-50"
                              required
                              disabled={catalogLoading}
                            >
                              <option value="">
                                {catalogLoading ? "Loading…" : "Select item…"}
                              </option>
                              {catalogNames.map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={row.name}
                              onChange={(e) => updateItem(idx, { name: e.target.value })}
                              className="w-full px-2 py-2 rounded-lg border border-border bg-background text-sm"
                              placeholder="Item name"
                              required
                            />
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            value={row.quantity}
                            onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                            className="w-20 px-2 py-2 rounded-lg border border-border bg-background text-sm text-right"
                            inputMode="numeric"
                            placeholder="1"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            value={row.unitPriceExclVat}
                            onChange={(e) => updateItem(idx, { unitPriceExclVat: e.target.value })}
                            className="w-28 px-2 py-2 rounded-lg border border-border bg-background text-sm text-right"
                            inputMode="decimal"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            value={row.unitPriceInclVat}
                            onChange={(e) => updateItem(idx, { unitPriceInclVat: e.target.value })}
                            className="w-28 px-2 py-2 rounded-lg border border-border bg-background text-sm text-right"
                            inputMode="decimal"
                            placeholder="auto"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            disabled={items.length === 1}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-40"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>

                      {/* ── Domain offer-hosting prompt (shown after domain confirm) ── */}
                      {row.itemType === "domain" && domainPanel.offerHosting && !isDomainOpen && (
                        <tr>
                          <td colSpan={6} className="px-3 pb-2">
                            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs">
                              <Server className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="text-muted-foreground">
                                Would you like to add a hosting package with this domain?
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  updateDomainPanel(idx, { offerHosting: false });
                                  const newHostingRow: ItemForm = { ...DEFAULT_ITEM, itemType: "hosting" };
                                  setItems((prev) => {
                                    const next = [...prev];
                                    next.splice(idx + 1, 0, newHostingRow);
                                    return next;
                                  });
                                  setDomainPanels((prev) => {
                                    const next: Record<number, DomainPanelState> = {};
                                    for (const k of Object.keys(prev)) {
                                      const ki = Number(k);
                                      next[ki > idx ? ki + 1 : ki] = prev[ki];
                                    }
                                    return next;
                                  });
                                  setVoipPanels((prev) => {
                                    const next: Record<number, VoipPanelState> = {};
                                    for (const k of Object.keys(prev)) {
                                      const ki = Number(k);
                                      next[ki > idx ? ki + 1 : ki] = prev[ki];
                                    }
                                    return next;
                                  });
                                  setHostingPanelIdx(idx + 1);
                                  setVoipPanelIdx(null);
                                  setDomainPanelIdx(null);
                                }}
                                className="ml-auto shrink-0 flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-semibold transition-colors"
                              >
                                <Plus className="w-3 h-3" /> Add Hosting
                              </button>
                              <button
                                type="button"
                                onClick={() => updateDomainPanel(idx, { offerHosting: false })}
                                className="text-muted-foreground hover:text-foreground"
                                title="Dismiss"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* ── VoIP DID Panel — 1-column stacked layout ── */}
                      {row.itemType === "voip" && row.name && isVoipOpen && (
                        <tr>
                          <td colSpan={6} className="px-0 py-0">
                            <div className="mx-3 mb-3 p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4">
                              <p className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5" /> DID Assignment for {row.name}
                              </p>

                              {/* Step 1: Area Code */}
                              <div className="space-y-2">
                                <p className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5" /> 1. Area Code
                                </p>
                                <div className="relative">
                                  <select
                                    value={panel.areaCodeId ?? ""}
                                    onChange={(e) =>
                                      updatePanelState(idx, {
                                        areaCodeId: e.target.value
                                          ? Number(e.target.value)
                                          : undefined,
                                        selectedDidId: null,
                                      })
                                    }
                                    className="w-full appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-border/60 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                                  >
                                    <option value="">— choose area code —</option>
                                    {(areaCodes as AreaCode[]).map((ac) => (
                                      <option key={ac.id} value={ac.id}>
                                        {ac.code} — {ac.region}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                                </div>
                              </div>

                              {/* Step 2: Number */}
                              <div className="space-y-2">
                                <p className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1.5">
                                  <Phone className="w-3.5 h-3.5" /> 2. Number
                                  <span className="font-normal text-muted-foreground normal-case">— Free</span>
                                </p>
                                {!panel.areaCodeId ? (
                                  <p className="text-xs text-muted-foreground py-1">Select an area code first.</p>
                                ) : didsLoading ? (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading numbers…
                                  </div>
                                ) : availableDids.length === 0 ? (
                                  <p className="text-xs text-muted-foreground py-1">No numbers available for this area code.</p>
                                ) : (
                                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1 max-h-36 overflow-y-auto">
                                    {availableDids.map((did) => (
                                      <button
                                        key={did.id}
                                        type="button"
                                        onClick={() =>
                                          updatePanelState(idx, {
                                            selectedDidId:
                                              did.id === panel.selectedDidId ? null : did.id,
                                          })
                                        }
                                        className={`px-2 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all ${
                                          panel.selectedDidId === did.id
                                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                            : "bg-background border-border/60 text-foreground hover:border-primary/40 hover:bg-primary/5"
                                        }`}
                                      >
                                        {did.number}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Step 3: Minute Bundle */}
                              <div className="space-y-2">
                                <p className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1.5">
                                  <Package className="w-3.5 h-3.5" /> 3. Minute Bundle
                                  <span
                                    className={`font-normal normal-case ml-1 ${
                                      bundleRequired ? "text-red-600" : "text-muted-foreground"
                                    }`}
                                  >
                                    — {bundleRequired ? "required" : "optional"}
                                  </span>
                                </p>
                                {!panel.selectedDidId ? (
                                  <p className="text-xs text-muted-foreground">Select a number first.</p>
                                ) : loadingMinuteBundles ? (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading bundles…
                                  </div>
                                ) : catalogMinuteBundles.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">No bundles available.</p>
                                ) : (
                                  <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {catalogMinuteBundles.map((b) => {
                                      const { exclVat: bExcl, inclVat: bIncl } = vatPricesFromItem(b);
                                      const sel = panel.bundleId === b.id;
                                      return (
                                        <button
                                          key={b.id}
                                          type="button"
                                          onClick={() =>
                                            updatePanelState(idx, {
                                              bundleId: sel ? null : (b.id ?? null),
                                            })
                                          }
                                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs font-medium transition-all ${
                                            sel
                                              ? "border-primary bg-primary/10 text-primary"
                                              : "border-border/60 bg-background hover:border-primary/30 hover:bg-primary/5"
                                          }`}
                                        >
                                          <span>
                                            {b.minutes ? `${b.name} (${b.minutes} min)` : b.name}
                                          </span>
                                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                            <span className="text-muted-foreground">{formatZar(bExcl)}</span>
                                            <span className="font-bold">{formatZar(bIncl)}</span>
                                            {sel && <CheckCircle2 className="w-3 h-3 text-primary" />}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                                {panel.selectedDidId && bundleRequired && !panel.bundleId && (
                                  <p className="text-xs text-red-600 mt-1">Select a bundle to continue.</p>
                                )}
                              </div>

                              {/* Bundle cost preview + Confirm button */}
                              {panel.selectedDidId && (
                                <div className="flex items-center justify-between pt-2 border-t border-primary/20 gap-4">
                                  {panel.bundleId ? (() => {
                                    const b = catalogMinuteBundles.find((x) => x.id === panel.bundleId);
                                    if (!b) return <span />;
                                    const { exclVat, inclVat } = vatPricesFromItem(b);
                                    return (
                                      <div className="text-xs text-muted-foreground">
                                        Bundle cost:{" "}
                                        <span className="text-foreground font-semibold">
                                          {formatZar(exclVat)} excl
                                        </span>{" "}
                                        /{" "}
                                        <span className="text-primary font-bold">
                                          {formatZar(inclVat)} incl
                                        </span>
                                      </div>
                                    );
                                  })() : <span />}
                                  <button
                                    type="button"
                                    onClick={() => confirmDID(idx)}
                                    disabled={bundleRequired && !panel.bundleId}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm shrink-0 ${
                                      bundleRequired && !panel.bundleId
                                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                                    }`}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirm &amp; Add DID
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* ── Domain Check Panel ── */}
                      {row.itemType === "domain" && row.name && !domainPanel.confirmedDomain && isDomainOpen && (
                        <tr>
                          <td colSpan={6} className="px-0 py-0">
                            <div className="mx-3 mb-3 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3">
                              <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5" /> Domain Availability Check — {row.name}
                              </p>

                              {/* Label input */}
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground">
                                  Domain Label
                                </label>
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1 flex items-center">
                                    <input
                                      value={domainPanel.label}
                                      onChange={(e) =>
                                        updateDomainPanel(idx, {
                                          label: e.target.value,
                                          checked: false,
                                          available: undefined,
                                        })
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          checkDomainAvailability(idx);
                                        }
                                      }}
                                      placeholder="e.g. mycompany"
                                      className="w-full px-3 py-2 rounded-l-lg border border-r-0 border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    />
                                    <span className="px-3 py-2 bg-muted text-muted-foreground text-sm border border-l-0 border-border rounded-r-lg font-mono whitespace-nowrap">
                                      .{row.name.replace(/^\./, "")}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => checkDomainAvailability(idx)}
                                    disabled={domainPanel.checking || !domainPanel.label.trim()}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition-colors shrink-0"
                                  >
                                    {domainPanel.checking ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Globe className="w-3.5 h-3.5" />
                                    )}
                                    {domainPanel.checking ? "Checking…" : "Check"}
                                  </button>
                                </div>
                                {domainPreview && (
                                  <p className="text-xs text-muted-foreground font-mono">
                                    Full domain: <span className="text-foreground font-semibold">{domainPreview}</span>
                                  </p>
                                )}
                              </div>

                              {/* Availability result */}
                              {domainPanel.checked && (
                                <div
                                  className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs ${
                                    domainPanel.available
                                      ? "border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-400"
                                      : "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400"
                                  }`}
                                >
                                  {domainPanel.available ? (
                                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                  ) : (
                                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                  )}
                                  <div>
                                    <p className="font-bold">
                                      {domainPreview} is{" "}
                                      {domainPanel.available ? "available" : "not available"}
                                    </p>
                                    {!domainPanel.available && domainPanel.nameservers && domainPanel.nameservers.length > 0 && (
                                      <p className="text-muted-foreground mt-0.5">
                                        Currently registered (NS: {domainPanel.nameservers.slice(0, 2).join(", ")})
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Confirm button */}
                              {domainPanel.checked && domainPanel.available && (
                                <div className="flex justify-end pt-1 border-t border-blue-500/20">
                                  <button
                                    type="button"
                                    onClick={() => confirmDomain(idx)}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-colors shadow-sm"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Domain
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* ── Hosting Specs Panel ── */}
                      {row.itemType === "hosting" && row.name && isHostingOpen && hostingItem && (
                        <tr>
                          <td colSpan={6} className="px-0 py-0">
                            <div className="mx-3 mb-3 p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-3">
                              <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide flex items-center gap-1.5">
                                <HardDrive className="w-3.5 h-3.5" /> Hosting Package — {row.name}
                              </p>

                              {/* Package price summary */}
                              {(() => {
                                const { exclVat, inclVat } = vatPricesFromItem(hostingItem);
                                return (
                                  <div className="flex items-center gap-4 text-xs">
                                    <span className="text-muted-foreground">
                                      Price excl VAT:{" "}
                                      <span className="text-foreground font-semibold">{formatZar(exclVat)}</span>
                                    </span>
                                    <span className="text-muted-foreground">
                                      Price incl VAT:{" "}
                                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">{formatZar(inclVat)}</span>
                                    </span>
                                  </div>
                                );
                              })()}

                              {/* Package specs */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {[
                                  { label: "Disk Space", value: hostingItem.diskSpaceGb != null ? `${hostingItem.diskSpaceGb} GB` : "—" },
                                  { label: "Bandwidth", value: hostingItem.bandwidthGb != null ? `${hostingItem.bandwidthGb} GB` : "—" },
                                  { label: "Email Accounts", value: hostingItem.emailAccounts != null ? String(hostingItem.emailAccounts) : "—" },
                                  { label: "Databases", value: hostingItem.databases != null ? String(hostingItem.databases) : "—" },
                                  { label: "Subdomains", value: hostingItem.subdomains != null ? String(hostingItem.subdomains) : "—" },
                                  { label: "SSL", value: hostingItem.sslIncluded ? "Included" : "Not included" },
                                ].map(({ label, value }) => (
                                  <div key={label} className="px-3 py-2 rounded-lg bg-background border border-border/50 text-xs">
                                    <p className="text-muted-foreground">{label}</p>
                                    <p className="font-semibold text-foreground mt-0.5">{value}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Domain pairing section */}
                              <div className="pt-2 border-t border-indigo-500/20">
                                {hasDomainRow ? (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                    A domain row is already in this order.
                                  </p>
                                ) : (
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs text-muted-foreground">
                                      Pair this hosting with a domain registration.
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        closeHostingPanel();
                                        addDomainRowBefore(idx);
                                      }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shrink-0"
                                    >
                                      <Globe className="w-3 h-3" /> Pair with Domain
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="flex justify-end border-t border-indigo-500/20 pt-2">
                                <button
                                  type="button"
                                  onClick={closeHostingPanel}
                                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted/50 transition-colors"
                                >
                                  Close
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot className="bg-muted/10 border-t border-border/50">
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                    Total excl VAT
                  </td>
                  <td colSpan={2} className="px-3 py-2 text-right text-sm font-semibold text-foreground">
                    {formatZar(totals.excl)}
                  </td>
                  <td className="px-3 py-2" />
                </tr>
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                    VAT (15%)
                  </td>
                  <td colSpan={2} className="px-3 py-2 text-right text-sm text-muted-foreground">
                    {formatZar(totals.vat)}
                  </td>
                  <td className="px-3 py-2" />
                </tr>
                <tr className="border-t border-border/30">
                  <td colSpan={3} className="px-3 py-2.5 text-right text-sm font-bold text-foreground">
                    Total incl VAT
                  </td>
                  <td colSpan={2} className="px-3 py-2.5 text-right text-base font-bold text-primary">
                    {formatZar(totals.incl)}
                  </td>
                  <td className="px-3 py-2.5" />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setLocation("/admin/orders")}
              className="px-4 py-2 rounded-xl border border-border bg-background text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createOrder.isPending}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
            >
              Create Order
            </button>
          </div>
        </div>
      </form>
    </AppLayout>
  );
}
