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
import MissedSalesReportPage from "@/pages/reports/missed-sales-report";
import StockAuditVarianceReportPage from "@/pages/reports/stock-audit-variance-report";
import CustomerLedgerPage from "@/pages/reports/customer-ledger";
import SupplierLedgerPage from "@/pages/reports/supplier-ledger";

import GeneralSettingsPage from "@/pages/settings/general";
import UserManagementPage from "@/pages/settings/users";
import MastersPage from "@/pages/settings/masters";

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function MgrRoute({ component: Page }: { component: React.ComponentType }) {
  return <ProtectedRoute minRole="manager"><Page /></ProtectedRoute>;
}

function AdminRoute({ component: Page }: { component: React.ComponentType }) {
  return <ProtectedRoute minRole="admin"><Page /></ProtectedRoute>;
}

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
              <Route path="/purchases">{() => <MgrRoute component={PurchasesPage} />}</Route>
              <Route path="/purchase-returns">{() => <MgrRoute component={PurchaseReturnsPage} />}</Route>
              <Route path="/sale-po">{() => <MgrRoute component={SalePOPage} />}</Route>
              <Route path="/medicines">{() => <MgrRoute component={MedicinesPage} />}</Route>
              <Route path="/stock-audit">{() => <MgrRoute component={StockAuditPage} />}</Route>
              <Route path="/expiry-alerts">{() => <MgrRoute component={ExpiryAlertsPage} />}</Route>
              <Route path="/suppliers">{() => <MgrRoute component={SuppliersPage} />}</Route>
              <Route path="/customers">{() => <MgrRoute component={CustomersPage} />}</Route>
              <Route path="/reports/sales">{() => <MgrRoute component={SalesReportPage} />}</Route>
              <Route path="/reports/stock">{() => <MgrRoute component={StockReportPage} />}</Route>
              <Route path="/reports/purchases">{() => <MgrRoute component={PurchaseReportPage} />}</Route>
              <Route path="/reports/expiry">{() => <MgrRoute component={ExpiryReportPage} />}</Route>
              <Route path="/reports/controlled">{() => <MgrRoute component={ControlledReportPage} />}</Route>
              <Route path="/reports/profit-loss">{() => <MgrRoute component={ProfitLossPage} />}</Route>
              <Route path="/reports/missed-sales">{() => <MgrRoute component={MissedSalesReportPage} />}</Route>
              <Route path="/reports/stock-audit-variance">{() => <MgrRoute component={StockAuditVarianceReportPage} />}</Route>
              <Route path="/reports/customer-ledger">{() => <MgrRoute component={CustomerLedgerPage} />}</Route>
              <Route path="/reports/supplier-ledger">{() => <MgrRoute component={SupplierLedgerPage} />}</Route>
              <Route path="/settings">{() => <MgrRoute component={GeneralSettingsPage} />}</Route>
              <Route path="/settings/users">{() => <AdminRoute component={UserManagementPage} />}</Route>
              <Route path="/settings/masters">{() => <MgrRoute component={MastersPage} />}</Route>
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
