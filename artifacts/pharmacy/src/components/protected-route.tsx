import { useLocation, Redirect } from "wouter";
import { useAuth } from "@/lib/auth-context";
import type { ReactNode } from "react";

type Role = "admin" | "manager" | "cashier";
const ROLE_RANK: Record<Role, number> = { cashier: 0, manager: 1, admin: 2 };

interface Props {
  children: ReactNode;
  minRole?: Role;
}

export function ProtectedRoute({ children, minRole }: Props) {
  const { token, user } = useAuth();
  const [location] = useLocation();

  if (!token) {
    return <Redirect to="/login" />;
  }

  if (minRole) {
    const userRank = ROLE_RANK[(user?.role as Role) ?? "cashier"] ?? 0;
    const required = ROLE_RANK[minRole];
    if (userRank < required) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-2">
          <p className="text-lg font-semibold text-destructive">Access Denied</p>
          <p className="text-sm text-muted-foreground">
            This page requires <span className="font-medium capitalize">{minRole}</span> access or higher.
          </p>
        </div>
      );
    }
  }

  void location;
  return <>{children}</>;
}
