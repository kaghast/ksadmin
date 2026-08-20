import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Calendar,
  Building2,
  Trash2,
  Download,
  CreditCard,
  WalletCards
} from 'lucide-react';
import { PaymentRecord } from '../../types';

interface PaymentsViewProps {
  payments: PaymentRecord[];
  isLoading: boolean;
  onDeletePayment: (id: number) => Promise<void>;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  payments,
  isLoading,
  onDeletePayment
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'loan' | 'credit_card' | 'kmh'>('all');

  const formatCurrency = (val: number) => {
    return `₺${Number(val || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filteredPayments = payments.filter((p) => {
    const matchesType = filterType === 'all' || p.target_type === filterType;
    const matchesSearch =
      p.target_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.bank_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const totalPaid = filteredPayments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const exportCSV = () => {
    const headers = ['ID', 'Tür', 'Banka', 'Hesap/Kredi Adı', 'Tutar', 'Ödeme Tarihi', 'Açıklama'];
    const rows = filteredPayments.map((p) => [
      p.id,
      p.target_type === 'loan' ? 'Kredi Taksiti' : p.target_type === 'credit_card' ? 'Kredi Kartı' : 'KMH',
      p.bank_name,
      `"${p.target_name.replace(/"/g, '""')}"`,
      p.amount,
      p.payment_date,
      `"${(p.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ksadmin-odeme-gecmisi-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Ödeme & İşlem Geçmişi
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Ödenen kredi taksitleri, kart ödemeleri ve KMH bakiyelerinin işlem kayıtları.
          </p>
        </div>

        <button
          onClick={exportCSV}
          disabled={filteredPayments.length === 0}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold shadow-xs transition-all whitespace-nowrap shrink-0 disabled:opacity-40"
        >
          <Download className="w-4 h-4" />
          <span>Excel / CSV İndir</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Banka, kredi adı veya açıklama ile ara..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
              filterType === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            Tümü ({payments.length})
          </button>
          <button
            onClick={() => setFilterType('loan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
              filterType === 'loan'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            Krediler ({payments.filter(p => p.target_type === 'loan').length})
          </button>
          <button
            onClick={() => setFilterType('credit_card')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
              filterType === 'credit_card'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            Kartlar ({payments.filter(p => p.target_type === 'credit_card').length})
          </button>
          <button
            onClick={() => setFilterType('kmh')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
              filterType === 'kmh'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            KMH ({payments.filter(p => p.target_type === 'kmh').length})
          </button>
        </div>
      </div>

      {/* Payments List Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Filtrelenen {filteredPayments.length} Kayıt
          </span>
          <span className="text-xs font-bold text-blue-600">
            Toplam Ödenen: {formatCurrency(totalPaid)}
          </span>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Receipt className="w-12 h-12 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">İşlem kaydı bulunamadı</p>
            <p className="text-xs text-slate-500 mt-1">Ödeme yaptıkça bu listede otomatik olarak belirecektir.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-5">Tarih</th>
                  <th className="py-3.5 px-5">Tür</th>
                  <th className="py-3.5 px-5">Banka & Tanım</th>
                  <th className="py-3.5 px-5 text-right">Tutar</th>
                  <th className="py-3.5 px-5">Açıklama</th>
                  <th className="py-3.5 px-5 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5 whitespace-nowrap font-mono text-slate-500">
                      {p.payment_date}
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      {p.target_type === 'loan' ? (
                        <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Kredi Taksiti
                        </span>
                      ) : p.target_type === 'credit_card' ? (
                        <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Kredi Kartı
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          KMH
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-slate-900">{p.target_name}</div>
                      <div className="text-[11px] text-slate-500">{p.bank_name}</div>
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap font-bold text-emerald-600 text-sm">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 text-[11px] max-w-xs truncate">
                      {p.notes || '-'}
                    </td>
                    <td className="py-3.5 px-5 text-center whitespace-nowrap">
                      <button
                        onClick={async () => {
                          if (confirm('Bu ödeme kaydını silmek istediğinize emin misiniz?')) {
                            await onDeletePayment(p.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Kaydı Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
