import { useRoute, Link } from "wouter";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatZar } from "@/lib/utils";
import { format } from "date-fns";
import { 
  useAdminGetReseller, 
  useAdminUpdateReseller, 
  useAdminDeleteReseller,
  useAdminResetResellerPassword,
  getAdminGetResellerQueryKey,
  getAdminGetResellersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  ArrowLeft, Building, Mail, Phone, MapPin, 
  Wallet, Users, Calendar, Trash2, Edit3, Save, X, Lock,
  ChevronDown, ChevronRight, Eye, Activity, Server, Package,
  Hash, HardDrive, Globe
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateResellerSchema } from "@/lib/schemas";
import { PROVINCES } from "@/lib/utils";
import * as z from "zod";

type FormValues = z.infer<typeof updateResellerSchema>;

type ClientServiceItem = {
  id: number;
  orderId: number;
  itemType: string;
  referenceId: number | null;
  name: string;
  sku?: string | null;
  quantity: number;
  unitPriceInclVat: string;
  lineTotal: string;
  createdAt: string;
};

type ResellerClient = {
  id: number;
  resellerId: number;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  sipExtensions: number;
  monthlyFee: number;
  status: string;
  notes?: string | null;
  createdAt: string;
  services: ClientServiceItem[];
};

function serviceTypeIcon(type: string) {
  switch (type) {
    case "service": return <Server className="w-3 h-3" />;
    case "product": return <Package className="w-3 h-3" />;
    case "did": return <Hash className="w-3 h-3" />;
    case "hosting": return <HardDrive className="w-3 h-3" />;
    case "domain": return <Globe className="w-3 h-3" />;
    default: return <Package className="w-3 h-3" />;
  }
}

function serviceTypeLabel(type: string) {
  switch (type) {
    case "service": return "Voice";
    case "product": return "Product";
    case "did": return "DID";
    case "hosting": return "Hosting";
    case "domain": return "Domain";
    default: return type;
  }
}

export default function AdminResellerView() {
  const [, params] = useRoute("/admin/resellers/:id");
  const id = parseInt(params?.id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: reseller, isLoading } = useAdminGetReseller(id);
  const updateMutation = useAdminUpdateReseller();
  const deleteMutation = useAdminDeleteReseller();
  const resetPasswordMutation = useAdminResetResellerPassword();

  const [isEditing, setIsEditing] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null);

  const { data: resellerClients = [], isLoading: clientsLoading } = useQuery<ResellerClient[]>({
    queryKey: ["admin-reseller-clients", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/resellers/${id}/clients`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(updateResellerSchema),
    values: reseller ? {
      companyName: reseller.companyName,
      contactName: reseller.contactName,
      email: reseller.email,
      phone: reseller.phone || "",
      unitStreetNumber: (reseller as any).unitStreetNumber || "",
      buildingComplex: (reseller as any).buildingComplex || "",
      streetName: (reseller as any).streetName || "",
      address: reseller.address || "",
      address2: (reseller as any).address2 || "",
      city: reseller.city || "",
      province: reseller.province || "",
      status: reseller.status,
    } : undefined
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await updateMutation.mutateAsync({ id, data });
      queryClient.invalidateQueries({ queryKey: getAdminGetResellerQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getAdminGetResellersQueryKey() });
      toast({ title: "Success", description: "Reseller updated successfully." });
      setIsEditing(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error?.data?.error || "Update failed." });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this reseller? This cannot be undone.")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getAdminGetResellersQueryKey() });
      toast({ title: "Deleted", description: "Reseller has been removed." });
      setLocation("/admin/resellers");
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete reseller." });
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast({ variant: "destructive", title: "Error", description: "Password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Error", description: "Passwords do not match." });
      return;
    }
    try {
      await resetPasswordMutation.mutateAsync({ id, data: { password: newPassword } });
      toast({ title: "Success", description: "Reseller password updated." });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error?.data?.error || "Failed to update password." });
    }
  };

  if (isLoading || !reseller) {
    return (
      <AppLayout role="admin" title="Reseller Details">
        <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="admin" title={reseller.companyName}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <Link href="/admin/resellers" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Resellers
        </Link>
        {!isEditing && (
          <div className="flex gap-3">
            <button onClick={() => setIsEditing(true)} className="flex items-center px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground font-medium rounded-xl border border-border transition-all">
              <Edit3 className="w-4 h-4 mr-2" /> Edit Details
            </button>
            <button onClick={handleDelete} className="flex items-center px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white font-medium rounded-xl border border-destructive/20 transition-all">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Stats & Quick Info */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-black/10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                <Building className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold">{reseller.companyName}</h2>
                <StatusBadge status={reseller.status} className="mt-1" />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center"><Users className="w-4 h-4 mr-2" /> Clients</span>
                <span className="font-semibold">{reseller.totalClients}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center"><Wallet className="w-4 h-4 mr-2" /> Revenue</span>
                <span className="font-semibold text-primary">{formatZar(reseller.monthlyRevenue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center"><Calendar className="w-4 h-4 mr-2" /> Joined</span>
                <span className="font-semibold text-sm">{format(new Date(reseller.createdAt), "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Profile Form / Details */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
            <div className="p-6 border-b border-border/50 bg-secondary/20 flex justify-between items-center">
              <h3 className="font-display font-semibold text-lg">Profile Information</h3>
              {isEditing && (
                <button onClick={() => setIsEditing(false)} className="p-1 rounded-md hover:bg-background text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Company Name</label>
                    <input {...form.register("companyName")} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Contact Name</label>
                    <input {...form.register("contactName")} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Email</label>
                    <input {...form.register("email")} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Phone</label>
                    <input {...form.register("phone")} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Status</label>
                    <select {...form.register("status")} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none">
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Unit / Street Number</label>
                    <input {...form.register("unitStreetNumber")} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. Unit 4 / 12" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Building / Complex</label>
                    <input {...form.register("buildingComplex")} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. Sunridge Business Park" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-medium">Street Name</label>
                    <input {...form.register("streetName")} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. Main Road" />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-medium">Address Line 2 <span className="text-muted-foreground font-normal text-xs">(optional)</span></label>
                    <input {...form.register("address2")} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" placeholder="e.g. Industrial area" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">City</label>
                    <input {...form.register("city")} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Province</label>
                    <select {...form.register("province")} className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none">
                      <option value="">Select Province...</option>
                      {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold text-sm mb-3 flex items-center">
                    <Lock className="w-4 h-4 mr-2" /> Reset Password
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">New Password</label>
                      <input
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        type="password"
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                        placeholder="At least 8 characters"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Confirm Password</label>
                      <input
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        type="password"
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={resetPasswordMutation.isPending}
                      className="flex items-center px-6 py-2.5 bg-secondary hover:bg-secondary/80 text-foreground font-medium rounded-xl shadow-lg shadow-black/10 transition-all disabled:opacity-60"
                    >
                      <Lock className="w-4 h-4 mr-2" /> Update Password
                    </button>
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-border">
                  <button type="submit" disabled={updateMutation.isPending} className="flex items-center px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl shadow-lg shadow-primary/20 transition-all">
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground flex items-center mb-1"><Building className="w-4 h-4 mr-2" /> Contact Name</dt>
                    <dd className="text-base font-medium">{reseller.contactName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground flex items-center mb-1"><Mail className="w-4 h-4 mr-2" /> Email Address</dt>
                    <dd className="text-base font-medium">{reseller.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground flex items-center mb-1"><Phone className="w-4 h-4 mr-2" /> Phone Number</dt>
                    <dd className="text-base font-medium">{reseller.phone || "Not provided"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground flex items-center mb-1"><MapPin className="w-4 h-4 mr-2" /> Address</dt>
                    <dd className="text-base font-medium leading-relaxed">
                      {(() => {
                        const r = reseller as any;
                        const lines = [
                          [r.unitStreetNumber, r.buildingComplex].filter(Boolean).join(", "),
                          r.streetName,
                          r.address2,
                          [r.city, r.province].filter(Boolean).join(", "),
                        ].filter(Boolean);
                        return lines.length > 0 ? lines.map((l: string, i: number) => <span key={i} className="block">{l}</span>) : "Not provided";
                      })()}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clients Section */}
      <div className="mt-8">
        <div className="bg-card border border-border rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
          <div className="p-6 border-b border-border/50 bg-secondary/20 flex items-center justify-between">
            <h3 className="font-display font-semibold text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Clients
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {resellerClients.length}
              </span>
            </h3>
            {resellerClients.length > 0 && (
              <span className="text-sm text-muted-foreground">
                Total MRR: <span className="font-semibold text-foreground">{formatZar(resellerClients.reduce((s, c) => s + c.monthlyFee, 0))}</span>
              </span>
            )}
          </div>

          {clientsLoading ? (
            <div className="flex justify-center p-10">
              <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : resellerClients.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                <Users className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="font-medium text-muted-foreground text-sm">No clients yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">This reseller has not added any clients.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {resellerClients.map(client => {
                const isExpanded = expandedClientId === client.id;
                return (
                  <div key={client.id}>
                    {/* Client Row */}
                    <div
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-6 py-4 hover:bg-secondary/20 transition-colors cursor-pointer"
                      onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                    >
                      {/* Expand toggle */}
                      <span className="text-muted-foreground mt-0.5 shrink-0">
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4" />
                          : <ChevronRight className="w-4 h-4" />
                        }
                      </span>

                      {/* Company + contact */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground truncate">{client.companyName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {client.contactName} &bull; {client.email}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="shrink-0" onClick={e => e.stopPropagation()}>
                        <StatusBadge status={client.status} />
                      </div>

                      {/* SIP ext */}
                      <div className="shrink-0 hidden md:flex items-center gap-1.5 text-sm text-muted-foreground min-w-[70px] justify-end">
                        <Phone className="w-3.5 h-3.5" />
                        <span className="font-medium text-foreground">{client.sipExtensions}</span>
                        <span className="text-xs">ext</span>
                      </div>

                      {/* Monthly fee */}
                      <div className="shrink-0 font-semibold text-primary text-sm min-w-[90px] text-right">
                        {formatZar(client.monthlyFee)}/mo
                      </div>

                      {/* View Client link */}
                      <div className="shrink-0" onClick={e => e.stopPropagation()}>
                        <Link
                          href={`/admin/clients/${client.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/20 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Client
                        </Link>
                      </div>
                    </div>

                    {/* Expanded: Services */}
                    {isExpanded && (
                      <div className="bg-secondary/10 border-t border-border/30 px-6 pb-4 pt-3">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-3">
                          <Activity className="w-3.5 h-3.5" /> Active Services
                        </h4>
                        {client.services.length === 0 ? (
                          <p className="text-sm text-muted-foreground/70 italic">No active services — no completed orders for this client.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {client.services.map(item => (
                              <div key={item.id} className="flex items-center gap-3 text-sm py-1.5 px-3 rounded-lg bg-card border border-border/50">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 shrink-0">
                                  {serviceTypeIcon(item.itemType)} {serviceTypeLabel(item.itemType)}
                                </span>
                                <span className="flex-1 font-medium truncate">{item.name}</span>
                                {item.sku && <span className="text-xs text-muted-foreground hidden sm:block">{item.sku}</span>}
                                <span className="text-xs text-muted-foreground shrink-0">×{item.quantity}</span>
                                <span className="text-sm font-semibold text-foreground shrink-0">{formatZar(Number(item.unitPriceInclVat))}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Totals row */}
              <div className="px-6 py-4 bg-secondary/20 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{resellerClients.length} client{resellerClients.length !== 1 ? "s" : ""}</span>
                <span className="font-bold text-primary text-sm">
                  {formatZar(resellerClients.reduce((s, c) => s + c.monthlyFee, 0))} / month
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
