import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../store/auth.store";
import { getRoleDashboardPath } from "../../utils/helpers";
import type { Role } from "../../types";

interface ProtectedRouteProps {
  allowedRoles: Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth/login" replace />;
  }

  const userRole = user.role?.toLowerCase() as Role;

  if (!allowedRoles.map((r) => r.toLowerCase()).includes(userRole)) {
    return <Navigate to={getRoleDashboardPath(userRole)} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
