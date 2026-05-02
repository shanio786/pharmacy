import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  ShoppingCart,
  RotateCcw,
  AlertCircle,
  Truck,
  PackagePlus,
  Package,
  FileText,
  Pill,
  ClipboardCheck,
  Clock,
  Building2,
  Users,
  BarChart2,
  Boxes,
  Receipt,
  Calendar,
  Shield,
  TrendingUp,
  Settings,
  UserCog,
  Database,
  ClipboardList,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  User,
  Menu,
} from "lucide-react";

type Role = "admin" | "manager" | "cashier";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  minRole?: Role;
}

interface NavGroup {
  label: string;
  minRole?: Role;
  items: NavItem[];
}

const ROLE_RANK: Record<Role, number> = { cashier: 0, manager: 1, admin: 2 };
const ROLE_DISPLAY: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  cashier: "Cashier",
};

function hasAccess(userRole: string, minRole?: Role) {
  if (!minRole) return true;
  return (ROLE_RANK[userRole as Role] ?? 0) >= ROLE_RANK[minRole];
}

function getRoleDisplay(role?: string) {
  return ROLE_DISPLAY[(role as Role) ?? "cashier"] ?? role ?? "Cashier";
}

const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/" },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "POS / Billing", icon: ShoppingCart, href: "/pos" },
      { label: "Sale Returns", icon: RotateCcw, href: "/sale-returns" },
      { label: "Missed Sales", icon: AlertCircle, href: "/missed-sales" },
      { label: "Home Delivery", icon: Truck, href: "/deliveries" },
    ],
  },
  {
    label: "Purchases",
    minRole: "manager",
    items: [
      { label: "GRN / Purchase", icon: PackagePlus, href: "/purchases" },
      { label: "Purchase Returns", icon: Package, href: "/purchase-returns" },
      { label: "Sale-Based PO", icon: FileText, href: "/sale-po" },
    ],
  },
  {
    label: "Stock",
    minRole: "manager",
    items: [
      { label: "Medicines", icon: Pill, href: "/medicines" },
      { label: "Stock Audit", icon: ClipboardCheck, href: "/stock-audit" },
      { label: "Expiry Alerts", icon: Clock, href: "/expiry-alerts" },
    ],
  },
  {
    label: "Ledger",
    minRole: "manager",
    items: [
      { label: "Suppliers", icon: Building2, href: "/suppliers" },
      { label: "Customers", icon: Users, href: "/customers" },
    ],
  },
  {
    label: "Reports",
    minRole: "manager",
    items: [
      { label: "Sales Report", icon: BarChart2, href: "/reports/sales" },
      { label: "Stock Report", icon: Boxes, href: "/reports/stock" },
      { label: "Purchase Report", icon: Receipt, href: "/reports/purchases" },
      { label: "Expiry Report", icon: Calendar, href: "/reports/expiry" },
      { label: "Controlled Drugs", icon: Shield, href: "/reports/controlled" },
      { label: "Profit & Loss", icon: TrendingUp, href: "/reports/profit-loss" },
      { label: "Missed Sales", icon: AlertCircle, href: "/reports/missed-sales" },
      { label: "Audit Variance", icon: ClipboardList, href: "/reports/stock-audit-variance" },
      { label: "Customer Ledger", icon: BookOpen, href: "/reports/customer-ledger" },
      { label: "Supplier Ledger", icon: BookOpen, href: "/reports/supplier-ledger" },
    ],
  },
  {
    label: "Settings",
    minRole: "manager",
    items: [
      { label: "General Settings", icon: Settings, href: "/settings" },
      { label: "User Management", icon: UserCog, href: "/settings/users", minRole: "admin" },
      { label: "Masters", icon: Database, href: "/settings/masters" },
      { label: "Backup & Restore", icon: Database, href: "/settings/backup", minRole: "admin" },
    ],
  },
];

export function Layout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-200 flex-shrink-0",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-14 px-4 border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Pill className="w-4 h-4" />
            </div>
            {!collapsed && (
              <span className="font-bold text-base truncate">PharmaCare</span>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
          {navGroups.filter((g) => hasAccess(user?.role ?? "cashier", g.minRole)).map((group) => {
            const visibleItems = group.items.filter((i) => hasAccess(user?.role ?? "cashier", i.minRole));
            if (!visibleItems.length) return null;
            return (
              <div key={group.label} className="mb-1">
                {!collapsed && (
                  <p className="px-4 py-1.5 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                    {group.label}
                  </p>
                )}
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-testid={`nav-${item.href.replace(/\//g, "-")}`}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2 mx-2 rounded-lg text-sm font-medium transition-colors",
                        active
                          ? "bg-white text-primary"
                          : "text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Logout + Collapse */}
        <div className="p-3 border-t border-sidebar-border flex-shrink-0 space-y-1">
          <button
            onClick={logout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-red-300 hover:bg-red-500/20 hover:text-red-200",
              collapsed && "justify-center px-2"
            )}
            data-testid="button-logout-sidebar"
            title="Logout"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-white/10 transition-colors text-sidebar-foreground/70"
            data-testid="button-collapse-sidebar"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center h-14 px-4 border-b bg-card gap-4 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-medium text-muted-foreground">
              PharmaCare Management System
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              data-testid="button-theme-toggle"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2" data-testid="button-user-menu">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-xs text-primary-foreground font-medium">
                      {user?.fullName?.charAt(0)?.toUpperCase() ?? "U"}
                    </span>
                  </div>
                  <span className="hidden sm:block text-sm">{user?.fullName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{user?.fullName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{getRoleDisplay(user?.role)}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive cursor-pointer"
                  onClick={logout}
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
