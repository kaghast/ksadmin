import React from 'react';
import { Menu, LogOut, ShieldCheck, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ActiveTab } from './Sidebar';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onOpenMobileMenu }) => {
  const { user, logout } = useAuth();

  const getBreadcrumb = () => {
    switch (activeTab) {
      case 'overview':
        return { section: 'Genel', current: 'Panel & Borç Özeti' };
      case 'loans':
        return { section: 'Finansal Yönetim', current: 'Borçlar & Krediler' };
      case 'cards':
        return { section: 'Finansal Yönetim', current: 'Kredi Kartları' };
      case 'expenses':
        return { section: 'Finansal Yönetim', current: 'Kart Harcamaları & Kategori Dağılımı' };
      case 'kmh':
        return { section: 'Finansal Yönetim', current: 'KMH / Ek Hesaplar' };
      case 'mindmap':
        return { section: 'Strateji & Planlama', current: 'Zihin Haritası (Mindmap)' };
      case 'payments':
        return { section: 'Finansal Yönetim', current: 'Ödeme Geçmişi' };
      case 'settings':
        return { section: 'Sistem', current: 'Yönetici & Sistem Ayarları' };
      default:
        return { section: 'Finansal Yönetim', current: 'Panel' };
    }
  };

  const { section, current } = getBreadcrumb();

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shrink-0 z-30">
      {/* Breadcrumbs / Title */}
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            title="Menüyü Aç"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="text-xs sm:text-sm text-slate-500 font-medium">
          <span>{section}</span>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-900 font-semibold">{current}</span>
        </div>
      </div>

      {/* Right side Profile & Status */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Sistem Aktif</span>
        </div>

        <button
          onClick={() => setActiveTab('settings')}
          className="text-xs font-medium text-slate-700 hover:text-blue-600 transition-colors hidden sm:block"
        >
          {user?.email || 'kemalsahin@gmail.com'}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className="h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center text-white font-bold text-xs shadow-sm cursor-pointer"
          title="Ayarlar & Profil"
        >
          KS
        </button>
      </div>
    </header>
  );
};
