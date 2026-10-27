import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  User, 
  X, 
  Save, 
  Truck, 
  Tag, 
  AlertCircle, 
  Receipt, 
  DollarSign 
} from 'lucide-react';
import { Supplier, Transaction, BadDebtRecord } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '../../context/NotificationContext';
import { cn, formatCurrency } from '../../lib/utils';
import { Language, translations } from '../../i18n';
import ConfirmModal from '../layout/ConfirmModal';

interface SupplierManagementProps {
  suppliers: Supplier[];
  onUpdateSuppliers: (suppliers: Supplier[]) => void;
  onUpdateTransactions?: (transactions: Transaction[]) => void;
  onRecordSupplierWriteOff?: (record: BadDebtRecord) => void;
  onAddAuditLog?: (action: string, details: string, category: any, type?: any) => void;
  transactions?: Transaction[];
  language?: Language;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function SupplierManagement({ 
  suppliers, 
  onUpdateSuppliers, 
  onUpdateTransactions,
  onRecordSupplierWriteOff,
  onAddAuditLog, 
  transactions = [], 
  language = 'en',
  searchQuery,
  setSearchQuery
}: SupplierManagementProps) {
  const t = translations[language];
  const { addNotification } = useNotifications();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);
  const [blockedDeleteSupplier, setBlockedDeleteSupplier] = useState<{ supplier: Supplier; payable: number } | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isWriteOffModalOpen, setIsWriteOffModalOpen] = useState(false);
  const [selectedSupplierForPayment, setSelectedSupplierForPayment] = useState<Supplier | null>(null);
  const [selectedSupplierForWriteOff, setSelectedSupplierForWriteOff] = useState<Supplier | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [writeOffAmount, setWriteOffAmount] = useState('');
  const [writeOffReason, setWriteOffReason] = useState('');
  const [writeOffNotes, setWriteOffNotes] = useState('');
  const [writeOffDate, setWriteOffDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const handleRecordPayment = () => {
    if (!selectedSupplierForPayment || !paymentAmount) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    const paymentTransaction: Transaction = {
      id: 'PAY-SUP-' + Date.now(),
      type: 'Expense',
      category: 'Supplier Payment',
      amount: amount,
      date: new Date().toISOString(),
      description: `Payment to Supplier: ${selectedSupplierForPayment.name}`,
      paymentMethod: paymentMethod,
      status: 'Completed',
      supplierId: selectedSupplierForPayment.id,
      supplierName: selectedSupplierForPayment.name
    };

    if (onUpdateTransactions) {
      onUpdateTransactions([paymentTransaction, ...transactions]);
      onAddAuditLog?.('Payment Recorded', `Payment of ${formatCurrency(amount)} recorded for ${selectedSupplierForPayment.name}`, 'suppliers', 'success');
      addNotification({
        title: 'Payment Recorded',
        message: `Payment of ${formatCurrency(amount)} has been recorded for ${selectedSupplierForPayment.name}.`,
        type: 'success',
        category: 'system'
      });
      setIsPaymentModalOpen(false);
      setSelectedSupplierForPayment(null);
      setPaymentAmount('');
    }
  };

  const filteredSuppliers = suppliers.filter(s => {
    const searchLower = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(searchLower) || 
           s.contactPerson.toLowerCase().includes(searchLower) ||
           s.category.toLowerCase().includes(searchLower) ||
           s.email.toLowerCase().includes(searchLower) ||
           s.phone.toLowerCase().includes(searchLower) ||
           s.id.toLowerCase().includes(searchLower);
  });

  const handleSaveSupplier = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const supplierData: Supplier = {
      id: editingSupplier?.id || Date.now().toString(),
      name: formData.get('name') as string,
      contactPerson: formData.get('contactPerson') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
      category: formData.get('category') as string,
      taxId: formData.get('taxId') as string,
    };

    if (editingSupplier) {
      onUpdateSuppliers(suppliers.map(s => s.id === editingSupplier.id ? supplierData : s));
      onAddAuditLog?.('Supplier Updated', `Supplier updated: ${supplierData.name}`, 'suppliers');
      addNotification({
        title: 'Supplier Updated',
        message: `${supplierData.name} details have been updated.`,
        type: 'success',
        category: 'system'
      });
    } else {
      onUpdateSuppliers([supplierData, ...suppliers]);
      onAddAuditLog?.('Supplier Added', `New supplier added: ${supplierData.name}`, 'suppliers', 'success');
      addNotification({
        title: 'Supplier Added',
        message: `${supplierData.name} has been added to your vendors.`,
        type: 'success',
        category: 'system'
      });
    }

    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const calculateSupplierPayable = (id: string) => {
    const supplierTransactions = transactions.filter(t => t.supplierId === id);
    return supplierTransactions.reduce((acc, t) => {
      const amount = t.amount || 0;
      const paid = t.amountPaid || 0;

      if (t.type === 'Purchase') {
        return acc + (amount - paid);
      } else if (t.type === 'Expense') {
        return acc - amount;
      } else if (t.type === 'Income') {
        return acc + amount;
      }
      return acc;
    }, 0);
  };

  const handleDeleteSupplier = (id: string) => {
    const supplier = suppliers.find(s => s.id === id);
    if (!supplier) return;

    const totalPayable = calculateSupplierPayable(id);

    // Strictly prevent deleting suppliers with due balances until cleared or written off
    if (Math.abs(totalPayable) > 0.01) {
      setBlockedDeleteSupplier({ supplier, payable: totalPayable });
      addNotification({
        title: 'Supplier Deletion Blocked',
        message: `Cannot delete ${supplier.name}. Outstanding payable balance of ${formatCurrency(totalPayable)} must be paid or written off first.`,
        type: 'error',
        category: 'system'
      });
      return;
    }

    setSupplierToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleOpenWriteOffModal = (supplier: Supplier, prefilledAmount?: number) => {
    const payable = prefilledAmount !== undefined ? prefilledAmount : calculateSupplierPayable(supplier.id);
    setSelectedSupplierForWriteOff(supplier);
    setWriteOffAmount(payable > 0 ? payable.toFixed(2) : '');
    setWriteOffReason('');
    setWriteOffNotes('');
    setWriteOffDate(new Date().toISOString().split('T')[0]);
    setIsWriteOffModalOpen(true);
  };

  const handleConfirmWriteOff = () => {
    if (!selectedSupplierForWriteOff) return;
    const amount = parseFloat(writeOffAmount);
    if (isNaN(amount) || amount <= 0) {
      addNotification({
        title: 'Invalid Amount',
        message: 'Please enter a valid write-off amount.',
        type: 'error',
        category: 'system'
      });
      return;
    }

    if (!writeOffReason.trim()) {
      addNotification({
        title: 'Reason Required',
        message: 'A documented reason is strictly required to record a supplier write-off.',
        type: 'warning',
        category: 'system'
      });
      return;
    }

    const badDebtRecord: BadDebtRecord = {
      id: 'WO-SUP-' + Date.now(),
      entityType: 'supplier',
      entityId: selectedSupplierForWriteOff.id,
      entityName: selectedSupplierForWriteOff.name,
      amount: amount,
      reason: writeOffReason.trim(),
      date: writeOffDate || new Date().toISOString(),
      notes: writeOffNotes.trim(),
      createdDate: new Date().toISOString()
    };

    // Create offsetting Expense transaction (or settlement entry) to clear payable balance
    const writeOffTransaction: Transaction = {
      id: 'TX-SUP-WO-' + Date.now(),
      type: 'Expense',
      category: 'Supplier Balance Write-Off',
      amount: amount,
      date: writeOffDate || new Date().toISOString(),
      description: `Payable Write-off / Dispute Settlement for ${selectedSupplierForWriteOff.name} [Reason: ${writeOffReason.trim()}]`,
      paymentMethod: 'Dispute / Write-Off Settlement',
      status: 'Completed',
      supplierId: selectedSupplierForWriteOff.id,
      supplierName: selectedSupplierForWriteOff.name
    };

    if (onUpdateTransactions) {
      onUpdateTransactions([writeOffTransaction, ...transactions]);
    }

    onRecordSupplierWriteOff?.(badDebtRecord);

    onAddAuditLog?.(
      'Supplier Balance Written Off',
      `Recorded payable write-off of ${formatCurrency(amount)} for ${selectedSupplierForWriteOff.name}. Reason: ${writeOffReason.trim()}`,
      'suppliers',
      'warning'
    );

    addNotification({
      title: 'Balance Written Off',
      message: `Successfully written off ${formatCurrency(amount)} payable for ${selectedSupplierForWriteOff.name}.`,
      type: 'success',
      category: 'accounting'
    });

    setIsWriteOffModalOpen(false);
    setSelectedSupplierForWriteOff(null);
    setBlockedDeleteSupplier(null);
  };

  const confirmDelete = () => {
    if (!supplierToDelete) return;
    const supplier = suppliers.find(s => s.id === supplierToDelete);
    if (!supplier) return;

    onUpdateSuppliers(suppliers.filter(s => s.id !== supplierToDelete));
    onAddAuditLog?.('Supplier Deleted', `Supplier removed: ${supplier.name}`, 'suppliers', 'warning');
    addNotification({
      title: t.delete,
      message: `${supplier.name} ${t.deletedSuccessfully}`,
      type: 'warning',
      category: 'system'
    });
    setIsDeleteConfirmOpen(false);
    setSupplierToDelete(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{t.supplierManagement}</h2>
          <p className="text-xs text-gray-500 font-medium">{t.manageVendors}</p>
        </div>
        <button 
          onClick={() => { setEditingSupplier(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
        >
          <Plus size={16} /> {t.addNewSupplier}
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder={t.searchSuppliers}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map(supplier => (
          <motion.div 
            layout
            key={supplier.id}
            className="bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden group"
          >
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                  <Truck size={24} />
                </div>
                <div className="flex gap-1.5 items-center">
                  <button 
                    onClick={() => { setSelectedSupplierForPayment(supplier); setIsPaymentModalOpen(true); }}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                    title="Record Payment"
                  >
                    <Receipt size={16} />
                  </button>
                  {calculateSupplierPayable(supplier.id) > 0.01 && (
                    <button 
                      onClick={() => handleOpenWriteOffModal(supplier)}
                      className="p-2 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-all"
                      title="Record Write-Off / Dispute Settlement"
                    >
                      <AlertCircle size={16} />
                    </button>
                  )}
                  <button 
                    onClick={() => { setEditingSupplier(supplier); setIsModalOpen(true); }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteSupplier(supplier.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">{supplier.name}</h3>
                <div className="flex items-center gap-1.5 text-primary font-bold mt-1">
                  <Tag size={12} />
                  <span className="text-[10px] uppercase tracking-widest">{supplier.category}</span>
                </div>
              </div>

              {(() => {
                const payable = calculateSupplierPayable(supplier.id);
                return (
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Payable Balance</span>
                    <span className={cn(
                      "text-xs font-black font-mono",
                      payable > 0.01 ? "text-amber-600" : "text-gray-400"
                    )}>
                      {formatCurrency(payable)}
                    </span>
                  </div>
                );
              })()}

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-3 text-gray-600">
                  <User size={14} className="text-gray-400" />
                  <span className="text-xs font-medium">{supplier.contactPerson}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail size={14} className="text-gray-400" />
                  <span className="text-xs font-medium">{supplier.email}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone size={14} className="text-gray-400" />
                  <span className="text-xs font-medium">{supplier.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin size={14} className="text-gray-400" />
                  <span className="text-xs font-medium line-clamp-1">{supplier.address}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
          <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Truck size={32} />
          </div>
          <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">No Suppliers Found</h3>
          <p className="text-sm text-gray-500 font-medium">Try adjusting your search or add a new supplier</p>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSaveSupplier}>
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                      <Truck size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                        {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
                      </h3>
                      <p className="text-xs text-gray-500 font-medium">Enter supplier information below</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Company Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        name="name"
                        required
                        defaultValue={editingSupplier?.name}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary transition-all"
                        placeholder="e.g. TechSupply Ltd"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact Person</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        name="contactPerson"
                        required
                        defaultValue={editingSupplier?.contactPerson}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary transition-all"
                        placeholder="e.g. Michael Chen"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          name="email"
                          type="email"
                          required
                          defaultValue={editingSupplier?.email}
                          className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary transition-all"
                          placeholder="sales@tech.com"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          name="phone"
                          required
                          defaultValue={editingSupplier?.phone}
                          className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary transition-all"
                          placeholder="+94..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                      <input 
                        name="category"
                        required
                        defaultValue={editingSupplier?.category}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary transition-all"
                        placeholder="e.g. Accessories"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tax ID (Optional)</label>
                      <input 
                        name="taxId"
                        defaultValue={editingSupplier?.taxId}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary transition-all"
                        placeholder="VAT-123..."
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-3 text-gray-400" size={16} />
                      <textarea 
                        name="address"
                        required
                        defaultValue={editingSupplier?.address}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary transition-all h-24"
                        placeholder="Full business address..."
                      />
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-gray-50/50 border-t border-gray-100">
                  <button 
                    type="submit"
                    className="w-full py-4 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all"
                  >
                    {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      {/* Payment Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPaymentModalOpen(false)}
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-primary/5 to-transparent">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Record Payment</h2>
                  <p className="text-sm font-bold text-gray-500 mt-1">Paying: {selectedSupplierForPayment?.name}</p>
                </div>
                <button 
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="p-3 hover:bg-gray-100 rounded-2xl transition-colors text-gray-400 hover:text-gray-900"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Amount</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</div>
                    <input 
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-lg font-black focus:outline-none focus:border-primary transition-all"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Method</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Cash', 'Bank Transfer', 'Card', 'Cheque'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={cn(
                          "py-3 px-4 rounded-2xl text-sm font-bold transition-all border-2",
                          paymentMethod === method 
                            ? "bg-primary border-primary text-white shadow-lg shadow-primary/25" 
                            : "bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200"
                        )}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleRecordPayment}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  Confirm Payment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Supplier Write-Off / Dispute Settlement Modal */}
      {isWriteOffModalOpen && selectedSupplierForWriteOff && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100">
            <div className="p-6 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-tight">Record Supplier Balance Write-Off</h2>
                  <p className="text-xs text-amber-100 font-medium">{selectedSupplierForWriteOff.name}</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsWriteOffModalOpen(false); setSelectedSupplierForWriteOff(null); }}
                className="p-1.5 hover:bg-white/20 rounded-xl transition-colors text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
                <AlertCircle className="text-amber-500 mt-0.5 shrink-0" size={16} />
                <div className="text-xs">
                  <span className="font-bold text-amber-900 block">Current Outstanding Payable:</span>
                  <span className="text-base font-black text-amber-600">
                    {formatCurrency(calculateSupplierPayable(selectedSupplierForWriteOff.id))}
                  </span>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Writing off an unpayable or disputed balance clears the vendor liability from the ledger and allows the supplier account to be deleted once zeroed.
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Write-Off Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="number"
                    step="0.01"
                    value={writeOffAmount}
                    onChange={e => setWriteOffAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Write-Off Reason <span className="text-red-500">* (Required)</span>
                </label>
                <input 
                  type="text"
                  value={writeOffReason}
                  onChange={e => setWriteOffReason(e.target.value)}
                  placeholder="e.g. Defective goods dispute waiver, Vendor ceased operations, Discount settlement"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    'Defective goods dispute waiver',
                    'Vendor ceased business / liquidated',
                    'Negotiated discount settlement',
                    'Mutual cancellation of balance'
                  ].map(reason => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setWriteOffReason(reason)}
                      className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-[10px] font-medium transition-colors"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</label>
                  <input 
                    type="date"
                    value={writeOffDate}
                    onChange={e => setWriteOffDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Notes / Ref</label>
                  <input 
                    type="text"
                    value={writeOffNotes}
                    onChange={e => setWriteOffNotes(e.target.value)}
                    placeholder="Optional details"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button 
                  onClick={() => { setIsWriteOffModalOpen(false); setSelectedSupplierForWriteOff(null); }}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmWriteOff}
                  disabled={!writeOffAmount || parseFloat(writeOffAmount) <= 0 || !writeOffReason.trim()}
                  className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-600/20 hover:bg-amber-700 transition-all disabled:opacity-50"
                >
                  Confirm Write-Off
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blocked Supplier Deletion Modal */}
      {blockedDeleteSupplier && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-red-100">
            <div className="p-6 bg-red-50 border-b border-red-100 flex items-start gap-4">
              <div className="p-3 bg-red-100 rounded-2xl text-red-600 shrink-0">
                <AlertCircle size={28} />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">Supplier Deletion Blocked</h3>
                <p className="text-xs text-gray-600 mt-1">
                  <span className="font-bold text-gray-900">{blockedDeleteSupplier.supplier.name}</span> has an active payable balance of{' '}
                  <span className="font-black text-red-600">{formatCurrency(blockedDeleteSupplier.payable)}</span>.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                By business rule, supplier accounts with outstanding payable balances <strong>cannot be deleted</strong> until the balance is either settled or written off with an input reason.
              </p>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => {
                    const s = blockedDeleteSupplier.supplier;
                    const pay = blockedDeleteSupplier.payable;
                    setBlockedDeleteSupplier(null);
                    handleOpenWriteOffModal(s, pay);
                  }}
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <AlertCircle size={14} />
                  Record Write-Off / Dispute Settlement
                </button>
                <button
                  onClick={() => setBlockedDeleteSupplier(null)}
                  className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Close & Keep Supplier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => { setIsDeleteConfirmOpen(false); setSupplierToDelete(null); }}
        onConfirm={confirmDelete}
        title={t.confirmDelete}
        message={`${t.confirmDelete} ${suppliers.find(s => s.id === supplierToDelete)?.name}?`}
        type="danger"
      />
    </div>
  );
}
