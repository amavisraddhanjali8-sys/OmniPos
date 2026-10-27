import { Product, Client, CompanySettings, TermAndCondition, Transaction, InventoryMovement, Notification, Supplier, LedgerAccount } from './types';

export const INITIAL_ACCOUNTS: LedgerAccount[] = [
  { id: 'acc-cash', code: '1000', name: 'Cash on Hand', type: 'Asset', balance: 0, isSystem: true },
  { id: 'acc-bank', code: '1100', name: 'Bank Account', type: 'Asset', balance: 0, isSystem: true },
  { id: 'acc-ar', code: '1200', name: 'Accounts Receivable', type: 'Asset', balance: 0, isSystem: true },
  { id: 'acc-inventory', code: '1300', name: 'Inventory Asset', type: 'Asset', balance: 0, isSystem: true },
  { id: 'acc-ap', code: '2000', name: 'Accounts Payable', type: 'Liability', balance: 0, isSystem: true },
  { id: 'acc-equity', code: '3000', name: "Owner's Equity", type: 'Equity', balance: 0, isSystem: true },
  { id: 'acc-sales', code: '4000', name: 'Sales Revenue', type: 'Revenue', balance: 0, isSystem: true },
  { id: 'acc-other-income', code: '4100', name: 'Other Income', type: 'Revenue', balance: 0, isSystem: true },
  { id: 'acc-cogs', code: '5000', name: 'Cost of Goods Sold', type: 'Expense', balance: 0, isSystem: true },
  { id: 'acc-rent', code: '5100', name: 'Rent Expense', type: 'Expense', balance: 0, isSystem: true },
  { id: 'acc-utilities', code: '5200', name: 'Utilities Expense', type: 'Expense', balance: 0, isSystem: true },
  { id: 'acc-salaries', code: '5300', name: 'Salaries Expense', type: 'Expense', balance: 0, isSystem: true },
  { id: 'acc-marketing', code: '5400', name: 'Marketing Expense', type: 'Expense', balance: 0, isSystem: true },
  { id: 'acc-bad-debt', code: '5500', name: 'Bad Debt / Write-Off Expense', type: 'Expense', balance: 0, isSystem: true },
  { id: 'acc-other-expense', code: '5900', name: 'Other Operating Expenses', type: 'Expense', balance: 0, isSystem: true },
];

export const INITIAL_SETTINGS: CompanySettings = {
  name: 'OmniConnect Business Suite',
  address: '123 Main Street, Colombo 07, Sri Lanka',
  phones: ['+94 11 234 5678', '+94 77 123 4567'],
  email: 'info@omniconnect.lk',
  website: 'www.omniconnect.lk',
  bankDetails: [
    { id: 'b1', bankName: 'Bank of Ceylon', accountNumber: '0012345678', branch: 'Colombo Fort', accountHolder: 'OmniConnect Pvt Ltd' },
    { id: 'b2', bankName: 'Commercial Bank', accountNumber: '1090023456', branch: 'Kollupitiya', accountHolder: 'OmniConnect Pvt Ltd' }
  ],
  currency: 'LKR',
  logo: 'https://api.dicebear.com/7.x/initials/svg?seed=OC&backgroundColor=f62440',
  terms: [
    { id: '1', text: 'Payment is due within 30 days.' },
    { id: '2', text: 'Goods once sold are not returnable.' },
  ],
  taxId: 'SV-123456789-LK',
  defaultTaxRate: 0,
  expenseCategories: ['Utilities', 'Rent', 'Salaries', 'Inventory Purchase', 'Marketing', 'Maintenance', 'Supplies', 'Travel', 'Insurance', 'Other']
};

export const INITIAL_TERMS: TermAndCondition[] = [
  { id: '1', text: 'Payment is due within 30 days.' },
  { id: '2', text: 'Goods once sold are not returnable.' },
];

// Zero dummy records
export const MOCK_NOTIFICATIONS: Notification[] = [];
export const MOCK_CLIENTS: Client[] = [];
export const MOCK_SUPPLIERS: Supplier[] = [];
export const PRODUCTS: Product[] = [];
export const MOCK_TRANSACTIONS: Transaction[] = [];
export const MOCK_INVENTORY_MOVEMENTS: InventoryMovement[] = [];
export const MOCK_AUDIT_LOGS: any[] = [];
