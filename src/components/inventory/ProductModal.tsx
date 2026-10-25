import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Package, DollarSign, Tag, Truck, AlertCircle, Upload, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Category, Supplier } from '../../types';
import { cn } from '../../lib/utils';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
  product?: Product | null;
  suppliers: Supplier[];
  categories: Category[];
}

export default function ProductModal({ isOpen, onClose, onSave, product, suppliers, categories }: ProductModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    price: 0,
    costPrice: 0,
    category: categories[0] || 'Accessories',
    stock: 0,
    minStock: 5,
    supplier: '',
    barcode: '',
    isService: false,
    image: ''
  });

  useEffect(() => {
    if (product) {
      setFormData(product);
    } else {
      setFormData({
        name: '',
        description: '',
        status: 'Active',
        price: 0,
        costPrice: 0,
        category: categories[0] || 'Accessories',
        stock: 0,
        minStock: 5,
        supplier: '',
        barcode: '',
        isService: false,
        image: ''
      });
    }
  }, [product, isOpen, categories]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category) return;
    
    const finalProduct: Product = {
      id: product?.id || `P${Math.floor(1000 + Math.random() * 9000)}`,
      name: formData.name!,
      description: formData.description || '',
      status: formData.status || 'Active',
      price: Number(formData.price) || 0,
      costPrice: Number(formData.costPrice) || 0,
      category: formData.category as Category,
      stock: formData.isService ? 0 : (Number(formData.stock) || 0),
      minStock: formData.isService ? 0 : (Number(formData.minStock) || 0),
      supplier: formData.supplier || '',
      barcode: formData.barcode || product?.id || `P${Math.floor(1000 + Math.random() * 9000)}`,
      isService: !!formData.isService,
      image: formData.image || `https://picsum.photos/seed/${formData.name}/200`
    };
    
    onSave(finalProduct);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 left-16 lg:left-56 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[2rem] w-full max-w-3xl overflow-hidden shadow-2xl border border-white/20"
          >
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/30">
                  <Package size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{product ? 'Edit Product' : 'Add New Product'}</h2>
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em]">Inventory Management System</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-2xl transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Left Column: Image & Basic Info */}
                <div className="md:col-span-5 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Image</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem] flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all overflow-hidden group relative shadow-inner"
                    >
                      {formData.image ? (
                        <>
                          <img src={formData.image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2">
                            <Upload size={24} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Change Image</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-gray-300 group-hover:text-primary transition-all group-hover:scale-110">
                            <Upload size={28} />
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Click to upload</p>
                            <p className="text-[8px] text-gray-300 mt-1">JPG, PNG or GIF</p>
                          </div>
                        </>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Status</label>
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                      {(['Active', 'Inactive'] as const).map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFormData({ ...formData, status: s })}
                          className={cn(
                            "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                            formData.status === s 
                              ? (s === 'Active' ? "bg-green-500 text-white shadow-md" : "bg-red-500 text-white shadow-md")
                              : "text-gray-400 hover:text-gray-600"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Detailed Info */}
                <div className="md:col-span-7 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <Tag size={10} /> Product Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary focus:bg-white transition-all shadow-inner"
                        placeholder="e.g. iPhone Fast Charger"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value as Category })}
                        className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary focus:bg-white transition-all shadow-inner appearance-none"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary focus:bg-white transition-all shadow-inner min-h-[80px]"
                      placeholder="Enter product description..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <DollarSign size={10} /> Cost Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.costPrice}
                        onChange={e => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                        className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary focus:bg-white transition-all shadow-inner"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <DollarSign size={10} /> Selling Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                        className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary focus:bg-white transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  {!formData.isService && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Initial Stock</label>
                        <input
                          type="number"
                          value={formData.stock}
                          onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })}
                          className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary focus:bg-white transition-all shadow-inner"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Min Stock Alert</label>
                        <input
                          type="number"
                          value={formData.minStock}
                          onChange={e => setFormData({ ...formData, minStock: Number(e.target.value) })}
                          className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary focus:bg-white transition-all shadow-inner"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <Truck size={10} /> Supplier
                      </label>
                      <select
                        value={formData.supplier}
                        onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                        className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary focus:bg-white transition-all shadow-inner appearance-none"
                      >
                        <option value="">Select Supplier</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Barcode</label>
                      <input
                        type="text"
                        value={formData.barcode}
                        onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                        className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary focus:bg-white transition-all shadow-inner"
                        placeholder="Scan barcode..."
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <input
                      type="checkbox"
                      id="isService"
                      checked={formData.isService}
                      onChange={e => setFormData({ ...formData, isService: e.target.checked })}
                      className="w-5 h-5 text-primary border-gray-300 rounded-lg focus:ring-primary transition-all cursor-pointer"
                    />
                    <label htmlFor="isService" className="text-xs font-black text-gray-700 uppercase tracking-tight cursor-pointer select-none">
                      This is a service (No physical stock)
                    </label>
                  </div>
                </div>
              </div>

              {formData.costPrice! > formData.price! && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 shadow-sm"
                >
                  <AlertCircle size={20} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Warning: Selling price is lower than cost price!</p>
                </motion.div>
              )}

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-8 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-200 hover:text-gray-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-8 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-3"
                >
                  <Save size={18} />
                  {product ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
