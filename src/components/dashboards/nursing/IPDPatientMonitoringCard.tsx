import React, { useState, useEffect, useMemo } from 'react';
import {
  Patient,
  ClinicalEncounter,
  ClinicalProcedure,
  TestOrder,
  RadiologyOrder,
  Prescription,
  AdministeredItem,
  DischargeSummary
} from '../../../types';
import { useClinic } from '../../../context/ClinicContext';
import {
  BedDouble,
  Search,
  FileText,
  Scissors,
  Microscope,
  Film,
  Syringe,
  Activity,
  HeartPulse,
  User,
  Clock,
  Printer,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Check,
  Plus,
  Filter,
  Stethoscope,
  Pill,
  Sparkles,
  ClipboardCheck,
  FileSpreadsheet,
  LogOut,
  Eye,
  Ambulance,
  HeartCrack,
  Building2,
  DoorOpen,
  Tag,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  SlidersHorizontal,
  X,
  Calendar
} from 'lucide-react';
import { PrintReceiptModal } from '../../common/PrintReceiptModal';
import { InjectionRoomUnitAdminList } from './InjectionRoomUnitAdminList';
import { PatientTreatmentChartCard } from './PatientTreatmentChartCard';
import { DigitalPatientCaseFile } from './DigitalPatientCaseFile';
import { DischargePatientModal } from './DischargePatientModal';
import { DischargedPatientsSearchCard } from './DischargedPatientsSearchCard';
import { ViewDischargeFileModal } from '../../common/ViewDischargeFileModal';
import { ReferralPatientModal } from './ReferralPatientModal';
import { ViewReferralFileModal } from '../../common/ViewReferralFileModal';
import { ReportDeceasedModal } from './ReportDeceasedModal';
import { ViewDeathCertificateModal } from '../../common/ViewDeathCertificateModal';
import { formatPatientAge, getAgeInYears } from '../../../utils/ageUtils';

interface IPDPatientMonitoringCardProps {
  onAdministerItemForPatient?: (patient: Patient) => void;
}

export const IPDPatientMonitoringCard: React.FC<IPDPatientMonitoringCardProps> = ({
  onAdministerItemForPatient
}) => {
  const {
    activeClinic,
    currentUser,
    patients,
    currentClinicPatients,
    currentClinicDepartments,
    currentClinicWards,
    encounters,
    currentClinicEncounters,
    procedures,
    currentClinicProcedures,
    testOrders,
    currentClinicTestOrders,
    radiologyOrders,
    currentClinicRadiologyOrders,
    prescriptions,
    currentClinicPrescriptions,
    administeredItems,
    currentClinicAdministeredItems,
    recordAdministeredItem,
    currentClinicPharmacyCarts,
    administerIndirectCartItem,
    currentClinicInventory,
    currentClinicTreatmentCharts,
    dischargeSummaries,
    currentClinicDischargeSummaries,
    getDischargeSummaryForPatient,
    currentClinicReferrals,
    currentClinicDeathCertificates,
    getDeathCertificateForPatient
  } = useClinic();

  // Discharge modal state
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
  const [isViewDischargeFileOpen, setIsViewDischargeFileOpen] = useState(false);
  const [dischargeModalPatient, setDischargeModalPatient] = useState<Patient | null>(null);

  // Referral modal state
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [isViewReferralFileOpen, setIsViewReferralFileOpen] = useState(false);
  const [referralModalPatient, setReferralModalPatient] = useState<Patient | null>(null);

  // Deceased & Death Certificate modal state
  const [isReportDeceasedModalOpen, setIsReportDeceasedModalOpen] = useState(false);
  const [isViewDeathCertModalOpen, setIsViewDeathCertModalOpen] = useState(false);
  const [deceasedModalPatient, setDeceasedModalPatient] = useState<Patient | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ipd_only' | 'discharged' | 'deceased' | 'all'>('ipd_only');
  const [sortKey, setSortKey] = useState<'date' | 'name' | 'mrn' | 'age'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('all');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const [selectedWardFilter, setSelectedWardFilter] = useState<string>('all');
  const [selectedBedFilter, setSelectedBedFilter] = useState<string>('all');
  const [isQueueExpanded, setIsQueueExpanded] = useState<boolean>(false);

  // Helper to extract timestamp reliably for date sorting
  const getPatientTimestamp = (p: Patient): number => {
    const raw = (p as any).admissionDate || p.registeredAt || (p as any).createdAt || '';
    if (!raw) return 0;
    const time = new Date(raw).getTime();
    return isNaN(time) ? 0 : time;
  };

  // Filter patients by classification
  const ipdPatients = useMemo(() => {
    return currentClinicPatients.filter(
      p => p.patientType === 'IPD' && p.currentStatus !== 'discharged' && p.currentStatus !== 'deceased'
    );
  }, [currentClinicPatients]);

  const dischargedPatients = useMemo(() => {
    return currentClinicPatients.filter(
      p => p.currentStatus === 'discharged' || currentClinicDischargeSummaries.some(ds => ds.patientId === p.id)
    );
  }, [currentClinicPatients, currentClinicDischargeSummaries]);

  const deceasedPatients = useMemo(() => {
    return currentClinicPatients.filter(
      p => p.currentStatus === 'deceased' || currentClinicDeathCertificates.some(d => d.patientId === p.id)
    );
  }, [currentClinicPatients, currentClinicDeathCertificates]);

  const availablePatients = useMemo(() => {
    if (filterType === 'ipd_only') {
      return ipdPatients.length > 0 ? ipdPatients : currentClinicPatients;
    }
    if (filterType === 'discharged') return dischargedPatients;
    if (filterType === 'deceased') return deceasedPatients;
    return currentClinicPatients;
  }, [filterType, ipdPatients, dischargedPatients, deceasedPatients, currentClinicPatients]);

  // Unique list of available clinical departments
  const availableDepartments = useMemo(() => {
    const deptSet = new Set<string>();
    if (currentClinicDepartments && Array.isArray(currentClinicDepartments)) {
      currentClinicDepartments.forEach(d => {
        if (d.name) deptSet.add(d.name);
      });
    }
    availablePatients.forEach(p => {
      if (p.department) deptSet.add(p.department);
    });
    if (deptSet.size === 0 && availablePatients.length > 0) {
      deptSet.add('General Outpatient (OPD)');
      deptSet.add('Inpatient Ward');
    }
    return Array.from(deptSet).sort();
  }, [currentClinicDepartments, availablePatients]);

  // Unique list of available consultation rooms (reactive to selected department)
  const availableRooms = useMemo(() => {
    const roomSet = new Set<string>();
    if (selectedDepartmentFilter !== 'all') {
      const targetDept = currentClinicDepartments?.find(d => d.name === selectedDepartmentFilter);
      if (targetDept?.rooms) {
        targetDept.rooms.forEach(r => roomSet.add(r));
      }
      availablePatients
        .filter(p => (p.department || 'General Outpatient (OPD)') === selectedDepartmentFilter || p.department === selectedDepartmentFilter)
        .forEach(p => {
          if (p.doctorRoom) roomSet.add(p.doctorRoom);
        });
    } else {
      if (currentClinicDepartments && Array.isArray(currentClinicDepartments)) {
        currentClinicDepartments.forEach(d => {
          if (d.rooms) d.rooms.forEach(r => roomSet.add(r));
        });
      }
      availablePatients.forEach(p => {
        if (p.doctorRoom) roomSet.add(p.doctorRoom);
      });
    }
    return Array.from(roomSet).sort();
  }, [currentClinicDepartments, availablePatients, selectedDepartmentFilter]);

  // Unique list of available clinical wards
  const availableWards = useMemo(() => {
    const wardSet = new Set<string>();
    if (currentClinicWards && Array.isArray(currentClinicWards)) {
      currentClinicWards.forEach(w => {
        if (w.name) wardSet.add(w.name);
      });
    }
    availablePatients.forEach(p => {
      if (p.ward) wardSet.add(p.ward);
    });
    return Array.from(wardSet).sort();
  }, [currentClinicWards, availablePatients]);

  // Unique list of available bed numbers (reactive to selected ward)
  const availableBeds = useMemo(() => {
    const bedSet = new Set<string>();
    if (selectedWardFilter !== 'all') {
      const targetWard = currentClinicWards?.find(w => w.name === selectedWardFilter);
      if (targetWard?.beds) {
        targetWard.beds.forEach(b => bedSet.add(b));
      }
      availablePatients
        .filter(p => p.ward === selectedWardFilter)
        .forEach(p => {
          if (p.bedNumber) bedSet.add(p.bedNumber);
        });
    } else {
      if (currentClinicWards && Array.isArray(currentClinicWards)) {
        currentClinicWards.forEach(w => {
          if (w.beds) w.beds.forEach(b => bedSet.add(b));
        });
      }
      availablePatients.forEach(p => {
        if (p.bedNumber) bedSet.add(p.bedNumber);
      });
    }
    return Array.from(bedSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [currentClinicWards, availablePatients, selectedWardFilter]);

  // Filtered and Sorted patient queue
  const filteredPatients = useMemo(() => {
    let list = [...availablePatients];

    // Filter by department
    if (selectedDepartmentFilter !== 'all') {
      list = list.filter(p => {
        const pDept = p.department || (p.patientType === 'IPD' ? 'Inpatient Ward' : 'General Outpatient (OPD)');
        return pDept.toLowerCase() === selectedDepartmentFilter.toLowerCase() || p.department === selectedDepartmentFilter;
      });
    }

    // Filter by consultation room
    if (selectedRoomFilter !== 'all') {
      list = list.filter(p => {
        const pRoom = p.doctorRoom || (p.patientType === 'IPD' ? (p.ward || 'Ward') : 'Consultation Room 1');
        return pRoom.toLowerCase() === selectedRoomFilter.toLowerCase() || p.doctorRoom === selectedRoomFilter;
      });
    }

    // Filter by ward name
    if (selectedWardFilter !== 'all') {
      list = list.filter(p => {
        return p.ward && p.ward.toLowerCase() === selectedWardFilter.toLowerCase();
      });
    }

    // Filter by bed number
    if (selectedBedFilter !== 'all') {
      list = list.filter(p => {
        return p.bedNumber && p.bedNumber.toLowerCase() === selectedBedFilter.toLowerCase();
      });
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(term) ||
        p.mrn.toLowerCase().includes(term) ||
        (p.allergies && p.allergies.some(a => a.toLowerCase().includes(term))) ||
        (p.ward && p.ward.toLowerCase().includes(term)) ||
        (p.bedNumber && p.bedNumber.toLowerCase().includes(term)) ||
        (p.department && p.department.toLowerCase().includes(term)) ||
        (p.doctorRoom && p.doctorRoom.toLowerCase().includes(term))
      );
    }

    // Sort list
    list.sort((a, b) => {
      if (sortKey === 'date') {
        const timeA = getPatientTimestamp(a);
        const timeB = getPatientTimestamp(b);
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }
      if (sortKey === 'name') {
        const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
        const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      if (sortKey === 'mrn') {
        const mrnA = (a.mrn || '').toLowerCase();
        const mrnB = (b.mrn || '').toLowerCase();
        return sortOrder === 'asc'
          ? mrnA.localeCompare(mrnB, undefined, { numeric: true })
          : mrnB.localeCompare(mrnA, undefined, { numeric: true });
      }
      if (sortKey === 'age') {
        const ageA = getAgeInYears(a);
        const ageB = getAgeInYears(b);
        return sortOrder === 'asc' ? ageA - ageB : ageB - ageA;
      }
      return 0;
    });

    return list;
  }, [
    availablePatients,
    selectedDepartmentFilter,
    selectedRoomFilter,
    selectedWardFilter,
    selectedBedFilter,
    searchTerm,
    sortKey,
    sortOrder
  ]);

  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // Keep selected patient valid if currently selected patient is removed from clinic
  useEffect(() => {
    if (selectedPatientId && !currentClinicPatients.some(p => p.id === selectedPatientId)) {
      setSelectedPatientId('');
    }
  }, [currentClinicPatients, selectedPatientId]);

  const selectedPatient = selectedPatientId
    ? (currentClinicPatients.find(p => p.id === selectedPatientId) || null)
    : null;

  // Active subtab within the IPD Patient card
  const [activeSubTab, setActiveSubTab] = useState<'treatment_chart' | 'workup' | 'procedures' | 'tests' | 'medications' | 'discharged_search'>('treatment_chart');

  // Check if selected patient has an existing discharge summary
  const selectedPatientDischargeSummary = currentClinicDischargeSummaries.find(
    ds => ds.patientId === selectedPatient?.id
  );
  const isSelectedPatientDischarged = selectedPatient?.currentStatus === 'discharged' || !!selectedPatientDischargeSummary;

  // Check if selected patient has an existing referral
  const selectedPatientReferral = currentClinicReferrals.find(
    r => r.patientId === selectedPatient?.id
  );

  // Check if selected patient has an existing death certificate / is deceased
  const selectedPatientDeathCert = currentClinicDeathCertificates.find(
    d => d.patientId === selectedPatient?.id
  );
  const isSelectedPatientDeceased = selectedPatient?.currentStatus === 'deceased' || !!selectedPatientDeathCert;

  // Collapsible items
  const [expandedLabId, setExpandedLabId] = useState<string | null>(null);
  const [expandedRadId, setExpandedRadId] = useState<string | null>(null);
  const [isQuickAdministerOpen, setIsQuickAdministerOpen] = useState(false);

  // Quick administration form within IPD card
  const [quickAdminForm, setQuickAdminForm] = useState({
    inventoryItemId: '',
    quantity: 1,
    route: 'IV Infusion',
    notes: '',
    vitals: {
      bloodPressure: '120/80',
      pulseRate: 74,
      temperature: 36.8,
      spO2: 99
    }
  });

  // Print modal state
  const [printModal, setPrintModal] = useState<{
    isOpen: boolean;
    type: 'workup' | 'procedure' | 'lab_report' | 'radiology_report' | 'prescription' | 'receipt' | 'ledger' | 'case_file' | 'discharge_summary' | 'referral_form' | 'death_certificate';
    data: any;
  }>({
    isOpen: false,
    type: 'workup',
    data: null
  });

  // Patient specific clinical records (when an active patient is selected)
  const patientEncounters = selectedPatient ? currentClinicEncounters.filter(e => e.patientId === selectedPatient.id) : [];
  const latestEncounter = patientEncounters[0] || null;

  const patientProcedures = selectedPatient ? currentClinicProcedures.filter(p => p.patientId === selectedPatient.id) : [];
  const patientTestOrders = selectedPatient ? currentClinicTestOrders.filter(t => t.patientId === selectedPatient.id) : [];
  const patientRadOrders = selectedPatient ? currentClinicRadiologyOrders.filter(r => r.patientId === selectedPatient.id) : [];
  const patientPrescriptions = selectedPatient ? currentClinicPrescriptions.filter(rx => rx.patientId === selectedPatient.id) : [];
  const patientAdministeredLogs = selectedPatient ? currentClinicAdministeredItems.filter(adm => adm.patientId === selectedPatient.id) : [];

  // Indirect Carts for this specific patient
  const patientIndirectCarts = selectedPatient
    ? currentClinicPharmacyCarts
        .filter(c => c.patientId === selectedPatient.id && c.cartType === 'indirect')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];
  
  const pendingIndirectCartsForPatient = patientIndirectCarts.filter(
    c => c.status !== 'administered' && c.items.some(i => i.status !== 'administered')
  );

  const pendingIndirectItemsCount = patientIndirectCarts.reduce(
    (count, cart) => count + cart.items.filter(i => i.status !== 'administered').length,
    0
  );

  // Modal state for administering indirect cart items
  const [administeringCartItem, setAdministeringCartItem] = useState<{
    cartId: string;
    cartItemId: string;
    itemName: string;
    dosage: string;
    quantity: number;
    patientName: string;
    route: string;
    notes: string;
    vitals: {
      bloodPressure: string;
      pulseRate: number;
      temperature: number;
      spO2: number;
    };
  } | null>(null);

  const handleAdministerCartItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!administeringCartItem) return;

    const success = administerIndirectCartItem(
      administeringCartItem.cartId,
      administeringCartItem.cartItemId,
      administeringCartItem.quantity,
      administeringCartItem.vitals,
      `${administeringCartItem.route} - ${administeringCartItem.notes || 'Administered via Patient Chart'}`
    );

    if (success) {
      alert(`Administered ${administeringCartItem.quantity}x ${administeringCartItem.itemName} to ${administeringCartItem.patientName}.`);
      setAdministeringCartItem(null);
    }
  };

  // Nursing consumables & ward stock
  const wardItems = currentClinicInventory.filter(
    i => i.category === 'nursing_consumable' || i.department === 'nursing' || i.unit === 'vials' || i.unit === 'bottles' || i.category === 'pharmaceutical'
  );

  const handleQuickAdminister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    if (!quickAdminForm.inventoryItemId) {
      alert('Please select a medication or consumable to administer.');
      return;
    }

    const item = currentClinicInventory.find(i => i.id === quickAdminForm.inventoryItemId);
    if (!item) return;

    if (item.totalQuantity < quickAdminForm.quantity) {
      alert(`Insufficient stock! Only ${item.totalQuantity} ${item.unit} available.`);
      return;
    }

    const success = recordAdministeredItem({
      patientId: selectedPatient.id,
      encounterId: latestEncounter?.id || `enc-${Date.now()}`,
      inventoryItemId: item.id,
      quantity: Number(quickAdminForm.quantity),
      unit: item.unit,
      route: quickAdminForm.route,
      notes: quickAdminForm.notes,
      vitals: quickAdminForm.vitals
    });

    if (success) {
      alert(`Administered ${quickAdminForm.quantity}x ${item.name} to ${selectedPatient.firstName} ${selectedPatient.lastName}. Logged into nursing tracker.`);
      setIsQuickAdministerOpen(false);
      setQuickAdminForm({
        inventoryItemId: '',
        quantity: 1,
        route: 'IV Infusion',
        notes: '',
        vitals: {
          bloodPressure: '120/80',
          pulseRate: 74,
          temperature: 36.8,
          spO2: 99
        }
      });
      setActiveSubTab('medications');
    }
  };

  return (
    <div id="ipd-patient-monitoring-card" className="bg-white rounded-xl border border-indigo-200 shadow-sm overflow-hidden text-xs space-y-0">
      
      {/* Top Banner & Search Section */}
      <div className="bg-gradient-to-r from-indigo-800 via-indigo-900 to-slate-900 text-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-xs text-white">
              <BedDouble className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-white">Inpatient (IPD) Clinical Monitoring Card</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-400/20 text-indigo-200 border border-indigo-400/30">
                  Station: {activeClinic.name}
                </span>
              </div>
              <p className="text-[11px] text-indigo-200/80">
                View doctor workups, physical exams, surgical procedures done, lab/imaging test results, and track drug administrations.
              </p>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-indigo-950/60 p-0.5 rounded-md border border-indigo-700/50 text-[11px]">
              <button
                type="button"
                onClick={() => setFilterType('ipd_only')}
                className={`px-2.5 py-1 rounded cursor-pointer font-bold transition-all ${
                  filterType === 'ipd_only' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-indigo-200 hover:text-white'
                }`}
              >
                Active Inpatients ({ipdPatients.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('discharged')}
                className={`px-2.5 py-1 rounded cursor-pointer font-bold transition-all ${
                  filterType === 'discharged' ? 'bg-amber-600 text-white shadow-2xs' : 'text-indigo-200 hover:text-white'
                }`}
              >
                Discharged ({dischargedPatients.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('deceased')}
                className={`px-2.5 py-1 rounded cursor-pointer font-bold transition-all ${
                  filterType === 'deceased' ? 'bg-rose-700 text-white shadow-2xs' : 'text-indigo-200 hover:text-white'
                }`}
              >
                Deceased ({deceasedPatients.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded cursor-pointer font-bold transition-all ${
                  filterType === 'all' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-indigo-200 hover:text-white'
                }`}
              >
                All Clinic ({currentClinicPatients.length})
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-indigo-300 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search patient, MRN, ward, bed..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-indigo-950/70 border border-indigo-700/60 rounded-md text-xs text-white placeholder-indigo-300/60 focus:outline-none focus:ring-1 focus:ring-indigo-400 w-56"
              />
            </div>
          </div>
        </div>

        {/* Sorting & Location Filters Bar */}
        <div className="mt-3 pt-2.5 border-t border-indigo-700/40 flex flex-wrap items-center justify-between gap-2.5 text-xs text-indigo-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Sort Dropdown & Direction Toggle */}
            <div className="flex items-center gap-1.5 bg-indigo-950/70 border border-indigo-700/60 rounded-lg px-2 py-1 shadow-2xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              <span className="text-[11px] font-bold text-indigo-200">Sort:</span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as any)}
                className="bg-transparent font-bold text-white text-xs focus:outline-none cursor-pointer"
              >
                <option value="date" className="bg-slate-900 text-white">Date & Time</option>
                <option value="name" className="bg-slate-900 text-white">Patient Name</option>
                <option value="mrn" className="bg-slate-900 text-white">IPD / MRN #</option>
                <option value="age" className="bg-slate-900 text-white">Age</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-1 hover:bg-indigo-800 rounded transition-colors text-indigo-200 hover:text-white cursor-pointer"
                title={sortOrder === 'asc' ? 'Ascending (Click for Descending)' : 'Descending (Click for Ascending)'}
              >
                {sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Department Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-indigo-950/70 border border-indigo-700/60 rounded-lg px-2 py-1 shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-purple-300 shrink-0" />
              <span className="text-[11px] font-bold text-indigo-200">Dept:</span>
              <select
                value={selectedDepartmentFilter}
                onChange={(e) => {
                  setSelectedDepartmentFilter(e.target.value);
                  setSelectedRoomFilter('all');
                }}
                className="bg-transparent font-bold text-white text-xs focus:outline-none cursor-pointer max-w-[150px] truncate"
              >
                <option value="all" className="bg-slate-900 text-white">All Departments ({availablePatients.length})</option>
                {availableDepartments.map(dept => {
                  const count = availablePatients.filter(p => {
                    const pDept = p.department || (p.patientType === 'IPD' ? 'Inpatient Ward' : 'General Outpatient (OPD)');
                    return pDept.toLowerCase() === dept.toLowerCase() || p.department === dept;
                  }).length;
                  return (
                    <option key={dept} value={dept} className="bg-slate-900 text-white">
                      {dept} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Consultation Room Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-indigo-950/70 border border-indigo-700/60 rounded-lg px-2 py-1 shadow-2xs">
              <DoorOpen className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              <span className="text-[11px] font-bold text-indigo-200">Room:</span>
              <select
                value={selectedRoomFilter}
                onChange={(e) => setSelectedRoomFilter(e.target.value)}
                className="bg-transparent font-bold text-white text-xs focus:outline-none cursor-pointer max-w-[140px] truncate"
              >
                <option value="all" className="bg-slate-900 text-white">All Rooms</option>
                {availableRooms.map(room => {
                  const count = availablePatients.filter(p => {
                    const matchesDept = selectedDepartmentFilter === 'all' ||
                      (p.department || (p.patientType === 'IPD' ? 'Inpatient Ward' : 'General Outpatient (OPD)')).toLowerCase() === selectedDepartmentFilter.toLowerCase();
                    const pRoom = p.doctorRoom || (p.patientType === 'IPD' ? (p.ward || 'Ward') : 'Consultation Room 1');
                    return matchesDept && (pRoom.toLowerCase() === room.toLowerCase() || p.doctorRoom === room);
                  }).length;
                  return (
                    <option key={room} value={room} className="bg-slate-900 text-white">
                      {room} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Ward Name Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-indigo-950/70 border border-indigo-700/60 rounded-lg px-2 py-1 shadow-2xs">
              <BedDouble className="w-3.5 h-3.5 text-teal-300 shrink-0" />
              <span className="text-[11px] font-bold text-indigo-200">Ward:</span>
              <select
                value={selectedWardFilter}
                onChange={(e) => {
                  setSelectedWardFilter(e.target.value);
                  setSelectedBedFilter('all');
                }}
                className="bg-transparent font-bold text-white text-xs focus:outline-none cursor-pointer max-w-[150px] truncate"
              >
                <option value="all" className="bg-slate-900 text-white">All Wards ({availablePatients.filter(p => p.ward).length} IPD)</option>
                {availableWards.map(ward => {
                  const count = availablePatients.filter(p => p.ward && p.ward.toLowerCase() === ward.toLowerCase()).length;
                  return (
                    <option key={ward} value={ward} className="bg-slate-900 text-white">
                      {ward} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Bed Number Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-indigo-950/70 border border-indigo-700/60 rounded-lg px-2 py-1 shadow-2xs">
              <Tag className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
              <span className="text-[11px] font-bold text-indigo-200">Bed:</span>
              <select
                value={selectedBedFilter}
                onChange={(e) => setSelectedBedFilter(e.target.value)}
                className="bg-transparent font-bold text-white text-xs focus:outline-none cursor-pointer max-w-[130px] truncate"
              >
                <option value="all" className="bg-slate-900 text-white">All Beds</option>
                {availableBeds.map(bed => {
                  const count = availablePatients.filter(p => {
                    const matchesWard = selectedWardFilter === 'all' || (p.ward && p.ward.toLowerCase() === selectedWardFilter.toLowerCase());
                    return matchesWard && p.bedNumber && p.bedNumber.toLowerCase() === bed.toLowerCase();
                  }).length;
                  return (
                    <option key={bed} value={bed} className="bg-slate-900 text-white">
                      Bed {bed} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Clear Filter Action if Department, Room, Ward, or Bed is active */}
            {(selectedDepartmentFilter !== 'all' || selectedRoomFilter !== 'all' || selectedWardFilter !== 'all' || selectedBedFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDepartmentFilter('all');
                  setSelectedRoomFilter('all');
                  setSelectedWardFilter('all');
                  setSelectedBedFilter('all');
                }}
                className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/40 rounded-md font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                title="Reset Department, Room, Ward, and Bed filters"
              >
                <X className="w-3 h-3 text-rose-300" />
                Clear Location Filters
              </button>
            )}
          </div>

          <div className="text-[11px] text-indigo-200 font-semibold">
            Showing <strong className="text-white">{filteredPatients.length}</strong> of {availablePatients.length} patients
          </div>
        </div>

        {/* Active Filter Tags */}
        {(selectedDepartmentFilter !== 'all' || selectedRoomFilter !== 'all' || selectedWardFilter !== 'all' || selectedBedFilter !== 'all') && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 text-[10px]">
            {selectedDepartmentFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 font-bold border border-purple-400/40">
                Dept: {selectedDepartmentFilter}
              </span>
            )}
            {selectedRoomFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 font-bold border border-indigo-400/40">
                Room: {selectedRoomFilter}
              </span>
            )}
            {selectedWardFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded bg-teal-500/30 text-teal-200 font-bold border border-teal-400/40">
                Ward: {selectedWardFilter}
              </span>
            )}
            {selectedBedFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded bg-cyan-500/30 text-cyan-200 font-bold border border-cyan-400/40">
                Bed: {selectedBedFilter}
              </span>
            )}
          </div>
        )}

        {/* Horizontal Patient Carousel Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 mt-3 pt-3 border-t border-indigo-700/40">
          {(isQueueExpanded ? filteredPatients : filteredPatients.slice(0, 6)).map(p => {
            const isSelected = p.id === selectedPatient?.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPatientId(prev => prev === p.id ? '' : p.id)}
                title={isSelected ? 'Active patient in display — Click to deselect' : `Click to view ${p.firstName} ${p.lastName}`}
                className={`p-2.5 rounded-lg text-left cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white text-indigo-950 ring-2 ring-indigo-400 font-bold shadow-md'
                    : 'bg-indigo-950/60 hover:bg-indigo-900/70 text-indigo-100 border border-indigo-800/80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="truncate text-xs font-bold">{p.firstName} {p.lastName}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase shrink-0 ${
                      p.patientType === 'IPD'
                        ? (isSelected ? 'bg-indigo-100 text-indigo-800' : 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/30')
                        : (isSelected ? 'bg-sky-100 text-sky-800' : 'bg-sky-500/30 text-sky-200 border border-sky-400/30')
                    }`}>
                      {p.patientType || 'IPD'}
                    </span>
                  </div>

                  <div className={`text-[10px] font-mono truncate mb-1 ${isSelected ? 'text-slate-500' : 'text-indigo-300/80'}`}>
                    {p.patientType === 'IPD' ? 'IPD No.' : 'OPD No.'}: {p.mrn}
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] opacity-90 mb-1">
                    <span className={`px-1.5 py-0.2 rounded font-semibold uppercase text-[9px] ${
                      isSelected ? 'bg-slate-100 text-slate-800' : 'bg-indigo-900/80 text-indigo-200'
                    }`}>
                      {p.currentStatus.replace('_', ' ')}
                    </span>
                    <span>&bull;</span>
                    <span>{p.gender[0]}/{formatPatientAge(p, 'short')}</span>
                  </div>

                  {/* Location Tag */}
                  <div className="flex items-center gap-1 text-[10px] mt-1 truncate">
                    {p.patientType === 'IPD' || p.ward ? (
                      <>
                        <BedDouble className={`w-3 h-3 shrink-0 ${isSelected ? 'text-teal-600' : 'text-teal-300'}`} />
                        <span className="truncate font-semibold">{p.ward || 'General Ward'}</span>
                        <span>&bull;</span>
                        <span className={`px-1 py-0.2 rounded font-mono font-bold text-[9px] shrink-0 ${
                          isSelected ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-teal-950/60 text-teal-200 border border-teal-700/60'
                        }`}>
                          Bed {p.bedNumber || 'N/A'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Building2 className={`w-3 h-3 shrink-0 ${isSelected ? 'text-purple-600' : 'text-purple-300'}`} />
                        <span className="truncate font-semibold">{p.department || 'General OPD'}</span>
                        <span>&bull;</span>
                        <DoorOpen className={`w-3 h-3 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-indigo-300'}`} />
                        <span className="truncate font-medium">{p.doctorRoom || 'Room 1'}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Admission / Registration Date */}
                <div className={`flex items-center gap-1 text-[9px] mt-2 pt-1 border-t ${
                  isSelected ? 'border-slate-100 text-slate-400' : 'border-indigo-800/60 text-indigo-300/70'
                }`}>
                  <Calendar className="w-2.5 h-2.5 shrink-0" />
                  <span>Admit: <strong className={isSelected ? 'text-slate-600' : 'text-indigo-200'}>{p.registeredAt || 'Today'}</strong></span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Expand / Collapse Queue Button if more than 6 patients */}
        {filteredPatients.length > 6 && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setIsQueueExpanded(!isQueueExpanded)}
              className="px-3 py-1 bg-indigo-950/60 hover:bg-indigo-900 text-indigo-200 hover:text-white font-bold text-xs rounded-lg transition-colors cursor-pointer border border-indigo-700/60"
            >
              {isQueueExpanded ? `Show Fewer Patients (Top 6)` : `Show All ${filteredPatients.length} Patients in Queue`}
            </button>
          </div>
        )}

        {filteredPatients.length === 0 && (
          <div className="p-6 text-center text-indigo-200 bg-indigo-950/50 rounded-lg text-xs space-y-2 border border-indigo-800 mt-2">
            <Clock className="w-7 h-7 text-indigo-300/60 mx-auto" />
            <div className="font-semibold text-white">
              {availablePatients.length === 0
                ? `No patients match the "${filterType.replace('_', ' ')}" category in ${activeClinic.name}.`
                : `No patients match your search, department, room, ward, or bed filter criteria.`}
            </div>
            {availablePatients.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('ipd_only');
                  setSelectedDepartmentFilter('all');
                  setSelectedRoomFilter('all');
                  setSelectedWardFilter('all');
                  setSelectedBedFilter('all');
                }}
                className="text-indigo-300 hover:text-white font-bold underline cursor-pointer text-xs"
              >
                Reset all queue filters and criteria
              </button>
            )}
          </div>
        )}
      </div>

      {/* Selected Patient Demographics & Vitals Bar (Rendered only when a patient is active) */}
      {selectedPatient ? (
        <>
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div 
              className="flex items-center gap-3 cursor-pointer group select-none"
              onClick={() => setSelectedPatientId('')}
              title="Click on patient data to deselect active patient and return to queue overview"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-sm border border-indigo-200 group-hover:bg-rose-100 group-hover:text-rose-700 transition-colors">
                {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </span>
                  <span className="font-mono text-slate-600 text-xs">({selectedPatient.mrn})</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                    selectedPatient.patientType === 'IPD' ? 'bg-indigo-100 text-indigo-800' : 'bg-sky-100 text-sky-800'
                  }`}>
                    {selectedPatient.patientType || 'IPD'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {selectedPatient.currentStatus.replace('_', ' ')}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <X className="w-3 h-3" /> Click to Deselect
                  </span>
                  {selectedPatientReferral && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                      <Ambulance className="w-3 h-3 text-amber-700" />
                      <span>Referred: {selectedPatientReferral.destinationHospital} ({selectedPatientReferral.urgency.toUpperCase()})</span>
                    </span>
                  )}
                  {isSelectedPatientDeceased && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1">
                      <HeartCrack className="w-3 h-3 text-rose-700" />
                      <span>Deceased ({selectedPatientDeathCert?.dateOfDeath || selectedPatient?.dateOfDeath || 'Pronounced'})</span>
                    </span>
                  )}
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{formatPatientAge(selectedPatient)} ({selectedPatient.gender})</span>
                  <span>&bull;</span>
                  <span>Blood Group: <strong>{selectedPatient.bloodGroup || 'O+'}</strong></span>
                  <span>&bull;</span>
                  <span>
                    Allergies: <strong className={selectedPatient.allergies?.length > 0 && selectedPatient.allergies[0] !== 'None Reported' ? 'text-rose-600' : 'text-slate-600'}>
                      {selectedPatient.allergies?.join(', ') || 'No known allergies'}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Current Vitals Snapshot */}
            <div className="flex items-center gap-2 flex-wrap">
              {selectedPatient.vitals && (
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs text-[11px]">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                  <span>BP: <strong>{selectedPatient.vitals.bloodPressure || '120/80'}</strong></span>
                  <span className="text-slate-300">|</span>
                  <span>Pulse: <strong>{selectedPatient.vitals.pulseRate || 72}</strong> bpm</span>
                  <span className="text-slate-300">|</span>
                  <span>Temp: <strong>{selectedPatient.vitals.temperature || 36.8}&deg;C</strong></span>
                  <span className="text-slate-300">|</span>
                  <span>SpO2: <strong>{selectedPatient.vitals.spO2 || 99}%</strong></span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setActiveSubTab('workup')}
                className={`px-3 py-1.5 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors ${
                  activeSubTab === 'workup'
                    ? 'bg-indigo-700 text-white'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Digital Case File ({patientEncounters.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPatientId('')}
                className="px-3 py-1.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer border border-slate-300 hover:border-rose-300 transition-colors shadow-2xs"
                title="Deselect active patient and return to queue overview"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
                <span>Deselect</span>
              </button>

          <button
            type="button"
            onClick={() => setIsQuickAdministerOpen(!isQuickAdministerOpen)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Syringe className="w-3.5 h-3.5" />
            <span>Administer Med / Therapy</span>
          </button>

          {/* Discharge Patient / Edit Discharge Form Button */}
          <button
            type="button"
            onClick={() => {
              setDischargeModalPatient(selectedPatient);
              setIsDischargeModalOpen(true);
            }}
            className={`px-3.5 py-1.5 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-all ${
              isSelectedPatientDischarged
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            title={isSelectedPatientDischarged ? 'Review or edit existing discharge summary' : 'Fill and submit hospital discharge form'}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isSelectedPatientDischarged ? 'Edit Discharge Form' : 'Discharge Patient'}</span>
          </button>

          {/* View Discharge File Button */}
          {selectedPatientDischargeSummary && (
            <>
              <button
                type="button"
                onClick={() => setIsViewDischargeFileOpen(true)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                title="View complete formatted discharge dossier and revision timestamps"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Discharge File</span>
                {selectedPatientDischargeSummary.changeHistory && selectedPatientDischargeSummary.changeHistory.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px] font-bold">
                    {selectedPatientDischargeSummary.changeHistory.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setPrintModal({
                    isOpen: true,
                    type: 'discharge_summary',
                    data: selectedPatientDischargeSummary
                  });
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                title="Print official hospital discharge summary sheet"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Discharge</span>
              </button>
            </>
          )}

          {/* Refer Patient / Edit Referral Form Button */}
          <button
            type="button"
            onClick={() => {
              setReferralModalPatient(selectedPatient);
              setIsReferralModalOpen(true);
            }}
            className={`px-3.5 py-1.5 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-all ${
              selectedPatientReferral
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
            title={selectedPatientReferral ? 'Review or edit existing referral dossier' : 'Refer IPD patient to external hospital'}
          >
            <Ambulance className="w-3.5 h-3.5" />
            <span>{selectedPatientReferral ? 'Edit Referral Form' : 'Refer Patient'}</span>
          </button>

          {/* View Referral Dossier & Print / PDF Export */}
          {selectedPatientReferral && (
            <>
              <button
                type="button"
                onClick={() => setIsViewReferralFileOpen(true)}
                className="px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                title="View complete formatted referral dossier and transfer details"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Referral File</span>
                {selectedPatientReferral.changeHistory && selectedPatientReferral.changeHistory.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px] font-bold">
                    {selectedPatientReferral.changeHistory.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setPrintModal({
                    isOpen: true,
                    type: 'referral_form',
                    data: selectedPatientReferral
                  });
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                title="Print or export official hospital referral form"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Referral</span>
              </button>
            </>
          )}

          {/* Tag Deceased / Death Certificate Button */}
          <button
            type="button"
            onClick={() => {
              setDeceasedModalPatient(selectedPatient);
              setIsReportDeceasedModalOpen(true);
            }}
            className={`px-3.5 py-1.5 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-all ${
              isSelectedPatientDeceased
                ? 'bg-rose-800 hover:bg-rose-900 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
            title={isSelectedPatientDeceased ? 'Review or edit official death certificate' : 'Tag patient as deceased & issue death certificate'}
          >
            <HeartCrack className="w-3.5 h-3.5" />
            <span>{isSelectedPatientDeceased ? 'Edit Death Cert' : 'Report Deceased'}</span>
          </button>

          {/* View & Print Death Certificate */}
          {selectedPatientDeathCert && (
            <>
              <button
                type="button"
                onClick={() => setIsViewDeathCertModalOpen(true)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                title="View complete Medical Certificate of Cause of Death and audit history"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Death Cert</span>
                {selectedPatientDeathCert.changeHistory && selectedPatientDeathCert.changeHistory.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px] font-bold">
                    {selectedPatientDeathCert.changeHistory.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setPrintModal({
                    isOpen: true,
                    type: 'death_certificate',
                    data: selectedPatientDeathCert
                  });
                }}
                className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                title="Print or export official Medical Certificate of Cause of Death (MCCD) PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Death Cert</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Indirect Pharmacy Cart Alert Banner for this Patient */}
      {patientIndirectCarts.length > 0 && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-purple-50/80 border border-purple-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
              <Syringe className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-purple-950 flex items-center gap-2">
                <span>Injection & Treatment Room Cart Active</span>
                {pendingIndirectItemsCount > 0 ? (
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-purple-200 text-purple-900">
                    {pendingIndirectItemsCount} Item{pendingIndirectItemsCount > 1 ? 's' : ''} Ready to Dispense / Administer
                  </span>
                ) : (
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    All Items Administered
                  </span>
                )}
              </div>
              <p className="text-purple-700 text-[11px]">
                {patientIndirectCarts.length} Indirect Cart{patientIndirectCarts.length > 1 ? 's' : ''} linked to this patient ({patientIndirectCarts.map(c => c.cartNumber || c.id).join(', ')}).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveSubTab('medications')}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Syringe className="w-3.5 h-3.5" />
            <span>View & Dispense Cart Items</span>
          </button>
        </div>
      )}

      {/* QUICK ADMINISTER DRAWER FORM */}
      {isQuickAdministerOpen && (
        <form onSubmit={handleQuickAdminister} className="p-4 bg-indigo-50/70 border-b border-indigo-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-indigo-950 flex items-center gap-1.5">
              <Syringe className="w-4 h-4 text-indigo-600" />
              Direct Drug & Therapy Administration for {selectedPatient.firstName} {selectedPatient.lastName}
            </h4>
            <button
              type="button"
              onClick={() => setIsQuickAdministerOpen(false)}
              className="text-slate-400 hover:text-slate-700 font-bold"
            >
              &times; Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="lg:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Medication / IV Fluid / Consumable</label>
              <select
                value={quickAdminForm.inventoryItemId}
                onChange={(e) => setQuickAdminForm({ ...quickAdminForm, inventoryItemId: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
                required
              >
                <option value="">-- Choose Item from Ward Stock --</option>
                {wardItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} (Stock: {item.totalQuantity} {item.unit} &bull; ${item.sellingPrice.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={quickAdminForm.quantity}
                onChange={(e) => setQuickAdminForm({ ...quickAdminForm, quantity: Number(e.target.value) })}
                className="w-full p-2 border border-slate-300 rounded bg-white font-bold"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Route of Administration</label>
              <input
                type="text"
                placeholder="e.g. IV Infusion 100ml/hr, Oral, IM"
                value={quickAdminForm.route}
                onChange={(e) => setQuickAdminForm({ ...quickAdminForm, route: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-2.5 rounded border border-indigo-100">
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">BP at Admin</label>
              <input
                type="text"
                value={quickAdminForm.vitals.bloodPressure}
                onChange={(e) => setQuickAdminForm({
                  ...quickAdminForm,
                  vitals: { ...quickAdminForm.vitals, bloodPressure: e.target.value }
                })}
                className="w-full p-1.5 border border-slate-300 rounded text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Pulse Rate (bpm)</label>
              <input
                type="number"
                value={quickAdminForm.vitals.pulseRate}
                onChange={(e) => setQuickAdminForm({
                  ...quickAdminForm,
                  vitals: { ...quickAdminForm.vitals, pulseRate: Number(e.target.value) }
                })}
                className="w-full p-1.5 border border-slate-300 rounded text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Temp (&deg;C)</label>
              <input
                type="number"
                step="0.1"
                value={quickAdminForm.vitals.temperature}
                onChange={(e) => setQuickAdminForm({
                  ...quickAdminForm,
                  vitals: { ...quickAdminForm.vitals, temperature: Number(e.target.value) }
                })}
                className="w-full p-1.5 border border-slate-300 rounded text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">SpO2 (%)</label>
              <input
                type="number"
                value={quickAdminForm.vitals.spO2}
                onChange={(e) => setQuickAdminForm({
                  ...quickAdminForm,
                  vitals: { ...quickAdminForm.vitals, spO2: Number(e.target.value) }
                })}
                className="w-full p-1.5 border border-slate-300 rounded text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Nursing Observations / Infusion Rate</label>
            <input
              type="text"
              placeholder="e.g. Normal Saline 500ml running at 30 drops/min. No erythema at IV site."
              value={quickAdminForm.notes}
              onChange={(e) => setQuickAdminForm({ ...quickAdminForm, notes: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsQuickAdministerOpen(false)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded shadow-xs cursor-pointer flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Confirm & Log Administration
            </button>
          </div>
        </form>
      )}

      {/* IPD Monitoring Sub-Tabs */}
      <div className="border-b border-slate-200 px-4 pt-3 flex flex-wrap items-center gap-6 font-bold text-slate-600 bg-white">
        <button
          type="button"
          onClick={() => setActiveSubTab('treatment_chart')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeSubTab === 'treatment_chart' ? 'border-purple-600 text-purple-700' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <ClipboardCheck className="w-4 h-4 text-purple-600" />
          <span>1. Patient Treatment Chart (MAR Checklist)</span>
          {latestEncounter?.clinicalPlan && (
            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
              Orders Ready
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('workup')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeSubTab === 'workup' ? 'border-indigo-600 text-indigo-600' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>2. Digital Patient Case File ({patientEncounters.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('procedures')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeSubTab === 'procedures' ? 'border-teal-600 text-teal-600' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>3. Procedures Done ({patientProcedures.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('tests')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeSubTab === 'tests' ? 'border-amber-600 text-amber-600' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Microscope className="w-4 h-4" />
          <span>4. Diagnostic Results ({patientTestOrders.length + patientRadOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('medications')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeSubTab === 'medications' ? 'border-rose-600 text-rose-600' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Syringe className="w-4 h-4" />
          <span>5. Pharmacy Carts & Admin Logs ({patientAdministeredLogs.length})</span>
          {pendingIndirectItemsCount > 0 && (
            <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded-full text-[10px] font-bold">
              {pendingIndirectItemsCount} Due
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('discharged_search')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeSubTab === 'discharged_search' ? 'border-amber-600 text-amber-700' : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Search className="w-4 h-4 text-amber-600" />
          <span>6. Discharged Patients Search & Archive ({dischargedPatients.length})</span>
        </button>
      </div>

      {/* SUBTAB 0: PATIENT CHECKLIST TREATMENT CHART */}
      {activeSubTab === 'treatment_chart' && (
        <div className="p-5 bg-white">
          <PatientTreatmentChartCard
            patient={selectedPatient}
            latestEncounter={latestEncounter}
            onOpenCaseFile={() => setActiveSubTab('workup')}
          />
        </div>
      )}

      {/* SUBTAB 2: DIGITAL PATIENT CASE FILE (ALL HISTORICAL & NEW DOCTOR ENCOUNTERS) */}
      {activeSubTab === 'workup' && (
        <div className="p-5 bg-slate-50/50">
          <DigitalPatientCaseFile
            patient={selectedPatient}
            encounters={patientEncounters}
            onOpenPrintModal={(type, data) => setPrintModal({ isOpen: true, type, data })}
          />
        </div>
      )}

      {/* SUBTAB 2: PROCEDURES DONE */}
      {activeSubTab === 'procedures' && (
        <div className="p-5 space-y-3 bg-white">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-900 text-xs">Procedures & Minor Surgeries Performed</span>
            <span className="text-slate-500 text-[11px]">{patientProcedures.length} recorded</span>
          </div>

          <div className="space-y-3">
            {patientProcedures.map(proc => (
              <div key={proc.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{proc.procedureName}</span>
                    <span className="px-2 py-0.2 rounded font-mono text-[10px] bg-slate-200 text-slate-700">
                      {proc.procedureCode}
                    </span>
                    <span className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase ${
                      proc.outcome === 'Successful' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {proc.outcome}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPrintModal({ isOpen: true, type: 'procedure', data: proc })}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3 h-3" /> Report PDF
                    </button>
                  </div>
                </div>

                <div className="text-slate-500 text-[11px] flex items-center gap-2 flex-wrap">
                  <span>Surgeon: <strong>Dr. {proc.doctorName}</strong></span>
                  <span>&bull;</span>
                  <span>Performed: <strong>{new Date(proc.performedAt || proc.createdAt).toLocaleString()}</strong></span>
                  {proc.anesthesiaType && (
                    <>
                      <span>&bull;</span>
                      <span>Anesthesia: <strong>{proc.anesthesiaType}</strong></span>
                    </>
                  )}
                </div>

                <div className="text-xs text-slate-800 leading-relaxed bg-white p-2.5 rounded border border-slate-200">
                  <span className="font-semibold text-slate-900">Operative Details: </span>
                  {proc.details}
                </div>

                {proc.postProcedureCare && (
                  <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                    <span className="font-bold">Nursing & Wound Care Instructions: </span>
                    {proc.postProcedureCare}
                  </div>
                )}
              </div>
            ))}

            {patientProcedures.length === 0 && (
              <div className="p-8 text-center text-slate-400 italic">
                No surgical or clinical procedures recorded for this inpatient.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: DIAGNOSTIC RESULTS (PATHOLOGY + RADIOLOGY) */}
      {activeSubTab === 'tests' && (
        <div className="p-5 space-y-4 bg-white">
          
          {/* Pathology Results */}
          <div>
            <h4 className="font-bold text-slate-900 text-xs mb-2 flex items-center gap-1.5">
              <Microscope className="w-4 h-4 text-amber-600" />
              Pathology Laboratory Results ({patientTestOrders.length})
            </h4>

            <div className="space-y-2">
              {patientTestOrders.map(t => {
                const isExpanded = expandedLabId === t.id;
                const isCompleted = t.status === 'completed';
                return (
                  <div key={t.id} className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                    <div className="p-3 flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="font-bold text-slate-900">{t.testName}</span>
                        <span className="text-[10px] text-slate-500 font-mono ml-2">({t.testCode})</span>
                        <div className="text-[10px] text-slate-500">Ordered: {new Date(t.orderedAt).toLocaleDateString()} &bull; Priority: {t.priority}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t.status}
                        </span>

                        {isCompleted && (
                          <>
                            <button
                              type="button"
                              onClick={() => setExpandedLabId(isExpanded ? null : t.id)}
                              className="px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-700 cursor-pointer"
                            >
                              {isExpanded ? 'Hide Readings' : 'View Readings'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPrintModal({ isOpen: true, type: 'lab_report', data: t })}
                              className="px-2 py-1 bg-slate-900 text-white rounded font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3 h-3" /> PDF
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isExpanded && isCompleted && t.results && (
                      <div className="p-3 border-t border-slate-200 bg-white">
                        <table className="w-full text-left text-[11px] divide-y divide-slate-200">
                          <thead className="bg-slate-50 text-slate-600 font-semibold">
                            <tr>
                              <th className="py-1.5 px-2">Parameter</th>
                              <th className="py-1.5 px-2">Result Value</th>
                              <th className="py-1.5 px-2">Units</th>
                              <th className="py-1.5 px-2">Reference Range</th>
                              <th className="py-1.5 px-2 text-right">Flag</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {t.results.map((r, i) => (
                              <tr key={i}>
                                <td className="py-1.5 px-2 font-semibold text-slate-900">{r.parameter}</td>
                                <td className={`py-1.5 px-2 font-bold ${r.flag !== 'Normal' ? 'text-rose-600' : 'text-slate-900'}`}>{r.value}</td>
                                <td className="py-1.5 px-2 text-slate-500">{r.unit}</td>
                                <td className="py-1.5 px-2 text-slate-500">{r.referenceRange}</td>
                                <td className="py-1.5 px-2 text-right">
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    r.flag === 'Normal' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {r.flag}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}

              {patientTestOrders.length === 0 && (
                <div className="p-4 text-center text-slate-400 italic bg-slate-50 rounded">
                  No pathology lab orders recorded.
                </div>
              )}
            </div>
          </div>

          {/* Radiology Results */}
          <div className="pt-3 border-t border-slate-200">
            <h4 className="font-bold text-slate-900 text-xs mb-2 flex items-center gap-1.5">
              <Film className="w-4 h-4 text-cyan-600" />
              Radiology & Imaging Scans ({patientRadOrders.length})
            </h4>

            <div className="space-y-2">
              {patientRadOrders.map(r => {
                const isExpanded = expandedRadId === r.id;
                const isCompleted = r.status === 'completed';
                return (
                  <div key={r.id} className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                    <div className="p-3 flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="font-bold text-slate-900">{r.procedureName}</span>
                        <span className="text-[10px] text-slate-500 ml-2">({r.modality} - {r.bodyPart})</span>
                        <div className="text-[10px] text-slate-500">Ordered: {new Date(r.orderedAt).toLocaleDateString()}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.status}
                        </span>

                        {isCompleted && (
                          <>
                            <button
                              type="button"
                              onClick={() => setExpandedRadId(isExpanded ? null : r.id)}
                              className="px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-700 cursor-pointer"
                            >
                              {isExpanded ? 'Hide Findings' : 'View Findings'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPrintModal({ isOpen: true, type: 'radiology_report', data: r })}
                              className="px-2 py-1 bg-slate-900 text-white rounded font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3 h-3" /> PDF
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isExpanded && isCompleted && (
                      <div className="p-3 border-t border-slate-200 bg-white space-y-2 text-xs">
                        <div>
                          <span className="font-bold text-slate-800">Findings: </span>
                          <span className="text-slate-700">{r.findings || 'No formal findings text.'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-cyan-900">Impression: </span>
                          <span className="text-cyan-950 font-semibold">{r.impression}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {patientRadOrders.length === 0 && (
                <div className="p-4 text-center text-slate-400 italic bg-slate-50 rounded">
                  No radiology scan orders recorded.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* SUBTAB 4: DRUG & THERAPY ADMINISTRATIONS TRACKER (MAR) */}
      {activeSubTab === 'medications' && (
        <div className="p-5 space-y-5 bg-white">
          
          {/* SECTION 1: INJECTION & TREATMENT ROOM CARTS (INDIRECT CARTS FROM PHARMACY) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-purple-100">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-purple-100 text-purple-700">
                  <Syringe className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">
                    Injection & Treatment Room Cart Items ({patientIndirectCarts.length} Cart{patientIndirectCarts.length !== 1 ? 's' : ''})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Medications & consumables transferred from pharmacy for clinic / injection room administration
                  </p>
                </div>
              </div>
              {pendingIndirectItemsCount > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  {pendingIndirectItemsCount} Item{pendingIndirectItemsCount > 1 ? 's' : ''} Due for Dispense / Administration
                </span>
              )}
            </div>

            {patientIndirectCarts.map(cart => {
              const isCartComplete = cart.status === 'administered' || cart.items.every(i => i.status === 'administered');
              return (
                <div key={cart.id} className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-purple-950 text-xs">{cart.cartNumber || cart.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        isCartComplete
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {isCartComplete ? 'All Items Administered' : 'Ready for Injection / Administration'}
                      </span>
                      {cart.parentCartNumber && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white text-purple-800 border border-purple-200">
                          Transferred from Cart #{cart.parentCartNumber}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Accounts Approved ({cart.accountsApprovedBy || 'Accounts'})
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Dispatched by <strong>{cart.createdBy || 'Pharmacist'}</strong> &bull; {new Date(cart.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>

                  {/* Items in Cart: Unit Checkbox System */}
                  <InjectionRoomUnitAdminList cart={cart} />
                </div>
              );
            })}

            {patientIndirectCarts.length === 0 && (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                No Injection & Treatment Room carts transferred from pharmacy for this patient yet.
              </div>
            )}
          </div>

          {/* Active Prescriptions Issued by Doctors */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-emerald-600" />
                Active Medical Prescriptions ({patientPrescriptions.length})
              </span>
            </div>

            <div className="space-y-2">
              {patientPrescriptions.map(rx => (
                <div key={rx.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-800">Prescribing Clinician: Dr. {rx.doctorName}</span>
                    <span className="text-slate-500">{new Date(rx.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="divide-y divide-slate-200 bg-white rounded border border-slate-200">
                    {rx.items.map((item, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900">{item.medicationName}</div>
                          <div className="text-[11px] text-slate-500">
                            {item.dosage} &bull; {item.frequency} &bull; Route: {item.route} &bull; Duration: {item.duration}
                          </div>
                          {item.instructions && (
                            <div className="text-[10px] text-indigo-700 italic mt-0.5">
                              Instructions: {item.instructions}
                            </div>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.status === 'dispensed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {patientPrescriptions.length === 0 && (
                <div className="p-4 text-center text-slate-400 italic bg-slate-50 rounded">
                  No active electronic prescriptions on record.
                </div>
              )}
            </div>
          </div>

          {/* Historical Administrations Log */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                Completed Drug & Therapy Administrations ({patientAdministeredLogs.length})
              </span>
              <button
                type="button"
                onClick={() => setIsQuickAdministerOpen(true)}
                className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-bold hover:bg-indigo-100 cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Record Dose
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left divide-y divide-slate-200 text-[11px]">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2 px-3">Item Administered</th>
                    <th className="py-2 px-3">Quantity</th>
                    <th className="py-2 px-3">Route / Site</th>
                    <th className="py-2 px-3">Administering Nurse</th>
                    <th className="py-2 px-3">Time & Vitals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patientAdministeredLogs.map(adm => (
                    <tr key={adm.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {adm.itemName}
                        {adm.notes && <div className="font-normal text-[10px] text-slate-500">{adm.notes}</div>}
                      </td>
                      <td className="py-2 px-3 font-bold text-indigo-900">
                        {adm.quantityAdministered} {adm.unit}
                      </td>
                      <td className="py-2 px-3 text-slate-700">{adm.routeOfAdministration || 'IV'}</td>
                      <td className="py-2 px-3 text-slate-800 font-medium">{adm.nurseName}</td>
                      <td className="py-2 px-3 text-slate-500">
                        <div>{new Date(adm.administeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        {adm.vitalsAtAdministration && (
                          <div className="text-[10px] text-slate-400">
                            BP {adm.vitalsAtAdministration.bloodPressure} &bull; HR {adm.vitalsAtAdministration.pulseRate} &bull; {adm.vitalsAtAdministration.temperature}&deg;C
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {patientAdministeredLogs.length === 0 && (
                <div className="p-6 text-center text-slate-400 italic">
                  No administrations logged for this inpatient yet.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* SUBTAB 6: DISCHARGED PATIENTS ARCHIVE & SEARCH */}
      {activeSubTab === 'discharged_search' && (
        <div className="p-5 bg-slate-50/50">
          <DischargedPatientsSearchCard
            onEditDischargeSummary={(pat) => {
              setDischargeModalPatient(pat);
              setIsDischargeModalOpen(true);
            }}
            onPrintDischargeSummary={(ds) => {
              setPrintModal({
                isOpen: true,
                type: 'discharge_summary',
                data: ds
              });
            }}
            onOpenCaseFile={(pat) => {
              setSelectedPatientId(pat.id);
              setActiveSubTab('workup');
            }}
          />
        </div>
      )}
        </>
      ) : (
        <div className="p-12 text-center bg-slate-50/70 border-b border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto shadow-xs border border-indigo-200">
            <BedDouble className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-800">
              No Inpatient Selected
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Click on any patient in the queue carousel above to inspect bedside treatment charts (MAR), clinical workups, lab tests, and medication administrations. Re-clicking the active patient deselects them.
            </p>
          </div>
          {filteredPatients.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <span className="text-[11px] text-slate-400 font-medium">Quick Select Inpatient:</span>
              {filteredPatients.slice(0, 5).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPatientId(prev => prev === p.id ? '' : p.id)}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md font-semibold text-[11px] shadow-2xs cursor-pointer transition-colors"
                  title="Click to select; click again to deselect"
                >
                  {p.firstName} {p.lastName} ({p.ward || 'Ward'} • Bed {p.bedNumber || 'N/A'})
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Discharge Patient Modal */}
      {isDischargeModalOpen && (dischargeModalPatient || selectedPatient) && (
        <DischargePatientModal
          isOpen={isDischargeModalOpen}
          onClose={() => {
            setIsDischargeModalOpen(false);
            setDischargeModalPatient(null);
          }}
          patient={(dischargeModalPatient || selectedPatient)!}
          onPrintPreview={(ds) => {
            setPrintModal({
              isOpen: true,
              type: 'discharge_summary',
              data: ds
            });
          }}
          onDischargeSuccess={(ds) => {
            // Patient discharge summary saved
          }}
        />
      )}

      {/* View Discharge File Modal */}
      {isViewDischargeFileOpen && selectedPatientDischargeSummary && (
        <ViewDischargeFileModal
          isOpen={isViewDischargeFileOpen}
          onClose={() => setIsViewDischargeFileOpen(false)}
          dischargeSummary={selectedPatientDischargeSummary}
          onPrint={(ds) => {
            setPrintModal({
              isOpen: true,
              type: 'discharge_summary',
              data: ds
            });
          }}
          onEdit={() => {
            setIsViewDischargeFileOpen(false);
            if (selectedPatient) setDischargeModalPatient(selectedPatient);
            setIsDischargeModalOpen(true);
          }}
        />
      )}

      {/* Refer Patient Modal */}
      {isReferralModalOpen && (referralModalPatient || selectedPatient) && (
        <ReferralPatientModal
          isOpen={isReferralModalOpen}
          onClose={() => {
            setIsReferralModalOpen(false);
            setReferralModalPatient(null);
          }}
          patient={(referralModalPatient || selectedPatient)!}
          existingReferral={selectedPatientReferral}
          onPrintPreview={(ref: any) => {
            setPrintModal({
              isOpen: true,
              type: 'referral_form',
              data: ref
            });
          }}
        />
      )}

      {/* View Referral File Modal */}
      {isViewReferralFileOpen && selectedPatientReferral && (
        <ViewReferralFileModal
          isOpen={isViewReferralFileOpen}
          onClose={() => setIsViewReferralFileOpen(false)}
          referral={selectedPatientReferral}
          onPrint={(ref) => {
            setPrintModal({
              isOpen: true,
              type: 'referral_form',
              data: ref
            });
          }}
          onEdit={() => {
            setIsViewReferralFileOpen(false);
            if (selectedPatient) setReferralModalPatient(selectedPatient);
            setIsReferralModalOpen(true);
          }}
        />
      )}

      {/* Report Deceased / Death Certificate Modal */}
      {isReportDeceasedModalOpen && (deceasedModalPatient || selectedPatient) && (
        <ReportDeceasedModal
          isOpen={isReportDeceasedModalOpen}
          onClose={() => {
            setIsReportDeceasedModalOpen(false);
            setDeceasedModalPatient(null);
          }}
          patient={(deceasedModalPatient || selectedPatient)!}
          existingCertificate={selectedPatientDeathCert}
          onPrintPreview={(cert) => {
            setPrintModal({
              isOpen: true,
              type: 'death_certificate',
              data: cert
            });
          }}
        />
      )}

      {/* View Death Certificate File Modal */}
      {isViewDeathCertModalOpen && selectedPatientDeathCert && (
        <ViewDeathCertificateModal
          isOpen={isViewDeathCertModalOpen}
          onClose={() => setIsViewDeathCertModalOpen(false)}
          certificate={selectedPatientDeathCert}
          onPrintPreview={(cert) => {
            setPrintModal({
              isOpen: true,
              type: 'death_certificate',
              data: cert
            });
          }}
          onEdit={() => {
            setIsViewDeathCertModalOpen(false);
            if (selectedPatient) setDeceasedModalPatient(selectedPatient);
            setIsReportDeceasedModalOpen(true);
          }}
        />
      )}

      {/* Administer Indirect Cart Item Modal */}
      {administeringCartItem && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setAdministeringCartItem(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-purple-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Syringe className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-sm">Administer & Dispense Indirect Cart Item</h3>
                  <p className="text-[11px] text-purple-200">
                    Patient: {administeringCartItem.patientName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdministeringCartItem(null)}
                className="text-purple-200 hover:text-white font-bold text-lg p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAdministerCartItemSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 space-y-1">
                <div className="text-xs text-purple-900 font-bold flex items-center justify-between">
                  <span className="text-sm font-extrabold">{administeringCartItem.itemName}</span>
                  <span className="px-2 py-0.5 bg-purple-200 rounded text-[11px]">
                    {administeringCartItem.dosage}
                  </span>
                </div>
                <div className="text-[11px] text-purple-800">
                  Cart: <span className="font-mono font-bold">{administeringCartItem.cartId}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Quantity to Administer
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={administeringCartItem.quantity}
                    onChange={(e) => setAdministeringCartItem({
                      ...administeringCartItem,
                      quantity: Math.max(1, Number(e.target.value))
                    })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Route of Administration
                  </label>
                  <input
                    type="text"
                    value={administeringCartItem.route}
                    onChange={(e) => setAdministeringCartItem({
                      ...administeringCartItem,
                      route: e.target.value
                    })}
                    placeholder="e.g. IV Bolus, IM Deltoid, Oral"
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Vital Signs at Administration
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">BP</label>
                    <input
                      type="text"
                      value={administeringCartItem.vitals.bloodPressure}
                      onChange={(e) => setAdministeringCartItem({
                        ...administeringCartItem,
                        vitals: { ...administeringCartItem.vitals, bloodPressure: e.target.value }
                      })}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Pulse (bpm)</label>
                    <input
                      type="number"
                      value={administeringCartItem.vitals.pulseRate}
                      onChange={(e) => setAdministeringCartItem({
                        ...administeringCartItem,
                        vitals: { ...administeringCartItem.vitals, pulseRate: Number(e.target.value) }
                      })}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Temp (&deg;C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={administeringCartItem.vitals.temperature}
                      onChange={(e) => setAdministeringCartItem({
                        ...administeringCartItem,
                        vitals: { ...administeringCartItem.vitals, temperature: Number(e.target.value) }
                      })}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">SpO2 (%)</label>
                    <input
                      type="number"
                      value={administeringCartItem.vitals.spO2}
                      onChange={(e) => setAdministeringCartItem({
                        ...administeringCartItem,
                        vitals: { ...administeringCartItem.vitals, spO2: Number(e.target.value) }
                      })}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nurse Clinical Observations / Injection Site Notes
                </label>
                <textarea
                  rows={2}
                  value={administeringCartItem.notes}
                  onChange={(e) => setAdministeringCartItem({
                    ...administeringCartItem,
                    notes: e.target.value
                  })}
                  placeholder="e.g. Administered in left deltoid. Patient tolerated dose well with no adverse reactions."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAdministeringCartItem(null)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Administration & Update MAR</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Modal Integration (rendered at very top of stack) */}
      {printModal.isOpen && (
        <PrintReceiptModal
          isOpen={printModal.isOpen}
          onClose={() => setPrintModal({ ...printModal, isOpen: false })}
          type={printModal.type}
          data={printModal.data}
        />
      )}

    </div>
  );
};
