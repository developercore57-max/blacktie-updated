import { useAdminGetClients } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatZar } from "@/lib/utils";
import { Search } from "lucide-react";
import { Link } from "wouter";

export default function AdminClients() {
  const { data: clients, isLoading } = useAdminGetClients();

  return (
    <AppLayout role="admin" title="All Clients Overview">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search all clients..." 
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/30">
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client Company</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Managed By (Reseller)</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider"></th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Monthly Fee</th>
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
                    No clients found in the system yet.
                  </td>
                </tr>
              ) : (
                clients?.map((client) => (
                  <tr key={client.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        {client.companyName}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{client.contactName} • {client.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/admin/resellers/${client.resellerId}`} className="text-primary hover:underline font-medium">
                        {client.resellerName || `Reseller #${client.resellerId}`}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={client.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/admin/clients/${client.id}`} className="text-xs font-medium text-primary hover:underline">
                        View
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-foreground">
                      {formatZar(client.monthlyFee)}
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
