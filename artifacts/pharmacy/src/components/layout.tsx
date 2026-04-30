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
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  User,
  Menu,
} from "lucide-react";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
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
    items: [
      { label: "GRN / Purchase", icon: PackagePlus, href: "/purchases" },
      { label: "Purchase Returns", icon: Package, href: "/purchase-returns" },
      { label: "Sale-Based PO", icon: FileText, href: "/sale-po" },
    ],
  },
  {
    label: "Stock",
    items: [
      { label: "Medicines", icon: Pill, href: "/medicines" },
      { label: "Stock Audit", icon: ClipboardCheck, href: "/stock-audit" },
      { label: "Expiry Alerts", icon: Clock, href: "/expiry-alerts" },
    ],
  },
  {
    label: "Ledger",
    items: [
      { label: "Suppliers", icon: Building2, href: "/suppliers" },
      { label: "Customers", icon: Users, href: "/customers" },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "Sales Report", icon: BarChart2, href: "/reports/sales" },
      { label: "Stock Report", icon: Boxes, href: "/reports/stock" },
      { label: "Purchase Report", icon: Receipt, href: "/reports/purchases" },
      { label: "Expiry Report", icon: Calendar, href: "/reports/expiry" },
      { label: "Controlled Drugs", icon: Shield, href: "/reports/controlled" },
      { label: "Profit & Loss", icon: TrendingUp, href: "/reports/profit-loss" },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "General Settings", icon: Settings, href: "/settings" },
      { label: "User Management", icon: UserCog, href: "/settings/users" },
      { label: "Masters", icon: Database, href: "/settings/masters" },
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
          {navGroups.map((group) => (
            <div key={group.label} className="mb-1">
              {!collapsed && (
                <p className="px-4 py-1.5 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
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
          ))}
        </nav>

        {/* Collapse button */}
        <div className="p-3 border-t border-sidebar-border flex-shrink-0">
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
                  <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
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
