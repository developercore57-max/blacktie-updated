import { useAdminGetStats, useAdminGetResellers } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { formatZar } from "@/lib/utils";
import {
  Building2, Users, CreditCard, ArrowUpRight, ShoppingCart, Clock,
  CheckCircle2, XCircle, Plus, Eye, ChevronRight, Loader2, UserPlus,
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

// ── Status helpers ─────────────────────────────────────────────────────────────

const ORDER_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:    { label: "Pending",    color: "text-amber-500 bg-amber-50 border-amber-200",       icon: Clock },
  processing: { label: "Processing", color: "text-blue-500 bg-blue-50 border-blue-200",           icon: Loader2 },
  completed:  { label: "Completed",  color: "text-emerald-600 bg-emerald-50 border-emerald-200",  icon: CheckCircle2 },
  cancelled:  { label: "Cancelled",  color: "text-red-500 bg-red-50 border-red-200",              icon: XCircle },
};

const RESELLER_STATUS: Record<string, { color: string }> = {
  active:   { color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  inactive: { color: "text-muted-foreground bg-muted/40 border-border" },
  suspended:{ color: "text-red-500 bg-red-50 border-red-200" },
};

// ── Recent Orders Panel ────────────────────────────────────────────────────────

function RecentOrdersPanel() {
  const [, navigate] = useLocation();

  const { data: orders, isLoading } = useQuery<any[]>({
    queryKey: ["admin", "dashboard-orders"],
    queryFn: async () => {
      const res = await fetch("/api/admin/orders", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load orders");
      return res.json();
    },
    staleTime: 30_000,
  });

  const recent = orders?.slice(0, 6) ?? [];

  return (
    <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Orders</h3>
          {orders && (
            <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full font-medium">
              {orders.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/admin/orders/new")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground shadow hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> New Order
          </button>
          <button
            onClick={() => navigate("/admin/orders")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
          >
            <Eye className="w-3.5 h-3.5" /> View All
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 divide-y divide-border/60">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
            <ShoppingCart className="w-8 h-8 opacity-30" />
            <p className="text-sm">No orders yet</p>
          </div>
        ) : (
          recent.map((order: any) => {
            const status = ORDER_STATUS[order.status] ?? ORDER_STATUS.pending;
            const StatusIcon = status.icon;
            return (
              <div
                key={order.id}
                className="px-5 py-3 flex items-center gap-3 hover:bg-muted/30 cursor-pointer transition-colors group"
                onClick={() => navigate(`/admin/orders?open=${order.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">Order #{order.id}</span>
                    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border font-medium ${status.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {order.resellerName ?? "Unknown Reseller"} &middot; {order.itemCount ?? 0} item{order.itemCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-foreground">{formatZar(Number(order.totalInclVat ?? 0))}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0" />
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {(orders?.length ?? 0) > 6 && (
        <div className="px-5 py-3 border-t border-border/50 bg-muted/10">
          <button
            onClick={() => navigate("/admin/orders")}
            className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
          >
            View all {orders!.length} orders <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Resellers Panel ───────────────────────────────────────────────────────────

function ResellersPanel() {
  const [, navigate] = useLocation();
  const { data: resellers, isLoading } = useAdminGetResellers();

  const { data: applications } = useQuery<any[]>({
    queryKey: ["admin", "dashboard-applications"],
    queryFn: async () => {
      const res = await fetch("/api/admin/reseller-applications", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load applications");
      return res.json();
    },
    staleTime: 30_000,
  });

  const pendingCount = applications?.length ?? 0;
  const recent = (resellers as any[] | undefined)?.slice(0, 6) ?? [];

  return (
    <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Resellers</h3>
          {resellers && (
            <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full font-medium">
              {(resellers as any[]).length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              onClick={() => navigate("/admin/resellers/applications")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white shadow hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {pendingCount} Application{pendingCount !== 1 ? "s" : ""}
            </button>
          )}
          <button
            onClick={() => navigate("/admin/resellers")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
          >
            <Eye className="w-3.5 h-3.5" /> View All
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 divide-y divide-border/60">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
            <Building2 className="w-8 h-8 opacity-30" />
            <p className="text-sm">No resellers yet</p>
          </div>
        ) : (
          recent.map((r: any) => {
            const statusCls = RESELLER_STATUS[r.status]?.color ?? RESELLER_STATUS.inactive.color;
            return (
              <div
                key={r.id}
                className="px-5 py-3 flex items-center gap-3 hover:bg-muted/30 cursor-pointer transition-colors group"
                onClick={() => navigate(`/admin/resellers/${r.id}`)}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {(r.companyName ?? "?")[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">{r.companyName}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded border capitalize font-medium ${statusCls}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {r.contactName} &middot; {r.totalClients ?? 0} client{r.totalClients !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-foreground">{formatZar(r.monthlyRevenue ?? 0)}</p>
                  <p className="text-xs text-muted-foreground">/mo</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0" />
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {((resellers as any[] | undefined)?.length ?? 0) > 6 && (
        <div className="px-5 py-3 border-t border-border/50 bg-muted/10">
          <button
            onClick={() => navigate("/admin/resellers")}
            className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
          >
            View all {(resellers as any[]).length} resellers <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { data: stats, isLoading } = useAdminGetStats();

  if (isLoading) {
    return (
      <AppLayout role="admin" title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AppLayout>
    );
  }

  const statCards = [
    {
      title: "Total Resellers",
      value: stats?.totalResellers || 0,
      subValue: `${stats?.activeResellers || 0} active`,
      icon: Building2,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      title: "Total Clients",
      value: stats?.totalClients || 0,
      subValue: `${stats?.activeClients || 0} active`,
      icon: Users,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      title: "Monthly Revenue",
      value: formatZar(stats?.totalMonthlyRevenue || 0),
      subValue: "Total across all resellers",
      icon: CreditCard,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
  ];

  return (
    <AppLayout role="admin" title="System Overview">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-6 rounded-2xl bg-card border ${card.border} shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
                <card.icon className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">{card.title}</p>
              <h3 className="text-3xl font-display font-bold text-foreground tracking-tight">{card.value}</h3>
              <p className="text-xs text-muted-foreground mt-2 font-medium">{card.subValue}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Orders + Resellers panels */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <RecentOrdersPanel />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <ResellersPanel />
        </motion.div>
      </div>
    </AppLayout>
  );
}
