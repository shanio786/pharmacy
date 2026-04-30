import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { Layout } from "@/components/layout";

import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import POSPage from "@/pages/pos";
import SaleReturnsPage from "@/pages/sale-returns";
import MissedSalesPage from "@/pages/missed-sales";
import DeliveriesPage from "@/pages/deliveries";
import PurchasesPage from "@/pages/purchases";
import PurchaseReturnsPage from "@/pages/purchase-returns";
import SalePOPage from "@/pages/sale-po";
import MedicinesPage from "@/pages/medicines";
import StockAuditPage from "@/pages/stock-audit";
import ExpiryAlertsPage from "@/pages/expiry-alerts";
import SuppliersPage from "@/pages/suppliers";
import CustomersPage from "@/pages/customers";

import SalesReportPage from "@/pages/reports/sales-report";
import StockReportPage from "@/pages/reports/stock-report";
import PurchaseReportPage from "@/pages/reports/purchase-report";
import ExpiryReportPage from "@/pages/reports/expiry-report";
import ControlledReportPage from "@/pages/reports/controlled-report";
import ProfitLossPage from "@/pages/reports/profit-loss";

import GeneralSettingsPage from "@/pages/settings/general";
import UserManagementPage from "@/pages/settings/users";
import MastersPage from "@/pages/settings/masters";

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AppRouter() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route>
        <ProtectedRoute>
          <Layout>
            <Switch>
              <Route path="/" component={DashboardPage} />
              <Route path="/pos" component={POSPage} />
              <Route path="/sale-returns" component={SaleReturnsPage} />
              <Route path="/missed-sales" component={MissedSalesPage} />
              <Route path="/deliveries" component={DeliveriesPage} />
              <Route path="/purchases" component={PurchasesPage} />
              <Route path="/purchase-returns" component={PurchaseReturnsPage} />
              <Route path="/sale-po" component={SalePOPage} />
              <Route path="/medicines" component={MedicinesPage} />
              <Route path="/stock-audit" component={StockAuditPage} />
              <Route path="/expiry-alerts" component={ExpiryAlertsPage} />
              <Route path="/suppliers" component={SuppliersPage} />
              <Route path="/customers" component={CustomersPage} />
              <Route path="/reports/sales" component={SalesReportPage} />
              <Route path="/reports/stock" component={StockReportPage} />
              <Route path="/reports/purchases" component={PurchaseReportPage} />
              <Route path="/reports/expiry" component={ExpiryReportPage} />
              <Route path="/reports/controlled" component={ControlledReportPage} />
              <Route path="/reports/profit-loss" component={ProfitLossPage} />
              <Route path="/settings" component={GeneralSettingsPage} />
              <Route path="/settings/users" component={UserManagementPage} />
              <Route path="/settings/masters" component={MastersPage} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
