import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/common/PrivateRoute';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import InternalDashboard from './pages/internal/Dashboard';
import LeadSearch from './pages/internal/LeadSearch';
import ProspectDetails from './pages/internal/ProspectDetails';
import CustomerManagement from './pages/internal/CustomerManagement';
import Analytics from './pages/internal/Analytics';
import RouteOptimizer from './pages/internal/RouteOptimizer';
import TeamManagement from './pages/internal/TeamManagement';
import Pipeline from './pages/internal/Pipeline';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import MyElevators from './pages/customer/MyElevators';
import ServiceRequest from './pages/customer/ServiceRequest';
import MaintenanceHistory from './pages/customer/MaintenanceHistory';
import BillingPayments from './pages/customer/BillingPayments';
import Documents from './pages/customer/Documents';
import Support from './pages/customer/Support';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/internal/dashboard" element={<PrivateRoute requiredRole="company"><InternalDashboard /></PrivateRoute>} />
          <Route path="/internal/leads" element={<PrivateRoute requiredRole="company"><LeadSearch /></PrivateRoute>} />
          <Route path="/internal/prospect/:id" element={<PrivateRoute requiredRole="company"><ProspectDetails /></PrivateRoute>} />
          <Route path="/internal/customers" element={<PrivateRoute requiredRole="company"><CustomerManagement /></PrivateRoute>} />
          <Route path="/internal/analytics" element={<PrivateRoute requiredRole="company"><Analytics /></PrivateRoute>} />
          <Route path="/internal/routes" element={<PrivateRoute requiredRole="company"><RouteOptimizer /></PrivateRoute>} />
          <Route path="/internal/team" element={<PrivateRoute requiredRole="company"><TeamManagement /></PrivateRoute>} />
          <Route path="/internal/pipeline" element={<PrivateRoute requiredRole="company"><Pipeline /></PrivateRoute>} />
          <Route path="/customer/dashboard" element={<PrivateRoute requiredRole="customer"><CustomerDashboard /></PrivateRoute>} />
          <Route path="/customer/elevators" element={<PrivateRoute requiredRole="customer"><MyElevators /></PrivateRoute>} />
          <Route path="/customer/service-request" element={<PrivateRoute requiredRole="customer"><ServiceRequest /></PrivateRoute>} />
          <Route path="/customer/maintenance" element={<PrivateRoute requiredRole="customer"><MaintenanceHistory /></PrivateRoute>} />
          <Route path="/customer/billing" element={<PrivateRoute requiredRole="customer"><BillingPayments /></PrivateRoute>} />
          <Route path="/customer/documents" element={<PrivateRoute requiredRole="customer"><Documents /></PrivateRoute>} />
          <Route path="/customer/support" element={<PrivateRoute requiredRole="customer"><Support /></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
