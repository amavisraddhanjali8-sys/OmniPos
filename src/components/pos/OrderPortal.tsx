import React, { useState, useRef } from 'react';
import { Search, Filter, Eye, Trash2, Download, Receipt, Calendar, User, ShoppingBag, FileDown, Phone, Mail, Globe, Printer, RefreshCcw } from 'lucide-react';
import { Transaction, CompanySettings } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { translations, Language } from '../../i18n';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '../../context/NotificationContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PrintPortal from '../layout/PrintPortal';
import Barcode from 'react-barcode';

import { handleHtml2CanvasClone } from '../../lib/pdf-utils';

interface OrderPortalProps {
  orders: Transaction[];
  onDeleteOrder: (id: string) => void;
  onClearOrders: () => void;
  onReviseOrder: (order: Transaction) => void;
  companySettings: CompanySettings;
  language?: Language;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function OrderPortal({ 
  orders, 
  onDeleteOrder, 
  onClearOrders, 
  onReviseOrder, 
  companySettings, 
  language = 'en',
  searchQuery,
  setSearchQuery
}: OrderPortalProps) {
  const t = translations[language];
  const { addNotification } = useNotifications();
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Transaction | null>(null);
  const [showPrintPortal, setShowPrintPortal] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const orderRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!orderRef.current || !selectedOrder) return;
    setIsGeneratingPDF(true);
    try {
      const element = orderRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          handleHtml2CanvasClone(clonedDoc);
        }
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      // Use canvas directly for better compatibility and performance
      const imgProps = pdf.getImageProperties(canvas);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(canvas, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`order_${selectedOrder.id.toUpperCase()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      addNotification({
        title: 'PDF Error',
        message: 'Failed to generate PDF.',
        type: 'error',
        category: 'system'
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredOrders = orders.filter(order => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = order.id.toLowerCase().includes(searchLower) ||
                         order.description.toLowerCase().includes(searchLower) ||
                         (order.clientName && order.clientName.toLowerCase().includes(searchLower));
    
    const matchesStatus = filterStatus === 'All' || (order.status || 'Completed') === filterStatus;
    
    const orderDate = new Date(order.date);
    const matchesStartDate = !startDate || orderDate >= new Date(startDate);
    const matchesEndDate = !endDate || orderDate <= new Date(endDate + 'T23:59:59');
    
    return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex-1 bg-gray-50 p-4 overflow-hidden flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t.orderPortal}</h1>
          <p className="text-xs text-gray-500">{t.manageOrders}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder={t.searchOrders}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 focus:outline-none focus:border-primary transition-all"
            >
              <option value="All">{t.allStatus || 'All Status'}</option>
              <option value="Completed">{t.completed || 'Completed'}</option>
              <option value="Pending">{t.pending || 'Pending'}</option>
              <option value="Cancelled">{t.cancelled || 'Cancelled'}</option>
            </select>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1">
              <Calendar size={14} className="text-gray-400" />
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-[10px] font-bold focus:outline-none"
              />
              <span className="text-gray-300">-</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-[10px] font-bold focus:outline-none"
              />
            </div>
          </div>
          {orders.length > 0 && (
            <button 
              onClick={onClearOrders}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all"
            >
              <Trash2 size={14} />
              {t.clearLogs}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex gap-4">
        {/* Orders List */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">{t.orderId}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">{t.date}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">{t.amount}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">{t.status}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic text-xs">
                      {t.noData}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr 
                      key={order.id} 
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedOrder?.id === order.id ? 'bg-primary/5' : ''}`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <ShoppingBag size={14} />
                          </div>
                          <span className="font-mono text-xs font-bold text-gray-700">#{order.id.slice(-6).toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-900 font-medium">
                          {new Date(order.date).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-primary">{formatCurrency(order.amount)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                          {order.status === 'Completed' ? t.completed : order.status || t.completed}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                            className="p-1.5 text-gray-400 hover:text-primary transition-colors"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteOrder(order.id); }}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Details Sidebar */}
        <AnimatePresence mode="wait">
          {selectedOrder ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-80 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">{t.details}</h3>
                <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 font-bold">×</button>
              </div>
              <div ref={orderRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-white">
                {/* Receipt Header (Visible in PDF/Print) */}
                <div className="text-center space-y-2 pb-4 border-b border-gray-100">
                  {companySettings.logo && (
                    <img src={companySettings.logo} alt="Logo" className="w-12 h-12 mx-auto object-contain" referrerPolicy="no-referrer" />
                  )}
                  <h2 className="text-sm font-black uppercase tracking-tighter">{companySettings.name}</h2>
                  <p className="text-[8px] text-gray-500 uppercase font-bold leading-tight max-w-[150px] mx-auto">{companySettings.address}</p>
                  <div className="flex justify-center gap-2 text-[8px] text-gray-400 font-bold">
                    {companySettings.phones.map((p, i) => (
                      <span key={i} className="flex items-center gap-1"><Phone size={6} /> {p}</span>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Receipt size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{t.summary}</span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">{t.orderId}</span>
                      <span className="font-mono font-bold text-gray-900">#{selectedOrder.id.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">{t.date}</span>
                      <span className="font-bold text-gray-900">{new Date(selectedOrder.date).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">{t.payment}</span>
                      <span className="font-bold text-gray-900">{selectedOrder.paymentMethod || t.cash}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-400">
                    <ShoppingBag size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{t.items}</span>
                  </div>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-gray-900 leading-tight">{item.name}</p>
                          <p className="text-[10px] text-gray-400">{item.quantity} x {formatCurrency(item.price)}</p>
                        </div>
                        <span className="text-xs font-bold text-gray-700">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t.subtotal}</span>
                    <span className="font-bold text-gray-900">{formatCurrency(selectedOrder.subtotal || selectedOrder.amount / 1.05)}</span>
                  </div>
                  {selectedOrder.discount && selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-xs text-red-500">
                      <span>{t.discount}</span>
                      <span className="font-bold">-{formatCurrency(selectedOrder.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{t.tax} ({selectedOrder.taxRate || 5}%)</span>
                    <span className="font-bold text-gray-900">{formatCurrency(selectedOrder.tax || selectedOrder.amount - (selectedOrder.amount / 1.05))}</span>
                  </div>
                  {(selectedOrder.freight || selectedOrder.otherCharges) && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">{t.otherCharges}</span>
                      <span className="font-bold text-gray-900">{formatCurrency((selectedOrder.freight || 0) + (selectedOrder.otherCharges || 0))}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm font-bold text-gray-900">{t.total}</span>
                    <span className="text-lg font-black text-primary">{formatCurrency(selectedOrder.amount)}</span>
                  </div>
                </div>

                {selectedOrder.amountPaid !== undefined && (
                  <div className="bg-primary/5 rounded-xl p-3 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-primary/60">{t.amountPaid}</span>
                      <span className="font-bold text-primary">{formatCurrency(selectedOrder.amountPaid)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-primary/60">{t.change}</span>
                      <span className="font-bold text-primary">{formatCurrency(selectedOrder.change || 0)}</span>
                    </div>
                  </div>
                )}

                {/* Barcode Section */}
                <div className="pt-6 flex flex-col items-center gap-2 border-t border-gray-50">
                  <Barcode 
                    value={selectedOrder.id.toUpperCase()} 
                    width={1.2} 
                    height={40} 
                    fontSize={10} 
                    margin={0}
                    background="transparent"
                  />
                  <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">{t.thankYou}</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100 grid grid-cols-3 gap-2">
                <button 
                  onClick={() => setShowPrintPortal(true)}
                  disabled={isGeneratingPDF}
                  className="flex items-center justify-center gap-2 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
                >
                  <Printer size={14} />
                  {t.preview}
                </button>
                <button 
                  onClick={() => onReviseOrder(selectedOrder)}
                  className="flex items-center justify-center gap-2 py-2 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl text-xs font-bold hover:bg-amber-100 transition-all"
                >
                  <RefreshCcw size={14} />
                  {t.revise}
                </button>
                <button 
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                  className="flex items-center justify-center gap-2 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                >
                  {isGeneratingPDF ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download size={14} />}
                  {isGeneratingPDF ? '...' : 'PDF'}
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="w-80 bg-white rounded-2xl border border-gray-200 border-dashed flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                <Receipt size={32} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">{t.noData}</h4>
                <p className="text-xs text-gray-400">{t.searchOrders}</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
      {/* Print Portal */}
      <PrintPortal
        isOpen={showPrintPortal}
        onClose={() => setShowPrintPortal(false)}
        title="Order Receipt"
        subtitle={`Order #${selectedOrder?.id.toUpperCase()}`}
        onDownload={handleDownloadPDF}
        isGeneratingPDF={isGeneratingPDF}
      >
        <div ref={orderRef} className="bg-white p-8 max-w-[400px] mx-auto" data-print-root>
          <div className="text-center space-y-4 mb-8">
            <h1 className="text-xl font-black uppercase tracking-tighter">{companySettings.name}</h1>
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest space-y-1">
              <p>{companySettings.address}</p>
              <p>Tel: {companySettings.phones[0]}</p>
              <p>{companySettings.email}</p>
            </div>
          </div>

          <div className="border-t border-b border-dashed border-gray-300 py-4 mb-6 space-y-1">
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span>Order ID:</span>
              <span>#{selectedOrder?.id.toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span>Date:</span>
              <span>{selectedOrder ? new Date(selectedOrder.date).toLocaleString() : ''}</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span>Cashier:</span>
              <span>Admin</span>
            </div>
          </div>

          <table className="w-full mb-6">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-[10px] font-bold uppercase py-2">Item</th>
                <th className="text-right text-[10px] font-bold uppercase py-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {selectedOrder?.items?.map((item, i) => (
                <tr key={i}>
                  <td className="py-2">
                    <p className="text-xs font-bold text-gray-800">{item.name}</p>
                    <p className="text-[9px] text-gray-400 font-medium">{item.quantity} x {formatCurrency(item.price)}</p>
                  </td>
                  <td className="py-2 text-right text-xs font-black text-gray-900">
                    {formatCurrency(item.price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-2 border-t border-gray-200 pt-4 mb-8">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-gray-500 uppercase">Subtotal</span>
              <span>{formatCurrency(selectedOrder?.subtotal || (selectedOrder?.amount || 0) / 1.05)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold">
              <span className="text-gray-500 uppercase">Tax ({selectedOrder?.taxRate || 5}%)</span>
              <span>{formatCurrency(selectedOrder?.tax || (selectedOrder?.amount || 0) - ((selectedOrder?.amount || 0) / 1.05))}</span>
            </div>
            <div className="flex justify-between text-sm font-black pt-2 border-t-2 border-gray-900">
              <span className="uppercase tracking-widest">Total</span>
              <span className="text-primary">{formatCurrency(selectedOrder?.amount || 0)}</span>
            </div>
          </div>

          <div className="text-center space-y-4">
            <div className="flex justify-center">
              {selectedOrder && (
                <Barcode 
                  value={selectedOrder.id.toUpperCase()} 
                  width={1} 
                  height={40} 
                  fontSize={10}
                />
              )}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest">Thank you for your visit!</p>
          </div>
        </div>
      </PrintPortal>
    </div>
  );
}
