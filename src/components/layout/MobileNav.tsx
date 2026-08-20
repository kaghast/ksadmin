import React from 'react';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  WalletCards,
  Receipt,
  Settings,
  Tags,
  Network
} from 'lucide-react';
import { ActiveTab } from './Sidebar';

interface MobileNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const items = [
    { id: 'overview' as ActiveTab, label: 'Panel', icon: LayoutDashboard },
    { id: 'loans' as ActiveTab, label: 'Krediler', icon: Building2 },
    { id: 'cards' as ActiveTab, label: 'Kartlar', icon: CreditCard },
    { id: 'expenses' as ActiveTab, label: 'Harcamalar', icon: Tags },
    { id: 'kmh' as ActiveTab, label: 'KMH', icon: WalletCards },
    { id: 'mindmap' as ActiveTab, label: 'Zihin Haritası', icon: Network },
    { id: 'payments' as ActiveTab, label: 'Ödemeler', icon: Receipt },
    { id: 'settings' as ActiveTab, label: 'Ayarlar', icon: Settings }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-1 py-1 flex items-center justify-around shadow-lg overflow-x-auto">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-lg transition-colors min-w-[44px] ${
              isActive
                ? 'text-blue-600 font-semibold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[9px] mt-0.5 whitespace-nowrap">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
