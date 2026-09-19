import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNavbar from './TopNavbar';

export default function AppLayout({ activeUser, setActiveUser }) {
  return (
    <div className="app-wallpaper-bg min-h-screen flex flex-col font-sans text-slate-900">
      {/* Translucent Frosted Glass Scrim Container */}
      <div className="glass-canvas-scrim min-h-screen flex flex-col flex-1">
        {/* Modern Top Navigation Bar */}
        <TopNavbar activeUser={activeUser} setActiveUser={setActiveUser} />

        {/* Main Fluid Canvas */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
          <Outlet context={{ activeUser, setActiveUser }} />
        </main>
      </div>
    </div>
  );
}
