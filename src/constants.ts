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
  logo: 'https://api.dicebear.com/7.x/initials/svg?seed=OC&backgroundColor=f97316',
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

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    title: 'Low Stock Alert',
    message: 'iPhone Fast Charger is below minimum stock level (Current: 8, Min: 10).',
    type: 'warning',
    date: new Date().toISOString(),
    read: false,
    category: 'inventory'
  },
  {
    id: 'n2',
    title: 'High Demand Forecast',
    message: 'Accessories sales are expected to increase by 15% next week. Consider restocking.',
    type: 'info',
    date: new Date().toISOString(),
    read: false,
    category: 'forecast'
  },
  {
    id: 'n3',
    title: 'System Update',
    message: 'New features added: Multiple phone numbers and bank details support.',
    type: 'success',
    date: new Date().toISOString(),
    read: true,
    category: 'system'
  },
  {
    id: 'n4',
    title: 'Drawback Alert',
    message: 'Quotation print margins might need adjustment for some printers.',
    type: 'error',
    date: new Date().toISOString(),
    read: false,
    category: 'system'
  }
];

export const MOCK_CLIENTS: Client[] = [
  { id: 'c1', name: 'PENCE, KENDRA', email: 'kendra@example.com', phone: '541-350-6130', address: '61145 RIDGEWATER LOOP', city: 'BEND, OR 97702' },
  { id: 'c2', name: 'GREENWOOD, JOHN', email: 'john@example.com', phone: '541-555-0199', address: '339 GREENWOOD AVE', city: 'BEND, OR 97701' },
];

export const MOCK_SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'TechSupply Ltd', contactPerson: 'Michael Chen', email: 'sales@techsupply.lk', phone: '+94 11 555 1234', address: '45 Tech Plaza, Colombo 03', category: 'Accessories' },
  { id: 's2', name: 'SoundWave', contactPerson: 'Sarah Perera', email: 'info@soundwave.lk', phone: '+94 11 555 5678', address: '12 Audio Lane, Kandy', category: 'Accessories' },
  { id: 's3', name: 'EduBooks', contactPerson: 'David Silva', email: 'orders@edubooks.lk', phone: '+94 11 555 9012', address: '78 Knowledge Way, Nugegoda', category: 'Books' },
];

export const PRODUCTS: Product[] = [
  // Accessories
  { id: 'acc1', name: 'iPhone Fast Charger', price: 2500, category: 'Accessories', stock: 45, minStock: 10, costPrice: 1800, supplier: 'TechSupply Ltd', image: 'https://picsum.photos/seed/charger/200', barcode: '1001' },
  { id: 'acc2', name: 'USB-C Cable 2m', price: 1250, category: 'Accessories', stock: 22, minStock: 5, costPrice: 850, supplier: 'TechSupply Ltd', image: 'https://picsum.photos/seed/cable/200', barcode: '1002' },
  { id: 'acc3', name: 'Wireless Earbuds', price: 4500, category: 'Accessories', stock: 15, minStock: 5, costPrice: 3200, supplier: 'SoundWave', image: 'https://picsum.photos/seed/earbuds/200', barcode: '1003' },
  
  // Printing Services
  { id: 'pr1', name: 'A4 Color Print', price: 50, category: 'Printing', isService: true, stock: 0, minStock: 0, costPrice: 15, barcode: '2001' },
  { id: 'pr2', name: 'A4 B&W Print', price: 10, category: 'Printing', isService: true, stock: 0, minStock: 0, costPrice: 2, barcode: '2002' },
  { id: 'pr3', name: 'Lamination A4', price: 150, category: 'Printing', isService: true, stock: 0, minStock: 0, costPrice: 40, barcode: '2003' },
  
  // Reloads & Bills
  { id: 'rel1', name: 'Mobile Reload $10', price: 1000, category: 'Reloads', isService: true, stock: 0, minStock: 0, costPrice: 950, barcode: '3001' },
  { id: 'rel2', name: 'Data Pack 5GB', price: 1500, category: 'Reloads', isService: true, stock: 0, minStock: 0, costPrice: 1400, barcode: '3002' },
  { id: 'bill1', name: 'Electricity Bill', price: 0, category: 'Bills', isService: true, stock: 0, minStock: 0, costPrice: 0, barcode: '3003' },
  
  // Books & Stationery
  { id: 'bk1', name: 'Hardcover Notebook', price: 800, category: 'Stationery', stock: 60, minStock: 15, costPrice: 550, supplier: 'PaperMill', image: 'https://picsum.photos/seed/notebook/200', barcode: '4001' },
  { id: 'bk2', name: 'Gel Pen Set (12pcs)', price: 1400, category: 'Stationery', stock: 40, minStock: 10, costPrice: 900, supplier: 'StationeryHub', image: 'https://picsum.photos/seed/pens/200', barcode: '4002' },
  { id: 'bk3', name: 'The Great Gatsby', price: 1200, category: 'Books', stock: 8, minStock: 3, costPrice: 800, supplier: 'EduBooks', image: 'https://picsum.photos/seed/book1/200', barcode: '4003' },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1', type: 'Sale', category: 'Accessories', amount: 3750, date: '2026-03-25T10:00:00Z', description: 'Charger + Cable', items: [{ ...PRODUCTS[0], quantity: 1 }, { ...PRODUCTS[1], quantity: 1 }], paymentMethod: 'Cash', status: 'Completed' },
  { id: 't2', type: 'Sale', category: 'Books', amount: 1200, date: '2026-03-26T14:30:00Z', description: 'The Great Gatsby', items: [{ ...PRODUCTS[11], quantity: 1 }], paymentMethod: 'Card', status: 'Completed' },
  { id: 't3', type: 'Expense', category: 'Rent', amount: 45000, date: '2026-03-01T09:00:00Z', description: 'Monthly Shop Rent' },
  { id: 't4', type: 'Purchase', category: 'Inventory', amount: 15000, date: '2026-03-15T11:00:00Z', description: 'Restock Stationery', status: 'Completed' },
  { id: 't5', type: 'Income', category: 'Service Fee', amount: 5000, date: '2026-03-20T16:00:00Z', description: 'Bulk Printing Contract' },
];

export const MOCK_INVENTORY_MOVEMENTS: InventoryMovement[] = [
  { id: 'm1', productId: 'acc1', type: 'IN', quantity: 50, date: '2026-03-01T10:00:00Z', reason: 'Initial Stock' },
  { id: 'm2', productId: 'acc1', type: 'OUT', quantity: 5, date: '2026-03-25T10:00:00Z', reason: 'Sale t1' },
  { id: 'm3', productId: 'bk1', type: 'ADJUSTMENT', quantity: -2, date: '2026-03-28T15:00:00Z', reason: 'Damaged Stock' },
];

export const MOCK_AUDIT_LOGS: any[] = [
  {
    id: 'l1',
    userId: 'u1',
    userName: 'Admin User',
    action: 'System Login',
    details: 'User logged in from 192.168.1.1',
    date: new Date(Date.now() - 3600000).toISOString(),
    type: 'info',
    category: 'system'
  },
  {
    id: 'l2',
    userId: 'u1',
    userName: 'Admin User',
    action: 'Product Added',
    details: 'Added new product: iPhone Fast Charger (acc1)',
    date: new Date(Date.now() - 7200000).toISOString(),
    type: 'success',
    category: 'inventory'
  },
  {
    id: 'l3',
    userId: 'u1',
    userName: 'Admin User',
    action: 'Settings Updated',
    details: 'Changed company tax ID and bank details',
    date: new Date(Date.now() - 86400000).toISOString(),
    type: 'warning',
    category: 'system'
  }
];
