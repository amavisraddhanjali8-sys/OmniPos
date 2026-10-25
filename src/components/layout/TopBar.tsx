import React, { useState } from 'react';
import { Bell, Search, User, X, CheckCircle2, AlertTriangle, AlertCircle, Info, Trash2, Barcode, Globe, Keyboard as KeyboardIcon, Home, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '../../context/NotificationContext';
import { Notification } from '../../types';
import { cn } from '../../lib/utils';
import { translations, Language } from '../../i18n';
import InfoModal from './InfoModal';

interface TopBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  scannerStatus: 'idle' | 'connected' | 'error';
  scannerMessage: string | null;
  language: Language;
  setLanguage: (lang: Language) => void;
  isKeyboardOpen: boolean;
  setIsKeyboardOpen: (open: boolean) => void;
  onOpenPrinterSettings?: () => void;
  printerSettings?: {
    receiptPrinter: string;
    reportPrinter: string;
    isConnected: boolean;
    isDrawerConnected: boolean;
  };
  lowStockCount?: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function TopBar({ 
  activeTab,
  setActiveTab,
  scannerStatus, 
  scannerMessage,
  language,
  setLanguage,
  isKeyboardOpen,
  setIsKeyboardOpen,
  onOpenPrinterSettings,
  printerSettings,
  lowStockCount = 0,
  searchQuery,
  setSearchQuery
}: TopBarProps) {
  const { notifications, markAsRead, deleteNotification, markAllAsRead, clearAll } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const t = translations[language];

  const unreadCount = (notifications || []).filter(n => !n.read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="text-green-500" size={16} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={16} />;
      case 'error': return <AlertCircle className="text-red-500" size={16} />;
      default: return <Info className="text-blue-500" size={16} />;
    }
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-40 print:hidden">
      <div className="flex items-center gap-4 flex-1">
        {activeTab !== 'lobby' && (
          <button 
            onClick={() => setActiveTab('lobby')}
            className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all group"
            title="Go to Home"
          >
            <Home size={20} className="group-hover:scale-110 transition-transform" />
          </button>
        )}
        <div className="relative w-64 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={16} />
          <input 
            type="text" 
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-1.5 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:outline-none focus:border-primary focus:bg-white transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Barcode Scanner Status */}
        <button 
          onClick={() => {
            setIsInfoModalOpen(true);
          }}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border hover:shadow-md",
            scannerStatus === 'connected' ? "bg-green-50 text-green-600 border-green-100" :
            scannerStatus === 'error' ? "bg-red-50 text-red-600 border-red-100" :
            "bg-gray-50 text-gray-400 border-gray-100"
          )}
        >
          <Barcode size={14} className={cn(scannerStatus === 'connected' && "animate-pulse")} />
          <span className="uppercase tracking-wider">
            {scannerStatus === 'connected' ? t.scannerReady : 
             scannerStatus === 'error' ? t.scannerError : t.scannerIdle}
          </span>
          {scannerMessage && (
            <>
              <div className="w-px h-3 bg-current opacity-20 mx-1" />
              <span className="normal-case font-medium italic">{scannerMessage}</span>
            </>
          )}
        </button>

        <InfoModal 
          isOpen={isInfoModalOpen}
          onClose={() => setIsInfoModalOpen(false)}
          title={t.scannerReady}
          message={t.scannerInfo}
          language={language}
        />

        {/* Printer Settings Button */}
        <button 
          onClick={onOpenPrinterSettings}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border hover:shadow-md",
            printerSettings?.isConnected ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-gray-50 text-gray-400 border-gray-100"
          )}
        >
          <Printer size={14} className={cn(printerSettings?.isConnected && "animate-pulse")} />
          <span className="uppercase tracking-wider">
            {printerSettings?.isConnected ? 'Printer Online' : t.printerSettings}
          </span>
          {printerSettings?.isDrawerConnected && (
            <>
              <div className="w-px h-3 bg-current opacity-20 mx-1" />
              <span className="uppercase tracking-wider text-[8px]">Drawer Ready</span>
            </>
          )}
        </button>

        {/* Low Stock Indicator */}
        {lowStockCount > 0 && (
          <button 
            onClick={() => setActiveTab('inventory')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border border-red-100 bg-red-50 text-red-600 hover:shadow-md animate-pulse"
          >
            <AlertTriangle size={14} />
            <span className="uppercase tracking-wider">{lowStockCount} {t.lowStockItems}</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Language Switcher */}
        <div className="flex items-center bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setLanguage('en')}
            className={cn(
              "px-3 py-1 text-[10px] font-bold rounded-lg transition-all",
              language === 'en' ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('si')}
            className={cn(
              "px-3 py-1 text-[10px] font-bold rounded-lg transition-all",
              language === 'si' ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            සිං
          </button>
        </div>

        {/* Keyboard Toggle */}
        <button
          onClick={() => setIsKeyboardOpen(!isKeyboardOpen)}
          className={cn(
            "p-2 rounded-xl transition-all relative",
            isKeyboardOpen ? "bg-primary/10 text-primary" : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          )}
          title={t.keyboard}
        >
          <KeyboardIcon size={20} />
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "p-2 rounded-xl transition-all relative",
              isOpen ? "bg-primary/10 text-primary" : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            )}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {isOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsOpen(false)} 
                />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">{t.notifications}</h3>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{t.systemAlerts}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={markAllAsRead}
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        {t.markAllRead}
                      </button>
                      <button 
                        onClick={clearAll}
                        className="text-[10px] font-bold text-red-500 hover:underline"
                      >
                        {t.clearAll}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto no-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center space-y-2">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                          <Bell className="text-gray-300" size={24} />
                        </div>
                        <p className="text-xs text-gray-400 italic">{t.noNotifications}</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {notifications.map((n) => (
                          <div 
                            key={n.id} 
                            className={cn(
                              "p-4 flex gap-3 hover:bg-gray-50 transition-colors relative group",
                              !n.read && "bg-primary/5"
                            )}
                            onClick={() => markAsRead(n.id)}
                          >
                            <div className="mt-0.5 shrink-0">
                              {getIcon(n.type)}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className={cn("text-xs font-bold truncate", n.read ? "text-gray-700" : "text-gray-900")}>
                                  {n.title}
                                </p>
                                <span className="text-[9px] text-gray-400 whitespace-nowrap">
                                  {new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">
                                {n.message}
                              </p>
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded">
                                  {n.category}
                                </span>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNotification(n.id);
                                  }}
                                  className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-3 border-t border-gray-100 bg-gray-50/50 text-center">
                    <button className="text-[10px] font-bold text-gray-500 hover:text-primary transition-colors">
                      {t.viewAllNotifications}
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="h-8 w-px bg-gray-200 mx-1" />

        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-gray-900 leading-none">Admin User</p>
            <p className="text-[10px] text-gray-400 font-medium">System Manager</p>
          </div>
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold border border-primary/20">
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  );
}
