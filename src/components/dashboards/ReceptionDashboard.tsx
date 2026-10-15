import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useClinic, userHasRole } from '../../context/ClinicContext';
import { recordFirestoreRead } from '../../services/developerTelemetry';
import { Patient, PatientAgeCategory, PatientAdmissionType, User } from '../../types';
import {
  UserSquare2,
  UserPlus,
  Search,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  Phone,
  ShieldCheck,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Baby,
  Smile,
  User as UserIcon,
  HeartHandshake,
  BedDouble,
  Activity,
  Edit3,
  Scale,
  DoorOpen,
  Layers,
  History,
  MoveRight,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Filter
} from 'lucide-react';
import { EditPatientModal } from '../common/EditPatientModal';
import { EditAnthropometryModal } from '../common/EditAnthropometryModal';
import { ManageLocationsModal } from '../common/ManageLocationsModal';
import { PatientMovementHistoryModal } from '../common/PatientMovementHistoryModal';
import { RegisterRevisitModal } from '../common/RegisterRevisitModal';
import { parseAgeInput, calculateAgeFromDob, formatPatientAge, getAgeInYears } from '../../utils/ageUtils';

export const AGE_CATEGORIES: { key: PatientAgeCategory; label: string; range: string; color: string; defaultAge: number }[] = [
  { key: 'INFANT', label: 'Infant', range: '0 - 2 yrs', color: 'bg-cyan-100 text-cyan-800 border-cyan-300', defaultAge: 1 },
  { key: 'CHILD', label: 'Child', range: '3 - 12 yrs', color: 'bg-amber-100 text-amber-800 border-amber-300', defaultAge: 7 },
  { key: 'ADULT', label: 'Adult', range: '13 - 59 yrs', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', defaultAge: 32 },
  { key: 'ELDER', label: 'Elder / Senior', range: '60+ yrs', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', defaultAge: 68 }
];

export const getCategoryFromAge = (age: number | string): PatientAgeCategory => {
  const yrs = getAgeInYears(age);
  if (yrs <= 2) return 'INFANT';
  if (yrs <= 12) return 'CHILD';
  if (yrs <= 59) return 'ADULT';
  return 'ELDER';
};

export const getCategoryBadgeClass = (category?: PatientAgeCategory | string, age?: number | string) => {
  const cat = category || (age !== undefined ? getCategoryFromAge(age) : 'ADULT');
  switch (cat) {
    case 'INFANT':
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    case 'CHILD':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'ELDER':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'ADULT':
    default:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
};

export const ReceptionDashboard: React.FC = () => {
  const {
    activeClinic,
    currentUser,
    currentClinicPatients,
    currentClinicWards,
    currentClinicDepartments,
    currentClinicInsurancePolicies,
    registerPatient,
    updatePatientStatus,
    users
  } = useClinic();

  const [activeTab, setActiveTab] = useState<'queue' | 'register' | 'all_patients'>('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [anthropometryPatient, setAnthropometryPatient] = useState<Patient | null>(null);
  const [movementPatient, setMovementPatient] = useState<Patient | null>(null);
  const [revisitPatient, setRevisitPatient] = useState<Patient | null>(null);
  const [selectedPatientForRevisitId, setSelectedPatientForRevisitId] = useState<string | null>(null);
  const [revisitSelectionPrompt, setRevisitSelectionPrompt] = useState<string | null>(null);
  const [manageLocationsOpen, setManageLocationsOpen] = useState(false);

  const selectedPatientForRevisit = useMemo(() => {
    if (!selectedPatientForRevisitId) return null;
    return currentClinicPatients.find(p => p.id === selectedPatientForRevisitId) || null;
  }, [currentClinicPatients, selectedPatientForRevisitId]);

  const toggleSelectPatientForRevisit = (patientId: string) => {
    setSelectedPatientForRevisitId(prev => (prev === patientId ? null : patientId));
    setRevisitSelectionPrompt(null);
  };

  // Available insurance policies for dropdown
  const availableInsurancePolicies = useMemo(() => {
    return (currentClinicInsurancePolicies || []).filter(p => p.status === 'active');
  }, [currentClinicInsurancePolicies]);

  const [isCustomInsurance, setIsCustomInsurance] = useState(false);
  const [customInsuranceName, setCustomInsuranceName] = useState('');

  // Register Form State
  const [regForm, setRegForm] = useState({
    firstName: '',
    lastName: '',
    gender: 'Female' as Patient['gender'],
    dob: '1995-01-01',
    age: 29,
    rawAge: '29',
    ageDisplay: '29 yrs',
    ageUnit: 'years' as 'days' | 'weeks' | 'months' | 'years',
    ageCategory: 'ADULT' as PatientAgeCategory,
    patientType: 'OPD' as PatientAdmissionType,
    department: 'General Outpatient (OPD)',
    doctorRoom: 'Consultation Room 1',
    assignedDoctorId: '',
    ward: 'Male Medical Ward',
    bedNumber: 'Bed 01',
    phone: '',
    email: '',
    address: '',
    registeredClinicId: activeClinic?.id || '',
    bloodGroup: '',
    allergiesText: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRel: 'Next of Kin'
  });

  const doctorsList = users.filter(u => userHasRole(u, 'doctor') && u.clinicId === activeClinic.id);

  // Sorting & Filtering State for Active Clinic Waiting Queue
  const [queueSearchQuery, setQueueSearchQuery] = useState('');
  const [queueSortKey, setQueueSortKey] = useState<'date' | 'name' | 'mrn' | 'age'>('date');
  const [queueSortOrder, setQueueSortOrder] = useState<'asc' | 'desc'>('desc');
  const [queueTypeFilter, setQueueTypeFilter] = useState<'all' | 'OPD' | 'IPD' | 'revisit'>('all');
  const [queuePage, setQueuePage] = useState<number>(0);

  // Sorting & Filtering State for Clinic Patient Index
  const [patientIndexSortKey, setPatientIndexSortKey] = useState<'date' | 'name' | 'mrn' | 'age' | 'status'>('date');
  const [patientIndexSortOrder, setPatientIndexSortOrder] = useState<'asc' | 'desc'>('desc');
  const [patientIndexTypeFilter, setPatientIndexTypeFilter] = useState<'all' | 'OPD' | 'IPD' | 'revisit'>('all');
  const [patientIndexPage, setPatientIndexPage] = useState<number>(0);

  // Track which patient pagination groups have already triggered Firestore reads in this session
  const fetchedReadGroupsRef = useRef<Set<string>>(new Set());

  // Helper to extract timestamp reliably for date sorting
  const getPatientTimestamp = (p: Patient): number => {
    const raw = p.registeredAt || (p as any).admissionDate || (p as any).createdAt || '';
    if (!raw) return 0;
    const time = new Date(raw).getTime();
    return isNaN(time) ? 0 : time;
  };

  // Base waiting queue (all active patients)
  const clinicQueue = useMemo(() => {
    return currentClinicPatients.filter(p => p.currentStatus !== 'discharged');
  }, [currentClinicPatients]);

  // Sorted and filtered active waiting queue
  const sortedAndFilteredQueue = useMemo(() => {
    let list = [...clinicQueue];

    // Filter by admission/revisit type
    if (queueTypeFilter === 'OPD') {
      list = list.filter(p => p.patientType === 'OPD' || !p.patientType);
    } else if (queueTypeFilter === 'IPD') {
      list = list.filter(p => p.patientType === 'IPD');
    } else if (queueTypeFilter === 'revisit') {
      list = list.filter(p => Boolean(p.isRevisit));
    }

    // Filter by search query
    if (queueSearchQuery.trim()) {
      const q = queueSearchQuery.toLowerCase().trim();
      list = list.filter(p =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        (p.department && p.department.toLowerCase().includes(q)) ||
        (p.ward && p.ward.toLowerCase().includes(q)) ||
        (p.bedNumber && p.bedNumber.toLowerCase().includes(q)) ||
        (p.doctorRoom && p.doctorRoom.toLowerCase().includes(q)) ||
        (p.assignedDoctorName && p.assignedDoctorName.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q))
      );
    }

    // Sort queue by selected criteria
    list.sort((a, b) => {
      if (queueSortKey === 'date') {
        const timeA = getPatientTimestamp(a);
        const timeB = getPatientTimestamp(b);
        return queueSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }
      if (queueSortKey === 'name') {
        const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
        const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
        return queueSortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      if (queueSortKey === 'mrn') {
        const mrnA = (a.mrn || '').toLowerCase();
        const mrnB = (b.mrn || '').toLowerCase();
        return queueSortOrder === 'asc'
          ? mrnA.localeCompare(mrnB, undefined, { numeric: true })
          : mrnB.localeCompare(mrnA, undefined, { numeric: true });
      }
      if (queueSortKey === 'age') {
        const ageA = getAgeInYears(a);
        const ageB = getAgeInYears(b);
        return queueSortOrder === 'asc' ? ageA - ageB : ageB - ageA;
      }
      return 0;
    });

    return list;
  }, [clinicQueue, queueTypeFilter, queueSearchQuery, queueSortKey, queueSortOrder]);

  // Sorted and filtered Master Patient Index
  const filteredPatients = useMemo(() => {
    let list = currentClinicPatients.filter(p => {
      // Type filter
      if (patientIndexTypeFilter === 'OPD' && p.patientType === 'IPD') return false;
      if (patientIndexTypeFilter === 'IPD' && p.patientType !== 'IPD') return false;
      if (patientIndexTypeFilter === 'revisit' && !p.isRevisit) return false;

      // Text search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        (p.department && p.department.toLowerCase().includes(q)) ||
        (p.ward && p.ward.toLowerCase().includes(q)) ||
        (p.bedNumber && p.bedNumber.toLowerCase().includes(q)) ||
        (p.doctorRoom && p.doctorRoom.toLowerCase().includes(q)) ||
        (p.assignedDoctorName && p.assignedDoctorName.toLowerCase().includes(q)) ||
        (p.ageCategory && p.ageCategory.toLowerCase().includes(q)) ||
        (p.patientType && p.patientType.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.registeredAt && p.registeredAt.toLowerCase().includes(q));
    });

    // Sort by selected criteria
    list.sort((a, b) => {
      if (patientIndexSortKey === 'date') {
        const timeA = getPatientTimestamp(a);
        const timeB = getPatientTimestamp(b);
        return patientIndexSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }
      if (patientIndexSortKey === 'name') {
        const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
        const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
        return patientIndexSortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      if (patientIndexSortKey === 'mrn') {
        const mrnA = (a.mrn || '').toLowerCase();
        const mrnB = (b.mrn || '').toLowerCase();
        return patientIndexSortOrder === 'asc'
          ? mrnA.localeCompare(mrnB, undefined, { numeric: true })
          : mrnB.localeCompare(mrnA, undefined, { numeric: true });
      }
      if (patientIndexSortKey === 'age') {
        const ageA = getAgeInYears(a);
        const ageB = getAgeInYears(b);
        return patientIndexSortOrder === 'asc' ? ageA - ageB : ageB - ageA;
      }
      if (patientIndexSortKey === 'status') {
        const statusA = (a.currentStatus || '').toLowerCase();
        const statusB = (b.currentStatus || '').toLowerCase();
        return patientIndexSortOrder === 'asc' ? statusA.localeCompare(statusB) : statusB.localeCompare(statusA);
      }
      return 0;
    });

    return list;
  }, [currentClinicPatients, patientIndexTypeFilter, searchQuery, patientIndexSortKey, patientIndexSortOrder]);

  const handleIndexHeaderSort = (key: 'date' | 'name' | 'mrn' | 'age' | 'status') => {
    if (patientIndexSortKey === key) {
      setPatientIndexSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setPatientIndexSortKey(key);
      setPatientIndexSortOrder(key === 'name' || key === 'mrn' ? 'asc' : 'desc');
    }
    setPatientIndexPage(0);
  };

  // Reset pagination to initial 5 display when filters, search, or active clinic change
  useEffect(() => {
    setQueuePage(0);
  }, [queueSearchQuery, queueTypeFilter, queueSortKey, queueSortOrder, activeClinic.id]);

  useEffect(() => {
    setPatientIndexPage(0);
  }, [searchQuery, patientIndexTypeFilter, patientIndexSortKey, patientIndexSortOrder, activeClinic.id]);

  // Helper: Initial 5 patients on page 0, then groups of 10 on subsequent pages
  const buildPatientGroupPagination = (items: Patient[], currentPage: number) => {
    const totalItems = items.length;
    if (totalItems === 0) {
      return {
        totalItems: 0,
        totalGroups: 1,
        safePage: 0,
        startIndex: 0,
        endIndex: 0,
        visibleItems: [] as Patient[],
        hasPrev: false,
        hasNext: false,
        remainingCount: 0,
        nextGroupSize: 0,
        groups: [] as { pageIndex: number; label: string; rangeLabel: string; count: number }[]
      };
    }

    const totalGroups = totalItems <= 5 ? 1 : 1 + Math.ceil((totalItems - 5) / 10);
    const safePage = Math.min(Math.max(0, currentPage), totalGroups - 1);
    const startIndex = safePage === 0 ? 0 : 5 + (safePage - 1) * 10;
    const pageSize = safePage === 0 ? 5 : 10;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const visibleItems = items.slice(startIndex, endIndex);
    const hasPrev = safePage > 0;
    const hasNext = safePage < totalGroups - 1;
    const remainingCount = Math.max(0, totalItems - endIndex);
    const nextGroupSize = hasNext ? Math.min(10, totalItems - endIndex) : 0;

    const groups: { pageIndex: number; label: string; rangeLabel: string; count: number }[] = [];
    for (let g = 0; g < totalGroups; g++) {
      const gStart = g === 0 ? 0 : 5 + (g - 1) * 10;
      const gSize = g === 0 ? 5 : 10;
      const gEnd = Math.min(gStart + gSize, totalItems);
      groups.push({
        pageIndex: g,
        label: g === 0 ? `Initial 5 (${gStart + 1}–${gEnd})` : `Group ${g + 1} (${gStart + 1}–${gEnd})`,
        rangeLabel: `${gStart + 1}–${gEnd}`,
        count: gEnd - gStart
      });
    }

    return {
      totalItems,
      totalGroups,
      safePage,
      startIndex,
      endIndex,
      visibleItems,
      hasPrev,
      hasNext,
      remainingCount,
      nextGroupSize,
      groups
    };
  };

  const queuePagination = useMemo(
    () => buildPatientGroupPagination(sortedAndFilteredQueue, queuePage),
    [sortedAndFilteredQueue, queuePage]
  );

  const indexPagination = useMemo(
    () => buildPatientGroupPagination(filteredPatients, patientIndexPage),
    [filteredPatients, patientIndexPage]
  );

  const handleSelectQueueGroup = (targetPage: number) => {
    const nextGroup = buildPatientGroupPagination(sortedAndFilteredQueue, targetPage);
    const groupKey = `${activeClinic.id}:queue:${nextGroup.safePage}`;
    if (nextGroup.safePage > 0 && !fetchedReadGroupsRef.current.has(groupKey) && nextGroup.visibleItems.length > 0) {
      fetchedReadGroupsRef.current.add(groupKey);
      recordFirestoreRead('patients', nextGroup.visibleItems, activeClinic.id);
    }
    setQueuePage(nextGroup.safePage);
  };

  const handleSelectIndexGroup = (targetPage: number) => {
    const nextGroup = buildPatientGroupPagination(filteredPatients, targetPage);
    const groupKey = `${activeClinic.id}:index:${nextGroup.safePage}`;
    if (nextGroup.safePage > 0 && !fetchedReadGroupsRef.current.has(groupKey) && nextGroup.visibleItems.length > 0) {
      fetchedReadGroupsRef.current.add(groupKey);
      recordFirestoreRead('patients', nextGroup.visibleItems, activeClinic.id);
    }
    setPatientIndexPage(nextGroup.safePage);
  };

  const selectedWard = currentClinicWards.find(w => w.name === regForm.ward);
  const selectedDept = currentClinicDepartments.find(d => d.name === regForm.department);

  const handleAgeInputChange = (newRaw: string) => {
    const parsed = parseAgeInput(newRaw);
    setRegForm(prev => ({
      ...prev,
      rawAge: newRaw,
      age: parsed.isValid ? parsed.ageInYears : prev.age,
      ageDisplay: parsed.isValid ? parsed.displayAge : newRaw,
      ageUnit: parsed.isValid ? parsed.unit : prev.ageUnit,
      ageCategory: parsed.isValid ? parsed.inferredCategory : prev.ageCategory,
      dob: parsed.isValid ? parsed.estimatedDob : prev.dob
    }));
  };

  const handleDobChange = (newDob: string) => {
    const parsed = calculateAgeFromDob(newDob);
    setRegForm(prev => ({
      ...prev,
      dob: newDob,
      rawAge: parsed.shortDisplay,
      age: parsed.ageInYears,
      ageDisplay: parsed.displayAge,
      ageUnit: parsed.unit,
      ageCategory: parsed.inferredCategory
    }));
  };

  const handleCategorySelect = (category: PatientAgeCategory) => {
    const catConfig = AGE_CATEGORIES.find(c => c.key === category);
    const defAge = catConfig ? catConfig.defaultAge : 30;
    const parsed = parseAgeInput(String(defAge));
    setRegForm(prev => ({
      ...prev,
      ageCategory: category,
      age: defAge,
      rawAge: String(defAge),
      ageDisplay: parsed.displayAge,
      ageUnit: 'years',
      dob: parsed.estimatedDob
    }));
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.firstName || !regForm.lastName) return;

    const allergies = regForm.allergiesText
      ? regForm.allergiesText.split(',').map(a => a.trim())
      : ['None Reported'];

    const doc = doctorsList.find(d => d.id === regForm.assignedDoctorId);
    const parsedAge = parseAgeInput(regForm.rawAge ?? String(regForm.age));

    const newPat = registerPatient({
      firstName: regForm.firstName.trim(),
      lastName: regForm.lastName.trim(),
      gender: regForm.gender,
      dob: regForm.dob,
      age: parsedAge.ageInYears,
      rawAge: regForm.rawAge || String(parsedAge.unitCount),
      ageDisplay: parsedAge.displayAge,
      ageUnit: parsedAge.unit,
      ageCategory: regForm.ageCategory || parsedAge.inferredCategory,
      patientType: regForm.patientType,
      department: regForm.department || 'General Outpatient (OPD)',
      doctorRoom: regForm.patientType === 'OPD' ? regForm.doctorRoom : undefined,
      ward: regForm.patientType === 'IPD' ? regForm.ward : undefined,
      bedNumber: regForm.patientType === 'IPD' ? regForm.bedNumber : undefined,
      assignedDoctorId: doc?.id,
      assignedDoctorName: doc?.name,
      phone: regForm.phone.trim() || undefined,
      email: regForm.email.trim() || undefined,
      address: regForm.address.trim() || 'Address on file',
      registeredClinicId: activeClinic.id,
      bloodGroup: regForm.bloodGroup.trim() || undefined,
      allergies,
      insuranceProvider: regForm.insuranceProvider.trim() || undefined,
      insurancePolicyNumber: regForm.insurancePolicyNumber.trim() || undefined,
      emergencyContact: {
        name: regForm.emergencyName.trim() || 'Family Member',
        phone: regForm.emergencyPhone.trim() || regForm.phone.trim() || undefined,
        relationship: regForm.emergencyRel
      }
    });

    alert(`Patient ${newPat.firstName} ${newPat.lastName} [${newPat.patientType || 'OPD'} - ${newPat.ageCategory || 'ADULT'}] registered with ${newPat.patientType || 'OPD'} Number: ${newPat.mrn}. Tagged to ${newPat.department || 'OPD'} (${newPat.patientType === 'IPD' ? `${newPat.ward} - ${newPat.bedNumber}` : newPat.doctorRoom}).`);
    setActiveTab('queue');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
            <UserSquare2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">Reception & Triage Admissions Suite</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                {currentUser.name}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              OPD / IPD Registration &bull; Master Patient Index &bull; Ward & Bed Allocations &bull; Movement Tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setManageLocationsOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Configure Wards, Beds, and Clinical Departments"
          >
            <Building2 className="w-4 h-4 text-slate-600" />
            Manage Wards & Departments
          </button>

          <button
            onClick={() => setActiveTab('register')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            New Patient Registration
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'queue' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Active Clinic Waiting Queue ({clinicQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('register')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'register' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Patient Registration (OPD / IPD)</span>
        </button>

        <button
          onClick={() => setActiveTab('all_patients')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'all_patients' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Clinic Patient Index ({currentClinicPatients.length})</span>
        </button>
      </div>

      {/* Tab 1: Clinic Queue & Routing */}
      {activeTab === 'queue' && (
        <div className="space-y-4 text-xs">
          {/* Active Waiting Queue Search & Sort Controls */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search waiting queue by name, OPD/IPD number, room, doctor, phone..."
                  value={queueSearchQuery}
                  onChange={(e) => setQueueSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-7 py-2 border border-slate-300 rounded-lg bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                {queueSearchQuery && (
                  <button
                    onClick={() => setQueueSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* Sort By & Direction Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-[11px] font-bold text-slate-600">Sort By:</span>
                  <select
                    value={queueSortKey}
                    onChange={(e) => setQueueSortKey(e.target.value as any)}
                    className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="date">Date & Time</option>
                    <option value="name">Patient Name (Alphabetical)</option>
                    <option value="mrn">OPD / IPD Number</option>
                    <option value="age">Age</option>
                  </select>
                </div>

                {/* Sort Order Direction Toggle Button */}
                <button
                  type="button"
                  onClick={() => setQueueSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 rounded-lg font-bold text-xs cursor-pointer transition-colors shadow-2xs"
                  title={`Toggle order: current is ${queueSortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                >
                  {queueSortOrder === 'asc' ? (
                    <>
                      <ArrowUp className="w-3.5 h-3.5 text-purple-700" />
                      <span>{queueSortKey === 'name' ? 'Alphabetical (A → Z)' : queueSortKey === 'date' ? 'Oldest First' : 'Ascending'}</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-3.5 h-3.5 text-purple-700" />
                      <span>{queueSortKey === 'name' ? 'Reverse (Z → A)' : queueSortKey === 'date' ? 'Newest First' : 'Descending'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Filter Pills & Summary */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-slate-400" />
                  Filter:
                </span>
                <button
                  type="button"
                  onClick={() => setQueueTypeFilter('all')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    queueTypeFilter === 'all'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All ({clinicQueue.length})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueTypeFilter('OPD')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    queueTypeFilter === 'OPD'
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200'
                  }`}
                >
                  OPD Only ({clinicQueue.filter(p => p.patientType === 'OPD' || !p.patientType).length})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueTypeFilter('IPD')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    queueTypeFilter === 'IPD'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  IPD Inpatients ({clinicQueue.filter(p => p.patientType === 'IPD').length})
                </button>
                <button
                  type="button"
                  onClick={() => setQueueTypeFilter('revisit')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    queueTypeFilter === 'revisit'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  Revisits ({clinicQueue.filter(p => Boolean(p.isRevisit)).length})
                </button>
              </div>

              <div className="text-slate-500 font-semibold">
                Showing{' '}
                <strong className="text-slate-900">
                  {queuePagination.totalItems === 0
                    ? '0'
                    : `${queuePagination.startIndex + 1}–${queuePagination.endIndex}`}
                </strong>{' '}
                of {sortedAndFilteredQueue.length} waiting patients
                <span className="ml-1.5 text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-bold">
                  {queuePagination.safePage === 0
                    ? 'Initial Display (Max 5)'
                    : `Group ${queuePagination.safePage + 1} of ${queuePagination.totalGroups} (10 per group)`}
                </span>
              </div>
            </div>

            {/* Read-Saving Pagination Prompt & Group Controls for Active Waiting Queue */}
            {queuePagination.totalItems > 0 && (
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-purple-50/50 -mx-4 -mb-4 px-4 py-3 rounded-b-xl">
                <div className="text-[11px] text-slate-700 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>
                    {queuePagination.safePage === 0 ? (
                      <>
                        <strong>Read-Optimized Opening View:</strong> Showing initial{' '}
                        <strong>{queuePagination.visibleItems.length}</strong> patient(s) to reduce database reads.
                        {queuePagination.hasNext && (
                          <>
                            {' '}
                            Click <strong>Next</strong> to load the next group of{' '}
                            <strong>{queuePagination.nextGroupSize}</strong> patient(s) ({queuePagination.remainingCount} remaining).
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        Viewing <strong>Group {queuePagination.safePage + 1} of {queuePagination.totalGroups}</strong>{' '}
                        (Patients <strong>{queuePagination.startIndex + 1}–{queuePagination.endIndex}</strong> of{' '}
                        {queuePagination.totalItems} &bull; 10 per group).
                        {queuePagination.hasNext && (
                          <>
                            {' '}
                            Click <strong>Next</strong> to view the next group ({queuePagination.remainingCount} remaining).
                          </>
                        )}
                      </>
                    )}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={!queuePagination.hasPrev}
                    onClick={() => handleSelectQueueGroup(queuePagination.safePage - 1)}
                    className="px-2.5 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  {queuePagination.groups.map(grp => (
                    <button
                      key={grp.pageIndex}
                      type="button"
                      onClick={() => handleSelectQueueGroup(grp.pageIndex)}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                        queuePagination.safePage === grp.pageIndex
                          ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                          : 'bg-white hover:bg-purple-50 text-slate-700 border-slate-300'
                      }`}
                      title={grp.label}
                    >
                      {grp.pageIndex === 0 ? `Initial (${grp.rangeLabel})` : `Grp ${grp.pageIndex + 1} (${grp.rangeLabel})`}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={!queuePagination.hasNext}
                    onClick={() => handleSelectQueueGroup(queuePagination.safePage + 1)}
                    className="px-3 py-1 rounded-md bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-2xs transition-colors"
                  >
                    <span>
                      {queuePagination.hasNext
                        ? `Next (${queuePagination.nextGroupSize} Patients)`
                        : 'Next'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {queuePagination.visibleItems.map(patient => {
              const cat = patient.ageCategory || getCategoryFromAge(patient.age);
              const badgeClass = getCategoryBadgeClass(cat, patient.age);
              const isIPD = patient.patientType === 'IPD';
              const pVitals = patient.anthropometry || patient.vitals;
              const isSelectedForRevisit = selectedPatientForRevisitId === patient.id;
              return (
                <div
                  key={patient.id}
                  className={`bg-white rounded-xl border p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                    isSelectedForRevisit
                      ? 'border-purple-600 ring-2 ring-purple-500/20 bg-purple-50/15'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSelectPatientForRevisit(patient.id)}
                        className={`font-bold text-sm px-2 py-0.5 rounded-md border flex items-center gap-1.5 cursor-pointer transition-colors ${
                          isSelectedForRevisit
                            ? 'bg-purple-700 text-white border-purple-700 shadow-2xs'
                            : 'bg-slate-50 hover:bg-purple-50 text-slate-900 hover:text-purple-800 border-slate-200 hover:border-purple-300'
                        }`}
                        title={isSelectedForRevisit ? 'Click again to de-select patient' : 'Click patient name to select for Revisit registration'}
                      >
                        <input
                          type="radio"
                          checked={isSelectedForRevisit}
                          readOnly
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectPatientForRevisit(patient.id);
                          }}
                          className="w-3.5 h-3.5 accent-purple-600 cursor-pointer"
                        />
                        <span>{patient.firstName} {patient.lastName}</span>
                      </button>

                      <span className="font-mono text-slate-600 text-xs font-semibold">
                        {isIPD ? 'IPD No.' : 'OPD No.'}: {patient.mrn}
                      </span>
                      
                      {/* OPD / IPD Tag */}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                        isIPD ? 'bg-indigo-50 text-indigo-800 border-indigo-300' : 'bg-sky-50 text-sky-800 border-sky-300'
                      }`}>
                        {patient.patientType || 'OPD'}
                      </span>

                      {patient.isRevisit && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1 shadow-2xs">
                          <RotateCcw className="w-2.5 h-2.5 text-purple-700" />
                          Revisit (Visit #{patient.visits?.length || (patient.revisitCount ? patient.revisitCount + 1 : 2)})
                        </span>
                      )}

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
                        {cat}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 uppercase">
                        {patient.currentStatus.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-slate-600 text-xs flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>Type: <strong>{isIPD ? 'Inpatient (IPD)' : 'Outpatient (OPD)'}</strong></span>
                      <span>&bull;</span>
                      <span>Age: <strong>{formatPatientAge(patient)}</strong></span>
                      <span>&bull;</span>
                      <span>Gender: <strong>{patient.gender}</strong></span>
                      <span>&bull;</span>
                      <span>Blood: <strong>{patient.bloodGroup || 'Not Tested'}</strong></span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1 text-slate-700">
                        <Calendar className="w-3 h-3 text-purple-600" />
                        <span>Registered: <strong>{patient.registeredAt || 'Today'}</strong></span>
                      </span>
                      {patient.phone && (
                        <>
                          <span>&bull;</span>
                          <span className="font-medium text-slate-700">Phone: {patient.phone}</span>
                        </>
                      )}
                    </div>

                    {/* Department, Ward & Room Location Tag */}
                    <div className="text-xs bg-slate-50 p-2 rounded-lg border border-slate-200 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <Building2 className="w-3.5 h-3.5 text-purple-600" />
                        <span>Dept: {patient.department || 'General OPD'}</span>
                      </div>
                      <span className="text-slate-300">|</span>
                      {isIPD ? (
                        <div className="flex items-center gap-1.5 font-bold text-indigo-800">
                          <BedDouble className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Ward: {patient.ward || 'General Inpatient'} &bull; {patient.bedNumber || 'Bed Assigned'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <DoorOpen className="w-3.5 h-3.5 text-slate-500" />
                          <span>Room: {patient.doctorRoom || 'Consultation Office'}</span>
                        </div>
                      )}
                      {patient.assignedDoctorName && (
                        <>
                          <span className="text-slate-300">|</span>
                          <div className="flex items-center gap-1 text-sky-800 font-semibold">
                            <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
                            <span>Dr: {patient.assignedDoctorName}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {pVitals && (
                      <div className="text-[11px] text-slate-600 flex items-center gap-3 bg-white p-1.5 rounded border border-slate-100 w-fit">
                        <span>BP: <strong>{pVitals.bloodPressure || 'N/A'}</strong></span>
                        <span>Pulse: <strong>{pVitals.pulseRate || 'N/A'} bpm</strong></span>
                        <span>Temp: <strong>{pVitals.temperature || 'N/A'} &deg;C</strong></span>
                        <span>SpO2: <strong>{pVitals.spO2 || 'N/A'}%</strong></span>
                      </div>
                    )}

                    <div className="text-slate-500 text-[11px]">
                      Insurance: <span className="font-medium text-slate-800">{patient.insuranceProvider || 'Direct Self-Pay'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Register as Revisit */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPatientForRevisitId(patient.id);
                        setRevisitPatient(patient);
                      }}
                      className="px-2.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      title="Register returning patient as a Revisit"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Register as Revisit
                    </button>

                    {/* Location Trail & Transfer History */}
                    <button
                      type="button"
                      onClick={() => setMovementPatient(patient)}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="View Timestamped Movement Trail & Transfer Path"
                    >
                      <History className="w-3.5 h-3.5 text-indigo-600" />
                      Location Path ({(patient.movementHistory || []).length})
                    </button>

                    {/* Level 2 Edit Patient Details */}
                    <button
                      type="button"
                      onClick={() => setEditingPatient(patient)}
                      className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="Edit Patient Info (Level 2 Clearance required)"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-purple-600" />
                      Edit
                    </button>

                    {/* Edit Anthropometry & Vitals */}
                    <button
                      type="button"
                      onClick={() => setAnthropometryPatient(patient)}
                      className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="Record Vitals & Anthropometric measurements"
                    >
                      <Activity className="w-3.5 h-3.5 text-sky-600" />
                      Anthropometry
                    </button>

                    <span className="text-slate-400">|</span>

                    <span className="text-slate-500 font-medium">Route:</span>
                    <select
                      value={patient.currentStatus}
                      onChange={(e) => updatePatientStatus(patient.id, e.target.value as any)}
                      className="p-1.5 border border-slate-300 rounded bg-white font-medium text-slate-800 text-xs"
                    >
                      <option value="waiting">Reception / Waiting</option>
                      <option value="in_triage">Triage / Nurse Station</option>
                      <option value="in_consultation">Doctor Consultation</option>
                      <option value="in_lab">Pathology Lab</option>
                      <option value="in_radiology">Radiology Imaging</option>
                      <option value="in_pharmacy">Pharmacy Dispense</option>
                      <option value="in_ward">Inpatient Ward</option>
                      <option value="discharged">Discharged</option>
                    </select>

                    <select
                      value={patient.assignedDoctorId || ''}
                      onChange={(e) => {
                        const doc = doctorsList.find(d => d.id === e.target.value);
                        updatePatientStatus(patient.id, 'in_consultation', doc?.id, doc?.name);
                      }}
                      className="p-1.5 border border-slate-300 rounded bg-white text-slate-700 text-xs font-medium"
                    >
                      <option value="">-- Assign Doctor --</option>
                      {doctorsList.map(doc => (
                        <option key={doc.id} value={doc.id}>{doc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}

            {sortedAndFilteredQueue.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-xs space-y-2">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="font-semibold text-slate-700">
                  {clinicQueue.length === 0
                    ? `No active patients waiting in ${activeClinic.name}.`
                    : `No waiting patients match your search or filter.`}
                </div>
                {clinicQueue.length > 0 && (
                  <button
                    onClick={() => {
                      setQueueSearchQuery('');
                      setQueueTypeFilter('all');
                    }}
                    className="text-purple-600 hover:text-purple-800 font-bold underline cursor-pointer text-[11px]"
                  >
                    Reset queue search and filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bottom Next/Previous Group Prompt for Active Waiting Queue */}
          {queuePagination.totalGroups > 1 && (
            <div className="bg-white rounded-xl border border-purple-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="text-slate-700">
                <span className="font-bold text-purple-950">
                  {queuePagination.safePage === 0
                    ? `Initial 5 Patients Displayed (1–${queuePagination.endIndex} of ${queuePagination.totalItems})`
                    : `Group ${queuePagination.safePage + 1} of ${queuePagination.totalGroups} Displayed (${queuePagination.startIndex + 1}–${queuePagination.endIndex} of ${queuePagination.totalItems})`}
                </span>
                <span className="text-slate-500 ml-2">
                  {queuePagination.hasNext
                    ? `Click Next to view the next group of ${queuePagination.nextGroupSize} patient(s).`
                    : 'You have reached the end of the waiting queue list.'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {queuePagination. safePage > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSelectQueueGroup(0)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer"
                  >
                    Back to Initial 5
                  </button>
                )}
                <button
                  type="button"
                  disabled={!queuePagination.hasPrev}
                  onClick={() => handleSelectQueueGroup(queuePagination.safePage - 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous Group</span>
                </button>
                <button
                  type="button"
                  disabled={!queuePagination.hasNext}
                  onClick={() => handleSelectQueueGroup(queuePagination.safePage + 1)}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>
                    {queuePagination.hasNext
                      ? `Next Group (${queuePagination.nextGroupSize} Patients)`
                      : 'All Groups Viewed'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: New Patient Registration */}
      {activeTab === 'register' && (
        <form onSubmit={handleRegisterSubmit} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5 text-xs">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-600" />
                Patient Registration & Electronic Medical Record Intake
              </h3>
              <p className="text-[11px] text-slate-500">
                Select admission classification (OPD or IPD), assign clinical department, doctor's room or ward bed, and demographic data.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setManageLocationsOpen(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded font-semibold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              Configure Wards / Depts
            </button>
          </div>

          {/* Returning Patient Revisit Banner */}
          <div className="p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-slate-50 border border-purple-200 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-700 text-white rounded-lg shadow-2xs">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-purple-950">Is this a Returning Patient (Revisit)?</div>
                <div className="text-[11px] text-purple-800">
                  Patients already in the clinic's database should be tagged as a <strong>Revisit</strong> under the Master Patient Index. This systematically issues a new OPD or IPD number, alerts the doctor, and maintains their consolidated compound ledger.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('all_patients')}
              className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              Search Master Patient Index to Tag Revisit
            </button>
          </div>

          {/* 1. Admission Classification: OPD vs IPD */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Admission Stream (OPD vs IPD) *
              </label>
              <span className="text-[11px] text-slate-500">Identify whether patient is Outpatient or Inpatient admission</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRegForm(prev => ({ ...prev, patientType: 'OPD' }))}
                className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                  regForm.patientType === 'OPD'
                    ? 'bg-sky-50 border-sky-400 text-sky-900 ring-2 ring-sky-500 shadow-xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                    regForm.patientType === 'OPD' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    OPD
                  </div>
                  <div>
                    <div className="font-bold text-xs">Outpatient Department (OPD)</div>
                    <div className="text-[11px] text-slate-500">Day visits, clinic consults, routine lab tests, pharmacy pickups</div>
                  </div>
                </div>
                {regForm.patientType === 'OPD' && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
              </button>

              <button
                type="button"
                onClick={() => setRegForm(prev => ({ ...prev, patientType: 'IPD' }))}
                className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                  regForm.patientType === 'IPD'
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-900 ring-2 ring-indigo-500 shadow-xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                    regForm.patientType === 'IPD' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    IPD
                  </div>
                  <div>
                    <div className="font-bold text-xs">Inpatient Department (IPD)</div>
                    <div className="text-[11px] text-slate-500">Hospital ward admission, overnight observation, surgery, inpatient care</div>
                  </div>
                </div>
                {regForm.patientType === 'IPD' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
              </button>
            </div>
          </div>

          {/* 2. Department, Doctor & Ward/Bed Tagging */}
          <div className="p-4 bg-purple-50/40 rounded-xl border border-purple-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-purple-600" />
                Departmental Tagging & Room / Ward Bed Allocation *
              </label>
              <span className="text-[11px] text-purple-700 font-semibold">
                {regForm.patientType === 'IPD' ? 'Select Ward & Available Bed Number' : 'Tag Clinical Room or Office'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Department */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">Clinical Department *</label>
                <select
                  value={regForm.department}
                  onChange={(e) => {
                    const deptVal = e.target.value;
                    const d = currentClinicDepartments.find(x => x.name === deptVal);
                    setRegForm(prev => ({
                      ...prev,
                      department: deptVal,
                      doctorRoom: d && d.rooms.length > 0 ? d.rooms[0] : prev.doctorRoom
                    }));
                  }}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-semibold text-slate-900"
                  required
                >
                  {currentClinicDepartments.map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>

              {/* Doctor Assignment */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">Attending Doctor / Specialist</label>
                <select
                  value={regForm.assignedDoctorId}
                  onChange={(e) => setRegForm(prev => ({ ...prev, assignedDoctorId: e.target.value }))}
                  className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                >
                  <option value="">-- Select In-Charge Doctor --</option>
                  {doctorsList.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.name} ({doc.title || 'Clinician'})</option>
                  ))}
                </select>
              </div>

              {/* If OPD: Consultation Room; If IPD: Inpatient Ward */}
              {regForm.patientType === 'OPD' ? (
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Clinical Room / Office *</label>
                  <input
                    type="text"
                    value={regForm.doctorRoom}
                    onChange={(e) => setRegForm(prev => ({ ...prev, doctorRoom: e.target.value }))}
                    placeholder="e.g. Consultation Room 1, Office 102"
                    className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Inpatient Ward *</label>
                  <select
                    value={regForm.ward}
                    onChange={(e) => {
                      const wardVal = e.target.value;
                      const w = currentClinicWards.find(x => x.name === wardVal);
                      setRegForm(prev => ({
                        ...prev,
                        ward: wardVal,
                        bedNumber: w && w.beds.length > 0 ? w.beds[0] : 'Bed 01'
                      }));
                    }}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-bold text-indigo-900"
                    required
                  >
                    {currentClinicWards.map(w => (
                      <option key={w.id} value={w.name}>{w.name} ({w.totalBeds} Beds)</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* If IPD: Bed Selection with Real-time Availability */}
            {regForm.patientType === 'IPD' && (
              <div className="pt-2 border-t border-purple-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <BedDouble className="w-4 h-4 text-indigo-600" />
                    Select Inpatient Bed in {regForm.ward} *
                  </label>
                  <span className="text-[11px] text-indigo-600 font-semibold">
                    Total Ward Capacity: {selectedWard?.totalBeds || 12} Beds
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {(selectedWard?.beds || Array.from({ length: 12 }, (_, i) => `Bed ${String(i + 1).padStart(2, '0')}`)).map(b => {
                    const occupant = currentClinicPatients.find(p => p.patientType === 'IPD' && p.ward === regForm.ward && p.bedNumber === b && p.currentStatus !== 'discharged');
                    const isOccupied = !!occupant;
                    const isSelected = regForm.bedNumber === b;

                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => !isOccupied && setRegForm(prev => ({ ...prev, bedNumber: b }))}
                        disabled={isOccupied}
                        className={`p-2 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-700 font-bold shadow-xs ring-2 ring-indigo-400'
                            : isOccupied
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                            : 'bg-white text-slate-800 border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50'
                        }`}
                      >
                        <BedDouble className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : isOccupied ? 'text-slate-400' : 'text-indigo-600'}`} />
                        <span className="text-[11px] font-bold">{b}</span>
                        <span className="text-[9px]">
                          {isOccupied ? `Occupied` : `Free`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. Age Category Selector Buttons */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Patient Age Category (Life Stage) *
              </label>
              <span className="text-[11px] text-slate-500">Select life stage classification:</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {AGE_CATEGORIES.map(cat => {
                const isSelected = regForm.ageCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => handleCategorySelect(cat.key)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? `${cat.color} ring-2 ring-purple-600 font-bold shadow-xs`
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-black text-xs tracking-wide">{cat.key}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-purple-700" />}
                    </div>
                    <div className="text-[11px] font-semibold">{cat.label}</div>
                    <div className="text-[10px] opacity-75">{cat.range}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                placeholder="e.g. Liam, Evelyn"
                value={regForm.firstName}
                onChange={(e) => setRegForm({ ...regForm, firstName: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                placeholder="e.g. O'Connor, Gomez"
                value={regForm.lastName}
                onChange={(e) => setRegForm({ ...regForm, lastName: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Gender *</label>
              <select
                value={regForm.gender}
                onChange={(e) => setRegForm({ ...regForm, gender: e.target.value as any })}
                className="w-full p-2 border border-slate-300 rounded bg-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-medium text-slate-700 text-sm">
                  Age * <span className="text-xs font-normal text-slate-500">({regForm.ageCategory})</span>
                </label>
                <span className="text-[11px] text-teal-700 font-semibold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                  Supports 1/7 (day), 1/52 (wk), 1/12 (mo)
                </span>
              </div>
              <input
                type="text"
                value={regForm.rawAge ?? String(regForm.age)}
                onChange={(e) => handleAgeInputChange(e.target.value)}
                placeholder="e.g. 29, 2/52 (weeks), 5/7 (days), 1/12 (months)"
                className="w-full p-2 border border-slate-300 rounded bg-white font-bold text-slate-900 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                required
              />

              {/* Quick Fraction Shortcuts */}
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                <span className="text-[10px] text-slate-500 font-medium mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => handleAgeInputChange('5/7')}
                  className="px-1.5 py-0.5 text-[10px] font-semibold bg-cyan-50 text-cyan-800 border border-cyan-300 rounded hover:bg-cyan-100 transition-colors cursor-pointer"
                  title="5 days old (5/7)"
                >
                  5/7 (5 days)
                </button>
                <button
                  type="button"
                  onClick={() => handleAgeInputChange('2/52')}
                  className="px-1.5 py-0.5 text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-300 rounded hover:bg-sky-100 transition-colors cursor-pointer"
                  title="2 weeks old (2/52)"
                >
                  2/52 (2 wks)
                </button>
                <button
                  type="button"
                  onClick={() => handleAgeInputChange('1/12')}
                  className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 rounded hover:bg-amber-100 transition-colors cursor-pointer"
                  title="1 month old (1/12)"
                >
                  1/12 (1 mo)
                </button>
                <button
                  type="button"
                  onClick={() => handleAgeInputChange('6/12')}
                  className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 rounded hover:bg-amber-100 transition-colors cursor-pointer"
                  title="6 months old (6/12)"
                >
                  6/12 (6 mos)
                </button>
                <button
                  type="button"
                  onClick={() => handleAgeInputChange('29')}
                  className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 rounded hover:bg-emerald-100 transition-colors cursor-pointer"
                  title="29 years old (Adult)"
                >
                  29 yrs
                </button>
              </div>

              {/* Dynamic Age Interpretation Feedback */}
              {(() => {
                const parsed = parseAgeInput(regForm.rawAge ?? String(regForm.age));
                if (parsed.isValid) {
                  return (
                    <div className="mt-1.5 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-900 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-semibold">{parsed.clinicalMeaning}</span>
                        <span className="text-emerald-700">({parsed.displayAge})</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 bg-white/70 px-1 py-0.5 rounded border border-emerald-200">
                        Est DOB: {parsed.estimatedDob}
                      </span>
                    </div>
                  );
                } else if ((regForm.rawAge ?? '').trim().length > 0) {
                  return (
                    <div className="mt-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                      Enter fraction (e.g. <strong>2/52</strong> = 2 wks, <strong>5/7</strong> = 5 days, <strong>1/12</strong> = 1 mo) or years (e.g. 29).
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1 text-sm">Date of Birth</label>
              <input
                type="date"
                value={regForm.dob}
                onChange={(e) => handleDobChange(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded bg-white text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Changing DOB auto-calculates fraction or age in years
              </span>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Phone Number (Optional)</label>
              <input
                type="tel"
                value={regForm.phone}
                onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                placeholder="e.g. +1 555-0192 (optional)"
                className="w-full p-2 border border-slate-300 rounded bg-white"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Blood Group</label>
              <select
                value={regForm.bloodGroup}
                onChange={(e) => setRegForm({ ...regForm, bloodGroup: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
              >
                <option value="">-- Not Tested / Unknown --</option>
                <option value="O+">O Positive (O+)</option>
                <option value="O-">O Negative (O-)</option>
                <option value="A+">A Positive (A+)</option>
                <option value="A-">A Negative (A-)</option>
                <option value="B+">B Positive (B+)</option>
                <option value="B-">B Negative (B-)</option>
                <option value="AB+">AB Positive (AB+)</option>
                <option value="AB-">AB Negative (AB-)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Known Allergies</label>
              <input
                type="text"
                placeholder="e.g. Penicillin, Aspirin, Peanuts"
                value={regForm.allergiesText}
                onChange={(e) => setRegForm({ ...regForm, allergiesText: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Residential Address</label>
              <input
                type="text"
                value={regForm.address}
                onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                placeholder="e.g. 124 Blossom Lane, Suite 4"
                className="w-full p-2 border border-slate-300 rounded bg-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-medium text-slate-700">
                  Insurance Policy / Payer Scheme
                </label>
                <span className="text-[10px] text-emerald-700 font-semibold">
                  {availableInsurancePolicies.length} Available for {activeClinic.name}
                </span>
              </div>
              <select
                value={isCustomInsurance ? 'CUSTOM_INSURANCE' : regForm.insuranceProvider}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'CUSTOM_INSURANCE') {
                    setIsCustomInsurance(true);
                    setRegForm({ ...regForm, insuranceProvider: customInsuranceName });
                  } else {
                    setIsCustomInsurance(false);
                    setRegForm({ ...regForm, insuranceProvider: val });
                  }
                }}
                className="w-full p-2 border border-slate-300 rounded bg-white font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">Cash / Direct Self-Pay (No Insurance)</option>
                {availableInsurancePolicies.length > 0 && (
                  <optgroup label={`Accepted Policies at ${activeClinic.name}`}>
                    {availableInsurancePolicies.map(policy => (
                      <option key={policy.id} value={policy.name}>
                        {policy.name} {policy.code ? `[${policy.code}]` : ''} &bull; {policy.coveragePercentage ?? 100}% Cover
                      </option>
                    ))}
                  </optgroup>
                )}
                <option value="CUSTOM_INSURANCE">➕ Other / Unlisted Insurance Payer...</option>
              </select>

              {/* Custom Insurance Provider Input if selected */}
              {isCustomInsurance && (
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Enter unlisted insurance company name..."
                    value={customInsuranceName}
                    onChange={(e) => {
                      const name = e.target.value;
                      setCustomInsuranceName(name);
                      setRegForm({ ...regForm, insuranceProvider: name });
                    }}
                    className="w-full p-2 border border-emerald-400 rounded bg-emerald-50/50 text-xs text-slate-900"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Tip: Admin can permanently configure this insurance under Admin Dashboard &gt; Insurance Policies.
                  </span>
                </div>
              )}

              {/* Active Policy Highlight Card */}
              {(() => {
                const matched = availableInsurancePolicies.find(
                  p => p.name.toLowerCase() === regForm.insuranceProvider.toLowerCase()
                );
                if (!matched) return null;
                return (
                  <div className="mt-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center justify-between">
                    <div>
                      <span className="font-bold">{matched.name}</span>
                      <span className="ml-1 text-emerald-600">({matched.category || 'corporate'})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-white px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                        {matched.coveragePercentage ?? 100}% Cover
                      </span>
                      <span className="text-slate-600">
                        Copay: <strong>${matched.copayAmount ?? 0}</strong>
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Policy / Member ID</label>
              <input
                type="text"
                value={regForm.insurancePolicyNumber}
                onChange={(e) => setRegForm({ ...regForm, insurancePolicyNumber: e.target.value })}
                placeholder="e.g. POL-8921-X"
                className="w-full p-2 border border-slate-300 rounded bg-white"
              />
            </div>

          </div>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-900 mb-2">Emergency Contact Person</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Contact Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mary Gomez"
                  value={regForm.emergencyName}
                  onChange={(e) => setRegForm({ ...regForm, emergencyName: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Relationship</label>
                <input
                  type="text"
                  placeholder="e.g. Spouse, Parent"
                  value={regForm.emergencyRel}
                  onChange={(e) => setRegForm({ ...regForm, emergencyRel: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Contact Phone (Optional)</label>
                <input
                  type="tel"
                  placeholder="Emergency phone (optional)"
                  value={regForm.emergencyPhone}
                  onChange={(e) => setRegForm({ ...regForm, emergencyPhone: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              Register Patient & Generate {regForm.patientType} Number
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Master Patient Index */}
      {activeTab === 'all_patients' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
          {/* Master Patient Index Revisit & Patient Selection Action Card */}
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-slate-50 border-2 border-purple-300 p-4 rounded-xl space-y-3 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-purple-700 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-purple-950 flex flex-wrap items-center gap-2">
                    <span>Clinic Patient Revisit Registration</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-200 text-purple-900">
                      Step 1: Select Patient Name &rarr; Step 2: Click &ldquo;Register as Revisit&rdquo;
                    </span>
                  </div>
                  <div className="text-xs text-purple-900 mt-1">
                    Click on any <strong>patient&apos;s name</strong> in the Clinic Patient list below (or choose from the quick selector) to select them, then click the <strong className="text-purple-950 bg-purple-200/90 px-1.5 py-0.5 rounded font-extrabold">Register as Revisit</strong> button.
                  </div>
                </div>
              </div>

              {/* Selected Patient & Prominent "Register as Revisit" Action Button */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0 bg-white/90 p-2.5 rounded-xl border border-purple-200 shadow-2xs">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-purple-700 shrink-0" />
                  <select
                    value={selectedPatientForRevisitId || ''}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      setSelectedPatientForRevisitId(val);
                      setRevisitSelectionPrompt(null);
                    }}
                    className="px-2.5 py-2 border border-purple-300 rounded-lg bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[220px] cursor-pointer"
                  >
                    <option value="">-- Select Patient Name ({filteredPatients.length}) --</option>
                    {filteredPatients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} ({p.mrn} • {p.patientType || 'OPD'})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedPatientForRevisit) {
                      setRevisitSelectionPrompt(null);
                      setRevisitPatient(selectedPatientForRevisit);
                    } else {
                      setRevisitSelectionPrompt('Please select a patient\'s name from the Clinic Patient list below (or from the dropdown selector) first.');
                    }
                  }}
                  className={`px-4 py-2 rounded-lg font-extrabold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-xs ${
                    selectedPatientForRevisit
                      ? 'bg-purple-700 hover:bg-purple-800 text-white ring-2 ring-purple-400/50'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>
                    {selectedPatientForRevisit
                      ? `Register as Revisit: ${selectedPatientForRevisit.firstName} ${selectedPatientForRevisit.lastName}`
                      : 'Register as Revisit'}
                  </span>
                </button>
              </div>
            </div>

            {/* Prompt if user clicks Register as Revisit without selecting a patient */}
            {revisitSelectionPrompt && (
              <div className="bg-amber-50 border border-amber-300 text-amber-900 px-3.5 py-2.5 rounded-lg flex items-center justify-between gap-2 text-xs font-semibold">
                <span>{revisitSelectionPrompt}</span>
                <button
                  type="button"
                  onClick={() => setRevisitSelectionPrompt(null)}
                  className="text-amber-700 hover:text-amber-950 font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>
            )}
          </div>

          {/* Clinic Patient Index Search & Sort Controls Toolbar */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[260px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by name, OPD/IPD number, department, ward, bed, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-7 py-2 border border-slate-300 rounded-lg bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* Sorting Filter Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-[11px] font-bold text-slate-600">Sort By:</span>
                  <select
                    value={patientIndexSortKey}
                    onChange={(e) => setPatientIndexSortKey(e.target.value as any)}
                    className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="date">Registration Date</option>
                    <option value="name">Patient Name (Alphabetical)</option>
                    <option value="mrn">OPD / IPD Number</option>
                    <option value="age">Age</option>
                    <option value="status">Status</option>
                  </select>
                </div>

                {/* Sort Order Direction Toggle Button */}
                <button
                  type="button"
                  onClick={() => setPatientIndexSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 rounded-lg font-bold text-xs cursor-pointer transition-colors shadow-2xs"
                  title={`Toggle order: current is ${patientIndexSortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                >
                  {patientIndexSortOrder === 'asc' ? (
                    <>
                      <ArrowUp className="w-3.5 h-3.5 text-purple-700" />
                      <span>{patientIndexSortKey === 'name' ? 'Alphabetical (A → Z)' : patientIndexSortKey === 'date' ? 'Oldest First' : 'Ascending'}</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-3.5 h-3.5 text-purple-700" />
                      <span>{patientIndexSortKey === 'name' ? 'Reverse (Z → A)' : patientIndexSortKey === 'date' ? 'Newest First' : 'Descending'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Filter Pills & Record Summary */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-[11px]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-slate-400" />
                  Filter:
                </span>
                <button
                  type="button"
                  onClick={() => setPatientIndexTypeFilter('all')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    patientIndexTypeFilter === 'all'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                  }`}
                >
                  All ({currentClinicPatients.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPatientIndexTypeFilter('OPD')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    patientIndexTypeFilter === 'OPD'
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200'
                  }`}
                >
                  OPD Only ({currentClinicPatients.filter(p => p.patientType === 'OPD' || !p.patientType).length})
                </button>
                <button
                  type="button"
                  onClick={() => setPatientIndexTypeFilter('IPD')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    patientIndexTypeFilter === 'IPD'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  IPD Inpatients ({currentClinicPatients.filter(p => p.patientType === 'IPD').length})
                </button>
                <button
                  type="button"
                  onClick={() => setPatientIndexTypeFilter('revisit')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                    patientIndexTypeFilter === 'revisit'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  Revisits ({currentClinicPatients.filter(p => Boolean(p.isRevisit)).length})
                </button>
              </div>

              <div className="text-slate-500 font-semibold">
                Showing{' '}
                <strong className="text-slate-900">
                  {indexPagination.totalItems === 0
                    ? '0'
                    : `${indexPagination.startIndex + 1}–${indexPagination.endIndex}`}
                </strong>{' '}
                of {filteredPatients.length} registered patients
                <span className="ml-1.5 text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200 font-bold">
                  {indexPagination.safePage === 0
                    ? 'Initial Display (Max 5)'
                    : `Group ${indexPagination.safePage + 1} of ${indexPagination.totalGroups} (10 per group)`}
                </span>
              </div>
            </div>

            {/* Read-Saving Pagination Prompt & Group Controls for Clinic Patient Index */}
            {indexPagination.totalItems > 0 && (
              <div className="pt-2.5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="text-[11px] text-slate-700 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>
                    {indexPagination.safePage === 0 ? (
                      <>
                        <strong>Read-Optimized Opening View:</strong> Showing initial{' '}
                        <strong>{indexPagination.visibleItems.length}</strong> patient(s) to reduce database reads.
                        {indexPagination.hasNext && (
                          <>
                            {' '}
                            Click <strong>Next</strong> to load the next group of{' '}
                            <strong>{indexPagination.nextGroupSize}</strong> patient(s) ({indexPagination.remainingCount} remaining).
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        Viewing <strong>Group {indexPagination.safePage + 1} of {indexPagination.totalGroups}</strong>{' '}
                        (Patients <strong>{indexPagination.startIndex + 1}–{indexPagination.endIndex}</strong> of{' '}
                        {indexPagination.totalItems} &bull; 10 per group).
                        {indexPagination.hasNext && (
                          <>
                            {' '}
                            Click <strong>Next</strong> to view the next group ({indexPagination.remainingCount} remaining).
                          </>
                        )}
                      </>
                    )}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={!indexPagination.hasPrev}
                    onClick={() => handleSelectIndexGroup(indexPagination.safePage - 1)}
                    className="px-2.5 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  {indexPagination.groups.map(grp => (
                    <button
                      key={grp.pageIndex}
                      type="button"
                      onClick={() => handleSelectIndexGroup(grp.pageIndex)}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                        indexPagination.safePage === grp.pageIndex
                          ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                          : 'bg-white hover:bg-purple-50 text-slate-700 border-slate-300'
                      }`}
                      title={grp.label}
                    >
                      {grp.pageIndex === 0 ? `Initial (${grp.rangeLabel})` : `Grp ${grp.pageIndex + 1} (${grp.rangeLabel})`}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={!indexPagination.hasNext}
                    onClick={() => handleSelectIndexGroup(indexPagination.safePage + 1)}
                    className="px-3 py-1 rounded-md bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-2xs transition-colors"
                  >
                    <span>
                      {indexPagination.hasNext
                        ? `Next (${indexPagination.nextGroupSize} Patients)`
                        : 'Next'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-2xs">
            <table className="w-full text-left divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 font-semibold select-none">
                <tr>
                  <th 
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleIndexHeaderSort('name')}
                    title="Sort by Patient Name"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Select &amp; Patient Name</span>
                      {patientIndexSortKey === 'name' ? (
                        patientIndexSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-700" /> : <ArrowDown className="w-3 h-3 text-purple-700" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                  <th className="py-2.5 px-3">Revisit Action</th>
                  <th 
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleIndexHeaderSort('mrn')}
                    title="Sort by OPD / IPD Number"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>OPD / IPD Number</span>
                      {patientIndexSortKey === 'mrn' ? (
                        patientIndexSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-700" /> : <ArrowDown className="w-3 h-3 text-purple-700" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Location / Station</th>
                  <th 
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleIndexHeaderSort('age')}
                    title="Sort by Age"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Age / Category</span>
                      {patientIndexSortKey === 'age' ? (
                        patientIndexSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-700" /> : <ArrowDown className="w-3 h-3 text-purple-700" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleIndexHeaderSort('date')}
                    title="Sort by Registration Date"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Date Registered</span>
                      {patientIndexSortKey === 'date' ? (
                        patientIndexSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-700" /> : <ArrowDown className="w-3 h-3 text-purple-700" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                  <th className="py-2.5 px-3">Doctor</th>
                  <th className="py-2.5 px-3">Insurance</th>
                  <th 
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleIndexHeaderSort('status')}
                    title="Sort by Status"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      {patientIndexSortKey === 'status' ? (
                        patientIndexSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-purple-700" /> : <ArrowDown className="w-3 h-3 text-purple-700" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {indexPagination.visibleItems.map(pat => {
                  const cat = pat.ageCategory || getCategoryFromAge(pat.age);
                  const badgeClass = getCategoryBadgeClass(cat, pat.age);
                  const isIPD = pat.patientType === 'IPD';
                  const isSelected = selectedPatientForRevisitId === pat.id;
                  return (
                    <tr
                      key={pat.id}
                      onClick={() => toggleSelectPatientForRevisit(pat.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-purple-50/90 hover:bg-purple-100/70'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 flex flex-wrap items-center gap-2">
                          <input
                            type="radio"
                            checked={isSelected}
                            readOnly
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectPatientForRevisit(pat.id);
                            }}
                            title={isSelected ? 'Click to de-select patient' : 'Click to select patient'}
                            className="w-4 h-4 accent-purple-700 cursor-pointer shrink-0"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectPatientForRevisit(pat.id);
                            }}
                            className={`text-left font-bold hover:underline cursor-pointer ${
                              isSelected ? 'text-purple-900' : 'text-slate-900 hover:text-purple-700'
                            }`}
                            title={isSelected ? "Click patient's name to de-select" : "Click patient's name to select for Revisit"}
                          >
                            {pat.firstName} {pat.lastName}
                          </button>
                          {isSelected && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-purple-700 text-white">
                              Selected
                            </span>
                          )}
                          {pat.isRevisit && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-0.5">
                              <RotateCcw className="w-2.5 h-2.5" />
                              Revisit ({pat.visits?.length || (pat.revisitCount ? pat.revisitCount + 1 : 2)})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPatientForRevisitId(pat.id);
                            setRevisitPatient(pat);
                          }}
                          className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs ${
                            isSelected
                              ? 'bg-purple-700 hover:bg-purple-800 text-white ring-2 ring-purple-300'
                              : 'bg-purple-50 hover:bg-purple-700 text-purple-800 hover:text-white border border-purple-300'
                          }`}
                          title="Register this patient as a Revisit"
                        >
                          <RotateCcw className="w-3 h-3 shrink-0" />
                          <span>Register as Revisit</span>
                        </button>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 font-semibold">
                        <div className="text-xs font-bold text-slate-900">{pat.mrn}</div>
                        {pat.initialMrn && pat.initialMrn !== pat.mrn && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            Initial: {pat.initialMrn}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                          isIPD ? 'bg-indigo-50 text-indigo-800 border-indigo-300' : 'bg-sky-50 text-sky-800 border-sky-300'
                        }`}>
                          {pat.patientType || 'OPD'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-slate-800 font-semibold flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{pat.department || 'General OPD'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {isIPD ? `${pat.ward || 'Ward'} &bull; ${pat.bedNumber || 'Bed'}` : (pat.doctorRoom || 'Consultation Office')}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}>
                          {cat}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">{formatPatientAge(pat, 'short')} &bull; {pat.gender}</div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 font-medium">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-purple-600 shrink-0" />
                          <span>{pat.registeredAt || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">{pat.assignedDoctorName || 'None'}</td>
                      <td className="py-2.5 px-3 text-slate-700">{pat.insuranceProvider || 'Self Pay'}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          pat.currentStatus === 'deceased'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300 font-extrabold'
                            : pat.currentStatus === 'discharged'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300 font-semibold'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {pat.currentStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setRevisitPatient(pat)}
                            className="p-1 px-2.5 text-white bg-purple-700 hover:bg-purple-800 rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
                            title="Register returning patient for a Revisit & assign new OPD/IPD number"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Register as Revisit
                          </button>
                          <button
                            type="button"
                            onClick={() => setMovementPatient(pat)}
                            className="p-1 px-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                            title="View Timestamped Travel Trail & Location Transfers"
                          >
                            <History className="w-3 h-3" />
                            Trail
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPatient(pat)}
                            className="p-1 px-2 text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                            title="Edit Patient Details (Level 2 Clearance required)"
                          >
                            <Edit3 className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setAnthropometryPatient(pat)}
                            className="p-1 px-2 text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                            title="Edit Vitals / Anthropometry"
                          >
                            <Activity className="w-3 h-3" />
                            Vitals
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredPatients.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-500">
                      <div className="space-y-2">
                        <Search className="w-8 h-8 text-slate-300 mx-auto" />
                        <div className="font-semibold text-slate-700">No registered patients match your search or filter criteria.</div>
                        {(searchQuery || patientIndexTypeFilter !== 'all') && (
                          <button
                            onClick={() => {
                              setSearchQuery('');
                              setPatientIndexTypeFilter('all');
                            }}
                            className="text-purple-600 hover:text-purple-800 font-bold underline cursor-pointer text-xs"
                          >
                            Reset patient search and filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Next/Previous Group Prompt for Clinic Patient Index */}
          {indexPagination.totalGroups > 1 && (
            <div className="bg-slate-50 rounded-xl border border-purple-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="text-slate-700">
                <span className="font-bold text-purple-950">
                  {indexPagination.safePage === 0
                    ? `Initial 5 Patients Displayed (1–${indexPagination.endIndex} of ${indexPagination.totalItems})`
                    : `Group ${indexPagination.safePage + 1} of ${indexPagination.totalGroups} Displayed (${indexPagination.startIndex + 1}–${indexPagination.endIndex} of ${indexPagination.totalItems})`}
                </span>
                <span className="text-slate-500 ml-2">
                  {indexPagination.hasNext
                    ? `Click Next to view the next group of ${indexPagination.nextGroupSize} patient(s).`
                    : 'You have reached the end of the patient index list.'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {indexPagination.safePage > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSelectIndexGroup(0)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer"
                  >
                    Back to Initial 5
                  </button>
                )}
                <button
                  type="button"
                  disabled={!indexPagination.hasPrev}
                  onClick={() => handleSelectIndexGroup(indexPagination.safePage - 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous Group</span>
                </button>
                <button
                  type="button"
                  disabled={!indexPagination.hasNext}
                  onClick={() => handleSelectIndexGroup(indexPagination.safePage + 1)}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>
                    {indexPagination.hasNext
                      ? `Next Group (${indexPagination.nextGroupSize} Patients)`
                      : 'All Groups Viewed'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Register Revisit Modal */}
      {revisitPatient && (
        <RegisterRevisitModal
          isOpen={!!revisitPatient}
          onClose={() => setRevisitPatient(null)}
          patient={revisitPatient}
        />
      )}

      {/* Movement & Travel Trail Modal */}
      {movementPatient && (
        <PatientMovementHistoryModal
          isOpen={!!movementPatient}
          onClose={() => setMovementPatient(null)}
          patient={movementPatient}
        />
      )}

      {/* Locations & Wards Management Modal */}
      <ManageLocationsModal
        isOpen={manageLocationsOpen}
        onClose={() => setManageLocationsOpen(false)}
      />

      {/* Edit Patient Demographics Modal (Gated to Level 2) */}
      {editingPatient && (
        <EditPatientModal
          isOpen={!!editingPatient}
          onClose={() => setEditingPatient(null)}
          patient={editingPatient}
        />
      )}

      {/* Edit Anthropometry Modal */}
      {anthropometryPatient && (
        <EditAnthropometryModal
          isOpen={!!anthropometryPatient}
          onClose={() => setAnthropometryPatient(null)}
          patient={anthropometryPatient}
        />
      )}

    </div>
  );
};
