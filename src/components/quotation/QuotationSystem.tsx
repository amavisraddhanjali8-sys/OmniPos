import React, { useState, useRef } from 'react';
import { Plus, Trash2, FileText, Send, Printer, Download, User, Save, History, Search, X, Package, Check, Landmark, FileDown, Receipt } from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';
import { PRODUCTS, MOCK_CLIENTS, INITIAL_SETTINGS, INITIAL_TERMS } from '../../constants';
import { Quotation, CartItem, Client, Product, CompanySettings } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import QuotationPrintView from './QuotationPrintView';
import ConfirmModal from '../layout/ConfirmModal';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { handleHtml2CanvasClone } from '../../lib/pdf-utils';
import PrintPortal from '../layout/PrintPortal';
import { useNotifications } from '../../context/NotificationContext';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

import { translations, Language } from '../../i18n';

interface QuotationSystemProps {
  companySettings: CompanySettings;
  onUpdateSettings?: (settings: CompanySettings) => void;
  quotations: Quotation[];
  onUpdateQuotations: (quotations: Quotation[]) => void;
  onConvertToInvoice?: (quotation: Quotation) => void;
  onAddAuditLog?: (action: string, details: string, category: any, type?: any) => void;
  language?: Language;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function QuotationSystem({ 
  companySettings, 
  onUpdateSettings, 
  quotations, 
  onUpdateQuotations,
  onConvertToInvoice,
  onAddAuditLog,
  language = 'en',
  searchQuery,
  setSearchQuery
}: QuotationSystemProps) {
  const t = translations[language];
  const { addNotification } = useNotifications();
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [quoteNumber, setQuoteNumber] = useState(`Q${Math.floor(100000 + Math.random() * 900000)}`);
  const [showPrintPortal, setShowPrintPortal] = useState(false);
  const [view, setView] = useState<'builder' | 'history'>('builder');
  const [isProductPortalOpen, setIsProductPortalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [terms, setTerms] = useState<string[]>(companySettings.terms.map(t => t.text));
  const [selectedBankId, setSelectedBankId] = useState<string>(companySettings.bankDetails[0]?.id || '');
  const [newTerm, setNewTerm] = useState('');
  const [taxRate, setTaxRate] = useState(companySettings.defaultTaxRate);
  const [discountRate, setDiscountRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [freight, setFreight] = useState(0);
  const [otherChargesList, setOtherChargesList] = useState<{ id: string; description: string; amount: number; }[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const filteredQuotations = quotations.filter(q => 
    q.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
    q.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addItem = (product: Product) => {
    const existing = items.find(i => i.id === product.id);
    if (existing) {
      setItems(items.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, { ...product, quantity: 1 }]);
    }
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const addTerm = () => {
    const updatedTerms = [...terms, newTerm];
    setTerms(updatedTerms);
    setNewTerm('');
  };

  const saveTermGlobally = (termText: string) => {
    if (onUpdateSettings) {
      const newTermObj = { id: Date.now().toString(), text: termText };
      onUpdateSettings({
        ...companySettings,
        terms: [...companySettings.terms, newTermObj]
      });
      addNotification({
        title: 'Settings Updated',
        message: 'Term saved to company defaults!',
        type: 'success',
        category: 'system'
      });
    }
  };

  const removeTerm = (index: number) => {
    setTerms(terms.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const calculatedDiscount = discountRate > 0 ? (subtotal * (discountRate / 100)) : discount;
  const taxableAmount = Math.max(0, subtotal - calculatedDiscount);
  const tax = taxableAmount * (taxRate / 100);
  const otherChargesTotal = otherChargesList.reduce((sum, charge) => sum + charge.amount, 0);
  const total = taxableAmount + tax + freight + otherChargesTotal;

  const currentQuotation: Quotation = {
    id: Date.now().toString(),
    quoteNumber,
    clientId: selectedClient?.id || 'GUEST',
    clientName: selectedClient?.name || 'Guest Customer',
    date: new Date().toLocaleDateString(),
    items,
    subtotal,
    tax,
    taxRate,
    discount: calculatedDiscount,
    discountRate,
    freight,
    otherCharges: otherChargesTotal,
    otherChargesList,
    total,
    status: 'Draft',
    terms,
    bankId: selectedBankId
  };

  const handleSave = () => {
    if (!selectedClient) {
      addNotification({
        title: 'Validation Error',
        message: 'Please select a client first',
        type: 'error',
        category: 'system'
      });
      return;
    }
    onUpdateQuotations([...quotations, currentQuotation]);
    onAddAuditLog?.('Quotation Created', `Quotation #${currentQuotation.quoteNumber} created for ${selectedClient.name}`, 'sales', 'success');
    addNotification({
      title: 'Quotation Saved',
      message: 'Quotation saved successfully!',
      type: 'success',
      category: 'sales'
    });
    setItems([]);
    setSelectedClient(null);
    setQuoteNumber(`Q${Math.floor(100000 + Math.random() * 900000)}`);
  };

  const handleDeleteQuote = (id: string) => {
    setQuoteToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (quoteToDelete) {
      onUpdateQuotations(quotations.filter(q => q.id !== quoteToDelete));
      onAddAuditLog?.('Quotation Deleted', `Quotation #${quoteToDelete} removed from history`, 'sales', 'warning');
      setQuoteToDelete(null);
    }
  };

  const handleStatusChange = (id: string, status: Quotation['status']) => {
    onUpdateQuotations(quotations.map(q => q.id === id ? { ...q, status } : q));
    onAddAuditLog?.('Quotation Status Updated', `Quotation #${id} status changed to ${status}`, 'sales');
    if (status === 'Won' && onConvertToInvoice) {
      const quote = quotations.find(q => q.id === id);
      if (quote) {
        onConvertToInvoice({ ...quote, status: 'Won' });
      }
    }
  };

  const handlePrint = () => {
    window.focus();
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setIsGeneratingPDF(true);
    try {
      const element = printRef.current;
      
      // Temporary style to ensure all elements are visible and formatted correctly for capture
      const originalStyle = element.style.cssText;
      element.style.width = '1024px'; // Fixed width for consistent capture
      element.style.padding = '40px';
      element.style.backgroundColor = '#ffffff';
      element.style.boxSizing = 'border-box';
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1024,
        onclone: (clonedDoc) => {
          handleHtml2CanvasClone(clonedDoc);
          
          // Ensure the cloned element has the same fixed width
          const clonedElement = clonedDoc.querySelector('[data-print-root]') as HTMLElement || clonedDoc.body.firstChild as HTMLElement;
          if (clonedElement) {
            clonedElement.style.width = '1024px';
            clonedElement.style.padding = '40px';
            clonedElement.style.boxSizing = 'border-box';
          }
        }
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Use canvas directly for better compatibility and performance
      const imgProps = pdf.getImageProperties(canvas);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(canvas, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      // Add subsequent pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      pdf.save(`quotation_${quoteNumber}.pdf`);
      
      // Restore original style
      element.style.cssText = originalStyle;
    } catch (error) {
      console.error('Error generating PDF:', error);
      addNotification({
        title: 'PDF Error',
        message: 'Failed to generate PDF. Please try the Print option instead.',
        type: 'error',
        category: 'system'
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadCSV = () => {
    const headers = ['Item', 'Quantity', 'Price', 'Total'];
    const rows = items.map(i => [
      `"${i.name.replace(/"/g, '""')}"`,
      i.quantity,
      i.price,
      i.price * i.quantity
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `quotation_${quoteNumber}.csv`);
  };

  const handleDownloadDOCX = async () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: companySettings.name,
                bold: true,
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: companySettings.address,
                size: 20,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({
                text: "QUOTATION",
                bold: true,
                size: 48,
                color: "f97316",
              }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Quote Number: ${quoteNumber}`, bold: true }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Date: ${new Date().toLocaleDateString()}`, bold: true }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: "QUOTED TO:", bold: true, size: 24 }),
            ],
          }),
          new Paragraph({ text: selectedClient?.name || "Guest Customer" }),
          new Paragraph({ text: `Customer ID: ${selectedClient?.id || "GUEST"}` }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Qty", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Unit Price", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Amount", bold: true })] })] }),
                ],
              }),
              ...items.map(item => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(item.name)] }),
                  new TableCell({ children: [new Paragraph(item.quantity.toString())] }),
                  new TableCell({ children: [new Paragraph(formatCurrency(item.price))] }),
                  new TableCell({ children: [new Paragraph(formatCurrency(item.price * item.quantity))] }),
                ],
              })),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: `GRAND TOTAL: ${formatCurrency(total)}`, bold: true, size: 32, color: "f97316" }),
            ],
            alignment: AlignmentType.RIGHT,
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `quotation_${quoteNumber}.docx`);
  };

  const handleDownloadHistoryCSV = () => {
    if (quotations.length === 0) {
      addNotification({
        title: 'Export Error',
        message: 'No quotations to download',
        type: 'error',
        category: 'system'
      });
      return;
    }
    const headers = ['Quote #', 'Client', 'Date', 'Subtotal', 'Tax', 'Discount', 'Freight', 'Other Charges', 'Total', 'Status'];
    const rows = quotations.map(q => [
      q.quoteNumber,
      `"${q.clientName.replace(/"/g, '""')}"`,
      q.date,
      q.subtotal,
      q.tax,
      q.discount,
      q.freight,
      q.otherCharges,
      q.total,
      q.status
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `quotation_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredPortalProducts = PRODUCTS.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleSendWhatsApp = async () => {
    // Try to share file if supported
    if (navigator.share && navigator.canShare) {
      try {
        const element = printRef.current;
        if (element) {
          const canvas = await html2canvas(element, { scale: 2, useCORS: true });
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          
          // Use canvas directly for better compatibility and performance
          const imgProps = pdf.getImageProperties(canvas);
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          
          pdf.addImage(canvas, 'PNG', 0, 0, pdfWidth, pdfHeight);
          const blob = pdf.output('blob');
          const file = new File([blob], `quotation_${quoteNumber}.pdf`, { type: 'application/pdf' });
          
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Quotation ${quoteNumber}`,
              text: `Please find the quotation from ${companySettings.name} attached.`,
            });
            return;
          }
        }
      } catch (e) {
        console.error('Share failed', e);
      }
    }

    // Fallback to text message
    const itemsList = items.map(i => `- ${i.name} (${i.quantity}x): ${formatCurrency(i.price * i.quantity)}`).join('\n');
    const message = `*Quotation from ${companySettings.name}*\n\n` +
      `Quote #: ${quoteNumber}\n` +
      `Date: ${new Date().toLocaleDateString()}\n\n` +
      `*Items:*\n${itemsList}\n\n` +
      `*Grand Total: ${formatCurrency(total)}*\n\n` +
      `Thank you for your business!`;
    
    const url = `https://wa.me/${selectedClient?.phone?.replace(/\D/g, '') || ''}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleSendEmail = async () => {
    // Try to share file if supported
    if (navigator.share && navigator.canShare) {
      try {
        const element = printRef.current;
        if (element) {
          const canvas = await html2canvas(element, { scale: 2, useCORS: true });
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          
          // Use canvas directly for better compatibility and performance
          const imgProps = pdf.getImageProperties(canvas);
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          
          pdf.addImage(canvas, 'PNG', 0, 0, pdfWidth, pdfHeight);
          const blob = pdf.output('blob');
          const file = new File([blob], `quotation_${quoteNumber}.pdf`, { type: 'application/pdf' });
          
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Quotation ${quoteNumber}`,
              text: `Please find the quotation from ${companySettings.name} attached.`,
            });
            return;
          }
        }
      } catch (e) {
        console.error('Share failed', e);
      }
    }

    // Fallback to mailto
    const itemsList = items.map(i => `- ${i.name} (${i.quantity}x): ${formatCurrency(i.price * i.quantity)}`).join('\n');
    const subject = `Quotation ${quoteNumber} from ${companySettings.name}`;
    const body = `Dear ${selectedClient?.name || 'Customer'},\n\nPlease find the quotation details below:\n\n` +
      `Quote #: ${quoteNumber}\n` +
      `Date: ${new Date().toLocaleDateString()}\n\n` +
      `Items:\n${itemsList}\n\n` +
      `Grand Total: ${formatCurrency(total)}\n\n` +
      `Best regards,\n${companySettings.name}`;
    
    const mailtoUrl = `mailto:${selectedClient?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  if (showPrintPortal) {
    // We don't return early here anymore, we use the PrintPortal component at the end
  }

  return (
    <div className="flex-1 bg-gray-50 p-4 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t.quotationPortal}</h1>
            <p className="text-xs text-gray-500">{t.manageQuotations}</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setView(view === 'builder' ? 'history' : 'builder')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              {view === 'builder' ? <History size={14} /> : <Plus size={14} />}
              {view === 'builder' ? t.viewHistory : t.createQuotation}
            </button>
            {view === 'history' && (
              <>
                <button 
                  onClick={handleDownloadHistoryCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Download size={14} />
                  {t.exportCsv}
                </button>
                {quotations?.length > 0 && (
                  <button 
                    onClick={() => setIsClearConfirmOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={14} />
                    {t.clearLogs}
                  </button>
                )}
              </>
            )}
            {view === 'builder' && (
              <>
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                >
                  <Save size={14} />
                  {t.save}
                </button>
                <button 
                  onClick={() => setShowPrintPortal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Printer size={14} />
                  {t.preview}
                </button>
              </>
            )}
          </div>
        </div>

        {view === 'history' ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 print:hidden">
              <div className="relative max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder={t.searchHistory}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">{t.quoteNumber}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">{t.customer}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">{t.date}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">{t.total}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">{t.status}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredQuotations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-xs text-gray-400 italic">{t.noHistoryFound}</td>
                  </tr>
                ) : (
                  filteredQuotations.map((q) => (
                    <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-[10px] text-gray-900">{q.quoteNumber}</td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-700">{q.clientName}</td>
                      <td className="px-4 py-3 text-[10px] text-gray-500">{q.date}</td>
                      <td className="px-4 py-3 text-xs font-bold text-primary">{formatCurrency(q.total)}</td>
                      <td className="px-4 py-3">
                        <select 
                          value={q.status}
                          onChange={(e) => handleStatusChange(q.id, e.target.value as any)}
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border focus:outline-none transition-all",
                            q.status === 'Won' ? "bg-green-100 text-green-700 border-green-200" :
                            q.status === 'Approved' ? "bg-blue-100 text-blue-700 border-blue-200" :
                            q.status === 'Rejected' ? "bg-red-100 text-red-700 border-red-200" :
                            "bg-gray-100 text-gray-600 border-gray-200"
                          )}
                        >
                          <option value="Draft">{t.draft}</option>
                          <option value="Sent">{t.sent}</option>
                          <option value="Approved">{t.accepted}</option>
                          <option value="Won">{t.completed}</option>
                          <option value="Rejected">{t.rejected}</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          {q.status === 'Won' && onConvertToInvoice && (
                            <button 
                              onClick={() => onConvertToInvoice(q)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                              title="Generate Invoice"
                            >
                              <Receipt size={14} />
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              setItems(q.items);
                              setSelectedClient(MOCK_CLIENTS.find(c => c.id === q.clientId) || null);
                              setQuoteNumber(q.quoteNumber);
                              setTerms(q.terms);
                              setSelectedBankId(q.bankId || '');
                              setTaxRate(q.taxRate);
                              setDiscountRate(q.discountRate || 0);
                              setDiscount(q.discountRate ? 0 : q.discount);
                              setFreight(q.freight);
                              setOtherChargesList(q.otherChargesList || []);
                              setView('builder');
                            }}
                            className="p-1.5 text-gray-400 hover:text-primary transition-colors"
                            title="Edit / View"
                          >
                            <FileText size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteQuote(q.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Left: Client & Quick Add */}
            <div className="md:col-span-1 space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                  <User size={14} className="text-primary" />
                  Select Client
                </h3>
                <select 
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary"
                  value={selectedClient?.id || ''}
                  onChange={(e) => setSelectedClient(MOCK_CLIENTS.find(c => c.id === e.target.value) || null)}
                >
                  <option value="">Select a client...</option>
                  {MOCK_CLIENTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {selectedClient && (
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <p className="text-[10px] font-bold text-primary uppercase mb-1">Client Info</p>
                    <p className="text-xs font-bold text-gray-900">{selectedClient.name}</p>
                    <p className="text-[10px] text-gray-500">{selectedClient.email}</p>
                    <p className="text-[10px] text-gray-500">{selectedClient.phone}</p>
                  </div>
                )}
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h3 className="text-xs font-bold text-gray-900">Items</h3>
                  <button 
                    onClick={() => setIsProductPortalOpen(true)}
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    Open Portal
                  </button>
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto no-scrollbar">
                  {PRODUCTS.slice(0, 8).map(p => (
                    <button 
                      key={p.id}
                      onClick={() => addItem(p)}
                      className="w-full flex items-center justify-between p-1.5 hover:bg-gray-50 rounded-lg text-[11px] group transition-colors"
                    >
                      <span className="text-gray-500 group-hover:text-primary font-medium truncate pr-2">{p.name}</span>
                      <Plus size={12} className="text-gray-300 group-hover:text-primary shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Items Table */}
            <div className="md:col-span-3 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500 uppercase">Quote Number: <span className="text-gray-900 font-mono">{quoteNumber}</span></span>
                  <span className="text-xs font-bold text-gray-500 uppercase">Date: <span className="text-gray-900">{new Date().toLocaleDateString()}</span></span>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">{t.items}</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase w-20">{t.quantity}</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase w-24">{t.price}</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase w-24">{t.total}</th>
                      <th className="px-4 py-3 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-[11px] text-gray-400 italic">
                          No items added. Select a client and add products to begin.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, index) => (
                        <tr key={index} className="group hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-xs font-medium text-gray-700">{item.name}</td>
                          <td className="px-4 py-3">
                            <input 
                              type="number" 
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[index].quantity = parseInt(e.target.value) || 1;
                                setItems(newItems);
                              }}
                              className="w-12 px-1.5 py-1 bg-gray-50 border border-gray-200 rounded text-xs focus:outline-none focus:border-primary"
                            />
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{formatCurrency(item.price)}</td>
                          <td className="px-4 py-3 text-xs font-bold text-gray-900">{formatCurrency(item.price * item.quantity)}</td>
                          <td className="px-4 py-3">
                            <button 
                              onClick={() => removeItem(index)}
                              className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                
                <div className="p-6 bg-gray-50 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Terms and Bank Selection */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                        <FileText size={10} /> Saved Terms
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {companySettings.terms.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => {
                              if (!terms.includes(t.text)) {
                                setTerms([...terms, t.text]);
                              }
                            }}
                            className="px-2 py-1 bg-gray-100 hover:bg-primary/10 hover:text-primary rounded text-[9px] font-medium transition-colors border border-gray-200"
                          >
                            + {t.text.substring(0, 20)}{t.text.length > 20 ? '...' : ''}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                        <FileText size={10} /> Current Quotation Terms
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={newTerm}
                          onChange={(e) => setNewTerm(e.target.value)}
                          placeholder="Add custom term..."
                          className="flex-1 px-3 py-1 bg-white border border-gray-200 rounded text-xs focus:outline-none focus:border-primary"
                        />
                        <div className="flex gap-1">
                          <button 
                            type="button"
                            onClick={addTerm}
                            title="Add to current quotation"
                            className="p-1 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                          {onUpdateSettings && (
                            <button 
                              type="button"
                              onClick={() => saveTermGlobally(newTerm)}
                              disabled={!newTerm.trim()}
                              title="Save to company defaults"
                              className="p-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              <Save size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto no-scrollbar">
                        {terms.map((term, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-white rounded border border-gray-100 group">
                            <span className="text-[10px] text-gray-600 truncate flex-1">{term}</span>
                            <button 
                              type="button"
                              onClick={() => removeTerm(i)}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                        <Landmark size={10} /> Select Payment Bank
                      </label>
                      <select 
                        value={selectedBankId}
                        onChange={(e) => setSelectedBankId(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded text-xs focus:outline-none focus:border-primary"
                      >
                        <option value="">Select a bank...</option>
                        {companySettings.bankDetails.map(bank => (
                          <option key={bank.id} value={bank.id}>{bank.bankName} - {bank.accountNumber}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex justify-between w-64 text-[11px] text-gray-500">
                      <span>Subtotal:</span>
                      <span className="font-medium text-gray-700">{formatCurrency(subtotal)}</span>
                    </div>
                    
                    <div className="flex justify-between w-64 items-center">
                      <span className="text-[11px] text-gray-500">Discount Rate (%):</span>
                      <input 
                        type="number" 
                        value={discountRate}
                        onChange={(e) => {
                          setDiscountRate(Number(e.target.value));
                          if (Number(e.target.value) > 0) setDiscount(0);
                        }}
                        className="w-20 px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] text-right focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="flex justify-between w-64 items-center">
                      <span className="text-[11px] text-gray-500">Fixed Discount:</span>
                      <input 
                        type="number" 
                        value={discount}
                        onChange={(e) => {
                          setDiscount(Number(e.target.value));
                          if (Number(e.target.value) > 0) setDiscountRate(0);
                        }}
                        className="w-20 px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] text-right focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="flex justify-between w-64 items-center">
                      <span className="text-[11px] text-gray-500">Tax Rate (%):</span>
                      <input 
                        type="number" 
                        value={taxRate}
                        onChange={(e) => setTaxRate(Number(e.target.value))}
                        className="w-20 px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] text-right focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="flex justify-between w-64 items-center">
                      <span className="text-[11px] text-gray-500">Freight:</span>
                      <input 
                        type="number" 
                        value={freight}
                        onChange={(e) => setFreight(Number(e.target.value))}
                        className="w-20 px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] text-right focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="w-64 space-y-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-500 uppercase font-bold">Other Charges</span>
                        <button 
                          onClick={() => setOtherChargesList([...otherChargesList, { id: Date.now().toString(), description: '', amount: 0 }])}
                          className="text-[9px] font-bold text-primary hover:underline"
                        >
                          + Add
                        </button>
                      </div>
                      {otherChargesList.map((charge) => (
                        <div key={charge.id} className="flex gap-1 items-center">
                          <input 
                            type="text"
                            placeholder="Desc"
                            value={charge.description}
                            onChange={(e) => setOtherChargesList(otherChargesList.map(c => c.id === charge.id ? { ...c, description: e.target.value } : c))}
                            className="flex-1 px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[9px] focus:outline-none focus:border-primary"
                          />
                          <input 
                            type="number"
                            placeholder="Amt"
                            value={charge.amount}
                            onChange={(e) => setOtherChargesList(otherChargesList.map(c => c.id === charge.id ? { ...c, amount: Number(e.target.value) } : c))}
                            className="w-16 px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[9px] text-right focus:outline-none focus:border-primary"
                          />
                          <button 
                            onClick={() => setOtherChargesList(otherChargesList.filter(c => c.id !== charge.id))}
                            className="text-gray-300 hover:text-red-500"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between w-64 pt-1.5 border-t border-gray-200">
                      <span className="text-xs font-bold text-gray-900 uppercase">Grand Total:</span>
                      <span className="text-lg font-bold text-primary">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Product Portal Modal */}
      <AnimatePresence>
        {isProductPortalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                    <Search size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">Product Portal</h2>
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Select multiple products to add</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsProductPortalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search by name, category or ID..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-4 gap-4 no-scrollbar">
                {filteredPortalProducts.map((product) => {
                  const cartItem = items.find(i => i.id === product.id);
                  return (
                    <button 
                      key={product.id}
                      onClick={() => addItem(product)}
                      className={cn(
                        "p-3 rounded-xl border transition-all text-left group relative",
                        cartItem 
                          ? "border-primary bg-primary/5 ring-1 ring-primary" 
                          : "border-gray-100 bg-white hover:border-primary/30 hover:shadow-md"
                      )}
                    >
                      <div className="aspect-square bg-gray-50 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                        ) : (
                          <Package size={24} className="text-gray-300" />
                        )}
                      </div>
                      <p className="text-xs font-bold text-gray-900 truncate">{product.name}</p>
                      <p className="text-[10px] text-gray-400 mb-1">{product.category}</p>
                      <p className="text-xs font-bold text-primary">{formatCurrency(product.price)}</p>
                      
                      {cartItem && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">
                          {cartItem.quantity}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  <span className="font-bold text-gray-900">{items.length}</span> items in quotation
                </div>
                <button 
                  onClick={() => setIsProductPortalOpen(false)}
                  className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition-all"
                >
                  Done Selecting
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Print Portal */}
      <PrintPortal
        isOpen={showPrintPortal}
        onClose={() => setShowPrintPortal(false)}
        title="Quotation Document"
        subtitle={`Quotation #${quoteNumber}`}
        onDownload={handleDownloadPDF}
        isGeneratingPDF={isGeneratingPDF}
      >
        <div ref={printRef} className="bg-white">
          <QuotationPrintView 
            quotation={currentQuotation} 
            settings={companySettings} 
          />
        </div>
      </PrintPortal>

      <ConfirmModal 
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Quotation"
        message="Are you sure you want to delete this quotation? This action cannot be undone."
        type="danger"
        language={language}
      />

      <ConfirmModal 
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={() => {
          onUpdateQuotations([]);
          onAddAuditLog?.('Quotation History Cleared', 'All quotation history records removed', 'sales', 'warning');
        }}
        title="Clear History"
        message={t.confirmDelete || "Are you sure you want to clear all quotation history? This action cannot be undone."}
        type="danger"
        language={language}
      />
    </div>
  );
}

