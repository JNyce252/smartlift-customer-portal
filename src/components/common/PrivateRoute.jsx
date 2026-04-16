import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const PrivateRoute = ({ children, requiredRole }) => {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900"><LoadingSpinner size="large" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole) {
    const internalRoles = ['owner', 'technician', 'sales', 'staff', 'company'];
    const isInternal = internalRoles.includes(user?.role);
    const isCustomer = user?.role === 'customer';
    if (requiredRole === 'company' && !isInternal) return <Navigate to="/customer/dashboard" replace />;
    if (requiredRole === 'customer' && !isCustomer) return <Navigate to="/internal/dashboard" replace />;
  }
  return children;
};

export default PrivateRoute;
