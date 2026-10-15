import React, { useState, useMemo, useRef } from 'react';
import { Patient, ClinicalEncounter } from '../../../types';
import { formatPatientAge } from '../../../utils/ageUtils';
import { useClinic } from '../../../context/ClinicContext';
import {
  FileText,
  Calendar,
  User,
  Stethoscope,
  Activity,
  CheckCircle2,
  Clock,
  Plus,
  Printer,
  Search,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  HeartPulse,
  Thermometer,
  Eye,
  ShieldAlert,
  Sparkles,
  FolderHeart,
  Layers,
  Building2,
  Bed,
  Check,
  X
} from 'lucide-react';

interface DigitalPatientCaseFileProps {
  patient: Patient;
  encounters: ClinicalEncounter[];
  onOpenPrintModal?: (type: 'case_file' | 'workup', data: any) => void;
}

export const DigitalPatientCaseFile: React.FC<DigitalPatientCaseFileProps> = ({
  patient,
  encounters,
  onOpenPrintModal
}) => {
  const { currentUser, activeClinic, saveEncounter } = useClinic();

  // Sorting: defaulted strictly to oldest_to_newest as requested by user
  const [sortOrder, setSortOrder] = useState<'oldest_to_newest' | 'newest_to_oldest'>('oldest_to_newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEncounterIds, setExpandedEncounterIds] = useState<Set<string>>(new Set());
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const noteRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Sort encounters chronologically: oldest to newest (or user toggle)
  const sortedEncounters = useMemo(() => {
    const list = [...encounters].sort((a, b) => {
      const timeA = new Date(a.visitDate || a.createdAt || 0).getTime();
      const timeB = new Date(b.visitDate || b.createdAt || 0).getTime();
      return sortOrder === 'oldest_to_newest' ? timeA - timeB : timeB - timeA;
    });
    return list;
  }, [encounters, sortOrder]);

  // Initial expanded state: all notes expanded by default for full dossier visibility
  React.useEffect(() => {
    setExpandedEncounterIds(new Set(encounters.map(e => e.id)));
  }, [encounters]);

  // Filtered encounters for search
  const filteredEncounters = useMemo(() => {
    if (!searchTerm.trim()) return sortedEncounters;
    const term = searchTerm.toLowerCase();
    return sortedEncounters.filter(enc =>
      enc.doctorName.toLowerCase().includes(term) ||
      enc.workingDiagnosis.toLowerCase().includes(term) ||
      (enc.differentialDiagnosis && enc.differentialDiagnosis.toLowerCase().includes(term)) ||
      enc.chiefComplaint.toLowerCase().includes(term) ||
      (enc.historyOfPresentIllness && enc.historyOfPresentIllness.toLowerCase().includes(term)) ||
      (enc.physicalExamNotes && enc.physicalExamNotes.toLowerCase().includes(term)) ||
      (enc.clinicalPlan && enc.clinicalPlan.toLowerCase().includes(term))
    );
  }, [sortedEncounters, searchTerm]);

  // Oldest vs. Newest comparisons for clinical case follow-up trajectory
  const oldestEncounter = useMemo(() => {
    if (encounters.length === 0) return null;
    return [...encounters].sort((a, b) => 
      new Date(a.visitDate || a.createdAt || 0).getTime() - new Date(b.visitDate || b.createdAt || 0).getTime()
    )[0];
  }, [encounters]);

  const latestEncounter = useMemo(() => {
    if (encounters.length === 0) return null;
    return [...encounters].sort((a, b) => 
      new Date(b.visitDate || b.createdAt || 0).getTime() - new Date(a.visitDate || a.createdAt || 0).getTime()
    )[0];
  }, [encounters]);

  // Unique list of attending physicians involved in this patient's case
  const attendingDoctors = useMemo(() => {
    const names = Array.from(new Set(encounters.map(e => e.doctorName).filter(Boolean)));
    return names;
  }, [encounters]);

  const toggleExpand = (id: string) => {
    setExpandedEncounterIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedEncounterIds(new Set(encounters.map(e => e.id)));
  };

  const collapseAll = () => {
    setExpandedEncounterIds(new Set());
  };

  const scrollToNote = (id: string) => {
    setHighlightedId(id);
    if (!expandedEncounterIds.has(id)) {
      setExpandedEncounterIds(prev => new Set(prev).add(id));
    }
    setTimeout(() => {
      noteRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    setTimeout(() => {
      setHighlightedId(null);
    }, 3000);
  };

  // State for recording a new Inpatient Clinical Encounter / Ward Round Note
  const [newEncounterForm, setNewEncounterForm] = useState({
    doctorName: currentUser.role === 'doctor' ? currentUser.name : 'Dr. Sarah Chen, Physician',
    visitDate: new Date().toISOString().split('T')[0],
    encounterType: 'Daily Ward Round Review',
    chiefComplaint: '',
    historyOfPresentIllness: '',
    vitals: {
      bloodPressure: patient.anthropometry?.bloodPressure || patient.vitals?.bloodPressure || '120/80',
      pulseRate: patient.anthropometry?.pulseRate || patient.vitals?.pulseRate || 76,
      temperature: patient.anthropometry?.temperature || patient.vitals?.temperature || 37.0,
      respiratoryRate: patient.anthropometry?.respiratoryRate || patient.vitals?.respiratoryRate || 18,
      spO2: patient.anthropometry?.spO2 || patient.vitals?.spO2 || 98,
      weightKg: patient.anthropometry?.weightKg || patient.vitals?.weightKg || 68,
      heightCm: patient.anthropometry?.heightCm || patient.vitals?.heightCm || 170,
      bloodGlucose: patient.anthropometry?.bloodGlucose || patient.vitals?.bloodGlucose || '',
      bmi: patient.anthropometry?.bmi || patient.vitals?.bmi || 23.5
    },
    physicalExamNotes: '',
    generalExam: 'Conscious, oriented in time/place/person, no acute respiratory distress.',
    systemicExam: 'Chest clear bilaterally, S1+S2 heard, abdomen soft non-tender.',
    workingDiagnosis: latestEncounter?.workingDiagnosis || 'Inpatient Clinical Review',
    differentialDiagnosis: '',
    clinicalPlan: 'Continue IV therapy as charted on Bedside MAR. Monitor vitals Q4H. Repeat CBC/electrolytes tomorrow morning.',
    followUpDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  });

  const handleCreateEncounter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEncounterForm.chiefComplaint.trim()) {
      alert('Please enter a chief complaint or subjective note for this inpatient round.');
      return;
    }
    if (!newEncounterForm.workingDiagnosis.trim()) {
      alert('Please enter a working clinical diagnosis.');
      return;
    }

    const created = saveEncounter({
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientMrn: patient.mrn,
      patientType: 'IPD',
      clinicId: activeClinic.id,
      doctorId: currentUser.id,
      doctorName: newEncounterForm.doctorName,
      visitDate: newEncounterForm.visitDate,
      chiefComplaint: `[${newEncounterForm.encounterType}] ${newEncounterForm.chiefComplaint}`,
      historyOfPresentIllness: newEncounterForm.historyOfPresentIllness,
      vitals: newEncounterForm.vitals,
      physicalExamNotes: newEncounterForm.physicalExamNotes,
      generalExam: newEncounterForm.generalExam,
      systemicExam: newEncounterForm.systemicExam,
      workingDiagnosis: newEncounterForm.workingDiagnosis,
      differentialDiagnosis: newEncounterForm.differentialDiagnosis,
      clinicalPlan: newEncounterForm.clinicalPlan,
      followUpDate: newEncounterForm.followUpDate,
      status: 'completed'
    });

    setIsRecordModalOpen(false);
    // Expand the newly created note and scroll to it
    setExpandedEncounterIds(prev => new Set(prev).add(created.id));
    setTimeout(() => {
      scrollToNote(created.id);
    }, 200);
  };

  return (
    <div className="space-y-6">
      {/* CASE FILE HEADER DOSSIER BANNER */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-5 shadow-lg border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono font-bold uppercase tracking-wider">
                <FolderHeart className="w-3.5 h-3.5 text-indigo-400" />
                Digital Patient Case File
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
                Inpatient Dossier #CF-{patient.mrn}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold">
                Active Ward Follow-up
              </span>
            </div>

            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>{patient.firstName} {patient.lastName}</span>
              <span className="text-sm font-normal text-slate-400 font-mono">({patient.mrn})</span>
            </h2>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                Ward: <strong className="text-white ml-0.5">{patient.ward || 'General Medical Ward'}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Bed className="w-3.5 h-3.5 text-indigo-400" />
                Bed: <strong className="text-white ml-0.5">{patient.bedNumber || 'Bed 01'}</strong>
              </span>
              <span>
                Age/Sex: <strong className="text-white">{formatPatientAge(patient)} &bull; {patient.gender}</strong>
              </span>
              <span>
                Blood Group: <strong className="text-white">{patient.bloodGroup || 'O+'}</strong>
              </span>
              <span>
                Admitted: <strong className="text-white">{patient.registeredAt || 'Active Stay'}</strong>
              </span>
            </div>

            {/* Allergies Warning */}
            {patient.allergies && patient.allergies.length > 0 && (
              <div className="pt-1 text-xs text-rose-300 flex items-center gap-1.5 font-medium">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>CRITICAL ALLERGIES:</span>
                <span className="bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800 font-bold">
                  {patient.allergies.join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Top Dossier Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            <button
              type="button"
              onClick={() => onOpenPrintModal?.('case_file', { patient, encounters: sortedEncounters })}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-white/15 shadow-sm"
              title="Print complete multi-encounter digital case file"
            >
              <Printer className="w-4 h-4 text-indigo-300" />
              <span>Print Complete Case File</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRecordModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Record Ward Round / Encounter</span>
            </button>
          </div>
        </div>

        {/* Case File Metadata Strip */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
            <span className="text-slate-400 block text-[10px] font-semibold uppercase">Total Encounters</span>
            <span className="text-white font-bold text-sm">
              {encounters.length} {encounters.length === 1 ? 'Clinical Note' : 'Clinical Notes'}
            </span>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
            <span className="text-slate-400 block text-[10px] font-semibold uppercase">Chronological Order</span>
            <span className="text-indigo-300 font-bold text-xs flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {sortOrder === 'oldest_to_newest' ? 'Oldest → Newest' : 'Newest → Oldest'}
            </span>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
            <span className="text-slate-400 block text-[10px] font-semibold uppercase">Attending Clinicians</span>
            <span className="text-white font-bold text-xs truncate block" title={attendingDoctors.join(', ') || 'Attending Physician'}>
              {attendingDoctors.length > 0 ? attendingDoctors.join(', ') : 'Doctor on Duty'}
            </span>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
            <span className="text-slate-400 block text-[10px] font-semibold uppercase">Current Working Diagnosis</span>
            <span className="text-emerald-400 font-bold text-xs truncate block" title={latestEncounter?.workingDiagnosis || 'Pending review'}>
              {latestEncounter?.workingDiagnosis || 'Pending Doctor Evaluation'}
            </span>
          </div>
        </div>
      </div>

      {/* CASE FOLLOW-UP & PROGRESSION TRAJECTORY PANEL (Shown when encounters exist) */}
      {encounters.length >= 2 && oldestEncounter && latestEncounter && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
              <h3 className="font-bold text-xs text-emerald-950 uppercase tracking-wide">
                Case Follow-up & Progression Trajectory (Admission &rarr; Current Round)
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
              Day-by-Day Interval Evolution
            </span>
          </div>

          {/* Vitals Evolution Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
            {/* Blood Pressure */}
            <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-semibold block">Blood Pressure</span>
              <div className="mt-1 flex items-baseline justify-between text-xs">
                <span className="text-slate-500 line-through text-[11px]">{oldestEncounter.vitals?.bloodPressure || '—'}</span>
                <span className="font-bold text-slate-900">{latestEncounter.vitals?.bloodPressure || '—'}</span>
              </div>
              <span className="text-[9px] text-emerald-700 font-semibold mt-0.5 block">mmHg</span>
            </div>

            {/* Pulse Rate */}
            <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-semibold block">Heart / Pulse Rate</span>
              <div className="mt-1 flex items-baseline justify-between text-xs">
                <span className="text-slate-500 line-through text-[11px]">{oldestEncounter.vitals?.pulseRate || '—'}</span>
                <span className="font-bold text-slate-900">{latestEncounter.vitals?.pulseRate || '—'}</span>
              </div>
              <span className="text-[9px] text-emerald-700 font-semibold mt-0.5 block">bpm</span>
            </div>

            {/* Temperature */}
            <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-semibold block">Body Temp</span>
              <div className="mt-1 flex items-baseline justify-between text-xs">
                <span className="text-slate-500 line-through text-[11px]">{oldestEncounter.vitals?.temperature || '—'}</span>
                <span className={`font-bold ${latestEncounter.vitals?.temperature > 37.5 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {latestEncounter.vitals?.temperature || '—'}
                </span>
              </div>
              <span className="text-[9px] text-emerald-700 font-semibold mt-0.5 block">&deg;C</span>
            </div>

            {/* SpO2 */}
            <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-semibold block">SpO2 (Room Air)</span>
              <div className="mt-1 flex items-baseline justify-between text-xs">
                <span className="text-slate-500 line-through text-[11px]">{oldestEncounter.vitals?.spO2 || '—'}</span>
                <span className="font-bold text-emerald-700">{latestEncounter.vitals?.spO2 || '—'}%</span>
              </div>
              <span className="text-[9px] text-emerald-700 font-semibold mt-0.5 block">oxygen saturation</span>
            </div>

            {/* Respiratory Rate */}
            <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-semibold block">Respiratory Rate</span>
              <div className="mt-1 flex items-baseline justify-between text-xs">
                <span className="text-slate-500 line-through text-[11px]">{oldestEncounter.vitals?.respiratoryRate || '—'}</span>
                <span className="font-bold text-slate-900">{latestEncounter.vitals?.respiratoryRate || '—'}</span>
              </div>
              <span className="text-[9px] text-emerald-700 font-semibold mt-0.5 block">breaths/min</span>
            </div>

            {/* Blood Glucose */}
            <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-semibold block">Blood Glucose</span>
              <div className="mt-1 flex items-baseline justify-between text-xs">
                <span className="text-slate-500 line-through text-[11px]">{oldestEncounter.vitals?.bloodGlucose || '—'}</span>
                <span className="font-bold text-slate-900">{latestEncounter.vitals?.bloodGlucose || '—'}</span>
              </div>
              <span className="text-[9px] text-emerald-700 font-semibold mt-0.5 block">glycemic status</span>
            </div>

            {/* Weight */}
            <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-semibold block">Weight</span>
              <div className="mt-1 flex items-baseline justify-between text-xs">
                <span className="text-slate-500 line-through text-[11px]">{oldestEncounter.vitals?.weightKg ? `${oldestEncounter.vitals.weightKg}k` : '—'}</span>
                <span className="font-bold text-slate-900">{latestEncounter.vitals?.weightKg ? `${latestEncounter.vitals.weightKg} kg` : '—'}</span>
              </div>
              <span className="text-[9px] text-emerald-700 font-semibold mt-0.5 block">body weight</span>
            </div>
          </div>

          {/* Diagnostic Evolution Banner */}
          <div className="bg-white/80 p-3 rounded-lg border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold">Initial Working Diagnosis:</span>
              <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                {oldestEncounter.workingDiagnosis}
              </span>
            </div>
            <div className="text-emerald-700 font-bold hidden sm:block">&rarr;</div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-800 font-semibold">Current Inpatient Diagnosis:</span>
              <span className="font-bold text-emerald-950 bg-emerald-100 px-2 py-0.5 rounded">
                {latestEncounter.workingDiagnosis}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CASE FILE TOOLBAR: SORT, SEARCH & QUICK JUMP INDEX */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search case notes by diagnosis, doctor, symptom, or plan..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controls: Sort Order & Expand / Collapse */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setSortOrder(prev => prev === 'oldest_to_newest' ? 'newest_to_oldest' : 'oldest_to_newest')}
              className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                sortOrder === 'oldest_to_newest'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                  : 'bg-slate-50 text-slate-700 border-slate-300'
              }`}
              title="Click to toggle chronological sorting"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>
                Order: {sortOrder === 'oldest_to_newest' ? 'Oldest → Newest (Standard Case File)' : 'Newest → Oldest'}
              </span>
            </button>

            <button
              type="button"
              onClick={expandAll}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Quick Jump Timeline Rail (Oldest to Newest) */}
        {sortedEncounters.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>Chronological Encounter Index (Click note to jump):</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
              {sortedEncounters.map((enc, idx) => {
                const isInitial = idx === 0 && sortOrder === 'oldest_to_newest';
                const isLatest = idx === sortedEncounters.length - 1 && sortOrder === 'oldest_to_newest';
                return (
                  <button
                    key={enc.id}
                    type="button"
                    onClick={() => scrollToNote(enc.id)}
                    className="shrink-0 px-2.5 py-1 rounded-md border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-indigo-700">#{idx + 1}</span>
                    <span className="text-slate-500">{enc.visitDate}</span>
                    <span className="font-medium truncate max-w-[120px]">{enc.workingDiagnosis}</span>
                    {isInitial && (
                      <span className="bg-sky-100 text-sky-800 text-[9px] px-1 rounded font-bold">Initial</span>
                    )}
                    {isLatest && (
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1 rounded font-bold">Latest</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* CHRONOLOGICAL CASE FILE ENCOUNTERS (Arranged Oldest to Newest) */}
      <div className="space-y-4">
        {filteredEncounters.length > 0 ? (
          filteredEncounters.map((encounter, index) => {
            const isExpanded = expandedEncounterIds.has(encounter.id);
            const isInitialAdmission = index === 0 && sortOrder === 'oldest_to_newest';
            const isHighlighted = highlightedId === encounter.id;

            return (
              <div
                key={encounter.id}
                ref={el => { noteRefs.current[encounter.id] = el; }}
                className={`bg-white rounded-xl border transition-all duration-300 shadow-xs overflow-hidden ${
                  isHighlighted
                    ? 'ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Note Header Bar */}
                <div
                  onClick={() => toggleExpand(encounter.id)}
                  className="p-4 bg-slate-50/80 hover:bg-slate-100/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-indigo-600 text-white font-bold text-xs shrink-0 shadow-xs">
                      <span className="text-[9px] font-normal leading-none uppercase">Note</span>
                      <span className="text-sm font-black leading-none mt-0.5">#{index + 1}</span>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">
                          {isInitialAdmission ? 'Initial Inpatient Workup & Admission' : 'Inpatient Ward Round & Follow-up'}
                        </h4>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-semibold text-[10px]">
                          Dr. {encounter.doctorName}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px] uppercase">
                          {encounter.status || 'Completed'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Visit Date: <strong className="text-slate-700">{encounter.visitDate}</strong>
                        </span>
                        <span>&bull;</span>
                        <span className="text-emerald-700 font-semibold">
                          Dx: {encounter.workingDiagnosis}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onOpenPrintModal?.('workup', encounter)}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-md border border-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      title="Print single encounter note"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>Print Note</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExpand(encounter.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200 transition-colors"
                      aria-label="Toggle details"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Note Body (Collapsible) */}
                {isExpanded && (
                  <div className="p-5 space-y-4 bg-white text-xs">
                    {/* Vitals Snapshot */}
                    {encounter.vitals && (
                      <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                          <span>Bedside Anthropometry & Vital Signs at Round</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center">
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <span className="text-[9px] text-slate-500 block">Blood Pressure</span>
                            <span className="font-bold text-slate-900 text-xs">{encounter.vitals.bloodPressure || '—'}</span>
                            <span className="text-[8px] text-slate-400 block">mmHg</span>
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <span className="text-[9px] text-slate-500 block">Pulse Rate</span>
                            <span className="font-bold text-slate-900 text-xs">{encounter.vitals.pulseRate || '—'}</span>
                            <span className="text-[8px] text-slate-400 block">bpm</span>
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <span className="text-[9px] text-slate-500 block">Temperature</span>
                            <span className={`font-bold text-xs ${encounter.vitals.temperature > 37.5 ? 'text-rose-600' : 'text-slate-900'}`}>
                              {encounter.vitals.temperature || '—'}
                            </span>
                            <span className="text-[8px] text-slate-400 block">&deg;C</span>
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <span className="text-[9px] text-slate-500 block">SpO2</span>
                            <span className="font-bold text-emerald-700 text-xs">{encounter.vitals.spO2 || '—'}%</span>
                            <span className="text-[8px] text-slate-400 block">room air</span>
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <span className="text-[9px] text-slate-500 block">Resp Rate</span>
                            <span className="font-bold text-slate-900 text-xs">{encounter.vitals.respiratoryRate || '—'}</span>
                            <span className="text-[8px] text-slate-400 block">/min</span>
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <span className="text-[9px] text-slate-500 block">Weight / BMI</span>
                            <span className="font-bold text-slate-900 text-xs">{encounter.vitals.weightKg ? `${encounter.vitals.weightKg}kg` : '—'}</span>
                            <span className="text-[8px] text-slate-400 block">{encounter.vitals.bmi ? `BMI ${encounter.vitals.bmi}` : ''}</span>
                          </div>
                          <div className="bg-white p-2 rounded border border-slate-200">
                            <span className="text-[9px] text-slate-500 block">Blood Glucose</span>
                            <span className="font-bold text-slate-900 text-xs">{encounter.vitals.bloodGlucose || '—'}</span>
                            <span className="text-[8px] text-slate-400 block">mg/dL</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Chief Complaint */}
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-1">
                      <div className="text-slate-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-indigo-600" />
                        <span>1. Chief Complaint & Subjective Symptoms</span>
                      </div>
                      <div className="font-medium text-slate-900 text-xs leading-relaxed whitespace-pre-wrap pl-1">
                        {encounter.chiefComplaint || 'None documented'}
                      </div>
                    </div>

                    {/* History of Presenting Illness (HPI) & Interval Course */}
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-1">
                      <div className="text-slate-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <span>2. History of Presenting Illness (HPI) & Ward Interval Course</span>
                      </div>
                      <div className="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap pl-1">
                        {encounter.historyOfPresentIllness || 'No extended history documented.'}
                      </div>
                    </div>

                    {/* Physical Examination */}
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2">
                      <div className="text-slate-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                        <span>3. Physical Examination Findings</span>
                      </div>
                      <div className="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap pl-1">
                        {encounter.physicalExamNotes || 'No specific physical examination notes recorded.'}
                      </div>
                      {encounter.generalExam && (
                        <div className="text-[11px] text-slate-700 pt-1.5 border-t border-slate-200/80 pl-1">
                          <span className="font-semibold text-slate-900">General Exam: </span>{encounter.generalExam}
                        </div>
                      )}
                      {encounter.systemicExam && (
                        <div className="text-[11px] text-slate-700 pl-1">
                          <span className="font-semibold text-slate-900">Systemic Findings: </span>{encounter.systemicExam}
                        </div>
                      )}
                    </div>

                    {/* Working Clinical Diagnosis & Differentials */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-lg border border-emerald-300 bg-emerald-50/70 space-y-1">
                        <div className="text-emerald-800 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>4. Working Clinical Diagnosis</span>
                        </div>
                        <div className="font-bold text-emerald-950 text-xs">{encounter.workingDiagnosis}</div>
                      </div>

                      {encounter.differentialDiagnosis && (
                        <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                          <div className="text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                            Differential Diagnoses Considered
                          </div>
                          <div className="text-slate-800 text-xs">{encounter.differentialDiagnosis}</div>
                        </div>
                      )}
                    </div>

                    {/* Clinical Plan, Orders & Nursing Directives */}
                    {encounter.clinicalPlan && (
                      <div className="p-3.5 rounded-lg border border-indigo-200 bg-indigo-50/50 space-y-1.5">
                        <div className="text-indigo-900 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>5. Doctor's Clinical Plan, Medication Orders & Nursing Directives</span>
                        </div>
                        <div className="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap pl-1 font-mono text-[11px]">
                          {encounter.clinicalPlan}
                        </div>
                      </div>
                    )}

                    {/* Follow-up & Review Date */}
                    {encounter.followUpDate && (
                      <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200 flex items-center justify-between">
                        <span>Scheduled Clinical Follow-up / Next Doctor Review:</span>
                        <strong className="text-slate-900 font-bold">{encounter.followUpDate}</strong>
                      </div>
                    )}

                    {/* Edit Audit Trail Notice (If Edited) */}
                    {encounter.editHistory && encounter.editHistory.length > 0 && (
                      <div className="p-2.5 bg-amber-50 rounded border border-amber-200 text-[10px] text-amber-900 space-y-1">
                        <div className="font-bold flex items-center gap-1">
                          <span>Clinical Note Audit Trail:</span>
                          <span className="font-normal">Amended {encounter.editHistory.length} time(s)</span>
                        </div>
                        {encounter.editHistory.map((edit, eIdx) => (
                          <div key={edit.id || eIdx} className="text-amber-800">
                            &bull; Edited on {new Date(edit.editedAt).toLocaleString()} by {edit.editorName} ({edit.editorRole}): {edit.reason}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <FolderHeart className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">
              {searchTerm ? 'No matching clinical notes found' : 'No clinical encounters on file for this inpatient yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchTerm
                ? `No encounters match your search query "${searchTerm}". Try searching a different symptom, diagnosis, or doctor.`
                : 'Start this patient\'s digital case file by recording the initial inpatient clinical workup or bedside round note.'}
            </p>
            {!searchTerm && (
              <button
                type="button"
                onClick={() => setIsRecordModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Record Initial Inpatient Encounter</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* RECORD INPATIENT DOCTOR ENCOUNTER / WARD ROUND MODAL */}
      {isRecordModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsRecordModalOpen(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-indigo-300" />
                <div>
                  <h3 className="font-bold text-sm">Record Inpatient Clinical Encounter / Ward Round Note</h3>
                  <p className="text-[11px] text-indigo-200">
                    Patient: {patient.firstName} {patient.lastName} ({patient.mrn}) &bull; {patient.ward || 'Ward'} / {patient.bedNumber || 'Bed'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRecordModalOpen(false)}
                className="text-indigo-200 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEncounter} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Clinician & Round Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Attending Clinician</label>
                  <input
                    type="text"
                    value={newEncounterForm.doctorName}
                    onChange={(e) => setNewEncounterForm({ ...newEncounterForm, doctorName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Encounter / Round Type</label>
                  <select
                    value={newEncounterForm.encounterType}
                    onChange={(e) => setNewEncounterForm({ ...newEncounterForm, encounterType: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="Daily Ward Round Review">Daily Ward Round Review</option>
                    <option value="Evening Follow-up Round">Evening Follow-up Round</option>
                    <option value="Initial Inpatient Workup">Initial Inpatient Workup</option>
                    <option value="Emergency Bedside Review">Emergency Bedside Review</option>
                    <option value="Consultant Specialist Review">Consultant Specialist Review</option>
                    <option value="Pre-Discharge Clinical Evaluation">Pre-Discharge Clinical Evaluation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Visit Date</label>
                  <input
                    type="date"
                    value={newEncounterForm.visitDate}
                    onChange={(e) => setNewEncounterForm({ ...newEncounterForm, visitDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                    required
                  />
                </div>
              </div>

              {/* Bedside Vitals Strip */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wide">
                  Bedside Vitals & Anthropometry
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">BP (mmHg)</label>
                    <input
                      type="text"
                      value={newEncounterForm.vitals.bloodPressure}
                      onChange={(e) => setNewEncounterForm({
                        ...newEncounterForm,
                        vitals: { ...newEncounterForm.vitals, bloodPressure: e.target.value }
                      })}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white font-medium"
                      placeholder="120/80"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Pulse (bpm)</label>
                    <input
                      type="number"
                      value={newEncounterForm.vitals.pulseRate}
                      onChange={(e) => setNewEncounterForm({
                        ...newEncounterForm,
                        vitals: { ...newEncounterForm.vitals, pulseRate: Number(e.target.value) }
                      })}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Temp (&deg;C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newEncounterForm.vitals.temperature}
                      onChange={(e) => setNewEncounterForm({
                        ...newEncounterForm,
                        vitals: { ...newEncounterForm.vitals, temperature: Number(e.target.value) }
                      })}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">SpO2 (%)</label>
                    <input
                      type="number"
                      value={newEncounterForm.vitals.spO2}
                      onChange={(e) => setNewEncounterForm({
                        ...newEncounterForm,
                        vitals: { ...newEncounterForm.vitals, spO2: Number(e.target.value) }
                      })}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Resp Rate (/min)</label>
                    <input
                      type="number"
                      value={newEncounterForm.vitals.respiratoryRate}
                      onChange={(e) => setNewEncounterForm({
                        ...newEncounterForm,
                        vitals: { ...newEncounterForm.vitals, respiratoryRate: Number(e.target.value) }
                      })}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newEncounterForm.vitals.weightKg}
                      onChange={(e) => setNewEncounterForm({
                        ...newEncounterForm,
                        vitals: { ...newEncounterForm.vitals, weightKg: Number(e.target.value) }
                      })}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Blood Glucose</label>
                    <input
                      type="text"
                      value={newEncounterForm.vitals.bloodGlucose}
                      onChange={(e) => setNewEncounterForm({
                        ...newEncounterForm,
                        vitals: { ...newEncounterForm.vitals, bloodGlucose: e.target.value }
                      })}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white font-medium"
                      placeholder="5.4 mmol/L"
                    />
                  </div>
                </div>
              </div>

              {/* Chief Complaint / Subjective Ward Round Findings */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chief Complaint / Subjective Symptoms Reported at Round
                </label>
                <input
                  type="text"
                  value={newEncounterForm.chiefComplaint}
                  onChange={(e) => setNewEncounterForm({ ...newEncounterForm, chiefComplaint: e.target.value })}
                  placeholder="e.g. Complaining of mild headache, feels feverish in the evening, tolerating soft diet"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                  required
                />
              </div>

              {/* HPI & Interval Course */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  History of Present Illness (HPI) & Ward Interval Course
                </label>
                <textarea
                  rows={2}
                  value={newEncounterForm.historyOfPresentIllness}
                  onChange={(e) => setNewEncounterForm({ ...newEncounterForm, historyOfPresentIllness: e.target.value })}
                  placeholder="e.g. Day 2 post admission. Completed 2 doses of IV Ceftriaxone. No further episodes of vomiting. Urine output adequate (approx 1200ml/24hr)."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                />
              </div>

              {/* Physical Examination */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Physical Examination Findings
                </label>
                <textarea
                  rows={2}
                  value={newEncounterForm.physicalExamNotes}
                  onChange={(e) => setNewEncounterForm({ ...newEncounterForm, physicalExamNotes: e.target.value })}
                  placeholder="e.g. Warm to touch, no pallor, no jaundice. Chest vesicular breath sounds. Abdomen soft, non-tender. IV cannula site clean without erythema."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                />
              </div>

              {/* Diagnosis Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">
                    Working Clinical Diagnosis *
                  </label>
                  <input
                    type="text"
                    value={newEncounterForm.workingDiagnosis}
                    onChange={(e) => setNewEncounterForm({ ...newEncounterForm, workingDiagnosis: e.target.value })}
                    placeholder="e.g. Severe Malaria with mild dehydration (Resolving)"
                    className="w-full p-2 border border-emerald-300 rounded-lg text-xs bg-white font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Differential Diagnosis (Optional)
                  </label>
                  <input
                    type="text"
                    value={newEncounterForm.differentialDiagnosis}
                    onChange={(e) => setNewEncounterForm({ ...newEncounterForm, differentialDiagnosis: e.target.value })}
                    placeholder="e.g. Enteric fever, UTI"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                  />
                </div>
              </div>

              {/* Clinical Plan & Nursing Orders */}
              <div>
                <label className="block text-xs font-bold text-indigo-900 mb-1">
                  Clinical Plan, Doctor Orders & Nursing Care Directives
                </label>
                <textarea
                  rows={3}
                  value={newEncounterForm.clinicalPlan}
                  onChange={(e) => setNewEncounterForm({ ...newEncounterForm, clinicalPlan: e.target.value })}
                  placeholder="e.g. 1. Continue IV Ceftriaxone 1g BD. 2. IV Paracetamol 1g PRN. 3. Monitor vitals Q4H. 4. Encourage oral rehydration salts."
                  className="w-full p-2 border border-indigo-300 rounded-lg text-xs bg-white font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Encounter to Case File</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
