import { Link } from "wouter";
import { useResellerGetClients } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatZar } from "@/lib/utils";
import { format } from "date-fns";
import { Plus, Search, Eye } from "lucide-react";

export default function ResellerClients() {
  const { data: clients, isLoading } = useResellerGetClients();

  return (
    <AppLayout role="reseller" title="My Clients">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search clients..." 
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>
        <Link 
          href="/reseller/clients/new"
          className="flex items-center px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-200"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Client
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
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Monthly Fee</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex justify-center mb-2"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                    Loading clients...
                  </td>
                </tr>
              ) : clients?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No clients found. Click "Add Client" to get started.
                  </td>
                </tr>
              ) : (
                clients?.map((client) => (
                  <tr key={client.id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-foreground">{client.companyName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Added {format(new Date(client.createdAt), "MMM d, yyyy")}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium">{client.contactName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{client.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={client.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-foreground">
                      {formatZar(client.monthlyFee)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link 
                        href={`/reseller/clients/${client.id}`}
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
