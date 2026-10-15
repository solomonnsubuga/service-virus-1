import React, { useState } from 'react';
import { ClinicProvider, useClinic } from './context/ClinicContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/layout/Sidebar';
import { RoleSwitcherModal } from './components/common/RoleSwitcherModal';
import { InventoryManagementModal } from './components/inventory/InventoryManagementModal';
import { AuthPortal } from './components/auth/AuthPortal';
import { AdminDashboard } from './components/dashboards/AdminDashboard';
import { DoctorDashboard } from './components/dashboards/DoctorDashboard';
import { PharmacyDashboard } from './components/dashboards/PharmacyDashboard';
import { NursingDashboard } from './components/dashboards/NursingDashboard';
import { PathologyDashboard } from './components/dashboards/PathologyDashboard';
import { RadiologyDashboard } from './components/dashboards/RadiologyDashboard';
import { ReceptionDashboard } from './components/dashboards/ReceptionDashboard';
import { AccountantDashboard } from './components/dashboards/AccountantDashboard';
import { StoreDashboard } from './components/dashboards/StoreDashboard';
import { MedicalRecordsDashboard } from './components/dashboards/MedicalRecordsDashboard';

import { ShieldCheck, ArrowLeft, Lock } from 'lucide-react';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';

const MainLayout: React.FC = () => {
  const {
    isAuthenticated,
    currentUser,
    activeDashboard,
    setActiveDashboard,
    canAccessDashboard
  } = useClinic();
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // If user is not signed into a clinic account, display the Auth & Onboarding Portal
  if (!isAuthenticated) {
    return (
      <>
        <AuthPortal />
        <OfflineIndicator />
      </>
    );
  }

  // Strictly enforce that non-admin users only view and operate within their assigned role dashboard
  const effectiveDashboard = canAccessDashboard(activeDashboard)
    ? activeDashboard
    : currentUser.role;

  // Render dashboard corresponding to the authorized active dashboard
  const renderDashboard = () => {
    switch (effectiveDashboard) {
      case 'admin':
        return (
          <AdminDashboard
            onOpenInventory={() => setInventoryModalOpen(true)}
            onOpenRoleSwitcher={() => setRoleModalOpen(true)}
          />
        );
      case 'doctor':
        return <DoctorDashboard />;
      case 'pharmacy':
        return <PharmacyDashboard onOpenInventory={() => setInventoryModalOpen(true)} />;
      case 'nursing':
        return <NursingDashboard onOpenInventory={() => setInventoryModalOpen(true)} />;
      case 'pathology':
        return <PathologyDashboard onOpenInventory={() => setInventoryModalOpen(true)} />;
      case 'radiology':
        return <RadiologyDashboard onOpenInventory={() => setInventoryModalOpen(true)} />;
      case 'reception':
        return <ReceptionDashboard />;
      case 'accountant':
        return <AccountantDashboard />;
      case 'store_manager':
        return <StoreDashboard onOpenInventory={() => setInventoryModalOpen(true)} />;
      case 'medical_records':
        return <MedicalRecordsDashboard />;
      default:
        return (
          <AdminDashboard
            onOpenInventory={() => setInventoryModalOpen(true)}
            onOpenRoleSwitcher={() => setRoleModalOpen(true)}
          />
        );
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] font-sans overflow-hidden select-none">
      <OfflineIndicator />
      {/* Deep Slate Sidebar navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenInventory={() => setInventoryModalOpen(true)}
        onOpenRoleSwitcher={() => setRoleModalOpen(true)}
      />

      {/* Main Workspace Area with Top Bar & Scrollable Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          onOpenRoleSwitcher={() => setRoleModalOpen(true)}
          onOpenInventory={() => setInventoryModalOpen(true)}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto space-y-6">
            {currentUser.role === 'admin' && effectiveDashboard !== 'admin' && (
              <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl border border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase text-[10px] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Role Maintained: {currentUser.role.toUpperCase()} (Level {currentUser.clearanceLevel})
                  </span>
                  <span className="text-slate-300">
                    Inspecting <strong className="text-white uppercase">{effectiveDashboard.replace('_', ' ')}</strong> module as <strong>{currentUser.name}</strong>. Your administrative role and clearance level remain unchanged.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDashboard('admin')}
                  className="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-600 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Return to Admin Overview
                </button>
              </div>
            )}

            {currentUser.role !== 'admin' && (
              <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-slate-600">
                    Active Role Session: <strong className="text-slate-900 uppercase">{currentUser.role.replace('_', ' ')}</strong> &bull; Security Clearance: <strong className="text-emerald-700">Level {currentUser.clearanceLevel}</strong> ({currentUser.clearance})
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-500">
                  Restricted to {currentUser.role.replace('_', ' ').toUpperCase()} role functions
                </span>
              </div>
            )}

            {renderDashboard()}
          </div>
        </main>
      </div>

      {/* Role / Security Clearance Switcher Modal */}
      <RoleSwitcherModal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
      />

      {/* Central Multi-Clinic Inventory Management Modal */}
      <InventoryManagementModal
        isOpen={inventoryModalOpen}
        onClose={() => setInventoryModalOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <ClinicProvider>
      <MainLayout />
    </ClinicProvider>
  );
}

export default App;
