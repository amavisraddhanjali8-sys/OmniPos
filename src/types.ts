export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  taxId?: string;
}

export type Category = string;

export interface Product {
  id: string;
  name: string;
  description?: string;
  status?: 'Active' | 'Inactive';
  price: number;
  category: Category;
  image?: string;
  stock: number;
  minStock: number;
  costPrice: number;
  supplier?: string;
  isService?: boolean;
  barcode?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  image?: string;
  creditLimit?: number;
  isBlacklisted?: boolean;
  notes?: string;
}

export interface BankDetail {
  id: string;
  bankName: string;
  accountNumber: string;
  branch: string;
  accountHolder?: string;
}

export interface CompanySettings {
  name: string;
  address: string;
  phones: string[];
  email: string;
  website: string;
  bankDetails: BankDetail[];
  currency: string;
  logo?: string;
  terms: TermAndCondition[];
  taxId?: string;
  defaultTaxRate: number;
  expenseCategories: string[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  date: string;
  read: boolean;
  category: 'inventory' | 'sales' | 'system' | 'forecast' | 'hardware' | 'accounting';
}

export interface TermAndCondition {
  id: string;
  text: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface OtherCharge {
  id: string;
  description: string;
  amount: number;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  clientId: string;
  clientName: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  discountRate: number;
  freight: number;
  otherCharges: number;
  otherChargesList?: OtherCharge[];
  total: number;
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected' | 'Won';
  terms: string[];
  bankId?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  quotationId?: string;
  quotationNumber?: string;
  clientId: string;
  clientName: string;
  date: string;
  dueDate: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  discountRate: number;
  freight: number;
  otherCharges: number;
  otherChargesList?: OtherCharge[];
  total: number;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  amountPaid: number;
  balance: number;
  terms: string[];
  bankId?: string;
  notes?: string;
  stockReduced?: boolean;
  isBadDebt?: boolean;
}

export interface Expense {
  id: string;
  expenseNumber: string;
  vendor: string;
  category: string;
  amount: number;
  date: string;
  paymentMethod: string;
  status: 'Pending' | 'Paid' | 'Cancelled';
  description: string;
  receiptImage?: string;
  reference?: string;
  supplierId?: string;
  supplierName?: string;
}

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  balance: number;
  description?: string;
  isSystem?: boolean; // System accounts like Cash, Sales, etc.
}

export interface LedgerEntry {
  id: string;
  date: string;
  accountId: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
  referenceId?: string;
  transactionId?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  entries: LedgerEntry[];
  referenceId?: string;
}

export interface Transaction {
  id: string;
  type: 'Income' | 'Expense' | 'Sale' | 'Purchase';
  category: string;
  amount: number;
  subtotal?: number;
  tax?: number;
  taxRate?: number;
  discount?: number;
  discountRate?: number;
  freight?: number;
  otherCharges?: number;
  otherChargesList?: OtherCharge[];
  date: string;
  description: string;
  items?: CartItem[];
  paymentMethod?: string;
  amountPaid?: number;
  change?: number;
  status?: 'Completed' | 'Refunded' | 'Pending';
  stockReduced?: boolean;
  referenceId?: string;
  clientId?: string;
  clientName?: string;
  supplierId?: string;
  supplierName?: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  date: string;
  reason: string;
}

export interface ForecastData {
  date: string;
  actual: number;
  forecast: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  date: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'inventory' | 'sales' | 'accounting' | 'system' | 'clients' | 'suppliers';
}
