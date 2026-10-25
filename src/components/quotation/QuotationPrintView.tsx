import React from 'react';
import { formatCurrency } from '../../lib/utils';
import { Quotation, CompanySettings } from '../../types';

interface QuotationPrintViewProps {
  quotation: Quotation;
  settings: CompanySettings;
}

export default function QuotationPrintView({ quotation, settings }: QuotationPrintViewProps) {
  const selectedBank = settings.bankDetails?.find(b => b.id === quotation.bankId) || settings.bankDetails?.[0];
  
  // Consolidate terms cleanly: use quotation's specific terms if provided, else fallback to company default terms
  const termsToDisplay: string[] = (quotation.terms && quotation.terms.length > 0)
    ? quotation.terms
    : (settings.terms?.map(t => t.text) || []);

  return (
    <div data-print-root className="bg-white w-full text-[10pt] font-sans leading-tight flex flex-col p-8 max-w-[1024px] mx-auto box-border">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-hidden { display: none !important; }
        }
      `}} />
      
      {/* Header Table */}
      <table className="w-full border-collapse mb-6 border-b-2 border-primary pb-4">
        <tbody>
          <tr>
            <td className="align-top pb-4">
              <div className="flex gap-4 items-center">
                <div className="w-20 h-20 bg-white flex items-center justify-center text-white font-black text-2xl rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  {settings.logo ? (
                    <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-primary flex items-center justify-center text-white font-bold text-2xl">
                      {settings.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">{settings.name}</h1>
                  <p className="text-gray-500 text-[8pt] whitespace-pre-line max-w-[280px]">{settings.address}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {settings.phones?.map((p, i) => (
                      <p key={i} className="text-gray-500 text-[8pt] font-bold">Tel: <span className="font-normal">{p}</span></p>
                    ))}
                    {settings.email && <p className="text-gray-500 text-[8pt] font-bold">Email: <span className="font-normal">{settings.email}</span></p>}
                  </div>
                  {settings.website && <p className="text-primary text-[8pt] font-bold mt-0.5">{settings.website}</p>}
                  {settings.taxId && <p className="text-gray-900 text-[8pt] font-black uppercase mt-1">TAX ID: {settings.taxId}</p>}
                </div>
              </div>
            </td>
            <td className="align-top text-right pb-4">
              <h2 className="text-4xl font-black text-primary/15 uppercase tracking-[0.08em] mb-2 leading-none">QUOTATION</h2>
              <div className="space-y-1 text-[9pt]">
                <p className="text-gray-500 font-bold uppercase tracking-wider">Quote Number: <span className="text-gray-900 font-mono font-bold ml-2">{quotation.quoteNumber}</span></p>
                <p className="text-gray-500 font-bold uppercase tracking-wider">Quote Date: <span className="text-gray-900 font-medium ml-2">{quotation.date}</span></p>
                <p className="text-gray-500 font-bold uppercase tracking-wider">Valid Thru: <span className="text-gray-900 font-medium ml-2">{new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span></p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Client and Bank Info Table */}
      <table className="w-full border-collapse mb-6">
        <tbody>
          <tr>
            <td className="w-1/2 pr-3 align-top">
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 h-full">
                <h3 className="text-[7.5pt] font-black text-primary uppercase tracking-widest mb-1.5 border-b border-gray-200 pb-1">Quoted To:</h3>
                <div className="space-y-1">
                  <p className="font-black text-gray-900 text-[10.5pt]">{quotation.clientName}</p>
                  <p className="text-gray-600 text-[8pt]">Client ID: <span className="font-mono font-bold">{quotation.clientId}</span></p>
                  <p className="text-gray-400 text-[7pt] italic">Customer record connected</p>
                </div>
              </div>
            </td>
            <td className="w-1/2 pl-3 align-top">
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 h-full">
                <h3 className="text-[7.5pt] font-black text-primary uppercase tracking-widest mb-1.5 border-b border-gray-200 pb-1">Payment & Remittance:</h3>
                <div className="space-y-0.5 text-[8pt]">
                  {selectedBank ? (
                    <>
                      <p className="text-gray-700 font-bold">Bank: <span className="font-normal text-gray-900">{selectedBank.bankName}</span></p>
                      <p className="text-gray-700 font-bold">Account No: <span className="font-mono font-bold text-gray-900">{selectedBank.accountNumber}</span></p>
                      <p className="text-gray-700 font-bold">Branch: <span className="font-normal text-gray-900">{selectedBank.branch}</span></p>
                      {selectedBank.accountHolder && <p className="text-gray-700 font-bold">Holder: <span className="font-normal text-gray-900">{selectedBank.accountHolder}</span></p>}
                    </>
                  ) : (
                    <p className="text-gray-400 italic">Direct cash or bank transfer accepted upon approval</p>
                  )}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Items Table */}
      <div className="mb-6">
        <table className="w-full border-collapse text-[9pt]">
          <thead>
            <tr className="bg-gray-900 text-white">
              <th className="px-3.5 py-2 text-left font-bold uppercase tracking-wider rounded-tl-lg">Description</th>
              <th className="px-3.5 py-2 text-center font-bold uppercase tracking-wider w-20">Qty</th>
              <th className="px-3.5 py-2 text-right font-bold uppercase tracking-wider w-32">Unit Price</th>
              <th className="px-3.5 py-2 text-right font-bold uppercase tracking-wider w-32 rounded-tr-lg">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 border-x border-b border-gray-100 rounded-b-lg overflow-hidden">
            {quotation.items.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-colors break-inside-avoid">
                <td className="px-3.5 py-2.5">
                  <p className="font-bold text-gray-900">{item.name}</p>
                  {item.category && <p className="text-[7pt] text-gray-400 uppercase font-semibold">{item.category}</p>}
                </td>
                <td className="px-3.5 py-2.5 text-center font-medium text-gray-700">{item.quantity}</td>
                <td className="px-3.5 py-2.5 text-right text-gray-600 font-mono">{formatCurrency(item.price)}</td>
                <td className="px-3.5 py-2.5 text-right font-bold text-gray-900 font-mono">{formatCurrency(item.price * item.quantity)}</td>
              </tr>
            ))}
            {/* Fill minimum rows if quotation has very few items */}
            {Array.from({ length: Math.max(0, 3 - quotation.items.length) }).map((_, i) => (
              <tr key={`empty-${i}`} className="h-7">
                <td className="px-3.5 py-1.5"></td>
                <td className="px-3.5 py-1.5"></td>
                <td className="px-3.5 py-1.5"></td>
                <td className="px-3.5 py-1.5"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Financials & Payment Notes Table */}
      <table className="w-full border-collapse mb-4">
        <tbody>
          <tr>
            {/* Left Note / Instructions */}
            <td className="w-1/2 pr-4 align-top">
              <div className="bg-gray-50/60 rounded-xl p-4 border border-gray-100 h-full flex flex-col justify-between">
                <div className="space-y-2">
                  <h4 className="text-[8pt] font-black uppercase text-gray-500 tracking-wider">Payment Instructions</h4>
                  <p className="text-[8pt] text-gray-600 leading-relaxed">
                    Please reference quote number <span className="font-mono font-bold text-gray-900">{quotation.quoteNumber}</span> when making payments. Quotation is valid for 30 days from date of issue.
                  </p>
                </div>
                <div className="pt-4 mt-2 border-t border-gray-200/60 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20 text-primary font-black text-[9pt]">
                    PAY
                  </div>
                  <div>
                    <p className="text-[8pt] font-bold text-gray-900 uppercase">Verified Business Quote</p>
                    <p className="text-[7pt] text-gray-500">Fast digital processing & receipt generation</p>
                  </div>
                </div>
              </div>
            </td>

            {/* Right Totals Card */}
            <td className="w-1/2 pl-4 align-top">
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-2.5">
                <div className="flex justify-between text-[9pt] text-gray-500">
                  <span className="font-bold uppercase tracking-wider">Subtotal</span>
                  <span className="font-mono text-gray-800">{formatCurrency(quotation.subtotal)}</span>
                </div>
                {quotation.discount > 0 && (
                  <div className="flex justify-between text-[9pt] text-red-500">
                    <span className="font-bold uppercase tracking-wider">Discount {quotation.discountRate > 0 ? `(${quotation.discountRate}%)` : ''}</span>
                    <span className="font-mono">-{formatCurrency(quotation.discount)}</span>
                  </div>
                )}
                {quotation.tax > 0 && (
                  <div className="flex justify-between text-[9pt] text-gray-500">
                    <span className="font-bold uppercase tracking-wider">Tax ({quotation.taxRate}%)</span>
                    <span className="font-mono text-gray-800">{formatCurrency(quotation.tax)}</span>
                  </div>
                )}
                {quotation.freight > 0 && (
                  <div className="flex justify-between text-[9pt] text-gray-500">
                    <span className="font-bold uppercase tracking-wider">Freight / Shipping</span>
                    <span className="font-mono text-gray-800">{formatCurrency(quotation.freight)}</span>
                  </div>
                )}
                {quotation.otherChargesList && quotation.otherChargesList.length > 0 ? (
                  quotation.otherChargesList.map((charge, i) => (
                    <div key={i} className="flex justify-between text-[9pt] text-gray-500">
                      <span className="font-bold uppercase tracking-wider">{charge.description || 'Other Charge'}</span>
                      <span className="font-mono text-gray-800">{formatCurrency(charge.amount)}</span>
                    </div>
                  ))
                ) : (
                  quotation.otherCharges > 0 && (
                    <div className="flex justify-between text-[9pt] text-gray-500">
                      <span className="font-bold uppercase tracking-wider">Other Charges</span>
                      <span className="font-mono text-gray-800">{formatCurrency(quotation.otherCharges)}</span>
                    </div>
                  )
                )}
                <div className="flex justify-between items-center pt-3 border-t-2 border-primary">
                  <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Grand Total</span>
                  <span className="text-xl font-black text-primary font-mono">{formatCurrency(quotation.total)}</span>
                </div>
                <p className="text-[7.5pt] text-gray-400 text-right italic pt-1">All amounts stated in {settings.currency}</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Terms and Conditions Section - Well-proportioned, clean layout fitting any length */}
      {termsToDisplay.length > 0 && (
        <div className="mb-6 bg-pink-50/30 rounded-xl p-3.5 border border-pink-200/50 break-inside-avoid">
          <h4 className="text-[7.5pt] font-black uppercase text-primary mb-1.5 tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
            Terms & Conditions
          </h4>
          <div className="space-y-1.5 text-[7.5pt] text-gray-700 leading-normal">
            {termsToDisplay.map((term, i) => (
              <div key={i} className="flex items-start gap-2 break-words">
                <span className="font-bold text-primary/70 shrink-0">{i + 1}.</span>
                <span className="flex-1">{term}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Footer */}
      <table className="w-full border-collapse mt-auto pt-6 border-t border-gray-100">
        <tbody>
          <tr>
            <td className="align-bottom">
              <div className="space-y-2">
                <p className="font-mono text-[7.5pt] uppercase tracking-[0.3em] text-gray-400">{quotation.quoteNumber}</p>
                <p className="text-[7pt] text-gray-400 font-medium italic">This is an official quotation generated by {settings.name}.</p>
              </div>
            </td>
            <td className="align-bottom text-right">
              <div className="w-48 border-t-2 border-gray-900 pt-1.5 ml-auto">
                <p className="text-[8pt] font-black text-gray-900 uppercase tracking-widest">Authorized Signature</p>
                <p className="text-[7pt] text-gray-500 uppercase">{settings.name}</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
