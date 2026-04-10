import {
  useResellerGetStats,
  useGetNotices,
  useGetCatalogNewItems,
  Notice,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Modal } from "@/components/ui/modal";
import { formatZar } from "@/lib/utils";
import {
  Users, PhoneCall, CreditCard, ArrowUpRight,
  Bell, AlertTriangle, CheckCircle2, Info,
  Package, Server, Globe, Tag, ChevronRight, Sparkles, Network,
  Shield, Lock, Phone,
  Eye, X,
} from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useEffect, useMemo, useState } from "react";

const NOTICE_STYLES: Record<string, { icon: React.ElementType; bg: string; border: string; iconCls: string }> = {
  info:    { icon: Info,          bg: "bg-blue-50 dark:bg-blue-950/20",       border: "border-blue-200 dark:border-blue-800",    iconCls: "text-blue-500" },
  warning: { icon: AlertTriangle, bg: "bg-amber-50 dark:bg-amber-950/20",     border: "border-amber-200 dark:border-amber-800",  iconCls: "text-amber-500" },
  success: { icon: CheckCircle2,  bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800", iconCls: "text-emerald-500" },
  danger:  { icon: AlertTriangle, bg: "bg-red-50 dark:bg-red-950/20",         border: "border-red-200 dark:border-red-800",      iconCls: "text-red-500" },
};

const CATALOG_TYPE_ICONS: Record<string, React.ElementType> = {
  service:           Server,
  product:           Package,
  hosting:           Globe,
  domain:            Tag,
  connectivity:      Network,
  cybersecurity:     Shield,
  "data-security":   Lock,
  "web-development": Globe,
  "voip-solutions":  Phone,
};

const CATALOG_TYPE_LABELS: Record<string, string> = {
  service:           "Service",
  product:           "Product",
  hosting:           "Web Hosting",
  domain:            "Domain TLD",
  connectivity:      "Connectivity",
  cybersecurity:     "Cybersecurity",
  "data-security":   "Data Security",
  "web-development": "Web Development",
  "voip-solutions":  "VoIP Solution",
};

export default function ResellerDashboard() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = useResellerGetStats();
  const { data: notices = [] } = useGetNotices();
  const { data: catalogItems } = useGetCatalogNewItems({ query: { refetchInterval: 60_000, staleTime: 0 } });

  const newItems = catalogItems?.recentItems ?? [];
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [dismissedNoticeIds, setDismissedNoticeIds] = useState<number[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("dismissed_notices");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setDismissedNoticeIds(parsed.map((v) => Number(v)).filter((v) => Number.isFinite(v)));
      }
    } catch {
      setDismissedNoticeIds([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("dismissed_notices", JSON.stringify(dismissedNoticeIds));
    } catch {
      return;
    }
  }, [dismissedNoticeIds]);

  const visibleNotices = useMemo(() => {
    const all = notices as Notice[];
    if (!dismissedNoticeIds.length) return all;
    const set = new Set(dismissedNoticeIds);
    return all.filter((n) => !set.has(n.id));
  }, [notices, dismissedNoticeIds]);

  const statCards = [
    {
      title: "My Clients",
      value: stats?.totalClients || 0,
      subValue: `${stats?.activeClients || 0} active`,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      title: "Total SIP Extensions",
      value: stats?.totalSipExtensions || 0,
      subValue: "Across all active clients",
      icon: PhoneCall,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      title: "Monthly Billed",
      value: formatZar(stats?.monthlyRevenue || 0),
      subValue: "Total client billing",
      icon: CreditCard,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
  ];

  const catalogStats = [
    { label: "Services",       count: (catalogItems as any)?.totalServices      ?? 0, icon: Server,  cls: "bg-blue-500/10 text-blue-500" },
    { label: "Connectivity",   count: (catalogItems as any)?.totalConnectivity  ?? 0, icon: Network, cls: "bg-emerald-500/10 text-emerald-500" },
    { label: "Hardware",       count: (catalogItems as any)?.totalProducts      ?? 0, icon: Package, cls: "bg-amber-500/10 text-amber-500" },
    { label: "Hosting",        count: (catalogItems as any)?.totalHosting       ?? 0, icon: Globe,   cls: "bg-primary/10 text-primary" },
    { label: "Domains",        count: (catalogItems as any)?.totalDomains       ?? 0, icon: Tag,     cls: "bg-purple-500/10 text-purple-500" },
    { label: "Cybersecurity",  count: (catalogItems as any)?.totalCybersecurity ?? 0, icon: Shield,  cls: "bg-red-500/10 text-red-500" },
    { label: "Data Security",  count: (catalogItems as any)?.totalDataSecurity  ?? 0, icon: Lock,    cls: "bg-violet-500/10 text-violet-500" },
    { label: "Web Dev",        count: (catalogItems as any)?.totalWebDevelopment?? 0, icon: Globe,   cls: "bg-cyan-500/10 text-cyan-500" },
    { label: "VoIP Solutions", count: (catalogItems as any)?.totalVoipSolutions ?? 0, icon: Phone,   cls: "bg-indigo-500/10 text-indigo-500" },
  ];

  if (isLoading) {
    return (
      <AppLayout role="reseller" title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="reseller" title="My Dashboard">

      {/* ── Notices ──────────────────────────────────────────────────────── */}
      {visibleNotices.length > 0 && (
        <div className="mb-6 space-y-3">
          {visibleNotices.map((notice: Notice, idx) => {
            const style = NOTICE_STYLES[notice.type] ?? NOTICE_STYLES.info;
            const IconComp = style.icon;
            return (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex items-start gap-3 p-4 rounded-xl border ${style.bg} ${style.border}`}
              >
                <IconComp className={`w-5 h-5 flex-shrink-0 mt-0.5 ${style.iconCls}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{notice.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-line">{notice.content}</p>
                  {notice.expiresAt && (
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Expires {new Date(notice.expiresAt).toLocaleDateString("en-ZA")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setSelectedNotice(notice)}
                    className="p-2 rounded-lg hover:bg-black/5 text-muted-foreground hover:text-foreground transition-colors"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDismissedNoticeIds((prev) => (prev.includes(notice.id) ? prev : [...prev, notice.id]))}
                    className="p-2 rounded-lg hover:bg-black/5 text-muted-foreground hover:text-foreground transition-colors"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <Bell className={`w-4 h-4 opacity-40 ${style.iconCls}`} />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={!!selectedNotice}
        onClose={() => setSelectedNotice(null)}
        title={selectedNotice?.title ?? "Notice"}
        maxWidth="max-w-2xl"
      >
        {selectedNotice ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground whitespace-pre-line">{selectedNotice.content}</div>
            {selectedNotice.expiresAt && (
              <div className="text-xs text-muted-foreground">
                Expires {new Date(selectedNotice.expiresAt).toLocaleDateString("en-ZA")}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="px-4 py-2 rounded-xl border border-border bg-background text-sm font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setDismissedNoticeIds((prev) => (prev.includes(selectedNotice.id) ? prev : [...prev, selectedNotice.id]));
                  setSelectedNotice(null);
                }}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ── Stat Cards ────────────────────────────────────────────────────── */}
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

      {/* ── Available Catalog ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden"
      >
        <div className="p-5 border-b border-border/50 flex items-center justify-between bg-muted/10">
          <h3 className="font-display font-bold text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Available Catalog
          </h3>
          <button
            onClick={() => setLocation("/reseller/catalog")}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Browse all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {catalogItems && (
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
              {catalogStats.map(item => (
                <button
                  key={item.label}
                  onClick={() => {
                    const tab =
                      item.label === "Services" ? "services" :
                      item.label === "Connectivity" ? "connectivity" :
                      item.label === "Hardware" ? "products" :
                      item.label === "Hosting" ? "hosting" :
                      item.label === "Domains" ? "domains" :
                      item.label === "Cybersecurity" ? "cybersecurity" :
                      item.label === "Data Security" ? "data-security" :
                      item.label === "Web Dev" ? "web-development" :
                      item.label === "VoIP Solutions" ? "voip-solutions" :
                      "services";
                    setLocation(`/reseller/catalog?tab=${encodeURIComponent(tab)}`);
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/10 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.cls}`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-bold text-foreground leading-none">{item.count}</p>
                  <p className="text-[10px] text-muted-foreground font-medium text-center leading-tight">{item.label}</p>
                </button>
              ))}
            </div>
          )}

          {newItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
              <Package className="w-8 h-8 opacity-20 mb-2" />
              No recent additions
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">
                Recently Added (last 30 days)
              </p>
              <div className="grid grid-cols-1 gap-1">
                {newItems.slice(0, 9).map((item: any) => {
                  const Icon = CATALOG_TYPE_ICONS[item.type] ?? Package;
                  const tab =
                    item.type === "service" ? "services" :
                    item.type === "product" ? "products" :
                    item.type === "hosting" ? "hosting" :
                    item.type === "domain" ? "domains" :
                    item.type === "connectivity" ? "connectivity" :
                    item.type === "cybersecurity" ? "cybersecurity" :
                    item.type === "data-security" ? "data-security" :
                    item.type === "web-development" ? "web-development" :
                    item.type === "voip-solutions" ? "voip-solutions" :
                    "services";
                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      onClick={() => setLocation(`/reseller/catalog?tab=${encodeURIComponent(tab)}`)}
                      className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/10 transition-colors text-left"
                      title="View in catalog"
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{CATALOG_TYPE_LABELS[item.type] ?? item.type}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-300/30">New</span>
                        <span className="px-2 py-1 rounded-lg border border-border bg-background text-[10px] font-semibold text-muted-foreground hover:text-foreground">
                          View <ChevronRight className="w-3 h-3 inline-block -mt-0.5 ml-0.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>

    </AppLayout>
  );
}
