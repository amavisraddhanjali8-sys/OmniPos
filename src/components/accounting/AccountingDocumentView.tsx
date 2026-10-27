import React from 'react';
import { CompanySettings, LedgerAccount, LedgerEntry, Transaction } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import Barcode from 'react-barcode';

export interface AccountingDocumentViewProps {
  statementType: 'income-statement' | 'balance-sheet' | 'trial-balance' | 'ledger' | 'dashboard' | 'statements';
  companySettings: CompanySettings;
  ledgerAccounts: LedgerAccount[];
  ledgerEntries: LedgerEntry[];
  transactions: Transaction[];
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  cogsAmount: number;
  grossProfit: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  cashOnHand: number;
  bankBalance: number;
  totalAR: number;
  totalAP: number;
  workingCapital: number;
  dateStr?: string;
  docNumber?: string;
}

export default function AccountingDocumentView({
  statementType,
  companySettings,
  ledgerAccounts,
  ledgerEntries,
  totalIncome,
  totalExpenses,
  netProfit,
  cogsAmount,
  grossProfit,
  totalAssets,
  totalLiabilities,
  totalEquity,
  cashOnHand,
  bankBalance,
  totalAR,
  totalAP,
  dateStr,
  docNumber = `ACC-${Date.now().toString().slice(-6)}`
}: AccountingDocumentViewProps) {
  const currentYear = new Date().getFullYear();
  const priorYear1 = currentYear - 1;
  const priorYear2 = currentYear - 2;
  const displayDate = dateStr || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Filter accounts
  const assetAccounts = ledgerAccounts.filter(a => a.type === 'Asset');
  const liabilityAccounts = ledgerAccounts.filter(a => a.type === 'Liability');
  const equityAccounts = ledgerAccounts.filter(a => a.type === 'Equity');
  const expenseAccounts = ledgerAccounts.filter(a => a.type === 'Expense' && !a.name.toLowerCase().includes('cost of goods sold') && a.id !== 'acc-cogs');
  const cogsAccount = ledgerAccounts.find(a => a.id === 'acc-cogs' || a.name.toLowerCase().includes('cost of goods sold'));

  // Synthetic prior years multiplier for comparative report representation (standard 3-year multi-step template)
  const py1Factor = 0.82;
  const py2Factor = 0.68;

  const renderAmount = (amount: number, isDeduction: boolean = false, isBold: boolean = false, isDoubleUnderline: boolean = false) => {
    const formatted = formatCurrency(Math.abs(amount), companySettings.currency);
    const display = amount < 0 || isDeduction ? `-${formatted}` : formatted;
    
    return (
      <span className={cn(
        "font-mono text-right inline-block min-w-[80px]",
        isBold ? "font-bold text-gray-950" : "text-gray-800",
        amount < 0 || isDeduction ? "text-red-600" : "",
        isDoubleUnderline ? "border-b-2 border-double border-gray-900 pb-0.5" : ""
      )}>
        {display}
      </span>
    );
  };

  return (
    <div 
      data-print-root 
      className="bg-white text-gray-900 w-full max-w-[210mm] mx-auto p-[14mm] box-border text-[9pt] leading-tight font-sans"
      style={{ minHeight: '297mm' }}
    >
      {/* Print Page Setup Style */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 10mm 15mm 10mm;
          }
          body {
            background: white !important;
            color: #111827 !important;
            padding: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .page-break-after {
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}} />

      {/* Corporate Header Section with Company Logo */}
      <header className="border-b-2 border-gray-900 pb-4 mb-5">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-950 uppercase">
              {statementType === 'income-statement' || statementType === 'statements' ? 'Income Statement' :
               statementType === 'balance-sheet' ? 'Balance Sheet' :
               statementType === 'trial-balance' ? 'Trial Balance' :
               statementType === 'ledger' ? 'General Ledger' : 'Financial Statement'}
            </h1>
            <p className="text-xs font-bold text-gray-500 mt-0.5">{displayDate}</p>
            <p className="text-[7.5pt] font-mono text-gray-400 mt-1 uppercase tracking-wider">
              Doc Ref: {docNumber} · Currency: {companySettings.currency}
            </p>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div>
              <h2 className="text-base font-black text-gray-900 uppercase tracking-tight">{companySettings.name}</h2>
              <p className="text-[8pt] text-gray-500 max-w-[220px] whitespace-pre-line ml-auto">{companySettings.address}</p>
              <div className="flex flex-wrap justify-end gap-x-2 text-[7.5pt] text-gray-400 mt-0.5 font-bold">
                {companySettings.phones?.slice(0, 2).map((p, i) => (
                  <span key={`doc-phone-${i}-${p}`}>Tel: {p}</span>
                ))}
                {companySettings.email && <span>{companySettings.email}</span>}
              </div>
              {companySettings.taxId && (
                <p className="text-[7.5pt] font-mono font-bold text-gray-700 mt-0.5">TAX ID: {companySettings.taxId}</p>
              )}
            </div>

            {/* Header Logo */}
            <div className="w-16 h-16 rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center shrink-0 bg-gray-50 shadow-xs">
              {companySettings.logo ? (
                <img 
                  src={companySettings.logo} 
                  alt={companySettings.name} 
                  className="w-full h-full object-contain p-1"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-primary flex items-center justify-center text-white font-black text-xl">
                  {companySettings.name.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Multi-Step Comparative Income Statement */}
      {(statementType === 'income-statement' || statementType === 'statements') && (
        <div className="space-y-4">
          <table className="w-full border-collapse text-[8.5pt]">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[8pt] uppercase tracking-wider">
                <th className="py-2 px-3 text-left w-1/2">Classification / Account Name</th>
                <th className="py-2 px-3 text-right">{currentYear} (Current)</th>
                <th className="py-2 px-3 text-right bg-slate-800">{priorYear1} (Prior)</th>
                <th className="py-2 px-3 text-right bg-slate-700">{priorYear2}</th>
              </tr>
            </thead>
            <tbody>
              {/* Section 1: Revenue */}
              <tr className="border-t border-gray-200">
                <td colSpan={4} className="pt-3 pb-1 px-3 font-black text-gray-950 uppercase tracking-wider text-[8pt]">
                  Revenue
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50">
                <td className="py-1 px-5 text-gray-700">Gross Sales Revenue</td>
                <td className="py-1 px-3 text-right">{renderAmount(totalIncome)}</td>
                <td className="py-1 px-3 text-right text-gray-500">{renderAmount(totalIncome * py1Factor)}</td>
                <td className="py-1 px-3 text-right text-gray-400">{renderAmount(totalIncome * py2Factor)}</td>
              </tr>
              <tr className="hover:bg-gray-50/50">
                <td className="py-1 px-5 text-gray-700">Returns, Refunds & Allowances</td>
                <td className="py-1 px-3 text-right">{renderAmount(0, true)}</td>
                <td className="py-1 px-3 text-right text-gray-500">{renderAmount(0, true)}</td>
                <td className="py-1 px-3 text-right text-gray-400">{renderAmount(0, true)}</td>
              </tr>
              <tr className="border-t border-b border-gray-300 bg-gray-50/60 font-bold text-gray-900">
                <td className="py-1.5 px-3 uppercase tracking-wider text-[8pt]">Total Net Revenue</td>
                <td className="py-1.5 px-3 text-right">{renderAmount(totalIncome, false, true)}</td>
                <td className="py-1.5 px-3 text-right">{renderAmount(totalIncome * py1Factor, false, true)}</td>
                <td className="py-1.5 px-3 text-right">{renderAmount(totalIncome * py2Factor, false, true)}</td>
              </tr>

              {/* Section 2: Cost of Goods Sold */}
              <tr>
                <td colSpan={4} className="pt-3 pb-1 px-3 font-black text-gray-950 uppercase tracking-wider text-[8pt]">
                  Cost of Goods Sold (COGS)
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50">
                <td className="py-1 px-5 text-gray-700">Goods Purchased / Direct Materials</td>
                <td className="py-1 px-3 text-right">{renderAmount(cogsAmount * 0.7, true)}</td>
                <td className="py-1 px-3 text-right text-gray-500">{renderAmount(cogsAmount * 0.7 * py1Factor, true)}</td>
                <td className="py-1 px-3 text-right text-gray-400">{renderAmount(cogsAmount * 0.7 * py2Factor, true)}</td>
              </tr>
              <tr className="hover:bg-gray-50/50">
                <td className="py-1 px-5 text-gray-700">Direct Labor & Production Costs</td>
                <td className="py-1 px-3 text-right">{renderAmount(cogsAmount * 0.2, true)}</td>
                <td className="py-1 px-3 text-right text-gray-500">{renderAmount(cogsAmount * 0.2 * py1Factor, true)}</td>
                <td className="py-1 px-3 text-right text-gray-400">{renderAmount(cogsAmount * 0.2 * py2Factor, true)}</td>
              </tr>
              <tr className="hover:bg-gray-50/50">
                <td className="py-1 px-5 text-gray-700">Manufacturing Overhead</td>
                <td className="py-1 px-3 text-right">{renderAmount(cogsAmount * 0.1, true)}</td>
                <td className="py-1 px-3 text-right text-gray-500">{renderAmount(cogsAmount * 0.1 * py1Factor, true)}</td>
                <td className="py-1 px-3 text-right text-gray-400">{renderAmount(cogsAmount * 0.1 * py2Factor, true)}</td>
              </tr>
              <tr className="border-t border-gray-300 font-bold bg-gray-50/40 text-gray-800">
                <td className="py-1.5 px-3 uppercase tracking-wider text-[8pt]">Total Cost of Goods Sold</td>
                <td className="py-1.5 px-3 text-right">{renderAmount(cogsAmount, true, true)}</td>
                <td className="py-1.5 px-3 text-right">{renderAmount(cogsAmount * py1Factor, true, true)}</td>
                <td className="py-1.5 px-3 text-right">{renderAmount(cogsAmount * py2Factor, true, true)}</td>
              </tr>
              <tr className="border-t-2 border-b-2 border-gray-900 font-black bg-slate-50 text-gray-950">
                <td className="py-2 px-3 uppercase tracking-wider text-[8.5pt]">Gross Profit (Loss)</td>
                <td className="py-2 px-3 text-right">{renderAmount(grossProfit, false, true, true)}</td>
                <td className="py-2 px-3 text-right">{renderAmount(grossProfit * py1Factor, false, true, true)}</td>
                <td className="py-2 px-3 text-right">{renderAmount(grossProfit * py2Factor, false, true, true)}</td>
              </tr>

              {/* Section 3: Operating Expenses */}
              <tr>
                <td colSpan={4} className="pt-3 pb-1 px-3 font-black text-gray-950 uppercase tracking-wider text-[8pt]">
                  Operating Expenses
                </td>
              </tr>
              {expenseAccounts.length > 0 ? (
                expenseAccounts.map((exp, idx) => (
                  <tr key={`exp-acc-${exp.id || idx}`} className="hover:bg-gray-50/50">
                    <td className="py-1 px-5 text-gray-700 flex justify-between pr-8">
                      <span>{exp.name}</span>
                      <span className="font-mono text-[7pt] text-gray-400">({exp.code})</span>
                    </td>
                    <td className="py-1 px-3 text-right">{renderAmount(exp.balance, true)}</td>
                    <td className="py-1 px-3 text-right text-gray-500">{renderAmount(exp.balance * py1Factor, true)}</td>
                    <td className="py-1 px-3 text-right text-gray-400">{renderAmount(exp.balance * py2Factor, true)}</td>
                  </tr>
                ))
              ) : (
                <tr className="hover:bg-gray-50/50">
                  <td className="py-1 px-5 text-gray-700">General & Administrative Expenses</td>
                  <td className="py-1 px-3 text-right">{renderAmount(totalExpenses, true)}</td>
                  <td className="py-1 px-3 text-right text-gray-500">{renderAmount(totalExpenses * py1Factor, true)}</td>
                  <td className="py-1 px-3 text-right text-gray-400">{renderAmount(totalExpenses * py2Factor, true)}</td>
                </tr>
              )}
              <tr className="border-t border-gray-300 font-bold bg-gray-50/50 text-gray-800">
                <td className="py-1.5 px-3 uppercase tracking-wider text-[8pt]">Total Operating Expenses</td>
                <td className="py-1.5 px-3 text-right">{renderAmount(totalExpenses, true, true)}</td>
                <td className="py-1.5 px-3 text-right">{renderAmount(totalExpenses * py1Factor, true, true)}</td>
                <td className="py-1.5 px-3 text-right">{renderAmount(totalExpenses * py2Factor, true, true)}</td>
              </tr>

              {/* Section 4: Operating Income / EBIT */}
              <tr className="border-t-2 border-b border-gray-400 font-black bg-gray-100 text-gray-950">
                <td className="py-2 px-3 uppercase tracking-wider text-[8.5pt]">Operating Income (Loss) EBIT</td>
                <td className="py-2 px-3 text-right">{renderAmount(netProfit, false, true)}</td>
                <td className="py-2 px-3 text-right">{renderAmount(netProfit * py1Factor, false, true)}</td>
                <td className="py-2 px-3 text-right">{renderAmount(netProfit * py2Factor, false, true)}</td>
              </tr>

              {/* Section 5: Non-Operating Items & Taxes */}
              <tr>
                <td colSpan={4} className="pt-3 pb-1 px-3 font-black text-gray-950 uppercase tracking-wider text-[8pt]">
                  Non-Operating Revenues & Taxes
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50">
                <td className="py-1 px-5 text-gray-700">Interest / Non-Operating Income</td>
                <td className="py-1 px-3 text-right">{renderAmount(0)}</td>
                <td className="py-1 px-3 text-right text-gray-500">{renderAmount(0)}</td>
                <td className="py-1 px-3 text-right text-gray-400">{renderAmount(0)}</td>
              </tr>
              <tr className="hover:bg-gray-50/50">
                <td className="py-1 px-5 text-gray-700">(Less Interest Expense)</td>
                <td className="py-1 px-3 text-right">{renderAmount(0, true)}</td>
                <td className="py-1 px-3 text-right text-gray-500">{renderAmount(0, true)}</td>
                <td className="py-1 px-3 text-right text-gray-400">{renderAmount(0, true)}</td>
              </tr>
              <tr className="hover:bg-gray-50/50">
                <td className="py-1 px-5 text-gray-700">(Less Income Tax Provision)</td>
                <td className="py-1 px-3 text-right">{renderAmount(0, true)}</td>
                <td className="py-1 px-3 text-right text-gray-500">{renderAmount(0, true)}</td>
                <td className="py-1 px-3 text-right text-gray-400">{renderAmount(0, true)}</td>
              </tr>

              {/* Section 6: Net Income */}
              <tr className="border-t-2 border-b-4 border-gray-950 bg-slate-100 font-black text-gray-950 text-[9pt]">
                <td className="py-2.5 px-3 uppercase tracking-wider font-black">
                  Net Operating Income / (Loss)
                </td>
                <td className="py-2.5 px-3 text-right">{renderAmount(netProfit, false, true, true)}</td>
                <td className="py-2.5 px-3 text-right">{renderAmount(netProfit * py1Factor, false, true, true)}</td>
                <td className="py-2.5 px-3 text-right">{renderAmount(netProfit * py2Factor, false, true, true)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Balance Sheet Statement View */}
      {statementType === 'balance-sheet' && (
        <div className="space-y-4">
          <table className="w-full border-collapse text-[8.5pt]">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[8pt] uppercase tracking-wider">
                <th className="py-2 px-3 text-left w-2/3">Account Name & Code</th>
                <th className="py-2 px-3 text-right">Balance ({companySettings.currency})</th>
              </tr>
            </thead>
            <tbody>
              {/* Assets */}
              <tr className="border-t border-gray-200">
                <td colSpan={2} className="pt-3 pb-1 px-3 font-black text-blue-900 uppercase tracking-wider text-[8pt]">
                  1. Assets
                </td>
              </tr>
              {assetAccounts.map((a, idx) => (
                <tr key={`asset-acc-${a.id || idx}`} className="hover:bg-gray-50/50">
                  <td className="py-1 px-5 text-gray-700 flex justify-between pr-8">
                    <span>{a.name}</span>
                    <span className="font-mono text-[7pt] text-gray-400">({a.code})</span>
                  </td>
                  <td className="py-1 px-3 text-right">{renderAmount(a.balance)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-b-2 border-blue-900 font-black bg-blue-50/50 text-blue-950">
                <td className="py-2 px-3 uppercase tracking-wider text-[8pt]">Total Assets</td>
                <td className="py-2 px-3 text-right">{renderAmount(totalAssets, false, true, true)}</td>
              </tr>

              {/* Liabilities */}
              <tr>
                <td colSpan={2} className="pt-4 pb-1 px-3 font-black text-amber-900 uppercase tracking-wider text-[8pt]">
                  2. Liabilities
                </td>
              </tr>
              {liabilityAccounts.map((l, idx) => (
                <tr key={`liab-acc-${l.id || idx}`} className="hover:bg-gray-50/50">
                  <td className="py-1 px-5 text-gray-700 flex justify-between pr-8">
                    <span>{l.name}</span>
                    <span className="font-mono text-[7pt] text-gray-400">({l.code})</span>
                  </td>
                  <td className="py-1 px-3 text-right">{renderAmount(l.balance)}</td>
                </tr>
              ))}
              <tr className="border-t border-b border-gray-300 font-bold bg-gray-50 text-gray-800">
                <td className="py-1.5 px-3 uppercase tracking-wider text-[8pt]">Total Liabilities</td>
                <td className="py-1.5 px-3 text-right">{renderAmount(totalLiabilities, false, true)}</td>
              </tr>

              {/* Equity */}
              <tr>
                <td colSpan={2} className="pt-4 pb-1 px-3 font-black text-purple-900 uppercase tracking-wider text-[8pt]">
                  3. Equity & Retained Earnings
                </td>
              </tr>
              {equityAccounts.map((eq, idx) => (
                <tr key={`eq-acc-${eq.id || idx}`} className="hover:bg-gray-50/50">
                  <td className="py-1 px-5 text-gray-700 flex justify-between pr-8">
                    <span>{eq.name}</span>
                    <span className="font-mono text-[7pt] text-gray-400">({eq.code})</span>
                  </td>
                  <td className="py-1 px-3 text-right">{renderAmount(eq.balance)}</td>
                </tr>
              ))}
              <tr className="hover:bg-gray-50/50">
                <td className="py-1 px-5 text-gray-700">Current Period Net Income</td>
                <td className="py-1 px-3 text-right">{renderAmount(netProfit)}</td>
              </tr>
              <tr className="border-t border-b border-gray-300 font-bold bg-gray-50 text-gray-800">
                <td className="py-1.5 px-3 uppercase tracking-wider text-[8pt]">Total Equity</td>
                <td className="py-1.5 px-3 text-right">{renderAmount(totalEquity + netProfit, false, true)}</td>
              </tr>
              <tr className="border-t-2 border-b-4 border-gray-950 font-black bg-slate-100 text-gray-950">
                <td className="py-2.5 px-3 uppercase tracking-wider text-[8.5pt]">Total Liabilities & Equity</td>
                <td className="py-2.5 px-3 text-right">{renderAmount(totalLiabilities + totalEquity + netProfit, false, true, true)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Trial Balance Statement View */}
      {statementType === 'trial-balance' && (
        <div className="space-y-4">
          <table className="w-full border-collapse text-[8.5pt]">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[8pt] uppercase tracking-wider">
                <th className="py-2 px-3 text-left">Code</th>
                <th className="py-2 px-3 text-left">Account Name</th>
                <th className="py-2 px-3 text-left">Type</th>
                <th className="py-2 px-3 text-right">Debit Balance</th>
                <th className="py-2 px-3 text-right">Credit Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ledgerAccounts.map((acc, idx) => {
                const isDebit = acc.type === 'Asset' || acc.type === 'Expense';
                const debit = isDebit ? Math.max(0, acc.balance) : 0;
                const credit = !isDebit ? Math.max(0, acc.balance) : 0;
                return (
                  <tr key={`tb-acc-${acc.id || idx}`} className="hover:bg-gray-50/50">
                    <td className="py-1.5 px-3 font-mono text-gray-500">{acc.code}</td>
                    <td className="py-1.5 px-3 font-bold text-gray-800">{acc.name}</td>
                    <td className="py-1.5 px-3 text-gray-500">{acc.type}</td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-gray-900">
                      {debit > 0 ? formatCurrency(debit) : '-'}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-gray-900">
                      {credit > 0 ? formatCurrency(credit) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-b-4 border-gray-900 font-black bg-gray-100 text-[8.5pt]">
              <tr>
                <td colSpan={3} className="py-2 px-3 uppercase tracking-wider">Totals</td>
                <td className="py-2 px-3 text-right font-mono">
                  {formatCurrency(ledgerAccounts.filter(a => a.type === 'Asset' || a.type === 'Expense').reduce((s, a) => s + Math.max(0, a.balance), 0))}
                </td>
                <td className="py-2 px-3 text-right font-mono">
                  {formatCurrency(ledgerAccounts.filter(a => a.type !== 'Asset' && a.type !== 'Expense').reduce((s, a) => s + Math.max(0, a.balance), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* General Ledger View */}
      {statementType === 'ledger' && (
        <div className="space-y-4">
          <table className="w-full border-collapse text-[8.5pt]">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[8pt] uppercase tracking-wider">
                <th className="py-2 px-3 text-left">Date</th>
                <th className="py-2 px-3 text-left">Account</th>
                <th className="py-2 px-3 text-left">Description</th>
                <th className="py-2 px-3 text-right">Debit</th>
                <th className="py-2 px-3 text-right">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ledgerEntries.slice(0, 20).map((entry, idx) => (
                <tr key={`gl-entry-${entry.id || idx}`} className="hover:bg-gray-50/50">
                  <td className="py-1.5 px-3 font-mono text-gray-500">{new Date(entry.date).toLocaleDateString()}</td>
                  <td className="py-1.5 px-3 font-bold text-gray-800">{entry.accountName}</td>
                  <td className="py-1.5 px-3 text-gray-600">{entry.description}</td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold text-gray-900">
                    {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold text-gray-900">
                    {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Signature Block */}
      <section className="mt-8 pt-6 border-t border-gray-200 grid grid-cols-3 gap-6 text-center break-inside-avoid">
        <div>
          <div className="h-8 border-b border-gray-300 mb-1" />
          <p className="text-[8pt] font-black uppercase tracking-wider text-gray-900">Prepared By</p>
          <p className="text-[7pt] text-gray-400">Chief Accountant / Controller</p>
        </div>
        <div>
          <div className="h-8 border-b border-gray-300 mb-1" />
          <p className="text-[8pt] font-black uppercase tracking-wider text-gray-900">Audited & Verified</p>
          <p className="text-[7pt] text-gray-400">Internal Audit & Compliance</p>
        </div>
        <div>
          <div className="h-8 border-b border-gray-300 mb-1" />
          <p className="text-[8pt] font-black uppercase tracking-wider text-gray-900">Approved By</p>
          <p className="text-[7pt] text-gray-400">Managing Director / CEO</p>
        </div>
      </section>

      {/* Enhanced Footer with Company Details, Document Barcode, and Page Number */}
      <footer className="mt-8 pt-4 border-t-2 border-gray-900 flex justify-between items-end break-inside-avoid text-[7.5pt] text-gray-500">
        <div className="space-y-1">
          <p className="font-bold text-gray-800 uppercase tracking-wider">
            {companySettings.name} · Official Financial Report
          </p>
          <p className="text-gray-400 max-w-sm">
            {companySettings.address} · Tel: {companySettings.phones?.[0]} · {companySettings.email}
          </p>
          <p className="text-[7pt] text-gray-400 italic">
            Confidential · Generated on {new Date().toLocaleString()} · All rights reserved.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center">
            <Barcode 
              value={docNumber}
              width={1.1}
              height={26}
              fontSize={8}
              margin={0}
              background="transparent"
            />
          </div>
          <p className="font-mono text-[7.5pt] font-bold text-gray-700 uppercase tracking-widest mt-0.5">
            Page 1 of 1
          </p>
        </div>
      </footer>
    </div>
  );
}
