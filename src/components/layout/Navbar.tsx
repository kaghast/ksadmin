import React from 'react';
import {
  LayoutDashboard,
  CreditCard,
  Building2,
  Receipt,
  Settings,
  LogOut,
  WalletCards
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type ActiveTab = 'overview' | 'loans' | 'cards' | 'kmh' | 'payments' | 'settings';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  const navLinks = [
    { id: 'overview' as ActiveTab, label: 'Genel Bakış', icon: LayoutDashboard },
    { id: 'loans' as ActiveTab, label: 'Krediler', icon: Building2 },
    { id: 'cards' as ActiveTab, label: 'Kredi Kartları', icon: CreditCard },
    { id: 'kmh' as ActiveTab, label: 'KMH / Ek Hesap', icon: WalletCards },
    { id: 'payments' as ActiveTab, label: 'Ödeme Geçmişi', icon: Receipt },
    { id: 'settings' as ActiveTab, label: 'Ayarlar', icon: Settings }
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand title (One line, single element) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-cyan-600 flex items-center justify-center font-bold text-white shadow-sm tracking-wider">
            KS
          </div>
          <span className="text-xl font-bold tracking-tight text-white select-none">
            KSADMIN
          </span>
        </div>

        {/* Zone 2: Navigation Links (Single-line, 5 items, desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-slate-800 text-cyan-400 border border-slate-700/60 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Actions (User / Settings / Logout) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('settings')}
            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'settings'
                ? 'bg-slate-800 text-cyan-400 border-cyan-500/30'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
            title="Admin Ayarları"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="max-w-[120px] truncate">{user?.name || 'Kemal Şahin'}</span>
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 bg-rose-950/30 border border-rose-900/40 hover:bg-rose-900/50 transition-colors whitespace-nowrap shrink-0"
            title="Güvenli Çıkış Yap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Çıkış</span>
          </button>
        </div>
      </div>
    </header>
  );
};
