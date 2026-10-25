import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  FileText, 
  PieChart, 
  Package, 
  Users, 
  Settings,
  LogOut,
  History,
  Receipt,
  DollarSign,
  Truck
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { translations, Language } from '../../i18n';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: Language;
}

export default function Sidebar({ activeTab, setActiveTab, language }: SidebarProps) {
  const t = translations[language];

  const menuItems = [
    { id: 'lobby', label: t.dashboard || 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: t.pos, icon: ShoppingCart },
    { id: 'orders', label: t.orders, icon: History },
    { id: 'quotation', label: t.quotations, icon: FileText },
    { id: 'invoices', label: t.invoices, icon: Receipt },
    { id: 'expenses', label: t.expenses, icon: DollarSign },
    { id: 'accounting', label: t.accounting, icon: PieChart },
    { id: 'inventory', label: t.inventory, icon: Package },
    { id: 'suppliers', label: t.suppliers, icon: Truck },
    { id: 'customers', label: t.clients, icon: Users },
    { id: 'settings', label: t.settings, icon: Settings },
  ];

  return (
    <aside className="w-16 lg:w-56 bg-white border-r border-gray-200 flex flex-col h-screen transition-all duration-300 print:hidden">
      <div className="p-4 flex items-center gap-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
          <LayoutDashboard size={18} />
        </div>
        <span className="font-bold text-lg hidden lg:block tracking-tight">OmniPOS</span>
      </div>

      <nav className="flex-1 px-2 space-y-1 mt-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 group",
              activeTab === item.id 
                ? "bg-primary text-white shadow-sm" 
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <item.icon size={18} className={cn(
              "shrink-0",
              activeTab === item.id ? "text-white" : "group-hover:text-primary"
            )} />
            <span className="font-medium text-sm hidden lg:block">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-2 border-t border-gray-100">
        <button className="w-full flex items-center gap-2 px-3 py-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors group">
          <LogOut size={18} className="shrink-0 group-hover:text-red-600" />
          <span className="font-medium text-sm hidden lg:block">{t.logout}</span>
        </button>
      </div>
    </aside>
  );
}
