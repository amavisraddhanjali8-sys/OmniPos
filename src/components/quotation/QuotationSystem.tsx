import React, { useState, useRef } from 'react';
import { Plus, Trash2, FileText, Send, Printer, Download, User, UserPlus, Save, History, Search, X, Package, Check, Landmark, FileDown, Receipt, ShoppingBag } from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';
import { PRODUCTS, MOCK_CLIENTS, INITIAL_SETTINGS, INITIAL_TERMS } from '../../constants';
import { Quotation, CartItem, Client, Product, CompanySettings, Invoice } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import QuotationPrintView from './QuotationPrintView';
import ConfirmModal from '../layout/ConfirmModal';
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
  onConvertToOrder?: (quotation: Quotation) => void;
  invoices?: Invoice[];
  onAddAuditLog?: (action: string, details: string, category: any, type?: any) => void;
  language?: Language;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  clients?: Client[];
  onUpdateClients?: (clients: Client[]) => void;
  products?: Product[];
}

export default function QuotationSystem({ 
  companySettings, 
  onUpdateSettings, 
  quotations, 
  onUpdateQuotations,
  onConvertToInvoice,
  onConvertToOrder,
  invoices = [],
  onAddAuditLog,
  language = 'en',
  searchQuery,
  setSearchQuery,
  clients = [],
  onUpdateClients,
  products = []
}: QuotationSystemProps) {
  const t = translations[language];
  const { addNotification } = useNotifications();

  const availableClients = clients.length > 0 ? clients : MOCK_CLIENTS;
  const availableProducts = products.length > 0 ? products : PRODUCTS;

  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [quoteNumber, setQuoteNumber] = useState(`Q${Math.floor(100000 + Math.random() * 900000)}`);
  const [showPrintPortal, setShowPrintPortal] = useState(false);
  const [view, setView] = useState<'builder' | 'history'>('builder');
  const [isProductPortalOpen, setIsProductPortalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [newClientFormData, setNewClientFormData] = useState({ name: '', phone: '', email: '', address: '', city: '' });
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [terms, setTerms] = useState<string[]>(companySettings.terms?.map(t => t.text) || []);
  const [selectedBankId, setSelectedBankId] = useState<string>(companySettings.bankDetails[0]?.id || '');
  const [newTerm, setNewTerm] = useState('');
  const [taxRate, setTaxRate] = useState(companySettings.defaultTaxRate);
  const [discountRate, setDiscountRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [freight, setFreight] = useState(0);
  const [otherChargesList, setOtherChargesList] = useState<{ id: string; description: string; amount: number; }[]>([]);
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
                color: "f62440",
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
              new TextRun({ text: `GRAND TOTAL: ${formatCurrency(total)}`, bold: true, size: 32, color: "f62440" }),
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

  const filteredPortalProducts = availableProducts.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleSendWhatsApp = () => {
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

  const handleSendEmail = () => {
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
                {onConvertToOrder && items.length > 0 && (
                  <button 
                    onClick={() => onConvertToOrder(currentQuotation)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors shadow-sm"
                    title="Load items into POS cart for direct checkout"
                  >
                    <ShoppingBag size={14} />
                    Push to POS Cart
                  </button>
                )}
                {onConvertToInvoice && items.length > 0 && (
                  <button 
                    onClick={() => onConvertToInvoice(currentQuotation)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors shadow-sm"
                    title="Generate official tax invoice from this quote"
                  >
                    <Receipt size={14} />
                    Generate Invoice
                  </button>
                )}
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
                  filteredQuotations.map((q) => {
                    const linkedInvoice = invoices.find(inv => inv.quotationId === q.id || inv.quotationNumber === q.quoteNumber);
                    return (
                      <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-gray-900 font-bold">{q.quoteNumber}</span>
                            {linkedInvoice && (
                              <span className="px-1.5 py-0.5 bg-green-50 text-green-700 border border-green-200 text-[8px] font-bold rounded-md">
                                {linkedInvoice.invoiceNumber}
                              </span>
                            )}
                          </div>
                        </td>
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
                          <div className="flex justify-end gap-1.5">
                            {onConvertToOrder && (
                              <button 
                                onClick={() => onConvertToOrder(q)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title="Convert to POS Order (Cart)"
                              >
                                <ShoppingBag size={14} />
                              </button>
                            )}
                            {onConvertToInvoice && (
                              <button 
                                onClick={() => onConvertToInvoice(q)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                title={linkedInvoice ? "View/Update Invoice" : "Generate Invoice"}
                              >
                                <Receipt size={14} />
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                setItems(q.items);
                                const matchedClient = availableClients.find(c => c.id === q.clientId);
                                setSelectedClient(matchedClient || {
                                  id: q.clientId || 'GUEST',
                                  name: q.clientName,
                                  email: '',
                                  phone: '',
                                  address: '',
                                  city: '',
                                  creditLimit: 0,
                                  isBlacklisted: false
                                });
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Left: Client & Quick Add */}
            <div className="md:col-span-1 space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <User size={14} className="text-primary" />
                    Client Database
                  </h3>
                  <button 
                    type="button"
                    onClick={() => setIsAddClientModalOpen(true)}
                    className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline bg-pink-50 hover:bg-pink-100 px-2 py-0.5 rounded-lg transition-colors"
                    title="Add new client to database"
                  >
                    <UserPlus size={12} />
                    + New
                  </button>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Select Client</label>
                  <select 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-primary"
                    value={selectedClient?.id || ''}
                    onChange={(e) => {
                      const client = availableClients.find(c => c.id === e.target.value);
                      setSelectedClient(client || null);
                    }}
                  >
                    <option value="">-- Choose registered client --</option>
                    {availableClients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedClient ? (
                  <div className="p-3 bg-pink-50/50 rounded-xl border border-pink-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-primary uppercase">Client Details</p>
                      <button 
                        onClick={() => setSelectedClient(null)} 
                        className="text-[10px] text-gray-400 hover:text-red-500 font-bold"
                      >
                        Clear
                      </button>
                    </div>
                    <p className="text-xs font-bold text-gray-900">{selectedClient.name}</p>
                    <p className="text-[10px] text-gray-500 font-mono">ID: {selectedClient.id}</p>
                    {selectedClient.phone && <p className="text-[10px] text-gray-600">📞 {selectedClient.phone}</p>}
                    {selectedClient.email && <p className="text-[10px] text-gray-600">✉️ {selectedClient.email}</p>}
                    {selectedClient.address && <p className="text-[10px] text-gray-500 truncate">📍 {selectedClient.address}</p>}
                  </div>
                ) : (
                  <div className="p-2.5 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center text-[10px] text-gray-400">
                    Select a client above or click <span className="font-bold text-primary cursor-pointer" onClick={() => setIsAddClientModalOpen(true)}>+ New</span> to register one.
                  </div>
                )}
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Package size={14} className="text-primary" />
                    Quick Products
                  </h3>
                  <button 
                    onClick={() => setIsProductPortalOpen(true)}
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    Open Catalog
                  </button>
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto no-scrollbar">
                  {availableProducts.slice(0, 10).map(p => (
                    <button 
                      key={p.id}
                      onClick={() => addItem(p)}
                      className="w-full flex items-center justify-between p-2 hover:bg-pink-50/50 rounded-xl text-[11px] group transition-colors text-left border border-transparent hover:border-pink-100"
                    >
                      <div className="truncate pr-2">
                        <p className="text-gray-700 group-hover:text-primary font-medium truncate">{p.name}</p>
                        <p className="text-[9px] text-gray-400">{formatCurrency(p.price)}</p>
                      </div>
                      <Plus size={14} className="text-gray-300 group-hover:text-primary shrink-0" />
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
                  <div className="space-y-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-gray-600 uppercase flex items-center gap-1.5">
                          <FileText size={12} className="text-primary" /> Terms & Conditions ({terms.length})
                        </label>
                        <span className="text-[9px] text-gray-400">Included on printed quotation</span>
                      </div>

                      {/* Add new custom term */}
                      <div className="space-y-1.5">
                        <div className="flex gap-2">
                          <textarea 
                            rows={2}
                            value={newTerm}
                            onChange={(e) => setNewTerm(e.target.value)}
                            placeholder="Type a condition (e.g. 50% advance required, delivery in 3 days)..."
                            className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-primary resize-none shadow-2xs"
                          />
                          <div className="flex flex-col gap-1.5 justify-center">
                            <button 
                              type="button"
                              onClick={() => {
                                if (newTerm.trim()) {
                                  setTerms([...terms, newTerm.trim()]);
                                  setNewTerm('');
                                }
                              }}
                              disabled={!newTerm.trim()}
                              title="Add to current quotation"
                              className="px-3 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1 shadow-sm"
                            >
                              <Plus size={14} /> Add
                            </button>
                            {onUpdateSettings && (
                              <button 
                                type="button"
                                onClick={() => {
                                  if (newTerm.trim()) {
                                    saveTermGlobally(newTerm.trim());
                                  }
                                }}
                                disabled={!newTerm.trim()}
                                title="Save to company defaults"
                                className="px-2.5 py-1 bg-green-600 text-white text-[9px] font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                              >
                                <Save size={10} /> Default
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Saved preset templates */}
                      {companySettings.terms?.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase">Quick Presets (click to toggle):</span>
                          <div className="flex flex-wrap gap-1.5">
                            {companySettings.terms.map((t) => {
                              const isSelected = terms.includes(t.text);
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setTerms(terms.filter(term => term !== t.text));
                                    } else {
                                      setTerms([...terms, t.text]);
                                    }
                                  }}
                                  className={cn(
                                    "px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border text-left",
                                    isSelected 
                                      ? "bg-pink-100 text-primary border-pink-300 font-bold" 
                                      : "bg-white text-gray-600 hover:bg-gray-100 border-gray-200"
                                  )}
                                >
                                  {isSelected ? '✓ ' : '+ '}
                                  {t.text.length > 40 ? `${t.text.substring(0, 40)}...` : t.text}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Current terms list: readable, full text, no truncation! */}
                      <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pt-1">
                        {terms.map((term, i) => (
                          <div key={i} className="flex items-start justify-between p-2.5 bg-white rounded-xl border border-gray-200 hover:border-pink-200 transition-colors gap-2 group shadow-2xs">
                            <div className="flex items-start gap-2 flex-1">
                              <span className="text-[10px] font-bold text-primary shrink-0 mt-0.5">{i + 1}.</span>
                              <p className="text-[11px] text-gray-700 leading-relaxed break-words">{term}</p>
                            </div>
                            <button 
                              type="button"
                              onClick={() => removeTerm(i)}
                              className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                              title="Remove term"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                        {terms.length === 0 && (
                          <div className="text-center py-4 text-xs text-gray-400 italic bg-white rounded-xl border border-dashed border-gray-200">
                            No terms added yet. Add terms above or select from presets.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-gray-200/60">
                      <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                        <Landmark size={12} className="text-primary" /> Payment Bank Remittance
                      </label>
                      <select 
                        value={selectedBankId}
                        onChange={(e) => setSelectedBankId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-primary shadow-2xs"
                      >
                        <option value="">Select remittance bank...</option>
                        {companySettings.bankDetails?.map(bank => (
                          <option key={bank.id} value={bank.id}>{bank.bankName} - {bank.accountNumber} ({bank.branch})</option>
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

      {/* Quick Add Client Modal */}
      <AnimatePresence>
        {isAddClientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-pink-50/50">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <UserPlus size={18} />
                  <h3 className="text-sm font-bold text-gray-900">Add New Client</h3>
                </div>
                <button 
                  onClick={() => setIsAddClientModalOpen(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newClientFormData.name.trim()) return;
                  const newClient: Client = {
                    id: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
                    name: newClientFormData.name.trim(),
                    phone: newClientFormData.phone.trim(),
                    email: newClientFormData.email.trim(),
                    address: newClientFormData.address.trim(),
                    city: newClientFormData.city.trim() || 'Colombo',
                    creditLimit: 0,
                    isBlacklisted: false
                  };
                  if (onUpdateClients) {
                    onUpdateClients([...availableClients, newClient]);
                  }
                  setSelectedClient(newClient);
                  onAddAuditLog?.('Client Created', `Client ${newClient.name} created from Quotation Portal`, 'clients', 'success');
                  addNotification({
                    title: 'Client Registered',
                    message: `${newClient.name} has been added to the database and selected!`,
                    type: 'success',
                    category: 'system'
                  });
                  setNewClientFormData({ name: '', phone: '', email: '', address: '', city: '' });
                  setIsAddClientModalOpen(false);
                }}
                className="p-5 space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Full Name *</label>
                  <input 
                    type="text" 
                    required
                    autoFocus
                    placeholder="e.g. Acme Corporation"
                    value={newClientFormData.name}
                    onChange={e => setNewClientFormData({ ...newClientFormData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Phone Number</label>
                    <input 
                      type="text" 
                      placeholder="+94 77 123 4567"
                      value={newClientFormData.phone}
                      onChange={e => setNewClientFormData({ ...newClientFormData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="client@example.com"
                      value={newClientFormData.email}
                      onChange={e => setNewClientFormData({ ...newClientFormData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Street Address</label>
                    <input 
                      type="text" 
                      placeholder="45 Main Road"
                      value={newClientFormData.address}
                      onChange={e => setNewClientFormData({ ...newClientFormData, address: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">City</label>
                    <input 
                      type="text" 
                      placeholder="Colombo"
                      value={newClientFormData.city}
                      onChange={e => setNewClientFormData({ ...newClientFormData, city: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                  <button 
                    type="button"
                    onClick={() => setIsAddClientModalOpen(false)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                  >
                    Save & Select
                  </button>
                </div>
              </form>
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

