import React, { useState, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { exportDataSetsToExcel, ExcelSheetData } from '../../utils/excelExport';
import { formatPatientAge } from '../../utils/ageUtils';
import {
  FileSpreadsheet,
  Building2,
  Calendar,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Scissors,
  Stethoscope,
  Bed,
  Users,
  Microscope,
  LogOut as DischargedIcon,
  Ambulance,
  HeartCrack,
  Activity,
  ChevronRight,
  ChevronDown,
  Sparkles,
  RefreshCw,
  Film,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Filter,
  Check,
  Info,
  SlidersHorizontal,
  Eye,
  EyeOff,
  FlaskConical
} from 'lucide-react';
import { ClinicalProcedure, ClinicalEncounter, TestOrder, RadiologyOrder, DischargeSummary, PatientReferral, DeathCertificate } from '../../types';
import { SeparatedDiagnosticTestsView } from './SeparatedDiagnosticTestsView';

export interface ClassifiedFinding {
  parameter: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: 'Normal' | 'High' | 'Low' | 'Abnormal';
  category: 'positive' | 'negative' | 'high_range' | 'low_range' | 'normal_range' | 'abnormal_other';
  isPositive: boolean; // considers reactive to be positive
  isNegative: boolean; // considers non-reactive to be negative
  isHighRange: boolean;
  isLowRange: boolean;
  isAbnormalRange: boolean;
  isNormal: boolean;
}

/**
 * Classifies a test result finding:
 * - Positives (considers Reactive results to also be positives)
 * - Negatives (considers Non-reactive results to also be negatives)
 * - Abnormal ranges (Low and High ranges)
 */
export function classifyFinding(res: {
  parameter?: string;
  value?: string;
  unit?: string;
  referenceRange?: string;
  flag?: string;
}): ClassifiedFinding {
  const parameter = res.parameter || 'Biomarker';
  const value = res.value || '';
  const unit = res.unit || '';
  const referenceRange = res.referenceRange || '';
  const rawFlag = (res.flag || 'Normal') as 'Normal' | 'High' | 'Low' | 'Abnormal';

  const valLower = value.toLowerCase().trim();
  const flagLower = (res.flag || '').toLowerCase().trim();

  let category: ClassifiedFinding['category'] = 'normal_range';
  let isPositive = false;
  let isNegative = false;
  let isHighRange = false;
  let isLowRange = false;
  let isAbnormalRange = false;
  let isNormal = false;

  // 1. Reactive vs Non-reactive (Per prompt: "consider the reactive results to also be positives", "consider the non-reactive results to also be negatives")
  if (valLower.includes('non-reactive') || valLower.includes('nonreactive') || valLower.includes('non reactive')) {
    category = 'negative';
    isNegative = true;
  } else if (valLower.includes('reactive')) {
    category = 'positive';
    isPositive = true;
  }
  // 2. Positive vs Negative
  else if (valLower.includes('negative') || valLower === 'neg' || valLower === '(-)' || valLower === 'not detected') {
    category = 'negative';
    isNegative = true;
  } else if (valLower.includes('positive') || valLower === 'pos' || valLower === '(+)' || valLower === 'detected') {
    category = 'positive';
    isPositive = true;
  }
  // 3. Range flags: High vs Low
  else if (flagLower === 'high' || valLower.includes('high') || valLower.includes('elevated') || valLower.includes('above')) {
    category = 'high_range';
    isHighRange = true;
    isAbnormalRange = true;
  } else if (flagLower === 'low' || valLower.includes('low') || valLower.includes('decreased') || valLower.includes('deficient') || valLower.includes('below')) {
    category = 'low_range';
    isLowRange = true;
    isAbnormalRange = true;
  } else if (flagLower === 'abnormal') {
    category = 'abnormal_other';
    isAbnormalRange = true;
  } else {
    // Numeric comparison against reference range if available (e.g. "12.0 - 16.0")
    if (referenceRange) {
      const rangeMatch = referenceRange.match(/^([0-9.]+)\s*-\s*([0-9.]+)$/);
      const numVal = parseFloat(value);
      if (rangeMatch && !isNaN(numVal)) {
        const minVal = parseFloat(rangeMatch[1]);
        const maxVal = parseFloat(rangeMatch[2]);
        if (numVal < minVal) {
          category = 'low_range';
          isLowRange = true;
          isAbnormalRange = true;
        } else if (numVal > maxVal) {
          category = 'high_range';
          isHighRange = true;
          isAbnormalRange = true;
        } else {
          category = 'normal_range';
          isNormal = true;
        }
      } else {
        category = 'normal_range';
        isNormal = true;
      }
    } else {
      category = 'normal_range';
      isNormal = true;
    }
  }

  return {
    parameter,
    value,
    unit,
    referenceRange,
    flag: rawFlag,
    category,
    isPositive,
    isNegative,
    isHighRange,
    isLowRange,
    isAbnormalRange,
    isNormal
  };
}

type DatasetTab =
  | 'overview'
  | 'procedures'
  | 'diagnoses'
  | 'admissions'
  | 'opd'
  | 'tests'
  | 'discharges'
  | 'referrals'
  | 'deaths';

type DateRangePreset =
  | 'all'
  | 'today'
  | 'last_7_days'
  | 'this_month'
  | 'last_30_days'
  | 'this_year'
  | 'custom';

type SortDirection = 'asc' | 'desc';

export const MedicalRecordsDashboard: React.FC = () => {
  const {
    activeClinic,
    currentClinicPatients,
    currentClinicEncounters,
    currentClinicProcedures,
    currentClinicTestOrders,
    currentClinicRadiologyOrders,
    currentClinicAvailableTests,
    currentClinicDischargeSummaries,
    currentClinicReferrals,
    currentClinicDeathCertificates,
    saveProcedure,
    saveEncounter,
    createTestOrder,
    recordTestResults,
    createRadiologyOrder,
    saveDischargeSummary,
    saveReferral,
    saveDeathCertificate,
    registerPatient
  } = useClinic();

  // Active Tab View
  const [activeTab, setActiveTab] = useState<DatasetTab>('overview');

  // Date Filtering State
  const [datePreset, setDatePreset] = useState<DateRangePreset>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Search Query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sorting
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Module Specific Sub-filters
  const [procedureOutcomeFilter, setProcedureOutcomeFilter] = useState<string>('all');
  const [diagnosticsViewMode, setDiagnosticsViewMode] = useState<'split' | 'pathology' | 'radiology' | 'combined'>('split');
  const [testTypeFilter, setTestTypeFilter] = useState<string>('all'); // all, pathology, radiology
  const [selectedTestNameFilter, setSelectedTestNameFilter] = useState<string>('all'); // specific test name or 'all'
  const [selectedParameterFilter, setSelectedParameterFilter] = useState<string>('all'); // specific parameter in ranges or 'all'
  const [testFindingFilter, setTestFindingFilter] = useState<'all' | 'positive' | 'negative' | 'abnormal_range' | 'high_range' | 'low_range' | 'normal'>('all');
  const [expandedFindingTestId, setExpandedFindingTestId] = useState<string | null>(null);

  // Imaging / Radiology Dedicated Filters & State (Separation of Imaging & Pathology)
  const [imagingModalityFilter, setImagingModalityFilter] = useState<string>('all');
  const [imagingProcedureFilter, setImagingProcedureFilter] = useState<string>('all');
  const [imagingOutcomeFilter, setImagingOutcomeFilter] = useState<'all' | 'positive' | 'normal' | 'pending'>('all');
  const [expandedImagingId, setExpandedImagingId] = useState<string | null>(null);

  const [referralUrgencyFilter, setReferralUrgencyFilter] = useState<string>('all');
  const [admissionStatusFilter, setAdmissionStatusFilter] = useState<string>('all');
  const [isSeeding, setIsSeeding] = useState(false);

  // Target Clinic is strictly the active facility
  const targetClinic = activeClinic;

  // Date boundary calculation
  const dateRangeBounds = useMemo(() => {
    const now = new Date();
    if (datePreset === 'all') return null;

    if (datePreset === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return { start, end };
    }

    if (datePreset === 'last_7_days') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start, end: now };
    }

    if (datePreset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      return { start, end: now };
    }

    if (datePreset === 'last_30_days') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { start, end: now };
    }

    if (datePreset === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      return { start, end: now };
    }

    if (datePreset === 'custom' && customStartDate) {
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = customEndDate ? new Date(customEndDate) : new Date();
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    return null;
  }, [datePreset, customStartDate, customEndDate]);

  // Helper date checker
  const isWithinDateRange = (dateStr?: string | null) => {
    if (!dateStr || !dateRangeBounds) return true;
    try {
      const d = new Date(dateStr).getTime();
      return d >= dateRangeBounds.start.getTime() && d <= dateRangeBounds.end.getTime();
    } catch {
      return true;
    }
  };

  // 1. PROCEDURES DONE
  const filteredProcedures = useMemo(() => {
    return currentClinicProcedures
      .filter(p => isWithinDateRange(p.performedAt || p.createdAt))
      .filter(p => {
        if (procedureOutcomeFilter === 'all') return true;
        return p.outcome === procedureOutcomeFilter;
      })
      .filter(p => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          p.procedureName?.toLowerCase().includes(q) ||
          p.procedureCode?.toLowerCase().includes(q) ||
          p.patientName?.toLowerCase().includes(q) ||
          p.patientMrn?.toLowerCase().includes(q) ||
          p.doctorName?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.details?.toLowerCase().includes(q)
        );
      });
  }, [currentClinicProcedures, dateRangeBounds, procedureOutcomeFilter, searchQuery]);

  // 2. FINAL DIAGNOSES (from encounters)
  const filteredDiagnoses = useMemo(() => {
    return currentClinicEncounters
      .filter(e => isWithinDateRange(e.visitDate || e.createdAt))
      .filter(e => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          e.workingDiagnosis?.toLowerCase().includes(q) ||
          e.differentialDiagnosis?.toLowerCase().includes(q) ||
          e.patientName?.toLowerCase().includes(q) ||
          e.patientMrn?.toLowerCase().includes(q) ||
          e.doctorName?.toLowerCase().includes(q) ||
          e.chiefComplaint?.toLowerCase().includes(q) ||
          e.clinicalPlan?.toLowerCase().includes(q)
        );
      });
  }, [currentClinicEncounters, dateRangeBounds, searchQuery]);

  // 3. ADMISSIONS (IPD)
  const filteredAdmissions = useMemo(() => {
    return currentClinicPatients
      .filter(p => {
        const isIpd = p.patientType === 'IPD' || p.currentStatus === 'in_ward' || !!p.admissionDate;
        return isIpd;
      })
      .filter(p => isWithinDateRange(p.admissionDate || p.registeredAt))
      .filter(p => {
        if (admissionStatusFilter === 'all') return true;
        if (admissionStatusFilter === 'current') return p.currentStatus === 'in_ward';
        if (admissionStatusFilter === 'discharged') return p.currentStatus === 'discharged';
        return true;
      })
      .filter(p => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
        return (
          fullName.includes(q) ||
          p.mrn?.toLowerCase().includes(q) ||
          p.ward?.toLowerCase().includes(q) ||
          p.bedNumber?.toLowerCase().includes(q) ||
          p.assignedDoctorName?.toLowerCase().includes(q)
        );
      });
  }, [currentClinicPatients, dateRangeBounds, admissionStatusFilter, searchQuery]);

  // 4. OPD TURNOVER
  const filteredOpd = useMemo(() => {
    return currentClinicEncounters
      .filter(e => e.patientType === 'OPD' || !e.patientType)
      .filter(e => isWithinDateRange(e.visitDate || e.createdAt))
      .filter(e => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          e.patientName?.toLowerCase().includes(q) ||
          e.patientMrn?.toLowerCase().includes(q) ||
          e.doctorName?.toLowerCase().includes(q) ||
          e.chiefComplaint?.toLowerCase().includes(q) ||
          e.workingDiagnosis?.toLowerCase().includes(q)
        );
      });
  }, [currentClinicEncounters, dateRangeBounds, searchQuery]);

  // All unique diagnostic test names for filtering (Pathology + Radiology + Catalog)
  const availableTestNames = useMemo(() => {
    const namesSet = new Set<string>();

    if (testTypeFilter === 'all' || testTypeFilter === 'pathology') {
      currentClinicTestOrders.forEach(t => {
        if (t.testName?.trim()) namesSet.add(t.testName.trim());
      });
      currentClinicAvailableTests.forEach(t => {
        if (t.name?.trim()) namesSet.add(t.name.trim());
      });
    }

    if (testTypeFilter === 'all' || testTypeFilter === 'radiology') {
      currentClinicRadiologyOrders.forEach(r => {
        const name = r.procedureName || (r.modality ? `${r.modality} - ${r.bodyPart}` : '');
        if (name?.trim()) namesSet.add(name.trim());
      });
    }

    return Array.from(namesSet).sort((a, b) => a.localeCompare(b));
  }, [currentClinicTestOrders, currentClinicRadiologyOrders, currentClinicAvailableTests, testTypeFilter]);

  // Dedicated Pathology test names
  const availablePathologyNames = useMemo(() => {
    const namesSet = new Set<string>();
    currentClinicTestOrders.forEach(t => {
      if (t.testName?.trim()) namesSet.add(t.testName.trim());
    });
    currentClinicAvailableTests.forEach(t => {
      if (t.name?.trim()) namesSet.add(t.name.trim());
    });
    return Array.from(namesSet).sort((a, b) => a.localeCompare(b));
  }, [currentClinicTestOrders, currentClinicAvailableTests]);

  // Dedicated Imaging procedures
  const availableImagingProcedures = useMemo(() => {
    const namesSet = new Set<string>();
    currentClinicRadiologyOrders.forEach(r => {
      const name = r.procedureName || (r.modality ? `${r.modality} - ${r.bodyPart}` : '');
      if (name?.trim()) namesSet.add(name.trim());
    });
    return Array.from(namesSet).sort((a, b) => a.localeCompare(b));
  }, [currentClinicRadiologyOrders]);

  // Dedicated Imaging modalities
  const availableImagingModalities = useMemo(() => {
    const mods = new Set<string>(['Ultrasound', 'X-Ray', 'CT Scan', 'MRI', 'Mammography']);
    currentClinicRadiologyOrders.forEach(r => {
      if (r.modality) mods.add(r.modality);
    });
    return Array.from(mods);
  }, [currentClinicRadiologyOrders]);

  // Determine if a selected test has ranges, or if there are tests with ranges
  const isSelectedTestWithRanges = useMemo(() => {
    if (selectedTestNameFilter === 'all') {
      const hasCatalogRanges = currentClinicAvailableTests.some(t => t.resultType === 'ranges' || (t.parameters && t.parameters.length > 0));
      const hasOrderRanges = currentClinicTestOrders.some(t => Array.isArray(t.results) && t.results.some(r => r.referenceRange && r.referenceRange !== 'Standard'));
      return hasCatalogRanges || hasOrderRanges;
    }
    const targetNameLower = selectedTestNameFilter.toLowerCase().trim();
    const catalogTest = currentClinicAvailableTests.find(
      t => t.name.toLowerCase().trim() === targetNameLower
    );
    if (catalogTest?.resultType === 'ranges' || (catalogTest?.parameters && catalogTest.parameters.length > 0)) {
      return true;
    }
    return currentClinicTestOrders.some(
      t => t.testName?.toLowerCase().trim() === targetNameLower &&
           Array.isArray(t.results) &&
           t.results.some(r => r.referenceRange && r.referenceRange !== 'Standard')
    );
  }, [selectedTestNameFilter, currentClinicAvailableTests, currentClinicTestOrders]);

  // Extract all parameters relevant for filtering (for specific test or across all tests with ranges)
  const availableParametersForFilter = useMemo(() => {
    const paramMap = new Map<string, { parameter: string; unit?: string; referenceRange?: string; testName?: string }>();

    // 1. If a specific test name is selected:
    if (selectedTestNameFilter !== 'all') {
      const targetNameLower = selectedTestNameFilter.toLowerCase().trim();

      // Look in test catalog for parameter definitions
      const catalogMatches = currentClinicAvailableTests.filter(
        t => t.name.toLowerCase().trim() === targetNameLower
      );
      catalogMatches.forEach(t => {
        if (t.parameters && t.parameters.length > 0) {
          t.parameters.forEach(p => {
            if (p.parameter?.trim()) {
              paramMap.set(p.parameter.trim().toLowerCase(), {
                parameter: p.parameter.trim(),
                unit: p.unit,
                referenceRange: p.referenceRange,
                testName: t.name
              });
            }
          });
        }
      });

      // Also look in actual orders for this test name
      currentClinicTestOrders
        .filter(t => t.testName?.toLowerCase().trim() === targetNameLower)
        .forEach(t => {
          if (Array.isArray(t.results)) {
            t.results.forEach(r => {
              if (r.parameter?.trim()) {
                const key = r.parameter.trim().toLowerCase();
                if (!paramMap.has(key)) {
                  paramMap.set(key, {
                    parameter: r.parameter.trim(),
                    unit: r.unit,
                    referenceRange: r.referenceRange,
                    testName: t.testName
                  });
                }
              }
            });
          }
        });

      return Array.from(paramMap.values()).sort((a, b) => a.parameter.localeCompare(b.parameter));
    }

    // 2. If 'all' tests are selected, collect parameters across all tests with ranges
    currentClinicTestOrders.forEach(t => {
      if (Array.isArray(t.results)) {
        t.results.forEach(r => {
          if (r.parameter?.trim()) {
            const key = r.parameter.trim().toLowerCase();
            if (!paramMap.has(key)) {
              paramMap.set(key, {
                parameter: r.parameter.trim(),
                unit: r.unit,
                referenceRange: r.referenceRange,
                testName: t.testName
              });
            }
          }
        });
      }
    });

    currentClinicAvailableTests.forEach(t => {
      if ((t.resultType === 'ranges' || (t.parameters && t.parameters.length > 0)) && t.parameters) {
        t.parameters.forEach(p => {
          if (p.parameter?.trim()) {
            const key = p.parameter.trim().toLowerCase();
            if (!paramMap.has(key)) {
              paramMap.set(key, {
                parameter: p.parameter.trim(),
                unit: p.unit,
                referenceRange: p.referenceRange,
                testName: t.name
              });
            }
          }
        });
      }
    });

    return Array.from(paramMap.values()).sort((a, b) => a.parameter.localeCompare(b.parameter));
  }, [selectedTestNameFilter, currentClinicAvailableTests, currentClinicTestOrders]);

  // Track specific parameter intelligence metrics when a parameter filter is active
  const selectedParameterMetrics = useMemo(() => {
    if (selectedParameterFilter === 'all') return null;
    const targetParamLower = selectedParameterFilter.toLowerCase().trim();

    let totalMeasured = 0;
    let highCount = 0;
    let lowCount = 0;
    let normalCount = 0;
    let abnormalOtherCount = 0;
    let unit = '';
    let referenceRange = '';
    const testNamesSet = new Set<string>();

    currentClinicTestOrders
      .filter(t => isWithinDateRange(t.orderedAt))
      .filter(t => {
        if (selectedTestNameFilter === 'all') return true;
        return t.testName?.toLowerCase().trim() === selectedTestNameFilter.toLowerCase().trim();
      })
      .forEach(t => {
        if (Array.isArray(t.results)) {
          t.results.forEach(r => {
            if (r.parameter?.toLowerCase().trim() === targetParamLower) {
              totalMeasured++;
              testNamesSet.add(t.testName);
              if (r.unit && !unit) unit = r.unit;
              if (r.referenceRange && !referenceRange) referenceRange = r.referenceRange;
              const classified = classifyFinding(r);
              if (classified.isHighRange) highCount++;
              else if (classified.isLowRange) lowCount++;
              else if (classified.isNormal) normalCount++;
              else abnormalOtherCount++;
            }
          });
        }
      });

    return {
      parameterName: selectedParameterFilter,
      totalMeasured,
      highCount,
      lowCount,
      normalCount,
      abnormalOtherCount,
      totalAbnormal: highCount + lowCount + abnormalOtherCount,
      unit,
      referenceRange,
      associatedTests: Array.from(testNamesSet)
    };
  }, [selectedParameterFilter, selectedTestNameFilter, currentClinicTestOrders, dateRangeBounds]);

  // 1. Dedicated Pathology Lab Items (Extracted for separation)
  const labItems = useMemo(() => {
    return currentClinicTestOrders
      .filter(t => isWithinDateRange(t.orderedAt))
      .map(t => {
        const rawResultsList = Array.isArray(t.results) ? t.results : [];
        const classifiedFindings: ClassifiedFinding[] = rawResultsList.map(r => classifyFinding(r));

        const hasPositive = classifiedFindings.some(f => f.isPositive);
        const hasNegative = classifiedFindings.some(f => f.isNegative);
        const hasHigh = classifiedFindings.some(f => f.isHighRange);
        const hasLow = classifiedFindings.some(f => f.isLowRange);
        const hasAbnormalRange = classifiedFindings.some(f => f.isAbnormalRange);
        const isAllNormal = classifiedFindings.length > 0 && classifiedFindings.every(f => f.isNormal);

        // Overall test outcome classification
        let overallClassification: 'positive' | 'negative' | 'abnormal_range' | 'normal' | 'pending' = 'pending';
        if (t.status === 'completed' || classifiedFindings.length > 0) {
          if (hasPositive) {
            overallClassification = 'positive';
          } else if (hasAbnormalRange) {
            overallClassification = 'abnormal_range';
          } else if (hasNegative) {
            overallClassification = 'negative';
          } else if (isAllNormal) {
            overallClassification = 'normal';
          } else {
            overallClassification = 'normal';
          }
        }

        const resultString = rawResultsList.length > 0
          ? rawResultsList.map(r => `${r.parameter}: ${r.value} ${r.unit || ''} (${r.flag})`).join('; ')
          : (typeof t.results === 'string' ? t.results : '');

        return {
          id: t.id,
          clinicId: t.clinicId,
          testType: 'Pathology Lab' as const,
          testName: t.testName,
          category: t.category,
          specimenType: (t as any).specimenType || (t.category === 'Urinalysis' ? 'Urine' : t.category === 'Hematology' ? 'Whole Blood' : t.category === 'Biochemistry' ? 'Serum' : 'Specimen'),
          patientName: t.patientName,
          patientMrn: t.patientMrn,
          doctorName: t.doctorName,
          orderedAt: t.orderedAt,
          status: t.status,
          urgency: t.priority,
          results: resultString,
          rawResults: rawResultsList,
          classifiedFindings,
          hasPositive,
          hasNegative,
          hasHigh,
          hasLow,
          hasAbnormalRange,
          isAllNormal,
          overallClassification,
          cost: t.cost,
          rawTest: t
        };
      });
  }, [currentClinicTestOrders, dateRangeBounds]);

  // 2. Dedicated Radiology Imaging Items (Extracted for separation)
  const radItems = useMemo(() => {
    return currentClinicRadiologyOrders
      .filter(r => isWithinDateRange(r.orderedAt))
      .map(r => {
        const textFindings = (r.findings || r.impression || '').toLowerCase();
        let overallClassification: 'positive' | 'negative' | 'abnormal_range' | 'normal' | 'pending' = 'pending';
        if (r.status === 'completed' || textFindings) {
          if (
            textFindings.includes('positive') ||
            textFindings.includes('consistent with') ||
            textFindings.includes('features of') ||
            textFindings.includes('detected') ||
            textFindings.includes('abnormal') ||
            textFindings.includes('protrusion') ||
            textFindings.includes('herniation') ||
            textFindings.includes('fracture') ||
            textFindings.includes('effusion') ||
            textFindings.includes('consolidation') ||
            textFindings.includes('appendicitis')
          ) {
            overallClassification = 'positive';
          } else if (textFindings.includes('normal') || textFindings.includes('unremarkable') || textFindings.includes('clear')) {
            overallClassification = 'normal';
          } else if (textFindings.includes('negative')) {
            overallClassification = 'negative';
          } else {
            overallClassification = 'abnormal_range';
          }
        }

        return {
          id: r.id,
          clinicId: r.clinicId,
          testType: 'Radiology Imaging' as const,
          testName: r.procedureName || `${r.modality} - ${r.bodyPart}`,
          category: r.modality,
          modality: r.modality,
          bodyPart: r.bodyPart,
          clinicalHistory: r.clinicalHistory,
          patientName: r.patientName,
          patientMrn: r.patientMrn,
          doctorName: r.doctorName,
          orderedAt: r.orderedAt,
          status: r.status,
          urgency: r.priority,
          results: r.findings || r.impression || '',
          findingsText: r.findings || '',
          impressionText: r.impression || '',
          radiologistNotes: r.radiologistNotes || '',
          rawResults: [],
          classifiedFindings: [] as ClassifiedFinding[],
          hasPositive: overallClassification === 'positive',
          hasNegative: overallClassification === 'negative',
          hasHigh: false,
          hasLow: false,
          hasAbnormalRange: overallClassification === 'abnormal_range',
          isAllNormal: overallClassification === 'normal',
          overallClassification,
          cost: r.cost,
          rawRad: r,
          rawTest: null
        };
      });
  }, [currentClinicRadiologyOrders, dateRangeBounds]);

  // Filtered Pathology Tests (Separated from Imaging)
  const filteredPathologyTests = useMemo(() => {
    return labItems
      .filter(item => {
        // Test Name Filter
        if (selectedTestNameFilter === 'all') return true;
        return item.testName?.toLowerCase().trim() === selectedTestNameFilter.toLowerCase().trim();
      })
      .filter(item => {
        // Parameter Filter
        if (selectedParameterFilter === 'all') return true;
        const targetParam = selectedParameterFilter.toLowerCase().trim();
        return item.classifiedFindings.some(f => f.parameter?.toLowerCase().trim() === targetParam);
      })
      .filter(item => {
        // Outcome Filter
        if (testFindingFilter === 'all') return true;
        if (selectedParameterFilter !== 'all') {
          const targetParam = selectedParameterFilter.toLowerCase().trim();
          const matchedFinding = item.classifiedFindings.find(f => f.parameter?.toLowerCase().trim() === targetParam);
          if (!matchedFinding) return false;
          if (testFindingFilter === 'positive') return matchedFinding.isPositive;
          if (testFindingFilter === 'negative') return matchedFinding.isNegative;
          if (testFindingFilter === 'abnormal_range') return matchedFinding.isAbnormalRange;
          if (testFindingFilter === 'high_range') return matchedFinding.isHighRange;
          if (testFindingFilter === 'low_range') return matchedFinding.isLowRange;
          if (testFindingFilter === 'normal') return matchedFinding.isNormal;
          return true;
        }

        if (testFindingFilter === 'positive') return item.hasPositive;
        if (testFindingFilter === 'negative') return item.hasNegative;
        if (testFindingFilter === 'abnormal_range') return item.hasAbnormalRange;
        if (testFindingFilter === 'high_range') return item.hasHigh;
        if (testFindingFilter === 'low_range') return item.hasLow;
        if (testFindingFilter === 'normal') return item.isAllNormal;
        return true;
      })
      .filter(item => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.testName?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q) ||
          item.patientName?.toLowerCase().includes(q) ||
          item.patientMrn?.toLowerCase().includes(q) ||
          item.doctorName?.toLowerCase().includes(q) ||
          item.status?.toLowerCase().includes(q) ||
          item.results?.toLowerCase().includes(q)
        );
      });
  }, [labItems, selectedTestNameFilter, selectedParameterFilter, testFindingFilter, searchQuery]);

  // Filtered Radiology Imaging Tests (Separated from Pathology)
  const filteredRadiologyTests = useMemo(() => {
    return radItems
      .filter(item => {
        // Modality Filter
        if (imagingModalityFilter === 'all') return true;
        return item.category?.toLowerCase() === imagingModalityFilter.toLowerCase();
      })
      .filter(item => {
        // Procedure / Study Name Filter
        if (imagingProcedureFilter === 'all') return true;
        return item.testName?.toLowerCase().trim() === imagingProcedureFilter.toLowerCase().trim();
      })
      .filter(item => {
        // Outcome Filter
        if (imagingOutcomeFilter === 'all') return true;
        if (imagingOutcomeFilter === 'positive') return item.hasPositive;
        if (imagingOutcomeFilter === 'normal') return item.isAllNormal;
        if (imagingOutcomeFilter === 'pending') return item.status !== 'completed';
        return true;
      })
      .filter(item => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.testName?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q) ||
          item.bodyPart?.toLowerCase().includes(q) ||
          item.patientName?.toLowerCase().includes(q) ||
          item.patientMrn?.toLowerCase().includes(q) ||
          item.doctorName?.toLowerCase().includes(q) ||
          item.status?.toLowerCase().includes(q) ||
          item.results?.toLowerCase().includes(q)
        );
      });
  }, [radItems, imagingModalityFilter, imagingProcedureFilter, imagingOutcomeFilter, searchQuery]);

  // Dedicated Scoped Findings Metrics for Pathology Tests
  const scopedPathologyMetrics = useMemo(() => {
    let positiveCount = 0;       // Positives (considers Reactive results to also be positives)
    let negativeCount = 0;       // Negatives (considers Non-reactive results to also be negatives)
    let abnormalHighCount = 0;   // High range biomarkers (above reference limit)
    let abnormalLowCount = 0;    // Low range biomarkers (below reference limit)
    let abnormalOtherCount = 0;  // Other abnormal findings
    let normalCount = 0;         // Within normal limits
    let totalFindings = 0;

    let testsWithPositives = 0;
    let testsWithNegatives = 0;
    let testsWithAbnormalRanges = 0;
    let testsWithHigh = 0;
    let testsWithLow = 0;
    let testsWithNormal = 0;

    const isParamFiltered = selectedParameterFilter !== 'all';
    const targetParam = selectedParameterFilter.toLowerCase().trim();

    labItems
      .filter(item => {
        if (selectedTestNameFilter === 'all') return true;
        return item.testName?.toLowerCase().trim() === selectedTestNameFilter.toLowerCase().trim();
      })
      .filter(item => {
        if (selectedParameterFilter === 'all') return true;
        return item.classifiedFindings.some(f => f.parameter?.toLowerCase().trim() === targetParam);
      })
      .forEach(t => {
        let testHasPos = false;
        let testHasNeg = false;
        let testHasAbnormalRange = false;
        let testHasHigh = false;
        let testHasLow = false;
        let testIsNormal = true;

        const relevantFindings = isParamFiltered
          ? t.classifiedFindings.filter(f => f.parameter?.toLowerCase().trim() === targetParam)
          : t.classifiedFindings;

        relevantFindings.forEach(f => {
          totalFindings++;
          if (f.isPositive) {
            positiveCount++;
            testHasPos = true;
            testIsNormal = false;
          } else if (f.isNegative) {
            negativeCount++;
            testHasNeg = true;
          } else if (f.isHighRange) {
            abnormalHighCount++;
            testHasAbnormalRange = true;
            testHasHigh = true;
            testIsNormal = false;
          } else if (f.isLowRange) {
            abnormalLowCount++;
            testHasAbnormalRange = true;
            testHasLow = true;
            testIsNormal = false;
          } else if (f.isAbnormalRange) {
            abnormalOtherCount++;
            testHasAbnormalRange = true;
            testIsNormal = false;
          } else {
            normalCount++;
          }
        });

        if (testHasPos) testsWithPositives++;
        if (testHasNeg) testsWithNegatives++;
        if (testHasAbnormalRange) testsWithAbnormalRanges++;
        if (testHasHigh) testsWithHigh++;
        if (testHasLow) testsWithLow++;
        if (testIsNormal && (t.classifiedFindings.length > 0 || t.status === 'completed')) testsWithNormal++;
      });

    const totalAbnormalRanges = abnormalHighCount + abnormalLowCount + abnormalOtherCount;

    return {
      positiveCount,
      negativeCount,
      abnormalHighCount,
      abnormalLowCount,
      abnormalOtherCount,
      totalAbnormalRanges,
      normalCount,
      totalFindings,
      testsWithPositives,
      testsWithNegatives,
      testsWithAbnormalRanges,
      testsWithHigh,
      testsWithLow,
      testsWithNormal,
      totalOrders: labItems.filter(item => {
        if (selectedTestNameFilter === 'all') return true;
        return item.testName?.toLowerCase().trim() === selectedTestNameFilter.toLowerCase().trim();
      }).length
    };
  }, [labItems, selectedTestNameFilter, selectedParameterFilter]);

  // Dedicated Scoped Findings Metrics for Imaging Tests
  const scopedImagingMetrics = useMemo(() => {
    let positiveCount = 0;       // Significant / Pathology detected
    let normalCount = 0;         // Unremarkable / Normal
    let emergencyUrgentCount = 0;// Urgent or Emergency
    let pendingCount = 0;        // In progress or pending

    const modalityCounts: Record<string, number> = {
      'Ultrasound': 0,
      'X-Ray': 0,
      'CT Scan': 0,
      'MRI': 0,
      'Mammography': 0
    };

    radItems.forEach(r => {
      if (r.hasPositive) positiveCount++;
      else if (r.isAllNormal) normalCount++;
      if (r.urgency === 'Emergency' || r.urgency === 'Urgent') emergencyUrgentCount++;
      if (r.status !== 'completed') pendingCount++;
      const mod = r.modality || r.category || 'Other';
      if (modalityCounts[mod] !== undefined) {
        modalityCounts[mod]++;
      }
    });

    return {
      totalScans: radItems.length,
      positiveCount,
      normalCount,
      emergencyUrgentCount,
      pendingCount,
      modalityCounts
    };
  }, [radItems]);

  // Combined Tests matching filters (for backward compatibility & combined matrix)
  const testsMatchingFiltersExceptOutcome = useMemo(() => {
    const combined = [...labItems, ...radItems];

    return combined
      .filter(item => {
        if (testTypeFilter === 'all') return true;
        if (testTypeFilter === 'pathology') return item.testType === 'Pathology Lab';
        if (testTypeFilter === 'radiology') return item.testType === 'Radiology Imaging';
        return true;
      })
      .filter(item => {
        // Test Name Filter
        if (selectedTestNameFilter === 'all') return true;
        return item.testName?.toLowerCase().trim() === selectedTestNameFilter.toLowerCase().trim();
      })
      .filter(item => {
        // Parameter Filter
        if (selectedParameterFilter === 'all') return true;
        const targetParam = selectedParameterFilter.toLowerCase().trim();
        return item.classifiedFindings.some(f => f.parameter?.toLowerCase().trim() === targetParam);
      })
      .filter(item => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.testName?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q) ||
          item.patientName?.toLowerCase().includes(q) ||
          item.patientMrn?.toLowerCase().includes(q) ||
          item.doctorName?.toLowerCase().includes(q) ||
          item.status?.toLowerCase().includes(q) ||
          item.results?.toLowerCase().includes(q)
        );
      });
  }, [
    labItems,
    radItems,
    testTypeFilter,
    selectedTestNameFilter,
    selectedParameterFilter,
    searchQuery
  ]);

  // Scoped Findings Metrics for combined overview
  const scopedFindingsMetrics = useMemo(() => {
    let positiveCount = 0;       // Positives (considers Reactive results to also be positives)
    let negativeCount = 0;       // Negatives (considers Non-reactive results to also be negatives)
    let abnormalHighCount = 0;   // High range biomarkers (above reference limit)
    let abnormalLowCount = 0;    // Low range biomarkers (below reference limit)
    let abnormalOtherCount = 0;  // Other abnormal findings
    let normalCount = 0;         // Within normal limits
    let totalFindings = 0;

    let testsWithPositives = 0;
    let testsWithNegatives = 0;
    let testsWithAbnormalRanges = 0;
    let testsWithHigh = 0;
    let testsWithLow = 0;
    let testsWithNormal = 0;

    const isParamFiltered = selectedParameterFilter !== 'all';
    const targetParam = selectedParameterFilter.toLowerCase().trim();

    testsMatchingFiltersExceptOutcome.forEach(t => {
      let testHasPos = false;
      let testHasNeg = false;
      let testHasAbnormalRange = false;
      let testHasHigh = false;
      let testHasLow = false;
      let testIsNormal = true;

      if (t.classifiedFindings && t.classifiedFindings.length > 0) {
        const relevantFindings = isParamFiltered
          ? t.classifiedFindings.filter(f => f.parameter?.toLowerCase().trim() === targetParam)
          : t.classifiedFindings;

        relevantFindings.forEach(f => {
          totalFindings++;
          if (f.isPositive) {
            positiveCount++;
            testHasPos = true;
            testIsNormal = false;
          } else if (f.isNegative) {
            negativeCount++;
            testHasNeg = true;
          } else if (f.isHighRange) {
            abnormalHighCount++;
            testHasAbnormalRange = true;
            testHasHigh = true;
            testIsNormal = false;
          } else if (f.isLowRange) {
            abnormalLowCount++;
            testHasAbnormalRange = true;
            testHasLow = true;
            testIsNormal = false;
          } else if (f.isAbnormalRange) {
            abnormalOtherCount++;
            testHasAbnormalRange = true;
            testIsNormal = false;
          } else {
            normalCount++;
          }
        });
      } else if (!isParamFiltered) {
        // Radiology or unstructured items
        if (t.hasPositive) {
          positiveCount++;
          testHasPos = true;
          testIsNormal = false;
        } else if (t.hasNegative) {
          negativeCount++;
          testHasNeg = true;
        } else if (t.hasAbnormalRange) {
          abnormalOtherCount++;
          testHasAbnormalRange = true;
          testIsNormal = false;
        } else if (t.isAllNormal) {
          normalCount++;
        }
      }

      if (testHasPos) testsWithPositives++;
      if (testHasNeg) testsWithNegatives++;
      if (testHasAbnormalRange) testsWithAbnormalRanges++;
      if (testHasHigh) testsWithHigh++;
      if (testHasLow) testsWithLow++;
      if (testIsNormal && (t.classifiedFindings.length > 0 || t.status === 'completed')) testsWithNormal++;
    });

    const totalAbnormalRanges = abnormalHighCount + abnormalLowCount + abnormalOtherCount;

    return {
      positiveCount,
      negativeCount,
      abnormalHighCount,
      abnormalLowCount,
      abnormalOtherCount,
      totalAbnormalRanges,
      normalCount,
      totalFindings,
      testsWithPositives,
      testsWithNegatives,
      testsWithAbnormalRanges,
      testsWithHigh,
      testsWithLow,
      testsWithNormal,
      totalOrders: testsMatchingFiltersExceptOutcome.length
    };
  }, [testsMatchingFiltersExceptOutcome, selectedParameterFilter]);

  // Parameter surveillance summary for the currently active test / tests with ranges
  const rangeParametersSummary = useMemo(() => {
    if (!isSelectedTestWithRanges && availableParametersForFilter.length === 0) return [];

    const summaryMap = new Map<string, {
      parameter: string;
      unit: string;
      referenceRange: string;
      total: number;
      highCount: number;
      lowCount: number;
      normalCount: number;
      abnormalCount: number;
    }>();

    availableParametersForFilter.forEach(p => {
      summaryMap.set(p.parameter.toLowerCase().trim(), {
        parameter: p.parameter,
        unit: p.unit || '',
        referenceRange: p.referenceRange || '',
        total: 0,
        highCount: 0,
        lowCount: 0,
        normalCount: 0,
        abnormalCount: 0
      });
    });

    testsMatchingFiltersExceptOutcome.forEach(t => {
      if (t.classifiedFindings) {
        t.classifiedFindings.forEach(f => {
          const key = f.parameter?.toLowerCase().trim();
          let item = summaryMap.get(key);
          if (!item && f.parameter) {
            item = {
              parameter: f.parameter,
              unit: f.unit || '',
              referenceRange: f.referenceRange || '',
              total: 0,
              highCount: 0,
              lowCount: 0,
              normalCount: 0,
              abnormalCount: 0
            };
            summaryMap.set(key, item);
          }
          if (item) {
            item.total++;
            if (f.isHighRange) {
              item.highCount++;
              item.abnormalCount++;
            } else if (f.isLowRange) {
              item.lowCount++;
              item.abnormalCount++;
            } else if (f.isNormal) {
              item.normalCount++;
            } else if (f.isAbnormalRange) {
              item.abnormalCount++;
            }
          }
        });
      }
    });

    return Array.from(summaryMap.values());
  }, [isSelectedTestWithRanges, availableParametersForFilter, testsMatchingFiltersExceptOutcome]);

  // 5. TESTS NAMES (Pathology + Radiology) & CLINICAL FINDINGS SURVEILLANCE
  const filteredTests = useMemo(() => {
    return testsMatchingFiltersExceptOutcome.filter(item => {
      // Findings Outcome Filter (combined with parameter filter if active!)
      if (testFindingFilter === 'all') return true;

      if (selectedParameterFilter !== 'all') {
        // If a parameter is specifically selected, check outcome for THAT parameter
        const targetParam = selectedParameterFilter.toLowerCase().trim();
        const matchedFinding = item.classifiedFindings.find(f => f.parameter?.toLowerCase().trim() === targetParam);
        if (!matchedFinding) return false;

        if (testFindingFilter === 'positive') return matchedFinding.isPositive;
        if (testFindingFilter === 'negative') return matchedFinding.isNegative;
        if (testFindingFilter === 'abnormal_range') return matchedFinding.isAbnormalRange;
        if (testFindingFilter === 'high_range') return matchedFinding.isHighRange;
        if (testFindingFilter === 'low_range') return matchedFinding.isLowRange;
        if (testFindingFilter === 'normal') return matchedFinding.isNormal;
        return true;
      }

      if (testFindingFilter === 'positive') return item.hasPositive;
      if (testFindingFilter === 'negative') return item.hasNegative;
      if (testFindingFilter === 'abnormal_range') return item.hasAbnormalRange;
      if (testFindingFilter === 'high_range') return item.hasHigh;
      if (testFindingFilter === 'low_range') return item.hasLow;
      if (testFindingFilter === 'normal') return item.isAllNormal;
      return true;
    });
  }, [testsMatchingFiltersExceptOutcome, testFindingFilter, selectedParameterFilter]);

  // 6. DISCHARGES
  const filteredDischarges = useMemo(() => {
    return currentClinicDischargeSummaries
      .filter(d => isWithinDateRange(d.dischargeDate || d.admissionDate))
      .filter(d => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          d.patientName?.toLowerCase().includes(q) ||
          d.patientMrn?.toLowerCase().includes(q) ||
          d.dischargingDoctorName?.toLowerCase().includes(q) ||
          d.dischargeCondition?.toLowerCase().includes(q) ||
          d.clinicalFeatures?.toLowerCase().includes(q) ||
          d.dischargeManagementNotes?.toLowerCase().includes(q)
        );
      });
  }, [currentClinicDischargeSummaries, dateRangeBounds, searchQuery]);

  // 7. REFERRALS
  const filteredReferrals = useMemo(() => {
    return currentClinicReferrals
      .filter(r => isWithinDateRange(r.referralDate || r.admissionDate))
      .filter(r => {
        if (referralUrgencyFilter === 'all') return true;
        return r.urgency === referralUrgencyFilter;
      })
      .filter(r => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          r.patientName?.toLowerCase().includes(q) ||
          r.patientMrn?.toLowerCase().includes(q) ||
          r.destinationHospital?.toLowerCase().includes(q) ||
          r.destinationDepartment?.toLowerCase().includes(q) ||
          r.referringDoctorName?.toLowerCase().includes(q) ||
          r.reasonForReferral?.toLowerCase().includes(q) ||
          r.conditionBeforeReferral?.toLowerCase().includes(q)
        );
      });
  }, [currentClinicReferrals, dateRangeBounds, referralUrgencyFilter, searchQuery]);

  // 8. DEATHS REPORTED
  const filteredDeaths = useMemo(() => {
    return currentClinicDeathCertificates
      .filter(d => isWithinDateRange(d.dateOfDeath))
      .filter(d => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          d.patientName?.toLowerCase().includes(q) ||
          d.patientMrn?.toLowerCase().includes(q) ||
          d.immediateCause?.toLowerCase().includes(q) ||
          d.certifyingDoctorName?.toLowerCase().includes(q) ||
          d.placeOfDeath?.toLowerCase().includes(q) ||
          d.certificateNumber?.toLowerCase().includes(q)
        );
      });
  }, [currentClinicDeathCertificates, dateRangeBounds, searchQuery]);

  // SORTING ENGINE for Active Tab Datasets
  const sortedProcedures = useMemo(() => {
    return [...filteredProcedures].sort((a, b) => {
      let valA: any = a.performedAt || a.createdAt;
      let valB: any = b.performedAt || b.createdAt;

      if (sortField === 'name') {
        valA = a.procedureName?.toLowerCase() || '';
        valB = b.procedureName?.toLowerCase() || '';
      } else if (sortField === 'patient') {
        valA = a.patientName?.toLowerCase() || '';
        valB = b.patientName?.toLowerCase() || '';
      } else if (sortField === 'doctor') {
        valA = a.doctorName?.toLowerCase() || '';
        valB = b.doctorName?.toLowerCase() || '';
      } else if (sortField === 'cost') {
        valA = a.cost || 0;
        valB = b.cost || 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProcedures, sortField, sortDirection]);

  const sortedDiagnoses = useMemo(() => {
    return [...filteredDiagnoses].sort((a, b) => {
      let valA: any = a.visitDate || a.createdAt;
      let valB: any = b.visitDate || b.createdAt;

      if (sortField === 'name') {
        valA = a.workingDiagnosis?.toLowerCase() || '';
        valB = b.workingDiagnosis?.toLowerCase() || '';
      } else if (sortField === 'patient') {
        valA = a.patientName?.toLowerCase() || '';
        valB = b.patientName?.toLowerCase() || '';
      } else if (sortField === 'doctor') {
        valA = a.doctorName?.toLowerCase() || '';
        valB = b.doctorName?.toLowerCase() || '';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredDiagnoses, sortField, sortDirection]);

  const sortedAdmissions = useMemo(() => {
    return [...filteredAdmissions].sort((a, b) => {
      let valA: any = a.admissionDate || a.registeredAt;
      let valB: any = b.admissionDate || b.registeredAt;

      if (sortField === 'name' || sortField === 'patient') {
        valA = `${a.firstName} ${a.lastName}`.toLowerCase();
        valB = `${b.firstName} ${b.lastName}`.toLowerCase();
      } else if (sortField === 'doctor') {
        valA = a.assignedDoctorName?.toLowerCase() || '';
        valB = b.assignedDoctorName?.toLowerCase() || '';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredAdmissions, sortField, sortDirection]);

  const sortedOpd = useMemo(() => {
    return [...filteredOpd].sort((a, b) => {
      let valA: any = a.visitDate || a.createdAt;
      let valB: any = b.visitDate || b.createdAt;

      if (sortField === 'patient') {
        valA = a.patientName?.toLowerCase() || '';
        valB = b.patientName?.toLowerCase() || '';
      } else if (sortField === 'doctor') {
        valA = a.doctorName?.toLowerCase() || '';
        valB = b.doctorName?.toLowerCase() || '';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredOpd, sortField, sortDirection]);

  // 5. SORTED TESTS (Pathology Separated, Radiology Separated, and Combined)
  const sortDiagnosticItems = (items: any[]) => {
    return [...items].sort((a, b) => {
      let valA: any = a.orderedAt;
      let valB: any = b.orderedAt;

      if (sortField === 'name') {
        valA = a.testName?.toLowerCase() || '';
        valB = b.testName?.toLowerCase() || '';
      } else if (sortField === 'patient') {
        valA = a.patientName?.toLowerCase() || '';
        valB = b.patientName?.toLowerCase() || '';
      } else if (sortField === 'doctor') {
        valA = a.doctorName?.toLowerCase() || '';
        valB = b.doctorName?.toLowerCase() || '';
      } else if (sortField === 'cost') {
        valA = a.cost || 0;
        valB = b.cost || 0;
      } else if (sortField === 'findings') {
        valA = a.overallClassification || '';
        valB = b.overallClassification || '';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const sortedPathologyTests = useMemo(() => {
    return sortDiagnosticItems(filteredPathologyTests);
  }, [filteredPathologyTests, sortField, sortDirection]);

  const sortedRadiologyTests = useMemo(() => {
    return sortDiagnosticItems(filteredRadiologyTests);
  }, [filteredRadiologyTests, sortField, sortDirection]);

  const sortedTests = useMemo(() => {
    if (diagnosticsViewMode === 'pathology') return sortedPathologyTests;
    if (diagnosticsViewMode === 'radiology') return sortedRadiologyTests;
    return sortDiagnosticItems(filteredTests);
  }, [filteredTests, sortedPathologyTests, sortedRadiologyTests, diagnosticsViewMode, sortField, sortDirection]);

  const sortedDischarges = useMemo(() => {
    return [...filteredDischarges].sort((a, b) => {
      let valA: any = a.dischargeDate || a.admissionDate;
      let valB: any = b.dischargeDate || b.admissionDate;

      if (sortField === 'patient') {
        valA = a.patientName?.toLowerCase() || '';
        valB = b.patientName?.toLowerCase() || '';
      } else if (sortField === 'doctor') {
        valA = a.dischargingDoctorName?.toLowerCase() || '';
        valB = b.dischargingDoctorName?.toLowerCase() || '';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredDischarges, sortField, sortDirection]);

  const sortedReferrals = useMemo(() => {
    return [...filteredReferrals].sort((a, b) => {
      let valA: any = a.referralDate || a.admissionDate;
      let valB: any = b.referralDate || b.admissionDate;

      if (sortField === 'name') {
        valA = a.destinationHospital?.toLowerCase() || '';
        valB = b.destinationHospital?.toLowerCase() || '';
      } else if (sortField === 'patient') {
        valA = a.patientName?.toLowerCase() || '';
        valB = b.patientName?.toLowerCase() || '';
      } else if (sortField === 'doctor') {
        valA = a.referringDoctorName?.toLowerCase() || '';
        valB = b.referringDoctorName?.toLowerCase() || '';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredReferrals, sortField, sortDirection]);

  const sortedDeaths = useMemo(() => {
    return [...filteredDeaths].sort((a, b) => {
      let valA: any = a.dateOfDeath;
      let valB: any = b.dateOfDeath;

      if (sortField === 'name') {
        valA = a.immediateCause?.toLowerCase() || '';
        valB = b.immediateCause?.toLowerCase() || '';
      } else if (sortField === 'patient') {
        valA = a.patientName?.toLowerCase() || '';
        valB = b.patientName?.toLowerCase() || '';
      } else if (sortField === 'doctor') {
        valA = a.certifyingDoctorName?.toLowerCase() || '';
        valB = b.certifyingDoctorName?.toLowerCase() || '';
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredDeaths, sortField, sortDirection]);

  // Aggregate KPI Calculations
  const topDiagnosesMap = useMemo(() => {
    const map: Record<string, number> = {};
    filteredDiagnoses.forEach(d => {
      const diag = d.workingDiagnosis?.trim();
      if (diag) {
        map[diag] = (map[diag] || 0) + 1;
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [filteredDiagnoses]);

  const topProceduresMap = useMemo(() => {
    const map: Record<string, number> = {};
    filteredProcedures.forEach(p => {
      const name = p.procedureName?.trim();
      if (name) {
        map[name] = (map[name] || 0) + 1;
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [filteredProcedures]);

  const totalProcedureRevenue = useMemo(() => {
    return filteredProcedures.reduce((sum, p) => sum + (p.cost || 0), 0);
  }, [filteredProcedures]);

  const currentlyAdmittedCount = useMemo(() => {
    return filteredAdmissions.filter(a => a.currentStatus === 'in_ward').length;
  }, [filteredAdmissions]);

  // 6. PATHOLOGY & DIAGNOSTIC FINDINGS SURVEILLANCE METRICS
  // Tracks Positives (including Reactive), Negatives (including Non-reactive), and Abnormal Ranges (High & Low)
  const pathologyFindingsMetrics = useMemo(() => {
    let positiveCount = 0;       // Positives (considers Reactive results to also be positives)
    let negativeCount = 0;       // Negatives (considers Non-reactive results to also be negatives)
    let abnormalHighCount = 0;   // High range biomarkers
    let abnormalLowCount = 0;    // Low range biomarkers
    let abnormalOtherCount = 0;  // Other abnormal flagged findings
    let normalCount = 0;         // Within normal limits
    let totalFindings = 0;

    let testsWithPositives = 0;
    let testsWithNegatives = 0;
    let testsWithAbnormalRanges = 0;
    let testsWithHigh = 0;
    let testsWithLow = 0;
    let testsWithNormal = 0;
    let totalCompletedTests = 0;

    const positiveBreakdown: { testName: string; parameter: string; value: string; patient: string; mrn: string; date: string }[] = [];
    const abnormalRangeBreakdown: { testName: string; parameter: string; value: string; unit: string; flag: 'High' | 'Low' | 'Abnormal'; refRange: string; patient: string; mrn: string; date: string }[] = [];

    currentClinicTestOrders
      .filter(t => isWithinDateRange(t.orderedAt))
      .forEach(t => {
        const rawResultsList = Array.isArray(t.results) ? t.results : [];
        if (t.status === 'completed' || rawResultsList.length > 0) {
          totalCompletedTests++;
          let testHasPos = false;
          let testHasNeg = false;
          let testHasAbnormalRange = false;
          let testHasHigh = false;
          let testHasLow = false;
          let testIsNormal = true;

          rawResultsList.forEach(r => {
            const classified = classifyFinding(r);
            totalFindings++;

            if (classified.isPositive) {
              positiveCount++;
              testHasPos = true;
              testIsNormal = false;
              positiveBreakdown.push({
                testName: t.testName,
                parameter: classified.parameter,
                value: classified.value,
                patient: t.patientName,
                mrn: t.patientMrn,
                date: t.orderedAt
              });
            } else if (classified.isNegative) {
              negativeCount++;
              testHasNeg = true;
            } else if (classified.isHighRange) {
              abnormalHighCount++;
              testHasAbnormalRange = true;
              testHasHigh = true;
              testIsNormal = false;
              abnormalRangeBreakdown.push({
                testName: t.testName,
                parameter: classified.parameter,
                value: classified.value,
                unit: classified.unit,
                flag: 'High',
                refRange: classified.referenceRange,
                patient: t.patientName,
                mrn: t.patientMrn,
                date: t.orderedAt
              });
            } else if (classified.isLowRange) {
              abnormalLowCount++;
              testHasAbnormalRange = true;
              testHasLow = true;
              testIsNormal = false;
              abnormalRangeBreakdown.push({
                testName: t.testName,
                parameter: classified.parameter,
                value: classified.value,
                unit: classified.unit,
                flag: 'Low',
                refRange: classified.referenceRange,
                patient: t.patientName,
                mrn: t.patientMrn,
                date: t.orderedAt
              });
            } else if (classified.isAbnormalRange) {
              abnormalOtherCount++;
              testHasAbnormalRange = true;
              testIsNormal = false;
              abnormalRangeBreakdown.push({
                testName: t.testName,
                parameter: classified.parameter,
                value: classified.value,
                unit: classified.unit,
                flag: 'Abnormal',
                refRange: classified.referenceRange,
                patient: t.patientName,
                mrn: t.patientMrn,
                date: t.orderedAt
              });
            } else {
              normalCount++;
            }
          });

          if (testHasPos) testsWithPositives++;
          if (testHasNeg) testsWithNegatives++;
          if (testHasAbnormalRange) testsWithAbnormalRanges++;
          if (testHasHigh) testsWithHigh++;
          if (testHasLow) testsWithLow++;
          if (testIsNormal && rawResultsList.length > 0) testsWithNormal++;
        }
      });

    const totalAbnormalRanges = abnormalHighCount + abnormalLowCount + abnormalOtherCount;

    return {
      positiveCount,
      negativeCount,
      abnormalHighCount,
      abnormalLowCount,
      abnormalOtherCount,
      totalAbnormalRanges,
      normalCount,
      totalFindings,
      testsWithPositives,
      testsWithNegatives,
      testsWithAbnormalRanges,
      testsWithHigh,
      testsWithLow,
      testsWithNormal,
      totalCompletedTests,
      positiveBreakdown,
      abnormalRangeBreakdown
    };
  }, [currentClinicTestOrders, dateRangeBounds]);

  // Toggle Sorting column
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // SEED DEMONSTRATION CLINICAL RECORDS FOR THE ACTIVE CLINIC
  const handleSeedDemoRecords = () => {
    setIsSeeding(true);
    const clinicIdToSeed = activeClinic.id;
    const clinicObj = activeClinic;

    try {
      // 1. Register 3 representative patients
      const patientA = registerPatient({
        firstName: 'Sarah',
        lastName: 'O’Connor',
        gender: 'Female',
        dob: '1988-04-12',
        age: 38,
        patientType: 'IPD',
        registeredClinicId: clinicIdToSeed,
        address: '14 Elm Street, North Ward',
        phone: '+1 555-0192',
        allergies: ['Penicillin'],
        emergencyContact: { name: 'Mark O’Connor', phone: '+1 555-0193', relationship: 'Spouse' },
        ward: 'Female Surgical Ward',
        bedNumber: 'Bed 04',
        admissionDate: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
        assignedDoctorName: 'Sarah Jenkins',
        assignedDoctorId: 'doc-1'
      });

      const patientB = registerPatient({
        firstName: 'David',
        lastName: 'Alvarez',
        gender: 'Male',
        dob: '1962-09-24',
        age: 63,
        patientType: 'OPD',
        registeredClinicId: clinicIdToSeed,
        address: '89 Sunset Boulevard',
        phone: '+1 555-4819',
        allergies: [],
        emergencyContact: { name: 'Elena Alvarez', phone: '+1 555-4820', relationship: 'Daughter' },
        assignedDoctorName: 'Robert Vance',
        assignedDoctorId: 'doc-2'
      });

      const patientC = registerPatient({
        firstName: 'Grace',
        lastName: 'Mwangi',
        gender: 'Female',
        dob: '1995-11-03',
        age: 30,
        patientType: 'IPD',
        registeredClinicId: clinicIdToSeed,
        address: '22 Victoria Heights',
        phone: '+1 555-7731',
        allergies: ['Sulfa drugs'],
        emergencyContact: { name: 'Samuel Mwangi', phone: '+1 555-7732', relationship: 'Brother' },
        ward: 'Emergency Observation Ward',
        bedNumber: 'Bed 01',
        admissionDate: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
        assignedDoctorName: 'Sarah Jenkins',
        assignedDoctorId: 'doc-1'
      });

      // 2. Add Procedures
      saveProcedure({
        procedureCode: 'PRC-001',
        procedureName: 'Wound Debridement & Primary Suture',
        category: 'Wound Care & Suture',
        patientId: patientA.id,
        patientName: `${patientA.firstName} ${patientA.lastName}`,
        patientMrn: patientA.mrn,
        clinicId: clinicIdToSeed,
        doctorId: 'doc-1',
        doctorName: 'Sarah Jenkins',
        anesthesiaType: 'Local Anesthesia',
        outcome: 'Successful',
        cost: 180,
        performedAt: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
        details: 'Copious irrigation with sterile normal saline, non-viable edges excised, layered closure with 3-0 Vicryl and 4-0 Ethilon.',
        findings: 'Deep jagged laceration over dorsal forearm with no tendon breach.'
      });

      saveProcedure({
        procedureCode: 'PRC-005',
        procedureName: 'Diagnostic Lumbar Puncture',
        category: 'Diagnostic / Biopsy',
        patientId: patientC.id,
        patientName: `${patientC.firstName} ${patientC.lastName}`,
        patientMrn: patientC.mrn,
        clinicId: clinicIdToSeed,
        doctorId: 'doc-1',
        doctorName: 'Sarah Jenkins',
        anesthesiaType: 'Local Anesthesia',
        outcome: 'Successful with Monitoring',
        cost: 250,
        performedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
        details: 'L3-L4 interspace punctured under sterile technique. CSF pressure 14 cm H2O. Clear fluid collected in 3 sterile vials.',
        findings: 'CSF opening pressure within normal limits. Samples sent for cytology and biochemistry.'
      });

      // 3. Add Clinical Encounters (Final Diagnoses & OPD Turnover)
      saveEncounter({
        patientId: patientB.id,
        patientName: `${patientB.firstName} ${patientB.lastName}`,
        patientMrn: patientB.mrn,
        patientType: 'OPD',
        clinicId: clinicIdToSeed,
        doctorId: 'doc-2',
        doctorName: 'Robert Vance',
        visitDate: new Date(Date.now() - 6 * 3600000).toISOString(),
        chiefComplaint: 'Recurrent morning headaches, blurred vision for 1 week',
        historyOfPresentIllness: 'Patient reports progressive occipital throbbing headache.',
        vitals: {
          bloodPressure: '168/102',
          pulseRate: 88,
          temperature: 36.8,
          respiratoryRate: 18,
          weightKg: 84,
          heightCm: 175,
          spO2: 98
        },
        physicalExamNotes: 'Fundoscopy reveals grade II hypertensive retinopathy without papilledema.',
        workingDiagnosis: 'Hypertensive Urgency with Mild Retinopathy',
        differentialDiagnosis: 'Secondary Hypertension, Pheochromocytoma',
        clinicalPlan: 'Start Amlodipine 10mg daily. Strict low sodium diet. Ambulatory BP log.',
        status: 'completed'
      });

      saveEncounter({
        patientId: patientA.id,
        patientName: `${patientA.firstName} ${patientA.lastName}`,
        patientMrn: patientA.mrn,
        patientType: 'IPD',
        clinicId: clinicIdToSeed,
        doctorId: 'doc-1',
        doctorName: 'Sarah Jenkins',
        visitDate: new Date(Date.now() - 48 * 3600000).toISOString(),
        chiefComplaint: 'Right lower quadrant abdominal pain with fever',
        historyOfPresentIllness: 'Pain started periumbilically and migrated to McBurney point.',
        vitals: {
          bloodPressure: '124/78',
          pulseRate: 96,
          temperature: 38.3,
          respiratoryRate: 20,
          weightKg: 62,
          heightCm: 165,
          spO2: 99
        },
        physicalExamNotes: 'Guarding and positive Rovsing sign in right lower quadrant.',
        workingDiagnosis: 'Acute Appendicitis (Grade 2 Inflammatory)',
        clinicalPlan: 'Admit to surgical ward, IV Ceftriaxone + Metronidazole, schedule appendectomy.',
        status: 'completed'
      });

      // 4. Add Diagnostic Tests (Pathology with Positives, Reactives, Negatives, Abnormal Ranges & Radiology)
      const orderCBC = createTestOrder({
        patientId: patientA.id,
        patientName: `${patientA.firstName} ${patientA.lastName}`,
        patientMrn: patientA.mrn,
        clinicId: clinicIdToSeed,
        doctorId: 'doc-1',
        doctorName: 'Sarah Jenkins',
        encounterId: 'enc-seed-1',
        testCode: 'LAB-CBC-01',
        testName: 'Complete Blood Count (CBC) with Differential',
        category: 'Hematology',
        clinicalIndication: 'Suspected appendicitis with leukocytosis and anemia workup',
        priority: 'Urgent',
        cost: 45
      });
      recordTestResults(
        orderCBC.id,
        [
          { parameter: 'Hemoglobin (Hb)', value: '8.8', unit: 'g/dL', referenceRange: '12.0 - 16.0', flag: 'Low' },
          { parameter: 'White Blood Cell Count (WBC)', value: '16.8', unit: '10^3/uL', referenceRange: '4.0 - 11.0', flag: 'High' },
          { parameter: 'Platelet Count', value: '265', unit: '10^3/uL', referenceRange: '150 - 450', flag: 'Normal' },
          { parameter: 'Neutrophils', value: '84', unit: '%', referenceRange: '40 - 70', flag: 'High' },
          { parameter: 'Lymphocytes', value: '12', unit: '%', referenceRange: '20 - 45', flag: 'Low' }
        ],
        'Severe neutrophilic leukocytosis with microcytic hypochromic anemia (Low Hb).',
        undefined,
        [
          {
            id: `att-cbc-${Date.now()}`,
            name: 'Sysmex_Automated_CBC_Printout.png',
            size: 142800,
            type: 'image/png',
            dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%23f8fafc"/><rect x="20" y="20" width="560" height="360" rx="8" fill="white" stroke="%23cbd5e1" stroke-width="2"/><text x="40" y="55" font-family="monospace" font-size="16" font-weight="bold" fill="%230f172a">SYSMEX XN-550 AUTOMATED HEMATOLOGY ANALYZER</text><text x="40" y="80" font-family="monospace" font-size="12" fill="%2364748b">CALIBRATED: OK | FLAGS: HIGH WBC, LOW HGB</text><line x1="40" y1="95" x2="560" y2="95" stroke="%23e2e8f0" stroke-width="1.5"/><rect x="40" y="110" width="520" height="240" fill="%23f1f5f9" rx="4"/><text x="55" y="140" font-family="monospace" font-size="13" font-weight="bold" fill="%230f172a">WBC: 16.8 10^3/uL [HIGH *] (Ref: 4.0-11.0)</text><text x="55" y="170" font-family="monospace" font-size="13" font-weight="bold" fill="%23dc2626">HGB: 8.8 g/dL      [LOW  *] (Ref: 12.0-16.0)</text><text x="55" y="200" font-family="monospace" font-size="13" fill="%23334155">PLT: 265 10^3/uL   [NORMAL] (Ref: 150-450)</text><text x="55" y="230" font-family="monospace" font-size="13" fill="%23334155">NEU: 84 %          [HIGH *] (Ref: 40-70)</text><text x="55" y="260" font-family="monospace" font-size="13" fill="%23334155">LYM: 12 %          [LOW  *] (Ref: 20-45)</text><text x="55" y="310" font-family="monospace" font-size="11" fill="%23059669">PRIME ADMIN CLOUD ARCHIVE CERTIFIED &amp; VERIFIED</text></svg>',
            uploadedAt: new Date(Date.now() - 44 * 3600000).toISOString(),
            uploadedBy: 'Clinical Pathologist',
            storageType: 'prime_admin_cloud'
          }
        ]
      );

      const orderMalaria = createTestOrder({
        patientId: patientA.id,
        patientName: `${patientA.firstName} ${patientA.lastName}`,
        patientMrn: patientA.mrn,
        clinicId: clinicIdToSeed,
        doctorId: 'doc-1',
        doctorName: 'Sarah Jenkins',
        encounterId: 'enc-seed-1',
        testCode: 'MAL-RDT-01',
        testName: 'Malaria Rapid Antigen Test (P. falciparum / Pan)',
        category: 'Parasitology',
        clinicalIndication: 'High spiked pyrexia with rigors',
        priority: 'Urgent',
        cost: 15
      });
      recordTestResults(
        orderMalaria.id,
        [
          { parameter: 'Malaria Rapid Antigen (Plasmodium falciparum)', value: 'Positive', unit: 'Rapid Ag/Ab', referenceRange: 'Negative', flag: 'Abnormal' }
        ],
        'P. falciparum histidine-rich protein II band visible. Positive outcome.',
        undefined,
        [
          {
            id: `att-malaria-${Date.now()}`,
            name: 'Rapid_Diagnostic_Cassette_Capture.png',
            size: 98500,
            type: 'image/png',
            dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="350" viewBox="0 0 600 350"><rect width="100%" height="100%" fill="%23f8fafc"/><rect x="20" y="20" width="560" height="310" rx="8" fill="white" stroke="%23cbd5e1" stroke-width="2"/><text x="40" y="55" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23b45309">RAPID MALARIA RDT CASSETTE SCAN</text><text x="40" y="80" font-family="sans-serif" font-size="12" fill="%2364748b">Pf / Pan Antigen Test Band Result</text><rect x="60" y="110" width="220" height="180" rx="10" fill="%23fef3c7" stroke="%23f59e0b" stroke-width="2"/><rect x="100" y="140" width="50" height="120" rx="5" fill="white" stroke="%23d97706"/><line x1="105" y1="165" x2="145" y2="165" stroke="%23dc2626" stroke-width="4"/><text x="160" y="170" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23dc2626">C (Control: Valid)</text><line x1="105" y1="210" x2="145" y2="210" stroke="%23dc2626" stroke-width="4"/><text x="160" y="215" font-family="sans-serif" font-size="12" font-weight="bold" fill="%23dc2626">Pf (Reactive / POSITIVE)</text><text x="320" y="150" font-family="sans-serif" font-size="13" font-weight="bold" fill="%230f172a">Interpretation: P. falciparum Positive</text><text x="320" y="180" font-family="sans-serif" font-size="11" fill="%23475569">Captured via Diagnostic Camera Station</text><text x="320" y="230" font-family="sans-serif" font-size="11" font-weight="bold" fill="%23059669">Archived to Prime Admin Cloud</text></svg>',
            uploadedAt: new Date(Date.now() - 44 * 3600000).toISOString(),
            uploadedBy: 'Clinical Pathologist',
            storageType: 'prime_admin_cloud'
          }
        ]
      );

      const orderHepB = createTestOrder({
        patientId: patientB.id,
        patientName: `${patientB.firstName} ${patientB.lastName}`,
        patientMrn: patientB.mrn,
        clinicId: clinicIdToSeed,
        doctorId: 'doc-2',
        doctorName: 'Robert Vance',
        encounterId: 'enc-seed-2',
        testCode: 'HBSAG-RDT',
        testName: 'Hepatitis B Surface Antigen (HBsAg) Screen',
        category: 'Immunology',
        clinicalIndication: 'Routine viral hepatitis baseline screen',
        priority: 'Routine',
        cost: 25
      });
      recordTestResults(
        orderHepB.id,
        [
          { parameter: 'HBsAg Surface Antigen', value: 'Reactive', unit: 'Serology', referenceRange: 'Non-reactive', flag: 'Abnormal' }
        ],
        'HBsAg Serology Reactive. Confirmatory viral load PCR ordered.'
      );

      const orderHIV = createTestOrder({
        patientId: patientC.id,
        patientName: `${patientC.firstName} ${patientC.lastName}`,
        patientMrn: patientC.mrn,
        clinicId: clinicIdToSeed,
        doctorId: 'doc-1',
        doctorName: 'Sarah Jenkins',
        encounterId: 'enc-seed-3',
        testCode: 'HIV-DUO-RDT',
        testName: 'HIV 1/2 Antibody & p24 Antigen Rapid Screen',
        category: 'Immunology',
        clinicalIndication: 'Pre-admission screening',
        priority: 'Routine',
        cost: 22
      });
      recordTestResults(
        orderHIV.id,
        [
          { parameter: 'HIV 1/2 Antibody Screen', value: 'Non-reactive', unit: 'Serology', referenceRange: 'Non-reactive', flag: 'Normal' }
        ],
        'Both HIV-1 and HIV-2 test lines clear. Non-reactive outcome.'
      );

      const orderRFT = createTestOrder({
        patientId: patientB.id,
        patientName: `${patientB.firstName} ${patientB.lastName}`,
        patientMrn: patientB.mrn,
        clinicId: clinicIdToSeed,
        doctorId: 'doc-2',
        doctorName: 'Robert Vance',
        encounterId: 'enc-seed-2',
        testCode: 'RFT-ELEC',
        testName: 'Renal Function Profile & Serum Electrolytes',
        category: 'Biochemistry',
        clinicalIndication: 'Hypertension and baseline renal clearance',
        priority: 'Routine',
        cost: 50
      });
      recordTestResults(
        orderRFT.id,
        [
          { parameter: 'Serum Creatinine', value: '1.9', unit: 'mg/dL', referenceRange: '0.6 - 1.2', flag: 'High' },
          { parameter: 'Blood Urea Nitrogen (BUN)', value: '29', unit: 'mg/dL', referenceRange: '7 - 20', flag: 'High' },
          { parameter: 'Serum Potassium (K+)', value: '3.1', unit: 'mEq/L', referenceRange: '3.5 - 5.0', flag: 'Low' },
          { parameter: 'Serum Sodium (Na+)', value: '139', unit: 'mEq/L', referenceRange: '135 - 145', flag: 'Normal' }
        ],
        'Elevated urea/creatinine with mild hypokalemia (Low K+).'
      );

      const orderUrinalysis = createTestOrder({
        patientId: patientA.id,
        patientName: `${patientA.firstName} ${patientA.lastName}`,
        patientMrn: patientA.mrn,
        clinicId: clinicIdToSeed,
        doctorId: 'doc-1',
        doctorName: 'Sarah Jenkins',
        encounterId: 'enc-seed-1',
        testCode: 'URN-10SG',
        testName: 'Urinalysis 10-Parameter Automated Strip',
        category: 'Urinalysis',
        clinicalIndication: 'Abdominal pain workup',
        priority: 'Routine',
        cost: 18
      });
      recordTestResults(
        orderUrinalysis.id,
        [
          { parameter: 'Urine Protein (Albumin)', value: 'Positive (2+)', unit: 'Dipstick', referenceRange: 'Negative', flag: 'Abnormal' },
          { parameter: 'Urine Leukocyte Esterase', value: 'Positive', unit: 'Dipstick', referenceRange: 'Negative', flag: 'Abnormal' },
          { parameter: 'Urine Nitrite', value: 'Negative', unit: 'Dipstick', referenceRange: 'Negative', flag: 'Normal' },
          { parameter: 'Urine Glucose', value: 'Negative', unit: 'Dipstick', referenceRange: 'Negative', flag: 'Normal' }
        ],
        'Moderate proteinuria and leukocyte positivity. Negative for glycosuria.'
      );

      // 4. Add Diagnostic Tests (Pathology & Imaging Separated)
      createRadiologyOrder({
        patientId: patientA.id,
        patientName: `${patientA.firstName} ${patientA.lastName}`,
        patientMrn: patientA.mrn,
        clinicId: clinicIdToSeed,
        doctorId: 'doc-1',
        doctorName: 'Sarah Jenkins',
        encounterId: 'enc-seed-1',
        procedureCode: 'RAD-USG-01',
        procedureName: 'High-Resolution Abdominal Ultrasound',
        modality: 'Ultrasound',
        bodyPart: 'Abdomen & Pelvis',
        clinicalHistory: 'Suspected acute appendicitis with localized peritonism',
        priority: 'Emergency',
        cost: 110,
        findings: 'Dilated, non-compressible tubular structure in RLQ measuring 8.5mm with periappendiceal fat stranding and appendicolith.',
        impression: 'Features consistent with Acute Non-Perforated Appendicitis (Pathology Identified)',
        attachments: [
          {
            id: `att-usg-${Date.now()}`,
            name: 'Abdominal_USG_Appendix_Capture.png',
            size: 185400,
            type: 'image/png',
            dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%230f172a"/><rect x="20" y="20" width="560" height="360" rx="6" fill="%23020617" stroke="%23334155" stroke-width="2"/><text x="40" y="50" font-family="monospace" font-size="14" fill="%2338bdf8">GE LOGIQ E9 &bull; HIGH-RESOLUTION ABDOMINAL ULTRASOUND</text><text x="40" y="70" font-family="monospace" font-size="11" fill="%2394a3b8">PATIENT: SARAH CONNER (MRN: CLN-OPD-1001) | PROBE: 9L LINEAR</text><ellipse cx="300" cy="220" rx="140" ry="80" fill="%231e293b" stroke="%230ea5e9" stroke-width="2" stroke-dasharray="4"/><path d="M 240 220 Q 300 170 360 220" stroke="%2338bdf8" stroke-width="4" fill="none"/><text x="260" y="210" font-family="monospace" font-size="11" fill="%23f87171">[D1: 8.5 mm]</text><text x="40" y="360" font-family="monospace" font-size="11" font-weight="bold" fill="%2334d399">PRIME ADMIN CLOUD ARCHIVE CERTIFIED &amp; VERIFIED</text></svg>',
            uploadedAt: new Date(Date.now() - 44 * 3600000).toISOString(),
            uploadedBy: 'Radiology Specialist',
            storageType: 'prime_admin_cloud'
          }
        ]
      });

      createRadiologyOrder({
        patientId: patientB.id,
        patientName: `${patientB.firstName} ${patientB.lastName}`,
        patientMrn: patientB.mrn,
        clinicId: clinicIdToSeed,
        doctorId: 'doc-2',
        doctorName: 'Robert Vance',
        encounterId: 'enc-seed-2',
        procedureCode: 'RAD-XRY-01',
        procedureName: 'Digital Chest X-Ray PA View',
        modality: 'X-Ray',
        bodyPart: 'Chest / Thorax',
        clinicalHistory: 'Hypertensive patient workup, evaluate for cardiomegaly or pulmonary edema',
        priority: 'Routine',
        cost: 65,
        findings: 'Clear bilateral lung fields. Normal cardiothoracic ratio (CTR < 0.50). Sharp costophrenic angles. No active focal consolidation, pneumothorax, or pleural effusion.',
        impression: 'Normal Chest Radiograph within normal limits. Unremarkable study.',
        attachments: [
          {
            id: `att-xray-${Date.now()}`,
            name: 'Digital_Chest_XRay_PA.png',
            size: 245000,
            type: 'image/png',
            dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420" viewBox="0 0 600 420"><rect width="100%" height="100%" fill="%23090d16"/><rect x="20" y="20" width="560" height="380" rx="8" fill="%23040711" stroke="%231e293b" stroke-width="2"/><text x="40" y="55" font-family="monospace" font-size="14" font-weight="bold" fill="%230284c7">DIGITAL CHEST RADIOGRAPH (PA VIEW) - DR SYSTEM</text><text x="40" y="75" font-family="monospace" font-size="11" fill="%2364748b">PATIENT: MICHAEL CHANG (MRN: CLN-OPD-1002) | 120 kVp, 3.2 mAs</text><path d="M 200 130 C 140 180 140 280 180 320 C 220 290 230 220 240 150 Z" fill="%23172554" opacity="0.8"/><path d="M 400 130 C 460 180 460 280 420 320 C 380 290 370 220 360 150 Z" fill="%23172554" opacity="0.8"/><path d="M 270 200 C 270 280 330 310 340 310 C 360 280 350 210 320 200 Z" fill="%231e293b" stroke="%2338bdf8" stroke-width="1.5"/><text x="40" y="380" font-family="monospace" font-size="11" font-weight="bold" fill="%2310b981">ARCHIVED IN PRIME ADMIN CLOUD STORAGE &bull; CERTIFIED</text></svg>',
            uploadedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
            uploadedBy: 'Radiologist',
            storageType: 'prime_admin_cloud'
          }
        ]
      });

      createRadiologyOrder({
        patientId: patientC.id,
        patientName: `${patientC.firstName} ${patientC.lastName}`,
        patientMrn: patientC.mrn,
        clinicId: clinicIdToSeed,
        doctorId: 'doc-1',
        doctorName: 'Sarah Jenkins',
        encounterId: 'enc-seed-3',
        procedureCode: 'RAD-CT-01',
        procedureName: 'Non-Contrast Cranial CT Scan',
        modality: 'CT Scan',
        bodyPart: 'Head / Brain',
        clinicalHistory: 'Sudden severe headache with nausea, exclude acute intracranial event',
        priority: 'Urgent',
        cost: 220,
        findings: 'Symmetric cerebral hemispheres with normal grey-white differentiation. Ventricles and basal cisterns are unremarkable. No acute intracranial hemorrhage, mass effect, or midline shift.',
        impression: 'Unremarkable Non-Contrast Brain CT. No acute intracranial pathology.'
      });

      createRadiologyOrder({
        patientId: patientA.id,
        patientName: `${patientA.firstName} ${patientA.lastName}`,
        patientMrn: patientA.mrn,
        clinicId: clinicIdToSeed,
        doctorId: 'doc-2',
        doctorName: 'Robert Vance',
        encounterId: 'enc-seed-1',
        procedureCode: 'RAD-MRI-01',
        procedureName: 'Lumbar Spine MRI (T1/T2/STIR)',
        modality: 'MRI',
        bodyPart: 'Lumbar Spine',
        clinicalHistory: 'Chronic low back pain radiating down left lower extremity (L5 distribution)',
        priority: 'Routine',
        cost: 380,
        findings: 'L4-L5 disc desiccation with a 4.2mm focal posterolateral disc extrusion impinging on traversing left L5 nerve root. Mild thecal sac indentation. Conus medullaris terminates normally at L1.',
        impression: 'L4-L5 Disc Herniation with Left L5 Radicular Nerve Root Compression (Pathology Identified)'
      });

      // 5. Add Discharge Summary
      saveDischargeSummary({
        clinicId: clinicIdToSeed,
        patientId: patientB.id,
        patientName: `${patientB.firstName} ${patientB.lastName}`,
        patientMrn: patientB.mrn,
        patientAge: patientB.age,
        patientGender: patientB.gender,
        ward: 'Medical Ward',
        bedNumber: 'Bed 06',
        admissionDate: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
        dischargeDate: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
        dischargingDoctorId: 'doc-2',
        dischargingDoctorName: 'Robert Vance',
        firstChiefComplaint: 'Hypertensive Urgency, Headache',
        testsDoneSummary: ['ECG: Sinus rhythm with LVH criteria', 'Serum Creatinine: 0.9 mg/dL'],
        finalDiagnosis: 'Essential Hypertension Stage 2 - Controlled',
        clinicalFeatures: 'BP stabilized to 126/82 mmHg on combined therapy. Headache fully resolved.',
        managementGiven: 'IV Labetalol 20mg bolus, transitioned to oral Amlodipine 10mg + Telmisartan 40mg.',
        dischargeCondition: 'Recovered / Cured',
        dischargeManagementNotes: 'Continue DASH diet. Check home BP daily. Avoid NSAIDs.',
        followUpInstructions: 'Review in Outpatient Clinic in 2 weeks.',
        status: 'finalized'
      });

      // 6. Add Referral
      saveReferral({
        clinicId: clinicIdToSeed,
        patientId: patientC.id,
        patientName: `${patientC.firstName} ${patientC.lastName}`,
        patientMrn: patientC.mrn,
        patientAge: patientC.age,
        patientGender: patientC.gender,
        admissionDate: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
        referralDate: new Date().toISOString(),
        referringFacilityName: clinicObj.name,
        referringFacilityCode: clinicObj.code,
        referringFacilityPhone: clinicObj.phone,
        referringFacilityAddress: clinicObj.address,
        referringDoctorId: 'doc-1',
        referringDoctorName: 'Sarah Jenkins',
        referringDoctorRole: 'Attending Physician',
        destinationHospital: 'Metropolitan Tertiary University Hospital',
        destinationDepartment: 'Neurosurgical Critical Care Unit (NCCU)',
        conditionBeforeReferral: 'Guarded with supplemental O2, GCS 14/15',
        reasonForReferral: 'Tertiary neuro-imaging (3T MRI Brain with contrast) and specialized neurosurgical assessment.',
        urgency: 'urgent',
        referralNumber: `REF-${new Date().getFullYear()}-0089`,
        status: 'completed',
        diagnosis: 'Tertiary Neuro-evaluation',
        clinicalSummary: 'Patient presented with sudden severe cranial episode, GCS 14/15.',
        vitalsAtReferral: {
          bloodPressure: '130/80',
          pulseRate: 76,
          temperature: 36.9,
          respiratoryRate: 18,
          spO2: 98,
          gcs: '14/15'
        },
        investigationsSummary: ['CSF Lumbar Puncture: clear fluid, opening pressure 14 cm H2O'],
        treatmentsGiven: 'Analgesia, IV Hydration, Vital signs monitoring q1h',
        knownAllergies: ['Sulfa drugs']
      });

      // 7. Add Death Certificate (MCCD)
      saveDeathCertificate({
        clinicId: clinicIdToSeed,
        patientId: 'pt-deceased-sample',
        patientName: 'Arthur Pendelton',
        patientMrn: 'IPD-2026-9012',
        patientAge: 79,
        patientGender: 'Male',
        dateOfDeath: new Date(Date.now() - 36 * 3600000).toISOString().slice(0, 10),
        timeOfDeath: '04:15',
        placeOfDeath: `${clinicObj.name} - ICU Suite 2`,
        informantName: 'Eleanor Pendelton',
        informantRelationship: 'Spouse',
        immediateCause: 'Acute Cardiogenic Shock',
        immediateCauseInterval: '45 minutes',
        antecedentCause: 'Massive Antero-Septal Myocardial Infarction',
        antecedentCauseInterval: '6 hours',
        underlyingCause: 'Severe Triple-Vessel Coronary Artery Disease',
        mannerOfDeath: 'natural',
        autopsyRequested: 'not_indicated',
        certifyingDoctorId: 'doc-1',
        certifyingDoctorName: 'Sarah Jenkins',
        certifyingDoctorRole: 'Critical Care Physician',
        certificateNumber: `MCCD-${new Date().getFullYear()}-004`,
        status: 'finalized',
        certifiedAt: new Date().toISOString(),
        bodyReleasedTo: 'hospital_mortuary'
      });

    } catch (e) {
      console.error('Demo seeding completed with fallback:', e);
    } finally {
      setIsSeeding(false);
    }
  };

  // EXCEL EXPORT ACTIONS
  const handleExportCurrentTab = () => {
    const clinicTag = targetClinic.name.replace(/\s+/g, '_');
    const dateTag = new Date().toISOString().slice(0, 10);

    let sheetData: ExcelSheetData | null = null;

    if (activeTab === 'procedures') {
      sheetData = {
        sheetName: 'Procedures Done',
        data: sortedProcedures.map(p => ({
          'Procedure Code': p.procedureCode,
          'Procedure Name': p.procedureName,
          'Category': p.category,
          'Patient Name': p.patientName,
          'Patient MRN': p.patientMrn,
          'Surgeon / Doctor': `Dr. ${p.doctorName}`,
          'Date Performed': new Date(p.performedAt || p.createdAt).toLocaleString(),
          'Anesthesia': p.anesthesiaType || 'None',
          'Clinical Outcome': p.outcome,
          'Tariff Scheme': p.insurancePolicyName || 'Cash / Standard',
          'Fee Billed ($)': p.cost,
          'Assistants': p.assistants || 'N/A',
          'Technique Details': p.details,
          'Intra-Operative Findings': p.findings || 'N/A',
          'Post-Procedure Care': p.postProcedureCare || 'N/A'
        }))
      };
    } else if (activeTab === 'diagnoses') {
      sheetData = {
        sheetName: 'Final Diagnoses',
        data: sortedDiagnoses.map(d => ({
          'Encounter Date': new Date(d.visitDate || d.createdAt || '').toLocaleDateString(),
          'Patient Name': d.patientName,
          'Patient MRN': d.patientMrn,
          'Patient Type': d.patientType || 'OPD',
          'Attending Doctor': `Dr. ${d.doctorName}`,
          'Working / Final Diagnosis': d.workingDiagnosis,
          'Differential Diagnosis': d.differentialDiagnosis || 'None',
          'Chief Complaint': d.chiefComplaint,
          'Encounter Status': d.status,
          'Clinical Plan': d.clinicalPlan || 'N/A',
          'Medications Prescribed': (d.medicationsPrescribed || []).join(', ') || 'None',
          'Investigations Ordered': (d.investigationsOrdered || []).join(', ') || 'None'
        }))
      };
    } else if (activeTab === 'admissions') {
      sheetData = {
        sheetName: 'Admissions IPD',
        data: sortedAdmissions.map(a => ({
          'Admission Date': a.admissionDate ? new Date(a.admissionDate).toLocaleString() : 'N/A',
          'Patient MRN': a.mrn,
          'Patient Name': `${a.firstName} ${a.lastName}`,
          'Gender': a.gender,
          'Age': a.ageDisplay || a.rawAge || a.age,
          'Admitting Doctor': a.assignedDoctorName ? `Dr. ${a.assignedDoctorName}` : 'N/A',
          'Assigned Ward': a.ward || 'Unassigned',
          'Assigned Bed': a.bedNumber || 'N/A',
          'Current Status': a.currentStatus,
          'Contact Phone': a.phone || 'N/A',
          'Insurance Policy': a.insurancePolicyName || 'Cash / Self-Pay'
        }))
      };
    } else if (activeTab === 'opd') {
      sheetData = {
        sheetName: 'OPD Turnover',
        data: sortedOpd.map(o => ({
          'Consultation Date': new Date(o.visitDate || o.createdAt || '').toLocaleString(),
          'Patient Name': o.patientName,
          'Patient MRN': o.patientMrn,
          'Doctor': `Dr. ${o.doctorName}`,
          'Chief Complaint': o.chiefComplaint,
          'Working Diagnosis': o.workingDiagnosis,
          'BP': o.vitals?.bloodPressure || 'N/A',
          'Pulse (bpm)': o.vitals?.pulseRate || 'N/A',
          'Temp (°C)': o.vitals?.temperature || 'N/A',
          'SpO2 (%)': o.vitals?.spO2 || 'N/A',
          'Status': o.status,
          'Follow-Up Date': o.followUpDate || 'None'
        }))
      };
    } else if (activeTab === 'tests') {
      if (diagnosticsViewMode === 'pathology') {
        sheetData = {
          sheetName: 'Pathology Lab Tests',
          data: sortedPathologyTests.map(t => ({
            'Order Date': new Date(t.orderedAt).toLocaleString(),
            'Investigation': t.testName,
            'Category': t.category,
            'Specimen': t.specimenType || 'Standard',
            'Patient Name': t.patientName,
            'Patient MRN': t.patientMrn,
            'Ordering Doctor': `Dr. ${t.doctorName}`,
            'Status': t.status,
            'Urgency': t.urgency,
            'Classification': t.overallClassification === 'positive'
              ? 'Positive / Reactive'
              : t.overallClassification === 'negative'
              ? 'Negative / Non-reactive'
              : t.overallClassification === 'abnormal_range'
              ? 'Abnormal Range (High/Low)'
              : 'Within Normal Limits',
            'Fee ($)': t.cost || 0,
            'Biomarker Results': t.results || 'Pending Result'
          }))
        };
      } else if (diagnosticsViewMode === 'radiology') {
        sheetData = {
          sheetName: 'Imaging Radiology Tests',
          data: sortedRadiologyTests.map(r => ({
            'Order Date': new Date(r.orderedAt).toLocaleString(),
            'Modality': r.category,
            'Study / Procedure': r.testName,
            'Anatomical Region': r.bodyPart || 'Standard',
            'Patient Name': r.patientName,
            'Patient MRN': r.patientMrn,
            'Ordering Doctor': `Dr. ${r.doctorName}`,
            'Status': r.status,
            'Urgency': r.urgency,
            'Findings Classification': r.overallClassification === 'positive'
              ? 'Positive / Pathology Detected'
              : r.overallClassification === 'normal'
              ? 'Normal / Unremarkable'
              : 'Pending',
            'Fee ($)': r.cost || 0,
            'Radiologist Impression': r.impressionText || 'Pending',
            'Formal Findings': r.findingsText || 'Pending'
          }))
        };
      } else {
        sheetData = {
          sheetName: 'Diagnostic Tests (All)',
          data: sortedTests.map(t => ({
            'Order Date': new Date(t.orderedAt).toLocaleString(),
            'Department': t.testType,
            'Test Name': t.testName,
            'Category / Modality': t.category,
            'Patient Name': t.patientName,
            'Patient MRN': t.patientMrn,
            'Ordering Doctor': `Dr. ${t.doctorName}`,
            'Status': t.status,
            'Urgency': t.urgency,
            'Outcome Classification': t.overallClassification === 'positive'
              ? 'Positive / Reactive'
              : t.overallClassification === 'negative'
              ? 'Negative / Non-reactive'
              : t.overallClassification === 'abnormal_range'
              ? 'Abnormal Range (High/Low)'
              : t.overallClassification === 'normal'
              ? 'Within Normal Limits'
              : 'Pending Analysis',
            'Price ($)': t.cost || 0,
            'Findings / Results': t.results || 'Pending Result'
          }))
        };
      }
    } else if (activeTab === 'discharges') {
      sheetData = {
        sheetName: 'Discharges',
        data: sortedDischarges.map(d => ({
          'Discharge Date': new Date(d.dischargeDate || d.admissionDate).toLocaleString(),
          'Patient Name': d.patientName,
          'Patient MRN': d.patientMrn,
          'Attending Doctor': `Dr. ${d.dischargingDoctorName}`,
          'Discharge Condition': d.dischargeCondition,
          'Clinical Features': d.clinicalFeatures,
          'Take-Home Medications Count': (d.dischargeMedications || []).length,
          'Discharge Instructions': d.dischargeManagementNotes || 'N/A'
        }))
      };
    } else if (activeTab === 'referrals') {
      sheetData = {
        sheetName: 'Patient Referrals',
        data: sortedReferrals.map(r => ({
          'Referral Date': new Date(r.referralDate || r.admissionDate).toLocaleString(),
          'Referral #': r.referralNumber || 'N/A',
          'Patient Name': r.patientName,
          'Patient MRN': r.patientMrn,
          'Receiving Facility': r.destinationHospital,
          'Specialist Unit': r.destinationDepartment || 'N/A',
          'Urgency': r.urgency,
          'Handover Condition': r.conditionBeforeReferral,
          'Reason for Referral': r.reasonForReferral,
          'Referring Doctor': `Dr. ${r.referringDoctorName}`
        }))
      };
    } else if (activeTab === 'deaths') {
      sheetData = {
        sheetName: 'Deaths Reported',
        data: sortedDeaths.map(d => ({
          'Date of Death': d.dateOfDeath,
          'Time of Death': d.timeOfDeath,
          'Patient Name': d.patientName,
          'Patient MRN': d.patientMrn,
          'Place of Death': d.placeOfDeath,
          'Immediate Cause of Death': d.immediateCause,
          'Manner of Death': d.mannerOfDeath,
          'Certifying Medical Officer': `Dr. ${d.certifyingDoctorName}`,
          'Certificate #': d.certificateNumber || 'N/A'
        }))
      };
    } else {
      // Overview Tab Export
      handleExportAllSheets();
      return;
    }

    if (sheetData) {
      exportDataSetsToExcel(
        [sheetData],
        `ViperH.M.S_${clinicTag}_${activeTab.toUpperCase()}_${dateTag}`
      );
    }
  };

  // Full Multi-Sheet Excel Export
  const handleExportAllSheets = () => {
    const clinicTag = targetClinic.name.replace(/\s+/g, '_');
    const dateTag = new Date().toISOString().slice(0, 10);

    const summarySheet: ExcelSheetData = {
      sheetName: 'Executive Summary',
      data: [
        { Metric: 'Clinic Facility Name', Value: targetClinic.name },
        { Metric: 'Facility Code', Value: targetClinic.code },
        { Metric: 'Report Date Generated', Value: new Date().toLocaleString() },
        { Metric: 'Date Range Scope', Value: datePreset.toUpperCase() },
        { Metric: 'Total Procedures Done', Value: filteredProcedures.length },
        { Metric: 'Total Procedure Billing ($)', Value: `$${totalProcedureRevenue.toFixed(2)}` },
        { Metric: 'Total Final Diagnoses Logged', Value: filteredDiagnoses.length },
        { Metric: 'Total Inpatient Admissions', Value: filteredAdmissions.length },
        { Metric: 'Current Inpatients in Ward', Value: currentlyAdmittedCount },
        { Metric: 'Total OPD Turnover Volume', Value: filteredOpd.length },
        { Metric: 'Total Diagnostic Tests Ordered', Value: filteredTests.length },
        { Metric: 'Total Positive Findings (incl. Reactive)', Value: pathologyFindingsMetrics.positiveCount },
        { Metric: 'Total Negative Findings (incl. Non-reactive)', Value: pathologyFindingsMetrics.negativeCount },
        { Metric: 'Total Abnormal Range Findings (High & Low)', Value: pathologyFindingsMetrics.totalAbnormalRanges },
        { Metric: '  - High Range Biomarkers (Above Limits)', Value: pathologyFindingsMetrics.abnormalHighCount },
        { Metric: '  - Low Range Biomarkers (Below Limits)', Value: pathologyFindingsMetrics.abnormalLowCount },
        { Metric: 'Total Normal Range Findings', Value: pathologyFindingsMetrics.normalCount },
        { Metric: 'Test Orders with Positives / Reactive', Value: pathologyFindingsMetrics.testsWithPositives },
        { Metric: 'Test Orders with Abnormal Biomarkers', Value: pathologyFindingsMetrics.testsWithAbnormalRanges },
        { Metric: 'Total Patient Discharges', Value: filteredDischarges.length },
        { Metric: 'Total External Referrals', Value: filteredReferrals.length },
        { Metric: 'Total Deaths Reported (MCCD)', Value: filteredDeaths.length }
      ]
    };

    const proceduresSheet: ExcelSheetData = {
      sheetName: 'Procedures Done',
      data: sortedProcedures.map(p => ({
        'Code': p.procedureCode,
        'Procedure Name': p.procedureName,
        'Category': p.category,
        'Patient Name': p.patientName,
        'Patient MRN': p.patientMrn,
        'Doctor': `Dr. ${p.doctorName}`,
        'Date Performed': new Date(p.performedAt || p.createdAt).toLocaleString(),
        'Anesthesia': p.anesthesiaType || 'None',
        'Outcome': p.outcome,
        'Tariff Scheme': p.insurancePolicyName || 'Cash / Self-Pay',
        'Cost ($)': p.cost
      }))
    };

    const diagnosesSheet: ExcelSheetData = {
      sheetName: 'Final Diagnoses',
      data: sortedDiagnoses.map(d => ({
        'Date': new Date(d.visitDate || d.createdAt || '').toLocaleDateString(),
        'Patient Name': d.patientName,
        'Patient MRN': d.patientMrn,
        'Attending Doctor': `Dr. ${d.doctorName}`,
        'Working Diagnosis': d.workingDiagnosis,
        'Differential Diagnosis': d.differentialDiagnosis || 'None',
        'Chief Complaint': d.chiefComplaint,
        'Status': d.status
      }))
    };

    const admissionsSheet: ExcelSheetData = {
      sheetName: 'Admissions IPD',
      data: sortedAdmissions.map(a => ({
        'Admission Date': a.admissionDate ? new Date(a.admissionDate).toLocaleString() : 'N/A',
        'MRN': a.mrn,
        'Patient Name': `${a.firstName} ${a.lastName}`,
        'Ward': a.ward || 'Unassigned',
        'Bed': a.bedNumber || 'N/A',
        'Doctor': a.assignedDoctorName ? `Dr. ${a.assignedDoctorName}` : 'N/A',
        'Status': a.currentStatus
      }))
    };

    const opdSheet: ExcelSheetData = {
      sheetName: 'OPD Turnover',
      data: sortedOpd.map(o => ({
        'Consult Date': new Date(o.visitDate || o.createdAt || '').toLocaleString(),
        'Patient Name': o.patientName,
        'MRN': o.patientMrn,
        'Doctor': `Dr. ${o.doctorName}`,
        'Chief Complaint': o.chiefComplaint,
        'Working Diagnosis': o.workingDiagnosis,
        'BP': o.vitals?.bloodPressure || 'N/A',
        'HR': o.vitals?.pulseRate || 'N/A',
        'Temp': o.vitals?.temperature || 'N/A'
      }))
    };

    const pathologySheet: ExcelSheetData = {
      sheetName: 'Pathology Lab Tests',
      data: sortedPathologyTests.map(t => ({
        'Date': new Date(t.orderedAt).toLocaleString(),
        'Investigation': t.testName,
        'Category': t.category,
        'Specimen': t.specimenType || 'Standard',
        'Patient': t.patientName,
        'MRN': t.patientMrn,
        'Doctor': `Dr. ${t.doctorName}`,
        'Status': t.status,
        'Urgency': t.urgency,
        'Outcome Classification': t.overallClassification === 'positive'
          ? 'Positive / Reactive'
          : t.overallClassification === 'negative'
          ? 'Negative / Non-reactive'
          : t.overallClassification === 'abnormal_range'
          ? 'Abnormal Range'
          : 'Within Normal Limits',
        'Cost ($)': t.cost || 0,
        'Biomarker Results': t.results || 'Pending Result'
      }))
    };

    const imagingSheet: ExcelSheetData = {
      sheetName: 'Imaging Radiology Tests',
      data: sortedRadiologyTests.map(r => ({
        'Date': new Date(r.orderedAt).toLocaleString(),
        'Modality': r.category,
        'Study Name': r.testName,
        'Anatomical Region': r.bodyPart || 'Standard',
        'Patient': r.patientName,
        'MRN': r.patientMrn,
        'Doctor': `Dr. ${r.doctorName}`,
        'Status': r.status,
        'Urgency': r.urgency,
        'Clinical Indication': r.clinicalHistory || 'N/A',
        'Radiologist Impression': r.impressionText || 'Pending',
        'Formal Findings': r.findingsText || 'Pending',
        'Cost ($)': r.cost || 0
      }))
    };

    const testsSheet: ExcelSheetData = {
      sheetName: 'Diagnostic Tests (All)',
      data: sortedTests.map(t => ({
        'Date': new Date(t.orderedAt).toLocaleString(),
        'Department': t.testType,
        'Test Name': t.testName,
        'Category / Modality': t.category,
        'Patient': t.patientName,
        'MRN': t.patientMrn,
        'Doctor': `Dr. ${t.doctorName}`,
        'Status': t.status,
        'Urgency': t.urgency,
        'Outcome Classification': t.overallClassification === 'positive'
          ? 'Positive / Reactive'
          : t.overallClassification === 'negative'
          ? 'Negative / Non-reactive'
          : t.overallClassification === 'abnormal_range'
          ? 'Abnormal Range (High/Low)'
          : t.overallClassification === 'normal'
          ? 'Within Normal Limits'
          : 'Pending Analysis',
        'Cost ($)': t.cost || 0,
        'Detailed Results': t.results || 'Pending Result'
      }))
    };

    const dischargesSheet: ExcelSheetData = {
      sheetName: 'Discharges',
      data: sortedDischarges.map(d => ({
        'Date': new Date(d.dischargeDate || d.admissionDate).toLocaleString(),
        'Patient Name': d.patientName,
        'MRN': d.patientMrn,
        'Doctor': `Dr. ${d.dischargingDoctorName}`,
        'Condition': d.dischargeCondition,
        'Clinical Summary': d.clinicalFeatures
      }))
    };

    const referralsSheet: ExcelSheetData = {
      sheetName: 'Referrals',
      data: sortedReferrals.map(r => ({
        'Date': new Date(r.referralDate || r.admissionDate).toLocaleString(),
        'Ref #': r.referralNumber || 'N/A',
        'Patient Name': r.patientName,
        'MRN': r.patientMrn,
        'Receiving Hospital': r.destinationHospital,
        'Unit': r.destinationDepartment || 'General Specialist',
        'Urgency': r.urgency,
        'Reason': r.reasonForReferral,
        'Doctor': `Dr. ${r.referringDoctorName}`
      }))
    };

    const deathsSheet: ExcelSheetData = {
      sheetName: 'Deaths Reported',
      data: sortedDeaths.map(d => ({
        'Date': d.dateOfDeath,
        'Time': d.timeOfDeath,
        'Patient Name': d.patientName,
        'MRN': d.patientMrn,
        'Place of Death': d.placeOfDeath,
        'Immediate Cause': d.immediateCause,
        'Manner': d.mannerOfDeath,
        'Certifying Officer': `Dr. ${d.certifyingDoctorName}`,
        'Cert #': d.certificateNumber || 'N/A'
      }))
    };

    exportDataSetsToExcel(
      [
        summarySheet,
        proceduresSheet,
        diagnosesSheet,
        admissionsSheet,
        opdSheet,
        pathologySheet,
        imagingSheet,
        testsSheet,
        dischargesSheet,
        referralsSheet,
        deathsSheet
      ],
      `ViperH.M.S_Comprehensive_Medical_Records_${clinicTag}_${dateTag}`
    );
  };

  return (
    <div id="medical-records-intelligence-dashboard" className="space-y-6 text-xs select-none">
      
      {/* TOP HEADER: Individual Clinic Selector & Profile Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shadow-xs shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                Medical Records & Clinical Intelligence Monitor
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                Facility Specific EHR
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Comprehensive surveillance of procedures done, final diagnoses, inpatient admissions, OPD turnover, test orders, discharges, referrals, and mortalities.
            </p>
          </div>
        </div>

        {/* Stand-Alone Facility Privacy & Isolation Indicator */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex items-center gap-2.5 bg-emerald-50 text-emerald-900 border border-emerald-200 px-3.5 py-2 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="text-left">
              <div className="text-[11px] font-bold leading-tight flex items-center gap-1.5">
                <span>Tenant Stand-Alone Isolation</span>
                <span className="bg-emerald-200/80 text-emerald-950 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase">Private</span>
              </div>
              <p className="text-[10px] text-emerald-700 leading-tight">Data confined strictly to {activeClinic.name}</p>
            </div>
          </div>

          {/* Quick Demo Records Generator Button */}
          <button
            type="button"
            onClick={handleSeedDemoRecords}
            disabled={isSeeding}
            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer text-xs shrink-0"
            title="Inject realistic medical records across all 8 modules for demonstration in this clinic"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isSeeding ? 'Generating...' : '+ Demo Records'}</span>
          </button>
        </div>
      </div>

      {/* ACTIVE CLINIC HIGHLIGHT BANNER */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-bold text-sm">
            {targetClinic.code ? targetClinic.code.slice(0, 3) : 'HIM'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide">{targetClinic.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-white/15 border border-white/20">
                {targetClinic.code}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Stand-Alone Facility
              </span>
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-2">
              <span>{targetClinic.address}</span>
              <span>&bull;</span>
              <span>{targetClinic.phone}</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] text-slate-400">Security & Isolation Status</div>
          <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1 md:justify-end">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Tenant Isolated &bull; Zero Cross-Network Exposure
          </div>
        </div>
      </div>

      {/* FILTER & EXPORT ACTION CONTROL BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Left: Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Timeframe:
            </span>
            {(
              [
                { id: 'all', label: 'All Records' },
                { id: 'today', label: 'Today' },
                { id: 'last_7_days', label: '7 Days' },
                { id: 'this_month', label: 'This Month' },
                { id: 'last_30_days', label: '30 Days' },
                { id: 'this_year', label: 'This Year' },
                { id: 'custom', label: 'Custom Range' }
              ] as const
            ).map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDatePreset(preset.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  datePreset === preset.id
                    ? 'bg-indigo-700 text-white shadow-2xs font-bold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Right: Excel Export Buttons */}
          <div className="flex items-center gap-2 self-end lg:self-center">
            <button
              id="export-active-dataset-btn"
              type="button"
              onClick={handleExportCurrentTab}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
              title="Export currently filtered dataset as Excel document (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export {activeTab === 'overview' ? 'All Data' : 'Current View'} (.xlsx)</span>
            </button>

            <button
              id="export-full-workbook-btn"
              type="button"
              onClick={handleExportAllSheets}
              className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
              title="Export complete 9-sheet medical records audit workbook (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Full Workbook (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Custom Date Range Row if 'custom' is active */}
        {datePreset === 'custom' && (
          <div className="flex items-center gap-3 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
            <span className="font-bold text-indigo-950 text-xs">Custom Date Range:</span>
            <div className="flex items-center gap-2">
              <label className="text-slate-600 text-[11px]">From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-600 text-[11px]">To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium"
              />
            </div>
          </div>
        )}

        {/* Search & Sort Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          
          {/* Live Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by patient name, MRN, doctor, procedure, diagnosis, test name, hospital, etc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              Sort By:
            </span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 cursor-pointer focus:ring-2 focus:ring-indigo-500"
            >
              <option value="date">Date & Timestamp</option>
              <option value="name">Item / Procedure / Diagnosis Name</option>
              <option value="patient">Patient Name</option>
              <option value="doctor">Attending Doctor</option>
              <option value="cost">Fee / Billing Cost</option>
            </select>
            <button
              type="button"
              onClick={() => setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center gap-1 cursor-pointer"
              title={`Toggle sort direction (Current: ${sortDirection.toUpperCase()})`}
            >
              {sortDirection === 'asc' ? (
                <>
                  <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>A-Z / Asc</span>
                </>
              ) : (
                <>
                  <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Z-A / Desc</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>

      {/* DATASET TABS NAVIGATION STRIP */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {[
          { id: 'overview', label: 'Executive Overview', icon: Activity, count: null },
          { id: 'procedures', label: 'Procedures Done', icon: Scissors, count: filteredProcedures.length },
          { id: 'diagnoses', label: 'Final Diagnoses', icon: Stethoscope, count: filteredDiagnoses.length },
          { id: 'admissions', label: 'Admissions (IPD)', icon: Bed, count: filteredAdmissions.length },
          { id: 'opd', label: 'OPD Turnover', icon: Users, count: filteredOpd.length },
          { id: 'tests', label: 'Diagnostic Tests', icon: Microscope, count: filteredTests.length },
          { id: 'discharges', label: 'Discharges', icon: DischargedIcon, count: filteredDischarges.length },
          { id: 'referrals', label: 'Referrals', icon: Ambulance, count: filteredReferrals.length },
          { id: 'deaths', label: 'Deaths Reported', icon: HeartCrack, count: filteredDeaths.length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              type="button"
              onClick={() => setActiveTab(tab.id as DatasetTab)}
              className={`px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          
          {/* Key Metric Cards Bento Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3.5">
            
            {/* Procedures Card */}
            <div
              onClick={() => setActiveTab('procedures')}
              className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Procedures Done</span>
                <Scissors className="w-4 h-4 text-teal-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-slate-900">{filteredProcedures.length}</div>
              <div className="text-[11px] text-teal-700 font-semibold mt-1">
                Billed: ${totalProcedureRevenue.toFixed(2)}
              </div>
            </div>

            {/* Diagnoses Card */}
            <div
              onClick={() => setActiveTab('diagnoses')}
              className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Final Diagnoses</span>
                <Stethoscope className="w-4 h-4 text-sky-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-slate-900">{filteredDiagnoses.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {topDiagnosesMap.length} distinct pathologies
              </div>
            </div>

            {/* Admissions Card */}
            <div
              onClick={() => setActiveTab('admissions')}
              className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">IPD Admissions</span>
                <Bed className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-slate-900">{filteredAdmissions.length}</div>
              <div className="text-[11px] text-indigo-700 font-semibold mt-1">
                {currentlyAdmittedCount} currently in ward
              </div>
            </div>

            {/* OPD Turnover Card */}
            <div
              onClick={() => setActiveTab('opd')}
              className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">OPD Turnover</span>
                <Users className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-slate-900">{filteredOpd.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                Outpatient consults recorded
              </div>
            </div>

            {/* Tests Ordered Card */}
            <div
              onClick={() => setActiveTab('tests')}
              className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Diagnostic Tests</span>
                <Microscope className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-slate-900">{filteredTests.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                Pathology Lab & Radiology
              </div>
            </div>

            {/* Discharges Card */}
            <div
              onClick={() => setActiveTab('discharges')}
              className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Discharges</span>
                <DischargedIcon className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-slate-900">{filteredDischarges.length}</div>
              <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                Discharge files completed
              </div>
            </div>

            {/* Referrals Card */}
            <div
              onClick={() => setActiveTab('referrals')}
              className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">External Referrals</span>
                <Ambulance className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-slate-900">{filteredReferrals.length}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                Transfers to tertiary centers
              </div>
            </div>

            {/* Deaths Reported Card */}
            <div
              onClick={() => setActiveTab('deaths')}
              className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Deaths Reported</span>
                <HeartCrack className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-rose-700">{filteredDeaths.length}</div>
              <div className="text-[11px] text-rose-600 font-medium mt-1">
                MCCD certificates on file
              </div>
            </div>

          </div>

          {/* PATHOLOGY & DIAGNOSTIC FINDINGS SURVEILLANCE TRACKER */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                  <Microscope className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span>Pathology & Diagnostic Findings Surveillance</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                      Live Lab Analytics
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Continuous tracking of positive findings (including reactive), negatives (including non-reactive), and abnormal biomarker ranges (low and high).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTestFindingFilter('all');
                  setActiveTab('tests');
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 self-start sm:self-auto"
              >
                <span>Full Tests Matrix</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 4 Surveillance KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* 1. Positives (incl. Reactive) */}
              <div
                onClick={() => {
                  setTestFindingFilter('positive');
                  setActiveTab('tests');
                }}
                className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50 transition-all cursor-pointer group space-y-2"
                title="Click to view positive & reactive lab orders in tests tab"
              >
                <div className="flex items-center justify-between text-rose-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-rose-600" />
                    Positives (incl. Reactive)
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    Reactive = Positive
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-rose-900">
                    {pathologyFindingsMetrics.positiveCount}
                  </span>
                  <span className="text-[11px] text-rose-700 font-semibold">
                    findings detected
                  </span>
                </div>
                <div className="text-[10px] text-rose-700/90 leading-tight pt-1 border-t border-rose-200/60 flex items-center justify-between">
                  <span>Across {pathologyFindingsMetrics.testsWithPositives} lab orders</span>
                  <span className="font-bold underline group-hover:text-rose-900">Filter View &rarr;</span>
                </div>
              </div>

              {/* 2. Negatives (incl. Non-reactive) */}
              <div
                onClick={() => {
                  setTestFindingFilter('negative');
                  setActiveTab('tests');
                }}
                className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 transition-all cursor-pointer group space-y-2"
                title="Click to view negative & non-reactive lab orders in tests tab"
              >
                <div className="flex items-center justify-between text-emerald-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Negatives (incl. Non-reactive)
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Non-reactive = Negative
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-900">
                    {pathologyFindingsMetrics.negativeCount}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    findings verified
                  </span>
                </div>
                <div className="text-[10px] text-emerald-700/90 leading-tight pt-1 border-t border-emerald-200/60 flex items-center justify-between">
                  <span>Across {pathologyFindingsMetrics.testsWithNegatives} lab orders</span>
                  <span className="font-bold underline group-hover:text-emerald-900">Filter View &rarr;</span>
                </div>
              </div>

              {/* 3. Abnormal Ranges (High & Low) */}
              <div
                onClick={() => {
                  setTestFindingFilter('abnormal_range');
                  setActiveTab('tests');
                }}
                className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 transition-all cursor-pointer group space-y-2"
                title="Click to view abnormal range findings in tests tab"
              >
                <div className="flex items-center justify-between text-amber-900">
                  <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-amber-600" />
                    Abnormal Ranges (High & Low)
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Biomarker Series
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-amber-950">
                    {pathologyFindingsMetrics.totalAbnormalRanges}
                  </span>
                  <span className="text-[11px] text-amber-800 font-semibold">
                    out-of-range parameters
                  </span>
                </div>
                <div className="flex items-center gap-1.5 pt-1 border-t border-amber-200/60">
                  <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 border border-red-200 text-[10px] font-bold flex items-center gap-0.5">
                    ▲ {pathologyFindingsMetrics.abnormalHighCount} High
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold flex items-center gap-0.5">
                    ▼ {pathologyFindingsMetrics.abnormalLowCount} Low
                  </span>
                  <span className="text-[10px] text-amber-800/80 ml-auto font-bold underline group-hover:text-amber-950">
                    Filter &rarr;
                  </span>
                </div>
              </div>

              {/* 4. Normal / Within Reference Limits */}
              <div
                onClick={() => {
                  setTestFindingFilter('normal');
                  setActiveTab('tests');
                }}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 transition-all cursor-pointer group space-y-2"
                title="Click to view tests with normal parameters in tests tab"
              >
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Within Reference Limits
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-slate-800">
                    Normal Baseline
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">
                    {pathologyFindingsMetrics.normalCount}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    normal parameters
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 leading-tight pt-1 border-t border-slate-200 flex items-center justify-between">
                  <span>Standard biological ranges</span>
                  <span className="font-bold underline group-hover:text-slate-800">Filter View &rarr;</span>
                </div>
              </div>

            </div>

            {/* Deep Breakdown Rows: Active Positives & Out-of-Range Biomarkers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              
              {/* Positives & Reactive Findings List */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />
                    Positive & Reactive Test Results ({pathologyFindingsMetrics.positiveBreakdown.length})
                  </span>
                  <span className="text-[10px] text-slate-500">Qualitative & Serology</span>
                </div>
                {pathologyFindingsMetrics.positiveBreakdown.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {pathologyFindingsMetrics.positiveBreakdown.slice(0, 6).map((item, idx) => (
                      <div key={idx} className="p-2 bg-white rounded-lg border border-rose-100 flex items-center justify-between gap-2 text-[11px]">
                        <div>
                          <div className="font-bold text-slate-900">{item.testName}</div>
                          <div className="text-[10px] text-slate-500">
                            {item.parameter} &bull; <span className="font-mono">{item.mrn}</span> ({item.patient})
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                          {item.value}
                        </span>
                      </div>
                    ))}
                    {pathologyFindingsMetrics.positiveBreakdown.length > 6 && (
                      <div className="text-center text-[10px] text-slate-400">
                        + {pathologyFindingsMetrics.positiveBreakdown.length - 6} more positive findings
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs italic bg-white rounded-lg border border-slate-200">
                    No positive or reactive results recorded for the selected scope.
                  </div>
                )}
              </div>

              {/* Abnormal Ranges (High & Low) Findings List */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-amber-600" />
                    Abnormal Range Biomarkers (High & Low) ({pathologyFindingsMetrics.abnormalRangeBreakdown.length})
                  </span>
                  <span className="text-[10px] text-slate-500">Quantitative Series</span>
                </div>
                {pathologyFindingsMetrics.abnormalRangeBreakdown.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {pathologyFindingsMetrics.abnormalRangeBreakdown.slice(0, 6).map((item, idx) => (
                      <div key={idx} className="p-2 bg-white rounded-lg border border-amber-100 flex items-center justify-between gap-2 text-[11px]">
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1">
                            <span>{item.parameter}</span>
                            <span className="text-[10px] text-slate-400 font-normal">({item.testName})</span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Ref: {item.refRange} {item.unit} &bull; <span className="font-mono">{item.mrn}</span> ({item.patient})
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
                          item.flag === 'High'
                            ? 'bg-red-100 text-red-800 border-red-200'
                            : item.flag === 'Low'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {item.flag === 'High' ? '▲ ' : item.flag === 'Low' ? '▼ ' : ''}{item.value} {item.unit} ({item.flag})
                        </span>
                      </div>
                    ))}
                    {pathologyFindingsMetrics.abnormalRangeBreakdown.length > 6 && (
                      <div className="text-center text-[10px] text-slate-400">
                        + {pathologyFindingsMetrics.abnormalRangeBreakdown.length - 6} more out-of-range parameters
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs italic bg-white rounded-lg border border-slate-200">
                    No out-of-range high/low biomarker parameters detected.
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Deep Dive Breakdown Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* Top Diagnoses Surveillance */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-sky-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Disease Surveillance: Top Final Diagnoses
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('diagnoses')}
                  className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  View All <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {topDiagnosesMap.length > 0 ? (
                <div className="space-y-2.5">
                  {topDiagnosesMap.map(([diagnosis, count], idx) => {
                    const pct = Math.round((count / (filteredDiagnoses.length || 1)) * 100);
                    return (
                      <div key={diagnosis} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">
                            {idx + 1}. {diagnosis}
                          </span>
                          <span className="font-mono text-slate-600 font-bold">
                            {count} cases ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-sky-500 h-2 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 italic">
                  No diagnosis records found for the selected timeframe. Click &quot;+ Demo Records&quot; above to generate sample cases.
                </div>
              )}
            </div>

            {/* Top Procedures Conducted */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-teal-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Surgical & Minor Procedures Performed
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('procedures')}
                  className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  View All <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {topProceduresMap.length > 0 ? (
                <div className="space-y-2.5">
                  {topProceduresMap.map(([procName, count], idx) => {
                    const pct = Math.round((count / (filteredProcedures.length || 1)) * 100);
                    return (
                      <div key={procName} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">
                            {idx + 1}. {procName}
                          </span>
                          <span className="font-mono text-slate-600 font-bold">
                            {count} performed ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-teal-500 h-2 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 italic">
                  No clinical procedures recorded for the selected timeframe. Click &quot;+ Demo Records&quot; above to generate sample cases.
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: PROCEDURES DONE */}
      {activeTab === 'procedures' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-teal-600" />
                <span>Procedures Performed at {targetClinic.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                  {sortedProcedures.length} Procedures
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Surgical logs, anesthesia technique, clinical outcome, and fee settlement.
              </p>
            </div>

            {/* Outcome Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-600">Outcome:</span>
              <select
                value={procedureOutcomeFilter}
                onChange={(e) => setProcedureOutcomeFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-800"
              >
                <option value="all">All Outcomes</option>
                <option value="Successful">Successful</option>
                <option value="Successful with Monitoring">Successful with Monitoring</option>
                <option value="Partial">Partial</option>
                <option value="Complications">Complications</option>
                <option value="Referred">Referred</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th
                    onClick={() => handleSort('date')}
                    className="py-3 px-3 cursor-pointer hover:text-indigo-600"
                  >
                    Timestamp {sortField === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    className="py-3 px-3 cursor-pointer hover:text-indigo-600"
                  >
                    Procedure Name {sortField === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleSort('patient')}
                    className="py-3 px-3 cursor-pointer hover:text-indigo-600"
                  >
                    Patient {sortField === 'patient' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleSort('doctor')}
                    className="py-3 px-3 cursor-pointer hover:text-indigo-600"
                  >
                    Surgeon / Doctor {sortField === 'doctor' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-3">Anesthesia</th>
                  <th className="py-3 px-3">Outcome</th>
                  <th className="py-3 px-3">Tariff Scheme</th>
                  <th
                    onClick={() => handleSort('cost')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-indigo-600"
                  >
                    Fee Billed {sortField === 'cost' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedProcedures.map(proc => (
                  <tr key={proc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {new Date(proc.performedAt || proc.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      <div>{proc.procedureName}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="font-mono text-[9px] px-1 py-0.2 bg-slate-100 rounded text-slate-600">
                          {proc.procedureCode}
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          {proc.category}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      <div>{proc.patientName}</div>
                      <div className="font-mono text-[10px] text-slate-400">{proc.patientMrn}</div>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">
                      Dr. {proc.doctorName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {proc.anesthesiaType || 'None'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          proc.outcome === 'Successful'
                            ? 'bg-emerald-100 text-emerald-800'
                            : proc.outcome === 'Successful with Monitoring'
                            ? 'bg-sky-100 text-sky-800'
                            : proc.outcome === 'Partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {proc.outcome}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px]">
                      {proc.insurancePolicyName ? (
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {proc.insurancePolicyName}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">Cash / Self-Pay</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      ${(proc.cost || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}

                {sortedProcedures.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      No procedures found matching the selected clinic and filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FINAL DIAGNOSES */}
      {activeTab === 'diagnoses' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-sky-600" />
                <span>Final Diagnoses & Clinical Impressions</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                  {sortedDiagnoses.length} Records
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Working diagnoses, differential impressions, and clinical treatment protocols.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th
                    onClick={() => handleSort('date')}
                    className="py-3 px-3 cursor-pointer hover:text-indigo-600"
                  >
                    Visit Date {sortField === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleSort('patient')}
                    className="py-3 px-3 cursor-pointer hover:text-indigo-600"
                  >
                    Patient {sortField === 'patient' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleSort('doctor')}
                    className="py-3 px-3 cursor-pointer hover:text-indigo-600"
                  >
                    Attending Physician {sortField === 'doctor' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    className="py-3 px-3 cursor-pointer hover:text-indigo-600"
                  >
                    Final / Working Diagnosis {sortField === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-3">Chief Complaint</th>
                  <th className="py-3 px-3">Encounter Status</th>
                  <th className="py-3 px-3">Clinical Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedDiagnoses.map(diag => (
                  <tr key={diag.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {new Date(diag.visitDate || diag.createdAt || '').toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <div>{diag.patientName}</div>
                      <div className="font-mono text-[10px] text-slate-400">{diag.patientMrn}</div>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">
                      Dr. {diag.doctorName}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{diag.workingDiagnosis}</div>
                      {diag.differentialDiagnosis && (
                        <div className="text-[10px] text-slate-500 italic">
                          Diff: {diag.differentialDiagnosis}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                      {diag.chiefComplaint}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          diag.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : diag.status === 'awaiting_results'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {diag.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                      {diag.clinicalPlan || 'Routine clinical management'}
                    </td>
                  </tr>
                ))}

                {sortedDiagnoses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                      No diagnosis records found for the selected clinic and filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ADMISSIONS (IPD) */}
      {activeTab === 'admissions' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Bed className="w-4 h-4 text-indigo-600" />
                <span>Inpatient (IPD) Admissions at {targetClinic.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                  {sortedAdmissions.length} Admissions
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Inpatient ward occupancy, admission dates, and patient stay status.
              </p>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-600">Filter:</span>
              <select
                value={admissionStatusFilter}
                onChange={(e) => setAdmissionStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-800"
              >
                <option value="all">All Inpatients</option>
                <option value="current">Currently in Ward</option>
                <option value="discharged">Discharged Inpatients</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th
                    onClick={() => handleSort('date')}
                    className="py-3 px-3 cursor-pointer hover:text-indigo-600"
                  >
                    Admission Date {sortField === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleSort('patient')}
                    className="py-3 px-3 cursor-pointer hover:text-indigo-600"
                  >
                    Patient {sortField === 'patient' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-3">Ward & Bed</th>
                  <th
                    onClick={() => handleSort('doctor')}
                    className="py-3 px-3 cursor-pointer hover:text-indigo-600"
                  >
                    Attending Doctor {sortField === 'doctor' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-3">Payer / Insurance</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedAdmissions.map(adm => (
                  <tr key={adm.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {adm.admissionDate ? new Date(adm.admissionDate).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <div>{adm.firstName} {adm.lastName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {adm.mrn} &bull; {adm.gender}, {formatPatientAge(adm, 'short')}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      <div>{adm.ward || 'Unassigned Ward'}</div>
                      <div className="text-[10px] text-slate-500">Bed: {adm.bedNumber || 'N/A'}</div>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">
                      {adm.assignedDoctorName ? `Dr. ${adm.assignedDoctorName}` : 'Attending Physician'}
                    </td>
                    <td className="py-2.5 px-3 text-[11px]">
                      {adm.insurancePolicyName ? (
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {adm.insurancePolicyName}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">Cash / Self-Pay</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          adm.currentStatus === 'in_ward'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            : adm.currentStatus === 'discharged'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {adm.currentStatus === 'in_ward' ? 'In Ward' : adm.currentStatus}
                      </span>
                    </td>
                  </tr>
                ))}

                {sortedAdmissions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                      No inpatient admissions found for this facility.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: OPD TURNOVER */}
      {activeTab === 'opd' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <span>Outpatient (OPD) Consultation Turnover</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {sortedOpd.length} Consultations
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Patient flow velocity, triage parameters, and outpatient turnover volume.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th
                    onClick={() => handleSort('date')}
                    className="py-3 px-3 cursor-pointer hover:text-indigo-600"
                  >
                    Consult Date {sortField === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleSort('patient')}
                    className="py-3 px-3 cursor-pointer hover:text-indigo-600"
                  >
                    Patient {sortField === 'patient' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleSort('doctor')}
                    className="py-3 px-3 cursor-pointer hover:text-indigo-600"
                  >
                    Doctor {sortField === 'doctor' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-3">Chief Complaint</th>
                  <th className="py-3 px-3">Vitals (BP / HR / Temp / SpO2)</th>
                  <th className="py-3 px-3">Working Diagnosis</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedOpd.map(opd => (
                  <tr key={opd.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {new Date(opd.visitDate || opd.createdAt || '').toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <div>{opd.patientName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{opd.patientMrn}</div>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">
                      Dr. {opd.doctorName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate">
                      {opd.chiefComplaint}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {opd.vitals?.bloodPressure || '--'} mmHg &bull; {opd.vitals?.pulseRate || '--'} bpm &bull; {opd.vitals?.temperature || '--'}°C &bull; {opd.vitals?.spO2 || '--'}%
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {opd.workingDiagnosis}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          opd.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : opd.status === 'awaiting_results'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {opd.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {sortedOpd.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                      No OPD consultations found for this facility.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: DIAGNOSTIC TESTS (Separated Pathology & Imaging Investigations) */}
      {activeTab === 'tests' && (
        <SeparatedDiagnosticTestsView
          diagnosticsViewMode={diagnosticsViewMode}
          setDiagnosticsViewMode={setDiagnosticsViewMode}
          sortedPathologyTests={sortedPathologyTests}
          sortedRadiologyTests={sortedRadiologyTests}
          sortedTests={sortedTests}
          scopedPathologyMetrics={scopedPathologyMetrics}
          scopedImagingMetrics={scopedImagingMetrics}
          availablePathologyNames={availablePathologyNames}
          availableParametersForFilter={availableParametersForFilter}
          availableImagingProcedures={availableImagingProcedures}
          availableImagingModalities={availableImagingModalities}
          selectedTestNameFilter={selectedTestNameFilter}
          setSelectedTestNameFilter={setSelectedTestNameFilter}
          selectedParameterFilter={selectedParameterFilter}
          setSelectedParameterFilter={setSelectedParameterFilter}
          testFindingFilter={testFindingFilter}
          setTestFindingFilter={setTestFindingFilter}
          isSelectedTestWithRanges={isSelectedTestWithRanges}
          rangeParametersSummary={rangeParametersSummary}
          selectedParameterMetrics={selectedParameterMetrics}
          imagingModalityFilter={imagingModalityFilter}
          setImagingModalityFilter={setImagingModalityFilter}
          imagingProcedureFilter={imagingProcedureFilter}
          setImagingProcedureFilter={setImagingProcedureFilter}
          imagingOutcomeFilter={imagingOutcomeFilter}
          setImagingOutcomeFilter={setImagingOutcomeFilter}
          sortField={sortField}
          sortDirection={sortDirection}
          handleSort={handleSort}
          expandedFindingTestId={expandedFindingTestId}
          setExpandedFindingTestId={setExpandedFindingTestId}
          expandedImagingId={expandedImagingId}
          setExpandedImagingId={setExpandedImagingId}
          handleSeedDemoRecords={handleSeedDemoRecords}
        />
      )}

      {/* TAB 7: DISCHARGES */}
      {activeTab === 'discharges' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <DischargedIcon className="w-4 h-4 text-emerald-600" />
                <span>Patient Discharges & Outcomes</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {sortedDischarges.length} Discharges
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Discharge conditions, recovery status, take-home prescriptions, and follow-up directives.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th
                    onClick={() => handleSort('date')}
                    className="py-3 px-3 cursor-pointer hover:text-indigo-600"
                  >
                    Discharge Date {sortField === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleSort('patient')}
                    className="py-3 px-3 cursor-pointer hover:text-indigo-600"
                  >
                    Patient {sortField === 'patient' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleSort('doctor')}
                    className="py-3 px-3 cursor-pointer hover:text-indigo-600"
                  >
                    Discharging Physician {sortField === 'doctor' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-3">Condition at Discharge</th>
                  <th className="py-3 px-3">Clinical Summary / Features</th>
                  <th className="py-3 px-3">Take-Home Rx</th>
                  <th className="py-3 px-3">Post-Discharge Care</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedDischarges.map(dc => (
                  <tr key={dc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {new Date(dc.dischargeDate || dc.admissionDate).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <div>{dc.patientName}</div>
                      <div className="font-mono text-[10px] text-slate-400">{dc.patientMrn}</div>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">
                      Dr. {dc.dischargingDoctorName}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {dc.dischargeCondition}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate">
                      {dc.clinicalFeatures}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      {(dc.dischargeMedications || []).length} medications
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                      {dc.dischargeManagementNotes || 'Routine care instructions'}
                    </td>
                  </tr>
                ))}

                {sortedDischarges.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                      No discharge summaries found for this clinic.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: REFERRALS */}
      {activeTab === 'referrals' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Ambulance className="w-4 h-4 text-blue-600" />
                <span>External Patient Referrals & Transfers</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  {sortedReferrals.length} Referrals
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Transfers to tertiary hospitals, specialist surgical units, and clinical justification.
              </p>
            </div>

            {/* Urgency Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-600">Urgency:</span>
              <select
                value={referralUrgencyFilter}
                onChange={(e) => setReferralUrgencyFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-800"
              >
                <option value="all">All Urgencies</option>
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th
                    onClick={() => handleSort('date')}
                    className="py-3 px-3 cursor-pointer hover:text-indigo-600"
                  >
                    Referral Date {sortField === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-3">Ref #</th>
                  <th
                    onClick={() => handleSort('patient')}
                    className="py-3 px-3 cursor-pointer hover:text-indigo-600"
                  >
                    Patient {sortField === 'patient' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    className="py-3 px-3 cursor-pointer hover:text-indigo-600"
                  >
                    Destination Facility {sortField === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-3">Specialist Unit</th>
                  <th className="py-3 px-3">Urgency</th>
                  <th className="py-3 px-3">Clinical Justification</th>
                  <th
                    onClick={() => handleSort('doctor')}
                    className="py-3 px-3 cursor-pointer hover:text-indigo-600"
                  >
                    Referring Doctor {sortField === 'doctor' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedReferrals.map(ref => (
                  <tr key={ref.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {new Date(ref.referralDate || ref.admissionDate).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                      {ref.referralNumber || 'REF-N/A'}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <div>{ref.patientName}</div>
                      <div className="font-mono text-[10px] text-slate-400">{ref.patientMrn}</div>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {ref.destinationHospital}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">
                      {ref.destinationDepartment || 'General Specialist'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ref.urgency === 'emergency'
                            ? 'bg-rose-100 text-rose-800'
                            : ref.urgency === 'urgent'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ref.urgency}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate">
                      {ref.reasonForReferral}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">
                      Dr. {ref.referringDoctorName}
                    </td>
                  </tr>
                ))}

                {sortedReferrals.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      No referral records found for this facility.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 9: DEATHS REPORTED (MCCD) */}
      {activeTab === 'deaths' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-rose-950 flex items-center gap-2">
                <HeartCrack className="w-4 h-4 text-rose-600" />
                <span>Mortality Surveillance: Deaths Reported & MCCD</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                  {sortedDeaths.length} Records
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Medical Certificates of Cause of Death (WHO MCCD), immediate causes, and certifying officers.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-rose-50/50 text-rose-950 font-bold border-b border-rose-200">
                <tr>
                  <th
                    onClick={() => handleSort('date')}
                    className="py-3 px-3 cursor-pointer hover:text-rose-700"
                  >
                    Date & Time of Death {sortField === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleSort('patient')}
                    className="py-3 px-3 cursor-pointer hover:text-rose-700"
                  >
                    Deceased Patient {sortField === 'patient' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-3">Place of Death</th>
                  <th
                    onClick={() => handleSort('name')}
                    className="py-3 px-3 cursor-pointer hover:text-rose-700"
                  >
                    Immediate Cause of Death (WHO 1a) {sortField === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-3">Manner of Death</th>
                  <th
                    onClick={() => handleSort('doctor')}
                    className="py-3 px-3 cursor-pointer hover:text-rose-700"
                  >
                    Certifying Doctor {sortField === 'doctor' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-3">Certificate #</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedDeaths.map(d => (
                  <tr key={d.id} className="hover:bg-rose-50/40 transition-colors">
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-medium">
                      {d.dateOfDeath} at {d.timeOfDeath}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      <div>{d.patientName}</div>
                      <div className="font-mono text-[10px] text-slate-400">{d.patientMrn}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {d.placeOfDeath}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {d.immediateCause}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold capitalize bg-slate-100 text-slate-700">
                        {d.mannerOfDeath}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">
                      Dr. {d.certifyingDoctorName}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                      {d.certificateNumber || 'MCCD-PENDING'}
                    </td>
                  </tr>
                ))}

                {sortedDeaths.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                      No mortality records or death certificates reported for this facility.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
