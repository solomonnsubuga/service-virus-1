import React, { useState, useMemo } from 'react';
import { useClinic } from '../../../context/ClinicContext';
import { Patient, DischargeSummary, Prescription } from '../../../types';
import { formatPatientAge, getAgeInYears } from '../../../utils/ageUtils';
import {
  Search,
  FileSpreadsheet,
  Calendar,
  Clock,
  User,
  Stethoscope,
  Pill,
  Printer,
  Edit3,
  FileText,
  BedDouble,
  Activity,
  CheckCircle2,
  Clock3,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  FolderOpen,
  Eye,
  History,
  Building2,
  DoorOpen,
  Tag,
  X
} from 'lucide-react';
import { ViewDischargeFileModal } from '../../common/ViewDischargeFileModal';

interface DischargedPatientsSearchCardProps {
  onEditDischargeSummary: (patient: Patient) => void;
  onPrintDischargeSummary: (dischargeSummary: DischargeSummary) => void;
  onOpenCaseFile?: (patient: Patient) => void;
}

export const DischargedPatientsSearchCard: React.FC<DischargedPatientsSearchCardProps> = ({
  onEditDischargeSummary,
  onPrintDischargeSummary,
  onOpenCaseFile
}) => {
  const {
    currentClinicPatients,
    currentClinicDepartments,
    currentClinicWards,
    currentClinicDischargeSummaries,
    currentClinicPrescriptions
  } = useClinic();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedWard, setSelectedWard] = useState<string>('all');
  const [selectedBed, setSelectedBed] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'mrn' | 'age' | 'los'>('recent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewingDischargeSummary, setViewingDischargeSummary] = useState<DischargeSummary | null>(null);

  // Find all discharged patients in current clinic
  // Either marked as 'discharged' or having a saved DischargeSummary
  const dischargedPatientsList = useMemo(() => {
    const list: Array<{
      patient: Patient;
      summary?: DischargeSummary;
      prescription?: Prescription;
      lengthOfStayDays: number;
      dischargeTimestamp: number;
    }> = [];

    // Map by patient ID to prevent duplicates
    const processedPatientIds = new Set<string>();

    currentClinicPatients.forEach(patient => {
      const summary = currentClinicDischargeSummaries.find(ds => ds.patientId === patient.id);
      const isDischarged = patient.currentStatus === 'discharged' || !!summary;

      if (isDischarged && !processedPatientIds.has(patient.id)) {
        processedPatientIds.add(patient.id);

        // Find linked prescription if any
        const rx = currentClinicPrescriptions.find(p => 
          p.dischargeSummaryId === summary?.id || (p.patientId === patient.id && p.isDischargePrescription)
        );

        // Calculate length of stay
        const admitTime = new Date(patient.admissionDate || patient.registeredAt || new Date().toISOString()).getTime();
        const dischargeTime = summary
          ? new Date(summary.dischargeDate).getTime()
          : patient.dischargeDate
          ? new Date(patient.dischargeDate).getTime()
          : Date.now();
        
        const diffMs = Math.max(0, dischargeTime - admitTime);
        const lengthOfStayDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

        list.push({
          patient,
          summary,
          prescription: rx,
          lengthOfStayDays,
          dischargeTimestamp: dischargeTime
        });
      }
    });

    return list;
  }, [currentClinicPatients, currentClinicDischargeSummaries, currentClinicPrescriptions]);

  // Unique departments in discharged list / clinic
  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    if (currentClinicDepartments && Array.isArray(currentClinicDepartments)) {
      currentClinicDepartments.forEach(d => { if (d.name) set.add(d.name); });
    }
    dischargedPatientsList.forEach(item => {
      if (item.patient.department) set.add(item.patient.department);
    });
    return Array.from(set).sort();
  }, [currentClinicDepartments, dischargedPatientsList]);

  // Unique rooms
  const availableRooms = useMemo(() => {
    const set = new Set<string>();
    if (selectedDepartment !== 'all') {
      const targetDept = currentClinicDepartments?.find(d => d.name === selectedDepartment);
      if (targetDept?.rooms) targetDept.rooms.forEach(r => set.add(r));
      dischargedPatientsList
        .filter(item => (item.patient.department || 'Inpatient Ward') === selectedDepartment)
        .forEach(item => { if (item.patient.doctorRoom) set.add(item.patient.doctorRoom); });
    } else {
      if (currentClinicDepartments && Array.isArray(currentClinicDepartments)) {
        currentClinicDepartments.forEach(d => { if (d.rooms) d.rooms.forEach(r => set.add(r)); });
      }
      dischargedPatientsList.forEach(item => {
        if (item.patient.doctorRoom) set.add(item.patient.doctorRoom);
      });
    }
    return Array.from(set).sort();
  }, [currentClinicDepartments, dischargedPatientsList, selectedDepartment]);

  // Unique wards in discharged list / clinic
  const availableWards = useMemo(() => {
    const set = new Set<string>();
    if (currentClinicWards && Array.isArray(currentClinicWards)) {
      currentClinicWards.forEach(w => { if (w.name) set.add(w.name); });
    }
    dischargedPatientsList.forEach(item => {
      if (item.summary?.ward) set.add(item.summary.ward);
      else if (item.patient.ward) set.add(item.patient.ward);
    });
    return Array.from(set).sort();
  }, [currentClinicWards, dischargedPatientsList]);

  // Unique beds in discharged list
  const availableBeds = useMemo(() => {
    const set = new Set<string>();
    if (selectedWard !== 'all') {
      const targetWard = currentClinicWards?.find(w => w.name === selectedWard);
      if (targetWard?.beds) targetWard.beds.forEach(b => set.add(b));
      dischargedPatientsList
        .filter(item => (item.summary?.ward || item.patient.ward) === selectedWard)
        .forEach(item => {
          if (item.summary?.bedNumber) set.add(item.summary.bedNumber);
          else if (item.patient.bedNumber) set.add(item.patient.bedNumber);
        });
    } else {
      if (currentClinicWards && Array.isArray(currentClinicWards)) {
        currentClinicWards.forEach(w => { if (w.beds) w.beds.forEach(b => set.add(b)); });
      }
      dischargedPatientsList.forEach(item => {
        if (item.summary?.bedNumber) set.add(item.summary.bedNumber);
        else if (item.patient.bedNumber) set.add(item.patient.bedNumber);
      });
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [currentClinicWards, dischargedPatientsList, selectedWard]);

  // Filter and sort
  const filteredList = useMemo(() => {
    let result = [...dischargedPatientsList];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item => {
        const name = `${item.patient.firstName} ${item.patient.lastName}`.toLowerCase();
        const mrn = (item.patient.mrn || '').toLowerCase();
        const doc = (item.summary?.dischargingDoctorName || '').toLowerCase();
        const dx = (item.summary?.finalDiagnosis || '').toLowerCase();
        const complaint = (item.summary?.firstChiefComplaint || '').toLowerCase();
        const ward = (item.summary?.ward || item.patient.ward || '').toLowerCase();
        const bed = (item.summary?.bedNumber || item.patient.bedNumber || '').toLowerCase();
        const meds = (item.summary?.dischargeMedications || [])
          .map(m => m.medicationName.toLowerCase())
          .join(' ');

        return (
          name.includes(q) ||
          mrn.includes(q) ||
          doc.includes(q) ||
          dx.includes(q) ||
          complaint.includes(q) ||
          ward.includes(q) ||
          bed.includes(q) ||
          meds.includes(q)
        );
      });
    }

    // Condition filter
    if (selectedCondition !== 'all') {
      result = result.filter(item => item.summary?.dischargeCondition === selectedCondition);
    }

    // Department filter
    if (selectedDepartment !== 'all') {
      result = result.filter(item => {
        const pDept = item.patient.department || 'Inpatient Ward';
        return pDept.toLowerCase() === selectedDepartment.toLowerCase() || item.patient.department === selectedDepartment;
      });
    }

    // Room filter
    if (selectedRoom !== 'all') {
      result = result.filter(item => {
        const pRoom = item.patient.doctorRoom || (item.summary?.ward || item.patient.ward || 'Consultation Room 1');
        return pRoom.toLowerCase() === selectedRoom.toLowerCase() || item.patient.doctorRoom === selectedRoom;
      });
    }

    // Ward filter
    if (selectedWard !== 'all') {
      result = result.filter(
        item => (item.summary?.ward || item.patient.ward) === selectedWard
      );
    }

    // Bed filter
    if (selectedBed !== 'all') {
      result = result.filter(
        item => (item.summary?.bedNumber || item.patient.bedNumber) === selectedBed
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'recent') {
        comparison = a.dischargeTimestamp - b.dischargeTimestamp;
      } else if (sortBy === 'name') {
        comparison = a.patient.lastName.localeCompare(b.patient.lastName);
      } else if (sortBy === 'mrn') {
        comparison = (a.patient.mrn || '').localeCompare(b.patient.mrn || '', undefined, { numeric: true });
      } else if (sortBy === 'age') {
        comparison = getAgeInYears(a.patient) - getAgeInYears(b.patient);
      } else if (sortBy === 'los') {
        comparison = a.lengthOfStayDays - b.lengthOfStayDays;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [
    dischargedPatientsList,
    searchQuery,
    selectedCondition,
    selectedDepartment,
    selectedRoom,
    selectedWard,
    selectedBed,
    sortBy,
    sortOrder
  ]);

  // Aggregated Stats
  const stats = useMemo(() => {
    const total = dischargedPatientsList.length;
    if (total === 0) return { total: 0, avgLos: 0, todayCount: 0, withMedsCount: 0 };

    const totalLos = dischargedPatientsList.reduce((acc, curr) => acc + curr.lengthOfStayDays, 0);
    const avgLos = Math.round((totalLos / total) * 10) / 10;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayCount = dischargedPatientsList.filter(
      item => item.dischargeTimestamp >= startOfToday.getTime()
    ).length;

    const withMedsCount = dischargedPatientsList.filter(
      item => item.summary && item.summary.dischargeMedications && item.summary.dischargeMedications.length > 0
    ).length;

    return { total, avgLos, todayCount, withMedsCount };
  }, [dischargedPatientsList]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
      
      {/* Header with Title & Stats Overview */}
      <div className="p-4 sm:p-5 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Search className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">
              Discharged IPD Patients Search & Archive
            </h3>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Search historical inpatient discharge summaries, view/edit discharge management forms, and track take-home pharmacy dispense status
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="flex items-center gap-3 text-xs shrink-0">
          <div className="px-3 py-1.5 bg-white/10 rounded-lg border border-white/10 text-center">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Discharged</div>
            <div className="font-bold text-white text-sm">{stats.total}</div>
          </div>
          <div className="px-3 py-1.5 bg-white/10 rounded-lg border border-white/10 text-center">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Avg Stay</div>
            <div className="font-bold text-indigo-300 text-sm">{stats.avgLos} days</div>
          </div>
          <div className="px-3 py-1.5 bg-white/10 rounded-lg border border-white/10 text-center">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Today</div>
            <div className="font-bold text-emerald-400 text-sm">{stats.todayCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="px-4 sm:px-5 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Main Search Input */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name, MRN, discharging doctor, diagnosis, ward, bed, or medication..."
              className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Condition Dropdown Filter */}
          <div className="w-full md:w-44">
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="all">All Conditions</option>
              <option value="Improved">Improved</option>
              <option value="Recovered / Cured">Recovered / Cured</option>
              <option value="Stable">Stable</option>
              <option value="Discharged on Request (LAMA)">Discharged on Request (LAMA)</option>
              <option value="Referred / Transferred">Referred / Transferred</option>
              <option value="Deceased">Deceased</option>
            </select>
          </div>
        </div>

        {/* Location Filters & Sorting Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Department Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-600">Dept:</span>
              <select
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setSelectedRoom('all');
                }}
                className="bg-transparent font-medium text-slate-800 text-xs focus:outline-none cursor-pointer max-w-[130px] truncate"
              >
                <option value="all">All Departments</option>
                {availableDepartments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Room Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <DoorOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-600">Room:</span>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="bg-transparent font-medium text-slate-800 text-xs focus:outline-none cursor-pointer max-w-[120px] truncate"
              >
                <option value="all">All Rooms</option>
                {availableRooms.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Ward Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <BedDouble className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-600">Ward:</span>
              <select
                value={selectedWard}
                onChange={(e) => {
                  setSelectedWard(e.target.value);
                  setSelectedBed('all');
                }}
                className="bg-transparent font-medium text-slate-800 text-xs focus:outline-none cursor-pointer max-w-[130px] truncate"
              >
                <option value="all">All Wards</option>
                {availableWards.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>

            {/* Bed Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <Tag className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-600">Bed:</span>
              <select
                value={selectedBed}
                onChange={(e) => setSelectedBed(e.target.value)}
                className="bg-transparent font-medium text-slate-800 text-xs focus:outline-none cursor-pointer max-w-[110px] truncate"
              >
                <option value="all">All Beds</option>
                {availableBeds.map(b => (
                  <option key={b} value={b}>Bed {b}</option>
                ))}
              </select>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-600">Sort:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-transparent font-medium text-slate-800 text-xs focus:outline-none cursor-pointer"
              >
                <option value="recent">Discharge Date</option>
                <option value="name">Patient Name</option>
                <option value="mrn">MRN / IPD #</option>
                <option value="age">Age</option>
                <option value="los">Length of Stay</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-0.5 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                title={sortOrder === 'asc' ? 'Ascending (Click for Descending)' : 'Descending (Click for Ascending)'}
              >
                {sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Clear All Filters Button */}
            {(searchQuery || selectedCondition !== 'all' || selectedDepartment !== 'all' || selectedRoom !== 'all' || selectedWard !== 'all' || selectedBed !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCondition('all');
                  setSelectedDepartment('all');
                  setSelectedRoom('all');
                  setSelectedWard('all');
                  setSelectedBed('all');
                }}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Reset all search and location filters"
              >
                <X className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            )}
          </div>

          {/* Filter results count */}
          <div className="text-xs text-slate-500 font-semibold">
            Showing <strong className="text-slate-800">{filteredList.length}</strong> of{' '}
            <strong>{dischargedPatientsList.length}</strong> discharged records
          </div>
        </div>
      </div>

      {/* Discharged Patients Results Cards */}
      <div className="p-4 sm:p-5 pt-0 space-y-3">
        {filteredList.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
            <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-xs font-bold text-slate-700">No Discharged Patients Found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `No discharged patients matching "${searchQuery}". Try modifying your search query or filters.`
                : 'No patients have been discharged from this clinic yet. Click "Discharge Patient" on any admitted IPD patient to generate a discharge summary.'}
            </p>
          </div>
        ) : (
          filteredList.map(({ patient, summary, prescription, lengthOfStayDays, dischargeTimestamp }) => {
            const hasSummary = Boolean(summary);
            const condition = summary?.dischargeCondition || 'Discharged';
            const rxStatus = prescription?.overallStatus;

            return (
              <div
                key={patient.id}
                className="p-4 bg-white hover:bg-slate-50/70 rounded-xl border border-slate-200 shadow-2xs transition-all space-y-3"
              >
                {/* Top Row: Patient Info, Discharge Badges, & Dates */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0">
                      {patient.firstName[0]}{patient.lastName[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {patient.firstName} {patient.lastName}
                        </span>
                        <span className="text-indigo-700 font-mono text-xs font-semibold">
                          ({patient.mrn})
                        </span>
                        <span className="text-xs text-slate-500">
                          &bull; {patient.gender}, {formatPatientAge(patient)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center gap-1 text-purple-800 font-semibold">
                          <BedDouble className="w-3.5 h-3.5" />
                          {summary?.ward || patient.ward || 'General Ward'}
                          {patient.bedNumber ? ` - Bed ${patient.bedNumber}` : ''}
                        </span>
                        <span className="text-slate-300">&bull;</span>
                        <span>
                          Admitted: {new Date(patient.admissionDate || patient.registeredDate || patient.registeredAt || new Date().toISOString()).toLocaleDateString()}
                        </span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="font-semibold text-slate-800">
                          Discharged: {new Date(dischargeTimestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="px-2 py-0.2 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold border border-slate-200">
                          Stay: {lengthOfStayDays} day{lengthOfStayDays > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      condition.includes('Improved') || condition.includes('Recovered')
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : condition.includes('Stable')
                        ? 'bg-sky-50 text-sky-800 border-sky-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      Condition: {condition}
                    </span>

                    {/* Pharmacy Take-Home Rx Badge */}
                    {prescription ? (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                        rxStatus === 'completed'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : rxStatus === 'partially_dispensed'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                      }`}>
                        <Pill className="w-3 h-3" />
                        Take-Home Rx: {rxStatus === 'completed' ? 'Dispensed' : 'Pharmacy Pending'}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        No Take-Home Rx
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle Content: Clinical Summary Preview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  
                  {/* Diagnosis & Complaint */}
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Diagnosis & First Chief Complaint
                    </div>
                    <div className="font-bold text-slate-900">
                      {summary?.finalDiagnosis || patient.initialComplaint || 'Clinical Inpatient Workup'}
                    </div>
                    {summary?.firstChiefComplaint && (
                      <div className="text-slate-600 text-[11px] line-clamp-2">
                        <span className="font-medium text-slate-700">Complaint: </span>
                        {summary.firstChiefComplaint}
                      </div>
                    )}
                  </div>

                  {/* Investigations Done */}
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Tests Done Summary
                    </div>
                    {summary && summary.testsDoneSummary.length > 0 ? (
                      <div className="text-slate-700 text-[11px] space-y-0.5">
                        <div className="font-semibold text-indigo-900">
                          {summary.testsDoneSummary.length} diagnostic test(s) completed
                        </div>
                        <div className="line-clamp-2 text-slate-600 font-mono text-[10px]">
                          {summary.testsDoneSummary.slice(0, 2).join('; ')}
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-400 text-[11px]">
                        Bedside vitals & routine inpatient monitoring
                      </div>
                    )}
                  </div>

                  {/* Follow-Up & Attending Doctor */}
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Discharging Doctor & Follow-Up
                    </div>
                    <div className="font-semibold text-slate-900">
                      Dr. {summary?.dischargingDoctorName || patient.assignedDoctorName || 'Medical Officer'}
                    </div>
                    {summary?.followUpDate ? (
                      <div className="text-amber-800 font-medium text-[11px] flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-amber-600" />
                        Review: {new Date(summary.followUpDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    ) : (
                      <div className="text-slate-400 text-[11px]">Follow-up as required / PRN</div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Buttons Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="text-[11px] text-slate-500">
                    {summary?.takeHomePrescription ? (
                      <span className="font-semibold text-emerald-800 line-clamp-1 max-w-md truncate" title={summary.takeHomePrescription}>
                        Take-home Rx: {summary.takeHomePrescription.replace(/\n+/g, ' • ')}
                      </span>
                    ) : summary?.dischargeMedications && summary.dischargeMedications.length > 0 ? (
                      <span className="font-semibold text-emerald-800">
                        Take-home medications: {summary.dischargeMedications.map(m => m.medicationName).join(', ')}
                      </span>
                    ) : (
                      <span>No take-home medications</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    
                    {/* View Discharge File Button */}
                    {summary ? (
                      <button
                        type="button"
                        onClick={() => setViewingDischargeSummary(summary)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                        title="View complete formatted discharge dossier and revision timestamps"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Discharge File
                        {summary.changeHistory && summary.changeHistory.length > 0 && (
                          <span className="ml-1 px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px] font-bold">
                            {summary.changeHistory.length}
                          </span>
                        )}
                      </button>
                    ) : null}

                    {/* View / Edit Discharge Form Button */}
                    <button
                      type="button"
                      onClick={() => onEditDischargeSummary(patient)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      title="Edit or review the saved discharge summary form"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Discharge Form
                    </button>

                    {/* Print Summary Sheet Button */}
                    {summary && (
                      <button
                        type="button"
                        onClick={() => onPrintDischargeSummary(summary)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        title="Print official hospital discharge report"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-700" />
                        Print File
                      </button>
                    )}

                    {/* Digital Case File Button */}
                    {onOpenCaseFile && (
                      <button
                        type="button"
                        onClick={() => onOpenCaseFile(patient)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        title="View complete clinical case file"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                        Case File
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* View Discharge File Modal */}
      {viewingDischargeSummary && (
        <ViewDischargeFileModal
          isOpen={Boolean(viewingDischargeSummary)}
          onClose={() => setViewingDischargeSummary(null)}
          dischargeSummary={viewingDischargeSummary}
          onPrint={(ds) => {
            onPrintDischargeSummary(ds);
          }}
          onEdit={(ds) => {
            const pt = currentClinicPatients.find(p => p.id === ds.patientId);
            if (pt) {
              setViewingDischargeSummary(null);
              onEditDischargeSummary(pt);
            }
          }}
        />
      )}

    </div>
  );
};
