import React, { useState } from 'react';
import { Patient, PatientAdmissionType, PatientAnthropometry } from '../../types';
import { useClinic, userHasRole } from '../../context/ClinicContext';
import { formatPatientAge } from '../../utils/ageUtils';
import { 
  RotateCcw, 
  X, 
  UserCheck, 
  Calendar, 
  Building2, 
  Stethoscope, 
  Bed, 
  Activity, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  History,
  ShieldCheck,
  Receipt
} from 'lucide-react';

interface RegisterRevisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onSuccess?: (updatedPatient: Patient, newMrn: string) => void;
}

export const RegisterRevisitModal: React.FC<RegisterRevisitModalProps> = ({
  isOpen,
  onClose,
  patient,
  onSuccess
}) => {
  const { registerRevisit, users, activeClinic } = useClinic();

  const [patientType, setPatientType] = useState<PatientAdmissionType>('OPD');
  const [department, setDepartment] = useState<string>('General Outpatient (OPD)');
  const [doctorRoom, setDoctorRoom] = useState<string>('Consultation Room 101');
  const [ward, setWard] = useState<string>('Male Medical Ward');
  const [bedNumber, setBedNumber] = useState<string>('Bed 01');
  const [assignedDoctorId, setAssignedDoctorId] = useState<string>('');
  const [revisitReason, setRevisitReason] = useState<string>('Follow-up & Clinical Review');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successResult, setSuccessResult] = useState<{ newMrn: string; visitNumber: number } | null>(null);

  // Vitals state initialized from patient's previous values
  const [vitals, setVitals] = useState<PatientAnthropometry>({
    bloodPressure: patient?.vitals?.bloodPressure || patient?.anthropometry?.bloodPressure || '120/80',
    pulseRate: patient?.vitals?.pulseRate || patient?.anthropometry?.pulseRate || 72,
    temperature: patient?.vitals?.temperature || patient?.anthropometry?.temperature || 36.8,
    respiratoryRate: patient?.vitals?.respiratoryRate || patient?.anthropometry?.respiratoryRate || 16,
    spO2: patient?.vitals?.spO2 || patient?.anthropometry?.spO2 || 98,
    weightKg: patient?.vitals?.weightKg || patient?.anthropometry?.weightKg || 70,
    heightCm: patient?.vitals?.heightCm || patient?.anthropometry?.heightCm || 170,
    bmi: patient?.vitals?.bmi || patient?.anthropometry?.bmi || 24.2,
    bloodGlucose: patient?.vitals?.bloodGlucose || patient?.anthropometry?.bloodGlucose || '95 mg/dL',
    lastUpdated: new Date().toISOString()
  });

  if (!isOpen || !patient) return null;

  const doctors = users.filter(u => userHasRole(u, 'doctor') && u.status === 'active' && (!activeClinic || u.clinicId === activeClinic.id));
  const pastVisits = patient.visits || [];
  const currentVisitCount = pastVisits.length > 0 ? pastVisits.length : 1;
  const nextVisitNumber = currentVisitCount + 1;

  const quickReasons = [
    'Follow-up & Clinical Review',
    'Routine General Checkup',
    'Prescription & Medication Refill',
    'Acute Symptoms Recurrence',
    'Post-Procedure Review',
    'Laboratory / Scan Results Review',
    'New Chief Complaint'
  ];

  const handleVitalsChange = (field: keyof PatientAnthropometry, value: any) => {
    setVitals(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'weightKg' || field === 'heightCm') {
        const weight = Number(field === 'weightKg' ? value : prev.weightKg);
        const heightM = Number(field === 'heightCm' ? value : prev.heightCm) / 100;
        if (weight > 0 && heightM > 0) {
          next.bmi = Number((weight / (heightM * heightM)).toFixed(1));
        }
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;

    setIsSubmitting(true);
    const assignedDoctor = doctors.find(d => d.id === assignedDoctorId);

    const result = registerRevisit(patient.id, {
      patientType,
      department: patientType === 'IPD' ? ward : department,
      doctorRoom: patientType === 'OPD' ? doctorRoom : undefined,
      ward: patientType === 'IPD' ? ward : undefined,
      bedNumber: patientType === 'IPD' ? bedNumber : undefined,
      assignedDoctorId: assignedDoctor?.id,
      assignedDoctorName: assignedDoctor?.name,
      revisitReason,
      notes,
      vitals: {
        ...vitals,
        lastUpdated: new Date().toISOString()
      }
    });

    setIsSubmitting(false);

    if (result.success && result.updatedPatient && result.newMrn) {
      setSuccessResult({
        newMrn: result.newMrn,
        visitNumber: result.visit?.visitNumber || nextVisitNumber
      });
      if (onSuccess) {
        onSuccess(result.updatedPatient, result.newMrn);
      }
    }
  };

  const handleFinish = () => {
    setSuccessResult(null);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-800 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-white backdrop-blur-xs border border-white/20 shadow-inner">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-200/25 text-purple-100 border border-purple-300/30">
                  Master Patient Index Revisit
                </span>
                <span className="text-xs text-purple-200 font-medium">
                  Visit #{nextVisitNumber}
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight mt-0.5">
                Register Patient Revisit
              </h2>
              <p className="text-xs text-purple-100/90 mt-0.5">
                Tag existing patient record as revisit, issue new OPD/IPD number, and preserve unified compound ledger.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successResult ? (
          /* Confirmation State */
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900">
                Revisit Registration Confirmed!
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                <span className="font-bold text-slate-900">{patient.firstName} {patient.lastName}</span> has been registered for <span className="font-bold text-indigo-700">Visit #{successResult.visitNumber}</span>.
              </p>
            </div>

            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 max-w-md mx-auto text-left space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Newly Generated MRN</span>
                <span className="text-sm font-black font-mono text-purple-700 bg-purple-50 px-2.5 py-1 rounded border border-purple-200">
                  {successResult.newMrn}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Previous MRN</span>
                <span className="text-xs font-mono text-slate-700">
                  {patient.initialMrn || patient.mrn}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Care Stream</span>
                <span className="text-xs font-bold text-slate-800">
                  {patientType === 'IPD' ? 'Inpatient Department (IPD)' : 'Outpatient Department (OPD)'}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Routing Status</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Waiting in Clinical Queue
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase">Accounts Ledger</span>
                <span className="text-xs font-bold text-indigo-700 flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5" />
                  Compound Multi-Visit Ledger Active
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleFinish}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-sm cursor-pointer"
              >
                Close & Return to Reception
              </button>
            </div>
          </div>
        ) : (
          /* Form State */
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Patient Snapshot Bar */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                  {patient.firstName[0]}{patient.lastName[0]}
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    {patient.firstName} {patient.lastName}
                    <span className="text-xs font-normal text-slate-500">
                      ({patient.gender}, {formatPatientAge(patient)})
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>Active MRN: <strong className="font-mono text-slate-700">{patient.mrn}</strong></span>
                    <span>•</span>
                    <span>Blood: <strong className="text-slate-700">{patient.bloodGroup || 'N/A'}</strong></span>
                    <span>•</span>
                    <span>Phone: <strong className="text-slate-700">{patient.phone || 'N/A'}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                <History className="w-4 h-4 text-purple-600" />
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Past Recorded Visits</div>
                  <div className="text-xs font-black text-purple-700">
                    {currentVisitCount} Registered Visit{currentVisitCount === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 1: Care Stream Selection (OPD vs IPD) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                1. Revisit Stream & Number Issuance <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPatientType('OPD')}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                    patientType === 'OPD'
                      ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${patientType === 'OPD' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-slate-900">Outpatient (OPD)</div>
                      <div className="text-xs text-slate-500">Consultation, Triage & Day Clinic</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded">
                    OPD Number
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPatientType('IPD')}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                    patientType === 'IPD'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${patientType === 'IPD' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Bed className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-slate-900">Inpatient (IPD)</div>
                      <div className="text-xs text-slate-500">Ward Admission & Bed Stay</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded">
                    IPD Number
                  </span>
                </button>
              </div>
            </div>

            {/* Step 2: Reason for Revisit */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Reason for Revisit & Clinical Presentation <span className="text-rose-500">*</span>
              </label>
              
              {/* Quick Choice Chips */}
              <div className="flex flex-wrap gap-1.5">
                {quickReasons.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRevisitReason(r)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      revisitReason === r 
                        ? 'bg-purple-700 text-white shadow-2xs font-bold' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <input
                type="text"
                required
                value={revisitReason}
                onChange={(e) => setRevisitReason(e.target.value)}
                placeholder="Specify chief complaint or reason for returning..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>

            {/* Step 3: Departmental Routing & Assignments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patientType === 'OPD' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Clinical Department
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-purple-500 text-sm bg-white"
                    >
                      <option value="General Outpatient (OPD)">General Outpatient (OPD)</option>
                      <option value="Pediatrics Clinic">Pediatrics Clinic</option>
                      <option value="Accident & Emergency (A&E)">Accident & Emergency (A&E)</option>
                      <option value="Internal Medicine">Internal Medicine</option>
                      <option value="Antenatal & Gynecology (ANC/Gynae)">Antenatal & Gynecology</option>
                      <option value="General Surgery Clinic">General Surgery Clinic</option>
                      <option value="Dental Clinic">Dental Clinic</option>
                      <option value="Ophthalmology / Eye Clinic">Ophthalmology / Eye Clinic</option>
                      <option value="ENT Specialist Clinic">ENT Specialist Clinic</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Doctor Consultation Room
                    </label>
                    <select
                      value={doctorRoom}
                      onChange={(e) => setDoctorRoom(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-purple-500 text-sm bg-white"
                    >
                      <option value="Consultation Room 101">Consultation Room 101</option>
                      <option value="Consultation Room 102">Consultation Room 102</option>
                      <option value="Consultation Room 103">Consultation Room 103</option>
                      <option value="Triage & Vital Station">Triage & Vital Station</option>
                      <option value="Emergency Treatment Bay">Emergency Treatment Bay</option>
                      <option value="Pediatric Room 201">Pediatric Room 201</option>
                      <option value="Specialist Clinic Office">Specialist Clinic Office</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Admission Ward
                    </label>
                    <select
                      value={ward}
                      onChange={(e) => setWard(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                    >
                      <option value="Male Medical Ward">Male Medical Ward</option>
                      <option value="Female Surgical Ward">Female Surgical Ward</option>
                      <option value="Pediatric Inpatient Ward">Pediatric Inpatient Ward</option>
                      <option value="Maternity & Postnatal Ward">Maternity & Postnatal Ward</option>
                      <option value="Intensive Care Unit (ICU)">Intensive Care Unit (ICU)</option>
                      <option value="A&E Observation Ward">A&E Observation Ward</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Bed Allocation
                    </label>
                    <select
                      value={bedNumber}
                      onChange={(e) => setBedNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                    >
                      <option value="Bed 01">Bed 01</option>
                      <option value="Bed 02">Bed 02</option>
                      <option value="Bed 03">Bed 03</option>
                      <option value="Bed 04">Bed 04</option>
                      <option value="Bed 05">Bed 05</option>
                      <option value="Bed 06">Bed 06</option>
                      <option value="Bed 07">Bed 07</option>
                      <option value="Bed 08">Bed 08</option>
                      <option value="Bed 09">Bed 09</option>
                      <option value="Bed 10">Bed 10</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Assigned Doctor & Clinical Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assign Attending Clinician / Doctor (Optional)
                </label>
                <select
                  value={assignedDoctorId}
                  onChange={(e) => setAssignedDoctorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-purple-500 text-sm bg-white"
                >
                  <option value="">-- Route to Any Available Doctor --</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.title || 'Doctor'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reception Notes / Triage Directive
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Bring previous lab results; priority review"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
            </div>

            {/* Step 4: Triage Vitals Quick Entry */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Current Visit Vitals & Anthropometry (Optional at Registration)
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Previous: {patient.vitals?.bloodPressure || '120/80'} • {patient.vitals?.weightKg || 70}kg
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Blood Pressure</label>
                  <input
                    type="text"
                    value={vitals.bloodPressure || ''}
                    onChange={(e) => handleVitalsChange('bloodPressure', e.target.value)}
                    placeholder="120/80"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Pulse (bpm)</label>
                  <input
                    type="number"
                    value={vitals.pulseRate || ''}
                    onChange={(e) => handleVitalsChange('pulseRate', Number(e.target.value))}
                    placeholder="72"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Temp (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitals.temperature || ''}
                    onChange={(e) => handleVitalsChange('temperature', Number(e.target.value))}
                    placeholder="36.8"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">SpO2 (%)</label>
                  <input
                    type="number"
                    value={vitals.spO2 || ''}
                    onChange={(e) => handleVitalsChange('spO2', Number(e.target.value))}
                    placeholder="99"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitals.weightKg || ''}
                    onChange={(e) => handleVitalsChange('weightKg', Number(e.target.value))}
                    placeholder="70"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Height (cm)</label>
                  <input
                    type="number"
                    value={vitals.heightCm || ''}
                    onChange={(e) => handleVitalsChange('heightCm', Number(e.target.value))}
                    placeholder="170"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">BMI</label>
                  <input
                    type="text"
                    readOnly
                    value={vitals.bmi || '24.2'}
                    className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded font-mono text-center text-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Blood Glucose</label>
                  <input
                    type="text"
                    value={vitals.bloodGlucose || ''}
                    onChange={(e) => handleVitalsChange('bloodGlucose', e.target.value)}
                    placeholder="95 mg/dL"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-center"
                  />
                </div>
              </div>
            </div>

            {/* Systematic Compound Ledger & Doctor Notification Guarantee Banner */}
            <div className="bg-indigo-50/70 border border-indigo-200 p-4 rounded-xl flex items-start gap-3 text-xs text-indigo-950">
              <ShieldCheck className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-indigo-900">
                  Systematic Revisit & Compound Ledger Flow
                </div>
                <p className="text-indigo-800 leading-relaxed">
                  Registering this revisit will assign a brand new <strong>{patientType} Number</strong> for this encounter. The doctor's consultation dashboard will immediately flag this patient as a <strong>Revisit</strong> and provide full access to all historical encounters, lab tests, and prescriptions. In the accounts office, this patient's proceedings will remain unified in <strong>one compound ledger</strong>.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold text-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl font-extrabold text-sm shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                {isSubmitting ? 'Registering Revisit...' : `Tag as Revisit & Generate ${patientType} Number`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
