import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import CustomerLayout from './components/CustomerLayout'
import InternalLayout from './components/InternalLayout'

// Customer Portal Pages
import CustomerDashboard from './pages/customer/Dashboard'
import Elevators from './pages/customer/Elevators'
import ServiceRequests from './pages/customer/ServiceRequests'
import MaintenanceHistory from './pages/customer/MaintenanceHistory'
import Billing from './pages/customer/Billing'

// Internal Portal Pages
import LeadSearch from './pages/internal/LeadSearch'
import ProspectIntelligence from './pages/internal/ProspectIntelligence'
import CustomerManagement from './pages/internal/CustomerManagement'
import Analytics from './pages/internal/Analytics'
import RouteOptimization from './pages/internal/RouteOptimization'
import TeamManagement from './pages/internal/TeamManagement'

function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect root to customer portal */}
        <Route path="/" element={<Navigate to="/customer/dashboard" replace />} />
        
        {/* Customer Portal Routes */}
        <Route path="/customer" element={<CustomerLayout />}>
          <Route index element={<Navigate to="/customer/dashboard" replace />} />
          <Route path="dashboard" element={<CustomerDashboard />} />
          <Route path="elevators" element={<Elevators />} />
          <Route path="service-requests" element={<ServiceRequests />} />
          <Route path="maintenance" element={<MaintenanceHistory />} />
          <Route path="billing" element={<Billing />} />
        </Route>

        {/* Internal Portal Routes */}
        <Route path="/internal" element={<InternalLayout />}>
          <Route index element={<Navigate to="/internal/leads" replace />} />
          <Route path="leads" element={<LeadSearch />} />
          <Route path="prospect/:id" element={<ProspectIntelligence />} />
          <Route path="customers" element={<CustomerManagement />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="routes" element={<RouteOptimization />} />
          <Route path="team" element={<TeamManagement />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
