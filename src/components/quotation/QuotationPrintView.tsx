import React from 'react';
import { formatCurrency, cn } from '../../lib/utils';
import { Quotation, CompanySettings } from '../../types';
import Barcode from 'react-barcode';

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

  const validUntilDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();

  return (
    <div 
      data-print-root 
      className="bg-white w-full max-w-[210mm] mx-auto text-[8.5pt] font-sans leading-tight flex flex-col p-[12mm] box-border text-gray-900"
      style={{ minHeight: '297mm' }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 8mm 10mm 12mm 10mm;
          }
          body { 
            background: white !important; 
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }
          .print-hidden { display: none !important; }
        }
      `}} />
      
      {/* Corporate Header */}
      <div className="border-b-2 border-primary pb-4 mb-5 flex justify-between items-start gap-4">
        <div className="flex gap-4 items-start">
          <div className="w-16 h-16 bg-white flex items-center justify-center text-white font-black text-xl rounded-xl shadow-sm border border-gray-100 overflow-hidden shrink-0">
            {settings.logo ? (
              <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full bg-primary flex items-center justify-center text-white font-bold text-xl">
                {settings.name.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900 uppercase tracking-tight">{settings.name}</h1>
            <p className="text-gray-500 text-[7.5pt] whitespace-pre-line max-w-[320px] leading-relaxed">{settings.address}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[7.5pt]">
              {settings.phones?.map((p, i) => (
                <span key={`quo-phone-${i}-${p}`} className="text-gray-500 font-bold">Tel: <span className="font-normal text-gray-700">{p}</span></span>
              ))}
              {settings.email && <span className="text-gray-500 font-bold">Email: <span className="font-normal text-gray-700">{settings.email}</span></span>}
            </div>
            {settings.website && <p className="text-primary text-[7.5pt] font-bold mt-0.5">{settings.website}</p>}
            {settings.taxId && <p className="text-gray-900 text-[7.5pt] font-black uppercase mt-0.5">TAX ID: <span className="font-mono text-primary">{settings.taxId}</span></p>}
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-md text-[8pt] font-black uppercase tracking-wider mb-2">
            OFFICIAL QUOTATION
          </div>
          <div className="space-y-0.5 text-[8pt]">
            <p className="text-gray-500 font-bold uppercase tracking-wider">Quote No: <span className="text-gray-900 font-mono font-bold ml-1">{quotation.quoteNumber}</span></p>
            <p className="text-gray-500 font-bold uppercase tracking-wider">Date: <span className="text-gray-900 font-medium ml-1">{quotation.date}</span></p>
            <p className="text-gray-500 font-bold uppercase tracking-wider">Valid Thru: <span className="text-gray-900 font-medium ml-1">{validUntilDate}</span></p>
            <p className="text-gray-500 font-bold uppercase tracking-wider">Currency: <span className="text-primary font-mono font-bold ml-1">{settings.currency}</span></p>
          </div>
        </div>
      </div>

      {/* Recipient and Payment Remittance Info */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col justify-between">
          <div>
            <h3 className="text-[7pt] font-black text-primary uppercase tracking-widest mb-1 pb-1 border-b border-gray-200">Quoted To:</h3>
            <p className="font-black text-gray-900 text-[9.5pt] mt-1">{quotation.clientName}</p>
            <p className="text-gray-600 text-[7.5pt]">Customer Reference ID: <span className="font-mono font-bold">{quotation.clientId}</span></p>
          </div>
          <p className="text-gray-400 text-[6.5pt] italic mt-2">Commercial quotation prepared for direct customer account</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col justify-between">
          <div>
            <h3 className="text-[7pt] font-black text-primary uppercase tracking-widest mb-1 pb-1 border-b border-gray-200">Banking & Settlement:</h3>
            <div className="space-y-0.5 text-[7.5pt] mt-1">
              {selectedBank ? (
                <>
                  <p className="text-gray-700 font-bold">Bank: <span className="font-normal text-gray-900">{selectedBank.bankName}</span></p>
                  <p className="text-gray-700 font-bold">Account: <span className="font-mono font-bold text-gray-900">{selectedBank.accountNumber}</span></p>
                  <p className="text-gray-700 font-bold">Branch: <span className="font-normal text-gray-900">{selectedBank.branch}</span></p>
                  {selectedBank.accountHolder && <p className="text-gray-700 font-bold">Holder: <span className="font-normal text-gray-900">{selectedBank.accountHolder}</span></p>}
                </>
              ) : (
                <p className="text-gray-500 italic">Direct cash, bank transfer, or corporate cheque accepted upon approval.</p>
              )}
            </div>
          </div>
          <p className="text-gray-400 text-[6.5pt] italic mt-2">Reference quote number on all payment remittances</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-5">
        <table className="w-full border-collapse text-[8pt]">
          <thead>
            <tr className="bg-gray-900 text-white">
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider rounded-tl-md">Description</th>
              <th className="px-2 py-2 text-center font-bold uppercase tracking-wider w-16">Qty</th>
              <th className="px-3 py-2 text-right font-bold uppercase tracking-wider w-24">Unit Price</th>
              <th className="px-3 py-2 text-right font-bold uppercase tracking-wider w-28 rounded-tr-md">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 border-x border-b border-gray-200 rounded-b-md overflow-hidden">
            {quotation.items.map((item, i) => (
              <tr key={`quo-item-${item.id || i}`} className="hover:bg-gray-50/50 break-inside-avoid">
                <td className="px-3 py-2">
                  <p className="font-bold text-gray-900">{item.name}</p>
                  {item.category && <p className="text-[6.5pt] text-gray-400 uppercase font-semibold">{item.category}</p>}
                </td>
                <td className="px-2 py-2 text-center font-medium text-gray-700">{item.quantity}</td>
                <td className="px-3 py-2 text-right text-gray-600 font-mono">{formatCurrency(item.price, settings.currency)}</td>
                <td className="px-3 py-2 text-right font-bold text-gray-900 font-mono">{formatCurrency(item.price * item.quantity, settings.currency)}</td>
              </tr>
            ))}
            {Array.from({ length: Math.max(0, 3 - quotation.items.length) }).map((_, i) => (
              <tr key={`quo-empty-row-${i}`} className="h-6">
                <td className="px-3 py-1"></td>
                <td className="px-2 py-1"></td>
                <td className="px-3 py-1"></td>
                <td className="px-3 py-1"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Financial Breakdown & Instructions */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Left: Notes & Instructions */}
        <div className="bg-gray-50/70 rounded-xl p-3 border border-gray-100 flex flex-col justify-between">
          <div className="space-y-1.5">
            <h4 className="text-[7pt] font-black uppercase text-gray-500 tracking-wider">Payment Terms & Notes</h4>
            <p className="text-[7.5pt] text-gray-600 leading-relaxed">
              Please reference quote number <span className="font-mono font-bold text-gray-900">{quotation.quoteNumber}</span> upon acceptance. 
              Pricing is firm for 30 calendar days from issue date. Deliveries subject to inventory availability.
            </p>
          </div>
          <div className="pt-2 mt-2 border-t border-gray-200 flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center border border-primary/20 text-primary font-black text-[7pt]">
              EST
            </div>
            <div>
              <p className="text-[7.5pt] font-bold text-gray-900 uppercase">Verified Estimate</p>
              <p className="text-[6.5pt] text-gray-500">Official business quotation</p>
            </div>
          </div>
        </div>

        {/* Right: Totals Card */}
        <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-1.5">
          <div className="flex justify-between text-[8pt] text-gray-500">
            <span className="font-bold uppercase tracking-wider">Subtotal</span>
            <span className="font-mono text-gray-800">{formatCurrency(quotation.subtotal, settings.currency)}</span>
          </div>
          {quotation.discount > 0 && (
            <div className="flex justify-between text-[8pt] text-red-500">
              <span className="font-bold uppercase tracking-wider">Discount {quotation.discountRate > 0 ? `(${quotation.discountRate}%)` : ''}</span>
              <span className="font-mono">-{formatCurrency(quotation.discount, settings.currency)}</span>
            </div>
          )}
          {quotation.tax > 0 && (
            <div className="flex justify-between text-[8pt] text-gray-500">
              <span className="font-bold uppercase tracking-wider">Tax ({quotation.taxRate}%)</span>
              <span className="font-mono text-gray-800">{formatCurrency(quotation.tax, settings.currency)}</span>
            </div>
          )}
          {quotation.freight > 0 && (
            <div className="flex justify-between text-[8pt] text-gray-500">
              <span className="font-bold uppercase tracking-wider">Freight / Shipping</span>
              <span className="font-mono text-gray-800">{formatCurrency(quotation.freight, settings.currency)}</span>
            </div>
          )}
          {quotation.otherChargesList && quotation.otherChargesList.length > 0 ? (
            quotation.otherChargesList.map((charge, i) => (
              <div key={`quo-charge-${charge.id || i}`} className="flex justify-between text-[8pt] text-gray-500">
                <span className="font-bold uppercase tracking-wider">{charge.description || 'Other Charge'}</span>
                <span className="font-mono text-gray-800">{formatCurrency(charge.amount, settings.currency)}</span>
              </div>
            ))
          ) : (
            quotation.otherCharges > 0 && (
              <div className="flex justify-between text-[8pt] text-gray-500">
                <span className="font-bold uppercase tracking-wider">Other Charges</span>
                <span className="font-mono text-gray-800">{formatCurrency(quotation.otherCharges, settings.currency)}</span>
              </div>
            )
          )}
          <div className="flex justify-between items-center pt-2 border-t-2 border-primary">
            <span className="text-[8.5pt] font-black text-gray-900 uppercase tracking-widest">Grand Total</span>
            <span className="text-base font-black text-primary font-mono">{formatCurrency(quotation.total, settings.currency)}</span>
          </div>
          <p className="text-[6.5pt] text-gray-400 text-right italic pt-0.5">All amounts stated in {settings.currency}</p>
        </div>
      </div>

      {/* Terms and Conditions */}
      {termsToDisplay.length > 0 && (
        <div className="mb-4 bg-gray-50/50 rounded-xl p-3 border border-gray-200/70 break-inside-avoid">
          <h4 className="text-[7pt] font-black uppercase text-primary mb-1 tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
            Terms & Conditions
          </h4>
          <div className="space-y-1 text-[7pt] text-gray-700 leading-normal">
            {termsToDisplay.map((term, i) => (
              <div key={`quo-term-${i}`} className="flex items-start gap-1.5 break-words">
                <span className="font-bold text-primary shrink-0">{i + 1}.</span>
                <span className="flex-1">{term}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signature and Approval Line */}
      <div className="mt-auto pt-4 border-t border-gray-200 grid grid-cols-2 gap-8 items-end break-inside-avoid">
        <div className="space-y-2">
          <div className="inline-block p-1 bg-white border border-gray-200 rounded">
            <Barcode 
              value={quotation.quoteNumber || 'QUO-000000'}
              width={1.1}
              height={26}
              fontSize={8}
              margin={0}
              displayValue={true}
              background="transparent"
            />
          </div>
          <p className="text-[6.5pt] text-gray-400 italic">Official verification barcode • {quotation.quoteNumber}</p>
        </div>

        <div className="text-right space-y-8">
          <div className="w-44 border-b-2 border-gray-900 ml-auto"></div>
          <div>
            <p className="text-[7.5pt] font-black text-gray-900 uppercase tracking-widest">Authorized Signature</p>
            <p className="text-[6.5pt] text-gray-500 uppercase">{settings.name}</p>
          </div>
        </div>
      </div>

      {/* Corporate Branded Footer */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[6.5pt] text-gray-400">
        <div>
          <span className="font-bold text-gray-600 uppercase">{settings.name}</span>
          <span className="mx-2">•</span>
          <span>{settings.address?.split('\n')[0]}</span>
          {settings.phones?.[0] && <> <span className="mx-1">•</span> <span>Tel: {settings.phones[0]}</span></>}
          {settings.email && <> <span className="mx-1">•</span> <span>{settings.email}</span></>}
        </div>
        <div className="font-medium">
          Page 1 of 1
        </div>
      </div>
    </div>
  );
}
