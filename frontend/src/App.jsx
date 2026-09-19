import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

// Layout & Shell Components
import AppLayout from './components/AppLayout';
import RouteGuard from './components/RouteGuard';

// View Components
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import MaintenanceView from './views/MaintenanceView';
import DefectsView from './views/DefectsView';
import AssetsView from './views/AssetsView';
import TrainsView from './views/TrainsView';
import BlocksView from './views/BlocksView';
import BlockPlanningView from './views/BlockPlanningView';
import AIPlanningView from './views/AIPlanningView';
import WhatIfView from './views/WhatIfView';
import ResourcesView from './views/ResourcesView';
import ApprovalsView from './views/ApprovalsView';
import AlertsView from './views/AlertsView';
import ReportsView from './views/ReportsView';
import SettingsView from './views/SettingsView';
import AIReviewView from './views/AIReviewView';
import OptimizationStudioView from './views/OptimizationStudioView';
import DepartmentCoordinationView from './views/DepartmentCoordinationView';
import CorridorMapView from './views/CorridorMapView';
import IntegrationsHubView from './views/IntegrationsHubView';
import AuditLogsView from './views/AuditLogsView';
import WeeklyMonthlyPlannerView from './views/WeeklyMonthlyPlannerView';

function OptimizationStudioRouteWrapper() {
  const navigate = useNavigate();
  return <OptimizationStudioView onNavigate={(path) => navigate(`/${path}`)} />;
}

export default function App() {
  const [activeUser, setActiveUser] = useState(() => {
    const savedName = localStorage.getItem('ir_user_name');
    if (savedName) {
      return {
        full_name: savedName,
        role: localStorage.getItem('ir_user_role') || 'DRM',
        department: localStorage.getItem('ir_user_dept') || 'GEN'
      };
    }
    return {
      full_name: "Divisional Railway Manager",
      role: "DRM",
      department: "OPERATIONS"
    };
  });

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<LoginView setActiveUser={setActiveUser} />} />

        {/* Protected Enterprise Layout */}
        <Route element={<AppLayout activeUser={activeUser} setActiveUser={setActiveUser} />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          {/* Operations & Core Routes */}
          <Route path="/dashboard" element={<RouteGuard path="/dashboard" activeUser={activeUser}><DashboardView /></RouteGuard>} />
          <Route path="/maintenance" element={<RouteGuard path="/maintenance" activeUser={activeUser}><MaintenanceView /></RouteGuard>} />
          <Route path="/defects" element={<RouteGuard path="/defects" activeUser={activeUser}><DefectsView /></RouteGuard>} />
          <Route path="/assets" element={<RouteGuard path="/assets" activeUser={activeUser}><AssetsView /></RouteGuard>} />
          <Route path="/trains" element={<RouteGuard path="/trains" activeUser={activeUser}><TrainsView /></RouteGuard>} />
          <Route path="/blocks" element={<RouteGuard path="/blocks" activeUser={activeUser}><BlocksView /></RouteGuard>} />

          {/* AI Planning Studio Routes */}
          <Route path="/optimization-studio" element={<RouteGuard path="/optimization-studio" activeUser={activeUser}><OptimizationStudioRouteWrapper /></RouteGuard>} />
          <Route path="/ai-planning" element={<RouteGuard path="/ai-planning" activeUser={activeUser}><AIPlanningView /></RouteGuard>} />
          <Route path="/block-planning" element={<RouteGuard path="/block-planning" activeUser={activeUser}><BlockPlanningView /></RouteGuard>} />
          <Route path="/what-if" element={<RouteGuard path="/what-if" activeUser={activeUser}><WhatIfView /></RouteGuard>} />
          <Route path="/resources" element={<RouteGuard path="/resources" activeUser={activeUser}><ResourcesView /></RouteGuard>} />
          <Route path="/weekly-planner" element={<RouteGuard path="/weekly-planner" activeUser={activeUser}><WeeklyMonthlyPlannerView /></RouteGuard>} />

          {/* Coordination & GIS Routes */}
          <Route path="/department-coordination" element={<RouteGuard path="/department-coordination" activeUser={activeUser}><DepartmentCoordinationView /></RouteGuard>} />
          <Route path="/corridor-map" element={<RouteGuard path="/corridor-map" activeUser={activeUser}><CorridorMapView /></RouteGuard>} />
          <Route path="/integrations" element={<RouteGuard path="/integrations" activeUser={activeUser}><IntegrationsHubView /></RouteGuard>} />

          {/* Governance & Compliance Routes */}
          <Route path="/approvals" element={<RouteGuard path="/approvals" activeUser={activeUser}><ApprovalsView /></RouteGuard>} />
          <Route path="/alerts" element={<RouteGuard path="/alerts" activeUser={activeUser}><AlertsView /></RouteGuard>} />
          <Route path="/reports" element={<RouteGuard path="/reports" activeUser={activeUser}><ReportsView /></RouteGuard>} />
          <Route path="/settings" element={<RouteGuard path="/settings" activeUser={activeUser}><SettingsView /></RouteGuard>} />
          <Route path="/ai-review" element={<RouteGuard path="/ai-review" activeUser={activeUser}><AIReviewView /></RouteGuard>} />
          <Route path="/audit-logs" element={<RouteGuard path="/audit-logs" activeUser={activeUser}><AuditLogsView /></RouteGuard>} />

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
