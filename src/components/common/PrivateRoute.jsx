import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const PrivateRoute = ({ children, requiredRole }) => {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900"><LoadingSpinner size="large" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && user?.role !== requiredRole) {
    const redirectPath = user?.role === 'company' ? '/internal/dashboard' : '/customer/dashboard';
    return <Navigate to={redirectPath} replace />;
  }
  return children;
};

export default PrivateRoute;
