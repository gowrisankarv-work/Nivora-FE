import { Navigate, Outlet } from "react-router-dom";
import { Spin } from "antd";
import { useAuth } from "./AuthContext";
import type { Role } from "@/api/types";

export function PrivateRoute({ allow }: { allow?: Role[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", marginTop: 100 }}>
        <Spin size="large" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (allow && !allow.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function PlatformRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", marginTop: 100 }}>
        <Spin size="large" />
      </div>
    );
  }
  if (!user || user.scope !== "PLATFORM") return <Navigate to="/platform/login" replace />;
  return <Outlet />;
}
