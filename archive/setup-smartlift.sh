#!/bin/bash

echo "🚀 Setting up SmartLift UI..."

# Create directory structure
echo "📁 Creating folders..."
mkdir -p src/pages/auth
mkdir -p src/pages/internal
mkdir -p src/pages/customer
mkdir -p src/context
mkdir -p src/services
mkdir -p src/components/common
mkdir -p src/components/layout
mkdir -p src/hooks
mkdir -p src/utils

# Create .env.local
echo "🔧 Creating .env.local..."
cat > .env.local << 'EOF'
REACT_APP_AWS_REGION=us-east-1
REACT_APP_COGNITO_USER_POOL_ID=us-east-1_n7bsroYdL
REACT_APP_COGNITO_CLIENT_ID=1hujibm6rksvr9a1d0p8a7ukfp
REACT_APP_API_BASE_URL=http://localhost:3001
EOF

# Update package.json to include react-router-dom
echo "📦 Updating package.json..."
npm install react-router-dom --legacy-peer-deps

# Create index.css
echo "🎨 Creating index.css..."
cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #1f2937;
}

::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-in-out;
}
EOF

# Create App.jsx
echo "⚛️ Creating App.jsx..."
cat > src/App.jsx << 'EOF'
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/common/PrivateRoute';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import InternalDashboard from './pages/internal/Dashboard';
import LeadSearch from './pages/internal/LeadSearch';
import ProspectDetails from './pages/internal/ProspectDetails';
import RouteOptimizer from './pages/internal/RouteOptimizer';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import ServiceRequest from './pages/customer/ServiceRequest';
import MaintenanceHistory from './pages/customer/MaintenanceHistory';
import BillingPayments from './pages/customer/BillingPayments';

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
          <Route path="/internal/routes" element={<PrivateRoute requiredRole="company"><RouteOptimizer /></PrivateRoute>} />
          <Route path="/customer/dashboard" element={<PrivateRoute requiredRole="customer"><CustomerDashboard /></PrivateRoute>} />
          <Route path="/customer/service-request" element={<PrivateRoute requiredRole="customer"><ServiceRequest /></PrivateRoute>} />
          <Route path="/customer/maintenance" element={<PrivateRoute requiredRole="customer"><MaintenanceHistory /></PrivateRoute>} />
          <Route path="/customer/billing" element={<PrivateRoute requiredRole="customer"><BillingPayments /></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
EOF

# Rename old App.js
if [ -f "src/App.js" ]; then
  mv src/App.js src/App.js.old
fi

echo "✅ Setup complete! Now creating component files..."
echo "This will take a moment..."

