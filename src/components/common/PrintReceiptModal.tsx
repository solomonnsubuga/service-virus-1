import React, { useEffect, useMemo, useState } from 'react';
import { PatientLedger, PaymentTransaction, Prescription, TestOrder, RadiologyOrder, PatientReferral, DeathCertificate } from '../../types';
import { useClinic } from '../../context/ClinicContext';
import { X, FileSpreadsheet, CheckCircle, FileText, Download, Printer } from 'lucide-react';
import { preloadClinicLogo } from '../../utils/pdfLogoHelper';
import { exportReferralToPdf } from '../../utils/referralPdfExport';
import { exportDischargeToPdf } from '../../utils/dischargePdfExport';
import { exportDeathCertificateToPdf } from '../../utils/deathCertificatePdfExport';
import { exportRadiologyToPdf } from '../../utils/radiologyPdfExport';
import { exportPathologyToPdf } from '../../utils/pathologyPdfExport';
import { exportSingleRadiologyOrderToExcel } from '../../utils/radiologyExcelExport';
import { exportSinglePathologyOrderToExcel } from '../../utils/pathologyExcelExport';
import {
  exportPrescriptionToPdf,
  exportReceiptToPdf,
  exportLedgerToPdf,
  exportWorkupToPdf,
  exportProcedureToPdf,
  exportCaseFileToPdf,
  ReceiptPaperSize
} from '../../utils/clinicalPdfExport';

interface PrintReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'receipt' | 'prescription' | 'lab_report' | 'radiology_report' | 'ledger' | 'workup' | 'procedure' | 'case_file' | 'discharge_summary' | 'referral_form' | 'death_certificate';
  data: any;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({
  isOpen,
  onClose,
  type,
  data
}) => {
  const { activeClinic, formatCurrency, currencyConfig, currentUser, patients } = useClinic();
  const [receiptPaperSize, setReceiptPaperSize] = useState<ReceiptPaperSize>('57mm');

  const currentPatient = useMemo(() => {
    if (!data) return null;
    const pId = data.patientId || data.patient?.id;
    const pMrn = data.patientMrn || data.patient?.mrn;
    const pName = data.patientName || data.patient?.name;
    return (patients || []).find(p => 
      (pId && p.id === pId) || 
      (pMrn && p.mrn === pMrn) || 
      (pName && `${p.firstName} ${p.lastName}`.trim().toLowerCase() === pName.trim().toLowerCase())
    ) || data.patient || null;
  }, [data, patients]);

  useEffect(() => {
    if (activeClinic) {
      preloadClinicLogo(activeClinic.logoUrl, activeClinic);
    }
  }, [activeClinic]);

  if (!isOpen || !data) return null;

  return (
    <div 
      id="printable-modal-backdrop"
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        id="printable-modal-root"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:w-full print:max-w-none cursor-default my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Action Bar */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-semibold text-slate-800 capitalize">
              {type.replace('_', ' ')} Document
            </span>
          </div>
          <div className="flex items-center gap-2">
            {type === 'lab_report' && (
              <>
                <button
                  onClick={() => exportPathologyToPdf(data, activeClinic, currentPatient)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                  title="Export official Pathology Diagnostic Report PDF file"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export as PDF
                </button>
                <button
                  onClick={() => exportSinglePathologyOrderToExcel(data, activeClinic)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                  title="Export test parameters and observed results as Excel document (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                  Export as Excel
                </button>
              </>
            )}
            {type === 'radiology_report' && (
              <>
                <button
                  onClick={() => exportRadiologyToPdf(data, activeClinic, currentPatient)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-md text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                  title="Export official Diagnostic Radiology Report PDF file"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export as PDF
                </button>
                <button
                  onClick={() => exportSingleRadiologyOrderToExcel(data, activeClinic)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                  title="Export scan report details as Excel document (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                  Export as Excel
                </button>
              </>
            )}
            {type === 'referral_form' && (
              <button
                onClick={() => exportReferralToPdf(data, activeClinic, currentPatient)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-xs cursor-pointer"
                title="Download official Referral PDF document"
              >
                <Download className="w-3.5 h-3.5" />
                Export as PDF
              </button>
            )}
            {type === 'discharge_summary' && (
              <button
                onClick={() => exportDischargeToPdf(data, activeClinic, currentPatient)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs cursor-pointer"
                title="Download official Inpatient Discharge Summary PDF"
              >
                <Download className="w-3.5 h-3.5" />
                Export as PDF
              </button>
            )}
            {type === 'death_certificate' && (
              <button
                onClick={() => exportDeathCertificateToPdf(data, activeClinic, currentPatient)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-md text-xs font-semibold shadow-xs cursor-pointer"
                title="Download official Medical Certificate of Cause of Death PDF"
              >
                <Download className="w-3.5 h-3.5" />
                Export as PDF
              </button>
            )}
            {type === 'prescription' && (
              <button
                onClick={() => exportPrescriptionToPdf(data, activeClinic, currentPatient)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-md text-xs font-semibold shadow-xs cursor-pointer"
                title="Export official Prescription PDF"
              >
                <Download className="w-3.5 h-3.5" />
                Export as PDF
              </button>
            )}
            {type === 'receipt' && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => exportReceiptToPdf(data, activeClinic, currentUser, currentPatient, receiptPaperSize)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                  title={`Export official Receipt PDF in ${receiptPaperSize === '57mm' ? '57mm POS Thermal' : receiptPaperSize.toUpperCase()} paper format`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export {receiptPaperSize === '57mm' ? '57mm POS' : receiptPaperSize.toUpperCase()} PDF</span>
                </button>
              </div>
            )}
            {type === 'ledger' && (
              <button
                onClick={() => exportLedgerToPdf(data, activeClinic, currentUser, currentPatient)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs cursor-pointer"
                title="Export patient ledger statement PDF"
              >
                <Download className="w-3.5 h-3.5" />
                Export as PDF
              </button>
            )}
            {type === 'workup' && (
              <button
                onClick={() => exportWorkupToPdf(data, activeClinic, currentPatient)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs cursor-pointer"
                title="Export clinical encounter workup PDF"
              >
                <Download className="w-3.5 h-3.5" />
                Export as PDF
              </button>
            )}
            {type === 'procedure' && (
              <button
                onClick={() => exportProcedureToPdf(data, activeClinic, currentPatient)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs cursor-pointer"
                title="Export clinical procedure note PDF"
              >
                <Download className="w-3.5 h-3.5" />
                Export as PDF
              </button>
            )}
            {type === 'case_file' && (
              <button
                onClick={() => exportCaseFileToPdf(data, activeClinic, currentPatient)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs cursor-pointer"
                title="Export complete digital case file PDF"
              >
                <Download className="w-3.5 h-3.5" />
                Export as PDF
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Size Format Selector for Receipts */}
        {type === 'receipt' && (
          <div className="bg-slate-900 text-white px-6 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-slate-300 text-xs font-semibold">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Receipt Paper Width:</span>
              </div>
              <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setReceiptPaperSize('57mm')}
                  className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    receiptPaperSize === '57mm'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="57mm Thermal POS roll - standard compact receipt roll for POS printers"
                >
                  57mm POS Thermal
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptPaperSize('a5')}
                  className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    receiptPaperSize === 'a5'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="A5 Half Sheet (148 x 210mm) - compact clinical slip"
                >
                  A5 Medical Slip
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptPaperSize('a4')}
                  className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    receiptPaperSize === 'a4'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="A4 Standard Sheet (210 x 297mm) - full page accounting invoice"
                >
                  A4 Full Sheet
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                External print: Export PDF &rarr; Open in PDF reader &rarr; Print
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => exportReceiptToPdf(data, activeClinic, currentUser, currentPatient, '57mm')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] font-semibold cursor-pointer transition-colors"
                  title="Quick Export 57mm Thermal PDF"
                >
                  57mm PDF
                </button>
                <button
                  type="button"
                  onClick={() => exportReceiptToPdf(data, activeClinic, currentUser, currentPatient, 'a5')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] font-semibold cursor-pointer transition-colors"
                  title="Quick Export A5 Slip PDF"
                >
                  A5 PDF
                </button>
                <button
                  type="button"
                  onClick={() => exportReceiptToPdf(data, activeClinic, currentUser, currentPatient, 'a4')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] font-semibold cursor-pointer transition-colors"
                  title="Quick Export A4 Full Sheet PDF"
                >
                  A4 PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Printable Document Content */}
        <div id="printable-report-area" className="p-8 text-slate-800 text-xs font-sans space-y-6 printable-document">
          
          {/* Header */}
          <div className="border-b border-slate-300 pb-4 flex justify-between items-start">
            <div className="flex items-start gap-3.5">
              {activeClinic.logoUrl ? (
                <img
                  src={activeClinic.logoUrl}
                  alt={activeClinic.name}
                  crossOrigin="anonymous"
                  className="h-12 max-w-[85px] object-contain rounded border border-slate-200 p-1 bg-white shrink-0"
                />
              ) : (
                <div className="h-12 w-12 rounded border border-slate-200 bg-white p-1 flex items-center justify-center shrink-0">
                  <div
                    className="w-full h-full rounded text-white font-bold text-xs flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: activeClinic.color || '#059669' }}
                  >
                    {activeClinic.code ? activeClinic.code.slice(0, 3) : 'MED'}
                  </div>
                </div>
              )}
              <div>
                <h1 className="text-base font-bold text-slate-900 tracking-tight">{activeClinic.name}</h1>
                <p className="text-[11px] text-slate-600">{activeClinic.address}</p>
                <p className="text-[11px] text-slate-600">Tel: {activeClinic.phone} | Email: {activeClinic.email}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Facility Code: {activeClinic.code}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 text-[11px] font-bold uppercase rounded bg-slate-100 text-slate-800 border border-slate-200">
                {type === 'receipt' ? 'Official Payment Receipt' :
                 type === 'prescription' ? 'Medical Prescription' :
                 type === 'lab_report' ? 'Pathology Diagnostic Report' :
                 type === 'radiology_report' ? 'Radiology Scan Report' :
                 type === 'workup' ? 'Clinical Workup & Consultation Plan' :
                 type === 'procedure' ? 'Clinical Procedure & Operative Report' :
                 type === 'case_file' ? 'Digital Inpatient Case File & Clinical Dossier' : 'Patient Ledger Summary'}
              </span>
              <div className="text-[11px] text-slate-500 mt-1.5">
                Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* TYPE: RECEIPT */}
          {type === 'receipt' && receiptPaperSize === '57mm' ? (
            <div className="space-y-4">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-600 bg-slate-100 px-3 py-1 rounded-full font-bold">
                  57mm Thermal POS Roll Preview (Continuous Paper)
                </span>
              </div>
              <div className="max-w-[340px] mx-auto bg-slate-50/90 border-2 border-dashed border-slate-300 rounded-lg p-5 font-mono text-xs shadow-inner space-y-3 select-text">
                <div className="text-center space-y-1">
                  <div className="font-black text-slate-900 text-sm">{(activeClinic.name || 'ViperH.M.S Clinic').toUpperCase()}</div>
                  <div className="text-[10px] text-slate-600">{activeClinic.address}</div>
                  <div className="text-[10px] text-slate-600">{[activeClinic.phone, activeClinic.email].filter(Boolean).join(' • ')}</div>
                  {activeClinic.code && <div className="text-[9px] text-slate-500">Facility Code: {activeClinic.code}</div>}
                  <div className="pt-1.5 border-t border-dashed border-slate-400 font-bold text-slate-800 text-[11px]">
                    *** OFFICIAL PAYMENT RECEIPT ***
                  </div>
                </div>

                <div className="text-[10px] space-y-1 py-1.5 border-y border-dashed border-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Receipt No:</span>
                    <span className="font-bold text-slate-800">{data.receiptNumber || 'REC-OFFICIAL'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date:</span>
                    <span>{new Date(data.date || Date.now()).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Patient:</span>
                    <span className="font-bold text-slate-800 truncate max-w-[170px] text-right">{data.patientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">MRN:</span>
                    <span>{data.patientMrn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Method:</span>
                    <span className="font-semibold">{data.paymentMethod} {data.referenceNo ? `(${data.referenceNo})` : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cashier:</span>
                    <span>{data.receivedBy}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between font-bold border-b border-dashed border-slate-300 pb-1 text-slate-700">
                    <span>ITEM / DESCRIPTION</span>
                    <span>QTY • AMOUNT</span>
                  </div>
                  {data.allocatedItems && data.allocatedItems.length > 0 ? (
                    data.allocatedItems.map((item: any, idx: number) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="font-semibold text-slate-900">{item.description}</div>
                        <div className="flex justify-between text-slate-600 text-[9px]">
                          <span>{item.quantity || 1} x {formatCurrency(item.unitPrice || item.totalAmount || item.amountAllocated || 0)}</span>
                          <span className="font-bold font-mono text-slate-800">{formatCurrency(item.amountAllocated || item.totalAmount || 0)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-900">{data.notes || data.targetCategory || 'Clinical Healthcare Service'}</div>
                      <div className="flex justify-between text-slate-600 text-[9px]">
                        <span>1 x {formatCurrency(data.amountPaid || 0)}</span>
                        <span className="font-bold font-mono text-slate-800">{formatCurrency(data.amountPaid || 0)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="pt-2 border-t-2 border-slate-900 space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-900">
                    <span>TOTAL PAID:</span>
                    <span className="text-emerald-700 text-sm font-black">{formatCurrency(data.amountPaid || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-semibold text-slate-600">
                    <span>REMAINING BALANCE:</span>
                    <span className={(data.remainingPatientDebt ?? 0) > 0 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-bold'}>
                      {(data.remainingPatientDebt ?? 0) <= 0 ? `${currencyConfig.symbol}0.00 (CLEARED)` : formatCurrency(Number(data.remainingPatientDebt))}
                    </span>
                  </div>
                </div>

                {data.notes && (
                  <div className="p-1.5 bg-white border border-slate-200 rounded text-[9px] text-slate-600">
                    <span className="font-bold">Note: </span>{data.notes}
                  </div>
                )}

                {/* Footer */}
                <div className="pt-2 border-t border-dashed border-slate-300 text-center text-[9px] text-slate-500 space-y-1">
                  <div>ViperH.M.S • Verified Financial Record</div>
                  <div className="font-bold text-slate-800">*** THANK YOU • GET WELL SOON ***</div>
                </div>
              </div>
            </div>
          ) : type === 'receipt' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-200">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Receipt Number</div>
                  <div className="text-sm font-bold text-slate-900">{data.receiptNumber || 'REC-OFFICIAL'}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold mt-2">Patient Name</div>
                  <div className="font-semibold text-slate-900">{data.patientName}</div>
                  <div className="text-slate-600 text-[11px]">MRN: {data.patientMrn}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Payment Method</div>
                  <div className="font-semibold text-slate-900">{data.paymentMethod}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold mt-2">Received By (Cashier)</div>
                  <div className="text-slate-900 font-medium">{data.receivedBy}</div>
                  {data.referenceNo && <div className="text-slate-500 text-[10px]">Ref: {data.referenceNo}</div>}
                </div>
              </div>

              {/* Itemized Services & Billable Items Covered */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 font-bold text-[11px] text-slate-800 border-b border-slate-200 flex justify-between">
                  <span>Itemized Billable Items Settled</span>
                  <span>{(data.allocatedItems && data.allocatedItems.length > 0) ? data.allocatedItems.length : 1} Item(s)</span>
                </div>
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-1.5 px-3">Department</th>
                      <th className="py-1.5 px-3">Item / Service Description</th>
                      <th className="py-1.5 px-3 text-right">Qty</th>
                      <th className="py-1.5 px-3 text-right">Amount ({currencyConfig.symbol})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.allocatedItems && data.allocatedItems.length > 0 ? (
                      data.allocatedItems.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-1 px-3">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[9px]">
                              {item.department || 'Clinical'}
                            </span>
                          </td>
                          <td className="py-1 px-3 text-slate-900 font-medium">{item.description}</td>
                          <td className="py-1 px-3 text-right font-mono text-slate-600">{item.quantity || 1}</td>
                          <td className="py-1 px-3 text-right font-mono font-bold text-slate-800">
                            {formatCurrency(item.amountAllocated || item.totalAmount || 0)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="hover:bg-slate-50">
                        <td className="py-1 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[9px]">
                            {data.targetCategory || 'Hospital Accounts'}
                          </span>
                        </td>
                        <td className="py-1 px-3 text-slate-900 font-medium">
                          {data.notes || 'Clinical Services & Consultation Settlement'}
                        </td>
                        <td className="py-1 px-3 text-right font-mono text-slate-600">1</td>
                        <td className="py-1 px-3 text-right font-mono font-bold text-slate-800">
                          {formatCurrency(data.amountPaid || 0)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="py-3 px-4 border border-emerald-200 rounded bg-emerald-50/70 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-emerald-800 font-medium">Total Amount Received & Settled</div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">Verified official medical receipt</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-emerald-800">
                    {formatCurrency(data.amountPaid || 0)}
                  </div>
                </div>
              </div>

              {/* Remaining Debt Summary */}
              <div className="flex justify-between items-center px-3 py-2 bg-slate-50 rounded border border-slate-200 text-[11px]">
                <span className="text-slate-600 font-medium">Remaining Patient Account Debt / Balance:</span>
                <span className={`font-mono font-bold ${(data.remainingPatientDebt ?? 0) > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {formatCurrency(Number(data.remainingPatientDebt ?? 0))} {(data.remainingPatientDebt ?? 0) === 0 ? '(Fully Cleared / Zero Balance)' : ''}
                </span>
              </div>

              {data.notes && (
                <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
                  <span className="font-semibold text-slate-700">Payment Notes: </span>{data.notes}
                </div>
              )}

              {/* Receipt System Audit Trail */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[10px] space-y-1 text-slate-600">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[9px] flex items-center justify-between">
                  <span>System Audit & Verification Trail</span>
                  <span className="font-mono text-slate-500">Facility ID: {activeClinic.id}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200">
                  <div>
                    <span className="font-semibold text-slate-700">Payment Registered By:</span> {data.receivedBy || 'Accounts Cashier'}
                    <span className="text-slate-400 mx-1.5">&bull;</span>
                    <span className="text-slate-500">{data.date ? new Date(data.date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Receipt Printed & Exported By:</span> {currentUser?.name || 'Finance Officer'} {currentUser?.role ? `(${currentUser.role.toUpperCase()})` : ''}
                    <span className="text-slate-400 mx-1.5">&bull;</span>
                    <span className="text-slate-500">{new Date().toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* TYPE: PRESCRIPTION */}
          {type === 'prescription' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-200">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Patient Name</div>
                  <div className="font-bold text-slate-900 text-sm">{data.patientName}</div>
                  <div className="text-slate-600 text-[11px]">MRN: {data.patientMrn}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Prescribing Doctor</div>
                  <div className="font-bold text-slate-900">{data.doctorName}</div>
                  <div className="text-slate-500 text-[11px]">Rx #{data.id}</div>
                </div>
              </div>

              {data.diagnosis && (
                <div className="bg-sky-50 p-2.5 rounded border border-sky-200 text-[11px]">
                  <span className="font-bold text-sky-900">Clinical Diagnosis: </span>
                  <span className="text-sky-800">{data.diagnosis}</span>
                </div>
              )}

              {data.clinicalNotes && (
                <div className="bg-indigo-50/60 p-3 rounded border border-indigo-200 text-xs space-y-1">
                  <div className="font-bold text-indigo-900 text-[10px] uppercase tracking-wider">
                    Doctor's Clinical Workplan & Strategy:
                  </div>
                  <div className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {data.clinicalNotes}
                  </div>
                </div>
              )}

              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-600 text-[11px]">
                    <th className="py-2">Medication</th>
                    <th className="py-2">Dosage & Frequency</th>
                    <th className="py-2">Route</th>
                    <th className="py-2">Duration</th>
                    <th className="py-2 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.items?.map((item: any, idx: number) => (
                    <tr key={idx} className="py-2">
                      <td className="py-2">
                        <div className="font-bold text-slate-900">{item.medicationName}</div>
                        <div className="text-[10px] text-slate-500">{item.instructions}</div>
                      </td>
                      <td className="py-2 text-slate-700">{item.dosage} - {item.frequency}</td>
                      <td className="py-2 text-slate-600">{item.route}</td>
                      <td className="py-2 text-slate-600">{item.duration}</td>
                      <td className="py-2 text-right font-bold text-slate-900">{item.quantityToDispense}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-8 flex justify-between items-end text-slate-600">
                <div>
                  <p className="text-[10px]">Dispensing Pharmacy Stamp</p>
                  <div className="w-36 h-12 border-b border-slate-300" />
                </div>
                <div className="text-right">
                  <p className="text-[10px]">Doctor's Signature & License</p>
                  <div className="w-44 h-12 border-b border-slate-300" />
                  <div className="text-[10px] mt-1 font-semibold text-slate-800">{data.doctorName}</div>
                </div>
              </div>
            </div>
          )}

          {/* TYPE: LAB REPORT */}
          {type === 'lab_report' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-200">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Patient Information</div>
                  <div className="font-bold text-slate-900 text-sm">{data.patientName}</div>
                  <div className="text-slate-600 text-[11px]">MRN: {data.patientMrn}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Test Specification</div>
                  <div className="font-bold text-slate-900">{data.testName}</div>
                  <div className="text-slate-500 text-[11px]">Category: {data.category} | Code: {data.testCode}</div>
                </div>
              </div>

              {data.clinicalIndication && (
                <div className="text-[11px] text-slate-600">
                  <span className="font-semibold">Clinical Indication: </span>{data.clinicalIndication}
                </div>
              )}

              {data.results && data.results.length > 0 ? (
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-600 text-[11px] bg-slate-50">
                      <th className="py-2 px-2">Investigation / Parameter</th>
                      <th className="py-2 px-2">Result</th>
                      <th className="py-2 px-2">Units</th>
                      <th className="py-2 px-2">Reference Range</th>
                      <th className="py-2 px-2 text-right">Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.results.map((res: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-2 px-2 font-medium text-slate-900">{res.parameter}</td>
                        <td className={`py-2 px-2 font-bold ${res.flag !== 'Normal' ? 'text-rose-600' : 'text-slate-900'}`}>
                          {res.value}
                        </td>
                        <td className="py-2 px-2 text-slate-600">{res.unit}</td>
                        <td className="py-2 px-2 text-slate-600">{res.referenceRange}</td>
                        <td className="py-2 px-2 text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            res.flag === 'Normal' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {res.flag}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-4 text-center text-slate-500 bg-slate-50 rounded">
                  Results pending laboratory technician verification.
                </div>
              )}

              {data.labTechnicianNotes && (
                <div className="bg-amber-50 p-2.5 rounded border border-amber-200 text-[11px] text-amber-900">
                  <span className="font-bold">Pathologist Remarks: </span>{data.labTechnicianNotes}
                </div>
              )}

              {data.attachments && data.attachments.length > 0 && (
                <div className="p-2.5 bg-emerald-50 rounded border border-emerald-200 text-[11px] text-emerald-900">
                  <span className="font-bold">Verified Attached Documents ({data.attachments.length}): </span>
                  <span className="text-emerald-800">
                    {data.attachments.map((a: any) => `${a.name} (${Math.round((a.size || 0) / 1024)} KB)`).join(', ')}
                  </span>
                  <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                    Saved in Prime Admin Cloud Account partition
                  </div>
                </div>
              )}

              <div className="pt-6 flex justify-between items-end text-slate-600 border-t border-slate-200">
                <div className="text-[10px]">
                  <span>Validated by: </span>
                  <span className="font-semibold text-slate-800">{data.completedBy || 'Clinical Pathologist'}</span>
                </div>
                <div className="text-right">
                  <div className="w-36 h-10 border-b border-slate-300" />
                  <span className="text-[10px]">Authorized Signature</span>
                </div>
              </div>
            </div>
          )}

          {/* TYPE: RADIOLOGY REPORT */}
          {type === 'radiology_report' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-200">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Patient Information</div>
                  <div className="font-bold text-slate-900 text-sm">{data.patientName}</div>
                  <div className="text-slate-600 text-[11px]">MRN: {data.patientMrn}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Modality & Procedure</div>
                  <div className="font-bold text-slate-900">{data.procedureName}</div>
                  <div className="text-slate-500 text-[11px]">{data.modality} - {data.bodyPart}</div>
                </div>
              </div>

              {data.clinicalHistory && (
                <div className="text-[11px] text-slate-700">
                  <span className="font-bold">Clinical Indication: </span>{data.clinicalHistory}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">Radiological Findings</div>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 text-slate-800 leading-relaxed text-[11px]">
                    {data.findings || 'Findings recording in progress.'}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">Diagnostic Impression</div>
                  <div className="p-3 bg-sky-50 rounded border border-sky-200 text-sky-950 font-medium leading-relaxed text-[11px]">
                    {data.impression || 'Impression pending final signature.'}
                  </div>
                </div>
              </div>

              {data.attachments && data.attachments.length > 0 && (
                <div className="p-2.5 bg-emerald-50 rounded border border-emerald-200 text-[11px] text-emerald-900">
                  <span className="font-bold">Verified Attached Scans & Documents ({data.attachments.length}): </span>
                  <span className="text-emerald-800">
                    {data.attachments.map((a: any) => `${a.name} (${Math.round((a.size || 0) / 1024)} KB)`).join(', ')}
                  </span>
                  <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                    Saved in Prime Admin Cloud Account partition
                  </div>
                </div>
              )}

              <div className="pt-6 flex justify-between items-end text-slate-600 border-t border-slate-200">
                <div className="text-[10px]">
                  <span>Reporting Radiologist: </span>
                  <span className="font-semibold text-slate-800">{data.completedBy || 'Radiology Specialist'}</span>
                </div>
                <div className="text-right">
                  <div className="w-36 h-10 border-b border-slate-300" />
                  <span className="text-[10px]">Radiologist Signature</span>
                </div>
              </div>
            </div>
          )}

          {/* TYPE: LEDGER SUMMARY (BANK STATEMENT FORMAT) */}
          {type === 'ledger' && (() => {
            const statementPeriod = data.statementPeriod || 'All Historical Records';
            const openingBalance = Number(data.openingBalance || 0);
            
            // Build unified chronological transaction entries grouped by date
            const items = (data.items || []).map((it: any) => ({
              id: it.id,
              date: it.date,
              time: it.time || '',
              type: 'debit' as const,
              department: it.department,
              description: it.description,
              reference: it.referenceId || 'SVC-BILL',
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              debit: Number(it.totalAmount || 0),
              credit: 0
            }));

            const payments = (data.transactions || []).map((tx: any) => ({
              id: tx.id,
              date: tx.date ? tx.date.split('T')[0] : (data.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0]),
              time: tx.date ? new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '',
              type: 'credit' as const,
              department: 'Payment Receipt',
              description: `Payment via ${tx.paymentMethod}${tx.referenceNo ? ` [Ref: ${tx.referenceNo}]` : ''} - Cashier: ${tx.receivedBy || 'Accounts'}${tx.notes ? ` (${tx.notes})` : ''}`,
              reference: tx.receiptNumber || tx.id,
              quantity: 1,
              unitPrice: tx.amountPaid,
              debit: 0,
              credit: Number(tx.amountPaid || 0)
            }));

            // Combine and sort chronologically (oldest to newest for statement running balance)
            const allEntries = [...items, ...payments].sort((a, b) => {
              const timeA = new Date(a.date).getTime();
              const timeB = new Date(b.date).getTime();
              if (timeA !== timeB) return timeA - timeB;
              // Debits before credits if same timestamp
              return a.type === 'debit' ? -1 : 1;
            });

            // Calculate running balance starting from opening balance
            let currentRunning = openingBalance;
            const entriesWithBalance = allEntries.map(entry => {
              currentRunning = currentRunning + entry.debit - entry.credit;
              return {
                ...entry,
                runningBalance: currentRunning
              };
            });

            // Group by date
            const dateGroupsMap = new Map<string, typeof entriesWithBalance>();
            entriesWithBalance.forEach(e => {
              if (!dateGroupsMap.has(e.date)) {
                dateGroupsMap.set(e.date, []);
              }
              dateGroupsMap.get(e.date)!.push(e);
            });

            const dateGroups = Array.from(dateGroupsMap.entries());

            const totalDebits = Number((data.totalBilled !== undefined ? data.totalBilled : items.reduce((s: number, i: any) => s + i.debit, 0)).toFixed(2));
            const totalCredits = Number((data.totalPaid !== undefined ? data.totalPaid : payments.reduce((s: number, p: any) => s + p.credit, 0)).toFixed(2));
            const closingBalance = Number((openingBalance + totalDebits - totalCredits).toFixed(2));

            return (
              <div className="space-y-5">
                {/* Statement Header Banner */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Account Holder (Patient)</div>
                      <div className="font-extrabold text-slate-900 text-sm">{data.patientName}</div>
                      <div className="text-slate-600 text-[11px] font-mono mt-0.5">
                        Patient MRN: <span className="font-bold text-slate-800">{data.patientMrn}</span>
                      </div>
                      <div className="text-slate-500 text-[10px] mt-0.5">
                        Ledger Ref: <span className="font-mono">{data.id || `LED-${data.patientId}`}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Statement Information</div>
                      <div className="font-bold text-slate-800 text-xs mt-0.5">Statement of Clinical Account</div>
                      <div className="text-slate-600 text-[11px] mt-0.5">
                        Period: <span className="font-bold text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{statementPeriod}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Currency: <span className="font-semibold text-slate-700">{currencyConfig.code} ({currencyConfig.symbol})</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bank Statement Financial Summary Strip */}
                <div className="grid grid-cols-4 gap-2 bg-slate-900 text-white p-3.5 rounded-lg text-center shadow-xs">
                  <div className="border-r border-slate-700/80 pr-2">
                    <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Opening Balance</div>
                    <div className="text-xs font-black font-mono mt-0.5 text-slate-200">
                      {formatCurrency(openingBalance)}
                    </div>
                  </div>
                  <div className="border-r border-slate-700/80 pr-2">
                    <div className="text-[9px] text-rose-300 uppercase font-bold tracking-wider">Total Debits (Billed)</div>
                    <div className="text-xs font-black font-mono mt-0.5 text-rose-300">
                      +{formatCurrency(totalDebits)}
                    </div>
                  </div>
                  <div className="border-r border-slate-700/80 pr-2">
                    <div className="text-[9px] text-emerald-300 uppercase font-bold tracking-wider">Total Credits (Paid)</div>
                    <div className="text-xs font-black font-mono mt-0.5 text-emerald-300">
                      -{formatCurrency(totalCredits)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-amber-300 uppercase font-black tracking-wider">Closing Balance Due</div>
                    <div className="text-xs font-black font-mono mt-0.5 text-amber-300">
                      {formatCurrency(closingBalance)}
                    </div>
                  </div>
                </div>

                {/* Date-Separated Statement Table */}
                <div className="space-y-4">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between border-b border-slate-200 pb-1">
                    <span>Itemized Transaction Activity Separated by Dates</span>
                    <span className="text-[10px] font-normal text-slate-500 font-mono">
                      {entriesWithBalance.length} transaction entries across {dateGroups.length} date{dateGroups.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {dateGroups.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded border border-slate-200">
                      No transaction entries recorded for the selected statement period.
                    </div>
                  ) : (
                    dateGroups.map(([dateKey, groupEntries]) => {
                      const groupDebits = groupEntries.reduce((s, e) => s + e.debit, 0);
                      const groupCredits = groupEntries.reduce((s, e) => s + e.credit, 0);
                      const formattedDate = new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      });

                      return (
                        <div key={dateKey} className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
                          {/* Date Header Strip */}
                          <div className="bg-slate-100/90 px-3 py-1.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900">{formattedDate}</span>
                              <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-semibold">
                                {dateKey}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] font-mono">
                              {groupDebits > 0 && (
                                <span className="font-bold text-rose-700">
                                  Billed: +{formatCurrency(groupDebits)}
                                </span>
                              )}
                              {groupCredits > 0 && (
                                <span className="font-bold text-emerald-700">
                                  Paid: -{formatCurrency(groupCredits)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Entries Table */}
                          <table className="w-full border-collapse text-left text-[11px]">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-500 text-[10px] bg-slate-50/70 font-semibold uppercase">
                                <th className="py-1.5 px-2.5">Time / Ref</th>
                                <th className="py-1.5 px-2">Dept / Type</th>
                                <th className="py-1.5 px-2">Description / Particulars</th>
                                <th className="py-1.5 px-2 text-right">Qty</th>
                                <th className="py-1.5 px-2 text-right">Debit ({currencyConfig.symbol})</th>
                                <th className="py-1.5 px-2 text-right">Credit ({currencyConfig.symbol})</th>
                                <th className="py-1.5 px-2.5 text-right">Balance ({currencyConfig.symbol})</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {groupEntries.map(e => (
                                <tr key={e.id} className={e.type === 'credit' ? 'bg-emerald-50/20' : 'bg-white'}>
                                  <td className="py-1.5 px-2.5 font-mono text-[10px] text-slate-600 whitespace-nowrap">
                                    <div className="font-semibold">{e.time || '—'}</div>
                                    <div className="text-[9px] text-slate-400">{e.reference}</div>
                                  </td>
                                  <td className="py-1.5 px-2 whitespace-nowrap">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                      e.department === 'Payment Receipt'
                                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                        : e.department === 'Pharmacy'
                                        ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                        : e.department === 'Pathology'
                                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                        : e.department === 'Radiology'
                                        ? 'bg-cyan-100 text-cyan-900 border border-cyan-200'
                                        : e.department === 'Consultation'
                                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                                    }`}>
                                      {e.department}
                                    </span>
                                  </td>
                                  <td className="py-1.5 px-2 font-medium text-slate-900">
                                    <div className="leading-snug">{e.description}</div>
                                    {e.unitPrice > 0 && e.debit > 0 && (
                                      <div className="text-[9px] text-slate-400 font-mono">
                                        Rate: {formatCurrency(e.unitPrice)} / unit
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-mono text-slate-600">
                                    {e.quantity || 1}
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                                    {e.debit > 0 ? `+${formatCurrency(e.debit)}` : '—'}
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                                    {e.credit > 0 ? `-${formatCurrency(e.credit)}` : '—'}
                                  </td>
                                  <td className="py-1.5 px-2.5 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                                    {formatCurrency(e.runningBalance)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Final Certification & Accountant Stamp */}
                <div className="pt-4 border-t border-slate-200 flex justify-between items-end text-slate-600 text-[10px]">
                  <div>
                    <p className="font-semibold text-slate-800">Financial Accounts Department Certification</p>
                    <p className="text-slate-500 mt-0.5">This document constitutes an official certified statement of clinical billing and settlements.</p>
                    <div className="w-40 h-10 border-b border-slate-300 mt-1" />
                    <p className="text-[9px] text-slate-400 mt-0.5">Authorized Accounts Signature & Official Clinic Stamp</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900 text-xs">
                      Net Balance Due: <span className={closingBalance > 0 ? 'text-rose-600' : 'text-emerald-700'}>${closingBalance.toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Account Status: <strong className="uppercase">{closingBalance <= 0 ? 'Settled in Full' : 'Outstanding Balance Pending'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TYPE: CLINICAL WORKUP / OPD CONSULTATION */}
          {type === 'workup' && (
            <div className="space-y-5">
              {/* Patient & Encounter Demographics Banner */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded border border-slate-200">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Patient Information</div>
                  <div className="text-sm font-bold text-slate-900">{data.patientName}</div>
                  <div className="text-slate-600 text-[11px] mt-0.5">
                    MRN: <span className="font-semibold text-slate-800">{data.patientMrn}</span> | Type: <span className="font-bold text-sky-700">{data.patientType || 'OPD'}</span>
                  </div>
                  {data.patientGender && (
                    <div className="text-slate-500 text-[10px] mt-0.5">
                      Gender: {data.patientGender} {data.patientAge ? `| Age: ${data.patientAge}y` : ''}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Consulting Clinician</div>
                  <div className="font-semibold text-slate-900">Dr. {data.doctorName}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">Visit Date: {data.visitDate}</div>
                  <div className="text-slate-400 text-[10px]">Encounter Ref: {data.id}</div>
                </div>
              </div>

              {/* Vitals Snapshot */}
              {data.vitals && (
                <div className="bg-sky-50/60 p-3 rounded border border-sky-200">
                  <div className="text-[10px] text-sky-800 font-bold uppercase tracking-wider mb-2">
                    Baseline Anthropometry & Vital Signs
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 text-center text-[11px]">
                    <div className="bg-white p-1.5 rounded border border-sky-100">
                      <div className="text-[9px] text-slate-500">BP</div>
                      <div className="font-bold text-slate-800">{data.vitals.bloodPressure || '—'}</div>
                      <div className="text-[8px] text-slate-400">mmHg</div>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-sky-100">
                      <div className="text-[9px] text-slate-500">Pulse</div>
                      <div className="font-bold text-slate-800">{data.vitals.pulseRate || '—'}</div>
                      <div className="text-[8px] text-slate-400">bpm</div>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-sky-100">
                      <div className="text-[9px] text-slate-500">Temp</div>
                      <div className="font-bold text-slate-800">{data.vitals.temperature || '—'}</div>
                      <div className="text-[8px] text-slate-400">°C</div>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-sky-100">
                      <div className="text-[9px] text-slate-500">SpO2</div>
                      <div className="font-bold text-slate-800">{data.vitals.spO2 ? `${data.vitals.spO2}%` : '—'}</div>
                      <div className="text-[8px] text-slate-400">room air</div>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-sky-100">
                      <div className="text-[9px] text-slate-500">Resp Rate</div>
                      <div className="font-bold text-slate-800">{data.vitals.respiratoryRate || '—'}</div>
                      <div className="text-[8px] text-slate-400">/min</div>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-sky-100">
                      <div className="text-[9px] text-slate-500">Weight</div>
                      <div className="font-bold text-slate-800">{data.vitals.weightKg ? `${data.vitals.weightKg} kg` : '—'}</div>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-sky-100">
                      <div className="text-[9px] text-slate-500">Height / BMI</div>
                      <div className="font-bold text-slate-800">
                        {data.vitals.heightCm ? `${data.vitals.heightCm}cm` : '—'}
                      </div>
                      <div className="text-[8px] text-slate-500">
                        {data.vitals.bmi ? `BMI ${data.vitals.bmi}` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Chief Complaint */}
              <div className="border border-slate-200 rounded p-3 bg-white space-y-1">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  1. Chief Complaint (Presenting Problem)
                </div>
                <div className="text-slate-900 font-medium text-xs whitespace-pre-wrap pl-1">
                  {data.chiefComplaint || 'None recorded'}
                </div>
              </div>

              {/* History of Presenting Illness (HPI) */}
              <div className="border border-slate-200 rounded p-3 bg-white space-y-1">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  2. History of Presenting Illness (HPI) & Clinical Background
                </div>
                <div className="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap pl-1">
                  {data.historyOfPresentIllness || 'No extended clinical history documented'}
                </div>
              </div>

              {/* Physical Examination */}
              <div className="border border-slate-200 rounded p-3 bg-white space-y-2">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  3. Physical Examination Findings (General & Systemic)
                </div>
                <div className="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap pl-1">
                  {data.physicalExamNotes || 'No specific physical findings recorded'}
                </div>
                {data.generalExam && (
                  <div className="text-[11px] text-slate-700 pl-1 border-t border-slate-100 pt-1.5">
                    <span className="font-semibold text-slate-800">General Exam: </span>{data.generalExam}
                  </div>
                )}
                {data.systemicExam && (
                  <div className="text-[11px] text-slate-700 pl-1">
                    <span className="font-semibold text-slate-800">Systemic Findings: </span>{data.systemicExam}
                  </div>
                )}
              </div>

              {/* Clinical Diagnosis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border border-emerald-200 rounded p-3 bg-emerald-50/40">
                  <div className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
                    4. Working / Primary Diagnosis
                  </div>
                  <div className="text-emerald-950 font-bold text-xs mt-1">
                    {data.workingDiagnosis || 'Pending evaluation'}
                  </div>
                </div>

                {data.differentialDiagnosis && (
                  <div className="border border-slate-200 rounded p-3 bg-slate-50">
                    <div className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                      Differential Diagnosis
                    </div>
                    <div className="text-slate-800 text-xs mt-1">
                      {data.differentialDiagnosis}
                    </div>
                  </div>
                )}
              </div>

              {/* Clinical Plan / Management */}
              {(data.clinicalPlan || (data.investigationsOrdered && data.investigationsOrdered.length > 0) || (data.medicationsPrescribed && data.medicationsPrescribed.length > 0) || data.followUpDate) && (
                <div className="border border-indigo-200 rounded p-3 bg-indigo-50/30 space-y-2">
                  <div className="text-[10px] text-indigo-900 font-bold uppercase tracking-wider">
                    5. Clinical Management & Workplan
                  </div>
                  {data.clinicalPlan && (
                    <div className="text-slate-800 text-xs whitespace-pre-wrap pl-1">
                      {data.clinicalPlan}
                    </div>
                  )}
                  {data.investigationsOrdered && data.investigationsOrdered.length > 0 && (
                    <div className="text-[11px] text-slate-700 pl-1">
                      <span className="font-semibold text-slate-900">Investigations Ordered: </span>
                      {Array.isArray(data.investigationsOrdered) ? data.investigationsOrdered.join(', ') : data.investigationsOrdered}
                    </div>
                  )}
                  {data.medicationsPrescribed && data.medicationsPrescribed.length > 0 && (
                    <div className="text-[11px] text-slate-700 pl-1">
                      <span className="font-semibold text-slate-900">Medications Prescribed: </span>
                      {Array.isArray(data.medicationsPrescribed) ? data.medicationsPrescribed.join(', ') : data.medicationsPrescribed}
                    </div>
                  )}
                  {data.followUpDate && (
                    <div className="text-[11px] text-slate-700 pl-1 font-medium">
                      <span className="font-semibold text-slate-900">Follow-Up Recommended: </span>
                      {data.followUpDate}
                    </div>
                  )}
                </div>
              )}

              {/* Signatures */}
              <div className="pt-6 border-t border-slate-200 flex justify-between items-end">
                <div className="text-[10px] text-slate-500">
                  <p>Document generated electronically via ViperH.M.S EMR</p>
                  <p>Encounter Status: <span className="font-semibold text-slate-800 uppercase">{data.status || 'Completed'}</span></p>
                </div>
                <div className="text-right">
                  <div className="w-48 h-10 border-b border-slate-400" />
                  <span className="text-[10px] font-semibold text-slate-800">Dr. {data.doctorName}</span>
                  <div className="text-[9px] text-slate-500">Attending Physician Signature</div>
                </div>
              </div>
            </div>
          )}

          {/* TYPE: CLINICAL PROCEDURE */}
          {type === 'procedure' && (
            <div className="space-y-5">
              {/* Header Demographics */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded border border-slate-200">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Patient Demographics</div>
                  <div className="text-sm font-bold text-slate-900">{data.patientName}</div>
                  <div className="text-slate-600 text-[11px] mt-0.5">
                    MRN: <span className="font-semibold text-slate-800">{data.patientMrn}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Surgeon / Clinician</div>
                  <div className="font-semibold text-slate-900">Dr. {data.doctorName}</div>
                  {data.assistants && (
                    <div className="text-slate-500 text-[11px]">Assistant(s): {data.assistants}</div>
                  )}
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Performed: {new Date(data.performedAt || data.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Procedure Name & Category */}
              <div className="bg-slate-900 text-white p-4 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">
                    {data.category || 'Clinical Procedure'}
                  </div>
                  <div className="text-base font-bold text-white mt-0.5">{data.procedureName}</div>
                  {data.procedureCode && (
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">Code: {data.procedureCode}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-300 uppercase">Procedure Fee</div>
                  <div className="text-lg font-bold text-emerald-400">${(data.cost || 0).toFixed(2)}</div>
                </div>
              </div>

              {/* Procedure Technique & Details */}
              <div className="border border-slate-200 rounded p-3 bg-white space-y-1.5">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Operative & Technique Details
                </div>
                <div className="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap pl-1">
                  {data.details || 'No detailed technique notes documented.'}
                </div>
              </div>

              {/* Operative Findings */}
              {data.findings && (
                <div className="border border-slate-200 rounded p-3 bg-white space-y-1.5">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Intra-Procedure Findings
                  </div>
                  <div className="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap pl-1">
                    {data.findings}
                  </div>
                </div>
              )}

              {/* Anesthesia & Outcome Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-slate-200 rounded p-3 bg-slate-50">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Anesthesia Administered</div>
                  <div className="font-semibold text-slate-800 text-xs mt-1">
                    {data.anesthesiaType || 'None / Not Specified'}
                  </div>
                </div>

                <div className="border border-slate-200 rounded p-3 bg-slate-50">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Clinical Outcome</div>
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold mt-1 ${
                    data.outcome === 'Successful' ? 'bg-emerald-100 text-emerald-800' :
                    data.outcome === 'Successful with Monitoring' ? 'bg-sky-100 text-sky-800' :
                    data.outcome === 'Partial' ? 'bg-amber-100 text-amber-800' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    {data.outcome || 'Successful'}
                  </span>
                  {data.outcomeNotes && (
                    <div className="text-[11px] text-slate-600 mt-1">{data.outcomeNotes}</div>
                  )}
                </div>
              </div>

              {/* Post Procedure Instructions */}
              {data.postProcedureCare && (
                <div className="border border-amber-200 rounded p-3 bg-amber-50/40 space-y-1">
                  <div className="text-[10px] text-amber-900 font-bold uppercase tracking-wider">
                    Post-Procedure Nursing & Wound Care Instructions
                  </div>
                  <div className="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap pl-1">
                    {data.postProcedureCare}
                  </div>
                </div>
              )}

              {/* Signatures */}
              <div className="pt-6 border-t border-slate-200 flex justify-between items-end">
                <div className="text-[10px] text-slate-500">
                  <p>Certified Procedure Encounter Record</p>
                  <p>Record ID: {data.id}</p>
                </div>
                <div className="text-right">
                  <div className="w-48 h-10 border-b border-slate-400" />
                  <span className="text-[10px] font-semibold text-slate-800">Dr. {data.doctorName}</span>
                  <div className="text-[9px] text-slate-500">Attending Surgeon / Physician Signature</div>
                </div>
              </div>
            </div>
          )}

          {/* TYPE: COMPLETE DIGITAL PATIENT CASE FILE (CHRONOLOGICAL ENCOUNTERS) */}
          {type === 'case_file' && (
            <div className="space-y-6">
              {/* Dossier Header Banner */}
              <div className="bg-slate-900 text-white p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[10px] text-indigo-300 font-mono tracking-wider uppercase font-bold">
                      Official Inpatient Clinical Record Dossier &bull; Oldest to Newest
                    </div>
                    <div className="text-base font-bold text-white mt-1">
                      {data.patient?.firstName} {data.patient?.lastName}
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      MRN: <span className="font-mono text-white font-semibold">{data.patient?.mrn}</span> &bull;{' '}
                      {data.patient?.age}y &bull; {data.patient?.gender} &bull; Blood Group: {data.patient?.bloodGroup || 'N/A'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded uppercase">
                      Inpatient File
                    </span>
                    <div className="text-[11px] text-slate-300 mt-1">
                      Ward: <strong className="text-white">{data.patient?.ward || 'General Ward'}</strong> &bull; Bed: <strong className="text-white">{data.patient?.bedNumber || 'N/A'}</strong>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Admission Date: {data.patient?.registeredAt || 'Admitted'}
                    </div>
                  </div>
                </div>

                {data.patient?.allergies && data.patient.allergies.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-700 text-[11px] text-rose-300 font-semibold flex items-center gap-1.5">
                    <span>CRITICAL ALLERGIES:</span>
                    <span className="bg-rose-950/80 px-2 py-0.5 rounded text-rose-200 border border-rose-800">
                      {data.patient.allergies.join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Case Summary Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded p-3 text-[11px] flex justify-between items-center">
                <div>
                  <span className="text-slate-500 font-semibold">Total Encounters in File:</span>{' '}
                  <strong className="text-slate-900">{data.encounters?.length || 0} Doctor Consultation(s) / Ward Round(s)</strong>
                </div>
                <div className="text-slate-600">
                  Arrangement: <span className="font-bold text-indigo-700">Chronological (Oldest &rarr; Newest)</span>
                </div>
              </div>

              {/* Sequential Encounters List */}
              <div className="space-y-6">
                {data.encounters && data.encounters.length > 0 ? (
                  data.encounters.map((enc: any, index: number) => (
                    <div key={enc.id || index} className="border border-slate-300 rounded-lg p-4 bg-white space-y-3 break-inside-avoid">
                      {/* Encounter Top Info */}
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold text-[10px] uppercase">
                            Encounter #{index + 1} {index === 0 ? '(Initial Workup)' : `(Ward Round / Follow-up)`}
                          </span>
                          <span className="font-bold text-slate-800 text-xs">
                            Dr. {enc.doctorName}
                          </span>
                        </div>
                        <div className="text-right text-[11px] text-slate-600">
                          <span>Visit Date: <strong>{enc.visitDate}</strong></span>
                          {enc.status && (
                            <span className="ml-2 uppercase text-[10px] font-bold text-emerald-700">
                              [{enc.status}]
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Vitals Snapshot */}
                      {enc.vitals && (
                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 text-center text-[10px] bg-slate-50 p-2 rounded border border-slate-200">
                          <div>
                            <span className="text-slate-500 block">BP</span>
                            <span className="font-bold text-slate-800">{enc.vitals.bloodPressure || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Pulse</span>
                            <span className="font-bold text-slate-800">{enc.vitals.pulseRate || '—'} bpm</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Temp</span>
                            <span className="font-bold text-slate-800">{enc.vitals.temperature || '—'} °C</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">SpO2</span>
                            <span className="font-bold text-slate-800">{enc.vitals.spO2 || '—'}%</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">RR</span>
                            <span className="font-bold text-slate-800">{enc.vitals.respiratoryRate || '—'}/min</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Weight</span>
                            <span className="font-bold text-slate-800">{enc.vitals.weightKg ? `${enc.vitals.weightKg}kg` : '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Glucose</span>
                            <span className="font-bold text-slate-800">{enc.vitals.bloodGlucose || '—'}</span>
                          </div>
                        </div>
                      )}

                      {/* Chief Complaint */}
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          Chief Complaint & Subjective Notes
                        </div>
                        <div className="text-xs text-slate-900 font-medium whitespace-pre-wrap pl-1 mt-0.5">
                          {enc.chiefComplaint || 'None recorded'}
                        </div>
                      </div>

                      {/* HPI */}
                      {enc.historyOfPresentIllness && (
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            History of Presenting Illness (HPI) & Interval Course
                          </div>
                          <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-1 mt-0.5">
                            {enc.historyOfPresentIllness}
                          </div>
                        </div>
                      )}

                      {/* Physical Exam */}
                      {enc.physicalExamNotes && (
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            Physical Examination Findings
                          </div>
                          <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-1 mt-0.5">
                            {enc.physicalExamNotes}
                          </div>
                        </div>
                      )}

                      {/* Diagnosis */}
                      <div className="bg-emerald-50 border border-emerald-200 rounded p-2.5">
                        <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                          Working Diagnosis
                        </div>
                        <div className="text-xs font-bold text-emerald-950 mt-0.5">
                          {enc.workingDiagnosis || 'Pending evaluation'}
                        </div>
                        {enc.differentialDiagnosis && (
                          <div className="text-[11px] text-emerald-800 mt-1">
                            Differential: {enc.differentialDiagnosis}
                          </div>
                        )}
                      </div>

                      {/* Plan */}
                      {enc.clinicalPlan && (
                        <div className="bg-indigo-50/60 border border-indigo-200 rounded p-2.5">
                          <div className="text-[10px] font-bold text-indigo-900 uppercase tracking-wide">
                            Clinical Plan, Doctor Orders & Nursing Care Directives
                          </div>
                          <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap mt-0.5">
                            {enc.clinicalPlan}
                          </div>
                        </div>
                      )}

                      {/* Sign-off footer per encounter */}
                      <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-500">
                        <span>Encounter ID: {enc.id}</span>
                        <span>Attending: Dr. {enc.doctorName} &bull; Date: {enc.visitDate}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-500 italic border border-dashed border-slate-300 rounded-lg">
                    No doctor encounters have been recorded for this patient case file yet.
                  </div>
                )}
              </div>

              {/* Dossier Final Certification */}
              <div className="pt-6 border-t-2 border-slate-300 flex justify-between items-end">
                <div className="text-[10px] text-slate-500">
                  <p>Certified Inpatient Case Record</p>
                  <p>Facility: {activeClinic.name} ({activeClinic.code})</p>
                  <p>Record generated on: {new Date().toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <div className="w-52 h-10 border-b border-slate-400" />
                  <span className="text-[10px] font-semibold text-slate-800">Hospital Medical Director / Ward Consultant</span>
                  <div className="text-[9px] text-slate-500">Authorized Inpatient Dossier Seal</div>
                </div>
              </div>
            </div>
          )}

          {/* DISCHARGE SUMMARY */}
          {type === 'discharge_summary' && (
            <div className="space-y-6">
              
              {/* Document Banner */}
              <div className="bg-slate-900 text-white p-4 rounded-lg flex justify-between items-center print:bg-slate-900 print:text-white">
                <div>
                  <h3 className="text-sm font-bold tracking-wider uppercase">Inpatient Official Discharge Summary</h3>
                  <p className="text-[11px] text-slate-300">
                    Patient Admission & Care Management Completion Dossier
                  </p>
                </div>
                <div className="text-right text-xs">
                  <div className="font-mono font-bold">DOC ID: {data.id}</div>
                  <div className="text-slate-300">
                    Discharged: {new Date(data.dischargeDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Patient & Admission Demographics */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="space-y-1">
                  <div>
                    <span className="text-slate-500">Patient Name: </span>
                    <strong className="text-slate-900 text-sm">{data.patientName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Medical Record No (MRN): </span>
                    <strong className="text-indigo-900 font-mono">{data.patientMrn}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Demographics: </span>
                    <span>{data.patientGender}, {data.patientAge} Years</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Admitting Ward & Bed: </span>
                    <strong>{data.ward || 'Inpatient Ward'}{data.bedNumber ? ` - Bed ${data.bedNumber}` : ''}</strong>
                  </div>
                </div>

                <div className="space-y-1 text-right">
                  <div>
                    <span className="text-slate-500">Admission Date: </span>
                    <strong>{data.admissionDate ? new Date(data.admissionDate).toLocaleDateString() : 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Discharge Date: </span>
                    <strong>{data.dischargeDate ? new Date(data.dischargeDate).toLocaleDateString() : new Date().toLocaleDateString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Discharging Physician: </span>
                    <strong className="text-slate-900">Dr. {data.dischargingDoctorName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Condition on Discharge: </span>
                    <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                      {data.dischargeCondition || 'Improved'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 1. Diagnoses & First Chief Complaint */}
              <div className="space-y-2 border-b border-slate-200 pb-4">
                <div>
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    1. First Chief Complaint on Admission
                  </h4>
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 leading-relaxed font-sans">
                    {data.firstChiefComplaint || 'None specified'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      Final Primary Diagnosis
                    </h4>
                    <p className="text-slate-900 font-bold bg-indigo-50 p-2 rounded border border-indigo-100">
                      {data.finalDiagnosis}
                    </p>
                  </div>
                  {data.secondaryDiagnoses && (
                    <div>
                      <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                        Secondary / Comorbid Diagnoses
                      </h4>
                      <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                        {data.secondaryDiagnoses}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Diagnostic Investigations & Tests Done */}
              <div className="space-y-2 border-b border-slate-200 pb-4">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  2. Diagnostic Investigations & Tests Done
                </h4>
                {data.testsDoneSummary && data.testsDoneSummary.length > 0 ? (
                  <ul className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {data.testsDoneSummary.map((test: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-800">
                        <span className="text-indigo-600 font-bold">&bull;</span>
                        <span className="font-mono text-[11px]">{test}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500 italic">No laboratory or radiological orders recorded.</p>
                )}
              </div>

              {/* 3. Clinical Features & Inpatient Hospital Course */}
              <div className="space-y-2 border-b border-slate-200 pb-4">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  3. Clinical Features & Physical Examination on Discharge
                </h4>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 whitespace-pre-wrap leading-relaxed">
                  {data.clinicalFeatures || 'Vital signs stable and patient afebrile upon discharge.'}
                </div>
              </div>

              {/* 4. Management That Was Given */}
              <div className="space-y-2 border-b border-slate-200 pb-4">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  4. Inpatient Management & Procedures Administered
                </h4>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 whitespace-pre-wrap leading-relaxed">
                  {data.managementGiven || 'Medical inpatient supportive care and nursing management administered.'}
                </div>
              </div>

              {/* 5. Discharge Management & Take-Home Prescriptions */}
              <div className="space-y-3 border-b border-slate-200 pb-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    5. Discharge Management & Take-Home Prescriptions
                  </h4>
                  {data.prescriptionId && (
                    <span className="font-mono text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Pharmacy Rx #{data.prescriptionId}
                    </span>
                  )}
                </div>

                {data.takeHomePrescription ? (
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 text-slate-800 text-xs font-sans whitespace-pre-wrap leading-relaxed">
                    <div className="font-bold text-slate-900 mb-1.5 uppercase text-[10px] tracking-wider text-emerald-800">
                      Take-Home Prescription & Directions:
                    </div>
                    {data.takeHomePrescription}
                  </div>
                ) : data.dischargeMedications && data.dischargeMedications.length > 0 ? (
                  <table className="w-full text-left border border-slate-200 rounded text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-800 font-bold">
                      <tr>
                        <th className="p-2 border-b border-slate-200">Medication</th>
                        <th className="p-2 border-b border-slate-200">Dosage & Route</th>
                        <th className="p-2 border-b border-slate-200">Frequency & Duration</th>
                        <th className="p-2 border-b border-slate-200 text-center">Qty</th>
                        <th className="p-2 border-b border-slate-200">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.dischargeMedications.map((med: any) => (
                        <tr key={med.id}>
                          <td className="p-2 font-bold text-slate-900">{med.medicationName}</td>
                          <td className="p-2 text-slate-700">{med.dosage} &bull; {med.route}</td>
                          <td className="p-2 text-slate-700">{med.frequency} &bull; {med.duration}</td>
                          <td className="p-2 text-center font-mono font-bold text-slate-900">{med.quantityToDispense}</td>
                          <td className="p-2 text-slate-600 text-[11px]">{med.instructions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-slate-500 italic">No take-home medications prescribed.</p>
                )}

                {data.dischargeManagementNotes && (
                  <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-slate-700 text-xs">
                    <strong className="text-slate-900">Home Care & Lifestyle Instructions: </strong>
                    {data.dischargeManagementNotes}
                  </div>
                )}
              </div>

              {/* 6. Follow-Up Schedule & Emergency Warnings */}
              <div className="space-y-2 border-b border-slate-200 pb-4">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  6. Follow-Up Review Schedule & Warning Signs
                </h4>
                <div className="grid grid-cols-2 gap-3 bg-amber-50/50 p-3 rounded-lg border border-amber-200">
                  <div>
                    <span className="text-amber-900 font-semibold">Review Date: </span>
                    <strong className="text-slate-900">
                      {data.followUpDate
                        ? new Date(data.followUpDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'As instructed / PRN'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-amber-900 font-semibold">Clinic / Doctor: </span>
                    <strong className="text-slate-900">{data.followUpClinicOrDoctor || 'Outpatient Clinic'}</strong>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 leading-relaxed text-xs">
                  <strong className="text-rose-900">Red Flag Signs: </strong>
                  {data.followUpInstructions || 'Return to emergency department immediately if symptoms recur or worsen.'}
                </div>
              </div>

              {/* 7. Document Revision & Change History Audit Trail */}
              {data.changeHistory && data.changeHistory.length > 0 && (
                <div className="space-y-2 border-b border-slate-200 pb-4 text-xs">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    7. Document Change History & Revision Timestamps
                  </h4>
                  <div className="rounded border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-1.5">Timestamp</th>
                          <th className="p-1.5">Modified By</th>
                          <th className="p-1.5">Action</th>
                          <th className="p-1.5">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {data.changeHistory.map((chg: any, idx: number) => (
                          <tr key={chg.id || idx}>
                            <td className="p-1.5 font-mono text-[10px] text-slate-600 whitespace-nowrap">
                              {new Date(chg.timestamp).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="p-1.5 font-medium text-slate-900 whitespace-nowrap">
                              {chg.userName} {chg.userRole ? `(${chg.userRole})` : ''}
                            </td>
                            <td className="p-1.5 uppercase font-bold text-[9px] text-slate-700 whitespace-nowrap">
                              {chg.action === 'created' ? 'Created' : 'Updated'}
                            </td>
                            <td className="p-1.5 text-slate-700 text-[10px]">
                              {chg.details || 'Discharge file modification'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Doctor Sign-off & Stamp */}
              <div className="pt-6 flex justify-between items-end">
                <div className="text-[10px] text-slate-500 space-y-0.5">
                  <p>Certified Inpatient Hospital Discharge Summary</p>
                  <p>Hospital: {activeClinic.name} ({activeClinic.code})</p>
                  <p>Printed: {new Date().toLocaleString()}</p>
                </div>

                <div className="text-right">
                  <div className="w-56 h-12 border-b border-slate-400 mb-1" />
                  <div className="font-bold text-xs text-slate-900">Dr. {data.dischargingDoctorName}</div>
                  <div className="text-[10px] text-slate-500">Attending Discharging Physician Signature & Stamp</div>
                </div>
              </div>

            </div>
          )}

          {/* REFERRAL FORM TEMPLATE */}
          {type === 'referral_form' && (
            <div className="space-y-5">
              <div className="text-center pb-3 border-b border-slate-300">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <h2 className="text-sm font-bold text-slate-900 tracking-wider uppercase">
                    Official Inpatient Medical Referral & Transfer Dossier
                  </h2>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                    data.urgency === 'emergency'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : data.urgency === 'urgent'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-slate-100 text-slate-800 border-slate-300'
                  }`}>
                    {data.urgency || 'Routine'} Priority
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                  <span>Referral No: <strong className="font-mono text-slate-800 text-xs">#{data.referralNumber}</strong></span>
                  <span>Referral Date: <strong className="text-slate-800">{new Date(data.referralDate).toLocaleString()}</strong></span>
                </div>
              </div>

              {/* 1. Destination & Transfer Particulars */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Destination Hospital</span>
                    <strong className="text-slate-900 text-sm">{data.destinationHospital}</strong>
                    {data.destinationDepartment && (
                      <p className="text-slate-600 text-[11px] mt-0.5">Unit: {data.destinationDepartment}</p>
                    )}
                    {data.destinationDoctorOrContact && (
                      <p className="text-slate-500 text-[10px]">Contact: {data.destinationDoctorOrContact}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Transport & Escort</span>
                    <p className="text-slate-800 font-semibold">{data.transportMode || 'Ambulance'}</p>
                    <p className="text-slate-600 text-[11px] mt-0.5">Accompanying: {data.accompanyingStaff || 'Nurse Escort'}</p>
                  </div>
                </div>
              </div>

              {/* 2. Highlighted Callouts: Reason for Referral & Condition Before Referral */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <span className="text-[10px] font-bold text-rose-900 uppercase block mb-1">
                    Reason for Referral (Mandatory)
                  </span>
                  <p className="text-slate-900 font-medium leading-relaxed whitespace-pre-wrap">
                    {data.reasonForReferral}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-[10px] font-bold text-emerald-900 uppercase block mb-1">
                    Condition Before Referral (At Handover)
                  </span>
                  <p className="text-slate-900 font-medium leading-relaxed">
                    Status: <strong className="text-emerald-950">{data.conditionBeforeReferral}</strong>
                  </p>
                  {data.specialPrecautions && (
                    <p className="text-slate-700 text-[11px] mt-1">
                      Precautions: {data.specialPrecautions}
                    </p>
                  )}
                </div>
              </div>

              {/* 3. Patient Demographics */}
              <div className="border border-slate-200 rounded p-3 text-xs">
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Patient Name:</span>
                    <strong className="text-slate-900">{data.patientName}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">MRN / Hospital No:</span>
                    <strong className="font-mono text-slate-900">{data.patientMrn}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Age / Gender:</span>
                    <strong className="text-slate-900">{data.patientAge} yrs / {data.patientGender}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Ward / Bed:</span>
                    <strong className="text-slate-900">{data.ward || 'IPD'}{data.bedNumber ? ` - ${data.bedNumber}` : ''}</strong>
                  </div>
                </div>
              </div>

              {/* 4. Handover Vital Signs */}
              {data.vitalsAtReferral && (
                <div className="border border-slate-200 rounded p-3 text-xs bg-slate-50/50">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2">
                    Vital Signs Recorded Prior to Handover
                  </span>
                  <div className="grid grid-cols-6 gap-2 text-center">
                    <div className="p-1.5 bg-white border border-slate-200 rounded">
                      <span className="text-[9px] text-slate-400 block uppercase">BP</span>
                      <strong className="text-slate-800">{data.vitalsAtReferral.bloodPressure || '120/80'}</strong>
                    </div>
                    <div className="p-1.5 bg-white border border-slate-200 rounded">
                      <span className="text-[9px] text-slate-400 block uppercase">Pulse</span>
                      <strong className="text-slate-800">{data.vitalsAtReferral.pulseRate || 72}</strong>
                    </div>
                    <div className="p-1.5 bg-white border border-slate-200 rounded">
                      <span className="text-[9px] text-slate-400 block uppercase">Temp</span>
                      <strong className="text-slate-800">{data.vitalsAtReferral.temperature || 36.8}&deg;C</strong>
                    </div>
                    <div className="p-1.5 bg-white border border-slate-200 rounded">
                      <span className="text-[9px] text-slate-400 block uppercase">Resp</span>
                      <strong className="text-slate-800">{data.vitalsAtReferral.respiratoryRate || 18}</strong>
                    </div>
                    <div className="p-1.5 bg-white border border-slate-200 rounded">
                      <span className="text-[9px] text-slate-400 block uppercase">SpO2</span>
                      <strong className="text-slate-800">{data.vitalsAtReferral.spO2 || 98}%</strong>
                    </div>
                    <div className="p-1.5 bg-white border border-slate-200 rounded">
                      <span className="text-[9px] text-slate-400 block uppercase">Glucose</span>
                      <strong className="text-slate-800">{data.vitalsAtReferral.bloodGlucose || '5.4'}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Diagnosis & Clinical Summary */}
              <div className="space-y-2 border-b border-slate-200 pb-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Primary Working Diagnosis:</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{data.diagnosis}</p>
                  {data.secondaryDiagnoses && (
                    <p className="text-slate-600 text-xs mt-0.5">
                      <strong>Secondary:</strong> {data.secondaryDiagnoses}
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Clinical Summary & Inpatient Course:</span>
                  <p className="text-slate-800 leading-relaxed whitespace-pre-wrap mt-0.5">
                    {data.clinicalSummary}
                  </p>
                </div>
              </div>

              {/* 6. Treatments & Investigations */}
              <div className="grid grid-cols-2 gap-3 text-xs border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Treatments & Medications Given:
                  </span>
                  <p className="text-slate-800 leading-relaxed whitespace-pre-wrap font-mono text-[11px]">
                    {data.treatmentsGiven}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Diagnostic Labs & Scans Done:
                  </span>
                  {data.investigationsSummary && data.investigationsSummary.length > 0 ? (
                    <ul className="space-y-1 text-slate-700">
                      {data.investigationsSummary.map((inv: string, i: number) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-slate-400">•</span>
                          <span>{inv}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-400 italic">Routine vital parameter monitoring.</p>
                  )}
                </div>
              </div>

              {/* 7. Allergies & Precautions */}
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs flex justify-between items-center">
                <div>
                  <strong className="text-rose-900 uppercase text-[10px]">Known Allergies: </strong>
                  <span className="text-rose-800">
                    {data.knownAllergies && data.knownAllergies.length > 0
                      ? data.knownAllergies.join(', ')
                      : 'No Known Drug Allergies (NKDA)'}
                  </span>
                </div>
                {data.specialPrecautions && (
                  <div>
                    <strong className="text-rose-900 uppercase text-[10px]">Precautions: </strong>
                    <span className="text-rose-800">{data.specialPrecautions}</span>
                  </div>
                )}
              </div>

              {/* 8. Doctor Sign-off & Handover */}
              <div className="pt-4 flex justify-between items-end border-t border-slate-200">
                <div>
                  <div className="text-[10px] text-slate-500 mb-2">
                    Referring Physician Signature & Stamp:
                  </div>
                  <div className="w-52 h-10 border-b border-slate-400 mb-1" />
                  <div className="font-bold text-xs text-slate-900">Dr. {data.referringDoctorName}</div>
                  <div className="text-[10px] text-slate-500">{data.referringDoctorRole || 'Attending Physician'} &bull; {activeClinic.name}</div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-500 mb-2">
                    Receiving Facility Handover Sign-off:
                  </div>
                  <div className="w-52 h-10 border-b border-slate-400 mb-1" />
                  <div className="text-xs text-slate-700">Receiving Clinician Name / Designation</div>
                  <div className="text-[10px] text-slate-400">Date & Handover Time: __________________</div>
                </div>
              </div>
            </div>
          )}

          {/* 11. DEATH CERTIFICATE TEMPLATE */}
          {type === 'death_certificate' && (
            <div className="space-y-4 text-xs">
              {/* Formal Hospital Header Banner */}
              <div className="bg-slate-900 text-white p-4 rounded-lg flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold tracking-tight uppercase">{activeClinic.name}</h3>
                  <p className="text-[11px] text-slate-300">{activeClinic.address} &bull; Tel: {activeClinic.phone || '+256 414 000 000'}</p>
                  <p className="text-rose-400 font-bold text-xs uppercase mt-1 tracking-wider">
                    Medical Certificate of Cause of Death (MCCD)
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-slate-200">
                    CERT NO: {data.certificateNumber || 'DC-' + String(data.id || '').slice(-6).toUpperCase()}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Date of Death: {data.dateOfDeath || 'N/A'}
                  </div>
                  <div className="inline-block mt-1 px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800/60 rounded text-[9px] font-bold uppercase">
                    Official Legal Record
                  </div>
                </div>
              </div>

              {/* Confidentiality notice */}
              <div className="p-2 bg-slate-100 border border-slate-200 rounded text-center text-[10px] text-slate-600 font-semibold uppercase tracking-wider">
                Confidential Medical Record &bull; Issued Pursuant to Public Health & Registration Regulations
              </div>

              {/* 1. Particulars of Deceased */}
              <div className="border border-slate-200 rounded-md p-3">
                <div className="text-[11px] font-bold uppercase text-slate-700 border-b border-slate-200 pb-1.5 mb-2.5">
                  1. Particulars of the Deceased
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Full Name:</span>
                    <strong className="text-slate-900 font-semibold">{data.patientName}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">MRN / Hospital ID:</span>
                    <strong className="font-mono text-slate-900">{data.patientMrn}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Gender & Age:</span>
                    <span className="text-slate-800">{data.patientGender} &bull; {data.patientAge} Years</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Date of Birth:</span>
                    <span className="text-slate-800">{data.patientDob || 'Recorded in file'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Inpatient Ward / Bed:</span>
                    <span className="text-slate-800">{data.ward || 'Inpatient Service'}{data.bedNumber ? ` - ${data.bedNumber}` : ''}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Residential Address:</span>
                    <span className="text-slate-800">{data.patientAddress || 'Recorded in registry'}</span>
                  </div>
                </div>
              </div>

              {/* 2. Date, Time & Place of Death */}
              <div className="border border-slate-200 rounded-md p-3">
                <div className="text-[11px] font-bold uppercase text-slate-700 border-b border-slate-200 pb-1.5 mb-2.5">
                  2. Date, Time & Place of Death
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Date of Death:</span>
                    <strong className="text-rose-700 font-bold">{data.dateOfDeath}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Time of Death:</span>
                    <strong className="text-rose-700 font-bold">{data.timeOfDeath} hrs (Local Time)</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-500 block">Exact Place of Death:</span>
                    <span className="text-slate-800 font-medium">{data.placeOfDeath || `${activeClinic.name}`}</span>
                  </div>
                </div>
              </div>

              {/* 3. Medical Certification of Cause of Death (WHO Standard) */}
              <div className="border border-slate-200 rounded-md p-3 bg-slate-50/50">
                <div className="text-[11px] font-bold uppercase text-slate-700 border-b border-slate-200 pb-1.5 mb-2 flex justify-between items-center">
                  <span>3. Medical Cause of Death (WHO Standard MCCD)</span>
                  <span className="text-[9px] font-normal text-slate-500">Approx. Interval Onset to Death</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="p-2 bg-white border border-rose-200 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-rose-800">Part I (a) Immediate Cause:</span>
                        <div className="text-rose-900 font-bold text-xs mt-0.5">{data.immediateCause}</div>
                        <span className="text-[9px] text-slate-400 italic">Disease or condition directly leading to death</span>
                      </div>
                      <div className="text-right text-[11px] font-medium text-slate-600">
                        {data.immediateCauseInterval || '—'}
                      </div>
                    </div>
                  </div>

                  {data.antecedentCause && (
                    <div className="p-2 bg-white border border-slate-200 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-700">Part I (b) Antecedent Cause:</span>
                          <div className="text-slate-800 font-medium text-xs mt-0.5">{data.antecedentCause}</div>
                          <span className="text-[9px] text-slate-400 italic">Morbid conditions giving rise to immediate cause</span>
                        </div>
                        <div className="text-right text-[11px] font-medium text-slate-600">
                          {data.antecedentCauseInterval || '—'}
                        </div>
                      </div>
                    </div>
                  )}

                  {data.underlyingCause && (
                    <div className="p-2 bg-white border border-slate-200 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-700">Part I (c) Underlying Cause:</span>
                          <div className="text-slate-800 font-medium text-xs mt-0.5">{data.underlyingCause}</div>
                          <span className="text-[9px] text-slate-400 italic">Underlying condition that initiated train of events</span>
                        </div>
                        <div className="text-right text-[11px] font-medium text-slate-600">
                          {data.underlyingCauseInterval || '—'}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-2 bg-white border border-slate-200 rounded">
                    <span className="text-[10px] font-bold uppercase text-slate-700 block">Part II Other Significant Conditions:</span>
                    <p className="text-slate-800 text-xs mt-0.5">
                      {data.contributingConditions || 'None specified or documented.'}
                    </p>
                    <span className="text-[9px] text-slate-400 italic">Conditions contributing to death but not related to disease causing it</span>
                  </div>
                </div>
              </div>

              {/* 4. Manner of Death & Autopsy */}
              <div className="border border-slate-200 rounded-md p-3">
                <div className="text-[11px] font-bold uppercase text-slate-700 border-b border-slate-200 pb-1.5 mb-2.5">
                  4. Manner of Death & Autopsy Status
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Manner of Death:</span>
                    <strong className="text-slate-900 font-semibold capitalize">
                      {String(data.mannerOfDeath || 'natural').replace('_', ' ')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Autopsy / Post-Mortem:</span>
                    <span className="text-slate-800 capitalize">
                      {data.autopsyRequested === 'yes' ? 'Requested / Performed' : data.autopsyRequested === 'no' ? 'Not Requested' : 'Not Indicated'}
                    </span>
                  </div>
                  {data.pregnancyStatus && data.pregnancyStatus !== 'not_applicable' && (
                    <div>
                      <span className="text-[10px] text-slate-500 block">Pregnancy Status:</span>
                      <span className="text-slate-800 capitalize">{data.pregnancyStatus.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                  {data.clinicalSummary && (
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-500 block">Terminal Events / Resuscitation Summary:</span>
                      <p className="text-slate-700 text-xs mt-0.5 whitespace-pre-wrap">{data.clinicalSummary}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Informant & Body Release */}
              <div className="border border-slate-200 rounded-md p-3">
                <div className="text-[11px] font-bold uppercase text-slate-700 border-b border-slate-200 pb-1.5 mb-2.5">
                  5. Informant (Next of Kin) & Mortuary Disposition
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Informant (Next of Kin):</span>
                    <strong className="text-slate-900">{data.informantName || 'Family Member on file'}</strong>
                    <span className="text-slate-500 text-[10px] block">({data.informantRelationship || 'Next of Kin'} &bull; {data.informantPhone || 'N/A'})</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Body Released To:</span>
                    <strong className="text-slate-900 uppercase">{String(data.bodyReleasedTo || 'hospital_mortuary').replace(/_/g, ' ')}</strong>
                    <span className="text-slate-500 text-[10px] block">
                      {data.mortuaryName || 'Hospital Mortuary'} {data.mortuaryTagNumber ? `• Tag #${data.mortuaryTagNumber}` : ''}
                    </span>
                  </div>
                  {data.releasedByName && (
                    <div>
                      <span className="text-[10px] text-slate-500 block">Released By Staff:</span>
                      <span className="text-slate-800">{data.releasedByName} ({data.releasedAt || data.dateOfDeath})</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 6. Certifying Medical Doctor */}
              <div className="pt-4 border-t border-slate-200">
                <p className="text-[10px] text-slate-500 italic mb-4">
                  "I hereby certify that I attended the deceased named herein and that the cause of death stated above is true to the best of my knowledge, medical records, and clinical determination."
                </p>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[10px] text-slate-500 mb-2">
                      Certifying Medical Doctor Signature:
                    </div>
                    <div className="w-56 h-10 border-b border-slate-400 mb-1 flex items-end">
                      <span className="text-xs font-serif italic text-slate-700 pb-1">Dr. {data.certifyingDoctorName}</span>
                    </div>
                    <div className="font-bold text-xs text-slate-900">Dr. {data.certifyingDoctorName}</div>
                    <div className="text-[10px] text-slate-500">
                      {data.certifyingDoctorRole || 'Attending Physician'} &bull; Lic: {data.certifyingDoctorLicenseNumber || 'UMDPC-REG-ACTIVE'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Certified: {data.certifiedAt ? new Date(data.certifiedAt).toLocaleString() : data.dateOfDeath}
                    </div>
                  </div>

                  <div className="w-48 h-24 border-2 border-dashed border-slate-300 rounded flex flex-col items-center justify-center p-2 text-center text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Official Hospital Stamp</span>
                    <span className="text-[9px] mt-1 text-slate-400">ViperH.M.S Health System</span>
                    <span className="text-[8px] text-slate-400 font-mono">SEAL &bull; VERIFIED</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Document Footer */}
          <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-400">
            ViperH.M.S Health System &bull; System-generated electronic record &bull; Confidential
          </div>

        </div>

      </div>
    </div>
  );
};
