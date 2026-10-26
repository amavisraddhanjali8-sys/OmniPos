/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import TopBar from './components/layout/TopBar';
import ProductGrid from './components/pos/ProductGrid';
import Cart from './components/pos/Cart';
import CheckoutModal from './components/pos/CheckoutModal';
import QuotationSystem from './components/quotation/QuotationSystem';
import AccountingSystem from './components/accounting/AccountingSystem';
import Settings from './components/settings/Settings';
import ClientManagement from './components/customers/ClientManagement';
import InventorySystem from './components/inventory/InventorySystem';
import OrderPortal from './components/pos/OrderPortal';
import { Product, CartItem, Client, CompanySettings, Transaction, Quotation, Invoice, Expense, Supplier, AuditLog, LedgerAccount, LedgerEntry, JournalEntry } from './types';
import { PRODUCTS, MOCK_CLIENTS, INITIAL_SETTINGS, MOCK_TRANSACTIONS, MOCK_SUPPLIERS, MOCK_AUDIT_LOGS, INITIAL_ACCOUNTS } from './constants';
import { motion, AnimatePresence } from 'motion/react';
import { Barcode, AlertCircle, CheckCircle2, FileText, Receipt, DollarSign, Truck, Printer, X } from 'lucide-react';
import { cn, formatCurrency } from './lib/utils';
import InvoiceSystem from './components/invoice/InvoiceSystem';
import ExpenseSystem from './components/expense/ExpenseSystem';
import SupplierManagement from './components/suppliers/SupplierManagement';
import { translations, Language } from './i18n';
import VirtualKeyboard from './components/layout/VirtualKeyboard';
import Lobby from './components/layout/Lobby';
import { useNotifications } from './context/NotificationContext';
import SystemAuditLog from './components/layout/SystemAuditLog';
import ConfirmModal from './components/layout/ConfirmModal';

export default function App() {
  const { addNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState('lobby');
  const [language, setLanguage] = useState<Language>('en');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const t = translations[language];
  
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('omni_products');
      if (saved) {
        const parsed: Product[] = JSON.parse(saved);
        return parsed.map(p => {
          const defaultProd = PRODUCTS.find(dp => dp.id === p.id);
          if (p.image && p.image.includes('picsum.photos') && defaultProd?.image) {
            return { ...p, image: defaultProd.image };
          }
          return p;
        });
      }
      return PRODUCTS;
    } catch { return PRODUCTS; }
  });
  const [categories, setCategories] = useState<string[]>(['Reloads', 'Bills', 'Printing', 'Accessories', 'Books', 'Stationery']);
  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const saved = localStorage.getItem('omni_clients');
      return saved ? JSON.parse(saved) : MOCK_CLIENTS;
    } catch { return MOCK_CLIENTS; }
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    try {
      const saved = localStorage.getItem('omni_suppliers');
      return saved ? JSON.parse(saved) : MOCK_SUPPLIERS;
    } catch { return MOCK_SUPPLIERS; }
  });
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('omni_orders');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('omni_transactions');
      return saved ? JSON.parse(saved) : MOCK_TRANSACTIONS;
    } catch { return MOCK_TRANSACTIONS; }
  });
  const [quotations, setQuotations] = useState<Quotation[]>(() => {
    try {
      const saved = localStorage.getItem('omni_quotations');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const saved = localStorage.getItem('omni_invoices');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem('omni_expenses');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>(INITIAL_ACCOUNTS);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isPrinterSettingsOpen, setIsPrinterSettingsOpen] = useState(false);
  const [revisingOrderId, setRevisingOrderId] = useState<string | null>(null);
  const notifiedLowStock = useRef<Set<string>>(new Set());
  const [checkoutDetails, setCheckoutDetails] = useState<{
    subtotal: number;
    tax: number;
    taxRate: number;
    discount: number;
    discountRate: number;
    freight: number;
    otherCharges: number;
    otherChargesList: { id: string; description: string; amount: number; }[];
    total: number;
  } | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(() => {
    try {
      const saved = localStorage.getItem('omni_settings');
      return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
    } catch { return INITIAL_SETTINGS; }
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS);
  const [orderToRevise, setOrderToRevise] = useState<Transaction | null>(null);
  const [orderToDeleteId, setOrderToDeleteId] = useState<string | null>(null);
  const [isClearOrdersConfirmOpen, setIsClearOrdersConfirmOpen] = useState(false);
  const lastFocusedElement = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Persistence side effects
  useEffect(() => {
    try { localStorage.setItem('omni_clients', JSON.stringify(clients)); } catch {}
  }, [clients]);

  useEffect(() => {
    try { localStorage.setItem('omni_products', JSON.stringify(products)); } catch {}
  }, [products]);

  useEffect(() => {
    try { localStorage.setItem('omni_quotations', JSON.stringify(quotations)); } catch {}
  }, [quotations]);

  useEffect(() => {
    try { localStorage.setItem('omni_invoices', JSON.stringify(invoices)); } catch {}
  }, [invoices]);

  useEffect(() => {
    try { localStorage.setItem('omni_transactions', JSON.stringify(transactions)); } catch {}
  }, [transactions]);

  useEffect(() => {
    try { localStorage.setItem('omni_expenses', JSON.stringify(expenses)); } catch {}
  }, [expenses]);

  useEffect(() => {
    try { localStorage.setItem('omni_orders', JSON.stringify(orders)); } catch {}
  }, [orders]);

  useEffect(() => {
    try { localStorage.setItem('omni_suppliers', JSON.stringify(suppliers)); } catch {}
  }, [suppliers]);

  useEffect(() => {
    try { localStorage.setItem('omni_settings', JSON.stringify(companySettings)); } catch {}
  }, [companySettings]);

  const addAuditLog = (action: string, details: string, category: AuditLog['category'], type: AuditLog['type'] = 'info') => {
    const newLog: AuditLog = {
      id: Date.now().toString(),
      userId: 'u1',
      userName: 'Admin User',
      action,
      details,
      category,
      type,
      date: new Date().toISOString()
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const recordAccountingEntry = (
    description: string,
    debits: { accountId: string; amount: number }[],
    credits: { accountId: string; amount: number }[],
    referenceId?: string
  ) => {
    const date = new Date().toISOString();
    const journalId = `JE-${Date.now()}`;
    
    const newEntries: LedgerEntry[] = [];
    
    // Process Debits
    debits.forEach(d => {
      const account = ledgerAccounts.find(a => a.id === d.accountId);
      if (account) {
        newEntries.push({
          id: `LE-${Math.random().toString(36).substr(2, 9)}`,
          date,
          accountId: account.id,
          accountName: account.name,
          description,
          debit: d.amount,
          credit: 0,
          referenceId,
          transactionId: journalId
        });
      }
    });

    // Process Credits
    credits.forEach(c => {
      const account = ledgerAccounts.find(a => a.id === c.accountId);
      if (account) {
        newEntries.push({
          id: `LE-${Math.random().toString(36).substr(2, 9)}`,
          date,
          accountId: account.id,
          accountName: account.name,
          description,
          debit: 0,
          credit: c.amount,
          referenceId,
          transactionId: journalId
        });
      }
    });

    setLedgerEntries(prev => [...newEntries, ...prev]);
    
    // Update Account Balances
    setLedgerAccounts(prev => prev.map(acc => {
      const accDebits = debits.filter(d => d.accountId === acc.id).reduce((sum, d) => sum + d.amount, 0);
      const accCredits = credits.filter(c => c.accountId === acc.id).reduce((sum, c) => sum + c.amount, 0);
      
      let newBalance = acc.balance;
      // Asset/Expense: Debit increases, Credit decreases
      if (acc.type === 'Asset' || acc.type === 'Expense') {
        newBalance += (accDebits - accCredits);
      } 
      // Liability/Equity/Revenue: Credit increases, Debit decreases
      else {
        newBalance += (accCredits - accDebits);
      }
      
      return { ...acc, balance: newBalance };
    }));
  };

  // Keyboard logic
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        lastFocusedElement.current = target as HTMLInputElement | HTMLTextAreaElement;
      }
    };

    const handleBlur = (e: FocusEvent) => {
      // We don't clear lastFocusedElement on blur immediately 
      // because the keyboard needs it to know where to type.
    };

    window.addEventListener('focus', handleFocus, true);
    window.addEventListener('blur', handleBlur, true);
    return () => {
      window.removeEventListener('focus', handleFocus, true);
      window.removeEventListener('blur', handleBlur, true);
    };
  }, []);

  // Inventory Low Stock Notifications
  useEffect(() => {
    products.forEach(product => {
      // If stock is below or equal to minStock and we haven't notified yet
      if (!product.isService && product.stock <= product.minStock && !notifiedLowStock.current.has(product.id)) {
        addNotification({
          title: 'Low Stock Alert',
          message: `${product.name} is low on stock (${product.stock} left). Minimum threshold is ${product.minStock}.`,
          type: 'warning',
          category: 'inventory'
        });
        notifiedLowStock.current.add(product.id);
      } 
      // Reset notification flag if stock is replenished or if it becomes a service
      else if ((product.stock > product.minStock || product.isService) && notifiedLowStock.current.has(product.id)) {
        notifiedLowStock.current.delete(product.id);
      }
    });
  }, [products]);

  // Barcode Scanner State
  const [scannerStatus, setScannerStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  const [scannerMessage, setScannerMessage] = useState<string | null>(null);
  const [printerSettings, setPrinterSettings] = useState({
    receiptPrinter: 'System Default',
    reportPrinter: 'System Default',
    isConnected: true,
    isDrawerConnected: true
  });
  const barcodeBuffer = useRef<string>('');
  const lastCharTime = useRef<number>(0);

  const triggerCashDrawer = () => {
    if (printerSettings.isDrawerConnected) {
      addNotification({
        title: 'Cash Drawer Opened',
        message: 'The cash drawer has been triggered and is now open.',
        type: 'success',
        category: 'hardware'
      });
      addAuditLog('Cash Drawer Opened', 'Manual or automatic trigger', 'system');
      
      // Simulated sound
      if ('speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance('Drawer opened');
        msg.rate = 1.5;
        window.speechSynthesis.speak(msg);
      }
      return true;
    } else {
      addNotification({
        title: 'Drawer Error',
        message: 'Cash drawer is not connected or offline.',
        type: 'error',
        category: 'hardware'
      });
      return false;
    }
  };

  // Bad Debt Monitoring
  useEffect(() => {
    const checkBadDebt = () => {
      const today = new Date();
      let badDebtFound = false;
      
      const updatedInvoices = invoices.map(inv => {
        if (inv.status === 'Overdue' && !inv.isBadDebt) {
          const dueDate = new Date(inv.dueDate);
          const diffTime = Math.abs(today.getTime() - dueDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // If more than 90 days overdue, mark as bad debt
          if (diffDays > 90) {
            badDebtFound = true;
            addNotification({
              title: 'Bad Debt Detected',
              message: `Invoice ${inv.invoiceNumber} for ${inv.clientName} is over 90 days overdue. Marking as potential bad debt.`,
              type: 'error',
              category: 'accounting'
            });
            
            // Record accounting entry for bad debt
            // Debit Bad Debt Expense, Credit Accounts Receivable
            recordAccountingEntry(
              `Bad Debt Provision: ${inv.invoiceNumber}`,
              [{ accountId: 'acc-expenses', amount: inv.balance }], // Simplified: using general expenses if bad debt account not found
              [{ accountId: 'acc-bank', amount: inv.balance }], // Simplified: reducing bank/cash expectation
              inv.id
            );
            
            return { ...inv, isBadDebt: true };
          }
        }
        return inv;
      });
      
      if (badDebtFound) {
        setInvoices(updatedInvoices);
      }
    };
    
    const interval = setInterval(checkBadDebt, 60000); // Check every minute for demo
    return () => clearInterval(interval);
  }, [invoices]);

  useEffect(() => {
    // Initial scanner ready message
    setScannerStatus('idle');
    addNotification({
      title: 'Scanner Ready',
      message: 'Barcode Scanner System is now active and ready to scan.',
      type: 'info',
      category: 'system'
    });
    
    // Voice notification if supported
    if ('speechSynthesis' in window) {
      const msg = new SpeechSynthesisUtterance('Barcode scanner system is ready');
      msg.rate = 1.1;
      msg.pitch = 1;
      window.speechSynthesis.speak(msg);
    }

    setTimeout(() => setScannerMessage(null), 3000);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea unless it's the barcode scanner
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      // If user is typing in an input, we ignore the global barcode scanner
      // BUT if it's the barcode input in Cart.tsx, it handles its own logic
      if (isInput) {
        barcodeBuffer.current = '';
        return;
      }
      
      const currentTime = Date.now();
      const timeDiff = currentTime - lastCharTime.current;
      lastCharTime.current = currentTime;

      // Most scanners send characters very quickly (usually < 50ms)
      // If it's slow, it's likely a human typing, so we clear the buffer
      if (timeDiff > 50) {
        barcodeBuffer.current = '';
      }

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length > 0) {
          e.preventDefault();
          processBarcode(barcodeBuffer.current);
          barcodeBuffer.current = '';
        }
      } else if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products]);

  const processBarcode = (code: string) => {
    if (!code) return;
    
    const product = (products || []).find(p => p.barcode === code || p.id === code);
    
    if (product) {
      if (!product.isService && product.stock <= 0) {
        setScannerStatus('error');
        addNotification({
          title: 'Out of Stock',
          message: `${product.name} is out of stock. Cannot add to cart.`,
          type: 'error',
          category: 'inventory'
        });
        return;
      }

      // If product is already in cart, increment quantity, otherwise add new
      const existingItem = cartItems.find(item => item.id === product.id);
      if (existingItem) {
        updateQuantity(product.id, 1);
      } else {
        addToCart(product);
      }
      
      setScannerStatus('connected');
      
      // Voice notification
      if ('speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance(`${product.name} added`);
        msg.rate = 1.4;
        window.speechSynthesis.speak(msg);
      }

      // Clear status after 2 seconds
      setTimeout(() => setScannerStatus('idle'), 2000);
    } else {
      setScannerStatus('error');
      addNotification({
        title: 'Scan Error',
        message: `Barcode not found: ${code}.`,
        type: 'error',
        category: 'system'
      });
      
      // Voice notification
      if ('speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance(`Barcode not found`);
        msg.rate = 1.2;
        window.speechSynthesis.speak(msg);
      }

      setTimeout(() => setScannerStatus('idle'), 3000);
    }
  };

  const addToCart = (product: Product) => {
    if (!product.isService && product.stock <= 0) {
      addNotification({
        title: 'Out of Stock',
        message: `${product.name} is currently out of stock.`,
        type: 'error',
        category: 'inventory'
      });
      return;
    }

    const existing = cartItems.find(item => item.id === product.id);
    if (existing) {
      if (!product.isService && existing.quantity >= product.stock) {
        addNotification({
          title: 'Stock Limit Reached',
          message: `Cannot add more ${product.name}. Only ${product.stock} available.`,
          type: 'warning',
          category: 'inventory'
        });
        return;
      }
      setCartItems(prev => prev.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCartItems(prev => [...prev, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    const product = products.find(p => p.id === id);
    const item = cartItems.find(i => i.id === id);
    
    if (!item) return;

    const newQty = Math.max(1, item.quantity + delta);
    if (delta > 0 && product && !product.isService && newQty > product.stock) {
      addNotification({
        title: 'Stock Limit Reached',
        message: `Only ${product.stock} units of ${product.name} available.`,
        type: 'warning',
        category: 'inventory'
      });
      return;
    }

    setCartItems(prev => prev.map(item => 
      item.id === id ? { ...item, quantity: newQty } : item
    ));
  };

  const removeItem = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCartItems([]);
    setSelectedClient(null);
    setRevisingOrderId(null);
  };

  const handleReviseOrder = (order: Transaction) => {
    if (cartItems.length > 0) {
      setOrderToRevise(order);
      return;
    }
    
    executeReviseOrder(order);
  };

  const executeReviseOrder = (order: Transaction) => {
    setCartItems(order.items || []);
    setRevisingOrderId(order.id);
    setActiveTab('pos');
    addNotification({
      title: 'Revising Order',
      message: `Order #${order.id.slice(-6).toUpperCase()} loaded into cart for revision.`,
      type: 'info',
      category: 'sales'
    });
  };

  const handleConvertOrderToInvoice = (order: Transaction) => {
    const existingInvoice = invoices.find(inv => inv.orderId === order.id || inv.orderNumber === order.id.slice(-6).toUpperCase());
    if (existingInvoice) {
      addNotification({
        title: 'Invoice Exists',
        message: `Tax Invoice #${existingInvoice.invoiceNumber} already exists for POS Order #${order.id.slice(-6).toUpperCase()}.`,
        type: 'warning',
        category: 'sales'
      });
      setActiveTab('invoices');
      return;
    }

    const newInvoice: Invoice = {
      id: Date.now().toString(),
      invoiceNumber: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
      orderId: order.id,
      orderNumber: order.id.slice(-6).toUpperCase(),
      clientId: order.clientId || 'GUEST',
      clientName: order.clientName || 'Walk-in Customer',
      date: order.date || new Date().toISOString(),
      dueDate: order.date || new Date().toISOString(),
      items: order.items || [],
      subtotal: order.subtotal ?? (order.amount - (order.tax || 0) - (order.freight || 0) - (order.otherCharges || 0) + (order.discount || 0)),
      tax: order.tax || 0,
      taxRate: order.taxRate || 0,
      discount: order.discount || 0,
      discountRate: order.discountRate || 0,
      freight: order.freight || 0,
      otherCharges: order.otherCharges || 0,
      otherChargesList: order.otherChargesList || [],
      total: order.amount,
      status: 'Paid',
      amountPaid: order.amount,
      balance: 0,
      terms: ['Thank you for your business. Payment received in full.'],
      stockReduced: true
    };

    setInvoices(prev => [newInvoice, ...prev]);
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, invoiceId: newInvoice.id, invoiceNumber: newInvoice.invoiceNumber } : o));
    setTransactions(prev => prev.map(t => t.id === order.id ? { ...t, invoiceId: newInvoice.id, invoiceNumber: newInvoice.invoiceNumber } : t));

    addAuditLog('Invoice Generated from POS Order', `Invoice #${newInvoice.invoiceNumber} created for Order #${order.id.slice(-6).toUpperCase()}`, 'sales', 'success');
    addNotification({
      title: 'Tax Invoice Generated',
      message: `Tax Invoice #${newInvoice.invoiceNumber} created from POS Order #${order.id.slice(-6).toUpperCase()}.`,
      type: 'success',
      category: 'sales'
    });
    setActiveTab('invoices');
  };

  const handleCompleteOrder = (order: Transaction) => {
    // If we are revising, remove the old order and restore stock first
    if (revisingOrderId) {
      const oldOrder = orders.find(o => o.id === revisingOrderId);
      if (oldOrder && oldOrder.items) {
        setProducts(prevProducts => prevProducts.map(product => {
          const itemInOldOrder = oldOrder.items?.find(item => item.id === product.id);
          if (itemInOldOrder) {
            return { ...product, stock: product.stock + itemInOldOrder.quantity };
          }
          return product;
        }));
      }
      setOrders(prev => prev.filter(o => o.id !== revisingOrderId));
      setTransactions(prev => prev.filter(t => t.referenceId !== revisingOrderId));
      
      // Remove Ledger Entries for the revised order
      setLedgerEntries(prev => prev.filter(le => le.referenceId !== revisingOrderId));

      setRevisingOrderId(null);
    }

    const saleTransaction: Transaction = {
      ...order,
      category: 'Sales Revenue', // Default category for POS sales to sync with ledger
      stockReduced: true,
      referenceId: order.id
    };
    
    // Reduce stock for each item in the order
    if (order.items) {
      setProducts(prevProducts => prevProducts.map(product => {
        const itemInOrder = order.items?.find(item => item.id === product.id);
        if (itemInOrder) {
          return {
            ...product,
            stock: Math.max(0, product.stock - itemInOrder.quantity)
          };
        }
        return product;
      }));
    }

    setOrders(prev => [...prev, { ...order, stockReduced: true }]);
    setTransactions(prev => [saleTransaction, ...prev]);

    // RECORD ACCOUNTING ENTRY FOR SALE
    // Debit Cash (or AR if credit sale), Credit Sales Revenue
    const paymentMethod = order.paymentMethod || 'Cash';
    let debitAccount = 'acc-cash';
    if (paymentMethod === 'Card' || paymentMethod === 'Bank') {
      debitAccount = 'acc-bank';
    } else if (paymentMethod === 'Credit') {
      debitAccount = order.clientId ? `acc-client-${order.clientId}` : 'acc-ar';
    }
    
    // Calculate COGS (Cost of Goods Sold)
    const cogs = (order.items || []).reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);

    recordAccountingEntry(
      `Sale #${order.id.slice(-6).toUpperCase()}`,
      [{ accountId: debitAccount, amount: order.amount }],
      [{ accountId: 'acc-sales', amount: order.amount }],
      order.id
    );

    if (cogs > 0) {
      // Debit COGS, Credit Inventory
      recordAccountingEntry(
        `COGS for Sale #${order.id.slice(-6).toUpperCase()}`,
        [{ accountId: 'acc-cogs', amount: cogs }],
        [{ accountId: 'acc-inventory', amount: cogs }],
        order.id
      );
    }

    addAuditLog('Order Completed', `Order #${order.id.substring(0, 8)} processed for ${formatCurrency(order.amount, companySettings.currency)}`, 'sales', 'success');
    
    // Trigger Hardware
    triggerCashDrawer();
    
    addNotification({
      title: 'Order Completed',
      message: `Order #${order.id.substring(0, 8)} has been processed successfully. Receipt printing...`,
      type: 'success',
      category: 'sales'
    });
    clearCart();
  };

  const handleDeleteOrder = (id: string) => {
    setOrderToDeleteId(id);
  };

  const executeDeleteOrder = (id: string) => {
    const orderToDelete = orders.find(o => o.id === id);
    if (orderToDelete) {
      // Restore stock if it was reduced
      if (orderToDelete.stockReduced && orderToDelete.items) {
        setProducts(prevProducts => prevProducts.map(product => {
          const itemInOrder = orderToDelete.items?.find(item => item.id === product.id);
          if (itemInOrder) {
            return {
              ...product,
              stock: product.stock + itemInOrder.quantity
            };
          }
          return product;
        }));
      }

      // Remove from orders and transactions
      setOrders(prev => prev.filter(o => o.id !== id));
      setTransactions(prev => prev.filter(t => t.referenceId !== id));
      
      // Remove Ledger Entries for the deleted order
      const entriesToRemove = ledgerEntries.filter(le => le.referenceId === id);
      setLedgerEntries(prev => prev.filter(le => le.referenceId !== id));

      // Update Account Balances (Reverse the entries)
      setLedgerAccounts(prev => prev.map(acc => {
        const accEntriesToRemove = entriesToRemove.filter(e => e.accountId === acc.id);
        if (accEntriesToRemove.length === 0) return acc;

        const totalDebit = accEntriesToRemove.reduce((sum, e) => sum + e.debit, 0);
        const totalCredit = accEntriesToRemove.reduce((sum, e) => sum + e.credit, 0);

        let newBalance = acc.balance;
        // Asset/Expense: Debit increases, Credit decreases -> Reverse: Debit decreases, Credit increases
        if (acc.type === 'Asset' || acc.type === 'Expense') {
          newBalance -= (totalDebit - totalCredit);
        } 
        // Liability/Equity/Revenue: Credit increases, Debit decreases -> Reverse: Credit decreases, Debit increases
        else {
          newBalance -= (totalCredit - totalDebit);
        }
        return { ...acc, balance: newBalance };
      }));

      addAuditLog('Order Deleted', `Order #${id.substring(0, 8)} deleted and stock restored`, 'sales', 'warning');
      addNotification({
        title: 'Order Deleted',
        message: `Order #${id.substring(0, 8)} has been deleted and stock restored.`,
        type: 'success',
        category: 'sales'
      });
    }
  };

  const handleUpdateInvoices = (newInvoices: Invoice[]) => {
    // Find what changed to adjust stock
    newInvoices.forEach(newInv => {
      const oldInv = invoices.find(i => i.id === newInv.id);
      
      // Case 1: Existing invoice was edited
      if (oldInv) {
        // If items changed and stock was already reduced, we need to adjust
        if (oldInv.stockReduced && JSON.stringify(oldInv.items) !== JSON.stringify(newInv.items)) {
          // Restore old stock
          if (oldInv.items) {
            setProducts(prevProducts => prevProducts.map(product => {
              const itemInOrder = oldInv.items.find(item => item.id === product.id);
              if (itemInOrder) {
                return { ...product, stock: product.stock + itemInOrder.quantity };
              }
              return product;
            }));
          }
          // Reduce new stock
          if (newInv.items) {
            setProducts(prevProducts => prevProducts.map(product => {
              const itemInOrder = newInv.items.find(item => item.id === product.id);
              if (itemInOrder) {
                return { ...product, stock: Math.max(0, product.stock - itemInOrder.quantity) };
              }
              return product;
            }));
          }
        }

        // Remove old ledger entries to re-record based on new state
        setLedgerEntries(prev => prev.filter(le => le.referenceId !== newInv.id));

        // If status changed from Paid to something else (except Cancelled which is handled below)
        if (oldInv.status === 'Paid' && newInv.status !== 'Paid' && newInv.status !== 'Cancelled' && oldInv.stockReduced) {
          if (oldInv.items) {
            setProducts(prevProducts => prevProducts.map(product => {
              const itemInOrder = oldInv.items.find(item => item.id === product.id);
              if (itemInOrder) {
                return { ...product, stock: product.stock + itemInOrder.quantity };
              }
              return product;
            }));
          }
          newInv.stockReduced = false;
        }

        // If status changed to Paid and stock wasn't reduced
        if (newInv.status === 'Paid' && !oldInv.stockReduced) {
          if (newInv.items) {
            setProducts(prevProducts => prevProducts.map(product => {
              const itemInOrder = newInv.items.find(item => item.id === product.id);
              if (itemInOrder) {
                return { ...product, stock: Math.max(0, product.stock - itemInOrder.quantity) };
              }
              return product;
            }));
          }
          newInv.stockReduced = true;
        }
        
        // If status changed to Cancelled and stock WAS reduced
        if (newInv.status === 'Cancelled' && oldInv.stockReduced) {
          if (newInv.items) {
            setProducts(prevProducts => prevProducts.map(product => {
              const itemInOrder = newInv.items.find(item => item.id === product.id);
              if (itemInOrder) {
                return { ...product, stock: product.stock + itemInOrder.quantity };
              }
              return product;
            }));
          }
          newInv.stockReduced = false;
          // Remove related transactions
          setTransactions(prev => prev.filter(t => t.referenceId !== newInv.id));
        }

        // Re-record accounting entries for the updated invoice (if not cancelled)
        if (newInv.status !== 'Cancelled') {
          if (newInv.status === 'Paid') {
            recordAccountingEntry(
              `Invoice #${newInv.invoiceNumber} Paid Sale`,
              [{ accountId: 'acc-cash', amount: newInv.total }],
              [{ accountId: 'acc-sales', amount: newInv.total }],
              newInv.id
            );
          } else {
            recordAccountingEntry(
              `Invoice #${newInv.invoiceNumber} Credit Sale`,
              [{ accountId: newInv.clientId ? `acc-client-${newInv.clientId}` : 'acc-ar', amount: newInv.total }],
              [{ accountId: 'acc-sales', amount: newInv.total }],
              newInv.id
            );
          }

          // Re-record COGS
          const cogs = (newInv.items || []).reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
          if (cogs > 0) {
            recordAccountingEntry(
              `COGS for Invoice #${newInv.invoiceNumber}`,
              [{ accountId: 'acc-cogs', amount: cogs }],
              [{ accountId: 'acc-inventory', amount: cogs }],
              newInv.id
            );
          }
        }
      } else {
        // Case 2: New invoice created
        if (newInv.status === 'Paid') {
          if (newInv.items) {
            setProducts(prevProducts => prevProducts.map(product => {
              const itemInOrder = newInv.items.find(item => item.id === product.id);
              if (itemInOrder) {
                return { ...product, stock: Math.max(0, product.stock - itemInOrder.quantity) };
              }
              return product;
            }));
          }
          newInv.stockReduced = true;

          // Record Paid Sale
          recordAccountingEntry(
            `Invoice #${newInv.invoiceNumber} Paid`,
            [{ accountId: 'acc-cash', amount: newInv.total }],
            [{ accountId: 'acc-sales', amount: newInv.total }],
            newInv.id
          );
        } else if (newInv.status === 'Sent' || newInv.status === 'Draft' || newInv.status === 'Overdue') {
          // Record Credit Sale
          recordAccountingEntry(
            `Invoice #${newInv.invoiceNumber} Credit Sale`,
            [{ accountId: newInv.clientId ? `acc-client-${newInv.clientId}` : 'acc-ar', amount: newInv.total }],
            [{ accountId: 'acc-sales', amount: newInv.total }],
            newInv.id
          );
        }

        // Calculate COGS
        const cogs = (newInv.items || []).reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
        if (cogs > 0) {
          recordAccountingEntry(
            `COGS for Invoice #${newInv.invoiceNumber}`,
            [{ accountId: 'acc-cogs', amount: cogs }],
            [{ accountId: 'acc-inventory', amount: cogs }],
            newInv.id
          );
        }
      }
    });

    // Handle deletions
    invoices.forEach(oldInv => {
      const stillExists = newInvoices.find(i => i.id === oldInv.id);
      if (!stillExists) {
        if (oldInv.stockReduced && oldInv.items) {
          setProducts(prevProducts => prevProducts.map(product => {
            const itemInOrder = oldInv.items.find(item => item.id === product.id);
            if (itemInOrder) {
              return { ...product, stock: product.stock + itemInOrder.quantity };
            }
            return product;
          }));
        }
        // Remove related transactions
        setTransactions(prev => prev.filter(t => t.referenceId !== oldInv.id));
        
        // Remove Ledger Entries for the deleted invoice
        const entriesToRemove = ledgerEntries.filter(le => le.referenceId === oldInv.id);
        setLedgerEntries(prev => prev.filter(le => le.referenceId !== oldInv.id));

        // Update Account Balances (Reverse the entries)
        setLedgerAccounts(prev => prev.map(acc => {
          const accEntriesToRemove = entriesToRemove.filter(e => e.accountId === acc.id);
          if (accEntriesToRemove.length === 0) return acc;

          const totalDebit = accEntriesToRemove.reduce((sum, e) => sum + e.debit, 0);
          const totalCredit = accEntriesToRemove.reduce((sum, e) => sum + e.credit, 0);

          let newBalance = acc.balance;
          if (acc.type === 'Asset' || acc.type === 'Expense') {
            newBalance -= (totalDebit - totalCredit);
          } else {
            newBalance -= (totalCredit - totalDebit);
          }
          return { ...acc, balance: newBalance };
        }));
      }
    });

    setInvoices(newInvoices);
    addAuditLog('Invoices Updated', `Batch update of ${newInvoices.length} invoices`, 'sales');
  };

  const executeClearOrders = () => {
    // Restore stock for all orders that had stock reduced
    orders.forEach(order => {
      if (order.stockReduced && order.items) {
        setProducts(prevProducts => prevProducts.map(product => {
          const itemInOrder = order.items?.find(item => item.id === product.id);
          if (itemInOrder) {
            return {
              ...product,
              stock: product.stock + itemInOrder.quantity
            };
          }
          return product;
        }));
      }
    });

    setOrders([]);
    addAuditLog('Order History Cleared', 'All orders cleared and stock restored', 'sales', 'warning');
    addNotification({
      title: 'History Cleared',
      message: 'All order history has been cleared and stock restored.',
      type: 'success',
      category: 'sales'
    });
    // We don't clear transactions here as they are accounting records
  };

  const handleUpdateQuotations = (newQuotations: Quotation[]) => {
    setQuotations(newQuotations);
    addAuditLog('Quotations Updated', `Batch update of ${newQuotations.length} quotations`, 'sales');
    
    // Sync with invoices if they are linked to a quotation
    setInvoices(prevInvoices => prevInvoices.map(inv => {
      if (inv.quotationId) {
        const quote = newQuotations.find(q => q.id === inv.quotationId);
        if (quote) {
          return {
            ...inv,
            items: quote.items,
            subtotal: quote.subtotal,
            tax: quote.tax,
            taxRate: quote.taxRate,
            discount: quote.discount,
            discountRate: quote.discountRate,
            freight: quote.freight,
            otherCharges: quote.otherCharges,
            otherChargesList: quote.otherChargesList,
            total: quote.total,
            balance: Math.max(0, quote.total - inv.amountPaid),
            terms: quote.terms,
            bankId: quote.bankId
          };
        }
      }
      return inv;
    }));
  };

  useEffect(() => {
    // Ensure all clients and suppliers have ledger accounts
    setLedgerAccounts(prev => {
      const newAccounts: LedgerAccount[] = [];
      
      clients.forEach(client => {
        const accountId = `acc-client-${client.id}`;
        if (!prev.find(a => a.id === accountId)) {
          newAccounts.push({
            id: accountId,
            code: `1200-${client.id.slice(-4)}`,
            name: `AR: ${client.name}`,
            type: 'Asset',
            balance: 0,
            isSystem: false
          });
        }
      });

      suppliers.forEach(supplier => {
        const accountId = `acc-supplier-${supplier.id}`;
        if (!prev.find(a => a.id === accountId)) {
          newAccounts.push({
            id: accountId,
            code: `2000-${supplier.id.slice(-4)}`,
            name: `AP: ${supplier.name}`,
            type: 'Liability',
            balance: 0,
            isSystem: false
          });
        }
      });

      if (newAccounts.length > 0) {
        // We can't call addAuditLog inside setLedgerAccounts because it's a side effect
        // But we can return the new state
        return [...prev, ...newAccounts];
      }
      return prev;
    });
  }, [clients, suppliers]);

  const handleUpdateProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    addAuditLog('Inventory Updated', `Batch update of ${newProducts.length} products`, 'inventory');
  };

  const handleUpdateClients = (newClients: Client[]) => {
    setClients(newClients);
    if (selectedClient && !newClients.find(c => c.id === selectedClient.id)) {
      setSelectedClient(null);
    }
  };

  const handleUpdateSuppliers = (newSuppliers: Supplier[]) => {
    setSuppliers(newSuppliers);
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0) * 1.05;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <main className="flex-1 flex flex-col min-w-0 relative">
        <TopBar 
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setSearchQuery(''); // Clear search when switching tabs
          }}
          scannerStatus={scannerStatus} 
          scannerMessage={scannerMessage}
          language={language}
          setLanguage={setLanguage}
          isKeyboardOpen={isKeyboardOpen}
          setIsKeyboardOpen={setIsKeyboardOpen}
          onOpenPrinterSettings={() => setIsPrinterSettingsOpen(true)}
          printerSettings={printerSettings}
          lowStockCount={products.filter(p => !p.isService && p.stock <= p.minStock).length}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
        
        {activeTab === 'lobby' && (
          <Lobby 
            companySettings={companySettings} 
            setActiveTab={setActiveTab} 
            lowStockCount={products.filter(p => !p.isService && p.stock <= p.minStock).length}
            language={language}
          />
        )}
        
        {activeTab === 'pos' && (
          <div className="flex flex-1 overflow-hidden">
            <ProductGrid 
              products={products}
              onAddToCart={addToCart} 
              onUpdateProducts={handleUpdateProducts}
              suppliers={suppliers}
              language={language}
              categories={categories}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
            <Cart 
              items={cartItems} 
              selectedClient={selectedClient}
              clients={clients}
              products={products}
              scannerStatus={scannerStatus}
              companySettings={companySettings}
              language={language}
              revisingOrderId={revisingOrderId}
              onAddToCart={addToCart}
              onSelectClient={setSelectedClient}
              onUpdateClients={handleUpdateClients}
              updateQuantity={updateQuantity} 
              removeItem={removeItem}
              onTriggerDrawer={triggerCashDrawer}
              onCheckout={(details) => {
                setCheckoutDetails(details);
                setIsCheckoutOpen(true);
              }}
            />
          </div>
        )}

        {activeTab === 'quotation' && (
          <QuotationSystem 
            companySettings={companySettings} 
            onUpdateSettings={setCompanySettings}
            quotations={quotations}
            onUpdateQuotations={handleUpdateQuotations}
            onAddAuditLog={addAuditLog}
            invoices={invoices}
            onConvertToOrder={(quote) => {
              setCartItems(quote.items);
              const matchedClient = clients.find(c => c.id === quote.clientId);
              setSelectedClient(matchedClient || {
                id: quote.clientId || 'GUEST',
                name: quote.clientName,
                email: '',
                phone: '',
                address: '',
                city: '',
                creditLimit: 0,
                isBlacklisted: false
              });
              addAuditLog('Quotation Converted to POS', `Quotation #${quote.quoteNumber} items loaded into POS Cart for checkout`, 'sales', 'info');
              addNotification({
                title: 'Quotation Loaded into POS',
                message: `Quotation #${quote.quoteNumber} loaded into checkout cart.`,
                type: 'success',
                category: 'sales'
              });
              setActiveTab('pos');
            }}
            onConvertToInvoice={(quote) => {
              const existingInvoice = invoices.find(inv => inv.quotationId === quote.id || inv.quotationNumber === quote.quoteNumber);
              if (existingInvoice) {
                addNotification({
                  title: 'Invoice Exists',
                  message: `An invoice (${existingInvoice.invoiceNumber}) already exists for this quotation.`,
                  type: 'warning',
                  category: 'sales'
                });
                setActiveTab('invoices');
                return;
              }
              const newInvoice: Invoice = {
                id: Date.now().toString(),
                invoiceNumber: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
                quotationId: quote.id,
                quotationNumber: quote.quoteNumber,
                clientId: quote.clientId,
                clientName: quote.clientName,
                date: new Date().toISOString(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                items: quote.items,
                subtotal: quote.subtotal,
                tax: quote.tax,
                taxRate: quote.taxRate,
                discount: quote.discount,
                discountRate: quote.discountRate,
                freight: quote.freight,
                otherCharges: quote.otherCharges,
                otherChargesList: quote.otherChargesList,
                total: quote.total,
                status: 'Draft',
                amountPaid: 0,
                balance: quote.total,
                terms: quote.terms,
                bankId: quote.bankId
              };
              setInvoices([newInvoice, ...invoices]);
              addAuditLog('Invoice Generated from Quote', `Invoice #${newInvoice.invoiceNumber} created from Quote #${quote.quoteNumber}`, 'sales', 'success');
              addNotification({
                title: 'Invoice Generated',
                message: `Invoice #${newInvoice.invoiceNumber} created from Quotation #${quote.quoteNumber}.`,
                type: 'success',
                category: 'sales'
              });
              setActiveTab('invoices');
            }}
            language={language}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            clients={clients}
            onUpdateClients={handleUpdateClients}
            products={products}
          />
        )}
        {activeTab === 'invoices' && (
          <InvoiceSystem 
            companySettings={companySettings}
            invoices={invoices}
            onUpdateInvoices={handleUpdateInvoices}
            onUpdateTransactions={(newTrans) => {
              setTransactions(prev => [newTrans, ...prev]);
              // Record Accounting Entry for Invoice Payment
              if (newTrans.type === 'Sale' || newTrans.type === 'Income') {
                const clientAcc = newTrans.clientId ? `acc-client-${newTrans.clientId}` : 'acc-ar';
                recordAccountingEntry(
                  `Invoice Payment: ${newTrans.description}`,
                  [{ accountId: 'acc-cash', amount: newTrans.amount }],
                  [{ accountId: clientAcc, amount: newTrans.amount }],
                  newTrans.referenceId
                );
              }
            }}
            onAddAuditLog={addAuditLog}
            language={language}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            clients={clients}
            onUpdateClients={handleUpdateClients}
            products={products}
          />
        )}
        {activeTab === 'expenses' && (
          <ExpenseSystem 
            expenses={expenses}
            onUpdateExpenses={setExpenses}
            onUpdateTransactions={(newTrans) => {
              setTransactions(prev => [newTrans, ...prev]);
              // Record Accounting Entry for Expense
              const expenseAccountMap: Record<string, string> = {
                'Rent': 'acc-rent',
                'Utilities': 'acc-utilities',
                'Salaries': 'acc-salaries',
                'Marketing': 'acc-marketing',
                'Inventory Purchase': 'acc-inventory', // If it's a direct purchase
              };
              const debitAcc = expenseAccountMap[newTrans.category] || 'acc-other-expense';
              const creditAcc = newTrans.paymentMethod === 'Cash' ? 'acc-cash' : 
                               newTrans.paymentMethod === 'Bank' ? 'acc-bank' : 
                               newTrans.supplierId ? `acc-supplier-${newTrans.supplierId}` : 'acc-ap';
              
              recordAccountingEntry(
                newTrans.description,
                [{ accountId: debitAcc, amount: newTrans.amount }],
                [{ accountId: creditAcc, amount: newTrans.amount }],
                newTrans.id
              );
            }}
            companySettings={companySettings}
            suppliers={suppliers}
            onAddAuditLog={addAuditLog}
            language={language}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}
        {activeTab === 'accounting' && (
          <AccountingSystem 
            companySettings={companySettings} 
            transactions={transactions}
            onUpdateTransactions={setTransactions}
            ledgerAccounts={ledgerAccounts}
            ledgerEntries={ledgerEntries}
            onUpdateLedgerAccounts={setLedgerAccounts}
            onUpdateLedgerEntries={setLedgerEntries}
            onAddAuditLog={addAuditLog}
            language={language}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            quotations={quotations}
            invoices={invoices}
            orders={orders}
          />
        )}
        {activeTab === 'settings' && (
          <Settings 
            settings={companySettings} 
            onUpdateSettings={setCompanySettings} 
            allData={{
              products,
              orders,
              transactions,
              quotations,
              invoices,
              expenses,
              clients,
              suppliers
            }}
            language={language}
          />
        )}
        {activeTab === 'customers' && (
          <ClientManagement 
            clients={clients} 
            onUpdateClients={handleUpdateClients} 
            onUpdateTransactions={(newTransactions) => {
              setTransactions(newTransactions);
              // Record accounting entries for client payments
              const latestPayment = newTransactions[0];
              if (latestPayment && latestPayment.type === 'Income' && latestPayment.category === 'Client Payment') {
                const clientAcc = latestPayment.clientId ? `acc-client-${latestPayment.clientId}` : 'acc-ar';
                recordAccountingEntry(
                  `Client Payment: ${latestPayment.clientName}`,
                  [{ accountId: 'acc-cash', amount: latestPayment.amount }],
                  [{ accountId: clientAcc, amount: latestPayment.amount }],
                  latestPayment.id
                );
              }
            }}
            onAddAuditLog={addAuditLog}
            transactions={transactions}
            invoices={invoices}
            language={language}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}
        {activeTab === 'inventory' && (
          <InventorySystem 
            products={products} 
            onUpdateProducts={handleUpdateProducts} 
            onUpdateTransactions={(newTrans) => {
              setTransactions(prev => [newTrans, ...prev]);
              // Record Accounting Entry for Stock Purchase
              if (newTrans.type === 'Purchase') {
                const supplierAcc = newTrans.supplierId ? `acc-supplier-${newTrans.supplierId}` : 'acc-cash';
                recordAccountingEntry(
                  `Stock Purchase: ${newTrans.description}`,
                  [{ accountId: 'acc-inventory', amount: newTrans.amount }],
                  [{ accountId: supplierAcc, amount: newTrans.amount }],
                  newTrans.id
                );
              }
            }}
            suppliers={suppliers}
            onAddAuditLog={addAuditLog}
            categories={categories}
            onUpdateCategories={setCategories}
            language={language}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}
        {activeTab === 'suppliers' && (
          <SupplierManagement 
            suppliers={suppliers} 
            onUpdateSuppliers={handleUpdateSuppliers} 
            onUpdateTransactions={(newTransactions) => {
              setTransactions(newTransactions);
              // Record accounting entries for supplier payments
              const latestPayment = newTransactions[0];
              if (latestPayment && latestPayment.type === 'Expense' && latestPayment.category === 'Supplier Payment') {
                const supplierAcc = latestPayment.supplierId ? `acc-supplier-${latestPayment.supplierId}` : 'acc-ap';
                recordAccountingEntry(
                  `Supplier Payment: ${latestPayment.supplierName}`,
                  [{ accountId: supplierAcc, amount: latestPayment.amount }],
                  [{ accountId: 'acc-cash', amount: latestPayment.amount }],
                  latestPayment.id
                );
              }
            }}
            onAddAuditLog={addAuditLog}
            transactions={transactions}
            language={language}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}

        {activeTab === 'orders' && (
          <OrderPortal 
            orders={orders} 
            onDeleteOrder={handleDeleteOrder} 
            onClearOrders={() => setIsClearOrdersConfirmOpen(true)}
            onReviseOrder={handleReviseOrder}
            companySettings={companySettings}
            language={language}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            invoices={invoices}
            onConvertToInvoice={handleConvertOrderToInvoice}
          />
        )}

        {activeTab === 'audit' && (
          <SystemAuditLog 
            logs={auditLogs} 
            onClearLogs={() => setAuditLogs([])} 
            language={language}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}
        
        {['reports'].includes(activeTab) && (
          <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">🚧</span>
            </div>
            <h2 className="text-xl font-bold text-gray-600 capitalize">{activeTab} Module</h2>
            <p>This module is currently under development.</p>
          </div>
        )}

        <CheckoutModal 
          isOpen={isCheckoutOpen}
          onClose={() => {
            setIsCheckoutOpen(false);
            setCheckoutDetails(null);
          }}
          total={checkoutDetails?.total || 0}
          details={checkoutDetails}
          items={cartItems}
          onComplete={handleCompleteOrder}
          companySettings={companySettings}
          clients={clients}
          transactions={transactions}
          invoices={invoices}
          onAddClient={(client) => setClients(prev => [...prev, client])}
          onTriggerDrawer={triggerCashDrawer}
        />

        <AnimatePresence>
          {isPrinterSettingsOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 40 }}
                className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border border-white/20"
              >
                <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                      <Printer size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Printer Settings</h2>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Configure multiple printers</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsPrinterSettingsOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Receipt Printer (POS)</label>
                      <select 
                        value={printerSettings.receiptPrinter}
                        onChange={(e) => setPrinterSettings(prev => ({ ...prev, receiptPrinter: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-primary transition-all"
                      >
                        <option>System Default</option>
                        <option>Thermal Receipt Printer (80mm)</option>
                        <option>Network Printer 01</option>
                        <option>Bluetooth Printer</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Report Printer (Accounting)</label>
                      <select 
                        value={printerSettings.reportPrinter}
                        onChange={(e) => setPrinterSettings(prev => ({ ...prev, reportPrinter: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-primary transition-all"
                      >
                        <option>System Default</option>
                        <option>Office Laser Jet (A4)</option>
                        <option>Network Printer 02</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        printerSettings.isConnected ? "bg-green-500 animate-pulse" : "bg-gray-300"
                      )} />
                      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        {printerSettings.isConnected ? "Printers Connected" : "Printers Offline"}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        setPrinterSettings(prev => ({ ...prev, isConnected: true }));
                        addNotification({
                          title: 'Printers Connected',
                          message: 'All configured printers are now online and ready.',
                          type: 'success',
                          category: 'system'
                        });
                      }}
                      className="px-4 py-2 bg-white border border-primary/20 text-primary rounded-xl text-[10px] font-black uppercase hover:bg-primary hover:text-white transition-all"
                    >
                      Connect All
                    </button>
                  </div>

                  <button 
                    onClick={() => setIsPrinterSettingsOpen(false)}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-gray-900/20 hover:bg-gray-800 transition-all"
                  >
                    Save Configuration
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Barcode Scanner Toast Feedback */}
        <AnimatePresence>
          {scannerMessage && (
            <motion.div
              initial={{ opacity: 0, y: 50, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: 50, x: '-50%' }}
              className={cn(
                "fixed bottom-8 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-md",
                scannerStatus === 'connected' ? "bg-green-500/90 text-white border-green-400" : "bg-red-500/90 text-white border-red-400"
              )}
            >
              {scannerStatus === 'connected' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                  {scannerStatus === 'connected' ? 'Barcode Scanned' : 'Scanner Error'}
                </span>
                <span className="text-sm font-bold">{scannerMessage}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <VirtualKeyboard
          isOpen={isKeyboardOpen}
          onClose={() => setIsKeyboardOpen(false)}
          language={language}
          onLanguageToggle={() => setLanguage(language === 'en' ? 'si' : 'en')}
          onInput={(char) => {
            const activeElement = lastFocusedElement.current || document.activeElement as HTMLInputElement | HTMLTextAreaElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
              const start = activeElement.selectionStart || 0;
              const end = activeElement.selectionEnd || 0;
              const value = activeElement.value;
              const newValue = value.substring(0, start) + char + value.substring(end);
              
              // Use native setter to trigger React state update
              const setter = Object.getOwnPropertyDescriptor(
                activeElement instanceof HTMLTextAreaElement 
                  ? window.HTMLTextAreaElement.prototype 
                  : window.HTMLInputElement.prototype, 
                'value'
              )?.set;
              
              if (setter) {
                setter.call(activeElement, newValue);
                activeElement.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Restore cursor position
                const newPos = start + char.length;
                activeElement.setSelectionRange(newPos, newPos);
                // Ensure it stays focused
                activeElement.focus();
              }
            }
          }}
          onDelete={() => {
            const activeElement = lastFocusedElement.current || document.activeElement as HTMLInputElement | HTMLTextAreaElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
              const start = activeElement.selectionStart || 0;
              const end = activeElement.selectionEnd || 0;
              const value = activeElement.value;
              let newValue = value;
              let newPos = start;

              if (start === end) {
                if (start > 0) {
                  newValue = value.substring(0, start - 1) + value.substring(end);
                  newPos = start - 1;
                }
              } else {
                newValue = value.substring(0, start) + value.substring(end);
                newPos = start;
              }

              // Use native setter to trigger React state update
              const setter = Object.getOwnPropertyDescriptor(
                activeElement instanceof HTMLTextAreaElement 
                  ? window.HTMLTextAreaElement.prototype 
                  : window.HTMLInputElement.prototype, 
                'value'
              )?.set;

              if (setter) {
                setter.call(activeElement, newValue);
                activeElement.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Restore cursor position
                activeElement.setSelectionRange(newPos, newPos);
                // Ensure it stays focused
                activeElement.focus();
              }
            }
          }}
          onEnter={() => {
            const activeElement = lastFocusedElement.current || document.activeElement as HTMLInputElement | HTMLTextAreaElement;
            if (activeElement) {
              activeElement.blur();
            }
            setIsKeyboardOpen(false);
          }}
        />

        <ConfirmModal
          isOpen={!!orderToRevise}
          onClose={() => setOrderToRevise(null)}
          onConfirm={() => {
            if (orderToRevise) {
              executeReviseOrder(orderToRevise);
              setOrderToRevise(null);
            }
          }}
          title="Clear Cart & Revise?"
          message="You have items in your cart. Revising this order will clear your current cart. Continue?"
          confirmText="Yes, Clear & Revise"
          cancelText="Cancel"
          type="warning"
        />

        <ConfirmModal
          isOpen={!!orderToDeleteId}
          onClose={() => setOrderToDeleteId(null)}
          onConfirm={() => {
            if (orderToDeleteId) {
              executeDeleteOrder(orderToDeleteId);
              setOrderToDeleteId(null);
            }
          }}
          title="Delete Order?"
          message="Are you sure you want to delete this order? This will restore the stock and remove the transaction from accounting."
          confirmText="Delete Order"
          cancelText="Cancel"
          type="danger"
        />

        <ConfirmModal
          isOpen={isClearOrdersConfirmOpen}
          onClose={() => setIsClearOrdersConfirmOpen(false)}
          onConfirm={() => {
            executeClearOrders();
            setIsClearOrdersConfirmOpen(false);
          }}
          title="Clear All Orders?"
          message="Are you sure you want to clear all order history? This will restore stock for all completed orders. This action cannot be undone."
          confirmText="Clear All"
          cancelText="Cancel"
          type="danger"
        />
      </main>
    </div>
  );
}

