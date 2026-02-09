# SmartLift - Elevator Service Management Application

A comprehensive dual-portal application for managing elevator service operations.

## Features

### Customer Portal (Blue Theme)
- **Dashboard** - Overview of all elevator systems with service statistics
- **Elevators** - Monitor and manage individual elevator units
- **Service Requests** - Submit and track service issues
- **Maintenance History** - Complete maintenance records and history
- **Billing** - Invoice management and payment tracking

### Internal Portal (Purple Theme)
- **Lead Search** - AI-powered prospect discovery and search
- **Prospect Intelligence** - Detailed company insights and lead scoring
- **Customer Management** - Comprehensive customer account management
- **Analytics** - Business metrics and performance tracking
- **Route Optimization** - Technician route planning and optimization
- **Team Management** - Job assignment and team coordination

## Tech Stack

- **React** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Navigation and routing
- **Tailwind CSS** - Styling and responsive design
- **Lucide React** - Icon library

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure
```
smartlift-app/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── main.jsx              # Application entry point
│   ├── App.jsx               # Main app with routing
│   ├── index.css             # Global styles
│   ├── components/
│   │   ├── CustomerLayout.jsx    # Customer portal layout
│   │   └── InternalLayout.jsx    # Internal portal layout
│   └── pages/
│       ├── customer/              # Customer portal pages
│       │   ├── Dashboard.jsx
│       │   ├── Elevators.jsx
│       │   ├── ServiceRequests.jsx
│       │   ├── MaintenanceHistory.jsx
│       │   └── Billing.jsx
│       └── internal/              # Internal portal pages
│           ├── LeadSearch.jsx
│           ├── ProspectIntelligence.jsx
│           ├── CustomerManagement.jsx
│           ├── Analytics.jsx
│           ├── RouteOptimization.jsx
│           └── TeamManagement.jsx
```

## Deployment

This application is configured for deployment on AWS Amplify.

## License

Private - All Rights Reserved
