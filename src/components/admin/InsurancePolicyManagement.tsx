import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  Building2,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Percent,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  HelpCircle,
  DollarSign
} from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';
import { InsurancePolicy } from '../../types';

interface InsurancePolicyManagementProps {
  onSelectPolicyForStore?: (policyName: string) => void;
}

export const InsurancePolicyManagement: React.FC<InsurancePolicyManagementProps> = ({
  onSelectPolicyForStore
}) => {
  const {
    clinics,
    activeClinic,
    insurancePolicies,
    currentClinicInsurancePolicies,
    addInsurancePolicy,
    updateInsurancePolicy,
    deleteInsurancePolicy,
    inventory
  } = useClinic();

  // Search and Clinic Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClinicFilter, setSelectedClinicFilter] = useState<string>(activeClinic.id);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<InsurancePolicy | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const initialFormData = {
    clinicId: activeClinic.id,
    name: '',
    code: '',
    category: 'corporate' as InsurancePolicy['category'],
    coveragePercentage: 90,
    copayAmount: 10,
    contactPhone: '',
    contactEmail: '',
    notes: '',
    status: 'active' as 'active' | 'inactive'
  };

  const [formData, setFormData] = useState(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);

  // Common Presets for fast policy creation
  const POPULAR_INSURANCE_PRESETS = [
    { name: 'NHIF / SHIF Comprehensive Scheme', code: 'NHIF-COMP', category: 'national', coverage: 100, copay: 0 },
    { name: 'Jubilee Health Insurance', code: 'JUB-H01', category: 'corporate', coverage: 90, copay: 10 },
    { name: 'Aetna International / PPO', code: 'AET-INT', category: 'private', coverage: 100, copay: 15 },
    { name: 'Britam Mediflex Healthcare', code: 'BRIT-MF', category: 'corporate', coverage: 85, copay: 5 },
    { name: 'Cigna Global Health', code: 'CIG-GLB', category: 'private', coverage: 95, copay: 20 },
    { name: 'UAP Old Mutual Health', code: 'UAP-OM', category: 'corporate', coverage: 90, copay: 10 },
    { name: 'CIC General Healthcare Scheme', code: 'CIC-MED', category: 'corporate', coverage: 85, copay: 10 },
    { name: 'First Assurance Medical Cover', code: 'FA-MED', category: 'corporate', coverage: 80, copay: 15 },
    { name: 'APA Insurance Health Plan', code: 'APA-H02', category: 'corporate', coverage: 90, copay: 10 }
  ];

  // Filtered Policies
  const filteredPolicies = useMemo(() => {
    return insurancePolicies.filter(p => {
      // Clinic Match: matches selected clinic, or if filter is 'all', or policy is network-wide ('all')
      const matchesClinic =
        selectedClinicFilter === 'all'
          ? true
          : p.clinicId === selectedClinicFilter || p.clinicId === 'all';

      // Category Match
      const matchesCategory =
        selectedCategoryFilter === 'all' ? true : p.category === selectedCategoryFilter;

      // Search Match
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.code && p.code.toLowerCase().includes(term)) ||
        (p.notes && p.notes.toLowerCase().includes(term));

      return matchesClinic && matchesCategory && matchesSearch;
    });
  }, [insurancePolicies, selectedClinicFilter, selectedCategoryFilter, searchTerm]);

  // Inventory items with insurance pricing stats
  const itemsWithCustomPricingCount = useMemo(() => {
    return inventory.reduce((count, item) => {
      if (item.insurancePrices && Object.keys(item.insurancePrices).length > 0) {
        return count + 1;
      }
      return count;
    }, 0);
  }, [inventory]);

  const handleOpenAddModal = (preset?: typeof POPULAR_INSURANCE_PRESETS[0]) => {
    setEditingPolicy(null);
    setFormError(null);
    if (preset) {
      setFormData({
        clinicId: selectedClinicFilter !== 'all' ? selectedClinicFilter : activeClinic.id,
        name: preset.name,
        code: preset.code,
        category: preset.category as InsurancePolicy['category'],
        coveragePercentage: preset.coverage,
        copayAmount: preset.copay,
        contactPhone: '',
        contactEmail: '',
        notes: `Standard tariff for ${preset.name}. Pre-authorization required for procedures.`,
        status: 'active'
      });
    } else {
      setFormData({
        ...initialFormData,
        clinicId: selectedClinicFilter !== 'all' ? selectedClinicFilter : activeClinic.id
      });
    }
    setShowAddModal(true);
  };

  const handleOpenEditModal = (policy: InsurancePolicy) => {
    setEditingPolicy(policy);
    setFormError(null);
    setFormData({
      clinicId: policy.clinicId,
      name: policy.name,
      code: policy.code || '',
      category: policy.category || 'corporate',
      coveragePercentage: policy.coveragePercentage ?? 90,
      copayAmount: policy.copayAmount ?? 10,
      contactPhone: policy.contactPhone || '',
      contactEmail: policy.contactEmail || '',
      notes: policy.notes || '',
      status: policy.status
    });
    setShowAddModal(true);
  };

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Please enter a valid insurance policy name.');
      return;
    }

    if (editingPolicy) {
      updateInsurancePolicy(editingPolicy.id, {
        clinicId: formData.clinicId,
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        category: formData.category,
        coveragePercentage: Number(formData.coveragePercentage) || 0,
        copayAmount: Number(formData.copayAmount) || 0,
        contactPhone: formData.contactPhone.trim() || undefined,
        contactEmail: formData.contactEmail.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        status: formData.status
      });
    } else {
      addInsurancePolicy({
        clinicId: formData.clinicId,
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        category: formData.category,
        coveragePercentage: Number(formData.coveragePercentage) || 0,
        copayAmount: Number(formData.copayAmount) || 0,
        contactPhone: formData.contactPhone.trim() || undefined,
        contactEmail: formData.contactEmail.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        status: formData.status
      });
    }

    setShowAddModal(false);
    setEditingPolicy(null);
  };

  const handleToggleStatus = (policy: InsurancePolicy) => {
    const newStatus = policy.status === 'active' ? 'inactive' : 'active';
    updateInsurancePolicy(policy.id, { status: newStatus });
  };

  const handleDelete = (id: string) => {
    deleteInsurancePolicy(id);
    setDeleteConfirmId(null);
  };

  // Helper to get clinic name
  const getClinicName = (clinicId: string) => {
    if (clinicId === 'all') return 'All Network Branches';
    const found = clinics.find(c => c.id === clinicId);
    return found ? found.name : clinicId;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-700/60 border border-emerald-500/40 text-emerald-100 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Multi-Branch Insurance & Tariffs Engine</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Available Insurance Policies & Schemes</h2>
            <p className="text-emerald-100/80 text-sm max-w-2xl mt-1">
              Add and configure accepted health insurance policies for each respective clinic facility. 
              Configured insurance schemes automatically populate the <strong>Patient Registration dropdown</strong> and 
              enable custom <strong>Insurance Selling Prices</strong> in the Store Management Dashboard.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-xs flex items-center gap-2 shadow transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Insurance Policy</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-emerald-700/50 text-xs">
          <div>
            <span className="text-emerald-300/80 block">Configured Schemes</span>
            <span className="text-lg font-bold text-white">{insurancePolicies.length} Policies</span>
          </div>
          <div>
            <span className="text-emerald-300/80 block">Active Schemes</span>
            <span className="text-lg font-bold text-white">
              {insurancePolicies.filter(p => p.status === 'active').length} Active
            </span>
          </div>
          <div>
            <span className="text-emerald-300/80 block">Active Facility</span>
            <span className="text-lg font-bold text-white truncate">{activeClinic.name}</span>
          </div>
          <div>
            <span className="text-emerald-300/80 block">Items with Custom Pricing</span>
            <span className="text-lg font-bold text-white">{itemsWithCustomPricingCount} SKUs</span>
          </div>
        </div>
      </div>

      {/* Quick Suggestions / Preset Chips */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Quick Setup Presets (Common Insurance Providers)
            </span>
          </div>
          <span className="text-[11px] text-slate-500">Click any provider to pre-fill for this facility</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {POPULAR_INSURANCE_PRESETS.map(preset => {
            const alreadyAdded = insurancePolicies.some(
              p =>
                p.name.toLowerCase() === preset.name.toLowerCase() &&
                (p.clinicId === selectedClinicFilter || p.clinicId === 'all')
            );

            return (
              <button
                key={preset.code}
                onClick={() => handleOpenAddModal(preset)}
                disabled={alreadyAdded}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  alreadyAdded
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-default'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300'
                }`}
                title={alreadyAdded ? 'Policy already exists for this clinic' : `Add ${preset.name}`}
              >
                <Plus className="w-3 h-3 text-emerald-600" />
                <span>{preset.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white border border-emerald-200 text-emerald-700">
                  {preset.coverage}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by policy name, code, or terms..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Clinic & Category Filter */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Clinic:</span>
            <select
              value={selectedClinicFilter}
              onChange={(e) => setSelectedClinicFilter(e.target.value)}
              className="p-1.5 border border-slate-200 rounded text-xs bg-white font-medium focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Clinics (Network-Wide)</option>
              {clinics.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Category:</span>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="p-1.5 border border-slate-200 rounded text-xs bg-white font-medium focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Categories</option>
              <option value="national">National Scheme</option>
              <option value="corporate">Corporate</option>
              <option value="private">Private / PPO</option>
              <option value="community">Community / NGO</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Insurance Policies Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              Registered Insurance Policies ({filteredPolicies.length})
            </h3>
            <p className="text-xs text-slate-500">
              Showing policies applicable for{' '}
              <span className="font-semibold text-slate-700">
                {selectedClinicFilter === 'all' ? 'All Clinics' : getClinicName(selectedClinicFilter)}
              </span>
            </p>
          </div>
          <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
            Active in Reception & Store
          </span>
        </div>

        {filteredPolicies.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium text-sm">No insurance policies found</p>
            <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
              No insurance schemes match your current search or clinic filter. Add a new policy or adjust your filters above.
            </p>
            <button
              onClick={() => handleOpenAddModal()}
              className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
            >
              Add First Insurance Policy
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Policy Name & Payer Code</th>
                  <th className="py-3 px-4">Respective Clinic Facility</th>
                  <th className="py-3 px-4">Category & Tariff</th>
                  <th className="py-3 px-4">Coverage & Copay</th>
                  <th className="py-3 px-4">Claims Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPolicies.map(policy => {
                  const clinicName = getClinicName(policy.clinicId);
                  const isNetworkWide = policy.clinicId === 'all';

                  return (
                    <tr key={policy.id} className="hover:bg-slate-50 transition-colors">
                      {/* Name & Code */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{policy.name}</span>
                          {policy.code && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                              {policy.code}
                            </span>
                          )}
                        </div>
                        {policy.notes && (
                          <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs line-clamp-1">
                            {policy.notes}
                          </p>
                        )}
                      </td>

                      {/* Respective Clinic */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                            isNetworkWide
                              ? 'bg-blue-50 border-blue-200 text-blue-800'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          }`}
                        >
                          <Building2 className="w-3 h-3" />
                          <span>{clinicName}</span>
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="capitalize font-medium text-slate-700 px-2 py-0.5 rounded bg-slate-100 text-[11px]">
                          {policy.category || 'corporate'}
                        </span>
                      </td>

                      {/* Coverage & Copay */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-slate-800 font-semibold">
                          <Percent className="w-3 h-3 text-emerald-600" />
                          <span>{policy.coveragePercentage ?? 100}% Coverage</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Copay: <strong className="text-slate-700">${policy.copayAmount ?? 0}</strong>
                        </div>
                      </td>

                      {/* Claims Contact */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5 text-[11px]">
                          {policy.contactPhone ? (
                            <div className="flex items-center gap-1 text-slate-600">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{policy.contactPhone}</span>
                            </div>
                          ) : null}
                          {policy.contactEmail ? (
                            <div className="flex items-center gap-1 text-slate-600">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[140px]">{policy.contactEmail}</span>
                            </div>
                          ) : null}
                          {!policy.contactPhone && !policy.contactEmail && (
                            <span className="text-slate-400 italic">No contact on file</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleStatus(policy)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase transition-colors cursor-pointer ${
                            policy.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-200 text-slate-600 border border-slate-300'
                          }`}
                          title="Click to toggle status"
                        >
                          {policy.status === 'active' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-500" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(policy)}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer"
                            title="Edit Policy"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmId(policy.id)}
                            className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Policy"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT POLICY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-base">
                  {editingPolicy ? 'Edit Insurance Policy' : 'Add Available Insurance Policy'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-emerald-200 hover:text-white text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePolicy} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Respective Clinic Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Respective Clinic Facility <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={formData.clinicId}
                    onChange={(e) => setFormData({ ...formData, clinicId: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  >
                    <option value={activeClinic.id}>
                      {activeClinic.name} ({activeClinic.code}) — Current Facility
                    </option>
                    <option value="all">🌐 All Clinics Network (Multi-Branch Universal Policy)</option>
                    {clinics
                      .filter(c => c.id !== activeClinic.id)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  This policy will be available in the registration dropdown for patients attending this specific clinic.
                </p>
              </div>

              {/* Insurance Policy Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Available Insurance Policy Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. NHIF / SHIF Standard, Jubilee Premier Health, Aetna Corporate PPO"
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              {/* Policy Code & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Policy Code / Payer ID
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. NHIF-001, JUB-CORP"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Scheme Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as InsurancePolicy['category']
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="national">National Scheme (e.g. NHIF/SHIF)</option>
                    <option value="corporate">Corporate Employer Plan</option>
                    <option value="private">Private Health Insurance</option>
                    <option value="community">Community / NGO / Cooperative</option>
                    <option value="other">Other / Custom Tariff</option>
                  </select>
                </div>
              </div>

              {/* Coverage % & Copay */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Standard Coverage Rate (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={formData.coveragePercentage}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          coveragePercentage: Number(e.target.value)
                        })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      %
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Standard Copay Amount ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.copayAmount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          copayAmount: Number(e.target.value)
                        })
                      }
                      className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Claims Contact Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Liaison Phone / Hot-line
                  </label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+254 700 000 000"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Claims / Pre-auth Email
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="claims@insurer.com"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Pre-auth & Special Billing Rules */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Billing Notes / Pre-Authorization Directives
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Smartcard biometric verification mandatory. Pharmacy ceiling is $200 per visit without prior approval."
                  rows={2}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Policy Status</label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.status === 'active'}
                      onChange={() => setFormData({ ...formData, status: 'active' })}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-emerald-800">
                      Active (Available for Patient Registration & Store Pricing)
                    </span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.status === 'inactive'}
                      onChange={() => setFormData({ ...formData, status: 'inactive' })}
                      className="text-slate-600 focus:ring-slate-500"
                    />
                    <span className="text-xs font-medium text-slate-600">Inactive / Suspended</span>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow cursor-pointer"
                >
                  {editingPolicy ? 'Update Policy' : 'Save & Make Available'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6" />
              <h4 className="font-bold text-sm">Remove Insurance Policy?</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove this insurance policy? Existing patient records will retain their history, but this policy will no longer appear in the registration dropdown.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
