import { useRoute, Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatZar } from "@/lib/utils";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  ArrowLeft, Building, Mail, Phone, MapPin,
  CreditCard, FileText,
  Server, Package, Hash, HardDrive, Globe, Activity, ExternalLink,
  KeyRound, Eye, EyeOff, ClipboardCopy, CheckCircle2, Pencil, Save, X, Loader2,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";

type ServiceCredential = {
  id?: number;
  serviceName?: string | null;
  username?: string | null;
  password?: string | null;
  host?: string | null;
  port?: string | null;
  extraNotes?: string | null;
};

type ServiceItem = {
  id: number;
  orderId: number;
  itemType: string;
  referenceId: number | null;
  name: string;
  sku?: string | null;
  quantity: number;
  unitPriceExclVat: string;
  unitPriceInclVat: string;
  lineTotal: string;
  createdAt: string;
  hasCredentials: boolean;
};

type AdminClient = {
  id: number;
  resellerId: number;
  resellerName?: string | null;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  unitStreetNumber?: string | null;
  buildingComplex?: string | null;
  streetName?: string | null;
  address?: string | null;
  address2?: string | null;
  city?: string | null;
  province?: string | null;
  sipExtensions: number;
  monthlyFee: number;
  status: string;
  notes?: string | null;
  createdAt: string;
};

const MONTHLY_TYPES = new Set([
  "service", "voip", "did", "hosting", "bundle", "minute-bundle",
  "connectivity", "cybersecurity", "data_security", "web_dev",
]);
const YEARLY_TYPES = new Set(["domain"]);

function billingCycleBadge(type: string) {
  if (YEARLY_TYPES.has(type)) {
    return (
      <span className="ml-1 text-[10px] font-medium text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
        / yr
      </span>
    );
  }
  if (!MONTHLY_TYPES.has(type)) {
    return (
      <span className="ml-1 text-[10px] font-medium text-muted-foreground bg-muted/60 border border-border/50 px-1.5 py-0.5 rounded-full">
        once
      </span>
    );
  }
  return null;
}

function itemTypeIcon(type: string) {
  switch (type) {
    case "service":
    case "voip": return <Server className="w-3.5 h-3.5" />;
    case "product": return <Package className="w-3.5 h-3.5" />;
    case "did": return <Hash className="w-3.5 h-3.5" />;
    case "hosting": return <HardDrive className="w-3.5 h-3.5" />;
    case "domain": return <Globe className="w-3.5 h-3.5" />;
    default: return <Package className="w-3.5 h-3.5" />;
  }
}

function itemTypeLabel(type: string) {
  switch (type) {
    case "service":
    case "voip": return "Voice Service";
    case "product": return "Hardware";
    case "did": return "DID Number";
    case "hosting": return "Web Hosting";
    case "domain": return "Domain";
    case "bundle":
    case "minute-bundle": return "Minute Bundle";
    case "connectivity": return "Connectivity";
    case "cybersecurity": return "Cybersecurity";
    case "data_security": return "Data Security";
    case "web_dev": return "Web Dev";
    default: return type;
  }
}

function AdminCredentialsModal({ item, onClose }: { item: ServiceItem; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceCredential>({});

  const { data: creds, isLoading } = useQuery<ServiceCredential | null>({
    queryKey: ["admin-item-credentials", item.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/order-items/${item.id}/credentials`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  useEffect(() => {
    if (creds !== undefined) setForm(creds ?? {});
  }, [creds]);

  const mutation = useMutation({
    mutationFn: async (payload: ServiceCredential) => {
      const res = await fetch(`/api/admin/order-items/${item.id}/credentials`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          serviceName: payload.serviceName ?? null,
          username: payload.username ?? null,
          password: payload.password ?? null,
          host: payload.host ?? null,
          port: payload.port ?? null,
          extraNotes: payload.extraNotes ?? null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-item-credentials", item.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-client-services"] });
      setEditMode(false);
    },
  });

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const displayCreds = creds ?? {};
  const viewFields: { label: string; value?: string | null; key: string; secret?: boolean }[] = [
    { label: "Service / Label", value: displayCreds.serviceName || item.name, key: "serviceName" },
    { label: "Username", value: displayCreds.username, key: "username" },
    { label: "Password", value: displayCreds.password, key: "password", secret: true },
    { label: "Host / Server", value: displayCreds.host, key: "host" },
    { label: "Port", value: displayCreds.port, key: "port" },
  ];

  return (
    <Modal isOpen onClose={onClose} title="Service Credentials" maxWidth="max-w-lg">
      <div className="space-y-4">
        {/* Item header */}
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            {itemTypeIcon(item.itemType)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{item.name}</p>
            {item.sku && <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>}
          </div>
          {!editMode && (
            <button
              onClick={() => { setForm(creds ?? {}); setEditMode(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary hover:bg-secondary/80 rounded-lg transition-colors border border-border/50"
            >
              <Pencil className="w-3.5 h-3.5" /> {creds ? "Edit" : "Add Credentials"}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : editMode ? (
          /* ── Edit mode ────────────────────────────────── */
          <div className="space-y-3">
            {([
              { key: "serviceName", label: "Service / Label", placeholder: item.name },
              { key: "username", label: "Username", placeholder: "e.g. user@domain.co.za" },
              { key: "password", label: "Password", placeholder: "•••••••••" },
              { key: "host", label: "Host / Server", placeholder: "e.g. sip.blacktievoip.co.za" },
              { key: "port", label: "Port", placeholder: "e.g. 5060" },
            ] as { key: keyof ServiceCredential; label: string; placeholder: string }[]).map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{f.label}</label>
                <input
                  type="text"
                  value={(form[f.key] as string) ?? ""}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
              <textarea
                value={form.extraNotes ?? ""}
                onChange={e => setForm(prev => ({ ...prev, extraNotes: e.target.value }))}
                placeholder="Any additional access information..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => mutation.mutate(form)}
                disabled={mutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Credentials
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-secondary hover:bg-secondary/80 rounded-xl transition-colors border border-border/50"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
            {mutation.isError && (
              <p className="text-xs text-destructive">Failed to save credentials. Please try again.</p>
            )}
          </div>
        ) : !creds ? (
          /* ── No credentials yet ───────────────────────── */
          <div className="py-8 text-center">
            <KeyRound className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground text-sm">No credentials set yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Click "Add Credentials" above to enter access details for this service.</p>
          </div>
        ) : (
          /* ── View mode ────────────────────────────────── */
          <div className="space-y-3">
            {viewFields.map(f => f.value ? (
              <div key={f.key} className="bg-muted/20 rounded-xl p-3 border border-border/50">
                <p className="text-xs text-muted-foreground font-medium mb-1">{f.label}</p>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-mono font-semibold flex-1 break-all ${f.secret && !showPassword ? "blur-sm select-none" : ""}`}>
                    {f.value}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {f.secret && (
                      <button
                        onClick={() => setShowPassword(v => !v)}
                        className="p-1.5 rounded-md hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <button
                      onClick={() => copyToClipboard(f.value!, f.key)}
                      className="p-1.5 rounded-md hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copiedField === f.key
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        : <ClipboardCopy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : null)}
            {creds.extraNotes && (
              <div className="bg-muted/20 rounded-xl p-3 border border-border/50">
                <p className="text-xs text-muted-foreground font-medium mb-1">Notes</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{creds.extraNotes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function AdminClientView() {
  const [, params] = useRoute("/admin/clients/:id");
  const id = parseInt(params?.id || "0", 10);
  const [credentialsItem, setCredentialsItem] = useState<ServiceItem | null>(null);

  const { data: client, isLoading } = useQuery<AdminClient>({
    queryKey: ["admin-client", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/clients/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Client not found");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery<ServiceItem[]>({
    queryKey: ["admin-client-services", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/clients/${id}/services`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  if (isLoading || !client) {
    return (
      <AppLayout role="admin" title="Client Details">
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const addressLines = [
    [client.unitStreetNumber, client.buildingComplex].filter(Boolean).join(", "),
    client.streetName,
    client.address2,
    [client.city, client.province].filter(Boolean).join(", "),
  ].filter(Boolean);

  return (
    <AppLayout role="admin" title={client.companyName}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          {client.resellerName ? (
            <Link
              href={`/admin/resellers/${client.resellerId}`}
              className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to {client.resellerName}
            </Link>
          ) : (
            <Link
              href="/admin/clients"
              className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to All Clients
            </Link>
          )}
        </div>
        {client.resellerName && (
          <Link
            href="/admin/clients"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> All Clients
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column — Stats */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-black/10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                <Building className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold">{client.companyName}</h2>
                <StatusBadge status={client.status} className="mt-1" />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center">
                  <Activity className="w-4 h-4 mr-2" /> Active Services
                </span>
                <span className="font-semibold text-lg">
                  {servicesLoading ? "—" : services.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center">
                  <CreditCard className="w-4 h-4 mr-2" /> Monthly Fee
                </span>
                <span className="font-semibold text-primary">{formatZar(client.monthlyFee)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center">
                  <CreditCard className="w-4 h-4 mr-2" /> Yearly Fees
                </span>
                <span className="font-semibold text-amber-400">
                  {servicesLoading ? "—" : formatZar(
                    services
                      .filter(i => YEARLY_TYPES.has(i.itemType))
                      .reduce((sum, i) => sum + Number(i.unitPriceInclVat) * i.quantity, 0)
                  )}
                </span>
              </div>
            </div>

            {client.resellerName && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Managed by</p>
                <Link
                  href={`/admin/resellers/${client.resellerId}`}
                  className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                >
                  {client.resellerName} <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>

          {client.notes && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-black/10">
              <h3 className="font-display font-semibold flex items-center mb-3">
                <FileText className="w-4 h-4 mr-2" /> Notes
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </div>

        {/* Right Column — Profile */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
            <div className="p-6 border-b border-border/50 bg-secondary/20">
              <h3 className="font-display font-semibold text-lg">Contact & Location</h3>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground flex items-center mb-1">
                    <Building className="w-4 h-4 mr-2" /> Contact Name
                  </dt>
                  <dd className="text-base font-medium">{client.contactName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground flex items-center mb-1">
                    <Mail className="w-4 h-4 mr-2" /> Email Address
                  </dt>
                  <dd className="text-base font-medium">{client.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground flex items-center mb-1">
                    <Phone className="w-4 h-4 mr-2" /> Phone Number
                  </dt>
                  <dd className="text-base font-medium">{client.phone || "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground flex items-center mb-1">
                    <MapPin className="w-4 h-4 mr-2" /> Address
                  </dt>
                  <dd className="text-base font-medium leading-relaxed">
                    {addressLines.length > 0
                      ? addressLines.map((line, i) => <span key={i} className="block">{line}</span>)
                      : "Not provided"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Active Services Section */}
      <div className="mt-8">
        <div className="bg-card border border-border rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
          <div className="p-6 border-b border-border/50 bg-secondary/20 flex items-center justify-between">
            <h3 className="font-display font-semibold text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Active Services
            </h3>
            {services.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {services.length} item{services.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {servicesLoading ? (
            <div className="flex justify-center p-8">
              <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : services.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                <Activity className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="font-medium text-muted-foreground text-sm">No active services</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Services appear here when this client has at least one completed order.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="text-left px-6 py-3 font-medium text-muted-foreground">Service</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Qty</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Unit Price (incl. VAT)</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Since</th>
                    <th className="text-center px-6 py-3 font-medium text-muted-foreground">Access Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {services.map(item => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium">{item.name}</div>
                        {item.sku && <div className="text-xs text-muted-foreground mt-0.5">{item.sku}</div>}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                          {itemTypeIcon(item.itemType)} {itemTypeLabel(item.itemType)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-muted-foreground">{item.quantity}</td>
                      <td className="px-4 py-4 text-right font-semibold">
                        <span className="inline-flex items-center justify-end">
                          {formatZar(Number(item.unitPriceInclVat))}
                          {billingCycleBadge(item.itemType)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right text-muted-foreground text-xs">
                        {format(new Date(item.createdAt), "d MMM yyyy")}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setCredentialsItem(item)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                            item.hasCredentials
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-muted/40 text-muted-foreground border-border/50 hover:bg-muted/60"
                          }`}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          {item.hasCredentials ? "View / Edit" : "Add"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border/50 bg-muted/20">
                  <tr>
                    <td colSpan={3} className="px-6 py-3 text-sm font-medium text-muted-foreground">
                      {services.length} active item{services.length !== 1 ? "s" : ""}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-bold text-primary">
                        {formatZar(services
                          .filter(i => MONTHLY_TYPES.has(i.itemType))
                          .reduce((sum, i) => sum + Number(i.unitPriceInclVat) * i.quantity, 0)
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-normal mt-0.5">monthly recurring</div>
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {credentialsItem && (
        <AdminCredentialsModal item={credentialsItem} onClose={() => setCredentialsItem(null)} />
      )}
    </AppLayout>
  );
}
