import React, { useState, useRef } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCcw,
  Edit2,
  Trash2,
  History,
  Filter,
  X,
  Barcode as BarcodeIcon,
  Download,
  ShoppingCart
} from 'lucide-react';
import { Product, InventoryMovement, Category, Supplier, Transaction } from '../../types';
import { PRODUCTS, MOCK_INVENTORY_MOVEMENTS } from '../../constants';
import { cn, formatCurrency } from '../../lib/utils';
import ProductModal from './ProductModal';
import StockPurchaseModal from './StockPurchaseModal';
import Barcode from 'react-barcode';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { handleHtml2CanvasClone } from '../../lib/pdf-utils';
import { useNotifications } from '../../context/NotificationContext';
import { translations, Language } from '../../i18n';
import ConfirmModal from '../layout/ConfirmModal';

const DEFAULT_CATEGORIES: Category[] = ['Reloads', 'Bills', 'Printing', 'Accessories', 'Books', 'Stationery'];

interface InventorySystemProps {
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
  onUpdateTransactions: (transaction: Transaction) => void;
  suppliers: Supplier[];
  onAddAuditLog?: (action: string, details: string, category: any, type?: any) => void;
  categories: Category[];
  onUpdateCategories: (categories: Category[]) => void;
  language: Language;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function InventorySystem({ 
  products, 
  onUpdateProducts, 
  onUpdateTransactions, 
  suppliers, 
  onAddAuditLog,
  categories,
  onUpdateCategories,
  language,
  searchQuery,
  setSearchQuery
}: InventorySystemProps) {
  const { addNotification } = useNotifications();
  const t = translations[language];
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [movementToDelete, setMovementToDelete] = useState<string | null>(null);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  
  const [movements, setMovements] = useState<InventoryMovement[]>(MOCK_INVENTORY_MOVEMENTS);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [view, setView] = useState<'stock' | 'history'>('stock');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [selectedBarcodeProduct, setSelectedBarcodeProduct] = useState<Product | null>(null);
  const barcodeRef = useRef<HTMLDivElement>(null);

  const downloadBarcode = async () => {
    if (!barcodeRef.current || !selectedBarcodeProduct) return;
    
    try {
      const canvas = await html2canvas(barcodeRef.current, {
        backgroundColor: '#ffffff',
        scale: 3,
        onclone: (clonedDoc) => {
          handleHtml2CanvasClone(clonedDoc);
        }
      });
      const link = document.createElement('a');
      link.download = `barcode-${selectedBarcodeProduct.barcode || selectedBarcodeProduct.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error downloading barcode:', error);
    }
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    if (categories.includes(newCategoryName.trim())) {
      addNotification({
        title: 'Error',
        message: 'Category already exists',
        type: 'error',
        category: 'inventory'
      });
      return;
    }
    onUpdateCategories([...categories, newCategoryName.trim()]);
    setNewCategoryName('');
    addNotification({
      title: 'Category Added',
      message: `Category "${newCategoryName}" has been added.`,
      type: 'success',
      category: 'inventory'
    });
  };

  const handleEditCategory = (oldName: string) => {
    if (!newCategoryName.trim() || oldName === newCategoryName.trim()) {
      setEditingCategory(null);
      setNewCategoryName('');
      return;
    }
    
    // Update all products in this category
    const updatedProducts = products.map(p => 
      p.category === oldName ? { ...p, category: newCategoryName.trim() } : p
    );
    onUpdateProducts(updatedProducts);
    
    onUpdateCategories(categories.map(c => c === oldName ? newCategoryName.trim() : c));
    setEditingCategory(null);
    setNewCategoryName('');
    
    addNotification({
      title: 'Category Updated',
      message: `Category renamed from "${oldName}" to "${newCategoryName}".`,
      type: 'info',
      category: 'inventory'
    });
  };

  const handleDeleteCategory = (catName: string) => {
    const hasProducts = products.some(p => p.category === catName);
    if (hasProducts) {
      addNotification({
        title: t.cannotDeleteCategory,
        message: `${t.category} "${catName}" ${t.cannotDeleteCategory}.`,
        type: 'error',
        category: 'inventory'
      });
      return;
    }
    setCategoryToDelete(catName);
  };

  const confirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    
    onUpdateCategories(categories.filter(c => c !== categoryToDelete));
    if (selectedCategory === categoryToDelete) setSelectedCategory('All');
    addNotification({
      title: 'Category Deleted',
      message: `Category "${categoryToDelete}" has been removed.`,
      type: 'warning',
      category: 'inventory'
    });
    setCategoryToDelete(null);
  };

  const filteredProducts = (products || []).filter(p => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(searchLower) ||
                         p.id.toLowerCase().includes(searchLower) ||
                         (p.barcode && p.barcode.toLowerCase().includes(searchLower)) ||
                         (p.supplier?.toLowerCase().includes(searchLower));
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesStock = stockFilter === 'all' || 
                        (stockFilter === 'low' && !p.isService && p.stock <= p.minStock && p.stock > 0) ||
                        (stockFilter === 'out' && !p.isService && p.stock === 0);
    return matchesSearch && matchesCategory && matchesStock;
  });

  const filteredMovements = movements.filter(m => {
    const product = products.find(p => p.id === m.productId);
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = (product?.name.toLowerCase().includes(searchLower)) ||
                         m.productId.toLowerCase().includes(searchLower) ||
                         m.reason.toLowerCase().includes(searchLower);
    return matchesSearch;
  });

  const lowStockProducts = products.filter(p => !p.isService && p.stock <= p.minStock);

  const handleSaveProduct = (product: Product) => {
    if (editingProduct) {
      onUpdateProducts(products.map(p => p.id === product.id ? product : p));
      onAddAuditLog?.('Product Updated', `Product updated: ${product.name} (${product.id})`, 'inventory');
      addNotification({
        title: 'Product Updated',
        message: `${product.name} has been updated successfully.`,
        type: 'success',
        category: 'inventory'
      });
    } else {
      onUpdateProducts([...products, product]);
      onAddAuditLog?.('Product Added', `New product added: ${product.name} (${product.id})`, 'inventory', 'success');
      addNotification({
        title: 'Product Added',
        message: `${product.name} has been added to the inventory.`,
        type: 'success',
        category: 'inventory'
      });
      // Add initial stock movement if any
      if (product.stock > 0) {
        const movement: InventoryMovement = {
          id: Date.now().toString(),
          productId: product.id,
          type: 'IN',
          quantity: product.stock,
          date: new Date().toISOString(),
          reason: 'Initial Stock'
        };
        setMovements([movement, ...movements]);
      }
    }
    setEditingProduct(null);
  };

  const handleDeleteProduct = (id: string) => {
    setProductToDelete(id);
  };

  const confirmDeleteProduct = () => {
    if (!productToDelete) return;
    const product = products.find(p => p.id === productToDelete);
    onUpdateProducts(products.filter(p => p.id !== productToDelete));
    addNotification({
      title: 'Product Deleted',
      message: `${product?.name} has been removed from inventory.`,
      type: 'warning',
      category: 'inventory'
    });
    setProductToDelete(null);
  };

  const handleDeleteMovement = (id: string) => {
    setMovementToDelete(id);
  };

  const confirmDeleteMovement = () => {
    if (!movementToDelete) return;
    setMovements(movements.filter(m => m.id !== movementToDelete));
    addNotification({
      title: 'History Record Deleted',
      message: 'The inventory movement record has been removed.',
      type: 'info',
      category: 'inventory'
    });
    setMovementToDelete(null);
  };

  const confirmClearHistory = () => {
    setMovements([]);
    addNotification({
      title: 'History Cleared',
      message: 'All inventory movement records have been cleared.',
      type: 'warning',
      category: 'inventory'
    });
    setIsClearingHistory(false);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  return (
    <div className="flex-1 bg-gray-50 p-4 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t.inventoryManagement}</h1>
            <p className="text-xs text-gray-500">{t.trackStock}</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setView(view === 'stock' ? 'history' : 'stock')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              {view === 'stock' ? <History size={14} /> : <Package size={14} />}
              {view === 'stock' ? t.viewHistory : t.stockLevels}
            </button>
            <button 
              onClick={() => setIsPurchaseModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <ShoppingCart size={14} />
              {t.addStock}
            </button>
            <button 
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus size={14} />
              {t.addProduct}
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">{t.totalItems}</span>
              <Package size={14} className="text-blue-500" />
            </div>
            <div className="text-xl font-bold text-gray-900">{products.filter(p => !p.isService).length}</div>
            <p className="text-[10px] text-gray-500 mt-1">{t.physicalProducts}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">{t.lowStock}</span>
              <AlertTriangle size={14} className="text-amber-500" />
            </div>
            <div className="text-xl font-bold text-amber-600">{lowStockProducts.length}</div>
            <p className="text-[10px] text-gray-500 mt-1">{t.lowStock}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">{t.stockValue}</span>
              <ArrowUpRight size={14} className="text-green-500" />
            </div>
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency((products || []).reduce((sum, p) => sum + (p.costPrice * p.stock), 0))}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">{t.estimatedCost}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">{t.potentialRevenue}</span>
              <RefreshCcw size={14} className="text-primary" />
            </div>
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency((products || []).reduce((sum, p) => sum + (p.price * p.stock), 0))}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">{t.retailPrice}</p>
          </div>
        </div>

        {view === 'stock' ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input 
                  type="text" 
                  placeholder={t.searchInventory}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-primary transition-all"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0 w-full md:w-auto">
                <Filter size={14} className="text-gray-400 shrink-0" />
                <div className="flex bg-white border border-gray-100 rounded-full p-0.5 mr-2">
                  {(['all', 'low', 'out'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setStockFilter(f)}
                      className={cn(
                        "px-3 py-1 rounded-full text-[9px] font-bold uppercase transition-all",
                        stockFilter === f ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap transition-all",
                    selectedCategory === 'All' 
                      ? "bg-primary text-white shadow-md shadow-primary/20" 
                      : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-100"
                  )}
                >
                  {t.all}
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap transition-all",
                      selectedCategory === cat 
                        ? "bg-primary text-white shadow-md shadow-primary/20" 
                        : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-100"
                    )}
                  >
                    {cat}
                  </button>
                ))}
                <button 
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="p-1.5 bg-gray-100 text-gray-400 rounded-full hover:bg-gray-200 transition-all shrink-0"
                  title="Manage Categories"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">{t.product}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">{t.category}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">{t.status}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">{t.stock}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">{t.costPrice}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">{t.price}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">{t.supplier}</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase text-right">{t.actions || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-xs text-gray-400 italic">
                      No products found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 overflow-hidden border border-gray-100 shrink-0">
                            {product.image && !brokenImages[product.id] ? (
                              <img 
                                src={product.image} 
                                alt={product.name} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                                referrerPolicy="no-referrer" 
                                onError={() => setBrokenImages(prev => ({ ...prev, [product.id]: true }))}
                              />
                            ) : (
                              <Package size={16} className="text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900">{product.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono uppercase tracking-tighter">{product.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[9px] font-bold uppercase tracking-wider">{product.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                          product.status === 'Inactive' ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                        )}>
                          {product.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-xs font-bold",
                            product.stock <= product.minStock && !product.isService ? "text-amber-600" : "text-gray-900"
                          )}>
                            {product.isService ? '∞' : product.stock}
                          </span>
                          {product.stock <= product.minStock && !product.isService && (
                            <AlertTriangle size={12} className="text-amber-500" />
                          )}
                        </div>
                        {!product.isService && <p className="text-[9px] text-gray-400">Min: {product.minStock}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatCurrency(product.costPrice)}</td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-900">{formatCurrency(product.price)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{product.supplier || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5 items-center">
                          {productToDelete === product.id ? (
                            <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-100">
                              <span className="text-[8px] font-bold text-red-600 px-1">Delete?</span>
                              <button onClick={confirmDeleteProduct} className="p-1 bg-red-500 text-white rounded text-[8px] font-bold hover:bg-red-600 transition-colors">Yes</button>
                              <button onClick={() => setProductToDelete(null)} className="p-1 bg-gray-200 text-gray-600 rounded text-[8px] font-bold hover:bg-gray-300 transition-colors">No</button>
                            </div>
                          ) : (
                            <>
                              <button 
                                onClick={() => openEditModal(product)}
                                className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 bg-gray-50 hover:bg-gray-100 border border-gray-200/80 rounded-lg transition-all shadow-2xs"
                                title={t.edit || "Edit Product"}
                              >
                                <Edit2 size={13} />
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedBarcodeProduct(product);
                                  setIsBarcodeModalOpen(true);
                                }}
                                className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 bg-gray-50 hover:bg-gray-100 border border-gray-200/80 rounded-lg transition-all shadow-2xs"
                                title="Print Barcode"
                              >
                                <BarcodeIcon size={13} />
                              </button>
                              <button 
                                onClick={() => handleDeleteProduct(product.id)}
                                className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 bg-gray-50 hover:bg-gray-100 border border-gray-200/80 rounded-lg transition-all shadow-2xs"
                                title={t.delete || "Delete Product"}
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="flex items-center gap-4">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">{t.inventoryMovementHistory}</h3>
                <span className="text-[10px] font-bold text-gray-400 uppercase">{t.totalRecords}: {filteredMovements.length}</span>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input 
                    type="text" 
                    placeholder={t.searchHistory}
                    className="w-full pl-10 pr-4 py-1.5 bg-white border border-gray-200 rounded-xl text-[10px] focus:outline-none focus:border-primary transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {movements.length > 0 && (
                  <button 
                    onClick={() => setIsClearingHistory(true)}
                    className="flex items-center gap-1 text-[10px] font-bold text-red-500 hover:underline"
                  >
                    <Trash2 size={12} />
                    {t.clearHistory}
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">{t.date}</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">{t.product}</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">{t.type}</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">{t.quantity}</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase">{t.reason}</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic text-xs">
                        {t.noHistoryFound || 'No history records found'}
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((movement) => {
                      const product = products.find(p => p.id === movement.productId);
                      return (
                        <tr key={movement.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="px-4 py-3 text-[10px] text-gray-500">{new Date(movement.date).toLocaleString()}</td>
                          <td className="px-4 py-3 text-xs font-bold text-gray-700">{product?.name || movement.productId}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase flex items-center w-fit gap-1",
                              movement.type === 'IN' ? "bg-green-100 text-green-700" : 
                              movement.type === 'OUT' ? "bg-red-100 text-red-700" : 
                              "bg-blue-100 text-blue-700"
                            )}>
                              {movement.type === 'IN' ? <ArrowDownLeft size={10} /> : 
                               movement.type === 'OUT' ? <ArrowUpRight size={10} /> : 
                               <RefreshCcw size={10} />}
                              {movement.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-gray-900">
                            {movement.type === 'OUT' ? '-' : '+'}{Math.abs(movement.quantity)}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{movement.reason}</td>
                          <td className="px-4 py-3 text-right">
                            {movementToDelete === movement.id ? (
                              <div className="flex items-center gap-1 justify-end">
                                <button onClick={confirmDeleteMovement} className="p-1 bg-red-500 text-white rounded text-[8px] font-bold">Yes</button>
                                <button onClick={() => setMovementToDelete(null)} className="p-1 bg-gray-200 text-gray-600 rounded text-[8px] font-bold">No</button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => handleDeleteMovement(movement.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete movement record"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <StockPurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        products={products}
        suppliers={suppliers}
        onCompletePurchase={(updatedProducts, transaction) => {
          onUpdateProducts(updatedProducts);
          onUpdateTransactions(transaction);
          onAddAuditLog?.('Stock Purchased', `Purchased stock for ${transaction.items?.length} products`, 'inventory', 'success');
          addNotification({
            title: 'Stock Updated',
            message: 'New stock has been added and accounting records updated.',
            type: 'success',
            category: 'inventory'
          });
        }}
      />

      <ProductModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProduct}
        product={editingProduct}
        suppliers={suppliers}
        categories={categories}
      />

      {/* Category Management Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCategoryModalOpen(false)}
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                    <Filter size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Manage Categories</h3>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Add or edit product categories</p>
                  </div>
                </div>
                <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="New category name..."
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-primary"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <button 
                    onClick={handleAddCategory}
                    className="px-6 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all"
                  >
                    Add
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {categories.map(cat => (
                    <div key={cat} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                      {editingCategory === cat ? (
                        <div className="flex-1 flex gap-2">
                          <input 
                            autoFocus
                            type="text"
                            className="flex-1 px-2 py-1 bg-white border border-primary rounded-lg text-xs font-bold focus:outline-none"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                          />
                          <button 
                            onClick={() => handleEditCategory(cat)}
                            className="px-3 py-1 bg-green-500 text-white rounded-lg text-[10px] font-bold"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-bold text-gray-700">{cat}</span>
                          <div className="flex gap-1.5 items-center">
                            <button 
                              onClick={() => {
                                setNewCategoryName(cat);
                                setEditingCategory(cat);
                              }}
                              className="p-1.5 text-gray-500 hover:text-primary hover:bg-white rounded-lg transition-colors border border-gray-100 hover:border-gray-200"
                              title="Edit category"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button 
                              onClick={() => handleDeleteCategory(cat)}
                              className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-gray-100 hover:border-red-200"
                              title="Delete category"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Barcode Modal */}
      <AnimatePresence>
        {isBarcodeModalOpen && selectedBarcodeProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBarcodeModalOpen(false)}
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                    <BarcodeIcon size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Product Barcode</h3>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">{selectedBarcodeProduct.name}</p>
                  </div>
                </div>
                <button onClick={() => setIsBarcodeModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 flex flex-col items-center justify-center space-y-6">
                <div 
                  ref={barcodeRef}
                  className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col items-center"
                >
                  <div className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-2">
                    {selectedBarcodeProduct.name}
                  </div>
                  <Barcode 
                    value={selectedBarcodeProduct.barcode || selectedBarcodeProduct.id} 
                    width={1.5}
                    height={60}
                    fontSize={12}
                    margin={0}
                  />
                  <div className="text-[8px] font-bold text-gray-400 mt-2">
                    {selectedBarcodeProduct.id}
                  </div>
                </div>

                <div className="w-full grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => window.print()}
                    className="py-3 bg-gray-100 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                  >
                    Print
                  </button>
                  <button 
                    onClick={downloadBarcode}
                    className="flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
                  >
                    <Download size={14} /> Download
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={confirmDeleteProduct}
        title={t.confirmDelete}
        message={`${t.confirmDelete} ${products.find(p => p.id === productToDelete)?.name}?`}
        type="danger"
      />

      <ConfirmModal
        isOpen={isClearingHistory}
        onClose={() => setIsClearingHistory(false)}
        onConfirm={confirmClearHistory}
        title={t.confirmDelete}
        message={t.confirmDelete || 'Are you sure you want to clear all inventory history?'}
        type="danger"
      />

      <ConfirmModal
        isOpen={!!movementToDelete}
        onClose={() => setMovementToDelete(null)}
        onConfirm={confirmDeleteMovement}
        title={t.confirmDelete}
        message="Are you sure you want to delete this movement record?"
        type="danger"
      />

      <ConfirmModal
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={confirmDeleteCategory}
        title={t.confirmDelete}
        message={`${t.confirmDelete} ${categoryToDelete}?`}
        type="danger"
      />
    </div>
  );
}
