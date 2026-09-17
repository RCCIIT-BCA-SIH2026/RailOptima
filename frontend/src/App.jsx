import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layout & Shell Components
import AppLayout from './components/AppLayout';
import RouteGuard from './components/RouteGuard';

// View Components (All 15 Routes)
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
          <Route path="/dashboard" element={<RouteGuard path="/dashboard" activeUser={activeUser}><DashboardView /></RouteGuard>} />
          <Route path="/maintenance" element={<RouteGuard path="/maintenance" activeUser={activeUser}><MaintenanceView /></RouteGuard>} />
          <Route path="/defects" element={<RouteGuard path="/defects" activeUser={activeUser}><DefectsView /></RouteGuard>} />
          <Route path="/assets" element={<RouteGuard path="/assets" activeUser={activeUser}><AssetsView /></RouteGuard>} />
          <Route path="/trains" element={<RouteGuard path="/trains" activeUser={activeUser}><TrainsView /></RouteGuard>} />
          <Route path="/blocks" element={<RouteGuard path="/blocks" activeUser={activeUser}><BlocksView /></RouteGuard>} />
          <Route path="/block-planning" element={<RouteGuard path="/block-planning" activeUser={activeUser}><BlockPlanningView /></RouteGuard>} />
          <Route path="/ai-planning" element={<RouteGuard path="/ai-planning" activeUser={activeUser}><AIPlanningView /></RouteGuard>} />
          <Route path="/what-if" element={<RouteGuard path="/what-if" activeUser={activeUser}><WhatIfView /></RouteGuard>} />
          <Route path="/resources" element={<RouteGuard path="/resources" activeUser={activeUser}><ResourcesView /></RouteGuard>} />
          <Route path="/approvals" element={<RouteGuard path="/approvals" activeUser={activeUser}><ApprovalsView /></RouteGuard>} />
          <Route path="/alerts" element={<RouteGuard path="/alerts" activeUser={activeUser}><AlertsView /></RouteGuard>} />
          <Route path="/reports" element={<RouteGuard path="/reports" activeUser={activeUser}><ReportsView /></RouteGuard>} />
          <Route path="/settings" element={<RouteGuard path="/settings" activeUser={activeUser}><SettingsView /></RouteGuard>} />
          <Route path="/ai-review" element={<RouteGuard path="/ai-review" activeUser={activeUser}><AIReviewView /></RouteGuard>} />

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
