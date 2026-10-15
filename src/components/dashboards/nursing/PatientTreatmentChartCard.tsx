import React, { useState, useMemo } from 'react';
import {
  Patient,
  ClinicalEncounter,
  PatientTreatmentChart,
  TreatmentChartItem,
  TreatmentDoseRecord,
  TreatmentDoseStatus,
  UnitAdminHistoryEntry
} from '../../../types';
import { useClinic } from '../../../context/ClinicContext';
import {
  parseClinicalOrdersToTreatmentItems,
  FREQUENCY_SCHEDULE_TIMES,
  FREQUENCY_OPTIONS,
  COMMON_ADMIN_ROUTES,
  calculateTotalDoses,
  evaluateDoseSchedule,
  getFrequencyIntervalHours
} from '../../../utils/treatmentChartUtils';
import {
  ClipboardCheck,
  CheckCircle2,
  Syringe,
  Pill,
  Plus,
  Clock,
  Printer,
  User,
  AlertCircle,
  FileText,
  Trash2,
  Check,
  Activity,
  HeartPulse,
  Thermometer,
  Sparkles,
  Info,
  RotateCcw,
  XCircle,
  Ban,
  Edit3,
  Search,
  Package,
  DollarSign,
  History,
  Zap,
  ShieldCheck,
  ChevronDown,
  ExternalLink,
  CheckSquare
} from 'lucide-react';
import { DigitalPatientCaseFile } from './DigitalPatientCaseFile';

interface PatientTreatmentChartCardProps {
  patient: Patient;
  latestEncounter?: ClinicalEncounter | null;
  onOpenCaseFile?: () => void;
}

type AdminTool = 'inspect_edit' | 'given' | 'refused' | 'skipped' | 'pending';

export const PatientTreatmentChartCard: React.FC<PatientTreatmentChartCardProps> = ({
  patient,
  latestEncounter,
  onOpenCaseFile
}) => {
  const {
    activeClinic,
    currentUser,
    currentClinicTreatmentCharts,
    currentClinicEncounters,
    populateTreatmentChartForPatient,
    administerTreatmentDose,
    administerAllRemainingTreatmentDoses,
    updateTreatmentChartItem,
    deleteTreatmentChartItem,
    addTreatmentItemToPatient,
    discontinueTreatmentItem,
    currentClinicInventory,
    getPatientLedger
  } = useClinic();

  // Active Tool mode for quick administration & editing (identical to Injection Room workflow)
  const [selectedTool, setSelectedTool] = useState<AdminTool>('inspect_edit');

  // Find existing treatment chart for this patient
  const chart: PatientTreatmentChart | undefined = currentClinicTreatmentCharts.find(
    c => c.patientId === patient.id
  );

  // Latest encounter with clinical plan
  const effectiveEncounter = latestEncounter || currentClinicEncounters.find(
    e => e.patientId === patient.id && e.clinicalPlan && e.clinicalPlan.trim().length > 0
  );

  // Modals state
  const [isPopulateModalOpen, setIsPopulateModalOpen] = useState(false);
  const [isCaseFileModalOpen, setIsCaseFileModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Dose Detail / Administration / History Modal
  const [activeDoseDetail, setActiveDoseDetail] = useState<{
    item: TreatmentChartItem;
    dose: TreatmentDoseRecord;
  } | null>(null);

  // Dose Edit Form state inside Active Dose Modal
  const [doseEditForm, setDoseEditForm] = useState<{
    targetStatus: TreatmentDoseStatus;
    reason: string;
    notes: string;
    route: string;
    bloodPressure: string;
    pulseRate: string;
    temperature: string;
    spO2: string;
  }>({
    targetStatus: 'given',
    reason: '',
    notes: '',
    route: 'IV',
    bloodPressure: '120/80',
    pulseRate: '72',
    temperature: '36.8',
    spO2: '99'
  });

  // Item Editing Modal
  const [editingItem, setEditingItem] = useState<TreatmentChartItem | null>(null);
  const [editingItemForm, setEditingItemForm] = useState<{
    medicationOrItemName: string;
    dosage: string;
    route: string;
    frequency: string;
    duration: string;
    quantityPerDose: number;
    totalQuantityToAdminister: number;
    instructions: string;
    inventoryItemId: string;
    unitPrice: number;
  }>({
    medicationOrItemName: '',
    dosage: '',
    route: 'IV',
    frequency: 'BD',
    duration: '3 days',
    quantityPerDose: 1,
    totalQuantityToAdminister: 6,
    instructions: '',
    inventoryItemId: '',
    unitPrice: 0
  });

  // Quick Refusal / Skip Prompt for single-click tool mode
  const [quickReasonPrompt, setQuickReasonPrompt] = useState<{
    item: TreatmentChartItem;
    dose: TreatmentDoseRecord;
    targetStatus: 'refused' | 'skipped';
  } | null>(null);
  const [quickReasonText, setQuickReasonText] = useState('');

  // Discontinue prompt
  const [discontinueTarget, setDiscontinueTarget] = useState<{
    itemId: string;
    itemName: string;
  } | null>(null);
  const [discontinueReason, setDiscontinueReason] = useState('');

  // Delete item confirm
  const [itemToDelete, setItemToDelete] = useState<TreatmentChartItem | null>(null);

  // Editable items state for the Population Modal
  const [draftItems, setDraftItems] = useState<Array<{
    medicationOrItemName: string;
    dosage: string;
    route: string;
    frequency: string;
    duration?: string;
    quantityPerDose: number;
    totalQuantityToAdminister: number;
    instructions?: string;
    category?: 'medication' | 'consumable' | 'fluid' | 'nursing_procedure' | string;
    unit?: string;
    inventoryItemId?: string;
    inventoryItemName?: string;
    unitPrice?: number;
    scheduledTimes?: string[];
    prescribedByDoctor?: string;
    prescribedAt?: string;
  }>>([]);

  // Calculate live patient ledger & billing status for IPD treatment doses
  const patientLedger = getPatientLedger(patient.id);
  const ipdLedgerItems = useMemo(() => {
    return (patientLedger?.items || []).filter(it =>
      it.id.startsWith('ipd-') ||
      Boolean(it.treatmentChartItemId) ||
      Boolean(it.treatmentChartId)
    );
  }, [patientLedger]);

  const billedGivenDosesCount = ipdLedgerItems.reduce((sum, it) => sum + (it.quantity || 1), 0);
  const billedGivenDosesTotalAmount = ipdLedgerItems.reduce((sum, it) => sum + (it.totalAmount || 0), 0);

  // Open the Population / Update Modal linking patient's case file and allowing adding or updating drugs
  const handleOpenPopulateModal = () => {
    const existingChartItems = chart?.items.filter(i => i.status !== 'discontinued') || [];
    let initialDrafts: any[] = [];

    if (effectiveEncounter?.clinicalPlan && existingChartItems.length === 0) {
      // First-time population: parse all orders from the doctor's case file
      const parsed = parseClinicalOrdersToTreatmentItems(effectiveEncounter.clinicalPlan);
      initialDrafts = parsed.map(item => {
        const matched = currentClinicInventory.find(i =>
          i.name.toLowerCase() === item.medicationOrItemName.toLowerCase() ||
          (i.genericName && item.medicationOrItemName.toLowerCase().includes(i.genericName.toLowerCase())) ||
          (item.medicationOrItemName.toLowerCase().includes(i.name.toLowerCase()))
        );
        return {
          ...item,
          inventoryItemId: matched?.id || '',
          unitPrice: matched?.sellingPrice ?? 0
        };
      });
    } else {
      // If chart already has items (or no plan), start with 1 ready row for adding another drug or consumable
      initialDrafts = [
        {
          medicationOrItemName: '',
          dosage: '',
          route: 'IV',
          frequency: 'BD',
          duration: '3 days',
          quantityPerDose: 1,
          totalQuantityToAdminister: 6,
          instructions: '',
          category: 'medication',
          inventoryItemId: '',
          unitPrice: 0
        }
      ];
    }

    setDraftItems(initialDrafts);
    setIsPopulateModalOpen(true);
  };

  // Helper to import doctor orders from case file into draft list
  const handleImportOrdersFromCaseFile = () => {
    if (!effectiveEncounter?.clinicalPlan) {
      alert('No clinical workplan or orders found in the patient’s doctor encounters.');
      return;
    }

    const parsed = parseClinicalOrdersToTreatmentItems(effectiveEncounter.clinicalPlan);
    const withInv = parsed.map(item => {
      const matched = currentClinicInventory.find(i =>
        i.name.toLowerCase() === item.medicationOrItemName.toLowerCase() ||
        (i.genericName && item.medicationOrItemName.toLowerCase().includes(i.genericName.toLowerCase())) ||
        (item.medicationOrItemName.toLowerCase().includes(i.name.toLowerCase()))
      );
      return {
        ...item,
        inventoryItemId: matched?.id || '',
        unitPrice: matched?.sellingPrice ?? 0
      };
    });

    // Append to draft items, removing empty placeholders
    const currentValid = draftItems.filter(i => i.medicationOrItemName.trim().length > 0);
    setDraftItems([...currentValid, ...withInv]);
  };

  // Submit Population / Update Form
  const handleConfirmPopulate = (e: React.FormEvent) => {
    e.preventDefault();
    const validDrafts = draftItems.filter(i => i.medicationOrItemName && i.medicationOrItemName.trim().length > 0);

    if (validDrafts.length === 0) {
      alert('Please provide at least one medication or consumable item name.');
      return;
    }

    const sanitizedDrafts = validDrafts.map(item => ({
      medicationOrItemName: item.medicationOrItemName,
      dosage: item.dosage || '1 unit',
      route: item.route || 'Oral',
      frequency: item.frequency || 'BD',
      duration: item.duration || '3 days',
      quantityPerDose: item.quantityPerDose || 1,
      unit: item.unit || 'units',
      totalQuantityToAdminister: item.totalQuantityToAdminister || 6,
      instructions: item.instructions || '',
      inventoryItemId: item.inventoryItemId || undefined,
      inventoryItemName: item.inventoryItemName || item.medicationOrItemName,
      unitPrice: item.unitPrice || 0,
      prescribedByDoctor: item.prescribedByDoctor || effectiveEncounter?.doctorName || 'Attending Doctor',
      prescribedAt: item.prescribedAt || new Date().toISOString(),
      status: 'active' as const,
      category: item.category,
      scheduledTimes: item.scheduledTimes
    }));

    if (!chart || chart.items.length === 0) {
      populateTreatmentChartForPatient(
        patient.id,
        effectiveEncounter?.id || `enc-${Date.now()}`,
        sanitizedDrafts
      );
    } else {
      // Add each new drug / consumable to the existing IPD checklist
      sanitizedDrafts.forEach(item => {
        addTreatmentItemToPatient(patient.id, item);
      });
    }

    setIsPopulateModalOpen(false);
  };

  // Open Edit Item Modal
  const handleOpenEditItem = (item: TreatmentChartItem) => {
    setEditingItem(item);
    setEditingItemForm({
      medicationOrItemName: item.medicationOrItemName,
      dosage: item.dosage || '',
      route: item.route || 'IV',
      frequency: item.frequency || 'BD',
      duration: item.duration || '3 days',
      quantityPerDose: item.quantityPerDose || 1,
      totalQuantityToAdminister: item.totalQuantityToAdminister || item.doses.length,
      instructions: item.instructions || '',
      inventoryItemId: item.inventoryItemId || '',
      unitPrice: item.unitPrice || 0
    });
  };

  // Save Edited Item
  const handleSaveEditedItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    updateTreatmentChartItem(patient.id, editingItem.id, {
      ...editingItemForm
    });

    setEditingItem(null);
  };

  // Handle Quick Dose Box Click
  const handleDoseClick = (item: TreatmentChartItem, dose: TreatmentDoseRecord) => {
    if (selectedTool === 'inspect_edit') {
      // Open detailed dose admin / inspection modal
      setActiveDoseDetail({ item, dose });
      setDoseEditForm({
        targetStatus: dose.status === 'pending' ? 'given' : dose.status,
        reason: dose.reason || '',
        notes: dose.notes || (dose.status === 'given' ? 'Administered per treatment checklist' : ''),
        route: dose.route || item.route || 'IV',
        bloodPressure: dose.vitals?.bloodPressure || '120/80',
        pulseRate: dose.vitals?.pulseRate ? String(dose.vitals.pulseRate) : '72',
        temperature: dose.vitals?.temperature ? String(dose.vitals.temperature) : '36.8',
        spO2: dose.vitals?.spO2 ? String(dose.vitals.spO2) : '99'
      });
    } else if (selectedTool === 'given') {
      if (dose.status === 'given') {
        // Already given, open inspect/edit
        setActiveDoseDetail({ item, dose });
        setDoseEditForm({
          targetStatus: 'given',
          reason: dose.reason || '',
          notes: dose.notes || '',
          route: dose.route || item.route || 'IV',
          bloodPressure: dose.vitals?.bloodPressure || '120/80',
          pulseRate: dose.vitals?.pulseRate ? String(dose.vitals.pulseRate) : '72',
          temperature: dose.vitals?.temperature ? String(dose.vitals.temperature) : '36.8',
          spO2: dose.vitals?.spO2 ? String(dose.vitals.spO2) : '99'
        });
      } else {
        // Direct stamp as Given: deducts stock & adds to ledger!
        administerTreatmentDose(
          patient.id,
          item.id,
          dose.doseNumber,
          'given',
          'Administered as scheduled per treatment chart checklist',
          item.route || 'IV',
          undefined,
          {
            bloodPressure: '120/80',
            pulseRate: 72,
            temperature: 36.8,
            spO2: 99
          }
        );
      }
    } else if (selectedTool === 'refused') {
      setQuickReasonPrompt({ item, dose, targetStatus: 'refused' });
      setQuickReasonText(dose.reason || 'Patient refused bedside dose');
    } else if (selectedTool === 'skipped') {
      setQuickReasonPrompt({ item, dose, targetStatus: 'skipped' });
      setQuickReasonText(dose.reason || 'Held due to clinical assessment / NPO');
    } else if (selectedTool === 'pending') {
      if (dose.status === 'pending') return;
      const confirmReset = window.confirm(
        `Reset Dose #${dose.doseNumber} of ${item.medicationOrItemName} back to PENDING?\n\nNote: If previously marked Given, the inventory item will be restored to stock, and this dose will be removed from the patient's billable ledger.`
      );
      if (confirmReset) {
        administerTreatmentDose(
          patient.id,
          item.id,
          dose.doseNumber,
          'pending',
          'Reset to pending by nurse',
          item.route,
          'Dose record reset to pending'
        );
      }
    }
  };

  // Submit Quick Reason Prompt
  const handleConfirmQuickReason = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickReasonPrompt) return;

    administerTreatmentDose(
      patient.id,
      quickReasonPrompt.item.id,
      quickReasonPrompt.dose.doseNumber,
      quickReasonPrompt.targetStatus,
      `Marked ${quickReasonPrompt.targetStatus.toUpperCase()}: ${quickReasonText.trim() || 'Clinical indication'}`,
      quickReasonPrompt.item.route,
      quickReasonText.trim() || `Marked as ${quickReasonPrompt.targetStatus}`
    );

    setQuickReasonPrompt(null);
    setQuickReasonText('');
  };

  // Submit Active Dose Detail Modal
  const handleSaveActiveDose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoseDetail) return;

    administerTreatmentDose(
      patient.id,
      activeDoseDetail.item.id,
      activeDoseDetail.dose.doseNumber,
      doseEditForm.targetStatus,
      doseEditForm.notes.trim() || (doseEditForm.targetStatus === 'given' ? 'Administered per checklist' : undefined),
      doseEditForm.route || activeDoseDetail.item.route,
      doseEditForm.reason.trim() || undefined,
      doseEditForm.targetStatus === 'given'
        ? {
            bloodPressure: doseEditForm.bloodPressure,
            pulseRate: Number(doseEditForm.pulseRate) || 72,
            temperature: Number(doseEditForm.temperature) || 36.8,
            spO2: Number(doseEditForm.spO2) || 99
          }
        : undefined
    );

    setActiveDoseDetail(null);
  };

  // Submit Discontinuation
  const handleConfirmDiscontinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discontinueTarget) return;

    discontinueTreatmentItem(
      patient.id,
      discontinueTarget.itemId,
      discontinueReason.trim() || 'Discontinued by attending clinical team'
    );

    setDiscontinueTarget(null);
    setDiscontinueReason('');
  };

  // Submit Delete Item
  const handleConfirmDeleteItem = () => {
    if (!itemToDelete) return;
    deleteTreatmentChartItem(patient.id, itemToDelete.id);
    setItemToDelete(null);
  };

  // Batch Administer All Remaining Doses
  const handleBatchAdministerRemaining = (item: TreatmentChartItem) => {
    const pendingCount = item.doses.filter(d => d.status === 'pending').length;
    if (pendingCount === 0) {
      alert('All doses for this item have already been administered or marked.');
      return;
    }

    const matchedInv = item.inventoryItemId
      ? currentClinicInventory.find(i => i.id === item.inventoryItemId)
      : currentClinicInventory.find(i => i.name.toLowerCase() === item.medicationOrItemName.toLowerCase());

    const unitPrice = item.unitPrice ?? matchedInv?.sellingPrice ?? 0;
    const totalCost = Number((pendingCount * (item.quantityPerDose || 1) * unitPrice).toFixed(2));

    const confirmed = window.confirm(
      `Mark all ${pendingCount} remaining pending doses of "${item.medicationOrItemName}" as GIVEN?\n\n• Deducts: ${pendingCount * (item.quantityPerDose || 1)} ${item.unit || 'units'} from Main Inventory (${matchedInv ? matchedInv.name : 'Matched Item'})\n• Bills to Ledger: $${totalCost.toFixed(2)} (${pendingCount} doses)\n• Administering Nurse: ${currentUser.name}`
    );

    if (confirmed) {
      administerAllRemainingTreatmentDoses(patient.id, item.id);
    }
  };

  const chartItems = chart?.items || [];
  const activeItems = chartItems.filter(i => i.status !== 'discontinued');

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-purple-500/30 border border-purple-400/40 rounded-lg text-purple-200">
                <ClipboardCheck className="w-5 h-5 text-purple-200" />
              </span>
              <h3 className="font-bold text-sm sm:text-base tracking-tight text-white flex items-center gap-2">
                Inpatient Checklist Treatment Chart & MAR
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-400/20 text-purple-200 border border-purple-300/30 uppercase">
                  IPD Ward
                </span>
              </h3>
            </div>
            <p className="text-purple-200 text-xs max-w-2xl leading-relaxed">
              Inpatient clinical orders and doctor workplans are routed directly here. Nurses populate and administer scheduled drug doses, record vitals per administration, and maintain bedside treatment checklists.
            </p>
          </div>

          {/* Action Buttons - Cleaned to ONLY TWO BUTTONS */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenPopulateModal}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Populate or Update Treatment Chart</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenCaseFile) {
                  onOpenCaseFile();
                } else {
                  setIsCaseFileModalOpen(true);
                }
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>digital patient case file</span>
            </button>
          </div>
        </div>

        {/* Patient Sub-bar */}
        <div className="mt-3 pt-3 border-t border-purple-800/60 flex flex-wrap items-center justify-between text-xs text-purple-200 gap-y-1">
          <div className="flex flex-wrap items-center gap-4">
            <span>
              Patient: <strong className="text-white">{patient.firstName} {patient.lastName}</strong> ({patient.mrn})
            </span>
            <span>
              Ward: <strong className="text-white">{patient.ward || 'General IPD'}</strong> &bull; Bed: <strong className="text-white">{patient.bedNumber || 'Unassigned'}</strong>
            </span>
            {chart?.doctorName && (
              <span>
                Attending: <strong className="text-white">Dr. {chart.doctorName}</strong>
              </span>
            )}
          </div>
          <div className="text-[11px] text-purple-300">
            {chart ? `Last updated: ${new Date(chart.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by ${chart.updatedBy}` : 'No active chart populated yet'}
          </div>
        </div>
      </div>

      {/* Integration Status & Billing Sync Banner */}
      <div className="bg-slate-900 text-slate-100 rounded-xl p-3.5 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <DollarSign className="w-4 h-4" />
            </span>
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                Bedside MAR Billing Integration
                <span className="px-1.5 py-0.2 bg-emerald-500/30 text-emerald-300 text-[10px] rounded font-bold">
                  Active
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Only doses marked <strong className="text-emerald-400">GIVEN</strong> are added to patient billable items & ledger.
              </div>
            </div>
          </div>

          <div className="hidden lg:block h-6 w-px bg-slate-800" />

          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Package className="w-4 h-4" />
            </span>
            <div>
              <div className="font-bold text-white">Main Inventory Auto-Deduction</div>
              <div className="text-[11px] text-slate-400">
                Marking Given deducts stock. Resetting or holding restores stock automatically.
              </div>
            </div>
          </div>
        </div>

        {/* Live Patient Ledger Stats for IPD Doses */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
          <div className="text-slate-400 text-[11px]">Ledger Reflects:</div>
          <div className="font-bold text-emerald-400">
            {billedGivenDosesCount} Given {billedGivenDosesCount === 1 ? 'Unit' : 'Units'}
          </div>
          <span className="text-slate-600">&bull;</span>
          <div className="font-bold text-white">
            ${billedGivenDosesTotalAmount.toFixed(2)} Total
          </div>
        </div>
      </div>

      {/* Interactive Status Key & Quick Action Toolbar (Mirrors Injection Room Unit Administration) */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <CheckSquare className="w-4 h-4 text-purple-700" /> Mode:
            </span>
            <span className="text-slate-500 text-[11px]">
              Select a tool mode, then click any dose tile to apply or inspect:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedTool('inspect_edit')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                selectedTool === 'inspect_edit'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Inspect / Edit & History
            </button>

            <button
              type="button"
              onClick={() => setSelectedTool('given')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                selectedTool === 'given'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              [✓] Mark Given
            </button>

            <button
              type="button"
              onClick={() => setSelectedTool('refused')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                selectedTool === 'refused'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              [✗] Refused
            </button>

            <button
              type="button"
              onClick={() => setSelectedTool('skipped')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                selectedTool === 'skipped'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              [⊘] Skipped / Held
            </button>

            <button
              type="button"
              onClick={() => setSelectedTool('pending')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                selectedTool === 'pending'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              [↺] Reset to Pending
            </button>
          </div>
        </div>
      </div>

      {/* Main Treatment Chart Checklist Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-purple-700" />
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
              Inpatient Medication & Treatment Administration Checklist ({activeItems.length} Items)
            </h4>
          </div>

          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="flex items-center gap-1 text-slate-600 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Given (Billed)
            </span>
            <span className="flex items-center gap-1 text-slate-600 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Due Now (MAR)
            </span>
            <span className="flex items-center gap-1 text-slate-600 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> Scheduled / Future Dose
            </span>
            <span className="flex items-center gap-1 text-slate-600 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Refused ($0.00)
            </span>
            <span className="flex items-center gap-1 text-slate-600 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" /> Skipped / Held ($0.00)
            </span>
          </div>
        </div>

        {activeItems.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h5 className="font-bold text-slate-800 text-xs">No Treatment Items on Checklist Yet</h5>
              <p className="text-slate-500 text-[11px] max-w-md mx-auto">
                Doctor's clinical plan can be populated automatically, or you can add items manually to start tracking bedside doses.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenPopulateModal}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" /> Populate or Update Treatment Chart
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {activeItems.map((item, idx) => {
              const totalDoses = item.doses.length;
              const givenDoses = item.doses.filter(d => d.status === 'given').length;
              const pendingDoses = item.doses.filter(d => d.status === 'pending').length;
              const percent = totalDoses > 0 ? Math.round((givenDoses / totalDoses) * 100) : 0;

              // Matched inventory item
              const matchedInv = item.inventoryItemId
                ? currentClinicInventory.find(i => i.id === item.inventoryItemId)
                : currentClinicInventory.find(i => i.name.toLowerCase() === item.medicationOrItemName.toLowerCase());

              const currentStock = matchedInv ? matchedInv.totalQuantity : null;
              const isStockLow = currentStock !== null && currentStock < 5;
              const isOutOfStock = currentStock !== null && currentStock <= 0;
              const unitPrice = item.unitPrice ?? matchedInv?.sellingPrice ?? 0;

              return (
                <div key={item.id} className="p-4 hover:bg-slate-50/70 transition-colors space-y-3">
                  {/* Top Line: Name, Dosage, Route, Inventory Link, Actions */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {idx + 1}. {item.medicationOrItemName}
                        </span>
                        {item.dosage && (
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200">
                            {item.dosage}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px] uppercase border border-purple-200">
                          Route: {item.route}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          {item.frequency} &bull; {item.duration || 'IPD Stay'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                          {item.quantityPerDose || 1} unit{(item.quantityPerDose || 1) > 1 ? 's' : ''}/dose
                        </span>

                        {/* Linked Main Inventory Badge */}
                        {matchedInv ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                            isOutOfStock
                              ? 'bg-rose-50 text-rose-700 border-rose-300'
                              : isStockLow
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}>
                            <Package className="w-3 h-3" />
                            Inv: {matchedInv.name} ({currentStock} in stock)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
                            <Package className="w-3 h-3 text-slate-400" />
                            No Inventory Link
                          </span>
                        )}
                      </div>

                      {item.instructions && (
                        <p className="text-[11px] text-slate-500 italic">
                          Instructions: {item.instructions}
                        </p>
                      )}
                    </div>

                    {/* Progress Bar & Item Actions Toolbar */}
                    <div className="flex flex-wrap items-center gap-3 self-end lg:self-auto">
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 justify-end">
                          <span>{givenDoses} / {totalDoses} Doses Given</span>
                          <span className="text-[10px] text-emerald-600 font-bold">
                            (${Number(givenDoses * (item.quantityPerDose || 1) * unitPrice).toFixed(2)} billed)
                          </span>
                        </div>
                        <div className="w-32 bg-slate-200 rounded-full h-2 mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              percent === 100 ? 'bg-emerald-500' : 'bg-purple-600'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Quick Item Action Buttons */}
                      <div className="flex items-center gap-1">
                        {pendingDoses > 0 && (
                          <button
                            type="button"
                            onClick={() => handleBatchAdministerRemaining(item)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                            title="Administer all remaining pending doses at once"
                          >
                            <Zap className="w-3 h-3 text-emerald-600" />
                            Admin All ({pendingDoses})
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenEditItem(item)}
                          className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors cursor-pointer"
                          title="Edit Checklist Item & Schedule"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDiscontinueTarget({ itemId: item.id, itemName: item.medicationOrItemName })}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                          title="Discontinue Treatment Item"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Delete from Checklist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Checklist of Doses Grid */}
                  <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200 space-y-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Dose Administration Schedule & Nursing Sign-off
                      </span>
                      <span className="text-slate-400 font-normal">
                        Active Tool: <strong className="text-purple-700 uppercase">{selectedTool.replace('_', ' ')}</strong>
                      </span>
                    </div>

                    {/* Next Dose Calculation Banner */}
                    {(() => {
                      const nextPendingDose = item.doses.find(d => d.status === 'pending');
                      const nextDoseEval = nextPendingDose 
                        ? evaluateDoseSchedule(item, nextPendingDose, item.doses, chart?.createdAt) 
                        : null;
                      const intervalHours = getFrequencyIntervalHours(item.frequency);

                      if (!nextDoseEval) return null;

                      return (
                        <div className={`px-3 py-2 rounded-lg text-xs flex flex-wrap items-center justify-between gap-2 border ${
                          nextDoseEval.isDue
                            ? 'bg-amber-50/90 border-amber-300 text-amber-950 font-semibold shadow-2xs'
                            : 'bg-indigo-50/70 border-indigo-200 text-indigo-950 font-medium'
                        }`}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Clock className={`w-4 h-4 shrink-0 ${nextDoseEval.isDue ? 'text-amber-600' : 'text-indigo-600'}`} />
                            <span>
                              Next Dose: <strong>Dose #{nextPendingDose!.doseNumber}</strong> &bull; Target Time: <strong className="font-mono">{nextDoseEval.calculatedTargetTime}</strong> ({nextDoseEval.timeRemainingText})
                            </span>
                            <span className="text-[11px] opacity-75">
                              &bull; Frequency: <strong>{item.frequency}</strong> (every {intervalHours}h)
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                            nextDoseEval.isDue
                              ? 'bg-amber-200 text-amber-950 border border-amber-400 animate-pulse'
                              : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                          }`}>
                            {nextDoseEval.isDue ? (nextDoseEval.isOverdue ? 'Overdue for Admin' : 'Due for Administration') : 'Scheduled per Frequency'}
                          </span>
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {item.doses.map(dose => {
                        const status = dose.status || 'pending';
                        const isGiven = status === 'given';
                        const isRefused = status === 'refused';
                        const isSkipped = status === 'skipped';
                        const isPending = status === 'pending';
                        const scheduleEval = evaluateDoseSchedule(item, dose, item.doses, chart?.createdAt);

                        return (
                          <div
                            key={dose.id}
                            className={`rounded-lg p-2.5 text-xs border transition-all select-none cursor-pointer ${
                              isGiven
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-2xs hover:border-emerald-400'
                                : isRefused
                                ? 'bg-rose-50 border-rose-300 text-rose-950 hover:border-rose-400'
                                : isSkipped
                                ? 'bg-amber-50 border-amber-300 text-amber-950 hover:border-amber-400'
                                : scheduleEval.isDue
                                ? 'bg-amber-50/70 border-amber-300 text-slate-900 hover:border-amber-400 shadow-2xs ring-1 ring-amber-300'
                                : 'bg-white border-dashed border-slate-300 text-slate-600 hover:border-purple-400 hover:shadow-xs'
                            }`}
                            onClick={() => handleDoseClick(item, dose)}
                            title={`Click to apply active tool or edit Dose #${dose.doseNumber}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-[11px]">
                                Dose #{dose.doseNumber}
                              </span>

                              {isGiven && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-600 text-white flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" /> Given
                                </span>
                              )}
                              {isRefused && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-600 text-white flex items-center gap-0.5">
                                  <XCircle className="w-2.5 h-2.5" /> Refused
                                </span>
                              )}
                              {isSkipped && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-600 text-white flex items-center gap-0.5">
                                  <Ban className="w-2.5 h-2.5" /> Held
                                </span>
                              )}
                              {isPending && (
                                <span className={`px-1.5 py-0.2 rounded text-[9px] ${scheduleEval.badgeColorClass}`}>
                                  {scheduleEval.statusLabel === 'Due' ? 'Due' : (scheduleEval.isNextDose ? 'Next Dose' : 'Scheduled')}
                                </span>
                              )}
                            </div>

                            <div className="text-[10px] font-mono text-slate-600 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-slate-400" />
                              <span>{scheduleEval.isNextDose ? scheduleEval.calculatedTargetTime : (dose.scheduledTime || `Slot ${dose.doseNumber}`)}</span>
                            </div>

                            {/* Details based on status */}
                            {isGiven && (
                              <div className="mt-1.5 pt-1.5 border-t border-emerald-200 text-[10px] text-emerald-800 space-y-0.5">
                                <div className="font-semibold truncate">
                                  By: {dose.administeredBy || 'Nurse'}
                                </div>
                                {dose.administeredAt && (
                                  <div className="text-[9px] text-emerald-600">
                                    {new Date(dose.administeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                                {dose.vitals && (
                                  <div className="text-[9px] text-emerald-700 font-mono">
                                    BP {dose.vitals.bloodPressure} &bull; HR {dose.vitals.pulseRate}
                                  </div>
                                )}
                              </div>
                            )}

                            {(isRefused || isSkipped) && (
                              <div className="mt-1.5 pt-1.5 border-t border-slate-200 text-[10px] space-y-0.5">
                                <div className="font-semibold text-slate-700 truncate">
                                  By: {dose.administeredBy || 'Nurse'}
                                </div>
                                {dose.reason && (
                                  <div className="text-[9px] italic text-slate-500 truncate" title={dose.reason}>
                                    "{dose.reason}"
                                  </div>
                                )}
                              </div>
                            )}

                            {isPending && (
                              <div className={`mt-1.5 pt-1.5 border-t border-dashed text-[10px] flex items-center justify-between ${
                                scheduleEval.isDue ? 'border-amber-300 text-amber-800 font-medium' : 'border-slate-200 text-slate-400'
                              }`}>
                                <span className={scheduleEval.isDue ? 'font-bold text-amber-800' : 'text-slate-500'}>
                                  {scheduleEval.isNextDose ? scheduleEval.timeRemainingText : 'Scheduled'}
                                </span>
                                <span className="text-[9px] text-purple-600 font-semibold hover:underline">
                                  {selectedTool === 'inspect_edit' ? 'Edit' : 'Apply'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: DOSE INSPECTION, EDITING & AUDIT HISTORY */}
      {/* ========================================================================= */}
      {activeDoseDetail && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveDoseDetail(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 space-y-4 text-xs text-slate-900 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-purple-100 text-purple-800 rounded-lg">
                  <Syringe className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Dose Administration & MAR Checklist Editor
                  </h4>
                  <div className="text-[11px] text-slate-500">
                    Dose #{activeDoseDetail.dose.doseNumber} &bull; {activeDoseDetail.item.medicationOrItemName}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDoseDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveActiveDose} className="space-y-4">
              {/* Target Status Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Administration Status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setDoseEditForm({ ...doseEditForm, targetStatus: 'given' })}
                    className={`p-2 rounded-lg text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      doseEditForm.targetStatus === 'given'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Given
                  </button>

                  <button
                    type="button"
                    onClick={() => setDoseEditForm({ ...doseEditForm, targetStatus: 'refused' })}
                    className={`p-2 rounded-lg text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      doseEditForm.targetStatus === 'refused'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Refused
                  </button>

                  <button
                    type="button"
                    onClick={() => setDoseEditForm({ ...doseEditForm, targetStatus: 'skipped' })}
                    className={`p-2 rounded-lg text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      doseEditForm.targetStatus === 'skipped'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Skipped / Held
                  </button>

                  <button
                    type="button"
                    onClick={() => setDoseEditForm({ ...doseEditForm, targetStatus: 'pending' })}
                    className={`p-2 rounded-lg text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      doseEditForm.targetStatus === 'pending'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Pending (Reset)
                  </button>
                </div>
              </div>

              {/* Status Explanation Banner */}
              <div className="p-2.5 rounded-lg border text-[11px] leading-relaxed bg-slate-50 border-slate-200">
                {doseEditForm.targetStatus === 'given' && (
                  <div className="text-emerald-800">
                    <strong>✓ GIVEN:</strong> Deducts 1 dose ({activeDoseDetail.item.quantityPerDose || 1} {activeDoseDetail.item.unit || 'units'}) from Main Inventory and creates a billable line item on the patient's ledger.
                  </div>
                )}
                {doseEditForm.targetStatus === 'refused' && (
                  <div className="text-rose-800">
                    <strong>✗ REFUSED:</strong> Patient declined medication. No inventory deducted. Incurs $0.00 on patient ledger.
                  </div>
                )}
                {doseEditForm.targetStatus === 'skipped' && (
                  <div className="text-amber-800">
                    <strong>⊘ SKIPPED / HELD:</strong> Held for clinical reasons (e.g. NPO, adverse signs). No inventory deducted. Incurs $0.00 on patient ledger.
                  </div>
                )}
                {doseEditForm.targetStatus === 'pending' && (
                  <div className="text-indigo-800">
                    <strong>↺ PENDING:</strong> Resets status. If previously marked Given, stock is restored to Main Inventory and charge is removed from the ledger.
                  </div>
                )}
              </div>

              {/* Refusal / Skip Reason (Shown if refused or skipped) */}
              {(doseEditForm.targetStatus === 'refused' || doseEditForm.targetStatus === 'skipped') && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Clinical Reason for {doseEditForm.targetStatus.toUpperCase()}
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {['Patient Refused', 'NPO / Fasting', 'Patient Sleeping', 'Drug Unavailable', 'Physician Hold', 'Adverse Reaction', 'Route Unavailable'].map(quickR => (
                      <button
                        key={quickR}
                        type="button"
                        onClick={() => setDoseEditForm({ ...doseEditForm, reason: quickR })}
                        className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] cursor-pointer"
                      >
                        {quickR}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    required
                    value={doseEditForm.reason}
                    onChange={(e) => setDoseEditForm({ ...doseEditForm, reason: e.target.value })}
                    placeholder="Enter explicit reason..."
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              )}

              {/* Vitals Form (Shown if Given) */}
              {doseEditForm.targetStatus === 'given' && (
                <div className="space-y-2 bg-emerald-50/50 p-3 rounded-lg border border-emerald-200">
                  <div className="font-bold text-emerald-950 text-[11px] flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-700" />
                    Bedside Pre-Administration Vitals
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Blood Pressure</label>
                      <input
                        type="text"
                        value={doseEditForm.bloodPressure}
                        onChange={(e) => setDoseEditForm({ ...doseEditForm, bloodPressure: e.target.value })}
                        placeholder="120/80"
                        className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Pulse Rate (bpm)</label>
                      <input
                        type="number"
                        value={doseEditForm.pulseRate}
                        onChange={(e) => setDoseEditForm({ ...doseEditForm, pulseRate: e.target.value })}
                        placeholder="72"
                        className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Temp (°C)</label>
                      <input
                        type="text"
                        value={doseEditForm.temperature}
                        onChange={(e) => setDoseEditForm({ ...doseEditForm, temperature: e.target.value })}
                        placeholder="36.8"
                        className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">SpO2 (%)</label>
                      <input
                        type="number"
                        value={doseEditForm.spO2}
                        onChange={(e) => setDoseEditForm({ ...doseEditForm, spO2: e.target.value })}
                        placeholder="99"
                        className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Route & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Route</label>
                  <select
                    value={doseEditForm.route}
                    onChange={(e) => setDoseEditForm({ ...doseEditForm, route: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  >
                    {COMMON_ADMIN_ROUTES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Clinical Notes & Site</label>
                  <input
                    type="text"
                    value={doseEditForm.notes}
                    onChange={(e) => setDoseEditForm({ ...doseEditForm, notes: e.target.value })}
                    placeholder="e.g. Left arm IV cannula, well tolerated"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Revision / Audit History for this Dose */}
              {activeDoseDetail.dose.history && activeDoseDetail.dose.history.length > 0 && (
                <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
                  <div className="font-bold text-slate-700 text-[11px] flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-purple-700" />
                    Checklist Revision & Administration History ({activeDoseDetail.dose.history.length})
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {activeDoseDetail.dose.history.map((hist, hIdx) => (
                      <div key={hist.id || hIdx} className="text-[10px] p-1.5 rounded bg-white border border-slate-200">
                        <div className="flex items-center justify-between text-slate-500">
                          <span>{new Date(hist.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(hist.timestamp).toLocaleDateString()}</span>
                          <span className="font-semibold text-slate-800">{hist.user}</span>
                        </div>
                        <div className="font-bold mt-0.5">
                          <span className="uppercase text-slate-500">{hist.previousStatus || 'PENDING'}</span>
                          <span className="text-slate-400 mx-1">➔</span>
                          <span className={`uppercase font-bold ${
                            hist.newStatus === 'given' ? 'text-emerald-700' : hist.newStatus === 'refused' ? 'text-rose-700' : 'text-amber-700'
                          }`}>
                            {hist.newStatus}
                          </span>
                        </div>
                        {hist.reason && <div className="text-slate-600 italic">Reason: {hist.reason}</div>}
                        {hist.notes && <div className="text-slate-500">Note: {hist.notes}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveDoseDetail(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Save Administration Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: QUICK REFUSAL / SKIP REASON PROMPT */}
      {/* ========================================================================= */}
      {quickReasonPrompt && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setQuickReasonPrompt(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-3 text-xs cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                {quickReasonPrompt.targetStatus === 'refused' ? (
                  <span className="text-rose-600 flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> Record Dose Refusal
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center gap-1">
                    <Ban className="w-4 h-4" /> Record Skipped / Held Dose
                  </span>
                )}
              </h4>
              <button
                type="button"
                onClick={() => setQuickReasonPrompt(null)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>
            <p className="text-slate-600">
              Dose #{quickReasonPrompt.dose.doseNumber} of <strong>{quickReasonPrompt.item.medicationOrItemName}</strong>
            </p>

            <form onSubmit={handleConfirmQuickReason} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Reason for {quickReasonPrompt.targetStatus.toUpperCase()}
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {['Patient Refused', 'NPO / Fasting', 'Patient Sleeping', 'Drug Unavailable', 'Physician Hold', 'Adverse Reaction'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setQuickReasonText(r)}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] cursor-pointer"
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  value={quickReasonText}
                  onChange={(e) => setQuickReasonText(e.target.value)}
                  placeholder="Enter reason..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickReasonPrompt(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-3 py-1.5 text-white rounded-lg font-bold transition-all cursor-pointer ${
                    quickReasonPrompt.targetStatus === 'refused' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  Confirm {quickReasonPrompt.targetStatus.toUpperCase()}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT CHECKLIST ITEM & INVENTORY LINK */}
      {/* ========================================================================= */}
      {editingItem && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingItem(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 space-y-4 text-xs text-slate-900 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-purple-100 text-purple-800 rounded-lg">
                  <Edit3 className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Edit Checklist Item & Schedule
                  </h4>
                  <div className="text-[11px] text-slate-500">
                    Update inventory item linkage, doses count, or schedule
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedItem} className="space-y-3">
              {/* Linked Main Inventory Item */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Linked Main Inventory Stock Item
                </label>
                <select
                  value={editingItemForm.inventoryItemId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const inv = currentClinicInventory.find(i => i.id === selId);
                    setEditingItemForm(prev => ({
                      ...prev,
                      inventoryItemId: selId,
                      medicationOrItemName: inv ? inv.name : prev.medicationOrItemName,
                      unitPrice: inv ? (inv.sellingPrice ?? 0) : prev.unitPrice
                    }));
                  }}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">-- Select Inventory Item to Link --</option>
                  {currentClinicInventory.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.name} (Stock: {inv.totalQuantity} {inv.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Medication / Item Name</label>
                  <input
                    type="text"
                    required
                    value={editingItemForm.medicationOrItemName}
                    onChange={(e) => setEditingItemForm({ ...editingItemForm, medicationOrItemName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Dosage</label>
                  <input
                    type="text"
                    value={editingItemForm.dosage}
                    onChange={(e) => setEditingItemForm({ ...editingItemForm, dosage: e.target.value })}
                    placeholder="e.g. 1g, 500mg, 1 amp"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Route</label>
                  <select
                    value={editingItemForm.route}
                    onChange={(e) => setEditingItemForm({ ...editingItemForm, route: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  >
                    {COMMON_ADMIN_ROUTES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Frequency</label>
                  <select
                    value={editingItemForm.frequency}
                    onChange={(e) => {
                      const newFreq = e.target.value as any;
                      const calculatedDoses = calculateTotalDoses(newFreq, editingItemForm.duration);
                      setEditingItemForm({
                        ...editingItemForm,
                        frequency: newFreq,
                        totalQuantityToAdminister: calculatedDoses
                      });
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  >
                    {FREQUENCY_OPTIONS.map(f => (
                      <option key={f.code} value={f.code}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Duration</label>
                  <input
                    type="text"
                    value={editingItemForm.duration}
                    onChange={(e) => {
                      const newDur = e.target.value;
                      const calculatedDoses = calculateTotalDoses(editingItemForm.frequency, newDur);
                      setEditingItemForm({
                        ...editingItemForm,
                        duration: newDur,
                        totalQuantityToAdminister: calculatedDoses
                      });
                    }}
                    placeholder="3 days"
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Number of Units per Dose</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editingItemForm.quantityPerDose}
                    onChange={(e) => setEditingItemForm({ ...editingItemForm, quantityPerDose: Number(e.target.value) || 1 })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Total Doses</label>
                  <input
                    type="number"
                    min="1"
                    value={editingItemForm.totalQuantityToAdminister}
                    onChange={(e) => setEditingItemForm({ ...editingItemForm, totalQuantityToAdminister: Number(e.target.value) || 1 })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-purple-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Special Instructions</label>
                <input
                  type="text"
                  value={editingItemForm.instructions}
                  onChange={(e) => setEditingItemForm({ ...editingItemForm, instructions: e.target.value })}
                  placeholder="e.g. Infuse in 100ml Normal Saline over 30 mins"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Save Item Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: POPULATE OR UPDATE TREATMENT CHART */}
      {/* ========================================================================= */}
      {isPopulateModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsPopulateModalOpen(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full p-6 space-y-5 text-xs text-slate-900 my-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-bold text-slate-900 text-base">
                    Populate or Update Treatment Chart
                  </h4>
                  <div className="text-xs text-slate-500">
                    Linked to IPD patient's case file &bull; Add another drug to administer or update checklist
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPopulateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Linked IPD Patient Case File Banner */}
            <div className="p-3.5 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 rounded-xl border border-indigo-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-700" />
                  <span className="font-bold text-indigo-950 text-xs">
                    Linked IPD Patient File: {patient.firstName} {patient.lastName} ({patient.mrn})
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-200 text-indigo-900">
                    Ward: {patient.ward || 'General IPD'} &bull; Bed: {patient.bedNumber || 'Unassigned'}
                  </span>
                </div>
                {effectiveEncounter?.doctorName && (
                  <span className="text-[11px] text-indigo-900 font-semibold">
                    Attending: Dr. {effectiveEncounter.doctorName} ({effectiveEncounter.visitDate})
                  </span>
                )}
              </div>

              {effectiveEncounter?.workingDiagnosis && (
                <div className="text-xs text-indigo-900">
                  Diagnosis: <strong className="text-indigo-950">{effectiveEncounter.workingDiagnosis}</strong>
                </div>
              )}

              {effectiveEncounter?.clinicalPlan ? (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-950">
                      Doctor's Clinical Orders on File:
                    </span>
                    <button
                      type="button"
                      onClick={handleImportOrdersFromCaseFile}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      Import / Re-sync Orders from File
                    </button>
                  </div>
                  <div className="p-2.5 bg-white/90 rounded-lg border border-indigo-100 font-mono text-[11px] text-slate-800 whitespace-pre-wrap leading-relaxed max-h-28 overflow-y-auto">
                    {effectiveEncounter.clinicalPlan}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-indigo-700 italic">
                  No written orders found in the latest encounter note. You can add drugs manually and link to Main Inventory stock below.
                </div>
              )}
            </div>

            {/* Existing Active Chart Items (if any) */}
            {activeItems.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <ClipboardCheck className="w-4 h-4 text-purple-600" />
                    Currently Active Drugs on Chart ({activeItems.length})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    To modify dosage or schedule, click Edit
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto divide-y divide-slate-200 bg-white rounded-lg border border-slate-200">
                  {activeItems.map((ai) => {
                    const givenCount = ai.doses.filter(d => d.status === 'given').length;
                    return (
                      <div key={ai.id} className="p-2 flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                            {ai.medicationOrItemName}
                            <span className="text-[10px] text-slate-500 font-normal">
                              ({ai.dosage} &bull; {ai.route} &bull; {ai.frequency})
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Progress: {givenCount}/{ai.totalQuantityToAdminister || ai.doses.length} doses given &bull; {ai.quantityPerDose || 1} unit{(ai.quantityPerDose || 1) > 1 ? 's' : ''} per dose
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setIsPopulateModalOpen(false);
                              handleOpenEditItem(ai);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsPopulateModalOpen(false);
                              setDiscontinueTarget({ itemId: ai.id, itemName: ai.medicationOrItemName });
                            }}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Ban className="w-3 h-3" /> Discontinue
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Drugs to Add or Update Form */}
            <form onSubmit={handleConfirmPopulate} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-emerald-600" />
                    {activeItems.length > 0 ? 'Add Another Drug / Consumable to Administer' : 'Drugs to Administer from Orders / Inventory'}
                  </h5>
                  <span className="text-[11px] text-slate-500">
                    Linked items deduct from Main Inventory and bill on patient ledger ONLY when marked given
                  </span>
                </div>

                <div className="space-y-3 max-h-[44vh] overflow-y-auto pr-1">
                  {draftItems.map((item, dIdx) => (
                    <div key={dIdx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-[10px] font-bold">
                            {dIdx + 1}
                          </span>
                          Drug / Consumable #{dIdx + 1}
                        </span>
                        {draftItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setDraftItems(draftItems.filter((_, i) => i !== dIdx))}
                            className="text-rose-600 hover:text-rose-700 text-xs font-semibold cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Remove Row
                          </button>
                        )}
                      </div>

                      {/* Main Inventory Stock Link */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-700 mb-1">
                            Link to Main Inventory Stock Item
                          </label>
                          <select
                            value={item.inventoryItemId || ''}
                            onChange={(e) => {
                              const invId = e.target.value;
                              const matched = currentClinicInventory.find(i => i.id === invId);
                              setDraftItems(draftItems.map((it, idx) => idx === dIdx ? {
                                ...it,
                                inventoryItemId: invId,
                                medicationOrItemName: matched ? matched.name : it.medicationOrItemName,
                                unitPrice: matched ? (matched.sellingPrice ?? 0) : it.unitPrice
                              } : it));
                            }}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                          >
                            <option value="">-- Match or Select Main Inventory Item --</option>
                            {currentClinicInventory.map(inv => (
                              <option key={inv.id} value={inv.id}>
                                {inv.name} (Stock: {inv.totalQuantity} {inv.unit || 'units'})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-1">Number of Units per Dose</label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantityPerDose || 1}
                            onChange={(e) => {
                              const q = Math.max(1, parseInt(e.target.value, 10) || 1);
                              setDraftItems(draftItems.map((it, idx) => idx === dIdx ? { ...it, quantityPerDose: q } : it));
                            }}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white font-semibold text-slate-800"
                          />
                        </div>
                      </div>

                      {/* Medication Name, Dosage, Route */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Medication / Item Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Inj. Ceftriaxone 1g"
                            value={item.medicationOrItemName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraftItems(draftItems.map((it, idx) => idx === dIdx ? { ...it, medicationOrItemName: val } : it));
                            }}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Dosage</label>
                          <input
                            type="text"
                            placeholder="e.g. 1g"
                            value={item.dosage}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraftItems(draftItems.map((it, idx) => idx === dIdx ? { ...it, dosage: val } : it));
                            }}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Route</label>
                          <select
                            value={item.route}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraftItems(draftItems.map((it, idx) => idx === dIdx ? { ...it, route: val } : it));
                            }}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                          >
                            {COMMON_ADMIN_ROUTES.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Frequency, Duration, Total Doses */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Frequency</label>
                          <select
                            value={item.frequency}
                            onChange={(e) => {
                              const freq = e.target.value as any;
                              const count = calculateTotalDoses(freq, item.duration || '3 days');
                              setDraftItems(draftItems.map((it, idx) => idx === dIdx ? { ...it, frequency: freq, totalQuantityToAdminister: count } : it));
                            }}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                          >
                            {FREQUENCY_OPTIONS.map(f => (
                              <option key={f.code} value={f.code}>{f.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Duration</label>
                          <input
                            type="text"
                            placeholder="e.g. 3 days"
                            value={item.duration}
                            onChange={(e) => {
                              const dur = e.target.value;
                              const count = calculateTotalDoses(item.frequency, dur);
                              setDraftItems(draftItems.map((it, idx) => idx === dIdx ? { ...it, duration: dur, totalQuantityToAdminister: count } : it));
                            }}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Total Doses</label>
                          <input
                            type="number"
                            min="1"
                            value={item.totalQuantityToAdminister}
                            onChange={(e) => {
                              const q = Number(e.target.value) || 1;
                              setDraftItems(draftItems.map((it, idx) => idx === dIdx ? { ...it, totalQuantityToAdminister: q } : it));
                            }}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white font-bold text-purple-700"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Special Instructions</label>
                        <input
                          type="text"
                          placeholder="e.g. Administer slowly over 20 minutes"
                          value={item.instructions || ''}
                          onChange={(e) => {
                            const inst = e.target.value;
                            setDraftItems(draftItems.map((it, idx) => idx === dIdx ? { ...it, instructions: inst } : it));
                          }}
                          className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setDraftItems([
                    ...draftItems,
                    {
                      medicationOrItemName: '',
                      dosage: '',
                      route: 'IV',
                      frequency: 'BD',
                      duration: '3 days',
                      quantityPerDose: 1,
                      totalQuantityToAdminister: 6,
                      instructions: '',
                      category: 'medication',
                      inventoryItemId: '',
                      unitPrice: 0
                    }
                  ])}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <Plus className="w-4 h-4" /> Add Another Drug / Consumable
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPopulateModalOpen(false)}
                    className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 text-xs"
                  >
                    <Sparkles className="w-4 h-4" /> Save & Update Treatment Chart
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: DISCONTINUE ITEM REASON */}
      {/* ========================================================================= */}
      {discontinueTarget && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDiscontinueTarget(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-3 text-xs cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm text-amber-600 flex items-center gap-1.5">
                <Ban className="w-4 h-4" /> Discontinue Medication
              </h4>
              <button
                type="button"
                onClick={() => setDiscontinueTarget(null)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>
            <p className="text-slate-600">
              Are you sure you want to discontinue <strong>{discontinueTarget.itemName}</strong>?
            </p>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Reason for Discontinuation</label>
              <input
                type="text"
                required
                value={discontinueReason}
                onChange={(e) => setDiscontinueReason(e.target.value)}
                placeholder="e.g. Switched to oral therapy / Doctor order"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDiscontinueTarget(null)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscontinue}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition-all cursor-pointer"
              >
                Confirm Discontinue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: DELETE ITEM CONFIRMATION */}
      {/* ========================================================================= */}
      {itemToDelete && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setItemToDelete(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-3 text-xs cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-rose-600 text-sm flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" /> Remove Item from Checklist
              </h4>
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>
            <p className="text-slate-600">
              Are you sure you want to completely remove <strong>{itemToDelete.medicationOrItemName}</strong> from this patient's treatment chart?
            </p>
            <div className="p-2 rounded bg-amber-50 text-amber-900 text-[11px] border border-amber-200">
              Note: If any doses were previously marked Given, their stock will be restored to Main Inventory, and billable ledger charges will be cancelled.
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteItem}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold transition-all cursor-pointer"
              >
                Remove Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINT MODAL: INPATIENT TREATMENT CHART SHEET */}
      {/* ========================================================================= */}
      {isPrintModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsPrintModalOpen(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 space-y-5 text-xs text-slate-900 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
              <span className="font-bold text-slate-800 text-sm">Bedside Patient Treatment Chart (Print Preview)</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Now
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Document Layout */}
            <div className="border border-slate-300 p-6 rounded-lg space-y-4 font-sans">
              <div className="text-center border-b pb-3 space-y-1">
                <h2 className="text-base font-bold tracking-wide uppercase">{activeClinic.name}</h2>
                <div className="text-[11px] text-slate-600">{activeClinic.address} &bull; Tel: {activeClinic.phone}</div>
                <h3 className="text-xs font-bold tracking-wider text-purple-900 uppercase pt-1">
                  INPATIENT DRUG & THERAPY ADMINISTRATION TREATMENT CHART (MAR)
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] p-2 bg-slate-50 border rounded">
                <div><strong>Patient:</strong> {patient.firstName} {patient.lastName}</div>
                <div><strong>MRN:</strong> {patient.mrn}</div>
                <div><strong>Ward:</strong> {patient.ward || 'General IPD'}</div>
                <div><strong>Bed:</strong> {patient.bedNumber || 'N/A'}</div>
                <div><strong>Attending Doctor:</strong> Dr. {chart?.doctorName || 'Attending Physician'}</div>
                <div><strong>Diagnosis:</strong> {chart?.diagnosis || 'Inpatient Admission'}</div>
                <div><strong>Chart Generated:</strong> {chart?.createdAt ? new Date(chart.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</div>
                <div><strong>Nurse Sign:</strong> {currentUser.name}</div>
              </div>

              <table className="w-full border-collapse border border-slate-300 text-[11px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 p-1.5 text-left">#</th>
                    <th className="border border-slate-300 p-1.5 text-left">Medication / Item</th>
                    <th className="border border-slate-300 p-1.5 text-left">Route</th>
                    <th className="border border-slate-300 p-1.5 text-left">Frequency</th>
                    <th className="border border-slate-300 p-1.5 text-center">Doses Schedule & Sign</th>
                  </tr>
                </thead>
                <tbody>
                  {activeItems.map((item, idx) => (
                    <tr key={item.id} className="border-b border-slate-300">
                      <td className="border border-slate-300 p-1.5 text-center font-bold">{idx + 1}</td>
                      <td className="border border-slate-300 p-1.5">
                        <div className="font-bold">{item.medicationOrItemName}</div>
                        <div className="text-[10px] text-slate-500">{item.instructions}</div>
                      </td>
                      <td className="border border-slate-300 p-1.5 font-semibold">{item.route}</td>
                      <td className="border border-slate-300 p-1.5">{item.frequency}</td>
                      <td className="border border-slate-300 p-1.5">
                        <div className="flex flex-wrap gap-1">
                          {item.doses.map(d => (
                            <span
                              key={d.id}
                              className={`px-1.5 py-0.5 rounded text-[9px] border ${
                                d.status === 'given'
                                  ? 'bg-emerald-100 border-emerald-400 font-bold text-emerald-900'
                                  : d.status === 'refused'
                                  ? 'bg-rose-100 border-rose-400 font-bold text-rose-900'
                                  : d.status === 'skipped'
                                  ? 'bg-amber-100 border-amber-400 font-bold text-amber-900'
                                  : 'bg-slate-50 border-slate-300 text-slate-600'
                              }`}
                            >
                              D{d.doseNumber} [{d.scheduledTime}] {d.status === 'given' ? `✓ ${d.administeredBy || 'RN'}` : d.status === 'refused' ? '✗ Refused' : d.status === 'skipped' ? '⊘ Held' : '___'}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-4 flex justify-between text-[11px] text-slate-500 border-t">
                <div>Nurse in Charge: _________________________</div>
                <div>Doctor Verification: _________________________</div>
                <div>Date: {new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIGITAL PATIENT CASE FILE MODAL (FALLBACK DIALOG) */}
      {/* ========================================================================= */}
      {isCaseFileModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsCaseFileModalOpen(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 my-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-100 text-indigo-800 rounded-xl">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Digital Patient Case File
                  </h3>
                  <div className="text-xs text-slate-500">
                    Patient: {patient.firstName} {patient.lastName} ({patient.mrn}) &bull; Arranged oldest to newest
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCaseFileModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <DigitalPatientCaseFile
              patient={patient}
              encounters={currentClinicEncounters.filter(e => e.patientId === patient.id)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
