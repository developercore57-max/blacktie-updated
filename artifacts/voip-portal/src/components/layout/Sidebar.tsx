import { type ElementType, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Settings, 
  LogOut,
  ChevronRight,
  Server,
  Package,
  PhoneCall,
  Store,
  ShoppingCart,
  Cable,
  SignalHigh,
  Wifi,
  UserCog,
  Globe,
  Tag,
  Bell,
  BarChart3,
  ClipboardList,
  Shield,
  Lock,
  Phone,
  FileText,
  Clock,
  Receipt,
  MapPinned,
  MessagesSquare,
  ArrowRightLeft,
} from "lucide-react";
import { getGetMeQueryKey, useGetMe, useLogout } from "@workspace/api-client-react";
import { useNotificationChime } from "@/hooks/use-notification-chime";

interface SidebarProps {
  role: "admin" | "reseller";
}

type NavItem =
  | { type: "link"; href: string; label: string; icon: ElementType; badgeKey?: string }
  | { type: "section"; label: string };

async function fetchApplicationCount(): Promise<number> {
  const res = await fetch("/api/admin/reseller-applications/count", { credentials: "include" });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.count ?? 0;
}

async function fetchCount(url: string): Promise<number> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.count ?? 0;
}

export function Sidebar({ role }: SidebarProps) {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const { data: user } = useGetMe();
  const logout = useLogout();

  const { data: pendingCount = 0 } = useQuery<number>({
    queryKey: ["reseller-applications-count"],
    queryFn: fetchApplicationCount,
    enabled: role === "admin",
    refetchInterval: 60_000,
  });

  const { data: ordersCount = 0 } = useQuery<number>({
    queryKey: ["admin-orders-count"],
    queryFn: () => fetchCount("/api/admin/orders/count"),
    enabled: role === "admin",
    refetchInterval: 30_000,
  });

  const { data: chatCount = 0 } = useQuery<number>({
    queryKey: ["admin-chat-unread-count"],
    queryFn: () => fetchCount("/api/admin/chat/unread-count"),
    enabled: role === "admin",
    refetchInterval: 15_000,
  });

  const { data: coverageCount = 0 } = useQuery<number>({
    queryKey: ["admin-coverage-count"],
    queryFn: () => fetchCount("/api/admin/coverage/requests/count"),
    enabled: role === "admin",
    refetchInterval: 60_000,
  });

  const { data: portingCount = 0 } = useQuery<number>({
    queryKey: ["admin-number-porting-count"],
    queryFn: () => fetchCount("/api/admin/number-porting/count"),
    enabled: role === "admin",
    refetchInterval: 60_000,
  });

  const { data: didRequestsCount = 0 } = useQuery<number>({
    queryKey: ["admin-did-requests-count"],
    queryFn: () => fetchCount("/api/admin/did-requests/count"),
    enabled: role === "admin",
    refetchInterval: 60_000,
  });

  const { data: resellerChatCount = 0 } = useQuery<number>({
    queryKey: ["reseller-chat-unread-count"],
    queryFn: () => fetchCount("/api/chat/unread-count"),
    enabled: role === "reseller",
    refetchInterval: 10_000,
  });

  const { playChime } = useNotificationChime();
  const prevCountsRef = useRef<Record<string, number> | null>(null);
  const [pulsingKeys, setPulsingKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const counts: Record<string, number> =
      role === "admin"
        ? { applications: pendingCount, orders: ordersCount, chat: chatCount, coverage: coverageCount, numberPorting: portingCount, didRequests: didRequestsCount }
        : { resellerChat: resellerChatCount };

    if (prevCountsRef.current === null) {
      prevCountsRef.current = counts;
      return;
    }
    const prev = prevCountsRef.current;
    const newPulsing: string[] = [];
    for (const [key, val] of Object.entries(counts)) {
      if (val > (prev[key] ?? 0)) {
        newPulsing.push(key);
        if (key === "chat" || key === "resellerChat") playChime();
      }
    }
    prevCountsRef.current = counts;
    if (newPulsing.length === 0) return;
    setPulsingKeys(ps => {
      const next = new Set(ps);
      newPulsing.forEach(k => next.add(k));
      return next;
    });
    const timer = setTimeout(() => {
      setPulsingKeys(ps => {
        const next = new Set(ps);
        newPulsing.forEach(k => next.delete(k));
        return next;
      });
    }, 5000);
    return () => clearTimeout(timer);
  }, [pendingCount, ordersCount, chatCount, coverageCount, portingCount, didRequestsCount, resellerChatCount, role, playChime]);

  const adminLinks: NavItem[] = [
    { type: "link", href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { type: "link", href: "/admin/resellers", label: "Resellers", icon: Building2 },
    { type: "link", href: "/admin/reseller-applications", label: "Applications", icon: ClipboardList, badgeKey: "applications" },
    { type: "link", href: "/admin/clients", label: "All Clients", icon: Users },
    { type: "section", label: "Catalog" },
    { type: "link", href: "/admin/voip-solutions-catalog", label: "VoIP Solutions", icon: Phone },
    { type: "link", href: "/admin/services-catalog", label: "Services", icon: Server },
    { type: "link", href: "/admin/products-catalog", label: "Products", icon: Package },
    { type: "link", href: "/admin/connectivity-catalog", label: "Connectivity", icon: Wifi },
    { type: "link", href: "/admin/hosting-catalog", label: "Web Hosting", icon: Globe },
    { type: "link", href: "/admin/domains-catalog", label: "Domains", icon: Tag },
    { type: "link", href: "/admin/cybersecurity-catalog", label: "Cybersecurity", icon: Shield },
    { type: "link", href: "/admin/data-security-catalog", label: "Data Security", icon: Lock },
    { type: "link", href: "/admin/web-dev-catalog", label: "Web Development", icon: Globe },
    { type: "link", href: "/admin/minute-bundles-catalog", label: "Minute Bundles", icon: Clock },
    { type: "section", label: "Operations" },
    { type: "link", href: "/admin/did-manager", label: "DID Manager", icon: PhoneCall },
    { type: "link", href: "/admin/did-requests", label: "DID Requests", icon: PhoneCall, badgeKey: "didRequests" },
    { type: "link", href: "/admin/orders", label: "Orders", icon: ShoppingCart, badgeKey: "orders" },
    { type: "link", href: "/admin/notices", label: "Notices", icon: Bell },
    { type: "section", label: "Coverage" },
    { type: "link", href: "/admin/coverage/requests", label: "Coverage Check Requests", icon: MapPinned, badgeKey: "coverage" },
    { type: "section", label: "Support" },
    { type: "link", href: "/admin/chat", label: "Chat", icon: MessagesSquare, badgeKey: "chat" },
    { type: "section", label: "Reports" },
    { type: "link", href: "/admin/reports", label: "Reports & Analytics", icon: BarChart3 },
    { type: "section", label: "Administration" },
    { type: "link", href: "/admin/number-porting", label: "Number Porting", icon: ArrowRightLeft, badgeKey: "numberPorting" },
    { type: "link", href: "/admin/staff", label: "Staff", icon: UserCog },
    { type: "link", href: "/admin/documents", label: "Documents", icon: FileText },
    { type: "link", href: "/admin/settings", label: "Company Settings", icon: Settings },
  ];

  const resellerLinks: NavItem[] = [
    { type: "link", href: "/reseller", label: "Dashboard", icon: LayoutDashboard },
    { type: "link", href: "/reseller/clients", label: "My Clients", icon: Users },
    { type: "link", href: "/reseller/dids", label: "My DIDs", icon: PhoneCall },
    { type: "link", href: "/reseller/request-did", label: "Request DID", icon: PhoneCall },
    { type: "link", href: "/reseller/catalog", label: "Catalog", icon: Store },
    { type: "link", href: "/reseller/orders/new", label: "New Order", icon: ShoppingCart },
    { type: "link", href: "/reseller/orders", label: "My Orders", icon: Receipt },
    { type: "link", href: "/reseller/chat", label: "Chat", icon: MessagesSquare, badgeKey: "resellerChat" },
    { type: "link", href: "/reseller/documents", label: "Documents", icon: FileText },
    { type: "link", href: "/reseller/number-porting", label: "Number Porting", icon: ArrowRightLeft },
    { type: "section", label: "Connectivity" },
    { type: "link", href: "/reseller/domain-check", label: "Domain Check", icon: Globe },
    { type: "link", href: "/reseller/coverage/requests", label: "Coverage Check", icon: MapPinned },
    { type: "link", href: "/reseller/connectivity/fibre", label: "Fibre Coverage", icon: Cable },
    { type: "link", href: "/reseller/connectivity/telkom-lte", label: "Telkom LTE", icon: SignalHigh },
    { type: "link", href: "/reseller/profile", label: "Profile", icon: Settings },
  ];

  const items = role === "admin" ? adminLinks : resellerLinks;

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } catch (e) {
      console.error("Logout API error (proceeding anyway)", e);
    }
    queryClient.clear();
    window.location.replace("/login");
  };

  const getBadgeCount = (badgeKey?: string): number => {
    if (badgeKey === "applications") return pendingCount;
    if (badgeKey === "orders") return ordersCount;
    if (badgeKey === "chat") return chatCount;
    if (badgeKey === "coverage") return coverageCount;
    if (badgeKey === "numberPorting") return portingCount;
    if (badgeKey === "didRequests") return didRequestsCount;
    if (badgeKey === "resellerChat") return resellerChatCount;
    return 0;
  };

  return (
    <div className="w-56 bg-sidebar border-r border-sidebar-border h-screen flex flex-col fixed left-0 top-0 shadow-lg shadow-black/10 z-50">
      {/* Logo block */}
      <div className="px-4 pt-5 pb-4 flex flex-col items-center border-b border-sidebar-border">
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="Black Tie VoIP"
          className="h-12 w-auto object-contain"
        />
        <span className="mt-2 text-[11px] font-bold tracking-[0.18em] uppercase text-primary">
          Black Tie Portal
        </span>
      </div>

      <div className="px-3 py-2">
        <div className="bg-sidebar-accent rounded-lg px-3 py-2 border border-sidebar-border">
          <p className="text-[9px] text-sidebar-foreground/50 uppercase tracking-widest font-bold mb-0.5">Logged in as</p>
          <p className="text-xs font-semibold text-sidebar-foreground truncate leading-tight">{user?.name}</p>
          <p className="text-[10px] text-sidebar-foreground/60 truncate leading-tight">{user?.email}</p>
          <div className="mt-1.5 inline-flex">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
              {role}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {items.map((item, idx) => {
          if (item.type === "section") {
            return (
              <div key={`section-${idx}`} className="pt-2 pb-0.5 flex items-center gap-1.5">
                <Wifi className="w-2.5 h-2.5 text-primary/50" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/50">
                  {item.label}
                </span>
                <div className="flex-1 h-px bg-sidebar-border" />
              </div>
            );
          }

          const badgeCount = getBadgeCount(item.badgeKey);
          const isActive =
            location === item.href ||
            (location.startsWith(item.href + "/") &&
              item.href !== "/admin" &&
              item.href !== "/reseller");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-300 group",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 border border-primary/30"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground border border-transparent"
              )}
            >
              <div className="flex items-center gap-2">
                <item.icon
                  className={cn(
                    "w-3.5 h-3.5 shrink-0 transition-transform duration-300 group-hover:scale-110",
                    isActive
                      ? "text-primary-foreground"
                      : "text-sidebar-foreground/50 group-hover:text-primary"
                  )}
                />
                {item.label}
              </div>
              <div className="flex items-center gap-1">
                {badgeCount > 0 && (
                  <span className="relative inline-flex items-center justify-center">
                    {item.badgeKey && pulsingKeys.has(item.badgeKey) && (
                      <span className="absolute -inset-1 rounded-full bg-amber-400 animate-ping opacity-75" />
                    )}
                    <span className={cn(
                      "relative text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none",
                      isActive ? "bg-white/20 text-white" : "bg-amber-500 text-white"
                    )}>
                      {badgeCount}
                    </span>
                  </span>
                )}
                {isActive && <ChevronRight className="w-3 h-3 opacity-70 shrink-0" />}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-2 border-t border-sidebar-border bg-sidebar-accent/40">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-3 py-1.5 rounded-md text-xs font-bold text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20 transition-all duration-300 group"
        >
          <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform duration-300" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
