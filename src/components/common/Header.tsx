import React, { useState } from 'react';
import { useClinic, getUserRoles, userHasRole } from '../../context/ClinicContext';
import { UserRole } from '../../types';
import {
  Building2,
  ShieldCheck,
  Bell,
  RotateCcw,
  Layers,
  Menu,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Mail,
  LogOut,
  UserCheck
} from 'lucide-react';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface HeaderProps {
  onOpenRoleSwitcher: () => void;
  onOpenInventory: () => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenRoleSwitcher,
  onOpenInventory,
  onToggleSidebar
}) => {
  const {
    activeClinic,
    currentUser,
    activeDashboard,
    setActiveDashboard,
    canAccessDashboard,
    inventory,
    resetToDefaultData,
    logoutUser
  } = useClinic();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const assignedRoles = getUserRoles(currentUser);
  const isAdmin = userHasRole(currentUser, 'admin');

  const effectiveDashboard = canAccessDashboard(activeDashboard)
    ? activeDashboard
    : currentUser.role;

  // Compute critical stock alerts
  const lowStockItems = inventory.filter(
    i => i.clinicId === activeClinic.id && i.totalQuantity <= i.reorderLevel
  );

  const getDashboardTitle = () => {
    switch (effectiveDashboard) {
      case 'admin': return 'Enterprise Administration';
      case 'doctor': return 'Clinical Consultation & RX Suite';
      case 'pharmacy': return 'Central Pharmacy & Dispensary';
      case 'nursing': return 'Nursing Ward & Consumables';
      case 'pathology': return 'Pathology & Diagnostic Laboratory';
      case 'radiology': return 'Radiology Imaging & PACS';
      case 'reception': return 'Patient Admissions & Triage';
      case 'accountant': return 'Financial Billing & Revenue';
      case 'store_manager': return 'Central Medical Store & Warehouse';
      case 'medical_records': return 'Medical Records & Clinical Intelligence Hub';
      default: return 'Hospital Management Dashboard';
    }
  };

  const getClearanceBadgeColor = (level: number) => {
    switch (level) {
      case 5: return 'bg-rose-100 text-rose-700';
      case 4: return 'bg-blue-100 text-blue-700';
      case 3: return 'bg-emerald-100 text-emerald-700';
      case 2: return 'bg-sky-100 text-sky-700';
      case 1: default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      
      {/* LEFT ZONE: Mobile Menu Toggle, Clinic Facility Dropdown & Section Title */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 lg:hidden cursor-pointer shrink-0"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Active Facility Badge (Static Display to Maintain Data Privacy & Strict Clinic Isolation) */}
        <div className="bg-slate-100/90 border border-slate-200/80 rounded-md px-3 py-1.5 text-xs font-semibold text-slate-800 flex items-center gap-2 select-none shadow-2xs">
          {activeClinic.logoUrl ? (
            <img
              src={activeClinic.logoUrl}
              alt={activeClinic.name}
              className="w-4 h-4 object-contain rounded shrink-0 bg-white p-0.5 border border-slate-200"
            />
          ) : (
            <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          )}
          <span className="truncate max-w-[130px] sm:max-w-[210px]" title={activeClinic.name}>
            {activeClinic.name}
          </span>
          {activeClinic.code && (
            <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-white text-slate-600 border border-slate-200">
              {activeClinic.code}
            </span>
          )}
        </div>

        <div className="hidden sm:block h-6 w-px bg-slate-200"></div>

        <h2 className="hidden md:block text-sm font-bold text-slate-800 truncate">
          {getDashboardTitle()}
        </h2>
      </div>

      {/* RIGHT ZONE: Quick Actions, Alerts, Clearance Badge & Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">

        {/* PWA Gadget Install Button */}
        <PWAInstallButton variant="header" />

        {/* Stock Alerts Quick Button */}
        <button
          onClick={onOpenInventory}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs transition-colors"
        >
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span>Inventory</span>
          {lowStockItems.length > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
              {lowStockItems.length} Low
            </span>
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors cursor-pointer relative"
            title="System Alerts"
          >
            <Bell className="w-4 h-4" />
            {lowStockItems.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 p-3 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-bold text-slate-900">
                <span>Facility Stock Alerts</span>
                <span className="text-[10px] font-normal text-slate-500">{activeClinic.code}</span>
              </div>
              <div className="py-2 space-y-2 max-h-64 overflow-y-auto">
                {lowStockItems.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                    <div className="font-bold text-amber-800 flex items-center gap-1 text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Reorder Threshold Triggered
                    </div>
                    <p className="text-[11px] mt-1 text-amber-700">
                      {lowStockItems.length} item(s) below safety stock limit in {activeClinic.name}.
                    </p>
                  </div>
                )}
                {lowStockItems.length === 0 && (
                  <div className="py-4 text-center text-slate-500 text-xs">
                    All branch inventory and stock levels are optimal.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Demo Reset Button (Admin Only) */}
        {isAdmin && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowResetConfirm(!showResetConfirm)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              title="Reset Demonstration Data"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {showResetConfirm && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 p-3 z-50 text-xs">
                <div className="font-bold text-slate-900 mb-1">Reset Sample Data?</div>
                <p className="text-slate-600 text-[11px] mb-3">
                  Restores all clinics, inventory batches, prescriptions, lab results, and patient ledgers to defaults.
                </p>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetToDefaultData();
                      setShowResetConfirm(false);
                    }}
                    className="px-2.5 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-bold"
                  >
                    Reset Now
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Multi-Role Switcher Bar (when user has 2 or 3 assigned roles) */}
        {assignedRoles.length > 1 && (
          <div className="hidden xl:flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-1">
            {assignedRoles.map(role => {
              const isCurrent = effectiveDashboard === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setActiveDashboard(role)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                  title={`Switch to your assigned ${role.replace('_', ' ')} dashboard`}
                >
                  {role.replace('_', ' ')}
                </button>
              );
            })}
          </div>
        )}

        <div className="h-6 w-px bg-slate-200"></div>

        {/* User Profile & Clearance Badge */}
        <button
          onClick={onOpenRoleSwitcher}
          className="flex items-center gap-2.5 text-left hover:opacity-90 transition-opacity cursor-pointer"
          title={`Assigned Roles (${assignedRoles.length}/3): ${assignedRoles
            .map(r => r.replace('_', ' ').toUpperCase())
            .join(', ')}`}
        >
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-slate-800 truncate max-w-[130px]">{currentUser.name}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${getClearanceBadgeColor(currentUser.clearanceLevel)}`}>
              {assignedRoles.map(r => r.replace('_', ' ')).join(' / ')} &bull; L{currentUser.clearanceLevel}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-xs shadow-xs border-2 border-white">
            {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
        </button>

        {/* Logout Button */}
        <button
          onClick={logoutUser}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
          title="Sign Out Session"
        >
          <LogOut className="w-4 h-4" />
        </button>

      </div>
    </header>
  );
};
