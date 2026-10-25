import React, { useState, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, User, Upload, AlertCircle, Receipt, X, DollarSign } from 'lucide-react';
import { Client, Transaction, Invoice } from '../../types';
import { MOCK_CLIENTS } from '../../constants';
import { useNotifications } from '../../context/NotificationContext';
import { cn, formatCurrency } from '../../lib/utils';
import { Language, translations } from '../../i18n';
import ConfirmModal from '../layout/ConfirmModal';

interface ClientManagementProps {
  clients: Client[];
  onUpdateClients: (clients: Client[]) => void;
  onUpdateTransactions?: (transactions: Transaction[]) => void;
  onAddAuditLog?: (action: string, details: string, category: any, type?: any) => void;
  transactions?: Transaction[];
  invoices?: Invoice[];
  language?: Language;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function ClientManagement({ 
  clients, 
  onUpdateClients, 
  onUpdateTransactions,
  onAddAuditLog, 
  transactions = [], 
  invoices = [], 
  language = 'en',
  searchQuery,
  setSearchQuery
}: ClientManagementProps) {
  const t = translations[language];
  const { addNotification } = useNotifications();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [selectedClientForPayment, setSelectedClientForPayment] = useState<Client | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredClients = clients.filter(c => {
    const searchLower = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(searchLower) || 
           c.email.toLowerCase().includes(searchLower) ||
           c.phone.toLowerCase().includes(searchLower) ||
           c.city.toLowerCase().includes(searchLower) ||
           c.address.toLowerCase().includes(searchLower) ||
           c.id.toLowerCase().includes(searchLower);
  });

  const [formData, setFormData] = useState<Omit<Client, 'id'>>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    image: '',
    creditLimit: 0,
    isBlacklisted: false,
    notes: ''
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (editingClient) {
      onUpdateClients(clients.map(c => c.id === editingClient.id ? { ...formData, id: c.id } : c));
      onAddAuditLog?.('Client Updated', `Client updated: ${formData.name}`, 'clients');
      addNotification({
        title: 'Client Updated',
        message: `${formData.name}'s information has been updated successfully.`,
        type: 'success',
        category: 'system'
      });
    } else {
      onUpdateClients([...clients, { ...formData, id: Date.now().toString() }]);
      onAddAuditLog?.('Client Added', `New client added: ${formData.name}`, 'clients', 'success');
      addNotification({
        title: 'Client Added',
        message: `${formData.name} has been added to the client database.`,
        type: 'success',
        category: 'system'
      });
    }
    setIsModalOpen(false);
    setEditingClient(null);
    setFormData({ 
      name: '', 
      email: '', 
      phone: '', 
      address: '', 
      city: '', 
      image: '',
      creditLimit: 0,
      isBlacklisted: false,
      notes: ''
    });
  };

  const startEdit = (client: Client) => {
    setEditingClient(client);
    setFormData(client);
    setIsModalOpen(true);
  };

  const deleteClient = (id: string) => {
    const client = clients.find(c => c.id === id);
    if (!client) return;

    // Check for outstanding balance in transactions
    const clientTransactions = transactions.filter(t => t.clientId === id);
    const transactionBalance = clientTransactions.reduce((acc, t) => {
      // Ignore transactions linked to invoices to avoid double counting with invoiceBalance
      if (t.referenceId && invoices.some(inv => inv.id === t.referenceId)) {
        return acc;
      }

      const amount = t.amount || 0;
      const paid = t.amountPaid || 0;

      if (t.type === 'Sale') {
        return acc + (amount - paid);
      } else if (t.type === 'Income') {
        return acc - amount;
      } else if (t.type === 'Expense') {
        return acc + amount;
      }
      return acc;
    }, 0);

    // Check for outstanding balance in invoices
    const clientInvoices = invoices.filter(inv => inv.clientId === id);
    const invoiceBalance = clientInvoices.reduce((acc, inv) => acc + (inv.balance || 0), 0);

    const totalCredit = transactionBalance + invoiceBalance;

    if (Math.abs(totalCredit) > 0.01) {
      addNotification({
        title: t.cannotDeleteClient,
        message: `${client.name} ${t.settleBalanceFirst} (${formatCurrency(totalCredit)})`,
        type: 'error',
        category: 'system'
      });
      return;
    }

    setClientToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!clientToDelete) return;
    const client = clients.find(c => c.id === clientToDelete);
    if (!client) return;

    onUpdateClients(clients.filter(c => c.id !== clientToDelete));
    onAddAuditLog?.('Client Deleted', `Client removed: ${client.name}`, 'clients', 'warning');
    addNotification({
      title: t.delete,
      message: `${client.name} has been removed.`,
      type: 'warning',
      category: 'system'
    });
    setIsDeleteConfirmOpen(false);
    setClientToDelete(null);
  };

  const calculateClientBalance = (clientId: string) => {
    const clientTransactions = transactions.filter(t => t.clientId === clientId);
    const transactionBalance = clientTransactions.reduce((acc, t) => {
      // Ignore transactions linked to invoices to avoid double counting with invoiceBalance
      if (t.referenceId && invoices.some(inv => inv.id === t.referenceId)) {
        return acc;
      }

      const amount = t.amount || 0;
      const paid = t.amountPaid || 0;

      if (t.type === 'Sale') {
        return acc + (amount - paid);
      } else if (t.type === 'Income') {
        // If it's a direct income (payment), it reduces the debt
        return acc - amount;
      } else if (t.type === 'Expense') {
        return acc + amount;
      }
      return acc;
    }, 0);

    const clientInvoices = invoices.filter(inv => inv.clientId === clientId);
    const invoiceBalance = clientInvoices.reduce((acc, inv) => acc + (inv.balance || 0), 0);

    return transactionBalance + invoiceBalance;
  };

  const handleRecordPayment = () => {
    if (!selectedClientForPayment || !paymentAmount) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    const paymentTransaction: Transaction = {
      id: 'PAY' + Date.now(),
      type: 'Income',
      category: 'Client Payment',
      amount: amount,
      date: new Date().toISOString(),
      description: `Credit Payment from ${selectedClientForPayment.name}`,
      paymentMethod: paymentMethod,
      status: 'Completed',
      clientId: selectedClientForPayment.id,
      clientName: selectedClientForPayment.name
    };

    if (onUpdateTransactions) {
      onUpdateTransactions([paymentTransaction, ...transactions]);
      onAddAuditLog?.('Payment Recorded', `Payment of ${formatCurrency(amount)} recorded for ${selectedClientForPayment.name}`, 'clients', 'success');
      addNotification({
        title: 'Payment Recorded',
        message: `Payment of ${formatCurrency(amount)} has been recorded for ${selectedClientForPayment.name}.`,
        type: 'success',
        category: 'system'
      });
      setIsPaymentModalOpen(false);
      setSelectedClientForPayment(null);
      setPaymentAmount('');
    } else {
      addNotification({
        title: 'Error',
        message: 'Transaction update function not available.',
        type: 'error',
        category: 'system'
      });
    }
  };

  return (
    <div className="flex-1 bg-gray-50 p-4 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">{t.clientManagement}</h1>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-xs hover:bg-primary/90 transition-all shadow-sm"
          >
            <Plus size={16} />
            {t.addNewClient}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder={t.searchClients}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">{t.name}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Contact</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Address</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase">Credit Balance</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 overflow-hidden">
                        {client.image ? (
                          <img src={client.image} alt={client.name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={16} />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-xs">{client.name}</span>
                        {client.isBlacklisted && (
                          <span className="text-[8px] font-black bg-red-100 text-red-600 px-1 rounded uppercase tracking-widest w-fit">BLACKLISTED</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[11px] text-gray-600">{client.email}</div>
                    <div className="text-[10px] text-gray-400">{client.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[11px] text-gray-600 truncate max-w-xs">{client.address}</div>
                    <div className="text-[10px] text-gray-400">{client.city}</div>
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const totalCredit = calculateClientBalance(client.id);
                      const hasBadDebt = invoices.some(inv => inv.clientId === client.id && inv.isBadDebt);
                      
                      return (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-xs font-bold",
                              totalCredit > 0.01 ? "text-red-500" : totalCredit < -0.01 ? "text-green-500" : "text-gray-400"
                            )}>
                              {formatCurrency(totalCredit)}
                            </span>
                            {(totalCredit > (client.creditLimit || 0) && totalCredit > 0.01) && (
                              <span className="text-[8px] font-black bg-amber-100 text-amber-600 px-1 rounded uppercase tracking-widest">OVER LIMIT</span>
                            )}
                          </div>
                          {hasBadDebt && (
                            <div className="flex items-center gap-1 text-red-600 animate-pulse">
                              <AlertCircle size={10} />
                              <span className="text-[8px] font-black uppercase tracking-widest">BAD DEBT ALERT</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => {
                          setSelectedClientForPayment(client);
                          setPaymentAmount('');
                          setIsPaymentModalOpen(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Record Payment"
                      >
                        <Receipt size={14} />
                      </button>
                      <button 
                        onClick={() => startEdit(client)}
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => deleteClient(client.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold">{editingClient ? 'Edit Client' : 'Add Client'}</h2>
              <button onClick={() => { setIsModalOpen(false); setEditingClient(null); setFormData({ name: '', email: '', phone: '', address: '', city: '', image: '' }); }} className="text-gray-400 hover:text-gray-600">
                <Plus className="rotate-45" size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-center mb-4">
                <div className="relative group">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 overflow-hidden border-2 border-gray-100 group-hover:border-primary transition-all">
                    {formData.image ? (
                      <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} />
                    )}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                  >
                    <Upload size={12} />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Full Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Email</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Phone</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Address</label>
                <input 
                  type="text" 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">City/State/Zip</label>
                <input 
                  type="text" 
                  value={formData.city}
                  onChange={e => setFormData({...formData, city: e.target.value})}
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Credit Limit</label>
                  <input 
                    type="number" 
                    value={formData.creditLimit}
                    onChange={e => setFormData({...formData, creditLimit: Number(e.target.value)})}
                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex items-end pb-1.5">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={formData.isBlacklisted}
                      onChange={e => setFormData({...formData, isBlacklisted: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-[10px] font-bold text-gray-400 uppercase group-hover:text-red-500 transition-colors">Blacklist Client</span>
                  </label>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Notes / Internal Comments</label>
                <textarea 
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary min-h-[60px]"
                  placeholder="Internal notes about this client..."
                />
              </div>
              <button 
                onClick={handleSave}
                className="w-full py-2.5 bg-primary text-white rounded-xl font-bold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition-all mt-4"
              >
                Save Client
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Payment Modal */}
      {isPaymentModalOpen && selectedClientForPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border border-white/20 animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                  <Receipt size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Record Payment</h2>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{selectedClientForPayment.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="text-amber-500 mt-0.5" size={16} />
                <div>
                  <p className="text-xs font-bold text-amber-900 uppercase tracking-tight">Current Balance</p>
                  <p className="text-lg font-black text-amber-600">{formatCurrency(calculateClientBalance(selectedClientForPayment.id))}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payment Amount</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="number" 
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Cash', 'Card', 'Bank'].map(method => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={cn(
                          "py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border-2",
                          paymentMethod === method 
                            ? "bg-primary/10 border-primary text-primary" 
                            : "bg-gray-50 border-transparent text-gray-400 hover:bg-gray-100"
                        )}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRecordPayment}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:shadow-none"
                >
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => { setIsDeleteConfirmOpen(false); setClientToDelete(null); }}
        onConfirm={confirmDelete}
        title={t.confirmDelete}
        message={`${t.confirmDelete} ${clients.find(c => c.id === clientToDelete)?.name}?`}
        type="danger"
      />
    </div>
  );
}
