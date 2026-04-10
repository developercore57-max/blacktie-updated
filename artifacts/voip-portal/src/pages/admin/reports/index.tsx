import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  ShoppingCart, TrendingUp, Clock, CheckCircle2, XCircle, BarChart3,
  Building2, AlertCircle, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useLocation } from "wouter";

// ── Formatters ────────────────────────────────────────────────────────────────

function formatZAR(value: string | number | null | undefined): string {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  }).format(num);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-ZA").format(value);
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Summary {
  totalOrders: number;
  totalRevenue: string;
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  cancelledCount: number;
  activeResellers: number;
  thisMonth: { orderCount: number; revenue: string; completedRevenue: string };
  lastMonth: { orderCount: number; revenue: string };
}

interface MonthlyRow {
  month: string;
  monthLabel: string;
  orderCount: number;
  totalRevenue: string;
  completedRevenue: string;
  pendingCount: number;
  completedCount: number;
  cancelledCount: number;
}

interface StatusRow {
  status: string;
  count: number;
  total: string;
}

interface ResellerRow {
  id: number;
  companyName: string;
  contactName: string;
  email: string;
  status: string;
  createdAt: string;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalRevenue: string;
  completedRevenue: string;
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  processing: "#3B82F6",
  completed: "#10B981",
  cancelled: "#EF4444",
};

const CHART_COLORS = ["#4BA3E3", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#F97316"];

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "completed") return "default";
  if (status === "cancelled") return "destructive";
  if (status === "pending") return "secondary";
  return "outline";
}

// ── Trend indicator ───────────────────────────────────────────────────────────

function Trend({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <span className="text-muted-foreground text-xs">No prev data</span>;
  const pct = ((current - previous) / previous) * 100;
  const abs = Math.abs(pct);
  if (abs < 0.5) {
    return (
      <span className="flex items-center gap-1 text-muted-foreground text-xs">
        <Minus className="w-3 h-3" /> No change
      </span>
    );
  }
  if (pct > 0) {
    return (
      <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
        <ArrowUpRight className="w-3 h-3" /> +{abs.toFixed(1)}% vs last month
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
      <ArrowDownRight className="w-3 h-3" /> -{abs.toFixed(1)}% vs last month
    </span>
  );
}

// ── Summary stat card ─────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  trend?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && <div className="mt-1">{trend}</div>}
      </CardContent>
    </Card>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24 mb-1" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function CurrencyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === "number" && entry.value > 100
            ? formatZAR(entry.value)
            : entry.value}
        </p>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminReports() {
  const [, setLocation] = useLocation();
  const summary = useQuery<Summary>({
    queryKey: ["admin-reports-summary"],
    queryFn: () => apiFetch("/api/admin/reports/summary"),
  });

  const monthly = useQuery<MonthlyRow[]>({
    queryKey: ["admin-reports-monthly"],
    queryFn: () => apiFetch("/api/admin/reports/monthly"),
  });

  const byStatus = useQuery<StatusRow[]>({
    queryKey: ["admin-reports-by-status"],
    queryFn: () => apiFetch("/api/admin/reports/orders-by-status"),
  });

  const resellers = useQuery<ResellerRow[]>({
    queryKey: ["admin-reports-resellers"],
    queryFn: () => apiFetch("/api/admin/reports/resellers"),
  });

  const s = summary.data;
  const monthlyData = (monthly.data ?? []).map((r) => ({
    ...r,
    totalRevenueNum: Number(r.totalRevenue),
    completedRevenueNum: Number(r.completedRevenue),
  }));

  const statusPieData = (byStatus.data ?? []).map((r) => ({
    name: r.status.charAt(0).toUpperCase() + r.status.slice(1),
    value: r.count,
    total: Number(r.total),
    color: STATUS_COLORS[r.status] ?? "#94A3B8",
  }));

  return (
    <AppLayout role="admin" title="Reports & Analytics">
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          Reports & Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Business performance overview for Black Tie VoIP
        </p>
        </div>
        <button
          type="button"
          onClick={() => setLocation("/admin")}
          className="px-4 py-2 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-muted/20 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>

      {/* Summary Cards */}
      {summary.isLoading ? (
        <SummarySkeleton />
      ) : summary.isError ? (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-2 py-4 text-destructive">
            <AlertCircle className="w-4 h-4" />
            Failed to load summary data. Please refresh.
          </CardContent>
        </Card>
      ) : s ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Orders"
            value={formatNumber(s.totalOrders)}
            icon={ShoppingCart}
            color="bg-blue-500"
            trend={
              <Trend
                current={s.thisMonth.orderCount}
                previous={s.lastMonth.orderCount}
              />
            }
          />
          <StatCard
            title="Total Revenue (Completed)"
            value={formatZAR(s.totalRevenue)}
            icon={TrendingUp}
            color="bg-emerald-500"
            trend={
              <Trend
                current={Number(s.thisMonth.completedRevenue)}
                previous={Number(s.lastMonth.revenue)}
              />
            }
          />
          <StatCard
            title="Pending Orders"
            value={formatNumber(s.pendingCount)}
            icon={Clock}
            color="bg-amber-500"
          />
          <StatCard
            title="Completed Orders"
            value={formatNumber(s.completedCount)}
            icon={CheckCircle2}
            color="bg-green-600"
          />
          <StatCard
            title="Orders This Month"
            value={formatNumber(s.thisMonth.orderCount)}
            icon={ShoppingCart}
            color="bg-indigo-500"
          />
          <StatCard
            title="Revenue This Month"
            value={formatZAR(s.thisMonth.revenue)}
            icon={TrendingUp}
            color="bg-teal-500"
          />
          <StatCard
            title="Active Resellers"
            value={formatNumber(s.activeResellers)}
            icon={Building2}
            color="bg-violet-500"
          />
          <StatCard
            title="Cancelled Orders"
            value={formatNumber(s.cancelledCount)}
            icon={XCircle}
            color="bg-red-500"
          />
        </div>
      ) : null}

      {/* Tabs */}
      <Tabs defaultValue="income">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="income">Monthly Income</TabsTrigger>
          <TabsTrigger value="orders">Orders Report</TabsTrigger>
          <TabsTrigger value="resellers">Resellers</TabsTrigger>
        </TabsList>

        {/* ── Monthly Income tab ─────────────────────────────────────────── */}
        <TabsContent value="income" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue bar chart */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue</CardTitle>
                <CardDescription>Total vs completed revenue over the last 12 months (ZAR)</CardDescription>
              </CardHeader>
              <CardContent>
                {monthly.isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : monthlyData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No order data yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<CurrencyTooltip />} />
                      <Legend />
                      <Bar dataKey="totalRevenueNum" name="Total Revenue" fill="#4BA3E3" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="completedRevenueNum" name="Completed Revenue" fill="#10B981" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Orders count line chart */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Orders</CardTitle>
                <CardDescription>Order volume breakdown over the last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                {monthly.isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : monthlyData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No order data yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip content={<CurrencyTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="orderCount" name="Total Orders" stroke="#4BA3E3" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="completedCount" name="Completed" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="pendingCount" name="Pending" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="cancelledCount" name="Cancelled" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Monthly breakdown table */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Breakdown</CardTitle>
              <CardDescription>Detailed monthly income and order statistics</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {monthly.isLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right">Cancelled</TableHead>
                      <TableHead className="text-right">Total Revenue</TableHead>
                      <TableHead className="text-right">Completed Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      [...monthlyData].reverse().map((row) => (
                        <TableRow key={row.month}>
                          <TableCell className="font-medium">{row.monthLabel}</TableCell>
                          <TableCell className="text-right">{row.orderCount}</TableCell>
                          <TableCell className="text-right text-emerald-600">{row.completedCount}</TableCell>
                          <TableCell className="text-right text-amber-600">{row.pendingCount}</TableCell>
                          <TableCell className="text-right text-red-500">{row.cancelledCount}</TableCell>
                          <TableCell className="text-right font-medium">{formatZAR(row.totalRevenue)}</TableCell>
                          <TableCell className="text-right text-emerald-600 font-medium">{formatZAR(row.completedRevenue)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Orders Report tab ──────────────────────────────────────────── */}
        <TabsContent value="orders" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pie chart */}
            <Card>
              <CardHeader>
                <CardTitle>Orders by Status</CardTitle>
                <CardDescription>Distribution of all orders by their current status</CardDescription>
              </CardHeader>
              <CardContent>
                {byStatus.isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : statusPieData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No orders yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, _name, props) => [
                          `${value} orders — ${formatZAR(props.payload.total)}`,
                          props.payload.name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Status breakdown table */}
            <Card>
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
                <CardDescription>Order count and total value by status</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {byStatus.isLoading ? (
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(byStatus.data ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            No orders yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        (byStatus.data ?? []).map((row) => (
                          <TableRow key={row.status}>
                            <TableCell>
                              <Badge variant={statusVariant(row.status)}>
                                {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{row.count}</TableCell>
                            <TableCell className="text-right">{formatZAR(row.total)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order value bar chart */}
          <Card>
            <CardHeader>
              <CardTitle>Order Values by Status</CardTitle>
              <CardDescription>Total monetary value of orders in each status (ZAR incl. VAT)</CardDescription>
            </CardHeader>
            <CardContent>
              {byStatus.isLoading ? (
                <Skeleton className="h-56 w-full" />
              ) : statusPieData.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-muted-foreground">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={statusPieData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => [formatZAR(value), "Total Value"]}
                    />
                    <Bar dataKey="total" name="Total Value" radius={[0, 4, 4, 0]}>
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Resellers tab ──────────────────────────────────────────────── */}
        <TabsContent value="resellers" className="space-y-4 mt-4">
          {/* Top resellers revenue chart */}
          <Card>
            <CardHeader>
              <CardTitle>Top Resellers by Revenue</CardTitle>
              <CardDescription>Completed revenue generated by each reseller (ZAR incl. VAT)</CardDescription>
            </CardHeader>
            <CardContent>
              {resellers.isLoading ? (
                <Skeleton className="h-56 w-full" />
              ) : (resellers.data ?? []).length === 0 ? (
                <div className="h-56 flex items-center justify-center text-muted-foreground">No resellers yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={(resellers.data ?? [])
                      .filter((r) => Number(r.completedRevenue) > 0)
                      .slice(0, 10)
                      .map((r) => ({
                        name: r.companyName.length > 18 ? r.companyName.slice(0, 16) + "…" : r.companyName,
                        revenue: Number(r.completedRevenue),
                        orders: r.completedOrders,
                      }))}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 120, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} />
                    <Tooltip
                      formatter={(value: number, name) => [
                        name === "revenue" ? formatZAR(value) : value,
                        name === "revenue" ? "Completed Revenue" : "Completed Orders",
                      ]}
                    />
                    <Bar dataKey="revenue" name="Completed Revenue" fill="#4BA3E3" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Resellers table */}
          <Card>
            <CardHeader>
              <CardTitle>Reseller Performance</CardTitle>
              <CardDescription>All resellers ranked by total revenue</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {resellers.isLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total Orders</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right">Total Revenue</TableHead>
                      <TableHead className="text-right">Completed Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(resellers.data ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No resellers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      (resellers.data ?? []).map((r, i) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                          <TableCell>
                            <div className="font-medium">{r.companyName}</div>
                            <div className="text-xs text-muted-foreground">{r.email}</div>
                          </TableCell>
                          <TableCell className="text-sm">{r.contactName}</TableCell>
                          <TableCell>
                            <Badge variant={r.status === "active" ? "default" : "secondary"}>
                              {r.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{r.totalOrders}</TableCell>
                          <TableCell className="text-right text-emerald-600">{r.completedOrders}</TableCell>
                          <TableCell className="text-right text-amber-600">{r.pendingOrders}</TableCell>
                          <TableCell className="text-right font-medium">{formatZAR(r.totalRevenue)}</TableCell>
                          <TableCell className="text-right text-emerald-600 font-medium">{formatZAR(r.completedRevenue)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </AppLayout>
  );
}
