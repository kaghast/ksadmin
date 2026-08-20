import React from 'react';
import {
  LayoutDashboard,
  CreditCard,
  Building2,
  Receipt,
  Settings,
  LogOut,
  WalletCards,
  Shield,
  Tags,
  PieChart,
  ShoppingBag
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type ActiveTab = 'overview' | 'loans' | 'cards' | 'expenses' | 'kmh' | 'payments' | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onCloseMobile }) => {
  const { user, logout } = useAuth();

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside className="w-64 bg-slate-900 flex flex-col border-r border-slate-800 shrink-0 h-full select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm text-white shadow-sm tracking-wider">
            KS
          </div>
          <h1 className="text-white font-bold text-lg tracking-tight flex items-center gap-1.5">
            KSADMIN <span className="text-blue-400 text-xs px-1.5 py-0.5 rounded bg-blue-500/20 font-semibold uppercase tracking-wider">PRO</span>
          </h1>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Section: Genel */}
        <div className="space-y-1">
          <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider px-3 py-1">
            Genel
          </div>
          <button
            onClick={() => handleSelectTab('overview')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
              activeTab === 'overview'
                ? 'bg-slate-800 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 ${activeTab === 'overview' ? 'text-blue-400' : 'text-slate-400'}`} />
            <span>Panel Özeti</span>
          </button>
        </div>

        {/* Section: Modüller */}
        <div className="space-y-1">
          <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider px-3 py-1">
            Finansal Yönetim
          </div>
          <button
            onClick={() => handleSelectTab('loans')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
              activeTab === 'loans'
                ? 'bg-slate-800 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Building2 className={`w-4 h-4 ${activeTab === 'loans' ? 'text-blue-400' : 'text-slate-400'}`} />
            <span>Krediler & Taksitler</span>
          </button>
          <button
            onClick={() => handleSelectTab('cards')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
              activeTab === 'cards'
                ? 'bg-slate-800 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <CreditCard className={`w-4 h-4 ${activeTab === 'cards' ? 'text-blue-400' : 'text-slate-400'}`} />
            <span>Kredi Kartları</span>
          </button>
          <button
            onClick={() => handleSelectTab('expenses')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
              activeTab === 'expenses'
                ? 'bg-slate-800 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Tags className={`w-4 h-4 ${activeTab === 'expenses' ? 'text-blue-400' : 'text-slate-400'}`} />
            <div className="flex items-center justify-between flex-1">
              <span>Kart Harcamaları</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-semibold px-1.5 py-0.5 rounded">Yeni</span>
            </div>
          </button>
          <button
            onClick={() => handleSelectTab('kmh')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
              activeTab === 'kmh'
                ? 'bg-slate-800 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <WalletCards className={`w-4 h-4 ${activeTab === 'kmh' ? 'text-blue-400' : 'text-slate-400'}`} />
            <span>KMH / Ek Hesaplar</span>
          </button>
          <button
            onClick={() => handleSelectTab('payments')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
              activeTab === 'payments'
                ? 'bg-slate-800 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Receipt className={`w-4 h-4 ${activeTab === 'payments' ? 'text-blue-400' : 'text-slate-400'}`} />
            <span>Ödeme Geçmişi</span>
          </button>
        </div>

        {/* Section: Sistem */}
        <div className="space-y-1">
          <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider px-3 py-1">
            Sistem
          </div>
          <button
            onClick={() => handleSelectTab('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
              activeTab === 'settings'
                ? 'bg-slate-800 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Settings className={`w-4 h-4 ${activeTab === 'settings' ? 'text-blue-400' : 'text-slate-400'}`} />
            <span>Yönetici Ayarları</span>
          </button>
        </div>
      </nav>

      {/* Bottom User Area */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/90">
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              KS
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {user?.name || 'Kemal Şahin'}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {user?.email || 'kemalsahin@gmail.com'}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 rounded-lg transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Güvenli Çıkış</span>
        </button>
      </div>
    </aside>
  );
};
