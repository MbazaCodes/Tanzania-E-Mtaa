// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { canAccess } from '@/lib/rbac';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: ('citizen' | 'staff' | 'admin')[];
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = ['citizen', 'staff', 'admin'],
  fallback
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!canAccess(user.role as any, requiredRoles)) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-stone-800 mb-2">Access Denied</h2>
          <p className="text-stone-600">You don't have permission to access this page.</p>
          <button 
            onClick={() => window.history.back()}
            className="mt-6 px-6 py-3 bg-stone-800 text-white rounded-2xl"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};