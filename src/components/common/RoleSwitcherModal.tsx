import React from 'react';
import { useClinic, getUserRoles, userHasRole, MAX_ROLES_PER_USER } from '../../context/ClinicContext';
import { UserRole } from '../../types';
import {
  ShieldAlert,
  Stethoscope,
  Pill,
  Syringe,
  Microscope,
  Film,
  UserSquare2,
  ReceiptText,
  Boxes,
  X,
  CheckCircle2,
  Lock,
  Building2,
  FileSpreadsheet
} from 'lucide-react';

interface RoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RoleOption {
  role: UserRole;
  title: string;
  department: string;
  clearanceLevel: number;
  clearanceName: string;
  description: string;
  badgeBg: string;
  permissions: string[];
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    activeDashboard,
    setActiveDashboard,
    canAccessDashboard,
    activeClinic
  } = useClinic();

  if (!isOpen) return null;

  const assignedRoles = getUserRoles(currentUser);
  const isAdmin = userHasRole(currentUser, 'admin');
  const effectiveDashboard = canAccessDashboard(activeDashboard)
    ? activeDashboard
    : currentUser.role;

  const roleOptions: RoleOption[] = [
    {
      role: 'admin',
      title: 'Clinic & Hospital Administrator',
      department: 'Executive Administration',
      clearanceLevel: 5,
      clearanceName: 'Level 5 - Clinic Admin & Executive Management',
      description: 'Full facility oversight, stock thresholds, staff clearance, audit trails, and financial analytics.',
      badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
      permissions: ['Manage clinic operations', 'Manage safety stock levels', 'View clinic inventory valuations', 'Audit security logs']
    },
    {
      role: 'doctor',
      title: 'Attending Physician / Doctor',
      department: 'Outpatient & Inpatient Clinical Services',
      clearanceLevel: 2,
      clearanceName: 'Level 2 - Clinical & Ward Staff',
      description: 'Consultations, digital prescriptions with real-time stock lookups, pathology test orders, and radiology requisitions.',
      badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
      permissions: ['Write e-Prescriptions', 'Order Pathology & Radiology tests', 'Review patient medical histories', 'View patient ledger summary']
    },
    {
      role: 'pharmacy',
      title: 'Clinical Pharmacist',
      department: 'Pharmacy & Drug Dispensing',
      clearanceLevel: 3,
      clearanceName: 'Level 3 - Diagnostic Specialists & Pharmacists',
      description: 'Rx dispensing queue, batch & expiry verification, auto stock deduction, stock-in receipts, and supplier deliveries.',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      permissions: ['Dispense doctor prescriptions', 'Batch & expiry tracking', 'Log supplier batch deliveries', 'Stock receipt & audit']
    },
    {
      role: 'nursing',
      title: 'Ward Nurse & Triage Officer',
      department: 'Nursing & Inpatient Ward',
      clearanceLevel: 2,
      clearanceName: 'Level 2 - Clinical & Ward Staff',
      description: 'Administer items (IV sets, cannulas, saline, injections), deduct ward inventory, charge to patient ledgers, and log vitals.',
      badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      permissions: ['Record administered consumables/drugs', 'Auto-bill patient ledgers', 'Track triage vitals', 'Manage ward floor supplies']
    },
    {
      role: 'pathology',
      title: 'Clinical Pathologist / Lab Scientist',
      department: 'Pathology & Diagnostic Laboratory',
      clearanceLevel: 3,
      clearanceName: 'Level 3 - Diagnostic Specialists & Pharmacists',
      description: 'Specimen processing, test results entry, auto-deduction of reagent kits, and diagnostic report approval.',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
      permissions: ['Process doctor lab requisitions', 'Record parameter values & flags', 'Track reagent inventory usage', 'Generate lab reports']
    },
    {
      role: 'radiology',
      title: 'Radiologist & Imaging Specialist',
      department: 'Radiology & Medical Imaging',
      clearanceLevel: 3,
      clearanceName: 'Level 3 - Diagnostic Specialists & Pharmacists',
      description: 'Manage imaging requests (X-Ray, USG, CT, MRI), enter radiological impressions, and track contrast & film consumables.',
      badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      permissions: ['Perform diagnostic scans', 'Enter findings & impressions', 'Deduct contrast & film inventory', 'Authorize imaging reports']
    },
    {
      role: 'reception',
      title: 'Reception & Triage Registrar',
      department: 'Front Desk & Patient Services',
      clearanceLevel: 1,
      clearanceName: 'Level 1 - Front Desk & Registration',
      description: 'Patient registration, Master Patient Index lookup, appointment check-ins, and routing to clinical stations.',
      badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
      permissions: ['Register new patients', 'Manage clinic waiting queue', 'Assign doctors to patients', 'Collect registration fees']
    },
    {
      role: 'accountant',
      title: 'Accountant & Billing Controller',
      department: 'Finance & Revenue Cycle',
      clearanceLevel: 4,
      clearanceName: 'Level 4 - Finance & Account Officers',
      description: 'Integrated patient ledgers (consultations, pharmacy, lab, radiology, nursing charges), payments, receipts, and P&L.',
      badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
      permissions: ['View comprehensive patient ledgers', 'Collect payments & issue receipts', 'Analyze departmental revenue', 'Monitor receivables & clinic P&L']
    },
    {
      role: 'store_manager',
      title: 'Store & Inventory Manager',
      department: 'Central Store & Warehouse',
      clearanceLevel: 4,
      clearanceName: 'Level 4 - Store & Procurement Management',
      description: 'Central hospital store operations, catalog management, receiving supplier batches, inventory adjustments, and departmental distribution.',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
      permissions: ['Add & edit inventory catalog items', 'Receive supplier batches & PO deliveries', 'Execute physical count stock adjustments', 'Issue stock to hospital departments']
    },
    {
      role: 'medical_records',
      title: 'Health Information & Medical Records Director',
      department: 'Health Records & Clinical Analytics',
      clearanceLevel: 4,
      clearanceName: 'Level 4 - Health Records & Clinical Audit',
      description: 'Clinic-specific EHR monitoring: surgical procedures conducted, final diagnoses, inpatient admissions, OPD turnover velocity, laboratory & imaging tests, discharges, transfers, mortality certificates, and Excel export.',
      badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      permissions: ['Monitor individual clinic medical records', 'Audit surgical logs & procedure outcomes', 'Track final diagnoses & disease patterns', 'Inpatient admission flow & ward status', 'Audit pathology & imaging requisitions', 'Discharge condition summaries & referral logs', 'Export medical records to Excel spreadsheets']
    }
  ];

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return <ShieldAlert className="w-5 h-5 text-rose-600" />;
      case 'doctor': return <Stethoscope className="w-5 h-5 text-sky-600" />;
      case 'pharmacy': return <Pill className="w-5 h-5 text-emerald-600" />;
      case 'nursing': return <Syringe className="w-5 h-5 text-indigo-600" />;
      case 'pathology': return <Microscope className="w-5 h-5 text-amber-600" />;
      case 'radiology': return <Film className="w-5 h-5 text-cyan-600" />;
      case 'reception': return <UserSquare2 className="w-5 h-5 text-purple-600" />;
      case 'accountant': return <ReceiptText className="w-5 h-5 text-teal-600" />;
      case 'store_manager': return <Boxes className="w-5 h-5 text-amber-600" />;
      case 'medical_records': return <FileSpreadsheet className="w-5 h-5 text-indigo-600" />;
    }
  };

  const handleSelectRole = (opt: RoleOption) => {
    if (!canAccessDashboard(opt.role)) {
      return;
    }
    // Never mutate currentUser.role or currentUser.clearanceLevel.
    // Only update activeDashboard if authorized (e.g., Admin inspecting a department).
    setActiveDashboard(opt.role);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-slate-700" />
              Role & Security Clearance Profile
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdmin
                ? 'Your account holds Level 5 Clinic Administrator clearance. You may inspect any department dashboard while maintaining your assigned roles.'
                : `Your account holds ${assignedRoles.length} assigned role${assignedRoles.length === 1 ? '' : 's'} (max ${MAX_ROLES_PER_USER}): ${assignedRoles
                    .map(r => r.replace('_', ' ').toUpperCase())
                    .join(', ')} (Level ${currentUser.clearanceLevel}). Click any assigned role below to switch dashboards.`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active User Banner */}
        <div className="px-6 py-3 bg-sky-50/70 border-b border-sky-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sky-900">Current User:</span>
            <span className="text-slate-800 font-medium">{currentUser.name}</span>
            <span className="text-slate-500">({currentUser.title})</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              Facility: {activeClinic.name}
            </span>
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Assigned Roles ({assignedRoles.length}/{MAX_ROLES_PER_USER}):
              </span>
              {assignedRoles.map((r, idx) => (
                <span
                  key={r}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                    idx === 0
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-sky-100 text-sky-800 border-sky-200'
                  }`}
                >
                  {r.replace('_', ' ')}
                </span>
              ))}
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
              Clearance: Level {currentUser.clearanceLevel}
            </span>
          </div>
        </div>

        {/* Roles Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {roleOptions.map((opt) => {
            const isAssignedRole = userHasRole(currentUser, opt.role);
            const assignedRoleIndex = assignedRoles.indexOf(opt.role);
            const isViewing = effectiveDashboard === opt.role;
            const isAccessible = canAccessDashboard(opt.role);

            return (
              <div
                key={opt.role}
                onClick={() => isAccessible && handleSelectRole(opt)}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isViewing
                    ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500 shadow-xs cursor-pointer'
                    : isAssignedRole
                    ? 'border-sky-500 bg-sky-50/30 ring-1 ring-sky-400 shadow-xs cursor-pointer'
                    : isAccessible
                    ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-xs cursor-pointer'
                    : 'border-slate-200 bg-slate-50/60 opacity-60 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                        {getRoleIcon(opt.role)}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 capitalize flex flex-wrap items-center gap-1.5">
                          <span>{opt.role.replace('_', ' ')} Dashboard</span>
                          {isAssignedRole && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-600 text-white">
                              Assigned Role #{assignedRoleIndex + 1}
                            </span>
                          )}
                        </h3>
                        <p className="text-[11px] text-slate-500">{opt.department}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${opt.badgeBg}`}>
                      Level {opt.clearanceLevel}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                    {opt.description}
                  </p>

                  <div className="space-y-1 mb-4">
                    {opt.permissions.map((perm, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <CheckCircle2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{perm}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                    {!isAccessible && <Lock className="w-3 h-3 text-slate-400" />}
                    {isAssignedRole
                      ? isViewing
                        ? 'Assigned Role Currently Open'
                        : 'Assigned Role Available'
                      : isAccessible
                      ? isViewing
                        ? 'Currently Inspecting'
                        : 'Admin Oversight Available'
                      : `Restricted to ${opt.role.replace('_', ' ')} staff`}
                  </span>
                  <button
                    type="button"
                    disabled={!isAccessible}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      isViewing
                        ? 'bg-emerald-600 text-white'
                        : isAssignedRole
                        ? 'bg-sky-600 hover:bg-sky-700 text-white cursor-pointer'
                        : isAccessible
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isViewing
                      ? 'Active View'
                      : isAssignedRole
                      ? 'Switch to Role'
                      : isAccessible
                      ? 'Inspect View'
                      : 'Role Locked'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            User roles and clearance levels are strictly maintained regardless of dashboard view.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
