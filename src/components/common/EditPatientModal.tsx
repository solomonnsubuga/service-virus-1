import React, { useState, useEffect, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Patient, PatientAgeCategory, PatientAdmissionType } from '../../types';
import { AGE_CATEGORIES, getCategoryFromAge } from '../dashboards/ReceptionDashboard';
import { parseAgeInput, calculateAgeFromDob, formatPatientAge } from '../../utils/ageUtils';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Lock,
  KeyRound,
  UserCheck,
  AlertTriangle,
  Building2
} from 'lucide-react';

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
}

export const EditPatientModal: React.FC<EditPatientModalProps> = ({
  isOpen,
  onClose,
  patient
}) => {
  const { currentUser, updatePatientDetails, activeClinic, currentClinicInsurancePolicies } = useClinic();

  const isLevel2OrAbove = currentUser.clearanceLevel >= 2;
  const [overridePin, setOverridePin] = useState('');
  const [isPinUnlocked, setIsPinUnlocked] = useState(false);
  const [pinError, setPinError] = useState('');

  const availablePolicies = useMemo(() => {
    return (currentClinicInsurancePolicies || []).filter(p => p.status === 'active');
  }, [currentClinicInsurancePolicies]);

  const [isCustomInsurance, setIsCustomInsurance] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: 'Female' as Patient['gender'],
    dob: '',
    age: 30,
    rawAge: '30',
    ageDisplay: '30 yrs',
    ageUnit: 'years' as 'days' | 'weeks' | 'months' | 'years',
    ageCategory: 'ADULT' as PatientAgeCategory,
    patientType: 'OPD' as PatientAdmissionType,
    phone: '',
    email: '',
    address: '',
    bloodGroup: '',
    allergiesText: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRel: 'Next of Kin'
  });

  useEffect(() => {
    if (patient) {
      const initialRawAge = patient.rawAge || (patient.age != null ? String(patient.age) : '30');
      const parsed = parseAgeInput(initialRawAge);
      setFormData({
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        gender: patient.gender || 'Female',
        dob: patient.dob || '',
        age: parsed.ageInYears,
        rawAge: initialRawAge,
        ageDisplay: patient.ageDisplay || parsed.displayAge,
        ageUnit: (patient.ageUnit || parsed.unit) as any,
        ageCategory: patient.ageCategory || parsed.inferredCategory,
        patientType: patient.patientType || 'OPD',
        phone: patient.phone || '',
        email: patient.email || '',
        address: patient.address || '',
        bloodGroup: patient.bloodGroup || '',
        allergiesText: patient.allergies ? patient.allergies.join(', ') : '',
        insuranceProvider: patient.insuranceProvider || '',
        insurancePolicyNumber: patient.insurancePolicyNumber || '',
        emergencyName: patient.emergencyContact?.name || '',
        emergencyPhone: patient.emergencyContact?.phone || '',
        emergencyRel: patient.emergencyContact?.relationship || 'Next of Kin'
      });
      setIsPinUnlocked(false);
      setOverridePin('');
      setPinError('');
    }
  }, [patient]);

  if (!isOpen || !patient) return null;

  const hasAccess = isLevel2OrAbove || isPinUnlocked;

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default supervisor override clearance PINs: "7788" or "2026" or "admin123"
    if (overridePin === '7788' || overridePin === '2026' || overridePin === 'admin123') {
      setIsPinUnlocked(true);
      setPinError('');
    } else {
      setPinError('Invalid Supervisor Clearance PIN. (Allowed demo override PIN: 7788 or 2026)');
    }
  };

  const handleAgeInputChange = (newRaw: string) => {
    const parsed = parseAgeInput(newRaw);
    setFormData(prev => ({
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
    setFormData(prev => ({
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
    setFormData(prev => ({
      ...prev,
      ageCategory: category,
      age: defAge,
      rawAge: String(defAge),
      ageDisplay: parsed.displayAge,
      ageUnit: 'years',
      dob: parsed.estimatedDob
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAccess) return;

    const allergies = formData.allergiesText
      ? formData.allergiesText.split(',').map(a => a.trim()).filter(Boolean)
      : ['None Reported'];

    const parsedAge = parseAgeInput(formData.rawAge || formData.age);

    const result = updatePatientDetails(patient.id, {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      gender: formData.gender,
      dob: formData.dob,
      age: parsedAge.ageInYears,
      rawAge: formData.rawAge || String(parsedAge.unitCount),
      ageDisplay: parsedAge.displayAge,
      ageUnit: parsedAge.unit,
      ageCategory: formData.ageCategory || parsedAge.inferredCategory,
      patientType: formData.patientType,
      phone: formData.phone.trim() || undefined,
      email: formData.email.trim() || undefined,
      address: formData.address.trim() || 'Address on file',
      bloodGroup: formData.bloodGroup.trim() || undefined,
      allergies: allergies.length > 0 ? allergies : ['None Reported'],
      insuranceProvider: formData.insuranceProvider.trim() || undefined,
      insurancePolicyNumber: formData.insurancePolicyNumber.trim() || undefined,
      emergencyContact: {
        name: formData.emergencyName.trim() || 'Family Member',
        phone: formData.emergencyPhone.trim() || formData.phone.trim() || undefined,
        relationship: formData.emergencyRel
      }
    });

    if (result.success) {
      alert(result.message);
      onClose();
    } else {
      alert(result.message);
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
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
              hasAccess ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {hasAccess ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">Edit Patient Details</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                  {patient.patientType === 'IPD' ? 'IPD No.' : 'OPD No.'}: {patient.mrn}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Level 2 Clinical Clearance Required &bull; Modifying records is audited
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

        {/* Clearance Level Check Notice */}
        {!hasAccess ? (
          <div className="p-6 space-y-4 text-xs">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Level 2 Security Clearance Required
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Your current account (<strong>{currentUser.name}</strong>) is assigned <strong>{currentUser.clearance} (Level {currentUser.clearanceLevel})</strong>.
                Patient demographic updates, stream conversion, and record alterations require Level 2 clearance or higher.
              </p>
              <div className="text-[11px] text-amber-900 font-semibold pt-1">
                You can enter a Supervisor Clearance PIN below to authorize this record edit, or contact a Doctor/Admin.
              </div>
            </div>

            {/* Supervisor PIN Unlock Form */}
            <form onSubmit={handleVerifyPin} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <label className="block font-bold text-slate-700">
                Enter Supervisor / Clinical Director PIN:
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    placeholder="Enter Clearance PIN (e.g. 7788 or 2026)"
                    value={overridePin}
                    onChange={(e) => {
                      setOverridePin(e.target.value);
                      setPinError('');
                    }}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md bg-white text-xs font-mono font-bold text-slate-900"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-md shadow-xs cursor-pointer"
                >
                  Verify PIN
                </button>
              </div>
              {pinError && <p className="text-[11px] text-rose-600 font-bold">{pinError}</p>}
            </form>
          </div>
        ) : (
          /* Form for editing details */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
            
            {/* Clearance Verified Banner */}
            <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between text-[11px] text-emerald-900">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Clearance Authorized: {currentUser.clearanceLevel >= 2 ? currentUser.name : 'Supervisor Override'} (Level 2+)
              </div>
              <span className="text-[10px] text-emerald-700 font-medium">Audit logs enabled</span>
            </div>

            {/* Admission Stream (OPD vs IPD) */}
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Admission Stream (OPD / IPD)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, patientType: 'OPD' })}
                  className={`p-2.5 rounded-lg border text-left flex items-center justify-between cursor-pointer ${
                    formData.patientType === 'OPD'
                      ? 'bg-sky-50 border-sky-400 text-sky-900 ring-2 ring-sky-500 font-bold'
                      : 'bg-white border-slate-300 text-slate-700'
                  }`}
                >
                  <span>Outpatient (OPD)</span>
                  {formData.patientType === 'OPD' && <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, patientType: 'IPD' })}
                  className={`p-2.5 rounded-lg border text-left flex items-center justify-between cursor-pointer ${
                    formData.patientType === 'IPD'
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-900 ring-2 ring-indigo-500 font-bold'
                      : 'bg-white border-slate-300 text-slate-700'
                  }`}
                >
                  <span>Inpatient (IPD)</span>
                  {formData.patientType === 'IPD' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                </button>
              </div>
            </div>

            {/* Age Category Selector */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <label className="font-bold text-slate-800 text-[11px]">Life Stage Category</label>
              <div className="grid grid-cols-4 gap-2">
                {AGE_CATEGORIES.map(cat => {
                  const isSelected = formData.ageCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => handleCategorySelect(cat.key)}
                      className={`p-2 rounded border text-center cursor-pointer text-[11px] ${
                        isSelected
                          ? `${cat.color} ring-2 ring-purple-600 font-bold`
                          : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      <div>{cat.label}</div>
                      <div className="text-[10px] opacity-75">{cat.range}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Demographic Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">First Name *</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-medium text-slate-700 text-sm">Age *</label>
                  <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                    1/7 (d), 1/52 (w), 1/12 (m)
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.rawAge ?? String(formData.age)}
                  onChange={(e) => handleAgeInputChange(e.target.value)}
                  placeholder="e.g. 29, 2/52, 5/7, 1/12"
                  className="w-full p-2 border border-slate-300 rounded bg-white font-bold text-slate-900 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  required
                />

                {/* Quick Fraction Shortcuts */}
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-medium mr-0.5">Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleAgeInputChange('5/7')}
                    className="px-1.5 py-0.5 text-[10px] font-semibold bg-cyan-50 text-cyan-800 border border-cyan-300 rounded hover:bg-cyan-100 transition-colors cursor-pointer"
                  >
                    5/7 (5d)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAgeInputChange('2/52')}
                    className="px-1.5 py-0.5 text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-300 rounded hover:bg-sky-100 transition-colors cursor-pointer"
                  >
                    2/52 (2w)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAgeInputChange('1/12')}
                    className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 rounded hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    1/12 (1m)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAgeInputChange('6/12')}
                    className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 rounded hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    6/12 (6m)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAgeInputChange('29')}
                    className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 rounded hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    29y
                  </button>
                </div>

                {/* Dynamic Clinical Feedback */}
                {(() => {
                  const parsed = parseAgeInput(formData.rawAge ?? String(formData.age));
                  if (parsed.isValid) {
                    return (
                      <div className="mt-1.5 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-900 flex items-center justify-between">
                        <span className="font-semibold">{parsed.clinicalMeaning} ({parsed.displayAge})</span>
                        <span className="text-[10px] text-emerald-700 bg-white/70 px-1 py-0.2 rounded border border-emerald-200">
                          Est DOB: {parsed.estimatedDob}
                        </span>
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
                  value={formData.dob}
                  onChange={(e) => handleDobChange(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded bg-white text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Changing DOB recalculates pediatric fraction / years
                </span>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Blood Group</label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
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
                <label className="block font-medium text-slate-700 mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                  placeholder="Optional phone number"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-700 mb-1">Known Drug Allergies</label>
                <input
                  type="text"
                  value={formData.allergiesText}
                  onChange={(e) => setFormData({ ...formData, allergiesText: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                  placeholder="e.g. Penicillin, Aspirin, Sulfa drugs"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block font-medium text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                  placeholder="Residential address"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Insurance Policy / Payer</label>
                <select
                  value={
                    availablePolicies.some(p => p.name.toLowerCase() === (formData.insuranceProvider || '').toLowerCase()) || !formData.insuranceProvider
                      ? formData.insuranceProvider
                      : 'CUSTOM'
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'CUSTOM') {
                      setIsCustomInsurance(true);
                    } else {
                      setIsCustomInsurance(false);
                      setFormData({ ...formData, insuranceProvider: val });
                    }
                  }}
                  className="w-full p-2 border border-slate-300 rounded bg-white text-xs font-medium"
                >
                  <option value="">Cash / Direct Self-Pay (No Insurance)</option>
                  {availablePolicies.length > 0 && (
                    <optgroup label={`Accepted at ${activeClinic.name}`}>
                      {availablePolicies.map(policy => (
                        <option key={policy.id} value={policy.name}>
                          {policy.name} ({policy.coveragePercentage ?? 100}% Cover)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <option value="CUSTOM">➕ Other / Custom Insurance...</option>
                </select>

                {(isCustomInsurance || (formData.insuranceProvider && !availablePolicies.some(p => p.name.toLowerCase() === formData.insuranceProvider.toLowerCase()))) && (
                  <input
                    type="text"
                    value={formData.insuranceProvider}
                    onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
                    className="w-full p-2 mt-2 border border-emerald-300 rounded bg-emerald-50/40 text-xs"
                    placeholder="Enter custom insurance name"
                  />
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-700 mb-1">Insurance Policy Number</label>
                <input
                  type="text"
                  value={formData.insurancePolicyNumber}
                  onChange={(e) => setFormData({ ...formData, insurancePolicyNumber: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded bg-white"
                  placeholder="Policy / ID number"
                />
              </div>
            </div>

            {/* Emergency Contact Box */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-2">Emergency Contact</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-600 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={formData.emergencyName}
                    onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Relationship</label>
                  <input
                    type="text"
                    value={formData.emergencyRel}
                    onChange={(e) => setFormData({ ...formData, emergencyRel: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.emergencyPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="text-[11px] text-slate-500">
                Updates sync in real-time to all clinical departments.
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
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-md shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Save Patient Record
                </button>
              </div>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
