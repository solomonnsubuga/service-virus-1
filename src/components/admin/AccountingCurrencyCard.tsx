import React, { useState, useEffect, useMemo } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { CurrencyConfig } from '../../types';
import { SUPPORTED_CURRENCIES, getCurrencyConfig, formatCurrency as formatCurrencyUtil } from '../../utils/currency';
import {
  Coins,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Sliders,
  DollarSign,
  Building2,
  Check
} from 'lucide-react';

interface AccountingCurrencyCardProps {
  isFullTab?: boolean;
  onSuccess?: () => void;
}

export const AccountingCurrencyCard: React.FC<AccountingCurrencyCardProps> = ({ isFullTab = false, onSuccess }) => {
  const { activeClinic, currencyConfig, updateClinicCurrency, formatCurrency } = useClinic();

  const [selectedCode, setSelectedCode] = useState<string>(currencyConfig.code);
  const [symbol, setSymbol] = useState<string>(currencyConfig.symbol);
  const [name, setName] = useState<string>(currencyConfig.name);
  const [decimals, setDecimals] = useState<number>(currencyConfig.decimals ?? 2);
  const [position, setPosition] = useState<'prefix' | 'suffix'>(currencyConfig.position ?? 'prefix');

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync state if active clinic changes
  useEffect(() => {
    setSelectedCode(currencyConfig.code);
    setSymbol(currencyConfig.symbol);
    setName(currencyConfig.name);
    setDecimals(currencyConfig.decimals ?? 2);
    setPosition(currencyConfig.position ?? 'prefix');
  }, [currencyConfig]);

  // Compute pending currency configuration for real-time live preview
  const pendingConfig: CurrencyConfig = useMemo(() => ({
    code: selectedCode,
    symbol,
    name,
    decimals,
    position
  }), [selectedCode, symbol, name, decimals, position]);

  // Handle selection of a predefined currency preset
  const handleSelectPreset = (conf: CurrencyConfig) => {
    setSelectedCode(conf.code);
    setSymbol(conf.symbol);
    setName(conf.name);
    setDecimals(conf.decimals !== undefined ? conf.decimals : 2);
    setPosition(conf.position || 'prefix');
    setFeedback(null);
  };

  // Preview formatted test numbers
  const previewSampleConsultation = formatCurrencyUtil(50, pendingConfig);
  const previewSampleLab = formatCurrencyUtil(125.5, pendingConfig);
  const previewSampleAdmission = formatCurrencyUtil(1850, pendingConfig);
  const previewSampleLarge = formatCurrencyUtil(254000, pendingConfig);

  const hasUnsavedChanges =
    selectedCode !== currencyConfig.code ||
    symbol !== currencyConfig.symbol ||
    name !== currencyConfig.name ||
    decimals !== (currencyConfig.decimals ?? 2) ||
    position !== (currencyConfig.position ?? 'prefix');

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeClinic?.id) {
      setFeedback({ type: 'error', message: 'No active clinic facility identified.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await updateClinicCurrency(activeClinic.id, pendingConfig);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Accounting currency updated to ${pendingConfig.code} (${pendingConfig.symbol}). All ledgers, cashier receipts, and financial reports now use this currency.`
        });
        if (onSuccess) onSuccess();
      } else {
        setFeedback({ type: 'error', message: res.message || 'Failed to update currency.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'An error occurred while updating the currency.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToUsd = () => {
    const usd = getCurrencyConfig('USD');
    handleSelectPreset(usd);
  };

  return (
    <div
      id="accounting-currency-card"
      className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all ${
        isFullTab ? 'p-6' : 'p-5'
      }`}
    >
      {/* CARD HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Accounting System Currency Settings
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3" /> Active: {currencyConfig.code} ({currencyConfig.symbol})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure the operational currency applied to patient billing ledgers, pharmacy dispensing, cashier receipts, and financial reports for <strong className="text-slate-800">{activeClinic.name}</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            {showAdvanced ? 'Simple View' : 'Custom Options'}
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div
          className={`mt-4 p-3 rounded-lg text-xs flex items-start gap-2.5 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{feedback.message}</div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-2 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* QUICK PRESET SELECTOR CARDS */}
      <div className="mt-5">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
          Select Standard Currency Preset:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {SUPPORTED_CURRENCIES.map((c) => {
            const isSelected = selectedCode.toUpperCase() === c.code.toUpperCase();
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => handleSelectPreset(c)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer relative ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-500 text-emerald-900 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
                )}
                <div className="flex items-baseline justify-between gap-1">
                  <span className="font-extrabold text-xs">{c.code}</span>
                  <span className="font-bold text-sm text-slate-900 font-mono">{c.symbol}</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5" title={c.name}>
                  {c.name}
                </div>
                <div className="text-[9px] text-slate-400 mt-1">
                  {c.decimals === 0 ? '0 Decimals' : '2 Decimals'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ADVANCED / CUSTOM DETAILS ACCORDION */}
      {showAdvanced && (
        <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-slate-500" /> Custom Currency Parameters
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Currency Code (ISO)</label>
              <input
                type="text"
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value.toUpperCase())}
                placeholder="e.g. UGX, USD, KES"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white text-xs font-bold text-slate-900 uppercase"
                maxLength={5}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Currency Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="e.g. USh, $, €, ₦"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white text-xs font-bold text-slate-900"
                maxLength={8}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Official Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ugandan Shilling"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Decimal Display</label>
              <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-md border border-slate-300">
                <button
                  type="button"
                  onClick={() => setDecimals(0)}
                  className={`py-1 text-center rounded text-[11px] font-bold cursor-pointer transition-colors ${
                    decimals === 0 ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  0 (USh 500)
                </button>
                <button
                  type="button"
                  onClick={() => setDecimals(2)}
                  className={`py-1 text-center rounded text-[11px] font-bold cursor-pointer transition-colors ${
                    decimals === 2 ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  2 ($50.00)
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Symbol Position</label>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="currency_position"
                  checked={position === 'prefix'}
                  onChange={() => setPosition('prefix')}
                  className="accent-emerald-600"
                />
                <span>Prefix (e.g. <span className="font-bold font-mono">{symbol} 100</span>)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="currency_position"
                  checked={position === 'suffix'}
                  onChange={() => setPosition('suffix')}
                  className="accent-emerald-600"
                />
                <span>Suffix (e.g. <span className="font-bold font-mono">100 {symbol}</span>)</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* LIVE INTERACTIVE FINANCIAL FORMAT PREVIEW */}
      <div className="mt-5 p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Live Billing & Statement Format Preview
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
            {pendingConfig.code} &bull; {pendingConfig.symbol} &bull; {decimals} Decimals
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Doctor Consultation</div>
            <div className="text-base font-extrabold text-emerald-400 font-mono mt-0.5">
              {previewSampleConsultation}
            </div>
            <div className="text-[9px] text-slate-400 mt-1">Outpatient general visit</div>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Diagnostic Panel</div>
            <div className="text-base font-extrabold text-sky-400 font-mono mt-0.5">
              {previewSampleLab}
            </div>
            <div className="text-[9px] text-slate-400 mt-1">Hematology / Lab test</div>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Inpatient Admission</div>
            <div className="text-base font-extrabold text-purple-400 font-mono mt-0.5">
              {previewSampleAdmission}
            </div>
            <div className="text-[9px] text-slate-400 mt-1">Ward bed & nursing care</div>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Aggregate Ledger</div>
            <div className="text-base font-extrabold text-amber-400 font-mono mt-0.5">
              {previewSampleLarge}
            </div>
            <div className="text-[9px] text-slate-400 mt-1">Gross facility turnover</div>
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            Applying will synchronize across active clinic <strong className="text-slate-700">{activeClinic.name}</strong>.
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={() => handleSelectPreset(currencyConfig)}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md text-xs font-semibold transition-colors cursor-pointer"
            >
              Revert
            </button>
          )}

          <button
            type="button"
            onClick={handleResetToUsd}
            className="px-3 py-1.5 text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md text-xs font-semibold transition-colors cursor-pointer"
          >
            Reset to USD ($)
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className={`px-4 py-2 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              hasUnsavedChanges
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Saving to System...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Apply Currency to Accounting System
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
