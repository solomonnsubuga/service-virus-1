import React, { useState, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Patient, PatientAnthropometry } from '../../types';
import {
  X,
  Activity,
  HeartPulse,
  Thermometer,
  Wind,
  Droplets,
  Scale,
  Ruler,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface EditAnthropometryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onSaveCallback?: (updatedVitals: PatientAnthropometry) => void;
}

export const EditAnthropometryModal: React.FC<EditAnthropometryModalProps> = ({
  isOpen,
  onClose,
  patient,
  onSaveCallback
}) => {
  const { currentUser, updatePatientAnthropometry } = useClinic();

  const [form, setForm] = useState<PatientAnthropometry>({
    bloodPressure: '120/80',
    pulseRate: 72,
    temperature: 36.8,
    respiratoryRate: 16,
    spO2: 99,
    weightKg: 70,
    heightCm: 170,
    bmi: 24.2,
    muacCm: 26,
    bloodGlucose: '95 mg/dL'
  });

  useEffect(() => {
    if (patient) {
      const v = patient.anthropometry || patient.vitals;
      const initialWeight = v?.weightKg !== undefined ? v.weightKg : 70;
      const initialHeight = v?.heightCm !== undefined ? v.heightCm : 170;
      const calcBmi = initialHeight > 0
        ? Number((initialWeight / ((initialHeight / 100) * (initialHeight / 100))).toFixed(1))
        : 24.2;

      setForm({
        bloodPressure: v?.bloodPressure || '120/80',
        pulseRate: v?.pulseRate !== undefined ? v.pulseRate : 72,
        temperature: v?.temperature !== undefined ? v.temperature : 36.8,
        respiratoryRate: v?.respiratoryRate !== undefined ? v.respiratoryRate : 16,
        spO2: v?.spO2 !== undefined ? v.spO2 : 99,
        weightKg: initialWeight,
        heightCm: initialHeight,
        bmi: v?.bmi !== undefined ? v.bmi : calcBmi,
        muacCm: v?.muacCm !== undefined ? v.muacCm : undefined,
        bloodGlucose: v?.bloodGlucose || '95 mg/dL'
      });
    }
  }, [patient]);

  if (!isOpen || !patient) return null;

  // Live BMI recalculation
  const handleWeightOrHeightChange = (weight: number, height: number) => {
    const safeW = Math.max(0, weight);
    const safeH = Math.max(0, height);
    let bmiVal = 0;
    if (safeH > 0 && safeW > 0) {
      bmiVal = Number((safeW / ((safeH / 100) * (safeH / 100))).toFixed(1));
    }
    setForm(prev => ({
      ...prev,
      weightKg: safeW,
      heightCm: safeH,
      bmi: bmiVal
    }));
  };

  const getBmiCategory = (bmi?: number) => {
    if (!bmi || bmi <= 0) return { label: 'Not calculated', color: 'text-slate-500 bg-slate-100 border-slate-200' };
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-amber-800 bg-amber-50 border-amber-300' };
    if (bmi < 25) return { label: 'Normal / Healthy', color: 'text-emerald-800 bg-emerald-50 border-emerald-300' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-orange-800 bg-orange-50 border-orange-300' };
    return { label: 'Obesity Category', color: 'text-rose-800 bg-rose-50 border-rose-300' };
  };

  const bmiBadge = getBmiCategory(form.bmi);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanVitals: PatientAnthropometry = {
      ...form,
      weightKg: Number(form.weightKg),
      heightCm: Number(form.heightCm),
      pulseRate: Number(form.pulseRate),
      temperature: Number(form.temperature),
      respiratoryRate: Number(form.respiratoryRate),
      spO2: Number(form.spO2),
      muacCm: form.muacCm ? Number(form.muacCm) : undefined,
      lastUpdated: new Date().toISOString(),
      recordedBy: currentUser.name
    };

    const res = updatePatientAnthropometry(patient.id, cleanVitals, currentUser.name);
    if (res.success) {
      if (onSaveCallback) {
        onSaveCallback(cleanVitals);
      }
      alert(`Anthropometry & Vitals for ${patient.firstName} ${patient.lastName} updated successfully.`);
      onClose();
    } else {
      alert(res.message);
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
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">Edit Vitals & Anthropometry</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
                  {patient.firstName} {patient.lastName} ({patient.patientType === 'IPD' ? 'IPD No.' : 'OPD No.'}: {patient.mrn})
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Record physiological measurements, body metrics & vital signs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Card: Anthropometric Body Metrics */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-slate-600" />
                Body Measurements & Calculated BMI
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${bmiBadge.color}`}>
                BMI: {form.bmi ? `${form.bmi} kg/m²` : 'N/A'} ({bmiBadge.label})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1">
                  <Scale className="w-3 h-3 text-slate-400" />
                  Weight (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="400"
                  value={form.weightKg}
                  onChange={(e) => handleWeightOrHeightChange(Number(e.target.value), form.heightCm)}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1">
                  <Ruler className="w-3 h-3 text-slate-400" />
                  Height (cm) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="20"
                  max="250"
                  value={form.heightCm}
                  onChange={(e) => handleWeightOrHeightChange(form.weightKg, Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  MUAC (Arm Circumf. cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="5"
                  max="60"
                  placeholder="e.g. 26.5 (optional)"
                  value={form.muacCm || ''}
                  onChange={(e) => setForm({ ...form, muacCm: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                />
              </div>
            </div>
          </div>

          {/* Card: Physiological Vital Signs */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-rose-500" />
              Vital Signs & Hemodynamic Parameters
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Blood Pressure (mmHg) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 120/80"
                  value={form.bloodPressure}
                  onChange={(e) => setForm({ ...form, bloodPressure: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1">
                  <HeartPulse className="w-3 h-3 text-rose-500" />
                  Pulse Rate (bpm) *
                </label>
                <input
                  type="number"
                  min="20"
                  max="240"
                  value={form.pulseRate}
                  onChange={(e) => setForm({ ...form, pulseRate: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-amber-500" />
                  Temperature (&deg;C) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="45"
                  value={form.temperature}
                  onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })}
                  className={`w-full p-2 border border-slate-300 rounded bg-white font-bold ${
                    form.temperature > 37.5 ? 'text-rose-600' : 'text-slate-900'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1">
                  <Wind className="w-3 h-3 text-sky-500" />
                  Respiratory Rate (/min)
                </label>
                <input
                  type="number"
                  min="5"
                  max="80"
                  value={form.respiratoryRate}
                  onChange={(e) => setForm({ ...form, respiratoryRate: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-500" />
                  SpO2 Oxygen (%) *
                </label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={form.spO2}
                  onChange={(e) => setForm({ ...form, spO2: Number(e.target.value) })}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-indigo-500" />
                  Blood Glucose
                </label>
                <input
                  type="text"
                  placeholder="e.g. 95 mg/dL or 5.3 mmol/L"
                  value={form.bloodGlucose || ''}
                  onChange={(e) => setForm({ ...form, bloodGlucose: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <span className="text-[11px] text-slate-500">
              Recorded by: <strong className="text-slate-800">{currentUser.name}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-md shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Save Vitals & Anthropometry
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
