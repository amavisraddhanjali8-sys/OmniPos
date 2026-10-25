import React from 'react';
import { 
  ShoppingCart, 
  FileText, 
  PieChart, 
  Package, 
  Users, 
  Settings,
  History,
  Receipt,
  DollarSign,
  Truck,
  ArrowRight,
  LayoutDashboard
} from 'lucide-react';
import { motion } from 'motion/react';
import { CompanySettings } from '../../types';
import { cn } from '../../lib/utils';
import { translations, Language } from '../../i18n';

interface LobbyProps {
  companySettings: CompanySettings;
  setActiveTab: (tab: string) => void;
  lowStockCount?: number;
  language: Language;
}

export default function Lobby({ companySettings, setActiveTab, lowStockCount = 0, language }: LobbyProps) {
  const t = translations[language];

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.goodMorning;
    if (hour < 17) return t.goodAfternoon;
    return t.goodEvening;
  };

  const tiles = [
    {
      id: 'pos',
      title: t.pos,
      description: t.posDescription,
      icon: ShoppingCart,
      color: 'bg-emerald-500',
      pattern: 'circles'
    },
    {
      id: 'orders',
      title: t.orders,
      description: t.ordersDescription,
      icon: History,
      color: 'bg-blue-500',
      pattern: 'squares'
    },
    {
      id: 'quotation',
      title: t.quotations,
      description: t.quotationsDescription,
      icon: FileText,
      color: 'bg-pink-500',
      pattern: 'triangles'
    },
    {
      id: 'invoices',
      title: t.invoices,
      description: t.invoicesDescription,
      icon: Receipt,
      color: 'bg-purple-500',
      pattern: 'waves'
    },
    {
      id: 'expenses',
      title: t.expenses,
      description: t.expensesDescription,
      icon: DollarSign,
      color: 'bg-rose-500',
      pattern: 'dots'
    },
    {
      id: 'accounting',
      title: t.accounting,
      description: t.accountingDescription,
      icon: PieChart,
      color: 'bg-indigo-500',
      pattern: 'grid'
    },
    {
      id: 'inventory',
      title: t.inventory,
      description: t.inventoryDescription,
      icon: Package,
      color: 'bg-amber-500',
      pattern: 'hexagons',
      badge: lowStockCount > 0 ? `${lowStockCount} ${t.low}` : null
    },
    {
      id: 'suppliers',
      title: t.suppliers,
      description: t.suppliersDescription,
      icon: Truck,
      color: 'bg-cyan-500',
      pattern: 'lines'
    },
    {
      id: 'customers',
      title: t.clients,
      description: t.customersDescription,
      icon: Users,
      color: 'bg-teal-500',
      pattern: 'zigzags'
    },
    {
      id: 'settings',
      title: t.settings,
      description: t.settingsDescription,
      icon: Settings,
      color: 'bg-slate-600',
      pattern: 'crosses'
    },
    {
      id: 'audit',
      title: t.auditLog,
      description: t.auditLogDescription,
      icon: History,
      color: 'bg-zinc-700',
      pattern: 'lines'
    }
  ];

  return (
    <div className="flex-1 bg-gray-50 p-6 lg:p-10 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-10">
        <header className="space-y-1">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight"
          >
            {getTimeGreeting()}, <span className="text-primary">{companySettings.name}</span>!
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 font-medium"
          >
            {t.welcomeBack}
          </motion.p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tiles.map((tile, index) => (
            <motion.button
              key={tile.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setActiveTab(tile.id)}
              className="group relative h-64 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden text-left flex flex-col p-8"
            >
              {/* Background UI Pattern */}
              <div className={cn(
                "absolute bottom-0 right-0 w-32 h-32 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none",
                tile.color.replace('bg-', 'text-')
              )}>
                {tile.pattern === 'circles' && (
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="40" fill="currentColor" />
                    <circle cx="80" cy="20" r="20" fill="currentColor" />
                  </svg>
                )}
                {tile.pattern === 'squares' && (
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <rect x="20" y="20" width="60" height="60" fill="currentColor" />
                    <rect x="70" y="0" width="30" height="30" fill="currentColor" />
                  </svg>
                )}
                {tile.pattern === 'triangles' && (
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <path d="M50 10 L90 90 L10 90 Z" fill="currentColor" />
                  </svg>
                )}
                {tile.pattern === 'waves' && (
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <path d="M0 50 Q25 0 50 50 T100 50 V100 H0 Z" fill="currentColor" />
                  </svg>
                )}
                {tile.pattern === 'dots' && (
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="20" cy="20" r="10" fill="currentColor" />
                    <circle cx="50" cy="50" r="10" fill="currentColor" />
                    <circle cx="80" cy="80" r="10" fill="currentColor" />
                  </svg>
                )}
                {tile.pattern === 'grid' && (
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <rect x="10" y="10" width="30" height="30" fill="currentColor" />
                    <rect x="50" y="10" width="30" height="30" fill="currentColor" />
                    <rect x="10" y="50" width="30" height="30" fill="currentColor" />
                    <rect x="50" y="50" width="30" height="30" fill="currentColor" />
                  </svg>
                )}
                {tile.pattern === 'hexagons' && (
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <path d="M50 0 L93 25 L93 75 L50 100 L7 75 L7 25 Z" fill="currentColor" />
                  </svg>
                )}
                {tile.pattern === 'lines' && (
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <rect x="0" y="20" width="100" height="10" fill="currentColor" />
                    <rect x="0" y="50" width="100" height="10" fill="currentColor" />
                    <rect x="0" y="80" width="100" height="10" fill="currentColor" />
                  </svg>
                )}
                {tile.pattern === 'zigzags' && (
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <path d="M0 20 L25 0 L50 20 L75 0 L100 20 V40 L75 20 L50 40 L25 20 L0 40 Z" fill="currentColor" />
                  </svg>
                )}
                {tile.pattern === 'crosses' && (
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <rect x="45" y="0" width="10" height="100" fill="currentColor" />
                    <rect x="0" y="45" width="100" height="10" fill="currentColor" />
                  </svg>
                )}
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg",
                    tile.color
                  )}>
                    <tile.icon size={24} />
                  </div>
                  {tile.badge && (
                    <span className="px-3 py-1 bg-red-500 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-red-500/20 animate-pulse">
                      {tile.badge}
                    </span>
                  )}
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">{tile.title}</h3>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed line-clamp-2">
                    {tile.description}
                  </p>
                </div>
              </div>

              <div className="mt-auto">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                  "bg-gray-100 text-gray-400 group-hover:bg-primary group-hover:text-white"
                )}>
                  <ArrowRight size={16} />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
