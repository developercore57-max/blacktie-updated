import { Link } from "wouter";
import { useAdminGetResellers } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatZar } from "@/lib/utils";
import { format } from "date-fns";
import { Plus, Search, MoreHorizontal, Eye } from "lucide-react";

export default function AdminResellers() {
  const { data: resellers, isLoading } = useAdminGetResellers();

  return (
    <AppLayout role="admin" title="Reseller Management">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search resellers..." 
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>
        <Link 
          href="/admin/resellers/new"
          className="flex items-center px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-200"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Reseller
        </Link>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/30">
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Clients</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Revenue</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex justify-center mb-2"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                    Loading resellers...
                  </td>
                </tr>
              ) : resellers?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No resellers found. Click "Add Reseller" to create one.
                  </td>
                </tr>
              ) : (
                resellers?.map((reseller) => (
                  <tr key={reseller.id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-foreground">{reseller.companyName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Joined {format(new Date(reseller.createdAt), "MMM d, yyyy")}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium">{reseller.contactName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{reseller.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={reseller.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                      {reseller.totalClients}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-foreground">
                      {formatZar(reseller.monthlyRevenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link 
                        href={`/admin/resellers/${reseller.id}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
