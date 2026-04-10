import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetMe } from "@workspace/api-client-react";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

// Pages
import Login from "@/pages/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminResellers from "@/pages/admin/resellers/index";
import AdminCreateReseller from "@/pages/admin/resellers/form";
import AdminResellerView from "@/pages/admin/resellers/view";
import AdminClients from "@/pages/admin/clients/index";
import AdminClientView from "@/pages/admin/clients/view";

// New Admin Catalog Pages
import AdminServicesCatalog from "@/pages/admin/catalog/services";
import AdminProductsCatalog from "@/pages/admin/catalog/products";
import AdminWebHostingCatalog from "@/pages/admin/catalog/hosting";
import AdminDomainsCatalog from "@/pages/admin/catalog/domains";
import AdminConnectivityCatalog from "@/pages/admin/catalog/connectivity";
import AdminCybersecurityCatalog from "@/pages/admin/catalog/cybersecurity";
import AdminDataSecurityCatalog from "@/pages/admin/catalog/data-security";
import AdminWebDevCatalog from "@/pages/admin/catalog/web-dev";
import AdminVoipSolutionsCatalog from "@/pages/admin/catalog/voip-solutions";
import AdminMinuteBundlesCatalog from "@/pages/admin/catalog/minute-bundles";
import AdminDidManager from "@/pages/admin/dids/index";
import AdminCreateOrder from "@/pages/admin/orders/create";
import AdminOrders from "@/pages/admin/orders/index";

import ResellerDashboard from "@/pages/reseller/dashboard";
import ResellerClients from "@/pages/reseller/clients/index";
import ResellerCreateClient from "@/pages/reseller/clients/form";
import ResellerClientView from "@/pages/reseller/clients/view";
import ResellerProfile from "@/pages/reseller/profile";

// New Reseller Pages
import ResellerMyDids from "@/pages/reseller/dids/index";
import ResellerRequestDid from "@/pages/reseller/dids/request";
import ResellerCatalog from "@/pages/reseller/catalog/index";
import ResellerNewOrder from "@/pages/reseller/orders/new";
import ResellerMyOrders from "@/pages/reseller/orders";
import ResellerOrderView from "@/pages/reseller/orders/view";
import ResellerOrderEdit from "@/pages/reseller/orders/edit";

import { AdminFibreCoverage, ResellerFibreCoverage } from "@/pages/connectivity/fibre";
import { AdminTelkomLte, ResellerTelkomLte } from "@/pages/connectivity/telkom-lte";
import ResellerCoverageRequests from "@/pages/reseller/coverage/requests";
import AdminCoverageRequests from "@/pages/admin/coverage/requests";
import ResellerChat from "@/pages/reseller/chat";
import ResellerDocuments from "@/pages/reseller/documents";
import AdminChat from "@/pages/admin/chat";
import AdminStaff from "@/pages/admin/staff/index";
import AdminCompanySettings from "@/pages/admin/settings/index";
import AdminNotices from "@/pages/admin/notices";
import AdminDocuments from "@/pages/admin/documents";
import AdminReports from "@/pages/admin/reports/index";
import AdminResellerApplications from "@/pages/admin/resellers/applications";
import ResellerNumberPorting from "@/pages/reseller/number-porting";
import AdminNumberPorting from "@/pages/admin/number-porting";
import AdminDidRequests from "@/pages/admin/did-requests";
import ResellerDomainCheck from "@/pages/reseller/domain-check";

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: true,
      staleTime: 30_000,
    }
  }
});

const authQueryOptions = {
  query: {
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  },
};

// Protected Route Wrapper
function ProtectedRoute({ 
  component: Component, 
  role 
}: { 
  component: React.ComponentType<any>, 
  role: "admin" | "reseller" 
}) {
  const { data: user, isLoading, error } = useGetMe(authQueryOptions);
  const [, setLocation] = useLocation();
  const authResolved = !isLoading;

  useEffect(() => {
    if (authResolved) {
      if (error || !user) {
        setLocation("/login");
      } else if (user.role !== role) {
        setLocation(user.role === "admin" ? "/admin" : "/reseller");
      }
    }
  }, [user, authResolved, error, setLocation, role]);

  if (!authResolved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading Portal...</p>
      </div>
    );
  }

  if (!user || user.role !== role) {
    return null; 
  }

  return <Component />;
}

function IndexRedirect() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading, error } = useGetMe(authQueryOptions);
  const authResolved = !isLoading;

  useEffect(() => {
    if (authResolved) {
      if (error || !user) {
        setLocation("/login");
      } else {
        setLocation(user.role === "admin" ? "/admin" : "/reseller");
      }
    }
  }, [user, authResolved, error, setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={IndexRedirect} />
      <Route path="/login" component={Login} />
      
      {/* Admin Routes */}
      <Route path="/admin">
        {() => <ProtectedRoute role="admin" component={AdminDashboard} />}
      </Route>
      <Route path="/admin/resellers">
        {() => <ProtectedRoute role="admin" component={AdminResellers} />}
      </Route>
      <Route path="/admin/resellers/new">
        {() => <ProtectedRoute role="admin" component={AdminCreateReseller} />}
      </Route>
      <Route path="/admin/resellers/:id">
        {() => <ProtectedRoute role="admin" component={AdminResellerView} />}
      </Route>
      <Route path="/admin/clients">
        {() => <ProtectedRoute role="admin" component={AdminClients} />}
      </Route>
      <Route path="/admin/clients/:id">
        {() => <ProtectedRoute role="admin" component={AdminClientView} />}
      </Route>
      <Route path="/admin/services-catalog">
        {() => <ProtectedRoute role="admin" component={AdminServicesCatalog} />}
      </Route>
      <Route path="/admin/products-catalog">
        {() => <ProtectedRoute role="admin" component={AdminProductsCatalog} />}
      </Route>
      <Route path="/admin/connectivity-catalog">
        {() => <ProtectedRoute role="admin" component={AdminConnectivityCatalog} />}
      </Route>
      <Route path="/admin/hosting-catalog">
        {() => <ProtectedRoute role="admin" component={AdminWebHostingCatalog} />}
      </Route>
      <Route path="/admin/domains-catalog">
        {() => <ProtectedRoute role="admin" component={AdminDomainsCatalog} />}
      </Route>
      <Route path="/admin/cybersecurity-catalog">
        {() => <ProtectedRoute role="admin" component={AdminCybersecurityCatalog} />}
      </Route>
      <Route path="/admin/data-security-catalog">
        {() => <ProtectedRoute role="admin" component={AdminDataSecurityCatalog} />}
      </Route>
      <Route path="/admin/web-dev-catalog">
        {() => <ProtectedRoute role="admin" component={AdminWebDevCatalog} />}
      </Route>
      <Route path="/admin/voip-solutions-catalog">
        {() => <ProtectedRoute role="admin" component={AdminVoipSolutionsCatalog} />}
      </Route>
      <Route path="/admin/minute-bundles-catalog">
        {() => <ProtectedRoute role="admin" component={AdminMinuteBundlesCatalog} />}
      </Route>
      <Route path="/admin/did-manager">
        {() => <ProtectedRoute role="admin" component={AdminDidManager} />}
      </Route>
      <Route path="/admin/orders">
        {() => <ProtectedRoute role="admin" component={AdminOrders} />}
      </Route>
      <Route path="/admin/orders/new">
        {() => <ProtectedRoute role="admin" component={AdminCreateOrder} />}
      </Route>
      <Route path="/admin/connectivity/fibre">
        {() => <ProtectedRoute role="admin" component={AdminFibreCoverage} />}
      </Route>
      <Route path="/admin/connectivity/telkom-lte">
        {() => <ProtectedRoute role="admin" component={AdminTelkomLte} />}
      </Route>
      <Route path="/admin/coverage/requests">
        {() => <ProtectedRoute role="admin" component={AdminCoverageRequests} />}
      </Route>
      <Route path="/admin/chat">
        {() => <ProtectedRoute role="admin" component={AdminChat} />}
      </Route>
      <Route path="/admin/staff">
        {() => <ProtectedRoute role="admin" component={AdminStaff} />}
      </Route>
      <Route path="/admin/settings">
        {() => <ProtectedRoute role="admin" component={AdminCompanySettings} />}
      </Route>
      <Route path="/admin/notices">
        {() => <ProtectedRoute role="admin" component={AdminNotices} />}
      </Route>
      <Route path="/admin/documents">
        {() => <ProtectedRoute role="admin" component={AdminDocuments} />}
      </Route>
      <Route path="/admin/reports">
        {() => <ProtectedRoute role="admin" component={AdminReports} />}
      </Route>
      <Route path="/admin/reseller-applications">
        {() => <ProtectedRoute role="admin" component={AdminResellerApplications} />}
      </Route>
      <Route path="/admin/number-porting">
        {() => <ProtectedRoute role="admin" component={AdminNumberPorting} />}
      </Route>
      <Route path="/admin/did-requests">
        {() => <ProtectedRoute role="admin" component={AdminDidRequests} />}
      </Route>

      {/* Reseller Routes */}
      <Route path="/reseller">
        {() => <ProtectedRoute role="reseller" component={ResellerDashboard} />}
      </Route>
      <Route path="/reseller/clients">
        {() => <ProtectedRoute role="reseller" component={ResellerClients} />}
      </Route>
      <Route path="/reseller/clients/new">
        {() => <ProtectedRoute role="reseller" component={ResellerCreateClient} />}
      </Route>
      <Route path="/reseller/clients/:id">
        {() => <ProtectedRoute role="reseller" component={ResellerClientView} />}
      </Route>
      <Route path="/reseller/profile">
        {() => <ProtectedRoute role="reseller" component={ResellerProfile} />}
      </Route>
      <Route path="/reseller/dids">
        {() => <ProtectedRoute role="reseller" component={ResellerMyDids} />}
      </Route>
      <Route path="/reseller/request-did">
        {() => <ProtectedRoute role="reseller" component={ResellerRequestDid} />}
      </Route>
      <Route path="/reseller/catalog">
        {() => <ProtectedRoute role="reseller" component={ResellerCatalog} />}
      </Route>
      <Route path="/reseller/orders/new">
        {() => <ProtectedRoute role="reseller" component={ResellerNewOrder} />}
      </Route>
      <Route path="/reseller/orders">
        {() => <ProtectedRoute role="reseller" component={ResellerMyOrders} />}
      </Route>
      <Route path="/reseller/orders/:id/edit">
        {() => <ProtectedRoute role="reseller" component={ResellerNewOrder} />}
      </Route>
      <Route path="/reseller/orders/:id">
        {() => <ProtectedRoute role="reseller" component={ResellerOrderView} />}
      </Route>
      <Route path="/reseller/connectivity/fibre">
        {() => <ProtectedRoute role="reseller" component={ResellerFibreCoverage} />}
      </Route>
      <Route path="/reseller/connectivity/telkom-lte">
        {() => <ProtectedRoute role="reseller" component={ResellerTelkomLte} />}
      </Route>
      <Route path="/reseller/coverage/requests">
        {() => <ProtectedRoute role="reseller" component={ResellerCoverageRequests} />}
      </Route>
      <Route path="/reseller/chat">
        {() => <ProtectedRoute role="reseller" component={ResellerChat} />}
      </Route>
      <Route path="/reseller/documents">
        {() => <ProtectedRoute role="reseller" component={ResellerDocuments} />}
      </Route>
      <Route path="/reseller/number-porting">
        {() => <ProtectedRoute role="reseller" component={ResellerNumberPorting} />}
      </Route>
      <Route path="/reseller/domain-check">
        {() => <ProtectedRoute role="reseller" component={ResellerDomainCheck} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
