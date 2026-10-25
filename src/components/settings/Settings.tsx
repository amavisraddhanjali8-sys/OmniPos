import React, { useState, useRef } from 'react';
import { Save, Plus, Trash2, Building2, Landmark, Phone, Globe, Mail, Image as ImageIcon, Upload, FileText, Tag, Download, Archive } from 'lucide-react';
import { CompanySettings, BankDetail, TermAndCondition } from '../../types';
import { INITIAL_SETTINGS } from '../../constants';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useNotifications } from '../../context/NotificationContext';
import { translations, Language } from '../../i18n';

interface SettingsProps {
  settings: CompanySettings;
  onUpdateSettings: (settings: CompanySettings) => void;
  allData?: {
    products: any[];
    orders: any[];
    transactions: any[];
    quotations: any[];
    invoices: any[];
    expenses: any[];
    clients: any[];
    suppliers: any[];
  };
  language?: Language;
}

export default function Settings({ settings, onUpdateSettings, allData, language = 'en' }: SettingsProps) {
  const { addNotification } = useNotifications();
  const t = translations[language];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleSaveSettings = () => {
    addNotification({
      title: 'Settings Saved',
      message: 'Business settings have been updated successfully.',
      type: 'success',
      category: 'system'
    });
  };

  const handleBulkExport = async () => {
    if (!allData) return;
    setIsExporting(true);
    try {
      const zip = new JSZip();
      const timestamp = new Date().toISOString().split('T')[0];
      const folder = zip.folder(`business_data_backup_${timestamp}`);

      if (folder) {
        // Add JSON data
        folder.file('products.json', JSON.stringify(allData.products, null, 2));
        folder.file('orders.json', JSON.stringify(allData.orders, null, 2));
        folder.file('transactions.json', JSON.stringify(allData.transactions, null, 2));
        folder.file('quotations.json', JSON.stringify(allData.quotations, null, 2));
        folder.file('invoices.json', JSON.stringify(allData.invoices, null, 2));
        folder.file('expenses.json', JSON.stringify(allData.expenses, null, 2));
        folder.file('clients.json', JSON.stringify(allData.clients, null, 2));
        folder.file('suppliers.json', JSON.stringify(allData.suppliers, null, 2));
        folder.file('company_settings.json', JSON.stringify(settings, null, 2));

        // Create a summary text file
        const summary = `
BUSINESS DATA EXPORT SUMMARY
Generated on: ${new Date().toLocaleString()}
Company: ${settings.name}

DATA COUNTS:
- Products: ${allData.products.length}
- Orders: ${allData.orders.length}
- Transactions: ${allData.transactions.length}
- Quotations: ${allData.quotations.length}
- Invoices: ${allData.invoices.length}
- Expenses: ${allData.expenses.length}
- Clients: ${allData.clients.length}
- Suppliers: ${allData.suppliers.length}
        `;
        folder.file('summary.txt', summary);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `full_backup_${settings.name.replace(/\s+/g, '_').toLowerCase()}_${timestamp}.zip`);
      addNotification({
        title: 'Export Successful',
        message: 'Bulk data export has been completed successfully.',
        type: 'success',
        category: 'system'
      });
    } catch (error) {
      console.error('Export failed:', error);
      addNotification({
        title: 'Export Failed',
        message: 'Failed to generate bulk data export. Please try again.',
        type: 'error',
        category: 'system'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateSettings({ ...settings, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const addPhone = () => {
    onUpdateSettings({ ...settings, phones: [...settings.phones, ''] });
  };

  const updatePhone = (index: number, value: string) => {
    const newPhones = [...settings.phones];
    newPhones[index] = value;
    onUpdateSettings({ ...settings, phones: newPhones });
  };

  const removePhone = (index: number) => {
    onUpdateSettings({ ...settings, phones: settings.phones.filter((_, i) => i !== index) });
  };

  const addBank = () => {
    const newBank: BankDetail = {
      id: Date.now().toString(),
      bankName: '',
      accountNumber: '',
      branch: '',
      accountHolder: ''
    };
    onUpdateSettings({ ...settings, bankDetails: [...settings.bankDetails, newBank] });
  };

  const updateBank = (index: number, field: keyof BankDetail, value: string) => {
    const newBanks = [...settings.bankDetails];
    newBanks[index] = { ...newBanks[index], [field]: value };
    onUpdateSettings({ ...settings, bankDetails: newBanks });
  };

  const removeBank = (index: number) => {
    onUpdateSettings({ ...settings, bankDetails: settings.bankDetails.filter((_, i) => i !== index) });
  };

  const addTerm = () => {
    const newTerm: TermAndCondition = {
      id: `term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: ''
    };
    onUpdateSettings({ ...settings, terms: [...(settings.terms || []), newTerm] });
  };

  const updateTerm = (index: number, text: string) => {
    const newTerms = [...settings.terms];
    newTerms[index] = { ...newTerms[index], text };
    onUpdateSettings({ ...settings, terms: newTerms });
  };

  const removeTerm = (index: number) => {
    onUpdateSettings({ ...settings, terms: settings.terms.filter((_, i) => i !== index) });
  };

  const addExpenseCategory = () => {
    onUpdateSettings({ ...settings, expenseCategories: [...settings.expenseCategories, 'New Category'] });
  };

  const updateExpenseCategory = (index: number, value: string) => {
    const newCategories = [...settings.expenseCategories];
    newCategories[index] = value;
    onUpdateSettings({ ...settings, expenseCategories: newCategories });
  };

  const removeExpenseCategory = (index: number) => {
    onUpdateSettings({ ...settings, expenseCategories: settings.expenseCategories.filter((_, i) => i !== index) });
  };

  return (
    <div className="flex-1 bg-gray-50 p-4 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Business Settings</h1>
            <p className="text-xs text-gray-500">Manage your company profile, contact info, and bank details</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleBulkExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg font-bold text-xs hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
              ) : (
                <Archive size={16} />
              )}
              {isExporting ? 'Exporting...' : 'Bulk Export (ZIP)'}
            </button>
            <button 
              onClick={handleSaveSettings}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold text-xs hover:bg-primary/90 transition-all shadow-sm"
            >
              <Save size={16} />
              Save All Changes
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Company Profile */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-primary font-bold border-b border-gray-100 pb-3">
              <Building2 size={18} />
              <h3>Company Profile</h3>
            </div>
            
            <div className="space-y-4">
              {/* Logo Section */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="w-16 h-16 bg-white rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden relative group">
                  {settings.logo ? (
                    <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="text-gray-300" size={24} />
                  )}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                  >
                    <Upload size={16} />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleLogoUpload} 
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Company Logo</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={settings.logo}
                      onChange={e => onUpdateSettings({...settings, logo: e.target.value})}
                      placeholder="https://..."
                      className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary"
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50"
                    >
                      Browse
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Company Name</label>
                <input 
                  type="text" 
                  value={settings.name}
                  onChange={e => onUpdateSettings({...settings, name: e.target.value})}
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Address</label>
                <textarea 
                  value={settings.address}
                  onChange={e => onUpdateSettings({...settings, address: e.target.value})}
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                    <Mail size={10} /> Email
                  </label>
                  <input 
                    type="email" 
                    value={settings.email}
                    onChange={e => onUpdateSettings({...settings, email: e.target.value})}
                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                    <Globe size={10} /> Website
                  </label>
                  <input 
                    type="text" 
                    value={settings.website}
                    onChange={e => onUpdateSettings({...settings, website: e.target.value})}
                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Currency</label>
                  <input 
                    type="text" 
                    value={settings.currency}
                    onChange={e => onUpdateSettings({...settings, currency: e.target.value})}
                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Tax ID</label>
                  <input 
                    type="text" 
                    value={settings.taxId || ''}
                    onChange={e => onUpdateSettings({...settings, taxId: e.target.value})}
                    placeholder="SV-123..."
                    className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase text-primary">Default Tax (%)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={settings.defaultTaxRate}
                    onChange={e => onUpdateSettings({...settings, defaultTaxRate: Number(e.target.value)})}
                    className="w-full px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-lg text-xs font-bold text-primary focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Numbers */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Phone size={18} />
                <h3>Contact Numbers</h3>
              </div>
              <button 
                onClick={addPhone}
                className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {settings.phones.map((phone, index) => (
                <div key={index} className="flex gap-2 group">
                  <input 
                    type="text" 
                    value={phone}
                    onChange={e => updatePhone(index, e.target.value)}
                    placeholder="Phone number..."
                    className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary"
                  />
                  <button 
                    onClick={() => removePhone(index)}
                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {settings.phones.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-4">No phone numbers added</p>
              )}
            </div>
          </div>

          {/* Bank Details */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Landmark size={18} />
                <h3>Bank Accounts</h3>
              </div>
              <button 
                onClick={addBank}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all text-xs font-bold"
              >
                <Plus size={16} />
                Add Bank
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {settings.bankDetails.map((bank, index) => (
                <div key={bank.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 relative group">
                  <button 
                    onClick={() => removeBank(index)}
                    className="absolute top-4 right-4 p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Bank Name</label>
                      <input 
                        type="text" 
                        value={bank.bankName}
                        onChange={e => updateBank(index, 'bankName', e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Account Holder</label>
                      <input 
                        type="text" 
                        value={bank.accountHolder}
                        onChange={e => updateBank(index, 'accountHolder', e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Account Number</label>
                      <input 
                        type="text" 
                        value={bank.accountNumber}
                        onChange={e => updateBank(index, 'accountNumber', e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Branch</label>
                      <input 
                        type="text" 
                        value={bank.branch}
                        onChange={e => updateBank(index, 'branch', e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {settings.bankDetails.length === 0 && (
                <div className="md:col-span-2 text-center text-xs text-gray-400 py-8 border-2 border-dashed border-gray-100 rounded-2xl">
                  No bank accounts configured
                </div>
              )}
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-primary font-bold">
                <FileText size={18} />
                <h3>Terms & Conditions</h3>
              </div>
              <button 
                type="button"
                onClick={addTerm}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all text-xs font-bold"
              >
                <Plus size={16} />
                Add Term
              </button>
            </div>
            <div className="space-y-3">
              {settings.terms.map((term, index) => (
                <div key={term.id} className="flex gap-2 group">
                  <textarea 
                    value={term.text}
                    onChange={e => updateTerm(index, e.target.value)}
                    placeholder="Enter term or condition..."
                    className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary h-12"
                  />
                  <button 
                    type="button"
                    onClick={() => removeTerm(index)}
                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {settings.terms.length === 0 && (
                <div className="text-center text-xs text-gray-400 py-8 border-2 border-dashed border-gray-100 rounded-2xl">
                  No terms or conditions added
                </div>
              )}
            </div>
          </div>

          {/* Expense Categories */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Tag size={18} />
                <h3>Expense Categories</h3>
              </div>
              <button 
                onClick={addExpenseCategory}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all text-xs font-bold"
              >
                <Plus size={16} />
                Add Category
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {settings.expenseCategories.map((category, index) => (
                <div key={index} className="flex gap-2 group bg-gray-50 p-2 rounded-xl border border-gray-100">
                  <input 
                    type="text" 
                    value={category}
                    onChange={e => updateExpenseCategory(index, e.target.value)}
                    placeholder="Category name..."
                    className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-primary"
                  />
                  <button 
                    onClick={() => removeExpenseCategory(index)}
                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {settings.expenseCategories.length === 0 && (
                <div className="col-span-full text-center text-xs text-gray-400 py-8 border-2 border-dashed border-gray-100 rounded-2xl">
                  No expense categories configured
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
