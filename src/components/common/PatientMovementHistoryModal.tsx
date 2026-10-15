import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Patient, PatientMovementRecord } from '../../types';
import {
  X,
  Clock,
  ArrowRight,
  Building2,
  BedDouble,
  UserCheck,
  Stethoscope,
  MoveRight,
  History,
  CheckCircle2,
  DoorOpen,
  Send
} from 'lucide-react';

interface PatientMovementHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
}

export const PatientMovementHistoryModal: React.FC<PatientMovementHistoryModalProps> = ({
  isOpen,
  onClose,
  patient
}) => {
  const {
    currentUser,
    currentClinicWards,
    currentClinicDepartments,
    users,
    transferOrAdmitPatient
  } = useClinic();

  const [activeTab, setActiveTab] = useState<'timeline' | 'transfer'>('timeline');
  const [toDepartment, setToDepartment] = useState(patient?.department || 'General OPD');
  const [toRoomOrWard, setToRoomOrWard] = useState(
    patient?.patientType === 'IPD'
      ? (patient?.ward || currentClinicWards[0]?.name || 'Male Medical Ward')
      : (patient?.doctorRoom || 'Consultation Room 1')
  );
  const [toBedNumber, setToBedNumber] = useState(patient?.bedNumber || 'Bed 01');
  const [assignedDoctorId, setAssignedDoctorId] = useState(patient?.assignedDoctorId || '');
  const [newPatientType, setNewPatientType] = useState<'OPD' | 'IPD'>(patient?.patientType || 'OPD');
  const [transferReason, setTransferReason] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen || !patient) return null;

  const doctorsList = users.filter(u => u.role === 'doctor');
  const movementHistory = patient.movementHistory || [];

  const selectedDepartmentObj = currentClinicDepartments.find(d => d.name === toDepartment);
  const selectedWardObj = currentClinicWards.find(w => w.name === toRoomOrWard);

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const doc = doctorsList.find(d => d.id === assignedDoctorId);

    const res = transferOrAdmitPatient(patient.id, {
      toDepartment,
      toRoomOrWard,
      toBedNumber: newPatientType === 'IPD' ? toBedNumber : undefined,
      assignedDoctorId: doc?.id,
      assignedDoctorName: doc?.name,
      newPatientType,
      reason: transferReason.trim() || `Transferred to ${toDepartment} (${toRoomOrWard})`
    });

    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      setTransferReason('');
      setTimeout(() => {
        setActiveTab('timeline');
        setFeedback(null);
      }, 1200);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
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
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  Patient Journey & Location Path Trail
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                  patient.patientType === 'IPD' ? 'bg-indigo-50 text-indigo-800 border-indigo-300' : 'bg-sky-50 text-sky-800 border-sky-300'
                }`}>
                  {patient.patientType || 'OPD'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {patient.firstName} {patient.lastName} &bull; <span className="font-mono font-semibold">{patient.mrn}</span> &bull; Current: <strong>{patient.department || 'OPD'}</strong> ({patient.patientType === 'IPD' ? `${patient.ward || 'Ward'} - ${patient.bedNumber || 'Bed'}` : (patient.doctorRoom || 'Consultation Room')})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 border-b border-slate-200 flex items-center gap-6 text-xs font-bold bg-white">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'timeline' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Timestamped Movement Trail ({movementHistory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('transfer')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'transfer' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MoveRight className="w-3.5 h-3.5" />
            <span>Transfer Location or Admit to IPD</span>
          </button>
        </div>

        <div className="p-6">
          
          {feedback && (
            <div className={`p-3 rounded-lg border text-xs font-medium mb-4 flex items-center gap-2 ${
              feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Tab 1: Movement Timeline */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              
              {/* Current Active Location Summary Card */}
              <div className="p-4 bg-gradient-to-r from-indigo-50/70 to-purple-50/70 rounded-xl border border-indigo-100 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold tracking-wider text-indigo-700 uppercase">
                    Current Active Station
                  </div>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>{patient.department || 'General Outpatient (OPD)'}</span>
                    <span className="text-slate-400">&bull;</span>
                    {patient.patientType === 'IPD' ? (
                      <span className="text-indigo-950 font-bold flex items-center gap-1">
                        <BedDouble className="w-3.5 h-3.5 text-indigo-600" />
                        {patient.ward || 'General Ward'} ({patient.bedNumber || 'Bed Assigned'})
                      </span>
                    ) : (
                      <span className="text-slate-700 font-semibold flex items-center gap-1">
                        <DoorOpen className="w-3.5 h-3.5 text-slate-500" />
                        {patient.doctorRoom || 'Consultation Office'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600">
                    Assigned Clinician: <span className="font-semibold text-slate-800">{patient.assignedDoctorName || 'Not Assigned'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('transfer')}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <MoveRight className="w-3.5 h-3.5" />
                  Move / Transfer Location
                </button>
              </div>

              {/* Timestamped Timeline Path */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Historical Journey & Departmental Transfer Path
                </h4>

                {movementHistory.length > 0 ? (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-200">
                    {movementHistory.map((item, idx) => (
                      <div key={item.id || idx} className="relative">
                        {/* Node circle */}
                        <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center shadow-xs">
                          <div className="w-2 h-2 rounded-full bg-indigo-600" />
                        </div>

                        <div className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-xs space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-100 text-slate-800 border border-slate-200">
                                {item.actionType ? item.actionType.replace('_', ' ') : 'Transfer'}
                              </span>
                              <span className="font-bold text-slate-900">
                                {item.fromLocation || 'Initial Intake'} <ArrowRight className="inline w-3 h-3 text-slate-400 mx-1" /> {item.toLocation || item.toDepartment}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600">
                            <strong>Reason / Notes:</strong> {item.reason || 'Routine location transfer'}
                          </div>

                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>Authorised by: <strong>{item.performedByName || item.transferredBy || 'Staff'}</strong> ({item.performedByRole || 'Staff'})</span>
                            {item.toBedNumber && (
                              <>
                                <span>&bull;</span>
                                <span className="font-semibold text-indigo-700">Bed: {item.toBedNumber}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                    <History className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    No location transfers recorded yet. Patient is at initial registered station.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Tab 2: Transfer / Admit Form */}
          {activeTab === 'transfer' && (
            <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                
                {/* Switch OPD <-> IPD */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
                    Admission Classification *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewPatientType('OPD')}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between ${
                        newPatientType === 'OPD' ? 'bg-sky-50 border-sky-400 text-sky-900 ring-2 ring-sky-500 font-bold' : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="text-xs">Outpatient (OPD)</div>
                        <div className="text-[11px] font-normal text-slate-500">Day visits & consultation rooms</div>
                      </div>
                      {newPatientType === 'OPD' && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewPatientType('IPD')}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between ${
                        newPatientType === 'IPD' ? 'bg-indigo-50 border-indigo-400 text-indigo-900 ring-2 ring-indigo-500 font-bold' : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="text-xs">Inpatient (IPD) Admission</div>
                        <div className="text-[11px] font-normal text-slate-500">Admit to ward bed & 24hr nursing</div>
                      </div>
                      {newPatientType === 'IPD' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </button>
                  </div>
                </div>

                {/* Destination Department */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Target Department *</label>
                    <select
                      value={toDepartment}
                      onChange={(e) => {
                        const val = e.target.value;
                        setToDepartment(val);
                        const dep = currentClinicDepartments.find(d => d.name === val);
                        if (dep && dep.rooms.length > 0 && newPatientType === 'OPD') {
                          setToRoomOrWard(dep.rooms[0]);
                        }
                      }}
                      className="w-full p-2 border border-slate-300 rounded bg-white font-medium text-slate-900"
                      required
                    >
                      {currentClinicDepartments.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* If IPD: Ward & Bed; If OPD: Clinical Room */}
                  {newPatientType === 'IPD' ? (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Target Inpatient Ward *</label>
                      <select
                        value={toRoomOrWard}
                        onChange={(e) => {
                          const val = e.target.value;
                          setToRoomOrWard(val);
                          const w = currentClinicWards.find(x => x.name === val);
                          if (w && w.beds.length > 0) {
                            setToBedNumber(w.beds[0]);
                          }
                        }}
                        className="w-full p-2 border border-slate-300 rounded bg-white font-bold text-indigo-900"
                        required
                      >
                        {currentClinicWards.map(w => (
                          <option key={w.id} value={w.name}>{w.name} ({w.building || 'Main Wing'})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Clinical Room / Office Number *</label>
                      <input
                        type="text"
                        value={toRoomOrWard}
                        onChange={(e) => setToRoomOrWard(e.target.value)}
                        placeholder="e.g. Consultation Room 3, Office 12"
                        className="w-full p-2 border border-slate-300 rounded bg-white"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* If IPD: Bed Selection */}
                {newPatientType === 'IPD' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Allocated Bed Number *</label>
                      <select
                        value={toBedNumber}
                        onChange={(e) => setToBedNumber(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded bg-white font-bold text-slate-900"
                        required
                      >
                        {(selectedWardObj?.beds || Array.from({ length: 12 }, (_, i) => `Bed ${String(i + 1).padStart(2, '0')}`)).map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Assigned Doctor / Specialist</label>
                      <select
                        value={assignedDoctorId}
                        onChange={(e) => setAssignedDoctorId(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded bg-white text-slate-800"
                      >
                        <option value="">-- Select In-Charge Doctor --</option>
                        {doctorsList.map(doc => (
                          <option key={doc.id} value={doc.id}>{doc.name} ({doc.title || 'Clinician'})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Transfer Reason */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Transfer / Admission Reason & Clinical Note *
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Admitted from A&E for pediatric IV antibiotics, Patient referred to Orthopedics Room 4 for fracture cast..."
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded bg-white"
                    required
                  />
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('timeline')}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Execute Transfer & Log Timestamped Record
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
