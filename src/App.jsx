import React from 'react';
import InternalLayout from './components/internal/InternalLayout';
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
import Proposals from './pages/internal/Proposals';
import WorkOrders from './pages/internal/WorkOrders';
import MaintenanceScheduling from './pages/internal/MaintenanceScheduling';
import Invoices from './pages/internal/Invoices';
import EquipmentRegistry from './pages/internal/EquipmentRegistry';
import InternalDocuments from './pages/internal/Documents';
import BuildingRegistry from './pages/internal/BuildingRegistry';
import Profile from './pages/internal/Profile';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import MyElevators from './pages/customer/MyElevators';
import ServiceRequest from './pages/customer/ServiceRequest';
import MaintenanceHistory from './pages/customer/MaintenanceHistory';
import BillingPayments from './pages/customer/BillingPayments';
import Documents from './pages/customer/Documents';
import Support from './pages/customer/Support';
import AskSmarterlift from './pages/customer/AskSmarterlift';
import ElevatorHistory from './pages/customer/ElevatorHistory';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTenants from './pages/admin/AdminTenants';
import AdminActivity from './pages/admin/AdminActivity';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/internal/dashboard" element={<PrivateRoute requiredRole="company"><InternalLayout><InternalDashboard /></InternalLayout></PrivateRoute>} />
          <Route path="/internal/leads" element={<PrivateRoute requiredRole="company"><InternalLayout><LeadSearch /></InternalLayout></PrivateRoute>} />
          <Route path="/internal/prospect/:id" element={<PrivateRoute requiredRole="company"><InternalLayout><ProspectDetails /></InternalLayout></PrivateRoute>} />
          <Route path="/internal/customers" element={<PrivateRoute requiredRole="company"><InternalLayout><CustomerManagement /></InternalLayout></PrivateRoute>} />
          <Route path="/internal/analytics" element={<PrivateRoute requiredRole="company"><InternalLayout><Analytics /></InternalLayout></PrivateRoute>} />
          <Route path="/internal/routes" element={<PrivateRoute requiredRole="company"><InternalLayout><RouteOptimizer /></InternalLayout></PrivateRoute>} />
          <Route path="/internal/team" element={<PrivateRoute requiredRole="company"><InternalLayout><TeamManagement /></InternalLayout></PrivateRoute>} />
          <Route path="/internal/profile" element={<PrivateRoute requiredRole="company"><InternalLayout><Profile /></InternalLayout></PrivateRoute>} />
          <Route path="/internal/pipeline" element={<PrivateRoute requiredRole="company"><InternalLayout><Pipeline /></InternalLayout></PrivateRoute>} />
          <Route path="/internal/proposals" element={<PrivateRoute requiredRole="company"><InternalLayout><Proposals /></InternalLayout></PrivateRoute>} />
          <Route path="/internal/work-orders" element={<PrivateRoute requiredRole="company"><InternalLayout><WorkOrders /></InternalLayout></PrivateRoute>} />
          <Route path="/internal/maintenance-scheduling" element={<PrivateRoute requiredRole="company"><InternalLayout><MaintenanceScheduling /></InternalLayout></PrivateRoute>} />
          <Route path="/internal/invoices" element={<PrivateRoute requiredRole="company"><InternalLayout><Invoices /></InternalLayout></PrivateRoute>} />
          <Route path="/internal/equipment" element={<PrivateRoute requiredRole="company"><InternalLayout><EquipmentRegistry /></InternalLayout></PrivateRoute>} />
          <Route path="/internal/documents" element={<PrivateRoute requiredRole="company"><InternalLayout><InternalDocuments /></InternalLayout></PrivateRoute>} />
          <Route path="/internal/tdlr" element={<PrivateRoute requiredRole="company"><InternalLayout><BuildingRegistry /></InternalLayout></PrivateRoute>} />
          <Route path="/customer/dashboard" element={<PrivateRoute requiredRole="customer"><CustomerDashboard /></PrivateRoute>} />
          <Route path="/customer/elevators" element={<PrivateRoute requiredRole="customer"><MyElevators /></PrivateRoute>} />
          <Route path="/customer/service-request" element={<PrivateRoute requiredRole="customer"><ServiceRequest /></PrivateRoute>} />
          <Route path="/customer/maintenance" element={<PrivateRoute requiredRole="customer"><MaintenanceHistory /></PrivateRoute>} />
          <Route path="/customer/billing" element={<PrivateRoute requiredRole="customer"><BillingPayments /></PrivateRoute>} />
          <Route path="/customer/documents" element={<PrivateRoute requiredRole="customer"><Documents /></PrivateRoute>} />
          <Route path="/customer/support" element={<PrivateRoute requiredRole="customer"><Support /></PrivateRoute>} />
          <Route path="/customer/ask" element={<PrivateRoute requiredRole="customer"><AskSmarterlift /></PrivateRoute>} />
          <Route path="/customer/elevator/:id/history" element={<PrivateRoute requiredRole="customer"><ElevatorHistory /></PrivateRoute>} />
          {/* Platform admin console — gated to SuperAdmin role only */}
          <Route path="/admin/dashboard" element={<PrivateRoute requiredRole="super_admin"><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/tenants"   element={<PrivateRoute requiredRole="super_admin"><AdminTenants /></PrivateRoute>} />
          <Route path="/admin/activity"  element={<PrivateRoute requiredRole="super_admin"><AdminActivity /></PrivateRoute>} />
          <Route path="/admin"           element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
