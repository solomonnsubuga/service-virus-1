import React from 'react';
import {
  Microscope,
  Film,
  FlaskConical,
  SlidersHorizontal,
  XCircle,
  Filter,
  CheckCircle2,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { ClassifiedFinding } from './MedicalRecordsDashboard';

interface SeparatedDiagnosticTestsViewProps {
  diagnosticsViewMode: 'split' | 'pathology' | 'radiology' | 'combined';
  setDiagnosticsViewMode: (mode: 'split' | 'pathology' | 'radiology' | 'combined') => void;
  sortedPathologyTests: any[];
  sortedRadiologyTests: any[];
  sortedTests: any[];
  scopedPathologyMetrics: {
    positiveCount: number;
    negativeCount: number;
    abnormalHighCount: number;
    abnormalLowCount: number;
    totalAbnormalRanges: number;
    normalCount: number;
    totalOrders: number;
    testsWithPositives: number;
    testsWithNegatives: number;
    testsWithAbnormalRanges: number;
    testsWithNormal: number;
  };
  scopedImagingMetrics: {
    totalScans: number;
    positiveCount: number;
    normalCount: number;
    emergencyUrgentCount: number;
    pendingCount: number;
    modalityCounts: Record<string, number>;
  };
  availablePathologyNames: string[];
  availableParametersForFilter: { parameter: string; unit?: string; referenceRange?: string; testName?: string }[];
  availableImagingProcedures: string[];
  availableImagingModalities: string[];
  selectedTestNameFilter: string;
  setSelectedTestNameFilter: (val: string) => void;
  selectedParameterFilter: string;
  setSelectedParameterFilter: (val: string) => void;
  testFindingFilter: 'all' | 'positive' | 'negative' | 'abnormal_range' | 'high_range' | 'low_range' | 'normal';
  setTestFindingFilter: (val: 'all' | 'positive' | 'negative' | 'abnormal_range' | 'high_range' | 'low_range' | 'normal') => void;
  isSelectedTestWithRanges: boolean;
  rangeParametersSummary: any[];
  selectedParameterMetrics: any;
  imagingModalityFilter: string;
  setImagingModalityFilter: (val: string) => void;
  imagingProcedureFilter: string;
  setImagingProcedureFilter: (val: string) => void;
  imagingOutcomeFilter: 'all' | 'positive' | 'normal' | 'pending';
  setImagingOutcomeFilter: (val: 'all' | 'positive' | 'normal' | 'pending') => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  handleSort: (field: string) => void;
  expandedFindingTestId: string | null;
  setExpandedFindingTestId: (id: string | null) => void;
  expandedImagingId: string | null;
  setExpandedImagingId: (id: string | null) => void;
  handleSeedDemoRecords: () => void;
}

export const SeparatedDiagnosticTestsView: React.FC<SeparatedDiagnosticTestsViewProps> = ({
  diagnosticsViewMode,
  setDiagnosticsViewMode,
  sortedPathologyTests,
  sortedRadiologyTests,
  sortedTests,
  scopedPathologyMetrics,
  scopedImagingMetrics,
  availablePathologyNames,
  availableParametersForFilter,
  availableImagingProcedures,
  availableImagingModalities,
  selectedTestNameFilter,
  setSelectedTestNameFilter,
  selectedParameterFilter,
  setSelectedParameterFilter,
  testFindingFilter,
  setTestFindingFilter,
  isSelectedTestWithRanges,
  rangeParametersSummary,
  selectedParameterMetrics,
  imagingModalityFilter,
  setImagingModalityFilter,
  imagingProcedureFilter,
  setImagingProcedureFilter,
  imagingOutcomeFilter,
  setImagingOutcomeFilter,
  sortField,
  sortDirection,
  handleSort,
  expandedFindingTestId,
  setExpandedFindingTestId,
  expandedImagingId,
  setExpandedImagingId,
  handleSeedDemoRecords
}) => {
  const showPathology = diagnosticsViewMode === 'split' || diagnosticsViewMode === 'pathology';
  const showImaging = diagnosticsViewMode === 'split' || diagnosticsViewMode === 'radiology';
  const showCombined = diagnosticsViewMode === 'combined';

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* TOP VIEW SWITCHER: SEPARATION OF IMAGING TESTS & PATHOLOGY TESTS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                <Activity className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm text-slate-900">
                Diagnostics Tests Ordered & Surveillance
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                {sortedTests.length} Total Investigations
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Separated Clinical Review: <strong>Pathology Laboratory Tests</strong> (Analyte ranges & reactive/positive status) and <strong>Imaging Radiology Tests</strong> (Modality scans & radiologist impressions).
            </p>
          </div>

          {/* Department Separation View Mode Switcher */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setDiagnosticsViewMode('split')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                diagnosticsViewMode === 'split'
                  ? 'bg-white text-indigo-900 shadow-xs border border-indigo-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="View both Pathology and Imaging separated into distinct dedicated sections"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
              <span>Split View (Separated)</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {sortedPathologyTests.length} Lab | {sortedRadiologyTests.length} Imaging
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDiagnosticsViewMode('pathology')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                diagnosticsViewMode === 'pathology'
                  ? 'bg-white text-purple-900 shadow-xs border border-purple-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Microscope className="w-3.5 h-3.5 text-purple-600" />
              <span>Pathology Tests Only</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800">
                {sortedPathologyTests.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDiagnosticsViewMode('radiology')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                diagnosticsViewMode === 'radiology'
                  ? 'bg-white text-sky-900 shadow-xs border border-sky-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Film className="w-3.5 h-3.5 text-sky-600" />
              <span>Imaging Tests Only</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-100 text-sky-800">
                {sortedRadiologyTests.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDiagnosticsViewMode('combined')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                diagnosticsViewMode === 'combined'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Combined Matrix</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-slate-800">
                {sortedTests.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: PATHOLOGY TESTS ORDERED (LABORATORY INVESTIGATIONS) */}
      {showPathology && (
        <div className="bg-white rounded-2xl border border-purple-200/90 p-5 shadow-xs space-y-4">
          
          {/* Pathology Header & Sub-filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span className="p-1 rounded-md bg-purple-100 text-purple-700">
                  <Microscope className="w-4 h-4" />
                </span>
                <span>Pathology Tests Ordered (Laboratory Investigations)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  {sortedPathologyTests.length} Lab Orders
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Surveillance of positive & reactive findings, negative & non-reactive findings, and abnormal biomarker ranges (High ▲ & Low ▼).
              </p>
            </div>

            {/* Pathology Sub-filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Pathology Test Name */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Microscope className="w-3.5 h-3.5 text-purple-600" />
                  Test Name:
                </span>
                <select
                  value={selectedTestNameFilter}
                  onChange={(e) => {
                    setSelectedTestNameFilter(e.target.value);
                    setSelectedParameterFilter('all');
                  }}
                  className={`text-xs border rounded-lg px-2 py-1 font-semibold cursor-pointer max-w-[210px] truncate ${
                    selectedTestNameFilter !== 'all'
                      ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold ring-1 ring-purple-200'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                  title="Filter by laboratory investigation name"
                >
                  <option value="all">All Lab Tests ({availablePathologyNames.length})</option>
                  {availablePathologyNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                {selectedTestNameFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTestNameFilter('all');
                      setSelectedParameterFilter('all');
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                    title="Clear test name filter"
                  >
                    <XCircle className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                )}
              </div>

              {/* Parameter Filter */}
              {availableParametersForFilter.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                    Parameter:
                  </span>
                  <select
                    value={selectedParameterFilter}
                    onChange={(e) => setSelectedParameterFilter(e.target.value)}
                    className={`text-xs border rounded-lg px-2 py-1 font-semibold cursor-pointer max-w-[220px] truncate ${
                      selectedParameterFilter !== 'all'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold ring-1 ring-indigo-200'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                    title="Filter by specific biomarker parameter within range-based tests"
                  >
                    <option value="all">All Parameters ({availableParametersForFilter.length})</option>
                    {availableParametersForFilter.map((p) => (
                      <option key={p.parameter} value={p.parameter}>
                        {p.parameter} {p.referenceRange ? `[ref: ${p.referenceRange}${p.unit ? ` ${p.unit}` : ''}]` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedParameterFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedParameterFilter('all')}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                      title="Clear parameter filter"
                    >
                      <XCircle className="w-3.5 h-3.5 text-indigo-500" />
                    </button>
                  )}
                </div>
              )}

              {/* Outcome Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-slate-400" />
                  Outcome:
                </span>
                <select
                  value={testFindingFilter}
                  onChange={(e) => setTestFindingFilter(e.target.value as any)}
                  className={`text-xs border rounded-lg px-2 py-1 font-semibold cursor-pointer ${
                    testFindingFilter !== 'all'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold ring-1 ring-amber-200'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="all">All Outcomes</option>
                  <option value="positive">Positives & Reactive Only</option>
                  <option value="negative">Negatives & Non-reactive Only</option>
                  <option value="abnormal_range">Abnormal Ranges (High & Low)</option>
                  <option value="high_range">▲ High Ranges Only</option>
                  <option value="low_range">▼ Low Ranges Only</option>
                  <option value="normal">✓ Normal Limits Only</option>
                </select>
              </div>

              {/* Reset Pathology Filters */}
              {(selectedTestNameFilter !== 'all' || selectedParameterFilter !== 'all' || testFindingFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTestNameFilter('all');
                    setSelectedParameterFilter('all');
                    setTestFindingFilter('all');
                  }}
                  className="text-[10px] font-bold text-purple-700 hover:text-purple-900 underline px-1.5 py-1 cursor-pointer"
                >
                  Reset Lab Filters
                </button>
              )}
            </div>
          </div>

          {/* RANGE-BASED TEST & PARAMETER TRACKING BAR */}
          {(isSelectedTestWithRanges || selectedParameterFilter !== 'all' || (selectedTestNameFilter !== 'all' && rangeParametersSummary.length > 0)) && (
            <div className="bg-gradient-to-r from-purple-50/70 via-indigo-50/50 to-slate-50 p-3.5 rounded-xl border border-purple-200/80 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                    <FlaskConical className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {selectedTestNameFilter !== 'all' ? selectedTestNameFilter : 'Biomarker Parameter Ranges Surveillance'}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        Range-Based Series
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Tracking parameter limits with abnormal High (▲) and Low (▼) surveillance. Select a parameter to isolate its distribution.
                    </p>
                  </div>
                </div>

                {selectedParameterFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedParameterFilter('all')}
                    className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 self-start sm:self-auto cursor-pointer bg-white px-2 py-1 rounded-lg border border-indigo-200 shadow-2xs"
                  >
                    <span>Clear parameter filter ({selectedParameterFilter})</span>
                    <XCircle className="w-3.5 h-3.5 text-indigo-500" />
                  </button>
                )}
              </div>

              {/* Parameter Quick-Select Pills */}
              {rangeParametersSummary.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <SlidersHorizontal className="w-3 h-3 text-slate-400" />
                    <span>Filter by parameter ({rangeParametersSummary.length} available):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedParameterFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                        selectedParameterFilter === 'all'
                          ? 'bg-purple-700 text-white border-purple-800 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      All Parameters
                    </button>
                    {rangeParametersSummary.map(paramItem => {
                      const isSelected = selectedParameterFilter.toLowerCase().trim() === paramItem.parameter.toLowerCase().trim();
                      const hasHigh = paramItem.highCount > 0;
                      const hasLow = paramItem.lowCount > 0;
                      return (
                        <button
                          key={paramItem.parameter}
                          type="button"
                          onClick={() => setSelectedParameterFilter(isSelected ? 'all' : paramItem.parameter)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-purple-700 text-white border-purple-800 shadow-xs font-bold ring-2 ring-purple-200'
                              : 'bg-white text-slate-800 border-slate-200 hover:border-purple-300 hover:bg-purple-50/50'
                          }`}
                        >
                          <span>{paramItem.parameter}</span>
                          {paramItem.referenceRange && (
                            <span className={`text-[10px] font-mono opacity-80 ${isSelected ? 'text-purple-100' : 'text-slate-400'}`}>
                              ({paramItem.referenceRange}{paramItem.unit ? ` ${paramItem.unit}` : ''})
                            </span>
                          )}
                          {hasHigh && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-100 text-red-800 border border-red-200">
                              ▲ {paramItem.highCount} High
                            </span>
                          )}
                          {hasLow && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              ▼ {paramItem.lowCount} Low
                            </span>
                          )}
                          {!hasHigh && !hasLow && paramItem.normalCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ✓ Normal
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Single Active Parameter Card */}
              {selectedParameterMetrics && (
                <div className="bg-white rounded-xl p-3 border border-indigo-200 shadow-2xs space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-950 text-sm">{selectedParameterMetrics.parameterName}</span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        [Reference Interval: <strong>{selectedParameterMetrics.referenceRange || 'Standard Range'}</strong> {selectedParameterMetrics.unit}]
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Measured in {selectedParameterMetrics.totalMeasured} lab orders
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div
                      onClick={() => setTestFindingFilter('high_range')}
                      className={`p-2 rounded-lg border cursor-pointer transition-all ${
                        testFindingFilter === 'high_range'
                          ? 'bg-red-600 text-white border-red-700 shadow-xs'
                          : 'bg-red-50/70 border-red-200 hover:bg-red-100 text-red-950'
                      }`}
                      title="Filter by High range for this parameter"
                    >
                      <div className={`text-[9px] font-bold uppercase flex items-center justify-between ${testFindingFilter === 'high_range' ? 'text-red-100' : 'text-red-700'}`}>
                        <span>▲ High / Above Limits</span>
                        <span className="text-[9px] underline">Filter</span>
                      </div>
                      <div className="text-lg font-black mt-0.5">{selectedParameterMetrics.highCount}</div>
                    </div>
                    <div
                      onClick={() => setTestFindingFilter('low_range')}
                      className={`p-2 rounded-lg border cursor-pointer transition-all ${
                        testFindingFilter === 'low_range'
                          ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                          : 'bg-blue-50/70 border-blue-200 hover:bg-blue-100 text-blue-950'
                      }`}
                      title="Filter by Low range for this parameter"
                    >
                      <div className={`text-[9px] font-bold uppercase flex items-center justify-between ${testFindingFilter === 'low_range' ? 'text-blue-100' : 'text-blue-700'}`}>
                        <span>▼ Low / Below Limits</span>
                        <span className="text-[9px] underline">Filter</span>
                      </div>
                      <div className="text-lg font-black mt-0.5">{selectedParameterMetrics.lowCount}</div>
                    </div>
                    <div
                      onClick={() => setTestFindingFilter('normal')}
                      className={`p-2 rounded-lg border cursor-pointer transition-all ${
                        testFindingFilter === 'normal'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          : 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100 text-emerald-950'
                      }`}
                      title="Filter by Normal limits for this parameter"
                    >
                      <div className={`text-[9px] font-bold uppercase flex items-center justify-between ${testFindingFilter === 'normal' ? 'text-emerald-100' : 'text-emerald-700'}`}>
                        <span>✓ Within Normal Limits</span>
                        <span className="text-[9px] underline">Filter</span>
                      </div>
                      <div className="text-lg font-black mt-0.5">{selectedParameterMetrics.normalCount}</div>
                    </div>
                    <div
                      onClick={() => setTestFindingFilter('abnormal_range')}
                      className={`p-2 rounded-lg border cursor-pointer transition-all ${
                        testFindingFilter === 'abnormal_range'
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                          : 'bg-amber-50/70 border-amber-200 hover:bg-amber-100 text-amber-950'
                      }`}
                      title="Filter by all abnormal ranges for this parameter"
                    >
                      <div className={`text-[9px] font-bold uppercase flex items-center justify-between ${testFindingFilter === 'abnormal_range' ? 'text-amber-100' : 'text-amber-700'}`}>
                        <span>Total Abnormal Range</span>
                        <span className="text-[9px] underline">Filter</span>
                      </div>
                      <div className="text-lg font-black mt-0.5">{selectedParameterMetrics.totalAbnormal}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PATHOLOGY INTERACTIVE SCORECARD STRIP */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setTestFindingFilter('all')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                testFindingFilter === 'all'
                  ? 'bg-purple-900 text-white border-purple-900 shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
              }`}
            >
              <div className={`text-[10px] font-bold uppercase ${testFindingFilter === 'all' ? 'text-purple-200' : 'text-slate-500'}`}>
                All Lab Orders
              </div>
              <div className="text-lg font-black mt-0.5">{scopedPathologyMetrics.totalOrders}</div>
              <div className={`text-[10px] ${testFindingFilter === 'all' ? 'text-purple-200' : 'text-slate-500'}`}>
                Total in scope
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTestFindingFilter(testFindingFilter === 'positive' ? 'all' : 'positive')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                testFindingFilter === 'positive'
                  ? 'bg-rose-600 text-white border-rose-700 shadow-xs ring-2 ring-rose-200'
                  : 'bg-rose-50/50 border-rose-200 hover:bg-rose-50 text-rose-950'
              }`}
            >
              <div className={`text-[10px] font-bold uppercase flex items-center justify-between ${testFindingFilter === 'positive' ? 'text-rose-100' : 'text-rose-700'}`}>
                <span>Positives</span>
                <span className="text-[9px] font-bold opacity-80">Reactive</span>
              </div>
              <div className="text-lg font-black mt-0.5">{scopedPathologyMetrics.positiveCount}</div>
              <div className={`text-[10px] ${testFindingFilter === 'positive' ? 'text-rose-100' : 'text-rose-700'}`}>
                In {scopedPathologyMetrics.testsWithPositives} lab orders
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTestFindingFilter(testFindingFilter === 'negative' ? 'all' : 'negative')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                testFindingFilter === 'negative'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-200'
                  : 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50 text-emerald-950'
              }`}
            >
              <div className={`text-[10px] font-bold uppercase flex items-center justify-between ${testFindingFilter === 'negative' ? 'text-emerald-100' : 'text-emerald-700'}`}>
                <span>Negatives</span>
                <span className="text-[9px] font-bold opacity-80">Non-reactive</span>
              </div>
              <div className="text-lg font-black mt-0.5">{scopedPathologyMetrics.negativeCount}</div>
              <div className={`text-[10px] ${testFindingFilter === 'negative' ? 'text-emerald-100' : 'text-emerald-700'}`}>
                In {scopedPathologyMetrics.testsWithNegatives} lab orders
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTestFindingFilter(testFindingFilter === 'abnormal_range' ? 'all' : 'abnormal_range')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                testFindingFilter === 'abnormal_range'
                  ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-200'
                  : 'bg-amber-50/50 border-amber-200 hover:bg-amber-50 text-amber-950'
              }`}
            >
              <div className={`text-[10px] font-bold uppercase flex items-center justify-between ${testFindingFilter === 'abnormal_range' ? 'text-amber-100' : 'text-amber-700'}`}>
                <span>Abnormal Ranges</span>
                <span className="text-[9px] font-bold opacity-90">▲ High | ▼ Low</span>
              </div>
              <div className="text-lg font-black mt-0.5">{scopedPathologyMetrics.totalAbnormalRanges}</div>
              <div className={`text-[10px] ${testFindingFilter === 'abnormal_range' ? 'text-amber-100' : 'text-amber-800'}`}>
                ▲{scopedPathologyMetrics.abnormalHighCount} High &bull; ▼{scopedPathologyMetrics.abnormalLowCount} Low
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTestFindingFilter(testFindingFilter === 'normal' ? 'all' : 'normal')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                testFindingFilter === 'normal'
                  ? 'bg-slate-700 text-white border-slate-800 shadow-xs ring-2 ring-slate-200'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
              }`}
            >
              <div className={`text-[10px] font-bold uppercase ${testFindingFilter === 'normal' ? 'text-slate-300' : 'text-slate-500'}`}>
                Normal Limits
              </div>
              <div className="text-lg font-black mt-0.5">{scopedPathologyMetrics.normalCount}</div>
              <div className={`text-[10px] ${testFindingFilter === 'normal' ? 'text-slate-300' : 'text-slate-500'}`}>
                In {scopedPathologyMetrics.testsWithNormal} lab orders
              </div>
            </button>
          </div>

          {/* ACTIVE PATHOLOGY FILTERS STRIP */}
          {(testFindingFilter !== 'all' || selectedTestNameFilter !== 'all' || selectedParameterFilter !== 'all') && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-purple-50/70 border border-purple-200 px-3 py-1.5 rounded-xl text-xs text-purple-900">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-[11px]">Active Lab Filters:</span>
                {selectedTestNameFilter !== 'all' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-200 text-purple-900 flex items-center gap-1">
                    <span>Test: {selectedTestNameFilter}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTestNameFilter('all');
                        setSelectedParameterFilter('all');
                      }}
                      className="hover:text-purple-950 font-bold ml-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                )}
                {selectedParameterFilter !== 'all' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-200 text-indigo-900 flex items-center gap-1">
                    <span>Parameter: {selectedParameterFilter}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedParameterFilter('all')}
                      className="hover:text-indigo-950 font-bold ml-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                )}
                {testFindingFilter !== 'all' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 uppercase flex items-center gap-1">
                    <span>{testFindingFilter.replace('_', ' ')}</span>
                    <button
                      type="button"
                      onClick={() => setTestFindingFilter('all')}
                      className="hover:text-amber-950 font-bold ml-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                )}
                <span className="text-[11px] text-purple-700">
                  Showing {sortedPathologyTests.length} matching lab orders
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedTestNameFilter('all');
                  setSelectedParameterFilter('all');
                  setTestFindingFilter('all');
                }}
                className="font-bold text-[11px] text-purple-700 hover:text-purple-950 underline cursor-pointer"
              >
                Reset Lab Filters
              </button>
            </div>
          )}

          {/* DEDICATED PATHOLOGY INVESTIGATIONS TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-purple-50/60 text-purple-950 font-bold border-b border-purple-200">
                <tr>
                  <th
                    onClick={() => handleSort('date')}
                    className="py-3 px-3 cursor-pointer hover:text-purple-600 whitespace-nowrap"
                  >
                    Order Date {sortField === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    className="py-3 px-3 cursor-pointer hover:text-purple-600"
                  >
                    Investigation & Category {sortField === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleSort('patient')}
                    className="py-3 px-3 cursor-pointer hover:text-purple-600"
                  >
                    Patient {sortField === 'patient' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleSort('doctor')}
                    className="py-3 px-3 cursor-pointer hover:text-purple-600"
                  >
                    Ordering Doctor {sortField === 'doctor' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleSort('findings')}
                    className="py-3 px-3 cursor-pointer hover:text-purple-600 min-w-[260px]"
                  >
                    Biomarkers & Classified Outcome {sortField === 'findings' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-3">Urgency</th>
                  <th className="py-3 px-3">Status</th>
                  <th
                    onClick={() => handleSort('cost')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-purple-600"
                  >
                    Lab Fee {sortField === 'cost' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-3 text-center">Parameters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedPathologyTests.map(test => {
                  const isExpanded = expandedFindingTestId === test.id;
                  const hasFindings = test.classifiedFindings && test.classifiedFindings.length > 0;

                  return (
                    <React.Fragment key={test.id}>
                      <tr className="hover:bg-purple-50/30 transition-colors">
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {new Date(test.orderedAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <Microscope className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span>{test.testName}</span>
                          </div>
                          <div className="text-[10px] text-purple-700 font-normal pl-5">
                            {test.category} {test.specimenType ? `• ${test.specimenType}` : ''}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          <div>{test.patientName}</div>
                          <div className="font-mono text-[10px] text-slate-400">{test.patientMrn}</div>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                          Dr. {test.doctorName}
                        </td>
                        <td className="py-2.5 px-3">
                          {hasFindings ? (
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-1">
                                {test.hasPositive && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-rose-600" /> Positive / Reactive
                                  </span>
                                )}
                                {test.hasNegative && !test.hasPositive && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                    <Check className="w-3 h-3 text-emerald-600" /> Negative / Non-reactive
                                  </span>
                                )}
                                {test.hasHigh && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300 flex items-center gap-0.5">
                                    ▲ High Range
                                  </span>
                                )}
                                {test.hasLow && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-0.5">
                                    ▼ Low Range
                                  </span>
                                )}
                                {test.isAllNormal && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                    <Check className="w-3 h-3 text-emerald-600" /> Normal Limits
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 text-[10px]">
                                {test.classifiedFindings.slice(0, 3).map((f: any, fIdx: number) => {
                                  const isMatchedParam = selectedParameterFilter !== 'all' && f.parameter?.toLowerCase().trim() === selectedParameterFilter.toLowerCase().trim();
                                  return (
                                    <span
                                      key={fIdx}
                                      className={`px-1.5 py-0.5 rounded font-medium border ${
                                        isMatchedParam ? 'ring-2 ring-purple-500 shadow-xs font-bold' : ''
                                      } ${
                                        f.isPositive
                                          ? 'bg-rose-50 text-rose-900 border-rose-200 font-bold'
                                          : f.isNegative
                                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                          : f.isHighRange
                                          ? 'bg-red-50 text-red-900 border-red-200 font-bold'
                                          : f.isLowRange
                                          ? 'bg-blue-50 text-blue-900 border-blue-200 font-bold'
                                          : 'bg-slate-50 text-slate-700 border-slate-200'
                                      }`}
                                    >
                                      {f.parameter}: <strong>{f.value} {f.unit}</strong>
                                      {f.isHighRange ? ' (▲High)' : f.isLowRange ? ' (▼Low)' : ''}
                                      {isMatchedParam && ' ★'}
                                    </span>
                                  );
                                })}
                                {test.classifiedFindings.length > 3 && (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedFindingTestId(isExpanded ? null : test.id)}
                                    className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold hover:bg-slate-200 cursor-pointer"
                                  >
                                    +{test.classifiedFindings.length - 3} more...
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : test.results ? (
                            <div className="text-[11px] text-slate-700 italic max-w-xs truncate" title={test.results}>
                              {test.results}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              Analysis Pending
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              test.urgency === 'Emergency'
                                ? 'bg-rose-100 text-rose-800'
                                : test.urgency === 'Urgent'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {test.urgency}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                              test.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : test.status === 'in_progress'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {test.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          ${(test.cost || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {hasFindings ? (
                            <button
                              type="button"
                              onClick={() => setExpandedFindingTestId(isExpanded ? null : test.id)}
                              className={`p-1.5 rounded-lg border font-bold text-[10px] flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer ${
                                isExpanded
                                  ? 'bg-purple-700 text-white border-purple-800'
                                  : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
                              }`}
                              title={isExpanded ? 'Collapse parameters' : 'View full series parameters'}
                            >
                              {isExpanded ? (
                                <>
                                  <EyeOff className="w-3 h-3" />
                                  <span>Hide</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3" />
                                  <span>Details</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-slate-300 text-[10px]">&mdash;</span>
                          )}
                        </td>
                      </tr>

                      {/* INLINE PARAMETER BREAKDOWN ACCORDION */}
                      {isExpanded && hasFindings && (
                        <tr className="bg-purple-50/40 border-b border-purple-200">
                          <td colSpan={9} className="p-3 pl-6">
                            <div className="bg-white rounded-xl border border-purple-200 p-3 shadow-xs space-y-2">
                              <div className="flex items-center justify-between text-xs border-b border-purple-100 pb-2">
                                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <Microscope className="w-3.5 h-3.5 text-purple-600" />
                                  {test.testName} &mdash; Clinical Parameter Breakdown Series
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  Patient: <strong className="text-slate-800">{test.patientName}</strong> ({test.patientMrn})
                                </span>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-[11px]">
                                  <thead className="bg-purple-50/50 text-purple-950 font-bold border-b border-purple-200">
                                    <tr>
                                      <th className="py-1.5 px-2">Parameter</th>
                                      <th className="py-1.5 px-2">Measured Result</th>
                                      <th className="py-1.5 px-2">Unit</th>
                                      <th className="py-1.5 px-2">Reference Interval</th>
                                      <th className="py-1.5 px-2">Flag</th>
                                      <th className="py-1.5 px-2">Classification</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {test.classifiedFindings.map((f: any, pIdx: number) => {
                                      const isParamMatched = selectedParameterFilter !== 'all' && f.parameter?.toLowerCase().trim() === selectedParameterFilter.toLowerCase().trim();
                                      return (
                                        <tr key={pIdx} className={`hover:bg-slate-50/50 ${isParamMatched ? 'bg-purple-50/80 border-l-4 border-purple-600 font-semibold' : ''}`}>
                                          <td className="py-1.5 px-2 font-medium text-slate-900 flex items-center gap-1.5">
                                            <span>{f.parameter}</span>
                                            {isParamMatched && (
                                              <span className="px-1 py-0.2 rounded text-[9px] bg-purple-200 text-purple-900 font-bold">
                                                Target
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-1.5 px-2 font-bold text-slate-900">
                                            {f.value}
                                          </td>
                                          <td className="py-1.5 px-2 text-slate-500">
                                            {f.unit || 'N/A'}
                                          </td>
                                          <td className="py-1.5 px-2 text-slate-600 font-mono text-[10px]">
                                            {f.referenceRange || 'Standard'}
                                          </td>
                                          <td className="py-1.5 px-2">
                                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                              f.flag === 'High'
                                                ? 'bg-red-100 text-red-800'
                                                : f.flag === 'Low'
                                                ? 'bg-blue-100 text-blue-800'
                                                : f.flag === 'Abnormal'
                                                ? 'bg-amber-100 text-amber-800'
                                                : 'bg-emerald-100 text-emerald-800'
                                            }`}>
                                              {f.flag}
                                            </span>
                                          </td>
                                          <td className="py-1.5 px-2">
                                            {f.isPositive ? (
                                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                                Positive / Reactive
                                              </span>
                                            ) : f.isNegative ? (
                                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                Negative / Non-reactive
                                              </span>
                                            ) : f.isHighRange ? (
                                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                                                ▲ Abnormal (High)
                                              </span>
                                            ) : f.isLowRange ? (
                                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                                ▼ Abnormal (Low)
                                              </span>
                                            ) : (
                                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                                Reference Limits
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {sortedPathologyTests.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                      <div>No pathology laboratory tests match current filters.</div>
                      <button
                        type="button"
                        onClick={handleSeedDemoRecords}
                        className="mt-2 text-xs font-bold text-purple-700 hover:text-purple-900 underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Populate Demo Laboratory Records</span>
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: IMAGING TESTS ORDERED (RADIOLOGY & DIAGNOSTIC SCANS) */}
      {showImaging && (
        <div className="bg-white rounded-2xl border border-sky-200/90 p-5 shadow-xs space-y-4">
          
          {/* Imaging Header & Sub-filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span className="p-1 rounded-md bg-sky-100 text-sky-700">
                  <Film className="w-4 h-4" />
                </span>
                <span>Imaging Tests Ordered (Radiology & Diagnostic Scans)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                  {sortedRadiologyTests.length} Imaging Scans
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Diagnostic ultrasound, digital radiography, CT scans, and MRI investigations with anatomical regions and radiologist impressions.
              </p>
            </div>

            {/* Imaging Sub-filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Modality Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-sky-800">Modality:</span>
                <select
                  value={imagingModalityFilter}
                  onChange={(e) => {
                    setImagingModalityFilter(e.target.value);
                    setImagingProcedureFilter('all');
                  }}
                  className={`text-xs border rounded-lg px-2 py-1 font-semibold cursor-pointer ${
                    imagingModalityFilter !== 'all'
                      ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold ring-1 ring-sky-200'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="all">All Modalities</option>
                  {availableImagingModalities.map((mod) => (
                    <option key={mod} value={mod}>
                      {mod}
                    </option>
                  ))}
                </select>
                {imagingModalityFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => {
                      setImagingModalityFilter('all');
                      setImagingProcedureFilter('all');
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                    title="Clear modality filter"
                  >
                    <XCircle className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                )}
              </div>

              {/* Study Name Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Film className="w-3.5 h-3.5 text-sky-600" />
                  Study:
                </span>
                <select
                  value={imagingProcedureFilter}
                  onChange={(e) => setImagingProcedureFilter(e.target.value)}
                  className={`text-xs border rounded-lg px-2 py-1 font-semibold cursor-pointer max-w-[210px] truncate ${
                    imagingProcedureFilter !== 'all'
                      ? 'bg-sky-50 border-sky-300 text-sky-950 font-bold ring-1 ring-sky-200'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                  title="Filter by radiology study / procedure name"
                >
                  <option value="all">All Imaging Studies ({availableImagingProcedures.length})</option>
                  {availableImagingProcedures.map((proc) => (
                    <option key={proc} value={proc}>
                      {proc}
                    </option>
                  ))}
                </select>
                {imagingProcedureFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setImagingProcedureFilter('all')}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                    title="Clear procedure filter"
                  >
                    <XCircle className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                )}
              </div>

              {/* Finding Outcome Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-slate-400" />
                  Findings:
                </span>
                <select
                  value={imagingOutcomeFilter}
                  onChange={(e) => setImagingOutcomeFilter(e.target.value as any)}
                  className={`text-xs border rounded-lg px-2 py-1 font-semibold cursor-pointer ${
                    imagingOutcomeFilter !== 'all'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold ring-1 ring-amber-200'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="all">All Imaging Findings</option>
                  <option value="positive">Significant / Pathology Identified</option>
                  <option value="normal">Normal / Unremarkable Scans</option>
                  <option value="pending">Analysis Pending Only</option>
                </select>
              </div>

              {/* Reset Imaging Filters */}
              {(imagingModalityFilter !== 'all' || imagingProcedureFilter !== 'all' || imagingOutcomeFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setImagingModalityFilter('all');
                    setImagingProcedureFilter('all');
                    setImagingOutcomeFilter('all');
                  }}
                  className="text-[10px] font-bold text-sky-700 hover:text-sky-900 underline px-1.5 py-1 cursor-pointer"
                >
                  Reset Imaging Filters
                </button>
              )}
            </div>
          </div>

          {/* IMAGING INTERACTIVE SCORECARD STRIP */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setImagingOutcomeFilter('all');
                setImagingModalityFilter('all');
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                imagingOutcomeFilter === 'all' && imagingModalityFilter === 'all'
                  ? 'bg-sky-900 text-white border-sky-900 shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
              }`}
            >
              <div className={`text-[10px] font-bold uppercase ${imagingOutcomeFilter === 'all' ? 'text-sky-200' : 'text-slate-500'}`}>
                Total Imaging Scans
              </div>
              <div className="text-lg font-black mt-0.5">{scopedImagingMetrics.totalScans}</div>
              <div className={`text-[10px] ${imagingOutcomeFilter === 'all' ? 'text-sky-200' : 'text-slate-500'}`}>
                Diagnostic Imaging In Scope
              </div>
            </button>

            <button
              type="button"
              onClick={() => setImagingOutcomeFilter(imagingOutcomeFilter === 'positive' ? 'all' : 'positive')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                imagingOutcomeFilter === 'positive'
                  ? 'bg-rose-600 text-white border-rose-700 shadow-xs ring-2 ring-rose-200'
                  : 'bg-rose-50/50 border-rose-200 hover:bg-rose-50 text-rose-950'
              }`}
            >
              <div className={`text-[10px] font-bold uppercase flex items-center justify-between ${imagingOutcomeFilter === 'positive' ? 'text-rose-100' : 'text-rose-700'}`}>
                <span>Pathology Identified</span>
                <span className="text-[9px] font-bold opacity-80">Significant</span>
              </div>
              <div className="text-lg font-black mt-0.5">{scopedImagingMetrics.positiveCount}</div>
              <div className={`text-[10px] ${imagingOutcomeFilter === 'positive' ? 'text-rose-100' : 'text-rose-700'}`}>
                Positive diagnostic scans
              </div>
            </button>

            <button
              type="button"
              onClick={() => setImagingOutcomeFilter(imagingOutcomeFilter === 'normal' ? 'all' : 'normal')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                imagingOutcomeFilter === 'normal'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-200'
                  : 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50 text-emerald-950'
              }`}
            >
              <div className={`text-[10px] font-bold uppercase flex items-center justify-between ${imagingOutcomeFilter === 'normal' ? 'text-emerald-100' : 'text-emerald-700'}`}>
                <span>Unremarkable Scans</span>
                <span className="text-[9px] font-bold opacity-80">Normal</span>
              </div>
              <div className="text-lg font-black mt-0.5">{scopedImagingMetrics.normalCount}</div>
              <div className={`text-[10px] ${imagingOutcomeFilter === 'normal' ? 'text-emerald-100' : 'text-emerald-700'}`}>
                Clear findings within limits
              </div>
            </button>

            <div className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 text-amber-950 flex flex-col justify-between">
              <div className="text-[10px] font-bold uppercase flex items-center justify-between text-amber-800">
                <span>Emergency & Urgent</span>
                <span className="text-[9px] font-bold bg-amber-200 px-1 rounded">Priority</span>
              </div>
              <div className="text-lg font-black mt-0.5">{scopedImagingMetrics.emergencyUrgentCount}</div>
              <div className="text-[10px] text-amber-700">
                High-priority clinical orders
              </div>
            </div>
          </div>

          {/* Modality Quick Filters Strip */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
              Filter by modality:
            </span>
            <button
              type="button"
              onClick={() => setImagingModalityFilter('all')}
              className={`px-2 py-0.5 rounded-lg text-xs font-semibold cursor-pointer border ${
                imagingModalityFilter === 'all'
                  ? 'bg-sky-700 text-white border-sky-800 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Modalities
            </button>
            {['Ultrasound', 'X-Ray', 'CT Scan', 'MRI'].map((mod) => {
              const isSelected = imagingModalityFilter.toLowerCase() === mod.toLowerCase();
              const count = scopedImagingMetrics.modalityCounts[mod] || 0;
              return (
                <button
                  key={mod}
                  type="button"
                  onClick={() => setImagingModalityFilter(isSelected ? 'all' : mod)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-medium cursor-pointer border flex items-center gap-1 ${
                    isSelected
                      ? 'bg-sky-700 text-white border-sky-800 shadow-xs font-bold ring-2 ring-sky-200'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-sky-300 hover:bg-sky-50/50'
                  }`}
                >
                  <span>{mod}</span>
                  <span className={`text-[10px] px-1 rounded-full font-bold ${isSelected ? 'bg-sky-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* DEDICATED IMAGING INVESTIGATIONS TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-sky-50/60 text-sky-950 font-bold border-b border-sky-200">
                <tr>
                  <th
                    onClick={() => handleSort('date')}
                    className="py-3 px-3 cursor-pointer hover:text-sky-600 whitespace-nowrap"
                  >
                    Scan Date {sortField === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-3">Modality</th>
                  <th
                    onClick={() => handleSort('name')}
                    className="py-3 px-3 cursor-pointer hover:text-sky-600"
                  >
                    Study & Anatomical Region {sortField === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleSort('patient')}
                    className="py-3 px-3 cursor-pointer hover:text-sky-600"
                  >
                    Patient {sortField === 'patient' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleSort('doctor')}
                    className="py-3 px-3 cursor-pointer hover:text-sky-600"
                  >
                    Ordering Doctor {sortField === 'doctor' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    onClick={() => handleSort('findings')}
                    className="py-3 px-3 cursor-pointer hover:text-sky-600 min-w-[260px]"
                  >
                    Radiologist Findings & Impression {sortField === 'findings' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-3">Urgency</th>
                  <th className="py-3 px-3">Status</th>
                  <th
                    onClick={() => handleSort('cost')}
                    className="py-3 px-3 text-right cursor-pointer hover:text-sky-600"
                  >
                    Fee {sortField === 'cost' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-3 text-center">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRadiologyTests.map(rad => {
                  const isExpanded = expandedImagingId === rad.id;

                  return (
                    <React.Fragment key={rad.id}>
                      <tr className="hover:bg-sky-50/30 transition-colors">
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {new Date(rad.orderedAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit ${
                              rad.category === 'Ultrasound'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : rad.category === 'CT Scan'
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                : rad.category === 'MRI'
                                ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                : 'bg-sky-100 text-sky-800 border border-sky-200'
                            }`}
                          >
                            <Film className="w-3 h-3" />
                            {rad.category || rad.modality || 'Imaging'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          <div>{rad.testName}</div>
                          {rad.bodyPart && (
                            <div className="text-[10px] text-sky-700 font-normal">
                              Region: {rad.bodyPart}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          <div>{rad.patientName}</div>
                          <div className="font-mono text-[10px] text-slate-400">{rad.patientMrn}</div>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                          Dr. {rad.doctorName}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1">
                              {rad.hasPositive && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" /> Pathology Identified
                                </span>
                              )}
                              {rad.isAllNormal && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-600" /> Unremarkable / Normal
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-800 line-clamp-2" title={rad.impressionText || rad.results}>
                              {rad.impressionText || rad.results || 'Radiologist assessment pending.'}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              rad.urgency === 'Emergency'
                                ? 'bg-rose-100 text-rose-800'
                                : rad.urgency === 'Urgent'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {rad.urgency}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                              rad.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rad.status === 'in_progress'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {rad.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          ${(rad.cost || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setExpandedImagingId(isExpanded ? null : rad.id)}
                            className={`p-1.5 rounded-lg border font-bold text-[10px] flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer ${
                              isExpanded
                                ? 'bg-sky-700 text-white border-sky-800'
                                : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
                            }`}
                            title={isExpanded ? 'Collapse report' : 'View formal radiologist impression report'}
                          >
                            {isExpanded ? (
                              <>
                                <EyeOff className="w-3 h-3" />
                                <span>Hide</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3" />
                                <span>Report</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* INLINE FORMAL RADIOLOGIST REPORT ACCORDION */}
                      {isExpanded && (
                        <tr className="bg-sky-50/40 border-b border-sky-200">
                          <td colSpan={10} className="p-3 pl-6">
                            <div className="bg-white rounded-xl border border-sky-200 p-4 shadow-xs space-y-3">
                              <div className="flex items-center justify-between text-xs border-b border-sky-100 pb-2">
                                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <Film className="w-3.5 h-3.5 text-sky-600" />
                                  <span>{rad.testName} &mdash; Official Radiology Diagnostic Report</span>
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  Modality: <strong>{rad.category}</strong> • Region: <strong>{rad.bodyPart || 'Standard'}</strong>
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    Clinical Indication / History:
                                  </span>
                                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 italic">
                                    {rad.clinicalHistory || 'Routine clinical investigation.'}
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    Radiologist Formal Impression:
                                  </span>
                                  <div className={`p-2.5 rounded-lg border font-semibold ${
                                    rad.hasPositive
                                      ? 'bg-rose-50 border-rose-200 text-rose-950'
                                      : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                                  }`}>
                                    {rad.impressionText || rad.results || 'Pending final radiologist review.'}
                                  </div>
                                </div>
                              </div>

                              {rad.findingsText && (
                                <div className="space-y-1 text-xs">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    Detailed Imaging Findings:
                                  </span>
                                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed font-mono text-[11px]">
                                    {rad.findingsText}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {sortedRadiologyTests.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                      <div>No diagnostic imaging investigations match current filters.</div>
                      <button
                        type="button"
                        onClick={handleSeedDemoRecords}
                        className="mt-2 text-xs font-bold text-sky-700 hover:text-sky-900 underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Populate Demo Imaging Records</span>
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COMBINED MATRIX VIEW (OPTIONAL ALTERNATIVE) */}
      {showCombined && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <span>All Diagnostic Tests Combined Matrix</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                  {sortedTests.length} Tests
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Combined overview across both Pathology and Radiology departments.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Investigation</th>
                  <th className="py-3 px-3">Patient</th>
                  <th className="py-3 px-3">Doctor</th>
                  <th className="py-3 px-3">Diagnostic Findings</th>
                  <th className="py-3 px-3">Urgency</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedTests.map((test: any) => (
                  <tr key={test.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {new Date(test.orderedAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit ${
                        test.testType === 'Pathology Lab' ? 'bg-purple-100 text-purple-800' : 'bg-sky-100 text-sky-800'
                      }`}>
                        {test.testType === 'Pathology Lab' ? <Microscope className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                        {test.testType === 'Pathology Lab' ? 'Pathology' : 'Imaging'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      <div>{test.testName}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{test.category}</div>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      <div>{test.patientName}</div>
                      <div className="font-mono text-[10px] text-slate-400">{test.patientMrn}</div>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                      Dr. {test.doctorName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">
                      {test.results || 'Pending analysis.'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {test.urgency}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 capitalize">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        test.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {test.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      ${(test.cost || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
