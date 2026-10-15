import React, { useState, useEffect, useMemo } from 'react';
import { useClinic, CLINIC_USER_LIMIT_TIERS, inferTierFromLimit, getUserRoles, userHasRole } from '../../context/ClinicContext';
import { ClinicUserLimitTier } from '../../types';
import {
  getDeveloperSecurityConfig,
  updateDeveloperSecurityConfig,
  getDeveloperTelemetryState,
  subscribeToTelemetry,
  ensureBaselineTelemetrySeeded,
  recordFirestoreRead,
  recordFirestoreWrite,
  getTodayDateKey,
  formatBytes,
  DeveloperSecurityConfig,
  DeveloperTelemetryState
} from '../../services/developerTelemetry';
import {
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  Database,
  Users,
  Building2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  HardDrive,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Settings,
  Terminal,
  Layers,
  Trash2,
  Ban,
  UserCheck,
  Sliders
} from 'lucide-react';

interface DeveloperCardProps {
  onBackToLogin?: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DeveloperCard: React.FC<DeveloperCardProps> = ({ onBackToLogin }) => {
  const {
    clinics,
    users,
    patients,
    inventory,
    prescriptions,
    testOrders,
    radiologyOrders,
    encounters,
    ledgers,
    auditLogs,
    approveClinicAccount,
    developerUpdateClinicUserLimit,
    developerSetClinicUserStatus,
    developerDeleteClinicUser,
    developerUpdateClinicAdminPassword
  } = useClinic();

  const [clinicApprovalNotice, setClinicApprovalNotice] = useState<string | null>(null);
  const [approvingClinicId, setApprovingClinicId] = useState<string | null>(null);
  const [customLimitInputs, setCustomLimitInputs] = useState<Record<string, string>>({});
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [mandateNotice, setMandateNotice] = useState<{
    message: string;
    isWarning?: boolean;
  } | null>(null);

  // Clinic Admin Passwords Card State
  const [visibleAdminPasswords, setVisibleAdminPasswords] = useState<Record<string, boolean>>({});
  const [revealAllAdminPasswords, setRevealAllAdminPasswords] = useState<boolean>(false);
  const [editingAdminPasswordClinicId, setEditingAdminPasswordClinicId] = useState<string | null>(null);
  const [newAdminPasswordInput, setNewAdminPasswordInput] = useState<string>('');
  const [adminPasswordNotice, setAdminPasswordNotice] = useState<string | null>(null);
  const [copiedClinicId, setCopiedClinicId] = useState<string | null>(null);

  const pendingClinics = useMemo(
    () => clinics.filter(c => c.status === false || c.approved === false),
    [clinics]
  );

  // Security Lock State
  const [securityConfig, setSecurityConfig] = useState<DeveloperSecurityConfig>(() =>
    getDeveloperSecurityConfig()
  );
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [inputPassword, setInputPassword] = useState<string>('');
  const [inputPin, setInputPin] = useState<string>('');
  const [showUnlockPassword, setShowUnlockPassword] = useState<boolean>(false);
  const [showUnlockPin, setShowUnlockPin] = useState<boolean>(false);
  const [unlockError, setUnlockError] = useState<string>('');

  // Inside-Page Security Credentials Change State
  const [showSecuritySettings, setShowSecuritySettings] = useState<boolean>(false);
  const [currentPasswordVerify, setCurrentPasswordVerify] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [confirmNewPin, setConfirmNewPin] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [securityUpdateStatus, setSecurityUpdateStatus] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);
  const [isSavingSecurity, setIsSavingSecurity] = useState<boolean>(false);

  // Telemetry & Calendar Tracker State
  const [telemetry, setTelemetry] = useState<DeveloperTelemetryState>(() =>
    getDeveloperTelemetryState()
  );

  const now = new Date();
  const [calendarYear, setCalendarYear] = useState<number>(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(now.getMonth()); // 0-11
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => getTodayDateKey());
  const [selectedClinicFilter, setSelectedClinicFilter] = useState<string>('all');
  const [expandedClinicId, setExpandedClinicId] = useState<string | null>(null);

  // Calculate live document counts and byte footprints per clinic across collections
  const liveFootprintByClinic = useMemo(() => {
    const map: Record<
      string,
      {
        docs: number;
        bytes: number;
        patients: number;
        inventory: number;
        prescriptions: number;
        diagnostics: number;
        encounters: number;
        ledgers: number;
        auditLogs: number;
      }
    > = {};

    clinics.forEach(c => {
      map[c.id] = {
        docs: 1,
        bytes: JSON.stringify(c).length,
        patients: 0,
        inventory: 0,
        prescriptions: 0,
        diagnostics: 0,
        encounters: 0,
        ledgers: 0,
        auditLogs: 0
      };
    });

    const accumulate = (items: any[], key?: keyof (typeof map)[string]) => {
      items.forEach(item => {
        const cid = item?.clinicId;
        if (cid && map[cid]) {
          map[cid].docs += 1;
          map[cid].bytes += JSON.stringify(item).length;
          if (key && typeof map[cid][key] === 'number') {
            (map[cid][key] as number) += 1;
          }
        }
      });
    };

    accumulate(users);
    accumulate(patients, 'patients');
    accumulate(inventory, 'inventory');
    accumulate(prescriptions, 'prescriptions');
    accumulate(testOrders, 'diagnostics');
    accumulate(radiologyOrders, 'diagnostics');
    accumulate(encounters, 'encounters');
    accumulate(ledgers, 'ledgers');
    accumulate(auditLogs, 'auditLogs');

    return map;
  }, [
    clinics,
    users,
    patients,
    inventory,
    prescriptions,
    testOrders,
    radiologyOrders,
    encounters,
    ledgers,
    auditLogs
  ]);

  // Seed baseline daily history for calendar tracker & subscribe to live read/write events
  useEffect(() => {
    ensureBaselineTelemetrySeeded(clinics, users, liveFootprintByClinic);
    setTelemetry(getDeveloperTelemetryState());
    setSecurityConfig(getDeveloperSecurityConfig());

    const unsubscribe = subscribeToTelemetry(() => {
      setTelemetry(getDeveloperTelemetryState());
      setSecurityConfig(getDeveloperSecurityConfig());
    });

    return () => unsubscribe();
  }, [clinics, users, liveFootprintByClinic]);

  // Handle Unlock Submission
  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError('');

    const currentSec = getDeveloperSecurityConfig();
    if (inputPassword.trim() === currentSec.password && inputPin.trim() === currentSec.pin) {
      setIsUnlocked(true);
      setInputPassword('');
      setInputPin('');
      setUnlockError('');
    } else {
      setUnlockError('Invalid Developer Security Password or PIN. Access denied.');
    }
  };

  // Handle Updating Developer Password & PIN inside the page
  const handleUpdateSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityUpdateStatus(null);

    const currentSec = getDeveloperSecurityConfig();
    if (currentPasswordVerify.trim() !== currentSec.password) {
      setSecurityUpdateStatus({
        message: 'Current security password does not match.',
        isError: true
      });
      return;
    }

    if (newPassword.trim().length < 4) {
      setSecurityUpdateStatus({
        message: 'New password must be at least 4 characters long.',
        isError: true
      });
      return;
    }

    if (newPassword.trim() !== confirmNewPassword.trim()) {
      setSecurityUpdateStatus({
        message: 'New password and confirmation do not match.',
        isError: true
      });
      return;
    }

    if (!/^\d{4,8}$/.test(newPin.trim())) {
      setSecurityUpdateStatus({
        message: 'New Security PIN must be 4 to 8 numeric digits.',
        isError: true
      });
      return;
    }

    if (newPin.trim() !== confirmNewPin.trim()) {
      setSecurityUpdateStatus({
        message: 'New PIN and confirmation PIN do not match.',
        isError: true
      });
      return;
    }

    setIsSavingSecurity(true);
    try {
      const res = await updateDeveloperSecurityConfig(newPassword.trim(), newPin.trim());
      setSecurityConfig(getDeveloperSecurityConfig());
      setSecurityUpdateStatus({
        message: res.message,
        isError: !res.success
      });
      if (res.success) {
        setCurrentPasswordVerify('');
        setNewPassword('');
        setConfirmNewPassword('');
        setNewPin('');
        setConfirmNewPin('');
      }
    } finally {
      setIsSavingSecurity(false);
    }
  };

  // Helper to get metrics for a specific date (filtered by clinic or all)
  const getDayMetrics = (dateKey: string, clinicFilter: string = selectedClinicFilter) => {
    const rec = telemetry.dailyRecords[dateKey];
    if (!rec) {
      return { reads: 0, writes: 0, bytesRead: 0, bytesWritten: 0 };
    }
    if (clinicFilter === 'all') {
      return {
        reads: rec.totalReads,
        writes: rec.totalWrites,
        bytesRead: rec.totalBytesRead,
        bytesWritten: rec.totalBytesWritten
      };
    }
    const cMetrics = rec.byClinic[clinicFilter];
    return {
      reads: cMetrics?.reads || 0,
      writes: cMetrics?.writes || 0,
      bytesRead: cMetrics?.bytesRead || 0,
      bytesWritten: cMetrics?.bytesWritten || 0
    };
  };

  // Helper to get metrics for a specific month YYYY-MM
  const activeMonthPrefix = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}`;

  const monthSummary = useMemo(() => {
    let reads = 0;
    let writes = 0;
    let bytesRead = 0;
    let bytesWritten = 0;
    let activeDays = 0;
    let peakDay = { date: '', totalOps: 0 };
    const byClinicMonth: Record<string, { reads: number; writes: number; bytes: number }> = {};

    (Object.entries(telemetry.dailyRecords) as Array<
      [string, DeveloperTelemetryState['dailyRecords'][string]]
    >).forEach(([dateKey, rec]) => {
      if (dateKey.startsWith(activeMonthPrefix)) {
        const dayM = getDayMetrics(dateKey, selectedClinicFilter);
        if (dayM.reads > 0 || dayM.writes > 0) {
          activeDays += 1;
        }
        reads += dayM.reads;
        writes += dayM.writes;
        bytesRead += dayM.bytesRead;
        bytesWritten += dayM.bytesWritten;

        const ops = dayM.reads + dayM.writes;
        if (ops > peakDay.totalOps) {
          peakDay = { date: dateKey, totalOps: ops };
        }

        (Object.entries(rec.byClinic) as Array<
          [string, { reads: number; writes: number; bytesRead: number; bytesWritten: number }]
        >).forEach(([cid, cm]) => {
          if (!byClinicMonth[cid]) {
            byClinicMonth[cid] = { reads: 0, writes: 0, bytes: 0 };
          }
          byClinicMonth[cid].reads += cm.reads;
          byClinicMonth[cid].writes += cm.writes;
          byClinicMonth[cid].bytes += cm.bytesRead + cm.bytesWritten;
        });
      }
    });

    return {
      reads,
      writes,
      bytesRead,
      bytesWritten,
      totalBytes: bytesRead + bytesWritten,
      activeDays: Math.max(1, activeDays),
      peakDay,
      byClinicMonth
    };
  }, [telemetry, activeMonthPrefix, selectedClinicFilter]);

  // All-time totals across all clinics
  const allTimeTotals = useMemo(() => {
    let reads = 0;
    let writes = 0;
    let bytesRead = 0;
    let bytesWritten = 0;

    (Object.values(telemetry.clinicTotals) as Array<{
      reads: number;
      writes: number;
      bytesRead: number;
      bytesWritten: number;
    }>).forEach(m => {
      reads += m.reads;
      writes += m.writes;
      bytesRead += m.bytesRead;
      bytesWritten += m.bytesWritten;
    });

    return {
      reads,
      writes,
      bytesRead,
      bytesWritten,
      totalBytes: bytesRead + bytesWritten
    };
  }, [telemetry]);

  const todayKey = getTodayDateKey();
  const todayMetrics = getDayMetrics(todayKey, selectedClinicFilter);
  const selectedDayMetrics = getDayMetrics(selectedDateKey, selectedClinicFilter);
  const selectedDayRawRecord = telemetry.dailyRecords[selectedDateKey];

  // Build Calendar Grid for (calendarYear, calendarMonth)
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    const cells: Array<{
      day: number | null;
      dateKey: string | null;
      reads: number;
      writes: number;
      bytes: number;
    }> = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ day: null, dateKey: null, reads: 0, writes: 0, bytes: 0 });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const m = getDayMetrics(dateKey, selectedClinicFilter);
      cells.push({
        day: d,
        dateKey,
        reads: m.reads,
        writes: m.writes,
        bytes: m.bytesRead + m.bytesWritten
      });
    }

    return cells;
  }, [calendarYear, calendarMonth, telemetry, selectedClinicFilter]);

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarYear(y => y - 1);
      setCalendarMonth(11);
    } else {
      setCalendarMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarYear(y => y + 1);
      setCalendarMonth(0);
    } else {
      setCalendarMonth(m => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const t = new Date();
    setCalendarYear(t.getFullYear());
    setCalendarMonth(t.getMonth());
    setSelectedDateKey(getTodayDateKey(t));
  };

  // Trigger a real diagnostic read/write probe for testing live telemetry
  const handleRunTelemetryProbe = () => {
    const targetClinic =
      selectedClinicFilter !== 'all'
        ? clinics.find(c => c.id === selectedClinicFilter) || clinics[0]
        : clinics[0];

    if (targetClinic) {
      recordFirestoreRead('clinics', [targetClinic]);
      recordFirestoreWrite('auditLogs', {
        id: `dev-probe-${Date.now()}`,
        clinicId: targetClinic.id,
        action: 'Developer Telemetry Diagnostic Probe'
      });
    }
  };

  // ============================================================================
  // LOCKED VIEW: SECURITY PASSWORD & PIN GATE COVER
  // ============================================================================
  if (!isUnlocked) {
    return (
      <div className="p-6 sm:p-8 bg-slate-950 text-slate-100 rounded-b-2xl border-t border-slate-800">
        <div className="max-w-md mx-auto space-y-6 py-4">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">
              Developer Telemetry & Clinic Monitor
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              This console is restricted and covered by dual-layer security. Enter the Developer Security Password and numeric PIN to monitor clinics, user counts, database reads/writes, and calendar usage.
            </p>
          </div>

          {securityConfig.isDefault && (
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
              <div className="font-bold text-amber-400 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Initial Developer Access Credentials</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Default Password: <code className="text-emerald-400 font-mono font-bold">devadmin</code> &bull; Default PIN: <code className="text-emerald-400 font-mono font-bold">2026</code>
              </p>
              <p className="text-[10px] text-slate-500">
                You can change both the password and PIN inside the Developer Console after unlocking.
              </p>
            </div>
          )}

          <form onSubmit={handleUnlockSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1.5 text-[11px]">
                1. Developer Security Password
              </label>
              <div className="relative">
                <input
                  type={showUnlockPassword ? 'text' : 'password'}
                  value={inputPassword}
                  onChange={e => setInputPassword(e.target.value)}
                  placeholder="Enter developer security password"
                  className="w-full p-3 pl-9 pr-10 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-white cursor-pointer"
                  title={showUnlockPassword ? 'Hide password' : 'Show password'}
                >
                  {showUnlockPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-300 uppercase tracking-wider mb-1.5 text-[11px]">
                2. Developer Security PIN (4–8 Digits)
              </label>
              <div className="relative">
                <input
                  type={showUnlockPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={8}
                  value={inputPin}
                  onChange={e => setInputPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full p-3 pl-9 pr-10 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono tracking-widest text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowUnlockPin(!showUnlockPin)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-white cursor-pointer"
                  title={showUnlockPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showUnlockPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {unlockError && (
              <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{unlockError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg uppercase tracking-wider shadow-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Developer Console</span>
            </button>

            {onBackToLogin && (
              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full py-2 text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                &larr; Return to Clinic Sign In
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  // ============================================================================
  // UNLOCKED VIEW: FULL DEVELOPER TELEMETRY, CLINIC MONITOR & CALENDAR TRACKER
  // ============================================================================
  return (
    <div className="p-5 sm:p-7 bg-slate-50 text-slate-900 space-y-6">
      {/* Top Developer Action Bar */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base sm:text-lg font-black tracking-tight">
              Developer Operations & Database Telemetry Card
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Real-time multi-tenant clinic user counts, Firestore read/write meters, daily & monthly data volume, and security credentials.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleRunTelemetryProbe}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            title="Dispatch a test read/write operation to verify live counters"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Test Live Read/Write</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowSecuritySettings(!showSecuritySettings);
              setSecurityUpdateStatus(null);
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border ${
              showSecuritySettings
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Change Password & PIN</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsUnlocked(false);
              setShowSecuritySettings(false);
            }}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Console</span>
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE SECURITY SETTINGS PANEL (CHANGE PASSWORD & PIN) */}
      {showSecuritySettings && (
        <div className="bg-white rounded-xl border-2 border-amber-300 p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>Update Developer Security Password & PIN</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Changes take effect immediately and secure this Developer Card across sessions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSecuritySettings(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Close
            </button>
          </div>

          <form onSubmit={handleUpdateSecuritySubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Current Security Password *
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={currentPasswordVerify}
                  onChange={e => setCurrentPasswordVerify(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  New Developer Password (min 4 chars) *
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  New Security PIN (4–8 digits) *
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={8}
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 4829"
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-mono tracking-widest font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Confirm New Security PIN *
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={8}
                  value={confirmNewPin}
                  onChange={e => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Repeat new PIN"
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-mono tracking-widest font-bold"
                  required
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="px-3 py-2.5 border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showNewPassword ? 'Hide' : 'Show'}</span>
                </button>

                <button
                  type="submit"
                  disabled={isSavingSecurity}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Save New Password & PIN</span>
                </button>
              </div>
            </div>

            {securityUpdateStatus && (
              <div
                className={`p-3 rounded-lg border font-semibold flex items-center gap-2 ${
                  securityUpdateStatus.isError
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                {securityUpdateStatus.isError ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>{securityUpdateStatus.message}</span>
              </div>
            )}
          </form>
        </div>
      )}

      {/* GLOBAL SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Created Clinics & Total Users</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {clinics.length} Clinics &bull; {users.length} Users
          </div>
          <div className="text-[11px] text-slate-500">
            {users.filter(u => u.status === 'active').length} active &middot;{' '}
            {users.filter(u => u.status !== 'active').length} pending
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Today's Reads & Writes ({todayKey})</span>
            <Activity className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {todayMetrics.reads.toLocaleString()} R / {todayMetrics.writes.toLocaleString()} W
          </div>
          <div className="text-[11px] text-slate-500">
            Daily Data: {formatBytes(todayMetrics.bytesRead + todayMetrics.bytesWritten)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>
              {MONTH_NAMES[calendarMonth]} {calendarYear} Usage
            </span>
            <CalendarIcon className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {monthSummary.reads.toLocaleString()} R / {monthSummary.writes.toLocaleString()} W
          </div>
          <div className="text-[11px] text-slate-500">
            Monthly Volume: {formatBytes(monthSummary.totalBytes)} ({monthSummary.activeDays} active days)
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Cumulative Database Traffic</span>
            <HardDrive className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {(allTimeTotals.reads + allTimeTotals.writes).toLocaleString()} Ops
          </div>
          <div className="text-[11px] text-slate-500">
            {allTimeTotals.reads.toLocaleString()} Reads &middot; {allTimeTotals.writes.toLocaleString()} Writes &middot;{' '}
            {formatBytes(allTimeTotals.totalBytes)}
          </div>
        </div>
      </div>

      {/* NEW CLINIC NAME ACCOUNT APPROVAL CARD (DATABASE STATUS: FALSE -> TRUE) */}
      <div className="bg-white rounded-xl border-2 border-amber-300/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>
                New Clinic Name Account Approvals ({pendingClinics.length} Pending)
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              When a new clinic name is created, its database status starts as <code className="font-mono font-bold text-rose-700">false</code>. Approve the clinic account below to change its status in the database from <code className="font-mono font-bold text-rose-700">false</code> to <code className="font-mono font-bold text-emerald-700">true</code>.
            </p>
          </div>
          <div className="text-xs font-mono text-slate-600">
            Approved: {clinics.length - pendingClinics.length} &middot; Pending: {pendingClinics.length}
          </div>
        </div>

        {clinicApprovalNotice && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{clinicApprovalNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setClinicApprovalNotice(null)}
              className="text-emerald-700 hover:text-emerald-950 text-xs font-bold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {pendingClinics.length > 0 ? (
          <div className="space-y-3">
            {pendingClinics.map(clinic => {
              const isApproving = approvingClinicId === clinic.id;
              const pendingTier = inferTierFromLimit(clinic.userLimit, clinic.userLimitTier);
              const pendingTierInfo = CLINIC_USER_LIMIT_TIERS[pendingTier];
              const pendingLimitDisplay =
                pendingTier === 'enterprise' && (!clinic.userLimit || clinic.userLimit >= 75)
                  ? '75+'
                  : clinic.userLimit || pendingTierInfo.maxUsers;
              return (
                <div
                  key={clinic.id}
                  className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{clinic.name}</span>
                      <span className="font-mono text-xs text-slate-600">({clinic.code})</span>
                      <span className="text-slate-300">&middot;</span>
                      <span className="font-mono text-xs font-bold text-rose-700">
                        Database status: false
                      </span>
                      <span className="text-slate-300">&middot;</span>
                      <span className="font-mono text-xs font-bold text-emerald-800">
                        Selected Limit: {pendingTierInfo.shortLabel} (Max {pendingLimitDisplay} Users)
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
                      <span>Admin: <strong>{clinic.adminName}</strong></span>
                      <span>&middot;</span>
                      <span className="font-mono">{clinic.email}</span>
                      {clinic.phone && (
                        <>
                          <span>&middot;</span>
                          <span>{clinic.phone}</span>
                        </>
                      )}
                      {clinic.createdAt && (
                        <>
                          <span>&middot;</span>
                          <span>Created: {clinic.createdAt}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <select
                      value={pendingTier}
                      onChange={async e => {
                        const newTier = e.target.value as ClinicUserLimitTier;
                        const res = await developerUpdateClinicUserLimit(clinic.id, newTier);
                        setMandateNotice({ message: res.message, isWarning: res.isOverLimit });
                      }}
                      className="p-2 border border-amber-300 rounded-lg bg-white text-xs font-bold text-slate-800"
                      title="Adjust user limit tier before or after approval"
                    >
                      <option value="access">Access 5 (Max 5 Users)</option>
                      <option value="basic">Basic 10 (Max 10 Users)</option>
                      <option value="standard">Standard 20 (Max 20 Users)</option>
                      <option value="premium">Premium 50 (Max 50 Users)</option>
                      <option value="enterprise">Enterprise 75+ (75+ Users)</option>
                    </select>

                    <button
                      type="button"
                      disabled={isApproving}
                      onClick={async () => {
                        setApprovingClinicId(clinic.id);
                        try {
                          const res = await approveClinicAccount(clinic.id, true);
                          setClinicApprovalNotice(res.message);
                        } finally {
                          setApprovingClinicId(null);
                        }
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {isApproving ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Updating Database...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve Clinic Account (status: false &rarr; true)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              All {clinics.length} created clinic accounts currently have database <code className="font-mono font-bold text-emerald-700">status: true</code> (Approved). When a new clinic name is registered, it will appear here with <code className="font-mono font-bold text-rose-700">status: false</code> for developer approval.
            </div>
          </div>
        )}
      </div>

      {/* CLINIC ADMINISTRATOR PASSWORDS CARD (VIEW THE PASSWORD OF THE ADMIN OF EACH CLINIC NAME) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-600" />
              <span>
                Clinic Administrator Passwords ({clinics.length} Clinic{clinics.length === 1 ? '' : 's'})
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              View the password of the administrator for each created clinic name, or reset/update an admin's password directly.
            </p>
          </div>
          {clinics.length > 0 && (
            <button
              type="button"
              onClick={() => setRevealAllAdminPasswords(prev => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                revealAllAdminPasswords
                  ? 'bg-amber-500 text-slate-950 border-amber-500'
                  : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
              }`}
            >
              {revealAllAdminPasswords ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Hide All Admin Passwords</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Show All Admin Passwords</span>
                </>
              )}
            </button>
          )}
        </div>

        {adminPasswordNotice && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{adminPasswordNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setAdminPasswordNotice(null)}
              className="text-emerald-800 hover:text-emerald-950 text-xs font-bold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {clinics.length === 0 ? (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
            No clinics have been created yet. Once a clinic is registered, its administrator credentials and password will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {clinics.map(clinic => {
              const clinicAdmins = users.filter(
                u =>
                  u.clinicId === clinic.id &&
                  (userHasRole(u, 'admin') ||
                    u.email.toLowerCase() === clinic.email.toLowerCase())
              );
              const primaryAdmin = clinicAdmins[0];
              const resolvedAdminName =
                primaryAdmin?.name ||
                (clinic.adminName || 'Clinic Administrator').replace(/\s*\(Chief Admin\)\s*$/i, '');
              const resolvedAdminEmail = primaryAdmin?.email || clinic.email;
              const resolvedPassword =
                primaryAdmin?.password || clinic.adminPassword || '';
              const isPasswordShown =
                revealAllAdminPasswords || Boolean(visibleAdminPasswords[clinic.id]);
              const isEditingThisClinic = editingAdminPasswordClinicId === clinic.id;

              return (
                <div
                  key={clinic.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-bold text-slate-900 text-xs">{clinic.name}</span>
                          <span className="font-mono text-[11px] text-slate-500">({clinic.code})</span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
                          <div>
                            Admin Name:{' '}
                            <strong className="text-slate-900">{resolvedAdminName}</strong>
                          </div>
                          <div className="font-mono text-slate-600">
                            Admin Email: <span className="text-slate-900 font-semibold">{resolvedAdminEmail}</span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                          clinic.status === false
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {clinic.status === false ? 'status: false' : 'status: true'}
                      </span>
                    </div>

                    {/* Password Display Box */}
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="text-[11px] font-bold text-slate-500">Admin Password:</span>
                        {resolvedPassword ? (
                          <code className="font-mono text-xs font-bold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 break-all">
                            {isPasswordShown ? resolvedPassword : '••••••••••••'}
                          </code>
                        ) : (
                          <span className="text-[11px] italic text-amber-700 font-semibold">
                            Not set (Google / External Auth)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {resolvedPassword && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setVisibleAdminPasswords(prev => ({
                                  ...prev,
                                  [clinic.id]: !prev[clinic.id]
                                }))
                              }
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title={isPasswordShown ? 'Hide Admin Password' : 'View Admin Password'}
                            >
                              {isPasswordShown ? (
                                <>
                                  <EyeOff className="w-3 h-3" />
                                  <span>Hide</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3" />
                                  <span>View</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (navigator.clipboard) {
                                  navigator.clipboard.writeText(resolvedPassword);
                                  setCopiedClinicId(clinic.id);
                                  setTimeout(() => setCopiedClinicId(null), 2000);
                                }
                              }}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer transition-colors"
                              title="Copy Admin Password"
                            >
                              {copiedClinicId === clinic.id ? 'Copied!' : 'Copy'}
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (isEditingThisClinic) {
                              setEditingAdminPasswordClinicId(null);
                              setNewAdminPasswordInput('');
                            } else {
                              setEditingAdminPasswordClinicId(clinic.id);
                              setNewAdminPasswordInput(resolvedPassword || '');
                            }
                          }}
                          className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          {isEditingThisClinic
                            ? 'Cancel'
                            : resolvedPassword
                            ? 'Reset Password'
                            : 'Set Password'}
                        </button>
                      </div>
                    </div>

                    {/* Additional Clinic Admins (if more than 1 admin user in this clinic) */}
                    {clinicAdmins.length > 1 && (
                      <div className="pt-1 space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">
                          Additional Clinic Admins ({clinicAdmins.length - 1})
                        </div>
                        {clinicAdmins.slice(1).map(coAdmin => (
                          <div
                            key={coAdmin.id}
                            className="p-2 rounded bg-white border border-slate-200 flex items-center justify-between gap-2 text-[11px]"
                          >
                            <div className="truncate">
                              <span className="font-bold text-slate-800">{coAdmin.name}</span>{' '}
                              <span className="text-slate-500 font-mono">({coAdmin.email})</span>
                            </div>
                            <code className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                              {isPasswordShown
                                ? coAdmin.password || 'Not set'
                                : '••••••••'}
                            </code>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline Password Edit / Reset Form */}
                    {isEditingThisClinic && (
                      <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 flex flex-wrap items-center gap-2 pt-2">
                        <input
                          type="text"
                          value={newAdminPasswordInput}
                          onChange={e => setNewAdminPasswordInput(e.target.value)}
                          placeholder="Enter new admin password (min 4 chars)"
                          className="flex-1 min-w-[160px] p-1.5 text-xs font-mono bg-white border border-amber-300 rounded text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await developerUpdateClinicAdminPassword(
                              clinic.id,
                              newAdminPasswordInput,
                              primaryAdmin?.id
                            );
                            if (res.success) {
                              setAdminPasswordNotice(res.message);
                              setEditingAdminPasswordClinicId(null);
                              setNewAdminPasswordInput('');
                              setVisibleAdminPasswords(prev => ({
                                ...prev,
                                [clinic.id]: true
                              }));
                            } else {
                              setMandateNotice({
                                message: res.message,
                                isWarning: true
                              });
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold cursor-pointer"
                        >
                          Save Admin Password
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 1: MONITOR USERS, UPPER LIMITS, READS, WRITES & DATA FOOTPRINT PER CREATED CLINIC NAME */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Per-Clinic User Limits, Reads, Writes & Data Usage Monitor ({clinics.length})</span>
            </h3>
            <p className="text-xs text-slate-500">
              Monitor each clinic's upper user limit (Access 5, Basic 10, Standard 20, Premium 50, Enterprise 75+), modify user capacity, and suspend or delete clinic users upon downgrade.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Selected Date: {selectedDateKey}
          </div>
        </div>

        {mandateNotice && (
          <div
            className={`p-3.5 rounded-lg border text-xs font-semibold flex items-center justify-between gap-2 ${
              mandateNotice.isWarning
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {mandateNotice.isWarning ? (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{mandateNotice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setMandateNotice(null)}
              className="text-xs font-bold underline cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="px-4 py-3">Created Clinic Name & Code</th>
                <th className="px-4 py-3">Users & Upper Limit Tier</th>
                <th className="px-4 py-3">Selected Day ({selectedDateKey})</th>
                <th className="px-4 py-3">{MONTH_NAMES[calendarMonth].slice(0, 3)} {calendarYear} (Month)</th>
                <th className="px-4 py-3">Total Reads & Writes</th>
                <th className="px-4 py-3">Data Transferred & Docs</th>
                <th className="px-4 py-3 text-right">Developer Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {clinics.map(clinic => {
                const clinicUsers = users.filter(u => u.clinicId === clinic.id);
                const activeUsersCount = clinicUsers.filter(u => u.status === 'active').length;
                const suspendedUsersCount = clinicUsers.filter(u => u.status === 'suspended').length;
                const pendingUsersCount = clinicUsers.filter(
                  u => u.status !== 'active' && u.status !== 'suspended'
                ).length;

                const currentTier = inferTierFromLimit(clinic.userLimit, clinic.userLimitTier);
                const tierInfo = CLINIC_USER_LIMIT_TIERS[currentTier];
                const effectiveMaxUsers = clinic.userLimit || tierInfo.maxUsers;
                const isEnterpriseUnlimited =
                  currentTier === 'enterprise' && (!clinic.userLimit || clinic.userLimit >= 75);
                const isOverLimit = !isEnterpriseUnlimited && activeUsersCount > effectiveMaxUsers;
                const excessUsersCount = isOverLimit ? activeUsersCount - effectiveMaxUsers : 0;

                const dayMetric = getDayMetrics(selectedDateKey, clinic.id);
                const monthMetric = monthSummary.byClinicMonth[clinic.id] || {
                  reads: 0,
                  writes: 0,
                  bytes: 0
                };
                const totalMetric = telemetry.clinicTotals[clinic.id] || {
                  reads: 0,
                  writes: 0,
                  bytesRead: 0,
                  bytesWritten: 0
                };
                const footprint = liveFootprintByClinic[clinic.id] || {
                  docs: 1,
                  bytes: 0,
                  patients: 0,
                  inventory: 0,
                  prescriptions: 0,
                  diagnostics: 0,
                  encounters: 0,
                  ledgers: 0,
                  auditLogs: 0
                };

                const isExpanded = expandedClinicId === clinic.id;
                const totalOps = Math.max(1, totalMetric.reads + totalMetric.writes);
                const readPct = Math.round((totalMetric.reads / totalOps) * 100);
                const customInputVal =
                  customLimitInputs[clinic.id] !== undefined
                    ? customLimitInputs[clinic.id]
                    : String(effectiveMaxUsers);

                return (
                  <React.Fragment key={clinic.id}>
                    <tr className={`hover:bg-slate-50/80 transition-colors ${isOverLimit ? 'bg-rose-50/40' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{clinic.name}</span>
                          <span
                            className={`font-mono text-[10px] font-bold ${
                              clinic.status === false ? 'text-rose-700' : 'text-emerald-700'
                            }`}
                          >
                            [status: {clinic.status === false ? 'false' : 'true'}]
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">{clinic.code}</span>
                          <span>&middot;</span>
                          <span>Admin: {clinic.adminName || clinic.email}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-bold text-slate-900 font-mono">
                            {activeUsersCount} / {isEnterpriseUnlimited ? '75+' : effectiveMaxUsers} Active
                          </span>
                          <span className="text-slate-300">&middot;</span>
                          <span className="font-bold text-emerald-800 text-[11px]">
                            {tierInfo.shortLabel}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {clinicUsers.length} total ({activeUsersCount} active
                          {suspendedUsersCount > 0 ? ` · ${suspendedUsersCount} suspended` : ''}
                          {pendingUsersCount > 0 ? ` · ${pendingUsersCount} pending` : ''})
                        </div>

                        {isOverLimit && (
                          <div className="mt-1 text-[10px] font-bold text-rose-700 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>
                              Over limit by {excessUsersCount} user(s) — Suspend or Delete below
                            </span>
                          </div>
                        )}

                        <div className="mt-1.5 flex items-center gap-1.5">
                          <select
                            value={currentTier}
                            onChange={async e => {
                              const nextTier = e.target.value as ClinicUserLimitTier;
                              const nextMax = CLINIC_USER_LIMIT_TIERS[nextTier].maxUsers;
                              setCustomLimitInputs(prev => ({
                                ...prev,
                                [clinic.id]: String(nextMax)
                              }));
                              const res = await developerUpdateClinicUserLimit(clinic.id, nextTier);
                              setMandateNotice({
                                message: res.message,
                                isWarning: res.isOverLimit
                              });
                              if (res.isOverLimit) {
                                setExpandedClinicId(clinic.id);
                              }
                            }}
                            className="p-1 border border-slate-300 rounded bg-white text-[11px] font-bold text-slate-800"
                            title="Change clinic user limit tier"
                          >
                            <option value="access">Access 5 (5 Users)</option>
                            <option value="basic">Basic 10 (10 Users)</option>
                            <option value="standard">Standard 20 (20 Users)</option>
                            <option value="premium">Premium 50 (50 Users)</option>
                            <option value="enterprise">Enterprise 75+ (75+ Users)</option>
                          </select>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-sky-700 font-bold">
                            {dayMetric.reads.toLocaleString()} R
                          </span>
                          <span className="text-slate-300">/</span>
                          <span className="text-emerald-700 font-bold">
                            {dayMetric.writes.toLocaleString()} W
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {formatBytes(dayMetric.bytesRead + dayMetric.bytesWritten)}
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-sky-700 font-bold">
                            {monthMetric.reads.toLocaleString()} R
                          </span>
                          <span className="text-slate-300">/</span>
                          <span className="text-emerald-700 font-bold">
                            {monthMetric.writes.toLocaleString()} W
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {formatBytes(monthMetric.bytes)}
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-sky-700 font-bold">
                            {totalMetric.reads.toLocaleString()} Reads
                          </span>
                          <span className="text-slate-300">&middot;</span>
                          <span className="text-emerald-700 font-bold">
                            {totalMetric.writes.toLocaleString()} Writes
                          </span>
                        </div>
                        <div className="w-28 h-1.5 bg-emerald-200 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-sky-600"
                            style={{ width: `${readPct}%` }}
                          />
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800 font-mono">
                          {formatBytes(totalMetric.bytesRead + totalMetric.bytesWritten)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {footprint.docs.toLocaleString()} live docs ({formatBytes(footprint.bytes)})
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-1.5">
                        <button
                          type="button"
                          onClick={async () => {
                            const nextStatus = clinic.status === false ? true : false;
                            const res = await approveClinicAccount(clinic.id, nextStatus);
                            setClinicApprovalNotice(res.message);
                          }}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                            clinic.status === false
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                          }`}
                          title={
                            clinic.status === false
                              ? 'Approve clinic account (set status: true)'
                              : 'Set clinic status back to false (Pending Approval)'
                          }
                        >
                          {clinic.status === false ? 'Approve (Set true)' : 'Status: true'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedClinicFilter(
                              selectedClinicFilter === clinic.id ? 'all' : clinic.id
                            )
                          }
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                            selectedClinicFilter === clinic.id
                              ? 'bg-sky-600 text-white border-sky-600'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {selectedClinicFilter === clinic.id ? 'Filtered in Calendar' : 'Filter Calendar'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedClinicId(isExpanded ? null : clinic.id)
                          }
                          className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer border ${
                            isOverLimit
                              ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600'
                              : isExpanded
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                          }`}
                        >
                          {isExpanded
                            ? 'Hide Users & Limits'
                            : isOverLimit
                            ? `Manage Downgrade (${excessUsersCount} Over)`
                            : 'Manage Users & Limits'}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-slate-50/90">
                        <td colSpan={7} className="px-5 py-4 space-y-4">
                          {/* Developer User Limit & Downgrade Mandate Control Bar */}
                          <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                              <div>
                                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                  <Sliders className="w-4 h-4 text-emerald-600" />
                                  <span>
                                    Developer User Limit & Tier Control for {clinic.name} ({clinic.code})
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Change the upper limit of users for this clinic ID. If downgraded below current active users ({activeUsersCount}), use the Developer Mandate controls below to suspend or delete users.
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {(
                                  [
                                    { tier: 'access', label: 'Access 5', max: 5 },
                                    { tier: 'basic', label: 'Basic 10', max: 10 },
                                    { tier: 'standard', label: 'Standard 20', max: 20 },
                                    { tier: 'premium', label: 'Premium 50', max: 50 },
                                    { tier: 'enterprise', label: 'Enterprise 75+', max: 75 }
                                  ] as Array<{ tier: ClinicUserLimitTier; label: string; max: number }>
                                ).map(t => {
                                  const isCurrentTier =
                                    currentTier === t.tier && effectiveMaxUsers === t.max;
                                  return (
                                    <button
                                      key={t.tier}
                                      type="button"
                                      onClick={async () => {
                                        setCustomLimitInputs(prev => ({
                                          ...prev,
                                          [clinic.id]: String(t.max)
                                        }));
                                        const res = await developerUpdateClinicUserLimit(
                                          clinic.id,
                                          t.tier,
                                          t.max
                                        );
                                        setMandateNotice({
                                          message: res.message,
                                          isWarning: res.isOverLimit
                                        });
                                      }}
                                      className={`px-2.5 py-1.5 rounded-md text-xs font-bold border transition-colors cursor-pointer ${
                                        isCurrentTier
                                          ? 'bg-emerald-600 text-white border-emerald-600'
                                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                                      }`}
                                    >
                                      {t.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Custom Number of Users Override */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <label className="font-bold text-slate-700">
                                  Custom Number of Users Limit:
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={5000}
                                  value={customInputVal}
                                  onChange={e =>
                                    setCustomLimitInputs(prev => ({
                                      ...prev,
                                      [clinic.id]: e.target.value
                                    }))
                                  }
                                  className="w-24 p-1.5 border border-slate-300 rounded bg-white font-mono font-bold text-slate-900 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const parsed = parseInt(customInputVal, 10);
                                    if (!parsed || parsed < 1) return;
                                    const matchedTier = inferTierFromLimit(parsed);
                                    const res = await developerUpdateClinicUserLimit(
                                      clinic.id,
                                      matchedTier,
                                      parsed
                                    );
                                    setMandateNotice({
                                      message: res.message,
                                      isWarning: res.isOverLimit
                                    });
                                  }}
                                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold text-xs cursor-pointer"
                                >
                                  Set Max Users
                                </button>
                              </div>

                              <div className="text-xs font-mono text-slate-600">
                                Current Upper Limit:{' '}
                                <strong className="text-slate-900">
                                  {tierInfo.shortLabel} (Max {isEnterpriseUnlimited ? '75+' : effectiveMaxUsers} Users)
                                </strong>{' '}
                                &middot; Active: <strong className="text-emerald-700">{activeUsersCount}</strong>{' '}
                                &middot; Suspended: <strong className="text-rose-700">{suspendedUsersCount}</strong>
                              </div>
                            </div>

                            {isOverLimit && (
                              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                  <span>
                                    Account Downgrade Mandate Active: {clinic.name} has {activeUsersCount} active users, exceeding its downgraded limit of {effectiveMaxUsers} users by {excessUsersCount}. As Developer, you have the mandate to suspend or delete {excessUsersCount} user(s) below.
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Developer Mandate: Users Roster for this Clinic (Suspend / Reactivate / Delete) */}
                            <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2">
                              <div className="font-bold text-slate-800 text-xs flex items-center justify-between border-b border-slate-100 pb-2">
                                <span>
                                  Clinic Users & Developer Mandate ({clinicUsers.length} Users in {clinic.name})
                                </span>
                                <span className="text-[11px] font-normal text-slate-500">
                                  Suspend or Delete Users
                                </span>
                              </div>
                              {clinicUsers.length === 0 ? (
                                <p className="text-xs text-slate-400 py-2">
                                  No users registered for this clinic.
                                </p>
                              ) : (
                                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                                  {clinicUsers.map(u => {
                                    const isConfirmingDelete = confirmDeleteUserId === u.id;
                                    return (
                                      <div
                                        key={u.id}
                                        className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]"
                                      >
                                        <div className="space-y-0.5">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-slate-900">{u.name}</span>
                                            <span className="text-slate-500 font-mono">({u.email})</span>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-1.5 text-slate-500 font-semibold">
                                            <span className="uppercase">
                                              {getUserRoles(u)
                                                .map(r => r.replace('_', ' '))
                                                .join(', ')}
                                            </span>
                                            <span>&middot;</span>
                                            <span>Lvl {u.clearanceLevel}</span>
                                            <span>&middot;</span>
                                            <span
                                              className={
                                                u.status === 'active'
                                                  ? 'text-emerald-700 font-bold'
                                                  : u.status === 'suspended'
                                                  ? 'text-rose-700 font-bold'
                                                  : 'text-amber-700 font-bold'
                                              }
                                            >
                                              {u.status.toUpperCase()}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                          {u.status === 'suspended' ? (
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                const res = await developerSetClinicUserStatus(
                                                  u.id,
                                                  'active'
                                                );
                                                setMandateNotice({
                                                  message: res.message,
                                                  isWarning: !res.success
                                                });
                                              }}
                                              className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold flex items-center gap-1 cursor-pointer"
                                              title="Reactivate suspended user"
                                            >
                                              <UserCheck className="w-3 h-3" />
                                              <span>Reactivate</span>
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                const res = await developerSetClinicUserStatus(
                                                  u.id,
                                                  'suspended'
                                                );
                                                setMandateNotice({
                                                  message: res.message,
                                                  isWarning: false
                                                });
                                              }}
                                              className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold flex items-center gap-1 cursor-pointer"
                                              title="Suspend user from this clinic"
                                            >
                                              <Ban className="w-3 h-3" />
                                              <span>Suspend</span>
                                            </button>
                                          )}

                                          {isConfirmingDelete ? (
                                            <div className="flex items-center gap-1">
                                              <button
                                                type="button"
                                                onClick={async () => {
                                                  const res = await developerDeleteClinicUser(u.id);
                                                  setConfirmDeleteUserId(null);
                                                  setMandateNotice({
                                                    message: res.message,
                                                    isWarning: false
                                                  });
                                                }}
                                                className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                                              >
                                                Confirm Delete
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setConfirmDeleteUserId(null)}
                                                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => setConfirmDeleteUserId(u.id)}
                                              className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold flex items-center gap-1 cursor-pointer"
                                              title="Permanently delete user from this clinic"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              <span>Delete</span>
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Stored Document Breakdown for this Clinic */}
                            <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2">
                              <div className="font-bold text-slate-800 text-xs flex items-center justify-between">
                                <span>Stored Collection Records for {clinic.name}</span>
                                <span className="font-mono text-[11px] text-slate-500">
                                  {footprint.docs} total documents
                                </span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                                <div className="p-2 rounded bg-slate-50 border border-slate-100">
                                  <div className="text-slate-500">Users</div>
                                  <div className="font-bold text-slate-900 font-mono text-sm">
                                    {clinicUsers.length}
                                  </div>
                                </div>
                                <div className="p-2 rounded bg-slate-50 border border-slate-100">
                                  <div className="text-slate-500">Patients</div>
                                  <div className="font-bold text-slate-900 font-mono text-sm">
                                    {footprint.patients}
                                  </div>
                                </div>
                                <div className="p-2 rounded bg-slate-50 border border-slate-100">
                                  <div className="text-slate-500">Inventory Items</div>
                                  <div className="font-bold text-slate-900 font-mono text-sm">
                                    {footprint.inventory}
                                  </div>
                                </div>
                                <div className="p-2 rounded bg-slate-50 border border-slate-100">
                                  <div className="text-slate-500">Prescriptions</div>
                                  <div className="font-bold text-slate-900 font-mono text-sm">
                                    {footprint.prescriptions}
                                  </div>
                                </div>
                                <div className="p-2 rounded bg-slate-50 border border-slate-100">
                                  <div className="text-slate-500">Lab & Radiology</div>
                                  <div className="font-bold text-slate-900 font-mono text-sm">
                                    {footprint.diagnostics}
                                  </div>
                                </div>
                                <div className="p-2 rounded bg-slate-50 border border-slate-100">
                                  <div className="text-slate-500">Encounters</div>
                                  <div className="font-bold text-slate-900 font-mono text-sm">
                                    {footprint.encounters}
                                  </div>
                                </div>
                                <div className="p-2 rounded bg-slate-50 border border-slate-100">
                                  <div className="text-slate-500">Billing Ledgers</div>
                                  <div className="font-bold text-slate-900 font-mono text-sm">
                                    {footprint.ledgers}
                                  </div>
                                </div>
                                <div className="p-2 rounded bg-slate-50 border border-slate-100">
                                  <div className="text-slate-500">Audit Events</div>
                                  <div className="font-bold text-slate-900 font-mono text-sm">
                                    {footprint.auditLogs}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: CALENDAR TRACKER FOR DAILY & MONTHLY USAGE AND DATA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Calendar Grid (2 columns wide on desktop) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-600" />
                <span>Daily & Monthly Usage Calendar Tracker</span>
              </h3>
              <p className="text-xs text-slate-500">
                Click any date to inspect daily reads, writes, and per-clinic data usage.
              </p>
            </div>

            {/* Clinic Scope Filter + Month Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedClinicFilter}
                onChange={e => setSelectedClinicFilter(e.target.value)}
                className="p-1.5 border border-slate-300 rounded-lg bg-white text-xs font-bold text-slate-800"
              >
                <option value="all">All Clinics (General Usage)</option>
                {clinics.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-white rounded text-slate-700 cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2.5 text-xs font-bold text-slate-900 min-w-[115px] text-center">
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-white rounded text-slate-700 cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleJumpToToday}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Today
              </button>
            </div>
          </div>

          {/* Day-of-week header */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-slate-500 uppercase">
            {DAY_NAMES.map(dayName => (
              <div key={dayName} className="py-1">
                {dayName}
              </div>
            ))}
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((cell, index) => {
              if (!cell.day || !cell.dateKey) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="h-20 rounded-lg bg-slate-50/50 border border-slate-100"
                  />
                );
              }

              const isSelected = cell.dateKey === selectedDateKey;
              const isToday = cell.dateKey === todayKey;
              const hasActivity = cell.reads > 0 || cell.writes > 0;

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() => setSelectedDateKey(cell.dateKey!)}
                  className={`h-20 p-1.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/30'
                      : isToday
                      ? 'border-sky-500 bg-sky-50/30'
                      : hasActivity
                      ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      : 'border-slate-100 bg-slate-50/40 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-bold ${
                        isSelected
                          ? 'text-emerald-800'
                          : isToday
                          ? 'text-sky-700'
                          : 'text-slate-700'
                      }`}
                    >
                      {cell.day}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-bold text-sky-600 uppercase">
                        Today
                      </span>
                    )}
                  </div>

                  {hasActivity ? (
                    <div className="space-y-0.5 w-full">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-sky-700 font-semibold">{cell.reads}R</span>
                        <span className="text-emerald-700 font-semibold">{cell.writes}W</span>
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono truncate">
                        {formatBytes(cell.bytes)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-400 font-mono">0 ops</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Monthly Rollup Bar */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="font-bold text-slate-800">
                {MONTH_NAMES[calendarMonth]} {calendarYear} Monthly Summary
              </div>
              <div className="text-[11px] text-slate-500">
                Avg Daily: {Math.round(monthSummary.reads / monthSummary.activeDays)} Reads /{' '}
                {Math.round(monthSummary.writes / monthSummary.activeDays)} Writes per active day
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 font-mono">
              <div>
                <span className="text-slate-500 text-[11px]">Month Reads: </span>
                <span className="font-bold text-sky-700">
                  {monthSummary.reads.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Month Writes: </span>
                <span className="font-bold text-emerald-700">
                  {monthSummary.writes.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Month Data: </span>
                <span className="font-bold text-slate-900">
                  {formatBytes(monthSummary.totalBytes)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Date & Monthly Clinic Breakdown Inspector (1 column wide on desktop) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                Selected Day Inspector
              </div>
              <h3 className="text-base font-black text-slate-900 mt-0.5 font-mono">
                {selectedDateKey}
              </h3>
              <p className="text-xs text-slate-500">
                {selectedClinicFilter === 'all'
                  ? 'Showing combined usage across all created clinics'
                  : `Filtered for ${clinics.find(c => c.id === selectedClinicFilter)?.name || 'Selected Clinic'}`}
              </p>
            </div>

            {/* Day Reads / Writes / Data */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-sky-50/70 border border-sky-200">
                <div className="text-[11px] font-bold text-sky-800 flex items-center gap-1">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Daily Reads</span>
                </div>
                <div className="text-xl font-black text-sky-950 font-mono mt-1">
                  {selectedDayMetrics.reads.toLocaleString()}
                </div>
                <div className="text-[11px] text-sky-700 font-mono">
                  {formatBytes(selectedDayMetrics.bytesRead)} read
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
                <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Daily Writes</span>
                </div>
                <div className="text-xl font-black text-emerald-950 font-mono mt-1">
                  {selectedDayMetrics.writes.toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-700 font-mono">
                  {formatBytes(selectedDayMetrics.bytesWritten)} written
                </div>
              </div>
            </div>

            {/* Per-Clinic Breakdown on Selected Day */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Clinic Activity on {selectedDateKey}</span>
                <span className="text-[11px] font-normal text-slate-500">Reads / Writes</span>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {clinics.map(clinic => {
                  const cm = selectedDayRawRecord?.byClinic?.[clinic.id] || {
                    reads: 0,
                    writes: 0,
                    bytesRead: 0,
                    bytesWritten: 0
                  };
                  return (
                    <div
                      key={clinic.id}
                      className="p-2.5 bg-white flex items-center justify-between text-xs"
                    >
                      <div className="truncate pr-2">
                        <div className="font-bold text-slate-800 truncate">{clinic.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {formatBytes(cm.bytesRead + cm.bytesWritten)}
                        </div>
                      </div>
                      <div className="font-mono text-right shrink-0">
                        <span className="text-sky-700 font-bold">{cm.reads} R</span>
                        <span className="text-slate-300 mx-1">/</span>
                        <span className="text-emerald-700 font-bold">{cm.writes} W</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Peak Day & Collection Telemetry Footer */}
          <div className="p-3.5 rounded-lg bg-slate-900 text-slate-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Peak Day ({MONTH_NAMES[calendarMonth]}):</span>
              <span className="font-mono font-bold text-emerald-400">
                {monthSummary.peakDay.date || selectedDateKey} ({monthSummary.peakDay.totalOps} ops)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Security Gate Status:</span>
              <span className="font-mono text-amber-300">
                {securityConfig.isDefault ? 'Default Credentials' : 'Custom Password & PIN Active'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
