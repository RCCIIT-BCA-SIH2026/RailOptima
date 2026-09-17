import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

export default function AppLayout({ activeUser, setActiveUser }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Enterprise Header */}
      <Header 
        activeUser={activeUser} 
        setActiveUser={setActiveUser} 
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} 
      />

      {/* Main Workspace: Sidebar + White Content Canvas */}
      <div className="flex flex-1 overflow-hidden">
        {/* Dark Navy Sidebar */}
        <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />

        {/* Crisp White / Slate-50 Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6 pb-20">
          <Outlet context={{ activeUser, setActiveUser }} />
        </main>
      </div>
    </div>
  );
}

