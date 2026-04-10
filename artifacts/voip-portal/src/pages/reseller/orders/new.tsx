import { useState, useEffect, useMemo, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useGetCatalogServices,
  useGetCatalogProducts,
  useGetCatalogHostingPackages,
  useGetCatalogDomainTlds,
  useGetCatalogConnectivity,
  useGetCatalogCybersecurity,
  useGetCatalogDataSecurity,
  useGetCatalogWebDevelopment,
  useGetCatalogVoipSolutions,
  useGetCatalogMinuteBundles,
  useResellerGetAreaCodes,
  useResellerGetAvailableDids,
  useResellerCheckDomain,
  useCreateOrder,
  useGetMyOrder,
  getGetMyOrdersQueryKey,
  Service,
  Did,
} from "@workspace/api-client-react";
import { useResellerUpdateOrder } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Server, Package, Phone, CheckCircle2, MapPin, Globe,
  HardDrive, Database, Shield, Wifi, Search, X, Loader2, Tag, Calendar,
  User, Network, Lock, Code, Plus, Minus, Trash2, ChevronDown, Receipt,
  Calculator, Sparkles, ArrowLeft,
} from "lucide-react";
import { formatZar } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation, useRoute, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemType =
  | "service" | "product" | "did" | "hosting" | "domain"
  | "connectivity" | "cybersecurity" | "data-security"
  | "web-development" | "voip-solutions" | "minute-bundle";

interface CartItem {
  itemType: ItemType;
  referenceId: number;
  name: string;
  unitPriceExclVat: number;
  unitPriceInclVat: number;
  quantity: number;
}

type Tab =
  | "services" | "connectivity" | "products" | "hosting" | "domains"
  | "cybersecurity" | "data-security" | "web-development" | "voip-solutions";

// ─── Constants ────────────────────────────────────────────────────────────────

const VAT_RATE = 0.15;
const FRESH = { query: { staleTime: 30_000 } } as const;

/** Item types billed monthly */
const MONTHLY_TYPES = new Set<ItemType>([
  "service", "hosting", "did", "connectivity",
  "cybersecurity", "data-security", "voip-solutions", "minute-bundle",
]);

/** Item types billed once-off */
const ONCE_OFF_TYPES = new Set<ItemType>([
  "product", "domain", "web-development",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function vatFromExcl(exclVat: number) {
  return { exclVat, vat: exclVat * VAT_RATE, inclVat: exclVat * (1 + VAT_RATE) };
}

function vatPrices(item: any): { exclVat: number; inclVat: number } {
  const excl = item.resellerPriceExclVat ?? item.price ?? 0;
  const incl = item.resellerPriceInclVat ?? item.priceInclVat ?? excl * (1 + VAT_RATE);
  return { exclVat: Number(excl), inclVat: Number(incl) };
}

function isBundleService(s: any): boolean {
  const hay = `${s.name} ${s.categoryName ?? ""}`.toLowerCase();
  // Names like "Bundle 100 Minutes (Local)" have "bundle" first, qualifier after.
  // Also catch "Extension Bundle 200 Minutes" where qualifier comes first.
  // Require "bundle/pack" AND at least one minute/call qualifier anywhere in the string.
  const hasBundle = /\b(bundle|pack)\b/.test(hay);
  const hasQualifier = /(minute[s]?|\bmin\b|local|international|extension|talktime|call)/.test(hay);
  return hasBundle && hasQualifier;
}

function isMinuteBundleVoipItem(item: any): boolean {
  return /minute[s]?\s*bundle[s]?|minute[s]?\s*pack[s]?/i.test(item.categoryName ?? "");
}

function isVoipService(s: any): boolean {
  const hay = `${s.name} ${s.categoryName ?? ""}`.toLowerCase();
  return /voip|pbx|sip|extension|hosted\s*phone/.test(hay);
}

function requiresMinuteBundle(item: any): boolean {
  const hay = `${item.name ?? ""} ${item.categoryName ?? ""}`.toLowerCase();
  return /\bsingle\s*line\b/.test(hay) || /hosted\s*pbx\s*extension/.test(hay) || /\bpbx\s*extension\b/.test(hay);
}

function stableIntFromString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 2147483647;
}

/** Pro-rata: proportion of current month remaining (inclusive of today). */
function proRataInfo(date: Date = new Date()) {
  const y = date.getFullYear(), m = date.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const dayOfMonth = date.getDate();
  const daysRemaining = daysInMonth - dayOfMonth + 1;
  return { factor: daysRemaining / daysInMonth, daysRemaining, daysInMonth, dayOfMonth };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CartRow({
  item,
  onQty,
  onRemove,
}: {
  item: CartItem;
  onQty: (id: number, type: ItemType, delta: number) => void;
  onRemove: (id: number, type: ItemType) => void;
}) {
  const isMonthly = MONTHLY_TYPES.has(item.itemType);
  const isFree = item.unitPriceInclVat === 0;
  return (
    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/10 border border-border/40 group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${isMonthly ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/40 text-muted-foreground border-border/60"}`}>
            {isMonthly ? "Monthly" : "Once-off"}
          </span>
          <span className="text-xs text-muted-foreground">
            {isFree ? "Free" : `${formatZar(item.unitPriceInclVat)} incl VAT`}
          </span>
        </div>
      </div>

      {item.itemType !== "did" && (
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onQty(item.referenceId, item.itemType, -1)} className="w-6 h-6 rounded bg-muted/40 hover:bg-muted/70 flex items-center justify-center transition-colors">
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-5 text-center text-xs font-semibold">{item.quantity}</span>
          <button onClick={() => onQty(item.referenceId, item.itemType, 1)} className="w-6 h-6 rounded bg-muted/40 hover:bg-muted/70 flex items-center justify-center transition-colors">
            <Plus className="w-3 h-3" />
          </button>
        </div>
      )}

      <button onClick={() => onRemove(item.referenceId, item.itemType)} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewOrder() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const params = new URLSearchParams(searchString);

  // ── Catalog data ──
  const { data: services = [] } = useGetCatalogServices(FRESH);
  const { data: products = [] } = useGetCatalogProducts(FRESH);
  const { data: hostingPackages = [] } = useGetCatalogHostingPackages(FRESH);
  const { data: domainTlds = [] } = useGetCatalogDomainTlds(FRESH);
  const { data: connectivity = [] } = useGetCatalogConnectivity(FRESH);
  const { data: cybersecurity = [] } = useGetCatalogCybersecurity(FRESH);
  const { data: dataSecurity = [] } = useGetCatalogDataSecurity(FRESH);
  const { data: webDevelopment = [] } = useGetCatalogWebDevelopment(FRESH);
  const { data: rawVoipSolutions = [] } = useGetCatalogVoipSolutions(FRESH);
  const voipSolutions = (rawVoipSolutions as any[]).filter(i => !isMinuteBundleVoipItem(i));
  const { data: minuteBundles = [], isLoading: minuteBundlesLoading } = useGetCatalogMinuteBundles(FRESH);

  const { data: areaCodes = [] } = useResellerGetAreaCodes(FRESH);
  const { data: clients = [] } = useQuery({
    queryKey: ["reseller-clients"],
    queryFn: async () => {
      const r = await fetch("/api/reseller/clients", { credentials: "include" });
      return r.ok ? (r.json() as Promise<Array<{ id: number; companyName: string; contactName: string }>>) : [];
    },
  });

  const createOrder = useCreateOrder();
  const updateOrder = useResellerUpdateOrder();
  const queryClient = useQueryClient();

  // ── Edit mode detection ──
  const [, editParams] = useRoute("/reseller/orders/:id/edit");
  const editId = editParams?.id ? parseInt(editParams.id, 10) : null;
  const isEditMode = !!editId;
  const { data: editOrderData } = useGetMyOrder(editId ?? 0, { query: { enabled: isEditMode } });
  const [editOrderLoaded, setEditOrderLoaded] = useState(false);

  // ── UI state ──
  const prefillTab = params.get("tab") as Tab | null;
  const [tab, setTab] = useState<Tab>(
    prefillTab && ["services","connectivity","products","hosting","domains","cybersecurity","data-security","web-development","voip-solutions"].includes(prefillTab)
      ? prefillTab : "voip-solutions"
  );
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | undefined>();
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // ── Cart ──
  const [cart, setCart] = useState<CartItem[]>([]);

  // ── DID panel state ──
  const [didPanelKey, setDidPanelKey] = useState<string | null>(null);
  const [voipAreaCodeId, setVoipAreaCodeId] = useState<number | undefined>();
  const [voipSelectedDidId, setVoipSelectedDidId] = useState<number | null>(null);
  const [selectedMinuteBundleId, setSelectedMinuteBundleId] = useState<number | null>(null);

  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [selectedDomainTld, setSelectedDomainTld] = useState<any | null>(null);
  const [domainLabel, setDomainLabel] = useState("");
  const [domainChecked, setDomainChecked] = useState(false);
  const [domainAction, setDomainAction] = useState<"register" | "transfer" | null>(null);
  const [selectedDomainHostingId, setSelectedDomainHostingId] = useState<number | null>(null);
  const [domainStep, setDomainStep] = useState<"check" | "hosting">("check");

  const [hostingDomainModalOpen, setHostingDomainModalOpen] = useState(false);
  const [selectedHostingPackage, setSelectedHostingPackage] = useState<any | null>(null);
  const [hostingDomainMode, setHostingDomainMode] = useState<"register" | "transfer">("register");
  const [hostingDomainLabel, setHostingDomainLabel] = useState("");
  const [hostingSelectedTldId, setHostingSelectedTldId] = useState<number | null>(null);
  const [hostingDomainChecked, setHostingDomainChecked] = useState(false);
  const [hostingTransferDomain, setHostingTransferDomain] = useState("");

  const { data: availableDids = [], isLoading: didsLoading } = useResellerGetAvailableDids(
    { areaCodeId: voipAreaCodeId! },
    { query: { enabled: !!voipAreaCodeId } }
  );

  // Reset search/filter on tab change
  useEffect(() => { setSearch(""); setCategoryFilter(""); }, [tab]);

  // ── Auto-prefill from domain-check page ──
  const prefillApplied = useRef(false);
  useEffect(() => {
    if (prefillApplied.current) return;
    const pfDomain = params.get("domain");
    const pfAction = params.get("domainAction") as "register" | "transfer" | null;
    const pfTldId = params.get("tldId") ? Number(params.get("tldId")) : null;
    const pfHostingId = params.get("hostingId") ? Number(params.get("hostingId")) : null;
    if (!pfDomain || !pfAction || !pfTldId || !pfHostingId) return;
    if ((domainTlds as any[]).length === 0 || (hostingPackages as any[]).length === 0) return;

    const tld = (domainTlds as any[]).find((t: any) => t.id === pfTldId);
    const hosting = (hostingPackages as any[]).find((p: any) => p.id === pfHostingId);
    if (!tld || !hosting) return;

    prefillApplied.current = true;

    const tldPrice = vatPrices(tld);
    const domainRef = stableIntFromString(pfDomain);
    const domainName = pfAction === "transfer"
      ? `Domain Transfer: ${pfDomain}`
      : `Domain Registration: ${pfDomain}`;

    const hp = vatPrices(hosting);

    setCart([
      { referenceId: domainRef, itemType: "domain", name: domainName, unitPriceExclVat: tldPrice.exclVat, unitPriceInclVat: tldPrice.inclVat, quantity: 1 },
      { referenceId: hosting.id, itemType: "hosting", name: hosting.name, unitPriceExclVat: hp.exclVat, unitPriceInclVat: hp.inclVat, quantity: 1 },
    ]);

    setTab("services");
    toast({
      title: "Domain & hosting added",
      description: `${pfDomain} and ${hosting.name} are ready in your order.`,
    });
  }, [domainTlds, hostingPackages]);

  // ── Pre-populate from existing order in edit mode ──
  useEffect(() => {
    if (!isEditMode || !editOrderData || editOrderLoaded) return;
    const det = editOrderData as any;
    if (det.clientId) setSelectedClientId(det.clientId);
    if (det.notes) setNotes(det.notes);
    const cartItems: CartItem[] = (det.items ?? []).map((item: any) => ({
      itemType: normalizeItemType(item.itemType),
      referenceId: item.referenceId ?? 0,
      name: item.name,
      unitPriceExclVat: Number(item.unitPriceExclVat ?? 0),
      unitPriceInclVat: Number(item.unitPriceInclVat ?? 0),
      quantity: item.qty ?? item.quantity ?? 1,
    }));
    if (cartItems.length > 0) setCart(cartItems);
    setEditOrderLoaded(true);
  }, [editOrderData, isEditMode, editOrderLoaded]);

  // ── Auto-add single item from catalog "Order" button ──
  const addParamApplied = useRef(false);
  useEffect(() => {
    if (addParamApplied.current) return;
    const addParam = params.get("add"); // e.g. "voip-solutions:5"
    if (!addParam) return;

    const colonIdx = addParam.lastIndexOf(":");
    if (colonIdx === -1) return;
    const itemType = addParam.slice(0, colonIdx) as ItemType;
    const itemId = Number(addParam.slice(colonIdx + 1));
    if (!itemId) return;

    // Resolve the correct catalog array for the given type
    const catalogMap: Record<string, any[]> = {
      service: services as any[],
      product: products as any[],
      hosting: hostingPackages as any[],
      domain: domainTlds as any[],
      connectivity: connectivity as any[],
      cybersecurity: cybersecurity as any[],
      "data-security": dataSecurity as any[],
      "web-development": webDevelopment as any[],
      "voip-solutions": voipSolutions as any[],
    };
    const catalog = catalogMap[itemType];
    if (!catalog || catalog.length === 0) return; // wait until data loaded

    const item = catalog.find((i: any) => i.id === itemId);
    if (!item) return;

    addParamApplied.current = true;

    const { exclVat, inclVat } = vatPrices(item);
    addToCart({
      referenceId: itemId,
      itemType,
      name: item.name ?? item.tld ?? String(itemId),
      unitPriceExclVat: exclVat,
      unitPriceInclVat: inclVat,
      quantity: 1,
    });
    toast({
      title: "Added to order",
      description: `${item.name ?? item.tld} has been added to your order.`,
    });
  }, [services, products, hostingPackages, domainTlds, connectivity, cybersecurity, dataSecurity, webDevelopment, voipSolutions]);

  // ── Derived catalog lists ──
  const displayServices = (services as Service[]).filter(s => !isBundleService(s));

  function applyFilters<T extends { name: string; categoryName?: string | null; description?: string | null }>(items: T[]): T[] {
    return items.filter(i => {
      const q = search.toLowerCase();
      const matchesSearch = !q || i.name.toLowerCase().includes(q) || (i.categoryName ?? "").toLowerCase().includes(q);
      const matchesCat = !categoryFilter || i.categoryName === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }

  const tabItems: any[] = (() => {
    switch (tab) {
      case "services":      return displayServices as any[];
      case "connectivity":  return connectivity as any[];
      case "products":      return products as any[];
      case "hosting":       return hostingPackages as any[];
      case "cybersecurity": return cybersecurity as any[];
      case "data-security": return dataSecurity as any[];
      case "web-development": return webDevelopment as any[];
      case "voip-solutions":  return voipSolutions;
      default: return [];
    }
  })();

  const categories = useMemo(
    () => Array.from(new Set(tabItems.map(i => i.categoryName).filter(Boolean))).sort() as string[],
    [tab, tabItems.length]
  );

  const filtered = tab === "domains" ? (domainTlds as any[]) : applyFilters(tabItems);

  // ── Cart helpers ──
  function normalizeItemType(type: any): ItemType {
    if (type === "products") return "product";
    if (type === "services") return "service";
    return type as ItemType;
  }

  function cartQty(refId: number, type: ItemType) {
    const t = normalizeItemType(type);
    return cart.find(i => i.referenceId === refId && normalizeItemType((i as any).itemType) === t)?.quantity ?? 0;
  }

  function addToCart(item: CartItem) {
    setCart(prev => {
      const nextItem = { ...item, itemType: normalizeItemType((item as any).itemType) } as CartItem;
      const existing = prev.find(i => i.referenceId === nextItem.referenceId && normalizeItemType((i as any).itemType) === nextItem.itemType);
      if (existing) return prev.map(i => i === existing ? { ...i, quantity: i.quantity + nextItem.quantity } : i);
      return [...prev, nextItem];
    });
  }

  function updateQty(refId: number, type: ItemType, delta: number) {
    const t = normalizeItemType(type);
    setCart(prev =>
      prev.flatMap(i => {
        if (i.referenceId !== refId || normalizeItemType((i as any).itemType) !== t) return [i];
        const q = i.quantity + delta;
        return q <= 0 ? [] : [{ ...i, quantity: q }];
      })
    );
  }

  function removeFromCart(refId: number, type: ItemType) {
    const t = normalizeItemType(type);
    setCart(prev => prev.filter(i => !(i.referenceId === refId && normalizeItemType((i as any).itemType) === t)));
  }

  // ── DID panel helpers ──
  function closeDIDPanel() {
    setDidPanelKey(null);
    setVoipAreaCodeId(undefined);
    setVoipSelectedDidId(null);
    setSelectedMinuteBundleId(null);
  }

  function openDIDPanel(key: string) {
    if (didPanelKey === key) { closeDIDPanel(); return; }
    setDidPanelKey(key);
    setVoipAreaCodeId(undefined);
    setVoipSelectedDidId(null);
    setSelectedMinuteBundleId(null);
  }

  function confirmDID(bundleRequired: boolean) {
    const did = (availableDids as any[]).find(d => d.id === voipSelectedDidId);
    if (!did) return;
    if (bundleRequired && !selectedMinuteBundleId) {
      toast({ title: "Minute bundle required", description: "Please select a minute bundle to continue.", variant: "destructive" });
      return;
    }
    addToCart({ referenceId: did.id, itemType: "did", name: `DID: ${did.number}`, unitPriceExclVat: 0, unitPriceInclVat: 0, quantity: 1 });
    if (selectedMinuteBundleId) {
      const bundle = (minuteBundles as any[]).find((b: any) => b.id === selectedMinuteBundleId);
      if (bundle) {
        const { exclVat, inclVat } = vatPrices(bundle);
        const bundleName = bundle.minutes ? `${bundle.name} (${bundle.minutes} min)` : bundle.name;
        addToCart({ referenceId: bundle.id, itemType: "minute-bundle", name: bundleName, unitPriceExclVat: exclVat, unitPriceInclVat: inclVat, quantity: 1 });
      }
    }
    closeDIDPanel();
    toast({ title: "DID added", description: `${did.number} added to your order.` });
  }

  // ── Financial calculations ──
  const monthlyCart = cart.filter(i => MONTHLY_TYPES.has(normalizeItemType((i as any).itemType)));
  const onceOffCart = cart.filter(i => ONCE_OFF_TYPES.has(normalizeItemType((i as any).itemType)));

  const monthlyExcl = monthlyCart.reduce((s, i) => s + i.unitPriceExclVat * i.quantity, 0);
  const onceOffExcl = onceOffCart.reduce((s, i) => s + i.unitPriceExclVat * i.quantity, 0);

  const monthly = vatFromExcl(monthlyExcl);
  const onceOff = vatFromExcl(onceOffExcl);

  const pr = proRataInfo();
  const proRata = vatFromExcl(monthlyExcl * pr.factor);

  const dueTodayExcl = proRata.exclVat + onceOff.exclVat;
  const dueToday = vatFromExcl(dueTodayExcl);

  const cartIsEmpty = cart.length === 0;

  const domainFull = useMemo(() => {
    if (!selectedDomainTld) return "";
    const tldRaw = String(selectedDomainTld.tld ?? selectedDomainTld.name ?? "").trim();
    const tld = tldRaw.replace(/^\./, "");
    const label = domainLabel.trim().toLowerCase().replace(/\s+/g, "");
    if (!label || !tld) return "";
    return `${label}.${tld}`;
  }, [selectedDomainTld, domainLabel]);

  const hostingSelectedTld = useMemo(() => {
    if (!hostingSelectedTldId) return null;
    return (domainTlds as any[]).find((t: any) => t.id === hostingSelectedTldId) ?? null;
  }, [domainTlds, hostingSelectedTldId]);

  const hostingDomainFull = useMemo(() => {
    if (!hostingSelectedTld) return "";
    const tldRaw = String(hostingSelectedTld.tld ?? hostingSelectedTld.name ?? "").trim();
    const tld = tldRaw.replace(/^\./, "");
    const label = hostingDomainLabel.trim().toLowerCase().replace(/\s+/g, "");
    if (!label || !tld) return "";
    return `${label}.${tld}`;
  }, [hostingSelectedTld, hostingDomainLabel]);

  const domainCheckQuery = useResellerCheckDomain(
    { domain: domainFull || "example.com" },
    { query: { enabled: false } },
  );

  const hostingDomainCheckQuery = useResellerCheckDomain(
    { domain: hostingDomainFull || "example.com" },
    { query: { enabled: false } },
  );

  // ── Submit ──
  async function handleSubmit() {
    if (cartIsEmpty) return;
    if (!selectedClientId) {
      toast({ title: "Client required", description: "Please select a client before placing an order.", variant: "destructive" });
      return;
    }
    const hasDomain = cart.some((i) => i.itemType === "domain");
    const hasHosting = cart.some((i) => i.itemType === "hosting");
    if (hasDomain && !hasHosting) {
      toast({ title: "Hosting required", description: "Please add a hosting package to continue.", variant: "destructive" });
      setTab("hosting");
      return;
    }
    const orderItems = cart.map(i => ({
      itemType: i.itemType,
      referenceId: i.referenceId,
      name: i.name,
      unitPriceExclVat: i.unitPriceExclVat,
      unitPriceInclVat: i.unitPriceInclVat,
      quantity: i.quantity,
    }));
    try {
      if (isEditMode && editId) {
        await updateOrder.mutateAsync({
          id: editId,
          data: { clientId: selectedClientId, notes: notes || undefined, items: orderItems },
        });
        queryClient.invalidateQueries({ queryKey: [`/api/orders/${editId}`] });
        queryClient.invalidateQueries({ queryKey: getGetMyOrdersQueryKey() });
        setSubmitted(true);
        toast({ title: "Order updated!", description: "Your changes have been saved." });
        setTimeout(() => setLocation(`/reseller/orders/${editId}`), 1500);
      } else {
        await createOrder.mutateAsync({
          data: { clientId: selectedClientId, notes: notes || undefined, items: orderItems } as any,
        });
        setSubmitted(true);
        toast({ title: "Order placed!", description: "Your order has been submitted successfully." });
        setTimeout(() => setLocation("/reseller"), 2000);
      }
    } catch {
      toast({ title: "Error", description: isEditMode ? "Failed to update order. Please try again." : "Failed to place order. Please try again.", variant: "destructive" });
    }
  }

  // ── Tab config ──
  const tabs: { id: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { id: "voip-solutions", label: "VoIP Solutions", icon: Phone,    count: voipSolutions.length },
    { id: "connectivity",   label: "Connectivity",   icon: Network,  count: (connectivity as any[]).length },
    { id: "products",       label: "Hardware",       icon: HardDrive,count: (products as any[]).length },
    { id: "hosting",        label: "Hosting",        icon: Globe,    count: (hostingPackages as any[]).length },
    { id: "domains",        label: "Domains",        icon: Tag,      count: (domainTlds as any[]).length },
    { id: "cybersecurity",  label: "Cyber",          icon: Shield,   count: (cybersecurity as any[]).length },
    { id: "data-security",  label: "Data Sec",       icon: Lock,     count: (dataSecurity as any[]).length },
    { id: "web-development",label: "Web Dev",        icon: Code,     count: (webDevelopment as any[]).length },
    { id: "services",       label: "Services",       icon: Server,   count: displayServices.length },
  ];

  if (submitted) {
    return (
      <AppLayout role="reseller" title={isEditMode ? `Edit Order #${editId}` : "New Order"}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <CheckCircle2 className="w-16 h-16 text-emerald-500" />
          <h2 className="text-xl font-bold text-foreground">{isEditMode ? "Order Updated!" : "Order Placed!"}</h2>
          <p className="text-muted-foreground">{isEditMode ? "Redirecting to order…" : "Redirecting to dashboard…"}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="reseller" title={isEditMode ? `Edit Order #${editId}` : "New Order"}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          {isEditMode ? (
            <button onClick={() => setLocation(`/reseller/orders/${editId}`)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Order #{editId}
            </button>
          ) : (
            <button onClick={() => setLocation("/reseller")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </button>
          )}
          <span className="text-muted-foreground/40">/</span>
          <span className="text-sm font-semibold text-foreground">{isEditMode ? `Edit Order #${editId}` : "New Order"}</span>
        </div>
        <button
          type="button"
          onClick={() => setLocation("/reseller/catalog?tab=voip-solutions")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-muted/20 transition-colors"
        >
          <Phone className="w-4 h-4" /> VoIP Catalog
        </button>
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Left: Catalog ── */}
        <div className="flex-1 min-w-0">

          {/* Tabs */}
          <div className="flex gap-1 flex-wrap mb-4 bg-muted/20 p-1.5 rounded-xl border border-border/40">
            {tabs.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                  {t.count > 0 && (
                    <span className={`text-[10px] px-1 rounded-full ${active ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>{t.count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search + category filter */}
          {tab !== "domains" && (
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border/60 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              {categories.length > 1 && (
                <div className="relative">
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-border/60 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">All categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                </div>
              )}
            </div>
          )}

          {/* Items list */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Package className="w-10 h-10 opacity-20 mb-3" />
                <p className="text-sm">{search || categoryFilter ? "No items match your search" : "No items available"}</p>
              </div>
            ) : filtered.map((item: any) => {
              const itemTypeForTab =
                tab === "domains" ? "domain" :
                tab === "products" ? "product" :
                tab === "services" ? "service" :
                (tab as ItemType);
              const inCart = cartQty(item.id, itemTypeForTab);
              const { exclVat, inclVat } = vatPrices(item);
              const isVoip = tab === "voip-solutions" || (tab === "services" && isVoipService(item));
              const bundleRequired = isVoip && requiresMinuteBundle(item);
              const panelKey = `${tab}:${item.id}`;
              const panelOpen = didPanelKey === panelKey;

              return (
                <div key={item.id}>
                  <motion.div
                    layout
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border bg-card transition-all ${panelOpen ? "border-primary/40 shadow-md shadow-primary/5" : "border-border/50 hover:border-border"}`}
                  >
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {tab === "services" ? <Server className="w-4 h-4 text-primary" /> :
                       tab === "connectivity" ? <Network className="w-4 h-4 text-primary" /> :
                       tab === "products" ? <HardDrive className="w-4 h-4 text-primary" /> :
                       tab === "hosting" ? <Globe className="w-4 h-4 text-primary" /> :
                       tab === "domains" ? <Tag className="w-4 h-4 text-primary" /> :
                       tab === "cybersecurity" ? <Shield className="w-4 h-4 text-primary" /> :
                       tab === "data-security" ? <Lock className="w-4 h-4 text-primary" /> :
                       tab === "web-development" ? <Code className="w-4 h-4 text-primary" /> :
                       <Phone className="w-4 h-4 text-primary" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">
                        {tab === "domains" ? item.tld : item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {tab === "domains" ? (
                          <>
                            {item.registrationYears != null && (
                              <span className="text-xs text-muted-foreground">{item.registrationYears} year</span>
                            )}
                            {item.description && (
                              <>
                                <span className="text-muted-foreground/40 text-xs">·</span>
                                <span className="text-xs text-muted-foreground">{item.description}</span>
                              </>
                            )}
                          </>
                        ) : (
                          item.categoryName && <span className="text-xs text-muted-foreground">{item.categoryName}</span>
                        )}
                        {item.categoryName && exclVat > 0 && <span className="text-muted-foreground/40 text-xs">·</span>}
                        {exclVat > 0 && <span className="text-xs text-muted-foreground">{formatZar(exclVat)} excl VAT</span>}
                      </div>
                    </div>

                    {/* Price + actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-sm text-foreground">
                          {inclVat === 0 ? "Free" : `${formatZar(inclVat)}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {MONTHLY_TYPES.has(itemTypeForTab) ? "incl VAT/mo" : "incl VAT"}
                        </p>
                      </div>

                      {tab === "domains" ? (
                        <button
                          onClick={() => {
                            setSelectedDomainTld(item);
                            setDomainLabel("");
                            setDomainChecked(false);
                            setDomainAction(null);
                            setDomainStep("check");
                            const existingHosting = cart.find((i) => i.itemType === "hosting");
                            setSelectedDomainHostingId(existingHosting ? existingHosting.referenceId : null);
                            setDomainModalOpen(true);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Domain
                        </button>
                      ) : tab === "hosting" && inCart === 0 ? (
                        <button
                          onClick={() => {
                            const defaultTld =
                              (domainTlds as any[]).find((t: any) => String(t.tld).toLowerCase() === ".co.za") ??
                              (domainTlds as any[])[0] ??
                              null;
                            setSelectedHostingPackage(item);
                            setHostingDomainMode("register");
                            setHostingDomainLabel("");
                            setHostingSelectedTldId(defaultTld?.id ?? null);
                            setHostingDomainChecked(false);
                            setHostingTransferDomain("");
                            setHostingDomainModalOpen(true);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Hosting
                        </button>
                      ) : inCart > 0 && tab !== "voip-solutions" && tab !== "services" ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQty(item.id, itemTypeForTab, -1)} className="w-7 h-7 rounded-lg bg-muted/40 hover:bg-muted/70 flex items-center justify-center transition-colors">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center text-xs font-bold">{inCart}</span>
                          <button onClick={() => updateQty(item.id, itemTypeForTab, 1)} className="w-7 h-7 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center transition-colors">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : isVoip ? (
                        <div className="flex items-center gap-2">
                          {inCart > 0 && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => updateQty(item.id, itemTypeForTab, -1)} className="w-7 h-7 rounded-lg bg-muted/40 hover:bg-muted/70 flex items-center justify-center transition-colors">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-5 text-center text-xs font-bold">{inCart}</span>
                              <button onClick={() => updateQty(item.id, itemTypeForTab, 1)} className="w-7 h-7 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center transition-colors">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => {
                              if (!inCart) {
                                const itemType = tab as ItemType;
                                addToCart({ referenceId: item.id, itemType, name: item.name, unitPriceExclVat: exclVat, unitPriceInclVat: inclVat, quantity: 1 });
                              }
                              openDIDPanel(panelKey);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${panelOpen ? "bg-primary text-primary-foreground" : inCart ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                          >
                            {panelOpen ? <X className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                            {panelOpen ? "Close" : inCart ? "Add DID" : "Select DID"}
                          </button>
                        </div>
                      ) : inCart > 0 ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQty(item.id, itemTypeForTab, -1)} className="w-7 h-7 rounded-lg bg-muted/40 hover:bg-muted/70 flex items-center justify-center transition-colors">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center text-xs font-bold">{inCart}</span>
                          <button onClick={() => updateQty(item.id, itemTypeForTab, 1)} className="w-7 h-7 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary flex items-center justify-center transition-colors">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart({ referenceId: item.id, itemType: itemTypeForTab, name: item.name, unitPriceExclVat: exclVat, unitPriceInclVat: inclVat, quantity: 1 })}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                      )}
                    </div>
                  </motion.div>

                  {/* ── DID Panel ── */}
                  <AnimatePresence>
                    {panelOpen && (
                      <motion.div
                        key="did-panel"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mx-2 mb-2 p-4 rounded-b-xl border border-t-0 border-primary/30 bg-primary/5 space-y-4">
                          <div className="space-y-4">
                            {/* Step 1: Area code */}
                            <div>
                            <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" /> 1. Select Area Code
                            </p>
                            <div className="relative">
                              <select
                                value={voipAreaCodeId ?? ""}
                                onChange={e => {
                                  setVoipAreaCodeId(e.target.value ? Number(e.target.value) : undefined);
                                  setVoipSelectedDidId(null);
                                }}
                                className="w-full appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-border/60 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                              >
                                <option value="">— choose area code —</option>
                                {(areaCodes as any[]).map((ac: any) => (
                                  <option key={ac.id} value={ac.id}>{ac.code} — {ac.region}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                            </div>
                            </div>

                            {/* Step 2: Phone number */}
                            <div>
                              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5" /> 2. Select Number
                                <span className="font-normal text-muted-foreground normal-case ml-1">— Free (R0/mo)</span>
                              </p>
                              {!voipAreaCodeId ? (
                                <p className="text-xs text-muted-foreground py-2">Select an area code first.</p>
                              ) : didsLoading ? (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading available numbers…
                                  </div>
                                ) : (availableDids as any[]).length === 0 ? (
                                  <p className="text-xs text-muted-foreground py-2">No numbers available for this area code.</p>
                                ) : (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto">
                                    {(availableDids as Did[]).map((did: any) => (
                                      <button
                                        key={did.id}
                                        onClick={() => setVoipSelectedDidId(did.id === voipSelectedDidId ? null : did.id)}
                                        className={`px-2.5 py-2 rounded-lg border text-xs font-mono font-semibold transition-all ${voipSelectedDidId === did.id ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-background border-border/60 text-foreground hover:border-primary/40 hover:bg-primary/5"}`}
                                      >
                                        {did.number}
                                      </button>
                                    ))}
                                  </div>
                                )}
                            </div>

                            {/* Step 3: Minute bundle */}
                            <div>
                              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5" /> 3. Minute Bundle
                                <span className={`font-normal normal-case ml-1 ${bundleRequired ? "text-red-600" : "text-muted-foreground"}`}>
                                  — {bundleRequired ? "required" : "optional"}
                                </span>
                              </p>
                              {!voipSelectedDidId ? (
                                <p className="text-xs text-muted-foreground">Select a number first.</p>
                              ) : minuteBundlesLoading ? (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading bundles…
                                  </div>
                                ) : (minuteBundles as any[]).length === 0 ? (
                                  <p className="text-xs text-muted-foreground">No minute bundles available.</p>
                                ) : (
                                  <div className="space-y-1">
                                    {(minuteBundles as any[]).map((b: any) => {
                                      const { exclVat: bExcl, inclVat: bIncl } = vatPrices(b);
                                      const sel = selectedMinuteBundleId === b.id;
                                      return (
                                        <button
                                          key={b.id}
                                          onClick={() => setSelectedMinuteBundleId(sel ? null : b.id)}
                                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${sel ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-background hover:border-primary/30 hover:bg-primary/5"}`}
                                        >
                                          <span>{b.minutes ? `${b.name} (${b.minutes} min)` : b.name}</span>
                                          <div className="flex items-center gap-2 text-xs">
                                            <span className="text-muted-foreground">{formatZar(bExcl)} excl VAT</span>
                                            <span className="font-bold">{formatZar(bIncl)}/mo</span>
                                            {sel && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              {voipSelectedDidId && bundleRequired && !selectedMinuteBundleId && (
                                <p className="text-xs text-red-600 mt-2">Select a minute bundle to continue.</p>
                              )}
                            </div>
                          </div>

                          {/* Confirm button */}
                          {voipSelectedDidId && (
                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => confirmDID(bundleRequired)}
                                disabled={bundleRequired && !selectedMinuteBundleId}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm ${bundleRequired && !selectedMinuteBundleId ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Confirm &amp; Add to Order
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: Order Summary ── */}
        <div className="w-full lg:w-[22rem] shrink-0 flex flex-col gap-4 sticky top-6">

          {/* Client */}
          <div className={`bg-card border rounded-2xl p-4 shadow-sm ${!selectedClientId ? "border-red-500/40" : "border-border"}`}>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Client <span className="text-red-500">*</span>
            </p>
            {(clients as any[]).length === 0 ? (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                No clients yet.{" "}
                <Link href="/reseller/clients/new" className="font-bold underline hover:no-underline">
                  Create a client first
                </Link>{" "}
                before placing an order.
              </div>
            ) : (
              <>
                <div className="relative">
                  <select
                    value={selectedClientId ?? ""}
                    onChange={e => setSelectedClientId(e.target.value ? Number(e.target.value) : undefined)}
                    className={`w-full appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 ${!selectedClientId ? "border-red-500/60" : "border-border/60"}`}
                  >
                    <option value="" disabled>— select a client —</option>
                    {(clients as any[]).map(c => (
                      <option key={c.id} value={c.id}>{c.companyName}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                </div>
                {!selectedClientId && (
                  <p className="text-xs text-red-500 mt-1.5">A client must be selected to place an order.</p>
                )}
              </>
            )}
          </div>

          {/* Cart items */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/10">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" /> Order Items
              </h3>
              <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            </div>

            <div className="p-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <ShoppingCart className="w-8 h-8 opacity-20 mb-2" />
                  <p className="text-xs">No items yet</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {/* Monthly */}
                  {monthlyCart.length > 0 && (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground px-1 pt-1">Monthly</p>
                      {monthlyCart.map(item => (
                        <CartRow key={`${item.itemType}-${item.referenceId}`} item={item} onQty={updateQty} onRemove={removeFromCart} />
                      ))}
                    </>
                  )}
                  {/* Once-off */}
                  {onceOffCart.length > 0 && (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground px-1 pt-2">Once-off</p>
                      {onceOffCart.map(item => (
                        <CartRow key={`${item.itemType}-${item.referenceId}`} item={item} onQty={updateQty} onRemove={removeFromCart} />
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Financial breakdown */}
          {!cartIsEmpty && (
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border/50 bg-muted/10 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Price Breakdown</h3>
              </div>

              <div className="p-4 space-y-4">

                {/* Monthly Thereafter */}
                {monthlyCart.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-bold text-primary uppercase tracking-wide">Monthly Thereafter</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal excl VAT</span>
                        <span>{formatZar(monthly.exclVat)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>VAT (15%)</span>
                        <span>{formatZar(monthly.vat)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-foreground border-t border-border/40 pt-1 mt-1">
                        <span>Total incl VAT</span>
                        <span>{formatZar(monthly.inclVat)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Once-off */}
                {onceOffCart.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Once-off Items</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal excl VAT</span>
                        <span>{formatZar(onceOff.exclVat)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>VAT (15%)</span>
                        <span>{formatZar(onceOff.vat)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-foreground border-t border-border/40 pt-1 mt-1">
                        <span>Total incl VAT</span>
                        <span>{formatZar(onceOff.inclVat)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Due Today */}
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-primary uppercase tracking-wide">Due Today</span>
                  </div>

                  {monthlyCart.length > 0 && (
                    <div className="text-[10px] text-muted-foreground mb-2 px-0.5">
                      Pro-rata: {pr.daysRemaining} of {pr.daysInMonth} days remaining this month
                    </div>
                  )}

                  <div className="space-y-1 text-xs">
                    {monthlyCart.length > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Pro-rated monthly excl VAT</span>
                        <span>{formatZar(proRata.exclVat)}</span>
                      </div>
                    )}
                    {onceOffCart.length > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Once-off excl VAT</span>
                        <span>{formatZar(onceOff.exclVat)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-muted-foreground border-t border-border/30 pt-1">
                      <span>Subtotal excl VAT</span>
                      <span>{formatZar(dueToday.exclVat)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>VAT (15%)</span>
                      <span>{formatZar(dueToday.vat)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-foreground text-sm border-t-2 border-primary/30 pt-2 mt-1">
                      <span>Total Due Today</span>
                      <span className="text-primary">{formatZar(dueToday.inclVat)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Notes (optional)</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any notes or special instructions…"
              className="w-full text-sm rounded-lg border border-border/60 bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={cartIsEmpty || !selectedClientId || createOrder.isPending}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            {createOrder.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Placing Order…</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Place Order</>
            )}
          </button>

          {cartIsEmpty && (
            <p className="text-center text-xs text-muted-foreground">Add items from the catalog to place an order.</p>
          )}
          {!cartIsEmpty && !selectedClientId && (
            <p className="text-center text-xs text-red-500">Select a client above to place the order.</p>
          )}
        </div>
      </div>

      <Modal
        isOpen={domainModalOpen}
        onClose={() => setDomainModalOpen(false)}
        title="Domain Availability"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="bg-muted/10 rounded-xl p-4 border border-border/50">
            <label className="text-xs font-semibold text-muted-foreground">Domain</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                value={domainLabel}
                onChange={(e) => {
                  setDomainLabel(e.target.value);
                  setDomainChecked(false);
                  setDomainAction(null);
                  setDomainStep("check");
                }}
                className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm"
                placeholder="example"
              />
              <div className="px-3 py-2 rounded-xl border border-border bg-muted/20 text-sm font-semibold whitespace-nowrap">
                {selectedDomainTld?.tld ?? ""}
              </div>
              {domainStep === "check" && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!domainFull) {
                      toast({ title: "Enter a domain", variant: "destructive" });
                      return;
                    }
                    const r = await domainCheckQuery.refetch();
                    setDomainChecked(true);
                    if (r.data?.available) setDomainAction("register");
                    else setDomainAction(null);
                  }}
                  disabled={!domainFull || domainCheckQuery.isFetching}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60 whitespace-nowrap"
                >
                  {domainCheckQuery.isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Check
                </button>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {domainFull ? domainFull : "Enter a domain name to check availability."}
            </div>
          </div>

          {domainChecked && domainStep === "check" && (
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold">{domainFull}</div>
                  <div className="text-xs text-muted-foreground mt-1">{domainCheckQuery.data?.status ?? ""}</div>
                </div>
                <div className="text-right">
                  {domainCheckQuery.data?.available ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-600 border border-red-500/20">
                      Unavailable
                    </span>
                  )}
                </div>
              </div>

              {!domainCheckQuery.data?.available && (
                <div className="mt-3 text-xs text-muted-foreground space-y-1">
                  {domainCheckQuery.data?.registrar && <div>Registrar: {domainCheckQuery.data.registrar}</div>}
                  {domainCheckQuery.data?.expiresAt && <div>Expires: {domainCheckQuery.data.expiresAt}</div>}
                  {domainCheckQuery.data?.registrationStatus && <div>Status: {domainCheckQuery.data.registrationStatus}</div>}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-4">
                {domainCheckQuery.data?.available ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDomainAction("register");
                      setDomainStep("hosting");
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setDomainAction("transfer");
                      setDomainStep("hosting");
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
                  >
                    Transfer Domain
                  </button>
                )}
              </div>
            </div>
          )}

          {domainStep === "hosting" && (
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold">Select Hosting Package</div>
                  <div className="text-xs text-red-600 mt-1">Hosting is required for domain orders.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setDomainStep("check")}
                  className="px-3 py-2 rounded-xl border border-border bg-background text-sm font-semibold"
                >
                  Back
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {(hostingPackages as any[]).map((p: any) => {
                  const { inclVat: pIncl } = vatPrices(p);
                  const sel = selectedDomainHostingId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedDomainHostingId(sel ? null : p.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${sel ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-background hover:border-primary/30 hover:bg-primary/5"}`}
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="text-xs font-bold">{formatZar(pIncl)}/mo</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDomainModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border bg-background text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!domainFull || !selectedDomainTld) return;
                    if (!domainAction) {
                      toast({ title: "Select an action", description: "Check domain availability first.", variant: "destructive" });
                      setDomainStep("check");
                      return;
                    }
                    if (!selectedDomainHostingId) {
                      toast({ title: "Hosting required", description: "Please select a hosting package.", variant: "destructive" });
                      return;
                    }
                    const tldPrice = vatPrices(selectedDomainTld);
                    const domainRef = stableIntFromString(domainFull);
                    const domainName = domainAction === "transfer" ? `Domain Transfer: ${domainFull}` : `Domain Registration: ${domainFull}`;
                    addToCart({ referenceId: domainRef, itemType: "domain", name: domainName, unitPriceExclVat: tldPrice.exclVat, unitPriceInclVat: tldPrice.inclVat, quantity: 1 });

                    const hosting = (hostingPackages as any[]).find((p: any) => p.id === selectedDomainHostingId);
                    if (hosting) {
                      const hp = vatPrices(hosting);
                      const existing = cart.find((i) => i.itemType === "hosting" && i.referenceId === hosting.id);
                      if (!existing) {
                        addToCart({ referenceId: hosting.id, itemType: "hosting", name: hosting.name, unitPriceExclVat: hp.exclVat, unitPriceInclVat: hp.inclVat, quantity: 1 });
                      }
                    }

                    setDomainModalOpen(false);
                    toast({ title: "Added to order", description: `${domainFull} added with hosting.` });
                  }}
                  disabled={!selectedDomainHostingId}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
                >
                  Add to Order
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={hostingDomainModalOpen}
        onClose={() => setHostingDomainModalOpen(false)}
        title="Domain for Hosting"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          {selectedHostingPackage ? (
            <div className="bg-muted/10 rounded-xl p-4 border border-border/50">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold">{selectedHostingPackage.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">Choose domain registration or transfer before adding hosting.</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Price</div>
                  <div className="text-sm font-bold">{formatZar(vatPrices(selectedHostingPackage).inclVat)}/mo</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Select a hosting package first.</div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setHostingDomainMode("register");
                setHostingDomainChecked(false);
              }}
              className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                hostingDomainMode === "register" ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:bg-muted/20"
              }`}
            >
              Register Domain
            </button>
            <button
              type="button"
              onClick={() => {
                setHostingDomainMode("transfer");
                setHostingDomainChecked(false);
                setHostingTransferDomain(hostingTransferDomain || hostingDomainFull);
              }}
              className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                hostingDomainMode === "transfer" ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:bg-muted/20"
              }`}
            >
              Transfer Existing Domain
            </button>
          </div>

          {hostingDomainMode === "register" ? (
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Domain name</label>
                  <input
                    value={hostingDomainLabel}
                    onChange={(e) => {
                      setHostingDomainLabel(e.target.value);
                      setHostingDomainChecked(false);
                    }}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                    placeholder="example"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">TLD</label>
                  <select
                    value={hostingSelectedTldId ?? ""}
                    onChange={(e) => {
                      setHostingSelectedTldId(e.target.value ? Number(e.target.value) : null);
                      setHostingDomainChecked(false);
                    }}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                  >
                    {(domainTlds as any[]).map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.tld}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">{hostingDomainFull ? hostingDomainFull : "Enter a domain to check availability."}</div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!hostingDomainFull) {
                      toast({ title: "Enter a domain", variant: "destructive" });
                      return;
                    }
                    await hostingDomainCheckQuery.refetch();
                    setHostingDomainChecked(true);
                  }}
                  disabled={!hostingDomainFull || hostingDomainCheckQuery.isFetching}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
                >
                  {hostingDomainCheckQuery.isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Check
                </button>
              </div>

              {hostingDomainChecked && (
                <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold">{hostingDomainFull}</div>
                      <div className="text-xs text-muted-foreground mt-1">{hostingDomainCheckQuery.data?.status ?? ""}</div>
                    </div>
                    {hostingDomainCheckQuery.data?.available ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-600 border border-red-500/20">
                        Unavailable
                      </span>
                    )}
                  </div>
                  {!hostingDomainCheckQuery.data?.available && (
                    <div className="flex justify-end mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setHostingDomainMode("transfer");
                          setHostingTransferDomain(hostingDomainFull);
                        }}
                        className="px-4 py-2 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-muted/20 transition-colors"
                      >
                        Transfer Instead
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Domain to transfer</label>
                <input
                  value={hostingTransferDomain}
                  onChange={(e) => setHostingTransferDomain(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                  placeholder="example.com"
                />
                <div className="text-xs text-muted-foreground mt-1">Enter the full domain name you want to transfer.</div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setHostingDomainModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-border bg-background text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={
                !selectedHostingPackage ||
                (hostingDomainMode === "register" ? !(hostingDomainChecked && hostingDomainCheckQuery.data?.available) : !/\./.test(hostingTransferDomain.trim()))
              }
              onClick={() => {
                if (!selectedHostingPackage) return;
                if (hostingDomainMode === "register") {
                  if (!hostingSelectedTld) {
                    toast({ title: "Select a TLD", variant: "destructive" });
                    return;
                  }
                  if (!hostingDomainChecked) {
                    toast({ title: "Check domain availability first", variant: "destructive" });
                    return;
                  }
                  if (!hostingDomainCheckQuery.data?.available) {
                    toast({ title: "Domain unavailable", description: "Choose transfer instead.", variant: "destructive" });
                    return;
                  }

                  const tldPrice = vatPrices(hostingSelectedTld);
                  const domainRef = stableIntFromString(hostingDomainFull);
                  addToCart({
                    referenceId: domainRef,
                    itemType: "domain",
                    name: `Domain Registration: ${hostingDomainFull}`,
                    unitPriceExclVat: tldPrice.exclVat,
                    unitPriceInclVat: tldPrice.inclVat,
                    quantity: 1,
                  });
                } else {
                  const domain = hostingTransferDomain.trim().toLowerCase();
                  if (!domain || !/\./.test(domain)) {
                    toast({ title: "Enter a domain to transfer", variant: "destructive" });
                    return;
                  }
                  const match = (domainTlds as any[]).find((t: any) => {
                    const tld = String(t.tld ?? "").toLowerCase().replace(/^\./, "");
                    return tld && domain.endsWith(`.${tld}`);
                  });
                  const tldPrice = match ? vatPrices(match) : { exclVat: 0, inclVat: 0 };
                  const domainRef = stableIntFromString(domain);
                  addToCart({
                    referenceId: domainRef,
                    itemType: "domain",
                    name: `Domain Transfer: ${domain}`,
                    unitPriceExclVat: tldPrice.exclVat,
                    unitPriceInclVat: tldPrice.inclVat,
                    quantity: 1,
                  });
                }

                const hp = vatPrices(selectedHostingPackage);
                const existingHosting = cart.find((i) => i.itemType === "hosting" && i.referenceId === selectedHostingPackage.id);
                if (!existingHosting) {
                  addToCart({
                    referenceId: selectedHostingPackage.id,
                    itemType: "hosting",
                    name: selectedHostingPackage.name,
                    unitPriceExclVat: hp.exclVat,
                    unitPriceInclVat: hp.inclVat,
                    quantity: 1,
                  });
                }

                setHostingDomainModalOpen(false);
                toast({ title: "Added to order", description: "Hosting added with domain." });
              }}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
            >
              Add to Order
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
