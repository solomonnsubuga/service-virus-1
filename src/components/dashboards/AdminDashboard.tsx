import React, { useState } from 'react';
import {
  useClinic,
  DEFAULT_ROLE_CLEARANCE,
  CLEARANCE_MAP,
  CLINIC_USER_LIMIT_TIERS,
  inferTierFromLimit,
  MAX_ROLES_PER_USER,
  ALL_USER_ROLES,
  getUserRoles,
  getHighestClearanceForRoles
} from '../../context/ClinicContext';
import { UserRole } from '../../types';
import {
  Building2,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Users,
  Layers,
  DollarSign,
  FileCheck,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
  Activity,
  Package,
  UserPlus,
  Mail,
  Lock,
  X,
  Trash2,
  Key,
  ShieldAlert,
  ArrowUpRight,
  KeyRound,
  Send,
  BedDouble,
  DoorOpen,
  Boxes,
  Coins,
  Image as ImageIcon,
  Cloud
} from 'lucide-react';
import { ManageLocationsModal } from '../common/ManageLocationsModal';
import { StoreDashboard } from './StoreDashboard';
import { InsurancePolicyManagement } from '../admin/InsurancePolicyManagement';
import { AccountingCurrencyCard } from '../admin/AccountingCurrencyCard';
import { CompanyLogoCard } from '../admin/CompanyLogoCard';
import { PrimeAdminCloudVaultCard } from '../admin/PrimeAdminCloudVaultCard';

interface AdminDashboardProps {
  onOpenInventory: () => void;
  onOpenRoleSwitcher: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onOpenInventory, onOpenRoleSwitcher }) => {
  const {
    clinics,
    activeClinic,
    currentClinicInventory,
    users,
    activeClinicUsers,
    pendingClinicUsers,
    approveUserRequest,
    rejectUserRequest,
    addStaffMember,
    updateUserRoleAndClearance,
    adminResetUserPassword,
    deleteStaffMember,
    auditLogs,
    currentClinicLedgers,
    currentClinicPatients,
    currentClinicWards,
    currentClinicDepartments,
    currentClinicInsurancePolicies,
    insurancePolicies,
    currentUser,
    currencyConfig,
    currencySymbol,
    formatCurrency,
    updateClinicCurrency
  } = useClinic();

  const [activeTab, setActiveTab] = useState<'overview' | 'staff_management' | 'insurance' | 'currency' | 'logo' | 'cloud_vault' | 'audit_logs' | 'store'>('overview');
  const [resetEmailStatus, setResetEmailStatus] = useState<string | null>(null);
  const [showLocationsModal, setShowLocationsModal] = useState(false);

  // Add Staff Member Modal State
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'doctor' as UserRole,
    roles: ['doctor'] as UserRole[],
    clearanceLevel: 2,
    title: ''
  });
  const [addStaffError, setAddStaffError] = useState('');
  const [addStaffSuccess, setAddStaffSuccess] = useState('');

  // Approval Modal / State for Pending Users (supports 1 to 3 roles per user)
  const [approvalSelections, setApprovalSelections] = useState<
    Record<string, { roles: UserRole[]; clearanceLevel: number; password: string }>
  >({});
  const [visiblePendingPasswords, setVisiblePendingPasswords] = useState<Record<string, boolean>>({});
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Staff Password View & Admin Direct Reset State
  const [visibleStaffPasswords, setVisibleStaffPasswords] = useState<Record<string, boolean>>({});
  const [editingPasswordUserId, setEditingPasswordUserId] = useState<string | null>(null);
  const [editingPasswordValue, setEditingPasswordValue] = useState<string>('');

  // Compute metrics strictly for the logged-in/active clinic
  const totalStockValuation = currentClinicInventory.reduce((sum, item) => sum + (item.totalQuantity * item.unitCost), 0);
  const totalSellingValuation = currentClinicInventory.reduce((sum, item) => sum + (item.totalQuantity * item.sellingPrice), 0);
  const lowStockCount = currentClinicInventory.filter(i => i.totalQuantity <= i.reorderLevel).length;
  const totalRevenueCollected = currentClinicLedgers.reduce((sum, l) => sum + l.totalPaid, 0);
  const totalOutstandingReceivables = currentClinicLedgers.reduce((sum, l) => sum + l.balanceDue, 0);

  // Filter audit logs strictly for the active clinic
  const clinicAuditLogs = auditLogs.filter(l => l.clinicId === activeClinic.id || l.clinicId === 'all');

  const getDefaultPendingRoles = (userId: string): UserRole[] => {
    const pendingUser = pendingClinicUsers.find(u => u.id === userId);
    if (pendingUser?.requestedRoles && pendingUser.requestedRoles.length > 0) {
      return pendingUser.requestedRoles.slice(0, MAX_ROLES_PER_USER);
    }
    return [pendingUser?.requestedRole || 'doctor'];
  };

  const handleToggleRoleForPending = (userId: string, role: UserRole) => {
    setApprovalError(null);
    const defaultRoles = getDefaultPendingRoles(userId);
    const currentRoles = approvalSelections[userId]?.roles || defaultRoles;
    let nextRoles: UserRole[];

    if (currentRoles.includes(role)) {
      if (currentRoles.length <= 1) {
        setApprovalError('A user must have at least 1 assigned role.');
        return;
      }
      nextRoles = currentRoles.filter(r => r !== role);
    } else {
      if (currentRoles.length >= MAX_ROLES_PER_USER) {
        setApprovalError(`Cannot assign more than ${MAX_ROLES_PER_USER} roles per user.`);
        return;
      }
      nextRoles = [...currentRoles, role];
    }

    const level = getHighestClearanceForRoles(nextRoles);
    setApprovalSelections(prev => ({
      ...prev,
      [userId]: {
        roles: nextRoles,
        clearanceLevel: level,
        password: prev[userId]?.password ?? 'password123'
      }
    }));
  };

  const handleClearanceChangeForPending = (userId: string, level: number) => {
    const defaultRoles = getDefaultPendingRoles(userId);
    setApprovalSelections(prev => ({
      ...prev,
      [userId]: {
        roles: prev[userId]?.roles || defaultRoles,
        clearanceLevel: level,
        password: prev[userId]?.password ?? 'password123'
      }
    }));
  };

  const handlePasswordChangeForPending = (userId: string, password: string) => {
    const defaultRoles = getDefaultPendingRoles(userId);
    const defaultLevel = getHighestClearanceForRoles(defaultRoles);
    setApprovalSelections(prev => ({
      ...prev,
      [userId]: {
        roles: prev[userId]?.roles || defaultRoles,
        clearanceLevel: prev[userId]?.clearanceLevel || defaultLevel,
        password
      }
    }));
  };

  const handleApprove = (userId: string) => {
    setApprovalError(null);
    const defaultRoles = getDefaultPendingRoles(userId);
    const defaultLevel = getHighestClearanceForRoles(defaultRoles);
    const selected = approvalSelections[userId] || {
      roles: defaultRoles,
      clearanceLevel: defaultLevel,
      password: 'password123'
    };

    if (!selected.roles || selected.roles.length === 0) {
      setApprovalError('Please select at least 1 role for the user.');
      return;
    }

    if (selected.roles.length > MAX_ROLES_PER_USER) {
      setApprovalError(`Cannot assign more than ${MAX_ROLES_PER_USER} roles per user.`);
      return;
    }

    if (!selected.password || selected.password.trim().length < 4) {
      setApprovalError('Please set a valid password (at least 4 characters) for the user before approving.');
      return;
    }

    const res = approveUserRequest(
      userId,
      selected.roles,
      selected.clearanceLevel,
      selected.password.trim()
    );
    if (res.success) {
      setResetEmailStatus(res.message);
      setTimeout(() => setResetEmailStatus(null), 4500);
    } else {
      setApprovalError(res.message);
    }
  };

  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddStaffError('');
    setAddStaffSuccess('');

    if (!newStaffForm.name || !newStaffForm.email) {
      setAddStaffError('Please enter staff name and official email.');
      return;
    }

    if (!newStaffForm.roles || newStaffForm.roles.length === 0) {
      setAddStaffError('Please assign at least 1 role to the staff member.');
      return;
    }

    if (newStaffForm.roles.length > MAX_ROLES_PER_USER) {
      setAddStaffError(`Cannot assign more than ${MAX_ROLES_PER_USER} roles per user.`);
      return;
    }

    const rolesLabel = newStaffForm.roles.map(r => r.replace('_', ' ').toUpperCase()).join(', ');
    const res = addStaffMember({
      ...newStaffForm,
      role: newStaffForm.roles[0],
      roles: newStaffForm.roles,
      title: newStaffForm.title || `${rolesLabel} Officer`
    });

    if (res.success) {
      setAddStaffSuccess(res.message);
      setNewStaffForm({
        name: '',
        email: '',
        password: 'password123',
        role: 'doctor',
        roles: ['doctor'],
        clearanceLevel: 2,
        title: ''
      });
      setTimeout(() => {
        setShowAddStaffModal(false);
        setAddStaffSuccess('');
      }, 1200);
    } else {
      setAddStaffError(res.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Executive Welcome Banner */}
      <div className="bg-[#1E293B] rounded-xl p-5 sm:p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest">
              Level 5 Security Clearance &bull; Clinic Admin
            </span>
            <span className="text-slate-400 text-xs">&bull; {activeClinic.name} ({activeClinic.code})</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Clinic Administration & Staff Control Hub
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Managing staff access clearances, user approvals, patient admissions, and inventory exclusively for {activeClinic.name}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActiveTab('currency')}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs border border-emerald-600/50"
            title="Configure Accounting System Currency"
          >
            <Coins className="w-4 h-4 text-emerald-300" />
            Currency: {currencyConfig.code} ({currencySymbol})
          </button>
          <button
            onClick={() => setShowLocationsModal(true)}
            className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Building2 className="w-4 h-4 text-purple-200" />
            Wards & Clinical Rooms ({currentClinicWards.length}/{currentClinicDepartments.length})
          </button>
          <button
            onClick={() => setActiveTab('staff_management')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Users className="w-4 h-4" />
            Manage Clinic Staff ({activeClinicUsers.length})
            {pendingClinicUsers.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded-full font-bold text-[10px]">
                {pendingClinicUsers.length} Pending
              </span>
            )}
          </button>
          <button
            onClick={onOpenInventory}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            Branch Stock
          </button>
        </div>
      </div>

      {/* KPI Metric Cards Scoped to Active Clinic */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Active Staff Members</div>
          <div className="text-2xl font-bold text-slate-800">{activeClinicUsers.length} Active</div>
          <div className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center justify-between">
            <span>{pendingClinicUsers.length} clearance request(s)</span>
            <button
              onClick={() => setActiveTab('staff_management')}
              className="text-sky-600 hover:underline font-bold"
            >
              Review &rarr;
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Branch Revenue</div>
          <div className="text-2xl font-bold text-slate-800">
            {formatCurrency(totalRevenueCollected)}
          </div>
          <div className="text-[10px] text-emerald-500 font-medium mt-1">
            Receivables: {formatCurrency(totalOutstandingReceivables)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Stock Asset Valuation</div>
          <div className="text-2xl font-bold text-slate-800">
            {formatCurrency(totalStockValuation)}
          </div>
          <div className="text-[10px] text-blue-500 font-medium mt-1">
            {currentClinicInventory.length} active item SKUs
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Registered Patients</div>
          <div className="text-2xl font-bold text-slate-800">
            {currentClinicPatients.length} Patients
          </div>
          <div className={`text-[10px] font-medium mt-1 ${lowStockCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {lowStockCount > 0 ? `${lowStockCount} stock reorder alerts` : 'Stock buffer healthy'}
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'overview' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Facility Profile & Overview
        </button>

        <button
          onClick={() => setActiveTab('staff_management')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'staff_management' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Clinic Staff & Clearance Matrix ({activeClinicUsers.length})</span>
          {pendingClinicUsers.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {pendingClinicUsers.length} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('insurance')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'insurance' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Insurance Policies & Payers ({currentClinicInsurancePolicies.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('currency')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'currency' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>Accounting Currency ({currencyConfig.code} {currencySymbol})</span>
        </button>

        <button
          onClick={() => setActiveTab('logo')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'logo' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Company Logo & Brand ({activeClinic.logoUrl ? 'Configured' : 'Upload'})</span>
        </button>

        <button
          onClick={() => setActiveTab('cloud_vault')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'cloud_vault' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Cloud className="w-3.5 h-3.5 text-emerald-600" />
          <span>Prime Admin Cloud Documents Vault</span>
        </button>

        <button
          onClick={() => setActiveTab('audit_logs')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'audit_logs' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Branch Security & Audit Logs ({clinicAuditLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('store')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'store' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Central Store & Stock Management</span>
        </button>
      </div>

      {/* TAB 1: FACILITY PROFILE */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Active Clinic Profile Card */}
            <div className="bg-white rounded-xl border border-emerald-500 ring-1 ring-emerald-500 p-5 shadow-sm md:col-span-2">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: activeClinic.color }} />
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-700 font-mono">
                    {activeClinic.code} &bull; Logged-in Facility
                  </span>
                </div>
                <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-700 rounded uppercase">
                  VERIFIED CLINIC
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-base mb-1">{activeClinic.name}</h3>
              <p className="text-xs text-slate-500 mb-4">{activeClinic.address} &bull; Official Email: {activeClinic.email}</p>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs mb-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">Active Staff</div>
                  <div className="text-lg font-bold text-slate-900">{activeClinicUsers.length}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">Patients</div>
                  <div className="text-lg font-bold text-slate-900">{currentClinicPatients.length}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">Insurance Payers</div>
                  <div className="text-lg font-bold text-teal-700">{currentClinicInsurancePolicies.length} Active</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">Collected</div>
                  <div className="text-lg font-bold text-emerald-600">${totalRevenueCollected.toFixed(0)}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">Pending Clearance</div>
                  <div className={`text-lg font-bold ${pendingClinicUsers.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {pendingClinicUsers.length}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 text-xs text-slate-700">
                <span className="font-bold text-emerald-900">Database & Security Isolated:</span> All staff accounts, patient admissions, consultation files, pharmacy stocks, and financial ledgers operate under {activeClinic.name}'s secure tenant partition.
              </div>
            </div>

            {/* Quick Admin Actions Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Admin User Card Controls
                </h4>
                <p className="text-xs text-slate-600 mb-4">
                  Add new personnel, grant roles (Doctor, Pharmacist, Nurse, Admin), and review staff registration requests.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setShowAddStaffModal(true)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <UserPlus className="w-4 h-4" /> Add Staff Member
                </button>
                <button
                  onClick={() => setActiveTab('staff_management')}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-600" /> Review Clearance Requests ({pendingClinicUsers.length})
                </button>
                <button
                  onClick={() => setActiveTab('insurance')}
                  className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Configure Insurance Schemes ({currentClinicInsurancePolicies.length})
                </button>
                <button
                  onClick={() => setActiveTab('currency')}
                  className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Coins className="w-4 h-4 text-emerald-600" /> Accounting Currency ({currencyConfig.code} {currencySymbol})
                </button>
                <button
                  onClick={() => setActiveTab('logo')}
                  className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ImageIcon className="w-4 h-4 text-emerald-600" /> Upload Company Logo (Prime Admin Cloud)
                </button>
                <button
                  onClick={() => setActiveTab('cloud_vault')}
                  className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-md text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Cloud className="w-4 h-4" /> Cloud Documents Vault (Pathology & Radiology)
                </button>
              </div>
            </div>

          </div>

          {/* Central Prime Admin Cloud Documents Vault Card */}
          <PrimeAdminCloudVaultCard />

          {/* Dedicated Company Logo Upload Card (Prime Admin Cloud Account) */}
          <CompanyLogoCard />

          {/* Prominent Accounting System Currency Card */}
          <AccountingCurrencyCard />
        </div>
      )}

      {/* TAB: PRIME ADMIN CLOUD DOCUMENTS & ATTACHMENTS VAULT */}
      {activeTab === 'cloud_vault' && (
        <div className="space-y-6">
          <PrimeAdminCloudVaultCard isFullTab />
        </div>
      )}

      {/* TAB: COMPANY LOGO & BRAND IDENTITY (PRIME ADMIN CLOUD ACCOUNT) */}
      {activeTab === 'logo' && (
        <div className="space-y-6">
          <CompanyLogoCard isFullTab />
        </div>
      )}

      {/* TAB: ACCOUNTING CURRENCY SETTINGS */}
      {activeTab === 'currency' && (
        <div className="space-y-6">
          <AccountingCurrencyCard isFullTab />
        </div>
      )}

      {/* TAB 2: STAFF & CLEARANCE MANAGEMENT (ADMIN USER CARD) */}
      {activeTab === 'staff_management' && (
        <div className="space-y-6">
          
          {/* SECTION 1: PENDING REGISTRATION REQUESTS (USER APPROVAL CARD) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Pending Staff Registration Requests ({pendingClinicUsers.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review incoming user join requests for {activeClinic.name}. Assign their official role, security clearance level, and set their account password.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddStaffModal(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" /> Add Staff Member Manually
              </button>
            </div>

            {approvalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold">
                {approvalError}
              </div>
            )}

            {pendingClinicUsers.length > 0 ? (
              <div className="space-y-3">
                {pendingClinicUsers.map(user => {
                  const defaultRoles = getDefaultPendingRoles(user.id);
                  const currentSelection = approvalSelections[user.id] || {
                    roles: defaultRoles,
                    clearanceLevel: getHighestClearanceForRoles(defaultRoles),
                    password: 'password123'
                  };
                  const showPendingPwd = !!visiblePendingPasswords[user.id];
                  const requestedRolesText = (
                    user.requestedRoles && user.requestedRoles.length > 0
                      ? user.requestedRoles
                      : [user.requestedRole || 'doctor']
                  )
                    .map(r => r.replace('_', ' '))
                    .join(', ');

                  return (
                    <div
                      key={user.id}
                      className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{user.name}</span>
                            <span className="text-[11px] font-bold text-amber-800 uppercase">
                              Requested: {requestedRolesText}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2">
                            <span>{user.email}</span>
                            <span>&bull;</span>
                            <span className="text-slate-500 font-mono text-[11px]">
                              Applied: {user.requestedAt ? new Date(user.requestedAt).toLocaleDateString() : 'Today'}
                            </span>
                          </div>
                        </div>

                        {/* Clearance, Password & Approve Controls */}
                        <div className="flex flex-wrap items-center gap-2.5">
                          <div className="flex items-center gap-1">
                            <label className="text-[11px] font-bold text-slate-600">Clearance:</label>
                            <select
                              value={currentSelection.clearanceLevel}
                              onChange={(e) => handleClearanceChangeForPending(user.id, Number(e.target.value))}
                              className="p-1.5 border border-slate-300 rounded bg-white text-xs font-bold text-slate-800"
                            >
                              <option value={1}>Level 1 - Front Desk</option>
                              <option value={2}>Level 2 - Clinical Staff</option>
                              <option value={3}>Level 3 - Diagnostics/Pharmacy</option>
                              <option value={4}>Level 4 - Finance/Accounts</option>
                              <option value={5}>Level 5 - Admin Executive</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-1">
                            <label className="text-[11px] font-bold text-slate-600">Set Password:</label>
                            <div className="relative flex items-center">
                              <input
                                type={showPendingPwd ? 'text' : 'password'}
                                value={currentSelection.password}
                                onChange={(e) => handlePasswordChangeForPending(user.id, e.target.value)}
                                placeholder="Set user password"
                                className="p-1.5 pr-7 border border-slate-300 rounded bg-white text-xs font-mono font-semibold text-slate-900 w-36"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setVisiblePendingPasswords(prev => ({
                                    ...prev,
                                    [user.id]: !prev[user.id]
                                  }))
                                }
                                className="absolute right-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                                title={showPendingPwd ? 'Hide password' : 'View password'}
                              >
                                {showPendingPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <button
                            onClick={() => handleApprove(user.id)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve ({currentSelection.roles.length} Role{currentSelection.roles.length > 1 ? 's' : ''}) & Set Password
                          </button>

                          <button
                            onClick={() => rejectUserRequest(user.id)}
                            className="px-2.5 py-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      </div>

                      {/* Multi-Role Assignment Selector (1 to 3 roles max) */}
                      <div className="pt-2 border-t border-amber-200/70 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-700">
                            Assign Roles (Select up to {MAX_ROLES_PER_USER} roles per user):
                          </span>
                          <span className="font-mono font-bold text-emerald-800">
                            Selected: {currentSelection.roles.length} / {MAX_ROLES_PER_USER} Max
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {ALL_USER_ROLES.map(roleOpt => {
                            const isSelected = currentSelection.roles.includes(roleOpt.role);
                            const isMaxReached =
                              !isSelected && currentSelection.roles.length >= MAX_ROLES_PER_USER;
                            return (
                              <button
                                key={roleOpt.role}
                                type="button"
                                disabled={isMaxReached}
                                onClick={() => handleToggleRoleForPending(user.id, roleOpt.role)}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-all ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs cursor-pointer'
                                    : isMaxReached
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-50 cursor-not-allowed'
                                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 cursor-pointer'
                                }`}
                                title={
                                  isMaxReached
                                    ? `Maximum of ${MAX_ROLES_PER_USER} roles per user reached`
                                    : `Toggle ${roleOpt.label}`
                                }
                              >
                                {isSelected ? '✓ ' : '+ '}
                                {roleOpt.shortLabel}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500 text-xs bg-slate-50 rounded-lg border border-slate-100">
                No pending staff clearance applications for {activeClinic.name}.
              </div>
            )}
          </div>

          {/* SECTION 2: ACTIVE CLINIC STAFF DIRECTORY & ROLE PROMOTION */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>
                    Active Clinic Personnel & Security Clearances ({activeClinicUsers.length} / {activeClinic.userLimitTier === 'enterprise' && (!activeClinic.userLimit || activeClinic.userLimit >= 75) ? '75+' : (activeClinic.userLimit || CLINIC_USER_LIMIT_TIERS[inferTierFromLimit(activeClinic.userLimit, activeClinic.userLimitTier)].maxUsers)} Users &middot; {CLINIC_USER_LIMIT_TIERS[inferTierFromLimit(activeClinic.userLimit, activeClinic.userLimitTier)].shortLabel})
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Admins have full authority to modify staff roles, elevate members to Administrator (Level 5), or revoke access.
                </p>
              </div>
            </div>

            {resetEmailStatus && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resetEmailStatus}</span>
              </div>
            )}

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Staff Name & Credentials</th>
                    <th className="px-4 py-3">Email Address</th>
                    <th className="px-4 py-3">Assigned Roles (Max {MAX_ROLES_PER_USER} / User)</th>
                    <th className="px-4 py-3">Clearance Level</th>
                    <th className="px-4 py-3">Account Password</th>
                    <th className="px-4 py-3 text-right">Actions / Role Elevation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 bg-white">
                  {activeClinicUsers.map(user => {
                    const isSelf = user.id === currentUser.id;
                    const isPwdVisible = !!visibleStaffPasswords[user.id];
                    const isEditingPwd = editingPasswordUserId === user.id;
                    const currentPasswordText = user.password || 'password123';
                    const assignedRoles = getUserRoles(user);
                    const availableToAdd = ALL_USER_ROLES.filter(
                      opt => !assignedRoles.includes(opt.role)
                    );

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{user.name}</span>
                            {isSelf && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-normal">{user.title}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">{user.email}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {assignedRoles.map((r, idx) => (
                                <span
                                  key={r}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${
                                    idx === 0
                                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                      : 'bg-slate-100 text-slate-800 border-slate-300'
                                  }`}
                                >
                                  <span className="capitalize">{r.replace('_', ' ')}</span>
                                  {assignedRoles.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextRoles = assignedRoles.filter(item => item !== r);
                                        const nextLevel = getHighestClearanceForRoles(nextRoles);
                                        const res = updateUserRoleAndClearance(
                                          user.id,
                                          nextRoles,
                                          nextLevel
                                        );
                                        if (res.message) {
                                          setResetEmailStatus(res.message);
                                          setTimeout(() => setResetEmailStatus(null), 3500);
                                        }
                                      }}
                                      className="text-slate-400 hover:text-rose-600 cursor-pointer ml-0.5"
                                      title={`Remove ${r.replace('_', ' ')} role`}
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </span>
                              ))}
                              <span className="text-[10px] font-mono text-slate-400">
                                ({assignedRoles.length}/{MAX_ROLES_PER_USER})
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {assignedRoles.length < MAX_ROLES_PER_USER ? (
                                <select
                                  value=""
                                  onChange={e => {
                                    const addRole = e.target.value as UserRole;
                                    if (!addRole) return;
                                    const nextRoles = [...assignedRoles, addRole].slice(
                                      0,
                                      MAX_ROLES_PER_USER
                                    );
                                    const nextLevel = Math.max(
                                      user.clearanceLevel,
                                      getHighestClearanceForRoles(nextRoles)
                                    );
                                    const res = updateUserRoleAndClearance(
                                      user.id,
                                      nextRoles,
                                      nextLevel
                                    );
                                    if (res.message) {
                                      setResetEmailStatus(res.message);
                                      setTimeout(() => setResetEmailStatus(null), 3500);
                                    }
                                  }}
                                  className="p-1 border border-dashed border-emerald-400 rounded bg-emerald-50/40 text-[11px] font-bold text-emerald-800 cursor-pointer"
                                >
                                  <option value="">
                                    + Add Role ({MAX_ROLES_PER_USER - assignedRoles.length} left)
                                  </option>
                                  {availableToAdd.map(opt => (
                                    <option key={opt.role} value={opt.role}>
                                      + {opt.shortLabel}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-[10px] font-semibold text-amber-700">
                                  Max {MAX_ROLES_PER_USER} roles assigned (remove one to add another)
                                </span>
                              )}

                              {assignedRoles.length === 1 && (
                                <select
                                  value={assignedRoles[0]}
                                  onChange={e => {
                                    const newRole = e.target.value as UserRole;
                                    const newLevel = DEFAULT_ROLE_CLEARANCE[newRole] || 2;
                                    updateUserRoleAndClearance(user.id, [newRole], newLevel);
                                  }}
                                  className="p-1 border border-slate-300 rounded bg-white text-[11px] font-semibold text-slate-700 capitalize"
                                  title="Change primary role"
                                >
                                  {ALL_USER_ROLES.map(opt => (
                                    <option key={opt.role} value={opt.role}>
                                      Switch to: {opt.shortLabel}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={user.clearanceLevel}
                            onChange={(e) => {
                              const newLevel = Number(e.target.value);
                              updateUserRoleAndClearance(user.id, assignedRoles, newLevel);
                            }}
                            className={`p-1 rounded text-xs font-bold uppercase border ${
                              user.clearanceLevel === 5 ? 'bg-rose-50 text-rose-800 border-rose-200' :
                              user.clearanceLevel === 4 ? 'bg-blue-50 text-blue-800 border-blue-200' :
                              user.clearanceLevel === 3 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            <option value={1}>Level 1 - Front Desk</option>
                            <option value={2}>Level 2 - Clinical</option>
                            <option value={3}>Level 3 - Diagnostics</option>
                            <option value={4}>Level 4 - Accounts</option>
                            <option value={5}>Level 5 - Admin Executive</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          {isEditingPwd ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={editingPasswordValue}
                                onChange={(e) => setEditingPasswordValue(e.target.value)}
                                placeholder="New password"
                                className="px-2 py-1 border border-sky-300 rounded bg-white text-xs font-mono font-bold text-slate-900 w-32 focus:outline-none focus:ring-1 focus:ring-sky-500"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const res = adminResetUserPassword(user.id, editingPasswordValue);
                                  if (res.success) {
                                    setResetEmailStatus(res.message);
                                    setEditingPasswordUserId(null);
                                    setEditingPasswordValue('');
                                    setVisibleStaffPasswords(prev => ({ ...prev, [user.id]: true }));
                                    setTimeout(() => setResetEmailStatus(null), 4000);
                                  }
                                }}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPasswordUserId(null);
                                  setEditingPasswordValue('');
                                }}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold rounded cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                                {isPwdVisible ? currentPasswordText : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setVisibleStaffPasswords(prev => ({
                                    ...prev,
                                    [user.id]: !prev[user.id]
                                  }))
                                }
                                className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer"
                                title={isPwdVisible ? 'Hide password' : 'View password'}
                              >
                                {isPwdVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPasswordUserId(user.id);
                              setEditingPasswordValue(currentPasswordText);
                            }}
                            className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-semibold rounded border border-sky-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                            title="Reset & Update User Password"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Reset Password</span>
                          </button>

                          {!assignedRoles.includes('admin') && (
                            <button
                              onClick={() => {
                                const nextRoles: UserRole[] =
                                  assignedRoles.length < MAX_ROLES_PER_USER
                                    ? ['admin', ...assignedRoles]
                                    : ['admin', ...assignedRoles.slice(0, MAX_ROLES_PER_USER - 1)];
                                updateUserRoleAndClearance(
                                  user.id,
                                  nextRoles,
                                  5,
                                  'Clinic Administrator & Executive'
                                );
                              }}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold rounded border border-rose-200 transition-colors cursor-pointer"
                              title="Add Clinic Administrator role (Level 5)"
                            >
                              Make Admin (Lvl 5)
                            </button>
                          )}
                          {!isSelf && (
                            <button
                              onClick={() => {
                                if (confirm(`Remove staff access for ${user.name}?`)) {
                                  deleteStaffMember(user.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer inline-block"
                              title="Revoke access"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'audit_logs' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Audit Trail & Security Event Logs for {activeClinic.name}
            </h3>
            <span className="text-xs text-slate-500">Displaying {clinicAuditLogs.length} verified branch events</span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User & Role</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Details & Parameters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {clinicAuditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-slate-900 font-semibold font-sans">
                      {log.userName} <span className="text-[10px] text-slate-500 font-mono uppercase">[{log.role}]</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-700 font-sans">{log.action}</td>
                    <td className="px-4 py-3 text-slate-600 font-sans max-w-md truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: INSURANCE POLICIES & PAYERS */}
      {activeTab === 'insurance' && (
        <div className="pt-2">
          <InsurancePolicyManagement
            onSelectPolicyForStore={() => {
              setActiveTab('store');
            }}
          />
        </div>
      )}

      {/* TAB 4: STORE & WAREHOUSE */}
      {activeTab === 'store' && (
        <div className="pt-2">
          <StoreDashboard onOpenInventory={onOpenInventory} />
        </div>
      )}

      {/* ADD STAFF MEMBER MODAL */}
      {showAddStaffModal && (
        <div 
          className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddStaffModal(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold">Register Staff Member into {activeClinic.name}</h3>
              </div>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStaffSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name & Title</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Jennifer Vance, MD"
                  value={newStaffForm.name}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Work Email</label>
                <input
                  type="email"
                  placeholder="e.g. j.vance@omniclinic.health"
                  value={newStaffForm.email}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                  required
                />
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-slate-700">
                      Assigned Roles (Select 1 to {MAX_ROLES_PER_USER} Roles Max)
                    </label>
                    <span className="text-[11px] font-mono font-bold text-emerald-700">
                      Selected: {newStaffForm.roles.length} / {MAX_ROLES_PER_USER} Max
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ALL_USER_ROLES.map(opt => {
                      const isSelected = newStaffForm.roles.includes(opt.role);
                      const isMaxReached =
                        !isSelected && newStaffForm.roles.length >= MAX_ROLES_PER_USER;
                      return (
                        <button
                          key={opt.role}
                          type="button"
                          disabled={isMaxReached}
                          onClick={() => {
                            setAddStaffError('');
                            let nextRoles: UserRole[];
                            if (isSelected) {
                              if (newStaffForm.roles.length <= 1) {
                                setAddStaffError('At least 1 role must remain selected.');
                                return;
                              }
                              nextRoles = newStaffForm.roles.filter(r => r !== opt.role);
                            } else {
                              if (newStaffForm.roles.length >= MAX_ROLES_PER_USER) {
                                setAddStaffError(
                                  `Cannot assign more than ${MAX_ROLES_PER_USER} roles per user.`
                                );
                                return;
                              }
                              nextRoles = [...newStaffForm.roles, opt.role];
                            }
                            const nextLvl = getHighestClearanceForRoles(nextRoles);
                            setNewStaffForm({
                              ...newStaffForm,
                              role: nextRoles[0],
                              roles: nextRoles,
                              clearanceLevel: nextLvl
                            });
                          }}
                          className={`p-2 rounded-lg border text-left text-xs font-bold transition-all flex items-center justify-between ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500/30 cursor-pointer'
                              : isMaxReached
                              ? 'border-slate-200 bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed'
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 cursor-pointer'
                          }`}
                        >
                          <span className="truncate">{opt.shortLabel}</span>
                          <span className="text-[10px] font-mono ml-1">
                            {isSelected ? '✓' : `L${DEFAULT_ROLE_CLEARANCE[opt.role]}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Each user can be assigned up to {MAX_ROLES_PER_USER} roles and switch between their assigned dashboards.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Clearance Level</label>
                  <select
                    value={newStaffForm.clearanceLevel}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, clearanceLevel: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold"
                  >
                    <option value={1}>Level 1 - Front Desk</option>
                    <option value={2}>Level 2 - Clinical</option>
                    <option value={3}>Level 3 - Diagnostics</option>
                    <option value={4}>Level 4 - Accounts</option>
                    <option value={5}>Level 5 - Admin Executive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Initial Password</label>
                <input
                  type="password"
                  value={newStaffForm.password}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, password: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                  required
                />
              </div>

              {addStaffError && (
                <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {addStaffError}
                </div>
              )}

              {addStaffSuccess && (
                <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {addStaffSuccess}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-xs cursor-pointer"
                >
                  Create & Activate Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Locations, Wards & Clinical Rooms Management Modal */}
      <ManageLocationsModal
        isOpen={showLocationsModal}
        onClose={() => setShowLocationsModal(false)}
      />

    </div>
  );
};
