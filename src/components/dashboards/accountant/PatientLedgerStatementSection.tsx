import React, { useState, useMemo, useEffect } from 'react';
import { useClinic } from '../../../context/ClinicContext';
import { PatientLedger, LedgerItem, PaymentTransaction, PharmacyCart } from '../../../types';
import {
  Calendar,
  Filter,
  Printer,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Receipt,
  Activity,
  Pill,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Layers,
  Sparkles,
  Info,
  Download
} from 'lucide-react';
import { exportReceiptToPdf } from '../../../utils/clinicalPdfExport';

interface PatientLedgerStatementSectionProps {
  ledger: PatientLedger;
  pharmacyCarts: PharmacyCart[];
  onPrintStatement: (statementData: any) => void;
  onPrintReceipt: (transaction: PaymentTransaction) => void;
  onNavigateToSettlement: (patientId: string, itemOrCartId?: string) => void;
}

type DatePreset = 'all' | 'today' | 'last7' | 'last30' | 'this_month' | 'custom';
type TypeFilter = 'all' | 'charges_only' | 'payments_only';

interface DateGroup {
  date: string;
  formattedDate: string;
  items: LedgerItem[];
  transactions: PaymentTransaction[];
  totalBilled: number;
  totalPaid: number;
  netChange: number;
}

export const PatientLedgerStatementSection: React.FC<PatientLedgerStatementSectionProps> = ({
  ledger,
  pharmacyCarts,
  onPrintStatement,
  onPrintReceipt,
  onNavigateToSettlement
}) => {
  const { formatCurrency, currencySymbol, activeClinic, currentUser, patients } = useClinic();

  const patient = useMemo(() => {
    return (patients || []).find(p => p.id === ledger.patientId || p.mrn === ledger.patientMrn);
  }, [patients, ledger.patientId, ledger.patientMrn]);

  // Preset filter state
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  // Selected items & transactions set for selective bank statement printing
  // By default, all are selected
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    () => new Set(ledger.items.map(i => i.id))
  );
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(
    () => new Set((ledger.transactions || []).map(t => t.id))
  );

  // Expanded dates state (all expanded by default)
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Group all items and transactions by date
  const allDateGroups = useMemo(() => {
    const groupMap = new Map<string, { items: LedgerItem[]; transactions: PaymentTransaction[] }>();

    // Process all billable items
    ledger.items.forEach(item => {
      const d = item.date || ledger.createdAt.split('T')[0] || new Date().toISOString().split('T')[0];
      if (!groupMap.has(d)) {
        groupMap.set(d, { items: [], transactions: [] });
      }
      groupMap.get(d)!.items.push(item);
    });

    // Process all payment transactions
    (ledger.transactions || []).forEach(tx => {
      const d = tx.date ? tx.date.split('T')[0] : (ledger.createdAt.split('T')[0] || new Date().toISOString().split('T')[0]);
      if (!groupMap.has(d)) {
        groupMap.set(d, { items: [], transactions: [] });
      }
      groupMap.get(d)!.transactions.push(tx);
    });

    // Convert map to sorted date group array (newest to oldest)
    const sortedDates = Array.from(groupMap.keys()).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return sortedDates.map(date => {
      const data = groupMap.get(date)!;
      const totalBilled = Number(data.items.reduce((sum, it) => sum + it.totalAmount, 0).toFixed(2));
      const totalPaid = Number(data.transactions.reduce((sum, tx) => sum + (tx.amountPaid || 0), 0).toFixed(2));
      const netChange = Number((totalBilled - totalPaid).toFixed(2));

      const parsedDate = new Date(date + 'T12:00:00');
      const isToday = new Date().toISOString().split('T')[0] === date;
      const formattedDate = isToday
        ? `Today • ${parsedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}`
        : parsedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

      return {
        date,
        formattedDate,
        items: data.items,
        transactions: data.transactions,
        totalBilled,
        totalPaid,
        netChange
      } as DateGroup;
    });
  }, [ledger]);

  // Keep expanded dates populated if empty
  useEffect(() => {
    if (expandedDates.size === 0 && allDateGroups.length > 0) {
      setExpandedDates(new Set(allDateGroups.map(g => g.date)));
    }
  }, [allDateGroups, expandedDates.size]);

  // Handle Preset Date Filters
  const filteredDateGroups = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return allDateGroups.filter(group => {
      const groupTime = new Date(group.date + 'T12:00:00').getTime();

      if (datePreset === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        return group.date === todayStr;
      }
      if (datePreset === 'last7') {
        const d7 = new Date();
        d7.setDate(d7.getDate() - 7);
        d7.setHours(0, 0, 0, 0);
        return groupTime >= d7.getTime() && groupTime <= today.getTime();
      }
      if (datePreset === 'last30') {
        const d30 = new Date();
        d30.setDate(d30.getDate() - 30);
        d30.setHours(0, 0, 0, 0);
        return groupTime >= d30.getTime() && groupTime <= today.getTime();
      }
      if (datePreset === 'this_month') {
        const dMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return groupTime >= dMonth.getTime() && groupTime <= today.getTime();
      }
      if (datePreset === 'custom') {
        if (customStartDate && group.date < customStartDate) return false;
        if (customEndDate && group.date > customEndDate) return false;
        return true;
      }
      return true; // 'all'
    });
  }, [allDateGroups, datePreset, customStartDate, customEndDate]);

  // Calculate opening balance before the filtered period
  const openingBalance = useMemo(() => {
    if (datePreset === 'all') return 0;
    
    // Find the earliest date in the filtered groups
    if (filteredDateGroups.length === 0) return 0;
    const earliestFilteredDate = filteredDateGroups[filteredDateGroups.length - 1].date;

    // Sum all prior items and payments
    let priorDebits = 0;
    let priorCredits = 0;

    allDateGroups.forEach(g => {
      if (g.date < earliestFilteredDate) {
        priorDebits += g.totalBilled;
        priorCredits += g.totalPaid;
      }
    });

    return Number(Math.max(0, priorDebits - priorCredits).toFixed(2));
  }, [allDateGroups, filteredDateGroups, datePreset]);

  // Selection handlers
  const handleSelectAll = () => {
    const allItemIds = new Set<string>();
    const allTxIds = new Set<string>();
    filteredDateGroups.forEach(g => {
      if (typeFilter !== 'payments_only') {
        g.items.forEach(i => allItemIds.add(i.id));
      }
      if (typeFilter !== 'charges_only') {
        g.transactions.forEach(t => allTxIds.add(t.id));
      }
    });
    setSelectedItemIds(allItemIds);
    setSelectedTxIds(allTxIds);
  };

  const handleClearSelection = () => {
    setSelectedItemIds(new Set());
    setSelectedTxIds(new Set());
  };

  const toggleDateGroupSelection = (group: DateGroup) => {
    const areAllGroupItemsSelected = group.items.every(i => selectedItemIds.has(i.id)) &&
      group.transactions.every(t => selectedTxIds.has(t.id));

    const newItemIds = new Set(selectedItemIds);
    const newTxIds = new Set(selectedTxIds);

    if (areAllGroupItemsSelected) {
      group.items.forEach(i => newItemIds.delete(i.id));
      group.transactions.forEach(t => newTxIds.delete(t.id));
    } else {
      if (typeFilter !== 'payments_only') {
        group.items.forEach(i => newItemIds.add(i.id));
      }
      if (typeFilter !== 'charges_only') {
        group.transactions.forEach(t => newTxIds.add(t.id));
      }
    }

    setSelectedItemIds(newItemIds);
    setSelectedTxIds(newTxIds);
  };

  const toggleItemSelection = (id: string) => {
    const newSet = new Set(selectedItemIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedItemIds(newSet);
  };

  const toggleTxSelection = (id: string) => {
    const newSet = new Set(selectedTxIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedTxIds(newSet);
  };

  const toggleExpandDate = (date: string) => {
    const newSet = new Set(expandedDates);
    if (newSet.has(date)) {
      newSet.delete(date);
    } else {
      newSet.add(date);
    }
    setExpandedDates(newSet);
  };

  // Selected totals for the bank statement summary
  const selectedItemsList = useMemo(() => {
    return ledger.items.filter(i => selectedItemIds.has(i.id));
  }, [ledger.items, selectedItemIds]);

  const selectedTxList = useMemo(() => {
    return (ledger.transactions || []).filter(t => selectedTxIds.has(t.id));
  }, [ledger.transactions, selectedTxIds]);

  const selectedTotalBilled = useMemo(() => {
    return Number(selectedItemsList.reduce((sum, it) => sum + it.totalAmount, 0).toFixed(2));
  }, [selectedItemsList]);

  const selectedTotalPaid = useMemo(() => {
    return Number(selectedTxList.reduce((sum, tx) => sum + (tx.amountPaid || 0), 0).toFixed(2));
  }, [selectedTxList]);

  const selectedBalanceDue = useMemo(() => {
    return Number((openingBalance + selectedTotalBilled - selectedTotalPaid).toFixed(2));
  }, [openingBalance, selectedTotalBilled, selectedTotalPaid]);

  // Construct Statement Period Label
  const statementPeriodLabel = useMemo(() => {
    if (datePreset === 'today') return `Today (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;
    if (datePreset === 'last7') return 'Last 7 Days';
    if (datePreset === 'last30') return 'Last 30 Days';
    if (datePreset === 'this_month') return 'This Month';
    if (datePreset === 'custom') {
      if (customStartDate && customEndDate) return `${customStartDate} to ${customEndDate}`;
      if (customStartDate) return `From ${customStartDate}`;
      if (customEndDate) return `Up to ${customEndDate}`;
      return 'Custom Date Range';
    }
    if (selectedItemsList.length < ledger.items.length || selectedTxList.length < (ledger.transactions?.length || 0)) {
      return `Selective Period (${selectedItemsList.length} items, ${selectedTxList.length} payments)`;
    }
    return 'All Historical Transactions';
  }, [datePreset, customStartDate, customEndDate, selectedItemsList, selectedTxList, ledger]);

  // Print Statement Handler
  const handlePrintSelectedStatement = () => {
    const statementData = {
      ...ledger,
      statementPeriod: statementPeriodLabel,
      openingBalance,
      items: selectedItemsList,
      transactions: selectedTxList,
      totalBilled: selectedTotalBilled,
      totalPaid: selectedTotalPaid,
      balanceDue: selectedBalanceDue
    };
    onPrintStatement(statementData);
  };

  const handlePrintFullStatement = () => {
    const statementData = {
      ...ledger,
      statementPeriod: 'All Historical Transactions',
      openingBalance: 0,
      items: ledger.items,
      transactions: ledger.transactions || [],
      totalBilled: ledger.totalBilled,
      totalPaid: ledger.totalPaid,
      balanceDue: ledger.balanceDue
    };
    onPrintStatement(statementData);
  };

  return (
    <div className="space-y-4">
      {/* 1. Bank Statement Configuration & Selection Toolbar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-xl shadow-md space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                Bank Statement & Date-Separated Ledger
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Interactive Selection
                </span>
              </h4>
              <p className="text-[11px] text-slate-300">
                Filter by date ranges, select specific historical dates or line items, and print an official bank statement.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            {selectedTxIds.size > 0 && (
              <div className="flex items-center gap-1 bg-emerald-700/30 p-0.5 rounded-lg border border-emerald-500/40">
                <button
                  type="button"
                  onClick={() => {
                    const txns = filteredDateGroups
                      .flatMap(g => g.transactions)
                      .filter(t => selectedTxIds.has(t.id));
                    txns.forEach(t => exportReceiptToPdf(t, activeClinic, currentUser, undefined, '57mm'));
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold cursor-pointer flex items-center gap-1 transition-colors"
                  title="Export selected receipts as 57mm Thermal POS PDFs"
                >
                  <Download className="w-3 h-3" />
                  <span>57mm ({selectedTxIds.size})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const txns = filteredDateGroups
                      .flatMap(g => g.transactions)
                      .filter(t => selectedTxIds.has(t.id));
                    txns.forEach(t => exportReceiptToPdf(t, activeClinic, currentUser, undefined, 'a5'));
                  }}
                  className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-bold cursor-pointer transition-colors"
                  title="Export selected receipts as A5 Slip PDFs"
                >
                  <span>A5</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const txns = filteredDateGroups
                      .flatMap(g => g.transactions)
                      .filter(t => selectedTxIds.has(t.id));
                    txns.forEach(t => exportReceiptToPdf(t, activeClinic, currentUser, undefined, 'a4'));
                  }}
                  className="px-2 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded text-xs font-bold cursor-pointer transition-colors"
                  title="Export selected receipts as A4 Sheet PDFs"
                >
                  <span>A4</span>
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={handlePrintFullStatement}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
              title="Print entire historical account statement"
            >
              <Printer className="w-3.5 h-3.5" />
              Full History
            </button>
            <button
              type="button"
              onClick={handlePrintSelectedStatement}
              disabled={selectedItemIds.size === 0 && selectedTxIds.size === 0}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all ${
                selectedItemIds.size > 0 || selectedTxIds.size > 0
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold ring-2 ring-emerald-400/50'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
              title="Print selected transactions as an official statement"
            >
              <Printer className="w-3.5 h-3.5 text-slate-950" />
              Print Selected Statement
            </button>
          </div>
        </div>

        {/* Date Filter Presets Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-700/80 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Period:
            </span>
            {[
              { id: 'all', label: 'All Dates' },
              { id: 'today', label: 'Today' },
              { id: 'last7', label: 'Last 7 Days' },
              { id: 'last30', label: 'Last 30 Days' },
              { id: 'this_month', label: 'This Month' },
              { id: 'custom', label: 'Custom Range...' }
            ].map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setDatePreset(preset.id as DatePreset);
                  if (preset.id !== 'custom') {
                    // Auto-select all items inside this preset
                    setTimeout(() => handleSelectAll(), 50);
                  }
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  datePreset === preset.id
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Show:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 text-[11px] font-medium outline-hidden"
            >
              <option value="all">All (Charges & Payments)</option>
              <option value="charges_only">Incurred Charges Only</option>
              <option value="payments_only">Payments / Receipts Only</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Row */}
        {datePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 p-2 bg-slate-800/80 rounded-lg border border-slate-700 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-900 border border-slate-600 text-white px-2 py-1 rounded text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-900 border border-slate-600 text-white px-2 py-1 rounded text-xs"
              />
            </div>
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold cursor-pointer"
            >
              Apply to Range
            </button>
          </div>
        )}

        {/* Selection Stats Strip & Selection Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-700/80 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <CheckSquare className="w-3 h-3 text-emerald-400" />
              Select All Filtered
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Square className="w-3 h-3 text-slate-400" />
              Clear Selection
            </button>
          </div>

          {/* Dynamic Selection Statement Pill */}
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
            {openingBalance > 0 && (
              <span className="text-slate-400">
                Opening Balance: <strong>{formatCurrency(openingBalance)}</strong>
              </span>
            )}
            <span className="text-rose-300">
              Selected Billed: <strong>+{formatCurrency(selectedTotalBilled)}</strong> ({selectedItemsList.length} items)
            </span>
            <span className="text-emerald-300">
              Selected Paid: <strong>-{formatCurrency(selectedTotalPaid)}</strong> ({selectedTxList.length} payments)
            </span>
            <span className="text-amber-300 font-extrabold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
              Selected Balance: {formatCurrency(selectedBalanceDue)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Date-Separated Grouped Ledger Cards */}
      <div className="space-y-3">
        {filteredDateGroups.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 space-y-2">
            <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-semibold text-slate-700">No transactions found for the selected period.</p>
            <p className="text-xs text-slate-400">Try choosing "All Dates" or expanding your custom date range.</p>
          </div>
        ) : (
          filteredDateGroups.map(group => {
            const isDateExpanded = expandedDates.has(group.date);
            const isGroupFullySelected = (typeFilter === 'payments_only' || group.items.every(i => selectedItemIds.has(i.id))) &&
              (typeFilter === 'charges_only' || group.transactions.every(t => selectedTxIds.has(t.id)));
            const isGroupPartiallySelected = group.items.some(i => selectedItemIds.has(i.id)) ||
              group.transactions.some(t => selectedTxIds.has(t.id));

            return (
              <div
                key={group.date}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-all hover:border-slate-300"
              >
                {/* Date Group Header Bar */}
                <div className="p-3.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Date Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleDateGroupSelection(group)}
                      className="text-slate-600 hover:text-emerald-600 cursor-pointer p-0.5 rounded"
                      title={isGroupFullySelected ? 'Deselect all entries for this date' : 'Select all entries for this date'}
                    >
                      {isGroupFullySelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                      ) : isGroupPartiallySelected ? (
                        <div className="w-4 h-4 rounded border-2 border-emerald-600 flex items-center justify-center bg-emerald-50">
                          <div className="w-2 h-2 bg-emerald-600 rounded-2xs" />
                        </div>
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-extrabold text-sm text-slate-900">{group.formattedDate}</h5>
                        <span className="font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold">
                          {group.date}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{group.items.length} Billable Item{group.items.length === 1 ? '' : 's'}</span>
                        <span>&bull;</span>
                        <span>{group.transactions.length} Payment{group.transactions.length === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Metrics for this Date */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 text-right font-mono text-xs">
                      {group.totalBilled > 0 && (
                        <div>
                          <div className="text-[9px] uppercase font-bold text-slate-400">Date Charges</div>
                          <div className="font-bold text-rose-700">+{formatCurrency(group.totalBilled)}</div>
                        </div>
                      )}
                      {group.totalPaid > 0 && (
                        <div>
                          <div className="text-[9px] uppercase font-bold text-slate-400">Date Paid</div>
                          <div className="font-bold text-emerald-700">-{formatCurrency(group.totalPaid)}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-[9px] uppercase font-bold text-slate-400">Day Net</div>
                        <div className={`font-black ${group.netChange > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                          {formatCurrency(group.netChange)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpandDate(group.date)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
                      title={isDateExpanded ? 'Collapse date details' : 'Expand date details'}
                    >
                      {isDateExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Date Group Body Details */}
                {isDateExpanded && (
                  <div className="p-4 space-y-4 bg-slate-50/40 text-xs">
                    
                    {/* 1. Billable Items for this Date */}
                    {typeFilter !== 'payments_only' && group.items.length > 0 && (
                      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                        <div className="px-3 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                          <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Incurred Charges & Medications on {group.date} ({group.items.length})</span>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-slate-700">
                            Subtotal: +{formatCurrency(group.totalBilled)}
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left divide-y divide-slate-200 text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-semibold text-[10px] uppercase">
                              <tr>
                                <th className="py-2 px-2.5 w-8">Select</th>
                                <th className="py-2 px-2.5">Department</th>
                                <th className="py-2 px-2.5">Service / Medication Description</th>
                                <th className="py-2 px-2.5 text-right">Qty</th>
                                <th className="py-2 px-2.5 text-right">Rate ({currencySymbol})</th>
                                <th className="py-2 px-2.5 text-right">Total ({currencySymbol})</th>
                                <th className="py-2 px-2.5 text-right">Status / Payment</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {group.items.map(item => {
                                const isSelected = selectedItemIds.has(item.id);
                                const isCartItem = item.description.includes('[Cart #');
                                const isIpdAdministeredItem = Boolean(item.treatmentChartItemId) || item.id.startsWith('ipd-') || item.description.includes('IPD Bedside MAR') || item.description.includes('Combined IPD Administration');
                                const isPaid = item.status === 'paid' || (item.balanceDue !== undefined && item.balanceDue <= 0);
                                const isPartiallyPaid = item.status === 'partially_paid' || (item.amountPaid !== undefined && item.amountPaid > 0 && !isPaid);

                                return (
                                  <tr
                                    key={item.id}
                                    onClick={() => toggleItemSelection(item.id)}
                                    className={`cursor-pointer transition-colors ${
                                      isSelected ? 'bg-emerald-50/30 hover:bg-emerald-50/60' : 'hover:bg-slate-50 opacity-90'
                                    }`}
                                  >
                                    <td className="py-2 px-2.5" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleItemSelection(item.id)}
                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                      />
                                    </td>
                                    <td className="py-2 px-2.5 whitespace-nowrap">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        item.department === 'Pharmacy'
                                          ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                          : item.department === 'Pathology'
                                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                          : item.department === 'Radiology'
                                          ? 'bg-cyan-100 text-cyan-900 border border-cyan-200'
                                          : item.department === 'Consultation'
                                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                          : item.department === 'Nursing'
                                          ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                          : 'bg-slate-100 text-slate-800 border border-slate-200'
                                      }`}>
                                        {item.department}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2.5">
                                      <div className="font-semibold text-slate-900 leading-snug">
                                        {item.description}
                                      </div>
                                      {isCartItem && (
                                        <div className="text-[10px] text-purple-700 font-medium mt-0.5 flex items-center gap-1">
                                          <Pill className="w-3 h-3" />
                                          Billable Pharmacy Cart Dispensation
                                        </div>
                                      )}
                                      {isIpdAdministeredItem && (
                                        <div className="text-[10px] text-indigo-700 font-medium mt-0.5 flex items-center gap-1">
                                          <Activity className="w-3 h-3 text-indigo-600" />
                                          Combined IPD Administration &bull; {item.quantity} units total
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-2 px-2.5 text-right font-mono text-slate-700">
                                      {item.quantity}
                                    </td>
                                    <td className="py-2 px-2.5 text-right font-mono text-slate-600">
                                      {formatCurrency(item.unitPrice)}
                                    </td>
                                    <td className="py-2 px-2.5 text-right font-mono font-bold text-rose-700">
                                      +{formatCurrency(item.totalAmount)}
                                    </td>
                                    <td className="py-2 px-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                      {isPaid ? (
                                        <div className="inline-flex flex-col items-end">
                                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                                            <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                            PAID
                                          </span>
                                          {item.paidReceiptNumber && (
                                            <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                                              {item.paidReceiptNumber}
                                            </span>
                                          )}
                                        </div>
                                      ) : isPartiallyPaid ? (
                                        <div className="inline-flex items-center gap-1.5">
                                          <div className="text-right">
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                              Part Paid
                                            </span>
                                            <div className="text-[9px] text-amber-700 font-mono mt-0.5">
                                              Due: {formatCurrency(item.balanceDue || 0)}
                                            </div>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => onNavigateToSettlement(ledger.patientId, item.id)}
                                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] shadow-2xs cursor-pointer"
                                            title="Settle this specific billable item at Payment Counter"
                                          >
                                            Pay
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="inline-flex items-center gap-1.5">
                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                            Unpaid Debt
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => onNavigateToSettlement(ledger.patientId, item.id)}
                                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] shadow-2xs cursor-pointer"
                                            title="Settle this specific billable item at Payment Counter"
                                          >
                                            Pay Item
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* 2. Payment Transactions for this Date */}
                    {typeFilter !== 'charges_only' && group.transactions.length > 0 && (
                      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                        <div className="px-3 py-2 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between">
                          <div className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Payment Receipts Recorded on {group.date} ({group.transactions.length})</span>
                          </div>
                          <span className="text-[11px] font-mono font-black text-emerald-800">
                            Total Settled: -{formatCurrency(group.totalPaid)}
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left divide-y divide-slate-200 text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-semibold text-[10px] uppercase">
                              <tr>
                                <th className="py-2 px-2.5 w-8">Select</th>
                                <th className="py-2 px-2.5">Time</th>
                                <th className="py-2 px-2.5">Receipt #</th>
                                <th className="py-2 px-2.5">Payment Method</th>
                                <th className="py-2 px-2.5">Cashier / Staff</th>
                                <th className="py-2 px-2.5">Reference / Notes</th>
                                <th className="py-2 px-2.5 text-right">Amount Paid</th>
                                <th className="py-2 px-2.5 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {group.transactions.map(tx => {
                                const isSelected = selectedTxIds.has(tx.id);
                                const exactTime = tx.date ? new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

                                return (
                                  <tr
                                    key={tx.id}
                                    onClick={() => toggleTxSelection(tx.id)}
                                    className={`cursor-pointer transition-colors ${
                                      isSelected ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-slate-50 opacity-60'
                                    }`}
                                  >
                                    <td className="py-2 px-2.5" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleTxSelection(tx.id)}
                                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                      />
                                    </td>
                                    <td className="py-2 px-2.5 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        {exactTime}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2.5 font-mono font-bold text-slate-900 text-[11px] whitespace-nowrap">
                                      {tx.receiptNumber || tx.id.slice(-8)}
                                    </td>
                                    <td className="py-2 px-2.5 whitespace-nowrap">
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                                        {tx.paymentMethod.replace('_', ' ')}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2.5 font-medium text-slate-700 whitespace-nowrap">
                                      {tx.receivedBy || 'Cashier'}
                                    </td>
                                    <td className="py-2 px-2.5 text-slate-500 text-[11px]">
                                      {tx.referenceNo ? `Ref: ${tx.referenceNo}` : ''} {tx.notes ? `(${tx.notes})` : ''}
                                      {!tx.referenceNo && !tx.notes && '—'}
                                    </td>
                                    <td className="py-2 px-2.5 text-right font-mono font-black text-emerald-700 whitespace-nowrap">
                                      -{formatCurrency(tx.amountPaid)}
                                    </td>
                                    <td className="py-2 px-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => onPrintReceipt(tx)}
                                          className="inline-flex items-center gap-1 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
                                          title="View past receipt and print preview"
                                        >
                                          <Receipt className="w-3 h-3 text-emerald-600" />
                                          <span>View</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => exportReceiptToPdf(tx, activeClinic, currentUser)}
                                          className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
                                          title="Export past receipt PDF with user audit trail & timestamps"
                                        >
                                          <Download className="w-3 h-3" />
                                          <span>PDF</span>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 3. Bottom Summary & Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <Info className="w-4 h-4 text-emerald-600" />
          <span>
            Selected: <strong className="text-slate-900">{selectedItemsList.length}</strong> charges and <strong className="text-slate-900">{selectedTxList.length}</strong> payments for official statement printing.
          </span>
        </div>

        <div className="flex items-center gap-2">
          {ledger.balanceDue > 0 && (
            <button
              type="button"
              onClick={() => onNavigateToSettlement(ledger.patientId)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Collect Settlement Payment
            </button>
          )}
          <button
            type="button"
            onClick={handlePrintSelectedStatement}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Bank Statement
          </button>
        </div>
      </div>
    </div>
  );
};
