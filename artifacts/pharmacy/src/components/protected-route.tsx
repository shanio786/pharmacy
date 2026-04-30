import { useLocation, Redirect } from "wouter";
import { useAuth } from "@/lib/auth-context";
import type { ReactNode } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [location] = useLocation();

  if (!token) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}
